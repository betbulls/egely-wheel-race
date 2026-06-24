import { supabase } from './db.js';
import * as auth from './auth.js';
import { createAddToCalendar } from './calendar.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const STARTING_SOON_MS = 10 * 60 * 1000;   // "Starting soon" window before the official start
const MAX_WATCH = 30;                       // cap on live room-presence channels watched at once

function avatarHtml(url, name){
  if(url) return `<img class="sess-avatar" src="${esc(url)}" alt="">`;
  return `<span class="sess-avatar sess-avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

// Restricted sessions stay visible in the list (entry is gated in the room) —
// a small badge tells people they'll need a link / a connection to join.
function accessBadgeHtml(mode){
  const base = 'display:inline-block;margin-left:6px;font-size:10px;font-weight:700;letter-spacing:.04em;'
    + 'text-transform:uppercase;border-radius:999px;padding:2px 8px;vertical-align:middle;';
  if(mode === 'invite') return `<span style="${base}color:#5230da;background:rgba(82,48,218,.1)">Invite link required</span>`;
  if(mode === 'followers') return `<span style="${base}color:#0e7490;background:rgba(14,116,144,.1)">Followers only</span>`;
  return '';
}

function pillHtml(state){
  switch(state){
    case 'live':     return '<span class="badge live"><span class="badge-dot"></span>Live now</span>';
    case 'practice': return '<span class="badge practice"><span class="badge-dot"></span>Practice room</span>';
    case 'soon':     return '<span class="badge soon">Starting soon</span>';
    case 'finished': return '<span class="badge finished">Finished</span>';
    default:         return '<span class="badge upcoming">Upcoming</span>';
  }
}

// Mounts the Group Sessions view into `el`. Returns a cleanup function.
export function mount(el){
  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Sessions</h1>
      <p class="page-sub">Live and upcoming group measurements — drop into a room to practise together before the official measurement begins.</p>
    </div>

    <div class="sess-summary" id="sessSummary"></div>

    <section class="sess-section">
      <h2 class="sess-section-title">Live &amp; upcoming <span class="sess-section-sub">rooms you can enter now</span></h2>
      <div class="session-list" id="upcomingList"><div class="empty">Loading…</div></div>
    </section>

    <section class="sess-section">
      <h2 class="sess-section-title">Past <span class="sess-section-sub">results</span></h2>
      <div class="session-list" id="pastList"><div class="empty">Loading…</div></div>
    </section>
  `;

  const $ = id => el.querySelector('#' + id);
  let sessions = [];
  let resultsBySession = new Map();
  let organizersById = new Map();        // user_id -> { display_name, avatar_url }
  const roomCounts = new Map();          // sessionId -> people currently in the room (presence)
  const roomChannels = new Map();        // sessionId -> presence channel (observer, never tracks)

  async function loadSessions(){
    const [{ data, error }, resRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('event_type', 'session').order('scheduled_start', { ascending: true }),
      supabase.from('results').select('session_id, avg, verified'),
    ]);
    if(error){
      $('upcomingList').innerHTML = '<div class="empty">Could not load sessions: ' + esc(error.message) + '</div>';
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
        .from('profiles').select('id, display_name, avatar_url, approved_maker, practitioner_handle').in('id', organizerIds);
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

  // Precise MM:SS / HH:MM:SS — used while a session is LIVE (time left).
  function formatCountdown(ms){
    if(ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  }

  // Adaptive "time until start" — readable at any distance.
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
    return `${sec}s`;   // final minute: count the seconds down to zero
  }

  function activityText(base, count){
    if(base === 'finished') return '';
    if(count > 0) return `${count} in room`;
    return base === 'live' ? 'Starting' : 'Room open';
  }

  function buildSessionCard(s, st, now){
    const start = new Date(s.scheduled_start).getTime();
    const end = start + (s.duration_minutes || 0) * 60000;
    const count = roomCounts.get(s.id) || 0;

    // Base state; "practice" is derived live from the room's presence count.
    let base;
    if(st === 'live') base = 'live';
    else if(st === 'finished') base = 'finished';
    else base = (start - now <= STARTING_SOON_MS) ? 'soon' : 'upcoming';
    const shown = (count > 0 && (base === 'upcoming' || base === 'soon')) ? 'practice' : base;

    const prof = s.created_by_user_id ? organizersById.get(s.created_by_user_id) : null;
    const organizerName = (prof && prof.display_name) || s.created_by || 'unknown';

    // Right-hand action — names what the user actually does right now.
    const actionMain = base === 'finished'
      ? `<a class="btn-join sess-view" href="#/room/${s.id}">View results</a>`
      : base === 'live'
        ? `<a class="btn-join" href="#/room/${s.id}">Join live</a>`
        : `<a class="btn-join" href="#/room/${s.id}">Enter room</a>`;

    // Finished sessions show the group average (verified-only if the session was).
    let avgHtml = '';
    if(base === 'finished'){
      const rs = resultsBySession.get(s.id) || [];
      const arr = (s.verified_only ? rs.filter(r => r.verified) : rs).map(r => r.avg);
      if(arr.length){
        const avg = arr.reduce((x, y) => x + y, 0) / arr.length;
        avgHtml = `<div class="session-avg">Avg <b>${avg.toFixed(1)}</b></div>`;
      }
    }
    // Finished activity = racer count; live/upcoming = presence count.
    const activity = base === 'finished'
      ? ((resultsBySession.get(s.id) || []).length
          ? `${(resultsBySession.get(s.id) || []).length} ${(resultsBySession.get(s.id) || []).length === 1 ? 'racer' : 'racers'}`
          : '')
      : activityText(base, count);

    const card = document.createElement('div');
    card.className = 'session-card ' + shown;
    card.dataset.start = start;
    card.dataset.end = end;
    card.dataset.id = s.id;
    card.dataset.base = base;

    // Past: compact "Hosted by X" meta. Upcoming/live: the host is a focal trust
    // anchor — you're entering someone's room — so give them a prominent strip.
    const isPract = !!(prof && prof.approved_maker);
    const nameRow = `<div class="session-name">${esc(s.name || 'Untitled session')}${s.verified_only ? '<span class="sess-verified">✓ Verified</span>' : ''}${accessBadgeHtml(s.access_mode)}</div>`;
    const leftHtml = base === 'finished'
      ? `${nameRow}
        <div class="session-meta">Hosted by <span class="session-organizer">${avatarHtml(prof && prof.avatar_url, organizerName)}<span class="organizer-name">${esc(organizerName)}</span></span> · ${esc(formatStart(s.scheduled_start))} · ${s.duration_minutes} min</div>`
      : `${nameRow}
        <div class="sess-host">
          <span class="sess-host-av">${avatarHtml(prof && prof.avatar_url, organizerName)}</span>
          <div class="sess-host-txt">
            <div class="sess-host-line"><span class="sess-host-pre">${base === 'live' ? 'Live with' : 'Practice with'}</span> <span class="sess-host-name">${(isPract && prof && prof.practitioner_handle) ? `<a class="maker-name-link" href="#/connect/${esc(prof.practitioner_handle)}">${esc(organizerName)}</a>` : esc(organizerName)}</span></div>
            ${isPract ? '<span class="sess-host-tag">✓ Spiritual Maker</span>' : ''}
          </div>
        </div>
        <div class="session-meta sess-when">${esc(formatStart(s.scheduled_start))} · ${s.duration_minutes} min</div>`;

    card.innerHTML = `
      <div class="sess-left">${leftHtml}</div>
      <div class="sess-mid">
        ${pillHtml(shown)}
        <span class="sess-activity">${esc(activity)}</span>
      </div>
      <div class="sess-right">
        <div class="countdown${base === 'live' ? ' live' : ''}" data-role="countdown"></div>
        ${avgHtml}
        <div class="sess-actions">${actionMain}</div>
      </div>`;

    // "Remind me" (calendar) for anything not yet finished or live.
    if(base !== 'live' && base !== 'finished'){
      card.querySelector('.sess-actions').append(createAddToCalendar({ ...s, _hostName: organizerName }));
    }
    return card;
  }

  // Sort rank for the Upcoming section: live → active practice room → soon → later.
  function rank(s, st, now){
    if(st === 'live') return 0;
    if((roomCounts.get(s.id) || 0) > 0) return 1;
    const start = new Date(s.scheduled_start).getTime();
    if(start - now <= STARTING_SOON_MS) return 2;
    return 3;
  }

  function renderSummary(){
    const sumEl = $('sessSummary');
    if(!sumEl) return;
    const now = Date.now();
    let live = 0, practice = 0, upcoming = 0, past = 0;
    for(const s of sessions){
      const st = sessionState(s, now);
      if(st === 'live') live++;
      else if(st === 'finished') past++;
      else if((roomCounts.get(s.id) || 0) > 0) practice++;
      else upcoming++;
    }
    sumEl.innerHTML = `
      <div class="sess-sum${live ? ' on' : ''}"><div class="sess-sum-n">${live}</div><div class="sess-sum-l">Live now</div></div>
      <div class="sess-sum${practice ? ' on cyan' : ''}"><div class="sess-sum-n">${practice}</div><div class="sess-sum-l">Practice rooms</div></div>
      <div class="sess-sum"><div class="sess-sum-n">${upcoming}</div><div class="sess-sum-l">Upcoming</div></div>
      <div class="sess-sum"><div class="sess-sum-n">${past}</div><div class="sess-sum-l">Past results</div></div>`;
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
    upcoming.sort((a, b) => {
      const ra = rank(a.s, a.st, now), rb = rank(b.s, b.st, now);
      if(ra !== rb) return ra - rb;
      return new Date(a.s.scheduled_start) - new Date(b.s.scheduled_start);
    });
    past.sort((a, b) => new Date(b.s.scheduled_start) - new Date(a.s.scheduled_start));

    upcomingEl.innerHTML = '';
    if(!upcoming.length){
      upcomingEl.innerHTML = '<div class="empty">No live or upcoming rooms right now — start one from the + button.</div>';
    } else {
      for(const { s, st } of upcoming) upcomingEl.appendChild(buildSessionCard(s, st, now));
    }

    pastEl.innerHTML = '';
    if(!past.length){
      pastEl.innerHTML = '<div class="empty">No past sessions yet.</div>';
    } else {
      for(const { s, st } of past) pastEl.appendChild(buildSessionCard(s, st, now));
    }

    // Watch the room presence of every live/upcoming session (graceful: 0 → "Room open").
    let watched = 0;
    for(const { s } of upcoming){
      if(watched++ >= MAX_WATCH) break;
      watchRoom(s.id);
    }

    renderSummary();
    tickCountdowns();
  }

  // Update one card's activity + pill in place when its room presence changes —
  // cheap, and avoids re-rendering (which would flicker the countdowns).
  function applyRoomCount(id){
    const card = el.querySelector(`.session-card[data-id="${CSS.escape(String(id))}"]`);
    if(!card) return;
    const base = card.dataset.base;
    if(base === 'finished') return;
    const count = roomCounts.get(id) || 0;
    const act = card.querySelector('.sess-activity');
    if(act) act.textContent = activityText(base, count);
    if(base === 'live') return;   // official-live pill never becomes "practice"
    const shown = count > 0 ? 'practice' : base;
    card.className = 'session-card ' + shown;
    const badge = card.querySelector('.badge');
    if(badge) badge.outerHTML = pillHtml(shown);
  }

  // Observer subscription — we read the room's presence WITHOUT tracking, so the
  // list page is never counted as a participant. (Per-session channel; fine at this
  // scale. A server-side aggregate would be the move if sessions grow large.)
  function watchRoom(id){
    if(roomChannels.has(id)) return;
    const ch = supabase.channel('room-' + id, { config: { presence: { key: 'sessions-lobby' } } });
    ch.on('presence', { event: 'sync' }, () => {
      roomCounts.set(id, Object.keys(ch.presenceState()).length);
      applyRoomCount(id);
      renderSummary();
    }).subscribe();
    roomChannels.set(id, ch);
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
      if(!cd) return;
      if(now < start){
        cd.textContent = 'Official session in ' + formatUntil(start - now);
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
    for(const ch of roomChannels.values()) supabase.removeChannel(ch);
    roomChannels.clear();
  };
}
