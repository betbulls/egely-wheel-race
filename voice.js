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

let lkPromise = null;
const loadLk = () => (lkPromise ||= import('https://esm.sh/livekit-client@2'));

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
      // The stored access token can be stale (1h expiry) — a stale JWT made the
      // server reject the real host. Refresh proactively when it's about to lapse.
      let { data } = await supabase.auth.getSession();
      let sess = data?.session || null;
      if(sess && sess.expires_at && (sess.expires_at * 1000 - Date.now()) < 120000){
        try{
          const r = await supabase.auth.refreshSession();
          if(r?.data?.session) sess = r.data.session;
        }catch(_){}
      }
      const jwt = sess?.access_token;
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
  const o = Object.assign({ mode: 'session', canHost: false, hostName: 'The host', onVoiceFlag: null }, opts);
  const voice = createVoice(o.sessionId);
  let listenAvailable = false, destroyed = false, tickTimer = null;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const noun = o.mode === 'race' ? 'race' : 'session';

  function flag(v){ if(o.onVoiceFlag){ try{ o.onVoiceFlag(!!v); }catch(_){} } }

  function fmtElapsed(){
    const s = voice.elapsed();
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
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
            <span class="vd-ring"><span class="vd-mic">🎙</span></span>
            <span class="vd-txt">
              <b>Guide this ${noun} with your voice</b>
              <small>${st === 'error' ? esc(voice.error || 'Could not start — try again.') : 'Participants hear you live — no camera, just your voice.'}</small>
            </span>
            <button type="button" class="vd-btn" data-golive>Go live</button>
          </div>`;
      } else if(st === 'connecting'){
        el.innerHTML = `<div class="vd"><span class="vd-ring vd-on"><span class="vd-mic">🎙</span></span>
          <span class="vd-txt"><b>Connecting…</b><small>Allow the microphone when asked.</small></span></div>`;
      } else {
        const m = voice.muted;
        el.innerHTML = `
          <div class="vd vd-live">
            <span class="vd-ring vd-on" data-ring><span class="vd-mic">🎙</span></span>
            <span class="vd-txt">
              <b><span class="vd-dot"></span>${st === 'reconnecting' ? 'Reconnecting…' : (m ? 'Muted' : 'You are live')} · <span data-el>${fmtElapsed()}</span></b>
              <small>Your voice is guiding this ${noun}.</small>
            </span>
            <button type="button" class="vd-btn ghost" data-mute>${m ? 'Unmute' : 'Mute'}</button>
            <button type="button" class="vd-btn ghost" data-end>End</button>
          </div>`;
        tickTimer = setInterval(() => {
          const t = el.querySelector('[data-el]');
          if(t) t.textContent = fmtElapsed();
        }, 1000);
      }
    } else {
      // Listener side
      if(st === 'listening' || st === 'waiting' || st === 'tap' || st === 'reconnecting'){
        el.innerHTML = `
          <div class="vd vd-live">
            <span class="vd-ring vd-on" data-ring><span class="vd-mic">🎧</span></span>
            <span class="vd-txt">
              <b><span class="vd-dot"></span>${st === 'listening' ? esc(o.hostName) + ' is speaking' : st === 'reconnecting' ? 'Reconnecting…' : st === 'tap' ? 'Audio is blocked' : 'Voice connected'}</b>
              <small>${st === 'tap' ? 'Your browser needs one tap to play sound.' : st === 'waiting' ? 'Waiting for the maker’s voice…' : 'Live voice guidance — relax and listen.'}</small>
            </span>
            ${st === 'tap' ? '<button type="button" class="vd-btn" data-unlock>Enable audio</button>' : ''}
            <button type="button" class="vd-btn ghost" data-leave>Leave</button>
          </div>`;
      } else if(st === 'connecting'){
        el.innerHTML = `<div class="vd"><span class="vd-ring vd-on"><span class="vd-mic">🎧</span></span>
          <span class="vd-txt"><b>Connecting…</b><small>Joining the live voice.</small></span></div>`;
      } else {
        el.innerHTML = `
          <div class="vd vd-idle">
            <span class="vd-ring vd-invite"><span class="vd-mic">🎙</span></span>
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
    q('[data-end]')?.addEventListener('click', () => voice.stop());
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

  // Breathing ring: scale with the live audio level.
  voice.onLevel(lvl => {
    const ring = el.querySelector('[data-ring]');
    if(ring) ring.style.transform = 'scale(' + (1 + lvl * 0.16).toFixed(3) + ')';
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
    destroy(){
      destroyed = true;
      if(tickTimer) clearInterval(tickTimer);
      voice.stop();
      el.innerHTML = '';
      el.hidden = true;
    },
  };
}
