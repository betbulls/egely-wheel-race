import { supabase } from './db.js';
import * as ble from './ble.js';
import { computeStats, CATEGORIES, METRIC_HELP, icon, trendLabel } from './analytics.js';

const BROADCAST_MS = 500;   // how often each client samples + broadcasts its LED
const RENDER_MS = 250;      // how often the board repaints

// Cheat detection: genuine readings drift slowly. If the LED moves by >= 3
// within any 1-second window (e.g. 2 -> 5), it's hand-spun => not verified.
const CHANGE_WINDOW_MS = 1000;
const CHANGE_LIMIT = 3;

function vitalityColor(led){
  if(led <= 5) return '#C0143C';   // red
  if(led <= 12) return '#E9D24A';  // yellow
  return '#3CC98A';                // green
}

// Mounts the Session Room view. Returns a cleanup function.
export function mount(el, sessionId){
  let session = null;
  let startMs = 0, endMs = 0, durationMs = 0;
  let myName = (localStorage.getItem('ewr_name') || '').trim();

  // racers: name -> { name, led, avg, count, host, history:[{t,led}], el }
  const racers = new Map();
  let myLed = 0, mySum = 0, myCount = 0, myPeak = 0;

  let channel = null;
  let broadcastTimer = null, renderTimer = null, flushTimer = null;
  let unsubFrames = null, unsubStatus = null;
  let leaderExpanded = false;
  let bleConnected = false;

  let pendingSamples = [];   // buffered measurement rows, flushed in batches
  let mySamples = [];        // my own LED values (in-window) for my result row
  let groupSaved = false;    // host writes session group_avg once, at the end
  let myResultSaved = false; // each client writes its own result row once, at the end

  let recentFrames = [];     // {t, led} within the last second (cheat detection)
  let cheatDetected = false; // latched once an irregular change is seen in-window

  const racerId = name => name.trim().toLowerCase().replace(/\s+/g, '_');
  const inWindow = () => { const n = Date.now(); return n >= startMs && n <= endMs; };

  el.innerHTML = `
    <div class="room-head">
      <div class="room-title-row">
        <span class="room-title" id="roomTitle">Loading…</span>
        <span class="live-pill" id="livePill" hidden><span class="dot"></span>Live</span>
      </div>
      <div class="room-sub" id="roomSub"></div>
    </div>

    <div class="panel name-gate" id="nameGate" hidden>
      <h2>Join this session</h2>
      <div class="form-grid">
        <div class="field full">
          <label for="rName">Your name</label>
          <input type="text" id="rName" maxlength="60" placeholder="Your name">
        </div>
      </div>
      <div class="form-actions"><button id="rJoin">Join session</button></div>
    </div>

    <div id="roomBody" hidden>
      <div class="leader-banner">
        <div class="lb-top">
          <div class="avatar lg" id="lbAvatar">–</div>
          <div class="lb-info">
            <div class="lb-label">Session host</div>
            <div class="lb-name" id="lbName">—</div>
          </div>
          <canvas class="lb-spark" id="lbSpark"></canvas>
          <div class="lb-metrics">
            <div class="metric"><div class="metric-val live" id="lbLive">0</div><div class="metric-lbl">Live</div></div>
            <div class="metric"><div class="metric-val peak" id="lbPeak">0</div><div class="metric-lbl">Peak</div></div>
            <div class="metric"><div class="metric-val avg" id="lbAvg">0.0</div><div class="metric-lbl">Avg</div></div>
          </div>
          <button class="lb-expand" id="lbExpand" title="Expand live chart">&#9662;</button>
        </div>
        <div class="lb-chart-wrap" id="lbChartWrap" hidden>
          <canvas class="lb-chart" id="lbChart"></canvas>
        </div>
      </div>

      <div class="group-bar">
        <div class="gstat time"><div class="gval" id="gTime">--:--</div><div class="glbl">Time left</div></div>
        <div class="gstat"><div class="gval" id="gLive">0.0</div><div class="glbl">Group live</div></div>
        <div class="gstat"><div class="gval" id="gAvg">0.0</div><div class="glbl">Group avg</div></div>
      </div>

      <div class="scale">
        <div class="scale-label">Vitality scale</div>
        <div class="scale-bar"></div>
        <div class="scale-ticks"><span>0</span><span>6</span><span>13</span><span>24</span></div>
      </div>

      <div class="board" id="board"></div>
      <p class="room-hint" id="roomHint"></p>
    </div>
  `;

  const $ = id => el.querySelector('#' + id);

  // ---- Load session ---------------------------------------------------------
  (async () => {
    const { data, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    if(error || !data){
      $('roomTitle').textContent = 'Session not found';
      $('roomSub').innerHTML = '<a href="#/sessions" class="link">Back to sessions</a>';
      return;
    }
    session = data;
    startMs = new Date(session.scheduled_start).getTime();
    durationMs = (session.duration_minutes || 0) * 60000;
    endMs = startMs + durationMs;
    $('roomTitle').textContent = session.name || 'Session';
    const when = new Date(session.scheduled_start).toLocaleString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    $('roomSub').textContent = `Hosted by ${session.created_by || 'unknown'} · ${session.duration_minutes} min · ${when}`;
    if(Date.now() > endMs) renderResults();
    else start();
  })();

  function isHostName(name){
    return session && name && name.trim().toLowerCase() === (session.created_by || '').trim().toLowerCase();
  }

  function start(){
    if(myName){
      showBody();
    } else {
      $('nameGate').hidden = false;
      $('rName').focus();
      $('rJoin').addEventListener('click', () => {
        const v = $('rName').value.trim();
        if(!v) return;
        myName = v;
        localStorage.setItem('ewr_name', v);
        $('nameGate').hidden = true;
        showBody();
      });
    }
  }

  function showBody(){
    $('roomBody').hidden = false;
    joinChannel();

    unsubStatus = ble.subscribeStatus(s => { bleConnected = s.connected; updateHint(); });
    unsubFrames = ble.subscribeFrames(frame => {
      myLed = frame.led;
      if(inWindow()){
        const now = Date.now();
        recentFrames.push({ t: now, led: frame.led });
        recentFrames = recentFrames.filter(f => now - f.t <= CHANGE_WINDOW_MS);
        const vals = recentFrames.map(f => f.led);
        if(Math.max(...vals) - Math.min(...vals) >= CHANGE_LIMIT && !cheatDetected){
          cheatDetected = true; updateHint();
        }
      }
    });

    $('lbExpand').addEventListener('click', () => {
      leaderExpanded = !leaderExpanded;
      $('lbChartWrap').hidden = !leaderExpanded;
      $('lbExpand').classList.toggle('open', leaderExpanded);
    });

    broadcastTimer = setInterval(sampleAndBroadcast, BROADCAST_MS);
    renderTimer = setInterval(render, RENDER_MS);
    flushTimer = setInterval(flushSamples, 2000);
    updateHint();
    render();
  }

  function updateHint(){
    const h = $('roomHint');
    if(cheatDetected){ h.innerHTML = '<span class="warn">Irregular spinning detected — this measurement won\'t be verified.</span>'; return; }
    if(bleConnected) h.textContent = `You are measuring as "${myName}".`;
    else h.textContent = 'Connect your Egely Wheel (top right) to join the measurement — or just watch the leaderboard.';
  }

  // ---- Realtime channel -----------------------------------------------------
  function joinChannel(){
    channel = supabase.channel('room-' + sessionId, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'tick' }, ({ payload }) => applyTick(payload));
    channel.subscribe();
  }

  function applyTick(p){
    if(!p || !p.name) return;
    upsertRacer(p.name, { led: p.led, avg: p.avg, count: p.count, peak: p.peak, host: isHostName(p.name), verified: p.verified });
  }

  function upsertRacer(name, { led, avg, count, peak, host, verified }){
    let r = racers.get(name);
    if(!r){
      r = { name, led: 0, avg: 0, count: 0, peak: 0, host, verified: true, history: [], el: null };
      racers.set(name, r);
    }
    r.led = led; r.avg = avg; r.count = count; r.host = host;
    r.peak = Math.max(r.peak || 0, peak || 0);
    if(verified !== undefined) r.verified = verified;
    const t = Math.max(0, Date.now() - startMs);
    r.history.push({ t, led });
    if(r.history.length > 2400) r.history.shift();
  }

  // Sample own wheel value at a fixed cadence, update self + broadcast.
  function sampleAndBroadcast(){
    if(!bleConnected) return;            // viewers don't broadcast
    if(inWindow()){
      mySum += myLed; myCount++;
      myPeak = Math.max(myPeak, myLed);
      mySamples.push(myLed);
      pendingSamples.push({
        session_id: Number(sessionId), racer_id: racerId(myName),
        racer_name: myName, led_value: myLed,
      });
    }
    const avg = myCount ? mySum / myCount : 0;
    const verified = !cheatDetected;
    upsertRacer(myName, { led: myLed, avg, count: myCount, peak: myPeak, host: isHostName(myName), verified });
    if(channel){
      channel.send({ type: 'broadcast', event: 'tick',
        payload: { name: myName, led: myLed, avg, count: myCount, peak: myPeak, verified } });
    }
  }

  // Flush buffered samples to Supabase in one batch.
  async function flushSamples(){
    if(pendingSamples.length === 0) return;
    const batch = pendingSamples;
    pendingSamples = [];
    const { error } = await supabase.from('measurements').insert(batch);
    if(error) console.warn('measurement store error:', error.message);
  }

  // The host's client writes the session's group result once the session ends.
  function maybeSaveGroup(){
    if(groupSaved || Date.now() <= endMs || !isHostName(myName)) return;
    const list = [...racers.values()];
    if(list.length === 0) return;
    groupSaved = true;
    const groupAvg = list.reduce((s, r) => s + (r.avg || 0), 0) / list.length;
    supabase.from('sessions')
      .update({ group_avg: Number(groupAvg.toFixed(2)), racer_count: list.length })
      .eq('id', Number(sessionId))
      .then(({ error }) => { if(error) console.warn('group save error:', error.message); });
  }

  // Each measuring client writes its own summarised result once the session ends.
  function maybeSaveMyResult(){
    if(myResultSaved || Date.now() <= endMs || mySamples.length === 0) return;
    myResultSaved = true;
    const s = computeStats(mySamples);
    supabase.from('results').insert({
      session_id: Number(sessionId), racer_id: racerId(myName), racer_name: myName,
      avg: Number(s.avg.toFixed(2)), peak: s.peak, steadiness: s.steadiness,
      zone_green: Number(s.zone.green.toFixed(1)),
      zone_yellow: Number(s.zone.yellow.toFixed(1)),
      zone_red: Number(s.zone.red.toFixed(1)),
      trend: Number(s.trendTotal.toFixed(2)), green_streak: s.greenStreak,
      samples: s.n, is_host: isHostName(myName), verified: !cheatDetected,
    }).then(({ error }) => { if(error) console.warn('result save error:', error.message); });
  }

  // ---- Rendering ------------------------------------------------------------
  const board = () => $('board');

  function buildCard(r){
    const card = document.createElement('div');
    card.className = 'racer';

    const rank = document.createElement('div');
    rank.className = 'rank';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = r.name.charAt(0).toUpperCase();

    const mid = document.createElement('div');
    mid.className = 'racer-mid';
    const nameRow = document.createElement('div');
    nameRow.className = 'racer-name-row';
    const name = document.createElement('div');
    name.className = 'racer-name';
    name.textContent = r.name;
    nameRow.append(name);
    if(r.host){
      const tag = document.createElement('span');
      tag.className = 'host-tag';
      tag.textContent = 'Host';
      nameRow.append(tag);
    }
    const vbadge = document.createElement('span');
    vbadge.className = 'v-badge';
    nameRow.append(vbadge);
    const spark = document.createElement('canvas');
    spark.className = 'spark';
    mid.append(nameRow, spark);

    const metrics = document.createElement('div');
    metrics.className = 'metrics';
    const live = mkMetric('live', 'Live');
    const peak = mkMetric('peak', 'Peak');
    const avg = mkMetric('avg', 'Avg');
    metrics.append(live.wrap, peak.wrap, avg.wrap);

    card.append(rank, avatar, mid, metrics);
    r.el = { card, rank, liveVal: live.val, peakVal: peak.val, avgVal: avg.val, spark, vbadge };
    return card;
  }

  function mkMetric(cls, label){
    const wrap = document.createElement('div');
    wrap.className = 'metric';
    const val = document.createElement('div');
    val.className = 'metric-val ' + cls;
    const lbl = document.createElement('div');
    lbl.className = 'metric-lbl';
    lbl.textContent = label;
    wrap.append(val, lbl);
    return { wrap, val };
  }

  function drawCurve(canvas, history, color, opts = {}){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if(!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const span = durationMs || 60000;
    const pad = opts.big ? 8 : 2;
    const xOf = t => (t / span) * w;
    const yOf = led => h - (led / 24) * (h - pad * 2) - pad;
    if(opts.grid){
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
      for(let i = 0; i <= 4; i++){ const y = (h / 4) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    }
    if(history.length < 2) return;
    const trace = () => history.forEach((pt, i) => {
      const x = xOf(pt.t), y = yOf(pt.led);
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    if(opts.fill){
      ctx.beginPath(); trace();
      ctx.lineTo(xOf(history[history.length - 1].t), h);
      ctx.lineTo(xOf(history[0].t), h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color + '55'); grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad; ctx.fill();
    }
    ctx.beginPath(); trace();
    ctx.strokeStyle = color; ctx.lineWidth = opts.big ? 2.5 : 2; ctx.lineJoin = 'round'; ctx.stroke();
  }

  function render(){
    const b = board();
    if(!b) return;            // results mode has no live board
    const list = [...racers.values()];

    if(list.length === 0){
      b.innerHTML = '<div class="empty">Waiting for racers to connect…</div>';
    } else {
      if(b.querySelector('.empty')) b.innerHTML = '';
      const sorted = list.sort((a, c) => c.led - a.led);
      sorted.forEach((r, i) => {
        if(!r.el){ b.appendChild(buildCard(r)); }
        b.appendChild(r.el.card); // reorder, preserves canvas
        r.el.rank.textContent = i + 1;
        r.el.liveVal.textContent = r.led;
        r.el.liveVal.style.color = vitalityColor(r.led);
        r.el.peakVal.textContent = r.peak;
        r.el.peakVal.style.color = vitalityColor(r.peak);
        r.el.avgVal.textContent = (r.avg || 0).toFixed(1);
        if(r.verified === false){ r.el.vbadge.className = 'v-badge unverified'; r.el.vbadge.textContent = 'unverified'; }
        else { r.el.vbadge.className = 'v-badge verified'; r.el.vbadge.textContent = '✓'; }
        drawCurve(r.el.spark, r.history, vitalityColor(r.led));
      });
    }
    renderHost();
    renderGroup();
    maybeSaveGroup();
    maybeSaveMyResult();
  }

  function renderHost(){
    const host = [...racers.values()].find(r => r.host);
    if(!host){
      $('lbName').textContent = session ? (session.created_by || '—') : '—';
      $('lbAvatar').textContent = session && session.created_by ? session.created_by.charAt(0).toUpperCase() : '–';
      $('lbLive').textContent = '–';
      $('lbPeak').textContent = '–';
      $('lbAvg').textContent = '–';
      $('lbName').classList.add('waiting');
      return;
    }
    $('lbName').classList.remove('waiting');
    const color = vitalityColor(host.led);
    $('lbAvatar').textContent = host.name.charAt(0).toUpperCase();
    $('lbName').textContent = host.name;
    $('lbLive').textContent = host.led;
    $('lbLive').style.color = color;
    $('lbPeak').textContent = host.peak;
    $('lbPeak').style.color = vitalityColor(host.peak);
    $('lbAvg').textContent = (host.avg || 0).toFixed(1);
    drawCurve($('lbSpark'), host.history, color);
    if(leaderExpanded) drawCurve($('lbChart'), host.history, color, { big: true, fill: true, grid: true });
  }

  function renderGroup(){
    const now = Date.now();
    const livePill = $('livePill');
    let left = 0, label = '--:--';
    if(now < startMs){ left = startMs - now; label = 'in ' + fmt(left); livePill.hidden = true; }
    else if(now <= endMs){ left = endMs - now; label = fmt(left); livePill.hidden = false; }
    else { label = 'Finished'; livePill.hidden = true; }
    $('gTime').textContent = label;

    const list = [...racers.values()];
    if(list.length){
      const gLive = list.reduce((s, r) => s + r.led, 0) / list.length;
      const gAvg = list.reduce((s, r) => s + (r.avg || 0), 0) / list.length;
      $('gLive').textContent = gLive.toFixed(1);
      const gAvgEl = $('gAvg');
      gAvgEl.textContent = gAvg.toFixed(1);
      gAvgEl.style.color = vitalityColor(gAvg);
    } else {
      $('gLive').textContent = '0.0';
      $('gAvg').textContent = '0.0';
    }
  }

  function fmt(ms){
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // ---- Results screen (finished session) ------------------------------------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  function zoneBar(z){
    return `<div class="zonebar">
      <span class="z-red" style="width:${z.red}%"></span>
      <span class="z-yellow" style="width:${z.yellow}%"></span>
      <span class="z-green" style="width:${z.green}%"></span>
    </div>`;
  }

  async function renderResults(){
    $('livePill').hidden = true;
    const body = $('roomBody');
    body.hidden = false;
    body.innerHTML = '<div class="empty">Loading results…</div>';

    const { data, error } = await supabase.from('measurements')
      .select('racer_name, led_value')
      .eq('session_id', Number(sessionId))
      .order('created_at', { ascending: true });
    if(error){ body.innerHTML = `<div class="empty">Could not load results: ${esc(error.message)}</div>`; return; }

    const byRacer = new Map();
    for(const row of (data || [])){
      if(!byRacer.has(row.racer_name)) byRacer.set(row.racer_name, []);
      byRacer.get(row.racer_name).push(row.led_value);
    }
    if(byRacer.size === 0){
      body.innerHTML = '<div class="empty">No measurements were recorded for this session.</div>';
      return;
    }

    const results = [...byRacer.entries()]
      .map(([name, leds]) => ({ name, leds, stats: computeStats(leds), host: isHostName(name) }))
      .filter(r => r.stats);

    // Verified verdicts from the results table; filter when the session is verified-only.
    const { data: vRows } = await supabase.from('results')
      .select('racer_name, verified').eq('session_id', Number(sessionId));
    const vMap = new Map((vRows || []).map(r => [r.racer_name, r.verified]));
    results.forEach(r => { r.verified = vMap.has(r.name) ? vMap.get(r.name) : null; });

    const verifiedOnly = !!session.verified_only;
    const shown = (verifiedOnly ? results.filter(r => r.verified === true) : results)
      .sort((a, b) => b.stats.avg - a.stats.avg);

    if(shown.length === 0){
      body.innerHTML = verifiedOnly
        ? '<div class="empty">No verified measurements in this session.</div>'
        : '<div class="empty">No measurements were recorded for this session.</div>';
      return;
    }

    const groupAvg = shown.reduce((s, r) => s + r.stats.avg, 0) / shown.length;

    const winners = CATEGORIES.map(cat => {
      let best = null;
      for(const r of shown){ const v = cat.value(r.stats); if(best === null || v > best.v) best = { name: r.name, v }; }
      return { cat, best };
    });

    const catCards = winners.map(w => `
      <div class="cat-card">
        <div class="cat-icon">${icon(w.cat.icon)}</div>
        <div class="cat-name">${esc(w.cat.name)}</div>
        <div class="cat-desc">${esc(w.cat.desc)}</div>
        <div class="cat-winner">${w.best ? `${esc(w.best.name)} · ${esc(w.cat.fmt(w.best.v))}` : '—'}</div>
      </div>`).join('');

    const vBadge = r => r.verified === true
      ? '<span class="v-badge verified">✓</span>'
      : r.verified === false ? '<span class="v-badge unverified">unverified</span>' : '';

    const racerCards = shown.map((r, i) => `
      <div class="res-card">
        <div class="res-rank">${i + 1}</div>
        <div class="res-main">
          <div class="racer-name-row"><span class="racer-name">${esc(r.name)}</span>${r.host ? '<span class="host-tag">Host</span>' : ''}${vBadge(r)}</div>
          <canvas class="res-curve" id="rc${i}"></canvas>
          ${zoneBar(r.stats.zone)}
        </div>
        <div class="res-stats">
          <div class="rs"><div class="rs-val">${r.stats.avg.toFixed(1)}</div><div class="rs-lbl">Avg</div></div>
          <div class="rs"><div class="rs-val">${r.stats.peak}</div><div class="rs-lbl">Peak</div></div>
          <div class="rs"><div class="rs-val">${r.stats.steadiness}</div><div class="rs-lbl">Steady</div></div>
          <div class="rs"><div class="rs-val rs-trend">${esc(trendLabel(r.stats.trendTotal))}</div><div class="rs-lbl">Trend</div></div>
        </div>
      </div>`).join('');

    body.innerHTML = `
      <div class="res-group">
        <div class="res-group-val" style="color:${vitalityColor(Math.round(groupAvg))}">${groupAvg.toFixed(1)}</div>
        <div class="res-group-lbl">Group average · ${shown.length} racer${shown.length > 1 ? 's' : ''} · finished${verifiedOnly ? ' · verified only' : ''}</div>
      </div>

      <h2 class="res-h">Category winners</h2>
      <div class="cat-grid">${catCards}</div>

      <h2 class="res-h">All racers <span class="res-h-sub">ranked by average</span></h2>
      <div class="res-list">${racerCards}</div>

      <div class="metric-legend">
        <div><b>Avg</b> — ${esc(METRIC_HELP.avg)}</div>
        <div><b>Peak</b> — ${esc(METRIC_HELP.peak)}</div>
        <div><b>Steady</b> — ${esc(METRIC_HELP.steadiness)}</div>
        <div><b>Zone bar</b> — ${esc(METRIC_HELP.zones)}</div>
        <div><b>Trend</b> — ${esc(METRIC_HELP.trend)}</div>
        <div><b>✓ Verified</b> — Measurement looked genuine (no irregular hand-spinning).</div>
      </div>

      <p class="room-hint"><a href="#/sessions" class="link">← Back to sessions</a></p>
    `;

    shown.forEach((r, i) => {
      const cv = body.querySelector('#rc' + i);
      if(!cv) return;
      const n = r.leds.length;
      const hist = r.leds.map((v, k) => ({ t: n > 1 ? (k / (n - 1)) * durationMs : 0, led: v }));
      drawCurve(cv, hist, vitalityColor(Math.round(r.stats.avg)));
    });
  }

  window.addEventListener('resize', render);

  return () => {
    if(broadcastTimer) clearInterval(broadcastTimer);
    if(renderTimer) clearInterval(renderTimer);
    if(flushTimer) clearInterval(flushTimer);
    flushSamples();
    if(unsubFrames) unsubFrames();
    if(unsubStatus) unsubStatus();
    if(channel) supabase.removeChannel(channel);
    window.removeEventListener('resize', render);
  };
}
