// presence.js — app-level Live Presence.
// One shared Supabase Presence channel shows who is in the Egely Wheel ecosystem
// right now. Purely ephemeral: nothing is written to the database — when a client
// disconnects, Presence drops them automatically (that IS the privacy model).
//
// The local user is TRACKED (appears to others) only when logged in AND their
// "Show me on Live" profile toggle is on. Everyone — including anonymous and
// hidden users — can still SUBSCRIBE to watch the wall.
//
// Status (online / connected / measuring / session) rides on presence; the live
// wheel value rides on a high-frequency broadcast and is shown WHENEVER the wheel
// is connected — so others see it spin even with no formal measurement running.
import { supabase } from './db.js';
import * as auth from './auth.js';
import * as ble from './ble.js';

const TICK_MS = 500;            // live-value broadcast cadence while the wheel is connected
const BEAT_MS = 2500;           // status heartbeat cadence (covers online users + flaky presence)
const SERIES_MAX = 120;         // live-curve history (~60s at 500ms, like the solo preview)
const STALE_MS = 4000;          // a live value older than this is treated as gone
const STATUS_STALE_MS = 7000;   // a broadcast status older than this falls back to presence
const REFRESH_MS = 30000;       // periodically rebuild the presence channel from scratch. A
                                // long-lived socket's presenceState() can keep stale "ghosts"
                                // (users who left) until a fresh subscribe — this is that
                                // refresh, without a page reload. It only re-reads the TRUE
                                // server state, so it never drops a genuinely-present user.

let inited = false;
let channel = null;
let rebuilding = false;              // true while we tear down + re-subscribe the channel
let tracking = false;
let lastTrackedJson = null;          // guards against redundant / racing re-tracks (excludes ts)
const myKey = 'tab-' + Math.random().toString(36).slice(2);   // stable per-tab presence key
let myStatus = 'online';            // 'online' | 'connected' | 'measuring' | 'session'
const listeners = new Set();         // view-live subscribers: cb(list)

let bleConnected = false;
let activity = null;                 // null | 'solo' | 'experiment' | 'session'
let lastLed = 0;
let tickTimer = null;
const liveValues = new Map();        // uid -> { led, ts } — newest live wheel value
const liveSeries = new Map();        // uid -> number[] — recent values for the sparkline
const liveStatus = new Map();        // uid -> { status, ts } — status via broadcast (reliable when presence updates aren't)

function visible(){
  const a = auth.getState();
  return !!(a.user && a.profile && a.showOnLive);
}

function recordLive(uid, led){
  liveValues.set(uid, { led, ts: Date.now() });
  let arr = liveSeries.get(uid);
  if(!arr){ arr = []; liveSeries.set(uid, arr); }
  arr.push(led);
  if(arr.length > SERIES_MAX) arr.shift();
}

// Flatten presenceState() into one entry per user. The NEWEST entry wins (by ts),
// so a stale higher-status entry can never "stick" after the user changes state.
function list(){
  if(!channel) return [];
  let state = {};
  try { state = channel.presenceState(); } catch { return []; }
  const byUid = new Map();
  for(const key in state){
    for(const e of state[key]){
      if(!e || !e.uid) continue;
      const cur = byUid.get(e.uid);
      if(!cur || (e.ts || 0) > (cur.ts || 0)) byUid.set(e.uid, e);
    }
  }
  // Overlay the broadcast status (reliable on flaky networks) over the presence
  // status, which doesn't always propagate on re-tracks.
  return [...byUid.values()].map(e => {
    const ls = liveStatusOf(e.uid);
    return ls ? { ...e, status: ls } : e;
  });
}

function liveStatusOf(uid){
  const v = liveStatus.get(uid);
  if(!v || Date.now() - v.ts > STATUS_STALE_MS) return null;
  return v.status;
}

// Record a broadcast status; re-render the wall if it actually changed.
function noteStatus(uid, status){
  const prev = liveStatus.get(uid);
  liveStatus.set(uid, { status, ts: Date.now() });
  if(!prev || prev.status !== status) emit();
}

// Broadcast my current status (heartbeat + on every change) — the reliable path.
function beat(){
  const uid = auth.getState().user?.id;
  if(!tracking || !uid || !channel) return;
  liveStatus.set(uid, { status: myStatus, ts: Date.now() });   // keep own fresh (broadcast is self:false)
  try { channel.send({ type: 'broadcast', event: 'live-beat', payload: { uid, status: myStatus } }); } catch {}
}

const sig = l => l.map(p => p.uid + ':' + p.status).sort().join('|');
let lastSig = '';
function emit(){ if(rebuilding) return; const l = list(); lastSig = sig(l); listeners.forEach(cb => { try { cb(l); } catch {} }); }

async function applyTrack(){
  if(!channel) return;
  if(visible()){
    const a = auth.getState();
    const base = { uid: a.user.id, name: a.displayName || 'Explorer', avatar: a.avatarUrl || null, status: myStatus, country: a.country || null };
    const json = JSON.stringify(base);                 // ts excluded so identical states don't re-track
    if(json === lastTrackedJson) return;
    try { await channel.track({ ...base, ts: Date.now() }); tracking = true; lastTrackedJson = json; }
    catch {}
  } else if(tracking){
    try { await channel.untrack(); } catch {}
    tracking = false; lastTrackedJson = null;
  }
  emit();
}

// The first presence sync after a (re)subscribe carries the full, fresh server state — use
// it to END a rebuild window and repaint (any ghosts from the old socket are now gone).
function onSync(){ rebuilding = false; emit(); }

// Periodically rebuild the channel from scratch. Supabase presence 'leave' diffs are
// unreliable on a long-lived socket, so users who left can linger in presenceState() until
// a fresh subscribe (the "bots still online after they left, gone on refresh" bug). We AWAIT
// the teardown before re-creating — a clean rejoin, never the racy same-topic churn — and
// HOLD the last render until the new sync arrives (emit is gated on `rebuilding`), so there
// is no empty flicker. This never filters a present user; it just re-reads the true state.
async function refreshChannel(){
  if(rebuilding || !channel) return;
  rebuilding = true;
  setTimeout(() => { if(rebuilding){ rebuilding = false; emit(); } }, 6000);   // failsafe unfreeze
  const old = channel;
  channel = null;
  lastTrackedJson = null; tracking = false;            // force a fresh re-track on the new channel
  try { await supabase.removeChannel(old); } catch {}
  buildChannel();                                       // subscribes; its first onSync clears `rebuilding`
}

function buildChannel(){
  channel = supabase.channel('live-presence', {
    config: { presence: { key: myKey }, broadcast: { self: false } },
  });
  // Re-render on ANY presence change — sync (full state, also ends a rebuild) plus diffs.
  channel.on('presence', { event: 'sync' }, onSync);
  channel.on('presence', { event: 'join' }, emit);
  channel.on('presence', { event: 'leave' }, emit);
  // Live wheel values from anyone with a connected wheel (high-frequency, ephemeral).
  channel.on('broadcast', { event: 'live-tick' }, ({ payload }) => {
    if(!payload || !payload.uid) return;
    recordLive(payload.uid, payload.led);
    if(payload.status) noteStatus(payload.uid, payload.status);
  });
  // Status heartbeat — the reliable status channel (presence re-tracks can be missed).
  channel.on('broadcast', { event: 'live-beat' }, ({ payload }) => {
    if(!payload || !payload.uid || !payload.status) return;
    noteStatus(payload.uid, payload.status);
  });
  channel.subscribe(async (status) => { if(status === 'SUBSCRIBED') await applyTrack(); });
}

// Call once at app startup.
export function init(){
  if(inited) return;
  inited = true;
  buildChannel();
  // Stable per-tab key + uid-in-payload dedup means login/logout never needs a
  // channel rebuild — we just (re-)track or untrack. A re-track also refreshes the
  // name once the profile loads (email-fallback → real display name).
  auth.subscribeAuth(() => applyTrack());
  // BLE drives status + the live value, and gates the broadcast.
  ble.subscribeStatus(s => {
    bleConnected = s.connected;
    refreshStatus();
    if(bleConnected) startTicks(); else stopTicks();
  });
  ble.subscribeFrames(f => { lastLed = f.led; });

  // Safety net: presence diff events (sync/join/leave) can be missed on flaky
  // networks or when a mobile tab backgrounds. Re-read the synced state on a timer
  // and re-render only when it actually changed — so connect/disconnect/leave shows
  // up without a manual page refresh.
  setInterval(() => {
    if(rebuilding) return;
    const l = list();
    const s = sig(l);
    if(s !== lastSig){ lastSig = s; listeners.forEach(cb => { try { cb(l); } catch {} }); }
  }, 1500);
  // Status heartbeat — broadcast my status periodically so others stay in sync even
  // when presence re-tracks don't propagate (the curve/value broadcast is reliable).
  setInterval(beat, BEAT_MS);
  // Shed stale presence ghosts from the long-lived socket (see refreshChannel).
  setInterval(refreshChannel, REFRESH_MS);
  // Returning to the tab: re-assert our presence and refresh the wall immediately.
  if(typeof document !== 'undefined'){
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible'){ applyTrack(); emit(); }
    });
  }
}

// Effective status. An activity (solo/experiment/session) implies a connected wheel.
function deriveStatus(){
  if(activity === 'race') return 'race';
  if(activity === 'session') return 'session';
  if(activity === 'experiment') return 'experiment';
  if(activity === 'solo') return 'measuring';
  return bleConnected ? 'connected' : 'online';
}
function refreshStatus(){ const s = deriveStatus(); if(s !== myStatus){ myStatus = s; applyTrack(); beat(); } }

// Activity hooks called by the measurement views. Only one activity at a time.
function setActivity(kind, on){
  const next = on ? kind : (activity === kind ? null : activity);
  if(next === activity) return;
  activity = next;
  refreshStatus();
}
export function setMeasuring(on){ setActivity('solo', on); }        // solo measurement
export function setExperiment(on){ setActivity('experiment', on); } // structured experiment
export function setSession(on){ setActivity('session', on); }       // group session room
export function setRace(on){ setActivity('race', on); }             // race room (lobby + live)

// Broadcast the live wheel value while connected (so others see it spin), and feed
// our own value locally (broadcast is self:false, so we don't receive our own).
function startTicks(){
  if(tickTimer) return;
  tickTimer = setInterval(() => {
    const uid = auth.getState().user?.id;
    if(!bleConnected || !tracking || !uid || !channel) return;
    const led = ble.getState().lastFrame?.led ?? lastLed ?? 0;
    recordLive(uid, led);
    liveStatus.set(uid, { status: myStatus, ts: Date.now() });
    try { channel.send({ type: 'broadcast', event: 'live-tick', payload: { uid, led, status: myStatus } }); } catch {}
  }, TICK_MS);
}
function stopTicks(){
  if(tickTimer){ clearInterval(tickTimer); tickTimer = null; }
  const uid = auth.getState().user?.id;
  if(uid){ liveValues.delete(uid); liveSeries.delete(uid); }   // clear our own value immediately
}

// Latest live wheel value for a user, or null if none / stale.
export function getLive(uid){
  const v = liveValues.get(uid);
  if(!v || Date.now() - v.ts > STALE_MS) return null;
  return v.led;
}
// Recent values for the sparkline (empty if stale / unknown).
export function getLiveSeries(uid){
  if(getLive(uid) == null) return [];
  return liveSeries.get(uid) || [];
}

// Subscribe to the live list. Fires immediately with the current list.
export function subscribe(cb){
  listeners.add(cb);
  cb(list());
  return () => listeners.delete(cb);
}

export function getList(){ return list(); }
