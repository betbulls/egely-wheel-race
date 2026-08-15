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
function buildPipeline(samples, coef, floorTau){
  const n = samples.length;
  const alphaBase = w => -decelOf(coef, w) * Math.PI / 30;   // rad/s^2 (negative = braking)
  const tau = new Array(n).fill(null);      // nN*m, null = blank (uncertified)
  const decel = new Array(n).fill(null);    // -d(rpm)/dt in rpm/s (measured, certified only)
  const gap = new Array(n).fill(false);     // sample follows a data gap
  for(let i = 0; i < n; i++){
    const s = samples[i];
    if(i > 0){
      const dt = s.t - samples[i - 1].t;
      // Measured on the batch-1 raw data (2026-08-14): a FRESH counter arrives
      // every ~0.7 s at ANY speed (the 72 teeth keep the sensor fed even at
      // 2 rpm — NOT one update per revolution). Below ~2 rpm consecutive
      // readings often repeat the same counter, so allow extra slack there.
      const expected = s.rpm >= 2 ? 0.7 : 1.5;
      if(dt > 2.5 * expected + 2) gap[i] = true;
      // jump rule (re-flick / touch): blank the estimator through the jump
    }
    // estimator window: fewest recent samples (min 2) spanning <= 15 s,
    // not crossing a gap or a jump
    const win = [s];
    for(let j = i - 1; j >= 0; j--){
      if(s.t - samples[j].t > 15) break;
      if(gap[j + 1]) break;
      if(samples[j + 1].rpm > samples[j].rpm * 1.3 && samples[j + 1].rpm > 3) break;   // jump into window
      win.push(samples[j]);
      if(win.length >= 5) break;
    }
    if(win.length >= 2){
      // LSQ slope of omega(t) over the window
      let st = 0, sw = 0, stt = 0, stw = 0, m = win.length;
      for(const p of win){ const w = p.rpm * Math.PI / 30; st += p.t; sw += w; stt += p.t * p.t; stw += p.t * w; }
      const det = m * stt - st * st;
      if(Math.abs(det) > 1e-9){
        const slope = (m * stw - st * sw) / det;                  // rad/s^2
        const meanRpm = win.reduce((a, p) => a + p.rpm, 0) / m;
        tau[i] = INERTIA * (slope - alphaBase(meanRpm)) * 1e9;    // nN*m
        decel[i] = -slope * 30 / Math.PI;                         // rpm/s
      }
    }
  }
  // ghost: auto-armed on 2 consecutive decelerating samples above 8 rpm,
  // killed by the jump rule (re-driven wheel). Only the LAST surviving arming
  // is INTEGRATED — the scan itself is O(n), and integrating every historical
  // arming on every rebuild was the pipeline's dominant cost.
  let armed = null;
  for(let i = 1; i < n; i++){
    if(armed && samples[i].rpm > samples[i - 1].rpm * 1.2 && samples[i].rpm > 3) armed = null;   // re-driven
    if(!armed && i >= 2 && !gap[i] && !gap[i - 1]
       && samples[i].rpm < samples[i - 1].rpm && samples[i - 1].rpm < samples[i - 2].rpm
       && samples[i - 1].rpm > 8){
      armed = { t0: (samples[i - 1].t + samples[i - 2].t) / 2, w0: (samples[i - 1].rpm + samples[i - 2].rpm) / 2 };
    }
  }
  let ghost = null;
  if(armed){
    const pts = [];
    let w = armed.w0, t = armed.t0;
    while(w > 0.05 && t < armed.t0 + 700){
      pts.push({ t, rpm: w });
      w -= decelOf(coef, w) * 0.05;
      t += 0.05;
    }
    pts.push({ t, rpm: 0 });
    ghost = { t0: armed.t0, w0: armed.w0, pts, tStop: t };
  }
  // cumulative revolutions + energy + work ledger (trapezoid over fresh samples)
  const revs = new Array(n).fill(0);
  const energy = samples.map(s => 0.5 * INERTIA * Math.pow(s.rpm * Math.PI / 30, 2) * 1e6);  // µJ
  const work = new Array(n).fill(0);      // µJ, telescoped: ΔE + ∫τ_base·ω dt
  const dissip = new Array(n).fill(0);    // ∫τ_base·ω dt (µJ) — for the ribbon
  for(let i = 1; i < n; i++){
    const dt = samples[i].t - samples[i - 1].t;
    const ok = dt > 0 && dt < 30 && !gap[i];
    revs[i] = revs[i - 1] + (ok ? (samples[i].rpm + samples[i - 1].rpm) / 120 * dt : 0);
    const wMean = (samples[i].rpm + samples[i - 1].rpm) / 2;
    const tauBase = INERTIA * decelOf(coef, wMean) * Math.PI / 30;          // N*m
    const p = tauBase * wMean * Math.PI / 30;                               // W
    dissip[i] = dissip[i - 1] + (ok ? p * dt * 1e6 : 0);                    // µJ
    work[i] = (energy[i] - energy[0]) + dissip[i];
  }
  return { samples, tau, decel, gap, ghost, revs, energy, work, dissip, floorTau };
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
  let pipe = buildPipeline(samples, coef, floor.tau);
  let pipeN = -1;
  let newWhileFrozen = 0;

  const nowT = () => samples.length ? samples[samples.length - 1].t : 0;
  const modelCurve = integrateModel(coef);
  const calT = rpm => crossTime(modelCurve.pts, rpm);          // anchored at 24-crossing
  const T_CAL = { t24_10: calT(10), t24_5: calT(5) };

  function ensurePipe(){
    if(samples.length !== pipeN){ pipe = buildPipeline(samples, coef, floor.tau); pipeN = samples.length; }
    return pipe;
  }

  // ---- persistence ----------------------------------------------------------
  const DEFAULT_ORDER = ['timeline', 'torque', 'logspeed', 'deviation', 'phase', 'revs', 'energy', 'work', 'coasts', 'quality'];
  const DEFAULT_OPEN = { timeline: true, torque: true };
  let layout = { order: DEFAULT_ORDER.slice(), open: { ...DEFAULT_OPEN }, prefs: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if(saved && Array.isArray(saved.order)){
      layout.order = saved.order.filter(id => DEFAULT_ORDER.includes(id));
      for(const id of DEFAULT_ORDER) if(!layout.order.includes(id)) layout.order.push(id);
      layout.open = { ...DEFAULT_OPEN, ...(saved.open || {}) };
      layout.prefs = saved.prefs || {};
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
      title: 'Speed timeline + ghost', h: 300,
      formula: 'ω = 6000 / counter [rpm]    ·    ghost: dω̂/dt = −(A + B·ω̂ + K·ω̂^1.5)',
      explain: 'WHAT: the wheel\'s speed over time — the main chart. LOOK AT: the dashed grey "ghost" line — it shows what the wheel would do all by itself in this room. MEANS: if the real line stays above the ghost, something kept the wheel going beyond plain physics; below it, something extra slowed it down.',
      draw(ctx, W, H){
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
        if(p.ghost){
          ctx.setLineDash([6, 4]); ctx.strokeStyle = FAINT; ctx.lineWidth = 1.6;
          ctx.beginPath();
          let pen = false;
          for(const g of p.ghost.pts){
            if(g.t < view.t0 || g.t > view.t1){ pen = false; continue; }
            const px = xOf(g.t), py = yOf(g.rpm);
            pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true;
          }
          ctx.stroke(); ctx.setLineDash([]);
          if(p.ghost.tStop >= view.t0 && p.ghost.tStop <= view.t1){
            ctx.fillStyle = FAINT; ctx.textAlign = 'center'; ctx.font = '9.5px Inter, sans-serif';
            ctx.fillText('ghost stop', xOf(p.ghost.tStop), yOf(0) - 10);
          }
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
      title: 'Drive-torque instrument', h: 280,
      formula: 'τ_drive = I·(α_meas − α_base(ω))    ·    I = 1.7×10⁻⁷ kg·m²',
      explain: 'WHAT: the push or drag acting on the wheel right now, beyond normal friction and air. LOOK AT: the bar — purple to the right = something is driving the wheel; amber to the left = something is braking it. MEANS: while the reading sits inside the grey band, it is too small to tell apart from the room\'s own air — only readings outside the band count.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const gaugeH = 84;
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
        // noise floor band
        ctx.fillStyle = 'rgba(103,115,124,0.22)';
        ctx.fillRect(symX(-floor.tau), 14, symX(floor.tau) - symX(-floor.tau), 30);
        ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(gxm, 10); ctx.lineTo(gxm, 48); ctx.stroke();
        const lc = lastCertified(p.tau);
        const lastTau = lc ? lc.v : null;
        const live = lc != null && samples.length && (samples[samples.length - 1].t - samples[lc.i].t) < 20;
        if(live){
          const inBand = Math.abs(lastTau) <= floor.tau;
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
        ctx.font = '9.5px Inter, sans-serif'; ctx.fillStyle = FAINT;
        ctx.fillText('grey band = ' + (floor.factory ? 'factory floor' : 'this room\'s noise floor') + ' ±' + fmtSig2(floor.tau) + ' nN·m', gxm, 70);

        // --- strip vs shared time axis ---
        const { xOf } = timeAxis(W);
        const top = gaugeH + 6, bot = H - PAD_B;
        const TMAX = 200;
        const yOf = tau => {
          const a = Math.abs(tau), u = a <= L ? (a / L) * 0.35 : 0.35 + 0.65 * Math.log(a / L) / Math.log(TMAX / L);
          return (top + bot) / 2 - Math.sign(tau) * Math.min(1, u) * (bot - top) / 2;
        };
        drawGaps(ctx, W, H, xOf);
        ctx.fillStyle = 'rgba(103,115,124,0.14)';
        ctx.fillRect(PAD_L, yOf(floor.tau), W - PAD_L - PAD_R, yOf(-floor.tau) - yOf(floor.tau));
        ctx.strokeStyle = 'rgba(1,22,36,0.3)';
        ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0)); ctx.lineTo(W - PAD_R, yOf(0)); ctx.stroke();
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

    logspeed: {
      title: 'Log-scale speed', h: 260,
      formula: 'y = log ω    ·    ω = 6000 / counter [rpm]',
      explain: 'WHAT: the same speed chart, stretched so the slow range is easy to see. LOOK AT: the shape of the slow-down below 10 rpm — on the normal chart this part is squashed flat. MEANS: small, steady differences in how the wheel dies down show up here first; the little squares at the bottom mean "near standstill".',
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
        if(p.ghost){
          ctx.setLineDash([6, 4]); ctx.strokeStyle = FAINT; ctx.lineWidth = 1.6;
          ctx.beginPath(); let pen = false;
          for(const g of p.ghost.pts){
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
        ctx.fillStyle = FAINT; ctx.font = '9.5px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('log scale — squares at the floor = below 1.6 rpm (near standstill)', PAD_L + 4, PAD_T);
      },
      readout(){ const s = samples[samples.length - 1]; return s ? 'ω ' + fmtSig2(s.rpm) + ' rpm' : '—'; },
      value(t){ const s = nearest(t); return s ? fmtSig2(s.rpm) + ' rpm' : '—'; },
    },

    deviation: {
      title: 'Ghost deviation strip', h: 190,
      formula: 'Δ = 100 · (ω / ω̂ − 1) [%]',
      explain: 'WHAT: a magnifying glass — how far the wheel is from its predicted slow-down, in percent. LOOK AT: where the line sits versus the 0% middle line. MEANS: 0% = exactly as predicted; a steady climb above 0% means the wheel keeps doing a little better than physics predicts — this chart notices that long before any other.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf);
        if(!p.ghost){
          ctx.fillStyle = FAINT; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('ghost not armed — needs a hands-off coast', W / 2, H / 2);
          return;
        }
        const band = Math.max(5, (coef.sigma_rel || 0.05) * 200);   // ±2σ in %
        const DEV = Math.max(15, band * 2);
        const yOf = d => PAD_T + (H - PAD_T - PAD_B) * (0.5 - Math.max(-DEV, Math.min(DEV, d)) / (2 * DEV));
        ctx.fillStyle = 'rgba(32,178,107,0.10)';
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
          const g = ghostAt(p.ghost, s.t);
          if(g == null || g < 2 || p.gap[i]){ pen = false; continue; }
          const d = (s.rpm / g - 1) * 100;
          pen ? ctx.lineTo(xOf(s.t), yOf(d)) : ctx.moveTo(xOf(s.t), yOf(d)); pen = true;
        }
        ctx.stroke();
        ctx.fillStyle = FAINT; ctx.font = '9.5px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('band = ±' + Math.round(band) + '% (' + (floor.factory ? 'factory' : 'this room\'s') + ' calibration repeatability) · stops where ghost < 2 rpm', PAD_L + 4, PAD_T);
      },
      readout(){
        const p = ensurePipe();
        const s = samples[samples.length - 1];
        if(!p.ghost || !s) return '— no ghost';
        const g = ghostAt(p.ghost, s.t);
        if(g == null || g < 2) return '— ghost ended';
        const d = (s.rpm / g - 1) * 100;
        return (d >= 0 ? '+' : '') + fmtSig2(d) + ' %';
      },
      value(t){
        const p = ensurePipe(); const s = nearest(t);
        if(!p.ghost || !s) return '—';
        const g = ghostAt(p.ghost, s.t);
        return (g == null || g < 2) ? '—' : ((s.rpm / g - 1) * 100 >= 0 ? '+' : '') + fmtSig2((s.rpm / g - 1) * 100) + ' %';
      },
    },

    phase: {
      title: 'Deceleration–speed phase map', h: 260,
      formula: '−dω/dt vs ω    ·    baseline: A + B·ω + K·ω^1.5 [rpm/s]',
      explain: 'WHAT: each dot = one moment; how strongly the wheel was slowing (up-down) at a given speed (left-right). LOOK AT: where the dots fall versus the dashed curve. MEANS: dots ON the curve = normal coasting; dots BELOW it = less braking than physics expects; dots below the zero line = the wheel was actually speeding up.',
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

    revs: {
      title: 'Revolutions integral N(t)', h: 220,
      formula: 'N(t) = ∫ ω/60 dt  [rev]',
      explain: 'WHAT: the total number of turns the wheel has made since the start. LOOK AT: the steepness — steeper = spinning faster, flat = stopped. MEANS: the dashed line is how many turns coasting alone would give; any gap the solid line opens above it is "extra" turns that plain coasting cannot explain.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        const maxN = Math.max(1, p.revs[p.revs.length - 1] || 1) * 1.05;
        const yOf = v => PAD_T + (H - PAD_T - PAD_B) * (1 - v / maxN);
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const f of [0, 0.5, 1]){ ctx.fillStyle = GREY; ctx.fillText(String(Math.round(maxN * f)), PAD_L - 6, yOf(maxN * f)); }
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
      title: 'Kinetic energy E(t)', h: 220,
      formula: 'E = ½ · I · ω²    ·    0.54 µJ at 24 rpm',
      explain: 'WHAT: how much energy of motion the wheel holds, moment by moment (in millionths of a joule — the wheel is feather-light). LOOK AT: the rises — every rise means energy flowed INTO the wheel from somewhere. MEANS: drag the mouse across a stretch to read off exactly how much energy the wheel gained or lost there.',
      draw(ctx, W, H){
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        const maxE = Math.max(0.6, ...p.energy) * 1.06;
        const yOf = v => PAD_T + (H - PAD_T - PAD_B) * (1 - v / maxE);
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for(const f of [0, 0.5, 1]){ ctx.fillStyle = GREY; ctx.fillText(fmtSig2(maxE * f) + '', PAD_L - 6, yOf(maxE * f)); }
        ctx.strokeStyle = 'rgba(1,22,36,0.15)'; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0.54)); ctx.lineTo(W - PAD_R, yOf(0.54)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = FAINT; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = '9.5px Inter, sans-serif';
        ctx.fillText('0.54 µJ = 24 rpm', PAD_L + 4, yOf(0.54) - 2);
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
      title: 'Work ledger W(t)', h: 220,
      formula: 'W(t) = ΔE(t) + ∫ τ_base(ω)·ω dt    ·    flat at 0 = only ordinary physics',
      explain: 'WHAT: the bottom line of the whole experiment — the running total of energy that reached the wheel BEYOND normal friction and air. LOOK AT: whether the line leaves the grey ribbon around zero. MEANS: flat at zero = only ordinary physics happened; a climb outside the ribbon = energy arrived that the calibration cannot account for. (Note: spinning the wheel by hand also counts as energy in — judge the hands-off stretches.)',
      draw(ctx, W, H){
        const p = ensurePipe();
        const { xOf } = timeAxis(W);
        drawTimeGrid(ctx, W, H, xOf); drawGaps(ctx, W, H, xOf);
        const sig = coef.sigma_rel || 0.08;
        const maxW = Math.max(0.5, ...p.work.map((w, i) => Math.abs(w) + p.dissip[i] * sig)) * 1.1;
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
        ctx.fillStyle = FAINT; ctx.font = '9.5px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('µJ · ribbon = calibration repeatability ±' + Math.round(sig * 100) + '% of dissipated energy', PAD_L + 4, PAD_T);
      },
      readout(){
        const p = ensurePipe();
        if(!p.work.length) return '—';
        const i = p.work.length - 1;
        const sig = coef.sigma_rel || 0.08;
        return (p.work[i] >= 0 ? '+' : '') + fmtSig2(p.work[i]) + ' ± ' + fmtSig2(p.dissip[i] * sig) + ' µJ';
      },
      value(t){ const p = ensurePipe(); const i = nearestIdx(t); return i < 0 ? '—' : fmtSig2(p.work[i]) + ' µJ'; },
    },

    coasts: {
      title: 'Coast comparator', h: 0, dom: true,
      formula: 'R = T_meas(24→5) / T_cal(24→5)    ·    T_cal = ' + '—',
      explain: 'WHAT: every time the wheel freely slowed down, it got timed like a stopwatch lap and compared with your calibration. LOOK AT: the ratio at the end of each row. MEANS: ×1.00 = the wheel slowed exactly as calibrated; ×1.20 = it kept spinning 20% longer than it should — the simplest number to quote from a session.',
      renderDom(el){
        if(!coasts.length){ el.innerHTML = '<div class="rsp-empty">no hands-off coast yet — spin the wheel above 24 rpm and let go</div>'; return; }
        const rows = coasts.map(s => {
          const from = s.t_start_ms / 1000, to = s.t_end_ms / 1000;
          // band times are immutable once a coast closed — cache per coast
          // (WeakMap, NOT a property: the coast objects get serialized on save)
          let bands = coastBands.get(s);
          if(!bands){
            const curve = buildCurve(samples.map(p => ({ t: p.t * 1000, rpm: p.rpm })), s.t_start_ms, s.t_end_ms);
            bands = {
              t2410: curve ? crossTime(curve.pts.filter(pt => pt.x >= 0), 10) : null,
              t245: s.T24_5 != null ? s.T24_5 : (curve && curve.T245 != null ? curve.T245 : null),
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
          return `<div class="rsp-coast${s.interrupted ? ' int' : ''}">
            <b>coast ${s.n}</b> <span class="rsp-dim">${fmtClock(from)}–${fmtClock(to)} · peak ${s.max_rpm} rpm${s.interrupted ? ' · interrupted' : ''}</span>
            <span>24→10: ${bar(t2410, T_CAL.t24_10)}</span>
            <span>24→5: ${bar(t245, T_CAL.t24_5)}</span>
            <b class="rsp-ratio" style="color:${ratio == null ? FAINT : ratio >= 1 ? VIOLET : AMBER}">${ratio == null ? '—' : '×' + ratio.toFixed(2)}</b>
          </div>`;
        });
        el.innerHTML = rows.reverse().join('') +
          `<div class="rsp-dim" style="padding:4px 2px">calibrated: 24→10 ${T_CAL.t24_10 ? T_CAL.t24_10.toFixed(1) : '—'} s · 24→5 ${T_CAL.t24_5 ? T_CAL.t24_5.toFixed(1) : '—'} s (${esc(calNote)}) · tick = calibrated time</div>`;
      },
      readout(){
        if(!coasts.length) return 'no coast yet';
        const s = coasts[coasts.length - 1];
        return s.T24_5 != null && T_CAL.t24_5 ? 'last coast ×' + (s.T24_5 / T_CAL.t24_5).toFixed(2) : 'last coast —';
      },
      value(){ return ''; },
    },

    quality: {
      title: 'Data quality / sample cadence', h: 180,
      formula: 'Δt = t_i − t_{i−1}    ·    expected ≈ 0.7 s (the device refreshes ~1.4× per second at any speed)',
      explain: 'WHAT: a health check of the measurement itself — how often a genuinely new reading arrived. LOOK AT: the dots should sit close to the dashed 0.7 s line; red stripes are radio dropouts and they explain any missing pieces in the charts above. MEANS: dots drifting above the line with no red stripe just mean the reading repeated itself (the wheel was nearly still) — only the red stripes are actual data loss.',
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
  host.innerHTML = `<div class="rsp-stack" id="rspStack"></div>`;
  const stackEl = host.querySelector('#rspStack');
  const bodies = {};   // id -> {card, bodyEl, canvas, overlay, domEl}

  function buildStack(){
    stackEl.innerHTML = layout.order.map(id => {
      const P = PANELS[id];
      const open = !!layout.open[id];
      return `
      <div class="rsp-card" data-panel="${id}">
        <div class="rsp-head" data-toggle="${id}">
          <span class="rsp-grip" aria-hidden="true">⋮⋮</span>
          <span class="rsp-updown">
            <button type="button" data-move="up" title="Move up">▲</button>
            <button type="button" data-move="down" title="Move down">▼</button>
          </span>
          <span class="rsp-title">${esc(P.title)}</span>
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
          <div class="rsp-formula">${esc(P.formula)}</div>
          <p class="rsp-explain">${esc(P.explain).replace(/(WHAT:|LOOK AT:|MEANS:)/g, '<b>$1</b>')}</p>
        </div>
      </div>`;
    }).join('');
    for(const id of layout.order){
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
    const timePanels = id !== 'phase' && id !== 'coasts';
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
    const isTime = id !== 'phase' && id !== 'coasts';
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
    return {
      dur, n: idx.length, coverage: Math.min(100, covered / dur * 100),
      meanRpm: tSum > 0 ? wSum / tSum : null, maxR, maxT, revs,
      dE: eB - eA, tA: samples[idx[0]].t, tB: samples[idx[idx.length - 1]].t,
      power: (eB - eA) / Math.max(0.1, dur) * 1000,   // nW
      tauMean, tauSd, tauN: taus.length, tauTotal: idx.length,
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
        : '<span class="rsp-dim">insufficient torque data (' + st.tauN + ' of ' + st.tauTotal + ' certified)</span>'}</div>`;
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
      const i = layout.order.indexOf(id);
      const j = mv.dataset.move === 'up' ? i - 1 : i + 1;
      if(j < 0 || j >= layout.order.length) return;
      [layout.order[i], layout.order[j]] = [layout.order[j], layout.order[i]];
      persist();
      buildStack();
    }
  });

  // ---- PNG export (honesty furniture baked in) ------------------------------
  function exportPng(id){
    const P = PANELS[id];
    if(!P || P.dom) return;
    const W = 1100, H = P.h + 92;
    const cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2;
    const ctx = cv.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = INK; ctx.font = '700 14px Inter, sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText(P.title, 12, 10);
    ctx.fillStyle = GREY; ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.fillText(P.formula, 12, 30);
    ctx.save(); ctx.translate(0, 48);
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
    destroy(){ hideSelPopover(); stackEl.innerHTML = ''; },
  };
}

// ---- styles -----------------------------------------------------------------
function styles(){
  if(document.getElementById('rspStyles')) return;
  const el = document.createElement('style');
  el.id = 'rspStyles';
  el.textContent = `
  .rsp-stack{display:flex;flex-direction:column;gap:12px}
  .rsp-card{background:#fff;border:1px solid #dfe3e6;border-radius:16px;overflow:hidden;
    box-shadow:0 6px 18px rgba(1,22,36,.05)}
  .rsp-head{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;user-select:none;min-height:28px}
  .rsp-head:hover{background:#fafbfc}
  .rsp-grip{color:#c9ced2;font-size:11px;letter-spacing:-1px;cursor:default}
  .rsp-updown{display:flex;flex-direction:column;gap:1px}
  .rsp-updown button{border:none;background:none;color:#99a2a7;font-size:8px;line-height:1;cursor:pointer;padding:2px 4px;border-radius:4px}
  .rsp-updown button:hover{color:#5230da;background:#f2f0fd}
  .rsp-title{font-family:'Montserrat',sans-serif;font-weight:700;font-size:12px;letter-spacing:.08em;
    text-transform:uppercase;color:#27384e}
  .rsp-mini{margin-left:auto;font-size:12.5px;color:#011624;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
  .rsp-chev{color:#99a2a7;font-size:12px;width:14px;text-align:center}
  .rsp-png{border:none;background:none;color:#99a2a7;font-size:14px;cursor:pointer;padding:2px 6px;border-radius:6px}
  .rsp-png:hover{color:#5230da;background:#f2f0fd}
  .rsp-body{padding:4px 14px 12px}
  .rsp-canvwrap{position:relative;width:100%}
  .rsp-canvas,.rsp-overlay{position:absolute;inset:0;width:100%;height:100%;display:block}
  .rsp-overlay{z-index:2}
  .rsp-formula{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;color:#401d91;
    background:#f7f6fd;border-radius:8px;padding:6px 10px;margin-top:8px;overflow-x:auto;white-space:nowrap}
  .rsp-explain{color:#67737c;font-size:12.5px;line-height:1.55;margin:8px 0 0}
  .rsp-explain b{color:#27384e;font-size:10.5px;letter-spacing:.05em}
  .rsp-empty,.rsp-dim{color:#99a2a7;font-size:12.5px}
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
  `;
  document.head.appendChild(el);
}
