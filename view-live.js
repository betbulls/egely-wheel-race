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
  return ` <img src="${flagUrl(cc)}" alt="${esc(u)}" title="${esc(u)}" loading="lazy" style="width:21px;height:15px;border-radius:3px;object-fit:cover;vertical-align:middle;margin-left:7px;box-shadow:0 0 0 1px rgba(1,22,36,0.15)">`;
}

const STATUS = {
  connected:  { label: 'Wheel connected', cls: 'connected',  live: true },
  measuring:  { label: 'Measuring live', cls: 'measuring',  live: true },
  experiment: { label: 'In an experiment',cls: 'experiment', live: true },
  session:    { label: 'In a session',    cls: 'session',    live: true },
  race:       { label: 'In a race',        cls: 'session',    live: true },
  online:     { label: 'Online',          cls: 'online',     live: false },
  featured:   { label: 'Featured Maker',  cls: 'featured',   live: false },
  offline:    { label: 'Offline',         cls: 'offline',    live: false },
};

// Zone colours tuned for LIGHT backgrounds. The big number uses the muted set
// (alarm-free red, readable gold); chart markers keep the vivid set.
const zoneTextColor = led => led < 6 ? '#c2415b' : led < 13 ? '#b8860b' : '#0f8a52';
const zoneMarkColor = led => led < 6 ? '#f04438' : led < 13 ? '#f5b700' : '#20b26b';
// Group order: me first (handled separately), then connected wheels, online, offline.
function groupRank(status){
  if(status === 'online') return 2;
  if(status === 'offline') return 3;
  return 1;   // connected / measuring / session
}

// Compact live sparkline: brand-violet line on a light strip, with a small
// zone-coloured marker on the latest value (red stays a low-zone signal,
// not the default chart colour).
function drawLiveCurve(canvas, series){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const n = series.length;
  if(n < 2) return;
  const pad = 5;
  const yOf = led => h - (Math.max(0, Math.min(24, led)) / 24) * (h - pad * 2) - pad;
  ctx.beginPath();
  series.forEach((v, i) => { const x = pad + (i / (n - 1)) * (w - pad * 2), y = yOf(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.strokeStyle = '#5230da'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  const last = series[n - 1];
  ctx.beginPath(); ctx.arc(w - pad, yOf(last), 3.5, 0, Math.PI * 2);
  ctx.fillStyle = zoneMarkColor(last); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
}

// Injected once: green ONLINE pill + glowing dot, the search box, and the "show more"
// button. Self-contained — no index.html edits.
function injectStyles(){
  if(document.getElementById('liveExtraStyles')) return;
  const st = document.createElement('style');
  st.id = 'liveExtraStyles';
  st.textContent = `
  .live-pill.online{background:rgba(32,178,107,.12);border:1px solid rgba(32,178,107,.4);color:#0f8a52}
  .live-pill.online::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#20b26b;box-shadow:0 0 7px 1px rgba(32,178,107,.7);animation:liveOnlineBlink 1.6s ease-in-out infinite}
  .live-pill.featured{background:rgba(82,48,218,.1);border:1px solid rgba(82,48,218,.3);color:#5230da}
  @keyframes liveOnlineBlink{0%,100%{opacity:1}50%{opacity:.4}}
  .live-search{width:100%;box-sizing:border-box;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:11px;color:#011624;font-family:'Inter',sans-serif;font-size:15px;padding:12px 14px;margin:4px 0 16px}
  .live-search::placeholder{color:#99a2a7}
  .live-search:focus{outline:none;border-color:#5230da;background:#fff;box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .live-more{display:block;width:100%;margin:14px 0 4px;padding:13px;border-radius:999px;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#401d91;background:#fff;border:1px solid #dfe3e6;transition:border-color .15s,background .15s}
  .live-more:hover{border-color:#5230da;background:rgba(82,48,218,.06)}`;
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
    const rosterByUid = new Map(roster.map(pr => [pr.uid, pr]));   // approved_maker + handle are DB truth (roster), not carried by presence
    for(const pr of roster) byUid.set(pr.uid, { uid: pr.uid, name: pr.name, avatar: pr.avatar, country: pr.country, maker: pr.maker, handle: pr.handle, featuredUntil: pr.featuredUntil, status: 'offline' });
    for(const p of presenceList){ const r = rosterByUid.get(p.uid); byUid.set(p.uid, { uid: p.uid, name: p.name, avatar: p.avatar, country: p.country, maker: !!(r && r.maker), handle: r ? r.handle : null, featuredUntil: r ? r.featuredUntil : null, status: p.status }); } // presence wins (fresher + online)
    return [...byUid.values()];
  }

  function render(presenceList){
    const myId = auth.getState().user?.id || null;
    const nowTs = Date.now();
    const isFeatured = p => !!(p.maker && p.featuredUntil && new Date(p.featuredUntil).getTime() > nowTs);
    const all = buildPeople(presenceList);
    // Sort: me first, then live (measuring/session/connected), online, FEATURED makers
    // (offline but spotlighted → sit just below online), then everyone else offline.
    const rankOf = p => {
      if(p.uid === myId) return -1;
      if(p.status !== 'offline') return groupRank(p.status);   // 1 = live wheel, 2 = online
      return isFeatured(p) ? 2.5 : 3;
    };
    all.sort((a, b) => {
      const ra = rankOf(a), rb = rankOf(b);
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
      // A featured maker who isn't actually present shows a "Featured" pill (never a
      // fake "Online") — honest placement, no green presence dot.
      const effStatus = (p.status === 'offline' && isFeatured(p)) ? 'featured' : p.status;
      const st = STATUS[effStatus] || STATUS.online;
      const isMe = myId && p.uid === myId;
      const isOpen = expanded.has(p.uid);
      const value = st.live ? `<div class="live-value"><span class="live-led" data-led>·</span><span class="live-led-cap">Vitality</span></div>` : '';
      const expandBtn = st.live ? `<button type="button" class="live-expand" data-expand aria-label="Show full chart" aria-expanded="${isOpen}"><span class="le-show">Chart</span><span class="le-hide">Hide</span><span class="le-car">▾</span></button>` : '';
      const curve = st.live ? `<canvas class="live-wheel-curve" data-curve></canvas>` : '';
      const big = st.live ? `<div class="live-expanded"><div class="live-big-wrap"><canvas data-bigcurve></canvas></div></div>` : '';
      return `
        <div class="live-card ${st.cls}${isOpen ? ' expanded' : ''}" data-uid="${esc(p.uid)}">
          <div class="live-row">
            <div class="live-avatar">${avatarHtml(p.avatar, p.name)}</div>
            <div class="live-main">
              <div class="live-name">${(p.maker && p.handle) ? `<a class="maker-name-link" href="#/connect/${esc(p.handle)}">${esc(p.name || 'Explorer')}</a>` : esc(p.name || 'Explorer')}${flagHtml(p.country)}${p.maker ? '<span class="live-maker">✓ Spiritual Maker</span>' : ''}${isMe ? ' <span class="live-you">You</span>' : ''}</div>
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
      if(ledEl){ ledEl.textContent = String(led); ledEl.style.color = zoneTextColor(led); ledEl.classList.remove('waiting'); }
      const series = presence.getLiveSeries(uid);
      if(curve && !card.classList.contains('expanded')) drawLiveCurve(curve, series);
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
    let { data, error } = await supabase.from('profiles').select('id, display_name, avatar_url, country, approved_maker, practitioner_handle, live_featured_until').neq('show_on_live', false);
    if(error){ ({ data } = await supabase.from('profiles').select('id, display_name, avatar_url').neq('show_on_live', false)); }   // older columns not present yet → still works
    roster = (data || []).map(p => ({ uid: p.id, name: p.display_name || 'Explorer', avatar: p.avatar_url, country: p.country || null, maker: !!p.approved_maker, handle: p.practitioner_handle || null, featuredUntil: p.live_featured_until || null }));
    render(presence.getList());
  })();

  const unsub = presence.subscribe(render);
  const valTimer = setInterval(refreshValues, 400);
  return () => { unsub(); clearInterval(valTimer); if(io) io.disconnect(); };
}
