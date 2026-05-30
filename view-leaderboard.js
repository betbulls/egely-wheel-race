import { supabase } from './db.js';
import * as auth from './auth.js';
import { ACHIEVEMENTS, LEVELS, TIER_XP } from './achievements.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const CATALOG = new Map(ACHIEVEMENTS.map(a => [a.id, { tier: a.tier, icon: a.icon, title: a.title }]));

const PERIODS = [
  { id: 'week',  label: 'This Week'  },
  { id: 'month', label: 'This Month' },
  { id: 'all',   label: 'All Time'   },
];

function periodStart(period){
  if(period === 'all') return null;
  const now = new Date();
  if(period === 'week'){
    const d = new Date(now);
    const dow = d.getDay() || 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (dow - 1));
    return d;
  }
  if(period === 'month'){
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

function levelFromXP(xp){
  let lvl = LEVELS[0];
  for(const L of LEVELS){ if(xp >= L.threshold) lvl = L; }
  return lvl;
}

function avatarHtml(url, name, cls = ''){
  if(url) return `<img class="${cls}" src="${esc(url)}" alt="">`;
  const initial = (name || '?').charAt(0).toUpperCase();
  return `<span class="${cls} avatar-initial">${esc(initial)}</span>`;
}

function levelPill(xp){
  const lvl = levelFromXP(xp);
  return `<span class="lb-level-pill lv-${lvl.idx}">L${lvl.idx} ${esc(lvl.title)}</span>`;
}

function renderRare(badges){
  const rare = badges
    .filter(b => b.tier === 'gold' || b.tier === 'special')
    .slice()
    .sort((a, b) => {
      const ta = a.tier === 'special' ? 0 : 1;
      const tb = b.tier === 'special' ? 0 : 1;
      if(ta !== tb) return ta - tb;
      return new Date(a.unlocked_at) - new Date(b.unlocked_at);
    });
  return rare.map(b => `<span class="lb-rare-icon tier-${b.tier}" title="${esc(b.title)}">${b.icon}</span>`).join('');
}

// ---- Status title — a short persona derived from the user's data --------
function statusTitle(u){
  const has = id => u.badgesAll.some(b => b.id === id);

  if(u.isPractitioner){
    if(has('practitioner-clients-10')) return 'Senior Guide';
    if(has('practitioner-clients-5'))  return 'Practitioner Guide';
    if(has('practitioner-mentor-3'))   return 'Verified Practitioner';
    if(has('practitioner-first-client'))return 'Verified Practitioner';
    return 'Practitioner';
  }
  if(has('crowd-leader'))             return 'Community Leader';
  if(has('hosted-10'))                return 'Community Champion';
  if(has('community-host') || has('hosted-1') || u.hostedCount >= 1) return 'Community Host';

  if(has('perfect-verification') || has('verified-streak-25')) return 'Stability Builder';
  if(has('flow-state'))               return 'Flow Master';
  if(has('vitality-master'))          return 'Vitality Master';
  if(has('green-streak-3'))           return 'Energy Seeker';

  if(has('count-100') || has('count-50')) return 'Active Seeker';
  if(has('count-25'))                 return 'Rising Seeker';
  if(has('count-10'))                 return 'Steady Explorer';
  if(has('count-3'))                  return 'Active Explorer';
  return 'New Explorer';
}

// Tunable, never-toxic ranking copy. Returns { rankMeta, copy }.
// - tiny community (≤5): no percentile shown.
// - top half: "Top X%" + an encouraging line.
// - bottom half: no percentile shown (no embarrassing "Top 100%"), just a
//   neutral, forward-looking line.
function buildStanding(rank, total){
  if(total <= 5)  return { rankMeta: '',                 copy: 'Welcome to the journey.' };
  if(rank === 1)  return { rankMeta: 'Leading',          copy: 'Leading the way. ✨' };
  if(rank <= 3)  return { rankMeta: 'On the podium',     copy: "You're on the podium. ✨" };
  const pct = Math.max(1, Math.round((rank / total) * 100));
  if(total >= 20 && pct <= 10) return { rankMeta: `Top ${pct}%`, copy: 'Beautifully done.' };
  if(total >= 8  && pct <= 25) return { rankMeta: `Top ${pct}%`, copy: 'Your journey is showing.' };
  if(pct <= 50)               return { rankMeta: `Top ${pct}%`, copy: 'Climbing well.' };
  return { rankMeta: '', copy: 'Keep building your journey.' };
}

// Optional green pulse dot — shown only on tabs where weekly activity isn't
// implicit (i.e., This Month and All Time), to make active people visible.
function activeDot(u, showActivity){
  if(!showActivity || !u.activeThisWeek) return '';
  return '<span class="lb-active-dot" title="Earned XP this week"></span>';
}

// ---- Podium ---------------------------------------------------------------
function renderPodium(podium, profMap, showActivity){
  if(!podium.length) return '';
  const medals = ['🥇', '🥈', '🥉'];
  return `
    <div class="lb-podium">
      ${podium.map((u, i) => {
        const p = profMap.get(u.user_id) || {};
        const isP = !!p.is_practitioner;
        return `
          <div class="lb-podium-card place-${i + 1}" data-user-id="${esc(u.user_id)}">
            <div class="lb-medal">${medals[i]}</div>
            <div class="lb-avatar lg">${avatarHtml(p.avatar_url, p.display_name)}</div>
            <div class="lb-name">${esc(p.display_name || 'Player')}${isP ? '<span class="lb-pract-pin" title="Practitioner">✓</span>' : ''}${activeDot(u, showActivity)}</div>
            <div class="lb-podium-status">${esc(statusTitle(u))}</div>
            <div class="lb-level">${levelPill(u.xpAll)}</div>
            <div class="lb-xp">${u.xpPeriod} <span class="lb-xp-label">XP</span></div>
            <div class="lb-rare">${renderRare(u.badgesAll)}</div>
          </div>`;
      }).join('')}
    </div>`;
}

// ---- Your Standing --------------------------------------------------------
function renderYourStanding(list, profMap, period, myId){
  if(!myId){
    return `
      <div class="lb-mine empty">
        <p class="lb-mine-msg">Log in to see where you stand on your journey.</p>
        <div class="form-actions" style="margin-top:8px"><a class="btn-join" href="#/login">Log in</a></div>
      </div>`;
  }
  const idx = list.findIndex(u => u.user_id === myId);
  const me = idx >= 0 ? list[idx] : null;
  if(!me || me.xpPeriod === 0){
    const periodLabel = period === 'week'  ? 'this week'
                      : period === 'month' ? 'this month'
                      :                       'so far';
    return `
      <div class="lb-mine empty">
        <p class="lb-mine-msg">Earn an achievement ${periodLabel} to claim your spot here.</p>
      </div>`;
  }
  const rank = idx + 1;
  const total = list.length;
  const profile = profMap.get(myId) || {};
  const standing = buildStanding(rank, total);

  return `
    <div class="lb-mine" data-user-id="${esc(myId)}">
      <div class="lb-mine-eyebrow">Your standing</div>
      <div class="lb-mine-row">
        <div class="lb-avatar md">${avatarHtml(profile.avatar_url, profile.display_name)}</div>
        <div class="lb-mine-id">
          <div class="lb-name">${esc(profile.display_name || 'You')}</div>
          <div class="lb-meta">${levelPill(me.xpAll)} · <span>${esc(statusTitle(me))}</span></div>
        </div>
        <div class="lb-mine-rank">
          <div class="lb-rank-num">#${rank}</div>
          ${standing.rankMeta ? `<div class="lb-rank-meta">${esc(standing.rankMeta)}</div>` : ''}
        </div>
      </div>
      <div class="lb-mine-copy">${esc(standing.copy)}</div>
    </div>`;
}

// ---- List -----------------------------------------------------------------
function renderList(rest, profMap, myId, showActivity){
  if(!rest.length) return '';
  return `
    <div class="lb-list">
      ${rest.map((u, i) => {
        const rank = i + 4;
        const p = profMap.get(u.user_id) || {};
        const mine = u.user_id === myId;
        const isP = !!p.is_practitioner;
        return `
          <div class="lb-row${mine ? ' mine' : ''}" data-user-id="${esc(u.user_id)}">
            <div class="lb-row-rank">#${rank}</div>
            <div class="lb-avatar sm">${avatarHtml(p.avatar_url, p.display_name)}</div>
            <div class="lb-row-info">
              <div class="lb-name-line">
                <span class="lb-name">${esc(p.display_name || 'Player')}</span>
                ${isP ? '<span class="lb-pract-tag" title="Practitioner">✓ Practitioner</span>' : ''}
                ${activeDot(u, showActivity)}
              </div>
              <div class="lb-meta-line">
                ${levelPill(u.xpAll)}
                <span class="lb-status">${esc(statusTitle(u))}</span>
              </div>
            </div>
            <div class="lb-row-rare">${renderRare(u.badgesAll)}</div>
            <div class="lb-row-xp">${u.xpPeriod} <span class="lb-xp-label">XP</span></div>
          </div>`;
      }).join('')}
    </div>`;
}

// ---- Community heartbeat --------------------------------------------------
function plural(n, one, many){ return `${n} ${n === 1 ? one : many}`; }

function renderHeartbeat(journeyCount, weekActiveCount){
  if(journeyCount === 0) return '';
  const left = `${plural(journeyCount, 'explorer', 'explorers')} on the journey`;
  const right = `${weekActiveCount} earning XP this week`;
  return `<div class="lb-heartbeat">${esc(left)} · ${esc(right)}</div>`;
}

function renderEmpty(period, journeyCount){
  let msg;
  if(period === 'week'){
    msg = journeyCount > 0
      ? `${plural(journeyCount, 'explorer', 'explorers')} on the journey — be the first to earn XP this week.`
      : 'Quiet week so far — be the first to earn XP.';
  } else if(period === 'month'){
    msg = 'New month — be the first to earn XP.';
  } else {
    msg = 'No achievements yet. Be the first.';
  }
  return `<div class="lb-empty"><p>${esc(msg)}</p></div>`;
}

// ---- Mini-profile popup ---------------------------------------------------
function openMiniProfile(u, profile){
  const isP = !!(profile && profile.is_practitioner);
  const name = (profile && profile.display_name) || 'Player';
  const lvl = levelFromXP(u.xpAll);
  const verifiedRatio = u.sessionCount > 0
    ? Math.round((u.verifiedCount / u.sessionCount) * 100)
    : null;

  const stats = [
    { val: u.badgesAll.length, label: 'Achievements' },
    { val: u.xpAll,             label: 'Total XP' },
    { val: u.sessionCount,      label: 'Sessions' },
    { val: u.hostedCount,       label: 'Hosted' },
    { val: u.bestSessAvg > 0 ? u.bestSessAvg.toFixed(1) : '—', label: 'Best Session Avg' },
    { val: u.bestSessPeak > 0 ? u.bestSessPeak           : '—', label: 'Best Session Peak' },
    { val: verifiedRatio != null ? verifiedRatio + '%' : '—', label: 'Verified' },
  ];

  const backdrop = document.createElement('div');
  backdrop.className = 'lb-modal-backdrop';
  backdrop.innerHTML = `
    <div class="lb-modal" role="dialog" aria-modal="true">
      <button class="lb-modal-close" aria-label="Close">×</button>
      <div class="lb-modal-head">
        <div class="lb-avatar xl">${avatarHtml(profile && profile.avatar_url, name)}</div>
        <div class="lb-modal-name">${esc(name)}</div>
        ${isP ? '<div class="lb-modal-pract">✓ Verified Practitioner</div>' : ''}
        <div class="lb-modal-status">${esc(statusTitle(u))}</div>
      </div>
      <div class="lb-modal-level">
        <span class="lb-modal-level-eyebrow">Level ${lvl.idx}</span>
        <span class="lb-modal-level-title">${esc(lvl.title)}</span>
      </div>
      ${u.badgesAll.length
        ? `<div class="lb-modal-rare">${renderRare(u.badgesAll)}</div>`
        : ''}
      <div class="lb-modal-stats">
        ${stats.map(s => `
          <div class="lbm-stat">
            <div class="lbm-val">${s.val}</div>
            <div class="lbm-lbl">${esc(s.label)}</div>
          </div>`).join('')}
      </div>
    </div>`;

  document.body.appendChild(backdrop);
  // Small delay before animating in.
  requestAnimationFrame(() => backdrop.classList.add('open'));

  const close = () => {
    document.removeEventListener('keydown', onEsc);
    backdrop.classList.remove('open');
    setTimeout(() => { if(backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 180);
  };
  const onEsc = (e) => { if(e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEsc);
  backdrop.addEventListener('click', (e) => {
    if(e.target === backdrop || e.target.closest('.lb-modal-close')) close();
  });

  return close;
}

// ---- Mount ----------------------------------------------------------------
export function mount(el){
  const state = { period: 'week' };
  let allRows = null;       // { ach, sessRes, sessions }
  let activeClose = null;   // popup close handle if open

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Global Ranking</h1>
      <p class="page-sub">Where you stand on your journey.</p>
    </div>
    <div class="lb-tabs" id="lbTabs">
      ${PERIODS.map(p => `
        <button class="lb-tab${p.id === state.period ? ' active' : ''}" data-period="${p.id}">
          ${esc(p.label)}
        </button>`).join('')}
    </div>
    <div id="lbBody"><div class="empty">Loading…</div></div>
  `;

  const body = el.querySelector('#lbBody');
  const tabs = el.querySelector('#lbTabs');

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.lb-tab');
    if(!btn || btn.classList.contains('active')) return;
    state.period = btn.dataset.period;
    tabs.querySelectorAll('.lb-tab').forEach(b => b.classList.toggle('active', b === btn));
    render();
  });

  // Click delegation — open mini-profile when a row/podium/standing is clicked.
  body.addEventListener('click', (e) => {
    if(e.target.closest('a, button')) return;   // ignore links/buttons inside
    const card = e.target.closest('[data-user-id]');
    if(!card) return;
    const uid = card.dataset.userId;
    const u = body._users && body._users.get(uid);
    const profile = body._profs && body._profs.get(uid);
    if(u){ activeClose = openMiniProfile(u, profile || {}); }
  });

  async function load(){
    body.innerHTML = '<div class="empty">Loading…</div>';
    const [achR, sessResR, sessionsR] = await Promise.all([
      supabase.from('user_achievements').select('user_id, achievement_id, unlocked_at'),
      supabase.from('results').select('user_id, session_id, avg, peak, verified').not('session_id', 'is', null),
      supabase.from('sessions').select('id, created_by_user_id'),
    ]);
    if(achR.error){ body.innerHTML = `<div class="empty">Could not load: ${esc(achR.error.message)}</div>`; return; }
    allRows = { ach: achR.data || [], sessRes: sessResR.data || [], sessions: sessionsR.data || [] };
    render();
  }

  async function render(){
    if(!allRows) return;
    const start = periodStart(state.period);
    const weekStart = periodStart('week');     // for activeThisWeek flag
    const userMap = new Map();
    const ensure = (id) => {
      let u = userMap.get(id);
      if(!u){
        u = { user_id: id, xpAll: 0, xpPeriod: 0, badgesAll: [],
              sessionCount: 0, hostedCount: 0,
              bestSessAvg: 0, bestSessPeak: 0, verifiedCount: 0,
              isPractitioner: false, activeThisWeek: false };
        userMap.set(id, u);
      }
      return u;
    };

    for(const r of allRows.ach){
      const cat = CATALOG.get(r.achievement_id);
      if(!cat) continue;
      const u = ensure(r.user_id);
      const xp = TIER_XP[cat.tier] || 0;
      const ts = new Date(r.unlocked_at);
      u.xpAll += xp;
      u.badgesAll.push({ ...cat, id: r.achievement_id, unlocked_at: r.unlocked_at });
      if(!start || ts >= start)     u.xpPeriod += xp;
      if(weekStart && ts >= weekStart) u.activeThisWeek = true;
    }
    for(const r of allRows.sessRes){
      const u = ensure(r.user_id);
      u.sessionCount++;
      if((r.avg  || 0) > u.bestSessAvg)  u.bestSessAvg  = r.avg  || 0;
      if((r.peak || 0) > u.bestSessPeak) u.bestSessPeak = r.peak || 0;
      if(r.verified) u.verifiedCount++;
    }
    for(const s of allRows.sessions){
      if(s.created_by_user_id){
        ensure(s.created_by_user_id).hostedCount++;
      }
    }

    // Community heartbeat numbers — count users who've ever earned XP and
    // those active this week. Same numbers across all tabs (stable signal).
    const onJourney = [...userMap.values()].filter(u => u.xpAll > 0);
    const journeyCount = onJourney.length;
    const weekActiveCount = onJourney.filter(u => u.activeThisWeek).length;

    const list = [...userMap.values()]
      .filter(u => u.xpPeriod > 0)
      .sort((a, b) => b.xpPeriod - a.xpPeriod);

    const me = auth.getState();
    const myId = me.user?.id || null;

    // The green active-dot is only useful when "active this week" isn't
    // implicit. On the This Week tab everyone on the list is already active.
    const showActivity = state.period !== 'week';

    if(!list.length){
      body.innerHTML = `
        ${renderHeartbeat(journeyCount, weekActiveCount)}
        ${renderYourStanding(list, new Map(), state.period, myId)}
        ${renderEmpty(state.period, journeyCount)}`;
      body._users = userMap;
      body._profs = new Map();
      return;
    }

    const top = list.slice(0, 100);
    const ids = new Set(top.map(u => u.user_id));
    if(myId) ids.add(myId);
    const { data: profs } = await supabase
      .from('profiles').select('id, display_name, avatar_url, is_practitioner').in('id', [...ids]);
    const profMap = new Map((profs || []).map(p => [p.id, p]));
    for(const u of userMap.values()){
      const p = profMap.get(u.user_id);
      u.isPractitioner = !!(p && p.is_practitioner);
    }

    const podium = top.slice(0, 3);
    const rest = top.slice(3);

    body.innerHTML = `
      ${renderHeartbeat(journeyCount, weekActiveCount)}
      ${renderPodium(podium, profMap, showActivity)}
      ${renderYourStanding(list, profMap, state.period, myId)}
      ${renderList(rest, profMap, myId, showActivity)}
    `;
    body._users = userMap;
    body._profs = profMap;
  }

  load();
  return () => {
    if(activeClose) activeClose();
  };
}
