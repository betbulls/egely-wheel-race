// view-race.js — the Race room (#/race/:id, and #/join/<token> for race invites).
//
// PHASE 4 = the LOBBY only: a premium, real-time waiting room. People gather,
// connect their wheel and practise together while a countdown runs. NOTHING is
// scored, saved, broadcast to measurements/results, or ranked here — the live
// "currentValue" is ephemeral lobby feedback only.
//
// The official race engine (3-2-1 start, lanes, cumulative scoring, result
// saving) is PHASE 5 — see the "PHASE 5 HOOK" marker in updateStage().
//
// This is a separate module from view-room.js on purpose: the live session room
// stays untouched (zero regression), and the race experience can grow its own
// character. The access gate below is ported verbatim from the session room and
// runs BEFORE any presence-channel join, so an unauthorized visitor never shows
// up as a participant.
import { supabase } from './db.js';
import * as ble from './ble.js';
import * as auth from './auth.js';
import { flagUrl } from './countries.js';
import { createAddToCalendar } from './calendar.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

async function copyText(text){
  try { await navigator.clipboard.writeText(text); return true; }
  catch(e){
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      return ok;
    } catch(e2){ return false; }
  }
}

function flagImg(cc){
  if(!cc || !/^[A-Za-z]{2}$/.test(cc)) return '';
  const u = cc.toUpperCase();
  return `<img src="${flagUrl(cc)}" alt="${u}" title="${u}" loading="lazy" style="width:18px;height:13px;border-radius:3px;object-fit:cover;flex-shrink:0;box-shadow:0 0 0 1px rgba(1,22,36,.08)">`;
}

// Adaptive "starts in" — readable at any distance (mirrors the session views).
function formatUntil(ms){
  if(ms <= 0) return 'now';
  const sec = Math.floor(ms / 1000);
  const mins = Math.floor(sec / 60), hours = Math.floor(sec / 3600), days = Math.floor(sec / 86400);
  if(days >= 60) return `${Math.floor(days / 30)} months`;
  if(days >= 14) return `${Math.floor(days / 7)} weeks`;
  if(days >= 1) return `${days} ${days === 1 ? 'day' : 'days'}`;
  if(hours >= 1) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  if(mins >= 1) return `${mins} min`;
  return `${sec}s`;
}
// Precise MM:SS / H:MM:SS for the final stretch + live duration.
function fmt(ms){
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

const racerId = name => name.trim().toLowerCase().replace(/\s+/g, '_');

function injectRaceStyles(){
  if(document.getElementById('raceLobbyStyles')) return;
  const st = document.createElement('style');
  st.id = 'raceLobbyStyles';
  st.textContent = `
  .rl-wrap{max-width:760px;margin:0 auto;padding:6px 0}
  .rl-head{margin-bottom:16px}
  .rl-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.12em;
    text-transform:uppercase;color:#5230da;background:rgba(82,48,218,.09);border-radius:999px;padding:5px 11px}
  .rl-eyebrow .rl-dot{width:7px;height:7px;border-radius:50%;background:#5230da}
  .rl-title{font-family:'Montserrat',sans-serif;font-weight:600;font-size:27px;color:#011624;letter-spacing:-0.3px;margin:10px 0 4px}
  .rl-host{display:flex;align-items:center;gap:8px;color:#67737c;font-size:14px;margin:6px 0 2px}
  .rl-host .sess-avatar,.rl-av{width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0}
  .rl-av-init{display:inline-flex;align-items:center;justify-content:center;background:#eef0f2;color:#5a6571;font-weight:700;font-size:12px}
  .rl-meta{color:#67737c;font-size:13.5px;margin-top:4px}
  .rl-badges{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;align-items:center}
  .rl-badge{font-size:11px;font-weight:700;letter-spacing:.03em;border-radius:999px;padding:3px 9px}
  .rl-badge.invite{color:#5230da;background:rgba(82,48,218,.1)}
  .rl-badge.followers{color:#0e7490;background:rgba(14,116,144,.1)}
  .rl-badge.verified{color:#0f8a52;background:rgba(32,178,107,.12)}
  .rl-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}
  .rl-btn{display:inline-flex;align-items:center;gap:7px;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;
    padding:8px 14px;border-radius:999px;border:1px solid #dfe3e6;background:#fff;color:#011624;cursor:pointer;transition:border-color .15s,color .15s,background .15s}
  .rl-btn:hover{border-color:#5230da;color:#5230da}
  /* stage: practice banner + countdown (swaps with phase) */
  .rl-stage{margin:18px 0 14px}
  .rl-practice{background:rgba(14,116,144,.08);border:1px solid rgba(14,116,144,.22);border-radius:14px;padding:14px 16px}
  .rl-practice b{color:#0e7490;display:block;font-size:14px;margin-bottom:3px}
  .rl-practice span{color:#3c5a66;font-size:13px;line-height:1.45}
  .rl-cd{display:flex;align-items:baseline;gap:10px;margin-top:13px}
  .rl-cd-lbl{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#99a2a7;font-weight:700}
  .rl-cd-val{font-family:'Montserrat',sans-serif;font-weight:600;font-size:26px;color:#011624}
  .rl-cd.soon .rl-cd-val{color:#5230da}
  .rl-cd.soon{animation:rlSoon 1s ease-in-out infinite}
  @keyframes rlSoon{0%,100%{opacity:1}50%{opacity:.62}}
  .rl-prep{background:#011624;border-radius:16px;padding:22px 20px;text-align:center;box-shadow:0 14px 36px -16px rgba(1,22,36,.5)}
  .rl-prep b{display:block;font-family:'Montserrat',sans-serif;font-weight:600;font-size:20px;color:#fff;margin-bottom:5px}
  .rl-prep span{color:#aeb9c2;font-size:13.5px}
  .rl-prep .rl-prep-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#37dbff;margin-right:7px;animation:rlSoon 1.1s ease-in-out infinite}
  .rl-321{font-family:'Montserrat',sans-serif;font-weight:700;font-size:46px;color:#5230da;text-align:center;margin-top:6px;animation:rlPop .9s ease-out}
  @keyframes rlPop{from{transform:scale(.7);opacity:.2}to{transform:scale(1);opacity:1}}
  .rl-finished{background:#f7f8f8;border:1px solid #dfe3e6;border-radius:16px;padding:22px 20px;text-align:center}
  .rl-finished b{display:block;font-family:'Montserrat',sans-serif;font-weight:600;font-size:19px;color:#011624;margin-bottom:5px}
  .rl-finished span{color:#67737c;font-size:13.5px}
  /* people */
  .rl-people-head{display:flex;align-items:center;justify-content:space-between;margin:8px 0 10px}
  .rl-people-title{font-family:'Montserrat',sans-serif;font-weight:600;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#67737c}
  .rl-count{font-size:13px;color:#99a2a7;font-weight:600}
  .rl-list{display:flex;flex-direction:column;gap:9px}
  .rl-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;
    background:#fff;border:1px solid #dfe3e6;border-radius:14px;padding:11px 14px;box-shadow:0 8px 22px rgba(1,22,36,.05)}
  .rl-row.me{border-color:rgba(82,48,218,.4);box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .rl-row .rl-av{width:38px;height:38px}
  .rl-mid{min-width:0}
  .rl-name-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  .rl-name{font-weight:700;color:#011624;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
  .rl-tag{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;padding:2px 7px}
  .rl-tag.host{color:#9a7400;background:rgba(245,183,0,.16)}
  .rl-tag.you{color:#5230da;background:rgba(82,48,218,.1)}
  .rl-track{height:8px;border-radius:999px;background:#eef0f2;margin-top:9px;position:relative;overflow:hidden}
  .rl-pulse{position:absolute;top:0;left:0;height:100%;width:34%;border-radius:999px;
    background:linear-gradient(90deg,rgba(55,219,255,0),rgba(55,219,255,.55),rgba(55,219,255,0));display:none}
  .rl-row.practicing .rl-pulse{display:block;animation:rlSlide 1.6s linear infinite}
  @keyframes rlSlide{0%{transform:translateX(-120%)}100%{transform:translateX(330%)}}
  .rl-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
  .rl-pill{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:3px 9px;
    display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
  .rl-pill.lobby{color:#67737c;background:#f2f3f4}
  .rl-pill.ready{color:#0f8a52;background:rgba(32,178,107,.13)}
  .rl-pill.practicing{color:#0e7490;background:rgba(14,116,144,.13)}
  .rl-pill.reconnecting{color:#8a6d00;background:rgba(245,183,0,.14)}
  .rl-pill .d{width:6px;height:6px;border-radius:50%;background:currentColor}
  .rl-pill.practicing .d,.rl-pill.reconnecting .d{animation:rlSoon 1.2s ease-in-out infinite}
  .rl-live{font-family:'Montserrat',sans-serif;font-weight:600;font-size:18px;line-height:1}
  .rl-empty{color:#99a2a7;font-size:14px;padding:14px 2px}
  .rl-locked{background:#fff;border:1px solid #dfe3e6;border-radius:16px;padding:22px 20px;margin-top:8px}
  .rl-locked h2{font-family:'Montserrat',sans-serif;font-weight:600;font-size:20px;color:#011624;margin:0 0 6px}
  .rl-locked p{color:#67737c;font-size:14px;line-height:1.5;margin:0 0 16px}
  .rl-gate{display:flex;flex-direction:column;gap:12px;background:#fff;border:1px solid #dfe3e6;border-radius:16px;padding:18px}
  .rl-gate input{width:100%;box-sizing:border-box;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:10px;
    font-family:'Inter',sans-serif;font-size:15px;padding:11px 13px;color:#011624}
  .rl-gate input:focus{outline:none;border-color:#5230da;background:#fff;box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .rl-join{align-self:flex-start;font-family:'Inter',sans-serif;font-weight:700;font-size:14px;padding:10px 20px;border-radius:999px;
    background:#401d91;color:#fff;border:none;cursor:pointer}
  .rl-join:hover{background:#011624}
  @media (max-width:600px){
    .rl-title{font-size:23px}
    .rl-row{grid-template-columns:auto 1fr;gap:10px 12px}
    .rl-right{grid-column:1 / -1;flex-direction:row;align-items:center;justify-content:space-between;width:100%}
  }`;
  document.head.appendChild(st);
}

export function mount(el, raceId, inviteToken = null){
  injectRaceStyles();
  let session = null, startMs = 0, endMs = 0, durationMs = 0, hostAvatar = null;
  let myName = (auth.getState().displayName || localStorage.getItem('ewr_name') || '').trim();
  let channel = null;
  let bleConnected = false, myLed = 0;
  let lobbyBuilt = false, lastStagePhase = null, last321 = null;
  let broadcastTimer = null, liveTimer = null, countdownTimer = null;
  let unsubFrames = null, unsubStatus = null;

  // roster: name -> { name, uid, avatar, country, host, wheel }
  const roster = new Map();
  // ephemeral live values (NEVER persisted): name -> { led, ts }
  const live = new Map();
  const LIVE_STALE_MS = 4000, BROADCAST_MS = 500;

  const zText = led => led < 6 ? '#c2415b' : led < 13 ? '#b8860b' : '#0f8a52';
  const isHostName = name => session && name && name.trim().toLowerCase() === (session.created_by || '').trim().toLowerCase();
  const phase = () => { const n = Date.now(); return n < startMs ? 'pre' : n <= endMs ? 'active' : 'post'; };

  el.innerHTML = `<div class="rl-wrap"><div class="rl-head" id="rlHead"><div class="rl-title">Loading…</div></div><div id="rlBody"></div></div>`;
  const $ = id => el.querySelector('#' + id);

  // ---- Load + access gate ----------------------------------------------------
  (async () => {
    const baseQ = supabase.from('sessions').select('*');
    const { data, error } = await (raceId ? baseQ.eq('id', raceId) : baseQ.eq('invite_token', inviteToken)).maybeSingle();
    if(error || !data){
      $('rlHead').innerHTML = `<div class="rl-title">${(inviteToken && !raceId) ? 'Invite link not valid' : 'Race not found'}</div>
        <p class="rl-meta"><a href="#/my-races" class="link">Back to races</a></p>`;
      return;
    }
    session = data; raceId = data.id;
    // If this row isn't actually a race, hand off to the normal session room.
    if(session.event_type !== 'race'){ location.hash = '#/room/' + raceId; return; }
    startMs = new Date(session.scheduled_start).getTime();
    durationMs = (session.duration_minutes || 0) * 60000;
    endMs = startMs + durationMs;

    // Access gate (ported from the session room) — BEFORE any channel join.
    const accessMode = session.access_mode || 'public';
    const meId = auth.getState().user?.id || null;
    const isHostUser = !!(meId && session.created_by_user_id && meId === session.created_by_user_id);
    let accessOk = accessMode === 'public' || isHostUser;
    if(!accessOk && accessMode === 'invite'){
      accessOk = !!(inviteToken && session.invite_token && inviteToken === session.invite_token);
    }
    if(!accessOk && accessMode === 'followers'){
      accessOk = !!(meId && await auth.isConnectedTo(session.created_by_user_id));
    }
    if(!accessOk){ renderLocked(accessMode); return; }

    if(session.created_by_user_id){
      const { data: hp } = await supabase.from('profiles').select('avatar_url').eq('id', session.created_by_user_id).maybeSingle();
      if(hp) hostAvatar = hp.avatar_url || null;
    }
    renderHead();
    enter();
  })();

  function avatarHtml(url, name, cls){
    if(url) return `<img class="rl-av ${cls || ''}" src="${esc(url)}" alt="">`;
    return `<span class="rl-av rl-av-init ${cls || ''}">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
  }

  function renderHead(){
    const when = new Date(session.scheduled_start).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const mode = session.access_mode || 'public';
    const accessBadge = mode === 'invite' ? '<span class="rl-badge invite">Invite link</span>'
      : mode === 'followers' ? '<span class="rl-badge followers">Followers only</span>' : '';
    const verifiedBadge = session.verified_only ? '<span class="rl-badge verified">✓ Verified race</span>' : '';
    $('rlHead').innerHTML = `
      <span class="rl-eyebrow"><span class="rl-dot"></span> Race</span>
      <div class="rl-title">${esc(session.name || 'Race')}</div>
      <div class="rl-host">${avatarHtml(hostAvatar, session.created_by)}<span>Hosted by <b style="color:#011624">${esc(session.created_by || 'unknown')}</b></span></div>
      <div class="rl-meta">${esc(when)} · ${session.duration_minutes} min</div>
      <div class="rl-badges">${accessBadge}${verifiedBadge}</div>
      <div class="rl-actions" id="rlActions"></div>`;
    const actions = $('rlActions');
    if(phase() === 'pre') actions.appendChild(createAddToCalendar({ ...session, _hostName: session.created_by }));
    actions.appendChild(shareButton());
    if(mode === 'invite' && session.invite_token){
      const meId = auth.getState().user?.id || null;
      if(meId && meId === session.created_by_user_id){
        actions.appendChild(copyButton('Copy invite link', location.origin + location.pathname + '#/join/' + session.invite_token));
      }
    }
  }

  function shareButton(){
    const url = location.origin + location.pathname + '#/race/' + raceId;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rl-btn';
    b.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg><span>${navigator.share ? 'Share' : 'Copy link'}</span>`;
    const label = b.querySelector('span');
    b.addEventListener('click', async () => {
      if(navigator.share){ try { await navigator.share({ title: (session.name || 'EWR Live race') + ' — EWR Live', url }); } catch {} return; }
      const ok = await copyText(url);
      const orig = label.textContent; label.textContent = ok ? 'Copied' : 'Copy failed';
      setTimeout(() => { label.textContent = orig; }, 1700);
    });
    return b;
  }

  function copyButton(label, text){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rl-btn'; b.textContent = label;
    b.addEventListener('click', async () => {
      const orig = b.textContent; const ok = await copyText(text);
      b.textContent = ok ? 'Copied ✓' : 'Copy failed';
      setTimeout(() => { b.textContent = orig; }, 1700);
    });
    return b;
  }

  function renderLocked(mode){
    const host = session.created_by || 'the host';
    const loggedIn = !!auth.getState().user;
    let title, body, cta = '';
    if(mode === 'invite'){
      title = 'Invite link required';
      body = `This race is visible, but you need ${esc(host)}'s invite link to enter.`;
    } else {
      title = 'Followers only';
      if(!loggedIn){
        body = `This race is for ${esc(host)}'s connected members. Log in to join.`;
        cta = `<a class="rl-join" href="#/login">Log in</a>`;
        try { localStorage.setItem('ewr_pending_room', location.hash); } catch {}
      } else {
        body = `This race is for ${esc(host)}'s connected members.`;
      }
    }
    $('rlBody').innerHTML = `<div class="rl-locked"><h2>${title}</h2><p>${body}</p>
      <div class="rl-actions">${cta}<a class="link" href="#/my-races">Back to races</a></div></div>`;
  }

  // ---- Name gate (anonymous viewers can still gather in the lobby) -----------
  function enter(){
    if(myName){ showLobby(); return; }
    $('rlBody').innerHTML = `<div class="rl-gate">
      <label for="rlName" style="font-weight:700;color:#011624">Your name</label>
      <input type="text" id="rlName" maxlength="60" placeholder="Your name">
      <button type="button" class="rl-join" id="rlJoin">Join the lobby</button></div>`;
    const input = $('rlName'); input.focus();
    $('rlJoin').addEventListener('click', () => {
      const v = input.value.trim();
      if(!v) return;
      myName = v; try { localStorage.setItem('ewr_name', v); } catch {}
      showLobby();
    });
  }

  // ---- Lobby -----------------------------------------------------------------
  function showLobby(){
    lobbyBuilt = true;
    $('rlBody').innerHTML = `
      <div class="rl-stage" id="rlStage"></div>
      <div class="rl-people-head">
        <span class="rl-people-title">In the lobby</span>
        <span class="rl-count" id="rlCount">0 here</span>
      </div>
      <div class="rl-list" id="rlList"><div class="rl-empty">Waiting for racers to arrive…</div></div>`;

    joinChannel();
    unsubStatus = ble.subscribeStatus(s => { bleConnected = s.connected; trackPresence(); });
    unsubFrames = ble.subscribeFrames(f => { myLed = f.led; });   // ephemeral; never persisted

    // Throttled live broadcast — one message per BROADCAST_MS, not per BLE frame.
    broadcastTimer = setInterval(() => {
      if(!bleConnected || !channel) return;
      const now = Date.now();
      live.set(myName, { led: myLed, ts: now });   // self (broadcast is self:false)
      channel.send({ type: 'broadcast', event: 'lobby-tick',
        payload: { name: myName, led: myLed, country: auth.getState().country || null, avatar: auth.getState().avatarUrl || null } });
    }, BROADCAST_MS);

    liveTimer = setInterval(paintLive, 400);
    countdownTimer = setInterval(updateStage, 1000);
    updateStage();
  }

  function joinChannel(){
    channel = supabase.channel('room-' + raceId, {
      config: { broadcast: { self: false }, presence: { key: racerId(myName) } },
    });
    channel.on('broadcast', { event: 'lobby-tick' }, ({ payload }) => {
      if(!payload || !payload.name) return;
      live.set(payload.name, { led: payload.led, ts: Date.now() });
      const r = roster.get(payload.name);
      if(r){ if(payload.country) r.country = payload.country; if(payload.avatar) r.avatar = payload.avatar; }
    });
    channel.on('presence', { event: 'sync' }, syncPresence);
    channel.subscribe(status => { if(status === 'SUBSCRIBED') trackPresence(); });
  }

  function trackPresence(){
    if(!channel) return;
    channel.track({ name: myName, uid: auth.getState().user?.id || null, avatar: auth.getState().avatarUrl || null,
      country: auth.getState().country || null, wheel: bleConnected }).catch(() => {});
  }

  function syncPresence(){
    const state = channel ? channel.presenceState() : {};
    const seen = new Set();
    for(const metas of Object.values(state)){
      const m = metas[metas.length - 1];
      if(!m || !m.name) continue;
      seen.add(m.name);
      const r = roster.get(m.name) || {};
      r.name = m.name; r.uid = m.uid || r.uid || null;
      r.avatar = m.avatar || r.avatar || null; r.country = m.country || r.country || null;
      r.wheel = !!m.wheel; r.host = isHostName(m.name);
      roster.set(m.name, r);
    }
    for(const name of [...roster.keys()]) if(!seen.has(name)) roster.delete(name);
    renderRoster();
  }

  function statusOf(p){
    const lv = live.get(p.name); const now = Date.now();
    const fresh = lv && (now - lv.ts < LIVE_STALE_MS);
    if(p.wheel && fresh && lv.led > 0) return { key: 'practicing', label: 'Practicing' };
    if(p.wheel && lv && !fresh && (now - lv.ts < 12000)) return { key: 'reconnecting', label: 'Reconnecting' };
    if(p.wheel) return { key: 'ready', label: 'Wheel ready' };
    return { key: 'lobby', label: 'In lobby' };
  }

  // Host first, then You, then arrival/name order — the host is NOT a leader,
  // just anchored at the top as the organizer.
  function sortedRoster(){
    return [...roster.values()].sort((a, b) => {
      if(a.host !== b.host) return a.host ? -1 : 1;
      const am = a.name === myName, bm = b.name === myName;
      if(am !== bm) return am ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  function rowHtml(p){
    const st = statusOf(p);
    const mine = p.name === myName;
    const lv = live.get(p.name);
    const showLive = st.key === 'practicing' && lv;
    const tags = (p.host ? '<span class="rl-tag host">Host</span>' : '') + (mine ? '<span class="rl-tag you">You</span>' : '');
    return `
      <div class="rl-row ${st.key === 'practicing' ? 'practicing' : ''} ${mine ? 'me' : ''}" data-name="${esc(p.name)}">
        ${avatarHtml(p.avatar, p.name)}
        <div class="rl-mid">
          <div class="rl-name-row"><span class="rl-name">${esc(p.name)}</span>${flagImg(p.country)}${tags}</div>
          <div class="rl-track"><span class="rl-pulse"></span></div>
        </div>
        <div class="rl-right">
          <span class="rl-pill ${st.key}"><span class="d"></span>${st.label}</span>
          <span class="rl-live" style="color:${showLive ? zText(lv.led) : 'transparent'}">${showLive ? lv.led : ''}</span>
        </div>
      </div>`;
  }

  function renderRoster(){
    const list = $('rlList'); const count = $('rlCount');
    if(!list) return;
    const arr = sortedRoster();
    if(count) count.textContent = arr.length + (arr.length === 1 ? ' here' : ' here');
    list.innerHTML = arr.length ? arr.map(rowHtml).join('') : '<div class="rl-empty">Waiting for racers to arrive…</div>';
  }

  // Light per-tick refresh of the dynamic bits only (no avatar reflow / flicker).
  function paintLive(){
    const list = $('rlList'); if(!list) return;
    for(const p of roster.values()){
      const row = list.querySelector(`.rl-row[data-name="${CSS.escape(p.name)}"]`);
      if(!row) continue;
      const st = statusOf(p);
      const lv = live.get(p.name);
      const showLive = st.key === 'practicing' && lv;
      row.classList.toggle('practicing', st.key === 'practicing');
      const pill = row.querySelector('.rl-pill');
      if(pill){ pill.className = 'rl-pill ' + st.key; pill.innerHTML = `<span class="d"></span>${st.label}`; }
      const liveEl = row.querySelector('.rl-live');
      if(liveEl){ liveEl.textContent = showLive ? lv.led : ''; liveEl.style.color = showLive ? zText(lv.led) : 'transparent'; }
    }
  }

  // ---- Countdown + phase (lobby → "race starting" → finished) ----------------
  function updateStage(){
    const stage = $('rlStage'); if(!stage) return;
    const ph = phase();
    const now = Date.now();

    if(ph === 'pre'){
      const left = startMs - now;
      const soon = left <= 60000;
      // Final 3 seconds: a purely-visual 3-2-1. It does NOT start any engine.
      // PHASE 5 HOOK: when the official race engine lands, the startMs boundary
      // below is where the 3-2-1 should hand off to live race tracking.
      const sec = Math.ceil(left / 1000);
      const big321 = left <= 3000 && left > 0 ? `<div class="rl-321">${sec}</div>` : '';
      stage.innerHTML = `
        <div class="rl-practice">
          <b>Practice room open</b>
          <span>Spin together while you wait. Practice readings are not saved or included in the race.</span>
        </div>
        <div class="rl-cd ${soon ? 'soon' : ''}">
          <span class="rl-cd-lbl">Race starts</span>
          <span class="rl-cd-val">${soon ? fmt(Math.max(0, left)) : 'in ' + formatUntil(left)}</span>
        </div>${big321}`;
      lastStagePhase = 'pre';
    } else if(ph === 'active'){
      // PHASE 5 HOOK: the real-time race engine + lanes + scoring render here.
      // Until it exists, show an honest transitional state — never a half-baked chart.
      if(lastStagePhase !== 'active'){
        stage.innerHTML = `
          <div class="rl-prep">
            <b><span class="rl-prep-dot"></span>Race starting</b>
            <span>Live race tracking is preparing — hang tight.</span>
          </div>`;
        lastStagePhase = 'active';
      }
    } else {
      // Finished — Phase 4 saves nothing, so be honest about it.
      if(lastStagePhase !== 'post'){
        stage.innerHTML = `
          <div class="rl-finished">
            <b>Race finished</b>
            <span>Detailed race results are coming soon.</span>
          </div>`;
        lastStagePhase = 'post';
      }
    }
  }

  // ---- Cleanup ---------------------------------------------------------------
  return () => {
    if(broadcastTimer) clearInterval(broadcastTimer);
    if(liveTimer) clearInterval(liveTimer);
    if(countdownTimer) clearInterval(countdownTimer);
    if(unsubFrames) unsubFrames();
    if(unsubStatus) unsubStatus();
    if(channel) supabase.removeChannel(channel);
  };
}
