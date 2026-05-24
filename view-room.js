import { supabase } from './db.js';
import * as ble from './ble.js';

const BROADCAST_MS = 500;   // how often each client samples + broadcasts its LED
const RENDER_MS = 250;      // how often the board repaints

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
  let groupSaved = false;    // host writes session group_avg once, at the end

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
    $('roomSub').textContent = `Hosted by ${session.created_by || 'unknown'} · ${session.duration_minutes} min`;
    start();
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
    unsubFrames = ble.subscribeFrames(frame => { myLed = frame.led; });

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
    if(bleConnected) $('roomHint').textContent = `You are measuring as "${myName}".`;
    else $('roomHint').textContent = `Connect your Egely Wheel (top right) to join the measurement — or just watch the leaderboard.`;
  }

  // ---- Realtime channel -----------------------------------------------------
  function joinChannel(){
    channel = supabase.channel('room-' + sessionId, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'tick' }, ({ payload }) => applyTick(payload));
    channel.subscribe();
  }

  function applyTick(p){
    if(!p || !p.name) return;
    upsertRacer(p.name, { led: p.led, avg: p.avg, count: p.count, peak: p.peak, host: isHostName(p.name) });
  }

  function upsertRacer(name, { led, avg, count, peak, host }){
    let r = racers.get(name);
    if(!r){
      r = { name, led: 0, avg: 0, count: 0, peak: 0, host, history: [], el: null };
      racers.set(name, r);
    }
    r.led = led; r.avg = avg; r.count = count; r.host = host;
    r.peak = Math.max(r.peak || 0, peak || led || 0);
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
      pendingSamples.push({
        session_id: Number(sessionId), racer_id: racerId(myName),
        racer_name: myName, led_value: myLed,
      });
    }
    const avg = myCount ? mySum / myCount : 0;
    upsertRacer(myName, { led: myLed, avg, count: myCount, peak: myPeak, host: isHostName(myName) });
    if(channel){
      channel.send({ type: 'broadcast', event: 'tick',
        payload: { name: myName, led: myLed, avg, count: myCount, peak: myPeak } });
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
    r.el = { card, rank, liveVal: live.val, peakVal: peak.val, avgVal: avg.val, spark };
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
    const list = [...racers.values()];
    const b = board();

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
        drawCurve(r.el.spark, r.history, vitalityColor(r.led));
      });
    }
    renderHost();
    renderGroup();
    maybeSaveGroup();
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
