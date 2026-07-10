// solo-voice.js — optional microphone recording during a SOLO measurement.
//
// Mirrors the session/race voice model AND its dock UI (voice.js mountVoiceDock):
// one calm bar with a breathing mic ring, a "● REC" chip and a Mute control.
// The recording spans the measurement window PLUS a 1-minute post-roll for the
// closing words — exactly like the session/race REC_POSTROLL_MS. During the
// measurement the dock offers Mute only (no End); when the measurement ends the
// dock RELOCATES into the results panel and shows the closing-words phase with a
// live countdown and an End button (End = "I'm done", the post-roll gesture).
// On Save the audio is handed to the solo-audio Edge Function, which stores it
// server-side with the service role (bypassing Storage RLS, exactly like the
// session/race recordings — no client Storage write) under
// solo/<uid>/voice-<startMs>.webm plus a session_recordings row (kind='solo',
// result_id). The stored duration is the FULL recording (measurement + closing
// words) so the render worker holds the video through the closing words
// (holdMs = recDuration − measurementDuration).

import { supabase } from './db.js';

// Server-side upload endpoint — the browser sends the audio + its JWT; the Edge
// Function stores it with the service role (bypassing Storage RLS, exactly like
// the session/race recordings). No direct client Storage write.
const FN_URL = 'https://lhyychkrcrndjptptkii.supabase.co/functions/v1/solo-audio';

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
  // ewr-redesign.css — only the denial tint is solo-specific.
  s.textContent = `.slv-warn{color:#c2415b !important}`;
  document.head.appendChild(s);
}

export function createSoloVoice(mountEl) {
  injectCss();

  const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const homeMount = mountEl;   // the setup-panel slot; the row lives here except during the post-roll

  // phase: 'arm' (mic off) · 'ready' (mic armed, before/after a take) · 'rec'
  //        (recording during the measurement) · 'post' (closing words, after the
  //        measurement, End available) · 'done' (recording finalized)
  let phase = 'arm';
  let armed = false, muted = false;
  let rec = null, stream = null, chunks = [], recStartMs = 0, recStopMs = 0, blob = null, stopping = null;
  let armError = '';
  let elTimer = null, postTimer = null, postDeadline = 0, raf = 0, actx = null;

  const row = document.createElement('div');
  row.className = 'voice-dock';
  homeMount.appendChild(row);

  const micRing = () => '<span class="vd-mic">' + MIC_SVG + '</span>';

  function fmtClock(sec) {
    sec = Math.max(0, sec);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  const elapsedSec = () => recStartMs ? Math.max(0, Math.floor((Date.now() - recStartMs) / 1000)) : 0;
  const postLeftSec = () => Math.max(0, Math.ceil((postDeadline - Date.now()) / 1000));

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
    if (phase === 'arm') {
      row.innerHTML = `
        <div class="vd vd-idle">
          <span class="vd-ring">${micRing()}</span>
          <span class="vd-txt">
            <b>Record my voice</b>
            <small class="${armError ? 'slv-warn' : ''}">${armError || 'Your microphone is recorded while you measure — it plays on your share video.'}</small>
          </span>
          <button type="button" class="vd-btn" data-arm>Turn on</button>
        </div>`;
    } else if (phase === 'ready') {
      row.innerHTML = `
        <div class="vd">
          <span class="vd-ring vd-on" data-ring>${micRing()}</span>
          <span class="vd-txt">
            <b>Voice ready</b>
            <small>Recording starts when you begin measuring — it plays on your share video.</small>
          </span>
          <button type="button" class="vd-btn ghost" data-off>Off</button>
        </div>`;
    } else if (phase === 'rec') {   // during the measurement — mirrors the dock: Mute only, no End
      row.innerHTML = `
        <div class="vd vd-live">
          <span class="vd-ring vd-on" data-ring>${micRing()}</span>
          <span class="vd-txt">
            <b><span class="vd-dot"></span>${muted ? 'Muted' : 'Recording your voice'} · <span data-el>${fmtClock(elapsedSec())}</span><span class="vd-rec">● REC</span></b>
            <small>${muted ? 'This part will be silent on your video — unmute to keep recording.' : 'Everything you say is kept — it plays on your share video.'}</small>
          </span>
          <button type="button" class="vd-btn ghost" data-mute>${muted ? 'Unmute' : 'Mute'}</button>
        </div>`;
    } else if (phase === 'post') {   // closing words, after the measurement — End appears here (the post-roll)
      row.innerHTML = `
        <div class="vd vd-live">
          <span class="vd-ring vd-on" data-ring>${micRing()}</span>
          <span class="vd-txt">
            <b><span class="vd-dot"></span>Closing words · <span data-el>${fmtClock(postLeftSec())}</span> left<span class="vd-rec">● REC</span></b>
            <small>Add a closing word — it plays at the end of your share video. Tap End when you’re done.</small>
          </span>
          <button type="button" class="vd-btn ghost danger" data-end>End</button>
        </div>`;
    } else {   // done — recording finalized
      row.innerHTML = `
        <div class="vd">
          <span class="vd-ring">${micRing()}</span>
          <span class="vd-txt">
            <b>Voice captured ✓</b>
            <small>It plays on your share video — save your measurement to keep it.</small>
          </span>
        </div>`;
    }
    const q = sel => row.querySelector(sel);
    q('[data-arm]')?.addEventListener('click', arm);
    q('[data-off]')?.addEventListener('click', disarm);
    q('[data-mute]')?.addEventListener('click', toggleMute);
    q('[data-end]')?.addEventListener('click', endPostRoll);
  }

  async function arm() {
    armError = '';
    try {   // ask for the mic right away so a denial is visible before Start
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      armed = true; phase = 'ready';
      render();
      startMeter();
    } catch (_) {
      armed = false; stream = null;
      armError = 'Microphone access was denied — enable it in the browser to record.';
      render();
    }
  }

  function disarm() {   // only offered before a take — never mid-measurement/post-roll
    armed = false; phase = 'arm'; muted = false;
    stopMeter();
    if (stream) { stream.getTracks().forEach(tr => tr.stop()); stream = null; }
    render();
  }

  function toggleMute() {
    muted = !muted;
    try { if (stream) stream.getAudioTracks().forEach(tr => tr.enabled = !muted); } catch (_) {}
    render();   // the meter flattens on its own while the track is disabled
  }

  // Finalize the MediaRecorder (resolve `stopping` when the blob is ready).
  function stopRecorder() {
    if (recStopMs === 0) recStopMs = Date.now();
    if (elTimer) { clearInterval(elTimer); elTimer = null; }
    stopping = new Promise(res => {
      if (!rec || rec.state === 'inactive') { res(); return; }
      rec.onstop = () => { blob = new Blob(chunks, { type: 'audio/webm' }); res(); };
      try { rec.stop(); } catch (_) { res(); }
    });
    return stopping;
  }

  // After the measurement ends: keep recording for the closing words, and show
  // the post-roll bar (with the End button) inside the results panel.
  function beginPostRoll(evalMount) {
    if (!armed || !rec || rec.state === 'inactive') return false;   // nothing recording
    if (evalMount) evalMount.appendChild(row);   // relocate the bar under the results
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

  // End the recording for good (End button, post-roll timeout, or Save).
  function endPostRoll() {
    if (postTimer) { clearInterval(postTimer); postTimer = null; }
    if (rec && rec.state !== 'inactive') {
      const p = stopRecorder();
      phase = 'done';
      render();
      return p;
    }
    return stopping || Promise.resolve();
  }

  render();

  return {
    get armed() { return armed; },
    beginPostRoll,
    endPostRoll,
    start() {
      if (!armed || !stream) return;
      if (row.parentNode !== homeMount) homeMount.appendChild(row);   // back from a prior post-roll
      if (postTimer) { clearInterval(postTimer); postTimer = null; }
      chunks = []; blob = null; recStartMs = Date.now(); recStopMs = 0; muted = false;
      try { stream.getAudioTracks().forEach(tr => tr.enabled = true); } catch (_) {}
      try {
        rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : undefined);
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.start(1000);
        phase = 'rec';
        if (elTimer) clearInterval(elTimer);
        elTimer = setInterval(() => { const t = row.querySelector('[data-el]'); if (t) t.textContent = fmtClock(elapsedSec()); }, 1000);
        render();
      } catch (_) { rec = null; }
    },
    // After the results row exists: hand the audio to the Edge Function, which
    // stores it server-side with the service role (no client Storage write).
    // The stored duration is the FULL recording (measurement + closing words) so
    // the render worker holds the video through the closing words.
    async saveFor(resultId, _uid) {
      await endPostRoll();                                    // finalize if the post-roll is still open
      if (stopping) { try { await stopping; } catch (_) {} }  // ensure the blob is finalized
      if (!armed) return { ok: false, reason: 'not recording' };
      if (!blob || !blob.size) { console.error('[solo-voice] empty blob', { chunks: chunks.length }); return { ok: false, reason: 'no audio captured' }; }
      if (!resultId) return { ok: false, reason: 'missing id' };
      const recDurSec = Math.max(1, Math.round(((recStopMs || Date.now()) - recStartMs) / 1000));
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('login required');
        const fd = new FormData();
        fd.append('file', blob, 'voice.webm');
        fd.append('resultId', String(resultId));
        fd.append('duration', String(recDurSec));
        const r = await fetch(FN_URL, { method: 'POST', headers: { authorization: 'Bearer ' + session.access_token }, body: fd });
        const jr = await r.json().catch(() => ({}));
        if (!r.ok || !jr.ok) { console.error('[solo-voice] server upload failed', jr); throw new Error(jr.error || ('HTTP ' + r.status)); }
        blob = null;
        return { ok: true };
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
