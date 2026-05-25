import { supabase } from './db.js';
import * as ble from './ble.js';
import { computeStats, vitalityLevel } from './analytics.js';

const SAMPLE_MS = 250;        // how often the curve is sampled while measuring
const LIVE_WINDOW_MS = 60000; // idle live-preview window
const CHANGE_WINDOW_MS = 1000, CHANGE_LIMIT = 3; // cheat detection (same as rooms)

function vColor(led){ if(led <= 5) return '#C0143C'; if(led <= 12) return '#E9D24A'; return '#3CC98A'; }
const racerId = name => name.trim().toLowerCase().replace(/\s+/g, '_');

export function mount(el){
  let duration = 60;          // seconds
  let measuring = false, finished = false;
  let startMs = 0, endMs = 0;
  let samples = [];           // led values recorded during the measurement
  let liveHistory = [];       // {t, led} rolling buffer for the idle preview
  let curLed = 0, connected = false;
  let recentFrames = [], cheatDetected = false;
  let sampleTimer = null, uiTimer = null, unsubFrames = null, unsubStatus = null;

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Solo Measurement</h1>
      <p class="page-sub">Measure on your own and track your progress.</p>
    </div>

    <div class="panel">
      <div class="solo-controls">
        <div class="field"><label for="sName">Your name</label><input id="sName" maxlength="60" placeholder="Your name"></div>
        <div class="field"><label for="sDur">Duration (seconds)</label><input id="sDur" type="number" min="5" max="600" value="60"></div>
        <button id="sStart">Start measurement</button>
      </div>
      <div class="solo-msg" id="sMsg"></div>
    </div>

    <div class="panel">
      <div class="solo-nums">
        <div class="solo-num"><div class="solo-num-val" id="sLive">–</div><div class="solo-num-lbl">Live</div></div>
        <div class="solo-num"><div class="solo-num-val" id="sAvg">–</div><div class="solo-num-lbl">Avg</div></div>
        <div class="solo-num"><div class="solo-num-val" id="sTime">–</div><div class="solo-num-lbl">Time left</div></div>
      </div>
      <div class="solo-chart-wrap"><canvas id="sChart"></canvas></div>
      <div class="led-bar" id="sBar"></div>
    </div>

    <div class="panel eval-panel" id="sEval" hidden></div>
  `;

  const $ = id => el.querySelector('#' + id);
  $('sName').value = (localStorage.getItem('ewr_name') || '').trim();

  // Build the 0-24 status bar (always reflects the current value).
  const bar = $('sBar');
  for(let i = 1; i <= 24; i++){
    const cell = document.createElement('div');
    cell.className = 'led-cell';
    cell.dataset.idx = i;
    bar.appendChild(cell);
  }
  function updateBar(led){
    [...bar.children].forEach((cell, i) => {
      const idx = i + 1;
      cell.className = 'led-cell' + (idx <= led ? ' lit ' + (idx <= 5 ? 'red' : idx <= 12 ? 'yellow' : 'green') : '');
    });
  }

  const chart = $('sChart');
  function drawChart(){
    const w = chart.clientWidth, h = chart.clientHeight;
    if(!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    if(chart.width !== Math.round(w * dpr)){ chart.width = Math.round(w * dpr); chart.height = Math.round(h * dpr); }
    const ctx = chart.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for(let i = 0; i <= 4; i++){ const y = h / 4 * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    let pts;
    if(measuring || finished){
      const total = duration * 1000;
      pts = samples.map((v, i) => ({ x: Math.min(1, (i * SAMPLE_MS) / total), led: v }));
    } else {
      const now = Date.now();
      pts = liveHistory.map(p => ({ x: (p.t - (now - LIVE_WINDOW_MS)) / LIVE_WINDOW_MS, led: p.led })).filter(p => p.x >= 0);
    }
    if(pts.length < 2) return;
    const xOf = x => x * w, yOf = led => h - (led / 24) * (h - 6) - 3;
    ctx.beginPath();
    pts.forEach((p, i) => { const x = xOf(p.x), y = yOf(p.led); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = vColor(curLed); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  }

  function tick(){
    $('sLive').textContent = curLed;
    $('sLive').style.color = vColor(curLed);
    updateBar(curLed);
    if(measuring){
      const left = Math.max(0, endMs - Date.now());
      $('sTime').textContent = Math.ceil(left / 1000) + 's';
      if(samples.length){
        const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
        $('sAvg').textContent = avg.toFixed(1);
        $('sAvg').style.color = vColor(avg);
      }
      if(Date.now() >= endMs) stopMeasurement();
    }
    drawChart();
  }

  function startMeasurement(){
    const name = $('sName').value.trim();
    duration = Math.max(5, Math.min(600, parseInt($('sDur').value, 10) || 60));
    if(!connected){ setMsg('Connect your Egely Wheel (top right) first.', 'err'); return; }
    if(!name){ setMsg('Please enter your name.', 'err'); $('sName').focus(); return; }
    localStorage.setItem('ewr_name', name);
    samples = []; recentFrames = []; cheatDetected = false; finished = false;
    measuring = true; startMs = Date.now(); endMs = startMs + duration * 1000;
    $('sEval').hidden = true;
    $('sStart').textContent = 'Stop';
    $('sDur').disabled = true;
    setMsg('Measuring…', '');
    sampleTimer = setInterval(() => samples.push(curLed), SAMPLE_MS);
  }

  async function stopMeasurement(){
    if(!measuring) return;
    measuring = false; finished = true;
    if(sampleTimer){ clearInterval(sampleTimer); sampleTimer = null; }
    $('sStart').textContent = 'Start measurement';
    $('sDur').disabled = false;
    $('sTime').textContent = '–';
    setMsg('', '');

    const stats = computeStats(samples);
    if(!stats){ return; }
    showEval(stats);

    const name = $('sName').value.trim();
    if(name){
      const { error } = await supabase.from('results').insert({
        session_id: null, racer_id: racerId(name), racer_name: name,
        avg: Number(stats.avg.toFixed(2)), peak: stats.peak, steadiness: stats.steadiness,
        zone_green: Number(stats.zone.green.toFixed(1)), zone_yellow: Number(stats.zone.yellow.toFixed(1)),
        zone_red: Number(stats.zone.red.toFixed(1)), trend: Number(stats.trendTotal.toFixed(2)),
        green_streak: stats.greenStreak, samples: stats.n, is_host: false, verified: !cheatDetected,
      });
      if(error) console.warn('solo save error:', error.message);
    }
  }

  function showEval(stats){
    const lvl = vitalityLevel(stats.avg);
    $('sEval').hidden = false;
    $('sEval').innerHTML = `
      <h2>Result</h2>
      <div class="eval-level" style="color:${lvl.color}">${lvl.name}</div>
      <div class="eval-meaning">${lvl.meaning}</div>
      <div class="eval-stats">
        <span><b style="color:${vColor(stats.avg)}">${stats.avg.toFixed(1)}</b> Avg</span>
        <span><b style="color:${vColor(stats.peak)}">${stats.peak}</b> Peak</span>
        <span><b>${stats.steadiness}</b> Steady</span>
        ${cheatDetected ? '<span class="warn">Not verified (irregular spinning)</span>' : '<span class="v-badge verified">✓ Verified</span>'}
      </div>
      <p class="solo-saved">Saved to your measurements.</p>`;
  }

  function setMsg(text, state){ const m = $('sMsg'); m.className = 'solo-msg ' + (state || ''); m.textContent = text; }

  $('sStart').addEventListener('click', () => { measuring ? stopMeasurement() : startMeasurement(); });

  unsubStatus = ble.subscribeStatus(s => {
    connected = s.connected;
    if(!connected && !measuring) setMsg('', '');
  });
  unsubFrames = ble.subscribeFrames(frame => {
    curLed = frame.led;
    const now = Date.now();
    liveHistory.push({ t: now, led: frame.led });
    liveHistory = liveHistory.filter(p => now - p.t <= LIVE_WINDOW_MS);
    if(measuring){
      recentFrames.push({ t: now, led: frame.led });
      recentFrames = recentFrames.filter(f => now - f.t <= CHANGE_WINDOW_MS);
      const vals = recentFrames.map(f => f.led);
      if(Math.max(...vals) - Math.min(...vals) >= CHANGE_LIMIT) cheatDetected = true;
    }
  });

  uiTimer = setInterval(tick, 250);
  tick();
  window.addEventListener('resize', drawChart);

  return () => {
    if(sampleTimer) clearInterval(sampleTimer);
    if(uiTimer) clearInterval(uiTimer);
    if(unsubFrames) unsubFrames();
    if(unsubStatus) unsubStatus();
    window.removeEventListener('resize', drawChart);
  };
}
