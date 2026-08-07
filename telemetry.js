// telemetry.js — connection diagnostics (v1).
// Records the BLE lifecycle (connects, drops, reconnects, errors, battery
// flips) into public.ble_events through the log_ble_events RPC, so an admin
// can remote-diagnose a member's connection trouble from #/admin → Usage.
//
// PRINCIPLES:
//   - OBSERVER ONLY: subscribes to ble.js's PUBLIC status/frame feeds — the
//     connection engine itself is never touched (post-incident freeze).
//   - NEVER-BREAK: every entry point is wrapped; a telemetry failure is
//     silent and cannot affect the app.
//   - OFFLINE-SAFE: events queue in localStorage and flush later — the
//     moments we most need (connection failures) are exactly when an upload
//     is most likely to fail. A crashed/killed tab uploads on the next load.
//   - CHEAP: batched RPC inserts, no realtime, ~5-15 rows per active day.
import * as ble from './ble.js';
import * as auth from './auth.js';
import { supabase } from './db.js';

const QUEUE_KEY = 'ewr_diag_queue';
const QUEUE_CAP = 100;                 // oldest events drop first — diagnostics, not an archive
const FLUSH_DEBOUNCE_MS = 3000;
const pageSession = 's' + Math.random().toString(36).slice(2, 10);

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
  ((navigator.maxTouchPoints || 0) > 1 && /Mac/.test(navigator.platform || ''));

let queue = [];
let seq = 0;
let flushTimer = null;
let flushing = false;
let sentSessionCtx = false;

function readStored(){
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(q) ? q : [];
  } catch { return []; }
}
function loadQueue(){ queue = readStored().slice(-QUEUE_CAP); }
// Two open tabs share this key: merge by client id instead of overwriting, so
// one tab's write can never wipe the other's still-unsent events.
function saveQueue(){
  try {
    const mine = new Set(queue.map(e => e && e.cid));
    const merged = readStored().filter(e => e && e.cid && !mine.has(e.cid)).concat(queue);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(merged.slice(-QUEUE_CAP)));
  } catch {}
}

function route(){
  try { return ((location.hash || '').slice(1).split('/')[1] || 'home').slice(0, 24); } catch { return ''; }
}

// The raw Web Bluetooth error ble.js breadcrumbed for support — attach it to
// the failure event when it is fresh (same failure, not an old one).
function readBreadcrumb(){
  try {
    const b = JSON.parse(localStorage.getItem('ewr_ble_lastfail') || 'null');
    if(b && b.ts && Date.now() - b.ts < 120000) return { name: b.name || '', msg: b.msg || '', path: b.path || '' };
  } catch {}
  return null;
}

function ownerUid(){ try { return (auth.getState().user && auth.getState().user.id) || ''; } catch { return ''; } }

function push(event, detail){
  try {
    if(!sentSessionCtx){
      sentSessionCtx = true;
      queue.push({ cid: pageSession + '-' + (++seq), uid: ownerUid(), event: 'session_start',
        client_ts: new Date().toISOString(), page: pageSession, detail: {
          ua: (navigator.userAgent || '').slice(0, 300),
          screen: (typeof screen !== 'undefined' ? screen.width + 'x' + screen.height : ''),
          ios: IS_IOS, lang: navigator.language || '',
        } });
    }
    const d = Object.assign({}, detail || {});
    d.route = route();
    // cid = idempotency/tracking id; uid = who the event BELONGS to, so a
    // leftover queue never uploads under a different account later.
    queue.push({ cid: pageSession + '-' + (++seq), uid: ownerUid(), event,
      client_ts: new Date().toISOString(), page: pageSession, detail: d });
    if(queue.length > QUEUE_CAP) queue = queue.slice(-QUEUE_CAP);
    saveQueue();
    // Failures flush fast (the tab may not live long); routine events batch up.
    scheduleFlush(event === 'terminal_error' || event === 'connect_fail' ? 300 : FLUSH_DEBOUNCE_MS);
  } catch {}
}

function scheduleFlush(ms){
  if(flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flush(); }, ms);
}

// includeForeign: the delayed boot flush also uploads leftovers from earlier
// (possibly crashed) page-sessions; live flushes send only THIS tab's events,
// so two open tabs don't race to upload the same rows.
async function flush(includeForeign){
  if(flushing) return;
  let user = null;
  try { user = auth.getState().user; } catch {}
  if(!user) return;                    // measuring (and thus every event here) requires login anyway
  flushing = true;
  try {
    const stored = readStored();
    const batch = stored.filter(e => e && e.cid &&
      (includeForeign || e.page === pageSession) &&
      (!e.uid || e.uid === user.id)     // never upload another account's leftovers
    ).slice(0, 50);
    if(batch.length){
      const { error } = await supabase.rpc('log_ble_events', {
        p_events: batch.map(e => ({ event: e.event, client_ts: e.client_ts, page: e.page, detail: e.detail })),
      });
      if(!error){
        // Remove exactly what was sent (by cid) from a FRESH read, so events
        // pushed meanwhile — by this tab or another — are never lost.
        const sent = new Set(batch.map(e => e.cid));
        const remain = readStored().filter(e => !(e && sent.has(e.cid)));
        try { localStorage.setItem(QUEUE_KEY, JSON.stringify(remain.slice(-QUEUE_CAP))); } catch {}
        queue = queue.filter(e => !sent.has(e.cid));
        if(remain.some(e => e && e.page === pageSession)) scheduleFlush(500);
      }
    }
  } catch {}
  flushing = false;
}

export function init(){
  try {
    loadQueue();
    let prev = ble.getState();
    let connectedAt = 0, dropAt = 0, wheelInfoSent = false, lastBatt = '';

    ble.subscribeStatus(s => {
      try {
        const p = prev; prev = s;
        if(p.status === s.status) return;
        if(s.status === 'connecting'){
          push('connect_start', {});
        } else if(s.status === 'connected'){
          const now = Date.now();
          if(p.status === 'reconnecting') push('reconnected', { afterMs: dropAt ? now - dropAt : null, device: s.deviceName || '' });
          else push('connected', { device: s.deviceName || '' });
          connectedAt = now; wheelInfoSent = false;
        } else if(s.status === 'reconnecting'){
          // Only the connected→reconnecting edge is a PHYSICAL drop. ble.js
          // also re-enters 'reconnecting' from idle (focus/online retriggers of
          // an old drop) — logging those as drops inflated counts and could
          // fake the "screen was locked" pattern in the admin diagnosis.
          if(p.status === 'connected'){
            dropAt = Date.now();
            push('link_drop', {
              aliveMs: connectedAt ? Date.now() - connectedAt : null,
              visible: (typeof document !== 'undefined' ? document.visibilityState : ''),
              battery: lastBatt || null,
            });
            connectedAt = 0;
          } else {
            if(!dropAt) dropAt = Date.now();
            push('reconnect_retry', { visible: (typeof document !== 'undefined' ? document.visibilityState : '') });
          }
        } else if(s.status === 'error'){
          push(p.status === 'connecting' ? 'connect_fail' : 'terminal_error',
            { friendly: s.errorMsg || '', raw: readBreadcrumb() });
        } else if(s.status === 'idle'){
          if(p.status === 'reconnecting') push(s.manualStop ? 'reconnect_stopped' : 'reconnect_giveup', {});
          else if(p.status === 'connecting') push('picker_cancel', {});
          else if(p.status === 'connected'){ push('manual_disconnect', {}); connectedAt = 0; }
        }
      } catch {}
    });

    // Battery flips need hysteresis (frames arrive ~14/s and a cell at the
    // threshold flickers) and a per-session cap — a flapping battery must not
    // grind localStorage or flood the log.
    let battStreak = 0, battEvents = 0;
    ble.subscribeFrames(f => {
      try {
        if(!wheelInfoSent){
          wheelInfoSent = true;
          push('wheel_info', { hw: f.hw || '', fw: f.fw || '', battery: f.battery || '' });
        }
        const b = f.battery || '';
        if(!b) return;
        if(!lastBatt){ lastBatt = b; return; }
        if(b === lastBatt){ battStreak = 0; return; }
        if(++battStreak >= 3){
          battStreak = 0; lastBatt = b;
          if(battEvents < 6){ battEvents++; push(b === 'LOW' ? 'battery_low' : 'battery_ok', {}); }
        }
      } catch {}
    });

    if(typeof window !== 'undefined') window.addEventListener('online', () => scheduleFlush(1000));
    // Delayed, jittered boot flush of leftovers from previous (possibly
    // crashed) sessions — the jitter keeps two simultaneously opening tabs
    // from double-uploading the same backlog.
    setTimeout(() => { try { flush(true); } catch {} }, 4000 + Math.floor(Math.random() * 4000));
  } catch {}
}
