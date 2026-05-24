import { supabase } from './db.js';

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
          <div class="field">
            <label for="fOrganizer">Organizer name</label>
            <input type="text" id="fOrganizer" placeholder="Your name" required maxlength="60">
          </div>
          <div class="field full check-field">
            <label class="check"><input type="checkbox" id="fVerified"> Verified session — only legitimate measurements count toward the results</label>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" id="btnCreate">Create session</button>
          <span class="form-msg" id="formMsg"></span>
        </div>
      </form>
    </div>

    <div class="panel">
      <h2>Upcoming sessions</h2>
      <div class="session-list" id="sessionList">
        <div class="empty">Loading…</div>
      </div>
    </div>
  `;

  const $ = id => el.querySelector('#' + id);
  let sessions = [];

  async function loadSessions(){
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('scheduled_start', { ascending: true });
    if(error){
      $('sessionList').innerHTML = '<div class="empty">Could not load sessions: ' + error.message + '</div>';
      return;
    }
    sessions = data || [];
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
      const meta = document.createElement('div');
      meta.className = 'session-meta';
      meta.textContent = `${formatStart(s.scheduled_start)} · ${s.duration_minutes} min · by ${s.created_by || 'unknown'}`;
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
      right.append(badge, cd, join);

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
    const name = $('fName').value.trim();
    const date = $('fDate').value;
    const time = $('fTime').value;
    const duration = parseInt($('fDuration').value, 10);
    const organizer = $('fOrganizer').value.trim();

    if(!name || !date || !time || !duration || !organizer){
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
      created_by: organizer,
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
