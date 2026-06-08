// view-live.js — the Live presence wall. A read-only view onto presence.js:
// who is in the ecosystem right now. Cards are intentionally NOT clickable —
// the point is simply to feel that others are here.
import * as auth from './auth.js';
import * as presence from './presence.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

const STATUS = {
  online:    { label: 'Online',          cls: 'online' },
  connected: { label: 'Wheel connected', cls: 'connected' },
  measuring: { label: 'Measuring',       cls: 'measuring' },
};
const SORT = { measuring: 0, connected: 1, online: 2 };   // most "alive" first

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
      const r = (SORT[a.status] ?? 3) - (SORT[b.status] ?? 3);
      return r !== 0 ? r : (a.name || '').localeCompare(b.name || '');
    });

    const n = people.length;
    headEl.innerHTML = `<span class="live-dot"></span><span><b>${n}</b> ${n === 1 ? 'person' : 'people'} online now</span>`;

    if(!sorted.length){
      listEl.innerHTML = `<div class="empty">No one's here right now. Connect your Egely Wheel and start a measurement — others will see you light up.</div>`;
      return;
    }
    listEl.innerHTML = sorted.map(p => {
      const st = STATUS[p.status] || STATUS.online;
      const isMe = myId && p.uid === myId;
      return `
        <div class="live-card ${st.cls}">
          <div class="live-avatar">${avatarHtml(p.avatar, p.name)}</div>
          <div class="live-main">
            <div class="live-name">${esc(p.name || 'Explorer')}${isMe ? ' <span class="live-you">You</span>' : ''}</div>
            <div class="live-status"><span class="live-pill ${st.cls}">${esc(st.label)}</span></div>
          </div>
        </div>`;
    }).join('');
  }

  const unsub = presence.subscribe(render);
  return () => unsub();
}
