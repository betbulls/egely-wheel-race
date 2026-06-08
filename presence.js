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
const SERIES_MAX = 24;          // sparkline history length (~12s at 500ms)
const STALE_MS = 4000;          // a live value older than this is treated as gone

let inited = false;
let channel = null;
let tracking = false;
let lastTrackedJson = null;          // guards against redundant / racing re-tracks (excludes ts)
const myKey = 'tab-' + Math.random().toString(36).slice(2);   // stable per-tab presence key
let myStatus = 'online';            // 'online' | 'connected' | 'measuring' | 'session'
const listeners = new Set();         // view-live subscribers: cb(list)

let bleConnected = false;
let measuring = false;               // solo / experiment measurement running
let inSession = false;               // present in a group session room (with a wheel)
let lastLed = 0;
let tickTimer = null;
const liveValues = new Map();        // uid -> { led, ts } — newest live wheel value
const liveSeries = new Map();        // uid -> number[] — recent values for the sparkline

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
  return [...byUid.values()];
}

function emit(){ const l = list(); listeners.forEach(cb => { try { cb(l); } catch {} }); }

async function applyTrack(){
  if(!channel) return;
  if(visible()){
    const a = auth.getState();
    const base = { uid: a.user.id, name: a.displayName || 'Explorer', avatar: a.avatarUrl || null, status: myStatus };
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

function buildChannel(){
  channel = supabase.channel('live-presence', {
    config: { presence: { key: myKey }, broadcast: { self: false } },
  });
  // Re-render on ANY presence change — sync (full state) plus join/leave diffs.
  channel.on('presence', { event: 'sync' }, emit);
  channel.on('presence', { event: 'join' }, emit);
  channel.on('presence', { event: 'leave' }, emit);
  // Live wheel values from anyone with a connected wheel (high-frequency, ephemeral).
  channel.on('broadcast', { event: 'live-tick' }, ({ payload }) => {
    if(!payload || !payload.uid) return;
    recordLive(payload.uid, payload.led);
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
}

// Effective status. measuring/session imply a connected wheel.
function deriveStatus(){
  if(inSession) return 'session';
  if(measuring) return 'measuring';
  return bleConnected ? 'connected' : 'online';
}
function refreshStatus(){ const s = deriveStatus(); if(s !== myStatus){ myStatus = s; applyTrack(); } }

// Solo / experiment measurement start/stop.
export function setMeasuring(on){ on = !!on; if(on === measuring) return; measuring = on; refreshStatus(); }
// Present in a group session room (with a wheel).
export function setSession(on){ on = !!on; if(on === inSession) return; inSession = on; refreshStatus(); }

// Broadcast the live wheel value while connected (so others see it spin), and feed
// our own value locally (broadcast is self:false, so we don't receive our own).
function startTicks(){
  if(tickTimer) return;
  tickTimer = setInterval(() => {
    const uid = auth.getState().user?.id;
    if(!bleConnected || !tracking || !uid || !channel) return;
    const led = ble.getState().lastFrame?.led ?? lastLed ?? 0;
    recordLive(uid, led);
    try { channel.send({ type: 'broadcast', event: 'live-tick', payload: { uid, led } }); } catch {}
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
