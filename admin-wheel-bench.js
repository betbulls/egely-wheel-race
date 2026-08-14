// admin-wheel-bench.js — "Wheel bench": factory spin-down recorder, mounted as a
// tab inside the admin console (admin-only by inheritance from view-admin).
//
// Purpose: build the wheel-quality reference batch. Per wheel (identified by its
// factory serial number) the admin hand-spins the wheel 3-5 times; the tool
// records EVERY parsed BLE line (including repeated counters — the repetition
// pattern itself is data we still need to decode) with monotonic arrival
// timestamps, auto-segments the spins for bookkeeping, then saves one row into
// public.wheel_bench AND always downloads a local JSON backup — a missing table
// or a dead office connection never loses a bench session.
//
// The spike filter in ble.js holds the de-spiked `led` LOW through a fast jump
// into the top rail (a hand-spin looks exactly like the PIC glitch), so this
// tool displays and segments on frame.rawLed; both values are recorded.
import { supabase } from './db.js';
import * as ble from './ble.js';
import * as wakeLock from './wake-lock.js';
import { drawVitalitySeries } from './chart.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

const MAX_CAPTURE_MS   = 15 * 60 * 1000; // safety stop for a forgotten recorder
const SPIN_START_LED   = 6;      // rawLed at/above this...
const SPIN_START_HITS  = 2;      // ...on this many consecutive NEW reports = spin started
const SPIN_END_ZERO_MS = 4000;   // rawLed 0 sustained this long = spin over
const SPIN_MIN_MS      = 6000;   // shorter segments = handling bumps, not spins
const CHART_WINDOW_MS  = 75000;  // rolling live-chart window (fits one full spin-down)
const CHART_GAP_MS     = 2500;   // frame gap beyond this = BLE outage → pen-up in the chart

// The recorded tuple layout — single owner for ingest, payload format string,
// and any future decoder. Bump the format version on ANY change here.
const FRAME_COLS = ['t_ms', 'counter', 'raw_led', 'led'];
const FORMAT = 'wheel-bench v1; frames=[' + FRAME_COLS.join(',') + ']; led=rpm (0-24, device-railed at 24)';

// Saved wheels survive tab switches (mount closures die, the day's bench work
// must not): the store and a repaint hook for the currently mounted instance
// live at module level, so an async DB save finishing after a remount still
// updates the visible list and Retry stays reachable for the whole page life.
const savedStore = [];
let notifySaved = null;

function styles(){
  if(document.getElementById('awbStyles')) return;
  const el = document.createElement('style');
  el.id = 'awbStyles';
  el.textContent = `
  .awb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
  .awb-grid label{display:flex;flex-direction:column;gap:5px;font-size:11.5px;font-weight:700;
    letter-spacing:.06em;text-transform:uppercase;color:#67737c}
  .awb-grid input{box-sizing:border-box;width:100%;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:10px;
    color:#011624;font-family:'Inter',sans-serif;font-size:15px;padding:10px 12px}
  .awb-grid input:focus{outline:none;border-color:#5230da;background:#fff;box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .awb-ble{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#67737c;margin:0 0 14px}
  .awb-ble .dot{width:9px;height:9px;border-radius:50%;background:#c9ced2;flex-shrink:0}
  .awb-ble.on .dot{background:#3ddc84}
  .awb-ble.on b{color:#0f8a52}
  .awb-live{border:1px solid #dfe3e6;border-radius:14px;background:#f7f8f8;padding:14px 16px;margin:14px 0}
  .awb-stats{display:flex;flex-wrap:wrap;gap:8px 26px;align-items:baseline;margin-bottom:10px}
  .awb-rpm{font-family:'Montserrat',sans-serif;font-weight:600;font-size:44px;line-height:1;color:#011624;
    font-variant-numeric:tabular-nums}
  .awb-rpm small{font-size:14px;font-weight:700;color:#67737c;margin-left:4px}
  .awb-kv{font-size:13px;color:#67737c;font-variant-numeric:tabular-nums}
  .awb-kv b{color:#011624}
  .awb-spinbadge{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;
    padding:3px 10px;background:#f2f3f4;color:#99a2a7}
  .awb-spinbadge.on{background:rgba(82,48,218,.12);color:#401d91}
  .awb-canvas{width:100%;height:190px;display:block}
  .awb-rec{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff5c5c;margin-right:7px;
    animation:awbPulse 1.2s ease-in-out infinite}
  @keyframes awbPulse{0%,100%{opacity:1}50%{opacity:.35}}
  .awb-spins{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}
  .awb-spins th{font-family:'Montserrat',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.08em;
    text-transform:uppercase;color:#67737c;text-align:left;padding:7px 8px;border-bottom:1px solid #dfe3e6}
  .awb-spins td{padding:7px 8px;border-bottom:1px solid #eef1f3;color:#27384e;font-variant-numeric:tabular-nums}
  .awb-btnrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
  .awb-stop{background:#c2415b}
  .awb-stop:hover{background:#a13049}
  .awb-ghost{font-family:'Inter',sans-serif;font-size:14px;font-weight:600;padding:12px 18px;border-radius:999px;
    cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#67737c;transition:border-color .15s,color .15s}
  .awb-ghost:hover{border-color:#c2415b;color:#c2415b}
  .awb-simtag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
    border-radius:999px;padding:2px 8px;background:rgba(184,134,11,.14);color:#8a6a08;margin-left:8px}
  .awb-saved .adm-row{flex-wrap:wrap}
  .awb-dbok{color:#0f8a52;font-size:12px;font-weight:700}
  .awb-dberr{color:#c2415b;font-size:12px;font-weight:700}
  .awb-mini{font-family:'Inter',sans-serif;font-size:12px;font-weight:700;padding:7px 13px;border-radius:999px;
    cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#401d91;flex-shrink:0}
  .awb-mini:hover{border-color:#5230da}
  .awb-steps{margin:0;padding-left:18px;color:#67737c;font-size:13.5px;line-height:1.6}
  .awb-steps b{color:#011624}
  `;
  document.head.appendChild(el);
}

// One recorded-wheel payload -> local JSON download (always works, even with no
// table / no network). Bench sessions are irreplaceable field data.
function downloadJson(payload){
  const name = 'wheel-bench_' + (payload.serial || 'unknown').replace(/[^a-z0-9_-]+/gi, '-')
    + '_' + payload.started_at.replace(/[:.]/g, '-') + (payload.env && payload.env.sim ? '_SIM' : '') + '.json';
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function mountWheelBench(host){
  styles();

  // ---- capture state --------------------------------------------------------
  let rec = null;          // active recording (null = idle)
  let uiTimer = null;
  let unsubFrames = null, unsubStatus = null;
  let bleState = ble.getState();
  let sim = null;          // simulator state (dev/dry-run without a wheel)

  const newRec = (serial, note) => ({
    serial, note,
    t0: performance.now(),
    startedAt: new Date().toISOString(),
    frames: [],            // FRAME_COLS tuples, one per parsed line
    events: [],            // {t_ms, type, value?}
    spins: [],             // completed segments
    fw: '', hw: '', lastBattery: null,
    // spin segmentation (rawLed-based — see header comment)
    lastCounter: null, startHits: 0, firstHitMs: 0, spinning: false,
    spinStartMs: 0, zeroSinceMs: null, maxLed: 0, prevRaw: null,
    simUsed: false,
  });

  const now = () => rec ? Math.round(performance.now() - rec.t0) : 0;

  function ingest(frame, fromSim){
    if(!rec) return;
    // Real frames only flow while connected; the status handler also kills the
    // sim on connect — this guard is the belt to that suspender, so synthetic
    // and real data can never interleave in one recording.
    if(!fromSim && sim) simStop();
    const t = now();
    if(fromSim) rec.simUsed = true;
    rec.frames.push([t, frame.counter, frame.rawLed, frame.led]);
    if(!rec.fw && frame.fw){ rec.fw = frame.fw; rec.hw = frame.hw; }
    if(frame.battery !== rec.lastBattery){
      rec.events.push({ t_ms: t, type: 'battery', value: frame.battery });
      rec.lastBattery = frame.battery;
    }

    // --- spin segmentation (bookkeeping only; raw data is saved regardless) ---
    // Glitch guard: the PIC sometimes reports a spurious 24 for a moment (the
    // rail glitch ble.js de-spikes). Within an active spin the wheel only
    // decelerates, so a single-step jump >=10 INTO the >=22 rail is the glitch,
    // not motion — ignore it for max/zero bookkeeping (the raw log keeps it).
    // Start detection is protected by the two-consecutive-reports rule instead:
    // a real hand-spin stays high across reports, the glitch does not.
    const glitch = rec.prevRaw != null && frame.rawLed >= 22 && (frame.rawLed - rec.prevRaw) >= 10;
    const fresh = frame.counter !== rec.lastCounter;
    rec.lastCounter = frame.counter;
    if(!rec.spinning){
      if(fresh){
        if(frame.rawLed >= SPIN_START_LED){
          if(rec.startHits === 0) rec.firstHitMs = t;   // spin window starts at the FIRST high report
          rec.startHits++;
          if(rec.startHits >= SPIN_START_HITS){
            rec.spinning = true; rec.spinStartMs = rec.firstHitMs;
            rec.zeroSinceMs = null; rec.maxLed = frame.rawLed;
            rec.startHits = 0;
          }
        } else rec.startHits = 0;
      }
    } else if(!glitch){
      if(frame.rawLed > rec.maxLed) rec.maxLed = frame.rawLed;
      if(frame.rawLed <= 0){
        if(rec.zeroSinceMs == null) rec.zeroSinceMs = t;
        else if(t - rec.zeroSinceMs >= SPIN_END_ZERO_MS) endSpin();
      } else rec.zeroSinceMs = null;
    }
    if(!glitch) rec.prevRaw = frame.rawLed;

    if(t > MAX_CAPTURE_MS) stopAndSave('Auto-stopped after 15 minutes.').catch(() => {});
  }

  // Close the current segment. endMs: the moment the wheel reached zero — or,
  // for a stop pressed mid-coast, the stop moment (marked interrupted).
  function closeSpin(r, endMs, interrupted){
    const dur = endMs - r.spinStartMs;
    if(dur >= SPIN_MIN_MS){
      const spin = {
        n: r.spins.length + 1,
        t_start_ms: r.spinStartMs,
        t_end_ms: endMs,
        duration_s: Math.round(dur / 100) / 10,
        max_led: r.maxLed,
      };
      if(interrupted) spin.interrupted = true;   // wheel had not settled at zero
      r.spins.push(spin);
    }
    r.spinning = false; r.zeroSinceMs = null; r.maxLed = 0;
  }
  function endSpin(){
    closeSpin(rec, rec.zeroSinceMs, false);
    paintSpins();
  }

  // ---- simulator (only offered while idle with no wheel connected) ----------
  // Mimics the real stream: ~14 lines/s, a NEW counter only every ~700 ms,
  // physics-shaped decay (Coulomb + viscous + disk ~w^1.5), integer 0-24 LED
  // railed at 24. Recordings made with it are tagged SIM everywhere, and the
  // sim is auto-stopped the moment a real wheel connects.
  function simStart(){
    if(sim) return;
    sim = { omega: 0, counter: 1000, lastReport: 0, lineTimer: null, physTimer: null };
    sim.physTimer = setInterval(() => {           // 50 ms physics steps
      const w = sim.omega;
      if(w > 0.002) sim.omega = Math.max(0, w - 0.05 * (0.009 + 0.15 * w + 0.035 * Math.pow(w, 1.5)));
    }, 50);
    sim.lineTimer = setInterval(() => {           // ~14 lines/s, new counter ~700 ms
      if(!sim) return;
      const t = performance.now();
      const rpm = sim.omega * 60 / (2 * Math.PI);
      if(t - sim.lastReport >= 700 && rpm >= 0.3){
        sim.lastReport = t;
        sim.counter = Math.min(65535, Math.max(1, Math.round(2500 / Math.max(rpm, 0.5))));
      }
      const led = Math.max(0, Math.min(24, Math.round(rpm)));
      ingest({ counter: sim.counter, rawLed: led, led, battery: 'OK', hw: 'SIM', fw: 'SIM' }, true);
    }, 71);
    paintLive();
  }
  function simSpin(){ if(sim) sim.omega = (28 + Math.random() * 14) * 2 * Math.PI / 60; }
  function simStop(){
    if(!sim) return;
    clearInterval(sim.lineTimer); clearInterval(sim.physTimer); sim = null;
  }

  // ---- capture lifecycle ----------------------------------------------------
  function warnUnload(e){ e.preventDefault(); e.returnValue = ''; }

  // Release everything a recording holds. Sync and idempotent — called from
  // every path that ends a capture, BEFORE any async save work, so an error
  // later can never leave the wake lock or the leave-warning armed.
  function releaseCapture(){
    wakeLock.release();
    window.removeEventListener('beforeunload', warnUnload);
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
  }

  function start(){
    const serial = host.querySelector('#awbSerial').value.trim();
    if(!serial){ setMsg('err', 'Enter the wheel serial number first.'); return; }
    if(!bleState.connected && !sim){ setMsg('err', 'Connect the wheel first (header Connect button), or enable the simulator.'); return; }
    rec = newRec(serial, host.querySelector('#awbNote').value.trim());
    wakeLock.acquire();
    window.addEventListener('beforeunload', warnUnload);
    setMsg('', '');
    paintSpins();               // clear the previous wheel's rows immediately
    paintBle();                 // hides the sim offer for the recording's duration
    paintLive();
    if(!uiTimer) uiTimer = setInterval(paintLive, 250);
  }

  async function stopAndSave(reason){
    if(!rec) return;
    const r = rec; rec = null;
    releaseCapture();
    // Close an in-flight segment: at the zero-run start if the wheel had
    // settled, else at the stop moment (marked interrupted — still coasting).
    if(r.spinning){
      const lastT = r.frames.length ? r.frames[r.frames.length - 1][0] : r.spinStartMs;
      if(r.zeroSinceMs != null) closeSpin(r, r.zeroSinceMs, false);
      else closeSpin(r, lastT, true);
    }

    const env = readEnv();
    if(r.simUsed) env.sim = true;
    const payload = {
      serial: r.serial, notes: r.note || null, env,
      fw: r.fw || null, hw: r.hw || null,
      started_at: r.startedAt, ended_at: new Date().toISOString(),
      frame_count: r.frames.length, spins: r.spins, frames: r.frames, events: r.events,
      format: FORMAT,
    };
    const entry = { payload, db: 'saving' };
    savedStore.unshift(entry);
    paintBle(); paintLive(); repaintSaved();
    if(reason) setMsg('err', reason);
    downloadJson(payload);            // local backup FIRST — this can never fail on RLS
    await tryDbSave(entry);
    const serialIn = host.querySelector('#awbSerial');
    if(serialIn){ serialIn.value = ''; serialIn.focus(); }
  }

  async function tryDbSave(entry){
    entry.db = 'saving'; repaintSaved();
    const p = entry.payload;
    try {
      const { error } = await supabase.from('wheel_bench').insert({
        serial: p.serial, notes: p.notes, env: p.env, fw: p.fw, hw: p.hw,
        started_at: p.started_at, ended_at: p.ended_at,
        frame_count: p.frame_count, spins: p.spins, frames: p.frames, events: p.events,
      });
      entry.db = error ? ('err:' + error.message) : 'ok';
    } catch(e){
      entry.db = 'err:' + ((e && e.message) || 'network error');   // fetch-level failure
    }
    repaintSaved();
  }

  function discard(){
    if(!rec) return;
    if(!confirm('Discard this recording? Nothing will be saved.')) return;
    rec = null;
    releaseCapture();
    paintBle(); paintLive();
  }

  function readEnv(){
    const num = id => { const v = parseFloat(host.querySelector(id).value); return isNaN(v) ? null : v; };
    return {
      temp_c: num('#awbTemp'), rh_pct: num('#awbRh'),
      location: host.querySelector('#awbLoc').value.trim() || null,
      ua: navigator.userAgent,
    };
  }

  // ---- painting -------------------------------------------------------------
  function setMsg(kind, text){
    const m = host.querySelector('#awbMsg');
    if(m){ m.className = 'adm-msg ' + (kind || ''); m.textContent = text; }
  }

  function paintBle(){
    const b = host.querySelector('#awbBle');
    if(!b) return;
    b.className = 'awb-ble' + (bleState.connected ? ' on' : '');
    // The sim offer only appears while IDLE and disconnected: enabling it
    // mid-recording (e.g. after a BLE drop) would flood a real capture with
    // synthetic frames and SIM-tag a genuine wheel's data.
    const simBtn = (!rec && !bleState.connected)
      ? ` <button type="button" class="awb-mini" id="awbSimBtn">${sim ? 'Simulator ON' : 'Enable simulator (test only)'}</button>` : '';
    b.innerHTML = bleState.connected
      ? `<span class="dot"></span><span>Wheel <b>connected</b>${bleState.deviceName ? ' · ' + esc(bleState.deviceName) : ''} — ready to record.</span>`
      : `<span class="dot"></span><span>No wheel connected — use the header <b>Connect</b> button.${simBtn}</span>`;
    const sb = host.querySelector('#awbSimBtn');
    if(sb) sb.addEventListener('click', () => { simStart(); paintBle(); });
    const startBtn = host.querySelector('#awbStart');
    if(startBtn) startBtn.disabled = !!rec || (!bleState.connected && !sim);
  }

  function paintLive(){
    const live = host.querySelector('#awbLive');
    if(!live) return;
    const btnStart = host.querySelector('#awbStart');
    const btnStop = host.querySelector('#awbStop');
    const btnDiscard = host.querySelector('#awbDiscard');
    const btnSimSpin = host.querySelector('#awbSimSpin');
    btnStart.disabled = !!rec || (!bleState.connected && !sim);
    btnStop.style.display = rec ? '' : 'none';
    btnDiscard.style.display = rec ? '' : 'none';
    btnSimSpin.style.display = (rec && sim) ? '' : 'none';
    if(!rec){ live.style.display = 'none'; return; }
    live.style.display = '';

    const t = now();
    const last = rec.frames.length ? rec.frames[rec.frames.length - 1] : null;
    const rpm = last ? last[2] : 0;
    host.querySelector('#awbRpm').innerHTML = `${rpm}<small>rpm (raw)</small>`;
    host.querySelector('#awbElapsed').innerHTML = `elapsed <b>${Math.floor(t / 60000)}:${String(Math.floor(t / 1000) % 60).padStart(2, '0')}</b>`;
    host.querySelector('#awbFrames').innerHTML = `lines <b>${rec.frames.length}</b>`;
    host.querySelector('#awbCounter').innerHTML = `counter <b>${last ? last[1] : '—'}</b>`;
    const badge = host.querySelector('#awbSpinBadge');
    badge.className = 'awb-spinbadge' + (rec.spinning ? ' on' : '');
    badge.textContent = rec.spinning
      ? `Spin ${rec.spins.length + 1} — max ${rec.maxLed} rpm — ${((t - rec.spinStartMs) / 1000).toFixed(0)}s`
      : `${rec.spins.length} spin${rec.spins.length === 1 ? '' : 's'} recorded — waiting for a spin`;

    // rolling raw-RPM chart over the last CHART_WINDOW_MS (anchored at 0 while
    // the session is younger than the window, so labels never go negative);
    // a frame gap beyond CHART_GAP_MS = BLE outage → null point = pen up, so an
    // outage never draws as a fake continuous spin-down slope
    const from = Math.max(0, t - CHART_WINDOW_MS);
    const pts = [];
    let prevT = null;
    for(const f of rec.frames){
      if(f[0] < from) continue;
      if(prevT != null && f[0] - prevT > CHART_GAP_MS)
        pts.push({ x: (prevT + 1 - from) / CHART_WINDOW_MS, led: null });
      pts.push({ x: (f[0] - from) / CHART_WINDOW_MS, led: f[2] });
      prevT = f[0];
    }
    drawVitalitySeries(host.querySelector('#awbCanvas'), pts, {
      marker: true,
      xLabels: [0, 1, 2, 3].map(i => ({ frac: i / 3, text: Math.round((from + (i / 3) * CHART_WINDOW_MS) / 1000) + 's' })),
    });
  }

  function paintSpins(){
    const tb = host.querySelector('#awbSpinRows');
    if(!tb || !rec) return;
    tb.innerHTML = rec.spins.map(s =>
      `<tr><td>#${s.n}${s.interrupted ? ' ⚠' : ''}</td><td>${s.max_led} rpm</td><td>${s.duration_s.toFixed(1)} s</td>
       <td>${(s.t_start_ms / 1000).toFixed(1)}s → ${(s.t_end_ms / 1000).toFixed(1)}s</td></tr>`).join('');
  }

  function paintSaved(){
    const ul = host.querySelector('#awbSaved');
    if(!ul) return;
    if(!savedStore.length){ ul.innerHTML = '<li class="adm-empty">Nothing recorded yet today.</li>'; return; }
    ul.innerHTML = savedStore.map((e, i) => {
      const p = e.payload;
      const db = e.db === 'ok' ? '<span class="awb-dbok">DB ✓</span>'
        : e.db === 'saving' ? '<span class="adm-src">saving…</span>'
        : `<span class="awb-dberr" title="${esc(e.db.slice(4))}">DB failed</span> <button type="button" class="awb-mini" data-retry="${i}">Retry</button>`;
      return `<li class="adm-row">
        <div class="adm-info">
          <div class="adm-name">${esc(p.serial)}${p.env && p.env.sim ? '<span class="awb-simtag">SIM</span>' : ''}</div>
          <div class="adm-mail">${p.spins.length} spins · ${p.frame_count} lines · ${esc(new Date(p.started_at).toLocaleTimeString('en-GB'))}</div>
        </div>
        ${db}
        <button type="button" class="awb-mini" data-dl="${i}">JSON</button>
      </li>`;
    }).join('');
  }
  // Repaint the saved list on whichever bench instance is currently mounted —
  // an async save finishing after a tab switch must update the live DOM, not
  // this closure's detached one.
  function repaintSaved(){
    paintSaved();
    if(notifySaved && notifySaved !== paintSaved) notifySaved();
  }

  // ---- shell ----------------------------------------------------------------
  host.innerHTML = `
  <div>
    <div class="adm-head">
      <h1>Wheel bench</h1>
      <p>Spin-down recorder for grading physical wheels. Everything the wheel sends is recorded raw;
         the quality math runs later, so old recordings stay scorable.</p>
    </div>

    <div class="adm-card">
      <h2>How it works</h2>
      <ol class="awb-steps">
        <li>Connect a wheel (header <b>Connect</b>), type its <b>serial number</b>, press <b>Start</b>.</li>
        <li><b>Spin the wheel by hand</b> as fast as comfortable, let go, let it coast to a <b>full stop</b>. No drafts, no touching the table.</li>
        <li>Repeat <b>3–5 spins</b>, then <b>Stop &amp; save</b>. The next wheel starts at step 1.</li>
      </ol>
    </div>

    <div class="adm-card">
      <h2>Environment (once per bench session)</h2>
      <div class="awb-grid">
        <label>Temp °C<input id="awbTemp" type="number" inputmode="decimal" placeholder="23"></label>
        <label>Humidity %<input id="awbRh" type="number" inputmode="numeric" placeholder="45"></label>
        <label>Location<input id="awbLoc" type="text" placeholder="office desk" autocomplete="off"></label>
      </div>
    </div>

    <div class="adm-card">
      <h2>Record a wheel</h2>
      <div id="awbBle" class="awb-ble"></div>
      <div class="awb-grid" style="grid-template-columns:1fr 1fr">
        <label>Serial number<input id="awbSerial" type="text" placeholder="e.g. EW-2026-0173" autocomplete="off"></label>
        <label>Note (optional)<input id="awbNote" type="text" placeholder="batch, condition…" autocomplete="off"></label>
      </div>

      <div id="awbLive" class="awb-live" style="display:none">
        <div class="awb-stats">
          <span class="awb-rpm" id="awbRpm">0<small>rpm (raw)</small></span>
          <span class="awb-kv"><span class="awb-rec"></span>REC</span>
          <span class="awb-kv" id="awbElapsed"></span>
          <span class="awb-kv" id="awbFrames"></span>
          <span class="awb-kv" id="awbCounter"></span>
          <span class="awb-spinbadge" id="awbSpinBadge"></span>
        </div>
        <canvas id="awbCanvas" class="awb-canvas"></canvas>
        <table class="awb-spins">
          <thead><tr><th>Spin</th><th>Max</th><th>Length</th><th>Window</th></tr></thead>
          <tbody id="awbSpinRows"></tbody>
        </table>
      </div>

      <div class="awb-btnrow">
        <button type="button" class="adm-btn" id="awbStart">Start recording</button>
        <button type="button" class="adm-btn awb-stop" id="awbStop" style="display:none">Stop &amp; save wheel</button>
        <button type="button" class="adm-btn" id="awbSimSpin" style="display:none">SIM: spin the wheel</button>
        <button type="button" class="awb-ghost" id="awbDiscard" style="display:none">Discard</button>
      </div>
      <span class="adm-msg" id="awbMsg"></span>
    </div>

    <div class="adm-card awb-saved">
      <h2>Recorded today</h2>
      <ul class="adm-list" id="awbSaved"><li class="adm-empty">Nothing recorded yet today.</li></ul>
    </div>
  </div>`;

  host.querySelector('#awbStart').addEventListener('click', start);
  host.querySelector('#awbStop').addEventListener('click', () => stopAndSave().catch(() => {}));
  host.querySelector('#awbDiscard').addEventListener('click', discard);
  host.querySelector('#awbSimSpin').addEventListener('click', simSpin);
  host.querySelector('#awbSaved').addEventListener('click', e => {
    const dl = e.target.closest('[data-dl]');
    if(dl){ downloadJson(savedStore[+dl.dataset.dl].payload); return; }
    const rt = e.target.closest('[data-retry]');
    if(rt) tryDbSave(savedStore[+rt.dataset.retry]);
  });

  unsubFrames = ble.subscribeFrames(f => ingest(f, false));
  unsubStatus = ble.subscribeStatus(s => {
    const was = bleState.connected;
    bleState = s;
    // A real wheel takes over: kill the simulator so streams never mix.
    if(s.connected && sim) simStop();
    if(rec && was !== s.connected){
      rec.events.push({ t_ms: now(), type: s.connected ? 'ble_reconnect' : 'ble_drop' });
    }
    paintBle();
  });
  notifySaved = paintSaved;
  paintBle(); paintSaved();

  return () => {
    // Leaving the tab mid-recording: salvage whatever was captured as a local
    // download + DB attempt — bench data is field data, never silently drop
    // any of it. releaseCapture runs inside stopAndSave (sync, before awaits).
    if(rec && rec.frames.length) stopAndSave().catch(() => {});
    else releaseCapture();
    if(unsubFrames) unsubFrames();
    if(unsubStatus) unsubStatus();
    simStop();
    if(notifySaved === paintSaved) notifySaved = null;
  };
}
