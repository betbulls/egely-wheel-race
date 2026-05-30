import { supabase } from './db.js';
import * as auth from './auth.js';
import * as wakeLock from './wake-lock.js';
import { vitalityLevel, vitalityColor as vColor } from './analytics.js';
import { drawVitalityChart } from './chart.js';

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
            <div class="client-badges">
              <span class="live-pill-mini" hidden><span class="dot"></span><span class="live-pill-text">LIVE</span></span>
            </div>
          </div>
          ${last ? `
            <canvas class="client-spark" data-curve='${esc(JSON.stringify(last.curve || []))}'></canvas>
            <div class="client-metrics">
              <div class="cm"><div class="cm-val" data-role="avg" style="color:${vColor(last.avg)}">${(last.avg || 0).toFixed(1)}</div><div class="cm-lbl">Avg</div></div>
              <div class="cm"><div class="cm-val" data-role="peak" style="color:${vColor(last.peak)}">${last.peak ?? '–'}</div><div class="cm-lbl">Peak</div></div>
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

    // Per-client live state. Map: clientId -> { buf: ledValues[], verified: bool }
    const liveBuffers = new Map();
    const liveVerified = new Map();
    const originals = new Map(clients.map(c => [c.id, c.last || null]));

    const writeCardLive = (cid) => {
      const card = wall.querySelector(`.client-card[data-client-id="${cid}"]`);
      if(!card) return;
      const buf = liveBuffers.get(cid) || [];
      if(buf.length){
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        const peak = Math.max(...buf);
        const aEl = card.querySelector('[data-role="avg"]');
        const pEl = card.querySelector('[data-role="peak"]');
        if(aEl){ aEl.textContent = avg.toFixed(1); aEl.style.color = vColor(avg); }
        if(pEl){ pEl.textContent = peak; pEl.style.color = vColor(peak); }
        const spark = card.querySelector('.client-spark');
        if(spark) drawSpark(spark, buf);
      }
      const ok = liveVerified.get(cid) !== false;
      let uv = card.querySelector('.client-unverified');
      if(!ok && !uv){
        const badges = card.querySelector('.client-badges');
        const span = document.createElement('span');
        span.className = 'client-unverified v-badge unverified';
        span.textContent = 'unverified';
        if(badges) badges.appendChild(span);
      } else if(ok && uv){ uv.remove(); }
    };

    const restoreCard = (cid) => {
      liveBuffers.delete(cid);
      liveVerified.delete(cid);
      const card = wall.querySelector(`.client-card[data-client-id="${cid}"]`);
      if(!card) return;
      const orig = originals.get(cid);
      if(orig){
        const aEl = card.querySelector('[data-role="avg"]');
        const pEl = card.querySelector('[data-role="peak"]');
        if(aEl){ aEl.textContent = (orig.avg || 0).toFixed(1); aEl.style.color = vColor(orig.avg); }
        if(pEl){ pEl.textContent = orig.peak ?? '–'; pEl.style.color = vColor(orig.peak); }
        const spark = card.querySelector('.client-spark');
        if(spark){ try { drawSpark(spark, JSON.parse(spark.dataset.curve || '[]')); } catch {} }
      }
      const uv = card.querySelector('.client-unverified');
      if(uv) uv.remove();
    };

    const applyPresence = () => {
      const state = liveChannel.presenceState();
      const measuring = new Set();
      for(const key in state){
        if(state[key].some(p => p.measuring)) measuring.add(key);
      }
      const cards = [...wall.querySelectorAll('.client-card')];
      for(const card of cards){
        const cid = card.dataset.clientId;
        const live = measuring.has(cid);
        card.classList.toggle('live', live);
        const pill = card.querySelector('.live-pill-mini');
        if(pill){
          pill.hidden = !live;
          if(!live) pill.querySelector('.live-pill-text').textContent = 'LIVE';
        }
        if(!live && liveBuffers.has(cid)) restoreCard(cid);
      }
      cards.sort((a, b) => {
        const am = measuring.has(a.dataset.clientId) ? 0 : 1;
        const bm = measuring.has(b.dataset.clientId) ? 0 : 1;
        return am - bm;
      });
      cards.forEach(c => wall.appendChild(c));
    };

    liveChannel.on('presence', { event: 'sync' }, applyPresence);
    liveChannel.on('broadcast', { event: 'tick' }, ({ payload }) => {
      const cid = payload.clientId;
      const card = wall.querySelector(`.client-card[data-client-id="${cid}"]`);
      if(!card) return;
      const t = card.querySelector('.live-pill-text');
      if(t) t.textContent = 'LIVE · ' + payload.led;
      const buf = liveBuffers.get(cid) || [];
      buf.push(payload.led);
      if(buf.length > 80) buf.shift();
      liveBuffers.set(cid, buf);
      if(payload.verified === false) liveVerified.set(cid, false);
      writeCardLive(cid);
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
  let updateChannel = null;
  let liveCurve = [];
  let liveActive = false;
  let liveName = 'Client';
  let liveVerified = true;

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

    const rowCardHTML = (r, title) => {
      const solo = r.session_id == null;
      const lvl = vitalityLevel(r.avg || 0);
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
    };

    const titleFor = (r) => r.session_id == null
      ? (r.label || 'Solo measurement')
      : (sessMap.get(r.session_id) || 'Session');

    body.innerHTML = rows.length
      ? rows.map(r => rowCardHTML(r, titleFor(r))).join('')
      : `<div class="panel"><p class="placeholder">${esc((profile && profile.display_name) || 'This client')} hasn't recorded any measurements yet.</p></div>`;

    // Auto-update: when the client saves a new measurement, prepend it instantly.
    updateChannel = supabase.channel('client-updates-' + clientId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'results', filter: `user_id=eq.${clientId}` }, async ({ new: r }) => {
        if(!r) return;
        if(r.session_id != null && !sessMap.has(r.session_id)){
          const { data: s } = await supabase.from('sessions').select('name').eq('id', r.session_id).maybeSingle();
          sessMap.set(r.session_id, (s && s.name) || 'Session');
        }
        // Drop the "no measurements yet" placeholder if it's still there.
        const empty = body.querySelector('.placeholder');
        if(empty) body.innerHTML = '';
        body.insertAdjacentHTML('afterbegin', rowCardHTML(r, titleFor(r)));
      })
      .subscribe();

    // ---- Live banner: shown while the client is actively measuring ---------
    const banner = el.querySelector('#clLiveBanner');

    function showLive(){
      if(liveActive) return;
      liveActive = true; liveCurve = []; liveVerified = true;
      wakeLock.acquire();
      banner.hidden = false;
      banner.innerHTML = `
        <div class="live-head">
          <span class="live-pill-mini live"><span class="dot"></span><span>LIVE</span></span>
          <span class="live-title">${esc(liveName)} is measuring now</span>
          <span class="v-badge unverified" id="lvVerified" hidden>unverified</span>
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
      liveActive = false; liveCurve = []; liveVerified = true;
      wakeLock.release();
      banner.hidden = true; banner.innerHTML = '';
    }
    function drawLive(){
      const cv = el.querySelector('#lvCurve');
      if(!cv) return;
      const leds = liveCurve.map(p => p.led);
      const elapsed = liveCurve.length ? Math.max(1, Math.round(liveCurve[liveCurve.length - 1].t / 1000)) : 1;
      drawVitalityChart(cv, leds, elapsed);
    }
    function applyVerifiedBadge(){
      const v = el.querySelector('#lvVerified');
      if(v) v.hidden = liveVerified;
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
      if(payload.verified === false){ liveVerified = false; applyVerifiedBadge(); }
      const $ = id => el.querySelector('#' + id);
      if($('lvLive')){ $('lvLive').textContent = payload.led; $('lvLive').style.color = vColor(payload.led); }
      if($('lvAvg')){ $('lvAvg').textContent = (payload.avg || 0).toFixed(1); $('lvAvg').style.color = vColor(payload.avg || 0); }
      if($('lvPeak')){ $('lvPeak').textContent = payload.peak; }
      drawLive();
    });
    liveChannel.on('broadcast', { event: 'history' }, ({ payload }) => {
      if(payload.clientId !== clientId) return;
      if(!liveActive) showLive();
      const sm = payload.sampleMs || 250;
      liveCurve = (payload.samples || []).map((v, i) => ({ t: i * sm, led: v }));
      if(payload.verified === false){ liveVerified = false; applyVerifiedBadge(); }
      drawLive();
    });
    liveChannel.subscribe((status) => {
      // Ask the client (if measuring) to send us whatever they've already recorded,
      // so we don't start watching mid-curve.
      if(status === 'SUBSCRIBED'){
        try { liveChannel.send({ type: 'broadcast', event: 'request-history', payload: { clientId } }); } catch {}
      }
    });
  })();

  return () => {
    if(liveChannel) supabase.removeChannel(liveChannel);
    if(updateChannel) supabase.removeChannel(updateChannel);
    wakeLock.release();
  };
}
