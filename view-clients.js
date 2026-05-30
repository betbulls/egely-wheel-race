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
  let liveChannel = null;

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
        <a class="client-card" href="#/clients/${esc(c.id)}" data-client-id="${esc(c.id)}">
          <div class="client-head">
            <div class="client-avatar">${avatarHtml(c.avatarUrl, c.displayName)}</div>
            <div class="client-id">
              <div class="client-name">${esc(c.displayName)}</div>
              <div class="client-sub">${last ? esc(whenStr(last.created_at)) : 'No measurements yet'}</div>
            </div>
            <span class="live-pill-mini" hidden><span class="dot"></span><span class="live-pill-text">LIVE</span></span>
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

    // Live status: a presence/broadcast channel for my practitioner identity.
    // Each measuring client tracks "measuring: true" + broadcasts live ticks.
    const myId = auth.getState().user.id;
    liveChannel = supabase.channel('practitioner-' + myId);

    const applyPresence = () => {
      const state = liveChannel.presenceState();
      const measuring = new Set();
      for(const key in state){
        if(state[key].some(p => p.measuring)) measuring.add(key);
      }
      // Toggle pill + class; sort measuring clients to the top.
      const cards = [...wall.querySelectorAll('.client-card')];
      for(const card of cards){
        const live = measuring.has(card.dataset.clientId);
        card.classList.toggle('live', live);
        const pill = card.querySelector('.live-pill-mini');
        if(pill){
          pill.hidden = !live;
          if(!live) pill.querySelector('.live-pill-text').textContent = 'LIVE';
        }
      }
      cards.sort((a, b) => {
        const am = measuring.has(a.dataset.clientId) ? 0 : 1;
        const bm = measuring.has(b.dataset.clientId) ? 0 : 1;
        return am - bm;
      });
      cards.forEach(c => wall.appendChild(c));   // reorders, preserves canvases
    };

    liveChannel.on('presence', { event: 'sync' }, applyPresence);
    liveChannel.on('broadcast', { event: 'tick' }, ({ payload }) => {
      const card = wall.querySelector(`.client-card[data-client-id="${payload.clientId}"]`);
      if(!card) return;
      const t = card.querySelector('.live-pill-text');
      if(t) t.textContent = 'LIVE · ' + payload.led;
    });
    liveChannel.subscribe();
  })();

  return () => {
    if(onResize) window.removeEventListener('resize', onResize);
    if(liveChannel) supabase.removeChannel(liveChannel);
  };
}

// ---- Single client detail --------------------------------------------------
function mountDetail(el, clientId){
  el.innerHTML = `
    <div class="view-head">
      <p class="room-hint" style="text-align:left;margin:0 0 6px"><a href="#/clients" class="link">← Clients</a></p>
      <h1 class="page-title" id="clTitle">Loading…</h1>
    </div>
    <div id="clLiveBanner" class="client-live-banner" hidden></div>
    <div id="clBody"><div class="empty">Loading…</div></div>`;

  let liveChannel = null;
  let liveCurve = [];
  let liveActive = false;
  let liveName = 'Client';

  (async () => {
    const { connected, profile, rows } = await auth.getClientMeasurements(clientId);
    if(!connected){
      el.querySelector('#clTitle').textContent = 'Not connected';
      el.querySelector('#clBody').innerHTML = '<div class="empty">This client isn\'t connected to you.</div>';
      return;
    }
    const name = (profile && profile.display_name) || 'Client';
    liveName = name;
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

    // ---- Live banner: shown while the client is actively measuring ---------
    const banner = el.querySelector('#clLiveBanner');

    function showLive(){
      if(liveActive) return;
      liveActive = true; liveCurve = [];
      banner.hidden = false;
      banner.innerHTML = `
        <div class="live-head">
          <span class="live-pill-mini live"><span class="dot"></span><span>LIVE</span></span>
          <span class="live-title">${esc(liveName)} is measuring now</span>
        </div>
        <div class="live-metrics">
          <div class="lm"><div class="lm-val" id="lvLive">–</div><div class="lm-lbl">Live</div></div>
          <div class="lm"><div class="lm-val" id="lvAvg">–</div><div class="lm-lbl">Avg</div></div>
          <div class="lm"><div class="lm-val" id="lvPeak">–</div><div class="lm-lbl">Peak</div></div>
        </div>
        <canvas class="live-curve" id="lvCurve"></canvas>`;
    }
    function hideLive(){
      if(!liveActive) return;
      liveActive = false; liveCurve = [];
      banner.hidden = true; banner.innerHTML = '';
    }
    function drawLive(){
      const cv = el.querySelector('#lvCurve');
      if(!cv) return;
      const w = cv.clientWidth, h = cv.clientHeight;
      if(!w || !h) return;
      const dpr = window.devicePixelRatio || 1;
      if(cv.width !== Math.round(w * dpr)){ cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if(liveCurve.length < 2) return;
      const tMax = liveCurve[liveCurve.length - 1].t;
      const tMin = Math.max(0, tMax - 60000);
      const xOf = t => ((t - tMin) / Math.max(1, tMax - tMin)) * w;
      const yOf = led => h - 4 - (led / 24) * (h - 8);
      ctx.beginPath();
      let started = false;
      for(const pt of liveCurve){
        if(pt.t < tMin) continue;
        const x = xOf(pt.t), y = yOf(pt.led);
        if(!started){ ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      const lastAvg = liveCurve.reduce((s, p) => s + p.led, 0) / liveCurve.length;
      ctx.strokeStyle = vColor(lastAvg); ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    }

    const myId = auth.getState().user.id;
    liveChannel = supabase.channel('practitioner-' + myId);
    liveChannel.on('presence', { event: 'sync' }, () => {
      const state = liveChannel.presenceState();
      const ps = state[clientId];
      const measuring = !!(ps && ps.some(x => x.measuring));
      if(measuring) showLive(); else hideLive();
    });
    liveChannel.on('broadcast', { event: 'tick' }, ({ payload }) => {
      if(payload.clientId !== clientId) return;
      if(!liveActive) showLive();
      liveCurve.push({ t: payload.t, led: payload.led });
      if(liveCurve.length > 800) liveCurve.shift();
      const $ = id => el.querySelector('#' + id);
      if($('lvLive')){ $('lvLive').textContent = payload.led; $('lvLive').style.color = vColor(payload.led); }
      if($('lvAvg')){ $('lvAvg').textContent = (payload.avg || 0).toFixed(1); $('lvAvg').style.color = vColor(payload.avg || 0); }
      if($('lvPeak')){ $('lvPeak').textContent = payload.peak; }
      drawLive();
    });
    liveChannel.subscribe();
  })();

  return () => { if(liveChannel) supabase.removeChannel(liveChannel); };
}
