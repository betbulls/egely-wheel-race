import { supabase } from './db.js';
import * as ble from './ble.js';
import * as auth from './auth.js';
import * as presence from './presence.js';
import { computeStats, CATEGORIES, METRIC_HELP, icon, trendLabel, vitalityColor } from './analytics.js';
import { drawTrio, drawVitalityChart } from './chart.js';
import { flagUrl } from './countries.js';
import { createAddToCalendar } from './calendar.js';

// Robust clipboard copy — Clipboard API with a legacy execCommand fallback.
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

// "Share / Copy link" control — Web Share API when available, otherwise copies
// the room URL with brief "Copied" feedback. Returns the root element to append.
function createShareButton(session){
  const url = location.origin + location.pathname + '#/room/' + session.id;
  const root = document.createElement('div');
  root.className = 'room-share';
  root.innerHTML = `
    <button type="button" class="cal-btn room-share-btn" title="Share this room">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
      <span class="room-share-label">${navigator.share ? 'Share' : 'Copy link'}</span>
    </button>`;
  const btn = root.querySelector('.room-share-btn');
  const label = root.querySelector('.room-share-label');
  let resetTimer = null;
  btn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    if(navigator.share){
      try { await navigator.share({ title: (session.name || 'EWR Live session') + ' — EWR Live', url }); }
      catch(err){ /* user dismissed the share sheet — nothing to do */ }
      return;
    }
    const ok = await copyText(url);
    label.textContent = ok ? 'Copied' : 'Copy failed';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { label.textContent = 'Copy link'; }, 1800);
  });
  return root;
}

const BROADCAST_MS = 500;   // how often each client samples + broadcasts its LED
const RENDER_MS = 250;      // how often the board repaints

// Cheat detection: genuine readings drift slowly. If the LED moves by >= 4
// within any 1-second window, it's hand-spun => not verified.
// Verified rule — see view-solo.js. Range (max−min) inside a short window catches
// a swing however it ramps; two distinct swings → "unverified". The de-spiked
// signal (ble.js) has already removed the 24-rail glitches.
const CHEAT_WINDOW_MS = 2000, SWING_LIMIT = 7, MAX_SWINGS = 2;

// Country flag images (render on every OS, unlike flag emoji on Windows). The 2-letter
// code rides on the broadcast tick (live) or comes from the racer's profile (results).
function flagImg(cc){      // flex child — the row's gap handles spacing
  if(!cc || !/^[A-Za-z]{2}$/.test(cc)) return '';
  const u = cc.toUpperCase();
  return `<img src="${flagUrl(cc)}" alt="${u}" title="${u}" loading="lazy" style="width:20px;height:14px;border-radius:3px;object-fit:cover;flex-shrink:0;box-shadow:0 0 0 1px rgba(255,255,255,0.18)">`;
}
function flagInline(cc){   // inline within a text line (category winners)
  if(!cc || !/^[A-Za-z]{2}$/.test(cc)) return '';
  const u = cc.toUpperCase();
  return `<img src="${flagUrl(cc)}" alt="${u}" title="${u}" loading="lazy" style="width:17px;height:12px;border-radius:2px;object-fit:cover;vertical-align:middle;margin-left:6px;box-shadow:0 0 0 1px rgba(255,255,255,0.18)">`;
}
function flagNode(cc){     // DOM node for the live racer card
  if(!cc || !/^[A-Za-z]{2}$/.test(cc)) return null;
  const img = document.createElement('img');
  img.src = flagUrl(cc); img.alt = cc.toUpperCase(); img.title = cc.toUpperCase(); img.loading = 'lazy';
  img.style.cssText = 'width:20px;height:14px;border-radius:3px;object-fit:cover;flex-shrink:0;box-shadow:0 0 0 1px rgba(255,255,255,0.18)';
  return img;
}

// Injected once: on small screens, wrap the live racer card's metrics onto their own row
// so the name (+ flag + tags) always has room and never collapses. Self-contained — no
// index.html edits.
function injectRoomStyles(){
  if(document.getElementById('roomMobileStyles')) return;
  const st = document.createElement('style');
  st.id = 'roomMobileStyles';
  st.textContent = `
  .racer{flex-wrap:wrap}
  .racer-expand{margin-left:8px;align-self:center;padding:6px 12px;border-radius:999px;display:inline-flex;align-items:center;gap:5px;
    background:#fff;border:1px solid var(--ewr-border);color:var(--ewr-accent-strong);cursor:pointer;
    font-family:'Inter',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
  .racer-expand:hover{background:var(--ewr-accent-tint);border-color:var(--ewr-accent);color:var(--ewr-accent)}
  .re-hide{display:none}
  .racer.expanded .re-show{display:none}
  .racer.expanded .re-hide{display:inline}
  .re-car{display:inline-block;transition:transform .2s;font-size:9px}
  .racer.expanded .re-car{transform:rotate(180deg)}
  .racer-expanded{display:none;flex-basis:100%;width:100%;margin-top:10px}
  .racer.expanded .racer-expanded{display:block}
  .racer-big-wrap{background:#fff;border:1px solid var(--ewr-border);border-radius:14px;box-shadow:var(--ewr-shadow-card);padding:14px;height:220px}
  .racer-big-wrap canvas{display:block;width:100%;height:100%}
  .res-expand-row{display:flex;justify-content:flex-end;margin-top:8px}
  .res-expand{padding:6px 12px;border-radius:999px;display:inline-flex;align-items:center;gap:5px;background:#fff;border:1px solid var(--ewr-border);
    color:var(--ewr-accent-strong);cursor:pointer;font-family:'Inter',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
  .res-expand:hover{background:var(--ewr-accent-tint);border-color:var(--ewr-accent);color:var(--ewr-accent)}
  .res-card.expanded .re-show{display:none}
  .res-card.expanded .re-hide{display:inline}
  .res-card.expanded .re-car{transform:rotate(180deg)}
  .res-card{flex-wrap:wrap}
  .res-expanded{display:none;flex-basis:100%;width:100%;margin-top:10px}
  .res-card.expanded .res-expanded{display:block}
  .res-big-wrap{background:#fff;border:1px solid var(--ewr-border);border-radius:14px;box-shadow:var(--ewr-shadow-card);padding:14px;height:210px}
  .res-big-wrap canvas{display:block;width:100%;height:100%}
  @media (max-width:600px){.racer .metrics{flex-basis:100%;width:100%;justify-content:space-around;margin-top:6px}.racer-expand{margin-left:0;margin-top:6px}}`;
  document.head.appendChild(st);
}

// Mounts the Session Room view. Returns a cleanup function.
// inviteToken is set when arriving via an invite link (#/join/<token>): the room
// is then loaded by that token and invite access is granted.
export function mount(el, sessionId, inviteToken = null){
  injectRoomStyles();
  let session = null;
  let startMs = 0, endMs = 0, durationMs = 0;
  let myName = (auth.getState().displayName || localStorage.getItem('ewr_name') || '').trim();

  // racers: name -> { name, led, avg, count, host, history:[{t,led}], el }
  const racers = new Map();
  let myLed = 0, mySum = 0, myCount = 0, myPeak = 0;

  let channel = null;
  let broadcastTimer = null, renderTimer = null, flushTimer = null;
  let unsubFrames = null, unsubStatus = null;
  let started = false, unsubAuthGate = null;

  let bleConnected = false;

  let pendingSamples = [];   // buffered measurement rows, flushed in batches
  let mySamples = [];        // my own LED values (in-window) for my result row
  let mySampleTimes = [];    // matching real-time offsets (ms from session start), for time-anchoring the curve
  let groupSaved = false;    // host writes session group_avg once, at the end
  let myResultSaved = false; // each client writes its own result row once, at the end
  let resultsShown = false;  // in-place live→results transition happened

  let swingWin = [], swings = 0, wasSwing = false;   // cheat detection: count of distinct swings
  let cheatDetected = false; // latched once enough swings are seen

  // Tail drain (same fix as Solo): the wheel reports ~every 700ms, so its report
  // covering the FINAL stretch of the window arrives after endMs. Before saving
  // the result we wait briefly for one frame with a NEW device counter and let
  // it overwrite the held tail samples (no extra time — the slots already exist).
  const FINALIZE_GRACE_MS = 1500;
  let holdRun = 0, frameFresh = false, lastCounter = null;
  let tailDrainStart = null, tailCounterAtEnd = null, tailDrainDone = false;

  const racerId = name => name.trim().toLowerCase().replace(/\s+/g, '_');
  const inWindow = () => { const n = Date.now(); return n >= startMs && n <= endMs; };
  // The room is a LIVE space in three phases: 'pre' = practice room before the
  // scheduled window (presence + live values, NO official stats/recording),
  // 'active' = the official measured session, 'post' = read-only results.
  const phase = () => { const n = Date.now(); return n < startMs ? 'pre' : n <= endMs ? 'active' : 'post'; };
  // Presence roster: everyone who OPENED the room (wheel or not). name -> {ble, country}
  const present = new Map();
  // Muted zone colours for TEXT on the light theme (readable on white — the
  // vivid vitality set stays for curve/spark lines).
  const zText = led => led < 6 ? '#c2415b' : led < 13 ? '#b8860b' : '#0f8a52';

  el.innerHTML = `
    <div class="room-head">
      <div class="room-title-row">
        <span class="room-title" id="roomTitle">Loading…</span>
        <span class="live-pill" id="livePill" hidden><span class="dot"></span>Live</span>
      </div>
      <div class="room-sub" id="roomSub"></div>
      <div class="room-actions" id="roomActions"></div>
      <p class="room-practice-note" id="roomPracticeNote" hidden>This room is open for practice now — official results are recorded once the session begins.</p>
    </div>

    <div class="panel name-gate" id="nameGate" hidden>
      <h2>Join this session</h2>
      <div class="form-grid">
        <div class="field full">
          <label for="rName">Your name</label>
          <input type="text" id="rName" maxlength="60" placeholder="Your name">
        </div>
      </div>
      <div class="form-actions"><button id="rJoin">Join session</button></div>
    </div>

    <div id="roomBody" hidden>
      <div class="session-pulse">
        <div class="sp-head">
          <span class="sp-title">Session pulse</span>
          <span class="sp-state" id="spState" hidden></span>
          <div class="sp-legend">
            <span class="leg-item leg-host"><i class="leg-dot"></i>Host</span>
            <span class="leg-item leg-group"><i class="leg-dot"></i>Group</span>
            <span class="leg-item leg-me"><i class="leg-dot"></i>You</span>
          </div>
        </div>
        <canvas class="sp-chart" id="spChart"></canvas>
        <div class="sp-metrics">
          <div class="sp-col"><div class="sp-col-head leg-host"><i class="leg-dot"></i><span class="sp-col-name" id="spHostName">Host</span></div>
            <div class="sp-stats"><div class="ss"><div class="ss-val" id="spHostLive">–</div><div class="ss-lbl">Live</div></div>
            <div class="ss"><div class="ss-val" id="spHostPeak">–</div><div class="ss-lbl">Peak</div></div>
            <div class="ss"><div class="ss-val" id="spHostAvg">–</div><div class="ss-lbl">Avg</div></div></div></div>
          <div class="sp-col"><div class="sp-col-head leg-group"><i class="leg-dot"></i><span class="sp-col-name">Group</span></div>
            <div class="sp-stats"><div class="ss"><div class="ss-val" id="spGroupLive">–</div><div class="ss-lbl">Live</div></div>
            <div class="ss"><div class="ss-val" id="spGroupPeak">–</div><div class="ss-lbl">Peak</div></div>
            <div class="ss"><div class="ss-val" id="spGroupAvg">–</div><div class="ss-lbl">Avg</div></div></div></div>
          <div class="sp-col"><div class="sp-col-head leg-me"><i class="leg-dot"></i><span class="sp-col-name">You</span></div>
            <div class="sp-stats"><div class="ss"><div class="ss-val" id="spMeLive">–</div><div class="ss-lbl">Live</div></div>
            <div class="ss"><div class="ss-val" id="spMePeak">–</div><div class="ss-lbl">Peak</div></div>
            <div class="ss"><div class="ss-val" id="spMeAvg">–</div><div class="ss-lbl">Avg</div></div></div></div>
        </div>
      </div>

      <div class="group-bar">
        <div class="gstat time"><div class="gval" id="gTime">--:--</div><div class="glbl">Time left</div></div>
        <div class="gstat"><div class="gval" id="gLive">0.0</div><div class="glbl">Group live</div></div>
        <div class="gstat"><div class="gval" id="gAvg">0.0</div><div class="glbl">Group avg</div></div>
      </div>

      <div class="scale">
        <div class="scale-label">Vitality scale</div>
        <div class="scale-bar"></div>
        <div class="scale-ticks"><span>0</span><span>6</span><span>13</span><span>24</span></div>
      </div>

      <div class="board" id="board"></div>
      <p class="room-hint" id="roomHint"></p>
    </div>
  `;

  const $ = id => el.querySelector('#' + id);
  let hostHandle = null, hostIsMaker = false;   // approved-maker host → racer card links to their invite page

  // ---- Load session ---------------------------------------------------------
  (async () => {
    const baseQ = supabase.from('sessions').select('*');
    const { data, error } = await (sessionId ? baseQ.eq('id', sessionId) : baseQ.eq('invite_token', inviteToken)).maybeSingle();
    if(error || !data){
      $('roomTitle').textContent = (inviteToken && !sessionId) ? 'Invite link not valid' : 'Session not found';
      $('roomSub').innerHTML = '<a href="#/sessions" class="link">Back to sessions</a>';
      return;
    }
    session = data;
    sessionId = data.id;   // entered via token → normalise so all downstream id uses (saves, channel) work
    startMs = new Date(session.scheduled_start).getTime();
    durationMs = (session.duration_minutes || 0) * 60000;
    endMs = startMs + durationMs;
    $('roomTitle').textContent = session.name || 'Session';
    const when = new Date(session.scheduled_start).toLocaleString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    $('roomSub').textContent = `Hosted by ${session.created_by || 'unknown'} · ${session.duration_minutes} min · ${when}`;

    // Header actions: "Remind me" (calendar) only while it's still upcoming, and
    // a Share/Copy-link control always — the room is a community space.
    const phaseNow = Date.now() < startMs ? 'pre' : (Date.now() <= endMs ? 'active' : 'post');
    const actionsEl = $('roomActions');
    if(actionsEl){
      if(phaseNow === 'pre') actionsEl.appendChild(createAddToCalendar({ ...session, _hostName: session.created_by }));
      actionsEl.appendChild(createShareButton(session));
    }
    if(phaseNow === 'pre'){ const note = $('roomPracticeNote'); if(note) note.hidden = false; }

    // Approved-maker host → their racer card links to their invite (connect) page.
    if(session.created_by_user_id){
      const { data: hp } = await supabase.from('profiles')
        .select('practitioner_handle, approved_maker').eq('id', session.created_by_user_id).maybeSingle();
      if(hp){ hostHandle = hp.practitioner_handle || null; hostIsMaker = !!hp.approved_maker; }
    }

    // ---- Access gate (MVP: visible-but-locked; gates ENTRY only, not RLS-level
    // privacy — the row/results are still API-readable). public = anyone; invite =
    // host or a matching link token; followers = host or a connected member.
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

    // Restricted room → small "entry restricted" badge + (host) a copy-invite-link control.
    if(accessMode !== 'public'){
      const isInvite = accessMode === 'invite';
      const badge = document.createElement('span');
      badge.textContent = isInvite ? 'Invite link required' : 'Followers only';
      badge.style.cssText = 'display:inline-block;margin-top:8px;font-size:11px;font-weight:700;letter-spacing:.04em;'
        + 'text-transform:uppercase;border-radius:999px;padding:3px 10px;'
        + (isInvite ? 'color:#5230da;background:rgba(82,48,218,.1)' : 'color:#0e7490;background:rgba(14,116,144,.1)');
      const sub = $('roomSub'); if(sub && sub.parentNode) sub.parentNode.insertBefore(badge, sub.nextSibling);
      if(isInvite && isHostUser && session.invite_token && actionsEl){
        actionsEl.appendChild(makeCopyButton('Copy invite link', location.origin + location.pathname + '#/join/' + session.invite_token));
      }
    }

    if(Date.now() > endMs){ renderResults(); resultsShown = true; }   // build once; a later resize must not wipe an expanded chart
    else start();
  })();

  function isHostName(name){
    return session && name && name.trim().toLowerCase() === (session.created_by || '').trim().toLowerCase();
  }

  function tryStart(){
    if(started) return true;
    const n = (auth.getState().displayName || localStorage.getItem('ewr_name') || '').trim();
    if(!n) return false;
    myName = n; started = true; showBody(); return true;
  }
  // Logged-in users must NOT see the name gate. Auth restores async on a hard
  // refresh, so wait for the displayName and only gate a genuinely logged-out visitor.
  function start(){
    if(tryStart()) return;
    unsubAuthGate = auth.subscribeAuth(() => tryStart());
    setTimeout(() => { if(!started && !auth.getState().user) showNameGate(); }, 1200);
  }
  function showNameGate(){
    if(started) return;
    $('nameGate').hidden = false;
    $('rName').focus();
    $('rJoin').addEventListener('click', () => {
      const v = $('rName').value.trim();
      if(!v) return;
      myName = v; started = true;
      localStorage.setItem('ewr_name', v);
      $('nameGate').hidden = true;
      showBody();
    });
  }

  // Copy-to-clipboard button (invite link). Mirrors the room share helper's fallbacks.
  function makeCopyButton(label, text){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn-secondary'; b.textContent = label;
    b.addEventListener('click', async () => {
      const orig = b.textContent;
      try {
        if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); }
        else { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
        b.textContent = 'Copied ✓';
      } catch { b.textContent = 'Copy failed'; }
      setTimeout(() => { b.textContent = orig; }, 1600);
    });
    return b;
  }

  // Entry blocked (invite without link / followers-only without a connection).
  // The room is visible to all in the lists; this only gates JOINING.
  function renderLocked(mode){
    const esc2 = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
    const rb = $('roomBody'); if(rb) rb.hidden = true;
    const ng = $('nameGate'); if(ng) ng.hidden = true;
    const note = $('roomPracticeNote'); if(note) note.hidden = true;
    const host = session.created_by || 'the host';
    const loggedIn = !!auth.getState().user;
    let title, body, cta = '';
    if(mode === 'invite'){
      title = 'Invite link required';
      body = `This room is visible, but you need ${esc2(host)}'s invite link to enter.`;
    } else {
      title = 'Followers only';
      if(!loggedIn){
        body = `This session is for ${esc2(host)}'s connected members. Log in to join.`;
        cta = `<a class="btn-join" href="#/login">Log in</a>`;
        try { localStorage.setItem('ewr_pending_room', location.hash); } catch {}
      } else {
        body = `This session is for ${esc2(host)}'s connected members.`;
        cta = hostHandle ? `<a class="btn-join" href="#/connect/${esc2(hostHandle)}">Connect with ${esc2(host)}</a>` : '';
      }
    }
    const panel = document.createElement('div');
    panel.className = 'panel room-locked';
    panel.style.cssText = 'margin-top:14px';
    panel.innerHTML = `<h2 style="margin-top:0">${title}</h2>
      <p class="room-hint" style="text-align:left;margin:6px 0 16px">${body}</p>
      <div class="form-actions" style="gap:12px;flex-wrap:wrap">${cta}<a class="link" href="#/sessions">Back to sessions</a></div>`;
    const head = el.querySelector('.room-head');
    if(head) head.after(panel); else el.appendChild(panel);
  }

  function showBody(){
    $('roomBody').hidden = false;
    joinChannel();

    unsubStatus = ble.subscribeStatus(s => { bleConnected = s.connected; updateHint(); presence.setSession(s.connected); trackPresence(); });
    unsubFrames = ble.subscribeFrames(frame => {
      myLed = frame.led;
      lastCounter = frame.counter;
      if(inWindow()){
        frameFresh = true;
        const now = Date.now();
        swingWin.push({ t: now, led: frame.led });
        swingWin = swingWin.filter(f => now - f.t <= CHEAT_WINDOW_MS);
        const leds = swingWin.map(f => f.led);
        const swingNow = (Math.max(...leds) - Math.min(...leds)) >= SWING_LIMIT;
        if(swingNow && !wasSwing && !cheatDetected && ++swings >= MAX_SWINGS){ cheatDetected = true; updateHint(); }
        wasSwing = swingNow;
      } else if(tailDrainStart !== null && !tailDrainDone && frame.counter !== tailCounterAtEnd){
        // The wheel's delayed report on the window's final stretch: patch the
        // held tail samples (their time slots are already in-window), then save.
        tailDrainDone = true;
        const n = Math.min(holdRun, mySamples.length, 4);
        for(let i = mySamples.length - n; i < mySamples.length; i++) mySamples[i] = frame.led;
        maybeSaveMyResult();
      }
    });

    broadcastTimer = setInterval(sampleAndBroadcast, BROADCAST_MS);
    renderTimer = setInterval(render, RENDER_MS);
    flushTimer = setInterval(flushSamples, 2000);
    updateHint();
    render();
  }

  function updateHint(){
    const h = $('roomHint');
    if(cheatDetected){ h.innerHTML = '<span class="warn">Irregular spinning detected — this measurement won\'t be verified.</span>'; return; }
    if(bleConnected){
      h.textContent = phase() === 'pre'
        ? `Practice mode — you are spinning as "${myName}". Official results start with the session.`
        : `You are measuring as "${myName}".`;
    } else {
      h.textContent = 'You are in the room. Connect your Egely Wheel (top right) to measure — or just watch.';
    }
  }

  // ---- Realtime channel -----------------------------------------------------
  // NOTE (future improvement, parked on purpose): late joiners currently see
  // other racers' curves only from the moment they join. "Late joiners should
  // eventually see appropriate room/session history" — needs a real product
  // decision (how much history, per phase) before building.
  function joinChannel(){
    channel = supabase.channel('room-' + sessionId, {
      config: { broadcast: { self: false }, presence: { key: racerId(myName) } },
    });
    channel.on('broadcast', { event: 'tick' }, ({ payload }) => applyTick(payload));
    // Presence: everyone who opens the room is a participant — wheel or not.
    channel.on('presence', { event: 'sync' }, syncPresence);
    channel.subscribe(status => { if(status === 'SUBSCRIBED') trackPresence(); });
  }

  function trackPresence(){
    if(!channel) return;
    channel.track({ name: myName, ble: bleConnected, country: auth.getState().country || null, avatar: auth.getState().avatarUrl || null })
      .catch(() => {});   // best-effort; the roster also works off broadcasts
  }

  function syncPresence(){
    present.clear();
    const state = channel ? channel.presenceState() : {};
    for(const metas of Object.values(state)){
      const m = metas[metas.length - 1];   // latest track wins per key
      if(m && m.name) present.set(m.name, { ble: !!m.ble, country: m.country || null, avatar: m.avatar || null });
    }
    // Presence-only participants join the roster; entries that never produced
    // wheel data leave it when their presence drops (broadcasters stay).
    for(const [name, p] of present){
      if(!racers.has(name)){
        racers.set(name, { name, led: 0, avg: 0, count: 0, peak: 0, host: isHostName(name),
          verified: true, country: p.country, avatar: p.avatar || null, history: [], el: null, hasData: false });
      }
    }
    for(const [name, r] of racers){
      if(!r.hasData && !present.has(name)){ racers.delete(name); }
    }
    render();
  }

  function applyTick(p){
    if(!p || !p.name) return;
    upsertRacer(p.name, { led: p.led, avg: p.avg, count: p.count, peak: p.peak, host: isHostName(p.name), verified: p.verified, country: p.country, avatar: p.avatar });
  }

  function upsertRacer(name, { led, avg, count, peak, host, verified, country, avatar }){
    let r = racers.get(name);
    if(!r){
      r = { name, led: 0, avg: 0, count: 0, peak: 0, host, verified: true, country: null, avatar: null, history: [], el: null };
      racers.set(name, r);
    }
    r.hasData = true;   // produced wheel data (vs. presence-only participant)
    r.led = led; r.avg = avg; r.count = count; r.host = host;
    r.peak = Math.max(r.peak || 0, peak || 0);
    if(verified !== undefined) r.verified = verified;
    if(country) r.country = country;
    if(avatar) r.avatar = avatar;
    // t may be NEGATIVE before the scheduled window — the pre-session practice
    // room shows those points on a rolling chart; official renderers filter t>=0.
    const t = Date.now() - startMs;
    r.history.push({ t, led });
    if(r.history.length > 2400) r.history.shift();
  }

  // Sample own wheel value at a fixed cadence, update self + broadcast.
  function sampleAndBroadcast(){
    if(!bleConnected) return;            // viewers don't broadcast
    if(inWindow()){
      mySum += myLed; myCount++;
      myPeak = Math.max(myPeak, myLed);
      mySamples.push(myLed);
      mySampleTimes.push(Date.now() - startMs);
      // Track the trailing "hold" run (pushes with no fresh frame in between) —
      // the finalize tail drain may overwrite exactly those slots.
      if(frameFresh){ frameFresh = false; holdRun = 0; } else holdRun++;
      pendingSamples.push({
        session_id: Number(sessionId), user_id: auth.getState().user?.id || null,
        racer_id: racerId(myName), racer_name: myName, led_value: myLed,
      });
    }
    // Average over the session window so far (absent time counts as 0) — keeps the live
    // figure consistent with the saved, full-window result. The board still sorts by the
    // current LED, so a real spinner still rises live; only the average is windowed.
    const slots = Math.max(myCount, Math.round((Math.min(Date.now(), endMs) - startMs) / BROADCAST_MS));
    const avg = slots > 0 ? mySum / slots : 0;
    const verified = !cheatDetected;
    const myCountry = auth.getState().country || null;
    const myAvatar = auth.getState().avatarUrl || null;
    upsertRacer(myName, { led: myLed, avg, count: myCount, peak: myPeak, host: isHostName(myName), verified, country: myCountry, avatar: myAvatar });
    if(channel){
      channel.send({ type: 'broadcast', event: 'tick',
        payload: { name: myName, led: myLed, avg, count: myCount, peak: myPeak, verified, country: myCountry, avatar: myAvatar } });
    }
  }

  // Flush buffered samples to Supabase in one batch.
  async function flushSamples(){
    if(pendingSamples.length === 0) return;
    const batch = pendingSamples;
    pendingSamples = [];
    const { error } = await supabase.from('measurements').insert(batch);
    if(error) console.warn('measurement store error:', error.message);
  }

  // The host's client writes the session's group result once the session ends.
  function maybeSaveGroup(){
    if(groupSaved || Date.now() <= endMs || !isHostName(myName)) return;
    const list = [...racers.values()].filter(r => r.hasData);   // presence-only people don't dilute the official group avg
    if(list.length === 0) return;
    groupSaved = true;
    const groupAvg = list.reduce((s, r) => s + (r.avg || 0), 0) / list.length;
    supabase.from('sessions')
      .update({ group_avg: Number(groupAvg.toFixed(2)), racer_count: list.length })
      .eq('id', Number(sessionId))
      .then(({ error }) => { if(error) console.warn('group save error:', error.message); });
  }

  // Build the saved curve aligned to the full session window: each sample lands in
  // its real time bucket, so the stored curve shows WHEN you measured (no stretching).
  // Buckets where you weren't measuring stay null — drawn as a gap, not a value.
  function anchoredCurve(samples, times, span, n = 80){
    const curve = new Array(n).fill(null);
    if(!span) return curve;
    for(let i = 0; i < samples.length; i++){
      const k = Math.max(0, Math.min(n - 1, Math.floor((times[i] / span) * n)));
      curve[k] = samples[i];   // last sample in a bucket wins
    }
    return curve;
  }

  // Full-window sample series for a timed session: each real sample sits in its time
  // slot, every other slot is 0 (you weren't contributing then). The result stats are
  // computed over THIS, so the group race is fair over the whole session — a short late
  // burst can't out-average someone who sustained vitality the entire time. Peak is the
  // max, so it stays your true best moment (zeros never raise a maximum).
  function fullWindowSamples(samples, times, span){
    const slots = Math.max(samples.length, Math.round((span || 0) / BROADCAST_MS));
    if(slots <= 0) return samples.slice();
    const arr = new Array(slots).fill(0);
    for(let i = 0; i < samples.length; i++){
      const k = Math.max(0, Math.min(slots - 1, Math.floor((times[i] / span) * slots)));
      arr[k] = samples[i];   // last sample in a slot wins
    }
    return arr;
  }

  // Each measuring client writes its own summarised result once the session ends.
  function maybeSaveMyResult(){
    if(myResultSaved || Date.now() <= endMs || mySamples.length === 0) return;
    // Tail drain: give the wheel's delayed final report a brief chance to land
    // before the stats are computed. The frame listener completes the drain
    // early; the timeout is the fallback so the save can never get stuck.
    if(!tailDrainDone){
      if(tailDrainStart === null){
        tailDrainStart = Date.now();
        tailCounterAtEnd = lastCounter;
        setTimeout(() => { if(!tailDrainDone){ tailDrainDone = true; maybeSaveMyResult(); } }, FINALIZE_GRACE_MS);
      }
      return;
    }
    myResultSaved = true;
    const s = computeStats(fullWindowSamples(mySamples, mySampleTimes, durationMs));
    supabase.from('results').insert({
      session_id: Number(sessionId), user_id: auth.getState().user?.id || null,
      racer_id: racerId(myName), racer_name: myName,
      avg: Number(s.avg.toFixed(2)), peak: s.peak, steadiness: s.steadiness,
      zone_green: Number(s.zone.green.toFixed(1)),
      zone_yellow: Number(s.zone.yellow.toFixed(1)),
      zone_red: Number(s.zone.red.toFixed(1)),
      trend: Number(s.trendTotal.toFixed(2)), green_streak: s.greenStreak,
      samples: mySamples.length, is_host: isHostName(myName), verified: !cheatDetected,
      curve: anchoredCurve(mySamples, mySampleTimes, durationMs, Math.max(1, Math.round(durationMs / 500))), duration_seconds: (session.duration_minutes || 0) * 60,   // FULL time-anchored series (one bucket per 500ms slot, null = unmeasured/late-join) — no 80-point cap
    }).then(({ error }) => { if(error) console.warn('result save error:', error.message); });
  }

  // ---- Rendering ------------------------------------------------------------
  const board = () => $('board');

  function buildCard(r){
    const card = document.createElement('div');
    card.className = 'racer';

    const rank = document.createElement('div');
    rank.className = 'rank';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    if(r.avatar){
      const img = document.createElement('img');
      img.src = r.avatar; img.alt = '';
      img.addEventListener('error', () => { avatar.textContent = r.name.charAt(0).toUpperCase(); });
      avatar.appendChild(img);
    } else {
      avatar.textContent = r.name.charAt(0).toUpperCase();
    }

    const mid = document.createElement('div');
    mid.className = 'racer-mid';
    const nameRow = document.createElement('div');
    nameRow.className = 'racer-name-row';
    const name = document.createElement('div');
    name.className = 'racer-name';
    if(r.host && hostIsMaker && hostHandle){
      const a = document.createElement('a');
      a.className = 'maker-name-link';
      a.href = '#/connect/' + hostHandle;
      a.textContent = r.name;
      name.appendChild(a);
    } else {
      name.textContent = r.name;
    }
    nameRow.append(name);
    const flag = flagNode(r.country); if(flag) nameRow.append(flag);
    if(r.host){
      const tag = document.createElement('span');
      tag.className = 'host-tag';
      tag.textContent = 'Host';
      nameRow.append(tag);
    }
    const vbadge = document.createElement('span');
    vbadge.className = 'v-badge';
    nameRow.append(vbadge);
    const status = document.createElement('span');
    status.className = 'racer-status';
    status.hidden = true;
    nameRow.append(status);
    const spark = document.createElement('canvas');
    spark.className = 'spark';
    mid.append(nameRow, spark);

    const metrics = document.createElement('div');
    metrics.className = 'metrics';
    const live = mkMetric('live', 'Live');
    const peak = mkMetric('peak', 'Peak');
    const avg = mkMetric('avg', 'Avg');
    metrics.append(live.wrap, peak.wrap, avg.wrap);

    // Expand control + full vitality chart (same as the Live wall).
    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'racer-expand';
    expandBtn.hidden = true;
    expandBtn.setAttribute('aria-label', 'Show full chart');
    expandBtn.setAttribute('aria-expanded', 'false');
    expandBtn.innerHTML = '<span class="re-show">Chart</span><span class="re-hide">Hide</span><span class="re-car">▾</span>';
    const bigWrap = document.createElement('div');
    bigWrap.className = 'racer-expanded';
    const bigInner = document.createElement('div');
    bigInner.className = 'racer-big-wrap';
    const bigCanvas = document.createElement('canvas');
    bigInner.appendChild(bigCanvas);
    bigWrap.appendChild(bigInner);

    card.append(rank, avatar, mid, metrics, expandBtn, bigWrap);
    r.el = { card, rank, liveVal: live.val, peakVal: peak.val, avgVal: avg.val, spark, vbadge, status, expandBtn, bigCanvas };

    expandBtn.addEventListener('click', () => {
      r.expanded = !r.expanded;
      card.classList.toggle('expanded', r.expanded);
      expandBtn.setAttribute('aria-expanded', r.expanded ? 'true' : 'false');
      if(r.expanded) drawBig(r);
    });
    return card;
  }

  // Full vitality chart for an expanded racer card — mirrors the Live wall's
  // drawVitalityChart (zone bands + axes), fed by the racer's own history.
  function drawBig(r){
    if(!r.el || !r.el.bigCanvas || !r.history || r.history.length < 2) return;
    const src = phase() === 'active' ? r.history.filter(pt => pt.t >= 0) : rolling(r.history);
    const leds = src.map(pt => pt.led);
    if(leds.length > 1) drawVitalityChart(r.el.bigCanvas, leds, Math.round(leds.length * 0.5));
  }

  // Map history (t = ms from session start, may be negative) onto a rolling
  // last-60s practice window ending NOW: returned t' is in [0, 60000].
  function rolling(history){
    const nowRel = Date.now() - startMs;
    return history.map(p => ({ t: p.t - nowRel + 60000, led: p.led })).filter(p => p.t >= 0);
  }

  function mkMetric(cls, label){
    const wrap = document.createElement('div');
    wrap.className = 'metric';
    const val = document.createElement('div');
    val.className = 'metric-val ' + cls;
    const lbl = document.createElement('div');
    lbl.className = 'metric-lbl';
    lbl.textContent = label;
    wrap.append(val, lbl);
    return { wrap, val };
  }

  function drawCurve(canvas, history, color, opts = {}){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if(!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const span = opts.span || durationMs || 60000;
    const pad = opts.big ? 8 : 2;
    const xOf = t => (t / span) * w;
    const yOf = led => h - (led / 24) * (h - pad * 2) - pad;
    if(opts.grid){
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
      for(let i = 0; i <= 4; i++){ const y = (h / 4) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    }
    if(history.length < 2) return;
    const trace = () => history.forEach((pt, i) => {
      const x = xOf(pt.t), y = yOf(pt.led);
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    if(opts.fill){
      ctx.beginPath(); trace();
      ctx.lineTo(xOf(history[history.length - 1].t), h);
      ctx.lineTo(xOf(history[0].t), h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color + '55'); grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad; ctx.fill();
    }
    ctx.beginPath(); trace();
    ctx.strokeStyle = color; ctx.lineWidth = opts.big ? 2.5 : 2; ctx.lineJoin = 'round'; ctx.stroke();
  }

  function render(){
    const b = board();
    if(!b) return;            // results mode has no live board

    // The session ended while we are IN the room: finalize (tail drain + saves
    // need a moment to land for everyone), then swap to the final results in
    // place — nobody should have to leave and dig through past sessions.
    if(phase() === 'post' && !resultsShown){
      maybeSaveGroup();
      maybeSaveMyResult();
      renderGroup();   // time card flips to "Finished"
      const mySettled = myResultSaved || mySamples.length === 0;
      const SETTLE_MS = 2600;   // > FINALIZE_GRACE_MS, lets other racers' saves land too
      if(!(mySettled && Date.now() - endMs > SETTLE_MS)){
        b.innerHTML = '<div class="room-finalizing"><span class="rf-dot"></span>Finalizing results…</div>';
        const st = $('spState');
        if(st){ st.hidden = false; st.textContent = 'Session finished — finalizing results'; }
        return;
      }
      resultsShown = true;
      if(broadcastTimer){ clearInterval(broadcastTimer); broadcastTimer = null; }
      flushSamples();
      renderResults();   // replaces roomBody; later ticks bail out (no #board)
      return;
    }

    const list = [...racers.values()];

    if(list.length === 0){
      b.innerHTML = '<div class="empty">No one is in the room yet.</div>';
    } else {
      if(b.querySelector('.empty')) b.innerHTML = '';
      const sorted = list.sort((a, c) => c.led - a.led);
      const ph = phase();
      sorted.forEach((r, i) => {
        if(!r.el){ buildCard(r); }
        // Reorder by moving ONLY out-of-place cards. Re-appending every card each
        // tick detaches it under the cursor → a hovered button flickers.
        if(b.children[i] !== r.el.card) b.insertBefore(r.el.card, b.children[i] || null);
        r.el.rank.textContent = i + 1;

        // Live value: only for participants with wheel data.
        if(r.hasData){
          r.el.liveVal.textContent = r.led;
          r.el.liveVal.style.color = zText(r.led);
        } else {
          r.el.liveVal.textContent = '–'; r.el.liveVal.style.color = '';
        }
        // Official peak/avg only inside the active session window — the
        // practice room shows no official-looking stats.
        if(ph === 'active' && r.hasData){
          r.el.peakVal.textContent = r.peak;
          r.el.peakVal.style.color = zText(r.peak);
          r.el.avgVal.textContent = (r.avg || 0).toFixed(1);
        } else {
          r.el.peakVal.textContent = '–'; r.el.peakVal.style.color = '';
          r.el.avgVal.textContent = '–';
        }

        // Badge: verified verdict belongs to the official session; otherwise a
        // presence/wheel status pill (In room / Wheel connected / Practicing).
        let status = null;
        if(!r.hasData) status = 'In room';
        else if(ph === 'pre') status = r.led > 0 ? 'Practicing' : 'Wheel connected';
        if(status){
          r.el.vbadge.hidden = true;
          r.el.status.hidden = false;
          r.el.status.textContent = status;
          r.el.status.className = 'racer-status' +
            (status === 'Practicing' ? ' practicing' : status === 'Wheel connected' ? ' wheel' : '');
        } else {
          r.el.status.hidden = true;
          r.el.vbadge.hidden = false;
          if(r.verified === false){ r.el.vbadge.className = 'v-badge unverified'; r.el.vbadge.textContent = 'unverified'; }
          else { r.el.vbadge.className = 'v-badge verified'; r.el.vbadge.textContent = '✓'; }
        }

        // Spark: session-anchored when active; rolling last-60s in practice.
        // Area fill gives it telemetry weight (not an empty input-field strip).
        if(r.hasData && r.history.length > 1){
          if(ph === 'active') drawCurve(r.el.spark, r.history.filter(pt => pt.t >= 0), vitalityColor(r.led), { fill: true });
          else drawCurve(r.el.spark, rolling(r.history), vitalityColor(r.led), { span: 60000, fill: true });
          r.el.expandBtn.hidden = false;
          if(r.expanded) drawBig(r);
        } else {
          const c = r.el.spark.getContext('2d');
          if(c) c.clearRect(0, 0, r.el.spark.width, r.el.spark.height);
          r.el.expandBtn.hidden = true;
          if(r.expanded){ r.expanded = false; r.el.card.classList.remove('expanded'); }
        }
      });
    }
    renderPulse();
    renderGroup();
    maybeSaveGroup();
    maybeSaveMyResult();
  }

  // ---- Session Pulse: Host + Group + You as 3 lines on one chart -----------
  function computeGroupHistory(){
    if(!racers.size) return [];
    const buckets = new Map();
    for(const r of racers.values()){
      for(const pt of r.history){
        const idx = Math.floor(pt.t / BROADCAST_MS);
        const b = buckets.get(idx) || { sum: 0, count: 0 };
        b.sum += pt.led; b.count++;
        buckets.set(idx, b);
      }
    }
    const keys = [...buckets.keys()].sort((a, b) => a - b);
    return keys.map(k => ({ t: k * BROADCAST_MS, led: buckets.get(k).sum / buckets.get(k).count }));
  }

  function setVal(id, v){
    const e = $(id); if(!e) return;
    e.textContent = (v == null || v === '') ? '–' : v;
  }

  function renderPulse(){
    const ph = phase();
    // Only participants with wheel data feed the pulse chart and group numbers.
    const list = [...racers.values()].filter(r => r.hasData);
    const hostR = list.find(r => r.host);
    const meR = racers.get(myName);
    const meData = meR && meR.hasData ? meR : null;
    const groupHist = computeGroupHistory();

    if(ph === 'pre'){
      // Practice room: rolling last-60s window (the session window hasn't started).
      const practiceLabels = [0, 1, 2, 3, 4].map(i =>
        ({ frac: i / 4, text: i === 4 ? 'now' : '-' + Math.round((1 - i / 4) * 60) + 's' }));
      drawTrio($('spChart'), {
        host: hostR ? rolling(hostR.history) : [],
        group: rolling(groupHist),
        me: meData ? rolling(meData.history) : [],
      }, { durationMs: 60000, xLabels: practiceLabels });
    } else {
      drawTrio($('spChart'), {
        host: hostR ? hostR.history.filter(p => p.t >= 0) : [],
        group: groupHist.filter(p => p.t >= 0),
        me: meData ? meData.history.filter(p => p.t >= 0) : [],
      }, { durationMs });
    }

    // Practice state line in the panel header.
    const st = $('spState');
    if(st){
      if(ph === 'pre'){ st.hidden = false; st.textContent = 'Practice room — official session not started'; }
      else st.hidden = true;
    }

    const official = ph === 'active';   // peak/avg are official-session metrics
    const hostName = hostR ? hostR.name : (session ? (session.created_by || '—') : '—');
    setVal('spHostName', hostName);
    setVal('spHostLive', hostR ? hostR.led : null);
    setVal('spHostPeak', official && hostR ? hostR.peak : null);
    setVal('spHostAvg',  official && hostR ? (hostR.avg || 0).toFixed(1) : null);
    if(hostR){
      $('spHostLive').style.color = zText(hostR.led);
      if(official){
        $('spHostPeak').style.color = zText(hostR.peak);
        $('spHostAvg').style.color  = zText(hostR.avg || 0);
      }
    }

    if(list.length){
      const gLive = list.reduce((s, r) => s + r.led, 0) / list.length;
      const gAvg  = list.reduce((s, r) => s + (r.avg || 0), 0) / list.length;
      const gPeak = Math.max(0, ...list.map(r => r.peak || 0));
      setVal('spGroupLive', gLive.toFixed(1));
      setVal('spGroupPeak', official ? gPeak : null);
      setVal('spGroupAvg', official ? gAvg.toFixed(1) : null);
      if(official) $('spGroupAvg').style.color = zText(gAvg);
    } else {
      setVal('spGroupLive', null); setVal('spGroupPeak', null); setVal('spGroupAvg', null);
    }

    setVal('spMeLive', meData ? meData.led : null);
    setVal('spMePeak', official && meData ? meData.peak : null);
    setVal('spMeAvg',  official && meData ? (meData.avg || 0).toFixed(1) : null);
    if(meData){
      $('spMeLive').style.color = zText(meData.led);
      if(official){
        $('spMePeak').style.color = zText(meData.peak);
        $('spMeAvg').style.color  = zText(meData.avg || 0);
      }
    }
  }

  function renderGroup(){
    const now = Date.now();
    const livePill = $('livePill');
    let left = 0, label = '--:--';
    if(now < startMs){ left = startMs - now; label = 'in ' + formatUntil(left); livePill.hidden = true; }
    else if(now <= endMs){ left = endMs - now; label = fmt(left); livePill.hidden = false; }
    else { label = 'Finished'; livePill.hidden = true; }
    const gTimeEl = $('gTime');
    gTimeEl.textContent = label;
    // Practice room: live telemetry leads, the countdown card steps back.
    const timeCard = gTimeEl.closest('.gstat');
    if(timeCard) timeCard.classList.toggle('quiet', phase() === 'pre');

    // Only wheel-data participants count — presence-only people must not dilute.
    const list = [...racers.values()].filter(r => r.hasData);
    const gAvgEl = $('gAvg');
    if(list.length){
      const gLive = list.reduce((s, r) => s + r.led, 0) / list.length;
      $('gLive').textContent = gLive.toFixed(1);
      if(phase() === 'active'){
        const gAvg = list.reduce((s, r) => s + (r.avg || 0), 0) / list.length;
        gAvgEl.textContent = gAvg.toFixed(1);
        gAvgEl.style.color = zText(gAvg);
      } else {
        gAvgEl.textContent = '–';   // practice room: no official-looking average
        gAvgEl.style.color = '';
      }
    } else {
      $('gLive').textContent = '0.0';
      gAvgEl.textContent = phase() === 'active' ? '0.0' : '–';
      gAvgEl.style.color = '';
    }
  }

  // Precise time-left while a session is LIVE (adds hours when needed).
  function fmt(ms){
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }

  // Adaptive "time until start" — readable at any distance (mirrors view-sessions).
  // Without this, an upcoming session showed raw minutes like "50303:32".
  function formatUntil(ms){
    if(ms <= 0) return 'now';
    const sec   = Math.floor(ms / 1000);
    const mins  = Math.floor(sec / 60);
    const hours = Math.floor(sec / 3600);
    const days  = Math.floor(sec / 86400);
    if(days >= 60)  return `${Math.floor(days / 30)} months`;
    if(days >= 14)  return `${Math.floor(days / 7)} weeks`;
    if(days >= 1)   return `${days} ${days === 1 ? 'day' : 'days'}`;
    if(hours >= 1)  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    if(mins  >= 1)  return `${mins} min`;
    return `${sec}s`;   // final minute: count the seconds down instead of "less than a minute"
  }

  // ---- Results screen (finished session) ------------------------------------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  function zoneBar(z){
    return `<div class="zonebar">
      <span class="z-red" style="width:${z.red}%"></span>
      <span class="z-yellow" style="width:${z.yellow}%"></span>
      <span class="z-green" style="width:${z.green}%"></span>
    </div>`;
  }

  async function renderResults(){
    $('livePill').hidden = true;
    const body = $('roomBody');
    body.hidden = false;
    body.innerHTML = '<div class="empty">Loading results…</div>';

    // Source from the results rows: they carry the time-anchored curve, the
    // authoritative summary stats, the verified verdict and the host flag.
    const { data: rows, error } = await supabase.from('results')
      .select('racer_name, user_id, avg, peak, steadiness, zone_green, zone_yellow, zone_red, trend, green_streak, curve, is_host, verified')
      .eq('session_id', Number(sessionId));
    if(error){ body.innerHTML = `<div class="empty">Could not load results: ${esc(error.message)}</div>`; return; }

    const myUserId = auth.getState().user?.id || null;

    // Country per racer (for the flag): look up the profiles of everyone with a result.
    // Defensive — if the country column doesn't exist yet, we just skip the flags.
    const uids = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))];
    let countryByUid = new Map();
    if(uids.length){
      const { data: profs, error: cErr } = await supabase.from('profiles').select('id, country').in('id', uids);
      if(!cErr) countryByUid = new Map((profs || []).map(p => [p.id, p.country]));
    }

    const statsOf = r => ({
      avg: Number(r.avg) || 0, peak: r.peak || 0, steadiness: r.steadiness || 0,
      zone: { red: Number(r.zone_red) || 0, yellow: Number(r.zone_yellow) || 0, green: Number(r.zone_green) || 0 },
      trendTotal: Number(r.trend) || 0, greenStreak: r.green_streak || 0,
    });
    const all = (rows || []).map(r => ({
      name: r.racer_name || 'Racer',
      host: r.is_host != null ? !!r.is_host : isHostName(r.racer_name),
      verified: r.verified,
      mine: !!((myUserId && r.user_id === myUserId) || (myName && r.racer_name === myName)),
      country: countryByUid.get(r.user_id) || null,
      curve: Array.isArray(r.curve) ? r.curve : [],
      stats: statsOf(r),
    }));

    // The leaderboard / group counts only what qualifies (verified, when the host
    // chose verified-only) — but the viewer ALWAYS sees their own measurement,
    // marked, even when it did not make the leaderboard.
    const verifiedOnly = !!session.verified_only;
    const counted = (verifiedOnly ? all.filter(r => r.verified === true) : all)
      .sort((a, b) => b.stats.avg - a.stats.avg);
    const myRow = all.find(r => r.mine) || null;
    const myExcluded = !!(myRow && !counted.includes(myRow));

    if(counted.length === 0 && !myRow){
      body.innerHTML = verifiedOnly
        ? '<div class="empty">No verified measurements were recorded for this session.</div>'
        : '<div class="empty">No measurements were recorded for this session.</div>';
      return;
    }

    // Time-anchored history from a stored curve: map each bucket to its real session
    // time and drop the empty (null) buckets, so the line shows only where measured.
    const ledsToHist = leds => {
      const n = leds.length;
      return leds.map((v, k) => ({ t: n > 1 ? (k / (n - 1)) * durationMs : 0, led: v }))
                 .filter(p => p.led != null);
    };

    // Group curve: per-bucket average across the counted racers (null where nobody).
    // It is also the source of truth for the big GROUP AVERAGE, so the number matches
    // the blue line on the chart.
    const maxLen = counted.reduce((m, r) => Math.max(m, r.curve.length), 0);
    const groupLeds = [];
    for(let i = 0; i < maxLen; i++){
      let sum = 0, n = 0;
      for(const r of counted){ const v = r.curve[i]; if(v != null){ sum += v; n++; } }
      groupLeds.push(n ? sum / n : null);
    }
    const groupReal = groupLeds.filter(v => v != null);
    const groupAvg = groupReal.length ? groupReal.reduce((s, v) => s + v, 0) / groupReal.length : 0;

    const hostResult = counted.find(r => r.host);
    const pulseHist = {
      host: hostResult ? ledsToHist(hostResult.curve) : [],
      group: ledsToHist(groupLeds),
      me: myRow ? ledsToHist(myRow.curve) : [],   // your own line always shows
    };
    const groupStats = counted.length
      ? { avg: groupAvg, peak: Math.max(0, ...counted.map(r => r.stats.peak)),
          steadiness: Math.round(counted.reduce((s, r) => s + r.stats.steadiness, 0) / counted.length) }
      : null;
    const pulseStats = {
      host: hostResult ? hostResult.stats : null,
      group: groupStats,
      me: myRow ? myRow.stats : null,
    };
    const fmtAvg = s => s ? s.avg.toFixed(1) : '–';
    const fmtPeak = s => s ? s.peak : '–';

    const pulsePanel = `
      <div class="session-pulse">
        <div class="sp-head">
          <span class="sp-title">Session pulse</span>
          <div class="sp-legend">
            <span class="leg-item leg-host"><i class="leg-dot"></i>Host</span>
            <span class="leg-item leg-group"><i class="leg-dot"></i>Group</span>
            <span class="leg-item leg-me"><i class="leg-dot"></i>You</span>
          </div>
        </div>
        <canvas class="sp-chart" id="spChartRes"></canvas>
        <div class="sp-metrics">
          <div class="sp-col"><div class="sp-col-head leg-host"><i class="leg-dot"></i><span class="sp-col-name">${esc(hostResult ? hostResult.name : (session.created_by || 'Host'))}</span></div>
            <div class="sp-stats"><div class="ss"><div class="ss-val">${fmtAvg(pulseStats.host)}</div><div class="ss-lbl">Avg</div></div>
            <div class="ss"><div class="ss-val">${fmtPeak(pulseStats.host)}</div><div class="ss-lbl">Peak</div></div>
            <div class="ss"><div class="ss-val">${pulseStats.host ? pulseStats.host.steadiness : '–'}</div><div class="ss-lbl">Steady</div></div></div></div>
          <div class="sp-col"><div class="sp-col-head leg-group"><i class="leg-dot"></i><span class="sp-col-name">Group</span></div>
            <div class="sp-stats"><div class="ss"><div class="ss-val">${fmtAvg(pulseStats.group)}</div><div class="ss-lbl">Avg</div></div>
            <div class="ss"><div class="ss-val">${fmtPeak(pulseStats.group)}</div><div class="ss-lbl">Peak</div></div>
            <div class="ss"><div class="ss-val">${pulseStats.group ? pulseStats.group.steadiness : '–'}</div><div class="ss-lbl">Steady</div></div></div></div>
          <div class="sp-col"><div class="sp-col-head leg-me"><i class="leg-dot"></i><span class="sp-col-name">${myRow ? 'You' : 'You (not joined)'}</span></div>
            <div class="sp-stats"><div class="ss"><div class="ss-val">${fmtAvg(pulseStats.me)}</div><div class="ss-lbl">Avg</div></div>
            <div class="ss"><div class="ss-val">${fmtPeak(pulseStats.me)}</div><div class="ss-lbl">Peak</div></div>
            <div class="ss"><div class="ss-val">${pulseStats.me ? pulseStats.me.steadiness : '–'}</div><div class="ss-lbl">Steady</div></div></div></div>
        </div>
      </div>`;

    const vBadge = r => r.verified === true ? '<span class="v-badge verified">✓</span>'
      : r.verified === false ? '<span class="v-badge unverified">unverified</span>' : '';
    const racerCard = (r, rankLabel, canvasId, note) => `
      <div class="res-card${r.mine ? ' mine' : ''}" data-cid="${canvasId}">
        <div class="res-rank">${rankLabel}</div>
        <div class="res-main">
          <div class="racer-name-row"><span class="racer-name">${esc(r.name)}</span>${flagImg(r.country)}${r.host ? '<span class="host-tag">Host</span>' : ''}${vBadge(r)}</div>
          ${note ? `<div class="res-note" style="font-size:12px;color:#e9b84a;margin:2px 0 6px">${esc(note)}</div>` : ''}
          <canvas class="res-curve" id="${canvasId}"></canvas>
          ${zoneBar(r.stats.zone)}
          <div class="res-expand-row"><button type="button" class="res-expand" aria-label="Show full chart" aria-expanded="false"><span class="re-show">Chart</span><span class="re-hide">Hide</span><span class="re-car">▾</span></button></div>
        </div>
        <div class="res-stats">
          <div class="rs"><div class="rs-val">${r.stats.avg.toFixed(1)}</div><div class="rs-lbl">Avg</div></div>
          <div class="rs"><div class="rs-val">${r.stats.peak}</div><div class="rs-lbl">Peak</div></div>
          <div class="rs"><div class="rs-val">${r.stats.steadiness}</div><div class="rs-lbl">Steady</div></div>
          <div class="rs"><div class="rs-val rs-trend">${esc(trendLabel(r.stats.trendTotal))}</div><div class="rs-lbl">Trend</div></div>
        </div>
        <div class="res-expanded"><div class="res-big-wrap"><canvas id="${canvasId}-big"></canvas></div></div>
      </div>`;

    // Leaderboard (group average + category winners + ranked racers) — only what counts.
    let leaderboardHtml = '';
    if(counted.length){
      const winners = CATEGORIES.map(cat => {
        let best = null;
        for(const r of counted){ const v = cat.value(r.stats); if(best === null || v > best.v) best = { name: r.name, v, country: r.country }; }
        return { cat, best };
      });
      const catCards = winners.map(w => `
        <div class="cat-card">
          <div class="cat-icon">${icon(w.cat.icon)}</div>
          <div class="cat-name">${esc(w.cat.name)}</div>
          <div class="cat-desc">${esc(w.cat.desc)}</div>
          <div class="cat-winner">${w.best ? `${esc(w.best.name)}${flagInline(w.best.country)} · ${esc(w.cat.fmt(w.best.v))}` : '—'}</div>
        </div>`).join('');
      const countedCards = counted.map((r, i) => racerCard(r, String(i + 1), 'rc' + i)).join('');
      leaderboardHtml = `
        <div class="res-group">
          <div class="res-group-val" style="color:${zText(Math.round(groupAvg))}">${groupAvg.toFixed(1)}</div>
          <div class="res-group-lbl">Group average · ${counted.length} racer${counted.length > 1 ? 's' : ''} · finished${verifiedOnly ? ' · verified only' : ''}</div>
        </div>

        <h2 class="res-h">Category winners</h2>
        <div class="cat-grid">${catCards}</div>

        <h2 class="res-h">All racers <span class="res-h-sub">ranked by average</span></h2>
        <div class="res-list">${countedCards}</div>`;
    }

    // The viewer's own measurement, shown even if it did not make a verified-only board.
    let mineHtml = '';
    if(myExcluded){
      mineHtml = `
        <h2 class="res-h">Your measurement <span class="res-h-sub">${counted.length ? 'not counted on the leaderboard' : 'recorded'}</span></h2>
        <div class="res-list">${racerCard(myRow, '–', 'rcMine', 'Recorded, but marked unverified — so it is not ranked in this verified-only session.')}</div>`;
    }

    const emptyNote = counted.length === 0
      ? '<p class="room-hint">No verified measurements made the leaderboard yet.</p>'
      : '';

    body.innerHTML = `
      ${pulsePanel}
      ${emptyNote}
      ${leaderboardHtml}
      ${mineHtml}

      <div class="metric-legend">
        <div><b>Avg</b> — ${esc(METRIC_HELP.avg)}</div>
        <div><b>Peak</b> — ${esc(METRIC_HELP.peak)}</div>
        <div><b>Steady</b> — ${esc(METRIC_HELP.steadiness)}</div>
        <div><b>Zone bar</b> — ${esc(METRIC_HELP.zones)}</div>
        <div><b>Trend</b> — ${esc(METRIC_HELP.trend)}</div>
        <div><b>✓ Verified</b> — Measurement looked genuine (no irregular hand-spinning).</div>
      </div>

      <p class="room-hint"><a href="#/sessions" class="link">← Back to sessions</a></p>
    `;

    const bigData = {};
    const sessDur = (session && session.duration_minutes) ? session.duration_minutes * 60 : 0;
    counted.forEach((r, i) => {
      const cv = body.querySelector('#rc' + i);
      if(cv) drawCurve(cv, ledsToHist(r.curve), vitalityColor(Math.round(r.stats.avg)));
      bigData['rc' + i] = { leds: (r.curve || []).filter(v => v != null), dur: sessDur };
    });
    if(myExcluded){
      const cv = body.querySelector('#rcMine');
      if(cv) drawCurve(cv, ledsToHist(myRow.curve), vitalityColor(Math.round(myRow.stats.avg)));
      bigData['rcMine'] = { leds: (myRow.curve || []).filter(v => v != null), dur: sessDur };
    }
    // Expandable full chart per racer (same as the Live wall) — drawn on open
    // (a hidden canvas has no size, so it can't be drawn ahead of time).
    body.addEventListener('click', (e) => {
      const btn = e.target.closest('.res-expand');
      if(!btn) return;
      const card = btn.closest('.res-card');
      if(!card) return;
      const open = card.classList.toggle('expanded');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if(open){
        const d = bigData[card.dataset.cid];
        const big = body.querySelector('#' + card.dataset.cid + '-big');
        if(d && big && d.leds.length > 1) drawVitalityChart(big, d.leds, d.dur || Math.round(d.leds.length * 0.75));
      }
    });

    drawTrio(body.querySelector('#spChartRes'), pulseHist, { durationMs });
  }

  window.addEventListener('resize', render);

  return () => {
    if(broadcastTimer) clearInterval(broadcastTimer);
    if(renderTimer) clearInterval(renderTimer);
    if(flushTimer) clearInterval(flushTimer);
    maybeSaveGroup();      // idempotent; only writes if the session has ended
    maybeSaveMyResult();
    flushSamples();
    if(unsubFrames) unsubFrames();
    if(unsubStatus) unsubStatus();
    if(unsubAuthGate) unsubAuthGate();
    presence.setSession(false);
    if(channel) supabase.removeChannel(channel);
    window.removeEventListener('resize', render);
  };
}
