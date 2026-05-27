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
      <h1 class="page-title">Group Sessions</h1>
      <p class="page-sub">Schedule a session and measure together, live.</p>
    </div>

    <div class="panel">
      <h2>Create a group session</h2>
      <form id="createForm">
        <div class="form-grid">
          <div class="field full">
            <label for="fName">Session name</label>
            <input type="text" id="fName" placeholder="e.g. Sunday Morning Meditation" required maxlength="80">
          </div>
          <div class="field">
            <label for="fDate">Date</label>
            <input type="date" id="fDate" required>
          </div>
          <div class="field">
            <label for="fTime">Start time</label>
            <input type="time" id="fTime" required>
          </div>
          <div class="field">
            <label for="fDuration">Duration (minutes)</label>
            <input type="number" id="fDuration" min="1" max="240" value="10" required>
          </div>
          <div class="field full check-field">
            <label class="check"><input type="checkbox" id="fVerified"> Verified session — only legitimate measurements count toward the results</label>
          </div>
        </div>
        <div class="organizer-note" id="organizerNote"></div>
        <div class="form-actions">
          <button type="submit" id="btnCreate">Create session</button>
          <span class="form-msg" id="formMsg"></span>
        </div>
      </form>
    </div>

    <div class="panel">
      <h2>Sessions</h2>
      <div class="session-list" id="sessionList">
        <div class="empty">Loading…</div>
      </div>
    </div>
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

  function renderSessions(){
    const list = $('sessionList');
    if(sessions.length === 0){
      list.innerHTML = '<div class="empty">No sessions yet. Create the first one above.</div>';
      return;
    }
    const now = Date.now();
    const order = { live: 0, upcoming: 1, finished: 2 };
    const sorted = [...sessions].sort((a, b) => {
      const sa = sessionState(a, now), sb = sessionState(b, now);
      if(order[sa] !== order[sb]) return order[sa] - order[sb];
      const ta = new Date(a.scheduled_start).getTime();
      const tb = new Date(b.scheduled_start).getTime();
      return sa === 'finished' ? tb - ta : ta - tb;
    });

    list.innerHTML = '';
    for(const s of sorted){
      const state = sessionState(s, now);
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
      badge.textContent = state === 'live' ? 'Live' : state === 'upcoming' ? 'Upcoming' : 'Finished';
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
      list.appendChild(card);
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

  $('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = auth.getState();
    if(!a.user){
      setFormMsg('Log in to create a session.', 'err');
      return;
    }
    const name = $('fName').value.trim();
    const date = $('fDate').value;
    const time = $('fTime').value;
    const duration = parseInt($('fDuration').value, 10);

    if(!name || !date || !time || !duration){
      setFormMsg('Please fill in every field.', 'err');
      return;
    }
    const start = new Date(`${date}T${time}`);
    if(isNaN(start.getTime())){
      setFormMsg('Invalid date or time.', 'err');
      return;
    }

    $('btnCreate').disabled = true;
    setFormMsg('Creating…', '');
    const { error } = await supabase.from('sessions').insert({
      name,
      scheduled_start: start.toISOString(),
      duration_minutes: duration,
      status: 'scheduled',
      created_by: a.displayName,
      created_by_user_id: a.user.id,
      verified_only: $('fVerified').checked
    });
    $('btnCreate').disabled = false;

    if(error){
      setFormMsg('Error: ' + error.message, 'err');
      return;
    }
    setFormMsg('Session created.', 'ok');
    $('fName').value = '';
    loadSessions();
  });

  function setFormMsg(text, state){
    const elMsg = $('formMsg');
    elMsg.className = 'form-msg ' + (state || '');
    elMsg.textContent = text;
  }

  $('fDate').value = new Date().toISOString().slice(0, 10);

  const unsubAuth = auth.subscribeAuth(a => {
    const note = $('organizerNote');
    if(!note) return;
    if(a.user){
      note.innerHTML = `<span class="organizer-label">Organized by</span> ${avatarHtml(a.avatarUrl, a.displayName)} <b>${esc(a.displayName)}</b>`;
      $('btnCreate').disabled = false;
    } else {
      note.innerHTML = `<a class="link" href="#/login">Log in</a> to create a session.`;
      $('btnCreate').disabled = true;
    }
  });

  const channel = supabase.channel('sessions-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => loadSessions())
    .subscribe();

  const tickTimer = setInterval(tickCountdowns, 1000);

  loadSessions();

  return () => {
    clearInterval(tickTimer);
    unsubAuth();
    supabase.removeChannel(channel);
  };
}
