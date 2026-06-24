// view-race.js — the Race room (#/race/:id, and #/join/<token> for race invites).
//
// PHASE 4 = LOBBY (premium waiting room). PHASE 5 = LIVE RACE ENGINE.
// PHASE 6 (separate) will add tail-drain, official result saving, the verified
// ranking and the results page. Phase 5 saves NOTHING to the DB.
//
// ── Realtime protocol ──────────────────────────────────────────────────────
// Channel: `room-<raceId>` (presence + broadcast), same as the lobby.
// Canonical slots (jitter-independent, identical for everyone):
//   SLOT_MS = 500;  TOTAL_SLOTS = round(duration_ms / 500)
//   slotIndex = floor((now - scheduledStart) / 500)
// Each client samples ITS OWN held de-spiked LED every 250ms and writes it into
// the current slot (first-write-wins → no double count, cumulative only grows).
// missing / disconnected slot = 0; out-of-range dropped. progress = cum/(24*TOTAL_SLOTS).
// Broadcast has no history, so every client ALSO publishes its state into presence
// (slot, cum, live, verified, firstSlot, clientId) every ~2.5s — a reconnecting or
// late client rebuilds the standings from presence, not from ticks. Fast updates
// ride a 500ms `race-tick` broadcast. Per identity (uid), the highest-cumulative
// state wins (multi-tab dedup; the wheel tab naturally leads, the empty tab can't
// overwrite). Ranked iff self-reported firstSlot <= RANKED_GRACE_SLOTS (first 5s) —
// self-reported so every client classifies the same roster deterministically.
// Start is driven ONLY by scheduled_start (slot 0); no host "start" button.
//
// Separate module from view-room.js on purpose (zero session-room regression).
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
function fmt(ms){
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

const racerId = name => name.trim().toLowerCase().replace(/\s+/g, '_');
const prefersReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  .rl-host .rl-av{width:26px;height:26px}
  .rl-av{width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;display:inline-block}
  .rl-av-init{display:inline-flex;align-items:center;justify-content:center;background:#eef0f2;color:#5a6571;font-weight:700;font-size:13px}
  .rl-meta{color:#67737c;font-size:13.5px;margin-top:4px}
  .rl-badges{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;align-items:center}
  .rl-badge{font-size:11px;font-weight:700;letter-spacing:.03em;border-radius:999px;padding:3px 9px}
  .rl-badge.invite{color:#5230da;background:rgba(82,48,218,.1)}
  .rl-badge.followers{color:#0e7490;background:rgba(14,116,144,.1)}
  .rl-badge.verified{color:#0f8a52;background:rgba(32,178,107,.12)}
  .rl-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}
  .rl-btn{display:inline-flex;align-items:center;gap:7px;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;
    padding:8px 14px;border-radius:999px;border:1px solid #dfe3e6;background:#fff;color:#011624;cursor:pointer;transition:border-color .15s,color .15s}
  .rl-btn:hover{border-color:#5230da;color:#5230da}
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
  /* 3-2-1 overlay (concentric energy ring) */
  .rl-countin{position:relative;display:flex;align-items:center;justify-content:center;height:150px;margin-top:6px}
  .rl-countin .rl-ring{position:absolute;width:120px;height:120px;border-radius:50%;border:2px solid rgba(82,48,218,.5)}
  .rl-countin .rl-ring.r2{width:160px;height:160px;border-color:rgba(55,219,255,.35)}
  .rl-countin .rl-ring.pulse{animation:rlRing 1s ease-out infinite}
  @keyframes rlRing{0%{transform:scale(.7);opacity:.9}100%{transform:scale(1.25);opacity:0}}
  .rl-countin .rl-num{font-family:'Montserrat',sans-serif;font-weight:700;font-size:64px;color:#5230da;animation:rlPop .9s ease-out}
  @keyframes rlPop{from{transform:scale(.6);opacity:.2}to{transform:scale(1);opacity:1}}
  .rl-prep{background:#011624;border-radius:16px;padding:22px 20px;text-align:center;box-shadow:0 14px 36px -16px rgba(1,22,36,.5)}
  .rl-prep b{display:block;font-family:'Montserrat',sans-serif;font-weight:600;font-size:20px;color:#fff;margin-bottom:5px}
  .rl-prep span{color:#aeb9c2;font-size:13.5px}
  .rl-prep .rl-prep-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#37dbff;margin-right:7px;animation:rlSoon 1.1s ease-in-out infinite}
  .rl-finished{background:#f7f8f8;border:1px solid #dfe3e6;border-radius:16px;padding:22px 20px;text-align:center}
  .rl-finished b{display:block;font-family:'Montserrat',sans-serif;font-weight:600;font-size:19px;color:#011624;margin-bottom:5px}
  .rl-finished span{color:#67737c;font-size:13.5px}
  /* lobby people */
  .rl-people-head{display:flex;align-items:center;justify-content:space-between;margin:8px 0 10px}
  .rl-people-title{font-family:'Montserrat',sans-serif;font-weight:600;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#67737c}
  .rl-count{font-size:13px;color:#99a2a7;font-weight:600}
  .rl-list{display:flex;flex-direction:column;gap:9px}
  .rl-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;
    background:#fff;border:1px solid #dfe3e6;border-radius:14px;padding:11px 14px;box-shadow:0 8px 22px rgba(1,22,36,.05)}
  .rl-row.me{border-color:rgba(82,48,218,.4);box-shadow:0 0 0 3px rgba(82,48,218,.08)}
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
  /* ── RACE TRACK (Phase 5) ─────────────────────────────────────────────── */
  .rr-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#011624;border-radius:14px;
    padding:12px 16px;margin-bottom:14px;box-shadow:0 14px 36px -18px rgba(1,22,36,.6)}
  .rr-bar .rr-live-pill{display:inline-flex;align-items:center;gap:7px;color:#fff;font-weight:700;font-size:13px;letter-spacing:.04em}
  .rr-bar .rr-live-pill .d{width:8px;height:8px;border-radius:50%;background:#37dbff;box-shadow:0 0 6px rgba(55,219,255,.7);animation:rlSoon 1.1s ease-in-out infinite}
  .rr-clock{font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;color:#fff}
  .rr-clock.final10{color:#ffd66b}
  .rr-watch{font-size:12.5px;color:#99a2a7;margin:0 0 10px}
  .rr-list{display:flex;flex-direction:column;gap:10px}
  .rr-lane{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:12px;
    background:#fff;border:1px solid #dfe3e6;border-radius:14px;padding:12px 14px;box-shadow:0 8px 22px rgba(1,22,36,.06);
    transition:box-shadow .25s,border-color .25s}
  .rr-lane.me{border-color:rgba(82,48,218,.5);box-shadow:0 0 0 3px rgba(82,48,218,.1)}
  .rr-lane.leader{border-color:rgba(217,165,32,.65);box-shadow:0 0 0 2px rgba(217,165,32,.35),0 10px 26px rgba(1,22,36,.08)}
  .rr-lane.unranked{opacity:.86}
  .rr-rank{font-family:'Montserrat',sans-serif;font-weight:700;font-size:17px;color:#011624;text-align:center;transition:transform .2s}
  .rr-rank.bump{animation:rrBump .5s ease-out}
  @keyframes rrBump{0%{transform:scale(1)}42%{transform:scale(1.4)}100%{transform:scale(1)}}
  .rr-lane.leader .rr-rank{color:#b8860b}
  .rr-rank.dash{color:#b9c0c6;font-size:13px}
  .rr-info{min-width:0}
  .rr-name-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:7px}
  .rr-name{font-weight:700;color:#011624;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
  .rr-tag{font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;padding:2px 6px}
  .rr-tag.host{color:#9a7400;background:rgba(245,183,0,.16)}
  .rr-tag.you{color:#5230da;background:rgba(82,48,218,.1)}
  .rr-tag.unranked{color:#67737c;background:#eef0f2}
  .rr-tag.unverified{color:#b3415a;background:rgba(240,68,56,.1)}
  /* RELATIVE race track — neutral & UNMARKED (no %); avatar puck races a checkered finish */
  .rr-track{position:relative;height:34px;border-radius:999px;background:#e8ecef;border:1px solid #dbe1e6;box-shadow:inset 0 1px 3px rgba(1,22,36,.1)}
  .rr-track::before{content:"";position:absolute;left:12px;right:16px;top:50%;height:2px;transform:translateY(-50%);
    background:repeating-linear-gradient(90deg,rgba(1,22,36,.06) 0 2px,transparent 2px 28px)}
  .rr-finish{position:absolute;right:4px;top:4px;bottom:4px;width:6px;border-radius:2px;
    background:repeating-linear-gradient(45deg,#011624 0 3px,#ffd66b 3px 6px);box-shadow:0 0 0 1px rgba(255,255,255,.6)}
  .rr-puck{position:absolute;top:50%;left:0;transform:translate(-50%,-50%);width:28px;height:28px;z-index:2;
    transition:left .6s cubic-bezier(.34,.8,.4,1)}
  .rr-puck-av{width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;background:#cfd6db;
    box-shadow:0 0 0 2px #fff,0 2px 6px rgba(1,22,36,.32)}
  .rr-puck-init{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;
    background:#5230da;color:#fff;font-weight:700;font-size:12px;box-shadow:0 0 0 2px #fff,0 2px 6px rgba(1,22,36,.32)}
  .rr-lane.leader .rr-puck-av,.rr-lane.leader .rr-puck-init{box-shadow:0 0 0 2px #ffd66b,0 0 0 4px rgba(217,165,32,.38),0 2px 6px rgba(1,22,36,.32)}
  .rr-lane.me .rr-puck-av,.rr-lane.me .rr-puck-init{box-shadow:0 0 0 2px #7a5cf0,0 0 0 4px rgba(82,48,218,.32),0 2px 6px rgba(1,22,36,.32)}
  .rr-lane.stale .rr-puck-av,.rr-lane.stale .rr-puck-init{box-shadow:0 0 0 2px #f5b700,0 0 0 4px rgba(245,183,0,.32),0 2px 6px rgba(1,22,36,.32)}
  .rr-tail{position:absolute;top:50%;right:16px;transform:translateY(-50%);width:36px;height:10px;border-radius:999px;
    background:linear-gradient(90deg,rgba(55,219,255,0),rgba(55,219,255,.85));opacity:0;transition:opacity .25s;pointer-events:none}
  .rr-lane.moving .rr-tail{opacity:1}
  .rr-nums{text-align:right;min-width:66px}
  .rr-livev{font-family:'Montserrat',sans-serif;font-weight:700;font-size:21px;line-height:1}
  .rr-score{font-size:11px;color:#67737c;font-weight:600;margin-top:3px;white-space:nowrap}
  .rr-live-wrap{display:flex;flex-direction:column;align-items:flex-end}
  .rr-live-lbl{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#99a2a7;margin-top:1px}
  .rr-conn{font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;padding:2px 7px;display:inline-flex;align-items:center;gap:4px}
  .rr-conn[hidden]{display:none}
  .rr-conn.reconnecting{color:#8a6d00;background:rgba(245,183,0,.16)}
  .rr-conn.disconnected{color:#67737c;background:#eef0f2}
  .rr-conn .d{width:5px;height:5px;border-radius:50%;background:currentColor}
  .rr-conn.reconnecting .d{animation:rlSoon 1.2s ease-in-out infinite}
  .rr-note{font-size:11.5px;color:#99a2a7;margin:0 0 12px;display:flex;align-items:center;gap:6px;line-height:1.4}
  @media (prefers-reduced-motion: reduce){
    .rr-puck{transition:none}.rr-lane.moving .rr-tail{opacity:0}.rr-rank.bump{animation:none}
    .rl-pill.practicing .d,.rl-pill.reconnecting .d,.rr-bar .rr-live-pill .d{animation:none}
  }
  @media (max-width:600px){
    .rl-title{font-size:23px}
    .rl-row{grid-template-columns:auto 1fr;gap:10px 12px}
    .rl-right{grid-column:1 / -1;flex-direction:row;align-items:center;justify-content:space-between;width:100%}
    .rr-lane{grid-template-columns:26px 1fr;gap:8px 10px}
    .rr-track{height:40px}
    .rr-nums{grid-column:1 / -1;display:flex;align-items:center;gap:14px;justify-content:flex-start;text-align:left;min-width:0}
    .rr-live-wrap{align-items:flex-start}
    .rr-score{margin-top:0}
  }`;
  document.head.appendChild(st);
}

export function mount(el, raceId, inviteToken = null){
  injectRaceStyles();
  let session = null, startMs = 0, endMs = 0, durationMs = 0, TOTAL_SLOTS = 0, hostAvatar = null;
  let myName = (auth.getState().displayName || localStorage.getItem('ewr_name') || '').trim();
  const myUid = auth.getState().user?.id || null;
  const myClientId = 'c' + Math.random().toString(36).slice(2, 9);
  const myId = myUid ? 'u:' + myUid : 'n:' + racerId(myName || 'guest');

  let channel = null;
  let bleConnected = false, myLed = 0, myEma = 0;
  let view = null;              // 'lobby' | 'race' | 'final'
  let countin = null;           // last 3-2-1 number shown

  // My canonical race state (Phase 5; Phase 6 reads these to finalize + save).
  let mySlots = null, myCumulative = 0, myFirstSlot = null, myVerified = true;
  let swingWin = [], swings = 0, wasSwing = false, cheatDetected = false;

  let engineTimer = null, netTimer = null, presenceTimer = null, paintTimer = null, phaseTimer = null;
  let unsubFrames = null, unsubStatus = null;

  // roster: identity -> { id, name, uid, clientId, avatar, country, host, wheel,
  //                       live:{led,ts}, slot, cum, verified, firstSlot, lastSeen }
  const roster = new Map();

  const SLOT_MS = 500, SAMPLE_MS = 250, BROADCAST_MS = 500, PRESENCE_MS = 2500;
  const RACE_VISUAL_SPREAD = 1.5;   // tune 1.3–1.8 on the live test — spreads the field on the RELATIVE track
  const RANKED_GRACE_SLOTS = 10;             // first valid tick within 5s → ranked
  const LIVE_STALE_MS = 4000, RECONNECT_MS = 12000;
  const CHEAT_WINDOW_MS = 2000, SWING_LIMIT = 7, MAX_SWINGS = 2;

  const zText = led => led < 6 ? '#c2415b' : led < 13 ? '#b8860b' : '#0f8a52';
  const isHostName = name => session && name && name.trim().toLowerCase() === (session.created_by || '').trim().toLowerCase();
  const phase = () => { const n = Date.now(); return n < startMs ? 'pre' : n <= endMs ? 'active' : 'post'; };
  const curSlot = () => Math.floor((Date.now() - startMs) / SLOT_MS);
  const progressOf = cum => TOTAL_SLOTS ? Math.max(0, Math.min(1, (cum || 0) / (24 * TOTAL_SLOTS))) : 0;

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
    if(session.event_type !== 'race'){ location.hash = '#/room/' + raceId; return; }
    startMs = new Date(session.scheduled_start).getTime();
    durationMs = (session.duration_minutes || 0) * 60000;
    endMs = startMs + durationMs;
    TOTAL_SLOTS = Math.max(1, Math.round(durationMs / SLOT_MS));

    const accessMode = session.access_mode || 'public';
    const meId = auth.getState().user?.id || null;
    const isHostUser = !!(meId && session.created_by_user_id && meId === session.created_by_user_id);
    let accessOk = accessMode === 'public' || isHostUser;
    if(!accessOk && accessMode === 'invite') accessOk = !!(inviteToken && session.invite_token && inviteToken === session.invite_token);
    if(!accessOk && accessMode === 'followers') accessOk = !!(meId && await auth.isConnectedTo(session.created_by_user_id));
    if(!accessOk){ renderLocked(accessMode); return; }

    if(session.created_by_user_id){
      const { data: hp } = await supabase.from('profiles').select('avatar_url').eq('id', session.created_by_user_id).maybeSingle();
      if(hp) hostAvatar = hp.avatar_url || null;
    }
    renderHead();
    enter();
  })();

  function avatarHtml(url, name, cls){
    if(url) return `<img class="${cls || 'rl-av'}" src="${esc(url)}" alt="">`;
    return `<span class="${cls || 'rl-av'} ${(cls || 'rl-av').includes('rr') ? 'rr-av-init' : 'rl-av-init'}">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
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
      } else { body = `This race is for ${esc(host)}'s connected members.`; }
    }
    $('rlBody').innerHTML = `<div class="rl-locked"><h2>${title}</h2><p>${body}</p>
      <div class="rl-actions">${cta}<a class="link" href="#/my-races">Back to races</a></div></div>`;
  }

  // ---- Entry: name gate, then start everything -------------------------------
  function enter(){
    if(myName){ begin(); return; }
    $('rlBody').innerHTML = `<div class="rl-gate">
      <label for="rlName" style="font-weight:700;color:#011624">Your name</label>
      <input type="text" id="rlName" maxlength="60" placeholder="Your name">
      <button type="button" class="rl-join" id="rlJoin">Join</button></div>`;
    const input = $('rlName'); input.focus();
    $('rlJoin').addEventListener('click', () => {
      const v = input.value.trim();
      if(!v) return;
      myName = v; try { localStorage.setItem('ewr_name', v); } catch {}
      begin();
    });
  }

  function begin(){
    joinChannel();
    unsubStatus = ble.subscribeStatus(s => { bleConnected = s.connected; if(!s.connected){ myLed = 0; } trackPresence(); });
    unsubFrames = ble.subscribeFrames(f => {
      myLed = f.led;
      if(phase() === 'active'){
        const now = Date.now();
        swingWin.push({ t: now, led: f.led });
        swingWin = swingWin.filter(x => now - x.t <= CHEAT_WINDOW_MS);
        const leds = swingWin.map(x => x.led);
        const swingNow = (Math.max(...leds) - Math.min(...leds)) >= SWING_LIMIT;
        if(swingNow && !wasSwing && !cheatDetected && ++swings >= MAX_SWINGS){ cheatDetected = true; myVerified = false; }
        wasSwing = swingNow;
      }
    });

    engineTimer = setInterval(sample, SAMPLE_MS);
    netTimer = setInterval(broadcastState, BROADCAST_MS);
    presenceTimer = setInterval(trackPresence, PRESENCE_MS);
    paintTimer = setInterval(paint, 300);
    phaseTimer = setInterval(applyView, 1000);
    applyView();
  }

  // ---- Channel ---------------------------------------------------------------
  function joinChannel(){
    channel = supabase.channel('room-' + raceId, {
      config: { broadcast: { self: false }, presence: { key: myClientId } },
    });
    channel.on('broadcast', { event: 'lobby-tick' }, ({ payload }) => {
      if(!payload || !payload.id) return;
      const r = ensureEntry(payload);
      r.live = { led: payload.led, ts: Date.now() }; r.lastSeen = Date.now();
    });
    channel.on('broadcast', { event: 'race-tick' }, ({ payload }) => {
      if(!payload || !payload.id) return;
      acceptRacerState(payload);
    });
    channel.on('presence', { event: 'sync' }, syncPresence);
    channel.subscribe(status => { if(status === 'SUBSCRIBED') trackPresence(); });
  }

  function ensureEntry(p){
    let r = roster.get(p.id);
    if(!r){ r = { id: p.id, name: p.name, cum: 0, slot: -1, firstSlot: null, verified: true, live: { led: 0, ts: 0 } }; roster.set(p.id, r); }
    if(p.name) r.name = p.name;
    if(p.uid !== undefined) r.uid = p.uid;
    if(p.avatar) r.avatar = p.avatar;
    if(p.country) r.country = p.country;
    if(p.wheel !== undefined) r.wheel = !!p.wheel;
    r.host = isHostName(r.name);
    return r;
  }

  // Per identity, the highest-cumulative state wins (multi-tab dedup: the wheel
  // tab leads; an empty second tab at cum 0 can never overwrite it). Same client
  // always advances its own entry.
  function acceptRacerState(p){
    const r = ensureEntry(p);
    const better = (p.clientId && p.clientId === r.clientId) || r.cum == null || (p.cum || 0) >= (r.cum || 0);
    if(!better) return;
    r.clientId = p.clientId || r.clientId;
    r.slot = p.slot != null ? p.slot : r.slot;
    r.cum = p.cum || 0;
    r.live = { led: p.live || 0, ts: Date.now() };
    r.verified = p.verified !== false;
    if(p.firstSlot != null) r.firstSlot = (r.firstSlot == null) ? p.firstSlot : Math.min(r.firstSlot, p.firstSlot);
    r.lastSeen = Date.now();
  }

  function trackPresence(){
    if(!channel) return;
    channel.track({
      id: myId, clientId: myClientId, name: myName, uid: myUid,
      avatar: auth.getState().avatarUrl || null, country: auth.getState().country || null,
      wheel: bleConnected, slot: curSlot(), cum: myCumulative, live: Math.round(myEma),
      verified: myVerified, firstSlot: myFirstSlot, ts: Date.now(),
    }).catch(() => {});
  }

  // Presence is the RECOVERY channel — rebuild standings for reconnect / late join.
  function syncPresence(){
    const state = channel ? channel.presenceState() : {};
    const seen = new Set();
    for(const metas of Object.values(state)){
      const m = metas[metas.length - 1];
      if(!m || !m.id) continue;
      seen.add(m.id);
      ensureEntry(m);
      // Seed race state from the snapshot (broadcast keeps it fresh afterwards).
      if(phase() !== 'pre') acceptRacerState(m);
      else { const r = roster.get(m.id); if(r){ r.lastSeen = Date.now(); } }
    }
    // Drop people who left presence AND aren't a still-relevant racer with score.
    for(const [id, r] of roster){
      if(!seen.has(id) && !((r.cum || 0) > 0 && phase() !== 'pre')) roster.delete(id);
    }
    if(view) (view === 'race' ? renderRaceList() : renderLobbyList());
  }

  // ---- Sampling / scoring (canonical slots) ----------------------------------
  function sample(){
    // live "speed" EMA always tracks (decays to 0 on disconnect).
    const raw = bleConnected ? myLed : 0;
    myEma = myEma == null ? raw : myEma * 0.7 + raw * 0.3;
    if(phase() !== 'active' || !mySlots) return;
    const slot = curSlot();
    if(slot < 0 || slot >= TOTAL_SLOTS) return;          // out of range dropped
    if(bleConnected && myFirstSlot === null) myFirstSlot = slot;   // first contributing slot → ranked window
    if(mySlots[slot] === undefined){                      // first-write-wins → no double count, monotonic
      mySlots[slot] = raw;
      myCumulative += raw;
    }
    // Keep my own roster entry live without waiting for the (self:false) echo.
    const me = ensureEntry({ id: myId, name: myName, uid: myUid, avatar: auth.getState().avatarUrl, country: auth.getState().country, wheel: bleConnected });
    me.clientId = myClientId; me.slot = slot; me.cum = myCumulative; me.live = { led: Math.round(myEma), ts: Date.now() };
    me.verified = myVerified; me.firstSlot = myFirstSlot; me.lastSeen = Date.now();
  }

  function broadcastState(){
    if(!channel) return;
    const ph = phase();
    if(ph === 'pre'){
      if(!bleConnected) return;
      channel.send({ type: 'broadcast', event: 'lobby-tick',
        payload: { id: myId, name: myName, uid: myUid, led: myLed, country: auth.getState().country || null, avatar: auth.getState().avatarUrl || null, wheel: true } });
    } else if(ph === 'active'){
      channel.send({ type: 'broadcast', event: 'race-tick',
        payload: { id: myId, clientId: myClientId, name: myName, uid: myUid, slot: curSlot(),
          cum: myCumulative, live: Math.round(myEma), verified: myVerified, firstSlot: myFirstSlot,
          country: auth.getState().country || null, avatar: auth.getState().avatarUrl || null, wheel: bleConnected } });
    }
  }

  // ---- View switching (pre → race → final), driven only by scheduled_start ---
  function applyView(){
    const ph = phase();
    if(ph === 'pre'){
      if(view !== 'lobby'){ buildLobby(); view = 'lobby'; }
      updateLobbyStage();
    } else if(ph === 'active'){
      if(view !== 'race'){ onRaceStart(); buildRace(); view = 'race'; }
      updateRaceStage();
    } else {
      if(view !== 'final'){ buildFinalizing(); view = 'final'; }
    }
  }

  function onRaceStart(){
    // Drop practice scaffolding; the official window begins at slot 0.
    mySlots = new Array(TOTAL_SLOTS); myCumulative = 0; myFirstSlot = (phase() === 'active' && bleConnected) ? curSlot() : null;
    // A client opening mid-race is a late entry; firstSlot may already be > grace.
  }

  // ---- LOBBY (Phase 4) -------------------------------------------------------
  function buildLobby(){
    $('rlBody').innerHTML = `
      <div class="rl-stage" id="rlStage"></div>
      <div class="rl-people-head"><span class="rl-people-title">In the lobby</span><span class="rl-count" id="rlCount">0 here</span></div>
      <div class="rl-list" id="rlList"><div class="rl-empty">Waiting for racers to arrive…</div></div>`;
    renderLobbyList();
  }
  function lobbyStatus(p){
    const now = Date.now(); const lv = p.live; const fresh = lv && (now - lv.ts < LIVE_STALE_MS);
    if(p.wheel && fresh && lv.led > 0) return { key: 'practicing', label: 'Practicing' };
    if(p.wheel && lv && !fresh && (now - lv.ts < RECONNECT_MS)) return { key: 'reconnecting', label: 'Reconnecting' };
    if(p.wheel) return { key: 'ready', label: 'Wheel ready' };
    return { key: 'lobby', label: 'In lobby' };
  }
  function sortedLobby(){
    return [...roster.values()].sort((a, b) => {
      if(a.host !== b.host) return a.host ? -1 : 1;
      const am = a.id === myId, bm = b.id === myId;
      if(am !== bm) return am ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }
  function renderLobbyList(){
    const list = $('rlList'), count = $('rlCount'); if(!list) return;
    const arr = sortedLobby();
    if(count) count.textContent = arr.length + ' here';
    list.innerHTML = arr.length ? arr.map(p => {
      const st = lobbyStatus(p), mine = p.id === myId, lv = p.live, showLive = st.key === 'practicing' && lv;
      const tags = (p.host ? '<span class="rl-tag host">Host</span>' : '') + (mine ? '<span class="rl-tag you">You</span>' : '');
      return `<div class="rl-row ${st.key === 'practicing' ? 'practicing' : ''} ${mine ? 'me' : ''}" data-id="${esc(p.id)}">
        ${avatarHtml(p.avatar, p.name)}
        <div class="rl-mid"><div class="rl-name-row"><span class="rl-name">${esc(p.name)}</span>${flagImg(p.country)}${tags}</div>
          <div class="rl-track"><span class="rl-pulse"></span></div></div>
        <div class="rl-right"><span class="rl-pill ${st.key}"><span class="d"></span>${st.label}</span>
          <span class="rl-live" style="color:${showLive ? zText(lv.led) : 'transparent'}">${showLive ? lv.led : ''}</span></div>
      </div>`;
    }).join('') : '<div class="rl-empty">Waiting for racers to arrive…</div>';
  }
  function paintLobby(){
    const list = $('rlList'); if(!list) return;
    const arr = sortedLobby();
    if(arr.length !== list.querySelectorAll('.rl-row').length){ renderLobbyList(); return; }
    for(const p of arr){
      const row = list.querySelector(`.rl-row[data-id="${CSS.escape(p.id)}"]`); if(!row) continue;
      const st = lobbyStatus(p), lv = p.live, showLive = st.key === 'practicing' && lv;
      row.classList.toggle('practicing', st.key === 'practicing');
      const pill = row.querySelector('.rl-pill'); if(pill){ pill.className = 'rl-pill ' + st.key; pill.innerHTML = `<span class="d"></span>${st.label}`; }
      const liveEl = row.querySelector('.rl-live'); if(liveEl){ liveEl.textContent = showLive ? lv.led : ''; liveEl.style.color = showLive ? zText(lv.led) : 'transparent'; }
    }
  }
  function updateLobbyStage(){
    const stage = $('rlStage'); if(!stage) return;
    const left = startMs - Date.now(), soon = left <= 60000;
    if(left <= 3000 && left > 0){
      const n = Math.ceil(left / 1000);
      if(countin !== n){ countin = n; }
      stage.innerHTML = `<div class="rl-practice"><b>Get ready</b><span>The official race is about to begin.</span></div>
        <div class="rl-countin"><span class="rl-ring r2 pulse"></span><span class="rl-ring pulse"></span><span class="rl-num">${n}</span></div>`;
      return;
    }
    stage.innerHTML = `<div class="rl-practice"><b>Practice room open</b>
        <span>Spin together while you wait. Practice readings are not saved or included in the race.</span></div>
      <div class="rl-cd ${soon ? 'soon' : ''}"><span class="rl-cd-lbl">Race starts</span>
        <span class="rl-cd-val">${soon ? fmt(Math.max(0, left)) : 'in ' + formatUntil(left)}</span></div>`;
  }

  // ---- RACE (Phase 5) --------------------------------------------------------
  // Stable lane order (no 500ms reshuffles) — the rank BADGE updates, markers move.
  let raceOrder = null;
  function buildRace(){
    $('rlBody').innerHTML = `
      <div class="rr-bar">
        <span class="rr-live-pill"><span class="d"></span>LIVE RACE</span>
        <span class="rr-clock" id="rrClock">--:--</span>
      </div>
      <p class="rr-watch" id="rrWatch"></p>
      <p class="rr-note"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11.5v4.5M12 8h.01"/></svg>Track position shows the live race order. Official results use the measured score.</p>
      <div class="rr-list" id="rrList"></div>
      <div class="rl-stage" id="rlStage" style="margin-top:16px"></div>`;
    raceOrder = null;
    renderRaceList();
  }
  function racers(){
    // Anyone who has (or had) a wheel this race = a racer; pure spectators excluded.
    return [...roster.values()].filter(p => p.firstSlot != null || (p.cum || 0) > 0 || p.wheel);
  }
  function isRanked(p){ return p.firstSlot != null && p.firstSlot <= RANKED_GRACE_SLOTS; }
  function renderRaceList(){
    const list = $('rrList'); if(!list) return;
    const all = racers();
    if(!raceOrder){
      // Lock the lane order once (host, you, then by name) so lanes don't jump.
      raceOrder = all.slice().sort((a, b) => {
        if(a.host !== b.host) return a.host ? -1 : 1;
        const am = a.id === myId, bm = b.id === myId; if(am !== bm) return am ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      }).map(p => p.id);
    } else {
      for(const p of all) if(!raceOrder.includes(p.id)) raceOrder.push(p.id);   // late entries append
    }
    const ordered = raceOrder.map(id => roster.get(id)).filter(Boolean);
    list.innerHTML = ordered.map(laneHtml).join('') || '<div class="rl-empty">No racers yet.</div>';
    paintRace();
  }
  function laneHtml(p){
    const mine = p.id === myId, ranked = isRanked(p);
    const tags = (p.host ? '<span class="rr-tag host">Host</span>' : '')
      + (mine ? '<span class="rr-tag you">You</span>' : '')
      + (!ranked ? '<span class="rr-tag unranked">Late · Unranked</span>' : '')
      + (p.verified === false ? '<span class="rr-tag unverified">Unverified</span>' : '');
    const puck = p.avatar
      ? `<img class="rr-puck-av" src="${esc(p.avatar)}" alt="">`
      : `<span class="rr-puck-init">${esc((p.name || '?').charAt(0).toUpperCase())}</span>`;
    return `<div class="rr-lane ${mine ? 'me' : ''} ${ranked ? '' : 'unranked'}" data-id="${esc(p.id)}" data-rank="">
      <div class="rr-rank dash">–</div>
      <div class="rr-info">
        <div class="rr-name-row"><span class="rr-name">${esc(p.name)}</span>${flagImg(p.country)}${tags}<span class="rr-conn" hidden></span></div>
        <div class="rr-track"><span class="rr-finish"></span><span class="rr-puck"><span class="rr-tail"></span>${puck}</span></div>
      </div>
      <div class="rr-nums"><div class="rr-live-wrap"><div class="rr-livev">0</div><div class="rr-live-lbl">Live</div></div><div class="rr-score">SCORE 0</div></div>
    </div>`;
  }
  // RELATIVE race presentation. The OFFICIAL score is untouched — this only maps
  // each racer to a visual track position so realistic 3–7 averages still spread
  // out and read as a real race. Leader advances with TIME toward the finish;
  // everyone else trails by their score ratio to the leader. NOT saved, NOT a
  // result input — the winner is still the highest real race_score.
  function visualPos(score, leaderScore, leaderPos){
    if(!(score > 0)) return 0;                              // zero score → start gate
    const ratio = leaderScore > 0 ? score / leaderScore : 0;
    return Math.max(0, Math.min(96, leaderPos * Math.pow(ratio, RACE_VISUAL_SPREAD)));
  }
  function paintRace(){
    const list = $('rrList'); if(!list) return;
    const all = racers();
    if(raceOrder && all.length !== raceOrder.length){ renderRaceList(); return; }
    const rankedSorted = all.filter(isRanked).sort((a, b) => (b.cum || 0) - (a.cum || 0));
    const rankById = new Map(rankedSorted.map((p, i) => [p.id, i + 1]));
    const leaderId = rankedSorted.length ? rankedSorted[0].id : null;
    const leaderScore = leaderId ? (rankedSorted[0].cum || 0) : 0;
    const elapsedRatio = Math.max(0, Math.min(1, durationMs ? (Date.now() - startMs) / durationMs : 0));
    const leaderPos = 8 + elapsedRatio * 88;                // leader: 8% → 96% over the race
    const reduce = prefersReducedMotion();
    const now = Date.now();
    for(const p of all){
      const row = list.querySelector(`.rr-lane[data-id="${CSS.escape(p.id)}"]`); if(!row) continue;
      const ranked = isRanked(p);
      const racerLike = p.firstSlot != null || (p.cum || 0) > 0;
      const sinceSeen = p.lastSeen ? now - p.lastSeen : Infinity;
      const gone = sinceSeen > RECONNECT_MS;                 // off the wire (presence/network lost)
      const reconnecting = !gone && (p.wheel === false || sinceSeen > LIVE_STALE_MS);
      const disrupted = gone || reconnecting;
      const lv = disrupted ? 0 : (p.live ? p.live.led : 0);  // disrupted → speed 0; puck stays; score unchanged
      const score = p.cum || 0;
      const isLeader = ranked && p.id === leaderId && score > 0;

      // Rank badge + a brief impulse when the position changes (overtake).
      const rankEl = row.querySelector('.rr-rank');
      const newRank = ranked ? (rankById.get(p.id) || '–') : '–';
      if(ranked){ rankEl.textContent = newRank; rankEl.classList.remove('dash'); }
      else { rankEl.textContent = '–'; rankEl.classList.add('dash'); }
      if(!reduce && ranked && row.dataset.rank && String(row.dataset.rank) !== String(newRank)){
        rankEl.classList.remove('bump'); void rankEl.offsetWidth; rankEl.classList.add('bump');
      }
      row.dataset.rank = String(newRank);

      row.classList.toggle('leader', isLeader);
      row.classList.toggle('moving', lv > 0 && !disrupted);
      row.classList.toggle('stale', disrupted && racerLike);
      const conn = row.querySelector('.rr-conn');
      if(conn){
        if(gone && racerLike){ conn.hidden = false; conn.className = 'rr-conn disconnected'; conn.innerHTML = '<span class="d"></span>Disconnected'; }
        else if(reconnecting && racerLike){ conn.hidden = false; conn.className = 'rr-conn reconnecting'; conn.innerHTML = '<span class="d"></span>Reconnecting'; }
        else conn.hidden = true;
      }

      const puck = row.querySelector('.rr-puck');
      if(puck){ puck.style.transition = reduce ? 'none' : ''; puck.style.left = visualPos(score, leaderScore, leaderPos).toFixed(1) + '%'; }

      const liveEl = row.querySelector('.rr-livev'); if(liveEl){ liveEl.textContent = lv; liveEl.style.color = lv > 0 ? zText(lv) : '#99a2a7'; }
      const scoreEl = row.querySelector('.rr-score');
      if(scoreEl){
        if(isLeader) scoreEl.innerHTML = `SCORE ${score} · <span style="color:#b8860b">LEADER</span>`;
        else if(ranked && leaderScore > 0){ const gap = leaderScore - score; scoreEl.textContent = `SCORE ${score}${gap > 0 ? ` · ${gap} behind` : ''}`; }
        else scoreEl.textContent = `SCORE ${score}`;
      }
    }
    const watch = $('rrWatch');
    if(watch){ const n = roster.size - all.length; watch.textContent = n > 0 ? `${all.length} racing · ${n} watching` : `${all.length} racing`; }
  }
  function updateRaceStage(){
    const clock = $('rrClock'); if(clock){ const left = endMs - Date.now(); clock.textContent = fmt(Math.max(0, left)) + ' left'; clock.classList.toggle('final10', left <= 10000); }
  }

  // ---- Finalizing (Phase 5 end; Phase 6 will save + show official results) ---
  function buildFinalizing(){
    // Slot collection stops (sample() bails when phase !== active). The full
    // canonical series (mySlots) + standings stay in memory for the Phase 6 hook.
    // PHASE 6 HOOK: tail-drain → compute final stats → save results → results page.
    const all = racers().filter(isRanked).sort((a, b) => (b.cum || 0) - (a.cum || 0));
    const lead = all[0];
    $('rlBody').innerHTML = `
      <div class="rl-prep">
        <b><span class="rl-prep-dot"></span>Finalizing race…</b>
        <span>Locking in everyone's run. Official results are coming up.</span>
      </div>
      ${lead ? `<p class="rr-watch" style="margin-top:12px;text-align:center">${all.length} racer${all.length > 1 ? 's' : ''} finished · final standings are being verified</p>` : ''}`;
  }

  function paint(){ if(view === 'lobby') paintLobby(); else if(view === 'race') paintRace(); }

  // ---- Cleanup ---------------------------------------------------------------
  return () => {
    for(const t of [engineTimer, netTimer, presenceTimer, paintTimer, phaseTimer]) if(t) clearInterval(t);
    if(unsubFrames) unsubFrames();
    if(unsubStatus) unsubStatus();
    if(channel) supabase.removeChannel(channel);
  };
}
