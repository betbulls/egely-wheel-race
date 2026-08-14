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
  rpmOf, RPM_MIN_COUNTER, FACTORY_COEF, decelOf, FORMAT, INERTIA, downloadBlob,
} from './wheel-capture.js';

export const RUN_MAX_MS = 10 * 60 * 1000;        // owner decision: 10-minute experiments
export const CHUNK_LINES = 1000;                 // ~71 s of stream per chunk (~9/run)
export const CAL_STALE_DAYS = 30;                // amber "stale calibration" threshold
export const RUN_FORMAT = 'ewr-research v1; ' + FORMAT;

// Explicit column lists — NEVER select * on tables that carry jsonb frames
// (one careless list query would pull megabytes into a phone).
export const RUN_LIST_COLS = 'id, wheel_id, calibration_id, subject_user_id, title, temp_c, rh_pct, labels, notes, started_at, ended_at, status, frame_count, summary, sha256';
export const RUN_DETAIL_COLS = RUN_LIST_COLS + ', user_id, fw, hw, env, markers, rpm_samples, format';
export const CAL_LIST_COLS = 'id, wheel_id, location, temp_c, rh_pct, notes, started_at, ended_at, frame_count, coef, archived, created_at';

// ---- calibration fit --------------------------------------------------------
// Fit the braking model decel = A + K*w^1.5 (B kept 0, like the factory fit)
// to the clean anchored curves of a calibration's spins, by linear least
// squares on the basis [1, w^1.5] over central-difference (w, decel) points.
// Falls back to a one-parameter time-scale fit from the best spin's T24->5
// when the LSQ turns unphysical (negative coefficients).
function derivPoints(curvePts){
  const out = [];
  for(let i = 1; i < curvePts.length - 1; i++){
    const p0 = curvePts[i - 1], p1 = curvePts[i], p2 = curvePts[i + 1];
    if(p1.x < 0) continue;                       // clean decay window only
    const dt = p2.x - p0.x;
    if(dt <= 0 || dt > 4) continue;
    if(p1.y < 2 || p1.y > 100) continue;         // the regime the model is for
    const d = (p0.y - p2.y) / dt;
    if(d > 0 && d < 8) out.push({ w: p1.y, d });
  }
  return out;
}

export function fitCalibration(spins, curves){
  const clean = spins.map((s, i) => ({ s, c: curves[i] }))
    .filter(x => x.c && x.s.T24_5 != null && !x.s.interrupted);
  const t245s = clean.map(x => x.s.T24_5).sort((a, b) => a - b);
  const best = t245s.length ? t245s[t245s.length - 1] : null;   // best seating = longest coast

  // pooled derivative points from every clean spin
  const pts = clean.flatMap(x => derivPoints(x.c.pts));
  let A = null, K = null, fit = 'none';
  if(pts.length >= 8){
    // normal equations for d = A + K*b, b = w^1.5
    let n = pts.length, sb = 0, sbb = 0, sd = 0, sbd = 0;
    for(const p of pts){ const b = Math.pow(p.w, 1.5); sb += b; sbb += b * b; sd += p.d; sbd += b * p.d; }
    const det = n * sbb - sb * sb;
    if(Math.abs(det) > 1e-9){
      A = (sbb * sd - sb * sbd) / det;
      K = (n * sbd - sb * sd) / det;
      fit = 'lsq';
    }
  }
  if(A == null || K == null || A < 0 || K <= 0){
    // time-scale fallback: coasting s-times longer = uniformly s-times less brake
    if(best == null) return null;
    const s = best / FACTORY_COEF.T24_5;
    A = FACTORY_COEF.A / s; K = FACTORY_COEF.K / s;
    fit = 'scale';
  }
  const coef = { A: Math.round(A * 1000) / 1000, B: 0, K: Math.round(K * 100000) / 100000 };
  // relative residual of the fit (the deviation-band width of this room)
  let sigma_rel = null;
  if(pts.length >= 8){
    let ss = 0, m = 0;
    for(const p of pts){
      const pred = decelOf(coef, p.w);
      if(pred > 0.05){ ss += Math.pow((p.d - pred) / pred, 2); m++; }
    }
    if(m > 4) sigma_rel = Math.round(Math.sqrt(ss / m) * 1000) / 1000;
  }
  // spin-to-spin consistency (the "calibration quality" number): spread of
  // T24->5 relative to the median. One spin -> no quality claim.
  let quality_pct = null;
  if(t245s.length >= 2){
    const med = t245s[Math.floor(t245s.length / 2)];
    const spread = (t245s[t245s.length - 1] - t245s[0]) / med;
    quality_pct = Math.max(0, Math.round(100 * (1 - spread)));
  }
  // untouched-tail stats — the ambient noise floor of THIS room
  const tails = clean.map(x => x.s.tail).filter(Boolean);
  const tailAvgs = tails.map(t => t.avg_rpm).sort((a, b) => a - b);
  const coefFull = {
    ...coef,
    T24_5: best != null ? Math.round(best * 10) / 10 : null,
    sigma_rel, quality_pct, fit,
    spin_count: clean.length,
    tail_avg: tailAvgs.length ? tailAvgs[Math.floor(tailAvgs.length / 2)] : null,
    tail_max: tailAvgs.length ? tailAvgs[tailAvgs.length - 1] : null,
    pickups_max: tails.length ? Math.max(...tails.map(t => t.pickups || 0)) : null,
  };
  return coefFull;
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
    ['format_version', RUN_FORMAT],
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
    ['calibration_sigma_rel', meta.coef ? (meta.coef.sigma_rel == null ? '' : meta.coef.sigma_rel) : ''],
    ['moment_of_inertia_kgm2', '1.7e-7 (+-10%)'],
    ['counter_semantics', 'counter = revolution period in ~10 ms units; rpm_true = 6000/counter; 0 = standstill; led 0-24 device-railed at 24'],
    ['disclaimer', 'This software cannot distinguish air currents, static or vibration from any other influence; shielding and controls are the researcher\'s responsibility.'],
    ['sha256_samples_csv', meta.sha256 || ''],
  ];
  return BOM + 'key,value\n' + kv.map(([k, v]) => csvCell(k) + ',' + csvCell(v)).join('\n') + '\n';
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
