// view-live.js — the Live presence wall. A read-only view onto presence.js plus
// the full roster of registered users (so everyone shows, online or offline).
// Each connected wheel shows a live value + compact curve; expanding a card shows
// the full solo-style vitality chart (zone colours + axes).
import * as auth from './auth.js';
import * as presence from './presence.js';
import { supabase } from './db.js';
import { vitalityColor } from './analytics.js';
import { drawVitalityChart } from './chart.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

const STATUS = {
  connected: { label: 'Wheel connected', cls: 'connected', live: true },
  measuring: { label: 'Measuring',       cls: 'measuring', live: true },
  session:   { label: 'In a session',    cls: 'session',   live: true },
  online:    { label: 'Online',          cls: 'online',    live: false },
  offline:   { label: 'Offline',         cls: 'offline',   live: false },
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

export function mount(el){
  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Live</h1>
      <p class="page-sub">Who's in the Egely Wheel ecosystem right now.</p>
    </div>
    <div class="live-head" id="liveHead"></div>
    <div class="live-list" id="liveList"><div class="empty">Connecting…</div></div>`;

  const headEl = el.querySelector('#liveHead');
  const listEl = el.querySelector('#liveList');
  const expanded = new Set();      // uids whose full chart is open (kept across re-renders)
  let roster = [];                 // all registered, visible profiles: {uid, name, avatar}

  // Merge the full roster with the live presence list → everyone, with a status.
  function buildPeople(presenceList){
    const byUid = new Map();
    for(const pr of roster) byUid.set(pr.uid, { uid: pr.uid, name: pr.name, avatar: pr.avatar, status: 'offline' });
    for(const p of presenceList) byUid.set(p.uid, { uid: p.uid, name: p.name, avatar: p.avatar, status: p.status }); // presence wins (fresher + online)
    return [...byUid.values()];
  }

  function render(presenceList){
    const myId = auth.getState().user?.id || null;
    const people = buildPeople(presenceList);
    people.sort((a, b) => {
      const ra = a.uid === myId ? -1 : groupRank(a.status);
      const rb = b.uid === myId ? -1 : groupRank(b.status);
      return ra !== rb ? ra - rb : (a.name || '').localeCompare(b.name || '');
    });

    const onlineN = people.filter(p => p.status !== 'offline').length;
    headEl.innerHTML = `<span class="live-dot"></span><span><b>${onlineN}</b> ${onlineN === 1 ? 'person' : 'people'} online now</span>`;

    if(!people.length){
      listEl.innerHTML = `<div class="empty">No one's here yet.</div>`;
      return;
    }
    listEl.innerHTML = people.map(p => {
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
              <div class="live-name">${esc(p.name || 'Explorer')}${isMe ? ' <span class="live-you">You</span>' : ''}</div>
              <div class="live-status"><span class="live-pill ${st.cls}">${esc(st.label)}</span></div>
            </div>
            ${value}
            ${expandBtn}
          </div>
          ${curve}
          ${big}
        </div>`;
    }).join('');
    refreshValues();
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

  // Expand / collapse a card's full chart (toggles the card class; state kept in
  // `expanded` so it survives list re-renders).
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-expand]');
    if(!btn) return;
    const card = btn.closest('.live-card');
    const uid = card.dataset.uid;
    if(expanded.has(uid)){ expanded.delete(uid); card.classList.remove('expanded'); btn.setAttribute('aria-expanded', 'false'); }
    else { expanded.add(uid); card.classList.add('expanded'); btn.setAttribute('aria-expanded', 'true'); }
    refreshValues();
  });

  // Load the full roster (everyone who hasn't hidden themselves), then render.
  (async () => {
    const { data } = await supabase.from('profiles').select('id, display_name, avatar_url').neq('show_on_live', false);
    roster = (data || []).map(p => ({ uid: p.id, name: p.display_name || 'Explorer', avatar: p.avatar_url }));
    render(presence.getList());
  })();

  const unsub = presence.subscribe(render);
  const valTimer = setInterval(refreshValues, 400);
  return () => { unsub(); clearInterval(valTimer); };
}
