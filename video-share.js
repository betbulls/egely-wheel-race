// video-share.js — "Share as video" block on results pages.
//
// Renders a button that asks the render worker (via the render-video Edge
// Function) to produce the social mp4 of a finished race / session / solo
// measurement, shows a "preparing" state while the worker renders (~1-2 min,
// longer when a voice recording makes the video real-time), then offers the
// signed download link. Job state lives in public.render_jobs (worker-written);
// this module only reads it and degrades silently if the table isn't there yet.

import { supabase } from './db.js';
import * as auth from './auth.js';

const FN_URL = 'https://lhyychkrcrndjptptkii.supabase.co/functions/v1/render-video';
const FRESH_MS = 360 * 24 * 3600 * 1000;   // signed URLs live 1 year — treat older as expired

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let cssDone = false;
function injectCss() {
  if (cssDone || document.getElementById('vidShareStyles')) { cssDone = true; return; }
  cssDone = true;
  const s = document.createElement('style');
  s.id = 'vidShareStyles';
  s.textContent = `
.vs-card{margin:14px 0;background:var(--ewr-surface,#fff);border:1px solid var(--ewr-border,#dfe3e6);border-radius:18px;
  padding:14px 18px;box-shadow:0 10px 28px rgba(1,22,36,.06)}
.vs-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.vs-head b{font:600 14.5px Montserrat,Inter,sans-serif;color:var(--ewr-text,#011624)}
.vs-socials{display:inline-flex;gap:9px;align-items:center;opacity:.9}
.vs-socials img{height:18px;width:auto;display:block}
.vs-wrap{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.vs-btn{display:inline-flex;align-items:center;gap:9px;padding:10px 20px;border-radius:999px;border:1px solid rgba(82,48,218,.35);
  background:var(--ewr-accent-tint, rgba(82,48,218,.08));color:var(--ewr-accent-strong,#401d91);font:600 13.5px Inter,sans-serif;cursor:pointer}
.vs-btn:hover:not(:disabled){background:rgba(82,48,218,.14)}
.vs-btn:disabled{opacity:.6;cursor:default}
.vs-btn.primary{background:var(--ewr-accent-strong,#401d91);border-color:transparent;color:#fff}
.vs-btn.primary:hover:not(:disabled){background:#011624}
.vs-note{font:500 12.5px Inter,sans-serif;color:var(--ewr-text-muted,#67737c)}
.vs-note .vs-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#5230da;margin-right:7px;animation:vsPulse 1.2s ease-in-out infinite}
@keyframes vsPulse{0%,100%{opacity:.35}50%{opacity:1}}`;
  document.head.appendChild(s);
}

// The share block is a proper card (like the Watch-again / Replay cards) —
// the small platform logos say at a glance what the clip is for.
const SOCIALS = '<span class="vs-socials" aria-hidden="true"><img src="assets/social/tiktok.png" alt=""><img src="assets/social/instagram.png" alt=""><img src="assets/social/youtube.png" alt=""></span>';
const shell = inner => `<div class="vs-card"><div class="vs-head"><b>🎬 Share as a video</b>${SOCIALS}</div>${inner}</div>`;

export function mountVideoShare(el, { kind, targetId, notBeforeMs = 0 }) {
  injectCss();
  let destroyed = false, timer = 0;
  const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };

  const latestJob = async () => {
    try {
      const { data, error } = await supabase.from('render_jobs').select('*')
        .eq('kind', kind).eq('target_id', Number(targetId))
        .order('id', { ascending: false }).limit(1).maybeSingle();
      return error ? undefined : (data || null);   // undefined = table missing → hide
    } catch (_) { return undefined; }
  };

  const paint = job => {
    if (destroyed || !el.isConnected) { stop(); return; }
    const a = auth.getState();
    if (job === undefined || !a.user) { el.innerHTML = ''; return; }   // degrade silently / logged-out
    const ready = job && job.status === 'ready' && job.signed_url && (Date.now() - Date.parse(job.created_at)) < FRESH_MS;
    const pending = job && (job.status === 'queued' || job.status === 'rendering');
    if (ready) {
      el.innerHTML = shell(`<div class="vs-wrap">
        <a class="vs-btn primary" href="${esc(job.signed_url)}" target="_blank" rel="noopener" download>Download video</a>
        <button type="button" class="vs-btn" data-vs-copy>Copy link</button>
        <span class="vs-note">Ready to share${job.has_audio ? ' · 🎙 with live voice' : ''} · link valid for a year</span></div>`);
      el.querySelector('[data-vs-copy]').addEventListener('click', ev => {
        navigator.clipboard && navigator.clipboard.writeText(job.signed_url).then(() => { ev.target.textContent = 'Copied ✓'; });
      });
    } else if (pending) {
      el.innerHTML = shell(`<div class="vs-wrap"><span class="vs-note"><span class="vs-dot"></span><b>Preparing your video…</b>
        usually 1–2 minutes${kind !== 'solo' ? ' (longer with a voice recording)' : ''}. We'll email the link too.</span></div>`);
      if (!timer) timer = setInterval(async () => { const j = await latestJob(); if (j && j.status !== (job && job.status)) paint(j); else if (j && j.status === 'ready') paint(j); }, 5000);
    } else if (notBeforeMs && Date.now() < notBeforeMs) {
      // The maker's closing words + the recording upload are still in flight —
      // a render started NOW would miss them and get cached for a year. The
      // gate opens EARLY the moment the camera take lands in the database.
      stop();
      el.innerHTML = shell(`<div class="vs-wrap"><span class="vs-note"><span class="vs-dot"></span><b>The recording is being stored…</b>
        the video button opens in a moment.</span></div>`);
      timer = setTimeout(async () => {
        timer = 0;
        try {
          const { data } = await supabase.from('session_recordings').select('id')
            .eq('session_id', Number(targetId)).eq('media', 'video').eq('status', 'ready').limit(1).maybeSingle();
          if (data) notBeforeMs = 0;
        } catch (_) {}
        latestJob().then(paint);
      }, Math.min(5000, Math.max(2000, notBeforeMs - Date.now() + 500)));
    } else {
      stop();
      const failed = job && job.status === 'failed';
      el.innerHTML = shell(`<div class="vs-wrap">
        <button type="button" class="vs-btn" data-vs-go>${failed ? 'Try the video again' : 'Create a share video'}</button>
        <span class="vs-note">${failed ? 'The last render failed.' : 'Turn this result into a 9:16 clip — post it to TikTok, Reels or Shorts.'}</span></div>`);
      el.querySelector('[data-vs-go]').addEventListener('click', start);
    }
  };

  const start = async () => {
    const btn = el.querySelector('[data-vs-go]');
    if (btn) { btn.disabled = true; btn.textContent = 'Starting…'; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('login required');
      const r = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ kind, id: Number(targetId) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
      paint({ status: j.status || 'queued', created_at: new Date().toISOString(), signed_url: j.url || null, has_audio: false });
      if (j.url && j.reused) { const job = await latestJob(); if (job) paint(job); }
    } catch (e) {
      el.innerHTML = shell(`<div class="vs-wrap"><button type="button" class="vs-btn" data-vs-go>Create a share video</button>
        <span class="vs-note">Could not start (${esc(e.message)}) — try again.</span></div>`);
      el.querySelector('[data-vs-go]').addEventListener('click', start);
    }
  };

  latestJob().then(paint);
  return { destroy() { destroyed = true; stop(); el.innerHTML = ''; } };
}
