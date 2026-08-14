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
  createCapture, buildCurve, downloadJson, liveRpmOf, fmtRpm,
  FACTORY_COEF, TAIL_OBS_MS,
} from './wheel-capture.js';
import * as store from './research-store.js';
import { createPanelStack } from './research-panels.js';
// The calibration tab shows the exact same chart TRIO as the admin Wheel test
// (owner request) — the renderers are shared from there.
import { drawTestChart, drawDevChart, drawDerivChart, PALETTE } from './admin-wheel-bench.js';

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
  .rs-meta b{color:#011624}
  .rs-hash{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#67737c;word-break:break-all;
    background:#f7f8f8;border:1px solid #dfe3e6;border-radius:8px;padding:6px 9px;margin-top:8px}
  .rs-honesty{border:1px solid #dfe3e6;border-radius:12px;background:#fafbfc;color:#67737c;font-size:12.5px;
    line-height:1.55;padding:10px 14px;margin-top:14px}
  .rs-dl{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .rs-calchart{width:100%;height:340px;display:block;margin-top:12px}
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
  .rs-caltable{width:100%;border-collapse:collapse;font-size:13px}
  .rs-caltable td{padding:7px 8px;border-bottom:1px solid #eef1f3;color:#27384e;vertical-align:middle}
  .rs-caltable b{color:#011624}
  .rs-spinrow{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;background:#f7f8f8;border:1px solid #dfe3e6;
    border-radius:10px;padding:8px 12px;font-size:12.5px;color:#27384e;font-variant-numeric:tabular-nums;margin-bottom:6px}
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
  return `${cal.location || 'room'} · ${new Date(cal.created_at).toLocaleDateString('en-GB')} (${age}d)`
    + (c.T24_5 != null ? ` · T24→5 ${c.T24_5}s` : '');
}

// ---- mount ------------------------------------------------------------------
export function mount(el, sub, subId){
  styles();
  if(sub === 'run' && subId) return mountRunDetail(el, subId);
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

  const CAL_SPINS = 3;   // guided protocol: 3 spins, then it saves ITSELF
  const cap = createCapture({
    maxMs: 15 * 60 * 1000,
    onSpinClosed(spin, curve){
      spins.push(spin); curves.push(curve);
      if(curve) calCurves.push({ color: PALETTE[(calCurves.length) % PALETTE.length], pts: curve.pts, T245: curve.T245 });
      paintSpins(); paintCharts();
      // The protocol completes on its own — no Stop button to remember.
      if(spins.length >= CAL_SPINS) stopAndSave();
    },
    onAutoStop(){ stopAndSave('Auto-stopped after 15 minutes.'); },
  });

  host.innerHTML = `
    <div class="rs-card">
      <h2>Calibrate a wheel in this room</h2>
      <p class="rs-note">This records how <b>your</b> wheel coasts <b>in this room</b> with nobody influencing it.
      Every experiment is measured against this baseline. <b>Re-calibrate when you move to a different room.</b></p>
      <ol class="rs-steps">
        <li>Pick the wheel, fill in the environment, press <b>Start calibration</b>. From then on the settings lock and the process runs itself.</li>
        <li><b>Spin the wheel hard</b> (above 140 rpm), let go, and <b>hands off to the very end</b> — after each coast-down a 30&nbsp;s countdown watches the untouched wheel, then the spin closes on its own.</li>
        <li>Do this <b>3 times</b>. After the third spin the calibration <b>saves itself</b>. If one spin is much shorter than the others, lift the wheel off and reseat it before the next.</li>
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
          <span class="rs-guide-rpm"><b id="rscRpm">0</b> rpm</span>
          <span class="rs-guide-big" id="rscCount"></span>
          <span class="rs-progress"><i id="rscBar" style="width:0%"></i></span>
        </div>
        <div class="rs-guide-text" id="rscBadge"></div>
      </div>
      <span class="rs-msg" id="rscMsg"></span>
      <canvas id="rscChart" class="rs-calchart"></canvas>
      <canvas id="rscDev" class="rs-caldev"></canvas>
      <canvas id="rscDeriv" class="rs-calderiv"></canvas>
      <p class="rs-note" style="margin:8px 0 0">
      <b>Top chart:</b> every spin, lined up at the moment it slows through 24 rpm — the dashed line is the reference wheel,
      the green band is the healthy zone. A curve inside the band is a good spin; longer to the right = less braking.
      <b>Middle strip:</b> the magnifier — the same spins as percent difference from the reference; a steady drift below 0%
      means a few percent extra brake even when the top chart looks fine.
      <b>Bottom map:</b> where the braking comes from — each dot is one moment;
      <span style="color:#0f8a52;font-weight:700">green band</span> = healthy,
      <span style="color:#c2415b;font-weight:700">red</span> = bearing friction (reseat, then clean),
      <span style="color:#8a6a08;font-weight:700">amber</span> = extra air drag,
      <span style="color:#2c4bbd;font-weight:700">blue</span> = a draft is pushing the wheel.</p>
      <div id="rscSpins" style="margin-top:12px"></div>
      <div id="rscFit"></div>
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

  // In-progress spin as an anchored live curve (same as the bench).
  function liveCalCurve(){
    const rec = cap.rec();
    if(!rec || !rec.spinning) return null;
    return buildCurve(rec.rpmPts, rec.spinStartMs, cap.now());
  }
  // The full Wheel test chart trio — same renderers, same look.
  function paintCharts(){
    const lc = liveCalCurve();
    const c1 = $('rscChart');
    if(c1) drawTestChart(c1, calCurves, lc);
    const cd = $('rscDev');
    if(cd) drawDevChart(cd, calCurves, lc);
    const c2 = $('rscDeriv');
    if(c2) drawDerivChart(c2, calCurves, lc);
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
    const count = $('rscCount'), bar = $('rscBar'), badge = $('rscBadge');
    if(!rec.spinning){
      count.textContent = `spin ${Math.min(CAL_SPINS, spins.length + 1)} / ${CAL_SPINS}`;
      bar.style.width = Math.round(spins.length / CAL_SPINS * 100) + '%';
      badge.textContent = 'Spin the wheel HARD (above 140 rpm), then let go and don\'t touch it.';
    } else if(rec.lowSinceMs != null){
      const left = Math.max(0, Math.ceil((TAIL_OBS_MS - (t - rec.lowSinceMs)) / 1000));
      count.textContent = left + ' s';
      bar.style.width = Math.round((1 - left / (TAIL_OBS_MS / 1000)) * 100) + '%';
      badge.textContent = 'Hands off! The wheel is nearly still — this countdown records how the untouched wheel reacts to the room\'s air, then the spin closes by itself.';
    } else {
      count.textContent = `spin ${spins.length + 1} / ${CAL_SPINS}`;
      bar.style.width = '0%';
      badge.textContent = `Coasting — hands off. Peak ${Math.round(rec.maxRpm)} rpm; the chart below draws as it slows.`;
    }
    paintCharts();
  }

  function tailLabel(tail){
    if(!tail) return '';
    if(tail.stopped) return 'tail: STILL';
    return `tail: Ø${tail.avg_rpm.toFixed(1)} rpm · ${tail.pickups} pickup${tail.pickups === 1 ? '' : 's'}`;
  }
  function paintSpins(){
    const box = $('rscSpins');
    if(!box) return;
    box.innerHTML = spins.map(s => `
      <div class="rs-spinrow">
        <b>spin ${s.n}</b>
        <span>peak ${s.max_rpm} rpm</span>
        <span>${s.T24_5 != null ? 'T24→5 <b>' + s.T24_5.toFixed(1) + ' s</b>' : 'did not cross 24 rpm'}</span>
        <span>${tailLabel(s.tail)}</span>
      </div>`).join('');
    const fit = spins.length ? store.fitCalibration(spins, curves) : null;
    $('rscFit').innerHTML = fit ? `
      <div class="rs-meta" style="margin-top:8px">
        <span>baseline: <b>T24→5 ${fit.T24_5 != null ? fit.T24_5 + ' s' : '—'}</b></span>
        <span>model: <b>A=${fit.A} · K=${fit.K}</b> (${fit.fit})</span>
        <span>consistency: <b>${fit.quality_pct != null ? fit.quality_pct + '%' : 'need ≥2 clean spins'}</b></span>
        <span>ambient tail: <b>${fit.tail_avg != null ? 'Ø' + fit.tail_avg + ' rpm' : '—'}</b></span>
      </div>
      ${fit.quality_pct != null && fit.quality_pct < 70 ? '<div class="rs-warn">Spins disagree by a lot — that is almost always SEATING. Lift the wheel off, reseat it and spin again; the best spin defines the wheel.</div>' : ''}` : '';
  }

  function start(){
    const wheelId = $('rscWheel').value;
    if(!wheelId){ setMsg('err', 'Add a wheel first (Wheels & labels tab).'); return; }
    if(!$('rscLoc').value.trim() || !$('rscTemp').value || !$('rscRh').value){
      setMsg('err', 'Location, temperature and humidity are required for a calibration.'); return;
    }
    if(!bleState.connected && !cap.simActive()){ setMsg('err', 'Connect the wheel first, or enable the simulator.'); return; }
    spins = []; curves = []; calCurves = [];
    cap.start({ wheelId });
    recordingActive = true;
    setMsg('', '');
    paintBle(); paintLive(); paintSpins();
    if(!uiTimer) uiTimer = setInterval(paintLive, 250);
  }

  async function stopAndSave(reason){
    const r = cap.stop();
    recordingActive = false;
    if(!r) return;
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    paintLive();
    const wheel = (c.wheels || []).find(w => w.id === r.wheelId);
    // A failed fit must NOT lose the raw recording (field data discipline):
    // save everything with coef = null; the run setup treats it as factory.
    const coef = store.fitCalibration(spins, curves);
    const env = { ua: navigator.userAgent };
    if(r.simUsed) env.sim = true;
    const payload = {
      kind: 'calibration',
      serial: wheel ? wheel.serial : 'unknown',
      wheel_id: r.wheelId,
      location: $('rscLoc').value.trim(), temp_c: parseFloat($('rscTemp').value), rh_pct: parseFloat($('rscRh').value),
      env, fw: r.fw || null, hw: r.hw || null,
      started_at: r.startedAt, ended_at: r.endedAt,
      frame_count: r.frames.length, spins: r.spins, frames: r.frames, events: r.events,
      coef, format: store.RUN_FORMAT,
    };
    downloadJson(payload, 'ewr-research_calibration');   // local backup FIRST
    setMsg('', 'Saving calibration…');
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
    else setMsg('ok', `Calibration saved — T24→5 ${coef.T24_5 ?? '—'} s, consistency ${coef.quality_pct != null ? coef.quality_pct + '%' : '—'}.${reason ? ' (' + reason + ')' : ''}`);
    paintCalList();
  }

  function discard(){
    if(!cap.isRecording()) return;
    if(!confirm('Cancel this calibration? The recorded spins will be thrown away.')) return;
    cap.discard();
    recordingActive = false;
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    spins = []; curves = []; calCurves = [];
    paintBle(); paintLive(); paintSpins();
  }

  async function paintCalList(){
    const { rows, error } = await store.listCalibrations(uid);
    const ul = $('rscList');
    if(error){ ul.innerHTML = `<li class="rs-empty">Could not load: ${esc(error.message)}${/relation|does not exist/i.test(error.message) ? ' — run the research SQL first.' : ''}</li>`; return; }
    if(!rows.length){ ul.innerHTML = '<li class="rs-empty">No calibrations yet.</li>'; return; }
    const wheels = new Map((c.wheels || []).map(w => [w.id, w]));
    ul.innerHTML = rows.map(cal => {
      const w = wheels.get(cal.wheel_id);
      const cf = cal.coef || {};
      const age = store.calAgeDays(cal);
      return `<li class="rs-row">
        <div style="flex:1;min-width:0">
          <b>${esc(w ? w.serial : '?')}</b> · ${esc(cal.location || 'room')}
          ${age > store.CAL_STALE_DAYS ? '<span class="rs-kbadge warn">stale</span>' : ''}
          <div class="sub">${esc(new Date(cal.created_at).toLocaleString('en-GB'))} · ${cal.temp_c ?? '—'}°C · ${cal.rh_pct ?? '—'}%
            · T24→5 <b>${cf.T24_5 ?? '—'} s</b> · consistency ${cf.quality_pct != null ? cf.quality_pct + '%' : '—'}</div>
        </div>
        <button type="button" class="rs-mini" data-arch="${cal.id}">Archive</button>
      </li>`;
    }).join('');
  }
  $('rscList').addEventListener('click', async e => {
    const b = e.target.closest('[data-arch]');
    if(!b) return;
    if(!confirm('Archive this calibration? Experiments that used it keep their reference.')) return;
    await store.archiveCalibration(b.dataset.arch);
    paintCalList();
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
    box.innerHTML = age > store.CAL_STALE_DAYS
      ? `<div class="rs-warn">This calibration is <b>${age} days old</b>. Rooms drift (temperature, drafts, dust) — consider recalibrating. If you continue, the age is recorded in the run.</div>` : '';
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
      </div>
      <div id="rseSummary"></div>`;

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
    buildRunUi();
    host.querySelector('#rseHero').style.display = '';
    host.querySelector('#rseStack').style.display = '';
    host.querySelector('#rseTools').style.display = '';
    host.querySelector('#rseSimSpin').style.display = cap.simActive() ? '' : 'none';

    const coef = calCoef();
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

    let pipFlash = 0, lastN = 0;
    uiTimer = setInterval(() => {
      const rec = cap.rec();
      if(!rec) return;
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
    const summary = store.summarizeRun(rec, {
      coasts: rec.spins.map(s => ({ n: s.n, t_start_ms: s.t_start_ms, t_end_ms: s.t_end_ms, T24_5: s.T24_5 ?? null, max_rpm: s.max_rpm, interrupted: !!s.interrupted, tail: s.tail || null })),
    });
    const title = store.makeTitle(m.labels || [], rec.startedAt);
    const wheel = wheels.find(w => w.id === m.wheelId) || (c.wheels || []).find(w => w.id === m.wheelId);
    const env = { ua: navigator.userAgent };
    if(rec.simUsed) env.sim = true;
    const cal = cals.find(x => x.id === m.calId);
    if(cal) env.calibration_age_days = store.calAgeDays(cal);
    // SNAPSHOT the calibration model + wheel identity onto the run itself:
    // (a) archival correctness — the run keeps the exact reference it was
    // measured against even if the calibration is edited/archived later, and
    // (b) the SUBJECT can see the true charts (RLS keeps other people's
    // calibration/wheel ROWS owner-only, but this run is shared with them).
    if(cal) env.cal = { coef: cal.coef, location: cal.location, created_at: cal.created_at };
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
    const rec = cap.stop();
    recordingActive = false;
    if(!rec) return;
    stage = 'summary';
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    rec.markers = runMarkers;
    if(stack) stack.setReview();
    const m = draftMeta();
    m.startedAt = rec.startedAt;
    const box = host.querySelector('#rseSummary');
    box.innerHTML = `<div class="rs-card"><h2>Saving…</h2><p class="rs-note">Local JSON backup downloads first, then the database.</p></div>`;
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
          <span>${res.id ? '<b style="color:#0f8a52">DB ✓</b>' : '<b style="color:#c2415b">DB failed</b>'}</span>
        </div>
        <div id="rseSumLabels"></div>
        ${err ? `<div class="rs-warn">${err}</div>` : ''}
        <div class="rs-hash">SHA-256 (samples.csv): ${built.sha}<br><span style="color:#99a2a7">File hash — proof the exported data is unaltered.</span></div>
        <div class="rs-dl" id="rseDl">
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
    paintRuns();
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
    };
    // the merged marker stream (user markers + engine events) for the CSV
    const recForCsv = { ...rec, markers: built.merged, events: [], spins: rec.spins };
    if(which === 'samples') store.downloadText(base + '_samples.csv', built.samplesCsv);
    else if(which === 'markers') store.downloadText(base + '_markers.csv', store.buildMarkersCsv(recForCsv));
    else if(which === 'meta') store.downloadText(base + '_meta.csv', store.buildMetaCsv(rec, metaObj));
    else if(which === 'xlhu') store.downloadText(base + '_samples_excel-hu.csv', store.toExcelHu(built.samplesCsv));
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
      row.calibration_id ? supabase.from('research_calibrations').select('coef, location, created_at').eq('id', row.calibration_id).maybeSingle() : Promise.resolve({ data: null }),
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
          <span>wheel <b>${esc(wheel ? wheel.serial : '?')}</b></span>
          <span>calibration: <b>${cal ? esc((cal.location || 'room') + ' · ' + new Date(cal.created_at).toLocaleDateString('en-GB')) : 'factory model'}</b></span>
          <span>${row.temp_c != null ? row.temp_c + '°C' : '—'} · ${row.rh_pct != null ? row.rh_pct + '%' : '—'}</span>
          ${subject ? `<span>subject: ${avatarHtml(subject.avatar_url, subject.display_name)} <b>${esc(subject.display_name)}</b></span>` : ''}
          <span>${s.duration_s || 0}s · peak <b>${s.peak_rpm ?? '—'} rpm</b> · mean ${s.mean_rpm ?? '—'} rpm · ${s.revolutions ?? '—'} rev · ${s.coast_count || 0} coast${(s.coast_count || 0) === 1 ? '' : 's'}</span>
          ${isOwner ? '' : `<span>${(row.labels || []).map(l => '#' + esc(l)).join(' ')}</span>`}
        </div>
        ${isOwner ? '<div id="rsdLabels"></div>' : ''}
        ${row.notes ? `<p class="rs-note">${esc(row.notes)}</p>` : ''}
        <div id="rsdStackHost"></div>
        <div class="rs-hash">SHA-256 (samples.csv): ${esc(row.sha256 || '—')}</div>
        <div class="rs-dl" id="rsdDl">
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
    stack = createPanelStack(el.querySelector('#rsdStackHost'), {
      mode: 'review', coef,
      floor: store.noiseFloorNNm(factory ? null : coef),
      calNote: factory ? 'factory model' : 'room calibration ' + new Date(cal.created_at).toLocaleDateString('en-GB'),
      fileTag: runId.slice(0, 8),
    });
    stack.setData({ samples, markers, coasts });
    stack.setReview();

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
      };
      if(b.dataset.dl === 'samples') store.downloadText(base + '_samples.csv', store.buildSamplesCsv(rec));
      else if(b.dataset.dl === 'markers') store.downloadText(base + '_markers.csv', store.buildMarkersCsv(rec));
      else if(b.dataset.dl === 'meta') store.downloadText(base + '_meta.csv', store.buildMetaCsv(rec, metaObj));
      else if(b.dataset.dl === 'xlhu') store.downloadText(base + '_samples_excel-hu.csv', store.toExcelHu(store.buildSamplesCsv(rec)));
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
  return () => { if(stack) stack.destroy(); if(unsub) unsub(); };
}
