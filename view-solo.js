import { supabase } from './db.js';
import * as ble from './ble.js';
import { computeStats, vitalityLevel, vitalityColor as vColor } from './analytics.js';

const SAMPLE_MS = 250;        // how often the curve is sampled while measuring
const LIVE_WINDOW_MS = 60000; // idle live-preview window
const CHANGE_WINDOW_MS = 1000, CHANGE_LIMIT = 4; // cheat detection (same as rooms)

const racerId = name => name.trim().toLowerCase().replace(/\s+/g, '_');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

export function mount(el){
  let duration = 60;          // seconds
  let measuring = false, finished = false;
  let startMs = 0, endMs = 0;
  let samples = [];           // led values recorded during the measurement
  let liveHistory = [];       // {t, led} rolling buffer for the idle preview
  let curLed = 0, connected = false;
  let recentFrames = [], cheatDetected = false;
  let lastStats = null, saved = false;   // held until the user clicks Save
  let sampleTimer = null, uiTimer = null, unsubFrames = null, unsubStatus = null;

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Solo Measurement</h1>
      <p class="page-sub">Measure on your own and track your progress.</p>
    </div>

    <div class="panel">
      <div class="solo-controls">
        <div class="field"><label for="sLabel">Measurement name</label><input id="sLabel" maxlength="60" placeholder="e.g. Morning practice"></div>
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
      <div class="solo-verify" id="sVerify" hidden></div>
      <div class="solo-chart-wrap"><canvas id="sChart"></canvas></div>
      <div class="led-bar" id="sBar"></div>
    </div>

    <div class="panel eval-panel" id="sEval" hidden></div>
  `;

  const $ = id => el.querySelector('#' + id);
  // Identity comes from the (future) account; for now it's remembered locally.
  const identity = (localStorage.getItem('ewr_name') || '').trim() || 'Me';

  // 0-24 status bar (always reflects the current value).
  const bar = $('sBar');
  for(let i = 1; i <= 24; i++){ const c = document.createElement('div'); c.className = 'led-cell'; bar.appendChild(c); }
  function updateBar(led){
    [...bar.children].forEach((cell, i) => {
      const idx = i + 1;
      cell.className = 'led-cell' + (idx <= led ? ' lit ' + (idx < 6 ? 'red' : idx < 13 ? 'yellow' : 'green') : '');
    });
  }

  // ---- Chart with numbered axes and red/yellow/green Y zones ----------------
  const chart = $('sChart');
  function drawChart(){
    const w = chart.clientWidth, h = chart.clientHeight;
    if(!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    if(chart.width !== Math.round(w * dpr)){ chart.width = Math.round(w * dpr); chart.height = Math.round(h * dpr); }
    const ctx = chart.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padL = 30, padR = 8, padT = 8, padB = 20;
    const x0 = padL, y0 = padT, plotW = w - padL - padR, plotH = h - padT - padB;
    const ledToY = led => y0 + plotH - (led / 24) * plotH;

    // Vitality zone bands
    const band = (lo, hi, color) => { const yt = ledToY(hi); ctx.fillStyle = color; ctx.fillRect(x0, yt, plotW, ledToY(lo) - yt); };
    band(0, 6, 'rgba(192,20,60,0.12)');
    band(6, 13, 'rgba(233,210,74,0.12)');
    band(13, 24, 'rgba(60,201,138,0.12)');

    // Y gridlines + labels at the zone boundaries
    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [0, 6, 13, 24].forEach(v => {
      const y = ledToY(v);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + plotW, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(String(v), x0 - 6, y);
    });

    // X labels (time)
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
    const live = !(measuring || finished);
    for(let i = 0; i <= 4; i++){
      const frac = i / 4, x = x0 + frac * plotW;
      const txt = live ? (i === 4 ? 'now' : '-' + Math.round((1 - frac) * 60) + 's') : Math.round(frac * duration) + 's';
      ctx.fillText(txt, x, y0 + plotH + 5);
    }

    // Running-average reference line (moves as the average changes)
    if((measuring || finished) && samples.length){
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const y = ledToY(avg);
      ctx.strokeStyle = vColor(avg); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + plotW, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = vColor(avg); ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('avg ' + avg.toFixed(1), x0 + 4, y - 2);
    }

    // Curve
    let pts;
    if(measuring || finished){
      const total = duration * 1000;
      pts = samples.map((v, i) => ({ x: Math.min(1, (i * SAMPLE_MS) / total), led: v }));
    } else {
      const now = Date.now();
      pts = liveHistory.map(p => ({ x: (p.t - (now - LIVE_WINDOW_MS)) / LIVE_WINDOW_MS, led: p.led })).filter(p => p.x >= 0);
    }
    if(pts.length < 2) return;
    ctx.beginPath();
    pts.forEach((p, i) => { const x = x0 + p.x * plotW, y = ledToY(p.led); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = '#e8e6ff'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
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
      updateVerify();
      if(Date.now() >= endMs) stopMeasurement();
    }
    drawChart();
  }

  function updateVerify(){
    const v = $('sVerify');
    v.hidden = false;
    if(cheatDetected){ v.className = 'solo-verify bad'; v.textContent = 'Unverified — irregular spinning detected'; }
    else { v.className = 'solo-verify good'; v.textContent = '✓ Looks genuine'; }
  }

  function startMeasurement(){
    duration = Math.max(5, Math.min(600, parseInt($('sDur').value, 10) || 60));
    if(!connected){ setMsg('Connect your Egely Wheel (top right) first.', 'err'); return; }
    samples = []; recentFrames = []; cheatDetected = false; finished = false; lastStats = null; saved = false;
    measuring = true; startMs = Date.now(); endMs = startMs + duration * 1000;
    $('sEval').hidden = true;
    $('sStart').textContent = 'Stop';
    $('sDur').disabled = true;
    setMsg('Measuring…', '');
    updateVerify();
    sampleTimer = setInterval(() => samples.push(curLed), SAMPLE_MS);
  }

  function stopMeasurement(){
    if(!measuring) return;
    measuring = false; finished = true;
    if(sampleTimer){ clearInterval(sampleTimer); sampleTimer = null; }
    $('sStart').textContent = 'Start measurement';
    $('sDur').disabled = false;
    $('sTime').textContent = '–';
    $('sVerify').hidden = true;
    setMsg('', '');
    lastStats = computeStats(samples);
    if(lastStats) showEval(lastStats);
  }

  function showEval(stats){
    const lvl = vitalityLevel(stats.avg);
    const eval_ = $('sEval');
    eval_.hidden = false;
    eval_.innerHTML = `
      <h2>Result</h2>
      <div class="eval-level" style="color:${lvl.color}">${esc(lvl.name)}</div>
      <div class="eval-meaning">${esc(lvl.meaning)}</div>
      <div class="eval-stats">
        <span><b style="color:${vColor(stats.avg)}">${stats.avg.toFixed(1)}</b> Avg</span>
        <span><b style="color:${vColor(stats.peak)}">${stats.peak}</b> Peak</span>
        <span><b>${stats.steadiness}</b> Steady</span>
        ${cheatDetected ? '<span class="warn">Not verified</span>' : '<span class="v-badge verified">✓ Verified</span>'}
      </div>
      <div class="field full" style="margin-top:16px">
        <label for="sComment">Comment (optional)</label>
        <textarea id="sComment" maxlength="500" rows="2" placeholder="Add a note about this measurement…"></textarea>
      </div>
      <div class="form-actions">
        <button id="sSave">Save to my measurements</button>
        <span class="form-msg" id="sSaveMsg"></span>
      </div>`;
    eval_.querySelector('#sSave').addEventListener('click', saveMeasurement);
  }

  async function saveMeasurement(){
    if(saved || !lastStats) return;
    const btn = $('sSave'); btn.disabled = true;
    const comment = ($('sComment').value || '').trim();
    const label = ($('sLabel').value || '').trim();
    const s = lastStats;
    const { error } = await supabase.from('results').insert({
      session_id: null, racer_id: racerId(identity), racer_name: identity,
      label: label || null, duration_seconds: duration,
      avg: Number(s.avg.toFixed(2)), peak: s.peak, steadiness: s.steadiness,
      zone_green: Number(s.zone.green.toFixed(1)), zone_yellow: Number(s.zone.yellow.toFixed(1)),
      zone_red: Number(s.zone.red.toFixed(1)), trend: Number(s.trendTotal.toFixed(2)),
      green_streak: s.greenStreak, samples: s.n, is_host: false, verified: !cheatDetected,
      comment: comment || null,
    });
    if(error){ btn.disabled = false; $('sSaveMsg').className = 'form-msg err'; $('sSaveMsg').textContent = 'Error: ' + error.message; return; }
    saved = true;
    $('sSaveMsg').className = 'form-msg ok';
    $('sSaveMsg').textContent = 'Saved to your measurements.';
  }

  function setMsg(text, state){ const m = $('sMsg'); m.className = 'solo-msg ' + (state || ''); m.textContent = text; }

  $('sStart').addEventListener('click', () => { measuring ? stopMeasurement() : startMeasurement(); });

  unsubStatus = ble.subscribeStatus(s => { connected = s.connected; if(!connected && !measuring) setMsg('', ''); });
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
