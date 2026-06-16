import { supabase } from './db.js';
import * as auth from './auth.js';
import * as wakeLock from './wake-lock.js';
import { vitalityLevel, vitalityColor as vColor } from './analytics.js';
import { drawVitalityChart } from './chart.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// Muted zone colours for metric TEXT on the light theme (vivid vColor stays for
// the spark/chart LINES, which read fine on a light strip).
const zText = led => (led || 0) < 6 ? '#c2415b' : (led || 0) < 13 ? '#b8860b' : '#0f8a52';

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
      <div class="view-head"><h1 class="page-title">Members</h1></div>
      <div class="panel"><p class="placeholder">Log in to view your members.</p>
        <div class="form-actions"><a class="btn-join" href="#/login">Log in</a></div></div>`;
    return () => {};
  }
  if(!a.isPractitioner){
    el.innerHTML = `
      <div class="view-head"><h1 class="page-title">Members</h1></div>
      <div class="panel"><p class="placeholder">This space is for Spiritual Makers. Enable "I'm a Spiritual Maker" in your profile to share a connection link.</p>
        <div class="form-actions"><a class="btn-join" href="#/profile">Go to profile</a></div></div>`;
    return () => {};
  }

  return clientId ? mountDetail(el, clientId) : mountWall(el);
}

// ---- Energy wall -----------------------------------------------------------
function mountWall(el){
  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Members</h1>
      <p class="page-sub">The people whose journey you're accompanying.</p>
    </div>
    <div class="cl-summary" id="clSummary" hidden></div>
    <div class="cl-controls" id="clControls" hidden>
      <input class="cl-search" id="clSearch" type="search" placeholder="Search members…" autocomplete="off">
      <div class="cl-filters" id="clFilters">
        <button type="button" class="cl-pill active" data-filter="all">All</button>
        <button type="button" class="cl-pill" data-filter="live">Live now</button>
        <button type="button" class="cl-pill" data-filter="recent">Recent</button>
        <button type="button" class="cl-pill" data-filter="attention">Needs attention</button>
        <button type="button" class="cl-pill" data-filter="none">No measurements</button>
      </div>
      <select class="cl-sort" id="clSort" aria-label="Sort members">
        <option value="recommended">Recommended</option>
        <option value="recent">Recent activity</option>
        <option value="low">Lowest average</option>
        <option value="peak">Highest peak</option>
        <option value="sessions">Most sessions</option>
        <option value="az">A–Z</option>
      </select>
    </div>
    <div id="clGrid"><div class="empty">Loading…</div></div>`;

  const summaryEl = el.querySelector('#clSummary');
  const controlsEl = el.querySelector('#clControls');
  const grid = el.querySelector('#clGrid');

  let members = [];                // raw clients from getMyClients
  let liveSet = new Set();         // client ids currently measuring (presence)
  const liveBuffers = new Map();   // id -> live led[] (broadcast)
  const liveVerified = new Map();  // id -> false if irregular live
  let search = '', filter = 'all', sort = 'recommended';
  let liveChannel = null, onResize = null;
  const DAY = 86400000;

  // Vitality state label from an average (muted text colours for the light bg).
  function vState(avg){
    if(avg < 3)  return { label: 'Very low', color: '#c2415b' };
    if(avg < 6)  return { label: 'Low',      color: '#c2415b' };
    if(avg < 13) return { label: 'Balanced', color: '#b8860b' };
    return { label: 'Strong', color: '#0f8a52' };
  }

  // Per-member derived state — all client-side, from data we already have.
  function derive(m){
    const now = Date.now();
    const measuring = liveSet.has(m.id);
    const lastTs = m.last ? Date.parse(m.last.created_at) : 0;
    const days = m.last ? (now - lastTs) / DAY : Infinity;
    let avg = m.last ? (m.last.avg || 0) : 0;
    let peak = m.last ? (m.last.peak || 0) : 0;
    const buf = liveBuffers.get(m.id);
    if(measuring && buf && buf.length){ avg = buf.reduce((a, b) => a + b, 0) / buf.length; peak = Math.max(...buf); }
    const noData = !m.last;
    const unverified = !!(m.last && m.last.verified === false) || liveVerified.get(m.id) === false;
    const recent = !noData && days <= 7;
    const monthly = !noData && days <= 30;   // summary "new this month" window
    const inactive = !noData && days > 14;
    const lowVit = !noData && avg < 6;
    const attention = !noData && (lowVit || inactive || unverified);
    return { ...m, measuring, lastTs, days, avg, peak, noData, unverified, recent, monthly, inactive, lowVit, attention };
  }

  function cardHTML(d){
    // Specific status pill (one), by priority — say WHY it needs attention.
    let pill = '';
    if(d.measuring) pill = `<span class="cl-stat live"><span class="dot"></span>Live<span class="cl-live-val"></span></span>`;
    else if(d.unverified) pill = `<span class="cl-stat review">Review</span>`;
    else if(d.lowVit) pill = `<span class="cl-stat low">Low vitality</span>`;
    else if(d.inactive) pill = `<span class="cl-stat idle">Inactive</span>`;
    else if(d.recent) pill = `<span class="cl-stat new">New</span>`;
    const sub = d.noData ? 'Connected · no measurement yet'
              : d.measuring ? 'Measuring now'
              : whenStr(d.last.created_at);
    const head = `
      <div class="client-head">
        <div class="client-avatar">${avatarHtml(d.avatarUrl, d.displayName)}</div>
        <div class="client-id">
          <div class="client-name">${esc(d.displayName)}</div>
          <div class="client-sub">${esc(sub)}</div>
        </div>
        <div class="client-badges">${pill}</div>
      </div>`;
    if(d.noData){
      return `<a class="client-card" href="#/clients/${esc(d.id)}" data-client-id="${esc(d.id)}">
        ${head}
        <div class="client-empty">Connected, waiting for first shared measurement.<span class="cl-empty-sub">They will appear here once they save a solo or session measurement.</span></div>
      </a>`;
    }
    const st = vState(d.avg);
    return `<a class="client-card${d.measuring ? ' live' : ''}${d.attention ? ' attn' : ''}" href="#/clients/${esc(d.id)}" data-client-id="${esc(d.id)}">
      ${head}
      <canvas class="client-spark" data-curve='${esc(JSON.stringify(d.last.curve || []))}'></canvas>
      <div class="client-metrics">
        <div class="cm"><div class="cm-val" data-role="avg" style="color:${zText(d.avg)}">${d.avg.toFixed(1)}</div><div class="cm-lbl">Avg</div></div>
        <div class="cm"><div class="cm-val" data-role="peak" style="color:${zText(d.peak)}">${d.peak ?? '–'}</div><div class="cm-lbl">Peak</div></div>
        <div class="cm"><div class="cm-val">${d.count}</div><div class="cm-lbl">Sessions</div></div>
      </div>
      <div class="client-level" style="color:${st.color}">${st.label}</div>
    </a>`;
  }

  function renderSummary(){
    const d = members.map(derive);
    const chip = (n, l, cls) => `<div class="cl-sum ${cls || ''}"><div class="cl-sum-n">${n}</div><div class="cl-sum-l">${l}</div></div>`;
    const measuring = d.filter(x => x.measuring).length;
    const attn = d.filter(x => x.attention).length;
    summaryEl.innerHTML =
      chip(d.length, 'Connected') +
      chip(measuring, 'Measuring now', measuring ? 'live' : '') +
      chip(d.filter(x => x.monthly).length, 'New this month', 'new') +
      chip(attn, 'Needs attention', attn ? 'attn' : '');
  }

  function drawSparks(){
    grid.querySelectorAll('.client-spark').forEach(cv => {
      const cid = cv.closest('.client-card')?.dataset.clientId;
      const buf = liveBuffers.get(cid);
      if(liveSet.has(cid) && buf && buf.length){ drawSpark(cv, buf); return; }
      try { drawSpark(cv, JSON.parse(cv.dataset.curve || '[]')); } catch {}
    });
  }

  function renderGrid(){
    let list = members.map(derive);
    const q = search.trim().toLowerCase();
    if(q) list = list.filter(x => (x.displayName || '').toLowerCase().includes(q));
    if(filter === 'live') list = list.filter(x => x.measuring);
    else if(filter === 'recent') list = list.filter(x => x.recent);
    else if(filter === 'attention') list = list.filter(x => x.attention);
    else if(filter === 'none') list = list.filter(x => x.noData);

    const byName = (a, b) => (a.displayName || '').localeCompare(b.displayName || '');
    if(sort === 'recommended'){
      const tier = x => x.measuring ? 0 : x.recent ? 1 : x.attention ? 2 : x.noData ? 4 : 3;
      list.sort((a, b) => tier(a) - tier(b) || b.lastTs - a.lastTs || byName(a, b));
    } else if(sort === 'recent'){
      list.sort((a, b) => b.lastTs - a.lastTs || byName(a, b));
    } else if(sort === 'low'){
      list.sort((a, b) => (a.noData - b.noData) || a.avg - b.avg || byName(a, b));
    } else if(sort === 'peak'){
      list.sort((a, b) => (b.peak || 0) - (a.peak || 0) || byName(a, b));
    } else if(sort === 'sessions'){
      list.sort((a, b) => (b.count || 0) - (a.count || 0) || byName(a, b));
    } else { list.sort(byName); }

    if(!list.length){
      grid.className = '';
      grid.innerHTML = `<div class="cl-empty-row">No members match this view.</div>`;
      return;
    }
    grid.className = 'energy-wall';
    grid.innerHTML = list.map(cardHTML).join('');
    drawSparks();
  }

  // Lightweight per-card live update on each broadcast tick (no full re-render).
  function writeCardLive(cid, led){
    const card = grid.querySelector(`.client-card[data-client-id="${cid}"]`);
    if(!card) return;
    const lv = card.querySelector('.cl-live-val'); if(lv && led != null) lv.textContent = ' · ' + led;
    const buf = liveBuffers.get(cid) || [];
    if(buf.length){
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length, peak = Math.max(...buf);
      const aEl = card.querySelector('[data-role="avg"]'), pEl = card.querySelector('[data-role="peak"]');
      if(aEl){ aEl.textContent = avg.toFixed(1); aEl.style.color = zText(avg); }
      if(pEl){ pEl.textContent = peak; pEl.style.color = zText(peak); }
      const sp = card.querySelector('.client-spark'); if(sp) drawSpark(sp, buf);
    }
  }

  (async () => {
    members = await auth.getMyClients();
    if(!members.length){
      grid.className = '';
      grid.innerHTML = `<div class="panel"><p class="placeholder">No members yet. Share your connection link from your <a class="link" href="#/profile">profile</a> — when someone connects, they'll appear here.</p></div>`;
      return;
    }
    summaryEl.hidden = false;
    controlsEl.hidden = false;
    renderSummary();
    renderGrid();
    onResize = drawSparks;
    window.addEventListener('resize', onResize);

    // Controls — client-side search / filter / sort over the data we already have.
    el.querySelector('#clSearch').addEventListener('input', e => { search = e.target.value; renderGrid(); });
    el.querySelector('#clSort').addEventListener('change', e => { sort = e.target.value; renderGrid(); });
    el.querySelector('#clFilters').addEventListener('click', e => {
      const b = e.target.closest('[data-filter]'); if(!b) return;
      filter = b.dataset.filter;
      el.querySelectorAll('#clFilters .cl-pill').forEach(p => p.classList.toggle('active', p === b));
      renderGrid();
    });

    // Live status: presence + broadcast on my practitioner channel (unchanged).
    const myId = auth.getState().user.id;
    liveChannel = supabase.channel('practitioner-' + myId);
    liveChannel.on('presence', { event: 'sync' }, () => {
      const state = liveChannel.presenceState();
      const set = new Set();
      for(const key in state){ if(state[key].some(p => p.measuring)) set.add(key); }
      liveSet = set;
      for(const id of [...liveBuffers.keys()]) if(!set.has(id)){ liveBuffers.delete(id); liveVerified.delete(id); }
      renderSummary();
      renderGrid();
    });
    liveChannel.on('broadcast', { event: 'tick' }, ({ payload }) => {
      const cid = payload.clientId;
      const buf = liveBuffers.get(cid) || [];
      buf.push(payload.led);
      if(buf.length > 80) buf.shift();
      liveBuffers.set(cid, buf);
      if(payload.verified === false) liveVerified.set(cid, false);
      writeCardLive(cid, payload.led);
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
      <p class="room-hint" style="text-align:left;margin:0 0 6px"><a href="#/clients" class="link">← Members</a></p>
      <h1 class="page-title" id="clTitle">Loading…</h1>
    </div>
    <div id="clLiveBanner" class="client-live-banner" hidden></div>
    <div id="clBody"><div class="empty">Loading…</div></div>`;

  let liveChannel = null;
  let updateChannel = null;
  let liveCurve = [];
  let liveActive = false;
  let liveName = 'Member';
  let liveVerified = true;

  (async () => {
    const { connected, profile, rows } = await auth.getClientMeasurements(clientId);
    if(!connected){
      el.querySelector('#clTitle').textContent = 'Not connected';
      el.querySelector('#clBody').innerHTML = '<div class="empty">This member isn\'t connected to you.</div>';
      return;
    }
    const name = (profile && profile.display_name) || 'Member';
    liveName = name;
    el.querySelector('#clTitle').innerHTML =
      `<span class="client-title-avatar">${avatarHtml(profile && profile.avatar_url, name)}</span> ${esc(name)}`;

    const sessIds = [...new Set(rows.filter(r => r.session_id != null).map(r => r.session_id))];
    const sessMap = new Map();   // sessionId -> { name, created_by, created_by_user_id }
    const hostsById = new Map(); // userId -> { display_name, avatar_url }
    if(sessIds.length){
      const { data: sess } = await supabase.from('sessions')
        .select('id, name, created_by, created_by_user_id').in('id', sessIds);
      for(const s of (sess || [])) sessMap.set(s.id, s);
      const hostIds = [...new Set((sess || []).map(s => s.created_by_user_id).filter(Boolean))];
      if(hostIds.length){
        const { data: profs } = await supabase.from('profiles')
          .select('id, display_name, avatar_url').in('id', hostIds);
        for(const p of (profs || [])) hostsById.set(p.id, p);
      }
    }
    const hostFor = sess => {
      if(!sess) return null;
      const p = sess.created_by_user_id ? hostsById.get(sess.created_by_user_id) : null;
      return { display_name: (p && p.display_name) || sess.created_by, avatar_url: p && p.avatar_url };
    };
    const hostChip = host => {
      if(!host) return '';
      const url = host.avatar_url;
      const name = host.display_name || 'Host';
      const av = url
        ? `<img class="sess-avatar" src="${esc(url)}" alt="">`
        : `<span class="sess-avatar sess-avatar-initial">${esc(name.charAt(0).toUpperCase())}</span>`;
      return ` · hosted by <span class="me-host">${av}<span class="me-host-name">${esc(name)}</span></span>`;
    };

    const body = el.querySelector('#clBody');

    const rowCardHTML = (r, title, host) => {
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
            <div class="me-meta">${esc(whenStr(r.created_at))} · <span style="color:${lvl.color}">${esc(lvl.name)}</span>${hostChip(host)}</div>
          </div>
          <div class="me-stats">
            <div class="rs"><div class="rs-val" style="color:${zText(r.avg)}">${(r.avg || 0).toFixed(1)}</div><div class="rs-lbl">Avg</div></div>
            <div class="rs"><div class="rs-val" style="color:${zText(r.peak)}">${r.peak}</div><div class="rs-lbl">Peak</div></div>
            <div class="rs"><div class="rs-val">${r.steadiness}</div><div class="rs-lbl">Steady</div></div>
          </div>
        </a>`;
    };

    const sessionFor = (r) => r.session_id == null ? null : sessMap.get(r.session_id);
    const titleFor = (r) => {
      const s = sessionFor(r);
      return r.session_id == null ? (r.label || 'Solo measurement') : ((s && s.name) || 'Session');
    };

    // Overview header — relationship + headline stats at a glance.
    const vr = rows.length ? Math.round(rows.filter(r => r.verified).length / rows.length * 100) : null;
    const avgAll = rows.length ? rows.reduce((s, r) => s + (r.avg || 0), 0) / rows.length : null;
    const peakAll = rows.length ? Math.max(...rows.map(r => r.peak || 0)) : null;
    const vrColor = vr == null ? '' : vr >= 67 ? '#0f8a52' : vr >= 34 ? '#9a7400' : '#c2415b';
    const ovStat = (val, lbl, color) => `<div class="cl-ov"><div class="cl-ov-n"${color ? ` style="color:${color}"` : ''}>${esc(String(val))}</div><div class="cl-ov-l">${esc(lbl)}</div></div>`;
    const overview = `
      <div class="cl-overview">
        <div class="cl-ov-rel"><span class="cl-rel-dot"></span>Sharing measurements with you</div>
        <div class="cl-ov-stats">
          ${ovStat(rows.length, 'Measurements')}
          ${ovStat(avgAll != null ? avgAll.toFixed(1) : '–', 'Avg vitality', avgAll != null ? zText(avgAll) : '')}
          ${ovStat(peakAll != null ? peakAll : '–', 'Best peak', peakAll != null ? zText(peakAll) : '')}
          ${ovStat(vr != null ? vr + '%' : '–', 'Verified', vrColor)}
        </div>
        <div class="cl-ov-last">${rows.length ? 'Last measurement · ' + esc(whenStr(rows[0].created_at)) : 'No measurements shared yet'}</div>
      </div>`;
    body.innerHTML = overview + (rows.length
      ? rows.map(r => rowCardHTML(r, titleFor(r), hostFor(sessionFor(r)))).join('')
      : `<div class="cl-empty-row">${esc((profile && profile.display_name) || 'This member')} is connected and ready — no measurements shared yet.</div>`);

    // Auto-update: when the client saves a new measurement, prepend it instantly.
    updateChannel = supabase.channel('client-updates-' + clientId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'results', filter: `user_id=eq.${clientId}` }, async ({ new: r }) => {
        if(!r) return;
        if(r.session_id != null && !sessMap.has(r.session_id)){
          const { data: s } = await supabase.from('sessions')
            .select('id, name, created_by, created_by_user_id').eq('id', r.session_id).maybeSingle();
          if(s){
            sessMap.set(s.id, s);
            if(s.created_by_user_id && !hostsById.has(s.created_by_user_id)){
              const { data: p } = await supabase.from('profiles')
                .select('id, display_name, avatar_url').eq('id', s.created_by_user_id).maybeSingle();
              if(p) hostsById.set(p.id, p);
            }
          }
        }
        // Drop the "no measurements yet" row if it's still there, then insert the
        // new measurement at the top of the list — just after the overview header.
        const emptyRow = body.querySelector('.cl-empty-row');
        if(emptyRow) emptyRow.remove();
        const html = rowCardHTML(r, titleFor(r), hostFor(sessionFor(r)));
        const ov = body.querySelector('.cl-overview');
        if(ov) ov.insertAdjacentHTML('afterend', html);
        else body.insertAdjacentHTML('afterbegin', html);
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
      if($('lvLive')){ $('lvLive').textContent = payload.led; $('lvLive').style.color = zText(payload.led); }
      if($('lvAvg')){ $('lvAvg').textContent = (payload.avg || 0).toFixed(1); $('lvAvg').style.color = zText(payload.avg || 0); }
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
