// research-store.js — data layer of the Research workbench (#/research).
// Everything that persists or exports lives here: the IndexedDB draft flush
// (crash safety for long recordings), the Supabase saves (chunked full-
// resolution frames), the per-room calibration fit, and the CSV/JSON export
// builders with SHA-256. NO DOM in here.
//
// Save discipline (bench-proven, non-negotiable): local download FIRST, then
// the DB — a recording is irreplaceable field data and RLS/network must never
// be able to lose it.
import { supabase } from './db.js';
import {
  rpmOf, RPM_MIN_COUNTER, FACTORY_COEF, decelOf, FORMAT, INERTIA, downloadBlob, scoreOf,
  integrateModel, crossTime,
} from './wheel-capture.js';

export const RUN_MAX_MS = 10 * 60 * 1000;        // owner decision: 10-minute experiments
export const CHUNK_LINES = 1000;                 // ~71 s of stream per chunk (~9/run)
export const CAL_STALE_DAYS = 30;                // amber "stale calibration" threshold
// v1.3: tail observed from CONFIRMED standstill (not from "below 5 rpm") +
// derived run metrics in meta; v1.2: standstill 0-rpm samples in rpm_samples;
// v1.1: 3-spin calibration + derived meta rows
export const RUN_FORMAT = 'ewr-research v1.3; ' + FORMAT;

// ---- calibration v3 protocol constants --------------------------------------
export const CAL_SPINS_TARGET = 3;   // a calibration = three ACCEPTED spins (owner decision, 2026-08-15)
// ADVISORY UX trigger only — NOT a scientific verdict and NOT an auto-exclude:
// above this spin-to-spin T24->5 deviation the auto-save pauses and offers
// "Save anyway / Repeat spin N". Threshold to be re-tuned once real-world
// three-spin calibrations accumulate.
export const CAL_OUTLIER_PCT = 20;
// Speed bands of the "observed calibration range" (spin-to-spin spread, 2-24 rpm).
export const CAL_BAND_BINS = [[2, 5], [5, 10], [10, 17], [17, 24]];
// Analysis-algorithm fingerprint — travels in coef.algo + the meta CSV so every
// number can be traced to the code that made it. Bump on ANY fit/band/loo change.
export const CAL_ALGO = 'cal-v3.2: equal-weight lsq (A+K*w^1.5, 2-24 rpm, d<15); loo gate-times; observed-band 4 bins; outlier advisory ' + CAL_OUTLIER_PCT + '%; no min-point spin gate; tail-from-stillness';

// Explicit column lists — NEVER select * on tables that carry jsonb frames
// (one careless list query would pull megabytes into a phone).
export const RUN_LIST_COLS = 'id, wheel_id, calibration_id, subject_user_id, title, temp_c, rh_pct, labels, notes, started_at, ended_at, status, frame_count, summary, sha256';
export const RUN_DETAIL_COLS = RUN_LIST_COLS + ', user_id, fw, hw, env, markers, rpm_samples, format';
export const CAL_LIST_COLS = 'id, wheel_id, location, temp_c, rh_pct, notes, started_at, ended_at, frame_count, coef, archived, created_at';
// Detail view only — pulls the full raw frames (a ~3-4 min calibration is a
// few hundred KB; NEVER use these columns in a list query). NOTE: the deployed
// research_calibrations table has NO env column (env lives on research_runs
// only) — SIM provenance comes from fw/hw === 'SIM'.
export const CAL_DETAIL_COLS = CAL_LIST_COLS + ', user_id, fw, hw, spins, events, frames, format';

// ---- calibration fit --------------------------------------------------------
// v3 (three-spin protocol): fit the braking model decel = A + K*w^1.5 (B kept
// 0, like the factory fit) by EQUAL-WEIGHT least squares over the accepted
// spins' central-difference (w, decel) points — every spin contributes the
// same total weight, so a slow spin's many low-rpm points cannot dominate.
// On top of the pooled model: per-spin fits, leave-one-out gate-time
// validation (out-of-sample, unlike sigma_rel which is measured on the fitted
// data), and the omega-binned "observed calibration range" (spin-to-spin
// spread as torque — NEVER presented as a confidence interval).
// Falls back to a one-parameter time-scale fit from the best spin's T24->5
// when the LSQ turns unphysical (negative coefficients).
export function derivPoints(curvePts){
  const out = [];
  for(let i = 1; i < curvePts.length - 1; i++){
    const p0 = curvePts[i - 1], p1 = curvePts[i], p2 = curvePts[i + 1];
    if(p1.x < 0) continue;                       // clean decay window only
    const dt = p2.x - p0.x;
    if(dt <= 0 || dt > 4) continue;
    // The regime the model claims: 2-24 rpm. The anchor puts x=0 at the 24
    // crossing, so >24 post-anchor points only come from a re-flick during the
    // tail — they must never feed the fit (and every label says 2-24).
    if(p1.y < 2 || p1.y > 24) continue;
    const d = (p0.y - p2.y) / dt;
    // Upper cap: a hand-grab decelerates at ~50 rpm/s, but a heavily braked
    // wheel legitimately reaches 8-12 rpm/s just below 24 rpm (score-30 field
    // wheel: ~7.2 at 24) — the old <8 cap silently starved exactly the wheels
    // that most need measuring. 15 keeps terrible wheels, still kills grabs.
    if(d > 0 && d < 15) out.push({ w: p1.y, d });
  }
  return out;
}

const medianOf = sorted => !sorted.length ? null
  : sorted.length % 2 ? sorted[(sorted.length - 1) / 2]
  : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

// Weighted normal equations for d = A + K*b, b = w^1.5 (u = point weight).
// Null when singular or unphysical (A<0 / K<=0) — callers fall back explicitly.
function lsqAK(pts){
  let su = 0, sb = 0, sbb = 0, sd = 0, sbd = 0;
  for(const p of pts){
    const u = p.u == null ? 1 : p.u, b = Math.pow(p.w, 1.5);
    su += u; sb += u * b; sbb += u * b * b; sd += u * p.d; sbd += u * b * p.d;
  }
  const det = su * sbb - sb * sb;
  if(Math.abs(det) <= 1e-9) return null;
  const A = (sbb * sd - sb * sbd) / det, K = (su * sbd - sb * sd) / det;
  return (A < 0 || K <= 0) ? null : { A, K };
}

// Model time from `from` rpm down to `to` rpm — a dedicated fine-step (5 ms)
// integration, NOT the drawing-grade integrateModel: the chart integrator's
// 20 ms Euler steps + point thinning put a ~0.5% systematic bias on gate
// times, which would show up as fake leave-one-out "error" on a perfect wheel.
function modelGate(coef, from, to){
  let w = from * 1.2 + 2, t = 0, tFrom = null, tTo = null;
  while(w > to * 0.5 && t < 600){
    const prevW = w, prevT = t;
    w -= decelOf(coef, w) * 0.005;
    t += 0.005;
    if(w >= prevW) return null;                          // unphysical coef guard
    if(tFrom == null && w <= from) tFrom = prevT + (prevW - from) / (prevW - w) * 0.005;
    if(w <= to){ tTo = prevT + (prevW - to) / (prevW - w) * 0.005; break; }
  }
  return (tFrom != null && tTo != null) ? tTo - tFrom : null;
}

export function fitCalibration(spins, curves){
  // "clean" = accepted: crossed 24 with a clean decay, not interrupted, and
  // not set aside as an Excluded attempt (excluded spins stay in the payload
  // for the audit trail but never touch the model)
  const clean = spins.map((s, i) => ({ s, c: curves[i] }))
    .filter(x => x.c && x.s.T24_5 != null && !x.s.interrupted && !x.s.excluded);
  const t245s = clean.map(x => x.s.T24_5).sort((a, b) => a - b);
  const best = t245s.length ? t245s[t245s.length - 1] : null;   // best seating = longest coast

  const perSpinPts = clean.map(x => derivPoints(x.c.pts));
  // pooled points, EQUAL weight per spin (each spin sums to weight 1)
  const pooled = [];
  clean.forEach((x, i) => {
    for(const p of perSpinPts[i]) pooled.push({ w: p.w, d: p.d, u: 1 / perSpinPts[i].length });
  });
  let A = null, K = null, fit = 'none';
  if(pooled.length >= 8){
    const r = lsqAK(pooled);
    if(r){ A = r.A; K = r.K; fit = 'lsq'; }
  }
  if(A == null || K == null){
    // time-scale fallback: coasting s-times longer = uniformly s-times less brake
    if(best == null) return null;
    const s = best / FACTORY_COEF.T24_5;
    A = FACTORY_COEF.A / s; K = FACTORY_COEF.K / s;
    fit = 'scale';
  }
  const coef = { A: Math.round(A * 1000) / 1000, B: 0, K: Math.round(K * 100000) / 100000 };

  // relative residual of the pooled fit (weighted like the fit itself) —
  // in-sample; the out-of-sample number is loo below
  let sigma_rel = null;
  if(pooled.length >= 8){
    let ss = 0, uSum = 0, m = 0;
    for(const p of pooled){
      const pred = decelOf(coef, p.w);
      if(pred > 0.05){ ss += p.u * Math.pow((p.d - pred) / pred, 2); uSum += p.u; m++; }
    }
    if(m > 4 && uSum > 0) sigma_rel = Math.round(Math.sqrt(ss / uSum) * 1000) / 1000;
  }

  // spin-to-spin consistency: spread of T24->5 relative to the median, PLUS
  // the absolute spread in seconds — "0%" would overclaim precision next to a
  // 0.7 s sampling cadence, "<0.1 s" says what was actually observed.
  let quality_pct = null, quality_spread_s = null;
  if(t245s.length >= 2){
    const med = medianOf(t245s);
    const spreadAbs = t245s[t245s.length - 1] - t245s[0];
    quality_spread_s = Math.round(spreadAbs * 10) / 10;
    quality_pct = Math.max(0, Math.round(100 * (1 - spreadAbs / med)));
  }

  // per-spin record: own fit + gate times — repeatability made visible
  const per_spin = clean.map((x, i) => {
    const own = perSpinPts[i].length >= 8 ? lsqAK(perSpinPts[i]) : null;
    const t2410 = crossTime(x.c.pts.filter(p => p.x >= 0), 10);
    return {
      n: x.s.n, T24_5: x.s.T24_5,
      t24_10: t2410 != null ? Math.round(t2410 * 10) / 10 : null,
      max_rpm: x.s.max_rpm,
      A: own ? Math.round(own.A * 1000) / 1000 : null,
      K: own ? Math.round(own.K * 100000) / 100000 : null,
      pts: perSpinPts[i].length,
    };
  });

  // leave-one-out: the OTHER spins' model predicts the held-out spin's 24->5
  // time. Out-of-sample honesty — "a model built from the other spins predicts
  // a fresh coast to within X%".
  let loo = null;
  if(clean.length >= 2){
    const errs = [];
    clean.forEach((x, i) => {
      const others = [];
      clean.forEach((y, j) => {
        if(j === i) return;
        for(const p of perSpinPts[j]) others.push({ w: p.w, d: p.d, u: 1 / perSpinPts[j].length });
      });
      let c2 = others.length >= 8 ? lsqAK(others) : null;
      if(!c2){
        const bt = clean.filter((y, j) => j !== i).map(y => y.s.T24_5).sort((a, b) => a - b);
        if(!bt.length) return;
        const s = bt[bt.length - 1] / FACTORY_COEF.T24_5;
        c2 = { A: FACTORY_COEF.A / s, K: FACTORY_COEF.K / s };
      }
      const pred = modelGate({ A: c2.A, B: 0, K: c2.K }, 24, 5);
      // compare against the UNROUNDED curve time — the 0.1 s rounding on the
      // stored T24_5 would add ±0.3% quantization noise to a honesty metric
      const meas = (x.c && x.c.T245 != null) ? x.c.T245 : x.s.T24_5;
      if(pred) errs.push({ n: x.s.n, pct: Math.round((meas / pred - 1) * 1000) / 10 });
    });
    if(errs.length){
      const abs = errs.map(e => Math.abs(e.pct));
      loo = {
        errs,
        max_abs_pct: Math.round(Math.max(...abs) * 10) / 10,
        mean_abs_pct: Math.round(abs.reduce((a, b) => a + b, 0) / abs.length * 10) / 10,
      };
    }
  }

  // observed calibration range: per speed band, how much the accepted spins'
  // mean braking disagreed with the pooled model, as torque [nN*m]. Spin-to-
  // spin spread from real coasts — never a confidence interval.
  let band_pts = null;
  if(clean.length >= 2 && fit === 'lsq'){
    const rows = [];
    for(const [lo, hi] of CAL_BAND_BINS){
      const devs = [];
      clean.forEach((x, i) => {
        const ps = perSpinPts[i].filter(p => p.w >= lo && p.w < hi);
        if(ps.length < 2) return;
        devs.push(ps.reduce((a, p) => a + (p.d - decelOf(coef, p.w)), 0) / ps.length);
      });
      if(devs.length >= 2){
        const spread = Math.max(...devs.map(Math.abs));
        rows.push([(lo + hi) / 2, Math.round(INERTIA * spread * Math.PI / 30 * 1e9 * 10) / 10]);
      }
    }
    if(rows.length) band_pts = rows;
  }

  // the rpm range the fit actually saw — beyond it every model number is
  // extrapolation (experiments regularly exceed 24 rpm; the display must say
  // so). Only meaningful for a real LSQ: the scale fallback never fitted the
  // pooled points, so claiming a "fitted range" from them would be false.
  let w_fit_min = null, w_fit_max = null;
  if(pooled.length && fit === 'lsq'){
    const ws = pooled.map(p => p.w);
    w_fit_min = Math.round(Math.min(...ws) * 10) / 10;
    w_fit_max = Math.round(Math.max(...ws) * 10) / 10;
  }

  // untouched-tail stats — the ambient noise floor of THIS room
  const tails = clean.map(x => x.s.tail).filter(Boolean);
  const tailAvgs = tails.map(t => t.avg_rpm).sort((a, b) => a - b);
  // the SAME factory score the admin Wheel test shows (owner requirement) —
  // judged on the BEST spin (benchmark lesson: bad seating only subtracts)
  const sc = scoreOf(best);
  return {
    ...coef,
    T24_5: best != null ? Math.round(best * 10) / 10 : null,
    score: sc.score, grade: sc.grade,
    score_basis: clean.length ? 'best of ' + clean.length + ' calibration spin' + (clean.length === 1 ? '' : 's') : null,
    sigma_rel, quality_pct, quality_spread_s, fit,
    spin_count: clean.length,
    per_spin, loo, band_pts, w_fit_min, w_fit_max,
    algo: CAL_ALGO,
    tail_avg: tailAvgs.length ? medianOf(tailAvgs) : null,
    tail_max: tailAvgs.length ? tailAvgs[tailAvgs.length - 1] : null,
    pickups_max: tails.length ? Math.max(...tails.map(t => t.pickups || 0)) : null,
  };
}

// Advisory spread check across the ACCEPTED spins (>=3): the worst spin's
// T24->5 deviation from the mean of the others, in %. Returns {n, pct} above
// the CAL_OUTLIER_PCT advisory line, else null. UX trigger only — never a
// verdict and never an auto-exclude: the researcher decides.
export function calOutlier(spins){
  const ts = spins.filter(s => !s.excluded && !s.interrupted && s.T24_5 != null);
  if(ts.length < 3) return null;
  let worst = null;
  for(const s of ts){
    const others = ts.filter(y => y !== s);
    const m = others.reduce((a, y) => a + y.T24_5, 0) / others.length;
    if(m <= 0) continue;
    const pct = Math.abs(s.T24_5 - m) / m * 100;
    if(!worst || pct > worst.pct) worst = { n: s.n, pct: Math.round(pct * 10) / 10 };
  }
  return worst && worst.pct > CAL_OUTLIER_PCT ? worst : null;
}

// Long-term drift vs the previous calibration of the SAME wheel in the SAME
// location — measured on PREDICTED GATE TIMES, not on A/K directly (the two
// fit parameters co-move; comparing them percentage-wise misleads). Neutral
// numbers only; interpretation stays with the researcher.
export function calDrift(prevCal, coef){
  if(!prevCal || !prevCal.coef || !prevCal.coef.K || !coef || !coef.K) return null;
  const g = (from, to) => {
    const p = modelGate(prevCal.coef, from, to), n = modelGate(coef, from, to);
    return (p != null && n != null && p > 0) ? Math.round((n / p - 1) * 1000) / 10 : null;
  };
  return {
    prev_id: prevCal.id, prev_created_at: prevCal.created_at, days_since: calAgeDays(prevCal),
    t24_5_pct: g(24, 5), t24_10_pct: g(24, 10), t12_6_pct: g(12, 6), t6_3_pct: g(6, 3),
    prev_score: prevCal.coef.score ?? null,
    prev_quality_pct: prevCal.coef.quality_pct ?? null,
  };
}

// Torque noise floor [nN*m] of a room from its calibration tail stats: the
// braking torque at the tail's typical ambient speed — an influence reading
// inside this band is indistinguishable from the room's own air. Falls back
// to the factory-room floor with an explicit flag.
export function noiseFloorNNm(coef){
  const c = coef || FACTORY_COEF;
  // tail_max of 0 is a REAL measurement (dead-calm room), not a missing value
  const tailRpm = (coef && coef.tail_max != null) ? coef.tail_max : 1.5;
  const decel = decelOf(c, Math.max(0.8, tailRpm));            // rpm/s
  const tau = INERTIA * decel * Math.PI / 30 * 1e9;            // nN*m
  return { tau: Math.max(3, Math.round(tau * 10) / 10), factory: !coef };
}

// ---- summaries --------------------------------------------------------------
// Small derived numbers stored on the run row so lists and #/me never touch
// frames. Time-weighted over fresh samples (trapezoid).
export function summarizeRun(rec, extra){
  const pts = rec.rpmPts;
  let peak = 0, revs = 0, wSum = 0, tSum = 0;
  for(let i = 0; i < pts.length; i++){
    if(pts[i].rpm > peak) peak = pts[i].rpm;
    if(i > 0){
      const dt = (pts[i].t - pts[i - 1].t) / 1000;
      if(dt > 0 && dt < 30){
        revs += (pts[i].rpm + pts[i - 1].rpm) / 120 * dt;
        wSum += (pts[i].rpm + pts[i - 1].rpm) / 2 * dt;
        tSum += dt;
      }
    }
  }
  const durS = rec.frames.length ? rec.frames[rec.frames.length - 1][0] / 1000 : 0;
  return {
    peak_rpm: Math.round(peak * 10) / 10,
    mean_rpm: tSum > 0 ? Math.round(wSum / tSum * 100) / 100 : 0,
    revolutions: Math.round(revs * 10) / 10,
    duration_s: Math.round(durS),
    sample_count: pts.length,
    marker_count: (rec.markers || []).length,
    coast_count: rec.spins.length,
    ...(extra || {}),
  };
}

export function makeTitle(labels, startedAtIso){
  const d = new Date(startedAtIso);
  const when = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const tags = (labels || []).slice(0, 3).map(l => '#' + l).join(' ');
  return tags ? `${when} · ${tags}` : `${when} · Research run`;
}

// ---- CSV builders -----------------------------------------------------------
// Canonical files: comma delimiter, period decimals, UTF-8 with BOM, ISO 8601
// UTC with ms. The Excel-HU variant (semicolon + comma decimals + sep=; line)
// is a convenience copy and is explicitly NOT the hashed archival file.
const BOM = '﻿';
const csvCell = v => {
  const s = String(v == null ? '' : v);
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const isoAt = (startedAtIso, tMs) => new Date(new Date(startedAtIso).getTime() + tMs).toISOString();

// One row per raw BLE line (~14 Hz) — the full-resolution requirement is
// literal. `fresh` = 1 when the counter differs from the previous line: the
// 1.43 Hz true-rpm series is one filter click away.
export function buildSamplesCsv(rec){
  const rows = ['utc_iso,t_ms,counter,rpm_true,fresh,raw_led,led'];
  let lastCounter = null;
  for(const f of rec.frames){
    const [t, counter, rawLed, led] = f;
    const fresh = counter !== lastCounter ? 1 : 0;
    lastCounter = counter;
    const rpm = counter >= RPM_MIN_COUNTER ? (Math.round(rpmOf(counter) * 1000) / 1000) : (counter === 0 ? '' : '');
    rows.push(`${isoAt(rec.startedAt, t)},${t},${counter},${rpm},${fresh},${rawLed},${led}`);
  }
  return BOM + rows.join('\n') + '\n';
}

export function buildMarkersCsv(rec){
  const rows = ['utc_iso,t_ms,type,value,note'];
  const all = [];
  all.push({ t_ms: 0, type: 'run_start', value: '', note: '' });
  for(const m of rec.markers || []) all.push(m);
  for(const e of rec.events || []) all.push({ t_ms: e.t_ms, type: e.type, value: e.value || '', note: '' });
  for(const s of rec.spins || []){
    all.push({ t_ms: s.t_start_ms, type: 'coast_start', value: 'n' + s.n, note: 'peak ' + s.max_rpm + ' rpm' });
    all.push({ t_ms: s.t_end_ms, type: 'coast_end', value: 'n' + s.n, note: s.T24_5 != null ? 'T24-5 ' + s.T24_5 + ' s' : '' });
  }
  const endT = rec.frames.length ? rec.frames[rec.frames.length - 1][0] : 0;
  all.push({ t_ms: endT, type: 'run_end', value: '', note: '' });
  all.sort((a, b) => a.t_ms - b.t_ms);
  for(const m of all){
    rows.push([isoAt(rec.startedAt, m.t_ms), m.t_ms, m.type, m.value == null ? '' : m.value, m.note || '']
      .map(csvCell).join(','));
  }
  return BOM + rows.join('\n') + '\n';
}

// key,value layout — locale-proof, and the place where the honesty text and
// the calibration provenance travel WITH the data.
export function buildMetaCsv(rec, meta){
  const kv = [
    // the RUN's own stored format — a re-export of an old run must not claim
    // the current builder's version (archival honesty)
    ['format_version', meta.format || RUN_FORMAT],
    ['export_utc', new Date().toISOString()],
    ['run_id', meta.runId || ''],
    ['run_kind', meta.kind || 'experiment'],
    ['researcher_name', meta.researcherName || ''],
    ['subject_name', meta.subjectName || ''],
    ['subject_user_id', meta.subjectUserId || ''],
    ['wheel_serial', meta.wheelSerial || ''],
    ['wheel_nickname', meta.wheelNickname || ''],
    ['fw', rec.fw || ''], ['hw', rec.hw || ''],
    ['started_at_utc', rec.startedAt],
    ['ended_at_utc', rec.endedAt || ''],
    ['duration_s', rec.frames.length ? Math.round(rec.frames[rec.frames.length - 1][0] / 1000) : 0],
    ['line_count', rec.frames.length],
    ['fresh_sample_count', rec.rpmPts.length],
    ['env_temp_c', meta.tempC == null ? '' : meta.tempC],
    ['env_rh_pct', meta.rhPct == null ? '' : meta.rhPct],
    ['labels', (meta.labels || []).join('|')],
    ['notes', meta.notes || ''],
    ['calibration_id', meta.calibrationId || ''],
    ['calibration_model', 'decel[rpm/s] = A + B*w + K*w^1.5 (w in rpm)'],
    ['calibration_A', meta.coef ? meta.coef.A : ''],
    ['calibration_B', meta.coef ? (meta.coef.B || 0) : ''],
    ['calibration_K', meta.coef ? meta.coef.K : ''],
    ['calibration_T24_5_s', meta.coef ? (meta.coef.T24_5 == null ? '' : meta.coef.T24_5) : ''],
    ['calibration_wheel_score', meta.coef && meta.coef.score != null ? meta.coef.score : ''],
    ['calibration_wheel_grade', meta.coef && meta.coef.grade ? meta.coef.grade : ''],
    ['calibration_sigma_rel', meta.coef ? (meta.coef.sigma_rel == null ? '' : meta.coef.sigma_rel) : ''],
    // v1.1: three-spin calibration provenance — repeatability and validation
    // travel WITH the data, so an exported run is judgeable on its own
    ['calibration_spin_count', meta.coef && meta.coef.spin_count != null ? meta.coef.spin_count : ''],
    ['calibration_score_basis', meta.coef && meta.coef.score_basis ? meta.coef.score_basis : ''],
    ['calibration_quality_pct', meta.coef && meta.coef.quality_pct != null ? meta.coef.quality_pct : ''],
    ['calibration_loo_max_abs_pct', meta.coef && meta.coef.loo ? meta.coef.loo.max_abs_pct : ''],
    ['calibration_observed_band_nnm', meta.coef && meta.coef.band_pts ? meta.coef.band_pts.map(b => b[0] + 'rpm:' + b[1]).join('|') : ''],
    ['calibration_fitted_range_rpm', meta.coef && meta.coef.w_fit_min != null ? meta.coef.w_fit_min + '-' + meta.coef.w_fit_max : ''],
    ['calibration_algo', meta.coef && meta.coef.algo ? meta.coef.algo : ''],
    // v1.2+: save-time derived metrics — same pipeline as the on-screen panels
    ['metric_drive_impulse_nnms', meta.metrics ? meta.metrics.impulse_nnms : ''],
    ['metric_drive_impulse_sigma_nnms', meta.metrics ? meta.metrics.impulse_sigma_nnms : ''],
    ['metric_time_outside_band_s', meta.metrics ? meta.metrics.outside_band_s : ''],
    ['metric_certified_s', meta.metrics ? meta.metrics.certified_s : ''],
    ['metric_time_outside_band_pct', meta.metrics && meta.metrics.outside_band_pct != null ? meta.metrics.outside_band_pct : ''],
    ['metric_longest_excursion_s', meta.metrics ? meta.metrics.outside_longest_s : ''],
    ['metric_excursion_count', meta.metrics ? meta.metrics.outside_count : ''],
    ['metric_outside_band_impulse_nnms', meta.metrics ? meta.metrics.outside_impulse_nnms : ''],
    ['metric_analysis_stability_pct', meta.metrics && meta.metrics.stability_pct != null ? meta.metrics.stability_pct : ''],
    ['metric_energy_in_uj', meta.metrics && meta.metrics.energy_in_uj != null ? meta.metrics.energy_in_uj : ''],
    ['metric_energy_in_sigma_uj', meta.metrics && meta.metrics.energy_in_sigma_uj != null ? meta.metrics.energy_in_sigma_uj : ''],
    ['metric_coast_gates', meta.metrics && meta.metrics.coast_gates
      ? meta.metrics.coast_gates.map(g => 'n' + g.n
          + (g.t24_5 != null ? ' 24-5 ' + g.t24_5 + 's(' + (g.d24_5 >= 0 ? '+' : '') + g.d24_5 + ')' : '')
          + (g.d12_6 != null ? ' 12-6(' + (g.d12_6 >= 0 ? '+' : '') + g.d12_6 + ')' : '')
          + (g.d6_3 != null ? ' 6-3(' + (g.d6_3 >= 0 ? '+' : '') + g.d6_3 + ')' : '')).join('; ')
      : ''],
    ['moment_of_inertia_kgm2', '1.7e-7 (+-10%)'],
    ['counter_semantics', 'counter = revolution period in ~10 ms units; rpm_true = 6000/counter; 0 = standstill; led 0-24 device-railed at 24'],
    ['disclaimer', 'This software cannot distinguish air currents, static or vibration from any other influence; shielding and controls are the researcher\'s responsibility.'],
    ['sha256_samples_csv', meta.sha256 || ''],
  ];
  return BOM + 'key,value\n' + kv.map(([k, v]) => csvCell(k) + ',' + csvCell(v)).join('\n') + '\n';
}

// The derived per-sample series (the panels' own arrays, from computeRunSeries)
// as a canonical CSV. Empty cell = uncertified/blank — NEVER a fake zero.
export function buildSeriesCsv(startedAtIso, rows){
  const head = 'utc_iso,t_s,rpm_true,tau_drive_nnm,band_nnm,decel_rpms,ghost_rpm,ghost_dev_pct,revolutions,energy_uj,work_uj,drive_impulse_nnms,impulse_sigma_nnms,after_gap';
  const cell = v => v == null ? '' : v;
  const out = rows.map(r => [
    isoAt(startedAtIso, Math.round(r.t_s * 1000)), r.t_s, r.rpm,
    cell(r.tau_nnm), cell(r.band_nnm), cell(r.decel_rpms),
    cell(r.ghost_rpm), cell(r.dev_pct),
    r.revs, r.energy_uj, r.work_uj, r.impulse_nnms, r.impulse_sigma_nnms, r.gap,
  ].join(','));
  return BOM + head + '\n' + out.join('\n') + '\n';
}

// ---- data package (ZIP) -----------------------------------------------------
// Dependency-free ZIP writer (STORED entries + CRC32) — the app is buildless,
// and a research data package must be ONE file a researcher can archive.
export function makeZip(files){
  const enc = new TextEncoder();
  const crcTable = new Uint32Array(256);
  for(let n = 0; n < 256; n++){
    let c = n;
    for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c >>> 0;
  }
  const crc32 = bytes => {
    let c = 0xFFFFFFFF;
    for(let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const d = new Date();
  const dosTime = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
  const dosDate = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  const u16 = v => [v & 255, (v >> 8) & 255];
  const u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const chunks = [], central = [];
  let offset = 0;
  for(const f of files){
    const name = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const head = new Uint8Array([
      0x50, 0x4B, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
    ]);
    chunks.push(head, name, data);
    central.push({ name, data, crc, offset });
    offset += head.length + name.length + data.length;
  }
  const cdStart = offset;
  for(const e of central){
    const rec = new Uint8Array([
      0x50, 0x4B, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(e.crc), ...u32(e.data.length), ...u32(e.data.length), ...u16(e.name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(e.offset),
    ]);
    chunks.push(rec, e.name);
    offset += rec.length + e.name.length;
  }
  chunks.push(new Uint8Array([
    0x50, 0x4B, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length),
    ...u32(offset - cdStart), ...u32(cdStart), ...u16(0),
  ]));
  return new Blob(chunks, { type: 'application/zip' });
}

// The package's self-description — a researcher must be able to interpret
// every file and column with NOTHING but this text.
export function buildReadme(m, fileHashes){
  const c = m.coef || {};
  return `EGELY WHEEL RESEARCH — DATA PACKAGE
====================================
run_id:        ${m.runId || '-'}
title:         ${m.title || '-'}
recorded:      ${m.startedAt || '-'}  ->  ${m.endedAt || '-'}  (UTC)
researcher:    ${m.researcherName || '-'}
subject:       ${m.subjectName || '-'}
wheel:         serial ${m.wheelSerial || '-'}${m.wheelNickname ? ' ("' + m.wheelNickname + '")' : ''}
device:        fw ${m.fw || '-'} / hw ${m.hw || '-'}${m.bleDevice ? ' / BLE "' + m.bleDevice + '"' : ''}
environment:   ${m.tempC != null ? m.tempC + ' degC' : '-'} · ${m.rhPct != null ? m.rhPct + ' %RH' : '-'}
format:        ${m.format || '-'}
sha256(samples.csv): ${m.sha256 || '-'}${fileHashes && fileHashes.length ? `

FILE HASHES (SHA-256, computed over the exact bytes at export)
${fileHashes.map(([n, h]) => n.padEnd(17) + h).join('\n')}` : ''}

FILES
-----
samples.csv      The raw radio stream, one row per received line (~14/s). THE
                 archival file — the SHA-256 above was computed over its exact
                 bytes. counter = revolution period in ~10 ms units;
                 rpm_true = 6000/counter; counter 0 = standstill; fresh = 1
                 when the counter value changed (a genuinely new measurement,
                 ~every 0.7 s); led = the device's own 0-24 display value
                 (rails at 24), raw_led = the same before de-spiking.
series.csv       Derived quantities at the fresh-sample cadence — the exact
                 numbers the on-screen instruments showed (same estimator,
                 same code path). EMPTY CELLS mean "uncertified / not
                 defined here" and are deliberate — never read them as zero.
markers.csv      Researcher marks, notes, direction annotations (manual, the
                 device cannot measure direction), engine events (battery,
                 radio drops), coast start/end rows. Times in ms + UTC.
meta.csv         Every scalar in key,value form: environment, wheel identity,
                 the full calibration provenance (model, score, repeatability,
                 validation, observed band, algorithm version) and the run's
                 derived metrics.
run.json         The same, machine-readable, plus the per-coast records.
calibration.json The calibration snapshot this run was measured against.
README.txt       This file.

series.csv COLUMNS
------------------
t_s                seconds since run start
rpm_true           wheel speed [rpm] (6000/counter; 0 = reported standstill)
tau_drive_nnm      influence torque [nN*m]: I*(alpha_measured - alpha_base),
                   where alpha_base comes from the calibration model below;
                   positive = drives the current rotation, negative = brakes
                   it beyond the model. Estimator: least-squares slope over
                   the last 2-5 fresh samples spanning <= 15 s, never across
                   a data gap or a re-spin; baseline is zero at standstill.
band_nnm           reference band B(omega) [nN*m]: the largest of the room's
                   detection floor (observed standstill activity), the
                   calibration model uncertainty (sigma_rel), and the
                   observed three-spin calibration scatter. |tau| inside the
                   band is indistinguishable from calibration variability.
decel_rpms         measured deceleration [-d(rpm)/dt]
ghost_rpm          the "ghost": the calibration model integrated forward from
                   each free coast's start — what the wheel would do on its
                   own. Empty between coasts (nothing to predict there).
ghost_dev_pct      100*(rpm/ghost - 1); empty where ghost < 2 rpm
revolutions        cumulative revolutions (trapezoid over fresh samples)
energy_uj          kinetic energy [microjoule] = 0.5*I*omega^2
work_uj            work ledger [microjoule]: Delta E + integral of
                   tau_base*omega dt — energy beyond ordinary physics
drive_impulse_nnms cumulative integral of tau_drive dt [nN*m*s]
impulse_sigma_nnms model-uncertainty envelope of the impulse
after_gap          1 = this sample follows a radio gap (the estimator was
                   restarted; affected values are blank)

CALIBRATION (the baseline every number leans on)
------------------------------------------------
model:   decel[rpm/s] = A + B*omega + K*omega^1.5   (omega in rpm)
A=${c.A ?? '-'}  B=${c.B ?? 0}  K=${c.K ?? '-'}   fitted: ${c.fit ?? '-'}
T24->5 = ${c.T24_5 ?? '-'} s   wheel score ${c.score ?? '-'}${c.grade ? ' (' + c.grade + ')' : ''}${c.score_basis ? ' — ' + c.score_basis : ''}
repeatability: T24->5 spread ${c.quality_spread_s != null ? c.quality_spread_s + ' s' : (c.quality_pct != null ? (100 - c.quality_pct) + '%' : '-')}
out-of-sample validation (leave-one-out): ${c.loo ? '+/-' + c.loo.max_abs_pct + '%' : '-'}
fitted range: ${c.w_fit_min != null ? c.w_fit_min + '-' + c.w_fit_max + ' rpm (outside it the model is extrapolated)' : '-'}
algorithm: ${c.algo || '-'}
moment of inertia I = 1.7e-7 kg*m^2 (+/-10%) -> absolute torque/energy scale +/-10%

HONESTY NOTES
-------------
- This software cannot distinguish air currents, static or vibration from
  any other influence; shielding and controls are the researcher's
  responsibility.
- Empty cells are deliberate blanks (uncertified), never zeros.
- The observed calibration range is a repeatability measure from three real
  coast-downs, NOT a confidence interval.
- Direction (CW/CCW) markers are manual researcher annotations; the device
  measures speed magnitude only.
- A hand spin is itself a large outside-band torque; cumulative metrics
  include it — judge hands-off stretches.
`;
}

// Excel-HU convenience copy of any canonical CSV: sep=; hint line, semicolon
// delimiter, comma decimals. Never hashed, never archival.
export function toExcelHu(canonicalCsv){
  const body = canonicalCsv.replace(/^﻿/, '');
  const lines = body.split('\n').map(line => {
    if(!line) return line;
    // canonical cells never contain raw commas unless quoted — swap delimiter
    // first, then decimal points inside numeric cells
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
    const parts = [];
    let rest = line;
    while(rest.length){
      const m = rest.match(/^("([^"]|"")*"|[^,]*)(,|$)/);
      if(!m) break;
      parts.push(m[1]);
      rest = rest.slice(m[0].length);
      if(m[3] === '') break;
    }
    return parts.map(c => /^-?\d+\.\d+$/.test(c) ? c.replace('.', ',') : c).join(';');
  });
  return BOM + 'sep=;\n' + lines.join('\n');
}

export async function sha256Hex(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function downloadText(name, text, mime){
  downloadBlob(name, new Blob([text], { type: mime || 'text/csv;charset=utf-8' }));
}

export const exportBaseName = (kind, serial, startedAtIso, sim) =>
  'ewr-research_' + kind + '_' + String(serial || 'unknown').replace(/[^a-z0-9_-]+/gi, '-')
  + '_' + startedAtIso.replace(/[:.]/g, '-') + (sim ? '_SIM' : '');

// ---- IndexedDB draft flush (crash safety) -----------------------------------
// Line-count triggered from the capture's onFrame (never wall-clock timers —
// background tabs throttle them). One transaction per flush: chunk put + meta.
let dbPromise = null;
function openDb(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('ewr-research', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' });
      if(!db.objectStoreNames.contains('chunks')) db.createObjectStore('chunks', { keyPath: ['draftId', 'seq'] });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
const txDone = tx => new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });

export async function draftFlush(draftId, meta, frames, fromLine){
  try {
    const db = await openDb();
    const tx = db.transaction(['drafts', 'chunks'], 'readwrite');
    const seq = Math.floor(fromLine / CHUNK_LINES);
    const slice = frames.slice(fromLine);
    if(slice.length){
      tx.objectStore('chunks').put({
        draftId, seq,
        t0: slice[0][0], t1: slice[slice.length - 1][0],
        frames: slice,
      });
    }
    tx.objectStore('drafts').put({ id: draftId, meta, frame_count: frames.length, updated_ms: Date.now(), status: 'recording' });
    await txDone(tx);
    return true;
  } catch { return false; }   // quota/private-mode: recording continues, only crash safety is lost
}

export async function draftDelete(draftId){
  try {
    const db = await openDb();
    const tx = db.transaction(['drafts', 'chunks'], 'readwrite');
    tx.objectStore('drafts').delete(draftId);
    const idx = tx.objectStore('chunks');
    // chunks keyed [draftId, seq] — bounded range delete
    idx.delete(IDBKeyRange.bound([draftId, 0], [draftId, 1e9]));
    await txDone(tx);
  } catch {}
}

export async function draftListStale(){
  try {
    const db = await openDb();
    const tx = db.transaction('drafts', 'readonly');
    const all = await new Promise((res, rej) => {
      const rq = tx.objectStore('drafts').getAll();
      rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error);
    });
    return all.filter(d => d.status === 'recording' && Date.now() - (d.updated_ms || 0) > 30000);
  } catch { return []; }
}

export async function draftLoad(draftId){
  try {
    const db = await openDb();
    const tx = db.transaction(['drafts', 'chunks'], 'readonly');
    const meta = await new Promise((res, rej) => {
      const rq = tx.objectStore('drafts').get(draftId);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
    const chunks = await new Promise((res, rej) => {
      const rq = tx.objectStore('chunks').getAll(IDBKeyRange.bound([draftId, 0], [draftId, 1e9]));
      rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error);
    });
    chunks.sort((a, b) => a.seq - b.seq);
    // overlapping flushes rewrite the same tail chunk — dedupe by t_ms
    const frames = [];
    for(const c of chunks) for(const f of c.frames){
      if(!frames.length || f[0] > frames[frames.length - 1][0]) frames.push(f);
    }
    return meta ? { meta: meta.meta, frames } : null;
  } catch { return null; }
}

// ---- Supabase: wheels / labels / calibrations / runs ------------------------
export async function listWheels(uid){
  const { data, error } = await supabase.from('research_wheels')
    .select('id, serial, nickname, created_at').eq('user_id', uid).order('created_at');
  return { rows: data || [], error };
}
export async function addWheel(uid, serial, nickname){
  return supabase.from('research_wheels')
    .insert({ user_id: uid, serial: serial.trim().toUpperCase(), nickname: nickname || null })
    .select('id, serial, nickname').maybeSingle();
}
export async function listLabels(uid){
  const { data } = await supabase.from('research_labels')
    .select('id, label').eq('user_id', uid).order('label');
  return data || [];
}
// Plain insert with a fetch-on-duplicate fallback — deliberately NOT upsert:
// ON CONFLICT DO UPDATE needs the UPDATE table privilege too, and this
// project grants exactly what each table needs (a silent permission-denied
// here cost a bug report). Returns { row, error } so callers can SHOW errors.
export async function addLabel(uid, label){
  const norm = label.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-').slice(0, 32);
  if(!norm) return { row: null, error: null };
  const ins = await supabase.from('research_labels')
    .insert({ user_id: uid, label: norm })
    .select('id, label').maybeSingle();
  if(!ins.error) return { row: ins.data, error: null };
  if(/duplicate|unique/i.test(ins.error.message)){
    const { data } = await supabase.from('research_labels')
      .select('id, label').eq('user_id', uid).eq('label', norm).maybeSingle();
    return { row: data, error: null };
  }
  return { row: null, error: ins.error };
}
export async function deleteLabel(id){ return supabase.from('research_labels').delete().eq('id', id); }

export async function listCalibrations(uid, wheelId){
  let q = supabase.from('research_calibrations').select(CAL_LIST_COLS)
    .eq('user_id', uid).eq('archived', false).order('created_at', { ascending: false });
  if(wheelId) q = q.eq('wheel_id', wheelId);
  const { data, error } = await q;
  return { rows: data || [], error };
}
export const calAgeDays = cal => Math.floor((Date.now() - new Date(cal.created_at).getTime()) / 86400000);

export async function saveCalibration(row){
  return supabase.from('research_calibrations').insert(row).select('id').maybeSingle();
}
export async function loadCalibration(id){
  const { data, error } = await supabase.from('research_calibrations')
    .select(CAL_DETAIL_COLS).eq('id', id).maybeSingle();
  return { row: data, error };
}
export async function archiveCalibration(id){
  return supabase.from('research_calibrations').update({ archived: true }).eq('id', id);
}

export async function listRuns(uid){
  const { data, error } = await supabase.from('research_runs').select(RUN_LIST_COLS)
    .eq('user_id', uid).order('started_at', { ascending: false });
  return { rows: data || [], error };
}
export async function loadRun(id){
  const { data, error } = await supabase.from('research_runs').select(RUN_DETAIL_COLS)
    .eq('id', id).maybeSingle();
  return { row: data, error };
}
export async function loadRunFrames(runId){
  const { data, error } = await supabase.from('research_run_frames')
    .select('seq, frames').eq('run_id', runId).order('seq');
  if(error) return { frames: null, error };
  const frames = [];
  for(const c of data || []) for(const f of c.frames) frames.push(f);
  return { frames, error: null };
}
export async function updateRun(id, fields){
  return supabase.from('research_runs').update(fields).eq('id', id);
}
export async function deleteRun(id){
  return supabase.from('research_runs').delete().eq('id', id);
}

// ---- research media (camera / voice takes) ----------------------------------
// Uploaded CLIENT-SIDE into the existing 'session-camera' bucket under a
// research/<uid>/ path — the avatars pattern: path-scoped storage policies
// (SQL handed to the owner) instead of the solo-camera Edge Fn, which only
// authorizes results/sessions. The reference travels in the run's env jsonb.
export async function uploadResearchMedia(uid, runId, take){
  const ext = /mp4/.test(take.blob.type) ? 'mp4' : 'webm';
  // bucket mime whitelists match the BASE type — strip codec parameters
  const contentType = (take.blob.type.split(';')[0] || '').trim()
    || (take.media === 'video' ? 'video/webm' : 'audio/webm');
  const path = `research/${uid}/${runId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('session-camera')
    .upload(path, take.blob, { contentType, upsert: false });
  return { path: error ? null : path, error };
}
// Fresh short-lived signed URL per play — a stored URL would go stale.
export async function researchMediaUrl(path){
  const { data, error } = await supabase.storage.from('session-camera').createSignedUrl(path, 3600);
  return { url: data ? data.signedUrl : null, error };
}

// Insert the run row, then the full-resolution chunks one by one (per-chunk
// retry keeps a flaky network from losing the tail). Returns {id, chunkErrors}.
export async function saveRun(row, frames){
  const { data, error } = await supabase.from('research_runs').insert(row).select('id').maybeSingle();
  if(error || !data) return { id: null, error };
  const id = data.id;
  let chunkErrors = 0;
  for(let i = 0; i < frames.length; i += CHUNK_LINES){
    const slice = frames.slice(i, i + CHUNK_LINES);
    const chunk = {
      run_id: id, seq: Math.floor(i / CHUNK_LINES),
      t0_ms: slice[0][0], t1_ms: slice[slice.length - 1][0],
      lines: slice.length, frames: slice,
    };
    let ok = false;
    for(let attempt = 0; attempt < 3 && !ok; attempt++){
      const { error: ce } = await supabase.from('research_run_frames').insert(chunk);
      if(!ce || /duplicate/i.test(ce.message || '')) ok = true;
      else await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
    if(!ok) chunkErrors++;
  }
  return { id, error: null, chunkErrors };
}
