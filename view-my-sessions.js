// view-my-sessions.js — "My Sessions" management page (#/my-sessions).
//
// Lists the sessions THIS user created, split into Live now / Upcoming / Past.
// Only an UPCOMING (not yet started) session can be edited (inline modal) or
// deleted (confirm modal). Live and finished sessions are view-only — results,
// presence, rankings and member trust depend on them, so they are never
// editable or deletable.
//
// Permissions:
//  - Edit uses the existing "update sessions" RLS policy (created_by_user_id =
//    auth.uid()). The not-started gate is enforced client-side only — the DB
//    UPDATE policy must stay time-agnostic because the host writes group_avg /
//    racer_count AFTER the session ends (view-room.js maybeSaveGroup).
//  - Delete uses a dedicated RLS policy "delete own upcoming session" that also
//    enforces scheduled_start > now() AND no saved results.
//  - PostgREST silently affects 0 rows when RLS blocks a write (no error), so
//    every update/delete uses .select() and verifies a row actually came back.
//
// Self-contained scoped <style> (.mys-*) — no index.html / ewr-redesign.css edits.
import * as auth from './auth.js';
import { supabase } from './db.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const pad2 = n => String(n).padStart(2, '0');

function styles(){
  if(document.getElementById('mysStyles')) return;
  const el = document.createElement('style');
  el.id = 'mysStyles';
  el.textContent = `
  .mys-wrap{max-width:720px;margin:0 auto;padding:8px 0}
  .mys-head{margin-bottom:18px;position:relative}
  .mys-head h1{font-family:'Montserrat',sans-serif;font-weight:600;font-size:28px;margin:0 0 6px;color:#011624;letter-spacing:-0.3px}
  .mys-head p{color:#67737c;font-size:14px;line-height:1.5;margin:0;max-width:560px}
  .mys-new{display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-family:'Inter',sans-serif;
    font-size:14px;font-weight:700;padding:10px 18px;border-radius:999px;background:#401d91;color:#fff;
    text-decoration:none;transition:background .15s,transform .15s}
  .mys-new:hover{background:#011624;transform:translateY(-1px)}
  .mys-sec{margin-top:24px}
  .mys-sec h2{font-family:'Montserrat',sans-serif;font-weight:600;font-size:13px;letter-spacing:.12em;
    text-transform:uppercase;color:#67737c;margin:0 0 12px}
  .mys-list{display:flex;flex-direction:column;gap:10px}
  .mys-empty{color:#99a2a7;font-size:14px;padding:8px 2px}
  .mys-card{display:grid;grid-template-columns:1fr auto;gap:12px 16px;align-items:center;
    background:#fff;border:1px solid #dfe3e6;border-radius:16px;padding:16px 18px;
    box-shadow:0 10px 28px rgba(1,22,36,.08)}
  .mys-card.live{border-color:rgba(82,48,218,.35);box-shadow:0 12px 30px rgba(82,48,218,.12)}
  .mys-main{min-width:0}
  .mys-title{font-family:'Inter',sans-serif;font-weight:700;color:#011624;font-size:16px;
    display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .mys-verified{font-size:11px;font-weight:700;color:#0f8a52;background:rgba(32,178,107,.12);
    border-radius:999px;padding:2px 8px;letter-spacing:.02em}
  .mys-meta{color:#67737c;font-size:13.5px;margin-top:4px}
  .mys-room-count{color:#0e7490;font-size:12.5px;font-weight:600;margin-top:3px;min-height:0}
  .mys-side{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
  .mys-pill{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
    border-radius:999px;padding:4px 10px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
  .mys-pill.scheduled{background:#f2f3f4;color:#67737c}
  .mys-pill.practice{background:rgba(14,116,144,.12);color:#0e7490}
  .mys-pill.live{background:#401d91;color:#fff}
  .mys-pill.finished{background:#f2f3f4;color:#99a2a7}
  .mys-pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:mysBlink 1.4s ease-in-out infinite}
  @keyframes mysBlink{0%,100%{opacity:1}50%{opacity:.35}}
  .mys-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
  .mys-btn{font-family:'Inter',sans-serif;font-size:13.5px;font-weight:700;padding:9px 16px;border-radius:999px;
    cursor:pointer;white-space:nowrap;text-decoration:none;border:1px solid transparent;transition:background .15s,border-color .15s,color .15s,transform .15s}
  .mys-btn.primary{background:#401d91;color:#fff}
  .mys-btn.primary:hover{background:#011624;transform:translateY(-1px)}
  .mys-btn.ghost{background:#fff;border-color:#dfe3e6;color:#011624}
  .mys-btn.ghost:hover{border-color:#5230da;color:#5230da}
  .mys-btn.danger{background:#fff;border-color:#e7d2d6;color:#b3415a}
  .mys-btn.danger:hover{background:#fbeef0;border-color:#c2415b;color:#a5334c}
  .mys-btn:disabled{opacity:.6;cursor:default;transform:none}
  /* ---- modal ---- */
  .mys-backdrop{position:fixed;inset:0;background:rgba(1,22,36,.45);backdrop-filter:blur(3px);
    display:flex;align-items:center;justify-content:center;padding:20px;z-index:1200}
  .mys-modal{background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(1,22,36,.32);
    width:100%;max-width:440px;padding:24px 24px 22px;position:relative;animation:mysPop .16s ease-out}
  @keyframes mysPop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
  .mys-modal h3{font-family:'Montserrat',sans-serif;font-weight:600;font-size:20px;color:#011624;margin:0 0 4px}
  .mys-modal .mys-modal-sub{color:#67737c;font-size:14px;line-height:1.5;margin:0 0 18px}
  .mys-close{position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;border:1px solid #dfe3e6;
    background:#fff;color:#67737c;font-size:16px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .mys-close:hover{border-color:#c2415b;color:#c2415b}
  .mys-form{display:flex;flex-direction:column;gap:14px}
  .mys-field label{display:block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#67737c;margin-bottom:6px}
  .mys-field input[type=text],.mys-field input[type=date],.mys-field input[type=time],.mys-field input[type=number]{
    width:100%;box-sizing:border-box;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:10px;color:#011624;
    font-family:'Inter',sans-serif;font-size:15px;padding:11px 13px}
  .mys-field input:focus{outline:none;border-color:#5230da;background:#fff;box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .mys-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .mys-check{display:flex;align-items:flex-start;gap:10px;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:12px;padding:12px 13px;cursor:pointer}
  .mys-check input{margin-top:2px}
  .mys-check-main{display:flex;flex-direction:column}
  /* reset the global brand.css label{} uppercase/letter-spacing that bleeds in (.mys-check is a <label>) */
  .mys-check-title{font-weight:700;color:#011624;font-size:14px;text-transform:none;letter-spacing:normal}
  .mys-check-sub{color:#67737c;font-size:12.5px;line-height:1.4;margin-top:2px;text-transform:none;letter-spacing:normal}
  .mys-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:22px;flex-wrap:wrap}
  .mys-warn{background:rgba(245,183,0,.1);border:1px solid rgba(245,183,0,.35);border-radius:10px;
    padding:10px 12px;font-size:13px;color:#8a6d00;margin:0 0 16px;line-height:1.45}
  .mys-msg{font-size:13px;min-height:16px;margin-top:10px;color:#67737c}
  .mys-msg.err{color:#c2415b}
  .mys-msg.ok{color:#0f8a52}
  @media (max-width:600px){
    .mys-head h1{font-size:24px}
    .mys-card{grid-template-columns:1fr;gap:12px}
    .mys-side{align-items:flex-start}
    .mys-actions{justify-content:flex-start;width:100%}
    .mys-actions .mys-btn{flex:1 1 auto;text-align:center}
    .mys-row2{grid-template-columns:1fr}
    .mys-modal-actions .mys-btn{flex:1 1 auto;text-align:center}
  }
  `;
  document.head.appendChild(el);
}

function stateOf(s, now){
  const start = new Date(s.scheduled_start).getTime();
  const end = start + (s.duration_minutes || 0) * 60000;
  if(now < start) return 'upcoming';
  if(now <= end) return 'live';
  return 'finished';
}

function fmtWhen(iso){
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// Stored UTC timestamp -> LOCAL date/time parts for the edit inputs. Mirrors how
// create reads `${date}T${time}` as local time before .toISOString(); using the
// local getters (not toISOString) keeps the round-trip from drifting by the UTC
// offset.
function localParts(iso){
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

export function mount(el){
  styles();
  let built = false;
  let uid = null;
  let sessions = [];
  const haveResults = new Set();         // session ids that already have a saved result
  const roomCounts = new Map();          // sessionId -> people currently in the practice room
  const roomChannels = new Map();        // sessionId -> presence channel (observer, never tracks)
  const modalRoot = () => el.querySelector('#mysModalRoot');

  function render(a){
    if(!a.user){
      built = false; cleanupChannels();
      el.innerHTML = `<div class="mys-wrap"><div class="mys-head"><h1>My sessions</h1></div>
        <p class="mys-empty">Please <a href="#/login">log in</a> to manage your sessions.</p></div>`;
      return;
    }
    if(!a.profile){
      if(!built) el.innerHTML = `<div class="mys-wrap"><div class="mys-head"><h1>My sessions</h1></div><p class="mys-empty">Loading…</p></div>`;
      return;
    }
    if(built) return;     // panel already up — don't rebuild (would drop an open modal)
    built = true;
    uid = a.user.id;
    buildShell();
    loadSessions();
  }

  function buildShell(){
    el.innerHTML = `
    <div class="mys-wrap">
      <div class="mys-head">
        <h1>My sessions</h1>
        <p>Sessions you created. Edit or cancel an upcoming room before it starts — once a session is live or finished it stays locked, because results and rankings depend on it.</p>
        <a class="mys-new" href="#/sessions/new">+ New session</a>
      </div>
      <section class="mys-sec" id="mysLiveSec" hidden>
        <h2>Live now</h2>
        <div class="mys-list" id="mysLive"></div>
      </section>
      <section class="mys-sec">
        <h2>Upcoming</h2>
        <div class="mys-list" id="mysUpcoming"><div class="mys-empty">Loading…</div></div>
      </section>
      <section class="mys-sec">
        <h2>Past</h2>
        <div class="mys-list" id="mysPast"><div class="mys-empty">Loading…</div></div>
      </section>
    </div>
    <div id="mysModalRoot"></div>`;
    el.addEventListener('click', onClick);
  }

  async function loadSessions(){
    const { data, error } = await supabase
      .from('sessions').select('*')
      .eq('created_by_user_id', uid)
      .order('scheduled_start', { ascending: false });
    if(error){
      const up = el.querySelector('#mysUpcoming');
      if(up) up.innerHTML = `<div class="mys-empty">Could not load your sessions: ${esc(error.message)}</div>`;
      return;
    }
    sessions = data || [];

    // Which sessions already have a saved official result — those can never be deleted.
    haveResults.clear();
    const ids = sessions.map(s => s.id);
    if(ids.length){
      const { data: res } = await supabase.from('results').select('session_id').in('session_id', ids);
      for(const r of (res || [])){ if(r.session_id != null) haveResults.add(r.session_id); }
    }
    renderLists();
  }

  function canDelete(s, now){
    return stateOf(s, now) === 'upcoming' && !haveResults.has(s.id);
  }

  function card(s, now){
    const st = stateOf(s, now);
    const id = s.id;
    const verified = s.verified_only ? '<span class="mys-verified">✓ Verified</span>' : '';
    let pill, actions = '';
    if(st === 'live'){
      pill = `<span class="mys-pill live"><span class="dot"></span>Live</span>`;
      actions = `<a class="mys-btn primary" href="#/room/${id}">Enter room</a>`;
    } else if(st === 'finished'){
      pill = `<span class="mys-pill finished">Finished</span>`;
      actions = `<a class="mys-btn ghost" href="#/room/${id}">View results</a>`;
    } else {
      // upcoming — pill may flip to "Practice room open" once someone is in the room
      const count = roomCounts.get(id) || 0;
      pill = count > 0
        ? `<span class="mys-pill practice">Practice room open</span>`
        : `<span class="mys-pill scheduled">Scheduled</span>`;
      actions = `<a class="mys-btn ghost" href="#/room/${id}">Enter room</a>
        <button type="button" class="mys-btn ghost" data-edit="${id}">Edit</button>`;
      if(canDelete(s, now)) actions += `<button type="button" class="mys-btn danger" data-delete="${id}">Delete</button>`;
    }

    const roomCount = st === 'upcoming' ? `<div class="mys-room-count">${(roomCounts.get(id) || 0) > 0 ? `${roomCounts.get(id)} in the room now` : ''}</div>` : '';

    return `
    <div class="mys-card ${st}" data-id="${id}" data-state="${st}">
      <div class="mys-main">
        <div class="mys-title">${esc(s.name || 'Untitled session')}${verified}</div>
        <div class="mys-meta">${esc(fmtWhen(s.scheduled_start))} · ${s.duration_minutes} min</div>
        ${roomCount}
      </div>
      <div class="mys-side">
        ${pill}
        <div class="mys-actions">${actions}</div>
      </div>
    </div>`;
  }

  function renderLists(){
    const liveSec = el.querySelector('#mysLiveSec');
    const liveEl = el.querySelector('#mysLive');
    const upEl = el.querySelector('#mysUpcoming');
    const pastEl = el.querySelector('#mysPast');
    if(!upEl || !pastEl) return;   // unmounted mid-flight

    const now = Date.now();
    const live = [], upcoming = [], past = [];
    for(const s of sessions){
      const st = stateOf(s, now);
      if(st === 'live') live.push(s);
      else if(st === 'upcoming') upcoming.push(s);
      else past.push(s);
    }
    upcoming.sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));   // soonest first
    live.sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
    past.sort((a, b) => new Date(b.scheduled_start) - new Date(a.scheduled_start));       // most recent first

    if(liveSec) liveSec.hidden = live.length === 0;
    if(liveEl) liveEl.innerHTML = live.map(s => card(s, now)).join('');
    upEl.innerHTML = upcoming.length
      ? upcoming.map(s => card(s, now)).join('')
      : `<div class="mys-empty">No upcoming sessions. <a href="#/sessions/new">Schedule one →</a></div>`;
    pastEl.innerHTML = past.length
      ? past.map(s => card(s, now)).join('')
      : `<div class="mys-empty">No past sessions yet.</div>`;

    // Watch practice-room presence for live + upcoming sessions (graceful: 0 = quiet).
    for(const s of [...live, ...upcoming]) watchRoom(s.id);
  }

  // ---- practice-room presence (observer; never tracks, so we are not counted) ----
  function watchRoom(id){
    if(roomChannels.has(id)) return;
    const ch = supabase.channel('room-' + id, { config: { presence: { key: 'my-sessions-lobby' } } });
    ch.on('presence', { event: 'sync' }, () => {
      roomCounts.set(id, Object.keys(ch.presenceState()).length);
      applyRoomCount(id);
    }).subscribe();
    roomChannels.set(id, ch);
  }

  function applyRoomCount(id){
    const cardEl = el.querySelector(`.mys-card[data-id="${CSS.escape(String(id))}"]`);
    if(!cardEl || cardEl.dataset.state !== 'upcoming') return;
    const count = roomCounts.get(id) || 0;
    const pill = cardEl.querySelector('.mys-pill');
    const rc = cardEl.querySelector('.mys-room-count');
    if(pill){
      pill.className = 'mys-pill ' + (count > 0 ? 'practice' : 'scheduled');
      pill.textContent = count > 0 ? 'Practice room open' : 'Scheduled';
    }
    if(rc) rc.textContent = count > 0 ? `${count} in the room now` : '';
  }

  function cleanupChannels(){
    for(const ch of roomChannels.values()) supabase.removeChannel(ch);
    roomChannels.clear();
    roomCounts.clear();
  }

  // ---- click delegation ----
  function onClick(e){
    const editBtn = e.target.closest('[data-edit]');
    if(editBtn){ openEdit(Number(editBtn.dataset.edit)); return; }
    const delBtn = e.target.closest('[data-delete]');
    if(delBtn){ openDelete(Number(delBtn.dataset.delete)); return; }
  }

  function closeModal(){ const r = modalRoot(); if(r) r.innerHTML = ''; }

  // Re-check state at action time: time may have passed since the list rendered.
  function freshSession(id){ return sessions.find(s => s.id === id) || null; }

  // ---- edit modal ----
  function openEdit(id){
    const s = freshSession(id);
    if(!s) return;
    if(stateOf(s, Date.now()) !== 'upcoming'){
      // Started since the list rendered — refuse and refresh.
      loadSessions();
      return;
    }
    const p = localParts(s.scheduled_start);
    const r = modalRoot();
    r.innerHTML = `
    <div class="mys-backdrop" data-backdrop>
      <div class="mys-modal" role="dialog" aria-modal="true" aria-label="Edit session">
        <button type="button" class="mys-close" data-close aria-label="Close">×</button>
        <h3>Edit session</h3>
        <p class="mys-modal-sub">Update the details below. Changes apply everywhere the session appears.</p>
        <div class="mys-form">
          <div class="mys-field">
            <label for="mysName">Session name</label>
            <input type="text" id="mysName" maxlength="80" value="${esc(s.name || '')}">
          </div>
          <div class="mys-row2">
            <div class="mys-field">
              <label for="mysDate">Date</label>
              <input type="date" id="mysDate" value="${p.date}">
            </div>
            <div class="mys-field">
              <label for="mysTime">Start time</label>
              <input type="time" id="mysTime" value="${p.time}">
            </div>
          </div>
          <div class="mys-field">
            <label for="mysDur">Duration (minutes)</label>
            <input type="number" id="mysDur" min="1" max="240" value="${Number(s.duration_minutes) || 10}">
          </div>
          <label class="mys-check">
            <input type="checkbox" id="mysVerified" ${s.verified_only ? 'checked' : ''}>
            <span class="mys-check-main">
              <span class="mys-check-title">Verified session</span>
              <span class="mys-check-sub">Only legitimate measurements count toward the group results.</span>
            </span>
          </label>
        </div>
        <div class="mys-msg" id="mysEditMsg"></div>
        <div class="mys-modal-actions">
          <button type="button" class="mys-btn ghost" data-close>Cancel</button>
          <button type="button" class="mys-btn primary" id="mysSave">Save changes</button>
        </div>
      </div>
    </div>`;
    bindModalDismiss();
    const q = sel => r.querySelector(sel);
    q('#mysSave').addEventListener('click', () => saveEdit(id));
  }

  async function saveEdit(id){
    const r = modalRoot();
    const q = sel => r.querySelector(sel);
    const msg = q('#mysEditMsg');
    const setMsg = (t, cls) => { msg.className = 'mys-msg ' + (cls || ''); msg.textContent = t; };

    const s = freshSession(id);
    if(!s) return;
    if(stateOf(s, Date.now()) !== 'upcoming'){ setMsg('This session has already started and can no longer be changed.', 'err'); return; }

    const name = q('#mysName').value.trim();
    const date = q('#mysDate').value;
    const time = q('#mysTime').value;
    const duration = parseInt(q('#mysDur').value, 10);
    const verified = q('#mysVerified').checked;

    if(!name || !date || !time || !duration){ setMsg('Please fill in every field.', 'err'); return; }
    if(duration < 1 || duration > 240){ setMsg('Duration must be between 1 and 240 minutes.', 'err'); return; }
    const start = new Date(`${date}T${time}`);
    if(isNaN(start.getTime())){ setMsg('Invalid date or time.', 'err'); return; }
    if(start.getTime() <= Date.now()){ setMsg('Start time must be in the future.', 'err'); return; }

    const saveBtn = q('#mysSave');
    saveBtn.disabled = true; setMsg('Saving…', '');
    const { data, error } = await supabase.from('sessions')
      .update({
        name,
        scheduled_start: start.toISOString(),
        duration_minutes: duration,
        verified_only: verified,
      })
      .eq('id', id)
      .eq('created_by_user_id', uid)   // belt-and-suspenders alongside RLS
      .select('id');

    if(error){ saveBtn.disabled = false; setMsg('Could not save: ' + error.message, 'err'); return; }
    if(!data || !data.length){ saveBtn.disabled = false; setMsg('Could not save — you may not have permission to edit this session.', 'err'); return; }

    closeModal();
    await loadSessions();
  }

  // ---- delete modal ----
  function openDelete(id){
    const s = freshSession(id);
    if(!s) return;
    const now = Date.now();
    if(!canDelete(s, now)){ loadSessions(); return; }   // no longer deletable — refresh
    const count = roomCounts.get(id) || 0;
    const warn = count > 0
      ? `<div class="mys-warn">${count} ${count === 1 ? 'person is' : 'people are'} in the practice room right now. Deleting will close the room for them.</div>`
      : '';
    const r = modalRoot();
    r.innerHTML = `
    <div class="mys-backdrop" data-backdrop>
      <div class="mys-modal" role="dialog" aria-modal="true" aria-label="Delete session">
        <button type="button" class="mys-close" data-close aria-label="Close">×</button>
        <h3>Delete this session?</h3>
        <p class="mys-modal-sub">“${esc(s.name || 'Untitled session')}” — this removes the scheduled room. This cannot be undone.</p>
        ${warn}
        <div class="mys-msg" id="mysDelMsg"></div>
        <div class="mys-modal-actions">
          <button type="button" class="mys-btn ghost" data-close>Cancel</button>
          <button type="button" class="mys-btn danger" id="mysConfirmDel">Delete session</button>
        </div>
      </div>
    </div>`;
    bindModalDismiss();
    r.querySelector('#mysConfirmDel').addEventListener('click', () => confirmDelete(id));
  }

  async function confirmDelete(id){
    const r = modalRoot();
    const msg = r.querySelector('#mysDelMsg');
    const setMsg = (t, cls) => { msg.className = 'mys-msg ' + (cls || ''); msg.textContent = t; };
    const s = freshSession(id);
    if(!s) return;
    if(!canDelete(s, Date.now())){ setMsg('This session can no longer be deleted (it may have started or has results).', 'err'); return; }

    const btn = r.querySelector('#mysConfirmDel');
    btn.disabled = true; setMsg('Deleting…', '');
    const { data, error } = await supabase.from('sessions')
      .delete()
      .eq('id', id)
      .eq('created_by_user_id', uid)
      .select('id');

    if(error){ btn.disabled = false; setMsg('Could not delete: ' + error.message, 'err'); return; }
    if(!data || !data.length){
      // RLS blocked it silently (started / has results / not owner) → 0 rows, no error.
      btn.disabled = false;
      setMsg('Could not delete — the session may have started or already has results.', 'err');
      return;
    }
    closeModal();
    await loadSessions();
  }

  function bindModalDismiss(){
    const r = modalRoot();
    r.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
    const backdrop = r.querySelector('[data-backdrop]');
    if(backdrop) backdrop.addEventListener('click', (e) => { if(e.target === backdrop) closeModal(); });
    onKey._fn = (e) => { if(e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
  }
  function onKey(e){ if(onKey._fn) onKey._fn(e); }

  const unsub = auth.subscribeAuth(render);
  return () => {
    if(unsub) unsub();
    el.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    cleanupChannels();
  };
}
