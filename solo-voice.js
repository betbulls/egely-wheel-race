// solo-voice.js — optional microphone (or camera+microphone) recording during a
// SOLO measurement.
//
// Mirrors the session/race voice model AND its dock UI (voice.js mountVoiceDock):
// one calm bar with a breathing ring, a "● REC" chip and a Mute control. The
// recording spans the measurement window PLUS a 1-minute post-roll for the
// closing words — exactly like the session/race REC_POSTROLL_MS. During the
// measurement the dock offers Mute only (no End); when the measurement ends the
// dock STAYS PUT (Csaba: a jumping bar loses the user mid-sentence) and shows
// the closing-words phase with a live countdown and an End button. Ending the
// take (End / timeout / Save) RELEASES the devices immediately — the camera
// light goes off the moment the recording stops.
//
// Two modes, chosen at arm time:
//   audio — voice only (the original path, unchanged): one audio/webm blob,
//           uploaded through the solo-audio Edge Function (service role).
//   video — camera + voice in ONE video/webm blob (the maker's face is
//           composited onto the share video by the render worker). The breathing
//           ring becomes a live mirrored self-view, so consent is visceral:
//           you see yourself exactly while you are being recorded.
//
// Upload paths (the RLS lesson: the client NEVER writes private Storage itself):
//   audio → solo-audio Edge Fn (multipart body, small files).
//   video → solo-camera Edge Fn as a permission broker: it verifies the caller
//           owns the result and hands back a signed upload URL; the client
//           streams the (potentially ~100 MB) file STRAIGHT to Storage with
//           that token — no Edge-Fn body limit, no RLS policy involved — then
//           calls the Fn again to finalize the session_recordings row
//           (kind='solo', media='video', result_id).
// The stored duration is the FULL recording (measurement + closing words) so
// the render worker holds the video through the closing words.

import { supabase } from './db.js';

// Server-side endpoints — the browser sends its JWT; the Edge Functions act
// with the service role (exactly like the session/race recordings).
const FN_URL = 'https://lhyychkrcrndjptptkii.supabase.co/functions/v1/solo-audio';
const FN_CAM_URL = 'https://lhyychkrcrndjptptkii.supabase.co/functions/v1/solo-camera';
const CAM_BUCKET = 'session-camera';

// Post-roll for the closing words — same as the session/race REC_POSTROLL_MS.
const REC_POSTROLL_MS = 60 * 1000;

const CAN_REC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

// Same mic glyph the voice dock uses, so the solo dock is visually identical.
const MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>';

let cssDone = false;
function injectCss() {
  if (cssDone || document.getElementById('soloVoiceStyles')) { cssDone = true; return; }
  cssDone = true;
  const s = document.createElement('style');
  s.id = 'soloVoiceStyles';
  // The dock itself reuses the shared .vd-* voice-dock language from
  // ewr-redesign.css — solo-specific bits: the denial tint and the camera
  // self-view ring (the gradient ring wraps a live mirrored preview).
  s.textContent = `
.slv-warn{color:#c2415b !important}
.vd-ring.vd-cam{width:64px;height:64px;padding:3px}
.vd-ring.vd-cam .slv-self{width:100%;height:100%;border-radius:50%;overflow:hidden;background:#0b1b28;display:block}
.vd-ring.vd-cam video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block}
.vd.slv-setup .vd-ring.vd-cam{width:128px;height:128px;padding:4px}
@media (max-width:600px){
  .vd-ring.vd-cam{width:48px;height:48px}
  .vd.slv-setup .vd-ring.vd-cam{width:96px;height:96px}
  .vd.slv-setup .vd-txt{flex-basis:calc(100% - 110px)}
}`;
  document.head.appendChild(s);
}

export function createSoloVoice(mountEl) {
  injectCss();

  const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const homeMount = mountEl;   // the setup-panel slot; the row lives here except during the post-roll

  // phase: 'arm' (off) · 'ready' (armed, before/after a take) · 'rec' (recording
  //        during the measurement) · 'post' (closing words, End available) ·
  //        'done' (recording finalized)
  // mode:  'audio' (voice only) · 'video' (camera + voice)
  let phase = 'arm';
  let mode = 'audio';       // what the devices are armed for right now
  let takeMode = 'audio';   // what the CURRENT take was recorded as (survives disarm)
  let armed = false, muted = false;
  let rec = null, stream = null, chunks = [], recStartMs = 0, recStopMs = 0, blob = null, stopping = null, recMime = '';
  let armError = '';
  let armSeq = 0;           // guards against a stale getUserMedia resolving after a newer arm/disarm
  let elTimer = null, postTimer = null, postDeadline = 0, raf = 0, actx = null;

  const row = document.createElement('div');
  row.className = 'voice-dock';
  homeMount.appendChild(row);

  const micRing = () => '<span class="vd-mic">' + MIC_SVG + '</span>';
  // Camera mode: the ring IS a live self-view — you see yourself while recorded.
  const ringHtml = (on) => mode === 'video' && stream
    ? `<span class="vd-ring vd-cam ${on ? 'vd-on' : ''}" data-ring><span class="slv-self" data-selfslot></span></span>`
    : `<span class="vd-ring ${on ? 'vd-on' : ''}" ${on ? 'data-ring' : ''}>${micRing()}</span>`;

  function fmtClock(sec) {
    sec = Math.max(0, sec);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  const elapsedSec = () => recStartMs ? Math.max(0, Math.floor((Date.now() - recStartMs) / 1000)) : 0;
  const postLeftSec = () => Math.max(0, Math.ceil((postDeadline - Date.now()) / 1000));

  // ONE persistent self-view element, re-parented into whatever ring the
  // current phase renders — moving it keeps playback running, so phase
  // changes never flash a black frame while the video re-decodes.
  let selfVid = null;
  function bindSelf() {
    const slot = row.querySelector('[data-selfslot]');
    if (!slot || !stream) return;
    if (!selfVid) {
      selfVid = document.createElement('video');
      selfVid.muted = true; selfVid.playsInline = true; selfVid.autoplay = true;
      selfVid.setAttribute('data-self', '');
      selfVid.setAttribute('aria-label', 'Your camera preview');
    }
    if (selfVid.srcObject !== stream) selfVid.srcObject = stream;
    if (selfVid.parentNode !== slot) slot.appendChild(selfVid);
    const p = selfVid.play(); if (p && p.catch) p.catch(() => {});
  }

  // Breathing ring: scale + a soft violet glow that swells with the live mic
  // level — the exact meter the session/race dock uses (voice.js meterFrom).
  // Runs continuously while armed; it updates whatever [data-ring] the current
  // phase renders (none in arm/done → no-op).
  function stopMeter() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    const r = row.querySelector('[data-ring]');
    if (r) { r.style.transform = ''; r.style.boxShadow = ''; }
  }
  function startMeter() {
    if (prefersReduced || !stream) return;   // static ring under reduced motion
    stopMeter();
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume().catch(() => {});
      const src = actx.createMediaStreamSource(stream);
      const an = actx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        an.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const lvl = Math.min(1, (sum / buf.length) / 90);
        const ring = row.querySelector('[data-ring]');
        if (ring) {
          ring.style.transform = 'scale(' + (1 + lvl * 0.14).toFixed(3) + ')';
          ring.style.boxShadow = '0 0 ' + Math.round(6 + lvl * 26) + 'px rgba(82,48,218,' + (0.15 + lvl * 0.4).toFixed(2) + ')';
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (_) { /* meter is decorative — never fatal */ }
  }

  function render() {
    if (!CAN_REC) { row.innerHTML = ''; return; }
    const vid = mode === 'video';
    if (phase === 'arm') {
      row.innerHTML = `
        <div class="vd vd-idle">
          <span class="vd-ring">${micRing()}</span>
          <span class="vd-txt">
            <b>Record yourself</b>
            <small class="${armError ? 'slv-warn' : ''}">${armError || 'Your voice — or your face too — is recorded while you measure and becomes your share video.'}</small>
          </span>
          <button type="button" class="vd-btn" data-arm-cam>With camera</button>
          <button type="button" class="vd-btn ghost" data-arm>Voice only</button>
        </div>`;
    } else if (phase === 'ready') {
      // Camera setup moment: the self-view is LARGE here so you can line
      // yourself up before the take — it shrinks once the measurement starts.
      row.innerHTML = `
        <div class="vd ${vid ? 'slv-setup' : ''}">
          ${ringHtml(true)}
          <span class="vd-txt">
            <b>${vid ? 'Camera ready' : 'Voice ready'}</b>
            <small>${vid
              ? 'Line yourself up in the preview — recording starts when you begin measuring, and you’re on camera until you finish.'
              : 'Recording starts when you begin measuring — it plays on your share video.'}</small>
          </span>
          <button type="button" class="vd-btn ghost" data-off>Off</button>
        </div>`;
    } else if (phase === 'rec') {   // during the measurement — mirrors the dock: Mute only, no End
      row.innerHTML = `
        <div class="vd vd-live">
          ${ringHtml(true)}
          <span class="vd-txt">
            <b><span class="vd-dot"></span>${muted ? 'Muted' : (vid ? 'Recording you' : 'Recording your voice')} · <span data-el>${fmtClock(elapsedSec())}</span><span class="vd-rec">● REC</span></b>
            <small>${muted
              ? (vid ? 'This part will be silent on your video — the camera keeps rolling.' : 'This part will be silent on your video — unmute to keep recording.')
              : (vid ? 'Your face and everything you say become your share video.' : 'Everything you say is kept — it plays on your share video.')}</small>
          </span>
          <button type="button" class="vd-btn ghost" data-mute>${muted ? 'Unmute' : 'Mute'}</button>
        </div>`;
    } else if (phase === 'post') {   // closing words, after the measurement — End appears here (the post-roll)
      row.innerHTML = `
        <div class="vd vd-live">
          ${ringHtml(true)}
          <span class="vd-txt">
            <b><span class="vd-dot"></span>Closing words · <span data-el>${fmtClock(postLeftSec())}</span> left<span class="vd-rec">● REC</span></b>
            <small>${vid
              ? 'Say a closing word to the camera — it plays at the very end of your share video. Tap End when you’re done.'
              : 'Add a closing word — it plays at the end of your share video. Tap End when you’re done.'}</small>
          </span>
          <button type="button" class="vd-btn ghost danger" data-end>End</button>
        </div>`;
    } else {   // done — recording finalized, devices already released (LED off)
      row.innerHTML = `
        <div class="vd">
          <span class="vd-ring">${micRing()}</span>
          <span class="vd-txt">
            <b>${takeMode === 'video' ? 'Camera captured ✓ · camera off' : 'Voice captured ✓'}</b>
            <small>${takeMode === 'video' ? 'Save your measurement to attach it to your share video.' : 'It plays on your share video — save your measurement to keep it.'}</small>
          </span>
        </div>`;
    }
    const q = sel => row.querySelector(sel);
    q('[data-arm]')?.addEventListener('click', () => arm('audio'));
    q('[data-arm-cam]')?.addEventListener('click', () => arm('video'));
    q('[data-off]')?.addEventListener('click', disarm);
    q('[data-mute]')?.addEventListener('click', toggleMute);
    q('[data-end]')?.addEventListener('click', endPostRoll);
    bindSelf();
  }

  async function arm(kind) {
    armError = '';
    const seq = ++armSeq;   // a newer arm/disarm invalidates this request
    try {   // ask for the devices right away so a denial is visible before Start
      const constraints = kind === 'video'
        ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } }
        : { audio: true };
      const st = await navigator.mediaDevices.getUserMedia(constraints);
      if (seq !== armSeq) { try { st.getTracks().forEach(tr => tr.stop()); } catch (_) {} return; }   // stale grant — drop it
      if (stream) { try { stream.getTracks().forEach(tr => tr.stop()); } catch (_) {} }   // re-arm with a different mode
      stream = st;
      // A pulled cable / OS-level revoke mid-take must not strand the dock on
      // "● REC": finish the take with what we have; before a take, just disarm.
      st.getTracks().forEach(tr => { tr.onended = () => {
        if (stream !== st) return;
        if (phase === 'rec' || phase === 'post') endPostRoll();
        else if (phase === 'ready') { armError = kind === 'video' ? 'The camera was disconnected.' : 'The microphone was disconnected.'; disarm(); }
      }; });
      mode = kind;
      armed = true; phase = 'ready';
      render();
      startMeter();
    } catch (e) {
      if (seq !== armSeq) return;
      armed = false; stream = null;
      const name = (e && e.name) || '';
      if (kind === 'video') {
        armError = name === 'NotFoundError' || name === 'OverconstrainedError' ? 'No camera was found on this device — you can still record voice only.'
          : name === 'NotReadableError' ? 'Your camera is in use by another app — close it and try again, or record voice only.'
          : 'Camera or microphone access was denied — allow both in the browser, or record voice only.';
      } else {
        armError = name === 'NotFoundError' ? 'No microphone was found on this device.'
          : name === 'NotReadableError' ? 'Your microphone is in use by another app — close it and try again.'
          : 'Microphone access was denied — enable it in the browser to record.';
      }
      render();
    }
  }

  function disarm() {   // offered before a take, and used to release the camera after a save
    armSeq++;   // invalidate any in-flight arm
    armed = false; phase = 'arm'; muted = false; mode = 'audio';
    stopMeter();
    if (stream) { stream.getTracks().forEach(tr => tr.stop()); stream = null; }
    if (selfVid) { try { selfVid.srcObject = null; } catch (_) {} selfVid = null; }
    if (row.parentNode !== homeMount) homeMount.appendChild(row);   // back home from a post-roll relocation
    render();
  }

  function toggleMute() {
    muted = !muted;
    // Mute silences the microphone only — in camera mode the video keeps rolling
    // (a silent stretch on the timeline, exactly like the session/race dock).
    try { if (stream) stream.getAudioTracks().forEach(tr => tr.enabled = !muted); } catch (_) {}
    render();   // the meter flattens on its own while the track is disabled
  }

  // Finalize the MediaRecorder (resolve `stopping` when the blob is ready).
  function stopRecorder() {
    if (recStopMs === 0) recStopMs = Date.now();
    if (elTimer) { clearInterval(elTimer); elTimer = null; }
    stopping = new Promise(res => {
      if (!rec || rec.state === 'inactive') { res(); return; }
      rec.onstop = () => { blob = new Blob(chunks, { type: recMime || (takeMode === 'video' ? 'video/webm' : 'audio/webm') }); res(); };
      try { rec.stop(); } catch (_) { res(); }
    });
    return stopping;
  }

  // After the measurement ends: keep recording for the closing words. The bar
  // does NOT move — it switches to the countdown phase right where it is
  // (the evalMount arg is accepted for the view's sake and ignored: a bar that
  // jumped into the results panel made the user scroll to find it — Csaba).
  function beginPostRoll(_evalMount) {
    if (!armed || !rec || rec.state === 'inactive') return false;   // nothing recording
    if (elTimer) { clearInterval(elTimer); elTimer = null; }
    phase = 'post';
    postDeadline = Date.now() + REC_POSTROLL_MS;
    render();
    if (postTimer) clearInterval(postTimer);
    postTimer = setInterval(() => {
      if (Date.now() >= postDeadline) { endPostRoll(); return; }
      const t = row.querySelector('[data-el]'); if (t) t.textContent = fmtClock(postLeftSec());
    }, 500);
    return true;
  }

  // Drop the hardware without dropping the take: the finished blob still
  // counts as "armed" (getter) so Save can store it, but the camera light and
  // the mic indicator go off the moment the recording ends.
  function releaseDevices() {
    armed = false;
    stopMeter();
    if (stream) { try { stream.getTracks().forEach(tr => tr.stop()); } catch (_) {} stream = null; }
    if (selfVid) { try { selfVid.srcObject = null; } catch (_) {} selfVid = null; }
  }

  // End the recording for good (End button, post-roll timeout, or Save).
  function endPostRoll() {
    if (postTimer) { clearInterval(postTimer); postTimer = null; }
    if (rec && rec.state !== 'inactive') {
      const p = stopRecorder();
      // release the hardware once the blob is sealed (killing tracks before
      // onstop can drop the final chunk in some browsers)
      p.then(() => releaseDevices());
      phase = 'done';
      render();
      return p;
    }
    return stopping || Promise.resolve();
  }

  // Pick the best container the browser can actually record.
  function pickMime(vid) {
    const list = vid
      ? ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']   // vp8 = cheap realtime encode; mp4 = Safari
      : ['audio/webm;codecs=opus'];
    for (const t of list) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (_) {} }
    return '';
  }

  // Camera upload, step by step (the Edge Fn is a permission broker — see top).
  async function saveVideoFor(resultId, jwt) {
    const ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
    // Bucket mime whitelists match the BASE type — strip codec parameters
    // ('video/webm;codecs=vp8,opus' would be rejected as-is).
    const contentType = (blob.type.split(';')[0] || '').trim() || (ext === 'mp4' ? 'video/mp4' : 'video/webm');
    const call = async body => {
      const r = await fetch(FN_CAM_URL, {
        method: 'POST',
        headers: { authorization: 'Bearer ' + jwt, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
      return j;
    };
    const grant = await call({ action: 'start', resultId, ext });                       // 1) owner-checked signed upload URL
    const up = await supabase.storage.from(CAM_BUCKET)
      .uploadToSignedUrl(grant.path, grant.token, blob, { contentType });               // 2) direct-to-Storage (large-file safe)
    if (up.error) throw new Error('upload: ' + up.error.message);
    const recDurSec = Math.max(1, Math.round(((recStopMs || Date.now()) - recStartMs) / 1000));
    await call({ action: 'finalize', resultId, path: grant.path, duration: recDurSec, startedMs: recStartMs });   // 3) session_recordings row
  }

  render();

  return {
    // "armed" to the view means "there is (or will be) a take worth saving" —
    // a finished blob still counts even after the camera hardware was released
    // (the done-phase "Turn off camera" only drops the devices, not the take).
    get armed() { return armed || !!(blob && blob.size); },
    beginPostRoll,
    endPostRoll,
    start() {
      if (!armed || !stream) return;
      if (row.parentNode !== homeMount) homeMount.appendChild(row);   // back from a prior post-roll
      if (postTimer) { clearInterval(postTimer); postTimer = null; }
      // A redo can start while the previous take's post-roll is still rolling —
      // neutralize the old recorder first, or its ondataavailable keeps pushing
      // foreign clusters into the NEW take's chunks array (corrupt blob).
      if (rec && rec.state !== 'inactive') { try { rec.ondataavailable = null; rec.stop(); } catch (_) {} }
      rec = null; stopping = null;
      chunks = []; blob = null; recStartMs = Date.now(); recStopMs = 0; muted = false;
      try { stream.getAudioTracks().forEach(tr => tr.enabled = true); } catch (_) {}
      try {
        const vid = mode === 'video';
        const mt = pickMime(vid);
        const opts = {};
        if (mt) opts.mimeType = mt;
        if (vid) { opts.videoBitsPerSecond = 1200000; opts.audioBitsPerSecond = 96000; }   // 720p talking head ≈ 10 MB/min
        rec = new MediaRecorder(stream, Object.keys(opts).length ? opts : undefined);
        recMime = rec.mimeType || mt || '';
        takeMode = vid ? 'video' : 'audio';
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.start(1000);
        phase = 'rec';
        if (elTimer) clearInterval(elTimer);
        elTimer = setInterval(() => { const t = row.querySelector('[data-el]'); if (t) t.textContent = fmtClock(elapsedSec()); }, 1000);
        render();
      } catch (_) {
        // recorder could not start — say so honestly instead of a silent
        // "ready" bar that implies the take is being captured
        rec = null;
        armError = 'Recording could not start in this browser — the measurement continues without it.';
        disarm();
      }
    },
    // After the results row exists: store the recording server-side (audio via
    // the solo-audio Fn; video via the solo-camera broker + signed upload).
    // The stored duration is the FULL recording (measurement + closing words) so
    // the render worker holds the video through the closing words.
    async saveFor(resultId, _uid) {
      await endPostRoll();                                    // finalize if the post-roll is still open
      if (stopping) { try { await stopping; } catch (_) {} }  // ensure the blob is finalized
      if (!blob || !blob.size) {
        if (!armed) return { ok: false, reason: 'not recording' };
        console.error('[solo-voice] empty blob', { chunks: chunks.length });
        return { ok: false, reason: takeMode === 'video' ? 'no video captured' : 'no audio captured' };
      }
      if (!resultId) return { ok: false, reason: 'missing id' };
      const media = takeMode;   // the take's own mode — `mode` may already be reset by a camera release
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('login required');
        if (media === 'video') {
          await saveVideoFor(resultId, session.access_token);
          blob = null;
          // the take is stored — release the camera so its light goes off
          disarm();
          return { ok: true, media };
        }
        const recDurSec = Math.max(1, Math.round(((recStopMs || Date.now()) - recStartMs) / 1000));
        const fd = new FormData();
        fd.append('file', blob, 'voice.webm');
        fd.append('resultId', String(resultId));
        fd.append('duration', String(recDurSec));
        const r = await fetch(FN_URL, { method: 'POST', headers: { authorization: 'Bearer ' + session.access_token }, body: fd });
        const jr = await r.json().catch(() => ({}));
        if (!r.ok || !jr.ok) { console.error('[solo-voice] server upload failed', jr); throw new Error(jr.error || ('HTTP ' + r.status)); }
        blob = null;
        return { ok: true, media };
      } catch (e) { console.error('[solo-voice]', e); return { ok: false, reason: e.message || String(e) }; }
    },
    destroy() {
      if (elTimer) { clearInterval(elTimer); elTimer = null; }
      if (postTimer) { clearInterval(postTimer); postTimer = null; }
      stopMeter();
      try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (_) {}
      if (stream) stream.getTracks().forEach(tr => tr.stop());
      row.remove();
    },
  };
}
