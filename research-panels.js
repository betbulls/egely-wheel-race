// research-panels.js — the accordion chart stack of the Research workbench.
// One shared view-state + one shared derived-data pipeline feed ten panels;
// only OPEN panels render, collapsed ones stay alive through header readouts.
//
// Honesty architecture (the judged design, 2026-08-14):
//  - every number every panel shows comes from ONE estimator pipeline;
//  - display animation may ease, values are never interpolated or invented;
//  - blank states render as em-dash/grey, never as fake zeros;
//  - reference overlays (ghost, noise floor) are always on;
//  - cursor readouts snap to real stored samples only.
import {
  INERTIA, FACTORY_COEF, decelOf, integrateModel, crossTime, buildCurve,
  setupCanvas, downloadBlob,
} from './wheel-capture.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

const INK = '#011624', GREY = '#67737c', FAINT = '#99a2a7', VIOLET = '#5230da', AMBER = '#b8860b', RED = '#c2415b', GREEN = '#0f8a52';
const LS_KEY = 'ewr.research.panels.v1';
// One shared fallback when a calibration carries no sigma_rel (factory model /
// pre-v3 rows) — the deviation band and the work ribbon must not disagree.
const SIGMA_DEFAULT = 0.08;

// ---- small math helpers -----------------------------------------------------
// Monotone-cubic (Fritsch–Carlson) tangents — the interpolant cannot overshoot
// the measured extremes, so the guide line never invents a peak.
function monotoneTangents(pts){
  const n = pts.length, m = new Array(n).fill(0), d = [];
  for(let i = 0; i < n - 1; i++) d.push((pts[i + 1].y - pts[i].y) / Math.max(1e-9, pts[i + 1].x - pts[i].x));
  if(!n) return m;
  m[0] = d[0] || 0; m[n - 1] = d[n - 2] || 0;
  for(let i = 1; i < n - 1; i++) m[i] = (d[i - 1] * d[i] <= 0) ? 0 : (d[i - 1] + d[i]) / 2;
  for(let i = 0; i < n - 1; i++){
    if(d[i] === 0){ m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if(s > 9){ const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return m;
}
function strokeMonotone(ctx, pts, xOf, yOf){
  if(pts.length < 2) return;
  const m = monotoneTangents(pts);
  ctx.beginPath();
  ctx.moveTo(xOf(pts[0].x), yOf(pts[0].y));
  for(let i = 0; i < pts.length - 1; i++){
    const dx = pts[i + 1].x - pts[i].x;
    ctx.bezierCurveTo(
      xOf(pts[i].x + dx / 3), yOf(pts[i].y + m[i] * dx / 3),
      xOf(pts[i + 1].x - dx / 3), yOf(pts[i + 1].y - m[i + 1] * dx / 3),
      xOf(pts[i + 1].x), yOf(pts[i + 1].y));
  }
  ctx.stroke();
}
const fmtClock = s => { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(Math.floor(s) % 60).padStart(2, '0'); };
const fmtSig2 = v => {
  const a = Math.abs(v);
  if(a >= 100) return String(Math.round(v));
  if(a >= 10) return (Math.round(v * 10) / 10).toFixed(1);
  return (Math.round(v * 100) / 100).toFixed(2);
};

// ---- derived-data pipeline --------------------------------------------------
// Recomputed incrementally (cache keyed on sample count) from the fresh-sample
// series. All series share indices with `samples`.
// One tau/decel estimator pass over the samples with a given window setting.
// Split out of buildPipeline so the analysis-stability check can rerun it with
// alternate windows and prove a feature is not a smoothing artifact.
function estimateTau(samples, coef, gap, spanS, maxN){
  const n = samples.length;
  const alphaBase = w => -decelOf(coef, w) * Math.PI / 30;   // rad/s^2 (negative = braking)
  const tau = new Array(n).fill(null);      // nN*m, null = blank (uncertified)
  const decel = new Array(n).fill(null);    // -d(rpm)/dt in rpm/s (measured, certified only)
  for(let i = 0; i < n; i++){
    const s = samples[i];
    // estimator window: fewest recent samples (min 2) spanning <= spanS s,
    // not crossing a gap or a jump
    const win = [s];
    for(let j = i - 1; j >= 0; j--){
      if(s.t - samples[j].t > spanS) break;
      if(gap[j + 1]) break;
      if(samples[j + 1].rpm > samples[j].rpm * 1.3 && samples[j + 1].rpm > 3) break;   // jump into window
      win.push(samples[j]);
      if(win.length >= maxN) break;
    }
    if(win.length >= 2){
      // LSQ slope of omega(t) over the window
      let st = 0, sw = 0, stt = 0, stw = 0, m = win.length;
      for(const p of win){ const w = p.rpm * Math.PI / 30; st += p.t; sw += w; stt += p.t * p.t; stw += p.t * w; }
      const det = m * stt - st * st;
      if(Math.abs(det) > 1e-9){
        const slope = (m * stw - st * sw) / det;                  // rad/s^2
        const meanRpm = win.reduce((a, p) => a + p.rpm, 0) / m;
        // A wheel AT REST cannot be "braking": the model's A-term would claim
        // a phantom deceleration at 0 rpm, and the subtraction would turn it
        // into a fake positive DRIVE reading on a standing wheel (standstill
        // 0-rpm samples are real data as of v1.2). Baseline = 0 when the
        // whole window is at rest.
        const base = meanRpm < 0.2 ? 0 : alphaBase(meanRpm);
        tau[i] = INERTIA * (slope - base) * 1e9;                  // nN*m
        decel[i] = -slope * 30 / Math.PI;                         // rpm/s
      }
    }
  }
  return { tau, decel };
}

// Reference band B(ω) [nN*m]: the LARGEST of (a) the room noise floor from the
// calibration tail, (b) the model uncertainty at this speed (σ_rel × baseline
// torque), (c) the observed calibration range (three-spin scatter, linearly
// interpolated between its speed bins). A τ reading inside B(ω) is
// indistinguishable from the calibration's own variability.
function bandOfFactory(coef, floorTau){
  const sig = coef.sigma_rel || SIGMA_DEFAULT;
  const bp = (coef.band_pts && coef.band_pts.length) ? coef.band_pts : null;
  return w => {
    const sigTau = sig * INERTIA * decelOf(coef, Math.max(0.3, w)) * Math.PI / 30 * 1e9;
    let obs = 0;
    if(bp){
      if(w <= bp[0][0]) obs = bp[0][1];
      else if(w >= bp[bp.length - 1][0]) obs = bp[bp.length - 1][1];
      else for(let i = 1; i < bp.length; i++){
        if(bp[i][0] >= w){
          const f = (w - bp[i - 1][0]) / Math.max(1e-9, bp[i][0] - bp[i - 1][0]);
          obs = bp[i - 1][1] + f * (bp[i][1] - bp[i - 1][1]);
          break;
        }
      }
    }
    return Math.max(floorTau, sigTau, obs);
  };
}
// Alternate estimator windows for the stability check: [spanS, maxN]. At the
// ~0.7 s cadence the SAMPLE COUNT binds (3/5/8 samples ≈ 1.4/2.8/4.9 s); the
// spanS caps only matter at the sparse sub-2-rpm cadence. UI labels say
// "3 / 5 / 8 samples" for exactly this reason.
const WIN_VARIANTS = [[8, 3], [25, 8]];

function buildPipeline(samples, coef, floorTau, coasts){
  const n = samples.length;
  const gap = new Array(n).fill(false);     // sample follows a data gap
  for(let i = 1; i < n; i++){
    const dt = samples[i].t - samples[i - 1].t;
    // Measured on the batch-1 raw data (2026-08-14): a FRESH counter arrives
    // every ~0.7 s at ANY speed (the 72 teeth keep the sensor fed even at
    // 2 rpm — NOT one update per revolution). Below ~2 rpm consecutive
    // readings often repeat the same counter, so allow extra slack there.
    const expected = samples[i].rpm >= 2 ? 0.7 : 1.5;
    if(dt > 2.5 * expected + 2) gap[i] = true;
  }
  const bandOf = bandOfFactory(coef, floorTau);
  const band = samples.map(s => bandOf(s.rpm));
  const est = estimateTau(samples, coef, gap, 15, 5);        // the certified series
  const tau = est.tau, decel = est.decel;
  const tauVar = WIN_VARIANTS.map(([s2, n2]) => estimateTau(samples, coef, gap, s2, n2).tau);
  // Analysis stability: does the default-window τ agree with both alternates?
  // Agreement = within max(B/2, 3 nN·m). A feature that only exists at one
  // smoothing setting is a numerical artifact, not physics.
  let stab = null;
  { let agree = 0, m = 0;
    for(let i = 0; i < n; i++){
      if(tau[i] == null) continue;
      let ok = 0, have = 0;
      for(const tv of tauVar){
        if(tv[i] == null) continue;
        have++;
        if(Math.abs(tv[i] - tau[i]) <= Math.max(band[i] * 0.5, 3)) ok++;
      }
      if(have){ m++; if(ok === have) agree++; }
    }
    if(m >= 10) stab = { pct: Math.round(agree / m * 100) };
  }
  // Ghosts: one per CLOSED coast window + the live (last) arming. The v1
  // design integrated only the last arming for perf ("integrating every
  // historical arming was the dominant cost") — but that left the deviation
  // strip empty for the whole session except the final coast (field
  // feedback: "why does the line disappear then reappear?"). Closed coast
  // windows are FEW and STABLE, so per-coast integration stays cheap.
  const armScan = (iFrom, iTo) => {
    let armed = null;
    for(let i = Math.max(2, iFrom); i <= iTo; i++){
      if(armed && samples[i].rpm > samples[i - 1].rpm * 1.2 && samples[i].rpm > 3) armed = null;   // re-driven
      if(!armed && !gap[i] && !gap[i - 1]
         && samples[i].rpm < samples[i - 1].rpm && samples[i - 1].rpm < samples[i - 2].rpm
         && samples[i - 1].rpm > 8){
        armed = { t0: (samples[i - 1].t + samples[i - 2].t) / 2, w0: (samples[i - 1].rpm + samples[i - 2].rpm) / 2 };
      }
    }
    return armed;   // the LAST surviving arming in the range
  };
  const integrateGhost = (armed, tMax) => {
    const pts = [];
    let w = armed.w0, t = armed.t0;
    while(w > 0.05 && t < tMax){
      pts.push({ t, rpm: w });
      w -= decelOf(coef, w) * 0.05;
      t += 0.05;
    }
    pts.push({ t, rpm: 0 });
    return { t0: armed.t0, w0: armed.w0, pts, tStop: t };
  };
  const ghosts = [];
  let lastCoastEnd = -1;
  if(coasts && coasts.length){
    for(const cs of coasts){
      const from = cs.t_start_ms / 1000, to = cs.t_end_ms / 1000;
      let iFrom = 0; while(iFrom < n && samples[iFrom].t < from) iFrom++;
      let iTo = n - 1; while(iTo >= 0 && samples[iTo].t > to) iTo--;
      if(iTo - iFrom < 3) continue;
      const armed = armScan(iFrom, iTo);
      if(armed) ghosts.push(integrateGhost(armed, to + 5));
      lastCoastEnd = Math.max(lastCoastEnd, to);
    }
  }
  // live arming AFTER the last closed coast (the in-progress decay)
  const liveArmed = armScan(2, n - 1);
  if(liveArmed && liveArmed.t0 > lastCoastEnd) ghosts.push(integrateGhost(liveArmed, liveArmed.t0 + 700));
  const ghost = ghosts.length ? ghosts[ghosts.length - 1] : null;
  // cumulative revolutions + energy + work ledger (trapezoid over fresh samples)
  const revs = new Array(n).fill(0);
  const energy = samples.map(s => 0.5 * INERTIA * Math.pow(s.rpm * Math.PI / 30, 2) * 1e6);  // µJ
  const work = new Array(n).fill(0);      // µJ, telescoped: ΔE + ∫τ_base·ω dt
  const dissip = new Array(n).fill(0);    // ∫τ_base·ω dt (µJ) — for the ribbon
  // cumulative drive impulse J(t) [nN·m·s] + its model-uncertainty envelope,
  // and the outside-band ledger (time / longest excursion / count / clipped
  // impulse) — the honest aggregate of "how long and how far past B(ω)"
  const imp = new Array(n).fill(0);
  const impSig = new Array(n).fill(0);
  const sig = coef.sigma_rel || SIGMA_DEFAULT;
  const outside = { s: 0, certified_s: 0, longest_s: 0, count: 0, jout: 0 };
  let excurLen = 0;
  for(let i = 1; i < n; i++){
    const dt = samples[i].t - samples[i - 1].t;
    const ok = dt > 0 && dt < 30 && !gap[i];
    revs[i] = revs[i - 1] + (ok ? (samples[i].rpm + samples[i - 1].rpm) / 120 * dt : 0);
    const wMean = (samples[i].rpm + samples[i - 1].rpm) / 2;
    const tauBase = INERTIA * decelOf(coef, wMean) * Math.PI / 30;          // N*m
    const p = tauBase * wMean * Math.PI / 30;                               // W
    dissip[i] = dissip[i - 1] + (ok ? p * dt * 1e6 : 0);                    // µJ
    work[i] = (energy[i] - energy[0]) + dissip[i];
    // impulse: trapezoid over CERTIFIED τ pairs only (a gap contributes zero
    // and the line holds flat — same discipline as the other integrals)
    const okT = ok && tau[i] != null && tau[i - 1] != null;
    imp[i] = imp[i - 1] + (okT ? (tau[i] + tau[i - 1]) / 2 * dt : 0);
    const tauBaseN = wMean < 0.2 ? 0 : Math.abs(tauBase) * 1e9;             // nN·m (0 at rest, like the τ baseline)
    impSig[i] = impSig[i - 1] + (okT ? sig * tauBaseN * dt : 0);
    if(okT){
      outside.certified_s += dt;
      const B = (band[i] + band[i - 1]) / 2;
      const tm = (tau[i] + tau[i - 1]) / 2;
      if(Math.abs(tm) > B){
        outside.s += dt;
        excurLen += dt;
        if(excurLen === dt) outside.count++;                                // a new excursion just began
        if(excurLen > outside.longest_s) outside.longest_s = excurLen;
        outside.jout += Math.sign(tm) * (Math.abs(tm) - B) * dt;
      } else excurLen = 0;
    } else excurLen = 0;
  }
  return { samples, tau, decel, gap, ghost, ghosts, revs, energy, work, dissip, floorTau,
           band, bandOf, tauVar, stab, imp, impSig, outside };
}
// deviation value at t across the ghost SEGMENTS — a segment only speaks
// inside its own [t0, last-pt] domain (an early coast's "0 after end" must
// not leak into later stretches)
function ghostSegAt(p, t){
  for(let i = p.ghosts.length - 1; i >= 0; i--){
    const g = p.ghosts[i];
    const end = g.pts.length ? g.pts[g.pts.length - 1].t : g.t0;
    if(t >= g.t0 && t <= end) return ghostAt(g, t);
  }
  return null;
}
const ghostAt = (ghost, t) => {
  if(!ghost || t < ghost.t0) return null;
  const P = ghost.pts;
  if(!P.length || t > P[P.length - 1].t) return 0;
  let lo = 0, hi = P.length - 1;
  while(hi - lo > 1){ const mid = (lo + hi) >> 1; (P[mid].t <= t) ? lo = mid : hi = mid; }
  const a = P[lo], b = P[hi];
  const f = (t - a.t) / Math.max(1e-9, b.t - a.t);
  return a.rpm + f * (b.rpm - a.rpm);
};

// ---- the stack --------------------------------------------------------------
export function createPanelStack(host, opts){
  styles();
  const coef = opts.coef || FACTORY_COEF;
  const floor = opts.floor || { tau: 5, factory: true };
  const calNote = opts.calNote || 'factory model';
  const view = { mode: opts.mode || 'live', t0: 0, t1: 60, follow: opts.mode !== 'review', preset: '60', cursorT: null, selection: null };
  let samples = [];          // {t (s), rpm}
  let markers = [];          // {t_ms, type, value, note, deleted}
  let coasts = [];           // spin records from the engine
  const coastBands = new WeakMap();   // per-coast band-time cache (see comparator)
  let pipe = buildPipeline(samples, coef, floor.tau, coasts);
  let pipeN = -1;
  let newWhileFrozen = 0;

  const nowT = () => samples.length ? samples[samples.length - 1].t : 0;
  const modelCurve = integrateModel(coef);
  const calT = rpm => crossTime(modelCurve.pts, rpm);          // anchored at 24-crossing
  const T_CAL = {
    t24_10: calT(10), t24_5: calT(5),
    // gate times for the laik-friendly Δseconds readout (3→1 deliberately
    // dropped: below 1.6 rpm the chart curves are clamped and the ~1.5 s
    // sub-2-rpm cadence would drown the gate in quantization)
    t12_6: (calT(6) != null && calT(12) != null) ? calT(6) - calT(12) : null,
    t6_3: (calT(3) != null && calT(6) != null) ? calT(3) - calT(6) : null,
  };

  function ensurePipe(){
    // cache key covers BOTH feeds: samples grow live, coasts close rarely
    const key = samples.length * 1000 + coasts.length;
    if(key !== pipeN){ pipe = buildPipeline(samples, coef, floor.tau, coasts); pipeN = key; }
    return pipe;
  }

  // ---- persistence ----------------------------------------------------------
  const DEFAULT_ORDER = ['timeline', 'wheel3d', 'torque', 'impulse', 'logspeed', 'deviation', 'phase', 'byspeed', 'revs', 'energy', 'work', 'coasts', 'quality'];
  const DEFAULT_OPEN = { timeline: true, torque: true };
  const LENS_KEYS = ['all', 'motion', 'forces', 'energy', 'compare', 'quality'];
  let layout = { order: DEFAULT_ORDER.slice(), open: { ...DEFAULT_OPEN }, prefs: {}, lens: 'all' };
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if(saved && Array.isArray(saved.order)){
      layout.order = saved.order.filter(id => DEFAULT_ORDER.includes(id));
      // panels added in later versions slot into their DEFAULT position
      // instead of dangling at the end of a user's saved order
      DEFAULT_ORDER.forEach((id, di) => {
        if(!layout.order.includes(id)) layout.order.splice(Math.min(di, layout.order.length), 0, id);
      });
      layout.open = { ...DEFAULT_OPEN, ...(saved.open || {}) };
      layout.prefs = saved.prefs || {};
      layout.lens = LENS_KEYS.includes(saved.lens) ? saved.lens : 'all';
    }
  } catch {}
  const persist = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(layout)); } catch {} };
  const pref = (id, key, dflt) => (layout.prefs[id] || {})[key] ?? dflt;
  const setPref = (id, key, v) => { layout.prefs[id] = { ...(layout.prefs[id] || {}), [key]: v }; persist(); paintAll(true); };

  // ---- axis machinery -------------------------------------------------------
  const PAD_L = 46, PAD_R = 12, PAD_T = 10, PAD_B = 22;
  function timeAxis(W){
    const plotW = W - PAD_L - PAD_R;
    const xOf = t => PAD_L + (t - view.t0) / Math.max(0.1, view.t1 - view.t0) * plotW;
    const tOf = x => view.t0 + (x - PAD_L) / plotW * (view.t1 - view.t0);
    return { xOf, tOf, plotW };
  }
  function drawTimeGrid(ctx, W, H, xOf){
    const span = view.t1 - view.t0;
    // aim for ~6-8 labeled ticks at every zoom — two lonely labels made a
    // full-session view unreadable
    const step = span <= 40 ? 5 : span <= 90 ? 10 : span <= 180 ? 20 : span <= 420 ? 60 : 120;
    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for(let t = Math.ceil(view.t0 / step) * step; t <= view.t1; t += step){
      const x = xOf(t);
      ctx.strokeStyle = 'rgba(1,22,36,0.05)';
      ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, H - PAD_B); ctx.stroke();
      ctx.fillStyle = FAINT; ctx.fillText(fmtClock(t), x, H - PAD_B + 5);
    }
    ctx.fillStyle = FAINT; ctx.textAlign = 'right';
    ctx.fillText(fmtClock(view.t0) + '–' + fmtClock(view.t1), W - PAD_R, 1);
  }
  function drawGaps(ctx, W, H, xOf){
    const p = ensurePipe();
    ctx.fillStyle = 'rgba(194,65,91,0.06)';
    for(let i = 1; i < samples.length; i++){
      if(!p.gap[i]) continue;
      const x0 = Math.max(PAD_L, xOf(samples[i - 1].t)), x1 = Math.min(W - PAD_R, xOf(samples[i].t));
      if(x1 > x0) ctx.fillRect(x0, PAD_T, x1 - x0, H - PAD_T - PAD_B);
    }
  }
  // visible index range [i0, i1] into `samples` — index-based so gap[] lookups
  // stay O(1) inside paint loops (samples.indexOf per point was O(n²)/paint)
  function visRange(){
    let i0 = 0, i1 = samples.length - 1;
    while(i0 < samples.length && samples[i0].t < view.t0 - 20) i0++;
    while(i1 >= 0 && samples[i1].t > view.t1 + 20) i1--;
    return [i0, i1];
  }
  function visSamples(){
    const [i0, i1] = visRange();
    return i0 > i1 ? [] : samples.slice(i0, i1 + 1);
  }
  function drawSeries(ctx, xOf, yOf, color){
    const p = ensurePipe();
    const [i0, i1] = visRange();
    if(i0 > i1) return;
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.95;
    // break the line across gaps
    let seg = [];
    for(let i = i0; i <= i1; i++){
      if(i > i0 && p.gap[i]){ strokeMonotone(ctx, seg, x => xOf(x), yOf); seg = []; }
      seg.push({ x: samples[i].t, y: samples[i].rpm });
    }
    strokeMonotone(ctx, seg, x => xOf(x), yOf);
    ctx.globalAlpha = 1;
    // fresh-sample dots (density gate: only when spacing > 3 px)
    const dense = i1 > i0 && (xOf(samples[i1].t) - xOf(samples[i0].t)) / (i1 - i0 + 1) < 3;
    if(!dense){
      ctx.fillStyle = VIOLET;
      for(let i = i0; i <= i1; i++){ ctx.beginPath(); ctx.arc(xOf(samples[i].t), yOf(samples[i].rpm), 2.2, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // last certified value of a nullable series + its index, without allocations
  function lastCertified(arr){
    for(let i = arr.length - 1; i >= 0; i--) if(arr[i] != null) return { v: arr[i], i };
    return null;
  }
  // wrapped in-canvas caption — the old 9.5px one-liners clipped mid-word on
  // narrow canvases and sat below the contrast floor; captions must be READABLE
  // or they are decoration
  function caption(ctx, text, x, y, maxW, opts){
    const o = opts || {};
    const maxLines = o.maxLines || 2;   // captions annotate, they must never flood the plot
    ctx.font = (o.bold ? '700 ' : '') + '10.5px Inter, sans-serif';
    ctx.fillStyle = o.color || GREY;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top';
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for(const w of words){
      const probe = line ? line + ' ' + w : w;
      if(ctx.measureText(probe).width > maxW && line){ lines.push(line); line = w; }
      else line = probe;
    }
    if(line) lines.push(line);
    if(lines.length > maxLines){
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while(last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    let yy = y;
    for(const l of lines){ ctx.fillText(l, x, yy); yy += 13; }
    return yy;
  }
  // tight extent of a numeric series over the samples inside the visible window
  // (a zoomed chart must rescale to what is on screen — a full-run scale turns
  // the very stretch being inspected into a flat line)
  function visExtent(arr, extra){
    let lo = Infinity, hi = -Infinity;
    for(let i = 0; i < samples.length; i++){
      const t = samples[i].t;
      if(t < view.t0 || t > view.t1 || arr[i] == null) continue;
      const pad = extra ? extra(i) : 0;
      if(arr[i] - pad < lo) lo = arr[i] - pad;
      if(arr[i] + pad > hi) hi = arr[i] + pad;
    }
    return isFinite(lo) ? { lo, hi } : null;
  }
  function drawPennants(ctx, xOf){
    ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
    for(const m of markers){
      if(m.deleted || m.t_ms == null) continue;
      if(m.type !== 'mark' && m.type !== 'direction' && m.type !== 'note') continue;
      const x = xOf(m.t_ms / 1000);
      if(x < PAD_L || x > 10000) continue;
      ctx.fillStyle = VIOLET;
      ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x + 8, PAD_T + 5); ctx.lineTo(x, PAD_T + 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = GREY;
      ctx.fillText(m.type === 'direction' ? String(m.value || '').toUpperCase() : (m.type === 'mark' ? 'M' + (m.value || '') : '✎'), x, PAD_T + 12);
    }
  }

  // ---- panel definitions ----------------------------------------------------
  // Each: {id,title,formula,explain,h, draw(ctx,W,H), readout(), value(t)}
  const rpmScale = H => {
    const maxR = Math.max(30, ...visSamples().map(s => s.rpm)) * 1.06;
    return { yOf: r => PAD_T + (H - PAD_T - PAD_B) * (1 - r / maxR), max: maxR };
  };
  const logY = H => {
    const lo = Math.log(1.6), hi = Math.log(620);
    return r => PAD_T + (H - PAD_T - PAD_B) * (1 - (Math.log(Math.max(1.6, r)) - lo) / (hi - lo));
  };

  const PANELS = {
    timeline: {
      title: 'Wheel speed, second by second', h: 300, cat: 'motion',
      lede: 'Here you see how fast the wheel is turning at every moment, next to the slow-down the calibration predicts.',
      formula: 'Speed timeline + ghost    ·    ω = 6000 / counter [rpm]    ·    ghost: dω̂/dt = −(A + B·ω̂ + K·ω̂^1.5)',
      explain: 'The solid dark line is the measured speed, with a violet dot for each fresh reading (the dots hide when they crowd). Each dashed grey line is a ghost — the calibration played forward from the start of one hands-off slow-down, so a run shows one per slow-down; the faint caption marks where the most recent one reaches zero. Rules on the left are rpm; the dashed rule at 24 rpm is where the wheel\'s own display stops counting. Violet triangles along the top are your markers. While a ghost is running and the newest reading is on screen, the bold figure top-left gives the current distance between the two lines in rpm. Pale red blocks are radio dropouts and the line breaks across them; the labels along the bottom are m:ss of the run.',
      draw(ctx, W, H){
        if(!samples.length){
          ctx.fillStyle = FAINT; ctx.font = '11.5px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('waiting for the first reading — spin the wheel to begin', W / 2, H / 2);
          return;
        }
        const { xOf } = timeAxis(W);
        const { yOf, max } = rpmScale(H);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const r of [0, 10, 24, Math.round(max / 10) * 10].filter((v, i, a) => v <= max && a.indexOf(v) === i)){
          ctx.strokeStyle = r === 24 ? 'rgba(1,22,36,0.22)' : 'rgba(1,22,36,0.07)';
          ctx.setLineDash(r === 24 ? [5, 4] : []);
          ctx.beginPath(); ctx.moveTo(PAD_L, yOf(r)); ctx.lineTo(W - PAD_R, yOf(r)); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = r === 24 ? INK : GREY; ctx.fillText(String(r), PAD_L - 6, yOf(r));
        }
        const p = ensurePipe();
        for(const gh of p.ghosts){
          ctx.setLineDash([6, 4]); ctx.strokeStyle = FAINT; ctx.lineWidth = 1.6;
          ctx.beginPath();
          let pen = false;
          for(const g of gh.pts){
            if(g.t < view.t0 || g.t > view.t1){ pen = false; continue; }
            const px = xOf(g.t), py = yOf(g.rpm);
            pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true;
          }
          ctx.stroke(); ctx.setLineDash([]);
        }
        if(p.ghost && p.ghost.tStop >= view.t0 && p.ghost.tStop <= view.t1){
          ctx.fillStyle = FAINT; ctx.textAlign = 'center'; ctx.font = '9.5px Inter, sans-serif';
          ctx.fillText('ghost stop', xOf(p.ghost.tStop), yOf(0) - 10);
        }
        drawSeries(ctx, xOf, yOf, INK);
        drawPennants(ctx, xOf);
        // live gap badge vs ghost
        if(p.ghost && samples.length){
          const last = samples[samples.length - 1];
          const g = ghostAt(p.ghost, last.t);
          if(g != null && last.t >= view.t0 && last.t <= view.t1){
            const d = last.rpm - g;
            ctx.fillStyle = d >= 0 ? VIOLET : AMBER; ctx.font = '700 11px Inter, sans-serif'; ctx.textAlign = 'left';
            ctx.fillText((d >= 0 ? '+' : '') + fmtSig2(d) + ' rpm vs ghost', PAD_L + 6, PAD_T + 4);
          }
        }
      },
      readout(){
        const s = samples[samples.length - 1];
        if(!s) return '—';
        const p = ensurePipe();
        const g = p.ghost ? ghostAt(p.ghost, s.t) : null;
        return fmtSig2(s.rpm) + ' rpm' + (g != null ? ' · ' + (s.rpm - g >= 0 ? '+' : '') + fmtSig2(s.rpm - g) + ' vs ghost' : '');
      },
      value(t){ const s = nearest(t); return s ? fmtSig2(s.rpm) + ' rpm' : '—'; },
    },

    torque: {
      title: 'Push or drag on the wheel', h: 280, cat: 'forces',
      lede: 'Here you see how hard something is pushing or dragging the wheel beyond the friction and air in the calibration.',
      formula: 'Drive-torque instrument    ·    τ_drive = I·(α_meas − α_base(ω))    ·    I = 1.7×10⁻⁷ kg·m²',
      explain: 'The top half is a live meter: a pale track, a dark zero line down the middle, a grey block for the reference band at the current speed, and one bar out of the middle — violet right for a push, amber left for a drag, grey while it stays inside the band. The scale is deliberately squashed, small readings getting most of the room, so read the bar against the grey band rather than measuring its length. When the newest usable reading is 20 seconds old or more, no bar is drawn at all and the number falls back to a dash. The bottom half is the same reading against the clock: dark line, grey ribbon for the reference band (its height follows the speed), a thin flat line at zero. Pale red stripes are dropouts, and the line breaks wherever a reading could not be worked out.',
      draw(ctx, W, H){
        if(!samples.length){
          ctx.fillStyle = FAINT; ctx.font = '11.5px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('no readings yet — the meter wakes with the first spin', W / 2, H / 2);
          return;
        }
        const p = ensurePipe();
        const gaugeH = 100;   // includes room for a two-line wrapped caption on phones
        const bNow = samples.length ? p.band[samples.length - 1] : floor.tau;   // B(ω) at the current speed
        // --- gauge (horizontal bipolar symlog bar) ---
        const L = Math.max(20, floor.tau * 2);      // linear zone bound [nN*m]
        const MAXT = 1000;
        const gx0 = PAD_L, gx1 = W - PAD_R, gxm = (gx0 + gx1) / 2;
        const symX = tau => {
          const a = Math.abs(tau);
          const u = a <= L ? (a / L) * 0.4 : 0.4 + 0.6 * Math.log(a / L) / Math.log(MAXT / L);
          return gxm + Math.sign(tau) * Math.min(1, u) * (gx1 - gx0) / 2;
        };
        ctx.fillStyle = '#f7f8f8'; ctx.fillRect(gx0, 14, gx1 - gx0, 30);
        // reference band at the CURRENT speed
        ctx.fillStyle = 'rgba(103,115,124,0.22)';
        ctx.fillRect(symX(-bNow), 14, symX(bNow) - symX(-bNow), 30);
        ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(gxm, 10); ctx.lineTo(gxm, 48); ctx.stroke();
        const lc = lastCertified(p.tau);
        const lastTau = lc ? lc.v : null;
        const live = lc != null && samples.length && (samples[samples.length - 1].t - samples[lc.i].t) < 20;
        if(live){
          const inBand = Math.abs(lastTau) <= (p.band[lc.i] != null ? p.band[lc.i] : bNow);
          ctx.fillStyle = inBand ? 'rgba(103,115,124,0.55)' : (lastTau >= 0 ? VIOLET : AMBER);
          const x = symX(lastTau);
          if(lastTau >= 0) ctx.fillRect(gxm, 18, Math.max(2, x - gxm), 22);
          else ctx.fillRect(x, 18, Math.max(2, gxm - x), 22);
        }
        ctx.font = '700 10px Inter, sans-serif'; ctx.textBaseline = 'top';
        ctx.fillStyle = VIOLET; ctx.textAlign = 'right'; ctx.fillText('DRIVE →', gx1, 2);
        ctx.fillStyle = AMBER; ctx.textAlign = 'left'; ctx.fillText('← EXTRA BRAKE', gx0, 2);
        ctx.fillStyle = live ? INK : FAINT; ctx.textAlign = 'center'; ctx.font = '700 15px Inter, sans-serif';
        ctx.fillText(live ? ((lastTau >= 0 ? '+' : '') + fmtSig2(lastTau) + ' nN·m') : '—', gxm, 52);
        caption(ctx, 'grey band = the reference band at this speed, ±' + fmtSig2(bNow) + ' nN·m — a reading inside it is too small to tell apart from the calibration', gxm, 70, gx1 - gx0 - 8, { align: 'center' });

        // --- strip vs shared time axis ---
        const { xOf } = timeAxis(W);
        const top = gaugeH + 6, bot = H - PAD_B;
        const TMAX = 200;
        const yOf = tau => {
          const a = Math.abs(tau), u = a <= L ? (a / L) * 0.35 : 0.35 + 0.65 * Math.log(a / L) / Math.log(TMAX / L);
          return (top + bot) / 2 - Math.sign(tau) * Math.min(1, u) * (bot - top) / 2;
        };
        drawGaps(ctx, W, H, xOf);
        // variable-width reference band ±B(ω_i) along the strip
        ctx.fillStyle = 'rgba(103,115,124,0.14)';
        ctx.beginPath();
        let bandPen = false;
        for(let i = 0; i < samples.length; i++){
          const t = samples[i].t; if(t < view.t0 || t > view.t1) continue;
          const y = yOf(Math.min(TMAX, p.band[i]));
          bandPen ? ctx.lineTo(xOf(t), y) : ctx.moveTo(xOf(t), y); bandPen = true;
        }
        for(let i = samples.length - 1; i >= 0; i--){
          const t = samples[i].t; if(t < view.t0 || t > view.t1) continue;
          ctx.lineTo(xOf(t), yOf(Math.max(-TMAX, -p.band[i])));
        }
        if(bandPen){ ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = 'rgba(1,22,36,0.3)';
        ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0)); ctx.lineTo(W - PAD_R, yOf(0)); ctx.stroke();
        // the strip finally gets a vertical scale (it had none): squashed like
        // the gauge, so the labels name the landmarks rather than a linear axis
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const v of [-TMAX, -L, 0, L, TMAX]){
          ctx.fillStyle = GREY;
          ctx.fillText((v > 0 ? '+' : '') + v, PAD_L - 6, yOf(v));
        }
        ctx.fillStyle = FAINT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('nN·m', PAD_L + 4, top);
        drawTimeGrid(ctx, W, H, xOf);
        ctx.lineWidth = 2.2;
        let pen = false;
        ctx.beginPath(); ctx.strokeStyle = INK;
        for(let i = 0; i < samples.length; i++){
          const t = samples[i].t;
          if(t < view.t0 || t > view.t1) continue;
          if(p.tau[i] == null || p.gap[i]){ pen = false; continue; }
          const x = xOf(t), y = yOf(Math.max(-TMAX, Math.min(TMAX, p.tau[i])));
          pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
        }
        ctx.stroke();
      },
      readout(){
        const lc = lastCertified(ensurePipe().tau);
        return lc == null ? '—' : (lc.v >= 0 ? '+' : '') + fmtSig2(lc.v) + ' nN·m';
      },
      value(t){
        const p = ensurePipe(); const i = nearestIdx(t);
        return (i < 0 || p.tau[i] == null) ? '—' : (p.tau[i] >= 0 ? '+' : '') + fmtSig2(p.tau[i]) + ' nN·m';
      },
    },

    impulse: {
      title: 'Push or drag, added up', h: 220, cat: 'forces',
      lede: 'Here you see that same push or drag added up second by second — the running total since the run began.',
      formula: 'Drive impulse J(t)    ·    J(t) = ∫ τ_drive dt  [nN·m·s]    ·    J_out = ∫ sign(τ)·max(|τ|−B(ω), 0) dt',
      explain: 'The violet line is the running total counted from the start of the run: it climbs while there is a push, sinks while there is a drag, holds level where a reading could not be worked out, and breaks across a dropout. Only in the full-run view does it start from zero at the left edge — in a zoomed or live window it enters at whatever total it had already reached. The grey band around it is how far this total can drift on the calibration alone, and it only ever widens. The text along the top counts how many seconds the reading spent outside the reference band, out of how many seconds could be measured at all; then the longest single stretch, how many separate stretches, and what those stretches add up to once the width of the band is subtracted from every reading.',
      draw(ctx, W, H){
        if(!samples.length){
          ctx.fillStyle = FAINT; ctx.font = '11.5px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('the running total starts with the first reading', W / 2, H / 2);
          return;
        }
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        // scale to the VISIBLE window — a zoom must magnify, not flatten
        const ext = visExtent(p.imp, i => p.impSig[i]);
        const maxJ = Math.max(5, ext ? Math.max(Math.abs(ext.lo), Math.abs(ext.hi)) : 0) * 1.1;
        const yOf = v => PAD_T + (H - PAD_T - PAD_B) * (0.5 - v / (2 * maxJ));
        ctx.strokeStyle = 'rgba(1,22,36,0.3)';
        ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0)); ctx.lineTo(W - PAD_R, yOf(0)); ctx.stroke();
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const v of [-maxJ, 0, maxJ]){ ctx.fillStyle = GREY; ctx.fillText(fmtSig2(v), PAD_L - 6, yOf(v)); }
        // model-uncertainty ribbon ±σ·∫|τ_base|dt (same convention as the work ledger)
        ctx.fillStyle = 'rgba(103,115,124,0.13)';
        ctx.beginPath(); let started = false;
        for(let i = 0; i < samples.length; i++){
          const t = samples[i].t; if(t < view.t0 || t > view.t1) continue;
          const y = yOf(p.imp[i] + p.impSig[i]);
          started ? ctx.lineTo(xOf(t), y) : ctx.moveTo(xOf(t), y); started = true;
        }
        for(let i = samples.length - 1; i >= 0; i--){
          const t = samples[i].t; if(t < view.t0 || t > view.t1) continue;
          ctx.lineTo(xOf(t), yOf(p.imp[i] - p.impSig[i]));
        }
        if(started){ ctx.closePath(); ctx.fill(); }
        ctx.lineWidth = 2;
        let pen = false; ctx.beginPath(); ctx.strokeStyle = VIOLET;
        for(let i = 0; i < samples.length; i++){
          const t = samples[i].t;
          if(t < view.t0 || t > view.t1){ pen = false; continue; }
          if(p.gap[i]) pen = false;
          pen ? ctx.lineTo(xOf(t), yOf(p.imp[i])) : ctx.moveTo(xOf(t), yOf(p.imp[i])); pen = true;
        }
        ctx.stroke();
        // outside-band ledger — the honest aggregate, stamped onto the chart
        // (suppressed until there is anything measured: jargon on emptiness was
        // the first live impression of the whole panel)
        const o = p.outside;
        if(o.certified_s > 0){
          const pct = Math.round(o.s / o.certified_s * 100);
          const y2 = caption(ctx, 'outside the reference band: ' + fmtSig2(o.s) + ' s of the ' + fmtSig2(o.certified_s) + ' s that could be measured (' + pct + '%) · longest stretch '
            + fmtSig2(o.longest_s) + ' s · ' + o.count + ' stretch' + (o.count === 1 ? '' : 'es')
            + ' · ' + (o.jout >= 0 ? '+' : '') + fmtSig2(o.jout) + ' nN·m·s once the band is subtracted', PAD_L + 4, PAD_T, W - PAD_L - PAD_R - 8, { bold: true });
          caption(ctx, 'nN·m·s · grey band = how far this total could drift on the calibration alone', PAD_L + 4, y2, W - PAD_L - PAD_R - 8, { color: FAINT, maxLines: 1 });
        }
      },
      readout(){
        const p = ensurePipe();
        if(!p.imp.length) return '—';
        const i = p.imp.length - 1;
        return (p.imp[i] >= 0 ? '+' : '') + fmtSig2(p.imp[i]) + ' ± ' + fmtSig2(p.impSig[i]) + ' nN·m·s';
      },
      value(t){ const p = ensurePipe(); const i = nearestIdx(t); return i < 0 ? '—' : fmtSig2(p.imp[i]) + ' nN·m·s'; },
    },

    wheel3d: {
      title: 'The wheel itself, in 3D', h: 0, dom: true, cat: 'motion',
      lede: 'Here you see the wheel turning at the speed the measurement shows right now — and the LED on its dial lighting up, like the real device.',
      formula: '3D model: egely_wheel_20230814v2.gltf (1:1 scan) · LED n = n rpm · 6 rpm = 100% vitality quotient',
      explain: 'The model is the real device: housing and foil wheel at true proportions. The figure below is the measured reading itself; the rotation glides between readings, which arrive about every 0.7 s. During a live run or a replay it follows the newest reading; click a chart to plant the cursor and it shows that moment instead. Drag the picture to look around it, hold Ctrl and scroll to zoom. The dial on the housing behaves like the real one: LED n lights while the wheel does n turns per minute — red up to 6, yellow to 12, green to 24, and above 24 rpm the top LED simply stays lit. The lit LED pulses once for every completed revolution; at high speed the pulses blend into a steady glow.',
      renderDom(el){
        // idempotent: the render loop lives its own life once mounted
        if(el.dataset.rw3) return;
        el.dataset.rw3 = '1';
        el.innerHTML = '<div class="rsp-empty">Loading the 3D viewer…</div>';
        import('./research-wheel3d.js').then(m => {
          if(!el.isConnected) { delete el.dataset.rw3; return; }
          el.innerHTML = '';
          m.createWheel3d(el, {
            rpm: () => {
              // the moment the panel must show: the planted cursor, else the
              // head. null = no reading exists — the viewer must say so, a
              // fake "0 rpm" would violate the blank-state rule
              if(view.cursorT != null){ const s = nearest(view.cursorT); return s ? s.rpm : null; }
              const s = samples[samples.length - 1];
              return s ? s.rpm : null;
            },
          });
        }).catch(err => {
          console.error('wheel3d load:', err);
          // keep the guard SET ('err') — paintPanel re-enters renderDom every
          // tick, and clearing the guard here meant an endless 4 Hz reload
          // flicker; the Retry button is the only path back
          el.dataset.rw3 = 'err';
          el.innerHTML = '<div class="rsp-empty">Could not load the 3D viewer. The measurement is unaffected. '
            + '<button type="button" class="rsp-retry" data-rw3-retry>Retry</button></div>';
          const b = el.querySelector('[data-rw3-retry]');
          if(b) b.addEventListener('click', () => { delete el.dataset.rw3; PANELS.wheel3d.renderDom(el); });
        });
      },
      readout(){
        const s = samples[samples.length - 1];
        if(!s) return '—';
        const led = s.rpm >= 0.5 ? Math.min(24, Math.round(s.rpm)) : 0;
        return fmtSig2(s.rpm) + ' rpm' + (led ? ' · LED ' + led : '');
      },
      value(t){ const s = nearest(t); return s ? fmtSig2(s.rpm) + ' rpm' : '—'; },
    },

    logspeed: {
      title: 'Speed, with the slow end stretched', h: 260, cat: 'motion',
      lede: 'Here you see the same speed over time, redrawn so the wheel\'s last slow turns get as much room as the fast start.',
      formula: 'Log-scale speed    ·    y = log ω    ·    ω = 6000 / counter [rpm]',
      explain: 'The solid dark line and its violet dots are the same measured speed as the main chart, drawn only above 1.6 rpm. The dashed grey lines are the same ghosts — one per hands-off slow-down — each ending where it drops below 1.6 rpm, the bottom of this scale. The rungs on the left (2, 5, 10, 24, 50, 100, 200, 400 rpm) are spaced by multiplying rather than adding, so each step down is roughly half the speed; the dashed 24 rpm rung is the display limit. Small grey squares parked on the bottom edge are readings below 1.6 rpm, pale red blocks are dropouts, and the labels along the bottom are m:ss.',
      draw(ctx, W, H){
        const { xOf } = timeAxis(W);
        const yOf = logY(H);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const r of [2, 5, 10, 24, 50, 100, 200, 400]){
          ctx.strokeStyle = r === 24 ? 'rgba(1,22,36,0.22)' : 'rgba(1,22,36,0.07)';
          ctx.setLineDash(r === 24 ? [5, 4] : []);
          ctx.beginPath(); ctx.moveTo(PAD_L, yOf(r)); ctx.lineTo(W - PAD_R, yOf(r)); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = r === 24 ? INK : GREY; ctx.fillText(String(r), PAD_L - 6, yOf(r));
        }
        const p = ensurePipe();
        for(const gh of p.ghosts){
          ctx.setLineDash([6, 4]); ctx.strokeStyle = FAINT; ctx.lineWidth = 1.6;
          ctx.beginPath(); let pen = false;
          for(const g of gh.pts){
            if(g.t < view.t0 || g.t > view.t1 || g.rpm < 1.6){ pen = false; continue; }
            pen ? ctx.lineTo(xOf(g.t), yOf(g.rpm)) : ctx.moveTo(xOf(g.t), yOf(g.rpm)); pen = true;
          }
          ctx.stroke(); ctx.setLineDash([]);
        }
        const vs = visSamples().filter(s => s.rpm >= 1.6);
        if(vs.length){
          ctx.strokeStyle = INK; ctx.lineWidth = 2;
          strokeMonotone(ctx, vs.map(s => ({ x: s.t, y: s.rpm })), t => xOf(t), yOf);
          ctx.fillStyle = VIOLET;
          const dense = vs.length > 1 && (xOf(vs[vs.length - 1].t) - xOf(vs[0].t)) / vs.length < 3;
          if(!dense) for(const s of vs){ ctx.beginPath(); ctx.arc(xOf(s.t), yOf(s.rpm), 2.2, 0, Math.PI * 2); ctx.fill(); }
        }
        // stopped glyphs pinned at the floor (0 cannot log)
        ctx.fillStyle = FAINT;
        for(const s of visSamples()) if(s.rpm < 1.6){ ctx.fillRect(xOf(s.t) - 1.5, H - PAD_B - 4, 3, 3); }
        caption(ctx, 'stretched scale — squares at the floor = below 1.6 rpm (near standstill)', PAD_L + 4, PAD_T, W - PAD_L - PAD_R - 8, { color: FAINT });
      },
      readout(){ const s = samples[samples.length - 1]; return s ? fmtSig2(s.rpm) + ' rpm' : '—'; },
      value(t){ const s = nearest(t); return s ? fmtSig2(s.rpm) + ' rpm' : '—'; },
    },

    deviation: {
      title: 'Faster or slower than the calibration', h: 190, cat: 'motion',
      lede: 'Here you see how much faster or slower the wheel turns than the calibration says, in percent, during a hands-off slow-down.',
      formula: 'Ghost deviation strip    ·    Δ = 100 · (ω / ω̂ − 1) [%]',
      explain: 'The dashed line across the middle is 0%: the wheel turning exactly at the calibrated speed. The band around it is the reference band — twice the calibration\'s repeatability figure, never narrower than ±5% — and the caption top-left gives its width and whether it comes from this room\'s calibration or from the factory model. The violet line is the running difference, above the middle for faster and below for slower, and it is drawn only while a hands-off slow-down is under way, so it stops and restarts between slow-downs and across dropouts. The numbers on the left are percent, and a reading past the top or bottom is pinned to the edge rather than dropped. Before any hands-off slow-down exists there is no line at all, only a grey note saying so.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf);
        if(!p.ghosts.length){
          ctx.fillStyle = FAINT; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('nothing to compare yet — spin the wheel above 24 rpm and let go', W / 2, H / 2);
          return;
        }
        const band = Math.max(5, (coef.sigma_rel || SIGMA_DEFAULT) * 200);   // ±2σ in %
        const DEV = Math.max(15, band * 2);
        const yOf = d => PAD_T + (H - PAD_T - PAD_B) * (0.5 - Math.max(-DEV, Math.min(DEV, d)) / (2 * DEV));
        // grey like every other reference band — green is the app's success
        // colour, and "inside the band" is not a pass, just not distinguishable
        ctx.fillStyle = 'rgba(103,115,124,0.14)';
        ctx.fillRect(PAD_L, yOf(band), W - PAD_L - PAD_R, yOf(-band) - yOf(band));
        ctx.strokeStyle = 'rgba(1,22,36,0.3)'; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0)); ctx.lineTo(W - PAD_R, yOf(0)); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const d of [-DEV, 0, DEV]){ ctx.fillStyle = GREY; ctx.fillText((d > 0 ? '+' : '') + Math.round(d) + '%', PAD_L - 6, yOf(d)); }
        ctx.strokeStyle = VIOLET; ctx.lineWidth = 2;
        ctx.beginPath(); let pen = false;
        const [i0, i1] = visRange();
        for(let i = i0; i <= i1; i++){
          const s = samples[i];
          const g = ghostSegAt(p, s.t);   // every coast's own ghost speaks in its own window
          if(g == null || g < 2 || p.gap[i]){ pen = false; continue; }
          const d = (s.rpm / g - 1) * 100;
          pen ? ctx.lineTo(xOf(s.t), yOf(d)) : ctx.moveTo(xOf(s.t), yOf(d)); pen = true;
        }
        ctx.stroke();
        caption(ctx, 'band = ±' + Math.round(band) + '% — how closely the ' + (floor.factory ? 'factory' : 'room') + ' calibration repeats itself · drawn only during a hands-off slow-down, down to 2 rpm', PAD_L + 4, PAD_T, W - PAD_L - PAD_R - 8, { color: FAINT });
      },
      readout(){
        const p = ensurePipe();
        const s = samples[samples.length - 1];
        if(!p.ghosts.length || !s) return 'no slow-down yet';
        const g = ghostSegAt(p, s.t);
        if(g == null || g < 2) return '— only during a slow-down';
        const d = (s.rpm / g - 1) * 100;
        return (d >= 0 ? '+' : '') + fmtSig2(d) + ' %';
      },
      value(t){
        const p = ensurePipe(); const s = nearest(t);
        if(!p.ghosts.length || !s) return '—';
        const g = ghostSegAt(p, s.t);
        return (g == null || g < 2) ? '—' : ((s.rpm / g - 1) * 100 >= 0 ? '+' : '') + fmtSig2((s.rpm / g - 1) * 100) + ' %';
      },
    },

    phase: {
      title: 'Slow-down at each speed', h: 260, cat: 'forces',
      lede: 'Here you see one dot per reading: how fast the wheel was losing speed at the speed it was turning.',
      formula: 'Deceleration–speed phase map    ·    −dω/dt vs ω    ·    baseline: A + B·ω + K·ω^1.5 [rpm/s]',
      explain: 'Left to right is the wheel\'s speed in rpm; bottom to top is how fast it was losing speed, in rpm per second, and the darker line labelled "holding speed" is where it would neither slow nor gain. The dashed dark curve is the calibration — the slowing this wheel did on its own at each speed. It was fitted up to 24 rpm, so to the right of that mark it is the same formula carried on past where it was ever measured. Each dot is one reading, placed at the speed it was turning: violet when it slowed clearly less than the curve, amber when clearly more, grey when close to it; older dots are faint, newer solid, and the last one wears a ring. The vertical scale is fixed from −2 to +4 rpm per second and readings beyond either end are pinned to the edge. This picture has no clock — the time window and the zoom above do not change it.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const RPM_MAX = Math.max(30, ...samples.filter((s, i) => p.decel[i] != null).map(s => s.rpm)) * 1.05;
        const D_MIN = -2, D_MAX = 4;
        const xOf = r => PAD_L + r / RPM_MAX * (W - PAD_L - PAD_R);
        const yOf = d => PAD_T + (H - PAD_T - PAD_B) * (1 - (Math.max(D_MIN, Math.min(D_MAX, d)) - D_MIN) / (D_MAX - D_MIN));
        ctx.font = '10px Inter, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
        for(let d = D_MIN; d <= D_MAX; d++){
          ctx.strokeStyle = d === 0 ? 'rgba(1,22,36,0.3)' : 'rgba(1,22,36,0.06)';
          ctx.beginPath(); ctx.moveTo(PAD_L, yOf(d)); ctx.lineTo(W - PAD_R, yOf(d)); ctx.stroke();
          ctx.fillStyle = GREY; ctx.fillText(String(d), PAD_L - 6, yOf(d));
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for(let r = 0; r <= RPM_MAX; r += RPM_MAX > 60 ? 20 : 5){ ctx.fillStyle = FAINT; ctx.fillText(String(Math.round(r)), xOf(r), H - PAD_B + 5); }
        // the only chart with two measured axes — both get named (they had no
        // label at all, which made the whole picture unreadable cold)
        ctx.fillStyle = GREY; ctx.font = '10.5px Inter, sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('wheel speed [rpm] →', W - PAD_R, H - PAD_B - 3);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('↑ how hard it was slowing [rpm/s]', PAD_L + 4, PAD_T + 2);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = FAINT; ctx.textAlign = 'left';
        ctx.fillText('holding speed', PAD_L + 4, yOf(0) + 4);
        // baseline + tint zones
        ctx.setLineDash([6, 4]); ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
        ctx.beginPath();
        for(let r = 0.5; r <= RPM_MAX; r += RPM_MAX / 120){
          const d = decelOf(coef, r);
          r <= 0.6 ? ctx.moveTo(xOf(r), yOf(d)) : ctx.lineTo(xOf(r), yOf(d));
        }
        ctx.stroke(); ctx.setLineDash([]);
        // dots, time-faded
        const idxs = [];
        for(let i = 0; i < samples.length; i++) if(p.decel[i] != null) idxs.push(i);
        const n = idxs.length;
        idxs.forEach((i, k) => {
          const alpha = 0.15 + 0.75 * (k / Math.max(1, n - 1));
          const d = p.decel[i];
          const base = decelOf(coef, samples[i].rpm);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = d < base - Math.max(0.15, base * 0.3) ? VIOLET : d > base + Math.max(0.15, base * 0.35) ? AMBER : GREY;
          ctx.beginPath(); ctx.arc(xOf(samples[i].rpm), yOf(d), 2.4, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        if(n){
          const i = idxs[n - 1];
          ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(xOf(samples[i].rpm), yOf(p.decel[i]), 5, 0, Math.PI * 2); ctx.stroke();
        }
      },
      readout(){
        const p = ensurePipe();
        for(let i = samples.length - 1; i >= 0; i--) if(p.decel[i] != null)
          return fmtSig2(p.decel[i]) + ' rpm/s @ ' + fmtSig2(samples[i].rpm) + ' rpm';
        return '—';
      },
      value(t){
        const p = ensurePipe(); const i = nearestIdx(t);
        return (i < 0 || p.decel[i] == null) ? '—' : fmtSig2(p.decel[i]) + ' rpm/s';
      },
    },

    byspeed: {
      title: 'Push or drag, sorted by speed', h: 240, cat: 'forces',
      lede: 'Here you see the same push or drag sorted into speed bands, averaged over every reading of the whole recording.',
      formula: 'Drive by speed band    ·    mean τ_drive per ω-band ± sd    ·    faded = outside the calibration\'s fitted range',
      explain: 'The picture is cut into eight speed bands, labelled in rpm along the bottom; up and down is the average push or drag inside that band, with zero as the flat line across the middle. A band holding at least three readings gets a bar — violet up for push, amber down for drag — a grey block behind it for the average reference band there, a thin upright line for how much its readings scattered, and an "n=" count on top; a thinner band prints its count instead of a bar, so it never looks like a zero result. The fastest bands sit on a tinted background and are drawn half-faded because the calibration was never measured up there, and the caption says where its fitted range ends. The bars cover the whole recording — this picture has no clock either.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const BINS = [[0, 2], [2, 5], [5, 10], [10, 17], [17, 24], [24, 48], [48, 96], [96, Infinity]];
        const wmax = coef.w_fit_max != null ? coef.w_fit_max : 24;
        const agg = BINS.map(() => ({ sum: 0, sum2: 0, n: 0, bsum: 0 }));
        for(let i = 0; i < samples.length; i++){
          if(p.tau[i] == null) continue;
          const w = samples[i].rpm;
          for(let b = 0; b < BINS.length; b++) if(w >= BINS[b][0] && w < BINS[b][1]){
            const a = agg[b]; a.sum += p.tau[i]; a.sum2 += p.tau[i] * p.tau[i]; a.n++; a.bsum += p.band[i]; break;
          }
        }
        const stats = agg.map((a, b) => {
          if(a.n < 3) return { n: a.n };
          const mean = a.sum / a.n;
          return { n: a.n, mean, sd: Math.sqrt(Math.max(0, a.sum2 / a.n - mean * mean)), band: a.bsum / a.n,
                   extra: BINS[b][0] >= Math.min(24, wmax) };
        });
        const binW = (W - PAD_L - PAD_R) / BINS.length;
        const xC = b => PAD_L + binW * (b + 0.5);
        const maxY = Math.max(10, ...stats.filter(s => s.mean != null).map(s => Math.max(Math.abs(s.mean) + s.sd, s.band))) * 1.15;
        const yOf = v => PAD_T + (H - PAD_T - PAD_B) * (0.5 - Math.max(-maxY, Math.min(maxY, v)) / (2 * maxY));
        ctx.strokeStyle = 'rgba(1,22,36,0.3)';
        ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0)); ctx.lineTo(W - PAD_R, yOf(0)); ctx.stroke();
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const v of [-maxY, 0, maxY]){ ctx.fillStyle = GREY; ctx.fillText(fmtSig2(v), PAD_L - 6, yOf(v)); }
        for(let b = 0; b < BINS.length; b++){
          const s = stats[b];
          const x0 = PAD_L + binW * b + 3, x1 = PAD_L + binW * (b + 1) - 3;
          const extra = BINS[b][0] >= Math.min(24, wmax);
          if(extra){   // extrapolation zone tint (honesty: the model was never fitted here)
            ctx.fillStyle = 'rgba(1,22,36,0.035)';
            ctx.fillRect(x0 - 2, PAD_T, x1 - x0 + 4, H - PAD_T - PAD_B);
          }
          if(s.mean == null){
            // empty bins must not read as "zero deviation"
            ctx.fillStyle = FAINT; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(s.n ? 'n=' + s.n : 'no data', xC(b), (PAD_T + H - PAD_B) / 2);
          } else {
            ctx.globalAlpha = extra ? 0.4 : 1;
            ctx.fillStyle = 'rgba(103,115,124,0.16)';
            ctx.fillRect(x0, yOf(s.band), x1 - x0, yOf(-s.band) - yOf(s.band));
            ctx.fillStyle = s.mean >= 0 ? VIOLET : AMBER;
            const y0 = yOf(0), y1 = yOf(s.mean);
            ctx.fillRect(x0 + 4, Math.min(y0, y1), x1 - x0 - 8, Math.max(2, Math.abs(y1 - y0)));
            ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(xC(b), yOf(s.mean - s.sd)); ctx.lineTo(xC(b), yOf(s.mean + s.sd)); ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = GREY; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText('n=' + s.n, xC(b), PAD_T + 2);
          }
          ctx.fillStyle = FAINT; ctx.font = '9.5px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(isFinite(BINS[b][1]) ? BINS[b][0] + '–' + BINS[b][1] : BINS[b][0] + '+', xC(b), H - PAD_B + 5);
        }
        caption(ctx, 'nN·m per rpm band · grey = the reference band there · faded = the calibration never measured above ' + fmtSig2(Math.min(24, wmax)) + ' rpm', PAD_L + 4, H - PAD_B - 30, W - PAD_L - PAD_R - 8, { color: FAINT });
      },
      readout(){
        const p = ensurePipe();
        // strongest MEASURED-range band (extrapolated bands never headline)
        const BINS = [[0, 2], [2, 5], [5, 10], [10, 17], [17, 24]];
        let best = null;
        const agg = BINS.map(() => ({ sum: 0, n: 0 }));
        for(let i = 0; i < samples.length; i++){
          if(p.tau[i] == null) continue;
          const w = samples[i].rpm;
          for(let b = 0; b < BINS.length; b++) if(w >= BINS[b][0] && w < BINS[b][1]){ agg[b].sum += p.tau[i]; agg[b].n++; break; }
        }
        BINS.forEach((bin, b) => {
          if(agg[b].n < 3) return;
          const mean = agg[b].sum / agg[b].n;
          if(!best || Math.abs(mean) > Math.abs(best.mean)) best = { bin, mean };
        });
        return best ? (best.mean >= 0 ? '+' : '') + fmtSig2(best.mean) + ' nN·m @ ' + best.bin[0] + '–' + best.bin[1] + ' rpm' : '—';
      },
      value(){ return ''; },
    },

    revs: {
      title: 'Turns counted since the start', h: 220, cat: 'motion',
      lede: 'Here you see a running count of the turns the wheel has been measured making; it only ever goes up.',
      formula: 'Revolutions integral N(t)    ·    N(t) = ∫ ω/60 dt  [rev]',
      explain: 'The solid dark line is the running total of turns: steep while the wheel spins fast, flat while it stands still. The dashed grey line picks up that total at the moment the last hands-off slow-down began and carries it on the way the calibration would coast the wheel down, so the two counts can be read side by side. The numbers on the left are turns. Pale red blocks are dropouts, and the total holds level across them, because turns nobody measured are not counted; the labels along the bottom are m:ss.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        // window-scaled: zooming into a slow stretch must show ITS accumulation,
        // not a flat line under the full-run total
        const ext = visExtent(p.revs);
        const lo = ext ? ext.lo : 0;
        const span = Math.max(0.5, ext ? ext.hi - ext.lo : 1);
        const yOf = v => PAD_T + (H - PAD_T - PAD_B) * (1 - (v - lo + span * 0.04) / (span * 1.1));
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        // decimals follow the tick step — in a near-flat window whole numbers
        // would print the same label three times
        const dec = span / 2 >= 2 ? 0 : span / 2 >= 0.5 ? 1 : 2;
        for(const f of [0, 0.5, 1]){ const v = lo + span * f; ctx.fillStyle = GREY; ctx.fillText(v.toFixed(dec), PAD_L - 6, yOf(v)); }
        ctx.fillStyle = FAINT; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('turns', PAD_L + 4, PAD_T);
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); let pen = false;
        for(let i = 0; i < samples.length; i++){
          const t = samples[i].t;
          if(t < view.t0 || t > view.t1){ pen = false; continue; }
          pen ? ctx.lineTo(xOf(t), yOf(p.revs[i])) : ctx.moveTo(xOf(t), yOf(p.revs[i])); pen = true;
        }
        ctx.stroke();
        // ghost N̂: integrate the ghost curve from its anchor
        if(p.ghost){
          let acc = null;
          for(let i = 0; i < samples.length; i++) if(samples[i].t >= p.ghost.t0){ acc = p.revs[i]; break; }
          if(acc != null){
            ctx.setLineDash([6, 4]); ctx.strokeStyle = FAINT; ctx.lineWidth = 1.6;
            ctx.beginPath(); let gpen = false, gN = acc, prev = null;
            for(const g of p.ghost.pts){
              if(prev) gN += (g.rpm + prev.rpm) / 120 * (g.t - prev.t);
              prev = g;
              if(g.t < view.t0 || g.t > view.t1){ gpen = false; continue; }
              gpen ? ctx.lineTo(xOf(g.t), yOf(gN)) : ctx.moveTo(xOf(g.t), yOf(gN)); gpen = true;
            }
            ctx.stroke(); ctx.setLineDash([]);
          }
        }
      },
      readout(){ const p = ensurePipe(); return p.revs.length ? Math.round(p.revs[p.revs.length - 1]) + ' rev' : '—'; },
      value(t){ const p = ensurePipe(); const i = nearestIdx(t); return i < 0 ? '—' : Math.round(p.revs[i]) + ' rev'; },
    },

    energy: {
      title: 'Energy stored in the spinning wheel', h: 220, cat: 'energy',
      lede: 'Here you see how much energy of motion the wheel carries at each moment, in millionths of a joule.',
      formula: 'Kinetic energy E(t)    ·    E = ½ · I · ω²    ·    0.54 µJ at 24 rpm',
      explain: 'The line is the wheel\'s energy at every reading: it climbs whenever the wheel speeds up and falls as it slows. The faint dashed horizontal line, captioned "0.54 µJ = 24 rpm", marks the energy the wheel holds at the top of the device\'s own dial. Numbers down the left are millionths of a joule. Time runs left to right with m:ss along the bottom; pale red stripes mark dropouts, and the line is drawn straight through them here. Drag across any stretch to read how much energy the wheel gained or lost there.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        // window-scaled: one 300-rpm hand spin is ~150 µJ against 0.54 µJ at
        // 24 rpm — on a full-run scale the whole hands-off part sat ON the axis
        const ext = visExtent(p.energy);
        const maxE = Math.max(0.6, ext ? ext.hi : 0) * 1.06;
        const yOf = v => PAD_T + (H - PAD_T - PAD_B) * (1 - v / maxE);
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const f of [0, 0.5, 1]){ ctx.fillStyle = GREY; ctx.fillText(fmtSig2(maxE * f) + '', PAD_L - 6, yOf(maxE * f)); }
        if(0.54 < maxE){
          ctx.strokeStyle = 'rgba(1,22,36,0.15)'; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0.54)); ctx.lineTo(W - PAD_R, yOf(0.54)); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = FAINT; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = '9.5px Inter, sans-serif';
          ctx.fillText('0.54 µJ = 24 rpm', PAD_L + 4, yOf(0.54) - 2);
        }
        ctx.strokeStyle = VIOLET; ctx.lineWidth = 2;
        ctx.beginPath(); let pen = false;
        for(let i = 0; i < samples.length; i++){
          const t = samples[i].t;
          if(t < view.t0 || t > view.t1){ pen = false; continue; }
          pen ? ctx.lineTo(xOf(t), yOf(p.energy[i])) : ctx.moveTo(xOf(t), yOf(p.energy[i])); pen = true;
        }
        ctx.stroke();
        ctx.fillStyle = GREY; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('µJ', PAD_L + 4, PAD_T);
      },
      readout(){ const p = ensurePipe(); const e = p.energy[p.energy.length - 1]; return e == null ? '—' : fmtSig2(e) + ' µJ'; },
      value(t){ const p = ensurePipe(); const i = nearestIdx(t); return i < 0 ? '—' : fmtSig2(p.energy[i]) + ' µJ'; },
    },

    work: {
      title: 'Energy in or out, beyond the calibration', h: 220, cat: 'energy',
      lede: 'Here you see the energy the wheel gained or lost beyond the drag the calibration expects, added up over the run.',
      formula: 'Work ledger W(t)    ·    W(t) = ΔE(t) + ∫ τ_base(ω)·ω dt    ·    [µJ]',
      explain: 'The line is the running total in millionths of a joule, and it breaks wherever the radio dropped out. The thin horizontal line across the middle is zero, with plus and minus on the scale at the left. The grey band is drawn around the line itself, not around zero: it shows how far the calibration\'s own repeatability could shift the total, and it widens the longer the wheel has been turning. The caption top-left states the percentage used. Pale red stripes mark the dropouts. Spinning the wheel by hand enters this total as energy in, like anything else that moves it.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        const sig = coef.sigma_rel || SIGMA_DEFAULT;
        // window-scaled, same rule as the impulse panel
        const extW = visExtent(p.work, i => p.dissip[i] * sig);
        const maxW = Math.max(0.5, extW ? Math.max(Math.abs(extW.lo), Math.abs(extW.hi)) : 0) * 1.1;
        const yOf = v => PAD_T + (H - PAD_T - PAD_B) * (0.5 - v / (2 * maxW));
        ctx.strokeStyle = 'rgba(1,22,36,0.3)';
        ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0)); ctx.lineTo(W - PAD_R, yOf(0)); ctx.stroke();
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const v of [-maxW, 0, maxW]){ ctx.fillStyle = GREY; ctx.fillText(fmtSig2(v), PAD_L - 6, yOf(v)); }
        // uncertainty ribbon ±σ_cal·D(t)
        ctx.fillStyle = 'rgba(103,115,124,0.13)';
        ctx.beginPath(); let started = false;
        for(let i = 0; i < samples.length; i++){
          const t = samples[i].t; if(t < view.t0 || t > view.t1) continue;
          const y = yOf(p.work[i] + p.dissip[i] * sig);
          started ? ctx.lineTo(xOf(t), y) : ctx.moveTo(xOf(t), y); started = true;
        }
        for(let i = samples.length - 1; i >= 0; i--){
          const t = samples[i].t; if(t < view.t0 || t > view.t1) continue;
          ctx.lineTo(xOf(t), yOf(p.work[i] - p.dissip[i] * sig));
        }
        if(started){ ctx.closePath(); ctx.fill(); }
        ctx.lineWidth = 2;
        let pen = false; ctx.beginPath(); ctx.strokeStyle = VIOLET;
        for(let i = 0; i < samples.length; i++){
          const t = samples[i].t;
          if(t < view.t0 || t > view.t1){ pen = false; continue; }
          if(p.gap[i]) { pen = false; }
          pen ? ctx.lineTo(xOf(t), yOf(p.work[i])) : ctx.moveTo(xOf(t), yOf(p.work[i])); pen = true;
        }
        ctx.stroke();
        caption(ctx, 'µJ · grey band = how far the calibration\'s own repeatability (±' + Math.round(sig * 100) + '%) could shift this total', PAD_L + 4, PAD_T, W - PAD_L - PAD_R - 8, { color: FAINT });
      },
      readout(){
        const p = ensurePipe();
        if(!p.work.length) return '—';
        const i = p.work.length - 1;
        const sig = coef.sigma_rel || SIGMA_DEFAULT;
        return (p.work[i] >= 0 ? '+' : '') + fmtSig2(p.work[i]) + ' ± ' + fmtSig2(p.dissip[i] * sig) + ' µJ';
      },
      value(t){ const p = ensurePipe(); const i = nearestIdx(t); return i < 0 ? '—' : fmtSig2(p.work[i]) + ' µJ'; },
    },

    coasts: {
      title: 'Hands-off slow-downs, timed', h: 0, dom: true, cat: 'compare',
      lede: 'Here you see every hands-off slow-down timed like a stopwatch lap, next to the time the calibration predicts.',
      formula: 'Coast comparator    ·    R = T_meas(24→5) / T_cal(24→5)    ·    T_cal = ' + '—',
      explain: 'One card per hands-off slow-down, newest on top, headed by its number, the stretch of the run it covered as m:ss, and the fastest the wheel got. Inside are two small bars, 24→10 and 24→5: the violet fill is how long the wheel really took and the dark tick on the track is where the reference time falls, with the seconds printed beside each. The big × on the right is the measured 24→5 time divided by the reference one. The dim line below lists four speed gates (24→10, 24→5, 12→6, 6→3) with their measured seconds and the difference against the reference — violet when longer, amber when shorter. A faded, struck-through card marked "interrupted" is one where the recording was stopped before the slow-down had played out, so its gate times are incomplete. The final grey line spells out the reference times for all four gates and names the reference it used: this room\'s calibration, or the factory model if the room has not been calibrated.',
      renderDom(el){
        if(!coasts.length){ el.innerHTML = '<div class="rsp-empty">no hands-off coast yet — spin the wheel above 24 rpm and let go</div>'; return; }
        const rows = coasts.map(s => {
          const from = s.t_start_ms / 1000, to = s.t_end_ms / 1000;
          // band times are immutable once a coast closed — cache per coast
          // (WeakMap, NOT a property: the coast objects get serialized on save)
          let bands = coastBands.get(s);
          if(!bands){
            const curve = buildCurve(samples.map(p => ({ t: p.t * 1000, rpm: p.rpm })), s.t_start_ms, s.t_end_ms);
            // clip to the winning decay (curve.dur): a re-flick's SECOND decay
            // inside the same spin window must not supply a gate crossing
            const clean = curve ? curve.pts.filter(pt => pt.x >= 0 && (curve.dur == null || pt.x <= curve.dur + 0.01)) : null;
            const at = rpm => clean ? crossTime(clean, rpm) : null;
            const t12 = at(12), t6 = at(6), t3 = at(3);
            bands = {
              t2410: at(10),
              t245: s.T24_5 != null ? s.T24_5 : (curve && curve.T245 != null ? curve.T245 : null),
              t12_6: (t6 != null && t12 != null) ? t6 - t12 : null,
              t6_3: (t3 != null && t6 != null) ? t3 - t6 : null,
            };
            coastBands.set(s, bands);
          }
          const { t2410, t245 } = bands;
          const ratio = t245 != null && T_CAL.t24_5 ? t245 / T_CAL.t24_5 : null;
          const bar = (v, cal) => {
            if(v == null || !cal) return '<span class="rsp-dim">—</span>';
            const w = Math.min(100, v / (cal * 1.8) * 100), wc = Math.min(100, 100 / 1.8);
            return `<span class="rsp-bars"><i style="width:${w}%"></i><u style="left:${wc}%"></u></span> ${v.toFixed(1)}s`;
          };
          // Δseconds per gate — the coast-time gain, signed vs the calibration
          const gate = (label, meas, cal) => {
            if(meas == null || cal == null) return `${label} <span class="rsp-dim">—</span>`;
            const d = meas - cal;
            return `${label} ${meas.toFixed(1)}s <b style="color:${d >= 0 ? VIOLET : AMBER}">${d >= 0 ? '+' : ''}${d.toFixed(1)}s</b>`;
          };
          return `<div class="rsp-coast${s.interrupted ? ' int' : ''}">
            <b>coast ${s.n}</b> <span class="rsp-dim">${fmtClock(from)}–${fmtClock(to)} · peak ${s.max_rpm} rpm${s.interrupted ? ' · interrupted' : ''}</span>
            <span>24→10: ${bar(t2410, T_CAL.t24_10)}</span>
            <span>24→5: ${bar(t245, T_CAL.t24_5)}</span>
            <b class="rsp-ratio" style="color:${ratio == null ? FAINT : ratio >= 1 ? VIOLET : AMBER}">${ratio == null ? '—' : '×' + ratio.toFixed(2)}</b>
            <span class="rsp-dim" style="flex-basis:100%">${gate('24→10:', t2410, T_CAL.t24_10)} · ${gate('24→5:', t245, T_CAL.t24_5)} · ${gate('12→6:', bands.t12_6, T_CAL.t12_6)} · ${gate('6→3:', bands.t6_3, T_CAL.t6_3)} <span style="color:#99a2a7">(Δ vs calibration — positive = coasted longer)</span></span>
          </div>`;
        });
        el.innerHTML = rows.reverse().join('') +
          `<div class="rsp-dim" style="padding:4px 2px">reference times, from the ${esc(calNote)}: 24→10 ${T_CAL.t24_10 ? T_CAL.t24_10.toFixed(1) : '—'} s · 24→5 ${T_CAL.t24_5 ? T_CAL.t24_5.toFixed(1) : '—'} s · 12→6 ${T_CAL.t12_6 != null ? T_CAL.t12_6.toFixed(1) : '—'} s · 6→3 ${T_CAL.t6_3 != null ? T_CAL.t6_3.toFixed(1) : '—'} s · the tick on each bar marks the reference time</div>`;
      },
      readout(){
        if(!coasts.length) return 'none yet';
        const s = coasts[coasts.length - 1];
        return s.T24_5 != null && T_CAL.t24_5 ? 'latest ×' + (s.T24_5 / T_CAL.t24_5).toFixed(2) + ' vs reference' : 'latest —';
      },
      value(){ return ''; },
    },

    quality: {
      title: 'How steadily the readings arrived', h: 180, cat: 'quality',
      lede: 'Here you see how long the app waited between readings from the wheel, which normally arrive about every 0.7 s.',
      formula: 'Data quality / sample cadence    ·    Δt = t_i − t_{i−1}    ·    expected ≈ 0.7 s at any wheel speed',
      explain: 'Each dot is one reading, placed by how many seconds passed since the reading before it, on a squeezed scale marked 0.7 s, 2 s, 5 s and 15 s down the left. The dashed line labelled "expected ~0.7 s" is the pace the device keeps at any wheel speed, so dots normally sit on or near it; below about 2 rpm the readings often repeat the same counter, so they drift above the line with nothing being wrong. Dots turn red where the app counted a dropout, and those same stretches appear as the pale red stripes on the other charts that run on this clock. Along the bottom, the app re-runs the same push-or-drag estimate with a shorter and a longer smoothing window (3, 5 and 8 readings) and reports what share of the readings come out the same either way. That line describes the smoothing arithmetic, not the wheel.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        const yOf = dt => {
          const lo = Math.log(0.4), hi = Math.log(30);
          return PAD_T + (H - PAD_T - PAD_B) * (1 - (Math.log(Math.max(0.4, Math.min(30, dt))) - lo) / (hi - lo));
        };
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const v of [0.7, 2, 5, 15]){ ctx.fillStyle = GREY; ctx.fillText(v + 's', PAD_L - 6, yOf(v)); ctx.strokeStyle = 'rgba(1,22,36,0.05)'; ctx.beginPath(); ctx.moveTo(PAD_L, yOf(v)); ctx.lineTo(W - PAD_R, yOf(v)); ctx.stroke(); }
        // expected cadence: flat ~0.7 s (measured on the batch-1 raw data —
        // the device refreshes at ~1.4 Hz regardless of wheel speed)
        ctx.setLineDash([4, 4]); ctx.strokeStyle = FAINT; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0.7)); ctx.lineTo(W - PAD_R, yOf(0.7)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = FAINT; ctx.font = '9.5px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('expected ~0.7 s', PAD_L + 4, yOf(0.7) - 2);
        ctx.fillStyle = INK;
        for(let i = 1; i < samples.length; i++){
          const t = samples[i].t;
          if(t < view.t0 || t > view.t1) continue;
          const dt = t - samples[i - 1].t;
          ctx.fillStyle = p.gap[i] ? RED : INK;
          ctx.beginPath(); ctx.arc(xOf(t), yOf(dt), 2, 0, Math.PI * 2); ctx.fill();
        }
        // analysis-stability line: the τ estimator rerun with shorter/longer
        // windows vs the default — agreement within max(B/2, 3 nN·m). At the
        // 0.7 s cadence the SAMPLE COUNT binds, so the honest label is by
        // samples (3/5/8), not the seconds-caps.
        if(p.stab){
          const cls = p.stab.pct >= 85 ? 'comes out the same either way'
            : p.stab.pct >= 60 ? 'its size depends on the smoothing'
            : 'it changes with the smoothing';
          ctx.fillStyle = GREY; ctx.font = '700 10px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          ctx.fillText('push-or-drag re-run with 3 / 5 / 8-reading smoothing: ' + cls + ' — ' + p.stab.pct + '% agree', PAD_L + 4, H - PAD_B - 4);
        }
      },
      readout(){
        if(samples.length < 2) return '—';
        let longest = 0;
        const p = ensurePipe();
        let gapT = 0;
        for(let i = 1; i < samples.length; i++){
          const dt = samples[i].t - samples[i - 1].t;
          if(dt > longest) longest = dt;
          if(p.gap[i]) gapT += dt;
        }
        const up = Math.max(0, 100 - gapT / Math.max(1, nowT()) * 100);
        return 'uptime ' + Math.round(up) + '% · gap ' + fmtSig2(longest) + ' s';
      },
      value(t){ return ''; },
    },
  };
  PANELS.coasts.formula = 'R = T_meas(24→5) / T_cal(24→5)    ·    T_cal(24→5) = ' + (T_CAL.t24_5 ? T_CAL.t24_5.toFixed(1) + ' s' : '—');

  // ---- cursor helpers -------------------------------------------------------
  function nearestIdx(t){
    if(!samples.length || t == null) return -1;
    let lo = 0, hi = samples.length - 1;
    while(hi - lo > 1){ const m = (lo + hi) >> 1; (samples[m].t <= t) ? lo = m : hi = m; }
    const i = (Math.abs(samples[lo].t - t) <= Math.abs(samples[hi].t - t)) ? lo : hi;
    return i;
  }
  const nearest = t => { const i = nearestIdx(t); return i < 0 ? null : samples[i]; };

  // ---- DOM ------------------------------------------------------------------
  // The key block defines, ONCE and always visibly, the four words every chart
  // leans on — and closes with the honesty line the live screen never had.
  host.innerHTML = `
  <div class="rsp-key">
    <b>How to read these charts.</b> Everything is compared with <b>the calibration</b> —
    how this wheel slowed down on its own when you calibrated it${calNote === 'factory model' ? ' (right now: the factory model, not your room)' : ''}.
    The dashed <b>ghost line</b> replays that slow-down; the grey <b>reference band</b> is how much
    the calibration itself wobbles, so only readings outside it count as a real departure.
    On the force charts <span class="rsp-kv" style="color:${VIOLET}">■ violet = push</span> and
    <span class="rsp-kv" style="color:${AMBER}">■ amber = drag</span>;
    <span class="rsp-kv" style="color:${RED}">■ pale red stripes = lost readings</span> everywhere.
    <span class="rsp-kdim">The app measures — what a departure means is yours to decide.</span>
  </div>
  <div class="rsp-lenses" id="rspLenses"></div><div class="rsp-stack" id="rspStack"></div>`;
  const stackEl = host.querySelector('#rspStack');
  const lensEl = host.querySelector('#rspLenses');
  const bodies = {};   // id -> {card, bodyEl, canvas, overlay, domEl}

  // Lenses: category filters over the panel stack (owner + ChatGPT-round
  // decision) — no information is lost, the hidden panels stay live through
  // their pipeline and return on "All".
  const LENSES = [['all', 'All'], ['motion', 'Motion'], ['forces', 'Forces'], ['energy', 'Energy'], ['compare', 'Comparison'], ['quality', 'Quality']];
  const visibleOrder = () => layout.order.filter(id => layout.lens === 'all' || PANELS[id].cat === layout.lens);
  function paintLenses(){
    lensEl.innerHTML = LENSES.map(([k, lbl]) =>
      `<button type="button" class="rsp-lens${layout.lens === k ? ' on' : ''}" data-lens="${k}">${lbl}</button>`).join('');
  }
  lensEl.addEventListener('click', e => {
    const b = e.target.closest('[data-lens]');
    if(!b || b.dataset.lens === layout.lens) return;
    layout.lens = b.dataset.lens;
    persist();
    buildStack();
  });

  function buildStack(){
    paintLenses();
    for(const k of Object.keys(bodies)) delete bodies[k];   // drop stale refs of filtered-out panels
    stackEl.innerHTML = visibleOrder().map(id => {
      const P = PANELS[id];
      const open = !!layout.open[id];
      return `
      <div class="rsp-card" data-panel="${id}">
        <div class="rsp-head" data-toggle="${id}">
          <span class="rsp-updown">
            <button type="button" data-move="up" title="Move up">▲</button>
            <button type="button" data-move="down" title="Move down">▼</button>
          </span>
          <span class="rsp-idblock">
            <span class="rsp-title">${esc(P.title)}</span>
            <span class="rsp-lede">${esc(P.lede)}</span>
          </span>
          <span class="rsp-mini" data-mini="${id}">—</span>
          ${P.dom ? '' : `<button type="button" class="rsp-png" data-png="${id}" title="Export this chart as PNG (window, calibration and gap stamps included)">⤓</button>`}
          <span class="rsp-chev">${open ? '▾' : '▸'}</span>
        </div>
        <div class="rsp-body" data-body="${id}" ${open ? '' : 'hidden'}>
          ${P.dom ? `<div class="rsp-domhost" data-dom="${id}"></div>` : `
          <div class="rsp-canvwrap" style="height:${P.h}px">
            <canvas class="rsp-canvas" data-canvas="${id}"></canvas>
            <canvas class="rsp-overlay" data-overlay="${id}"></canvas>
          </div>`}
          <p class="rsp-explain"><b>What you see:</b> ${esc(P.explain)}</p>
          <details class="rsp-fdet"><summary>Exact definition</summary>
            <div class="rsp-formula">${esc(P.formula)}</div>
          </details>
        </div>
      </div>`;
    }).join('');
    for(const id of visibleOrder()){
      bodies[id] = {
        card: stackEl.querySelector(`[data-panel="${id}"]`),
        bodyEl: stackEl.querySelector(`[data-body="${id}"]`),
        canvas: stackEl.querySelector(`[data-canvas="${id}"]`),
        overlay: stackEl.querySelector(`[data-overlay="${id}"]`),
        domEl: stackEl.querySelector(`[data-dom="${id}"]`),
        mini: stackEl.querySelector(`[data-mini="${id}"]`),
      };
      if(bodies[id].canvas) wireCanvas(id);
    }
    paintAll(true);
  }

  // ---- painting (setupCanvas comes from the shared engine) ------------------
  function paintPanel(id, force){
    const P = PANELS[id], B = bodies[id];
    if(!B) return;
    if(B.mini) B.mini.textContent = P.readout();
    if(!layout.open[id]) return;
    if(P.dom){ if(B.domEl) P.renderDom(B.domEl); return; }
    const s = setupCanvas(B.canvas, P.h);
    if(!s) return;
    ensurePipe();
    P.draw(s.ctx, s.w, s.h);
    paintOverlay(id);
  }
  function paintOverlay(id){
    const P = PANELS[id], B = bodies[id];
    if(!B || !B.overlay || !layout.open[id]) return;
    const s = setupCanvas(B.overlay, P.h);
    if(!s) return;
    const { ctx, w, h } = s;
    const { xOf } = timeAxis(w);
    const timePanels = id !== 'phase' && id !== 'coasts' && id !== 'byspeed';
    // selection
    if(view.selection && timePanels){
      const x0 = Math.max(PAD_L, xOf(view.selection.a)), x1 = Math.min(w - PAD_R, xOf(view.selection.b));
      if(x1 > x0){
        ctx.fillStyle = 'rgba(82,48,218,0.08)'; ctx.fillRect(x0, PAD_T, x1 - x0, h - PAD_T - PAD_B);
        ctx.strokeStyle = VIOLET; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, PAD_T); ctx.lineTo(x0, h - PAD_B); ctx.moveTo(x1, PAD_T); ctx.lineTo(x1, h - PAD_B); ctx.stroke();
      }
    }
    // linked cursor
    if(view.cursorT != null && timePanels){
      const i = nearestIdx(view.cursorT);
      if(i >= 0){
        const t = samples[i].t;
        const x = xOf(t);
        if(x >= PAD_L && x <= w - PAD_R){
          ctx.strokeStyle = 'rgba(1,22,36,0.5)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, h - PAD_B); ctx.stroke(); ctx.setLineDash([]);
          const val = P.value(t);
          if(val){
            // label at the BOTTOM of the plot — the top edge belongs to the
            // window-extent text and badges, and the cursor line must run free
            ctx.font = '700 10.5px Inter, sans-serif';
            const label = val + ' · t=' + fmtClock(t);
            const tw = ctx.measureText(label).width + 12;
            const bx = Math.min(w - PAD_R - tw, Math.max(PAD_L, x + 6));
            const by = h - PAD_B - 21;
            ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fillRect(bx, by, tw, 17);
            ctx.strokeStyle = '#dfe3e6'; ctx.strokeRect(bx, by, tw, 17);
            ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(label, bx + 6, by + 9);
          }
        }
      }
    }
  }
  // The selection popover is deliberately NOT refreshed here: its stats are
  // computed once at selection release (selections auto-freeze the view, so
  // the numbers cannot go stale while it is showing).
  function paintAll(force){
    for(const id of layout.order) paintPanel(id, force);
  }

  // ---- interactions ---------------------------------------------------------
  let selPopover = null;
  function wireCanvas(id){
    const B = bodies[id];
    const ov = B.overlay;
    if(!ov) return;
    let dragStart = null, panStart = null, longTimer = null, armed = false;
    const isTime = id !== 'phase' && id !== 'coasts' && id !== 'byspeed';
    ov.style.touchAction = 'pan-y';
    const tAt = e => {
      const r = ov.getBoundingClientRect();
      return timeAxis(r.width).tOf(e.clientX - r.left);
    };
    ov.addEventListener('pointerdown', e => {
      if(!isTime) return;
      try { ov.setPointerCapture(e.pointerId); } catch {}   // synthetic/expired pointers must not kill the gesture

      if(e.shiftKey){ panStart = { x: e.clientX, t0: view.t0, t1: view.t1 }; return; }
      dragStart = { x: e.clientX, t: tAt(e), moved: false };
      armed = e.pointerType !== 'touch';
      if(e.pointerType === 'touch'){
        longTimer = setTimeout(() => { armed = true; }, 350);
      }
    });
    ov.addEventListener('pointermove', e => {
      if(panStart){
        const r = ov.getBoundingClientRect();
        const dt = (panStart.x - e.clientX) / (r.width - PAD_L - PAD_R) * (panStart.t1 - panStart.t0);
        setDomain(panStart.t0 + dt, panStart.t1 + dt, true);
        return;
      }
      if(!dragStart) return;
      if(Math.abs(e.clientX - dragStart.x) > 6) dragStart.moved = true;
      if(dragStart.moved && armed){
        detachLive();
        view.selection = { a: Math.min(dragStart.t, tAt(e)), b: Math.max(dragStart.t, tAt(e)) };
        overlayTickAll();
      }
    });
    ov.addEventListener('pointerup', e => {
      clearTimeout(longTimer);
      if(panStart){ panStart = null; return; }
      if(!dragStart) return;
      if(dragStart.moved && armed && view.selection && (view.selection.b - view.selection.a) >= 1){
        detachLive();
        showSelPopover();
      } else {
        // tap/click: plant the linked cursor (magnetic snap)
        const t = tAt(e);
        const i = nearestIdx(t);
        if(i >= 0 && Math.abs(samples[i].t - t) < Math.max(3, (view.t1 - view.t0) / 20)){
          view.cursorT = samples[i].t;
          if(view.mode === 'live') detachLive(false);
        } else {
          view.cursorT = null;
        }
        view.selection = null;
        hideSelPopover();
        overlayTickAll();
      }
      dragStart = null;
    });
    ov.addEventListener('pointercancel', () => { clearTimeout(longTimer); dragStart = null; panStart = null; });
    ov.addEventListener('wheel', e => {
      if(!isTime || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const t = tAt(e);
      const f = e.deltaY > 0 ? 1.25 : 0.8;
      const span = Math.min(getMaxSpan(), Math.max(5, (view.t1 - view.t0) * f));
      setDomain(t - (t - view.t0) / (view.t1 - view.t0) * span, null, true, span);
    }, { passive: false });
  }
  function overlayTickAll(){ for(const id of layout.order) paintOverlay(id); updateHeaderTags(); }
  function updateHeaderTags(){
    for(const id of layout.order){
      const B = bodies[id], P = PANELS[id];
      if(!B || !B.mini) continue;
      if(view.cursorT != null && !layout.open[id]){
        const v = P.value(view.cursorT);
        if(v){ B.mini.textContent = v + ' @ ' + fmtClock(view.cursorT); continue; }
      }
      B.mini.textContent = P.readout();
    }
  }

  // selection stats popover (DOM, copyable)
  function selectionStats(){
    const { a, b } = view.selection;
    const p = ensurePipe();
    const idx = [];
    for(let i = 0; i < samples.length; i++) if(samples[i].t >= a && samples[i].t <= b) idx.push(i);
    const dur = b - a;
    if(idx.length < 2) return { dur, n: idx.length, few: true };
    let covered = 0, wSum = 0, tSum = 0, maxR = 0, maxT = 0, revs = 0;
    for(let k = 1; k < idx.length; k++){
      const i = idx[k], dt = samples[i].t - samples[i - 1 >= 0 ? idx[k - 1] : i].t;
      if(!p.gap[i] && dt < 30){ covered += dt; wSum += (samples[i].rpm + samples[idx[k - 1]].rpm) / 2 * dt; tSum += dt; revs += (samples[i].rpm + samples[idx[k - 1]].rpm) / 120 * dt; }
    }
    for(const i of idx) if(samples[i].rpm > maxR){ maxR = samples[i].rpm; maxT = samples[i].t; }
    const eA = p.energy[idx[0]], eB = p.energy[idx[idx.length - 1]];
    const taus = idx.map(i => p.tau[i]).filter(v => v != null);
    let tauMean = null, tauSd = null;
    if(taus.length >= 4 && taus.length / idx.length > 0.5){
      tauMean = taus.reduce((x, y) => x + y, 0) / taus.length;
      tauSd = Math.sqrt(taus.reduce((x, y) => x + (y - tauMean) ** 2, 0) / taus.length);
    }
    // window cross-check for the selection: the alternate-window estimators'
    // mean τ vs the default — a selection-level artifact detector
    let tauStab = null;
    if(tauMean != null && p.tauVar){
      const means = p.tauVar.map(tv => {
        const vs = idx.map(i => tv[i]).filter(v => v != null);
        return vs.length >= 4 ? vs.reduce((x, y) => x + y, 0) / vs.length : null;
      });
      if(means.every(v => v != null)){
        const maxDiff = Math.max(...means.map(v => Math.abs(v - tauMean)));
        const bandMean = idx.reduce((a, i) => a + p.band[i], 0) / idx.length;
        tauStab = { maxDiff, ok: maxDiff <= Math.max(0.5 * bandMean, 3) };
      }
    }
    // impulse over the selection (certified trapezoid, same rule as the panel)
    const dJ = p.imp[idx[idx.length - 1]] - p.imp[idx[0]];
    return {
      dur, n: idx.length, coverage: Math.min(100, covered / dur * 100),
      meanRpm: tSum > 0 ? wSum / tSum : null, maxR, maxT, revs,
      dE: eB - eA, tA: samples[idx[0]].t, tB: samples[idx[idx.length - 1]].t,
      power: (eB - eA) / Math.max(0.1, dur) * 1000,   // nW
      tauMean, tauSd, tauN: taus.length, tauTotal: idx.length,
      tauStab, dJ,
    };
  }
  function showSelPopover(){
    hideSelPopover();
    const st = selectionStats();
    selPopover = document.createElement('div');
    selPopover.className = 'rsp-pop';
    const body = st.few
      ? `<div class="rsp-dim">too few samples in the selection (${st.n})</div>`
      : `
      <div><b>${fmtSig2(st.dur)} s</b> selected · data coverage <b>${Math.round(st.coverage)}%</b> · ${st.n} samples</div>
      <div>mean <b>${fmtSig2(st.meanRpm || 0)} rpm</b> · max <b>${fmtSig2(st.maxR)} rpm</b> @ ${fmtClock(st.maxT)}</div>
      <div>revolutions <b>${fmtSig2(st.revs)}</b>${st.coverage < 99 ? ' (measured portion)' : ''}</div>
      <div>ΔE = <b>${(st.dE >= 0 ? '+' : '') + fmtSig2(st.dE)} µJ</b> (${fmtClock(st.tA)}→${fmtClock(st.tB)}) · P̄ = <b>${fmtSig2(st.power)} nW</b></div>
      <div>${st.tauMean != null
        ? 'mean τ = <b>' + (st.tauMean >= 0 ? '+' : '') + fmtSig2(st.tauMean) + ' ± ' + fmtSig2(st.tauSd) + ' nN·m</b> (n=' + st.tauN + ')'
          + ' · ΔJ = <b>' + (st.dJ >= 0 ? '+' : '') + fmtSig2(st.dJ) + ' nN·m·s</b>'
        : '<span class="rsp-dim">not enough readings the estimator could use (' + st.tauN + ' of ' + st.tauTotal + ')</span>'}</div>
      ${st.tauStab ? `<div class="${st.tauStab.ok ? '' : 'rsp-dim'}">smoothing check: <b>${st.tauStab.ok ? 'the same either way' : 'depends on the smoothing'}</b> (Δ ${fmtSig2(st.tauStab.maxDiff)} nN·m across 3/5/8-reading windows)</div>` : ''}`;
    selPopover.innerHTML = body + `<div class="rsp-pop-actions">
      <button type="button" data-copy>Copy</button><button type="button" data-close>✕</button></div>`;
    stackEl.prepend(selPopover);
    selPopover.querySelector('[data-close]').addEventListener('click', () => { view.selection = null; hideSelPopover(); overlayTickAll(); });
    selPopover.querySelector('[data-copy]').addEventListener('click', () => {
      try { navigator.clipboard.writeText(selPopover.innerText.replace(/Copy|✕/g, '').trim()); } catch {}
    });
  }
  function hideSelPopover(){ if(selPopover){ selPopover.remove(); selPopover = null; } }

  // ---- domain / freeze ------------------------------------------------------
  const getMaxSpan = () => Math.max(30, nowT() + 5);
  function presetSpan(){
    return view.preset === '60' ? 60 : view.preset === '300' ? 300 : getMaxSpan();
  }
  function setDomain(t0, t1, detach, span){
    const sp = span || (t1 != null ? t1 - t0 : view.t1 - view.t0);
    view.t0 = Math.max(-5, Math.min(t0, nowT() - 1));
    view.t1 = view.t0 + sp;
    if(detach) detachLive(false);
    paintAll(true);
  }
  function detachLive(repaint = true){
    if(view.mode !== 'live' || !view.follow) return;
    view.follow = false;
    newWhileFrozen = 0;
    if(opts.onFreezeChange) opts.onFreezeChange(true, 0);
    if(repaint) paintAll(true);
  }
  function goLive(){
    view.follow = true; view.cursorT = null; view.selection = null;
    hideSelPopover();
    if(opts.onFreezeChange) opts.onFreezeChange(false, 0);
    paintAll(true);
  }

  // ---- pennant popup (edit/delete with tombstone) ---------------------------
  stackEl.addEventListener('click', e => {
    const png = e.target.closest('[data-png]');
    if(png){ exportPng(png.dataset.png); return; }
    const head = e.target.closest('[data-toggle]');
    if(head && !e.target.closest('[data-move]')){
      const id = head.dataset.toggle;
      layout.open[id] = !layout.open[id];
      const B = bodies[id];
      if(B){
        B.bodyEl.hidden = !layout.open[id];
        head.querySelector('.rsp-chev').textContent = layout.open[id] ? '▾' : '▸';
        if(!layout.open[id] && B.canvas){ B.canvas.width = 0; B.overlay.width = 0; }   // release backing store
      }
      persist(); paintAll(true);
      return;
    }
    const mv = e.target.closest('[data-move]');
    if(mv){
      const card = mv.closest('[data-panel]');
      const id = card.dataset.panel;
      // swap with the adjacent VISIBLE panel — under an active lens the true
      // neighbor in layout.order may be filtered out
      const vis = visibleOrder();
      const vi = vis.indexOf(id);
      const vj = mv.dataset.move === 'up' ? vi - 1 : vi + 1;
      if(vj < 0 || vj >= vis.length) return;
      const a = layout.order.indexOf(id), b = layout.order.indexOf(vis[vj]);
      [layout.order[a], layout.order[b]] = [layout.order[b], layout.order[a]];
      persist();
      buildStack();
    }
  });

  // ---- PNG export (honesty furniture baked in) ------------------------------
  function exportPng(id){
    const P = PANELS[id];
    if(!P || P.dom) return;
    // A shared PNG has to explain itself away from the app: name + the one-line
    // "what this is" travel with the picture, the equation stays underneath.
    const W = 1100, H = P.h + 110;
    const cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2;
    const ctx = cv.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = INK; ctx.font = '700 15px Inter, sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText(P.title, 12, 10);
    ctx.fillStyle = GREY; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(P.lede, 12, 31);
    ctx.fillStyle = FAINT; ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.fillText(P.formula, 12, 50);
    ctx.save(); ctx.translate(0, 68);
    P.draw(ctx, W, P.h);
    ctx.restore();
    ctx.fillStyle = FAINT; ctx.font = '10px Inter, sans-serif';
    const stamps = ['Egely Wheel Research', (opts.fileTag || ''), 'window ' + fmtClock(view.t0) + '–' + fmtClock(view.t1),
      'cal: ' + calNote, !view.follow && view.mode === 'live' ? 'display frozen' : '', 'exported ' + new Date().toISOString()].filter(Boolean);
    ctx.fillText(stamps.join(' · '), 12, H - 24);
    cv.toBlob(blob => downloadBlob('research_' + (opts.fileTag || 'run') + '_' + id + '.png', blob));
  }
  stackEl.addEventListener('dblclick', e => {
    const card = e.target.closest('[data-panel]');
    if(card && e.target.closest('.rsp-head')) exportPng(card.dataset.panel);
  });

  // ---- public API -----------------------------------------------------------
  buildStack();
  return {
    setData({ samples: s, markers: m, coasts: c }){
      if(s) samples = s;
      if(m) markers = m;
      if(c) coasts = c;
      pipeN = -1;
    },
    tick(){
      if(view.mode === 'live' && view.follow){
        const span = presetSpan();
        view.t1 = Math.max(span, nowT() + 2);
        view.t0 = view.t1 - span;
      } else if(view.mode === 'live' && !view.follow){
        newWhileFrozen++;
        if(opts.onFreezeChange && newWhileFrozen % 4 === 0) opts.onFreezeChange(true, samples.length);
      }
      paintAll();
    },
    setPreset(p){
      view.preset = p;
      if(view.mode === 'review' || !view.follow){
        const span = presetSpan();
        setDomain(Math.max(-5, nowT() - span), null, false, span);
      }
      paintAll(true);
    },
    goLive,
    isFollowing: () => view.follow,
    setReview(){
      view.mode = 'review'; view.follow = false; view.preset = 'full';
      const span = getMaxSpan();
      view.t0 = -2; view.t1 = span;
      if(opts.onFreezeChange) opts.onFreezeChange(false, 0);
      paintAll(true);
    },
    // Replay support: behave exactly like a live recording — the window follows
    // the newest sample (which the replay feeds in progressively).
    setLiveFollow(){
      view.mode = 'live'; view.follow = true;
      if(view.preset === 'full') view.preset = '60';
      view.selection = null; view.cursorT = null;
      hideSelPopover();
      paintAll(true);
    },
    exportPng,
    destroy(){ hideSelPopover(); host.innerHTML = ''; },
  };
}

// ---- save-time metrics ------------------------------------------------------
// Runs the SAME pipeline the panels use and returns the small derived numbers
// the run row / meta CSV carries (single-estimator honesty: an exported number
// must never disagree with what the panels showed).
export function computeRunMetrics(samples, coef, floorTau, coasts){
  const c = (coef && coef.K) ? coef : FACTORY_COEF;
  const p = buildPipeline(samples, c, floorTau == null ? 5 : floorTau, coasts || []);
  const last = samples.length - 1;
  const r1 = v => Math.round(v * 10) / 10;
  const m = {
    impulse_nnms: last >= 0 ? r1(p.imp[last]) : 0,
    impulse_sigma_nnms: last >= 0 ? r1(p.impSig[last]) : 0,
    outside_band_s: r1(p.outside.s),
    certified_s: r1(p.outside.certified_s),
    outside_band_pct: p.outside.certified_s > 0 ? Math.round(p.outside.s / p.outside.certified_s * 100) : null,
    outside_longest_s: r1(p.outside.longest_s),
    outside_count: p.outside.count,
    outside_impulse_nnms: r1(p.outside.jout),
    stability_pct: p.stab ? p.stab.pct : null,
  };
  // per-coast gate times vs the calibration model (coast-time gain, Δs)
  if(coasts && coasts.length){
    const mc = integrateModel(c);
    const g = rpm => crossTime(mc.pts, rpm);
    const cal = {
      t24_10: g(10), t24_5: g(5),
      t12_6: (g(6) != null && g(12) != null) ? g(6) - g(12) : null,
      t6_3: (g(3) != null && g(6) != null) ? g(3) - g(6) : null,
    };
    const pts = samples.map(s => ({ t: s.t * 1000, rpm: s.rpm }));
    m.coast_gates = coasts.map(s => {
      const curve = buildCurve(pts, s.t_start_ms, s.t_end_ms);
      if(!curve) return { n: s.n };
      // clip to the winning decay — same rule as the comparator panel
      const clean = curve.pts.filter(pt => pt.x >= 0 && (curve.dur == null || pt.x <= curve.dur + 0.01));
      const at = rpm => crossTime(clean, rpm);
      const d = (meas, calv) => (meas != null && calv != null) ? r1(meas - calv) : null;
      const t2410 = at(10), t245 = s.T24_5 != null ? s.T24_5 : curve.T245;
      const t12 = at(12), t6 = at(6), t3 = at(3);
      return {
        n: s.n,
        t24_10: t2410 != null ? r1(t2410) : null, d24_10: d(t2410, cal.t24_10),
        t24_5: t245 != null ? r1(t245) : null, d24_5: d(t245, cal.t24_5),
        d12_6: d((t6 != null && t12 != null) ? t6 - t12 : null, cal.t12_6),
        d6_3: d((t3 != null && t6 != null) ? t3 - t6 : null, cal.t6_3),
      };
    });
  }
  return m;
}

// Per-sample derived series for the data package — the EXACT arrays the panels
// drew, one row per fresh sample, so a researcher never has to reimplement the
// estimator. Blank (null) = uncertified, never a fake zero.
export function computeRunSeries(samples, coef, floorTau, coasts){
  const c = (coef && coef.K) ? coef : FACTORY_COEF;
  const p = buildPipeline(samples, c, floorTau == null ? 5 : floorTau, coasts || []);
  const r = (v, k) => v == null ? null : Math.round(v * k) / k;
  return samples.map((s, i) => {
    const g = ghostSegAt(p, s.t);
    return {
      t_s: r(s.t, 1000), rpm: r(s.rpm, 1000),
      tau_nnm: r(p.tau[i], 100), band_nnm: r(p.band[i], 100),
      decel_rpms: r(p.decel[i], 1000),
      ghost_rpm: g != null ? r(g, 100) : null,
      dev_pct: (g != null && g >= 2) ? r((s.rpm / g - 1) * 100, 100) : null,
      revs: r(p.revs[i], 100), energy_uj: r(p.energy[i], 10000),
      work_uj: r(p.work[i], 1000),
      impulse_nnms: r(p.imp[i], 100), impulse_sigma_nnms: r(p.impSig[i], 100),
      gap: p.gap[i] ? 1 : 0,
    };
  });
}

// ---- styles -----------------------------------------------------------------
function styles(){
  if(document.getElementById('rspStyles')) return;
  const el = document.createElement('style');
  el.id = 'rspStyles';
  el.textContent = `
  .rsp-lenses{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
  .rsp-key{background:#fbfbfc;border:1px solid #eef1f3;border-radius:12px;padding:10px 14px;margin:0 0 10px;
    color:#4d5a66;font-size:12.5px;line-height:1.6}
  .rsp-key b{color:#011624}
  .rsp-kv{white-space:nowrap;font-weight:700;font-size:12px;margin-right:4px}
  .rsp-kdim{display:block;margin-top:2px;color:#99a2a7;font-size:12px}
  .rsp-lens{font-family:'Montserrat',sans-serif;font-weight:700;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;
    padding:6px 14px;border-radius:999px;border:1px solid #dfe3e6;background:#fff;color:#67737c;cursor:pointer;transition:all .12s}
  .rsp-lens:hover{border-color:#5230da;color:#401d91}
  .rsp-lens.on{background:#401d91;border-color:#401d91;color:#fff}
  .rsp-stack{display:flex;flex-direction:column;gap:12px}
  .rsp-card{background:#fff;border:1px solid #dfe3e6;border-radius:16px;overflow:hidden;
    box-shadow:0 6px 18px rgba(1,22,36,.05)}
  /* The header carries the panel's IDENTITY, not just a label: a plain-English
     name plus one sentence saying what the chart is. It has to be readable with
     the card COLLAPSED, because most of the stack is collapsed most of the time
     — that is the whole point. The live number is demoted beside it. */
  .rsp-head{display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;user-select:none;min-height:28px}
  .rsp-head:hover{background:#fafbfc}
  .rsp-updown{display:flex;flex-direction:column;gap:1px;flex-shrink:0}
  .rsp-updown button{border:none;background:none;color:#99a2a7;font-size:8px;line-height:1;cursor:pointer;padding:2px 4px;border-radius:4px}
  .rsp-updown button:hover{color:#5230da;background:#f2f0fd}
  .rsp-idblock{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
  .rsp-title{font-family:'Montserrat',sans-serif;font-weight:700;font-size:13.5px;letter-spacing:-.01em;
    color:#011624}
  .rsp-lede{font-size:12px;line-height:1.45;color:#67737c}
  .rsp-mini{font-size:12.5px;color:#011624;font-variant-numeric:tabular-nums;font-weight:600;
    white-space:nowrap;flex-shrink:0;align-self:flex-start}
  .rsp-chev{color:#99a2a7;font-size:12px;width:14px;text-align:center}
  .rsp-png{border:none;background:none;color:#99a2a7;font-size:14px;cursor:pointer;padding:2px 6px;border-radius:6px}
  .rsp-png:hover{color:#5230da;background:#f2f0fd}
  .rsp-body{padding:4px 14px 12px}
  .rsp-canvwrap{position:relative;width:100%}
  .rsp-canvas,.rsp-overlay{position:absolute;inset:0;width:100%;height:100%;display:block}
  .rsp-overlay{z-index:2}
  /* Under the chart: what the marks MEAN visually (the reader's text), then the
     formula folded away. The equation used to be the loudest thing on the card
     and the words the quietest — that hierarchy is now the other way round. */
  .rsp-explain{color:#4d5a66;font-size:12.5px;line-height:1.62;margin:10px 0 0}
  .rsp-explain b{color:#011624;font-weight:700}
  .rsp-fdet{margin-top:8px}
  .rsp-fdet>summary{cursor:pointer;list-style:none;font-size:11px;font-weight:700;letter-spacing:.05em;
    text-transform:uppercase;color:#b0b8bd;padding:2px 0;width:max-content}
  .rsp-fdet>summary::-webkit-details-marker{display:none}
  .rsp-fdet>summary::after{content:' ▸'}
  .rsp-fdet[open]>summary::after{content:' ▾'}
  .rsp-fdet>summary:hover{color:#5230da}
  .rsp-formula{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;color:#67737c;
    background:#f7f8f8;border:1px solid #eef1f3;border-radius:8px;padding:6px 10px;margin-top:6px;
    overflow-x:auto;white-space:nowrap}
  .rsp-empty,.rsp-dim{color:#99a2a7;font-size:12.5px}
  .rsp-retry{margin-left:8px;font-family:inherit;font-size:12px;font-weight:700;padding:3px 12px;border-radius:999px;
    cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#401d91}
  .rsp-retry:hover{border-color:#5230da}
  .rsp-coast{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;background:#f7f8f8;border:1px solid #dfe3e6;
    border-radius:10px;padding:8px 12px;margin-bottom:6px;font-size:12.5px;color:#27384e;font-variant-numeric:tabular-nums}
  .rsp-coast.int{opacity:.55;text-decoration:line-through}
  .rsp-coast b{color:#011624}
  .rsp-ratio{margin-left:auto;font-size:14px}
  .rsp-bars{position:relative;display:inline-block;width:70px;height:8px;background:#eef1f3;border-radius:4px;vertical-align:middle;margin-right:4px}
  .rsp-bars i{position:absolute;left:0;top:0;bottom:0;background:#5230da;border-radius:4px;opacity:.75}
  .rsp-bars u{position:absolute;top:-2px;bottom:-2px;width:2px;background:#011624}
  .rsp-pop{position:sticky;top:8px;z-index:30;background:#fff;border:1px solid #5230da;border-radius:12px;
    box-shadow:0 12px 30px rgba(1,22,36,.18);padding:12px 14px;font-size:12.5px;color:#27384e;line-height:1.65;
    font-variant-numeric:tabular-nums}
  .rsp-pop b{color:#011624}
  .rsp-pop-actions{display:flex;gap:8px;margin-top:8px}
  .rsp-pop-actions button{font-family:'Inter',sans-serif;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px;
    cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#401d91}
  .rsp-pop-actions button:hover{border-color:#5230da}
  /* Narrow screens: let the name+sentence take the full width and drop the live
     number onto its own line, so the header can never push the ⤓ and the
     open/close chevron out through the card's overflow:hidden. */
  @media (max-width:640px){
    .rsp-card{border-radius:12px}
    .rsp-head{flex-wrap:wrap;align-items:flex-start;padding:10px 12px;gap:8px}
    .rsp-idblock{flex-basis:calc(100% - 76px)}
    .rsp-mini{order:3;flex-basis:100%;margin-left:26px;font-size:12px;color:#67737c}
    .rsp-lede{font-size:11.5px}
    .rsp-body{padding:4px 12px 12px}
    .rsp-coast{gap:4px 10px;font-size:12px}
  }
  `;
  document.head.appendChild(el);
}
