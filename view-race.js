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
import * as presence from './presence.js';
import { flagUrl } from './countries.js';
import { createAddToCalendar } from './calendar.js';
import { computeStats, downsample } from './analytics.js';

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
  .rr-vrf{font-size:10px;font-weight:700;letter-spacing:.04em;border-radius:999px;padding:2px 7px;display:inline-flex;align-items:center;line-height:1;transition:background .2s,color .2s}
  .rr-vrf[hidden]{display:none}
  .rr-vrf.ok{color:#0f8a52;background:rgba(32,178,107,.14)}
  .rr-vrf.bad{color:#b3415a;background:rgba(240,68,56,.12)}
  .rr-vrf.flash{animation:rrFlash .9s ease-out}
  @keyframes rrFlash{0%{box-shadow:0 0 0 0 rgba(240,68,56,.45)}45%{box-shadow:0 0 0 6px rgba(240,68,56,0)}100%{box-shadow:0 0 0 0 rgba(240,68,56,0)}}
  /* ── RESULTS (Phase 6) ─────────────────────────────────────────────────── */
  .rr-av{border-radius:50%;object-fit:cover;display:inline-block;background:#cfd6db}
  .rr-av-init{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#eef0f2;color:#5a6571;font-weight:700;font-size:12px}
  .rr-podium{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-items:end;margin-bottom:14px}
  .rr-pod{background:#fff;border:1px solid #dfe3e6;border-top:3px solid var(--medal);border-radius:14px;padding:14px 10px;text-align:center;box-shadow:0 10px 26px rgba(1,22,36,.07)}
  .rr-pod.p1{padding-top:20px}
  .rr-pod.me{box-shadow:0 0 0 2px rgba(82,48,218,.3),0 10px 26px rgba(1,22,36,.07)}
  .rr-pod .rr-av{width:46px!important;height:46px!important;margin:6px auto 0;box-shadow:0 0 0 2px var(--medal)}
  .rr-pod-rank{font-size:26px;line-height:1}
  .rr-pod-name{font-weight:700;color:#011624;font-size:13.5px;margin-top:7px;display:flex;align-items:center;justify-content:center;gap:5px}
  .rr-pod-score{font-family:'Montserrat',sans-serif;font-weight:700;font-size:16px;color:#011624;margin-top:3px}
  .rr-summary{text-align:center;color:#67737c;font-size:13px;margin-bottom:16px}
  .rr-your{background:#011624;border-radius:16px;padding:16px 18px;margin-bottom:16px;box-shadow:0 0 0 2px rgba(82,48,218,.4)}
  .rr-your-h{color:#aeb9c2;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px}
  .rr-your-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
  .rr-your-v{font-family:'Montserrat',sans-serif;font-weight:700;font-size:20px;color:#fff}
  .rr-your-l{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#8e9aa4;margin-top:2px}
  .rr-your-note{color:#ffd66b;font-size:12px;margin-top:10px;line-height:1.4}
  .rr-awards{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px}
  .rr-award{flex:1 1 160px;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:12px;padding:11px 13px}
  .rr-award-l{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5230da}
  .rr-award-w{font-weight:700;color:#011624;font-size:14px;margin-top:3px}
  .rr-award-v{color:#67737c;font-size:12.5px;margin-top:1px}
  .rr-sec{font-family:'Montserrat',sans-serif;font-weight:600;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#67737c;margin:18px 0 10px}
  .rr-sec-sub{font-weight:600;letter-spacing:0;text-transform:none;color:#99a2a7;font-size:12px}
  .rr-standings{display:flex;flex-direction:column;gap:8px}
  .rr-srow{display:grid;grid-template-columns:28px auto 1fr auto;align-items:center;gap:11px;background:#fff;border:1px solid #dfe3e6;border-radius:12px;padding:10px 13px}
  .rr-srow.me{border-color:rgba(82,48,218,.5);box-shadow:0 0 0 2px rgba(82,48,218,.1)}
  .rr-srow.unr{opacity:.85}
  .rr-srank{font-family:'Montserrat',sans-serif;font-weight:700;font-size:15px;color:#011624;text-align:center}
  .rr-srank.dash{color:#b9c0c6;font-size:13px}
  .rr-srow .rr-av{width:32px!important;height:32px!important}
  .rr-sname{display:flex;align-items:center;gap:6px;font-weight:700;color:#011624;font-size:14px;min-width:0;white-space:nowrap;overflow:hidden}
  .rr-sscore{text-align:right;white-space:nowrap}
  .rr-sscore b{font-family:'Montserrat',sans-serif;font-size:15px;color:#011624}
  .rr-sscore span{display:block;font-size:11px;color:#99a2a7}
  @media (prefers-reduced-motion: reduce){
    .rr-puck{transition:none}.rr-lane.moving .rr-tail{opacity:0}.rr-rank.bump{animation:none}.rr-vrf.flash{animation:none}
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
    .rr-podium{grid-template-columns:1fr;gap:8px}
    .rr-pod.p1{padding-top:14px}
    .rr-your-grid{grid-template-columns:repeat(3,1fr);row-gap:12px}
  }`;
  document.head.appendChild(st);
}

export function mount(el, raceId, inviteToken = null){
  injectRaceStyles();
  let session = null, startMs = 0, endMs = 0, durationMs = 0, TOTAL_SLOTS = 0, hostAvatar = null, hostName = null;
  let myName = (auth.getState().displayName || localStorage.getItem('ewr_name') || '').trim();
  const myUid = auth.getState().user?.id || null;
  const myClientId = 'c' + Math.random().toString(36).slice(2, 9);
  const myId = myUid ? 'u:' + myUid : 'n:' + racerId(myName || 'guest');

  let channel = null, lastRx = 0;
  let bleConnected = false, myLed = 0, myEma = 0;
  let view = null;              // 'lobby' | 'race' | 'final'
  let countin = null;           // last 3-2-1 number shown

  // My canonical race state (Phase 5; Phase 6 reads these to finalize + save).
  let mySlots = null, myCumulative = 0, myFirstSlot = null, myVerified = true;
  let swingWin = [], swings = 0, wasSwing = false, cheatDetected = false;
  // Phase 6: own-result save + held-tail drain (mirrors Solo/Room) + finalize.
  let myResultSaved = false, raceEnded = false;
  let frameFresh = false, holdRun = 0, lastCounter = null, tailCounterAtEnd = null, tailDrainDone = false;
  let finalizeTimer = null, resultsTimer = null;
  const FINALIZE_GRACE_MS = 1500;

  let engineTimer = null, netTimer = null, presenceTimer = null, paintTimer = null, phaseTimer = null;
  let unsubFrames = null, unsubStatus = null, unsubAuth = null;
  let begun = false;

  // roster: identity -> { id, name, uid, clientId, avatar, country, host, wheel,
  //                       live:{led,ts}, slot, cum, verified, firstSlot, lastSeen }
  const roster = new Map();

  const SLOT_MS = 500, SAMPLE_MS = 250, BROADCAST_MS = 500, PRESENCE_MS = 2500;
  const RACE_VISUAL_SPREAD = 1.5;   // tune 1.3–1.8 on the live test — spreads the field on the RELATIVE track
  const RANKED_GRACE_SLOTS = 10;             // first valid tick within 5s → ranked
  const LIVE_STALE_MS = 4000, RECONNECT_MS = 12000;
  const CHEAT_WINDOW_MS = 2000, SWING_LIMIT = 7, MAX_SWINGS = 2;

  const zText = led => led < 6 ? '#c2415b' : led < 13 ? '#b8860b' : '#0f8a52';
  // Host identity is keyed on user id (robust). The name is only a fallback for
  // anonymous racers — `created_by` is a legacy display-name snapshot that can differ
  // from the host's current profile name, so it must NOT decide "is this the host".
  const isHostUid = uid => !!(session && uid && session.created_by_user_id && uid === session.created_by_user_id);
  const isHostName = name => {
    if(!session || !name) return false;
    const n = name.trim().toLowerCase();
    return n === (session.created_by || '').trim().toLowerCase() || n === (hostName || '').trim().toLowerCase();
  };
  const isHostEntry = r => r ? (r.uid ? isHostUid(r.uid) : isHostName(r.name)) : false;
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
      const { data: hp } = await supabase.from('profiles').select('avatar_url, display_name').eq('id', session.created_by_user_id).maybeSingle();
      if(hp){ hostAvatar = hp.avatar_url || null; hostName = hp.display_name || null; }
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
    const hn = hostName || session.created_by || 'unknown';   // current profile name, not the legacy snapshot
    const accessBadge = mode === 'invite' ? '<span class="rl-badge invite">Invite link</span>'
      : mode === 'followers' ? '<span class="rl-badge followers">Followers only</span>' : '';
    const verifiedBadge = session.verified_only ? '<span class="rl-badge verified">✓ Verified race</span>' : '';
    $('rlHead').innerHTML = `
      <span class="rl-eyebrow"><span class="rl-dot"></span> Race</span>
      <div class="rl-title">${esc(session.name || 'Race')}</div>
      <div class="rl-host">${avatarHtml(hostAvatar, hn)}<span>Hosted by <b style="color:#011624">${esc(hn)}</b></span></div>
      <div class="rl-meta">${esc(when)} · ${session.duration_minutes} min</div>
      <div class="rl-badges">${accessBadge}${verifiedBadge}</div>
      <div class="rl-actions" id="rlActions"></div>`;
    const actions = $('rlActions');
    if(phase() === 'pre') actions.appendChild(createAddToCalendar({ ...session, _hostName: hn }));
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
  // Logged-in users must NOT see the name gate. Auth restores async on a hard
  // refresh, so the displayName can be empty at mount — wait for it, and show the
  // gate ONLY once we know the visitor is genuinely not logged in.
  function tryBegin(){
    if(begun) return true;
    const n = (auth.getState().displayName || localStorage.getItem('ewr_name') || '').trim();
    if(!n) return false;
    myName = n; begun = true; begin(); return true;
  }
  function enter(){
    if(tryBegin()) return;
    $('rlBody').innerHTML = '<div class="rl-gate"><p class="rl-empty" style="margin:0">Loading…</p></div>';
    unsubAuth = auth.subscribeAuth(() => tryBegin());   // logged-in name arrives → begin (no gate)
    setTimeout(() => { if(!begun && !auth.getState().user) showNameGate(); }, 1200);   // anonymous → name gate
  }
  function showNameGate(){
    if(begun) return;
    $('rlBody').innerHTML = `<div class="rl-gate">
      <label for="rlName" style="font-weight:700;color:#011624">Your name</label>
      <input type="text" id="rlName" maxlength="60" placeholder="Your name">
      <button type="button" class="rl-join" id="rlJoin">Join</button></div>`;
    const input = $('rlName'); if(input) input.focus();
    const join = $('rlJoin');
    if(join) join.addEventListener('click', () => {
      const v = ($('rlName').value || '').trim();
      if(!v) return;
      myName = v; begun = true; try { localStorage.setItem('ewr_name', v); } catch {}
      begin();
    });
  }

  function begin(){
    presence.setRace(true);   // show "In a race" on the global Live wall while in the room
    joinChannel();
    unsubStatus = ble.subscribeStatus(s => { bleConnected = s.connected; if(!s.connected){ myLed = 0; } trackPresence(); });
    unsubFrames = ble.subscribeFrames(f => {
      myLed = f.led; lastCounter = f.counter; frameFresh = true;
      if(phase() === 'active'){
        const now = Date.now();
        swingWin.push({ t: now, led: f.led });
        swingWin = swingWin.filter(x => now - x.t <= CHEAT_WINDOW_MS);
        const leds = swingWin.map(x => x.led);
        const swingNow = (Math.max(...leds) - Math.min(...leds)) >= SWING_LIMIT;
        if(swingNow && !wasSwing && !cheatDetected && ++swings >= MAX_SWINGS){ cheatDetected = true; myVerified = false; }
        wasSwing = swingNow;
      } else if(raceEnded && !tailDrainDone && tailCounterAtEnd != null && f.counter !== tailCounterAtEnd){
        // The wheel's delayed final report — patch the held tail slot(s), then save.
        tailDrainDone = true; patchTail(f.led); saveMyResult();
      }
    });

    engineTimer = setInterval(sample, SAMPLE_MS);
    netTimer = setInterval(broadcastState, BROADCAST_MS);
    // NO presence heartbeat — presence carries identity + wheel state only, tracked on
    // subscribe and on BLE change, exactly like the proven session room (view-room.js).
    // Live race state travels on the 500ms race-tick broadcast and recovers from it after
    // a reconnect. Re-tracking presence every couple seconds churned the channel and —
    // unlike the session room — made racers flicker / drop when navigating away and back.
    paintTimer = setInterval(paint, 300);
    phaseTimer = setInterval(applyView, 1000);
    applyView();
  }

  // ---- Channel ---------------------------------------------------------------
  function joinChannel(){
    channel = supabase.channel('room-' + raceId, {
      // STABLE presence key (per identity), like the session room — NOT a random
      // per-mount id. A random key leaves a ghost presence entry on every navigation and
      // makes the same-topic rejoin race, so racers drop until a hard refresh. Multi-tab
      // score dedup still works: it keys off payload.clientId + the monotonic cum, not
      // the presence key.
      config: { broadcast: { self: false }, presence: { key: myId } },
    });
    // Inbound-broadcast canary: counts every received tick (watch `window.__ewrRaceRx`
    // grow in the console) and — with `window.__ewrRaceDebug = true` — warns on any >4s
    // gap. This cleanly separates "the channel dropped inbound messages" (gaps appear)
    // from a render bug (ticks keep arriving but the UI still shows Reconnecting).
    const noteRx = () => {
      const now = Date.now();
      window.__ewrRaceRx = (window.__ewrRaceRx || 0) + 1;
      if(window.__ewrRaceDebug && lastRx && now - lastRx > LIVE_STALE_MS) console.warn(`[race] inbound broadcast gap ${now - lastRx}ms — channel dropped messages`);
      lastRx = now;
    };
    channel.on('broadcast', { event: 'lobby-tick' }, ({ payload }) => {
      if(!payload || !payload.id) return;
      noteRx();
      const r = ensureEntry(payload);
      r.live = { led: payload.led, ts: Date.now() }; r.lastSeen = Date.now();
    });
    channel.on('broadcast', { event: 'race-tick' }, ({ payload }) => {
      if(!payload || !payload.id) return;
      noteRx();
      acceptRacerState(payload, false);   // live broadcast — authoritative, fresh
    });
    channel.on('presence', { event: 'sync' }, syncPresence);
    channel.on('presence', { event: 'join' }, syncPresence);
    channel.on('presence', { event: 'leave' }, syncPresence);
    channel.subscribe(status => {
      if(status !== 'SUBSCRIBED') return;
      trackPresence();
      // On a soft re-mount (navigate away → back) the realtime socket is reused and the
      // initial 'sync' event can be missed, leaving an empty roster until a hard refresh.
      // Pull presence state explicitly once we're joined (and once more a beat later, in
      // case the server state lands slightly after SUBSCRIBED) so the field rebuilds on
      // its own — no manual refresh needed.
      syncPresence();
      setTimeout(() => { if(channel) syncPresence(); }, 600);
    });
  }

  function ensureEntry(p){
    let r = roster.get(p.id);
    if(!r){ r = { id: p.id, name: p.name, cum: 0, slot: -1, firstSlot: null, verified: true, live: { led: 0, ts: 0 } }; roster.set(p.id, r); }
    if(p.name) r.name = p.name;
    if(p.uid !== undefined) r.uid = p.uid;
    if(p.avatar) r.avatar = p.avatar;
    if(p.country) r.country = p.country;
    if(p.wheel !== undefined) r.wheel = !!p.wheel;
    r.host = isHostEntry(r);
    return r;
  }

  // Merge an incoming racer state into the roster. `cum` is MONOTONIC by construction,
  // so it must never regress: a bot (or any client) that tracks presence ONCE carries a
  // stale snapshot (cum 0) forever, and the old "same client always wins" rule let that
  // snapshot drag the live score back to 0 on every presence sync. Now:
  //   • firstSlot is always captured (earliest wins) regardless of source.
  //   • fromPresence === true → RECOVERY SEED only: advance only if the snapshot is
  //     strictly higher (true reconnect/late-join we missed broadcasts for); a lower or
  //     equal snapshot is stale and ignored — never overwrites the fresh broadcast value.
  //   • fromPresence === false → live broadcast: same client, or a stronger contender
  //     (multi-tab dedup: the wheel tab leads), but cum is clamped non-decreasing.
  function acceptRacerState(p, fromPresence){
    const r = ensureEntry(p);
    const pCum = p.cum || 0;
    if(p.firstSlot != null) r.firstSlot = (r.firstSlot == null) ? p.firstSlot : Math.min(r.firstSlot, p.firstSlot);
    if(fromPresence){
      if(pCum > (r.cum || 0)){
        r.clientId = p.clientId || r.clientId;
        r.slot = p.slot != null ? p.slot : r.slot;
        r.cum = pCum;
        r.live = { led: p.live || 0, ts: Date.now() };
        r.verified = p.verified !== false;
      }
      r.lastSeen = Date.now();
      return;
    }
    const sameClient = p.clientId && p.clientId === r.clientId;
    if(sameClient || pCum >= (r.cum || 0)){
      r.clientId = p.clientId || r.clientId;
      r.slot = p.slot != null ? p.slot : r.slot;
      if(pCum >= (r.cum || 0)) r.cum = pCum;     // monotonic — never regress
      r.live = { led: p.live || 0, ts: Date.now() };
      r.verified = p.verified !== false;
      r.lastSeen = Date.now();
    }
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
      // Seed race state from the snapshot (broadcast keeps it fresh afterwards). Marked
      // fromPresence so a stale snapshot can't regress a live score — see acceptRacerState.
      if(phase() !== 'pre') acceptRacerState(m, true);
      else { const r = roster.get(m.id); if(r){ r.lastSeen = Date.now(); } }
    }
    // Drop people who left — but KEEP anyone still broadcasting (a lobby-tick / race-tick
    // within the reconnect window) or holding a live score, mirroring how the session room
    // keeps its data-producing racers. Without this, a bot known only from broadcasts (its
    // presence absent from THIS sync — random key / timing) was deleted and re-created on
    // every sync → the flicker / "disappearing racers" the session room never shows.
    const nowDel = Date.now();
    for(const [id, r] of roster){
      const recentlyLive = r.lastSeen && (nowDel - r.lastSeen < RECONNECT_MS);
      const scoringRacer = (r.cum || 0) > 0 && phase() !== 'pre';
      if(!seen.has(id) && !recentlyLive && !scoringRacer) roster.delete(id);
    }
    if(view) (view === 'race' ? renderRaceList() : renderLobbyList());
  }

  // ---- Sampling / scoring (canonical slots) ----------------------------------
  function sample(){
    const raw = bleConnected ? myLed : 0;
    myEma = myEma == null ? raw : myEma * 0.7 + raw * 0.3;
    // Keep my OWN roster entry fresh in EVERY phase (lobby too) — the broadcast is
    // self:false, so nothing else updates "me". Without this my own lobby row never
    // flips to "Practicing" while I spin (it stuck on In lobby / Wheel ready).
    const me = ensureEntry({ id: myId, name: myName, uid: myUid, avatar: auth.getState().avatarUrl, country: auth.getState().country, wheel: bleConnected });
    me.wheel = bleConnected;
    me.live = { led: Math.round(myEma), ts: Date.now() };
    me.lastSeen = Date.now();
    if(phase() === 'active' && mySlots){
      const slot = curSlot();
      if(slot >= 0 && slot < TOTAL_SLOTS){                 // out of range dropped
        if(bleConnected && myFirstSlot === null) myFirstSlot = slot;
        if(mySlots[slot] === undefined){                   // first-write-wins → no double count, monotonic
          mySlots[slot] = raw; myCumulative += raw;
          if(frameFresh){ frameFresh = false; holdRun = 0; } else holdRun++;
        }
        me.clientId = myClientId; me.slot = slot; me.cum = myCumulative;
        me.verified = myVerified; me.firstSlot = myFirstSlot;
      }
    }
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
      if(view !== 'final'){ buildFinalizing(); view = 'final'; onRaceEnd(); }
    }
  }

  function onRaceStart(){
    // Drop practice scaffolding; the official window begins at slot 0.
    mySlots = new Array(TOTAL_SLOTS); myCumulative = 0;
    myFirstSlot = (phase() === 'active' && bleConnected) ? Math.max(0, curSlot()) : null;
    // Reflect the reset on my own roster entry right away so my lane doesn't briefly
    // render as "Late · Unranked" before the next sample() tick syncs it.
    const me = roster.get(myId);
    if(me){ me.cum = 0; me.slot = curSlot(); me.firstSlot = myFirstSlot; me.lastSeen = Date.now(); }
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
    // Host/You are stable; the "Late · Unranked" tag is dynamic (paintRace toggles it as
    // firstSlot arrives), so it lives as a hidden, toggleable element — not baked in here.
    const tags = (p.host ? '<span class="rr-tag host">Host</span>' : '')
      + (mine ? '<span class="rr-tag you">You</span>' : '');
    const puck = p.avatar
      ? `<img class="rr-puck-av" src="${esc(p.avatar)}" alt="">`
      : `<span class="rr-puck-init">${esc((p.name || '?').charAt(0).toUpperCase())}</span>`;
    return `<div class="rr-lane ${mine ? 'me' : ''} ${ranked ? '' : 'unranked'}" data-id="${esc(p.id)}" data-rank="">
      <div class="rr-rank dash">–</div>
      <div class="rr-info">
        <div class="rr-name-row"><span class="rr-name">${esc(p.name)}</span>${flagImg(p.country)}${tags}<span class="rr-tag unranked" data-unr ${ranked ? 'hidden' : ''}>Late · Unranked</span><span class="rr-vrf" hidden></span><span class="rr-conn" hidden></span></div>
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
      // Liveness is judged purely by tick freshness — NOT the wheel flag. A bot (or any
      // racer) that is actively streaming race-ticks is live even if it reports
      // wheel:false; only a real gap in ticks means reconnecting / disconnected.
      const gone = sinceSeen > RECONNECT_MS;                 // no ticks ~12s → off the wire
      const reconnecting = !gone && sinceSeen > LIVE_STALE_MS; // no ticks ~4s
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
      // Ranked status is dynamic: a racer is often classified a beat AFTER the lane is
      // first drawn (their firstSlot arrives slightly later), so re-evaluate every paint
      // instead of baking it once in laneHtml — otherwise everyone sticks on Unranked.
      row.classList.toggle('unranked', !ranked);
      const unrEl = row.querySelector('.rr-tag.unranked[data-unr]');
      if(unrEl) unrEl.hidden = ranked;
      const conn = row.querySelector('.rr-conn');
      if(conn){
        if(gone && racerLike){ conn.hidden = false; conn.className = 'rr-conn disconnected'; conn.innerHTML = '<span class="d"></span>Disconnected'; }
        else if(reconnecting && racerLike){ conn.hidden = false; conn.className = 'rr-conn reconnecting'; conn.innerHTML = '<span class="d"></span>Reconnecting'; }
        else conn.hidden = true;
      }
      // Live verified state per racer — flips to "Unverified" in realtime if irregular
      // spinning is detected (a brief flash marks the moment). Only the DOM changes on
      // an actual transition, so the flash animation isn't reset every paint.
      const vrf = row.querySelector('.rr-vrf');
      if(vrf){
        const next = p.verified === false ? 'bad' : 'ok';
        const prev = vrf.dataset.v;
        if(prev !== next){
          vrf.dataset.v = next; vrf.hidden = false;
          vrf.className = 'rr-vrf ' + next; vrf.textContent = next === 'bad' ? 'Unverified' : '✓';
          if(next === 'bad' && prev === 'ok' && !reduce){ void vrf.offsetWidth; vrf.classList.add('flash'); }
        }
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

  // ---- Phase 6: tail-drain → own result save → finalize → results page -------
  function patchTail(led){
    if(!mySlots) return;
    let patched = 0, cap = Math.min(holdRun, 2);   // only the recently-held tail slots
    for(let i = TOTAL_SLOTS - 1; i >= 0 && patched < cap; i--){
      if(mySlots[i] !== undefined){ myCumulative += (led - mySlots[i]); mySlots[i] = led; patched++; }
    }
    if(myCumulative < 0) myCumulative = 0;
  }

  function onRaceEnd(){
    if(raceEnded) return; raceEnded = true;
    // Tail-drain: a short grace for the wheel's delayed final frame, then save. The
    // frame listener finishes it early; this timeout is the floor so saving can't hang.
    tailCounterAtEnd = lastCounter;
    setTimeout(() => { if(!tailDrainDone){ tailDrainDone = true; saveMyResult(); } }, FINALIZE_GRACE_MS);
    scheduleFinalize();
  }

  // Each client saves ONLY its own result, once. The partial unique index turns a
  // duplicate (refresh / reconnect / double finalize) into a harmless 23505 no-op.
  function saveMyResult(){
    if(myResultSaved) return;
    myResultSaved = true;
    if(!mySlots || myFirstSlot == null || !myUid) return;   // spectator / no wheel data → nothing official to save
    // mySlots is a SPARSE array (undefined = unmeasured slot). Densify with
    // Array.from (it visits every index) so unmeasured slots become 0 — otherwise
    // .map() keeps the holes and Math.max(...holes) → NaN (peak saved as null).
    const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => { const v = mySlots[i]; return (v === undefined || v === null) ? 0 : v; });
    const s = computeStats(slots);
    if(!s) return;
    supabase.from('results').insert({
      session_id: Number(raceId), user_id: myUid,
      racer_id: racerId(myName), racer_name: myName, kind: 'race',
      avg: Number(s.avg.toFixed(2)), peak: s.peak, steadiness: s.steadiness,
      zone_green: Number(s.zone.green.toFixed(1)), zone_yellow: Number(s.zone.yellow.toFixed(1)), zone_red: Number(s.zone.red.toFixed(1)),
      trend: Number(s.trendTotal.toFixed(2)), green_streak: s.greenStreak,
      samples: slots.filter(v => v > 0).length, is_host: isHostUid(myUid),
      verified: myVerified, curve: slots.slice(),   // FULL per-slot series (500ms canonical slots, 0 = unmeasured) — no 80-point downsample
      duration_seconds: (session.duration_minutes || 0) * 60,
      race_score: myCumulative,
      race_normalized_score: Number((myCumulative / (24 * TOTAL_SLOTS)).toFixed(4)),
      first_slot: myFirstSlot,
    }).then(({ error }) => { if(error && error.code !== '23505') console.warn('race result save:', error.message); });
  }

  // The authoritative ranking is the finalize_race RPC (fixed deadline = race end + 8s),
  // never a single browser. Then we swap to the results page in place.
  function scheduleFinalize(){
    const run = async () => {
      try { await supabase.rpc('finalize_race', { p_race_id: Number(raceId) }); } catch(e) {}
      renderResults(0);
    };
    const wait = (endMs + 8000) - Date.now();
    if(wait <= 0) run(); else finalizeTimer = setTimeout(run, wait + 300);
  }

  async function renderResults(retries){
    const body = $('rlBody'); if(!body) return;
    const { data: rows, error } = await supabase.from('results')
      .select('user_id, racer_name, avg, peak, steadiness, verified, race_score, final_rank, first_slot, is_host')
      .eq('session_id', Number(raceId)).eq('kind', 'race');
    if(error){ body.innerHTML = `<div class="rl-finished"><b>Could not load results</b><span>${esc(error.message)}</span></div>`; return; }
    const all = rows || [];
    const ranked = all.filter(r => r.final_rank != null).sort((a, b) => a.final_rank - b.final_rank);
    const unranked = all.filter(r => r.final_rank == null);
    // Results exist but none ranked yet → the RPC may not have run; retry briefly.
    if(!ranked.length && all.length && (retries || 0) < 3){
      body.innerHTML = `<div class="rl-prep"><b><span class="rl-prep-dot"></span>Finalizing race…</b><span>Locking in the standings.</span></div>`;
      resultsTimer = setTimeout(async () => { try { await supabase.rpc('finalize_race', { p_race_id: Number(raceId) }); } catch(e) {} renderResults((retries || 0) + 1); }, 2500);
      return;
    }
    const uids = [...new Set(all.map(r => r.user_id).filter(Boolean))];
    let prof = new Map();
    if(uids.length){ const { data: ps } = await supabase.from('profiles').select('id, avatar_url, country, approved_maker, practitioner_handle').in('id', uids); prof = new Map((ps || []).map(p => [p.id, p])); }
    const av = r => { const p = prof.get(r.user_id); return avatarHtml(p && p.avatar_url, r.racer_name, 'rr-av'); };
    const cc = r => { const p = prof.get(r.user_id); return p && p.country ? flagImg(p.country) : ''; };
    // Approved Spiritual Makers get a clickable name → their public connect page (same as
    // the Live wall / sessions / room). Everyone else stays plain text.
    const nm = r => { const p = prof.get(r.user_id); return (p && p.approved_maker && p.practitioner_handle)
      ? `<a class="maker-name-link" href="#/connect/${esc(p.practitioner_handle)}">${esc(r.racer_name)}</a>` : esc(r.racer_name); };
    const mine = r => !!(myUid && r.user_id === myUid);
    // The official ranking is by race_score (cumulative points = fair full-window average ×
    // slots). Show the avg DERIVED from race_score so it ALWAYS agrees with the points order —
    // the app saves the two consistently, but a bot can save an `avg` computed on a different
    // basis, which made "#1 has a lower avg than #2" look wrong. (peak stays as saved — it's a
    // genuinely independent stat that can outrank the average.)
    const totalSlots = Math.max(1, Math.round((session.duration_minutes || 0) * 60000 / 500));
    const avgOf = r => totalSlots ? (r.race_score || 0) / totalSlots : (r.avg || 0);
    const medal = ['#d9a520', '#9fb0bd', '#c08457'];
    const medalEmoji = ['🥇', '🥈', '🥉'];   // same medals as the Global Ranking podium

    const podium = ranked.slice(0, 3).map((r, i) => `
      <div class="rr-pod p${i + 1}${mine(r) ? ' me' : ''}" style="--medal:${medal[i]}">
        <div class="rr-pod-rank">${medalEmoji[i]}</div>${av(r)}
        <div class="rr-pod-name">${nm(r)}${cc(r)}</div>
        <div class="rr-pod-score">${r.race_score} pts</div>
      </div>`).join('');

    const myRow = all.find(mine);
    const yourResult = myRow ? `
      <div class="rr-your">
        <div class="rr-your-h">Your result</div>
        <div class="rr-your-grid">
          <div><div class="rr-your-v">${myRow.final_rank != null ? '#' + myRow.final_rank : '—'}</div><div class="rr-your-l">Place</div></div>
          <div><div class="rr-your-v">${myRow.race_score}</div><div class="rr-your-l">Score</div></div>
          <div><div class="rr-your-v">${avgOf(myRow).toFixed(1)}</div><div class="rr-your-l">Avg</div></div>
          <div><div class="rr-your-v">${myRow.peak || 0}</div><div class="rr-your-l">Peak</div></div>
          <div><div class="rr-your-v">${myRow.steadiness || 0}</div><div class="rr-your-l">Steady</div></div>
        </div>
        ${myRow.final_rank == null ? `<div class="rr-your-note">Recorded${session.verified_only && myRow.verified === false ? ', but marked unverified — not in the official standings.' : ' as a late entry — not in the official standings.'}</div>` : ''}
      </div>` : '';

    const standRow = r => `
      <div class="rr-srow${mine(r) ? ' me' : ''}">
        <div class="rr-srank">${r.final_rank}</div>${av(r)}
        <div class="rr-sname">${nm(r)}${cc(r)}${r.is_host ? '<span class="rr-tag host">Host</span>' : ''}${r.verified === false ? '<span class="rr-vrf bad">Unverified</span>' : ''}</div>
        <div class="rr-sscore"><b>${r.race_score}</b><span>avg ${avgOf(r).toFixed(1)} · peak ${r.peak || 0}</span></div>
      </div>`;

    let awards = '';
    if(ranked.length){
      const peakW = ranked.reduce((a, r) => (r.peak || 0) > (a.peak || 0) ? r : a);
      const steadyW = ranked.reduce((a, r) => (r.steadiness || 0) > (a.steadiness || 0) ? r : a);
      const card = (l, r, v) => `<div class="rr-award"><div class="rr-award-l">${l}</div><div class="rr-award-w">${nm(r)}</div><div class="rr-award-v">${v}</div></div>`;
      awards = `<div class="rr-awards">${card('Highest Peak', peakW, peakW.peak || 0)}${card('Most Steady', steadyW, (steadyW.steadiness || 0) + ' / 100')}</div>`;
    }

    const dur = session.duration_minutes || 0;
    body.innerHTML = `
      <div class="rr-results">
        ${ranked.length ? `<div class="rr-podium">${podium}</div>` : '<div class="rl-finished"><b>No official finishers</b><span>No ranked measurements were recorded for this race.</span></div>'}
        <div class="rr-summary">${ranked.length} finisher${ranked.length === 1 ? '' : 's'} · ${dur} min${session.verified_only ? ' · verified only' : ''}</div>
        ${yourResult}
        ${awards}
        ${ranked.length ? `<h3 class="rr-sec">Full standings</h3><div class="rr-standings">${ranked.map(standRow).join('')}</div>` : ''}
        ${unranked.length ? `<h3 class="rr-sec">Unranked <span class="rr-sec-sub">late entry / not verified</span></h3>
          <div class="rr-standings">${unranked.map(r => `<div class="rr-srow unr${mine(r) ? ' me' : ''}"><div class="rr-srank dash">–</div>${av(r)}<div class="rr-sname">${nm(r)}${cc(r)}${r.verified === false ? '<span class="rr-vrf bad">Unverified</span>' : ''}</div><div class="rr-sscore"><b>${r.race_score || 0}</b><span>avg ${avgOf(r).toFixed(1)}</span></div></div>`).join('')}</div>` : ''}
        <p class="rl-meta" style="margin-top:18px"><a href="#/my-races" class="link">← Back to races</a></p>
      </div>`;
  }

  function paint(){ if(view === 'lobby') paintLobby(); else if(view === 'race') paintRace(); }

  // ---- Cleanup ---------------------------------------------------------------
  return () => {
    // If the race already ended but my own result hasn't saved yet (e.g. I navigated
    // away during the finalize grace), save it now. Idempotent: the myResultSaved guard
    // + the partial unique index turn any duplicate into a harmless no-op.
    if(raceEnded && !myResultSaved) saveMyResult();
    for(const t of [engineTimer, netTimer, presenceTimer, paintTimer, phaseTimer]) if(t) clearInterval(t);
    if(finalizeTimer) clearTimeout(finalizeTimer);
    if(resultsTimer) clearTimeout(resultsTimer);
    if(unsubFrames) unsubFrames();
    if(unsubStatus) unsubStatus();
    if(unsubAuth) unsubAuth();
    presence.setRace(false);
    if(channel) supabase.removeChannel(channel);
  };
}
