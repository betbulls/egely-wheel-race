import { supabase } from './db.js';
import * as auth from './auth.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img class="sess-avatar" src="${esc(url)}" alt="">`;
  return `<span class="sess-avatar sess-avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

// Mounts the Group Sessions view into `el`. Returns a cleanup function.
export function mount(el){
  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Sessions</h1>
      <p class="page-sub">Live and upcoming group measurements — and the journeys others have already taken.</p>
    </div>

    <section class="sess-section">
      <h2 class="sess-section-title">Upcoming <span class="sess-section-sub">live first</span></h2>
      <div class="session-list" id="upcomingList">
        <div class="empty">Loading…</div>
      </div>
    </section>

    <section class="sess-section">
      <h2 class="sess-section-title">Past</h2>
      <div class="session-list" id="pastList">
        <div class="empty">Loading…</div>
      </div>
    </section>
  `;

  const $ = id => el.querySelector('#' + id);
  let sessions = [];
  let resultsBySession = new Map();
  let organizersById = new Map();   // user_id -> { display_name, avatar_url }

  async function loadSessions(){
    const [{ data, error }, resRes] = await Promise.all([
      supabase.from('sessions').select('*').order('scheduled_start', { ascending: true }),
      supabase.from('results').select('session_id, avg, verified'),
    ]);
    if(error){
      $('sessionList').innerHTML = '<div class="empty">Could not load sessions: ' + error.message + '</div>';
      return;
    }
    resultsBySession = new Map();
    for(const r of (resRes.data || [])){
      if(r.session_id == null) continue;
      if(!resultsBySession.has(r.session_id)) resultsBySession.set(r.session_id, []);
      resultsBySession.get(r.session_id).push({ avg: r.avg || 0, verified: r.verified });
    }
    sessions = data || [];

    const organizerIds = [...new Set(sessions.map(s => s.created_by_user_id).filter(Boolean))];
    organizersById = new Map();
    if(organizerIds.length){
      const { data: profs } = await supabase
        .from('profiles').select('id, display_name, avatar_url').in('id', organizerIds);
      for(const p of (profs || [])) organizersById.set(p.id, p);
    }
    renderSessions();
  }

  function sessionState(s, now){
    const start = new Date(s.scheduled_start).getTime();
    const end = start + (s.duration_minutes || 0) * 60000;
    if(now < start) return 'upcoming';
    if(now <= end) return 'live';
    return 'finished';
  }

  function formatStart(iso){
    return new Date(iso).toLocaleString('en-US', {
      weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }

  function formatCountdown(ms){
    if(ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  }

  function buildSessionCard(s, state, now){
    const start = new Date(s.scheduled_start).getTime();
    const card = document.createElement('div');
    card.className = 'session-card ' + state;
    card.dataset.start = start;
    card.dataset.end = start + (s.duration_minutes || 0) * 60000;

    const main = document.createElement('div');
    main.className = 'session-main';
    const name = document.createElement('div');
    name.className = 'session-name';
    name.textContent = s.name || 'Untitled session';
    if(s.verified_only){
      const vt = document.createElement('span');
      vt.className = 'sess-verified';
      vt.textContent = '✓ Verified';
      name.appendChild(vt);
    }
    const prof = s.created_by_user_id ? organizersById.get(s.created_by_user_id) : null;
    const organizerName = (prof && prof.display_name) || s.created_by || 'unknown';
    const meta = document.createElement('div');
    meta.className = 'session-meta';
    meta.innerHTML = `${esc(formatStart(s.scheduled_start))} · ${s.duration_minutes} min`
      + ` · <span class="session-organizer">${avatarHtml(prof && prof.avatar_url, organizerName)}`
      + `<span class="organizer-name">${esc(organizerName)}</span></span>`;
    main.append(name, meta);

    const right = document.createElement('div');
    right.className = 'session-right';
    const badge = document.createElement('span');
    badge.className = 'badge ' + state;
    badge.innerHTML = state === 'live'     ? '<span class="badge-dot"></span>Live'
                    : state === 'upcoming' ? 'Upcoming'
                    :                         'Finished';
    const cd = document.createElement('div');
    cd.className = 'countdown' + (state === 'live' ? ' live' : '');
    cd.dataset.role = 'countdown';
    const join = document.createElement('a');
    join.className = 'btn-join';
    join.href = '#/room/' + s.id;
    join.textContent = state === 'finished' ? 'View' : 'Join';
    right.append(badge, cd);
    if(state === 'finished'){
      const rs = resultsBySession.get(s.id) || [];
      const arr = (s.verified_only ? rs.filter(r => r.verified) : rs).map(r => r.avg);
      if(arr.length){
        const avg = arr.reduce((x, y) => x + y, 0) / arr.length;
        const avgEl = document.createElement('div');
        avgEl.className = 'session-avg';
        avgEl.innerHTML = `Avg <b>${avg.toFixed(1)}</b>`;
        right.append(avgEl);
      }
    }
    right.append(join);

    card.append(main, right);
    return card;
  }

  function renderSessions(){
    const upcomingEl = $('upcomingList');
    const pastEl = $('pastList');
    if(!upcomingEl || !pastEl) return;   // view was unmounted before async resolution

    const now = Date.now();
    const upcoming = [];
    const past = [];
    for(const s of sessions){
      const st = sessionState(s, now);
      if(st === 'finished') past.push({ s, st }); else upcoming.push({ s, st });
    }
    // Upcoming: live first, then nearest start time.
    upcoming.sort((a, b) => {
      if(a.st !== b.st) return a.st === 'live' ? -1 : 1;
      return new Date(a.s.scheduled_start) - new Date(b.s.scheduled_start);
    });
    // Past: most recent first.
    past.sort((a, b) => new Date(b.s.scheduled_start) - new Date(a.s.scheduled_start));

    upcomingEl.innerHTML = '';
    if(!upcoming.length){
      upcomingEl.innerHTML = '<div class="empty">No sessions on the horizon — start one from the + button.</div>';
    } else {
      for(const { s, st } of upcoming) upcomingEl.appendChild(buildSessionCard(s, st, now));
    }

    pastEl.innerHTML = '';
    if(!past.length){
      pastEl.innerHTML = '<div class="empty">No past sessions yet.</div>';
    } else {
      for(const { s, st } of past) pastEl.appendChild(buildSessionCard(s, st, now));
    }

    tickCountdowns();
  }

  function tickCountdowns(){
    const now = Date.now();
    let needsReorder = false;
    el.querySelectorAll('.session-card').forEach(card => {
      const start = Number(card.dataset.start);
      const end = Number(card.dataset.end);
      const cd = card.querySelector('[data-role="countdown"]');
      const isLive = card.classList.contains('live');
      const isFinished = card.classList.contains('finished');
      if(now < start){
        cd.textContent = 'in ' + formatCountdown(start - now);
        if(isLive || isFinished) needsReorder = true;
      } else if(now <= end){
        cd.textContent = formatCountdown(end - now) + ' left';
        if(!isLive) needsReorder = true;
      } else {
        cd.textContent = '';
        if(!isFinished) needsReorder = true;
      }
    });
    if(needsReorder) renderSessions();
  }

  const channel = supabase.channel('sessions-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => loadSessions())
    .subscribe();

  const tickTimer = setInterval(tickCountdowns, 1000);

  loadSessions();

  return () => {
    clearInterval(tickTimer);
    supabase.removeChannel(channel);
  };
}
