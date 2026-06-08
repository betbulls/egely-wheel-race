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

// Live vitality curve — same look as the session per-racer curve (drawCurve):
// a coloured line on a dark rounded panel, no axes, no zone strip.
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
  const xOf = i => (i / (n - 1)) * w;
  const yOf = led => h - (Math.max(0, Math.min(24, led)) / 24) * (h - pad * 2) - pad;
  ctx.beginPath();
  series.forEach((v, i) => { const x = xOf(i), y = yOf(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
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
      const value = st.live ? `<div class="live-value"><span class="live-led" data-led>·</span></div>` : '';
      const curve = st.live ? `<canvas class="live-wheel-curve" data-curve></canvas>` : '';
      return `
        <div class="live-card ${st.cls}" data-uid="${esc(p.uid)}">
          <div class="live-row">
            <div class="live-avatar">${avatarHtml(p.avatar, p.name)}</div>
            <div class="live-main">
              <div class="live-name">${esc(p.name || 'Explorer')}${isMe ? ' <span class="live-you">You</span>' : ''}</div>
              <div class="live-status"><span class="live-pill ${st.cls}">${esc(st.label)}</span></div>
            </div>
            ${value}
          </div>
          ${curve}
        </div>`;
    }).join('');
    refreshValues();
  }

  // Update the live number + curve on every card with a connected wheel (ticks
  // arrive ~2x/sec; getLive returns null once a value goes stale).
  function refreshValues(){
    listEl.querySelectorAll('.live-card').forEach(card => {
      const ledEl = card.querySelector('[data-led]');
      const canvas = card.querySelector('[data-curve]');
      if(!ledEl && !canvas) return;
      const uid = card.dataset.uid;
      const led = presence.getLive(uid);
      if(led == null){
        if(ledEl){ ledEl.textContent = '·'; ledEl.style.color = ''; ledEl.classList.add('waiting'); }
        if(canvas){ const ctx = canvas.getContext('2d'); ctx && ctx.clearRect(0, 0, canvas.width, canvas.height); }
        return;
      }
      const color = vitalityColor(led);
      if(ledEl){ ledEl.textContent = String(led); ledEl.style.color = color; ledEl.classList.remove('waiting'); }
      if(canvas) drawLiveCurve(canvas, presence.getLiveSeries(uid), color);
    });
  }

  const unsub = presence.subscribe(render);
  const valTimer = setInterval(refreshValues, 400);
  return () => { unsub(); clearInterval(valTimer); };
}
