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
let presenceKey = null;
let myStatus = 'online';            // 'online' | 'connected' | 'measuring'
const listeners = new Set();         // view-live subscribers: cb(list)

function visible(){
  const a = auth.getState();
  return !!(a.user && a.showOnLive);
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
    try { await channel.track({ uid: a.user.id, name: a.displayName || 'Explorer', avatar: a.avatarUrl || null, status: myStatus }); tracking = true; }
    catch {}
  } else if(tracking){
    try { await channel.untrack(); } catch {}
    tracking = false;
  }
  emit();
}

function buildChannel(){
  const a = auth.getState();
  presenceKey = a.user ? a.user.id : ('anon-' + Math.random().toString(36).slice(2));
  channel = supabase.channel('live-presence', {
    config: { presence: { key: presenceKey }, broadcast: { self: false } },
  });
  channel.on('presence', { event: 'sync' }, emit);
  channel.subscribe(async (status) => { if(status === 'SUBSCRIBED') await applyTrack(); });
}

function onAuth(){
  const id = auth.getState().user?.id || null;
  const keyId = (presenceKey && !presenceKey.startsWith('anon-')) ? presenceKey : null;
  if(id !== keyId){
    // Identity changed (login/logout): the presence key is fixed at creation, so
    // rebuild the channel under the correct key.
    const old = channel;
    channel = null; tracking = false;
    if(old){ try { supabase.removeChannel(old); } catch {} }
    buildChannel();
  } else {
    applyTrack();   // same identity — maybe the visibility toggle changed
  }
}

// Call once at app startup.
export function init(){
  if(inited) return;
  inited = true;
  buildChannel();
  auth.subscribeAuth(onAuth);
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
