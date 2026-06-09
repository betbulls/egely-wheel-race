// view-live.js — the Live presence wall. A read-only view onto presence.js plus
// the full roster of registered users (so everyone shows, online or offline).
// Each connected wheel shows a live value + compact curve; expanding a card shows
// the full solo-style vitality chart (zone colours + axes).
import * as auth from './auth.js';
import * as presence from './presence.js';
import { supabase } from './db.js';
import { vitalityColor } from './analytics.js';
import { drawVitalityChart } from './chart.js';
import { flagUrl } from './countries.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

// Small flag image after the name (renders on every OS, unlike flag emoji on Windows).
function flagHtml(cc){
  if(!cc || !/^[A-Za-z]{2}$/.test(cc)) return '';
  const u = cc.toUpperCase();
  return ` <img src="${flagUrl(cc)}" alt="${esc(u)}" title="${esc(u)}" loading="lazy" style="width:21px;height:15px;border-radius:3px;object-fit:cover;vertical-align:middle;margin-left:7px;box-shadow:0 0 0 1px rgba(255,255,255,0.18)">`;
}

const STATUS = {
  connected:  { label: 'Wheel connected', cls: 'connected',  live: true },
  measuring:  { label: 'Measuring',       cls: 'measuring',  live: true },
  experiment: { label: 'In an experiment',cls: 'experiment', live: true },
  session:    { label: 'In a session',    cls: 'session',    live: true },
  online:     { label: 'Online',          cls: 'online',     live: false },
  offline:    { label: 'Offline',         cls: 'offline',    live: false },
};
// Group order: me first (handled separately), then connected wheels, online, offline.
function groupRank(status){
  if(status === 'online') return 2;
  if(status === 'offline') return 3;
  return 1;   // connected / measuring / session
}

// Compact live curve (same look as the session per-racer curve): a coloured line
// on a dark rounded panel, no axes.
function drawLiveCurve(canvas, series, color){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const n = series.length;
  if(n < 2) return;
  const pad = 4;
  const yOf = led => h - (Math.max(0, Math.min(24, led)) / 24) * (h - pad * 2) - pad;
  ctx.beginPath();
  series.forEach((v, i) => { const x = (i / (n - 1)) * w, y = yOf(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}

// Injected once: green ONLINE pill + glowing dot, the search box, and the "show more"
// button. Self-contained — no index.html edits.
function injectStyles(){
  if(document.getElementById('liveExtraStyles')) return;
  const st = document.createElement('style');
  st.id = 'liveExtraStyles';
  st.textContent = `
  .live-pill.online{background:rgba(60,201,138,.16);border:1px solid rgba(60,201,138,.5);color:#6fe6ad}
  .live-pill.online::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#3ddc84;box-shadow:0 0 7px 1px rgba(61,220,132,.85);animation:liveOnlineBlink 1.6s ease-in-out infinite}
  @keyframes liveOnlineBlink{0%,100%{opacity:1}50%{opacity:.4}}
  .live-search{width:100%;box-sizing:border-box;background:rgba(0,0,0,.22);border:1px solid var(--panel-border);border-radius:11px;color:#fff;font-family:'Inter',sans-serif;font-size:15px;padding:12px 14px;margin:4px 0 16px}
  .live-search::placeholder{color:var(--muted)}
  .live-search:focus{outline:none;border-color:rgba(155,140,255,.6)}
  .live-more{display:block;width:100%;margin:14px 0 4px;padding:13px;border-radius:11px;cursor:pointer;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;color:#cdbcff;background:rgba(255,255,255,.05);border:1px solid var(--panel-border);transition:filter .15s}
  .live-more:hover{filter:brightness(1.25)}`;
  document.head.appendChild(st);
}

export function mount(el){
  injectStyles();
  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Live</h1>
      <p class="page-sub">Who's in the Egely Wheel ecosystem right now.</p>
    </div>
    <div class="live-head" id="liveHead"></div>
    <input class="live-search" id="liveSearch" type="search" placeholder="Search members…" autocomplete="off">
    <div class="live-list" id="liveList"><div class="empty">Connecting…</div></div>`;

  const headEl = el.querySelector('#liveHead');
  const listEl = el.querySelector('#liveList');
  const expanded = new Set();      // uids whose full chart is open (kept across re-renders)
  let roster = [];                 // all registered, visible profiles: {uid, name, avatar}
  const PAGE = 50;                 // people rendered per "page" (the wall can be hundreds)
  let shown = PAGE, search = '', io = null;

  // Merge the full roster with the live presence list → everyone, with a status.
  function buildPeople(presenceList){
    const byUid = new Map();
    for(const pr of roster) byUid.set(pr.uid, { uid: pr.uid, name: pr.name, avatar: pr.avatar, country: pr.country, status: 'offline' });
    for(const p of presenceList) byUid.set(p.uid, { uid: p.uid, name: p.name, avatar: p.avatar, country: p.country, status: p.status }); // presence wins (fresher + online)
    return [...byUid.values()];
  }

  function render(presenceList){
    const myId = auth.getState().user?.id || null;
    const all = buildPeople(presenceList);
    all.sort((a, b) => {
      const ra = a.uid === myId ? -1 : groupRank(a.status);
      const rb = b.uid === myId ? -1 : groupRank(b.status);
      return ra !== rb ? ra - rb : (a.name || '').localeCompare(b.name || '');
    });

    const onlineN = all.filter(p => p.status !== 'offline').length;
    headEl.innerHTML = `<span class="live-dot"></span><span><b>${onlineN}</b> online now`
      + ` · ${all.length} member${all.length === 1 ? '' : 's'}</span>`;

    const q = search.trim().toLowerCase();
    const people = q ? all.filter(p => (p.name || '').toLowerCase().includes(q)) : all;

    if(!people.length){
      listEl.innerHTML = `<div class="empty">${q ? 'No members match your search.' : 'No one is here yet.'}</div>`;
      return;
    }
    listEl.innerHTML = people.slice(0, shown).map(p => {
      const st = STATUS[p.status] || STATUS.online;
      const isMe = myId && p.uid === myId;
      const isOpen = expanded.has(p.uid);
      const value = st.live ? `<div class="live-value"><span class="live-led" data-led>·</span></div>` : '';
      const expandBtn = st.live ? `<button type="button" class="live-expand" data-expand aria-label="Show full chart" aria-expanded="${isOpen}">▾</button>` : '';
      const curve = st.live ? `<canvas class="live-wheel-curve" data-curve></canvas>` : '';
      const big = st.live ? `<div class="live-expanded"><div class="live-big-wrap"><canvas data-bigcurve></canvas></div></div>` : '';
      return `
        <div class="live-card ${st.cls}${isOpen ? ' expanded' : ''}" data-uid="${esc(p.uid)}">
          <div class="live-row">
            <div class="live-avatar">${avatarHtml(p.avatar, p.name)}</div>
            <div class="live-main">
              <div class="live-name">${esc(p.name || 'Explorer')}${flagHtml(p.country)}${isMe ? ' <span class="live-you">You</span>' : ''}</div>
              <div class="live-status"><span class="live-pill ${st.cls}">${esc(st.label)}</span></div>
            </div>
            ${value}
            ${expandBtn}
          </div>
          ${curve}
          ${big}
        </div>`;
    }).join('')
      + (people.length > shown
        ? `<button type="button" class="live-more" data-more>Show more · ${people.length - shown} more</button>`
        : '');
    refreshValues();
    observeMore();
  }

  // Redraw the live number + curves on each connected-wheel card.
  function refreshValues(){
    listEl.querySelectorAll('.live-card').forEach(card => {
      const ledEl = card.querySelector('[data-led]');
      const curve = card.querySelector('[data-curve]');
      const big = card.querySelector('[data-bigcurve]');
      if(!ledEl && !curve) return;
      const uid = card.dataset.uid;
      const led = presence.getLive(uid);
      if(led == null){
        if(ledEl){ ledEl.textContent = '·'; ledEl.style.color = ''; ledEl.classList.add('waiting'); }
        if(curve){ const c = curve.getContext('2d'); c && c.clearRect(0, 0, curve.width, curve.height); }
        return;
      }
      const color = vitalityColor(led);
      if(ledEl){ ledEl.textContent = String(led); ledEl.style.color = color; ledEl.classList.remove('waiting'); }
      const series = presence.getLiveSeries(uid);
      if(curve && !card.classList.contains('expanded')) drawLiveCurve(curve, series, color);
      if(big && card.classList.contains('expanded')) drawVitalityChart(big, series, Math.round(series.length * 0.5));
    });
  }

  // Auto-load the next page when the "show more" button scrolls into view (infinite scroll).
  function observeMore(){
    if(!('IntersectionObserver' in window)) return;
    if(!io) io = new IntersectionObserver(ents => {
      if(ents.some(e => e.isIntersecting)){ shown += PAGE; render(presence.getList()); }
    }, { rootMargin: '200px' });
    io.disconnect();
    // Observe only after layout settles, so the button isn't briefly "in view" mid-render.
    requestAnimationFrame(() => { const btn = listEl.querySelector('[data-more]'); if(btn) io.observe(btn); });
  }

  // Clicks: "show more" pages in; the chevron expands a card's full chart.
  listEl.addEventListener('click', (e) => {
    if(e.target.closest('[data-more]')){ shown += PAGE; render(presence.getList()); return; }
    const btn = e.target.closest('[data-expand]');
    if(!btn) return;
    const card = btn.closest('.live-card');
    const uid = card.dataset.uid;
    if(expanded.has(uid)){ expanded.delete(uid); card.classList.remove('expanded'); btn.setAttribute('aria-expanded', 'false'); }
    else { expanded.add(uid); card.classList.add('expanded'); btn.setAttribute('aria-expanded', 'true'); }
    refreshValues();
  });

  // Search filters by name; reset to the first page on each keystroke.
  el.querySelector('#liveSearch').addEventListener('input', (e) => {
    search = e.target.value; shown = PAGE; render(presence.getList());
  });

  // Load the full roster (everyone who hasn't hidden themselves), then render.
  (async () => {
    let { data, error } = await supabase.from('profiles').select('id, display_name, avatar_url, country').neq('show_on_live', false);
    if(error){ ({ data } = await supabase.from('profiles').select('id, display_name, avatar_url').neq('show_on_live', false)); }   // country column not present yet → still works
    roster = (data || []).map(p => ({ uid: p.id, name: p.display_name || 'Explorer', avatar: p.avatar_url, country: p.country || null }));
    render(presence.getList());
  })();

  const unsub = presence.subscribe(render);
  const valTimer = setInterval(refreshValues, 400);
  return () => { unsub(); clearInterval(valTimer); if(io) io.disconnect(); };
}
