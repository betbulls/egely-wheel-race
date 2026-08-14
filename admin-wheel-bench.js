// admin-wheel-bench.js — "Wheel test": factory wheel tester, mounted as a tab
// inside the admin console (admin-only by inheritance from view-admin).
//
// v2 (2026-08-14 evening): the benchmark phase is done — this is now the ongoing
// QC instrument. Big anchored comparison chart (log rpm, t=0 at the 24-rpm
// crossing) with the IDEAL curve computed from the fitted physics model and a
// tolerance band; per-spin score + grade; braking-vs-speed (derivative) chart;
// removable chart entries so a long test session stays readable.
// The capture engine (raw logging, segmentation, DB+JSON save) is unchanged —
// DB table stays `wheel_bench`, no SQL migration needed.
//
// The spike filter in ble.js holds the de-spiked `led` LOW through a fast jump
// into the top rail (a hand-spin looks exactly like the PIC glitch), so this
// tool displays and segments on frame.rawLed; both values are recorded.
import { supabase } from './db.js';
import * as ble from './ble.js';
import * as wakeLock from './wake-lock.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

const MAX_CAPTURE_MS   = 15 * 60 * 1000; // safety stop for a forgotten recorder
const SPIN_START_LED   = 6;      // rawLed at/above this...
const SPIN_START_HITS  = 2;      // ...on this many consecutive NEW reports = spin started
const SPIN_END_ZERO_MS = 4000;   // rawLed 0 sustained this long = spin over
const SPIN_MIN_MS      = 6000;   // shorter segments = handling bumps, not spins

// The recorded tuple layout — single owner for ingest, payload format string,
// and any future decoder. Bump the format version on ANY change here.
const FRAME_COLS = ['t_ms', 'counter', 'raw_led', 'led'];
const FORMAT = 'wheel-bench v1; frames=[' + FRAME_COLS.join(',') + ']; led=rpm (0-24, device-railed at 24); true rpm=6000/counter';

// Decoded 2026-08-14 from the first real bench capture, validated against the
// device's own LED on every frame: the 16-bit counter is the revolution period
// in ~10 ms units, so TRUE rpm ~= 6000/counter — and the device keeps measuring
// far above the 24-rpm display rail (500 rpm observed on a hand spin).
// counter 0 = standstill. Absolute scale to be confirmed by video (~3%).
const rpmOf = c => c > 0 ? 6000 / c : 0;
const RPM_MIN_COUNTER = 8;   // counter below this (>750 rpm) = glitch/artifact, ignore for stats

// ---- Ideal wheel model (fitted 2026-08-14 from the batch-1 best-seating spins;
// 8 wheels, 50+ recordings; grid-fit with physical constraints A,B,K >= 0):
//   deceleration [rpm/s] = A + B*w + K*w^1.5   (w in rpm)
// Reproduces the best clean spins' band times within 5% (t400-24 ~12s,
// t24-10 ~7.6s, t10-5 ~6.8s, t5-3 ~4.6s; T24-5 ideal = 14.5s).
const IDEAL_A = 0.24, IDEAL_B = 0.0, IDEAL_K = 0.025;
const SCORE_REF_T245 = 15.0;             // score-100 anchor: excellent seating
const BAND_FAST = 0.88, BAND_SLOW = 1.12; // tolerance band = ideal curve time-scaled
// Chart geometry
const X_MIN = -12, X_MAX = 40;           // seconds relative to the 24-rpm crossing
const Y_MIN = 1.6, Y_MAX = 620;          // rpm, log scale
const Y_TICKS = [2, 5, 10, 24, 50, 100, 200, 400];
const PALETTE = ['#0a7a5c', '#b8860b', '#0033ff', '#c2415b', '#7c3aed', '#0e7490', '#b45309', '#be185d', '#4d7c0f', '#6b7280'];

// Integrate the ideal model downward from 450 rpm and anchor t=0 at 24 rpm.
function buildIdealPts(){
  const pts = [];
  let w = 450, t = 0;
  while(w > Y_MIN && t < 120){
    pts.push({ t, w });
    w -= (IDEAL_A + IDEAL_B * w + IDEAL_K * Math.pow(w, 1.5)) * 0.02;
    t += 0.02;
  }
  let t24 = null;
  for(let i = 1; i < pts.length; i++){
    if(pts[i].w <= 24){
      const a = pts[i - 1], b = pts[i];
      t24 = a.t + (Math.log(a.w) - Math.log(24)) / (Math.log(a.w) - Math.log(b.w)) * (b.t - a.t);
      break;
    }
  }
  const out = [];
  for(let i = 0; i < pts.length; i += 10)   // thin to ~5/s for drawing
    out.push({ x: pts[i].t - t24, y: pts[i].w });
  return out;
}
const IDEAL_PTS = buildIdealPts();

// Saved wheels + chart curves survive tab switches (mount closures die, the
// day's test work must not): module-level stores + a repaint hook for the
// currently mounted instance.
const savedStore = [];
const chartCurves = [];   // {serial, spinN, color, pts:[{x,y}], T245, score}
let curveColorIdx = 0;
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
  .awb-live{border:1px solid #dfe3e6;border-radius:14px;background:#f7f8f8;padding:12px 16px;margin:14px 0}
  .awb-stats{display:flex;flex-wrap:wrap;gap:8px 26px;align-items:baseline}
  .awb-rpm{font-family:'Montserrat',sans-serif;font-weight:600;font-size:44px;line-height:1;color:#011624;
    font-variant-numeric:tabular-nums}
  .awb-rpm small{font-size:14px;font-weight:700;color:#67737c;margin-left:4px}
  .awb-kv{font-size:13px;color:#67737c;font-variant-numeric:tabular-nums}
  .awb-kv b{color:#011624}
  .awb-spinbadge{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;
    padding:3px 10px;background:#f2f3f4;color:#99a2a7}
  .awb-spinbadge.on{background:rgba(82,48,218,.12);color:#401d91}
  .awb-chart{width:100%;height:340px;display:block}
  .awb-deriv{width:100%;height:240px;display:block;margin-top:6px}
  .awb-rec{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff5c5c;margin-right:7px;
    animation:awbPulse 1.2s ease-in-out infinite}
  @keyframes awbPulse{0%,100%{opacity:1}50%{opacity:.35}}
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
  .awb-errtext{flex-basis:100%;color:#c2415b;font-size:11.5px;font-family:ui-monospace,Menlo,Consolas,monospace;
    word-break:break-word;padding-top:2px}
  .awb-mini{font-family:'Inter',sans-serif;font-size:12px;font-weight:700;padding:7px 13px;border-radius:999px;
    cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#401d91;flex-shrink:0}
  .awb-mini:hover{border-color:#5230da}
  .awb-steps{margin:0;padding-left:18px;color:#67737c;font-size:13.5px;line-height:1.6}
  .awb-steps b{color:#011624}
  /* curve list */
  .awb-curves{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
  .awb-curves li{display:flex;align-items:center;gap:10px;background:#f7f8f8;border:1px solid #dfe3e6;
    border-radius:10px;padding:7px 12px;font-size:13.5px;color:#27384e;font-variant-numeric:tabular-nums}
  .awb-cdot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .awb-cserial{font-weight:700;color:#011624;min-width:96px}
  .awb-cx{margin-left:auto;font-size:15px;font-weight:700;color:#99a2a7;background:none;border:none;cursor:pointer;
    padding:2px 8px;border-radius:8px}
  .awb-cx:hover{color:#c2415b;background:#fff}
  .awb-score{display:inline-block;font-size:11.5px;font-weight:800;border-radius:999px;padding:2px 10px;color:#fff;min-width:52px;text-align:center}
  .awb-sA{background:#0f8a52}.awb-sB{background:#7ca80c}.awb-sC{background:#d97706}.awb-sD{background:#c2415b}
  .awb-sN{background:#99a2a7}
  /* guide */
  .awb-guide{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:6px}
  .awb-gitem{border:1px solid #dfe3e6;border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:#27384e;background:#fff}
  .awb-gitem b{display:inline-block;margin-bottom:3px}
  .awb-gnote{color:#67737c;font-size:12.5px;line-height:1.55;margin:10px 0 0}
  .awb-gnote b{color:#011624}
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

// ---- scoring ----------------------------------------------------------------
function scoreOf(T245){
  if(T245 == null) return { score: null, grade: 'n/a', cls: 'awb-sN' };
  const score = Math.min(110, Math.round(T245 / SCORE_REF_T245 * 100));
  const grade = score >= 93 ? 'A' : score >= 85 ? 'B' : score >= 72 ? 'C' : 'D';
  return { score, grade, cls: 'awb-s' + grade };
}

// Interpolated time where an anchored curve crosses `rpm` downward (after peak).
function crossTime(pts, rpm){
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
// Anchor: t=0 where the post-peak decay crosses 24 rpm. Returns null if the
// spin never reached 24 (weak flick — not chartable/scorable).
function buildCurve(rpmPts, fromMs, toMs){
  const pts = rpmPts.filter(p => p.t >= fromMs - 12000 && p.t <= toMs && p.rpm >= Y_MIN)
    .map(p => ({ x: p.t / 1000, y: Math.min(Y_MAX - 1, p.rpm) }));
  if(pts.length < 6) return null;
  const t24 = crossTime(pts, 24);
  if(t24 == null) return null;
  const anchored = pts.map(p => ({ x: p.x - t24, y: p.y })).filter(p => p.x >= X_MIN && p.x <= X_MAX);
  const t5 = crossTime(anchored, 5);
  const T245 = t5 != null ? t5 : null;   // t24 crossing is x=0 by construction
  return { pts: anchored, T245 };
}

// ---- chart renderers --------------------------------------------------------
function setupCanvas(canvas){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h) return null;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function drawTestChart(canvas, curves, liveCurve){
  const s = setupCanvas(canvas);
  if(!s) return;
  const { ctx, w, h } = s;
  const padL = 44, padR = 12, padT = 14, padB = 26;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const xOf = x => padL + (x - X_MIN) / (X_MAX - X_MIN) * plotW;
  const lyMin = Math.log(Y_MIN), lyMax = Math.log(Y_MAX);
  const yOf = rpm => padT + plotH - (Math.log(Math.max(Y_MIN, rpm)) - lyMin) / (lyMax - lyMin) * plotH;

  // grid
  ctx.font = '10px Inter, sans-serif'; ctx.textBaseline = 'middle';
  for(const v of Y_TICKS){
    const y = yOf(v);
    ctx.strokeStyle = v === 24 ? 'rgba(1,22,36,0.25)' : 'rgba(1,22,36,0.07)';
    ctx.setLineDash(v === 24 ? [5, 4] : []);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = v === 24 ? '#011624' : '#67737c'; ctx.textAlign = 'right';
    ctx.fillText(String(v), padL - 6, y);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for(let x = -10; x <= X_MAX; x += 5){
    const px = xOf(x);
    ctx.strokeStyle = x === 0 ? 'rgba(1,22,36,0.2)' : 'rgba(1,22,36,0.05)';
    ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, padT + plotH); ctx.stroke();
    ctx.fillStyle = '#99a2a7'; ctx.fillText(x + 's', px, padT + plotH + 5);
  }

  const poly = (pts, scaleX) => {
    ctx.beginPath();
    let pen = false;
    for(const p of pts){
      const x = p.x * scaleX;
      if(x < X_MIN || x > X_MAX){ pen = false; continue; }
      const px = xOf(x), py = yOf(p.y);
      if(pen) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      pen = true;
    }
  };

  // tolerance band: ideal curve time-scaled between BAND_FAST..BAND_SLOW
  ctx.beginPath();
  let started = false;
  for(const p of IDEAL_PTS){
    const x = Math.max(X_MIN, Math.min(X_MAX, p.x * BAND_FAST));
    if(!started){ ctx.moveTo(xOf(x), yOf(p.y)); started = true; }
    else ctx.lineTo(xOf(x), yOf(p.y));
  }
  for(let i = IDEAL_PTS.length - 1; i >= 0; i--){
    const p = IDEAL_PTS[i];
    const x = Math.max(X_MIN, Math.min(X_MAX, p.x * BAND_SLOW));
    ctx.lineTo(xOf(x), yOf(p.y));
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(82,48,218,0.07)'; ctx.fill();

  // ideal center line
  ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = '#011624';
  poly(IDEAL_PTS, 1); ctx.stroke(); ctx.setLineDash([]);

  // recorded curves
  for(const c of curves){
    ctx.lineWidth = 1.8; ctx.strokeStyle = c.color; ctx.globalAlpha = 0.9;
    poly(c.pts, 1); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // in-progress spin on top, accent + thick
  if(liveCurve){
    ctx.lineWidth = 3; ctx.strokeStyle = '#5230da';
    poly(liveCurve.pts, 1); ctx.stroke();
  }

  // labels
  ctx.fillStyle = '#67737c'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('rpm (log) — dashed: ideal wheel · shaded: good band · t=0 at 24 rpm', padL + 4, 2);
}

function drawDerivChart(canvas, curves, liveCurve){
  const s = setupCanvas(canvas);
  if(!s) return;
  const { ctx, w, h } = s;
  const padL = 44, padR = 12, padT = 18, padB = 26;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const RPM_MAX = 30;
  const D_MAX = 4;
  const FRICTION_SPLIT = 12;   // below this rpm, excess braking = friction; above = air drag
  const ideal = r => IDEAL_A + IDEAL_B * r + IDEAL_K * Math.pow(r, 1.5);
  // tolerance band around the ideal braking line (relative + small absolute margin)
  const bandLo = r => Math.max(0, ideal(r) * 0.7 - 0.12);
  const bandHi = r => ideal(r) * 1.35 + 0.15;
  const xOf = rpm => padL + rpm / RPM_MAX * plotW;
  const yOf = d => padT + plotH - Math.min(d, D_MAX) / D_MAX * plotH;

  // ---- diagnostic zones (fills first, everything else on top) ----
  const bandPath = (loFn, hiFn, rFrom, rTo) => {
    ctx.beginPath();
    for(let r = rFrom; r <= rTo; r += 0.5){ const x = xOf(r), y = yOf(hiFn(r)); r === rFrom ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    for(let r = rTo; r >= rFrom; r -= 0.5){ ctx.lineTo(xOf(r), yOf(loFn(r))); }
    ctx.closePath();
  };
  // FRICTION zone: above the band at low rpm (red tint)
  ctx.fillStyle = 'rgba(240,68,56,0.09)';
  bandPath(bandHi, () => D_MAX, 0.5, FRICTION_SPLIT); ctx.fill();
  // AIR-DRAG zone: above the band at high rpm (amber tint)
  ctx.fillStyle = 'rgba(245,183,0,0.12)';
  bandPath(bandHi, () => D_MAX, FRICTION_SPLIT, RPM_MAX); ctx.fill();
  // OK band: around the ideal line (green tint)
  ctx.fillStyle = 'rgba(32,178,107,0.13)';
  bandPath(bandLo, bandHi, 0.5, RPM_MAX); ctx.fill();
  // DRAFT zone: below the band (blue tint) — braking weaker than physics allows
  ctx.fillStyle = 'rgba(0,51,255,0.06)';
  bandPath(() => 0, bandLo, 0.5, RPM_MAX); ctx.fill();
  // divider between friction and air-drag halves
  ctx.strokeStyle = 'rgba(1,22,36,0.12)'; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(xOf(FRICTION_SPLIT), padT); ctx.lineTo(xOf(FRICTION_SPLIT), yOf(bandHi(FRICTION_SPLIT))); ctx.stroke();
  ctx.setLineDash([]);

  // zone labels
  ctx.font = '700 10.5px Inter, sans-serif'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#c2415b'; ctx.textAlign = 'left';
  ctx.fillText('FRICTION — bearing/seating → reseat, then clean', xOf(0.6), padT + 4);
  ctx.fillStyle = '#8a6a08'; ctx.textAlign = 'right';
  ctx.fillText('AIR DRAG — wheel shape', xOf(RPM_MAX - 0.5), padT + 4);
  ctx.fillStyle = '#2c4bbd';
  ctx.fillText('DRAFT — breeze is pushing the wheel', xOf(RPM_MAX - 0.5), yOf(0) - 14);
  ctx.save();
  ctx.fillStyle = '#0f8a52'; ctx.textAlign = 'center';
  const midR = 21, ang = Math.atan2(yOf(ideal(24)) - yOf(ideal(18)), xOf(24) - xOf(18));
  ctx.translate(xOf(midR), yOf(ideal(midR)) - 9); ctx.rotate(ang);
  ctx.fillText('GOOD — matches the ideal wheel', 0, 0);
  ctx.restore();

  // grid + axes
  ctx.font = '10px Inter, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  for(let d = 0; d <= D_MAX; d++){
    const y = yOf(d);
    ctx.strokeStyle = 'rgba(1,22,36,0.07)';
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    ctx.fillStyle = '#67737c'; ctx.fillText(String(d), padL - 6, y);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for(let r = 0; r <= RPM_MAX; r += 5){
    ctx.fillStyle = '#99a2a7'; ctx.fillText(String(r), xOf(r), padT + plotH + 5);
  }
  // ideal braking line
  ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = '#011624';
  ctx.beginPath();
  for(let r = 1; r <= RPM_MAX; r += 0.5){
    const d = ideal(r);
    if(r === 1) ctx.moveTo(xOf(r), yOf(d)); else ctx.lineTo(xOf(r), yOf(d));
  }
  ctx.stroke(); ctx.setLineDash([]);

  // measured dots: central differences on anchored pts
  const derivPts = c => {
    const out = [];
    const p = c.pts;
    for(let i = 1; i < p.length - 1; i++){
      if(p[i].y > RPM_MAX || p[i].y < 2) continue;
      const dt = p[i + 1].x - p[i - 1].x;
      if(dt <= 0 || dt > 4) continue;
      const d = (p[i - 1].y - p[i + 1].y) / dt;
      if(d > -0.5 && d < 6) out.push({ rpm: p[i].y, d: Math.max(0, d) });
    }
    return out;
  };
  const all = [];
  for(const c of curves) all.push({ color: c.color, pts: derivPts(c) });
  if(liveCurve) all.push({ color: '#5230da', pts: derivPts(liveCurve) });
  for(const c of all){
    ctx.fillStyle = c.color; ctx.globalAlpha = 0.8;
    for(const p of c.pts){ ctx.beginPath(); ctx.arc(xOf(p.rpm), yOf(p.d), 2.2, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#67737c'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('braking force [rpm/s] vs speed [rpm] — the zone a dot lands in names the culprit', padL + 4, 2);
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
    rpmPts: [],            // fresh-counter true-rpm samples {t, rpm} for charts
    fw: '', hw: '', lastBattery: null,
    // spin segmentation (rawLed-based — see header comment)
    lastCounter: null, startHits: 0, firstHitMs: 0, spinning: false,
    spinStartMs: 0, zeroSinceMs: null, maxLed: 0, maxRpm: 0, pendMaxRpm: 0, prevRaw: null,
    simUsed: false,
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
    // rail glitch ble.js de-spikes). ONLY within an active spin can we call a
    // jump >=10 into the >=22 rail a glitch — there the wheel only decelerates,
    // so such a jump is physically impossible. Outside a spin the same pattern
    // IS the real hand-flick (0 -> 24 in one report), so it must pass through —
    // gating on rec.spinning is what keeps the rail phase in the chart curve.
    const glitch = rec.spinning && rec.prevRaw != null && frame.rawLed >= 22 && (frame.rawLed - rec.prevRaw) >= 10;
    const fresh = frame.counter !== rec.lastCounter;
    const rpm = frame.counter >= RPM_MIN_COUNTER ? rpmOf(frame.counter) : 0;
    if(fresh && !glitch && frame.counter >= RPM_MIN_COUNTER) rec.rpmPts.push({ t, rpm });
    rec.lastCounter = frame.counter;
    if(!rec.spinning){
      if(fresh){
        if(frame.rawLed >= SPIN_START_LED){
          if(rec.startHits === 0){ rec.firstHitMs = t; rec.pendMaxRpm = 0; }  // spin window starts at the FIRST high report
          if(rpm > rec.pendMaxRpm) rec.pendMaxRpm = rpm;   // the true peak usually IS the first report
          rec.startHits++;
          if(rec.startHits >= SPIN_START_HITS){
            rec.spinning = true; rec.spinStartMs = rec.firstHitMs;
            rec.zeroSinceMs = null; rec.maxLed = frame.rawLed; rec.maxRpm = rec.pendMaxRpm;
            rec.startHits = 0;
          }
        } else rec.startHits = 0;
      }
    } else if(!glitch){
      if(frame.rawLed > rec.maxLed) rec.maxLed = frame.rawLed;
      if(rpm > rec.maxRpm) rec.maxRpm = rpm;
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
        max_rpm: Math.round(r.maxRpm),   // TRUE peak from the counter (can far exceed 24)
      };
      if(interrupted) spin.interrupted = true;   // wheel had not settled at zero
      r.spins.push(spin);
      // chart entry (module store — survives wheels and tab switches)
      const curve = buildCurve(r.rpmPts, r.spinStartMs, endMs);
      if(curve){
        const sc = scoreOf(curve.T245);
        spin.T24_5 = curve.T245 != null ? Math.round(curve.T245 * 10) / 10 : null;
        spin.score = sc.score;
        chartCurves.push({
          serial: r.serial, spinN: spin.n, color: PALETTE[curveColorIdx++ % PALETTE.length],
          pts: curve.pts, T245: curve.T245, ...sc,
        });
      }
    }
    r.spinning = false; r.zeroSinceMs = null; r.maxLed = 0; r.maxRpm = 0;
  }
  function endSpin(){
    closeSpin(rec, rec.zeroSinceMs, false);
    paintCurves();
  }

  // ---- simulator (only offered while idle with no wheel connected) ----------
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
    paintLive();
  }
  function simSpin(){ if(sim) sim.omega = (150 + Math.random() * 220) * 2 * Math.PI / 60; }   // real hand spins hit 150-500 rpm
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
      paintCurves();
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
      ? `<span class="dot"></span><span>Wheel <b>connected</b>${bleState.deviceName ? ' · ' + esc(bleState.deviceName) : ''} — ready to test.</span>`
      : `<span class="dot"></span><span>No wheel connected — use the header <b>Connect</b> button.${simBtn}</span>`;
    const sb = host.querySelector('#awbSimBtn');
    if(sb) sb.addEventListener('click', () => { simStart(); paintBle(); });
    const startBtn = host.querySelector('#awbStart');
    if(startBtn) startBtn.disabled = !!rec || (!bleState.connected && !sim);
  }

  // in-progress spin as an anchored chart curve (null until it crosses 24 rpm)
  function liveCurve(){
    if(!rec || !rec.spinning) return null;
    return buildCurve(rec.rpmPts, rec.spinStartMs, now());
  }

  function paintCharts(){
    const c1 = host.querySelector('#awbChart');
    if(c1) drawTestChart(c1, chartCurves, liveCurve());
    const c2 = host.querySelector('#awbDeriv');
    if(c2) drawDerivChart(c2, chartCurves, liveCurve());
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
    if(!rec){ live.style.display = 'none'; paintCharts(); return; }
    live.style.display = '';

    const t = now();
    const last = rec.frames.length ? rec.frames[rec.frames.length - 1] : null;
    // Big readout = TRUE rpm from the counter (the display LED rails at 24; the
    // counter keeps measuring — 500 rpm was seen on a real hand spin).
    const trueRpm = last && last[1] >= RPM_MIN_COUNTER ? Math.min(999, rpmOf(last[1])) : 0;
    const rpmText = trueRpm >= 10 ? String(Math.round(trueRpm)) : (Math.round(trueRpm * 10) / 10).toFixed(1);
    host.querySelector('#awbRpm').innerHTML = `${rpmText}<small>rpm</small>`;
    host.querySelector('#awbElapsed').innerHTML = `elapsed <b>${Math.floor(t / 60000)}:${String(Math.floor(t / 1000) % 60).padStart(2, '0')}</b>`;
    host.querySelector('#awbFrames').innerHTML = `lines <b>${rec.frames.length}</b>`;
    host.querySelector('#awbCounter').innerHTML = `counter <b>${last ? last[1] : '—'}</b> · led <b>${last ? last[2] : '—'}</b>`;
    const badge = host.querySelector('#awbSpinBadge');
    badge.className = 'awb-spinbadge' + (rec.spinning ? ' on' : '');
    badge.textContent = rec.spinning
      ? `Spin ${rec.spins.length + 1} — max ${Math.round(rec.maxRpm)} rpm — ${((t - rec.spinStartMs) / 1000).toFixed(0)}s`
      : `${rec.spins.length} spin${rec.spins.length === 1 ? '' : 's'} recorded — waiting for a spin`;
    paintCharts();
  }

  function paintCurves(){
    const ul = host.querySelector('#awbCurveList');
    if(!ul) return;
    if(!chartCurves.length){
      ul.innerHTML = '<li style="background:none;border:none;color:#99a2a7">No spins on the chart yet — record a wheel and spin it above 24 rpm.</li>';
    } else {
      ul.innerHTML = chartCurves.map((c, i) => `
        <li>
          <span class="awb-cdot" style="background:${c.color}"></span>
          <span class="awb-cserial">${esc(c.serial)}</span>
          <span>spin ${c.spinN}</span>
          <span>${c.T245 != null ? 'T24→5: <b>' + c.T245.toFixed(1) + 's</b>' : '—'}</span>
          <span class="awb-score ${c.cls}">${c.score != null ? c.score + ' · ' + c.grade : 'n/a'}</span>
          <button type="button" class="awb-cx" data-rm="${i}" title="Remove from chart">×</button>
        </li>`).join('');
    }
    paintCharts();
  }

  function paintSaved(){
    const ul = host.querySelector('#awbSaved');
    if(!ul) return;
    if(!savedStore.length){ ul.innerHTML = '<li class="adm-empty">Nothing recorded yet today.</li>'; return; }
    ul.innerHTML = savedStore.map((e, i) => {
      const p = e.payload;
      const db = e.db === 'ok' ? '<span class="awb-dbok">DB ✓</span>'
        : e.db === 'saving' ? '<span class="adm-src">saving…</span>'
        : `<span class="awb-dberr">DB failed</span> <button type="button" class="awb-mini" data-retry="${i}">Retry</button>`;
      // Show the actual DB error text inline — a tooltip-only error already cost
      // one office morning of guessing.
      const errLine = (e.db && e.db.startsWith('err:'))
        ? `<div class="awb-errtext">${esc(e.db.slice(4, 200))}</div>` : '';
      return `<li class="adm-row">
        <div class="adm-info">
          <div class="adm-name">${esc(p.serial)}${p.env && p.env.sim ? '<span class="awb-simtag">SIM</span>' : ''}</div>
          <div class="adm-mail">${p.spins.length} spins · ${p.frame_count} lines · ${esc(new Date(p.started_at).toLocaleTimeString('en-GB'))}</div>
        </div>
        ${db}
        <button type="button" class="awb-mini" data-dl="${i}">JSON</button>
        ${errLine}
      </li>`;
    }).join('');
  }
  // Repaint the saved list on whichever instance is currently mounted — an
  // async save finishing after a tab switch must update the live DOM.
  function repaintSaved(){
    paintSaved();
    if(notifySaved && notifySaved !== paintSaved) notifySaved();
  }

  // ---- shell ----------------------------------------------------------------
  host.innerHTML = `
  <div>
    <div class="adm-head">
      <h1>Wheel test</h1>
      <p>Spin-down tester for grading physical wheels against the ideal-wheel model.
         Everything the wheel sends is recorded raw; scores use the calibrated 2026-08-14 benchmark.</p>
    </div>

    <div class="adm-card">
      <h2>How it works</h2>
      <ol class="awb-steps">
        <li>Connect a wheel (header <b>Connect</b>), type its <b>serial number</b>, press <b>Start</b>.</li>
        <li><b>Spin the wheel hard</b> (aim above 100 rpm), let go, let it coast to a <b>full stop</b>. No drafts, no touching the table.</li>
        <li>Each finished spin lands on the chart with a score. <b>Stop &amp; save</b> stores the wheel; the next serial can follow immediately.</li>
      </ol>
    </div>

    <div class="adm-card">
      <h2>Environment (once per session)</h2>
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
        <label>Serial number<input id="awbSerial" type="text" placeholder="e.g. 2B1262004" autocomplete="off"></label>
        <label>Note (optional)<input id="awbNote" type="text" placeholder="batch, condition…" autocomplete="off"></label>
      </div>

      <div id="awbLive" class="awb-live" style="display:none">
        <div class="awb-stats">
          <span class="awb-rpm" id="awbRpm">0<small>rpm</small></span>
          <span class="awb-kv"><span class="awb-rec"></span>REC</span>
          <span class="awb-kv" id="awbElapsed"></span>
          <span class="awb-kv" id="awbFrames"></span>
          <span class="awb-kv" id="awbCounter"></span>
          <span class="awb-spinbadge" id="awbSpinBadge"></span>
        </div>
      </div>

      <div class="awb-btnrow">
        <button type="button" class="adm-btn" id="awbStart">Start recording</button>
        <button type="button" class="adm-btn awb-stop" id="awbStop" style="display:none">Stop &amp; save wheel</button>
        <button type="button" class="adm-btn" id="awbSimSpin" style="display:none">SIM: spin the wheel</button>
        <button type="button" class="awb-ghost" id="awbDiscard" style="display:none">Discard</button>
      </div>
      <span class="adm-msg" id="awbMsg"></span>
    </div>

    <div class="adm-card">
      <h2>Test chart <button type="button" class="awb-mini" id="awbClear" style="float:right">Clear chart</button></h2>
      <canvas id="awbChart" class="awb-chart"></canvas>
      <canvas id="awbDeriv" class="awb-deriv"></canvas>
      <ul class="awb-curves" id="awbCurveList"></ul>
    </div>

    <div class="adm-card">
      <h2>How to read the score</h2>
      <div class="awb-guide">
        <div class="awb-gitem"><span class="awb-score awb-sA">93+ · A</span><br><b>Excellent</b> — reference-grade wheel and seating. This is the “kurvajó” tier.</div>
        <div class="awb-gitem"><span class="awb-score awb-sB">85–92 · B</span><br><b>Good</b> — inside the factory band. Ship it.</div>
        <div class="awb-gitem"><span class="awb-score awb-sC">72–84 · C</span><br><b>Below band</b> — almost always SEATING, not the wheel: lift it off, reseat, measure again.</div>
        <div class="awb-gitem"><span class="awb-score awb-sD">&lt;72 · D</span><br><b>Poor</b> — reseat first; if it stays low, clean the bearing cup and inspect the needle tip.</div>
      </div>
      <p class="awb-gnote">
        <b>Chart:</b> every curve is aligned so 0&nbsp;s = the moment it slows through 24 rpm; the dashed line is the
        ideal wheel computed from the physics model, the shaded band is the “good” zone — a curve inside the band is fine.
        Sloping <b>below/left</b> of the band = extra brake (seating → dust → damage, in that order of likelihood).
        <b>Score</b> = T(24→5&nbsp;s) versus the 15.0&nbsp;s reference. The lower <b>braking chart</b> is color-coded —
        the zone a dot lands in names the culprit directly: <span style="color:#0f8a52;font-weight:700">green band</span> = healthy,
        <span style="color:#c2415b;font-weight:700">red</span> = friction (reseat → clean),
        <span style="color:#8a6a08;font-weight:700">amber</span> = extra air drag (wheel shape),
        <span style="color:#2c4bbd;font-weight:700">blue</span> = a draft is pushing the wheel (environment, not the wheel).
        One weak spin proves nothing — judge a wheel on its <b>best</b> spin of 3 (bad seating can only subtract, never add).
      </p>
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
  host.querySelector('#awbClear').addEventListener('click', () => {
    if(chartCurves.length && !confirm('Clear all curves from the chart? (Saved data is not affected.)')) return;
    chartCurves.length = 0; paintCurves();
  });
  host.querySelector('#awbCurveList').addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]');
    if(rm){ chartCurves.splice(+rm.dataset.rm, 1); paintCurves(); }
  });
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
  paintBle(); paintSaved(); paintCurves();
  // Dev-only feed for deterministic testing (throttle-proof): frames carry an
  // explicit timestamp and are always SIM-tagged. Harmless in production —
  // admin-gated page, data lands with env.sim=true.
  host.__awbFeed = (frame, tMs) => { simStop(); ingest(frame, true, tMs); };   // feed replaces the sim entirely
  host.__awbState = () => ({
    rec: rec ? { rpmPts: rec.rpmPts.length, spins: rec.spins.length, spinning: rec.spinning,
                 firstPts: rec.rpmPts.slice(0, 4), lastPts: rec.rpmPts.slice(-2) } : null,
    curves: chartCurves.length,
  });

  return () => {
    // Leaving the tab mid-recording: salvage whatever was captured as a local
    // download + DB attempt — test data is field data, never silently drop
    // any of it. releaseCapture runs inside stopAndSave (sync, before awaits).
    if(rec && rec.frames.length) stopAndSave().catch(() => {});
    else releaseCapture();
    if(unsubFrames) unsubFrames();
    if(unsubStatus) unsubStatus();
    simStop();
    if(notifySaved === paintSaved) notifySaved = null;
  };
}
