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
export const REC_POSTROLL_MS = 5 * 60000;

let lkPromise = null;
const loadLk = () => (lkPromise ||= import('https://esm.sh/livekit-client@2'));

const MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>';

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
  const stateCbs = new Set(), levelCbs = new Set();
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
    room.on(L.RoomEvent.Disconnected, () => { stopMeter(); if(state !== 'idle') set('ended'); });
    if(role !== 'host'){
      room.on(L.RoomEvent.TrackSubscribed, (track) => {
        if(track.kind !== 'audio') return;
        const el = track.attach();
        el.setAttribute('playsinline', '');
        document.body.appendChild(el);
        meterFrom(track.mediaStreamTrack);
        set('listening');
      });
      room.on(L.RoomEvent.TrackUnsubscribed, (track) => {
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

  return {
    get state(){ return state; },
    get muted(){ return muted; },
    get error(){ return lastErr; },
    elapsed(){ return startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0; },
    onState(cb){ stateCbs.add(cb); return () => stateCbs.delete(cb); },
    onLevel(cb){ levelCbs.add(cb); return () => levelCbs.delete(cb); },

    async goLive(name){
      if(state !== 'idle' && state !== 'ended' && state !== 'error') return;
      set('connecting');
      try{
        const L = await connect('host', name);
        await room.localParticipant.setMicrophoneEnabled(true);
        const pub = room.localParticipant.getTrackPublication(L.Track.Source.Microphone);
        if(pub && pub.track) meterFrom(pub.track.mediaStreamTrack);
        muted = false;
        startedAt = Date.now();
        acquireWake();
        set('live');
      }catch(e){
        lastErr = e.message || String(e);
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
      try{ await room.localParticipant.setMicrophoneEnabled(!muted); }catch(_){}
      set(muted ? 'muted' : 'live');
    },

    async unlockAudio(){
      try{ if(room) await room.startAudio(); }catch(_){}
    },

    async stop(){
      releaseWake();
      stopMeter();
      startedAt = 0;
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
    if(p === 'post') return 'Closing words — still recording · ' + postLeft() + ' left (End stops it).';
    return 'Recording finished — you are live, off the record.';
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
        if(o.onRecFlag){ try{ o.onRecFlag(recState.started && !recState.stopped); }catch(_){} }
      } else {
        recState.err = j.error || ('rec ' + action + ' failed (' + r.status + ')');
      }
    }catch(_){ recState.err = 'recording service unreachable'; }
    finally{ recState.busy = false; }
  }
  let recCtl = null;
  if(REC_ENABLED && o.canHost && o.schedule){
    recCtl = setInterval(() => {
      const p = recPhase();
      const st = voice.state;
      const liveish = st === 'live' || st === 'muted' || st === 'reconnecting';
      if(!recState.started && liveish && (p === 'rec' || p === 'post')) recCall('start');
      if(recState.started && !recState.stopped && p === 'off') recCall('stop');
      // The idle card has no tick of its own — keep its countdown/phase line
      // moving too (the live card updates via its own 1s timer).
      if(st === 'idle' || st === 'ended'){
        const sm = el.querySelector('.vd-idle .vd-txt small');
        if(sm){ const line = hostIdleLine(); if(sm.textContent !== line) sm.textContent = line; }
      }
    }, 1000);
  }
  // Listener side: the REC chip appears/disappears with the recording phase —
  // re-render occasionally so transparency does not depend on state changes.
  let dockRefresh = null;
  if(REC_ENABLED && !o.canHost && o.schedule){
    dockRefresh = setInterval(() => {
      const st = voice.state;
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
    el.hidden = false;

    if(o.canHost){
      if(st === 'idle' || st === 'ended' || st === 'error'){
        el.innerHTML = `
          <div class="vd vd-idle">
            <span class="vd-ring">${ringInner(false)}</span>
            <span class="vd-txt">
              <b>Guide this ${noun} with your voice</b>
              <small>${st === 'error' ? esc(voice.error || 'Could not start — try again.') : esc(hostIdleLine())}</small>
            </span>
            <button type="button" class="vd-btn" data-golive>Go live</button>
          </div>`;
      } else if(st === 'connecting'){
        el.innerHTML = `<div class="vd"><span class="vd-ring vd-on">${ringInner(false)}</span>
          <span class="vd-txt"><b>Connecting…</b><small>Allow the microphone when asked.</small></span></div>`;
      } else {
        const m = voice.muted;
        el.innerHTML = `
          <div class="vd vd-live">
            <span class="vd-ring vd-on" data-ring>${ringInner(false)}</span>
            <span class="vd-txt">
              <b><span class="vd-dot"></span>${st === 'reconnecting' ? 'Reconnecting…' : (m ? 'Muted' : 'You are live')} · <span data-el>${fmtElapsed()}</span>${recChip()}</b>
              <small data-recline>${esc(hostRecLine())}</small>
            </span>
            <button type="button" class="vd-btn ghost" data-mute>${m ? 'Unmute' : 'Mute'}</button>
            <button type="button" class="vd-btn ghost danger" data-end>End</button>
          </div>`;
        tickTimer = setInterval(() => {
          const t = el.querySelector('[data-el]');
          if(t) t.textContent = fmtElapsed();
          const rl = el.querySelector('[data-recline]');
          if(rl){ const line = hostRecLine(); if(rl.textContent !== line) rl.textContent = line; }
        }, 1000);
      }
    } else {
      // Listener side
      if(st === 'listening' || st === 'waiting' || st === 'tap' || st === 'reconnecting'){
        el.innerHTML = `
          <div class="vd vd-live">
            <span class="vd-ring vd-on" data-ring>${ringInner(true)}</span>
            <span class="vd-txt">
              <b><span class="vd-dot"></span>${st === 'listening' ? esc(o.hostName) + ' is speaking' : st === 'reconnecting' ? 'Reconnecting…' : st === 'tap' ? 'Audio is blocked' : 'Voice connected'}${recChip()}</b>
              <small>${st === 'tap' ? 'Your browser needs one tap to play sound.' : st === 'waiting' ? 'Waiting for the maker’s voice…' : 'Live voice guidance — relax and listen.'}</small>
            </span>
            ${st === 'tap' ? '<button type="button" class="vd-btn" data-unlock>Enable audio</button>' : ''}
            <button type="button" class="vd-btn ghost" data-leave>Leave</button>
          </div>`;
      } else if(st === 'connecting'){
        el.innerHTML = `<div class="vd"><span class="vd-ring vd-on">${ringInner(true)}</span>
          <span class="vd-txt"><b>Connecting…</b><small>Joining the live voice.</small></span></div>`;
      } else {
        el.innerHTML = `
          <div class="vd vd-idle">
            <span class="vd-ring vd-invite">${ringInner(true)}</span>
            <span class="vd-txt">
              <b>${esc(o.hostName)} is live</b>
              <small>Voice guidance is on — join in, close your eyes, listen.</small>
            </span>
            <button type="button" class="vd-btn" data-listen>Listen live</button>
          </div>`;
      }
    }

    const q = sel => el.querySelector(sel);
    q('[data-golive]')?.addEventListener('click', () => voice.goLive(auth_name()));
    q('[data-mute]')?.addEventListener('click', () => voice.setMuted(!voice.muted));
    q('[data-end]')?.addEventListener('click', () => {
      // In the post-roll, End also closes the recording — that is the maker's
      // "I am done" gesture. During the window it only drops the mic.
      if(REC_ENABLED && recState.started && !recState.stopped && recPhase() === 'post') recCall('stop');
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
      // NOTE: destroy() does NOT stop the recording — it belongs to the session,
      // not to this page view. The post-roll deadline / finalize path closes it.
      voice.stop();
      el.innerHTML = '';
      el.hidden = true;
    },
  };
}
