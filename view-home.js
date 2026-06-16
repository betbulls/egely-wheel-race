import { supabase } from './db.js';
import * as auth from './auth.js';
import { vitalityColor as vColor } from './analytics.js';
import { CATEGORIES, LEVELS, TIER_XP, computeAchievements, pickNextMilestones, computeLevelState } from './achievements.js';
import { fetchUserAchievements, recordNewUnlocks, markSeen } from './achievements-store.js';
import { fetchProgress } from './experiments-store.js';
import { completedExperimentCount, pickContinue, experimentState, getTopic } from './experiments.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// YYYY-MM-DD in local time, used for achievement unlock dates in the info popup.
const shortDate = iso => iso ? new Date(iso).toLocaleDateString('en-CA') : '';

// Migration helper: pre-hybrid dashboards used this flag to know they'd been
// loaded before. We reuse it once to silently sync existing unlocks to the DB
// without flooding the user with NEW pulses for past progress.
const MIGRATION_FLAG = 'ewr_seen_init';

export function mount(el){
  // One delegated handler for the badge "i" buttons, bound for the whole
  // lifetime of the view. It MUST live here (not inside render/async): the
  // dashboard re-renders on every auth change, and overlapping async renders
  // used to bind this twice to the same #homeBody — so a tap toggled
  // `.expanded` an even number of times and appeared to do nothing.
  const onInfoClick = (e) => {
    const btn = e.target.closest('.db-info');
    if(!btn) return;
    e.preventDefault();
    const card = btn.closest('.dash-badge, .dash-recent-card');
    if(card) card.classList.toggle('expanded');
  };
  el.addEventListener('click', onInfoClick);

  // Auth state can resolve AFTER mount on a hard refresh (Supabase session
  // restoration is async). Re-render whenever the state changes meaningfully
  // so we don't get stuck on the logged-out screen.
  let sig = null;
  const unsubAuth = auth.subscribeAuth(() => {
    const a = auth.getState();
    const newSig = (a.user?.id || '') + '|' + (a.displayName || '') + '|' + (a.isPractitioner ? '1' : '0');
    if(newSig === sig) return;
    sig = newSig;
    render();
  });
  return () => { unsubAuth(); el.removeEventListener('click', onInfoClick); };

  function render(){
    const a = auth.getState();
    const userId = a.user?.id || null;

    // Logged-out home: an invitation to log in, no leaderboards.
    if(!userId){
      el.innerHTML = `
        <div class="view-head">
          <h1 class="page-title">EWR Live</h1>
          <p class="page-sub">Track your vitality, your way.</p>
        </div>
        <div class="panel">
          <p class="placeholder">New here? Create your free account — just your email, no password — to track your journey, earn achievements, and join the Live community. No Egely Wheel needed to start.</p>
          <div class="form-actions" style="margin-top:14px;flex-wrap:wrap">
            <a class="btn-join" href="#/login">Log in or sign up</a>
            <a class="btn-secondary" href="#/subscribe">Subscribe to measure</a>
          </div>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="view-head">
        <h1 class="page-title">Welcome${a.displayName ? ', ' + esc(a.displayName) : ''}</h1>
        <p class="page-sub">Your journey at a glance.</p>
      </div>
      <div id="homeBody"><div class="empty">Loading…</div></div>`;

  (async () => {
    // ---- One coordinated data fetch -----------------------------------------
    // Sessions that started in the past 4 hours (still possibly live) or in the
    // future — capped to ~10 for the small teaser block on the dashboard.
    const sessionWindow = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
    const [resR, hostedR, prRecvR, stored, upcomingR, progByExp] = await Promise.all([
      supabase.from('results').select('*').eq('user_id', userId),
      supabase.from('sessions').select('id').eq('created_by_user_id', userId),
      supabase.from('practitioner_links').select('practitioner_id').eq('client_id', userId).eq('status', 'active'),
      fetchUserAchievements(userId),
      supabase.from('sessions')
        .select('id, name, scheduled_start, duration_minutes, created_by_user_id, created_by, verified_only')
        .gte('scheduled_start', sessionWindow)
        .order('scheduled_start', { ascending: true })
        .limit(10),
      fetchProgress(userId),
    ]);
    const results = resR.data || [];
    const experimentsCompleted = completedExperimentCount(progByExp);
    const continueExp = pickContinue(progByExp);
    const hostedRows = hostedR.data || [];
    const hostedIds = hostedRows.map(s => s.id);

    // Participants in my hosted sessions — needed for Community Host / Crowd
    // Leader / Practitioner Circle. Single query, useful for everyone.
    let hostedParticipants = new Map();   // session_id -> Set of user_ids
    if(hostedIds.length){
      const { data: hostedRes } = await supabase.from('results')
        .select('user_id, session_id').in('session_id', hostedIds);
      for(const r of (hostedRes || [])){
        if(!hostedParticipants.has(r.session_id)) hostedParticipants.set(r.session_id, new Set());
        hostedParticipants.get(r.session_id).add(r.user_id);
      }
    }
    const hostedParticipantsMax = hostedParticipants.size
      ? Math.max(...[...hostedParticipants.values()].map(s => s.size))
      : 0;

    let clientsCount = 0, clientFirstMeasurementSeen = false, guidedSession = false, practitionerCircleCount = 0;
    if(a.isPractitioner){
      const { data: cli } = await supabase.from('practitioner_links')
        .select('client_id').eq('practitioner_id', userId).eq('status', 'active');
      const clientIds = (cli || []).map(c => c.client_id);
      clientsCount = clientIds.length;

      if(clientIds.length){
        const { data: anyRes } = await supabase.from('results')
          .select('id').in('user_id', clientIds).limit(1);
        clientFirstMeasurementSeen = !!(anyRes && anyRes.length);

        const clientSet = new Set(clientIds);
        for(const set of hostedParticipants.values()){
          let circle = 0;
          for(const uid of set){ if(clientSet.has(uid)) circle++; }
          if(circle > practitionerCircleCount) practitionerCircleCount = circle;
        }
        guidedSession = practitionerCircleCount > 0;
      }
    }

    const data = {
      results,
      hostedSessionsCount: hostedRows.length,
      connectedPractitionersCount: (prRecvR.data || []).length,
      isPractitioner: !!a.isPractitioner,
      clientsCount, clientFirstMeasurementSeen, guidedSession,
      hostedParticipantsMax, practitionerCircleCount,
      experimentsCompleted,
    };
    const achievements = computeAchievements(data);

    // ---- Upcoming Sessions for the Home teaser -----------------------------
    const tNow = Date.now();
    const upcoming = (upcomingR.data || [])
      .filter(s => {
        const start = new Date(s.scheduled_start).getTime();
        const end = start + (s.duration_minutes || 0) * 60000;
        return tNow <= end;   // live OR future
      })
      .slice(0, 3);
    // Participant count = distinct user_ids in `results` for that session.
    // Live sessions can already have a few; future sessions sit at zero (no RSVP).
    if(upcoming.length){
      const ids = upcoming.map(s => s.id);
      const { data: parts } = await supabase.from('results')
        .select('session_id, user_id').in('session_id', ids);
      const counts = new Map();
      for(const r of (parts || [])){
        if(!counts.has(r.session_id)) counts.set(r.session_id, new Set());
        counts.get(r.session_id).add(r.user_id);
      }
      for(const s of upcoming) s._participants = (counts.get(s.id) || new Set()).size;
    }

    // ---- "Once earned, always shown" ----------------------------------------
    // Stored unlocks are canonical. If the DB has a row but compute currently
    // says false (e.g. test data was deleted), keep the badge unlocked.
    for(const ach of achievements){
      if(stored.has(ach.id) && !ach.unlocked){
        ach.unlocked = true;
        if(ach.current < ach.target) ach.current = ach.target;
      }
    }

    // ---- Sync newly-earned unlocks to the DB --------------------------------
    // First hybrid load for an existing user (DB empty but compute has unlocks
    // and they've used the dashboard before) is a silent migration — no flood.
    const unlockedNow = achievements.filter(a => a.unlocked);
    const missing = unlockedNow.filter(a => !stored.has(a.id));
    const hadPriorDashboardLoad = !!localStorage.getItem(MIGRATION_FLAG);
    const silentMigration = stored.size === 0 && missing.length > 0 && hadPriorDashboardLoad;

    // Optimistically update the local map so render reflects this state.
    const nowIso = new Date().toISOString();
    for(const a of missing){
      stored.set(a.id, { achievement_id: a.id, unlocked_at: nowIso, seen_at: silentMigration ? nowIso : null });
    }
    // Persist in the background — best-effort, the UI doesn't wait.
    if(missing.length) recordNewUnlocks(userId, missing.map(a => a.id), { silent: silentMigration });
    try { localStorage.setItem(MIGRATION_FLAG, '1'); } catch {}

    // NEW = unlocked AND not yet seen.
    const newIds = new Set();
    for(const a of unlockedNow){
      const s = stored.get(a.id);
      if(s && !s.seen_at) newIds.add(a.id);
    }
    // After render, mark them seen for next time.
    if(newIds.size){
      setTimeout(() => markSeen(userId, [...newIds]), 0);
    }

    const sessionCount = results.filter(r => r.session_id != null).length;
    const soloCount = results.filter(r => r.session_id == null && r.experiment_id == null).length;
    const verifiedRatio = results.length
      ? Math.round(results.filter(r => r.verified).length / results.length * 100)
      : 0;
    const bestAvg = results.reduce((m, r) => Math.max(m, r.avg || 0), 0);

    const levelState = computeLevelState(achievements);

    // Persist the current level so the header pill can show it everywhere,
    // and notify any listening UI to refresh.
    try {
      localStorage.setItem('ewr_level', JSON.stringify({
        idx: levelState.level.idx, title: levelState.level.title,
      }));
      window.dispatchEvent(new CustomEvent('ewr-level-changed'));
    } catch {}

    // Level-up detection. Silent on first run so we don't celebrate a
    // migration; otherwise show a celebration banner above the Level card.
    const LEVEL_SEEN_KEY = 'ewr_level_seen';
    let lastSeen = null;
    try { const s = localStorage.getItem(LEVEL_SEEN_KEY); lastSeen = s ? parseInt(s, 10) : null; } catch {}
    let levelUpFromTitle = null;
    if(lastSeen == null){
      try { localStorage.setItem(LEVEL_SEEN_KEY, String(levelState.level.idx)); } catch {}
    } else if(levelState.level.idx > lastSeen){
      const fromLvl = LEVELS.find(l => l.idx === lastSeen);
      levelUpFromTitle = fromLvl ? fromLvl.title : '';
      try { localStorage.setItem(LEVEL_SEEN_KEY, String(levelState.level.idx)); } catch {}
    }

    el.querySelector('#homeBody').innerHTML = `
      ${levelUpFromTitle != null ? renderLevelUp(levelUpFromTitle, levelState.level.title) : ''}
      ${renderLevel(levelState)}
      ${renderStats({
        sessionCount, soloCount, experimentsCompleted,
        clientsCount: a.isPractitioner ? clientsCount : null,
        bestAvg, verifiedRatio, total: results.length,
      })}
      ${renderContinueExperiment(continueExp, progByExp)}
      ${renderUpcoming(upcoming)}
      ${renderRecent(achievements, newIds, stored)}
      ${renderNext(achievements)}
      ${renderCollection(achievements, newIds, stored)}
    `;

  })();
  }
}

// ---- Level-up celebration --------------------------------------------------
function renderLevelUp(from, to){
  return `
    <div class="level-up-banner">
      <span class="lub-sparkle">✨</span>
      <div class="lub-text">
        <div class="lub-eyebrow">Level Up</div>
        <div class="lub-title">${from ? `From <b>${esc(from)}</b> to ` : 'You have reached '}<b>${esc(to)}</b></div>
      </div>
      <span class="lub-sparkle">✨</span>
    </div>`;
}

// ---- Level Journey ---------------------------------------------------------
// Compact 3-column "journey" view: where you are, the whole path with dots,
// where you're heading. Dots are equidistant for readable labels; the bar's
// fill is mapped piecewise so each level segment owns equal visual space.
function renderLevel(s){
  const { level, nextLevel, isMax, totalXP, xpInLevel, xpForThis, xpToNext } = s;
  const span = LEVELS.length - 1;

  const fillPct = (() => {
    if(isMax) return 100;
    const from = (level.idx - 1) / span;
    const to   = level.idx       / span;
    const within = xpForThis > 0 ? (xpInLevel / xpForThis) : 0;
    return Math.max(0, Math.min(100, (from + within * (to - from)) * 100));
  })();

  const markers = LEVELS.map(L => {
    const pos = (L.idx - 1) / span * 100;
    const reached = totalXP >= L.threshold;
    const isCurrent = L.idx === level.idx;
    const status = isCurrent ? 'current' : reached ? 'reached' : 'future';
    return `
      <div class="lj-marker ${status}" style="left:${pos}%">
        <div class="lj-dot"></div>
        <div class="lj-label">${esc(L.title)}</div>
      </div>`;
  }).join('');

  return `
    <section class="level-journey level-tier-${level.idx}">
      <div class="lj-side lj-left">
        <div class="lj-eyebrow">Level ${level.idx}</div>
        <div class="lj-title">${esc(level.title)}</div>
        ${isMax
          ? '<div class="lj-meta lj-max">Max level reached ✨</div>'
          : `<div class="lj-meta">${xpInLevel} / ${xpForThis} XP</div>
             <div class="lj-meta lj-to-next">${xpToNext} XP to ${esc(nextLevel.title)}</div>`}
        <div class="lj-meta lj-total">Total XP · ${totalXP}</div>
      </div>
      <div class="lj-track">
        <div class="lj-bar"><div class="lj-bar-fill" style="width:${fillPct}%"></div></div>
        ${markers}
      </div>
      <div class="lj-side lj-right">
        ${isMax
          ? `<div class="lj-eyebrow">Mastery</div>
             <div class="lj-title-sm">Achieved ✨</div>`
          : `<div class="lj-eyebrow">Next</div>
             <div class="lj-title-sm">${esc(nextLevel.title)}</div>
             <div class="lj-meta">Unlocks at ${nextLevel.threshold} XP</div>`}
      </div>
    </section>
    <a class="lj-link" href="#/journey">What do the levels mean? <span>→</span></a>`;
}

// ---- Stats -----------------------------------------------------------------
function renderStats(s){
  const cards = [
    { label: 'Sessions', val: s.sessionCount, color: '#5230da' },
    { label: 'Solo',     val: s.soloCount,    color: '#401d91' },
    { label: 'Experiments', val: s.experimentsCompleted || 0, color: '#6b3fd4' },
    s.clientsCount != null ? { label: 'Members', val: s.clientsCount, color: '#0f8a52' } : null,
    { label: 'Best Avg', val: s.total ? s.bestAvg.toFixed(1) : '–', color: s.total ? vColor(s.bestAvg) : '#99a2a7' },
    { label: 'Verified', val: s.total ? s.verifiedRatio + '%' : '–', color: '#b8860b' },
  ].filter(Boolean);
  return `<div class="dash-stats">
    ${cards.map(c => `
      <div class="dash-stat">
        <div class="dash-stat-val" style="color:${c.color}">${c.val}</div>
        <div class="dash-stat-lbl">${esc(c.label)}</div>
      </div>`).join('')}
  </div>`;
}

// ---- Continue Experiment ---------------------------------------------------
function renderContinueExperiment(exp, progByExp){
  if(!exp) return '';
  const st = experimentState(exp, progByExp.get(exp.id));
  const topic = getTopic(exp.topic);
  return `
    <h2 class="dash-h">Continue Experiment</h2>
    <a class="home-continue" href="#/experiment/${esc(exp.id)}">
      <span class="hc-icon">${topic ? topic.icon : '🧪'}</span>
      <div class="hc-info">
        <div class="hc-title">${esc(exp.title)}</div>
        <div class="hc-meta">Day ${st.currentNumber} of ${st.total}</div>
      </div>
      <span class="hc-cta">Continue →</span>
    </a>`;
}

// ---- Upcoming Sessions teaser ---------------------------------------------
function formatUntil(ms){
  if(ms <= 0) return 'now';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins  = Math.floor((totalSec % 3600) / 60);
  if(days >= 1)  return `${days} day${days > 1 ? 's' : ''}`;
  if(hours >= 1) return `${hours} hr${hours > 1 ? 's' : ''}`;
  if(mins >= 1)  return `${mins} min`;
  return 'less than a minute';
}

function renderUpcoming(sessions){
  if(!sessions.length) return '';
  const now = Date.now();
  return `
    <h2 class="dash-h">Upcoming Sessions</h2>
    <div class="home-sess">
      ${sessions.map(s => {
        const start = new Date(s.scheduled_start).getTime();
        const end   = start + (s.duration_minutes || 0) * 60000;
        const isLive = now >= start && now <= end;
        const time  = isLive ? '<span class="hs-live">● Live now</span>'
                             : `in ${esc(formatUntil(start - now))}`;
        const host  = s.created_by || 'Host';
        const verified = s.verified_only ? ' <span class="sess-verified">✓ Verified</span>' : '';
        const partsTxt = s._participants > 0 ? ` · ${s._participants} measuring` : '';
        return `
          <a class="home-sess-card${isLive ? ' live' : ''}" href="#/room/${s.id}">
            <div class="hs-row">
              <div class="hs-name">${esc(s.name || 'Untitled session')}${verified}</div>
              <span class="hs-action">${isLive ? 'Join' : 'View'} →</span>
            </div>
            <div class="hs-meta">Hosted by ${esc(host)} · ${time}${partsTxt}</div>
          </a>`;
      }).join('')}
    </div>`;
}

// ---- Recent achievements ---------------------------------------------------
function renderRecent(achievements, newIds, stored){
  const unlocked = achievements.filter(a => a.unlocked);
  if(!unlocked.length) return '';
  // Sort newest first by the DB-stored unlocked_at (precise audit-trail).
  const tsOf = a => {
    const s = stored.get(a.id);
    return s && s.unlocked_at ? new Date(s.unlocked_at).getTime() : 0;
  };
  const sorted = [...unlocked].sort((a, b) => tsOf(b) - tsOf(a));
  // Float NEW ones to the very front so the pulse is immediately visible.
  sorted.sort((a, b) => (newIds.has(b.id) ? 1 : 0) - (newIds.has(a.id) ? 1 : 0));
  const top = sorted.slice(0, 8);
  const newBadge = newIds.size
    ? ` <span class="dash-new-count">${newIds.size} new</span>`
    : '';
  return `
    <h2 class="dash-h">Recent Achievements${newBadge}</h2>
    <div class="dash-recent">
      ${top.map(a => recentCard(a, newIds.has(a.id), stored)).join('')}
    </div>`;
}

function descBlock(a, stored){
  const xp = TIER_XP[a.tier] || 0;
  const storedEntry = stored ? stored.get(a.id) : null;
  const unlockedAt = storedEntry && storedEntry.unlocked_at;
  const metaParts = [];
  metaParts.push(`<span class="db-desc-xp">+${xp} XP</span>`);
  if(a.unlocked && unlockedAt){
    metaParts.push(`<span class="db-desc-when">Unlocked ${esc(shortDate(unlockedAt))}</span>`);
  } else if(a.unlocked){
    metaParts.push('<span class="db-desc-when">Unlocked</span>');
  }
  return `
    <div class="db-desc">
      <p class="db-desc-text">${esc(a.description)}</p>
      <div class="db-desc-meta">${metaParts.join(' · ')}</div>
    </div>`;
}

function recentCard(a, isNew, stored){
  return `
    <div class="dash-recent-card tier-${a.tier}${isNew ? ' is-new' : ''}" title="${esc(a.description)}">
      ${isNew ? '<span class="dash-new-pill">NEW</span>' : ''}
      <button type="button" class="db-info" aria-label="Info">i</button>
      <div class="drc-icon">${a.icon}</div>
      <div class="drc-title">${esc(a.title)}</div>
      ${descBlock(a, stored)}
    </div>`;
}

// ---- Next milestones -------------------------------------------------------
function renderNext(achievements){
  const next = pickNextMilestones(achievements, 3);
  if(!next.length){
    return `<h2 class="dash-h">Next milestones</h2>
      <div class="dash-empty">You've unlocked every milestone — beautifully done. ✨</div>`;
  }
  return `<h2 class="dash-h">Next milestones <span class="dash-h-sub">your closest unlocks</span></h2>
    <div class="dash-next">${next.map(milestoneCard).join('')}</div>`;
}

function milestoneCard(a){
  const pct = Math.min(100, Math.round((a.current / a.target) * 100));
  return `
    <div class="dash-milestone tier-${a.tier}">
      <div class="dm-row">
        <span class="dm-icon">${a.icon}</span>
        <div class="dm-title">${esc(a.title)}</div>
      </div>
      <div class="dm-bar"><div class="dm-bar-fill" style="width:${pct}%"></div></div>
      <div class="dm-progress">${a.current} / ${a.target}</div>
    </div>`;
}

// ---- Achievement collection ------------------------------------------------
function renderCollection(achievements, newIds, stored){
  const groups = new Map();
  for(const a of achievements){
    if(!groups.has(a.category)) groups.set(a.category, []);
    groups.get(a.category).push(a);
  }
  const totalUnlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;

  const sections = CATEGORIES
    .filter(c => groups.has(c.id))
    .map(c => {
      const items = groups.get(c.id);
      const unlocked = items.filter(x => x.unlocked).length;
      return `
        <section class="dash-cat">
          <div class="dash-cat-head">
            <h3 class="dash-cat-title">${esc(c.title)}</h3>
            <span class="dash-cat-count">${unlocked} / ${items.length}</span>
          </div>
          <div class="dash-badges">${items.map(a => badgeCard(a, newIds && newIds.has(a.id), stored)).join('')}</div>
        </section>`;
    });

  return `
    <h2 class="dash-h">Achievement Collection <span class="dash-h-sub">${totalUnlocked} / ${total} unlocked</span></h2>
    ${sections.join('')}`;
}

function badgeCard(a, isNew, stored){
  const status = a.unlocked
    ? '<div class="db-status unlocked">✓ Unlocked</div>'
    : `<div class="db-status">${a.current} / ${a.target}</div>`;
  const cls = ['dash-badge'];
  if(a.unlocked){ cls.push('unlocked', 'tier-' + a.tier); }
  else { cls.push('locked'); }
  if(isNew) cls.push('is-new');
  return `
    <div class="${cls.join(' ')}" title="${esc(a.description)}">
      ${isNew ? '<span class="dash-new-pill">NEW</span>' : ''}
      <button type="button" class="db-info" aria-label="Info">i</button>
      <div class="db-icon">${a.icon}</div>
      <div class="db-title">${esc(a.title)}</div>
      ${status}
      ${descBlock(a, stored)}
    </div>`;
}
