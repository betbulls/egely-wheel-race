import { supabase } from './db.js';
import * as auth from './auth.js';
import { vitalityLevel, vitalityColor as vColor } from './analytics.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

function whenStr(iso){
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Small sparkline (no axes) from a downsampled curve.
function drawSpark(canvas, curve){
  if(!canvas || !Array.isArray(curve) || curve.length < 2) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const n = curve.length, pad = 3;
  const yOf = v => h - pad - (v / 24) * (h - pad * 2);
  ctx.beginPath();
  curve.forEach((v, i) => { const x = (i / (n - 1)) * w, y = yOf(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  const avg = curve.reduce((a, b) => a + b, 0) / n;
  ctx.strokeStyle = vColor(avg); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
}

export function mount(el, clientId){
  const a = auth.getState();
  if(!a.user){
    el.innerHTML = `
      <div class="view-head"><h1 class="page-title">Clients</h1></div>
      <div class="panel"><p class="placeholder">Log in to view your clients.</p>
        <div class="form-actions"><a class="btn-join" href="#/login">Log in</a></div></div>`;
    return () => {};
  }
  if(!a.isPractitioner){
    el.innerHTML = `
      <div class="view-head"><h1 class="page-title">Clients</h1></div>
      <div class="panel"><p class="placeholder">This space is for practitioners. Enable "I'm a practitioner" in your profile to share a connection link.</p>
        <div class="form-actions"><a class="btn-join" href="#/profile">Go to profile</a></div></div>`;
    return () => {};
  }

  return clientId ? mountDetail(el, clientId) : mountWall(el);
}

// ---- Energy wall -----------------------------------------------------------
function mountWall(el){
  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Clients</h1>
      <p class="page-sub">The people whose journey you're accompanying.</p>
    </div>
    <div id="clWall"><div class="empty">Loading…</div></div>`;
  const wall = el.querySelector('#clWall');
  let onResize = null;

  (async () => {
    const clients = await auth.getMyClients();
    if(!clients.length){
      wall.innerHTML = `<div class="panel"><p class="placeholder">No clients yet. Share your connection link from your <a class="link" href="#/profile">profile</a> — when someone connects, they'll appear here.</p></div>`;
      return;
    }

    wall.className = 'energy-wall';
    wall.innerHTML = clients.map(c => {
      const last = c.last;
      const lvl = last ? vitalityLevel(last.avg || 0) : null;
      return `
        <a class="client-card" href="#/clients/${esc(c.id)}">
          <div class="client-head">
            <div class="client-avatar">${avatarHtml(c.avatarUrl, c.displayName)}</div>
            <div class="client-id">
              <div class="client-name">${esc(c.displayName)}</div>
              <div class="client-sub">${last ? esc(whenStr(last.created_at)) : 'No measurements yet'}</div>
            </div>
          </div>
          ${last ? `
            <canvas class="client-spark" data-curve='${esc(JSON.stringify(last.curve || []))}'></canvas>
            <div class="client-metrics">
              <div class="cm"><div class="cm-val" style="color:${vColor(last.avg)}">${(last.avg || 0).toFixed(1)}</div><div class="cm-lbl">Avg</div></div>
              <div class="cm"><div class="cm-val" style="color:${vColor(last.peak)}">${last.peak ?? '–'}</div><div class="cm-lbl">Peak</div></div>
              <div class="cm"><div class="cm-val">${c.count}</div><div class="cm-lbl">Sessions</div></div>
            </div>
            <div class="client-level" style="color:${lvl.color}">${esc(lvl.name)}</div>
          ` : `<div class="client-empty">Waiting for the first measurement.</div>`}
        </a>`;
    }).join('');

    const draw = () => wall.querySelectorAll('.client-spark').forEach(cv => {
      try { drawSpark(cv, JSON.parse(cv.dataset.curve || '[]')); } catch {}
    });
    draw();
    onResize = draw;
    window.addEventListener('resize', onResize);
  })();

  return () => { if(onResize) window.removeEventListener('resize', onResize); };
}

// ---- Single client detail --------------------------------------------------
function mountDetail(el, clientId){
  el.innerHTML = `
    <div class="view-head">
      <p class="room-hint" style="text-align:left;margin:0 0 6px"><a href="#/clients" class="link">← Clients</a></p>
      <h1 class="page-title" id="clTitle">Loading…</h1>
    </div>
    <div id="clBody"><div class="empty">Loading…</div></div>`;

  (async () => {
    const { connected, profile, rows } = await auth.getClientMeasurements(clientId);
    if(!connected){
      el.querySelector('#clTitle').textContent = 'Not connected';
      el.querySelector('#clBody').innerHTML = '<div class="empty">This client isn\'t connected to you.</div>';
      return;
    }
    const name = (profile && profile.display_name) || 'Client';
    el.querySelector('#clTitle').innerHTML =
      `<span class="client-title-avatar">${avatarHtml(profile && profile.avatar_url, name)}</span> ${esc(name)}`;

    const sessIds = [...new Set(rows.filter(r => r.session_id != null).map(r => r.session_id))];
    const sessMap = new Map();
    if(sessIds.length){
      const { data: sess } = await supabase.from('sessions').select('id, name').in('id', sessIds);
      for(const s of (sess || [])) sessMap.set(s.id, s.name);
    }

    const body = el.querySelector('#clBody');
    if(!rows.length){
      body.innerHTML = `<div class="panel"><p class="placeholder">${esc(profile.display_name || 'This client')} hasn't recorded any measurements yet.</p></div>`;
      return;
    }

    body.innerHTML = rows.map(r => {
      const solo = r.session_id == null;
      const lvl = vitalityLevel(r.avg || 0);
      const title = solo ? (r.label || 'Solo measurement') : (sessMap.get(r.session_id) || 'Session');
      return `
        <a class="me-card" href="#/m/${r.id}">
          <div class="me-main">
            <div class="me-title-row">
              <span class="me-kind ${solo ? 'solo' : 'session'}">${solo ? 'Solo' : 'Session'}</span>
              <span class="me-title">${esc(title)}</span>
              ${r.verified ? '<span class="v-badge verified">✓</span>' : '<span class="v-badge unverified">unverified</span>'}
            </div>
            <div class="me-meta">${esc(whenStr(r.created_at))} · <span style="color:${lvl.color}">${esc(lvl.name)}</span></div>
          </div>
          <div class="me-stats">
            <div class="rs"><div class="rs-val" style="color:${vColor(r.avg)}">${(r.avg || 0).toFixed(1)}</div><div class="rs-lbl">Avg</div></div>
            <div class="rs"><div class="rs-val" style="color:${vColor(r.peak)}">${r.peak}</div><div class="rs-lbl">Peak</div></div>
            <div class="rs"><div class="rs-val">${r.steadiness}</div><div class="rs-lbl">Steady</div></div>
          </div>
        </a>`;
    }).join('');
  })();

  return () => {};
}
