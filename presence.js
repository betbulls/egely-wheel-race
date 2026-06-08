// presence.js — app-level Live Presence.
// One shared Supabase Presence channel shows who is in the Egely Wheel ecosystem
// right now. Purely ephemeral: nothing is written to the database — when a client
// disconnects, Presence drops them automatically (that IS the privacy model).
//
// The local user is TRACKED (appears to others) only when logged in AND their
// "Show me on Live" profile toggle is on. Everyone — including anonymous and
// hidden users — can still SUBSCRIBE to watch the wall.
//
// Status is coarse and low-frequency (online / connected / measuring); live
// measurement values will ride on a separate broadcast in a later phase.
import { supabase } from './db.js';
import * as auth from './auth.js';
import * as ble from './ble.js';

const RANK = { online: 0, connected: 1, measuring: 2 };
const TICK_MS = 500;            // live-value broadcast cadence while measuring

let inited = false;
let channel = null;
let tracking = false;
let lastTrackedJson = null;          // guards against redundant / racing re-tracks
const myKey = 'tab-' + Math.random().toString(36).slice(2);   // stable per-tab presence key
let myStatus = 'online';            // 'online' | 'connected' | 'measuring'
const listeners = new Set();         // view-live subscribers: cb(list)

let bleConnected = false;
let measuring = false;
let lastLed = 0;
let tickTimer = null;
const liveValues = new Map();        // uid -> { led, ts } — newest live wheel value

// Track only once the PROFILE has loaded. Otherwise the first track would use the
// email-fallback name, and a second track milliseconds later (when the profile
// arrives) gets dropped by Realtime — leaving the wrong name on the wall. Waiting
// for the profile means a single, correctly-named track.
function visible(){
  const a = auth.getState();
  return !!(a.user && a.profile && a.showOnLive);
}

// Flatten presenceState() into one entry per user (highest-rank status wins,
// so multiple tabs of the same person collapse to their most active state).
function list(){
  if(!channel) return [];
  let state = {};
  try { state = channel.presenceState(); } catch { return []; }
  const byUid = new Map();
  for(const key in state){
    for(const e of state[key]){
      if(!e || !e.uid) continue;
      const cur = byUid.get(e.uid);
      if(!cur || (RANK[e.status] || 0) > (RANK[cur.status] || 0)) byUid.set(e.uid, e);
    }
  }
  return [...byUid.values()];
}

function emit(){ const l = list(); listeners.forEach(cb => { try { cb(l); } catch {} }); }

async function applyTrack(){
  if(!channel) return;
  if(visible()){
    const a = auth.getState();
    const payload = { uid: a.user.id, name: a.displayName || 'Explorer', avatar: a.avatarUrl || null, status: myStatus };
    const json = JSON.stringify(payload);
    if(json === lastTrackedJson) return;          // nothing changed — avoid a redundant track
    try { await channel.track(payload); tracking = true; lastTrackedJson = json; }
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
  // Re-render on ANY presence change — sync (full state) plus join/leave diffs —
  // so a new person showing up updates the wall live, without a refresh.
  channel.on('presence', { event: 'sync' }, emit);
  channel.on('presence', { event: 'join' }, emit);
  channel.on('presence', { event: 'leave' }, emit);
  // Live wheel values from people who are measuring (high-frequency, ephemeral).
  channel.on('broadcast', { event: 'live-tick' }, ({ payload }) => {
    if(!payload || !payload.uid) return;
    liveValues.set(payload.uid, { led: payload.led, ts: Date.now() });
  });
  channel.subscribe(async (status) => { if(status === 'SUBSCRIBED') await applyTrack(); });
}

// Call once at app startup.
export function init(){
  if(inited) return;
  inited = true;
  buildChannel();
  // The presence key is a stable per-tab id (people are deduped by the uid in the
  // payload, not by the key), so login/logout never needs a channel rebuild — we
  // just (re-)track or untrack. A re-track also refreshes the name once the profile
  // finishes loading (email-fallback → real display name).
  auth.subscribeAuth(() => applyTrack());
  // BLE drives the connected/online status; frames feed the live value.
  ble.subscribeStatus(s => { bleConnected = s.connected; refreshStatus(); });
  ble.subscribeFrames(f => { lastLed = f.led; });
}

// Effective status = measuring > connected > online.
function deriveStatus(){ return measuring ? 'measuring' : (bleConnected ? 'connected' : 'online'); }
function refreshStatus(){ const s = deriveStatus(); if(s !== myStatus){ myStatus = s; applyTrack(); } }

// Measurement views (solo / experiment) call this on start/stop. While measuring
// we also broadcast the live wheel value so others see the number move.
export function setMeasuring(on){
  on = !!on;
  if(on === measuring) return;
  measuring = on;
  refreshStatus();
  if(measuring) startTicks(); else stopTicks();
}

function startTicks(){
  if(tickTimer) return;
  tickTimer = setInterval(() => {
    const uid = auth.getState().user?.id;
    if(!measuring || !tracking || !uid || !channel) return;
    const led = ble.getState().lastFrame?.led ?? lastLed ?? 0;
    liveValues.set(uid, { led, ts: Date.now() });   // our own value (broadcast is self:false)
    try { channel.send({ type: 'broadcast', event: 'live-tick', payload: { uid, led } }); } catch {}
  }, TICK_MS);
}
function stopTicks(){ if(tickTimer){ clearInterval(tickTimer); tickTimer = null; } }

// Latest live wheel value for a user, or null if none / stale (>4s).
export function getLive(uid){
  const v = liveValues.get(uid);
  if(!v || Date.now() - v.ts > 4000) return null;
  return v.led;
}

// Subscribe to the live list. Fires immediately with the current list.
export function subscribe(cb){
  listeners.add(cb);
  cb(list());
  return () => listeners.delete(cb);
}

export function getList(){ return list(); }
