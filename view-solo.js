import { supabase } from './db.js';
import * as ble from './ble.js';
import * as auth from './auth.js';
import * as wakeLock from './wake-lock.js';
import * as presence from './presence.js';
import { computeStats, vitalityLevel, downsample } from './analytics.js';
import { drawVitalitySeries } from './chart.js';
import { durationPicker, fmtSeconds, MAX_SOLO_SECONDS } from './time-controls.js';

const SAMPLE_MS = 250;        // how often the curve is sampled while measuring
const LIVE_WINDOW_MS = 60000; // idle live-preview window
// The wheel reports ~every 700ms, and its report about the FINAL stretch of a
// measurement arrives after the countdown hits zero. Without a drain, that last
// real signal is lost. After endMs we wait (at most) this long for one more
// frame with a NEW device counter and use it to fill the held tail samples.
const FINALIZE_GRACE_MS = 1500;
// Verified rule: a real reading is steady (any level); hand-waving/blowing makes
// the value SWING. We look at the range (max−min) inside a short window — this
// catches a spike however it ramps — and count distinct swings (rising edges), so
// one swing = one count. Two swings → "unverified". A single blip stays verified.
// The de-spiked signal (ble.js) already removes the 24-rail glitches first.
const CHEAT_WINDOW_MS = 2000, SWING_LIMIT = 7, MAX_SWINGS = 2; // cheat detection (same as rooms)
const SIGNAL_GAP_MS = 10000;  // a continuous BLE loss this long during a measurement → unverified
// 10s (not 6s) so a normal auto-reconnect — whose backoff can keep `connected` false
// for ~6-8s even on a short outage — never falsely flags; a real sustained loss / a
// "spin high then switch off" still crosses it.

const racerId = name => name.trim().toLowerCase().replace(/\s+/g, '_');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

export function mount(el){
  let duration = 60;          // seconds
  let measuring = false, finished = false;
  let finalizing = false;     // countdown done, draining the last delayed frame
  let startMs = 0, endMs = 0;
  let samples = [];           // led values recorded during the measurement
  let liveHistory = [];       // {t, led} rolling buffer for the idle preview
  let curLed = 0, connected = false;
  let swingWin = [], swings = 0, wasSwing = false, cheatDetected = false;
  let signalLost = false, gapStartMs = null;   // continuous-disconnect (signal-loss) latch
  let lastStats = null, saved = false;   // held until the user clicks Save
  let sampleTimer = null, uiTimer = null, unsubFrames = null, unsubStatus = null;
  let finalizeTimer = null;
  // Tail-drain bookkeeping: holdRun = how many trailing samples were pushed
  // WITHOUT a fresh frame (pure hold of the previous report); the late frame's
  // value belongs exactly to those slots. Counter change = genuinely new report.
  let holdRun = 0, frameFresh = false, lastCounter = null, counterAtEnd = null, lateHandled = false;
  let liveChannels = [];   // realtime channels to my linked practitioners (live broadcast)

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Solo Measurement</h1>
      <p class="page-sub">Measure on your own and track your progress.</p>
    </div>

    <div class="panel solo-setup">
      <div class="solo-top">
        <span class="solo-state off" id="sState">Wheel not connected</span>
      </div>
      <div class="solo-controls">
        <div class="field"><label for="sLabel">Measurement name</label><input id="sLabel" maxlength="60" placeholder="e.g. Morning practice"></div>
        <button id="sStart">Start measurement</button>
      </div>
      <div class="field solo-durfield">
        <label>Duration</label>
        <div id="sDurPick"></div>
        <input id="sDur" type="hidden" value="60">
      </div>
      <div class="solo-msg" id="sMsg"></div>
    </div>

    <div class="panel solo-cockpit">
      <div class="solo-hero">
        <div class="solo-current">
          <div class="solo-current-val" id="sLive">–</div>
          <div class="solo-current-lbl">Current vitality</div>
        </div>
        <div class="solo-side">
          <div class="solo-stat"><div class="solo-stat-val" id="sAvg">–</div><div class="solo-stat-lbl">Avg</div></div>
          <div class="solo-stat"><div class="solo-stat-val" id="sPeak">–</div><div class="solo-stat-lbl">Peak</div></div>
          <div class="solo-stat"><div class="solo-stat-val" id="sTime">–</div><div class="solo-stat-lbl">Time left</div></div>
        </div>
      </div>
      <div class="tele-head">
        <span class="tele-title">Live vitality</span>
        <span class="tele-meta" id="sTeleMeta">Last 60s</span>
        <span class="solo-verify" id="sVerify" hidden></span>
      </div>
      <div class="solo-chart-wrap"><canvas id="sChart"></canvas></div>
      <div class="led-bar" id="sBar"></div>
    </div>

    <div class="panel eval-panel" id="sEval" hidden></div>
  `;

  const $ = id => el.querySelector('#' + id);

  // Duration presets (pill control) — writes into the hidden #sDur input so the
  // measurement engine below stays untouched. Capped at 10 minutes (600s).
  const soloDur = durationPicker($('sDurPick'), {
    options: [
      { label: '30 sec', value: 30 }, { label: '1 min', value: 60 },
      { label: '2 min', value: 120 }, { label: '5 min', value: 300 },
      { label: '10 min', value: 600 },
    ],
    value: 60,
    custom: { min: 10, max: MAX_SOLO_SECONDS, step: 10, format: fmtSeconds },
    onChange: v => { $('sDur').value = String(v); },
  });

  // 0-24 status bar (always reflects the current value).
  const bar = $('sBar');
  for(let i = 1; i <= 24; i++){ const c = document.createElement('div'); c.className = 'led-cell'; bar.appendChild(c); }
  function updateBar(led){
    [...bar.children].forEach((cell, i) => {
      const idx = i + 1;
      cell.className = 'led-cell' + (idx <= led ? ' lit ' + (idx < 6 ? 'red' : idx < 13 ? 'yellow' : 'green') : '');
    });
  }

  // ---- Chart: shared light telemetry engine (chart.js drawVitalitySeries) ---
  // Solo keeps its own TIME logic (time-true sample x positions + rolling live
  // window) and hands the points to the shared renderer, so Live/Solo/detail
  // all speak one visual language (zone bands, faint grid, violet line, marker).
  const chart = $('sChart');
  function drawChart(){
    const live = !(measuring || finalizing || finished);
    let pts, xLabels;
    if(live){
      const now = Date.now();
      pts = liveHistory.map(p => ({ x: (p.t - (now - LIVE_WINDOW_MS)) / LIVE_WINDOW_MS, led: p.led })).filter(p => p.x >= 0);
      xLabels = [0, 1, 2, 3, 4].map(i => ({ frac: i / 4, text: i === 4 ? 'now' : '-' + Math.round((1 - i / 4) * 60) + 's' }));
    } else {
      const total = duration * 1000;
      pts = samples.map((v, i) => ({ x: Math.min(1, (i * SAMPLE_MS) / total), led: v }));
      xLabels = [0, 1, 2, 3, 4].map(i => ({ frac: i / 4, text: Math.round((i / 4) * duration) + 's' }));
    }
    const avg = (!live && samples.length) ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
    drawVitalitySeries(chart, pts, { xLabels, avg });
  }

  // Zone colours tuned for the light theme: muted set for big numbers (no alarm
  // red / unreadable yellow on white); the chart keeps its own vivid markers.
  const zText = led => led < 6 ? '#c2415b' : led < 13 ? '#b8860b' : '#0f8a52';

  // "What can I do now?" chip — one glance, one state.
  function updateState(){
    const chip = $('sState');
    let cls, txt;
    if(measuring){ cls = 'measuring'; txt = 'Measuring'; }
    else if(finalizing){ cls = 'finalizing'; txt = 'Finalizing'; }
    else if(finished){ cls = 'done'; txt = 'Finished'; }
    else if(connected){ cls = 'ready'; txt = 'Wheel connected · Ready'; }
    else { cls = 'off'; txt = 'Wheel not connected'; }
    chip.className = 'solo-state ' + cls;
    chip.textContent = txt;
  }

  function tick(){
    $('sLive').textContent = curLed;
    $('sLive').style.color = zText(curLed);
    updateBar(curLed);
    if(samples.length){
      const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
      $('sAvg').textContent = avg.toFixed(1);
      $('sAvg').style.color = zText(avg);
      const pk = Math.max(...samples);
      $('sPeak').textContent = pk;
      $('sPeak').style.color = zText(pk);
    }
    if(measuring){
      const left = Math.max(0, endMs - Date.now());
      $('sTime').textContent = Math.ceil(left / 1000) + 's';
      updateVerify();
      publishLiveTick();
      if(Date.now() >= endMs) beginFinalize();
    }
    $('sTeleMeta').textContent = measuring ? duration + 's measurement · running'
      : finalizing ? duration + 's measurement · finalizing'
      : finished ? duration + 's measurement · finished'
      : 'Last 60s · idle preview';
    updateState();
    drawChart();
  }

  // ---- Live broadcast to linked practitioners ------------------------------
  // While measuring, presence on `practitioner-<id>` signals "measuring",
  // and broadcast `tick` events stream the live LED to each practitioner.
  async function openLive(){
    if(liveChannels.length) return;
    const me = auth.getState();
    if(!me.user) return;
    const prs = await auth.getMyPractitioners();
    for(const p of prs){
      const ch = supabase.channel('practitioner-' + p.id, { config: { presence: { key: me.user.id } } });
      // A practitioner opening the live view asks for whatever we've already
      // measured so they don't start watching mid-curve.
      ch.on('broadcast', { event: 'request-history' }, ({ payload }) => {
        if(!measuring) return;
        if(payload && payload.clientId && payload.clientId !== me.user.id) return;
        ch.send({ type: 'broadcast', event: 'history', payload: {
          clientId: me.user.id, sampleMs: SAMPLE_MS, samples: samples.slice(-400),
          verified: !cheatDetected && !signalLost, t: Math.max(0, Date.now() - startMs),
        }});
      });
      await new Promise(resolve => ch.subscribe(async (status) => {
        if(status === 'SUBSCRIBED'){
          try { await ch.track({ measuring: true, name: me.displayName, avatar: me.avatarUrl, ts: Date.now() }); } catch {}
          resolve();
        }
      }));
      liveChannels.push(ch);
    }
  }

  function publishLiveTick(){
    if(!liveChannels.length) return;
    const me = auth.getState();
    if(!me.user) return;
    const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
    const peak = samples.length ? Math.max(...samples) : 0;
    const payload = {
      clientId: me.user.id, led: curLed, avg, peak,
      verified: !cheatDetected && !signalLost, t: Math.max(0, Date.now() - startMs),
    };
    for(const ch of liveChannels){
      ch.send({ type: 'broadcast', event: 'tick', payload });
    }
  }

  async function closeLive(){
    const channels = liveChannels;
    liveChannels = [];
    for(const ch of channels){
      try { await ch.untrack(); } catch {}
      try { supabase.removeChannel(ch); } catch {}
    }
  }

  function updateVerify(){
    const v = $('sVerify');
    v.hidden = false;
    // Signal loss is surfaced here — the one place that already explains WHY a
    // reading is unverified (the irregular-spinning note). Everywhere else it just
    // joins the normal "unverified" group.
    if(signalLost){ v.className = 'solo-verify bad'; v.textContent = 'Unverified — signal lost'; }
    else if(!connected){ v.className = 'solo-verify bad'; v.textContent = 'Signal lost — reconnecting…'; }
    else if(cheatDetected){ v.className = 'solo-verify bad'; v.textContent = 'Unverified — irregular spinning detected'; }
    else { v.className = 'solo-verify good'; v.textContent = '✓ Looks genuine'; }
  }

  function startMeasurement(){
    duration = Math.max(5, Math.min(600, parseInt($('sDur').value, 10) || 60));
    if(!connected){ setMsg('Connect your Egely Wheel (top right) first.', 'err'); return; }
    samples = []; swingWin = []; swings = 0; wasSwing = false; cheatDetected = false; finished = false; lastStats = null; saved = false;
    finalizing = false; lateHandled = false; holdRun = 0; frameFresh = false;
    signalLost = false; gapStartMs = null;
    measuring = true; startMs = Date.now(); endMs = startMs + duration * 1000;
    $('sEval').hidden = true;
    $('sStart').textContent = 'Stop';
    $('sDur').disabled = true;
    soloDur.setDisabled(true);
    setMsg('Measuring…', '');
    updateVerify();
    sampleTimer = setInterval(() => {
      samples.push(curLed);
      // Track the trailing "hold" run: pushes with no fresh frame in between
      // just repeat the previous report — the finalize drain may overwrite them.
      if(frameFresh){ frameFresh = false; holdRun = 0; } else holdRun++;
      // Signal-loss fairness: a CONTINUOUS BLE gap ≥ SIGNAL_GAP_MS during the
      // measurement latches it unverified (you can't spin high, pull the dongle,
      // and keep a "verified" inflated reading). Any reconnect resets the counter,
      // so a normal sub-6s reconnect never penalises. The held samples are left
      // untouched (data path unchanged) — only the verified flag flips.
      if(!connected){
        if(gapStartMs === null) gapStartMs = Date.now();
        else if(Date.now() - gapStartMs >= SIGNAL_GAP_MS) signalLost = true;
      } else gapStartMs = null;
    }, SAMPLE_MS);
    openLive();   // fire and forget; channels become ready within ~1s
    presence.setMeasuring(true);   // show me as "measuring" on the Live wall
    wakeLock.acquire();
  }

  // Countdown hit zero (or the user pressed Stop): stop SAMPLING immediately —
  // the chosen window is over — but wait briefly for the wheel's last report
  // (it covers the final stretch and arrives ~700ms late). NOT extra measuring
  // time: the late value only fills the already-recorded held tail slots.
  function beginFinalize(){
    if(!measuring || finalizing) return;
    measuring = false; finalizing = true;
    if(sampleTimer){ clearInterval(sampleTimer); sampleTimer = null; }
    counterAtEnd = lastCounter; lateHandled = false;
    $('sStart').disabled = true;
    $('sStart').textContent = 'Finalizing…';
    $('sTime').textContent = '0s';
    setMsg('Processing the last signal…', '');
    presence.setMeasuring(false);   // never leave a stuck "measuring" presence
    finalizeTimer = setTimeout(completeMeasurement, FINALIZE_GRACE_MS);
  }

  function completeMeasurement(){
    if(!finalizing) return;
    finalizing = false; finished = true;
    if(finalizeTimer){ clearTimeout(finalizeTimer); finalizeTimer = null; }
    $('sStart').disabled = false;
    $('sStart').textContent = 'Start measurement';
    $('sDur').disabled = false;
    soloDur.setDisabled(false);
    $('sTime').textContent = '–';
    $('sVerify').hidden = true;
    setMsg('', '');
    lastStats = computeStats(samples);
    if(lastStats) showEval(lastStats);
    closeLive();
    wakeLock.release();
  }

  function showEval(stats){
    const lvl = vitalityLevel(stats.avg);
    const eval_ = $('sEval');
    eval_.hidden = false;
    eval_.innerHTML = `
      <h2>Result</h2>
      <div class="eval-level" style="color:${zText(stats.avg)}">${esc(lvl.name)}</div>
      <div class="eval-meaning">${esc(lvl.meaning)}</div>
      <div class="eval-stats">
        <span><b style="color:${zText(stats.avg)}">${stats.avg.toFixed(1)}</b> Avg</span>
        <span><b style="color:${zText(stats.peak)}">${stats.peak}</b> Peak</span>
        <span><b>${stats.steadiness}</b> Steady</span>
        ${(cheatDetected || signalLost) ? '<span class="warn">Not verified</span>' : '<span class="v-badge verified">✓ Verified</span>'}
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
    const a = auth.getState();
    const identity = (a.displayName || '').trim() || 'Me';
    const btn = $('sSave'); btn.disabled = true;
    const comment = ($('sComment').value || '').trim();
    const label = ($('sLabel').value || '').trim();
    const s = lastStats;
    const { error } = await supabase.from('results').insert({
      session_id: null, user_id: a.user?.id || null,
      racer_id: racerId(identity), racer_name: identity,
      label: label || null, duration_seconds: duration,
      avg: Number(s.avg.toFixed(2)), peak: s.peak, steadiness: s.steadiness,
      zone_green: Number(s.zone.green.toFixed(1)), zone_yellow: Number(s.zone.yellow.toFixed(1)),
      zone_red: Number(s.zone.red.toFixed(1)), trend: Number(s.trendTotal.toFixed(2)),
      green_streak: s.greenStreak, samples: s.n, is_host: false, verified: !cheatDetected && !signalLost,
      comment: comment || null, curve: samples.slice(),   // FULL measured series (250ms samples) — no 80-point downsample
    });
    if(error){ btn.disabled = false; $('sSaveMsg').className = 'form-msg err'; $('sSaveMsg').textContent = 'Error: ' + error.message; return; }
    saved = true;
    $('sSaveMsg').className = 'form-msg ok';
    $('sSaveMsg').textContent = 'Saved to your measurements.';
  }

  function setMsg(text, state){ const m = $('sMsg'); m.className = 'solo-msg ' + (state || ''); m.textContent = text; }

  $('sStart').addEventListener('click', () => {
    if(finalizing) return;                       // drain in progress — ignore clicks
    measuring ? beginFinalize() : startMeasurement();
  });

  unsubStatus = ble.subscribeStatus(s => { connected = s.connected; if(!connected && !measuring) setMsg('', ''); });
  unsubFrames = ble.subscribeFrames(frame => {
    curLed = frame.led;
    lastCounter = frame.counter;
    const now = Date.now();
    liveHistory.push({ t: now, led: frame.led });
    liveHistory = liveHistory.filter(p => now - p.t <= LIVE_WINDOW_MS);
    if(measuring){
      frameFresh = true;
      swingWin.push({ t: now, led: frame.led });
      swingWin = swingWin.filter(f => now - f.t <= CHEAT_WINDOW_MS);
      const leds = swingWin.map(f => f.led);
      const swingNow = (Math.max(...leds) - Math.min(...leds)) >= SWING_LIMIT;
      if(swingNow && !wasSwing && ++swings >= MAX_SWINGS) cheatDetected = true;
      wasSwing = swingNow;
    } else if(finalizing && !lateHandled && frame.counter !== counterAtEnd){
      // The wheel's delayed report on the FINAL stretch of the window: write it
      // into the held tail slots (no length change → no extra measuring time),
      // then finish right away — no need to sit out the full grace.
      lateHandled = true;
      const n = Math.min(holdRun, samples.length, 4);
      for(let i = samples.length - n; i < samples.length; i++) samples[i] = frame.led;
      completeMeasurement();
    }
  });

  uiTimer = setInterval(tick, 250);
  tick();
  window.addEventListener('resize', drawChart);

  return () => {
    if(sampleTimer) clearInterval(sampleTimer);
    if(uiTimer) clearInterval(uiTimer);
    if(finalizeTimer) clearTimeout(finalizeTimer);
    if(unsubFrames) unsubFrames();
    if(unsubStatus) unsubStatus();
    closeLive();
    presence.setMeasuring(false);
    wakeLock.release();
    window.removeEventListener('resize', drawChart);
  };
}
