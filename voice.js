// voice.js — EWR Live Voice (F1): a Spiritual Maker's live audio guidance in
// session rooms and races, plus the shared "voice dock" UI both views mount.
//
// Design: "The voice guides. The wheel answers."
//  - Only the approved-maker HOST can publish (enforced server-side by the
//    livekit-token Edge Function); everyone else is subscribe-only.
//  - livekit-client is lazy-loaded from CDN only when voice is actually used,
//    so the app's normal boot cost is unchanged.
//  - The dock exposes a tiny API; views only re-track their presence payload
//    (voice: true/false) so participants learn the maker went live.
// No recording in F1 — that arrives in F2 (session_recordings + Egress).

import { supabase } from './db.js';

const TOKEN_URL = 'https://lhyychkrcrndjptptkii.supabase.co/functions/v1/livekit-token';
const REC_URL = 'https://lhyychkrcrndjptptkii.supabase.co/functions/v1/voice-rec';
const SOLO_AUDIO_URL = 'https://lhyychkrcrndjptptkii.supabase.co/functions/v1/solo-audio';
const SOLO_CAM_URL = 'https://lhyychkrcrndjptptkii.supabase.co/functions/v1/solo-camera';

// F2: server-side recording (LiveKit Egress → Supabase Storage) is live.
const REC_ENABLED = true;
// Recording model (agreed with Csaba, 2026-07-05): the recording belongs to
// the SESSION, not to the maker's connection — it follows the OFFICIAL window
// plus a 5-minute post-roll for the closing words / award ceremony.
//  - Lobby talk before the start is never recorded.
//  - End DURING the window only drops the mic; the recording keeps running,
//    so reconnecting mid-session is captured too.
//  - End in the post-roll (or the post-roll running out) closes the recording
//    for good; any later Go live is live-only, off the record.
//  - Post-roll: 1 minute (Csaba, 2026-07-05 — enough for a closing word, tight
//    enough that a forgotten End does not record dead air).
export const REC_POSTROLL_MS = 1 * 60000;

let lkPromise = null;
const loadLk = () => (lkPromise ||= import('https://esm.sh/livekit-client@2'));

const MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>';
const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.4v13.2c0 .8.9 1.3 1.6.9l10.2-6.6c.6-.4.6-1.4 0-1.8L9.6 4.5c-.7-.4-1.6.1-1.6.9z"/></svg>';
const PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.3"/><rect x="13.5" y="5" width="4" height="14" rx="1.3"/></svg>';

// Fresh access token for host-authenticated calls (voice token + recording
// control). Proactively refreshes a JWT that is about to lapse; null when
// there is no session.
async function authJwt(){
  try{
    let { data } = await supabase.auth.getSession();
    let sess = data?.session || null;
    if(sess && sess.expires_at && (sess.expires_at * 1000 - Date.now()) < 120000){
      try{
        const r = await supabase.auth.refreshSession();
        if(r?.data?.session) sess = r.data.session;
      }catch(_){}
    }
    return sess?.access_token || null;
  }catch(_){ return null; }
}

// ---------------------------------------------------------------------------
// Core connection object (no DOM) — one per view instance.
// States: idle | connecting | live | muted | listening | waiting | tap |
//         reconnecting | ended | error
// ---------------------------------------------------------------------------
function createVoice(sessionId){
  let room = null, state = 'idle', muted = false, startedAt = 0;
  let raf = 0, ctx = null, wl = null, wlWanted = false;
  const stateCbs = new Set(), levelCbs = new Set(), videoCbs = new Set();
  let lastErr = '';

  const set = s => { state = s; stateCbs.forEach(cb => { try{ cb(s); }catch(_){} }); };

  function stopMeter(){
    if(raf){ cancelAnimationFrame(raf); raf = 0; }
    levelCbs.forEach(cb => { try{ cb(0); }catch(_){} });
  }
  function meterFrom(mediaStreamTrack){
    try{
      stopMeter();
      if(!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if(ctx.state === 'suspended') ctx.resume().catch(() => {});
      const src = ctx.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        an.getByteFrequencyData(buf);
        let sum = 0;
        for(let i = 0; i < buf.length; i++) sum += buf[i];
        const lvl = Math.min(1, (sum / buf.length) / 90);
        levelCbs.forEach(cb => { try{ cb(lvl); }catch(_){} });
        raf = requestAnimationFrame(loop);
      };
      loop();
    }catch(_){ /* meter is decorative — never fatal */ }
  }

  async function acquireWake(){
    wlWanted = true;
    try{ wl = await navigator.wakeLock.request('screen'); }catch(_){ wl = null; }
  }
  function releaseWake(){
    wlWanted = false;
    try{ if(wl){ wl.release(); wl = null; } }catch(_){}
  }
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible' && wlWanted && !document.hidden){
      navigator.wakeLock?.request('screen').then(l => { wl = l; }).catch(() => {});
    }
  });

  async function fetchToken(role, name){
    const headers = {};
    if(role === 'host'){
      const jwt = await authJwt();
      if(!jwt) throw new Error('Please log in again.');
      headers.Authorization = 'Bearer ' + jwt;
    }
    const u = TOKEN_URL + '?role=' + role + '&room=' + encodeURIComponent(sessionId)
      + '&name=' + encodeURIComponent(name || '');
    let r = await fetch(u, { headers });
    // Host + 401 → the stored JWT is bad even though it looked alive. Force a
    // refresh once and retry — this heals a rotted silent-refresh chain without
    // making the maker re-log-in mid-session.
    if(!r.ok && r.status === 401 && role === 'host'){
      try{
        const rr = await supabase.auth.refreshSession();
        const jwt2 = rr?.data?.session?.access_token;
        if(jwt2){
          r = await fetch(u, { headers: { Authorization: 'Bearer ' + jwt2 } });
        }
      }catch(_){}
    }
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error(j.error || ('voice service error (' + r.status + ')'));
    return j;
  }

  async function connect(role, name){
    const L = await loadLk();
    const { token, url } = await fetchToken(role, name);
    room = new L.Room();
    room.on(L.RoomEvent.Reconnecting, () => set('reconnecting'));
    room.on(L.RoomEvent.Reconnected, () => set(role === 'host' ? (muted ? 'muted' : 'live') : 'listening'));
    room.on(L.RoomEvent.Disconnected, () => { stopMeter(); videoCbs.forEach(cb => { try{ cb(null); }catch(_){} }); if(state !== 'idle') set('ended'); });
    if(role !== 'host'){
      room.on(L.RoomEvent.TrackSubscribed, (track) => {
        if(track.kind === 'video'){
          // the maker is on camera — hand the track to the dock's video panel
          videoCbs.forEach(cb => { try{ cb(track); }catch(_){} });
          return;
        }
        if(track.kind !== 'audio') return;
        const el = track.attach();
        el.setAttribute('playsinline', '');
        document.body.appendChild(el);
        meterFrom(track.mediaStreamTrack);
        set('listening');
      });
      room.on(L.RoomEvent.TrackUnsubscribed, (track) => {
        if(track.kind === 'video'){ videoCbs.forEach(cb => { try{ cb(null); }catch(_){} }); return; }
        if(track.kind !== 'audio') return;
        track.detach().forEach(e => e.remove());
        stopMeter();
        set('waiting');
      });
      room.on(L.RoomEvent.AudioPlaybackStatusChanged, () => {
        if(room && !room.canPlaybackAudio) set('tap');
        else if(state === 'tap') set('listening');
      });
    }
    await room.connect(url, token);
    return L;
  }

  // Camera mode (F4): ONE getUserMedia stream feeds BOTH the LiveKit broadcast
  // (participants watch live) and the dock's local MediaRecorder (the take that
  // becomes the share-video composite — better quality than re-encoding the
  // stream, and the parallel voice egress stays as the audio fallback).
  let camStream = null;

  return {
    get state(){ return state; },
    get muted(){ return muted; },
    get error(){ return lastErr; },
    get camStream(){ return camStream; },
    elapsed(){ return startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0; },
    onState(cb){ stateCbs.add(cb); return () => stateCbs.delete(cb); },
    onLevel(cb){ levelCbs.add(cb); return () => levelCbs.delete(cb); },
    onVideo(cb){ videoCbs.add(cb); return () => videoCbs.delete(cb); },

    async goLive(name, withCam){
      if(state !== 'idle' && state !== 'ended' && state !== 'error') return;
      set('connecting');
      let camCreatedHere = false;
      try{
        // Camera first, so a denial is visible before we touch LiveKit.
        if(withCam && !camStream){
          camStream = await navigator.mediaDevices.getUserMedia({
            audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          });
          camCreatedHere = true;
        }
        const L = await connect('host', name);
        if(camStream){
          const at = camStream.getAudioTracks()[0], vt = camStream.getVideoTracks()[0];
          await room.localParticipant.publishTrack(at, { source: L.Track.Source.Microphone });
          await room.localParticipant.publishTrack(vt, { source: L.Track.Source.Camera });
          meterFrom(at);
        } else {
          await room.localParticipant.setMicrophoneEnabled(true);
          const pub = room.localParticipant.getTrackPublication(L.Track.Source.Microphone);
          if(pub && pub.track) meterFrom(pub.track.mediaStreamTrack);
        }
        muted = false;
        startedAt = Date.now();
        acquireWake();
        set('live');
      }catch(e){
        lastErr = e.message || String(e);
        // Only drop a camera stream this very call created — a retry after a
        // network drop must not kill a take that is still recording on the
        // stream from the previous go-live.
        if(camStream && camCreatedHere){ try{ camStream.getTracks().forEach(t => t.stop()); }catch(_){} camStream = null; }
        try{ if(room) await room.disconnect(); }catch(_){}
        room = null;
        set('error');
      }
    },

    async listen(name){
      if(state !== 'idle' && state !== 'ended' && state !== 'error') return;
      set('connecting');
      try{
        await connect('listen', name);
        startedAt = Date.now();
        // Listeners keep the screen awake too — a dimming/locking phone mid-
        // meditation broke the experience (and can cut the audio on mobile).
        acquireWake();
        // If the maker is already speaking, TrackSubscribed fires right after
        // connect; until then we sit in "waiting".
        if(state === 'connecting') set('waiting');
      }catch(e){
        lastErr = e.message || String(e);
        try{ if(room) await room.disconnect(); }catch(_){}
        room = null;
        set('error');
      }
    },

    async setMuted(m){
      if(!room) return;
      muted = !!m;
      // Camera mode: disabling the shared audio track silences the broadcast
      // AND the local recording in one move (a silent stretch, like solo);
      // the camera keeps rolling.
      if(camStream){ try{ camStream.getAudioTracks().forEach(t => t.enabled = !muted); }catch(_){} }
      else { try{ await room.localParticipant.setMicrophoneEnabled(!muted); }catch(_){} }
      set(muted ? 'muted' : 'live');
    },

    async unlockAudio(){
      try{ if(room) await room.startAudio(); }catch(_){}
    },

    async stop(){
      releaseWake();
      stopMeter();
      startedAt = 0;
      if(camStream){ try{ camStream.getTracks().forEach(t => t.stop()); }catch(_){} camStream = null; }
      const r = room; room = null;
      set('idle');
      try{ if(r) await r.disconnect(); }catch(_){}
    },
  };
}

// ---------------------------------------------------------------------------
// The VOICE DOCK — one slim, calm bar under the room/race header.
// mountVoiceDock(el, { sessionId, mode, canHost, hostName, onVoiceFlag })
//   -> { setListenAvailable(bool), destroy() }
// ---------------------------------------------------------------------------
export function mountVoiceDock(el, opts){
  const o = Object.assign({
    mode: 'session', canHost: false, hostName: 'The host',
    hostAvatar: null,           // maker photo → the listener's breathing ring
    schedule: null,             // { startMs, endMs } → recording-phase copy (F2)
    onVoiceFlag: null,
    onRecFlag: null,            // host → presence carries "recording is running"
  }, opts);
  const voice = createVoice(o.sessionId);
  let listenAvailable = false, destroyed = false, tickTimer = null;
  let recActiveRemote = false;  // listener side: server-confirmed REC via host presence
  let hostDone = false;         // host pressed End in the post-roll → the voice window is over

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const noun = o.mode === 'race' ? 'race' : 'session';

  function flag(v){ if(o.onVoiceFlag){ try{ o.onVoiceFlag(!!v); }catch(_){} } }

  function fmtElapsed(){
    const s = voice.elapsed();
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  // Ring content: the maker's face for listeners (the voice made visible), a
  // clean mic glyph for the host's own controls / avatar-less makers.
  function ringInner(preferAvatar){
    if(preferAvatar && o.hostAvatar){
      return '<img src="' + esc(o.hostAvatar) + '" alt="" onerror="this.remove()">';
    }
    return '<span class="vd-mic">' + MIC_SVG + '</span>';
  }

  // Recording phase, purely from the official window (F2 turns the copy on).
  // pre → not recording yet · rec → recording · post → closing words · off →
  // recording finished (voice can continue live-only).
  function recPhase(){
    if(!REC_ENABLED || !o.schedule) return null;
    const t = Date.now();
    if(t < o.schedule.startMs) return 'pre';
    if(t <= o.schedule.endMs) return 'rec';
    if(t <= o.schedule.endMs + REC_POSTROLL_MS) return 'post';
    return 'off';
  }
  function recChip(){
    // Honest chip: the host shows it only once the server confirmed the egress;
    // listeners show it from the host's presence flag (also server-confirmed).
    if(o.canHost){
      const p = recPhase();
      if(!p || p === 'pre' || p === 'off') return '';
      return (recState.started && !recState.stopped) ? '<span class="vd-rec">● REC</span>' : '';
    }
    return recActiveRemote ? '<span class="vd-rec">● REC</span>' : '';
  }
  function postLeft(){
    const ms = Math.max(0, (o.schedule.endMs + REC_POSTROLL_MS) - Date.now());
    const s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function hostRecLine(){
    const p = recPhase();
    if(!p) return 'Your voice is guiding this ' + noun + '.';
    if(p === 'pre') return 'Warm-up — not recorded. Recording starts with the ' + noun + '.';
    // Honesty rule: never show "Recording" while the server has not confirmed it.
    if((p === 'rec' || p === 'post') && !recState.started){
      return recState.err
        ? 'Recording not started (' + recState.err + ') — retrying…'
        : 'Starting the recording…';
    }
    if(p === 'rec') return 'Recording — everything said during the ' + noun + ' is kept, even if you pause.';
    if(p === 'post') return 'Closing words · ' + postLeft() + ' left — then the voice closes.';
    return 'The voice window has closed.';
  }
  // The idle card's helper line — the maker always knows what recording would do.
  function hostIdleLine(){
    const p = recPhase();
    if(!p) return 'Participants hear you live — no camera, just your voice.';
    if(p === 'pre') return 'Participants hear you live. Warm-up talk is never recorded — recording starts with the ' + noun + '.';
    if(p === 'rec') return 'The ' + noun + ' is being recorded — going live again will be part of the recording.';
    if(p === 'post') return 'The recording is still open for closing words (' + postLeft() + ' left).';
    return 'The recording has ended — going live now is live-only.';
  }

  // ---- Recording engine (host only) — the session-owned model, enforced by a
  // 1s controller: START once the maker is live inside the official window (or
  // post-roll); STOP when the post-roll deadline passes. End during the window
  // never touches the recording; End in the post-roll stops it (see click
  // handler). Server calls are idempotent; 409 means already recorded/closed.
  const recState = { started: false, stopped: false, busy: false, err: '' };
  async function recCall(action){
    if(recState.busy) return;
    recState.busy = true;
    try{
      const jwt = await authJwt();
      if(!jwt) return;
      const r = await fetch(REC_URL + '?action=' + action + '&room=' + encodeURIComponent(o.sessionId), {
        method: 'POST', headers: { Authorization: 'Bearer ' + jwt },
      });
      const j = await r.json().catch(() => ({}));
      if(r.ok || r.status === 409){
        recState.err = '';
        if(action === 'start'){ recState.started = true; if(j.closed) recState.stopped = true; }
        if(action === 'stop') recState.stopped = true;
        // The camera take follows the SAME official window as the voice egress:
        // it starts/stops with the server-confirmed recording.
        if(action === 'start' && !recState.stopped) camRecStart();
        if(action === 'stop') camRecFinish();
        if(o.onRecFlag){ try{ o.onRecFlag(recState.started && !recState.stopped); }catch(_){} }
      } else {
        recState.err = j.error || ('rec ' + action + ' failed (' + r.status + ')');
      }
    }catch(_){ recState.err = 'recording service unreachable'; }
    finally{ recState.busy = false; }
  }
  // ---- Camera take (host only, F4) — the local MediaRecorder side of the ONE
  // camera stream (the other side is the LiveKit broadcast). Runs exactly the
  // official window (hooked into recCall above); uploaded via the camera
  // broker Edge Fn keyed on the sessionId, exactly like a solo take.
  let wantCam = false, selfVid = null;
  // Self-view size: big for the first moments (line yourself up), then small;
  // a tap toggles it any time. null = automatic, true/false = user preference.
  let camRingPref = null;
  // Live listening needs an account (Csaba: streaming bandwidth is paid —
  // anonymous visitors watch the replay instead). Client-side gate for now.
  let loggedIn = false;
  supabase.auth.getSession().then(({ data }) => { loggedIn = !!(data && data.session); render(); }).catch(() => {});
  const camRec = { rec: null, chunks: [], startMs: 0, mime: '', state: 'idle', note: '' };
  if(!document.getElementById('vdCamStyles')){
    const s = document.createElement('style');
    s.id = 'vdCamStyles';
    s.textContent = '.vd-ring.vd-cam{width:64px;height:64px;padding:3px}'
      + '.vd-ring.vd-cam .slv-self{width:100%;height:100%;border-radius:50%;overflow:hidden;background:#0b1b28;display:block}'
      + '.vd-ring.vd-cam video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block}'
      + '.vd-ring.vd-cam[data-camring]{cursor:pointer}'
      + '.vd-ring.vd-cam.slv-setup-ring{width:128px;height:128px;padding:4px}'
      + '@media (max-width:600px){ .vd-ring.vd-cam{width:48px;height:48px} .vd-ring.vd-cam.slv-setup-ring{width:96px;height:96px} }'
      // the listener's host-camera panel, right under the dock
      + '.vd-campanel{position:relative;margin:10px 0 4px;border-radius:16px;overflow:hidden;background:#011624;'
      + 'border:1px solid var(--ewr-border,#dfe3e6);box-shadow:0 10px 28px rgba(1,22,36,.08)}'
      + '.vd-campanel video{display:block;width:100%;max-height:320px;object-fit:contain;background:#011624}'
      + '.vd-campanel .vd-camtag{position:absolute;left:10px;bottom:10px;padding:5px 12px;border-radius:999px;'
      + 'background:rgba(1,22,36,.55);color:#fff;font:600 12px Inter,sans-serif}';
    document.head.appendChild(s);
  }
  function bindSelf(){
    const slot = el.querySelector('[data-selfslot]');
    const cs = voice.camStream;
    if(!slot || !cs) return;
    if(!selfVid){
      selfVid = document.createElement('video');
      selfVid.muted = true; selfVid.playsInline = true; selfVid.autoplay = true;
      selfVid.setAttribute('aria-label', 'Your camera preview');
    }
    if(selfVid.srcObject !== cs) selfVid.srcObject = cs;
    if(selfVid.parentNode !== slot) slot.appendChild(selfVid);
    const p = selfVid.play(); if(p && p.catch) p.catch(() => {});
  }
  function camRecStart(){
    const cs = voice.camStream;
    if(camRec.rec || !cs) return;
    try{
      const mt = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(t => { try{ return MediaRecorder.isTypeSupported(t); }catch(_){ return false; } }) || '';
      const opts = { videoBitsPerSecond: 1200000, audioBitsPerSecond: 96000 };
      if(mt) opts.mimeType = mt;
      camRec.rec = new MediaRecorder(cs, opts);
      camRec.mime = camRec.rec.mimeType || mt || 'video/webm';
      camRec.chunks = [];
      camRec.rec.ondataavailable = e => { if(e.data && e.data.size) camRec.chunks.push(e.data); };
      camRec.rec.start(1000);
      camRec.startMs = Date.now();
      camRec.state = 'rec';
    }catch(_){ camRec.rec = null; }
  }
  function camRecStop(){
    const r = camRec.rec;
    const seal = () => {
      camRec.rec = null;
      const blob = new Blob(camRec.chunks, { type: (camRec.mime || 'video/webm').split(';')[0] });
      camRec.chunks = [];
      return blob.size ? blob : null;
    };
    if(!r) return Promise.resolve(null);
    // The stream's tracks may already be gone (End stops the voice right after
    // the recording) — the recorder auto-stopped, but the chunks are still ours.
    if(r.state === 'inactive') return Promise.resolve(seal());
    return new Promise(res => {
      r.onstop = () => res(seal());
      try{ r.stop(); }catch(_){ res(seal()); }
    });
  }
  async function camRecFinish(){
    if(camRec.state !== 'rec') return;
    camRec.state = 'uploading';
    const stopMs = Date.now();
    const blob = await camRecStop();
    render();
    if(!blob){ camRec.state = 'failed'; camRec.note = 'no video captured'; render(); return; }
    try{
      const jwt = await authJwt();
      if(!jwt) throw new Error('login required');
      const ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
      const call = async body => {
        const r = await fetch(SOLO_CAM_URL, { method: 'POST', headers: { authorization: 'Bearer ' + jwt, 'content-type': 'application/json' }, body: JSON.stringify(body) });
        const jj = await r.json().catch(() => ({}));
        if(!r.ok || !jj.ok) throw new Error(jj.error || ('HTTP ' + r.status));
        return jj;
      };
      const grant = await call({ action: 'start', sessionId: Number(o.sessionId), ext });
      const up = await supabase.storage.from('session-camera')
        .uploadToSignedUrl(grant.path, grant.token, blob, { contentType: blob.type || (ext === 'mp4' ? 'video/mp4' : 'video/webm') });
      if(up.error) throw new Error('upload: ' + up.error.message);
      await call({ action: 'finalize', sessionId: Number(o.sessionId), path: grant.path,
        duration: Math.max(1, Math.round((stopMs - camRec.startMs) / 1000)), startedMs: camRec.startMs });
      camRec.state = 'done';
    }catch(e){ camRec.state = 'failed'; camRec.note = e.message || String(e); console.error('[voice cam]', e); }
    render();
  }

  let recCtl = null, lastEarly = null;
  if(REC_ENABLED && o.canHost && o.schedule){
    recCtl = setInterval(() => {
      const p = recPhase();
      const st = voice.state;
      const liveish = st === 'live' || st === 'muted' || st === 'reconnecting';
      if(!recState.started && liveish && (p === 'rec' || p === 'post')) recCall('start');
      // Re-arm the camera take when the recording is already server-confirmed
      // but the take has not begun (camera go-live after the window opened, or
      // the start-hook raced a not-yet-live camStream). Never restarts a
      // finished/uploading take (state guard).
      if(recState.started && !recState.stopped && liveish && (p === 'rec' || p === 'post') && voice.camStream && camRec.state === 'idle') camRecStart();
      if(recState.started && !recState.stopped && p === 'off') recCall('stop');
      // Post-roll over → the voice itself closes too (Csaba's rule: after the
      // closing minute the maker speaks in the NEXT session, not this one).
      if(p === 'off' && (liveish || st === 'connecting')){ camRecFinish(); voice.stop(); return; }
      // The idle card has no tick of its own — keep its countdown/phase line
      // moving too (the live card updates via its own 1s timer).
      if(st === 'idle' || st === 'ended'){
        const sm = el.querySelector('.vd-idle .vd-txt small');
        if(sm){ const line = hostIdleLine(); if(sm.textContent !== line) sm.textContent = line; }
        // the go-live buttons appear when the 10-minute gate opens
        const early = !!(o.schedule && Date.now() < o.schedule.startMs - 600000);
        if(early !== lastEarly){ lastEarly = early; render(); }
        if(p === 'off') render();   // hides the dock for good
      }
    }, 1000);
  }
  // Listener side: the REC chip appears/disappears with the recording phase —
  // re-render occasionally so transparency does not depend on state changes.
  let dockRefresh = null;
  if(REC_ENABLED && !o.canHost && o.schedule){
    dockRefresh = setInterval(() => {
      const st = voice.state;
      // Window closed + the maker's track is gone → leave quietly; the dock
      // hides itself (no invite will return for this session).
      if(recPhase() === 'off' && st === 'waiting'){ voice.stop(); return; }
      if(st === 'listening' || st === 'waiting') render();
    }, 10000);
  }

  function render(){
    if(destroyed) return;
    const st = voice.state;
    if(tickTimer){ clearInterval(tickTimer); tickTimer = null; }

    // Nothing to show: not a host, and the maker is not (yet) live.
    if(!o.canHost && !listenAvailable && !['listening', 'waiting', 'tap', 'connecting', 'reconnecting'].includes(st)){
      el.hidden = true; el.innerHTML = ''; return;
    }
    // The voice window is CLOSED (post-roll over, or the maker said their final
    // word with End during the closing minute): no more going live — the next
    // word belongs to the next session. Hide the dock once idle.
    if(o.canHost && (recPhase() === 'off' || hostDone) && (st === 'idle' || st === 'ended' || st === 'error')){
      // The camera take may still be uploading after the voice closed — keep
      // the maker informed instead of vanishing mid-store.
      if(camRec.state === 'uploading' || camRec.state === 'done' || camRec.state === 'failed'){
        el.hidden = false;
        el.innerHTML = `<div class="vd"><span class="vd-ring">${ringInner(false)}</span>
          <span class="vd-txt"><b>${camRec.state === 'uploading' ? 'Storing your camera recording…' : camRec.state === 'done' ? 'Camera recording saved ✓' : 'Camera recording could not be stored'}</b>
          <small>${camRec.state === 'uploading' ? 'Keep this page open until it finishes.' : camRec.state === 'done' ? 'It becomes part of the ' + noun + '’s share video.' : esc(camRec.note || 'Please try the next ' + noun + ' again.')}</small></span></div>`;
        return;
      }
      el.hidden = true; el.innerHTML = ''; return;
    }
    el.hidden = false;

    if(o.canHost){
      if(st === 'idle' || st === 'ended' || st === 'error'){
        // Streaming costs bandwidth — going live opens 10 minutes before the
        // start (voice and camera alike), not hours ahead (Csaba's rule).
        const tooEarly = !!(o.schedule && Date.now() < o.schedule.startMs - 600000);
        el.innerHTML = `
          <div class="vd vd-idle">
            <span class="vd-ring">${ringInner(false)}</span>
            <span class="vd-txt">
              <b>Guide this ${noun} live</b>
              <small>${st === 'error' ? esc(voice.error || 'Could not start — try again.') : (tooEarly ? 'Going live opens 10 minutes before the start.' : esc(hostIdleLine()))}</small>
            </span>
            ${tooEarly ? '' : `<button type="button" class="vd-btn" data-golive-cam>With camera</button>
            <button type="button" class="vd-btn ghost" data-golive>Voice only</button>`}
          </div>`;
      } else if(st === 'connecting'){
        el.innerHTML = `<div class="vd"><span class="vd-ring vd-on">${ringInner(false)}</span>
          <span class="vd-txt"><b>Connecting…</b><small>Allow the ${wantCam ? 'camera and microphone' : 'microphone'} when asked.</small></span></div>`;
      } else {
        const m = voice.muted;
        // Mute-only during the recorded window (Csaba, 2026-07-05): the maker
        // can pause with Mute but cannot drop the voice mid-window — the
        // recording spans the whole session. End returns in the post-roll
        // (that is the "I am done" gesture that closes the recording).
        const pAtRender = recPhase();
        const canEnd = !(REC_ENABLED && pAtRender === 'rec');
        // Camera mode: the breathing ring is a live mirrored self-view — BIG
        // for the first moments so the maker can line themselves up (the solo
        // pattern), then small; a tap toggles the size any time.
        const ringBig = camRingPref == null ? voice.elapsed() < 12 : camRingPref;
        const camRing = voice.camStream
          ? `<span class="vd-ring vd-cam vd-on ${ringBig ? 'slv-setup-ring' : ''}" data-ring data-camring role="button" tabindex="0" title="Tap to resize your preview"><span class="slv-self" data-selfslot></span></span>`
          : `<span class="vd-ring vd-on" data-ring>${ringInner(false)}</span>`;
        el.innerHTML = `
          <div class="vd vd-live">
            ${camRing}
            <span class="vd-txt">
              <b><span class="vd-dot"></span>${st === 'reconnecting' ? 'Reconnecting…' : (m ? 'Muted' : (voice.camStream ? 'You are live on camera' : 'You are live'))} · <span data-el>${fmtElapsed()}</span>${recChip()}</b>
              <small data-recline>${esc(hostRecLine())}</small>
            </span>
            <button type="button" class="vd-btn ghost" data-mute>${m ? 'Unmute' : 'Mute'}</button>
            ${canEnd ? '<button type="button" class="vd-btn ghost danger" data-end>End</button>' : ''}
          </div>`;
        bindSelf();
        tickTimer = setInterval(() => {
          if(recPhase() !== pAtRender){ render(); return; }   // End (dis)appears with the phase
          const t = el.querySelector('[data-el]');
          if(t) t.textContent = fmtElapsed();
          const rl = el.querySelector('[data-recline]');
          if(rl){ const line = hostRecLine(); if(rl.textContent !== line) rl.textContent = line; }
          // the setup-size self-view shrinks by itself once the maker settled
          if(camRingPref == null && voice.elapsed() >= 12){
            const r = el.querySelector('[data-camring].slv-setup-ring');
            if(r) r.classList.remove('slv-setup-ring');
          }
        }, 1000);
      }
    } else {
      // Listener side
      if(st === 'listening' || st === 'waiting' || st === 'tap' || st === 'reconnecting'){
        el.innerHTML = `
          <div class="vd vd-live">
            <span class="vd-ring vd-on" data-ring>${ringInner(true)}</span>
            <span class="vd-txt">
              <b><span class="vd-dot"></span>${st === 'listening' ? esc(o.hostName) + (camPanel ? ' is live on camera' : ' is speaking') : st === 'reconnecting' ? 'Reconnecting…' : st === 'tap' ? 'Audio is blocked' : 'Connected'}${recChip()}</b>
              <small>${st === 'tap' ? 'Your browser needs one tap to play sound.' : st === 'waiting' ? 'Waiting for the maker…' : camPanel ? 'Live video guidance — watch and listen.' : 'Live voice guidance — relax and listen.'}</small>
            </span>
            ${st === 'tap' ? '<button type="button" class="vd-btn" data-unlock>Enable audio</button>' : ''}
            <button type="button" class="vd-btn ghost" data-leave>Leave</button>
          </div>`;
      } else if(st === 'connecting'){
        el.innerHTML = `<div class="vd"><span class="vd-ring vd-on">${ringInner(true)}</span>
          <span class="vd-txt"><b>Connecting…</b><small>Joining the live voice.</small></span></div>`;
      } else {
        el.innerHTML = loggedIn ? `
          <div class="vd vd-idle">
            <span class="vd-ring vd-invite">${ringInner(true)}</span>
            <span class="vd-txt">
              <b>${esc(o.hostName)} is live</b>
              <small>Live guidance is on — join in, listen, watch.</small>
            </span>
            <button type="button" class="vd-btn" data-listen>Join live</button>
          </div>` : `
          <div class="vd vd-idle">
            <span class="vd-ring vd-invite">${ringInner(true)}</span>
            <span class="vd-txt">
              <b>${esc(o.hostName)} is live</b>
              <small>Live guidance is for members — create a free account to join in.</small>
            </span>
            <button type="button" class="vd-btn" data-login>Log in</button>
          </div>`;
      }
    }

    const q = sel => el.querySelector(sel);
    q('[data-golive]')?.addEventListener('click', () => { wantCam = false; voice.goLive(auth_name()); });
    q('[data-golive-cam]')?.addEventListener('click', () => { wantCam = true; voice.goLive(auth_name(), true); });
    q('[data-login]')?.addEventListener('click', () => { location.hash = '#/login'; });
    q('[data-camring]')?.addEventListener('click', ev => {
      const big = ev.currentTarget.classList.toggle('slv-setup-ring');
      camRingPref = big;
    });
    q('[data-mute]')?.addEventListener('click', () => voice.setMuted(!voice.muted));
    q('[data-end]')?.addEventListener('click', () => {
      // In the post-roll, End is the maker's "I am done" gesture: it closes the
      // recording AND the voice window for good — no Go live comes back (Csaba,
      // 2026-07-05). During the window End is hidden (Mute-only); in the lobby
      // it simply drops the mic and the maker can go live again.
      if(REC_ENABLED && recPhase() === 'post'){
        hostDone = true;
        if(recState.started && !recState.stopped) recCall('stop');
      }
      camRecFinish();   // seal the camera take BEFORE stop() drops the stream
      voice.stop();
    });
    q('[data-listen]')?.addEventListener('click', () => voice.listen(auth_name()));
    q('[data-unlock]')?.addEventListener('click', () => voice.unlockAudio());
    q('[data-leave]')?.addEventListener('click', () => voice.stop());
  }

  function auth_name(){
    try{
      // Lazy import loop avoided: read from the auth module via supabase session metadata is
      // overkill here — views pass hostName; for identity we use a short generic.
      return o.canHost ? o.hostName : 'Listener';
    }catch(_){ return 'Listener'; }
  }

  // Breathing ring: scale + a soft violet glow that swells with the live level —
  // the listener SEES the voice, right next to the vitality curves.
  voice.onLevel(lvl => {
    const ring = el.querySelector('[data-ring]');
    if(!ring) return;
    ring.style.transform = 'scale(' + (1 + lvl * 0.14).toFixed(3) + ')';
    ring.style.boxShadow = '0 0 ' + Math.round(6 + lvl * 26) + 'px rgba(82,48,218,' + (0.15 + lvl * 0.4).toFixed(2) + ')';
  });
  voice.onState(st => {
    // The host's presence flag follows the publishing states only.
    if(o.canHost) flag(st === 'live' || st === 'muted' || st === 'reconnecting');
    render();
  });
  // Listener: the maker's camera track arrives → a video panel appears right
  // under the dock; it leaves with the track (camera off / disconnect).
  let camPanel = null;
  voice.onVideo(track => {
    if(camPanel){ camPanel.remove(); camPanel = null; }
    if(!track || !el.isConnected){ render(); return; }   // copy flips back to voice-only
    camPanel = document.createElement('div');
    camPanel.className = 'vd-campanel';
    const v = track.attach();
    v.setAttribute('playsinline', '');
    v.muted = true;   // the sound rides the audio track — never double it
    const tag = document.createElement('div');
    tag.className = 'vd-camtag';
    tag.textContent = '🎥 ' + (o.hostName || 'The maker') + ' · live';
    camPanel.appendChild(v); camPanel.appendChild(tag);
    el.parentNode.insertBefore(camPanel, el.nextSibling);
    render();   // the listening copy flips to "live on camera / watch and listen"
  });

  render();

  return {
    setListenAvailable(v){
      if(destroyed) return;
      if(listenAvailable === !!v) return;
      listenAvailable = !!v;
      // If the maker stopped while we listen, the Track/Disconnect events do the
      // talking — this flag only controls the invitation card's visibility.
      render();
    },
    // Listener side: the host's presence says whether the recording is running.
    setRecActive(v){
      if(destroyed || o.canHost) return;
      if(recActiveRemote === !!v) return;
      recActiveRemote = !!v;
      const st = voice.state;
      if(st === 'listening' || st === 'waiting' || st === 'tap') render();
    },
    destroy(){
      destroyed = true;
      if(tickTimer) clearInterval(tickTimer);
      if(recCtl) clearInterval(recCtl);
      if(dockRefresh) clearInterval(dockRefresh);
      if(camPanel){ camPanel.remove(); camPanel = null; }
      if(selfVid){ try{ selfVid.srcObject = null; }catch(_){} selfVid = null; }
      // A route change mid-take must not discard the camera recording: seal +
      // upload in the background (SPA — the JS context survives navigation).
      camRecFinish();
      // NOTE: destroy() does NOT stop the recording — it belongs to the session,
      // not to this page view. The post-roll deadline / finalize path closes it.
      voice.stop();
      el.innerHTML = '';
      el.hidden = true;
    },
  };
}

// ---------------------------------------------------------------------------
// Recording playback info for the RACE/SESSION REPLAY (replay.js): a fresh
// signed URL + the recording's wall-clock start, parsed from the storage
// filename (sessions/<id>/voice-<startMs>.mp4 — the voice-rec fn names files
// with the exact egress-start millisecond). Returns null when the session has
// no ready recording. The replay computes: audioTime = (replayT - (recStartMs
// - eventStartMs)) / 1000.
// ---------------------------------------------------------------------------
export async function fetchRecordingPlayback(id, kind = 'session'){
  try{
    // Solo: the recording lives in session_recordings(kind='solo', result_id).
    // The solo-audio Edge Function returns a fresh signed URL server-side
    // (service role) — it starts with the measurement, so offset is 0.
    if(kind === 'solo'){
      const { data: { session } } = await supabase.auth.getSession();
      if(!session) return null;
      const hdr = { authorization: 'Bearer ' + session.access_token };
      // Camera take first (the replay shows the video too); voice-only fallback.
      try{
        const rc = await fetch(SOLO_CAM_URL + '?resultId=' + encodeURIComponent(id), { headers: hdr });
        if(rc.ok){
          const cb = await rc.json().catch(() => ({}));
          if(cb.url) return { url: cb.url, duration: cb.duration || null, recStartMs: null, media: 'video' };
        }
      }catch(_){}
      const r = await fetch(SOLO_AUDIO_URL + '?resultId=' + encodeURIComponent(id), { headers: hdr });
      if(!r.ok) return null;
      const b = await r.json().catch(() => ({}));
      if(!b.url) return null;
      return { url: b.url, duration: b.duration || null, recStartMs: null, media: 'audio' };
    }
    // Session/race: a camera take beats the voice egress for the replay (the
    // maker's video plays in sync). Signed playback needs a login — anonymous
    // viewers fall through to the public voice audio below.
    try{
      const { data: { session } } = await supabase.auth.getSession();
      if(session){
        const rc = await fetch(SOLO_CAM_URL + '?sessionId=' + encodeURIComponent(id), { headers: { authorization: 'Bearer ' + session.access_token } });
        if(rc.ok){
          const cb = await rc.json().catch(() => ({}));
          if(cb.url) return { url: cb.url, duration: cb.duration || null, recStartMs: cb.startedMs || null, media: 'video' };
        }
      }
    }catch(_){}
    const g = async action => {
      const r = await fetch(REC_URL + '?action=' + action + '&room=' + encodeURIComponent(id));
      return { ok: r.ok, body: await r.json().catch(() => ({})) };
    };
    const s = await g('sync');
    if(!s.ok || s.body.status !== 'ready') return null;
    const p = await g('play');
    if(!p.ok || !p.body.url) return null;
    const m = String(p.body.url).match(/\/voice-(\d+)\.[a-z0-9]+/i);
    return {
      url: p.body.url,
      duration: p.body.duration || s.body.duration || null,
      recStartMs: m ? Number(m[1]) : null,   // null → caller falls back to offset 0
    };
  }catch(_){ return null; }
}

// ---------------------------------------------------------------------------
// LISTEN AGAIN — the recording player card on finished session/race results.
// mountVoicePlayer(el, { sessionId, mode, hostName, hostAvatar }) -> { destroy() }
// Public data path (no auth): `sync` says whether a ready recording exists —
// and heals a live/processing row whose egress already finished — then `play`
// fetches a fresh signed URL only when the user actually presses play (so the
// 1-hour URL never sits stale in an open tab). The card hides itself when the
// session has no recording.
// ---------------------------------------------------------------------------
export function mountVoicePlayer(el, opts){
  const o = Object.assign({ mode: 'session', hostName: 'The host', hostAvatar: null }, opts);
  if(!el) return { destroy(){} };
  let destroyed = false, audio = null, pollTimer = null, polls = 0;
  let serverDur = null, fetchingUrl = false;
  let seenExisting = false;   // a sync already confirmed the recording exists
  let pendingSeek = 0;        // fraction dragged before the audio was fetched
  let mediaKind = 'audio';    // camera takes flip this to 'video' → the card plays the VIDEO

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const noun = o.mode === 'race' ? 'race' : 'session';
  const title = o.mode === 'race' ? 'Race commentary' : 'Voice guidance';
  const fmt = t => {
    t = Math.max(0, Math.round(t || 0));
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = String(t % 60).padStart(2, '0');
    return h ? h + ':' + String(m).padStart(2, '0') + ':' + s : m + ':' + s;
  };
  const ringHtml = () => '<span class="vd-ring vp-ring">' + (o.hostAvatar
    ? '<img src="' + esc(o.hostAvatar) + '" alt="" onerror="this.remove()">'
    : '<span class="vd-mic">' + MIC_SVG + '</span>') + '</span>';

  async function recGet(action){
    const r = await fetch(REC_URL + '?action=' + action + '&room=' + encodeURIComponent(o.sessionId));
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, body: j };
  }
  function hide(){
    if(pollTimer){ clearTimeout(pollTimer); pollTimer = null; }
    el.hidden = true; el.innerHTML = '';
  }

  function knownDur(){
    if(audio && isFinite(audio.duration) && audio.duration > 0) return audio.duration;
    return serverDur || 0;
  }
  function paintTime(){
    const t = el.querySelector('[data-time]'); if(!t) return;
    const dur = knownDur();
    const cur = audio ? audio.currentTime : 0;
    t.textContent = dur ? fmt(cur) + ' / ' + fmt(dur) : fmt(cur);
    const seek = el.querySelector('[data-seek]');
    if(seek && dur){
      seek.disabled = false;
      if(!seek.matches(':active')) seek.value = Math.round((cur / dur) * 1000);
      seek.style.setProperty('--vp-fill', ((cur / dur) * 100).toFixed(2) + '%');
    }
  }
  function setPlayIcon(playing){
    const b = el.querySelector('[data-play]'); if(!b) return;
    b.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
    b.setAttribute('aria-label', playing ? 'Pause recording' : 'Play recording');
  }
  function showErr(msg){
    const e2 = el.querySelector('[data-err]'); if(!e2) return;
    e2.hidden = false; e2.textContent = msg;
  }

  function bindAudio(url){
    if(mediaKind === 'video'){
      // camera take: the media element is a visible <video> inside the card
      const slot = el.querySelector('[data-camslot]');
      const v = document.createElement('video');
      v.playsInline = true; v.preload = 'auto'; v.src = url;
      if(slot){ slot.appendChild(v); slot.hidden = false; }
      audio = v;
    } else {
      audio = new Audio(url);
    }
    audio.preload = 'auto';
    // A drag made before the first Play must not be thrown away: apply it as
    // soon as the media can seek.
    audio.addEventListener('loadedmetadata', () => {
      if(pendingSeek > 0){
        const d = knownDur();
        if(d){ try{ audio.currentTime = pendingSeek * d; }catch(_){} }
        pendingSeek = 0;
      }
    });
    audio.addEventListener('timeupdate', paintTime);
    audio.addEventListener('durationchange', paintTime);
    audio.addEventListener('ended', () => { setPlayIcon(false); paintTime(); });
    audio.addEventListener('play', () => setPlayIcon(true));
    audio.addEventListener('pause', () => setPlayIcon(false));
    audio.addEventListener('error', () => { setPlayIcon(false); showErr('Could not load the recording — reload the page and try again.'); });
  }

  async function onPlayClick(){
    // A fresh attempt clears any stale error line (e.g. the autoplay-policy
    // "tap again" hint after the retry succeeded).
    const errEl = el.querySelector('[data-err]');
    if(errEl){ errEl.hidden = true; errEl.textContent = ''; }
    if(!audio){
      if(fetchingUrl) return;
      fetchingUrl = true;
      const btn = el.querySelector('[data-play]');
      if(btn) btn.disabled = true;
      try{
        const r = o.mode === 'solo'
          ? await fetchRecordingPlayback(o.sessionId, 'solo').then(i => i && i.url ? { ok: true, body: { url: i.url } } : { ok: false, body: {} }).catch(() => null)
          : mediaKind === 'video'
            ? await (async () => {   // fresh signed URL for the session camera take
                try{
                  const { data: { session } } = await supabase.auth.getSession();
                  if(!session) return { ok: false, body: {} };
                  const rc = await fetch(SOLO_CAM_URL + '?sessionId=' + encodeURIComponent(o.sessionId), { headers: { authorization: 'Bearer ' + session.access_token } });
                  const cb = await rc.json().catch(() => ({}));
                  return { ok: rc.ok && !!cb.url, body: { url: cb.url } };
                }catch(_){ return { ok: false, body: {} }; }
              })()
            : await recGet('play').catch(() => null);
        if(destroyed) return;
        if(!r || !r.ok || !r.body.url){ showErr((r && r.body.error) || 'The recording is not available right now.'); return; }
        bindAudio(r.body.url);
        await audio.play().catch(() => showErr('Tap play again to start the audio.'));
      } finally {
        fetchingUrl = false;
        const b2 = el.querySelector('[data-play]');
        if(b2) b2.disabled = false;
      }
      return;
    }
    if(audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  function renderReady(){
    if(destroyed) return;
    const vid = mediaKind === 'video';
    if(vid && !document.getElementById('vpCamStyles')){
      const s = document.createElement('style');
      s.id = 'vpCamStyles';
      s.textContent = '.vp-camslot{margin:10px 0 4px;border-radius:14px;overflow:hidden;background:#011624;border:1px solid var(--ewr-border,#dfe3e6)}'
        + '.vp-camslot video{display:block;width:100%;max-height:280px;object-fit:contain;background:#011624}';
      document.head.appendChild(s);
    }
    el.hidden = false;
    el.innerHTML = `
      <div class="vp-card">
        ${ringHtml()}
        <div class="vp-main">
          <div class="vp-head"><b>${vid ? 'Camera recording · Watch again' : title + ' · Listen again'}</b><span class="voice-chip">${vid ? '🎥 Recorded on camera' : '🎙 Recorded live'}</span></div>
          <small>${vid
            ? `${esc(o.hostName)} recorded this ${o.mode === 'solo' ? 'measurement' : noun} on camera${serverDur ? ' · ' + fmt(serverDur) : ''} — closing words included.`
            : `${esc(o.hostName)} guided this ${noun} by voice${serverDur ? ' · ' + fmt(serverDur) : ''}.`}</small>
          ${vid ? '<div class="vp-camslot" data-camslot hidden></div>' : ''}
          <div class="vp-ctl">
            <button type="button" class="vp-play" data-play aria-label="Play recording">${PLAY_SVG}</button>
            <input type="range" class="vp-seek" data-seek min="0" max="1000" value="0" step="1" disabled aria-label="Seek in the recording">
            <span class="vp-time" data-time>${serverDur ? '0:00 / ' + fmt(serverDur) : '0:00'}</span>
          </div>
          <small class="vp-err" data-err hidden></small>
        </div>
      </div>`;
    el.querySelector('[data-play]').addEventListener('click', onPlayClick);
    const seek = el.querySelector('[data-seek]');
    if(serverDur) seek.disabled = false;
    seek.addEventListener('input', () => {
      const dur = knownDur(); if(!dur) return;
      const frac = Number(seek.value) / 1000;
      seek.style.setProperty('--vp-fill', (frac * 100).toFixed(2) + '%');
      if(audio) audio.currentTime = frac * dur;
      else pendingSeek = frac;   // no audio yet — honored on the first Play
    });
  }

  // The session just closed: the egress is still wrapping up. Show a calm
  // "on its way" card and re-check quietly; give up after ~6 minutes.
  function renderPreparing(){
    if(destroyed) return;
    el.hidden = false;
    el.innerHTML = `
      <div class="vp-card">
        ${ringHtml()}
        <div class="vp-main">
          <div class="vp-head"><b>${title}</b><span class="voice-chip">🎙 Recording</span></div>
          <small>The voice recording is being prepared — it appears here shortly after the ${noun} closes.</small>
        </div>
      </div>`;
  }

  async function check(){
    // The slot leaving the DOM (route change while an await was in flight)
    // must end the poll chain — an orphaned player must never keep polling.
    if(destroyed || !el.isConnected){ hide(); return; }
    // Solo: the recording is ready right after upload (no egress wait).
    if(o.mode === 'solo'){
      const i = await fetchRecordingPlayback(o.sessionId, 'solo').catch(() => null);
      if(destroyed || !el.isConnected){ hide(); return; }
      if(i && i.url){ serverDur = i.duration || null; mediaKind = i.media === 'video' ? 'video' : 'audio'; renderReady(); } else hide();
      return;
    }
    // Session/race: a camera take beats the voice egress — the results page
    // shows the same "Watch again" card the solo flow has (closing words
    // included). Needs a login for the signed URL; anonymous viewers get the
    // public voice card below.
    try{
      const { data: { session } } = await supabase.auth.getSession();
      if(session){
        const rc = await fetch(SOLO_CAM_URL + '?sessionId=' + encodeURIComponent(o.sessionId), { headers: { authorization: 'Bearer ' + session.access_token } });
        if(!destroyed && el.isConnected && rc.ok){
          const cb = await rc.json().catch(() => ({}));
          if(cb.url){ mediaKind = 'video'; serverDur = cb.duration || null; renderReady(); return; }
        }
      }
    }catch(_){}
    if(destroyed || !el.isConnected){ hide(); return; }
    const r = await recGet('sync').catch(() => null);
    if(destroyed || !el.isConnected){ hide(); return; }
    if(r && r.ok && r.body.status === 'ready'){
      serverDur = r.body.duration || null;
      renderReady();
      return;
    }
    const stillCooking = !!(r && r.ok && (r.body.status === 'live' || r.body.status === 'processing'));
    // Once a sync confirmed the recording exists, a network blip / transient
    // 5xx mid-poll must not hide it for good — keep waiting within the cap.
    const transient = seenExisting && (!r || (!r.ok && r.status !== 404));
    if(stillCooking || transient){
      if(stillCooking) seenExisting = true;
      if(!el.querySelector('.vp-card')) renderPreparing();
      if(++polls < 18) pollTimer = setTimeout(check, 20000);
      else hide();
      return;
    }
    hide();   // no recording / failed / gone
  }
  check();

  return {
    destroy(){
      destroyed = true;
      if(pollTimer) clearTimeout(pollTimer);
      if(audio){ try{ audio.pause(); }catch(_){} audio.src = ''; audio = null; }
      el.innerHTML = ''; el.hidden = true;
    },
  };
}
