// wheel-capture.js — the shared wheel capture engine, extracted 1:1 from the
// admin "Wheel test" tool (admin-wheel-bench.js) so the Research workbench can
// record with the exact same, field-proven pipeline: raw frame logging, rawLed
// based spin segmentation with the PIC-glitch guards, the untouched-tail watch,
// the simulator and the deterministic dev feed. NO DOM and NO persistence in
// here — consumers wire callbacks and decide how to paint and save.
//
// The spike filter in ble.js holds the de-spiked `led` LOW through a fast jump
// into the top rail (a hand-spin looks exactly like the PIC glitch), so every
// consumer displays and segments on frame.rawLed; both values are recorded.
import * as ble from './ble.js';
import * as wakeLock from './wake-lock.js';

export const SPIN_START_LED  = 6;      // rawLed at/above this...
export const SPIN_START_HITS = 2;      // ...on this many consecutive NEW reports = spin started
export const SPIN_MIN_MS     = 6000;   // shorter segments = handling bumps, not spins
// Untouched-tail observation: once the wheel is down at/below TAIL_LOW_RPM the
// spin stays open for a fixed watch window — hands off! — and what the wheel
// does in it (stays dead, or keeps being nudged by ambient air) is recorded as
// the tail metrics: the SENSITIVITY axis the coast-down alone cannot see.
export const TAIL_LOW_RPM    = 5;      // rawLed at/below this = tail phase
export const TAIL_OBS_MS     = 30000;  // watch this long, then the spin closes

// The recorded tuple layout — single owner for ingest, payload format string,
// and any future decoder. Bump the format version on ANY change here.
export const FRAME_COLS = ['t_ms', 'counter', 'raw_led', 'led'];
export const FORMAT = 'wheel-bench v1; frames=[' + FRAME_COLS.join(',') + ']; led=rpm (0-24, device-railed at 24); true rpm=6000/counter';

// Decoded 2026-08-14 from the first real bench capture, validated against the
// device's own LED on every frame: the 16-bit counter is the revolution period
// in ~10 ms units, so TRUE rpm ~= 6000/counter — and the device keeps measuring
// far above the 24-rpm display rail (500 rpm observed on a hand spin).
// counter 0 = standstill. Absolute scale to be confirmed by video (~3%).
export const rpmOf = c => c > 0 ? 6000 / c : 0;
export const RPM_MIN_COUNTER = 8;   // counter below this (>750 rpm) = glitch/artifact, ignore for stats

// Anchored-curve bounds (seconds around the 24-rpm crossing / rpm on a log axis).
// buildCurve and every chart renderer share these.
export const CURVE_X_MIN = -12, CURVE_X_MAX = 48;
export const CURVE_Y_MIN = 1.6, CURVE_Y_MAX = 620;

// Wheel constants + the braking model family. decel [rpm/s] = A + B*w + K*w^1.5.
// Factory reference fitted on the 2026-08-14 batch-1 benchmark; a per-room
// research calibration refits A/K for THAT wheel in THAT room.
export const INERTIA = 1.7e-7;                       // kg*m^2, ±10%
export const FACTORY_COEF = { A: 0.24, B: 0.0, K: 0.025, T24_5: 14.5 };
export const decelOf = (coef, w) => coef.A + (coef.B || 0) * w + coef.K * Math.pow(w, 1.5);

// Integrate a braking model downward from w0 and anchor t=0 at the 24-rpm
// crossing (same integrator the admin bench uses for its ideal curve). Returns
// thinned points for drawing plus where the model wheel fully stops.
export function integrateModel(coef, w0 = 450){
  const pts = [];
  let w = w0, t = 0;
  while(w > 0.05 && t < 300){
    if(w >= CURVE_Y_MIN) pts.push({ t, w });
    w -= decelOf(coef, w) * 0.02;
    t += 0.02;
  }
  const tStop = t;
  let t24 = null;
  for(let i = 1; i < pts.length; i++){
    if(pts[i].w <= 24){
      const a = pts[i - 1], b = pts[i];
      t24 = a.t + (Math.log(a.w) - Math.log(24)) / (Math.log(a.w) - Math.log(b.w)) * (b.t - a.t);
      break;
    }
  }
  if(t24 == null) t24 = 0;
  const out = [];
  for(let i = 0; i < pts.length; i += 10)   // thin to ~5/s for drawing
    out.push({ x: pts[i].t - t24, y: pts[i].w });
  return { pts: out, stopX: tStop - t24 };
}

// Interpolated time where an anchored curve crosses `rpm` downward (after peak).
export function crossTime(pts, rpm){
  let pk = 0;
  for(let i = 1; i < pts.length; i++) if(pts[i].y > pts[pk].y) pk = i;
  for(let i = pk + 1; i < pts.length; i++){
    if(pts[i].y <= rpm && pts[i - 1].y > rpm){
      const a = pts[i - 1], b = pts[i];
      return a.x + (Math.log(a.y) - Math.log(rpm)) / (Math.log(a.y) - Math.log(b.y)) * (b.x - a.x);
    }
  }
  return null;
}

// Build an anchored chart curve from raw rpm points of one spin window.
// Anchor: t=0 at a downward 24-rpm crossing. A struggling spin-up (several
// flick attempts, finger touches) can cross 24 downward more than once, and a
// hand-grab at the end shows as a fake spike — so EVERY downward crossing is a
// candidate, and the winner is the one followed by the LONGEST uninterrupted
// decay. That is always the real, successful spin-down; the mess before it
// still draws left of t=0. Returns null if the wheel never came down through
// 24 while recording (weak flick, or Start pressed too late).
export function buildCurve(rpmPts, fromMs, toMs){
  const pts = rpmPts.filter(p => p.t >= fromMs - 12000 && p.t <= toMs && p.rpm >= CURVE_Y_MIN)
    .map(p => ({ x: p.t / 1000, y: Math.min(CURVE_Y_MAX - 1, p.rpm) }));
  if(pts.length < 6) return null;
  let best = null;
  for(let i = 1; i < pts.length; i++){
    if(!(pts[i - 1].y > 24 && pts[i].y <= 24)) continue;
    const a = pts[i - 1], b = pts[i];
    const t24 = a.x + (Math.log(a.y) - Math.log(24)) / (Math.log(a.y) - Math.log(b.y)) * (b.x - a.x);
    let end = pts.length - 1;
    for(let j = i + 1; j < pts.length; j++){
      if(pts[j].y > pts[j - 1].y * 1.2 && pts[j].y > 3){ end = j - 1; break; }   // re-flick / grab / kick
    }
    const dur = pts[end].x - t24;
    if(!best || dur > best.dur) best = { t24, dur };
  }
  if(!best) return null;
  const anchored = pts.map(p => ({ x: p.x - best.t24, y: p.y })).filter(p => p.x >= CURVE_X_MIN && p.x <= CURVE_X_MAX);
  // score only from the clean decay window that won the anchor
  const clean = anchored.filter(p => p.x >= 0 && p.x <= best.dur);
  const t5 = crossTime(clean, 5);
  return { pts: anchored, T245: t5 != null ? t5 : null };
}

// Single owner of the anchor-click download scaffold — the "local download
// FIRST, must never fail" discipline lives HERE, so a platform fix (e.g. a
// longer revoke delay for Bluefy) lands once for JSON, CSV and PNG exports.
export function downloadBlob(name, blob){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// One recorded payload -> local JSON download (always works, even with no
// table / no network). Capture sessions are irreplaceable field data.
export function downloadJson(payload, prefix){
  const name = (prefix || 'wheel-bench') + '_' + (payload.serial || 'unknown').replace(/[^a-z0-9_-]+/gi, '-')
    + '_' + payload.started_at.replace(/[:.]/g, '-') + (payload.env && payload.env.sim ? '_SIM' : '') + '.json';
  downloadBlob(name, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
}

// The live big-number readout every instrument shows: TRUE rpm from the last
// line's counter (display LED rails at 24; the counter keeps measuring), with
// the shared glitch floor and 999 display cap. Single owner — four screens
// show this number and they must never disagree.
export function liveRpmOf(rec){
  const last = rec && rec.frames.length ? rec.frames[rec.frames.length - 1] : null;
  if(!last) return { rpm: 0, standstill: false };
  if(last[1] === 0) return { rpm: 0, standstill: true };
  return { rpm: last[1] >= RPM_MIN_COUNTER ? Math.min(999, rpmOf(last[1])) : 0, standstill: false };
}
export const fmtRpm = r => r >= 60 ? String(Math.round(r)) : r >= 10 ? r.toFixed(1) : r.toFixed(2);

// dpr-aware canvas setup shared by every chart surface (bench + research).
// Reallocates on BOTH width and height changes — panel bodies resize on
// expand/collapse, and a width-only check leaves a stretched bitmap.
export function setupCanvas(canvas, hPx){
  const w = canvas.clientWidth, h = hPx || canvas.clientHeight;
  if(!w || !h) return null;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)){
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

// ---- the capture engine -----------------------------------------------------
// createCapture({ onFrame, onRpmSample, onSpinClosed, onAutoStop, maxMs })
//  - onFrame(frame, t, rec): every ingested line, after bookkeeping (flush hooks)
//  - onRpmSample({t, rpm}, rec): every FRESH counter sample (chart feeds)
//  - onSpinClosed(spin, curve, rec): a segment closed; spin already has T24_5;
//    curve is the anchored {pts, T245} or null; consumers add their own scoring
//  - onAutoStop(reason): the maxMs safety cap fired — consumer must stop+save
// The returned handle owns the BLE subscription (attach/detach), the simulator,
// the wake lock and the leave-warning. Sync + idempotent release on every path.
export function createCapture(opts = {}){
  const maxMs = opts.maxMs || 15 * 60 * 1000;
  const tailMs = opts.tailMs || TAIL_OBS_MS;   // untouched-tail window (bench: 30 s; research calibration: shorter)
  let rec = null;          // active recording (null = idle)
  let sim = null;          // simulator state (dev/dry-run without a wheel)
  let unsubFrames = null, unsubStatus = null;
  let prevConnected = ble.getState().connected;

  const newRec = (meta) => ({
    ...(meta || {}),
    t0: performance.now(),
    startedAt: new Date().toISOString(),
    frames: [],            // FRAME_COLS tuples, one per parsed line
    events: [],            // {t_ms, type, value?}
    spins: [],             // completed segments
    rpmPts: [],            // fresh-counter true-rpm samples {t, rpm} for charts
    fw: '', hw: '', lastBattery: null,
    // spin segmentation (rawLed-based — see header comment)
    lastCounter: null, startHits: 0, firstHitMs: 0, spinning: false,
    spinStartMs: 0, lowSinceMs: null, maxLed: 0, maxRpm: 0, pendMaxRpm: 0,
    prevRaw: null, railRun: 0,
    simUsed: false, autoStopFired: false,
  });

  const now = () => rec ? Math.round(performance.now() - rec.t0) : 0;

  function ingest(frame, fromSim, tMs){
    if(!rec) return;
    // Real frames only flow while connected; the status handler also kills the
    // sim on connect — this guard is the belt to that suspender, so synthetic
    // and real data can never interleave in one recording.
    if(!fromSim && sim) simStop();
    const t = tMs != null ? tMs : now();   // tMs: dev feed only (deterministic tests)
    if(fromSim) rec.simUsed = true;
    rec.frames.push([t, frame.counter, frame.rawLed, frame.led]);
    if(!rec.fw && frame.fw){ rec.fw = frame.fw; rec.hw = frame.hw; }
    if(frame.battery !== rec.lastBattery){
      rec.events.push({ t_ms: t, type: 'battery', value: frame.battery });
      rec.lastBattery = frame.battery;
    }

    // --- spin segmentation (bookkeeping only; raw data is saved regardless) ---
    // Glitch guard: the PIC sometimes reports a spurious 24 for a moment (the
    // rail glitch ble.js de-spikes). ONLY within an active spin can a jump
    // >=10 into the >=22 rail be suspect (a coasting wheel never re-accelerates
    // by itself), and even there it is a glitch only while BRIEF: the PIC
    // artifact lasts 1-2 report lines, while a genuine RE-FLICK (the user
    // spins again mid-segment after a failed attempt) stays railed for many
    // lines — so after 2 suspect lines the rail is accepted as real motion.
    // Outside a spin the same pattern IS the normal hand-flick and passes.
    const railJump = rec.prevRaw != null && frame.rawLed >= 22 && (frame.rawLed - rec.prevRaw) >= 10;
    rec.railRun = railJump ? rec.railRun + 1 : 0;
    const glitch = rec.spinning && railJump && rec.railRun <= 2;
    const fresh = frame.counter !== rec.lastCounter;
    const rpm = frame.counter >= RPM_MIN_COUNTER ? rpmOf(frame.counter) : 0;
    if(fresh && !glitch && frame.counter >= RPM_MIN_COUNTER){
      const sample = { t, rpm };
      rec.rpmPts.push(sample);
      if(opts.onRpmSample) opts.onRpmSample(sample, rec);
    }
    rec.lastCounter = frame.counter;
    if(!rec.spinning){
      if(fresh){
        if(frame.rawLed >= SPIN_START_LED){
          if(rec.startHits === 0){ rec.firstHitMs = t; rec.pendMaxRpm = 0; }  // spin window starts at the FIRST high report
          if(rpm > rec.pendMaxRpm) rec.pendMaxRpm = rpm;   // the true peak usually IS the first report
          rec.startHits++;
          if(rec.startHits >= SPIN_START_HITS){
            rec.spinning = true; rec.spinStartMs = rec.firstHitMs;
            rec.lowSinceMs = null; rec.maxLed = frame.rawLed; rec.maxRpm = rec.pendMaxRpm;
            rec.startHits = 0;
          }
        } else rec.startHits = 0;
      }
    } else if(!glitch){
      if(frame.rawLed > rec.maxLed) rec.maxLed = frame.rawLed;
      if(rpm > rec.maxRpm) rec.maxRpm = rpm;
      // tail watch: fixed window once the wheel is down at/below TAIL_LOW_RPM;
      // a gust lifting it above resets the watch (the wheel is active again)
      if(frame.rawLed <= TAIL_LOW_RPM){
        if(rec.lowSinceMs == null) rec.lowSinceMs = t;
        else if(t - rec.lowSinceMs >= tailMs) endSpin();
      } else rec.lowSinceMs = null;
    }
    if(!glitch) rec.prevRaw = frame.rawLed;

    if(opts.onFrame) opts.onFrame(frame, t, rec);

    if(t > maxMs && !rec.autoStopFired){
      rec.autoStopFired = true;
      if(opts.onAutoStop) opts.onAutoStop();
    }
  }

  // Close the current segment. endMs: end of the tail-watch window — or, for a
  // stop pressed mid-coast, the stop moment (marked interrupted).
  function closeSpin(r, endMs, interrupted){
    const dur = endMs - r.spinStartMs;
    let spin = null, curve = null;
    if(dur >= SPIN_MIN_MS){
      spin = {
        n: r.spins.length + 1,
        t_start_ms: r.spinStartMs,
        t_end_ms: endMs,
        duration_s: Math.round(dur / 100) / 10,
        max_led: r.maxLed,
        max_rpm: Math.round(r.maxRpm),   // TRUE peak from the counter (can far exceed 24)
      };
      if(interrupted) spin.interrupted = true;   // tail watch not completed
      // Tail metrics over the LAST 20 s of the watch window: by then the
      // natural 5->0 coast is long over, so only the untouched wheel's response
      // to ambient air remains. avg rpm from EVERY line (zeros included: a
      // dead-calm wheel scores ~0 -> "stopped"), pickups = fresh-counter upward
      // jumps at low speed (ambient-air nudges).
      let tail = null;
      if(r.lowSinceMs != null && endMs > r.lowSinceMs){
        const winFrom = Math.max(r.lowSinceMs, endMs - 20000);
        const win = r.frames.filter(f => f[0] >= winFrom && f[0] <= endMs);
        if(win.length >= 4){
          const rpms = win.map(f => f[1] >= RPM_MIN_COUNTER ? 6000 / f[1] : 0);
          const avg = rpms.reduce((a, b) => a + b, 0) / rpms.length;
          let pickups = 0, prev = null, lastC = null;
          for(const f of win){
            if(f[1] === lastC) continue;
            lastC = f[1];
            const rr = f[1] >= RPM_MIN_COUNTER ? 6000 / f[1] : 0;
            if(prev != null && rr > prev * 1.15 && rr >= 0.8 && rr < 8) pickups++;
            prev = rr;
          }
          tail = { avg_rpm: Math.round(avg * 100) / 100, pickups, stopped: avg < 0.15 };
          spin.tail = tail;
        }
      }
      r.spins.push(spin);
      curve = buildCurve(r.rpmPts, r.spinStartMs, endMs);
      if(curve) spin.T24_5 = curve.T245 != null ? Math.round(curve.T245 * 10) / 10 : null;
      if(opts.onSpinClosed) opts.onSpinClosed(spin, curve, r);
    }
    r.spinning = false; r.lowSinceMs = null; r.maxLed = 0; r.maxRpm = 0;
  }
  function endSpin(){ closeSpin(rec, rec.lowSinceMs + tailMs, false); }

  // ---- simulator (only meaningful while no wheel is connected) --------------
  // Mimics the real stream: ~14 lines/s, a NEW counter only every ~700 ms,
  // physics-shaped decay, integer 0-24 LED railed at 24. Recordings made with
  // it are tagged SIM everywhere, and it auto-stops when a real wheel connects.
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
        // real device formula: counter = rev period in ~10 ms units = 6000/rpm
        sim.counter = Math.min(65535, Math.max(1, Math.round(6000 / Math.max(rpm, 0.5))));
      }
      const led = Math.max(0, Math.min(24, Math.round(rpm)));
      ingest({ counter: sim.counter, rawLed: led, led, battery: 'OK', hw: 'SIM', fw: 'SIM' }, true);
    }, 71);
  }
  function simSpin(){ if(sim) sim.omega = (150 + Math.random() * 220) * 2 * Math.PI / 60; }   // real hand spins hit 150-500 rpm
  function simStop(){
    if(!sim) return;
    clearInterval(sim.lineTimer); clearInterval(sim.physTimer); sim = null;
  }

  // ---- lifecycle ------------------------------------------------------------
  function warnUnload(e){ e.preventDefault(); e.returnValue = ''; }

  // Release everything a recording holds. Sync and idempotent — called from
  // every path that ends a capture, BEFORE any async save work, so an error
  // later can never leave the wake lock or the leave-warning armed.
  function releaseCapture(){
    wakeLock.release();
    window.removeEventListener('beforeunload', warnUnload);
  }

  function start(meta){
    if(rec) return false;
    rec = newRec(meta);
    wakeLock.acquire();
    window.addEventListener('beforeunload', warnUnload);
    return true;
  }

  // Ends the capture and returns the raw record (segments closed). The consumer
  // builds and saves its own payload from it. Null when nothing was recording.
  function stop(){
    if(!rec) return null;
    const r = rec; rec = null;
    releaseCapture();
    // Close an in-flight segment at the stop moment. Interrupted only when the
    // wheel was still coasting above the tail threshold (decay incomplete);
    // a Stop pressed mid-tail-watch keeps the spin with partial tail metrics.
    if(r.spinning){
      const lastT = r.frames.length ? r.frames[r.frames.length - 1][0] : r.spinStartMs;
      closeSpin(r, lastT, r.lowSinceMs == null);
    }
    r.endedAt = new Date().toISOString();
    return r;
  }

  function discard(){
    if(!rec) return;
    rec = null;
    releaseCapture();
  }

  function attach(){
    if(unsubFrames) return;
    unsubFrames = ble.subscribeFrames(f => ingest(f, false));
    unsubStatus = ble.subscribeStatus(s => {
      // A real wheel takes over: kill the simulator so streams never mix.
      if(s.connected && sim) simStop();
      if(rec && prevConnected !== s.connected){
        rec.events.push({ t_ms: now(), type: s.connected ? 'ble_reconnect' : 'ble_drop' });
      }
      prevConnected = s.connected;
    });
  }
  function detach(){
    if(unsubFrames){ unsubFrames(); unsubFrames = null; }
    if(unsubStatus){ unsubStatus(); unsubStatus = null; }
    simStop();
  }

  return {
    attach, detach,
    start, stop, discard,
    isRecording: () => !!rec,
    rec: () => rec,          // live record — read-only by convention (paints)
    now,
    simActive: () => !!sim,
    simStart, simSpin, simStop,
    // Dev-only feed for deterministic testing (throttle-proof): frames carry an
    // explicit timestamp and are always SIM-tagged. The feed replaces the sim.
    feed: (frame, tMs) => { simStop(); ingest(frame, true, tMs); },
  };
}
