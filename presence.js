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

const RANK = { online: 0, connected: 1, measuring: 2 };

let inited = false;
let channel = null;
let tracking = false;
let lastTrackedJson = null;          // guards against redundant / racing re-tracks
const myKey = 'tab-' + Math.random().toString(36).slice(2);   // stable per-tab presence key
let myStatus = 'online';            // 'online' | 'connected' | 'measuring'
const listeners = new Set();         // view-live subscribers: cb(list)

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
}

// Coarse status setter (used by BLE + measurement hooks in later phases).
export function setStatus(status){
  if(status === myStatus) return;
  myStatus = status;
  applyTrack();
}

// Subscribe to the live list. Fires immediately with the current list.
export function subscribe(cb){
  listeners.add(cb);
  cb(list());
  return () => listeners.delete(cb);
}

export function getList(){ return list(); }
