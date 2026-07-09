// solo-voice.js — optional microphone recording during a SOLO measurement.
//
// Mirrors the session/race voice model: the recording spans the measurement
// window (recorder starts with the measurement, stops at finalize), and on
// Save it is uploaded to the private session-audio bucket under
// solo/<uid>/voice-<startMs>.webm plus registered in session_recordings
// (kind='solo', result_id). The render worker already looks this row up and
// muxes the voice onto the share video (real-time, runs until the audio ends).

import { supabase } from './db.js';

const CAN_REC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

let cssDone = false;
function injectCss() {
  if (cssDone || document.getElementById('soloVoiceStyles')) { cssDone = true; return; }
  cssDone = true;
  const s = document.createElement('style');
  s.id = 'soloVoiceStyles';
  s.textContent = `
.slv-row{display:flex;align-items:center;gap:10px;margin:12px 0;flex-wrap:wrap}
.slv-toggle{display:inline-flex;align-items:center;gap:9px;padding:9px 18px;border-radius:999px;cursor:pointer;
  border:1px solid var(--ewr-border,#dfe3e6);background:var(--ewr-surface-muted,#f2f3f4);
  font:600 13px Inter,sans-serif;color:var(--ewr-text-muted,#67737c);user-select:none}
.slv-toggle.on{border-color:rgba(82,48,218,.4);background:var(--ewr-accent-tint,rgba(82,48,218,.08));color:var(--ewr-accent-strong,#401d91)}
.slv-toggle input{position:absolute;opacity:0;pointer-events:none}
.slv-hint{font:500 12px Inter,sans-serif;color:var(--ewr-text-soft,#99a2a7)}
.slv-live{display:inline-flex;align-items:center;gap:7px;font:600 12.5px Inter,sans-serif;color:#b42318}
.slv-live i{width:8px;height:8px;border-radius:50%;background:#f04438;animation:slvB 1.1s ease-in-out infinite}
@keyframes slvB{0%,100%{opacity:.35}50%{opacity:1}}`;
  document.head.appendChild(s);
}

export function createSoloVoice(anchorEl) {
  injectCss();
  let armed = false, rec = null, stream = null, chunks = [], recStartMs = 0, blob = null, stopping = null;

  const row = document.createElement('div');
  row.className = 'slv-row';
  if (CAN_REC) {
    row.innerHTML = `
      <label class="slv-toggle" data-slv-t><input type="checkbox">🎙 Record my voice</label>
      <span class="slv-hint" data-slv-h>Your microphone is recorded while you measure — it plays on your share video.</span>`;
    const t = row.querySelector('[data-slv-t]'), cb = t.querySelector('input'), hint = row.querySelector('[data-slv-h]');
    cb.addEventListener('change', async () => {
      if (cb.checked) {
        try {   // ask for the mic right away so a denial is visible before Start
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          armed = true; t.classList.add('on');
        } catch (_) {
          cb.checked = false; armed = false;
          hint.textContent = 'Microphone access was denied — enable it in the browser to record.';
        }
      } else {
        armed = false; t.classList.remove('on');
        if (stream) { stream.getTracks().forEach(tr => tr.stop()); stream = null; }
      }
    });
  }
  anchorEl.parentNode.insertBefore(row, anchorEl);

  return {
    get armed() { return armed; },
    start() {
      if (!armed || !stream) return;
      chunks = []; blob = null; recStartMs = Date.now();
      try {
        rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : undefined);
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.start(1000);
        row.querySelector('[data-slv-h]').innerHTML = '<span class="slv-live"><i></i>Recording your voice</span>';
      } catch (_) { rec = null; }
    },
    stop() {
      stopping = new Promise(res => {
        if (!rec || rec.state === 'inactive') { res(); return; }
        rec.onstop = () => { blob = new Blob(chunks, { type: 'audio/webm' }); res(); };
        try { rec.stop(); } catch (_) { res(); }
        const h = row.querySelector('[data-slv-h]');
        if (h) h.textContent = 'Voice captured — it is saved with your measurement.';
      });
      return stopping;
    },
    // After the results row exists: upload the audio + register the recording.
    async saveFor(resultId, uid, durationSeconds) {
      if (stopping) { try { await stopping; } catch (_) {} }   // ensure the blob is finalized
      if (!armed) return { ok: false, reason: 'not recording' };
      if (!blob || !blob.size) { console.error('[solo-voice] empty blob', { chunks: chunks.length }); return { ok: false, reason: 'no audio captured' }; }
      if (!resultId || !uid) return { ok: false, reason: 'missing id' };
      try {
        const path = `solo/${uid}/voice-${recStartMs}.webm`;
        const up = await supabase.storage.from('session-audio').upload(path, blob, { contentType: 'audio/webm', upsert: true });
        if (up.error) { console.error('[solo-voice] upload failed', up.error); throw new Error('upload: ' + up.error.message); }
        const { error } = await supabase.from('session_recordings').insert({
          kind: 'solo', result_id: resultId, host_id: uid, status: 'ready',
          storage_path: path, duration_seconds: durationSeconds || Math.round((Date.now() - recStartMs) / 1000),
          started_at: new Date(recStartMs).toISOString(),
        });
        if (error) { console.error('[solo-voice] insert failed', error); throw new Error('insert: ' + error.message); }
        blob = null;
        return { ok: true };
      } catch (e) { return { ok: false, reason: e.message || String(e) }; }
    },
    destroy() {
      try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (_) {}
      if (stream) stream.getTracks().forEach(tr => tr.stop());
      row.remove();
    },
  };
}
