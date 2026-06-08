// view-live.js — the Live presence wall. A read-only view onto presence.js:
// who is in the ecosystem right now. Cards are intentionally NOT clickable —
// the point is simply to feel that others are here, and to see their wheel spin.
import * as auth from './auth.js';
import * as presence from './presence.js';
import { vitalityColor } from './analytics.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

const STATUS = {
  online:    { label: 'Online',          cls: 'online',    live: false },
  connected: { label: 'Wheel connected', cls: 'connected', live: true },
  measuring: { label: 'Measuring',       cls: 'measuring', live: true },
  session:   { label: 'In a session',    cls: 'session',   live: true },
};
const SORT = { measuring: 0, session: 1, connected: 2, online: 3 };   // most "alive" first

// Tiny sparkline (last N live values, 0–24 scaled) as an inline SVG polyline.
function sparkline(values){
  const w = 60, h = 22, max = 24;
  if(!values || values.length < 2) return `<svg class="live-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = h - (Math.max(0, Math.min(max, v)) / max) * (h - 2) - 1;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  return `<svg class="live-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
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

  function render(people){
    const myId = auth.getState().user?.id || null;
    const sorted = [...people].sort((a, b) => {
      const r = (SORT[a.status] ?? 4) - (SORT[b.status] ?? 4);
      return r !== 0 ? r : (a.name || '').localeCompare(b.name || '');
    });

    const n = people.length;
    headEl.innerHTML = `<span class="live-dot"></span><span><b>${n}</b> ${n === 1 ? 'person' : 'people'} online now</span>`;

    if(!sorted.length){
      listEl.innerHTML = `<div class="empty">No one's here right now. Connect your Egely Wheel — others will see it spin.</div>`;
      return;
    }
    listEl.innerHTML = sorted.map(p => {
      const st = STATUS[p.status] || STATUS.online;
      const isMe = myId && p.uid === myId;
      // Any connected wheel shows its live value + sparkline (no avg/peak here).
      const valueArea = st.live
        ? `<div class="live-value"><span class="live-spark-wrap" data-spark></span><span class="live-led" data-led>·</span></div>`
        : '';
      return `
        <div class="live-card ${st.cls}" data-uid="${esc(p.uid)}">
          <div class="live-avatar">${avatarHtml(p.avatar, p.name)}</div>
          <div class="live-main">
            <div class="live-name">${esc(p.name || 'Explorer')}${isMe ? ' <span class="live-you">You</span>' : ''}</div>
            <div class="live-status"><span class="live-pill ${st.cls}">${esc(st.label)}</span></div>
          </div>
          ${valueArea}
        </div>`;
    }).join('');
    refreshValues();
  }

  // Update the live wheel number + sparkline on every card that has a connected
  // wheel (ticks arrive ~2x/sec; getLive returns null once a value goes stale).
  function refreshValues(){
    listEl.querySelectorAll('.live-card .live-value').forEach(box => {
      const card = box.closest('.live-card');
      const uid = card.dataset.uid;
      const ledEl = box.querySelector('[data-led]');
      const sparkEl = box.querySelector('[data-spark]');
      const led = presence.getLive(uid);
      if(led == null){
        ledEl.textContent = '·'; ledEl.style.color = ''; ledEl.classList.add('waiting');
        sparkEl.innerHTML = ''; sparkEl.style.color = '';
        return;
      }
      const color = vitalityColor(led);
      ledEl.textContent = String(led); ledEl.style.color = color; ledEl.classList.remove('waiting');
      sparkEl.style.color = color;
      sparkEl.innerHTML = sparkline(presence.getLiveSeries(uid));
    });
  }

  const unsub = presence.subscribe(render);
  const valTimer = setInterval(refreshValues, 400);
  return () => { unsub(); clearInterval(valTimer); };
}
