// video-share.js — "Share as a video" card on results pages.
//
// Two platform rows per result (Csaba, 2026-07-12): the 9:16 portrait for
// TikTok / Reels / Shorts and the 16:9 wide version for YouTube. Each row has
// its own button — a video is only rendered when someone actually asks for
// that platform (never both eagerly). Each format tracks its own
// public.render_jobs row (worker-written; format column '916' | '169'), so one
// can be ready for download while the other is still rendering. This module
// only reads job state and degrades silently if the table isn't there yet.

import { supabase } from './db.js';
import * as auth from './auth.js';

const FN_URL = 'https://lhyychkrcrndjptptkii.supabase.co/functions/v1/render-video';
const FRESH_MS = 360 * 24 * 3600 * 1000;   // signed URLs live 1 year — treat older as expired

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The two share targets. 9:16 is the classic; 16:9 is the YouTube studio cut.
const FORMATS = [
  { fmt: '916', ratio: '9:16', label: 'TikTok · Reels · Shorts', icons: ['tiktok', 'instagram'] },
  { fmt: '169', ratio: '16:9', label: 'YouTube', icons: ['youtube'] },
];

let cssDone = false;
function injectCss() {
  if (cssDone || document.getElementById('vidShareStyles')) { cssDone = true; return; }
  cssDone = true;
  const s = document.createElement('style');
  s.id = 'vidShareStyles';
  s.textContent = `
.vs-card{margin:14px 0;background:var(--ewr-surface,#fff);border:1px solid var(--ewr-border,#dfe3e6);border-radius:18px;
  padding:14px 18px;box-shadow:0 10px 28px rgba(1,22,36,.06)}
.vs-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:4px}
.vs-head b{font:600 14.5px Montserrat,Inter,sans-serif;color:var(--ewr-text,#011624)}
.vs-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:9px 0}
.vs-row + .vs-row{border-top:1px dashed var(--ewr-border,#dfe3e6)}
.vs-fmt{display:inline-flex;align-items:center;gap:9px;min-width:225px;font:600 13px Inter,sans-serif;color:var(--ewr-text,#011624)}
.vs-fmt img{height:17px;width:auto;display:block}
.vs-ratio{padding:2px 8px;border-radius:7px;background:var(--ewr-accent-tint,rgba(82,48,218,.08));color:var(--ewr-accent-strong,#401d91);font:700 11px Inter,sans-serif}
.vs-btn{display:inline-flex;align-items:center;gap:9px;padding:9px 18px;border-radius:999px;border:1px solid rgba(82,48,218,.35);
  background:var(--ewr-accent-tint, rgba(82,48,218,.08));color:var(--ewr-accent-strong,#401d91);font:600 13px Inter,sans-serif;cursor:pointer}
.vs-btn:hover:not(:disabled){background:rgba(82,48,218,.14)}
.vs-btn:disabled{opacity:.6;cursor:default}
.vs-btn.primary{background:var(--ewr-accent-strong,#401d91);border-color:transparent;color:#fff}
.vs-btn.primary:hover:not(:disabled){background:#011624}
.vs-note{font:500 12.5px Inter,sans-serif;color:var(--ewr-text-muted,#67737c)}
.vs-note .vs-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#5230da;margin-right:7px;animation:vsPulse 1.2s ease-in-out infinite}
@keyframes vsPulse{0%,100%{opacity:.35}50%{opacity:1}}`;
  document.head.appendChild(s);
}

const shell = inner => `<div class="vs-card"><div class="vs-head"><b>🎬 Share as a video</b></div>${inner}</div>`;

export function mountVideoShare(el, { kind, targetId, notBeforeMs = 0 }) {
  injectCss();
  let destroyed = false, timer = 0;
  const jobs = {};   // fmt → row | null (none yet) | undefined (table/column missing)
  const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };

  const latestJob = async fmt => {
    try {
      const { data, error } = await supabase.from('render_jobs').select('*')
        .eq('kind', kind).eq('target_id', Number(targetId)).eq('format', fmt)
        .order('id', { ascending: false }).limit(1).maybeSingle();
      return error ? undefined : (data || null);   // undefined = table/format missing → hide
    } catch (_) { return undefined; }
  };
  const refresh = async () => {
    const rows = await Promise.all(FORMATS.map(f => latestJob(f.fmt)));
    if (destroyed) return;
    FORMATS.forEach((f, i) => { jobs[f.fmt] = rows[i]; });
    paint();
  };

  const isPending = j => !!(j && (j.status === 'queued' || j.status === 'rendering'));
  const isReady = j => !!(j && j.status === 'ready' && j.signed_url && (Date.now() - Date.parse(j.created_at)) < FRESH_MS);

  const rowHtml = (f, job, gated) => {
    const head = `<span class="vs-fmt">${f.icons.map(i => `<img src="assets/social/${i}.png" alt="">`).join('')}<span class="vs-ratio">${f.ratio}</span>${f.label}</span>`;
    let body;
    if (isReady(job)) {
      body = `<a class="vs-btn primary" href="${esc(job.signed_url)}" target="_blank" rel="noopener" download>Download video</a>
        <button type="button" class="vs-btn" data-vs-copy="${f.fmt}">Copy link</button>
        <span class="vs-note">Ready${job.has_audio ? ' · 🎙 with live voice' : ''} · link valid for a year</span>`;
    } else if (isPending(job)) {
      body = `<span class="vs-note"><span class="vs-dot"></span><b>Preparing…</b> usually 1–2 minutes${kind !== 'solo' ? ' (longer with a recording)' : ''}. We'll email the link too.</span>`;
    } else if (gated) {
      // The maker's closing words + the recording upload are still in flight —
      // a render started NOW would miss them and get cached for a year.
      body = `<span class="vs-note"><span class="vs-dot"></span><b>The recording is being stored…</b> this button opens in a moment.</span>`;
    } else {
      const failed = job && job.status === 'failed';
      body = `<button type="button" class="vs-btn" data-vs-go="${f.fmt}">${failed ? 'Try this video again' : 'Create this video'}</button>
        ${failed ? '<span class="vs-note">The last render failed.</span>' : ''}`;
    }
    return `<div class="vs-row">${head}${body}</div>`;
  };

  const paint = () => {
    if (destroyed || !el.isConnected) { stop(); return; }
    const a = auth.getState();
    if (!a.user || FORMATS.some(f => jobs[f.fmt] === undefined)) { el.innerHTML = ''; return; }   // degrade silently / logged-out
    const gated = !!(notBeforeMs && Date.now() < notBeforeMs);
    el.innerHTML = shell(FORMATS.map(f => rowHtml(f, jobs[f.fmt], gated)).join(''));
    el.querySelectorAll('[data-vs-go]').forEach(b => b.addEventListener('click', () => start(b.dataset.vsGo, b)));
    el.querySelectorAll('[data-vs-copy]').forEach(b => b.addEventListener('click', () => {
      const j = jobs[b.dataset.vsCopy];
      if (j && j.signed_url && navigator.clipboard) navigator.clipboard.writeText(j.signed_url).then(() => { b.textContent = 'Copied ✓'; });
    }));
    stop();
    if (FORMATS.some(f => isPending(jobs[f.fmt]))) {
      timer = setInterval(refresh, 5000);
    } else if (gated) {
      // The gate opens EARLY the moment the camera take lands in the database.
      timer = setTimeout(async () => {
        timer = 0;
        try {
          const { data } = await supabase.from('session_recordings').select('id')
            .eq('session_id', Number(targetId)).eq('media', 'video').eq('status', 'ready').limit(1).maybeSingle();
          if (data) notBeforeMs = 0;
        } catch (_) {}
        refresh();
      }, Math.min(5000, Math.max(2000, notBeforeMs - Date.now() + 500)));
    }
  };

  const start = async (fmt, btn) => {
    if (btn) { btn.disabled = true; btn.textContent = 'Starting…'; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('login required');
      const r = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ kind, id: Number(targetId), format: fmt }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
      jobs[fmt] = { status: j.status || 'queued', format: fmt, created_at: new Date().toISOString(), signed_url: j.url || null, has_audio: false };
      paint();
      if (j.url && j.reused) refresh();   // a reused ready job → pull the real row (duration, audio flag)
    } catch (e) {
      jobs[fmt] = null;
      paint();
      const note = document.createElement('span');
      note.className = 'vs-note';
      note.textContent = `Could not start (${e.message}) — try again.`;
      const row = el.querySelectorAll('.vs-row')[FORMATS.findIndex(f => f.fmt === fmt)];
      if (row) row.appendChild(note);
    }
  };

  refresh();
  return { destroy() { destroyed = true; stop(); el.innerHTML = ''; } };
}
