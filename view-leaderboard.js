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

function positiveCopy(rank, total){
  if(total === 1) return 'You are the journey so far. ✨';
  if(rank === 1) return "You're leading the way. ✨";
  if(rank <= 3) return "You're on the podium. ✨";
  const pct = Math.max(1, Math.round((rank / total) * 100));
  if(pct <= 10) return `Top ${pct}% — beautifully done.`;
  if(pct <= 25) return `Top ${pct}% — your journey is showing.`;
  if(pct <= 50) return 'You are climbing — keep going.';
  return 'Every step is part of the journey.';
}

// ---- Podium ---------------------------------------------------------------
function renderPodium(podium, profMap){
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
            <div class="lb-name">${esc(p.display_name || 'Player')}${isP ? '<span class="lb-pract-pin" title="Practitioner">✓</span>' : ''}</div>
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
  const pct = total > 1 ? Math.max(1, Math.round((rank / total) * 100)) : 100;
  const profile = profMap.get(myId) || {};
  const copy = positiveCopy(rank, total);

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
          <div class="lb-rank-meta">${total > 1 ? `Top ${pct}%` : '&nbsp;'}</div>
        </div>
      </div>
      <div class="lb-mine-copy">${esc(copy)}</div>
    </div>`;
}

// ---- List -----------------------------------------------------------------
function renderList(rest, profMap, myId){
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

function renderEmpty(period){
  const msg = period === 'week'  ? 'Quiet week so far — be the first to earn XP.'
            : period === 'month' ? 'New month — be the first to earn XP.'
            :                       'No achievements yet. Be the first.';
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
    const userMap = new Map();
    const ensure = (id) => {
      let u = userMap.get(id);
      if(!u){
        u = { user_id: id, xpAll: 0, xpPeriod: 0, badgesAll: [],
              sessionCount: 0, hostedCount: 0,
              bestSessAvg: 0, bestSessPeak: 0, verifiedCount: 0,
              isPractitioner: false };
        userMap.set(id, u);
      }
      return u;
    };

    for(const r of allRows.ach){
      const cat = CATALOG.get(r.achievement_id);
      if(!cat) continue;
      const u = ensure(r.user_id);
      const xp = TIER_XP[cat.tier] || 0;
      u.xpAll += xp;
      u.badgesAll.push({ ...cat, id: r.achievement_id, unlocked_at: r.unlocked_at });
      if(!start || new Date(r.unlocked_at) >= start){
        u.xpPeriod += xp;
      }
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

    const list = [...userMap.values()]
      .filter(u => u.xpPeriod > 0)
      .sort((a, b) => b.xpPeriod - a.xpPeriod);

    const me = auth.getState();
    const myId = me.user?.id || null;

    if(!list.length){
      body.innerHTML = `
        ${renderYourStanding(list, new Map(), state.period, myId)}
        ${renderEmpty(state.period)}`;
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
    // Attach isPractitioner to user entries (so statusTitle can use it)
    for(const u of userMap.values()){
      const p = profMap.get(u.user_id);
      u.isPractitioner = !!(p && p.is_practitioner);
    }

    const podium = top.slice(0, 3);
    const rest = top.slice(3);

    body.innerHTML = `
      ${renderPodium(podium, profMap)}
      ${renderYourStanding(list, profMap, state.period, myId)}
      ${renderList(rest, profMap, myId)}
    `;
    // Stash for the click-to-popup delegate.
    body._users = userMap;
    body._profs = profMap;
  }

  load();
  return () => {
    if(activeClose) activeClose();
  };
}
