// view-research.js — the Research workbench (#/research), invitation-gated by
// profiles.research_access (admin console grants it). Universal life-energy
// research instrument: per-room wheel CALIBRATION (the shared bench capture
// engine 1:1), 10-minute EXPERIMENTS with live instrument panels, reusable
// labels, an optional measurement SUBJECT picked from the researcher's
// connected Members, CSV/JSON export with SHA-256, and a run detail view the
// subject can also open from My Measurements.
//
// Cost rule: ZERO Supabase Realtime here — presence is suspended on this route
// by the router. Recording survives background tabs (line-count IndexedDB
// flush, wake lock) and salvages itself on every exit path.
import { supabase } from './db.js';
import * as auth from './auth.js';
import * as ble from './ble.js';
import {
  createCapture, buildCurve, downloadJson, downloadBlob, liveRpmOf, fmtRpm,
  FACTORY_COEF, RPM_MIN_COUNTER, scoreOf, integrateModel, setupCanvas,
} from './wheel-capture.js';
import * as store from './research-store.js';
import { createPanelStack, computeRunMetrics, computeRunSeries } from './research-panels.js';
// The calibration tab shows the exact same chart TRIO as the admin Wheel test
// (owner request) — the renderers are shared from there.
import { drawTestChart, drawDevChart, drawDerivChart, PALETTE } from './admin-wheel-bench.js';
// Run replay: the same transport bar + clock every replay in the app uses;
// camReplayMedia = the shared camera-take card. The capture engine itself is
// the solo dock (createSoloVoice) with research copy — nothing reinvented.
import { createReplayClock, mountTransport, camReplayMedia } from './replay.js';
import { createSoloVoice } from './solo-voice.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const fmtClock = s => Math.floor(s / 60) + ':' + String(Math.floor(s) % 60).padStart(2, '0');

// Module-level caches + tab memory: tab switches and remounts must not lose
// the day's context (bench precedent: savedStore).
let hubTab = 'exp';
const cache = { uid: null, wheels: null, labels: null, members: null };
function cacheFor(uid){
  if(cache.uid !== uid){ cache.uid = uid; cache.wheels = null; cache.labels = null; cache.members = null; }
  return cache;
}

function styles(){
  if(document.getElementById('rsStyles')) return;
  const el = document.createElement('style');
  el.id = 'rsStyles';
  el.textContent = `
  .rs-wrap{max-width:860px;margin:0 auto;padding:8px 0}
  .rs-head{margin-bottom:18px}
  .rs-head h1{font-family:'Montserrat',sans-serif;font-weight:600;font-size:28px;margin:0 0 6px;color:#011624;letter-spacing:-0.3px}
  .rs-head p{color:#67737c;font-size:14px;line-height:1.5;margin:0}
  .rs-tabs{display:flex;gap:8px;margin:0 0 20px;flex-wrap:wrap}
  .rs-tab{font-family:'Montserrat',sans-serif;font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;
    padding:10px 18px;border-radius:999px;cursor:pointer;border:1px solid #dfe3e6;background:#fff;color:#67737c;transition:all .15s}
  .rs-tab:hover{border-color:#5230da;color:#401d91}
  .rs-tab.on{background:#401d91;color:#fff;border-color:#401d91}
  .rs-card{background:#fff;border:1px solid #dfe3e6;border-radius:16px;padding:18px 20px;
    box-shadow:0 10px 28px rgba(1,22,36,.08);margin-bottom:16px}
  .rs-card h2{font-family:'Montserrat',sans-serif;font-weight:600;font-size:13px;letter-spacing:.12em;
    text-transform:uppercase;color:#67737c;margin:0 0 12px}
  .rs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
  .rs-grid label,.rs-field label{display:flex;flex-direction:column;gap:5px;font-size:11.5px;font-weight:700;
    letter-spacing:.06em;text-transform:uppercase;color:#67737c}
  .rs-grid input,.rs-grid select,.rs-field input,.rs-field textarea{box-sizing:border-box;width:100%;background:#f7f8f8;
    border:1px solid #dfe3e6;border-radius:10px;color:#011624;font-family:'Inter',sans-serif;font-size:15px;padding:10px 12px}
  .rs-grid input:focus,.rs-grid select:focus,.rs-field input:focus{outline:none;border-color:#5230da;background:#fff;
    box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .rs-btn{font-family:'Inter',sans-serif;font-size:14px;font-weight:700;padding:12px 20px;border-radius:999px;
    white-space:nowrap;cursor:pointer;border:1px solid transparent;background:#401d91;color:#fff;transition:background .15s}
  .rs-btn:hover{background:#011624}
  .rs-btn:disabled{opacity:.55;cursor:default}
  .rs-btn.stop{background:#c2415b}
  .rs-btn.stop:hover{background:#a13049}
  .rs-ghostbtn{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;padding:10px 16px;border-radius:999px;
    cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#67737c;transition:all .15s}
  .rs-ghostbtn:hover{border-color:#5230da;color:#401d91}
  .rs-mini{font-family:'Inter',sans-serif;font-size:12px;font-weight:700;padding:7px 13px;border-radius:999px;
    cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#401d91;flex-shrink:0}
  .rs-mini:hover{border-color:#5230da}
  .rs-msg{display:block;margin-top:10px;font-size:13px;color:#67737c;min-height:18px}
  .rs-msg.ok{color:#0f8a52}.rs-msg.err{color:#c2415b}
  .rs-note{color:#67737c;font-size:13px;line-height:1.5;margin:0 0 12px}
  .rs-warn{background:rgba(184,134,11,.08);border:1px solid rgba(184,134,11,.35);color:#8a6a08;
    border-radius:10px;padding:9px 12px;font-size:13px;line-height:1.45;margin:10px 0 0}
  .rs-chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .rs-chip{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;padding:7px 14px;border-radius:999px;cursor:pointer;
    background:#fff;border:1px solid #dfe3e6;color:#67737c;transition:all .12s;user-select:none}
  .rs-chip.on{background:#401d91;border-color:#401d91;color:#fff}
  .rs-chip .x{margin-left:6px;color:inherit;opacity:.6}
  .rs-newlabel{display:flex;gap:8px;align-items:center}
  .rs-newlabel input{width:150px;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:999px;padding:7px 14px;font-size:13px}
  .rs-ble{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#67737c;margin:0 0 12px}
  .rs-ble .dot{width:9px;height:9px;border-radius:50%;background:#c9ced2;flex-shrink:0}
  .rs-ble.on .dot{background:#3ddc84}
  .rs-ble.on b{color:#0f8a52}
  .rs-steps{margin:0;padding-left:18px;color:#67737c;font-size:13.5px;line-height:1.7}
  .rs-steps b{color:#011624}
  .rs-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
  .rs-row{display:flex;align-items:center;gap:12px;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:12px;
    padding:10px 12px;font-size:13.5px;color:#27384e;text-decoration:none}
  a.rs-row:hover{border-color:#5230da}
  .rs-row b{color:#011624}
  .rs-row .sub{color:#67737c;font-size:12.5px}
  .rs-empty{color:#99a2a7;font-size:13.5px;padding:4px 2px}
  .rs-kbadge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
    border-radius:999px;padding:2px 9px;background:rgba(82,48,218,.1);color:#401d91}
  .rs-kbadge.warn{background:rgba(184,134,11,.14);color:#8a6a08}
  .rs-kbadge.sim{background:rgba(184,134,11,.14);color:#8a6a08}
  .rs-kbadge.grey{background:#f2f3f4;color:#99a2a7}
  .rs-av{width:30px;height:30px;border-radius:50%;flex-shrink:0;object-fit:cover;display:inline-flex;align-items:center;
    justify-content:center;background:linear-gradient(135deg,#37dbff,#5230da);color:#fff;font-family:'Montserrat',sans-serif;
    font-weight:600;font-size:13px;vertical-align:middle}
  /* status strip + hero vitals */
  .rs-status{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;
    background:#fff;border:1px solid #dfe3e6;border-radius:14px;padding:10px 14px;margin-bottom:12px;
    box-shadow:0 6px 18px rgba(1,22,36,.07);font-size:12.5px;color:#67737c}
  .rs-rec{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff5c5c;
    animation:rsPulse 1.2s ease-in-out infinite}
  @keyframes rsPulse{0%,100%{opacity:1}50%{opacity:.35}}
  .rs-pill{border:1px solid #dfe3e6;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;color:#27384e;white-space:nowrap}
  .rs-presets{display:flex;gap:4px;margin-left:auto}
  .rs-preset{font-size:11px;font-weight:700;border:1px solid #dfe3e6;background:#fff;color:#67737c;
    border-radius:999px;padding:4px 10px;cursor:pointer}
  .rs-preset.on{background:#401d91;border-color:#401d91;color:#fff}
  .rs-livepill{font-size:11px;font-weight:800;border-radius:999px;padding:5px 12px;cursor:pointer;border:1px solid transparent;
    background:#0f8a52;color:#fff;animation:rsPulse 1.4s ease-in-out infinite}
  .rs-inspect{font-size:11px;font-weight:700;color:#8a6a08;background:rgba(184,134,11,.12);border-radius:999px;padding:4px 10px}
  .rs-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:12px}
  .rs-tile{background:#fff;border:1px solid #dfe3e6;border-radius:14px;padding:12px 16px;box-shadow:0 6px 18px rgba(1,22,36,.05);position:relative}
  .rs-tile .v{font-family:'Montserrat',sans-serif;font-weight:600;font-size:34px;line-height:1.05;color:#011624;font-variant-numeric:tabular-nums}
  .rs-tile .v small{font-size:13px;font-weight:700;color:#67737c;margin-left:4px}
  .rs-tile .l{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#67737c;margin-top:3px}
  .rs-tile .f{font-family:ui-monospace,Consolas,monospace;font-size:10px;color:#99a2a7;margin-top:4px}
  .rs-pip{position:absolute;top:10px;right:12px;width:9px;height:9px;border-radius:50%;background:#dfe3e6;transition:background .12s}
  .rs-pip.fresh{background:#5230da}
  .rs-toolbar{position:sticky;bottom:10px;z-index:20;display:flex;flex-wrap:wrap;gap:8px;align-items:center;
    background:#fff;border:1px solid #dfe3e6;border-radius:16px;padding:10px 12px;margin-top:14px;
    box-shadow:0 -6px 24px rgba(1,22,36,.10)}
  .rs-toolbar input{flex:1;min-width:120px;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:999px;padding:9px 14px;font-size:13px}
  .rs-verdict{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:4px 14px;color:#fff}
  .rs-vg{background:#0f8a52}.rs-vy{background:#d97706}.rs-vr{background:#c2415b}.rs-vn{background:#99a2a7}
  .rs-meta{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:#27384e;margin:0 0 12px}
  /* Run-detail stat band — the numbers that matter, promoted from a cramped
     text line to proper tiles (same family as the live hero tiles). The
     energy tile leads and carries the violet accent: it is the one number
     the owner asked to see first. */
  .rs-statband{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:2px 0 16px}
  .rs-stat{background:#fafbfc;border:1px solid #eef1f3;border-radius:12px;padding:11px 14px;min-width:0}
  .rs-stat .v{font-family:'Montserrat',sans-serif;font-weight:700;font-size:25px;line-height:1.05;color:#011624;
    font-variant-numeric:tabular-nums;white-space:nowrap}
  .rs-stat .v small{font-size:12.5px;font-weight:700;color:#67737c;margin-left:3px}
  .rs-stat .l{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#99a2a7;margin-top:3px}
  .rs-stat .f{font-size:11.5px;color:#67737c;margin-top:3px;line-height:1.4}
  .rs-stat.hi{background:#f7f6fd;border-color:rgba(82,48,218,.25);border-left:3px solid #5230da}
  .rs-stat.hi .v{color:#401d91}
  @media (max-width:640px){
    .rs-statband{grid-template-columns:1fr 1fr}
    .rs-stat .v{font-size:21px}
    .rs-stat{padding:9px 12px}
  }
  .rs-meta b{color:#011624}
  .rs-hash{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#67737c;word-break:break-all;
    background:#f7f8f8;border:1px solid #dfe3e6;border-radius:8px;padding:6px 9px;margin-top:8px}
  .rs-honesty{border:1px solid #dfe3e6;border-radius:12px;background:#fafbfc;color:#67737c;font-size:12.5px;
    line-height:1.55;padding:10px 14px;margin-top:14px}
  .rs-dl{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .rs-calchart{width:100%;height:340px;display:block;margin-top:12px}
  .rs-replaybar{display:flex;align-items:center;gap:12px;margin:14px 0 12px}
  .rs-caldev{width:100%;height:150px;display:block;margin-top:6px}
  .rs-calderiv{width:100%;height:240px;display:block;margin-top:6px}
  .rs-progress{height:10px;border-radius:999px;background:#eef1f3;overflow:hidden;flex:1;min-width:140px}
  .rs-progress i{display:block;height:100%;background:linear-gradient(90deg,#37dbff,#5230da);border-radius:999px;transition:width .25s}
  .rs-guide{border:1px solid #dfe3e6;border-radius:14px;background:#f7f8f8;padding:14px 16px;margin-top:14px}
  .rs-guide-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .rs-guide-rpm{font-variant-numeric:tabular-nums;font-size:15px;color:#67737c}
  .rs-guide-rpm b{font-size:22px;color:#011624}
  .rs-guide-big{font-family:'Montserrat',sans-serif;font-weight:600;font-size:40px;line-height:1;color:#401d91;
    font-variant-numeric:tabular-nums;min-width:110px;text-align:center}
  .rs-guide-text{color:#27384e;font-size:13.5px;line-height:1.5;margin-top:10px}
  .rs-phase{font-family:'Montserrat',sans-serif;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;
    background:#401d91;color:#fff;border-radius:999px;padding:6px 14px;white-space:nowrap}
  .rs-score{display:inline-block;font-size:11.5px;font-weight:800;border-radius:999px;padding:2px 10px;color:#fff;min-width:52px;text-align:center}
  .rs-sA{background:#0f8a52}.rs-sB{background:#7ca80c}.rs-sC{background:#d97706}.rs-sD{background:#c2415b}.rs-sN{background:#99a2a7}
  .rs-caltable{width:100%;border-collapse:collapse;font-size:13px}
  .rs-caltable td{padding:7px 8px;border-bottom:1px solid #eef1f3;color:#27384e;vertical-align:middle}
  .rs-caltable b{color:#011624}
  .rs-spinrow{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;background:#f7f8f8;border:1px solid #dfe3e6;
    border-radius:10px;padding:8px 12px;font-size:12.5px;color:#27384e;font-variant-numeric:tabular-nums;margin-bottom:6px}
  .rs-spinrow.exc{opacity:.6}
  .rs-spinrow.exc b{text-decoration:line-through}
  .rs-calband{width:100%;height:140px;display:block;margin-top:6px}
  .rs-dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .rs-fithead{font-family:'Montserrat',sans-serif;font-weight:600;font-size:16px;color:#011624;margin:10px 0 4px}
  .rs-fitgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:10px;margin:4px 0 10px}
  .rs-fitcard{background:#f7f8f8;border:1px solid #dfe3e6;border-radius:12px;padding:10px 12px}
  .rs-fitcard .l{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#67737c}
  .rs-fitcard .v{font-family:'Montserrat',sans-serif;font-weight:600;font-size:20px;color:#011624;margin:3px 0}
  .rs-fitcard .x{font-size:11.5px;color:#67737c;line-height:1.45}
  .rs-tech{margin:6px 0 0}
  .rs-tech summary{cursor:pointer;font-size:12.5px;font-weight:700;color:#401d91}
  .rs-scale{margin:8px 0 2px}
  .rs-scale-bar{position:relative;height:13px;border-radius:999px;background:#f2f3f4}
  .rs-scale-bar i{position:absolute;top:0;height:100%}
  .rs-scale-bar i.z0{border-radius:999px 0 0 999px}
  .rs-scale-bar i.z3{border-radius:0 999px 999px 0}
  .rs-scale-bar b{position:absolute;top:-8px;transform:translateX(-50%);background:#011624;color:#fff;font-size:10.5px;
    padding:1px 7px;border-radius:999px;line-height:1.6;z-index:2}
  .rs-scale-l{position:relative;height:13px;font-size:9.5px;color:#99a2a7}
  .rs-scale-l span{position:absolute;transform:translateX(-50%)}
  .rs-scale-l span.e0{transform:none;left:0}
  .rs-scale-l span.e1{transform:none;right:0}
  .rs-chart-h{font-family:'Montserrat',sans-serif;font-weight:600;font-size:13.5px;color:#011624;margin:16px 0 2px}
  .rs-chart-x{font-size:12px;color:#67737c;line-height:1.5;margin:0 0 4px}
  .rs-qwrap{margin:0 0 12px}
  .rs-qchips{display:flex;flex-wrap:wrap;gap:6px}
  .rs-qchip{font-family:inherit;font-size:11.5px;border:1px solid #dfe3e6;border-radius:999px;padding:4px 11px;color:#27384e;background:#fff;
    font-variant-numeric:tabular-nums;cursor:pointer}
  .rs-qchip:hover{border-color:#b9a7f5}
  .rs-qchip.open{border-color:#5230da;box-shadow:0 0 0 1px #5230da inset}
  .rs-qchip b{font-weight:700;color:#67737c;text-transform:uppercase;font-size:9.5px;letter-spacing:.05em;margin-right:5px}
  .rs-qchip.warn{border-color:rgba(184,134,11,.5);background:rgba(184,134,11,.07);color:#8a6a08}
  .rs-qchip.warn b{color:#8a6a08}
  .rs-qcap{margin-top:6px;color:#67737c;font-size:12px;line-height:1.5;background:#fbfbfc;
    border:1px solid #eef1f3;border-radius:8px;padding:7px 10px}
  .rs-banner{display:flex;align-items:center;gap:10px;background:rgba(82,48,218,.07);border:1px solid rgba(82,48,218,.3);
    color:#401d91;border-radius:12px;padding:10px 14px;font-size:13px;margin-bottom:14px}
  @media (max-width:640px){ .rs-tile .v{font-size:28px} }
  `;
  document.head.appendChild(el);
}

// ---- helpers ----------------------------------------------------------------
const avatarHtml = (url, name) => url
  ? `<img class="rs-av" src="${esc(url)}" alt="">`
  : `<span class="rs-av">${esc((name || '?').charAt(0).toUpperCase())}</span>`;

function calChipText(cal){
  const age = store.calAgeDays(cal);
  const c = cal.coef || {};
  // date AND time — several calibrations on one day must stay tellable apart
  const d = new Date(cal.created_at);
  const when = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${cal.location || 'room'} · ${when} (${age}d)`
    + (c.score != null ? ` · score ${c.score} (${c.grade})` : '')
    + (c.T24_5 != null ? ` · T24→5 ${c.T24_5}s` : '');
}

// Dense DISPLAY curve from the RAW frame lines (~2 pts/s) with standstill
// included as 0 — the shared chart clamps 0 to its floor, so the curve visibly
// lands on the bottom and runs along it instead of vanishing (owner request).
// The SCIENCE numbers (T24→5, fit) always come from the engine's own curve.
// Shared by the live calibration tab and the calibration detail view.
function calDisplayCurveFrom(frames, fromMs, toMs){
  const raw = [];
  let lastT = -Infinity;
  for(const f of frames){
    if(f[0] < fromMs - 12000) continue;
    if(f[0] > toMs) break;
    if(f[0] - lastT < 450) continue;
    lastT = f[0];
    raw.push({ t: f[0] / 1000, rpm: f[1] >= RPM_MIN_COUNTER ? 6000 / f[1] : 0 });
  }
  // anchor at the LAST downward 24-crossing (guided flow: one coast per spin)
  let t24 = null;
  for(let i = 1; i < raw.length; i++){
    const a = raw[i - 1], b = raw[i];
    if(a.rpm > 24 && b.rpm <= 24 && b.rpm > 0){
      t24 = a.t + (Math.log(a.rpm) - Math.log(24)) / (Math.log(a.rpm) - Math.log(b.rpm)) * (b.t - a.t);
    }
  }
  if(t24 == null) return null;
  const pts = raw.map(p => ({ x: p.t - t24, y: p.rpm })).filter(p => p.x >= -12 && p.x <= 48);
  return pts.length > 3 ? { pts } : null;
}

const scorePillHtml = t245 => {
  const sc = scoreOf(t245);
  return sc.score == null
    ? '<span class="rs-score rs-sN">n/a</span>'
    : `<span class="rs-score rs-s${sc.grade}">${sc.score} · ${sc.grade}</span>`;
};
function tailLabel(tail){
  if(!tail) return '';
  if(tail.stopped) return 'standstill: STILL';
  return `standstill: Ø${tail.avg_rpm.toFixed(1)} rpm · ${tail.pickups} motion restart${tail.pickups === 1 ? '' : 's'}${tail.from_still === false ? ' · never fully stopped' : ''}`;
}
const fmtPctSigned = v => v == null ? '—' : (v > 0 ? '+' : '') + v + '%';

// Wheel-health scale: where this score sits between 0 and 110, with the grade
// bands the guide explains (D <72, C 72–84, B 85–92 = factory, A 93+).
function scoreScaleHtml(score){
  if(score == null) return '';
  const pct = v => (v / 110 * 100).toFixed(1) + '%';
  const pos = Math.max(3, Math.min(97, score / 110 * 100));
  return `<div class="rs-scale">
    <div class="rs-scale-bar">
      <i class="z0" style="left:0;width:${pct(72)};background:rgba(194,65,91,.30)"></i>
      <i style="left:${pct(72)};width:${pct(13)};background:rgba(217,119,6,.30)"></i>
      <i style="left:${pct(85)};width:${pct(8)};background:rgba(124,168,12,.30)"></i>
      <i class="z3" style="left:${pct(93)};width:${pct(17)};background:rgba(15,138,82,.30)"></i>
      <b style="left:${pos}%">${score}</b>
    </div>
    <div class="rs-scale-l">
      <span class="e0">0</span><span style="left:${pct(72)}">72 · C</span><span style="left:${pct(85)}">85 · B</span><span style="left:${pct(93)}">93 · A</span><span class="e1">110</span>
    </div>
  </div>`;
}

// The calibration result, three layers deep (owner + ChatGPT-feedback round):
// 1) a plain-language headline + one sentence saying what happened overall,
// 2) understandable cards (wheel condition with the health scale, repeatability,
//    cross-check, natural slowdown, validated range),
// 3) a collapsed "Technical details" with A/K/σ/points/drift for the engineers.
// Deliberately NOT one merged score — the cards answer different questions.
function fitSummaryHtml(fit, opts){
  if(!fit) return '';
  const o = opts || {};
  const spread = fit.quality_pct != null ? (100 - fit.quality_pct) : null;
  const spreadS = fit.quality_spread_s;
  const spreadTxt = spreadS != null ? (spreadS < 0.1 ? '&lt;0.1 s' : spreadS + ' s') : (spread != null ? spread + '%' : null);
  const ptsTotal = fit.per_spin ? fit.per_spin.reduce((a, p) => a + (p.pts || 0), 0) : null;
  // wording tiers only — never a scientific verdict
  const tier = spread == null ? null : spread <= 10 ? 'good' : spread <= 20 ? 'moderate' : 'limited';
  const tierWord = { good: 'good repeatability', moderate: 'moderate repeatability', limited: 'limited repeatability' };
  const head = o.progress
    ? `Calibration in progress — ${fit.spin_count} of ${store.CAL_SPINS_TARGET} spin${fit.spin_count === 1 ? '' : 's'} accepted`
    : `Calibration result${tier ? ' — ' + tierWord[tier] : ''}`;
  // The T24→5 spread only proves the spins reached 5 rpm at similar times —
  // the FINAL reference band also carries the speed-by-speed scatter and the
  // standstill activity, so the sentence must not oversell a "tight band".
  // old rows (pre-v3.2) carry quality_pct but no quality_spread_s — fall back
  // to the relative form instead of printing "undefined s"
  const spreadWord = spreadS != null ? ((spreadS < 0.1 ? 'less than 0.1' : spreadS) + ' s') : (spread != null ? spread + '%' : '');
  let sentence = '';
  if(tier === 'good') sentence = `The ${fit.spin_count} accepted spins reached 5 rpm at nearly the same time (T24→5 within ${spreadWord}). Their speed-by-speed variation and the observed standstill activity set the final reference band shown on the charts.`;
  else if(tier === 'moderate') sentence = `The ${fit.spin_count} accepted spins matched reasonably (T24→5 spread ${spreadWord}). The speed-by-speed variation and the standstill activity set the final reference band.`;
  else if(tier === 'limited') sentence = `The ${fit.spin_count} accepted spins were not closely repeatable (T24→5 spread ${spreadWord}). The reference band is wider as a result, so smaller experimental deviations may be indistinguishable from normal calibration variation.`;
  const health = fit.grade === 'C'
    ? 'This wheel scored below the factory wheel-condition benchmark — reseat it on the needle tip and recalibrate before trusting experiment numbers.'
    : fit.grade === 'D'
      ? 'This wheel scored well below the factory wheel-condition benchmark — experiments are not recommended until it improves: reseat it on the needle tip; if the score stays low, clean the bearing.'
      : '';
  const cards = [];
  cards.push(`<div class="rs-fitcard"><div class="l">Wheel condition</div>
    <div class="v">${scorePillHtml(fit.T24_5)}</div>
    ${scoreScaleHtml(fit.score)}
    <div class="x">vs the factory reference wheel — higher = freer running${fit.score_basis ? ' · based on the ' + esc(fit.score_basis) : ''}</div></div>`);
  if(spreadTxt != null) cards.push(`<div class="rs-fitcard"><div class="l">Repeatability</div>
    <div class="v">${spreadTxt}</div>
    <div class="x">T24→5 spread across the ${fit.spin_count} spins${spread != null ? ' (' + spread + '% relative)' : ''} — lower is better</div></div>`);
  if(fit.loo) cards.push(`<div class="rs-fitcard"><div class="l">Cross-check</div>
    <div class="v">±${fit.loo.max_abs_pct}%</div>
    <div class="x">a model built from the other spins predicts each spin this well — lower is better</div></div>`);
  cards.push(`<div class="rs-fitcard"><div class="l">Natural slowdown</div>
    <div class="v">${fit.T24_5 ?? '—'} s</div>
    <div class="x">untouched, from 24 down to 5 rpm (reference wheel: 15.0 s)</div></div>`);
  if(fit.w_fit_min != null) cards.push(`<div class="rs-fitcard"><div class="l">Validated range</div>
    <div class="v">${fit.w_fit_min}–${fit.w_fit_max} rpm</div>
    <div class="x">inside: model built on measured data · outside: extrapolated</div></div>`);
  const flagged = fit.outlier_ack
    ? `<div class="rs-warn" style="margin:0 0 10px">${fit.outlier_unresolved ? 'A flagged spin was left undecided (saved by auto-stop or leaving the page)' : 'Saved with a flagged spin kept'}${fit.outlier_pct != null ? ' (±' + fit.outlier_pct + '%)' : ''} — repeatability is limited and the observed range reflects it.</div>` : '';
  const tech = `
    <details class="rs-tech"><summary>Technical details</summary>
      <div class="rs-meta" style="margin-top:8px">
        <span>model: <b>decel = A + K·ω^1.5</b> · A=${fit.A} · K=${fit.K} (${fit.fit})</span>
        ${fit.sigma_rel != null ? `<span>in-sample fit residual: <b>σ ±${Math.round(fit.sigma_rel * 100)}%</b></span>` : ''}
        ${ptsTotal ? `<span>fit points: <b>${ptsTotal}</b></span>` : ''}
        ${fit.band_pts ? `<span>observed range (scatter vs the pooled model): up to <b>${Math.max(...fit.band_pts.map(b => b[1]))} nN·m</b></span>` : ''}
        ${fit.tail_avg != null ? `<span>observed standstill activity: <b>Ø${fit.tail_avg} rpm</b></span>` : ''}
        ${fit.drift ? `<span>vs previous calibration (${fit.drift.days_since}d ago): 24→5 ${fmtPctSigned(fit.drift.t24_5_pct)} · 24→10 ${fmtPctSigned(fit.drift.t24_10_pct)} · 12→6 ${fmtPctSigned(fit.drift.t12_6_pct)}</span>` : ''}
        ${fit.algo ? `<span style="color:#99a2a7">${esc(fit.algo)}</span>` : ''}
      </div>
    </details>`;
  const scaleNote = fit.fit === 'scale'
    ? '<p class="rs-note" style="margin:4px 0 10px">Model: time-scaled from the best spin — the decay was too fast for enough clean fit points (typical for a heavily braked wheel; the score still measures its condition).</p>'
    : '';
  return `
    <div class="rs-fithead">${esc(head)}</div>
    ${sentence ? `<p class="rs-note" style="margin:4px 0 10px">${esc(sentence)}</p>` : ''}
    ${scaleNote}
    ${health ? `<div class="rs-warn" style="margin:0 0 10px">${esc(health)}</div>` : ''}
    ${flagged}
    <div class="rs-fitgrid">${cards.join('')}</div>
    <p class="rs-note" style="margin:2px 0 6px">Wheel condition and repeatability describe different things — a wheel can
    behave very consistently across all three spins while still braking far more than the factory reference.</p>
    ${tech}`;
}

// Per-chart titles + plain explanations (shared by the live calibration tab
// and the detail view) — every chart explains itself where it stands.
const CAL_CHARTS = {
  top: { t: 'Do the spins slow down the same way?',
    x: 'Colored lines = the accepted spins, lined up where each crossed 24 rpm (t = 0). Grey dashed = excluded attempts. Thick dark = the baseline model built from these spins. Thin dashed with the green band = the factory reference wheel. Left of 0 s (greyed) = above 24 rpm — recorded, but outside the fitted range. The rpm scale is logarithmic so the fast and slow parts both stay visible.' },
  dev: { t: 'Difference from the factory reference wheel [%]',
    x: '0% = slows exactly like the factory reference wheel. Above 0 = holds its speed longer (less braking); below 0 = loses speed faster (more braking). Small systematic differences show up here first.' },
  deriv: { t: 'Deceleration pattern by speed',
    x: 'Each dot is one moment: braking [rpm/s] vs speed [rpm]. Dashed = the factory reference, solid dark = this calibration\'s model. The tinted zones suggest POSSIBLE interpretations of a pattern — they cannot identify the physical cause.' },
  band: { t: 'How wide is the baseline at each speed?',
    x: 'Each bar shows how far the accepted spins sat from their combined model in that speed range, as torque. Experimental readings inside this range cannot be distinguished from the calibration\'s own variation.' },
};
const chartHead = k => `<div class="rs-chart-h">${esc(CAL_CHARTS[k].t)}</div><p class="rs-chart-x">${CAL_CHARTS[k].x}</p>`;

// "Observed calibration range" strip: per speed band, how far the accepted
// spins' braking disagreed with the pooled model, in nN·m — the spin-to-spin
// spread from three real coasts. Deliberately never called a confidence
// interval (three runs cannot honestly claim statistical certainty).
function drawBandStrip(canvas, bandPts, floorTau, allBins){
  const s = setupCanvas(canvas);
  if(!s) return;
  const { ctx, w, h } = s;
  const padL = 44, padR = 12, padT = 16, padB = 22;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const RPM_MAX = 24;
  const yMax = Math.max(4, floorTau || 0, ...bandPts.map(b => b[1])) * 1.2;
  const xOf = r => padL + r / RPM_MAX * plotW;
  const yOf = v => padT + plotH - Math.min(v, yMax) / yMax * plotH;
  ctx.font = '10px Inter, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  for(const v of [0, Math.round(yMax / 2 * 10) / 10]){
    const y = yOf(v);
    ctx.strokeStyle = 'rgba(1,22,36,0.07)';
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    ctx.fillStyle = '#67737c'; ctx.fillText(String(v), padL - 6, y);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  // ticks at the BAND-BIN EDGES — the speed ranges the bars actually cover
  for(const r of [0, 2, 5, 10, 17, 24]){ ctx.fillStyle = '#99a2a7'; ctx.fillText(String(r), xOf(r), padT + plotH + 4); }
  // empty bins must not read as "zero deviation" — mark them explicitly
  if(allBins){
    for(const [lo, hi] of allBins){
      const wc = (lo + hi) / 2;
      if(bandPts.some(b => Math.abs(b[0] - wc) < 0.01)) continue;
      const x0 = xOf(lo) + 2, x1 = xOf(hi) - 2;
      ctx.fillStyle = 'rgba(1,22,36,0.03)';
      ctx.fillRect(x0, padT, x1 - x0, plotH);
      ctx.fillStyle = '#99a2a7'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('no data', (x0 + x1) / 2, padT + plotH / 2);
      ctx.font = '10px Inter, sans-serif';
    }
  }
  if(floorTau){
    ctx.strokeStyle = 'rgba(103,115,124,0.6)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(padL, yOf(floorTau)); ctx.lineTo(padL + plotW, yOf(floorTau)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#67737c'; ctx.textAlign = 'left';
    ctx.fillText('detection floor (from the observed standstill activity) ' + floorTau + ' nN·m', padL + 4, Math.max(padT + 6, yOf(floorTau) - 10));
  }
  for(const [wc, tau] of bandPts){
    const bw = plotW / RPM_MAX * 2.6;
    ctx.fillStyle = 'rgba(82,48,218,0.35)';
    ctx.fillRect(xOf(wc) - bw / 2, yOf(tau), bw, yOf(0) - yOf(tau));
    ctx.fillStyle = '#401d91'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(String(tau), xOf(wc), yOf(tau) - 2);
    ctx.textBaseline = 'top';
  }
  ctx.fillStyle = '#67737c'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('observed calibration range [nN·m] vs speed [rpm] — how far each spin sat from the pooled model', padL + 4, 2);
}

// ---- data package -----------------------------------------------------------
// One .zip with EVERYTHING a researcher needs to work standalone: the hashed
// raw stream, the derived per-sample series (same estimator as the screen),
// markers, all metadata (kv + machine-readable), the calibration snapshot and
// a self-describing README. (Owner request: "minden adat, egy letölthető,
// önmagában értelmezhető struktúrában".)
function downloadPackage(o){
  const files = [
    { name: 'README.txt', text: store.buildReadme(o.readmeMeta) },
    { name: 'samples.csv', text: o.samplesCsv },
    { name: 'series.csv', text: store.buildSeriesCsv(o.startedAt, o.seriesRows) },
    { name: 'markers.csv', text: o.markersCsv },
    { name: 'meta.csv', text: o.metaCsv },
    { name: 'run.json', text: JSON.stringify(o.runJson, null, 1) },
    { name: 'calibration.json', text: JSON.stringify(o.calJson, null, 1) },
  ];
  downloadBlob(o.base + '_package.zip', store.makeZip(files));
}

// ---- quality header (4 chips) ----------------------------------------------
// Always-visible measurement-quality summary: calibration match · reference
// quality · speed coverage · data coverage. Advisory amber only — never a
// verdict (red stays reserved for technical faults). Shared by the live
// experiment screen and the run detail page.
function computeQuality(samples, coef){
  const wmax = coef && coef.w_fit_max != null ? coef.w_fit_max : 24;
  let gapT = 0, total = 0, moving = 0, inRange = 0, last = null;
  for(const s of samples){
    if(last){
      const dt = s.t - last.t;
      const expected = s.rpm >= 2 ? 0.7 : 1.5;   // same gap rule as the pipeline
      if(dt > 0 && dt < 600){ total += dt; if(dt > 2.5 * expected + 2) gapT += dt; }
    }
    last = s;
    if(s.rpm >= 0.5){ moving++; if(s.rpm <= wmax) inRange++; }
  }
  return {
    wmax,
    uptimePct: total > 0 ? Math.max(0, Math.round(100 - gapT / total * 100)) : null,
    speedPct: moving > 0 ? Math.round(inRange / moving * 100) : null,
  };
}
// One chip may be "open": its explanation shows as a caption line under the
// row. Module-level so the live screen's 1 Hz re-render keeps it open. Chips
// were tooltip-only before — tooltips do not exist on touch.
let qchipOpen = null;
function qualityChipsHtml(q){
  const caps = {};
  const chip = (key, label, val, warn, title) => {
    caps[key] = title;
    return `<button type="button" class="rs-qchip${warn ? ' warn' : ''}${qchipOpen === key ? ' open' : ''}" data-qk="${key}" title="${esc(title)}"><b>${label}</b>${val}</button>`;
  };
  const out = [];
  if(q.factory){
    out.push(chip('cal', 'cal', 'factory model', true,
      'There is no ruler of your own here: this run is compared with the factory reference, not with how YOUR wheel behaves in YOUR room. Calibrate the wheel in this room to fix that.'));
  } else {
    const parts = [q.ageDays != null ? q.ageDays + 'd old' : '—'];
    if(q.dT != null) parts.push('ΔT ' + (q.dT > 0 ? '+' : '') + q.dT + '°C');
    if(q.dRh != null) parts.push('ΔRH ' + (q.dRh > 0 ? '+' : '') + q.dRh + '%');
    const warn = (q.ageDays != null && q.ageDays > store.CAL_STALE_DAYS)
      || (q.dT != null && Math.abs(q.dT) > 3) || (q.dRh != null && Math.abs(q.dRh) > 15);
    out.push(chip('cal', 'cal match', parts.join(' · '), warn,
      'Is the ruler fresh? Every chart compares this run with how the wheel slowed down on its own when you calibrated it. This shows how old that calibration is, and how different the room was (temperature, humidity). A stale calibration, or one made in a different-feeling room, shifts what "normal slowing" looks like — and fakes differences that are not there.'));
    const c = q.coef || {};
    const spread = c.quality_pct != null ? 100 - c.quality_pct : null;
    const val = (c.sigma_rel != null ? 'σ ±' + Math.round(c.sigma_rel * 100) + '%' : 'σ —')
      + (c.quality_spread_s != null
        ? ' · spread ' + (c.quality_spread_s < 0.1 ? '<0.1' : c.quality_spread_s) + 's'
        : (spread != null ? ' · spread ' + spread + '%' : ''));
    out.push(chip('ref', 'reference', val, spread != null && spread > 20,
      'How precise is the ruler? When you calibrated, the wheel\'s own slow-down repeated within ±' + (q.coef && q.coef.sigma_rel != null ? Math.round(q.coef.sigma_rel * 100) : '—') + '%. Any difference SMALLER than that means nothing — the wheel wobbles this much on its own. This is the grey band on every chart below.'));
  }
  out.push(chip('speed', 'speed', q.speedPct != null ? q.speedPct + '% ≤ ' + q.wmax + ' rpm' : '—',
    q.speedPct != null && q.speedPct < 70,
    'Did the run stay inside the ruler\'s range? The calibration only measured this wheel up to ' + q.wmax + ' rpm. This is the share of the moving time spent below that. Above it, the "normal slowing" curve is a formula stretched past anything that was measured — the raw rpm stays true, but "differs from normal" readings up there stand on weaker ground.'));
  out.push(chip('data', 'data', q.uptimePct != null ? q.uptimePct + '% uptime' : '—',
    q.uptimePct != null && q.uptimePct < 90,
    'Did every reading arrive? The wheel sends a reading by radio about every 0.7 s; this is the share that arrived without a gap. Where readings were lost, the charts go blank rather than guess.'));
  const cap = qchipOpen && caps[qchipOpen] ? `<div class="rs-qcap">${esc(caps[qchipOpen])}</div>` : '';
  return `<div class="rs-qwrap"><div class="rs-qchips">${out.join('')}</div>${cap}</div>`;
}
// Tap a chip → its explanation appears under the row (delegated, idempotent —
// the live screen replaces the innerHTML every second, the listener survives).
function wireQualityChips(container){
  if(!container || container.dataset.qwired) return;
  container.dataset.qwired = '1';
  container.addEventListener('click', e => {
    const b = e.target.closest('[data-qk]');
    if(!b) return;
    qchipOpen = qchipOpen === b.dataset.qk ? null : b.dataset.qk;
    const wrap = container.querySelector('.rs-qwrap');
    if(!wrap) return;
    wrap.querySelectorAll('[data-qk]').forEach(x => x.classList.toggle('open', x.dataset.qk === qchipOpen));
    let cap = wrap.querySelector('.rs-qcap');
    if(!qchipOpen){ if(cap) cap.remove(); return; }
    if(!cap){ cap = document.createElement('div'); cap.className = 'rs-qcap'; wrap.appendChild(cap); }
    cap.textContent = b.title;
  });
}

// ---- mount ------------------------------------------------------------------
export function mount(el, sub, subId){
  styles();
  if(sub === 'run' && subId) return mountRunDetail(el, subId);
  if(sub === 'cal' && subId) return mountCalDetail(el, subId);
  return mountHub(el);
}

// ============================================================================
// HUB (tabs: Experiments · Calibration · Wheels & labels)
// ============================================================================
function mountHub(el){
  let built = false, tabCleanup = null;
  const teardownTab = () => { if(tabCleanup){ tabCleanup(); tabCleanup = null; } };

  function render(a){
    if(!a.user || !a.profile){
      if(!built) el.innerHTML = `<div class="rs-wrap"><div class="rs-card"><p class="rs-empty">${!a.user && a.accessReady ? 'Please <a href="#/login">log in</a>.' : 'Loading…'}</p></div></div>`;
      return;
    }
    if(!a.researchAccess && !a.isAdmin){
      built = false; teardownTab();
      el.innerHTML = `<div class="rs-wrap"><div class="rs-card">
        <h1 style="font-family:'Montserrat',sans-serif;font-weight:600;color:#011624;margin:0 0 6px">Research</h1>
        <p class="rs-note">The Research workbench is available by invitation. If you are working with us on
        life-energy measurements, ask your contact to enable access for your account.</p></div></div>`;
      return;
    }
    if(built) return;
    built = true;
    buildShell(a);
  }

  function buildShell(a){
    el.innerHTML = `
      <div class="rs-wrap">
        <div class="rs-head">
          <h1>Research</h1>
          <p>A measurement workbench for life-energy research: calibrate your wheel in the room you work in,
             then record experiments against its own baseline. Everything is exportable.</p>
        </div>
        <div class="rs-tabs">
          <button type="button" class="rs-tab ${hubTab === 'exp' ? 'on' : ''}" data-tab="exp">Experiments</button>
          <button type="button" class="rs-tab ${hubTab === 'cal' ? 'on' : ''}" data-tab="cal">Calibration</button>
          <button type="button" class="rs-tab ${hubTab === 'wheels' ? 'on' : ''}" data-tab="wheels">Wheels &amp; labels</button>
        </div>
        <div id="rsTabHost"></div>
      </div>`;
    // Tab switching in one place; tab mounts get switchTab so in-tab actions
    // (e.g. the Wheels tab's Calibrate button) never have to fake router events.
    const switchTab = (tab) => {
      if(tab === hubTab) return;
      if(activeRecording()){ alert('Stop the running recording first.'); return; }
      hubTab = tab;
      teardownTab();
      buildShell(a);
    };
    el.querySelectorAll('.rs-tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    const host = el.querySelector('#rsTabHost');
    if(hubTab === 'cal') tabCleanup = mountCalibration(host, a);
    else if(hubTab === 'wheels') tabCleanup = mountWheels(host, a, switchTab);
    else tabCleanup = mountExperiments(host, a);
  }

  const unsub = auth.subscribeAuth(render);
  return () => { teardownTab(); if(unsub) unsub(); };
}

// One recording at a time across tabs — module-level guard.
let recordingActive = false;
const activeRecording = () => recordingActive;

// ============================================================================
// WHEELS & LABELS TAB
// ============================================================================
function mountWheels(host, a, switchTab){
  const uid = a.user.id;
  const c = cacheFor(uid);
  host.innerHTML = `
    <div class="rs-card">
      <h2>My wheels</h2>
      <p class="rs-note">Add each physical wheel by its serial number (printed on the base). Calibrations attach to a wheel.</p>
      <div class="rs-grid" style="grid-template-columns:2fr 2fr auto;align-items:end">
        <label>Serial number<input id="rswSerial" type="text" placeholder="e.g. 2B1262004" autocomplete="off"></label>
        <label>Nickname (optional)<input id="rswNick" type="text" placeholder="e.g. lab wheel" autocomplete="off"></label>
        <button type="button" class="rs-btn" id="rswAdd">Add wheel</button>
      </div>
      <span class="rs-msg" id="rswMsg"></span>
      <ul class="rs-list" id="rswList" style="margin-top:12px"><li class="rs-empty">Loading…</li></ul>
    </div>
    <div class="rs-card">
      <h2>My labels</h2>
      <p class="rs-note">Reusable tags you attach to experiments at setup — e.g. #morning, #withouthand, #meditation. Define once, one tap later.</p>
      <div class="rs-chips" id="rslChips"><span class="rs-empty">Loading…</span></div>
      <div class="rs-newlabel" style="margin-top:10px">
        <input id="rslNew" type="text" placeholder="#new-label" autocomplete="off">
        <button type="button" class="rs-mini" id="rslAdd">Add label</button>
      </div>
      <span class="rs-msg" id="rslMsg"></span>
    </div>`;

  const msg = host.querySelector('#rswMsg');
  async function paintWheels(){
    const { rows } = await store.listWheels(uid);
    c.wheels = rows;
    const { rows: cals } = await store.listCalibrations(uid);
    const byWheel = new Map();
    for(const cal of cals){ if(!byWheel.has(cal.wheel_id)) byWheel.set(cal.wheel_id, []); byWheel.get(cal.wheel_id).push(cal); }
    const ul = host.querySelector('#rswList');
    if(!rows.length){ ul.innerHTML = '<li class="rs-empty">No wheels yet — add the serial number above.</li>'; return; }
    ul.innerHTML = rows.map(w => {
      const wc = byWheel.get(w.id) || [];
      const last = wc[0];
      return `<li class="rs-row">
        <div style="flex:1;min-width:0">
          <b>${esc(w.serial)}</b>${w.nickname ? ' · ' + esc(w.nickname) : ''}
          <div class="sub">${wc.length} calibration${wc.length === 1 ? '' : 's'}${last ? ' · last: ' + esc(calChipText(last)) : ' · not calibrated yet'}</div>
        </div>
        <button type="button" class="rs-mini" data-calibrate="${w.id}">Calibrate</button>
      </li>`;
    }).join('');
  }
  host.querySelector('#rswAdd').addEventListener('click', async () => {
    const serial = host.querySelector('#rswSerial').value.trim();
    if(!serial){ msg.className = 'rs-msg err'; msg.textContent = 'Enter the serial number.'; return; }
    const { error } = await store.addWheel(uid, serial, host.querySelector('#rswNick').value.trim());
    if(error){ msg.className = 'rs-msg err'; msg.textContent = /duplicate/i.test(error.message) ? 'This wheel is already added.' : 'Error: ' + error.message; return; }
    msg.className = 'rs-msg ok'; msg.textContent = 'Wheel added.';
    host.querySelector('#rswSerial').value = ''; host.querySelector('#rswNick').value = '';
    c.wheels = null;
    paintWheels();
  });
  host.querySelector('#rswList').addEventListener('click', e => {
    const b = e.target.closest('[data-calibrate]');
    if(!b) return;
    sessionStorage.setItem('rs_cal_wheel', b.dataset.calibrate);   // the cal tab preselects it
    if(switchTab) switchTab('cal');
  });

  async function paintLabels(){
    const labels = await store.listLabels(uid);
    c.labels = labels;
    const box = host.querySelector('#rslChips');
    box.innerHTML = labels.length
      ? labels.map(l => `<span class="rs-chip" data-del="${l.id}">#${esc(l.label)}<span class="x">×</span></span>`).join('')
      : '<span class="rs-empty">No labels yet.</span>';
  }
  host.querySelector('#rslChips').addEventListener('click', async e => {
    const chip = e.target.closest('[data-del]');
    if(!chip) return;
    if(!confirm('Delete label #' + chip.textContent.replace('×', '').replace('#', '') + '? Past runs keep it.')) return;
    await store.deleteLabel(chip.dataset.del);
    c.labels = null;
    paintLabels();
  });
  const addLabel = async () => {
    const inp = host.querySelector('#rslNew');
    const lmsg = host.querySelector('#rslMsg');
    const v = inp.value.trim();
    if(!v) return;
    const { row, error } = await store.addLabel(uid, v);
    if(error){ lmsg.className = 'rs-msg err'; lmsg.textContent = 'Could not add the label: ' + error.message; return; }
    lmsg.className = 'rs-msg'; lmsg.textContent = '';
    inp.value = '';
    c.labels = null;
    paintLabels();
  };
  host.querySelector('#rslAdd').addEventListener('click', addLabel);
  host.querySelector('#rslNew').addEventListener('keydown', e => { if(e.key === 'Enter') addLabel(); });

  paintWheels(); paintLabels();
  return () => {};
}

// ============================================================================
// CALIBRATION TAB — the bench capture engine 1:1, researcher framing
// ============================================================================
function mountCalibration(host, a){
  const uid = a.user.id;
  const c = cacheFor(uid);
  let bleState = ble.getState();
  let unsubStatus = null, uiTimer = null;
  let spins = [], curves = [], calCurves = [];
  let gateInfo = null, outlierAck = null, verdictMsg = '';
  let lastFit = null;
  let calColorIdx = 0;   // monotonic accepted-curve color counter — colors are never reused, even after a replacement

  // Guided protocol v3 (owner decision, 2026-08-15): ONE calibration = THREE
  // accepted spins — repeatability needs comparison. Each spin closes with a
  // SHORT (15 s) untouched-tail countdown and gets an immediate verdict; a
  // rejected attempt stays in the payload as an Excluded attempt (audit
  // trail, never silently dropped). When the three accepted spins agree, the
  // calibration saves ITSELF — no confirm click on a clean run. When one spin
  // stands apart (advisory line: store.CAL_OUTLIER_PCT, a UX trigger, not a
  // verdict), the researcher chooses "Save anyway / Repeat spin N".
  const CAL_SPINS = store.CAL_SPINS_TARGET;
  const CAL_TAIL_MS = 15000;
  const acceptedSpins = () => spins.filter(s => !s.excluded);
  const cap = createCapture({
    maxMs: 15 * 60 * 1000,
    tailMs: CAL_TAIL_MS,
    onSpinClosed(spin, curve, r){
      spins.push(spin); curves.push(curve);
      // immediate verdict — anything unusable is kept as an audit-trail row.
      // Deliberately NO minimum fit-point gate: a heavily braked wheel dies
      // from 24 to 2 rpm in a few seconds and yields only a handful of clean
      // samples — and measuring exactly HOW BAD such a wheel is, is the whole
      // point of calibrating it (real field feedback: a score-30 wheel's spins
      // kept getting rejected). With few pooled points the fit falls back to
      // time-scaling ('scale') and the result card says so.
      let reason = null;
      if(spin.interrupted) reason = 'interrupted';
      else if(spin.T24_5 == null) reason = 'no clean 24-rpm coast — spin harder (above 140 rpm) and keep hands off';
      if(reason){ spin.excluded = true; spin.exclude_reason = reason; }
      else spin.color_idx = calColorIdx++;   // persisted on the spin so the detail view recolors identically
      // display curve from the RAW lines: continuous down to the floor (zero)
      const disp = calDisplayCurveFrom(r.frames, spin.t_start_ms, spin.t_end_ms);
      if(disp) calCurves.push({
        n: spin.n, dashed: !!reason,
        color: reason ? '#99a2a7' : PALETTE[spin.color_idx % PALETTE.length],
        pts: disp.pts,
      });
      paintSpins(); paintCharts();
      // Flow decision deferred out of the engine's callback (belt to the
      // engine's own reset-before-callback suspender against double-closing).
      setTimeout(() => afterSpin(spin, reason), 0);
    },
    onAutoStop(){ stopAndSave('Auto-stopped after 15 minutes.'); },
  });

  function flipCurveExcluded(n){
    const cc = calCurves.find(x => x.n === n);
    if(cc){ cc.dashed = true; cc.color = '#99a2a7'; }
  }

  // The flow decision after every closed spin: keep collecting, pause on an
  // outlier (advisory only — the researcher decides), or auto-save.
  function afterSpin(spin, reason){
    if(!cap.isRecording()) return;   // already stopped (salvage/cancel)
    const acc = acceptedSpins();
    if(reason){
      verdictMsg = `Attempt ${spin.n} excluded (${reason}). ${acc.length} of ${CAL_SPINS} spins accepted — spin again.`;
      paintLive();
      return;
    }
    // a new spin closing while the outlier gate is open = the researcher
    // decided by doing: the flagged spin is replaced by this one
    if(gateInfo){
      const g = spins.find(s => s.n === gateInfo.n);
      if(g && !g.excluded){
        g.excluded = true;
        g.exclude_reason = `outlier — replaced by a new spin (differed ${gateInfo.pct}% from the others)`;
        flipCurveExcluded(g.n);
      }
      gateInfo = null;
      paintGate(); paintSpins(); paintCharts();
    }
    const acc2 = acceptedSpins();
    if(acc2.length < CAL_SPINS){
      verdictMsg = `Spin ${acc2.length} of ${CAL_SPINS} accepted ✓ — once the wheel is fully stopped, spin again. Do NOT touch or reseat the wheel.`;
      paintLive();
      return;
    }
    const out = store.calOutlier(spins);
    if(out){
      gateInfo = out;
      verdictMsg = '';
      paintGate(); paintLive();
      return;
    }
    // three accepted spins in agreement -> the protocol completes on its own
    stopAndSave();
  }

  // Advisory outlier gate: never auto-drops a spin — "Save anyway" keeps all
  // three (wider observed range, limited-repeatability note), "Repeat spin N"
  // sets the flagged one aside as an Excluded attempt and waits for a fresh spin.
  function paintGate(){
    const g = $('rscGate');
    if(!g) return;
    if(!gateInfo){ g.innerHTML = ''; return; }
    g.innerHTML = `
      <div class="rs-warn" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <span style="flex:1;min-width:220px"><b>Spin ${gateInfo.n} differs from the others by ${gateInfo.pct}%</b>
        (advisory line: ${store.CAL_OUTLIER_PCT}% — not a verdict). Keep all three and the observed range simply
        gets wider, or repeat that one spin.</span>
        <button type="button" class="rs-mini" id="rscKeep">Save anyway</button>
        <button type="button" class="rs-mini" id="rscRepeat">Repeat spin ${gateInfo.n}</button>
      </div>`;
    $('rscKeep').addEventListener('click', () => {
      outlierAck = gateInfo;
      gateInfo = null;
      paintGate();
      stopAndSave();
    });
    $('rscRepeat').addEventListener('click', () => {
      const s = spins.find(x => x.n === gateInfo.n);
      if(s){
        s.excluded = true;
        s.exclude_reason = `outlier — repeated by researcher (differed ${gateInfo.pct}% from the others)`;
        flipCurveExcluded(s.n);
      }
      gateInfo = null;
      verdictMsg = `Spin ${s ? s.n : ''} set aside — give the wheel one more strong spin.`;
      paintGate(); paintSpins(); paintCharts(); paintLive();
    });
  }

  host.innerHTML = `
    <div class="rs-card">
      <h2>Calibrate a wheel in this room</h2>
      <p class="rs-note"><b>How calibration works:</b> it measures how <b>your</b> wheel naturally slows down
      <b>in this room</b> with no intentional interaction. Three free spins are combined into a baseline model, and the
      differences between them become the reference band used during experiments — the narrower the band, the
      smaller the deviations that can be told apart from normal calibration variability.
      <b>Re-calibrate when you move to a different room.</b></p>
      <p class="rs-note" style="font-weight:600;color:#401d91">3 free spins → combined baseline → reference band → experiment comparison</p>
      <ol class="rs-steps">
        <li>Pick the wheel, fill in the environment once, press <b>Start calibration</b>. From then on the settings lock and the process guides itself.</li>
        <li><b>THREE strong spins</b>, one after another: spin, let go, <b>hands off</b> while the wheel coasts down,
        stops, and the short observation window runs — then spin again. Each spin is immediately <b>Accepted</b>
        or asked to be repeated. The ~140 rpm start is recommended so the air stirred by your hand settles before
        the wheel reaches the measured 24→2 rpm stretch. <b>Never touch or reseat the wheel between the spins.</b>
        About 3–4 minutes in total.</li>
        <li>After the third accepted spin the calibration <b>saves itself</b>. If one spin disagrees with the other two,
        you choose: keep all three (the observed range gets wider) or repeat that spin.</li>
        <li>If the score comes out low, lift the wheel off, reseat it, and run a new calibration — incorrect seating
        is a common cause of a low score.</li>
      </ol>
    </div>
    <div class="rs-card">
      <div id="rscBle" class="rs-ble"></div>
      <div class="rs-grid">
        <label>Wheel<select id="rscWheel"></select></label>
        <label>Location name<input id="rscLoc" type="text" placeholder="e.g. office desk" autocomplete="off"></label>
        <label>Temp °C<input id="rscTemp" type="number" inputmode="decimal" placeholder="23"></label>
        <label>Humidity %<input id="rscRh" type="number" inputmode="numeric" placeholder="45"></label>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center">
        <button type="button" class="rs-btn" id="rscStart">Start calibration</button>
        <button type="button" class="rs-ghostbtn" id="rscDiscard" style="display:none">Cancel calibration</button>
        <button type="button" class="rs-mini" id="rscSimSpin" style="display:none">SIM: spin the wheel</button>
      </div>
      <div id="rscGuide" class="rs-guide" style="display:none">
        <div class="rs-guide-row">
          <span class="rs-phase" id="rscPhase">READY</span>
          <span class="rs-guide-rpm"><b id="rscRpm">0</b> rpm</span>
          <span class="rs-guide-big" id="rscCount"></span>
          <span class="rs-progress"><i id="rscBar" style="width:0%"></i></span>
        </div>
        <div class="rs-guide-text" id="rscBadge"></div>
      </div>
      <div id="rscGate"></div>
      <span class="rs-msg" id="rscMsg"></span>
      <div id="rscFit"></div>
      <div id="rscSpins" style="margin-top:12px"></div>
      ${chartHead('top')}
      <canvas id="rscChart" class="rs-calchart"></canvas>
      ${chartHead('dev')}
      <canvas id="rscDev" class="rs-caldev"></canvas>
      ${chartHead('deriv')}
      <canvas id="rscDeriv" class="rs-calderiv"></canvas>
    </div>
    <div class="rs-card">
      <h2>Calibrations</h2>
      <ul class="rs-list" id="rscList"><li class="rs-empty">Loading…</li></ul>
    </div>`;

  const $ = id => host.querySelector('#' + id);
  const msg = $('rscMsg');
  const setMsg = (k, t) => { msg.className = 'rs-msg ' + (k || ''); msg.textContent = t; };

  async function paintWheelSelect(){
    if(!c.wheels){ const { rows } = await store.listWheels(uid); c.wheels = rows; }
    const sel = $('rscWheel');
    if(!c.wheels.length){ sel.innerHTML = '<option value="">— add a wheel first —</option>'; return; }
    const pre = sessionStorage.getItem('rs_cal_wheel');
    sessionStorage.removeItem('rs_cal_wheel');
    sel.innerHTML = c.wheels.map(w =>
      `<option value="${w.id}" ${w.id === pre ? 'selected' : ''}>${esc(w.serial)}${w.nickname ? ' · ' + esc(w.nickname) : ''}</option>`).join('');
  }

  function paintBle(){
    const b = $('rscBle');
    if(!b) return;
    b.className = 'rs-ble' + (bleState.connected ? ' on' : '');
    const simBtn = (!cap.isRecording() && !bleState.connected)
      ? ` <button type="button" class="rs-mini" id="rscSimBtn">${cap.simActive() ? 'Simulator ON' : 'Enable simulator (test only)'}</button>` : '';
    b.innerHTML = bleState.connected
      ? `<span class="dot"></span><span>Wheel <b>connected</b>${bleState.deviceName ? ' · ' + esc(bleState.deviceName) : ''}.</span>`
      : `<span class="dot"></span><span>No wheel connected — use the header <b>Connect</b> button.${simBtn}</span>`;
    const sb = $('rscSimBtn');
    if(sb) sb.addEventListener('click', () => { cap.simStart(); paintBle(); });
    $('rscStart').disabled = cap.isRecording() || (!bleState.connected && !cap.simActive());
  }

  // In-progress spin as an anchored live curve — display grade, floor included.
  function liveCalCurve(){
    const rec = cap.rec();
    if(!rec || !rec.spinning) return null;
    return calDisplayCurveFrom(rec.frames, rec.spinStartMs, cap.now());
  }
  // The full Wheel test chart trio — same renderers, same look — plus the
  // fitted pooled model and the fitted-range honesty shading once a fit exists.
  function paintCharts(){
    const lc = liveCalCurve();
    const modelPts = lastFit && lastFit.K && lastFit.fit !== 'none' ? integrateModel(lastFit).pts : null;
    const c1 = $('rscChart');
    // shading claims "outside FITTED range" — only true for a real LSQ (the
    // scale fallback never fitted the pooled points)
    if(c1) drawTestChart(c1, calCurves, lc, { model: modelPts, shadeOutside: !!(modelPts && lastFit.fit === 'lsq') });
    const cd = $('rscDev');
    if(cd) drawDevChart(cd, calCurves, lc);
    const c2 = $('rscDeriv');
    if(c2) drawDerivChart(c2, calCurves, lc, { model: lastFit && lastFit.K ? lastFit : null, calm: true });
  }

  function paintLive(){
    const rec = cap.rec();
    $('rscDiscard').style.display = rec ? '' : 'none';
    $('rscSimSpin').style.display = (rec && cap.simActive()) ? '' : 'none';
    $('rscGuide').style.display = rec ? '' : 'none';
    $('rscStart').disabled = !!rec || (!bleState.connected && !cap.simActive());
    // A running calibration LOCKS its setup — changing the wheel or the
    // environment mid-recording would corrupt the baseline it is measuring.
    for(const id of ['rscWheel', 'rscLoc', 'rscTemp', 'rscRh']){
      const n = $(id); if(n) n.disabled = !!rec;
    }
    if(!rec){ paintCharts(); return; }
    const { rpm: trueRpm } = liveRpmOf(rec);
    $('rscRpm').textContent = fmtRpm(trueRpm);
    const t = cap.now();
    const phase = $('rscPhase'), count = $('rscCount'), bar = $('rscBar'), badge = $('rscBadge');
    const acc = acceptedSpins().length;
    const k = Math.min(CAL_SPINS, acc + 1);       // the spin being worked on
    const seg = 100 / CAL_SPINS;                  // each spin fills one bar segment
    if(gateInfo){
      phase.textContent = 'DECIDE';
      count.textContent = '';
      bar.style.width = Math.round(acc * seg) + '%';
      badge.textContent = 'One spin stands apart — decide above: keep all three, or repeat the flagged spin (just spin again). Hands off meanwhile.';
    } else if(!rec.spinning){
      phase.textContent = `SPIN ${k}/${CAL_SPINS} · SPIN IT`;
      count.textContent = '';
      bar.style.width = Math.round(acc * seg) + '%';
      badge.textContent = verdictMsg || `Give the wheel ONE strong spin (above 140 rpm), then let go and don't touch it again. Spin ${k} of ${CAL_SPINS}.`;
    } else if(rec.lowSinceMs != null){
      if(rec.stillSinceMs == null){
        // the natural sub-5-rpm coast is still running — the observation
        // window must not start until the wheel actually stops
        phase.textContent = `SPIN ${k}/${CAL_SPINS} · WAITING FOR STILLNESS`;
        count.textContent = '';
        bar.style.width = Math.round((acc + 0.85) * seg) + '%';
        badge.textContent = 'Nearly stopped — the moment a full standstill is confirmed, a short observation window starts. Keep hands off.';
      } else {
        const left = Math.max(0, Math.ceil((CAL_TAIL_MS - (t - rec.stillSinceMs)) / 1000));
        phase.textContent = `SPIN ${k}/${CAL_SPINS} · COUNTDOWN`;
        count.textContent = left + ' s';
        bar.style.width = Math.round((acc + 1 - left / (CAL_TAIL_MS / 1000) * 0.15) * seg) + '%';
        badge.textContent = k < CAL_SPINS
          ? `Standstill confirmed — when the countdown ends, spin ${k} is evaluated. Keep hands off.`
          : 'Standstill confirmed — when the countdown ends, the calibration SAVES ITSELF. Keep hands off.';
      }
    } else {
      phase.textContent = `SPIN ${k}/${CAL_SPINS} · COASTING`;
      count.textContent = '';
      // progress within this spin's segment: the coast fills 80% of it, the
      // countdown the remaining 20%
      const p = rec.maxRpm > 30
        ? Math.max(0, Math.min(1, (Math.log(rec.maxRpm) - Math.log(Math.max(5, trueRpm || 5))) / (Math.log(rec.maxRpm) - Math.log(5))))
        : 0;
      bar.style.width = Math.round((acc + p * 0.8) * seg) + '%';
      badge.textContent = `Hands off — recording the slow-down (peak ${Math.round(rec.maxRpm)} rpm). Spin ${k} of ${CAL_SPINS}; a short countdown follows.`;
    }
    paintCharts();
  }

  function spinRowHtml(s){
    // the dot carries the SAME color the spin's curve has on the charts
    const color = s.excluded ? '#99a2a7' : PALETTE[(s.color_idx ?? 0) % PALETTE.length];
    return `
      <div class="rs-spinrow${s.excluded ? ' exc' : ''}">
        <span class="rs-dot" style="background:${color}"></span>
        <b>spin ${s.n}</b>
        <span class="rs-kbadge${s.excluded ? ' grey' : ''}">${s.excluded ? 'excluded' : 'accepted'}</span>
        <span>peak ${s.max_rpm} rpm</span>
        <span>${s.T24_5 != null ? 'T24→5 <b>' + s.T24_5.toFixed(1) + ' s</b>' : 'did not cross 24 rpm'}</span>
        ${s.excluded ? '' : scorePillHtml(s.T24_5)}
        <span>${tailLabel(s.tail)}</span>
        ${s.excluded && s.exclude_reason ? `<span style="flex-basis:100%;color:#99a2a7;font-size:12px">${esc(s.exclude_reason)}</span>` : ''}
      </div>`;
  }
  function paintSpins(){
    const box = $('rscSpins');
    if(!box) return;
    const acc = spins.filter(s => !s.excluded), exc = spins.filter(s => s.excluded);
    // excluded attempts stay OPEN while recording (the fresh verdict must be
    // seen) and collapse into one line afterwards
    box.innerHTML = acc.map(spinRowHtml).join('')
      + (exc.length ? `<details class="rs-tech"${cap.isRecording() ? ' open' : ''}>
          <summary>${exc.length} excluded attempt${exc.length === 1 ? '' : 's'}</summary>
          ${exc.map(spinRowHtml).join('')}</details>` : '');
    lastFit = spins.length ? store.fitCalibration(spins, curves) : null;
    $('rscFit').innerHTML = lastFit ? fitSummaryHtml(lastFit, { progress: cap.isRecording() }) : '';
  }

  function start(){
    const wheelId = $('rscWheel').value;
    if(!wheelId){ setMsg('err', 'Add a wheel first (Wheels & labels tab).'); return; }
    if(!$('rscLoc').value.trim() || !$('rscTemp').value || !$('rscRh').value){
      setMsg('err', 'Location, temperature and humidity are required for a calibration.'); return;
    }
    if(!bleState.connected && !cap.simActive()){ setMsg('err', 'Connect the wheel first, or enable the simulator.'); return; }
    spins = []; curves = []; calCurves = [];
    gateInfo = null; outlierAck = null; verdictMsg = ''; lastFit = null; calColorIdx = 0;
    cap.start({ wheelId });
    recordingActive = true;
    setMsg('', '');
    paintGate(); paintBle(); paintLive(); paintSpins();
    if(!uiTimer) uiTimer = setInterval(paintLive, 250);
  }

  async function stopAndSave(reason){
    const preStopCount = spins.length;   // spins force-closed by stop() itself are flagged below
    const r = cap.stop();
    recordingActive = false;
    if(!r) return;
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    // An undecided outlier gate (auto-stop / leave-page save) must not vanish
    // silently — fold it into the provenance before clearing.
    if(gateInfo && !outlierAck) outlierAck = { ...gateInfo, unresolved: true };
    gateInfo = null;
    paintGate(); paintLive();
    // A spin force-closed by THIS stop (e.g. "Save anyway" clicked while a
    // replacement spin was still in its tail watch) never went through the
    // verdict flow and was not part of the decided three — set it aside.
    if(outlierAck){
      for(let i = preStopCount; i < spins.length; i++){
        const s = spins[i];
        if(!s.excluded){ s.excluded = true; s.exclude_reason = 'closed by save — verdict flow not completed'; }
      }
    }
    const wheel = (c.wheels || []).find(w => w.id === r.wheelId);
    // Capture the setup fields SYNCHRONOUSLY: on the leave-the-page salvage
    // path the tab's DOM is replaced right after this call starts, so any read
    // after the first await would explode and lose the save.
    const locEl = $('rscLoc'), tempEl = $('rscTemp'), rhEl = $('rscRh');
    const locVal = locEl ? locEl.value.trim() : '';
    const tempVal = tempEl ? parseFloat(tempEl.value) : NaN;
    const rhVal = rhEl ? parseFloat(rhEl.value) : NaN;
    // A failed fit must NOT lose the raw recording (field data discipline):
    // save everything with coef = null; the run setup treats it as factory.
    const coef = store.fitCalibration(spins, curves);
    if(coef && outlierAck){
      // saved with a flagged spin kept — neutral provenance, never a verdict
      coef.outlier_ack = true;
      coef.outlier_pct = outlierAck.pct ?? null;
      if(outlierAck.unresolved) coef.outlier_unresolved = true;
    }
    const env = { ua: navigator.userAgent };
    if(r.simUsed) env.sim = true;
    const payload = {
      kind: 'calibration',
      serial: wheel ? wheel.serial : 'unknown',
      wheel_id: r.wheelId,
      location: locVal, temp_c: tempVal, rh_pct: rhVal,
      env, fw: r.fw || null, hw: r.hw || null,
      started_at: r.startedAt, ended_at: r.endedAt,
      frame_count: r.frames.length, spins: r.spins, frames: r.frames, events: r.events,
      coef, format: store.RUN_FORMAT,
    };
    downloadJson(payload, 'ewr-research_calibration');   // local backup FIRST — before ANY network
    setMsg('', 'Saving calibration…');
    // Long-term drift vs the previous calibration of this wheel in THIS
    // location — gate-time based (A/K co-move). Runs AFTER the local backup
    // (the "local download FIRST" discipline is non-negotiable; drift is
    // derived data, so the local JSON simply not carrying it is fine). coef is
    // shared by reference, so the DB row below still gets coef.drift.
    if(coef && coef.K){
      try {
        const { rows } = await store.listCalibrations(uid, r.wheelId);
        const norm = s => String(s || '').trim().toLowerCase();
        const prev = (rows || []).find(x => x.coef && x.coef.K && norm(x.location) === norm(locVal));
        const d = store.calDrift(prev, coef);
        if(d) coef.drift = d;
      } catch {}
    }
    const { error } = await store.saveCalibration({
      user_id: uid, wheel_id: r.wheelId,
      location: payload.location, temp_c: payload.temp_c, rh_pct: payload.rh_pct,
      fw: payload.fw, hw: payload.hw,
      started_at: payload.started_at, ended_at: payload.ended_at,
      frame_count: payload.frame_count, spins: payload.spins, frames: payload.frames,
      events: payload.events, coef, format: payload.format,
    });
    if(error) setMsg('err', 'Saved locally (JSON downloaded), but the database refused it: ' + error.message);
    else if(!coef) setMsg('err', (reason ? reason + ' ' : '') + 'Saved, but no clean spin crossed 24 rpm — this recording has NO usable baseline. Spin above 140 rpm, hands off, and calibrate again.');
    else if(coef.spin_count < CAL_SPINS) setMsg('err', (reason ? reason + ' ' : '') + `Saved with only ${coef.spin_count} accepted spin${coef.spin_count === 1 ? '' : 's'} (the protocol wants ${CAL_SPINS}) — usable, but repeatability is unverified. Consider recalibrating.`);
    else setMsg('ok', `Calibration saved ✓ — wheel score ${coef.score ?? '—'}${coef.grade ? ' (' + coef.grade + ')' : ''} (${coef.score_basis || ''}) · T24→5 ${coef.T24_5 ?? '—'} s${coef.quality_pct != null ? ' · spread ' + (100 - coef.quality_pct) + '%' : ''}${coef.loo ? ' · validation ±' + coef.loo.max_abs_pct + '%' : ''}.${reason ? ' (' + reason + ')' : ''} Open it from the list below to review the three curves.`);
    paintCalList();
  }

  function discard(){
    if(!cap.isRecording()) return;
    if(!confirm('Cancel this calibration? The recorded spins will be thrown away.')) return;
    cap.discard();
    recordingActive = false;
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    spins = []; curves = []; calCurves = [];
    gateInfo = null; outlierAck = null; verdictMsg = ''; lastFit = null; calColorIdx = 0;
    paintGate(); paintBle(); paintLive(); paintSpins();
  }

  async function paintCalList(){
    const { rows, error } = await store.listCalibrations(uid);
    const ul = $('rscList');
    if(!ul) return;   // tab already torn down (salvage-on-leave path)
    if(error){ ul.innerHTML = `<li class="rs-empty">Could not load: ${esc(error.message)}${/relation|does not exist/i.test(error.message) ? ' — run the research SQL first.' : ''}</li>`; return; }
    if(!rows.length){ ul.innerHTML = '<li class="rs-empty">No calibrations yet.</li>'; return; }
    const wheels = new Map((c.wheels || []).map(w => [w.id, w]));
    ul.innerHTML = rows.map(cal => {
      const w = wheels.get(cal.wheel_id);
      const cf = cal.coef || {};
      const age = store.calAgeDays(cal);
      return `<li class="rs-row" data-cal="${cal.id}" style="cursor:pointer" title="Open the calibration — three curves, model, observed range">
        <div style="flex:1;min-width:0">
          <b>${esc(w ? w.serial : '?')}</b> · ${esc(cal.location || 'room')}
          ${cf.score != null ? `<span class="rs-score rs-s${cf.grade}"${cf.score_basis ? ` title="Based on the ${esc(cf.score_basis)}"` : ''}>${cf.score} · ${cf.grade}</span>` : ''}
          ${age > store.CAL_STALE_DAYS ? '<span class="rs-kbadge warn">stale</span>' : ''}
          <div class="sub">${esc(new Date(cal.created_at).toLocaleString('en-GB'))} · ${cal.temp_c ?? '—'}°C · ${cal.rh_pct ?? '—'}%
            · T24→5 <b>${cf.T24_5 ?? '—'} s</b>${cf.spin_count ? ` · ${cf.spin_count} spin${cf.spin_count === 1 ? '' : 's'}` : ''}${cf.quality_pct != null ? ` · spread ${100 - cf.quality_pct}%` : ''}</div>
        </div>
        <span class="rs-mini" style="pointer-events:none">View →</span>
        <button type="button" class="rs-mini" data-arch="${cal.id}">Archive</button>
      </li>`;
    }).join('');
  }
  $('rscList').addEventListener('click', async e => {
    // The list card stays visible below the live UI while recording — a stray
    // tap must not navigate away and force-end the 3-spin protocol (the same
    // guard switchTab uses).
    if(activeRecording()){ alert('Stop the running recording first.'); return; }
    const b = e.target.closest('[data-arch]');
    if(b){
      if(!confirm('Archive this calibration? Experiments that used it keep their reference.')) return;
      await store.archiveCalibration(b.dataset.arch);
      paintCalList();
      return;
    }
    const li = e.target.closest('[data-cal]');
    if(li) location.hash = '#/research/cal/' + li.dataset.cal;
  });

  $('rscStart').addEventListener('click', start);
  $('rscDiscard').addEventListener('click', discard);
  $('rscSimSpin').addEventListener('click', () => cap.simSpin());
  cap.attach();
  unsubStatus = ble.subscribeStatus(s => { bleState = s; paintBle(); });

  paintWheelSelect().then(paintBle);
  paintCalList();
  paintLive();

  return () => {
    const rec = cap.rec();
    if(rec && rec.frames.length) stopAndSave('Recording salvaged — you left the page.');
    else cap.discard();
    recordingActive = false;
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    cap.detach();
    if(unsubStatus) unsubStatus();
  };
}

// ============================================================================
// EXPERIMENTS TAB — setup → live → summary + runs list
// ============================================================================
function mountExperiments(host, a){
  const uid = a.user.id;
  const c = cacheFor(uid);
  let bleState = ble.getState();
  let unsubStatus = null, uiTimer = null;
  let stage = 'setup';            // setup | live | summary
  let stack = null;
  let cals = [], wheels = [], labels = [], members = [];
  let sel = { wheelId: null, calId: null, labels: new Set(), subject: null };
  let runMarkers = [];            // user markers {t_ms,type,value,note}
  let markCount = 0;
  let runQualityCtx = null;       // quality-header context frozen at start
  let soloVoice = null;           // optional camera/voice take (shared solo dock, research flavor)
  let mediaTake = null;           // the sealed take waiting for upload after save
  let coasts = [];
  let samples = [];               // {t (s), rpm} — feeds the panel stack
  let lastFlushed = 0, draftId = null;
  let revsAcc = 0, lastSample = null;

  const cap = createCapture({
    maxMs: store.RUN_MAX_MS,
    onRpmSample(s){
      samples.push({ t: s.t / 1000, rpm: s.rpm });
      if(lastSample){
        const dt = (s.t - lastSample.t) / 1000;
        if(dt > 0 && dt < 30) revsAcc += (s.rpm + lastSample.rpm) / 120 * dt;
      }
      lastSample = s;
    },
    onSpinClosed(spin){ coasts.push(spin); },
    onFrame(frame, t, rec){
      if(stage !== 'live') return;
      if(rec.frames.length - lastFlushed >= store.CHUNK_LINES){
        const from = lastFlushed;
        lastFlushed = rec.frames.length;
        store.draftFlush(draftId, draftMeta(), rec.frames, from);
      }
    },
    onAutoStop(){
      // The engine fires this exactly ONCE per recording — the capture must
      // end here, or a forgotten screen records unbounded with the wake lock
      // held. Outside the live stage nothing should be recording; discard.
      if(stage === 'live') stopExperiment('Auto-stopped at the 10-minute limit.');
      else cap.discard();
    },
  });

  const draftMeta = () => ({
    uid, wheelId: sel.wheelId, calId: sel.calId,
    subject: sel.subject ? { id: sel.subject.id, name: sel.subject.displayName } : null,
    labels: [...sel.labels], tempC: val('#rseTemp'), rhPct: val('#rseRh'),
    notes: host.querySelector('#rseNotes') ? host.querySelector('#rseNotes').value : '',
    startedAt: cap.rec() ? cap.rec().startedAt : null,
    markers: runMarkers,
  });
  const val = q => { const n = host.querySelector(q); const v = n ? parseFloat(n.value) : NaN; return isNaN(v) ? null : v; };

  // ---------------- shell ----------------
  function buildShell(){
    host.innerHTML = `
      <div id="rseBanner"></div>
      <div id="rseSetup"></div>
      <div id="rseRun" style="display:none"></div>
      <div class="rs-card" id="rseRunsCard">
        <h2>My research runs</h2>
        <ul class="rs-list" id="rseRuns"><li class="rs-empty">Loading…</li></ul>
      </div>`;
    buildSetup();
    paintRuns();
    paintRecoveryBanner();
  }

  // ---------------- crash recovery ----------------
  async function paintRecoveryBanner(){
    const stale = await store.draftListStale();
    const bn = host.querySelector('#rseBanner');
    if(!bn || !stale.length) return;
    const d = stale[0];
    bn.innerHTML = `<div class="rs-banner">
      <span>⚠ An interrupted recording was found (${d.frame_count} lines). Recover it as a run?</span>
      <button type="button" class="rs-mini" data-recover="${d.id}">Recover</button>
      <button type="button" class="rs-mini" data-droprec="${d.id}">Discard</button></div>`;
    bn.querySelector('[data-recover]').addEventListener('click', async () => {
      const loaded = await store.draftLoad(d.id);
      if(!loaded || !loaded.frames.length){ bn.innerHTML = ''; return; }
      bn.innerHTML = '<div class="rs-banner">Recovering…</div>';
      const m = loaded.meta || {};
      const rec = recFromFrames(loaded.frames, m.startedAt || new Date(Date.now() - loaded.frames[loaded.frames.length - 1][0]).toISOString());
      rec.markers = m.markers || [];
      const row = await buildRunRow(rec, m, 'recovered');
      const res = await store.saveRun(row.row, rec.frames);
      await store.draftDelete(d.id);
      bn.innerHTML = res.id
        ? `<div class="rs-banner">Recovered ✓ — <a href="#/research/run/${res.id}">open the run</a></div>`
        : `<div class="rs-banner">Could not save the recovery: ${esc((res.error && res.error.message) || '?')} (a JSON backup was downloaded)</div>`;
      paintRuns();
    });
    bn.querySelector('[data-droprec]').addEventListener('click', async () => {
      if(!confirm('Discard the interrupted recording for good?')) return;
      await store.draftDelete(d.id);
      bn.innerHTML = '';
    });
  }
  // Rebuild a full engine-grade record from raw frames (recovery path): the
  // frames are REPLAYED through the real capture engine, so recovered runs get
  // the same glitch guards, coast segmentation and tail metrics as live ones —
  // a second, weaker decoder here would let a PIC rail glitch through as a
  // fake peak in a science dataset.
  function recFromFrames(frames, startedAtIso){
    const replayCap = createCapture({ maxMs: Infinity });
    replayCap.start({ kind: 'recovered' });
    for(const f of frames) replayCap.feed({ counter: f[1], rawLed: f[2], led: f[3], battery: 'OK' }, f[0]);
    const rec = replayCap.stop();
    rec.simUsed = false;   // feed() SIM-tags by design; these frames came from a real recording
    rec.startedAt = startedAtIso;
    rec.markers = [];
    return rec;
  }

  // ---------------- setup ----------------
  async function loadSetupData(){
    // independent queries — parallel, the setup screen is entered many times
    const [wq, cq, lq] = await Promise.all([
      c.wheels ? Promise.resolve({ rows: c.wheels }) : store.listWheels(uid),
      store.listCalibrations(uid),
      c.labels ? Promise.resolve(c.labels) : store.listLabels(uid),
    ]);
    c.wheels = wq.rows; wheels = c.wheels;
    cals = cq.rows;
    c.labels = lq; labels = c.labels;
  }

  function buildSetup(){
    const s = host.querySelector('#rseSetup');
    s.innerHTML = `<div class="rs-card"><p class="rs-empty">Loading…</p></div>`;
    loadSetupData().then(() => {
      if(!wheels.length || !cals.length){
        s.innerHTML = `
        <div class="rs-card">
          <h2>Before your first experiment</h2>
          <ol class="rs-steps">
            <li ${wheels.length ? 'style="opacity:.55"' : ''}><b>Add your wheel</b> (serial number) — Wheels &amp; labels tab. ${wheels.length ? '✓' : ''}</li>
            <li><b>Calibrate it in this room</b> — Calibration tab. ${cals.length ? '✓' : ''}</li>
            <li><b>Run your first experiment</b> — this tab.</li>
          </ol>
          <p class="rs-note" style="margin-top:10px">The calibration is what turns the wheel into an instrument:
          every live chart compares against how <b>your</b> wheel behaves in <b>your</b> room on its own.</p>
        </div>`;
        return;
      }
      const wheelOpts = wheels.map(w => `<option value="${w.id}" ${sel.wheelId === w.id ? 'selected' : ''}>${esc(w.serial)}${w.nickname ? ' · ' + esc(w.nickname) : ''}</option>`).join('');
      s.innerHTML = `
      <div class="rs-card">
        <h2>New experiment</h2>
        <div id="rseBle" class="rs-ble"></div>
        <div class="rs-grid">
          <label>Wheel<select id="rseWheel">${wheelOpts}</select></label>
          <label>Calibration<select id="rseCal"></select></label>
          <label>Temp °C<input id="rseTemp" type="number" inputmode="decimal" placeholder="23"></label>
          <label>Humidity %<input id="rseRh" type="number" inputmode="numeric" placeholder="45"></label>
        </div>
        <div id="rseCalWarn"></div>
        <div style="margin-top:14px">
          <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#67737c;margin-bottom:8px">Labels</div>
          <div class="rs-chips" id="rseLabels"></div>
        </div>
        <div style="margin-top:14px">
          <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#67737c;margin-bottom:8px">
            Subject (optional) — one of your connected Members</div>
          <div class="rs-chips" id="rseSubject"><span class="rs-empty">Loading members…</span></div>
        </div>
        <div style="margin-top:14px">
          <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#67737c;margin-bottom:8px">
            Record yourself (optional) — replays in sync with the data</div>
          <div id="rseVoiceDock"></div>
        </div>
        <div class="rs-field" style="margin-top:14px">
          <label>Notes (optional)<input id="rseNotes" type="text" placeholder="protocol, intention, conditions…" autocomplete="off"></label>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <button type="button" class="rs-btn" id="rseStart">Start experiment</button>
        </div>
        <span class="rs-msg" id="rseMsg"></span>
      </div>`;
      paintBleRow(); paintCalSelect(); paintLabelChips(); paintSubjectPicker();
      host.querySelector('#rseWheel').addEventListener('change', paintCalSelect);
      host.querySelector('#rseStart').addEventListener('click', startExperiment);
      // temp/RH inputs re-check the calibration-mismatch warning as you type
      for(const q of ['#rseTemp', '#rseRh']){
        const nEl = host.querySelector(q);
        if(nEl) nEl.addEventListener('input', paintCalWarn);
      }
      // the optional camera/voice dock — the EXACT solo capture engine
      if(soloVoice) soloVoice.destroy();
      soloVoice = createSoloVoice(host.querySelector('#rseVoiceDock'), { flavor: 'research' });
    });
  }

  function paintBleRow(){
    const b = host.querySelector('#rseBle');
    if(!b) return;
    b.className = 'rs-ble' + (bleState.connected ? ' on' : '');
    const simBtn = (!cap.isRecording() && !bleState.connected)
      ? ` <button type="button" class="rs-mini" id="rseSimBtn">${cap.simActive() ? 'Simulator ON' : 'Enable simulator (test only)'}</button>` : '';
    b.innerHTML = bleState.connected
      ? `<span class="dot"></span><span>Wheel <b>connected</b>${bleState.deviceName ? ' · ' + esc(bleState.deviceName) : ''}.</span>`
      : `<span class="dot"></span><span>No wheel connected — use the header <b>Connect</b> button.${simBtn}</span>`;
    const sb = host.querySelector('#rseSimBtn');
    if(sb) sb.addEventListener('click', () => { cap.simStart(); paintBleRow(); });
  }

  function paintCalSelect(){
    sel.wheelId = host.querySelector('#rseWheel').value;
    const mine = cals.filter(x => x.wheel_id === sel.wheelId);
    const cs = host.querySelector('#rseCal');
    cs.innerHTML = mine.length
      ? mine.map((x, i) => `<option value="${x.id}" ${i === 0 ? 'selected' : ''}>${esc(calChipText(x))}</option>`).join('')
      : '<option value="">— no calibration for this wheel —</option>';
    sel.calId = mine.length ? mine[0].id : null;
    cs.onchange = () => { sel.calId = cs.value || null; paintCalWarn(); };
    paintCalWarn();
  }
  function paintCalWarn(){
    const box = host.querySelector('#rseCalWarn');
    const cal = cals.find(x => x.id === sel.calId);
    if(!cal){ box.innerHTML = '<div class="rs-warn">This wheel has no calibration yet — calibrate it in this room first (Calibration tab). Experiments need a baseline.</div>'; return; }
    const age = store.calAgeDays(cal);
    const cf = cal.coef || {};
    // a wheel below the reference band should not be experimenting — advisory
    // only (trust model: the researcher decides), but it must be SAID
    const scoreWarn = cf.grade === 'D'
      ? `<div class="rs-warn">This calibration's wheel score is <b>${cf.score} (D)</b> — well below the factory
         wheel-condition benchmark. Experiments with this wheel are <b>not recommended</b>: reseat it on the needle
         tip (if the score stays low, clean the bearing), then recalibrate.</div>`
      : cf.grade === 'C'
        ? `<div class="rs-warn">This calibration's wheel score is <b>${cf.score} (C)</b> — below the factory
           wheel-condition benchmark. Reseat the wheel and recalibrate before trusting experiment numbers.</div>`
        : '';
    // temp/RH mismatch vs the calibration — air density and bearing behavior
    // drift with conditions; advisory only, refreshed as the fields change
    const eT = val('#rseTemp'), eRh = val('#rseRh');
    const envWarn = ((cal.temp_c != null && eT != null && Math.abs(eT - cal.temp_c) > 3)
      || (cal.rh_pct != null && eRh != null && Math.abs(eRh - cal.rh_pct) > 15))
      ? `<div class="rs-warn">The room conditions you entered differ from this calibration's
         (<b>${cal.temp_c ?? '—'}°C · ${cal.rh_pct ?? '—'}%</b>). Air density and bearing behavior drift with
         temperature and humidity — consider recalibrating in today's conditions. The difference is recorded either way.</div>` : '';
    box.innerHTML = (age > store.CAL_STALE_DAYS
      ? `<div class="rs-warn">This calibration is <b>${age} days old</b>. Rooms drift (temperature, drafts, dust) — consider recalibrating. If you continue, the age is recorded in the run.</div>` : '')
      + envWarn + scoreWarn;
  }

  function paintLabelChips(){
    const box = host.querySelector('#rseLabels');
    box.innerHTML = (labels.map(l =>
      `<span class="rs-chip ${sel.labels.has(l.label) ? 'on' : ''}" data-label="${esc(l.label)}">#${esc(l.label)}</span>`).join(''))
      + `<span class="rs-newlabel"><input id="rseNewLabel" type="text" placeholder="#new" autocomplete="off">
         <button type="button" class="rs-mini" id="rseAddLabel">+</button></span>`;
    box.querySelectorAll('[data-label]').forEach(chip => chip.addEventListener('click', () => {
      const l = chip.dataset.label;
      sel.labels.has(l) ? sel.labels.delete(l) : sel.labels.add(l);
      chip.classList.toggle('on');
    }));
    const add = async () => {
      const inp = host.querySelector('#rseNewLabel');
      const v = inp.value.trim();
      if(!v) return;
      const { row, error } = await store.addLabel(uid, v);
      if(error){
        const msg = host.querySelector('#rseMsg');
        if(msg){ msg.className = 'rs-msg err'; msg.textContent = 'Could not add the label: ' + error.message; }
        return;
      }
      if(row){ if(!labels.find(x => x.label === row.label)) labels.push(row); c.labels = labels; sel.labels.add(row.label); paintLabelChips(); }
    };
    box.querySelector('#rseAddLabel').addEventListener('click', add);
    box.querySelector('#rseNewLabel').addEventListener('keydown', e => { if(e.key === 'Enter') add(); });
  }

  async function paintSubjectPicker(){
    // always refetched on tab mount (cache nulled below): a Member who just
    // connected must appear without a full page reload
    if(!c.members){
      try { c.members = await auth.getMyClients(); } catch { c.members = []; }
    }
    members = c.members || [];
    const box = host.querySelector('#rseSubject');
    if(!box) return;
    if(!members.length){
      box.innerHTML = '<span class="rs-empty">No connected Members yet — people who connect to you via your share link appear here.</span>';
      return;
    }
    const options = members.map(m => `
      <span class="rs-chip ${sel.subject && sel.subject.id === m.id ? 'on' : ''}" data-subject="${esc(m.id)}">
        ${avatarHtml(m.avatarUrl, m.displayName)} ${esc(m.displayName || 'Member')}</span>`).join('');
    box.innerHTML = `<span class="rs-chip ${!sel.subject ? 'on' : ''}" data-subject="">no subject</span>` + options;
    box.querySelectorAll('[data-subject]').forEach(chip => chip.addEventListener('click', () => {
      const id = chip.dataset.subject;
      sel.subject = id ? members.find(m => m.id === id) || null : null;
      paintSubjectPicker();
    }));
  }

  // ---------------- start ----------------
  // Straight into the live recording — the wheel was already calibrated on its
  // own tab; the experiment just ATTACHES that calibration (owner decision:
  // no extra check stage at experiment start).
  function startExperiment(){
    const msg = host.querySelector('#rseMsg');
    const say = (k, t) => { msg.className = 'rs-msg ' + k; msg.textContent = t; };
    if(!sel.wheelId){ say('err', 'Pick a wheel.'); return; }
    if(!sel.calId){ say('err', 'This wheel needs a calibration first (Calibration tab).'); return; }
    if(!bleState.connected && !cap.simActive()){ say('err', 'Connect the wheel first, or enable the simulator.'); return; }
    startLive();
  }

  function calCoef(){
    const cal = cals.find(x => x.id === sel.calId);
    return (cal && cal.coef && cal.coef.K) ? cal.coef : { ...FACTORY_COEF };
  }
  const calIsFactory = () => { const cal = cals.find(x => x.id === sel.calId); return !(cal && cal.coef && cal.coef.K); };

  function buildRunUi(){
    host.querySelector('#rseSetup').style.display = 'none';
    host.querySelector('#rseRunsCard').style.display = 'none';
    const run = host.querySelector('#rseRun');
    run.style.display = '';
    const wheel = wheels.find(w => w.id === sel.wheelId);
    const cal = cals.find(x => x.id === sel.calId);
    run.innerHTML = `
      <div class="rs-status" id="rseStatus"></div>
      <div id="rseQuality"></div>
      <div id="rseSummary"></div>
      <div class="rs-hero" id="rseHero" style="display:none">
        <div class="rs-tile"><span class="rs-pip" id="rsePip"></span>
          <div class="v" id="rseTileRpm">—</div><div class="l">True RPM</div><div class="f">ω = 6000 / counter</div></div>
        <div class="rs-tile"><div class="v" id="rseTileRevs">0.0</div><div class="l">Revolutions</div><div class="f">N = ∫ ω/60 dt</div></div>
        <div class="rs-tile"><div class="v" id="rseTileE">—</div><div class="l">Kinetic energy</div><div class="f">E = ½·I·ω² · I=1.7×10⁻⁷ kg·m²</div></div>
      </div>
      <div id="rseStack" style="display:none"></div>
      <div class="rs-toolbar" id="rseTools" style="display:none">
        <button type="button" class="rs-ghostbtn" data-mark>▸ Mark</button>
        <button type="button" class="rs-ghostbtn" data-dir="cw">CW ↻</button>
        <button type="button" class="rs-ghostbtn" data-dir="ccw">CCW ↺</button>
        <input type="text" id="rseNote" placeholder="quick note… (Enter attaches it at this moment)" autocomplete="off">
        <button type="button" class="rs-mini" id="rseSimSpin" style="display:none">SIM: spin</button>
        <button type="button" class="rs-btn stop" id="rseStop">Stop experiment</button>
      </div>`;

    // status strip content
    const st = host.querySelector('#rseStatus');
    st.innerHTML = `
      <span class="rs-rec"></span><b style="color:#c2415b">REC</b>
      <span id="rseClock" style="font-variant-numeric:tabular-nums">0:00</span>
      <span class="rs-pill">${esc(wheel ? wheel.serial : '?')}</span>
      <span class="rs-pill" title="Every torque number leans on this calibration">${cal ? 'cal: ' + esc((cal.location || 'room') + ' · ' + new Date(cal.created_at).toLocaleDateString('en-GB')) : 'cal: factory'}</span>
      ${sel.subject ? `<span class="rs-pill">${avatarHtml(sel.subject.avatarUrl, sel.subject.displayName)} ${esc(sel.subject.displayName)}</span>` : ''}
      <span id="rseBleDot">${bleState.connected ? '🔵' : cap.simActive() ? '<span class="rs-kbadge sim">SIM</span>' : '⚪'}</span>
      <span id="rseFreeze"></span>
      <span class="rs-presets" id="rsePresets">
        <button type="button" class="rs-preset on" data-preset="60">60 s</button>
        <button type="button" class="rs-preset" data-preset="300">5 min</button>
        <button type="button" class="rs-preset" data-preset="full">Full</button>
      </span>`;
    st.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
      st.querySelectorAll('[data-preset]').forEach(x => x.classList.toggle('on', x === b));
      if(stack) stack.setPreset(b.dataset.preset);
    }));
  }

  // ---------------- live ----------------
  function startLive(){
    stage = 'live';
    samples = []; coasts = []; runMarkers = []; markCount = 0; lastFlushed = 0;
    revsAcc = 0; lastSample = null;
    draftId = 'run-' + Date.now().toString(36);
    cap.start({ kind: 'experiment' });
    recordingActive = true;
    // the take is anchored to the experiment start — start it in the same tick
    if(soloVoice && soloVoice.armed) soloVoice.start();
    buildRunUi();
    // the dock follows onto the live screen (self-view ring + Mute + ● REC)
    if(soloVoice && soloVoice.armed){
      const dock = host.querySelector('#rseVoiceDock');
      const runEl = host.querySelector('#rseRun');
      const anchor = host.querySelector('#rseQuality');
      if(dock && runEl && anchor) runEl.insertBefore(dock, anchor.nextSibling);
    }
    host.querySelector('#rseHero').style.display = '';
    host.querySelector('#rseStack').style.display = '';
    host.querySelector('#rseTools').style.display = '';
    host.querySelector('#rseSimSpin').style.display = cap.simActive() ? '' : 'none';

    const coef = calCoef();
    // freeze the quality-header context: calibration age + the temp/RH delta
    // between this run's setup values and the calibration's
    {
      const calRow = cals.find(x => x.id === sel.calId);
      const expT = val('#rseTemp'), expRh = val('#rseRh');
      runQualityCtx = {
        factory: calIsFactory(), coef,
        ageDays: calRow ? store.calAgeDays(calRow) : null,
        dT: (expT != null && calRow && calRow.temp_c != null) ? Math.round((expT - calRow.temp_c) * 10) / 10 : null,
        dRh: (expRh != null && calRow && calRow.rh_pct != null) ? Math.round(expRh - calRow.rh_pct) : null,
      };
    }
    stack = createPanelStack(host.querySelector('#rseStack'), {
      mode: 'live', coef,
      floor: store.noiseFloorNNm(calIsFactory() ? null : coef),
      calNote: calIsFactory() ? 'factory model' : 'room calibration ' + new Date(cals.find(x => x.id === sel.calId).created_at).toLocaleDateString('en-GB'),
      fileTag: draftId,
      onFreezeChange(frozen){
        const f = host.querySelector('#rseFreeze');
        if(!f) return;
        f.innerHTML = frozen
          ? '<span class="rs-inspect">⏸ INSPECTING — recording continues</span> <button type="button" class="rs-livepill" id="rseGoLive">LIVE</button>'
          : '';
        const gl = host.querySelector('#rseGoLive');
        if(gl) gl.addEventListener('click', () => stack.goLive());
      },
    });
    stack.setData({ samples, markers: runMarkers, coasts });

    const tools = host.querySelector('#rseTools');
    tools.querySelector('[data-mark]').addEventListener('click', () => addMarker('mark', String(++markCount)));
    tools.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => addMarker('direction', b.dataset.dir.toUpperCase())));
    const noteIn = host.querySelector('#rseNote');
    noteIn.addEventListener('keydown', e => {
      if(e.key !== 'Enter') return;
      const v = noteIn.value.trim();
      if(v){ addMarker('note', '', v); noteIn.value = ''; }
    });
    host.querySelector('#rseSimSpin').addEventListener('click', () => cap.simSpin());
    host.querySelector('#rseStop').addEventListener('click', () => stopExperiment());

    let pipFlash = 0, lastN = 0, qTick = 0;
    uiTimer = setInterval(() => {
      const rec = cap.rec();
      if(!rec) return;
      // quality header refresh ~1 Hz (fresh data only arrives at 1.4 Hz)
      if(qTick++ % 4 === 0){
        const qEl = host.querySelector('#rseQuality');
        if(qEl && runQualityCtx){
          qEl.innerHTML = qualityChipsHtml({ ...runQualityCtx, ...computeQuality(samples, runQualityCtx.coef) });
          wireQualityChips(qEl);
        }
      }
      const clock = host.querySelector('#rseClock');
      if(clock) clock.textContent = fmtClock(cap.now() / 1000);
      // hero vitals
      const { rpm: trueRpm, standstill } = liveRpmOf(rec);
      const rpmEl = host.querySelector('#rseTileRpm');
      if(rpmEl) rpmEl.innerHTML = standstill ? 'STILL' : fmtRpm(trueRpm) + '<small>rpm</small>';
      const revsEl = host.querySelector('#rseTileRevs');
      if(revsEl) revsEl.textContent = revsAcc.toFixed(1);
      const eEl = host.querySelector('#rseTileE');
      if(eEl){
        const E = 0.5 * 1.7e-7 * Math.pow(trueRpm * Math.PI / 30, 2) * 1e6;
        eEl.innerHTML = (E >= 1 ? E.toFixed(2) + '<small>µJ</small>' : (E * 1000).toFixed(0) + '<small>nJ</small>');
      }
      const pip = host.querySelector('#rsePip');
      if(pip){
        if(samples.length !== lastN){ lastN = samples.length; pipFlash = 3; }
        pip.classList.toggle('fresh', pipFlash-- > 0);
      }
      stack.tick();
    }, 250);
  }

  function addMarker(type, value, note){
    if(stage !== 'live' || !cap.isRecording()) return;
    runMarkers.push({ t_ms: cap.now(), type, value: value || '', note: note || '' });
    store.draftFlush(draftId, draftMeta(), cap.rec().frames, lastFlushed);   // markers ride the meta
  }

  // ---------------- stop & save ----------------
  async function buildRunRow(rec, m, status){
    // merge engine events into the stored markers (single audited stream)
    const merged = [...(rec.markers || []), ...((rec.events || []).map(e => ({ t_ms: e.t_ms, type: e.type, value: e.value || '', note: '' })))]
      .sort((a, b) => a.t_ms - b.t_ms);
    const samplesCsv = store.buildSamplesCsv(rec);
    const sha = await store.sha256Hex(samplesCsv);
    // Save-time derived metrics — the SAME pipeline the panels run, so the
    // stored/exported numbers can never disagree with the screen. A metrics
    // failure must never block the save (raw data first).
    let metrics = null;
    try {
      const mcal = cals.find(x => x.id === m.calId);
      // A run that NAMES a calibration must never store factory-model metrics
      // (crash-recovery can run before the Supabase calibration list arrives —
      // better no stored metrics than silently wrong ones).
      if(!m.calId || (mcal && mcal.coef && mcal.coef.K)){
        const mcoef = (mcal && mcal.coef && mcal.coef.K) ? mcal.coef : { ...FACTORY_COEF };
        metrics = computeRunMetrics(
          rec.rpmPts.map(p => ({ t: p.t / 1000, rpm: p.rpm })),
          mcoef,
          store.noiseFloorNNm(mcal && mcal.coef && mcal.coef.K ? mcal.coef : null).tau,
          rec.spins,
        );
      }
    } catch(e){ console.error('research: metrics failed', e); }
    const summary = store.summarizeRun(rec, {
      coasts: rec.spins.map(s => ({ n: s.n, t_start_ms: s.t_start_ms, t_end_ms: s.t_end_ms, T24_5: s.T24_5 ?? null, max_rpm: s.max_rpm, interrupted: !!s.interrupted, tail: s.tail || null })),
      ...(metrics ? { metrics } : {}),
    });
    const title = store.makeTitle(m.labels || [], rec.startedAt);
    const wheel = wheels.find(w => w.id === m.wheelId) || (c.wheels || []).find(w => w.id === m.wheelId);
    const env = { ua: navigator.userAgent };
    if(rec.simUsed) env.sim = true;
    if(bleState.deviceName) env.ble_device = bleState.deviceName;   // which physical device recorded this
    const cal = cals.find(x => x.id === m.calId);
    if(cal) env.calibration_age_days = store.calAgeDays(cal);
    // SNAPSHOT the calibration model + wheel identity onto the run itself:
    // (a) archival correctness — the run keeps the exact reference it was
    // measured against even if the calibration is edited/archived later, and
    // (b) the SUBJECT can see the true charts (RLS keeps other people's
    // calibration/wheel ROWS owner-only, but this run is shared with them).
    if(cal) env.cal = { coef: cal.coef, location: cal.location, created_at: cal.created_at, temp_c: cal.temp_c ?? null, rh_pct: cal.rh_pct ?? null };
    if(wheel) env.wheel = { serial: wheel.serial, nickname: wheel.nickname || null };
    // local JSON FIRST — before any network
    downloadJson({
      kind: 'experiment', serial: wheel ? wheel.serial : 'unknown', title,
      subject: m.subject || null, labels: m.labels || [], notes: m.notes || null,
      env, fw: rec.fw, hw: rec.hw, started_at: rec.startedAt, ended_at: rec.endedAt,
      frame_count: rec.frames.length, markers: merged, spins: rec.spins,
      frames: rec.frames, coef: cal ? cal.coef : null, sha256_samples_csv: sha, format: store.RUN_FORMAT,
    }, 'ewr-research_run');
    return {
      row: {
        user_id: uid, wheel_id: m.wheelId || null, calibration_id: m.calId || null,
        subject_user_id: m.subject ? m.subject.id : null,
        title, temp_c: m.tempC, rh_pct: m.rhPct,
        labels: m.labels || [], notes: m.notes || null,
        started_at: rec.startedAt, ended_at: rec.endedAt, status,
        fw: rec.fw || null, hw: rec.hw || null, env,
        markers: merged, summary,
        frame_count: rec.frames.length,
        rpm_samples: rec.rpmPts.map(p => [p.t, Math.round(p.rpm * 1000) / 1000]),
        sha256: sha, format: store.RUN_FORMAT,
      },
      sha, samplesCsv, title, summary, merged,
    };
  }

  async function stopExperiment(reason){
    if(stage !== 'live') return;
    // Single-fire + IMMEDIATE feedback: the stage flips and the button reacts
    // before any work runs — a click that visibly does nothing was a real bug
    // report, caused by a later step throwing before the first paint.
    stage = 'summary';
    const stopBtn = host.querySelector('#rseStop');
    if(stopBtn){ stopBtn.disabled = true; stopBtn.textContent = 'Stopping…'; }
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    const box = host.querySelector('#rseSummary');
    if(box) box.innerHTML = `<div class="rs-card"><h2>Saving…</h2><p class="rs-note">Local JSON backup downloads first, then the database.</p></div>`;
    // The save outcome must be UNMISSABLE — the card sits right under the
    // status strip, and we scroll to it ("Stopping… and nothing happens" was
    // a real field report: the card used to render below the 10-panel stack).
    if(box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    let rec = null;
    try {
      rec = cap.stop();
      recordingActive = false;
      if(!rec){ stage = 'live'; return; }
      rec.markers = runMarkers;
      const m = draftMeta();
      m.startedAt = rec.startedAt;
      // seal the camera/voice take (if any) — the devices go dark now; the
      // upload itself runs after the run row exists (finishSave)
      mediaTake = null;
      if(soloVoice){
        try { mediaTake = await soloVoice.takeRecording(); }
        catch(e){ console.error('research: takeRecording failed', e); }
      }
      await finishSave(rec, m, reason, box);
      // cosmetic pass LAST — a chart error must never block the save
      try { if(stack) stack.setReview(); } catch(e){ console.error('research: setReview failed', e); }
    } catch(e){
      console.error('research: stop/save failed', e);
      // a sealed camera/voice take must not vanish with the error either
      if(mediaTake){
        try {
          const ext = /mp4/.test(mediaTake.blob.type) ? 'mp4' : 'webm';
          downloadBlob('ewr-research_recording_salvage.' + ext, mediaTake.blob);
        } catch {}
        mediaTake = null;
      }
      // salvage: the recording must never be lost — raw JSON straight to disk
      try {
        if(rec) downloadJson({
          kind: 'experiment-salvage', serial: 'salvage',
          started_at: rec.startedAt || new Date().toISOString(), env: {},
          frame_count: rec.frames.length, frames: rec.frames,
          markers: rec.markers || [], spins: rec.spins || [], events: rec.events || [],
          format: store.RUN_FORMAT,
        }, 'ewr-research_salvage');
      } catch {}
      if(box) box.innerHTML = `<div class="rs-card"><h2>Stop hit an error</h2>
        <p class="rs-note">${esc((e && e.message) || 'unknown error')} — a raw JSON backup was just downloaded,
        and the interrupted-run recovery will also offer this recording on your next visit.</p>
        <button type="button" class="rs-ghostbtn" id="rseNewErr">Back to setup</button></div>`;
      const tl = host.querySelector('#rseTools');
      if(tl) tl.style.display = 'none';
      const nb = box && box.querySelector('#rseNewErr');
      if(nb) nb.addEventListener('click', () => {
        if(stack){ stack.destroy(); stack = null; }
        stage = 'setup';
        host.querySelector('#rseRun').style.display = 'none';
        host.querySelector('#rseSetup').style.display = '';
        host.querySelector('#rseRunsCard').style.display = '';
        buildSetup(); paintRuns();
      });
    }
    paintRuns();
  }

  async function finishSave(rec, m, reason, box){
    const built = await buildRunRow(rec, m, 'complete');
    const res = await store.saveRun(built.row, rec.frames);
    await store.draftDelete(draftId);
    const wheel = wheels.find(w => w.id === m.wheelId);
    const err = res.error ? esc(res.error.message) : (res.chunkErrors ? res.chunkErrors + ' data chunk(s) failed to upload (JSON backup has everything)' : null);
    box.innerHTML = `
      <div class="rs-card">
        <h2>Experiment saved</h2>
        ${reason ? `<div class="rs-warn">${esc(reason)}</div>` : ''}
        <div class="rs-meta" style="margin-top:10px">
          <span><b>${esc(built.title)}</b></span>
          <span>${esc(wheel ? wheel.serial : '?')}</span>
          ${m.subject ? `<span>subject: ${avatarHtml(m.subject.avatarUrl || (sel.subject && sel.subject.avatarUrl), m.subject.name)} <b>${esc(m.subject.name)}</b></span>` : ''}
          <span>${built.summary.duration_s}s · peak <b>${built.summary.peak_rpm} rpm</b> · ${built.summary.revolutions} rev</span>
          ${built.summary.metrics && built.summary.metrics.energy_in_uj != null
            ? `<span title="All the energy the wheel received during this run — from the hand, the air, anything. The instrument cannot tell where it came from — only that it went in.">energy in, total <b>${built.summary.metrics.energy_in_uj} µJ</b> ± ${built.summary.metrics.energy_in_sigma_uj}</span>` : ''}
          <span>${res.id ? '<b style="color:#0f8a52">DB ✓</b>' : '<b style="color:#c2415b">DB failed</b>'}</span>
        </div>
        <div id="rseSumLabels"></div>
        ${err ? `<div class="rs-warn">${err}</div>` : ''}
        <div class="rs-hash">SHA-256 (samples.csv): ${built.sha}<br><span style="color:#99a2a7">File hash — proof the exported data is unaltered.</span></div>
        <div class="rs-dl" id="rseDl">
          <button type="button" class="rs-mini" data-dl="package" style="font-weight:800">⬇ Data package (.zip)</button>
          <button type="button" class="rs-mini" data-dl="samples">samples.csv</button>
          <button type="button" class="rs-mini" data-dl="markers">markers.csv</button>
          <button type="button" class="rs-mini" data-dl="meta">meta.csv</button>
          <button type="button" class="rs-mini" data-dl="xlhu">Excel copy (HU)</button>
          ${res.id ? `<a class="rs-mini" style="text-decoration:none" href="#/research/run/${res.id}">Open the run page →</a>` : ''}
          <button type="button" class="rs-ghostbtn" id="rseNew">New experiment</button>
        </div>
      </div>`;
    box.querySelector('#rseDl').addEventListener('click', e => {
      const b = e.target.closest('[data-dl]');
      if(!b) return;
      exportCsv(b.dataset.dl, rec, m, built, res.id || '');
    });
    box.querySelector('#rseNew').addEventListener('click', () => {
      stage = 'setup';
      if(stack){ stack.destroy(); stack = null; }
      host.querySelector('#rseRun').style.display = 'none';
      host.querySelector('#rseSetup').style.display = '';
      host.querySelector('#rseRunsCard').style.display = '';
      buildSetup(); paintRuns();
    });
    renderSummaryLabels(res.id, m);
    // recording is over — the sticky toolbar (with its dead Stop button) only
    // obscures the review; the panels below stay for inspection
    const tl = host.querySelector('#rseTools');
    if(tl) tl.style.display = 'none';
    // store the camera/voice take — AFTER the row exists; reference in env.
    // Failure never loses field data: the take downloads locally instead.
    if(mediaTake){
      const mt = mediaTake;
      mediaTake = null;
      const card = box.querySelector('.rs-card');
      const note = document.createElement('div');
      note.className = 'rs-warn';
      note.textContent = mt.media === 'video' ? 'Storing your camera take…' : 'Storing your voice take…';
      if(card) card.appendChild(note);
      const localFallback = () => {
        try {
          const ext = /mp4/.test(mt.blob.type) ? 'mp4' : 'webm';
          downloadBlob('ewr-research_recording_' + (rec.startedAt || '').replace(/[:.]/g, '-') + '.' + ext, mt.blob);
        } catch {}
      };
      if(res.id){
        try {
          const up = await store.uploadResearchMedia(uid, res.id, mt);
          if(up.error) throw up.error;
          const recording = {
            path: up.path, media: mt.media, mime: mt.mime,
            duration_s: Math.max(1, Math.round((mt.stopMs - mt.startedMs) / 1000)),
            started_ms: mt.startedMs,
            offset_ms: Math.max(0, mt.startedMs - new Date(rec.startedAt).getTime()),
          };
          built.row.env = { ...built.row.env, recording };
          await store.updateRun(res.id, { env: built.row.env });
          note.className = 'rs-msg ok';
          note.textContent = (mt.media === 'video' ? 'Camera take stored ✓' : 'Voice take stored ✓') + ' — replay it in sync on the run page.';
        } catch(e){
          console.error('research: media upload failed', e);
          localFallback();
          note.textContent = 'The recording could not be stored (' + ((e && e.message) || e)
            + ') — it was downloaded to your device instead. If this is the first recording, the storage policies may not be applied yet.';
        }
      } else {
        localFallback();
        note.textContent = 'The run could not reach the database — the recording was downloaded to your device.';
      }
    }
  }

  // Post-run label editing on the summary card — things often become clear
  // only AFTER a measurement; every tap saves straight to the run row.
  function renderSummaryLabels(runId, m){
    const boxEl = host.querySelector('#rseSumLabels');
    if(!boxEl) return;
    const current = new Set(m.labels || []);
    const save = async () => {
      m.labels = [...current];
      if(runId) await store.updateRun(runId, { labels: m.labels });
      paintRuns();
    };
    const paint = () => {
      boxEl.innerHTML = `
        <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#67737c;margin:10px 0 8px">
          Labels — tap to add or remove${runId ? ' (saves instantly)' : ''}</div>
        <div class="rs-chips">${labels.map(l =>
          `<span class="rs-chip ${current.has(l.label) ? 'on' : ''}" data-sl="${esc(l.label)}">#${esc(l.label)}</span>`).join('')}
          <span class="rs-newlabel"><input id="rseSumNew" type="text" placeholder="#new" autocomplete="off">
          <button type="button" class="rs-mini" id="rseSumAdd">+</button></span></div>`;
      boxEl.querySelectorAll('[data-sl]').forEach(chip => chip.addEventListener('click', async () => {
        const l = chip.dataset.sl;
        current.has(l) ? current.delete(l) : current.add(l);
        chip.classList.toggle('on');
        save();
      }));
      const add = async () => {
        const inp = boxEl.querySelector('#rseSumNew');
        const v = inp.value.trim();
        if(!v) return;
        const { row, error } = await store.addLabel(uid, v);
        if(error || !row) return;
        if(!labels.find(x => x.label === row.label)) labels.push(row);
        c.labels = labels;
        current.add(row.label);
        paint();
        save();
      };
      boxEl.querySelector('#rseSumAdd').addEventListener('click', add);
      boxEl.querySelector('#rseSumNew').addEventListener('keydown', e => { if(e.key === 'Enter') add(); });
    };
    paint();
  }

  // built is REQUIRED: the samples CSV bytes must be the exact ones the saved
  // SHA-256 was computed from — never regenerated on the export path.
  function exportCsv(which, rec, m, built, runId){
    const wheel = wheels.find(w => w.id === m.wheelId) || {};
    const cal = cals.find(x => x.id === m.calId);
    const base = store.exportBaseName('experiment', wheel.serial, rec.startedAt, rec.simUsed);
    const metaObj = {
      runId: runId || '', kind: 'experiment',
      researcherName: a.displayName || '', subjectName: m.subject ? m.subject.name : '', subjectUserId: m.subject ? m.subject.id : '',
      wheelSerial: wheel.serial || '', wheelNickname: wheel.nickname || '',
      tempC: m.tempC, rhPct: m.rhPct, labels: m.labels, notes: m.notes,
      calibrationId: m.calId || '', coef: cal ? cal.coef : null,
      sha256: built.sha,
      format: store.RUN_FORMAT,
      metrics: built.summary.metrics || null,
    };
    // the merged marker stream (user markers + engine events) for the CSV
    const recForCsv = { ...rec, markers: built.merged, events: [], spins: rec.spins };
    if(which === 'samples') store.downloadText(base + '_samples.csv', built.samplesCsv);
    else if(which === 'markers') store.downloadText(base + '_markers.csv', store.buildMarkersCsv(recForCsv));
    else if(which === 'meta') store.downloadText(base + '_meta.csv', store.buildMetaCsv(rec, metaObj));
    else if(which === 'xlhu') store.downloadText(base + '_samples_excel-hu.csv', store.toExcelHu(built.samplesCsv));
    else if(which === 'package'){
      const hasCal = !!(cal && cal.coef && cal.coef.K);
      const coefP = hasCal ? cal.coef : { ...FACTORY_COEF };
      const seriesRows = computeRunSeries(
        rec.rpmPts.map(p => ({ t: p.t / 1000, rpm: p.rpm })),
        coefP, store.noiseFloorNNm(hasCal ? cal.coef : null).tau, rec.spins);
      const rj = { ...built.row };
      delete rj.rpm_samples;   // raw is in samples.csv, fresh series in series.csv
      downloadPackage({
        base, samplesCsv: built.samplesCsv,
        markersCsv: store.buildMarkersCsv(recForCsv),
        metaCsv: store.buildMetaCsv(rec, metaObj),
        seriesRows, startedAt: rec.startedAt,
        readmeMeta: { ...metaObj, title: built.title, startedAt: rec.startedAt, endedAt: rec.endedAt,
          fw: rec.fw, hw: rec.hw, bleDevice: (built.row.env || {}).ble_device || '', format: store.RUN_FORMAT },
        runJson: rj,
        calJson: hasCal
          ? { calibration_id: cal.id, coef: cal.coef, location: cal.location, created_at: cal.created_at, temp_c: cal.temp_c ?? null, rh_pct: cal.rh_pct ?? null }
          : { note: 'no room calibration — factory model', coef: { ...FACTORY_COEF } },
      });
    }
  }

  // ---------------- runs list ----------------
  async function paintRuns(){
    const ul = host.querySelector('#rseRuns');
    if(!ul) return;
    const { rows, error } = await store.listRuns(uid);
    if(error){ ul.innerHTML = `<li class="rs-empty">Could not load: ${esc(error.message)}${/relation|does not exist/i.test(error.message) ? ' — run the research SQL first.' : ''}</li>`; return; }
    if(!rows.length){ ul.innerHTML = '<li class="rs-empty">No experiments yet.</li>'; return; }
    // subject profiles for avatars
    const subIds = [...new Set(rows.map(r => r.subject_user_id).filter(Boolean))];
    const profs = new Map();
    if(subIds.length){
      const { data } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', subIds);
      for(const p of data || []) profs.set(p.id, p);
    }
    ul.innerHTML = rows.map(r => {
      const s = r.summary || {};
      const sub = r.subject_user_id ? profs.get(r.subject_user_id) : null;
      return `<a class="rs-row" href="#/research/run/${r.id}">
        <div style="flex:1;min-width:0">
          <b>${esc(r.title || 'Research run')}</b>
          ${(r.env && r.env.sim) || (r.status === 'recovered') ? `<span class="rs-kbadge ${r.status === 'recovered' ? 'warn' : 'sim'}">${r.status === 'recovered' ? 'recovered' : 'SIM'}</span>` : ''}
          <div class="sub">${esc(new Date(r.started_at).toLocaleString('en-GB'))} · ${s.duration_s || 0}s
            · peak <b>${s.peak_rpm != null ? s.peak_rpm : '—'} rpm</b> · ${s.revolutions != null ? s.revolutions + ' rev' : ''}
            ${(r.labels || []).map(l => ' #' + esc(l)).join('')}</div>
        </div>
        ${sub ? avatarHtml(sub.avatar_url, sub.display_name) : ''}
      </a>`;
    }).join('');
  }

  c.members = null;   // refetch the subject list on every tab mount
  buildShell();
  cap.attach();
  unsubStatus = ble.subscribeStatus(s => { bleState = s; paintBleRow(); });

  return () => {
    // leaving mid-run: salvage (local JSON + DB attempt), never drop data
    const rec = cap.rec();
    if(stage === 'live' && rec && rec.frames.length) stopExperiment('Recording salvaged — you left the page.');
    else cap.discard();
    recordingActive = false;
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    if(stack){ stack.destroy(); stack = null; }
    cap.detach();
    if(unsubStatus) unsubStatus();
    if(soloVoice){ soloVoice.destroy(); soloVoice = null; }
  };
}

// ============================================================================
// CALIBRATION DETAIL (#/research/cal/<id>) — owner-only (RLS): the three
// curves, the pooled model, the observed range and the excluded-attempt audit
// trail of a saved calibration stay reviewable forever (owner requirement).
// ============================================================================
function mountCalDetail(el, calId){
  styles();
  let unsub = null, loadedFor = null, cleanupResize = null, dead = false;

  async function load(a){
    if(!a.user){
      if(a.accessReady) el.innerHTML = `<div class="rs-wrap"><div class="rs-card">
        <p class="rs-empty">This calibration is private — <a href="#/login">log in</a> to view it.</p></div></div>`;
      return;
    }
    if(!a.profile) return;
    if(loadedFor === a.user.id) return;
    loadedFor = a.user.id;
    el.innerHTML = `<div class="rs-wrap"><div class="rs-card"><p class="rs-empty">Loading…</p></div></div>`;
    const { row, error } = await store.loadCalibration(calId);
    if(dead) return;   // navigated away mid-load: never touch the detached el / leak listeners
    if(error || !row){
      el.innerHTML = `<div class="rs-wrap"><div class="rs-card">
        <h1 style="font-family:'Montserrat',sans-serif;font-weight:600;color:#011624;margin:0 0 6px">Not found</h1>
        <p class="rs-empty">This calibration doesn't exist or isn't yours. <a href="#/research">Back to Research</a></p></div></div>`;
      return;
    }
    const wq = row.wheel_id
      ? await supabase.from('research_wheels').select('serial, nickname').eq('id', row.wheel_id).maybeSingle()
      : { data: null };
    if(dead) return;
    const wheel = wq.data;
    const coef = row.coef || null;
    const spins = row.spins || [];
    const frames = row.frames || [];
    const age = store.calAgeDays(row);
    // the calibrations table has no env column — SIM provenance rides fw/hw
    const simFlag = row.fw === 'SIM' || row.hw === 'SIM';

    // rebuild the display curves exactly like the live tab drew them: the
    // color index persisted on the spin wins; old rows fall back to the
    // accepted ordinal
    let fallbackIdx = 0;
    const curvesD = [];
    for(const s of spins){
      const d = calDisplayCurveFrom(frames, s.t_start_ms, s.t_end_ms);
      const ci = s.color_idx != null ? s.color_idx : fallbackIdx;
      if(!s.excluded) fallbackIdx++;
      if(d) curvesD.push({
        n: s.n, dashed: !!s.excluded,
        color: s.excluded ? '#99a2a7' : PALETTE[ci % PALETTE.length],
        pts: d.pts,
      });
    }
    const looBy = new Map(coef && coef.loo ? coef.loo.errs.map(e => [e.n, e.pct]) : []);
    const psBy = new Map(coef && coef.per_spin ? coef.per_spin.map(p => [p.n, p]) : []);
    const acceptedCount = spins.filter(s => !s.excluded).length;
    const excludedCount = spins.length - acceptedCount;

    el.innerHTML = `
    <div class="rs-wrap">
      <p style="margin:0 0 8px"><a href="#/research" style="color:#5230da;font-size:13.5px;text-decoration:none">← Research</a></p>
      <div class="rs-head">
        <h1>Calibration — ${esc(wheel ? wheel.serial : '?')} · ${esc(row.location || 'room')}
          ${simFlag ? '<span class="rs-kbadge sim">SIM</span>' : ''}
          ${row.archived ? '<span class="rs-kbadge grey">archived</span>' : ''}
          ${age > store.CAL_STALE_DAYS ? '<span class="rs-kbadge warn">stale</span>' : ''}</h1>
        <p>${esc(new Date(row.created_at).toLocaleString('en-GB'))} · ${row.temp_c ?? '—'}°C · ${row.rh_pct ?? '—'}%
          · ${acceptedCount} accepted spin${acceptedCount === 1 ? '' : 's'}${excludedCount ? ` + ${excludedCount} excluded attempt${excludedCount === 1 ? '' : 's'}` : ''}</p>
      </div>
      <div class="rs-card">
        ${coef ? fitSummaryHtml(coef) : '<p class="rs-empty">No usable baseline was fitted from this recording.</p>'}
        <div id="rscdSpins" style="margin-top:12px">${(() => {
          const rowOf = s => { const ps = psBy.get(s.n); const loo = looBy.get(s.n);
            const color = s.excluded ? '#99a2a7' : PALETTE[(s.color_idx != null ? s.color_idx : 0) % PALETTE.length];
            return `
            <div class="rs-spinrow${s.excluded ? ' exc' : ''}">
              <span class="rs-dot" style="background:${color}"></span>
              <b>spin ${s.n}</b>
              <span class="rs-kbadge${s.excluded ? ' grey' : ''}">${s.excluded ? 'excluded' : 'accepted'}</span>
              <span>peak ${s.max_rpm} rpm</span>
              <span>${s.T24_5 != null ? 'T24→5 <b>' + Number(s.T24_5).toFixed(1) + ' s</b>' : 'no 24-rpm coast'}</span>
              ${ps && ps.t24_10 != null ? `<span>24→10 ${ps.t24_10} s</span>` : ''}
              ${loo != null ? `<span title="Out-of-sample: the other spins' model vs this spin">vs others ${fmtPctSigned(loo)}</span>` : ''}
              <span>${tailLabel(s.tail)}</span>
              ${s.excluded && s.exclude_reason ? `<span style="flex-basis:100%;color:#99a2a7;font-size:12px">${esc(s.exclude_reason)}</span>` : ''}
            </div>`; };
          const acc = spins.filter(s => !s.excluded), exc = spins.filter(s => s.excluded);
          if(!spins.length) return '<p class="rs-empty">No spins recorded.</p>';
          return acc.map(rowOf).join('')
            + (exc.length ? `<details class="rs-tech"><summary>${exc.length} excluded attempt${exc.length === 1 ? '' : 's'}</summary>${exc.map(rowOf).join('')}</details>` : '');
        })()}</div>
        ${chartHead('top')}
        <canvas id="rscdChart" class="rs-calchart"></canvas>
        ${chartHead('dev')}
        <canvas id="rscdDev" class="rs-caldev"></canvas>
        ${chartHead('deriv')}
        <canvas id="rscdDeriv" class="rs-calderiv"></canvas>
        ${coef && coef.band_pts ? chartHead('band') + '<canvas id="rscdBand" class="rs-calband"></canvas>' : ''}
        <div class="rs-dl">
          <button type="button" class="rs-mini" id="rscdJson">Download raw JSON</button>
          ${row.archived ? '' : '<button type="button" class="rs-ghostbtn" id="rscdArch" style="margin-left:auto">Archive</button>'}
        </div>
        <div class="rs-honesty">The observed calibration range is how far ${acceptedCount} real coast-down${acceptedCount === 1 ? '' : 's'} sat from
        ${acceptedCount === 1 ? 'its' : 'their common'} model — a repeatability measure, never a confidence interval. Analysis: ${esc((coef && coef.algo) || 'n/a')}.
        This software cannot distinguish air currents, static or vibration from any other influence — shielding and
        controls are the researcher's responsibility.</div>
      </div>
    </div>`;

    const paintAll = () => {
      const modelPts = coef && coef.K ? integrateModel(coef).pts : null;
      const c1 = el.querySelector('#rscdChart');
      if(c1) drawTestChart(c1, curvesD, null, { model: modelPts, shadeOutside: !!(modelPts && coef.fit === 'lsq') });
      const cd = el.querySelector('#rscdDev');
      if(cd) drawDevChart(cd, curvesD, null);
      const c2 = el.querySelector('#rscdDeriv');
      if(c2) drawDerivChart(c2, curvesD, null, { model: coef && coef.K ? coef : null, calm: true });
      const cb = el.querySelector('#rscdBand');
      if(cb && coef && coef.band_pts) drawBandStrip(cb, coef.band_pts, store.noiseFloorNNm(coef).tau, store.CAL_BAND_BINS);
    };
    paintAll();
    // static data, cheap repaint — keep the canvases honest on resize
    const onResize = () => paintAll();
    window.addEventListener('resize', onResize);
    cleanupResize = () => window.removeEventListener('resize', onResize);

    el.querySelector('#rscdJson').addEventListener('click', () => {
      downloadJson({
        kind: 'calibration',
        serial: wheel ? wheel.serial : 'unknown',
        wheel_id: row.wheel_id,
        location: row.location, temp_c: row.temp_c, rh_pct: row.rh_pct,
        env: simFlag ? { sim: true } : {}, fw: row.fw || null, hw: row.hw || null,
        started_at: row.started_at, ended_at: row.ended_at,
        frame_count: row.frame_count, spins, frames, events: row.events || [],
        coef, format: row.format || store.RUN_FORMAT,
      }, 'ewr-research_calibration');
    });
    const arch = el.querySelector('#rscdArch');
    if(arch) arch.addEventListener('click', async () => {
      if(!confirm('Archive this calibration? Experiments that used it keep their reference.')) return;
      await store.archiveCalibration(calId);
      location.hash = '#/research';
    });
  }

  unsub = auth.subscribeAuth(load);
  return () => {
    dead = true;
    if(cleanupResize) cleanupResize();
    if(unsub) unsub();
  };
}

// ============================================================================
// RUN DETAIL (#/research/run/<id>) — owner AND subject can open it
// ============================================================================
function mountRunDetail(el, runId){
  styles();
  let stack = null;
  let unsub = null;
  let loadedFor = null;
  let replayClock = null;
  let mediaCleanup = null;

  async function load(a){
    if(!a.user){
      // a shared run link opened logged-out must say so, not stay blank
      if(a.accessReady) el.innerHTML = `<div class="rs-wrap"><div class="rs-card">
        <p class="rs-empty">This research run is private — <a href="#/login">log in</a> to view it.</p></div></div>`;
      return;
    }
    if(!a.profile) return;
    if(loadedFor === a.user.id) return;
    loadedFor = a.user.id;
    el.innerHTML = `<div class="rs-wrap"><div class="rs-card"><p class="rs-empty">Loading…</p></div></div>`;
    const { row, error } = await store.loadRun(runId);
    if(error || !row){
      el.innerHTML = `<div class="rs-wrap"><div class="rs-card">
        <h1 style="font-family:'Montserrat',sans-serif;font-weight:600;color:#011624;margin:0 0 6px">Not found</h1>
        <p class="rs-empty">This research run doesn't exist or isn't shared with you. <a href="#/research">Back to Research</a></p></div></div>`;
      return;
    }
    const isOwner = row.user_id === a.user.id;
    // wheel serial + calibration coef + subject profile (independent lookups)
    const [wheelQ, calQ, subQ, ownerQ] = await Promise.all([
      row.wheel_id ? supabase.from('research_wheels').select('serial, nickname').eq('id', row.wheel_id).maybeSingle() : Promise.resolve({ data: null }),
      row.calibration_id ? supabase.from('research_calibrations').select('coef, location, created_at, temp_c, rh_pct').eq('id', row.calibration_id).maybeSingle() : Promise.resolve({ data: null }),
      row.subject_user_id ? supabase.from('profiles').select('id, display_name, avatar_url').eq('id', row.subject_user_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('profiles').select('display_name').eq('id', row.user_id).maybeSingle(),
    ]);
    // RLS keeps wheel/calibration ROWS owner-only, so for a SUBJECT viewer the
    // lookups return null — fall back to the snapshot stored on the run itself
    // (env.wheel / env.cal), so both viewers see identical charts + references.
    const envSnap = row.env || {};
    const wheel = wheelQ.data || envSnap.wheel || null;
    const cal = calQ.data || envSnap.cal || null;
    const subject = subQ.data, owner = ownerQ.data;
    const s = row.summary || {};
    const coef = (cal && cal.coef && cal.coef.K) ? cal.coef : { ...FACTORY_COEF };
    const factory = !(cal && cal.coef && cal.coef.K);

    el.innerHTML = `
    <div class="rs-wrap">
      <p style="margin:0 0 8px"><a href="#/research" style="color:#5230da;font-size:13.5px;text-decoration:none">← Research</a></p>
      <div class="rs-head">
        <h1>${esc(row.title || 'Research run')} ${row.env && row.env.sim ? '<span class="rs-kbadge sim">SIM</span>' : ''}${row.status === 'recovered' ? '<span class="rs-kbadge warn">recovered</span>' : ''}</h1>
        <p>Recorded by <b>${esc(owner ? owner.display_name : 'researcher')}</b> · ${esc(new Date(row.started_at).toLocaleString('en-GB'))}</p>
      </div>
      <div class="rs-card">
        <div class="rs-meta">
          <span>wheel <b>${esc(wheel ? wheel.serial : '?')}</b>${cal && cal.coef && cal.coef.score != null ? ` <span class="rs-score rs-s${cal.coef.grade}"${cal.coef.score_basis ? ` title="Based on the ${esc(cal.coef.score_basis)}"` : ''}>${cal.coef.score} · ${cal.coef.grade}</span>` : ''}</span>
          <span>calibration: <b>${cal ? esc((cal.location || 'room') + ' · ' + new Date(cal.created_at).toLocaleDateString('en-GB')) : 'factory model'}</b></span>
          <span>${row.temp_c != null ? row.temp_c + '°C' : '—'} · ${row.rh_pct != null ? row.rh_pct + '%' : '—'}</span>
          ${subject ? `<span>subject: ${avatarHtml(subject.avatar_url, subject.display_name)} <b>${esc(subject.display_name)}</b></span>` : ''}
          ${isOwner ? '' : `<span>${(row.labels || []).map(l => '#' + esc(l)).join(' ')}</span>`}
        </div>
        <div class="rs-statband">
          <div class="rs-stat hi" title="All the energy the wheel received during this run — from the hand, the air, anything. What its motion gained plus what friction and air took while it turned, using the calibrated drag. The instrument cannot tell WHERE it came from — only that it went in.">
            <div class="v" id="rsdEnergyV">—</div>
            <div class="l">Energy in, total</div>
            <div class="f" id="rsdEnergyF">from all sources combined</div>
          </div>
          <div class="rs-stat">
            <div class="v">${s.peak_rpm ?? '—'}<small>rpm</small></div>
            <div class="l">Peak speed</div>
            <div class="f">mean ${s.mean_rpm ?? '—'} rpm</div>
          </div>
          <div class="rs-stat">
            <div class="v">${s.revolutions ?? '—'}</div>
            <div class="l">Turns</div>
            <div class="f">counted from measured motion</div>
          </div>
          <div class="rs-stat">
            <div class="v">${Math.floor((s.duration_s || 0) / 60)}:${String((s.duration_s || 0) % 60).padStart(2, '0')}</div>
            <div class="l">Length</div>
            <div class="f">${s.coast_count || 0} hands-off slow-down${(s.coast_count || 0) === 1 ? '' : 's'}</div>
          </div>
        </div>
        ${isOwner ? '<div id="rsdLabels"></div>' : ''}
        ${row.notes ? `<p class="rs-note">${esc(row.notes)}</p>` : ''}
        <div id="rsdQuality"></div>
        <div class="rs-replaybar" id="rsdReplay"></div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px">
          <span class="rs-presets" id="rsdPresets" style="margin-left:0">
            <button type="button" class="rs-preset" data-preset="60">60 s</button>
            <button type="button" class="rs-preset" data-preset="300">5 min</button>
            <button type="button" class="rs-preset on" data-preset="full">Full</button>
          </span>
        </div>
        <div id="rsdStackHost"></div>
        <div class="rs-hash">SHA-256 (samples.csv): ${esc(row.sha256 || '—')}</div>
        <div class="rs-dl" id="rsdDl">
          <button type="button" class="rs-mini" data-dl="package" style="font-weight:800">⬇ Data package (.zip)</button>
          <button type="button" class="rs-mini" data-dl="samples">samples.csv</button>
          <button type="button" class="rs-mini" data-dl="markers">markers.csv</button>
          <button type="button" class="rs-mini" data-dl="meta">meta.csv</button>
          <button type="button" class="rs-mini" data-dl="xlhu">Excel copy (HU)</button>
          ${isOwner ? '<button type="button" class="rs-ghostbtn" id="rsdDelete" style="margin-left:auto">Delete run</button>' : ''}
        </div>
        <div class="rs-honesty">This software cannot distinguish air currents, static or vibration from any other
        influence — shielding and controls are the researcher's responsibility. Absolute torque/energy scale ±10%
        (moment of inertia). True rpm above the device's 24-rpm display comes from the internal revolution counter.</div>
      </div>
    </div>`;

    // panel stack in review mode, fed from the stored fresh-sample series
    const samples = (row.rpm_samples || []).map(p => ({ t: p[0] / 1000, rpm: p[1] }));
    const markers = (row.markers || []).filter(m => ['mark', 'note', 'direction'].includes(m.type));
    const coasts = (s.coasts || []);

    // "Energy in, total" — the hero stat of the header: all the energy the
    // wheel received over this run (hand, air, anything), computed with the
    // calibrated drag. Recomputed live so old runs get it too.
    {
      const vEl = el.querySelector('#rsdEnergyV'), fEl = el.querySelector('#rsdEnergyF');
      if(vEl && samples.length >= 2){
        try {
          const m = computeRunMetrics(samples, coef, store.noiseFloorNNm(factory ? null : coef).tau, coasts);
          if(m.energy_in_uj != null){
            vEl.innerHTML = `${m.energy_in_uj}<small>µJ</small>`;
            if(fEl) fEl.textContent = `± ${m.energy_in_sigma_uj} µJ · hand, air, anything`;
          }
        } catch {}
      }
    }

    // quality header — same 4 chips the live screen shows, frozen at the run's data
    {
      const calT = (cal && cal.temp_c != null) ? cal.temp_c : null;
      const calRh = (cal && cal.rh_pct != null) ? cal.rh_pct : null;
      const qEl = el.querySelector('#rsdQuality');
      if(qEl){
        qEl.innerHTML = qualityChipsHtml({
          factory, coef,
          ageDays: envSnap.calibration_age_days != null ? envSnap.calibration_age_days : null,
          dT: (row.temp_c != null && calT != null) ? Math.round((row.temp_c - calT) * 10) / 10 : null,
          dRh: (row.rh_pct != null && calRh != null) ? Math.round(row.rh_pct - calRh) : null,
          ...computeQuality(samples, coef),
        });
        wireQualityChips(qEl);
      }
    }
    stack = createPanelStack(el.querySelector('#rsdStackHost'), {
      mode: 'review', coef,
      floor: store.noiseFloorNNm(factory ? null : coef),
      calNote: factory ? 'factory model' : 'room calibration ' + new Date(cal.created_at).toLocaleDateString('en-GB'),
      fileTag: runId.slice(0, 8),
    });
    stack.setData({ samples, markers, coasts });
    stack.setReview();

    // ---- REPLAY: play the run back through the same panels, live-style ------
    // The identical transport every replay in the app uses (play/seek/time/1×).
    // Idle state = full charts (the clock is born "at the end"); Play rewinds
    // to 0 and feeds the samples back in at real speed, the window following
    // the head exactly like a live recording.
    const durS = Math.max(1, (s.duration_s || (samples.length ? Math.ceil(samples[samples.length - 1].t) : 1)));
    const durationMs = durS * 1000;
    const applyAt = (tMs) => {
      const tS = tMs / 1000;
      let lo = 0, hi = samples.length;
      while(lo < hi){ const mid = (lo + hi) >> 1; (samples[mid].t <= tS) ? lo = mid + 1 : hi = mid; }
      stack.setData({
        samples: samples.slice(0, lo),
        markers: markers.filter(x => x.t_ms <= tMs),
        coasts: coasts.filter(x => x.t_end_ms <= tMs),
      });
      stack.tick();
    };
    const barEl = el.querySelector('#rsdReplay');
    let clockRef = null;
    const transport = mountTransport(barEl, {
      durationSeconds: durS,
      onToggle: () => clockRef && clockRef.toggle(),
      onSeek: ms => clockRef && clockRef.seek(ms),
      onSpeed: x => clockRef && clockRef.setSpeed(x),
    });

    // ---- recorded camera/voice take (env.recording), clock-synced -----------
    // The exact media-sync pattern every replay in the app uses: pause outside
    // the window, 0.35 s drift snap, playbackRate from state, autoplay-hint
    // button when the browser eats the gesture. Owner-only (the storage
    // policy is path-scoped to the owner; the subject sees data only).
    const recTake = (envSnap.recording && envSnap.recording.path && isOwner) ? envSnap.recording : null;
    let mediaEl = null, mediaTried = false, mediaPlaying = false;
    const mediaOffsetMs = recTake ? (recTake.offset_ms || 0) : 0;
    function showMediaHint(){
      if(!barEl || barEl.querySelector('[data-rsd-mediafix]')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'rp-speed'; b.setAttribute('data-rsd-mediafix', '');
      b.textContent = recTake && recTake.media === 'video' ? '🎥 Enable recording' : '🎙 Enable audio';
      b.addEventListener('click', () => { const p = mediaEl && mediaEl.play(); if(p && p.catch) p.catch(() => {}); });
      barEl.appendChild(b);
    }
    function syncMedia(t){
      if(!mediaEl) return;
      const desired = (t - mediaOffsetMs) / 1000;
      if(!mediaPlaying || t >= durationMs || desired < 0 || (mediaEl.duration && desired > mediaEl.duration)){
        if(!mediaEl.paused) mediaEl.pause();
        return;
      }
      if(Math.abs(mediaEl.currentTime - desired) > 0.35) mediaEl.currentTime = Math.max(0, desired);
      if(mediaEl.paused){
        const p = mediaEl.play();
        if(p && p.catch) p.catch(() => showMediaHint());
      }
    }
    async function ensureMedia(){
      if(mediaTried || !recTake) return;
      mediaTried = true;
      try {
        const { url, error } = await store.researchMediaUrl(recTake.path);
        if(error || !url) throw error || new Error('no url');
        if(recTake.media === 'video'){
          mediaEl = camReplayMedia(el, url, '#rsdReplay');
        } else {
          mediaEl = new Audio(url);
          mediaEl.preload = 'auto';
          const chip = document.createElement('span');
          chip.className = 'rs-pill';
          chip.textContent = '🎙 Voice take';
          barEl.appendChild(chip);
        }
        mediaEl.addEventListener('play', () => {
          const h = barEl.querySelector('[data-rsd-mediafix]');
          if(h) h.remove();
        });
      } catch(e){ console.error('research: media load failed', e); }
    }
    mediaCleanup = () => { if(mediaEl){ try { mediaEl.pause(); mediaEl.src = ''; } catch {} mediaEl = null; } };

    let lastApply = 0;
    replayClock = createReplayClock({
      durationMs,
      onFrame(t){
        transport.paint(t);
        syncMedia(t);
        // panel repaints throttled to ~7 Hz — fresh data only arrives at
        // 1.4 Hz anyway, and full-rate rebuilds would burn phones
        const now = performance.now();
        if(now - lastApply > 150 || t <= 0 || t >= durationMs){ lastApply = now; applyAt(t); }
      },
      onState(st){
        transport.setPlaying(st.playing, st.done);
        mediaPlaying = st.playing && !st.done;
        if(mediaEl){
          mediaEl.playbackRate = st.speed;
          if(!st.playing && !mediaEl.paused) mediaEl.pause();
        }
        if(st.playing && !mediaTried) ensureMedia();
        if(st.playing) stack.setLiveFollow();
        else if(st.done){ applyAt(durationMs); stack.setReview(); }
      },
    });
    clockRef = replayClock;
    transport.paint(durationMs);

    // zoom presets — the live screen has them in its status bar; the detail
    // page needs them too (a 2-minute run squeezed into one width is unreadable)
    const presetBox = el.querySelector('#rsdPresets');
    presetBox.addEventListener('click', e => {
      const b = e.target.closest('[data-preset]');
      if(!b) return;
      presetBox.querySelectorAll('[data-preset]').forEach(x => x.classList.toggle('on', x === b));
      stack.setPreset(b.dataset.preset);
    });

    // CSV export: frames come down only now, chunk by chunk
    el.querySelector('#rsdDl').addEventListener('click', async e => {
      const b = e.target.closest('[data-dl]');
      if(!b) return;
      b.disabled = true;
      const orig = b.textContent; b.textContent = 'Preparing…';
      const { frames, error: fe } = await store.loadRunFrames(runId);
      b.disabled = false; b.textContent = orig;
      if(fe || !frames || !frames.length){ alert('Could not load the raw data: ' + ((fe && fe.message) || 'no frames stored')); return; }
      const rec = {
        frames, rpmPts: samples.map(x => ({ t: x.t * 1000, rpm: x.rpm })),
        markers: row.markers || [], events: [], spins: coasts,
        startedAt: row.started_at, endedAt: row.ended_at, fw: row.fw, hw: row.hw,
        simUsed: !!(row.env && row.env.sim),
      };
      const base = store.exportBaseName('experiment', wheel ? wheel.serial : 'unknown', row.started_at, rec.simUsed);
      const metaObj = {
        runId, kind: 'experiment', researcherName: owner ? owner.display_name : '',
        subjectName: subject ? subject.display_name : '', subjectUserId: row.subject_user_id || '',
        wheelSerial: wheel ? wheel.serial : '', wheelNickname: wheel ? wheel.nickname : '',
        tempC: row.temp_c, rhPct: row.rh_pct, labels: row.labels, notes: row.notes,
        calibrationId: row.calibration_id || '',
        coef: cal ? cal.coef : null, sha256: row.sha256 || '',
        format: row.format || '',   // the run's OWN stored format — a re-export must not claim the current builder's version
        metrics: s.metrics || null,
      };
      if(b.dataset.dl === 'samples') store.downloadText(base + '_samples.csv', store.buildSamplesCsv(rec));
      else if(b.dataset.dl === 'markers') store.downloadText(base + '_markers.csv', store.buildMarkersCsv(rec));
      else if(b.dataset.dl === 'meta') store.downloadText(base + '_meta.csv', store.buildMetaCsv(rec, metaObj));
      else if(b.dataset.dl === 'xlhu') store.downloadText(base + '_samples_excel-hu.csv', store.toExcelHu(store.buildSamplesCsv(rec)));
      else if(b.dataset.dl === 'package'){
        const seriesRows = computeRunSeries(samples, coef, store.noiseFloorNNm(factory ? null : coef).tau, coasts);
        const rj = { ...row };
        delete rj.rpm_samples;   // raw is in samples.csv, fresh series in series.csv
        downloadPackage({
          base, samplesCsv: store.buildSamplesCsv(rec),
          markersCsv: store.buildMarkersCsv(rec),
          metaCsv: store.buildMetaCsv(rec, metaObj),
          seriesRows, startedAt: row.started_at,
          readmeMeta: { ...metaObj, title: row.title, startedAt: row.started_at, endedAt: row.ended_at,
            fw: row.fw, hw: row.hw, bleDevice: (row.env || {}).ble_device || '', format: row.format || store.RUN_FORMAT },
          runJson: rj,
          calJson: cal
            ? { calibration_id: row.calibration_id || null, coef: cal.coef || null, location: cal.location || null,
                created_at: cal.created_at || null, temp_c: cal.temp_c ?? null, rh_pct: cal.rh_pct ?? null }
            : { note: 'no room calibration — factory model', coef: { ...FACTORY_COEF } },
        });
      }
    });
    const del = el.querySelector('#rsdDelete');
    if(del) del.addEventListener('click', async () => {
      if(!confirm('Delete this run and its raw data for good? The JSON/CSV files you downloaded stay yours.')) return;
      await store.deleteRun(runId);
      location.hash = '#/research';
    });

    // Owner can edit labels here too — insight often comes after the fact.
    const labBox = el.querySelector('#rsdLabels');
    if(labBox && isOwner){
      const vocab = await store.listLabels(a.user.id);
      const current = new Set(row.labels || []);
      const paintLab = () => {
        labBox.innerHTML = `
          <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#67737c;margin:4px 0 8px">
            Labels — tap to add or remove (saves instantly)</div>
          <div class="rs-chips">${vocab.map(l =>
            `<span class="rs-chip ${current.has(l.label) ? 'on' : ''}" data-dl-label="${esc(l.label)}">#${esc(l.label)}</span>`).join('')}
            <span class="rs-newlabel"><input id="rsdNewLabel" type="text" placeholder="#new" autocomplete="off">
            <button type="button" class="rs-mini" id="rsdAddLabel">+</button></span></div>`;
        labBox.querySelectorAll('[data-dl-label]').forEach(chip => chip.addEventListener('click', async () => {
          const l = chip.dataset.dlLabel;
          current.has(l) ? current.delete(l) : current.add(l);
          chip.classList.toggle('on');
          await store.updateRun(runId, { labels: [...current] });
        }));
        const add = async () => {
          const inp = labBox.querySelector('#rsdNewLabel');
          const v = inp.value.trim();
          if(!v) return;
          const { row: lr, error } = await store.addLabel(a.user.id, v);
          if(error || !lr) return;
          if(!vocab.find(x => x.label === lr.label)) vocab.push(lr);
          current.add(lr.label);
          paintLab();
          await store.updateRun(runId, { labels: [...current] });
        };
        labBox.querySelector('#rsdAddLabel').addEventListener('click', add);
        labBox.querySelector('#rsdNewLabel').addEventListener('keydown', e => { if(e.key === 'Enter') add(); });
      };
      paintLab();
    }
  }

  unsub = auth.subscribeAuth(load);
  return () => {
    if(replayClock){ replayClock.destroy(); replayClock = null; }
    if(mediaCleanup){ mediaCleanup(); mediaCleanup = null; }
    if(stack) stack.destroy();
    if(unsub) unsub();
  };
}
