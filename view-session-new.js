import { supabase } from './db.js';
import * as auth from './auth.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img class="sess-avatar" src="${esc(url)}" alt="">`;
  return `<span class="sess-avatar sess-avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

function snStyles(){
  if(document.getElementById('snAccessStyles')) return;
  const s = document.createElement('style');
  s.id = 'snAccessStyles';
  s.textContent = `
  .sn-access-label{display:block;margin-bottom:8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#67737c}
  .sn-access{display:flex;flex-direction:column;gap:8px}
  .sn-acc{display:flex;align-items:flex-start;gap:10px;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:12px;
    padding:11px 13px;cursor:pointer;transition:border-color .15s,background .15s}
  .sn-acc:hover{border-color:#c9cfd4}
  .sn-acc input{margin-top:3px;flex-shrink:0;width:auto}
  .sn-acc:has(input:checked){border-color:#5230da;background:#fff;box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .sn-acc-main{display:flex;flex-direction:column;flex:1;min-width:0}
  .sn-acc-title{font-weight:700;color:#011624;font-size:14px;text-transform:none;letter-spacing:normal}
  .sn-acc-sub{color:#67737c;font-size:12.5px;line-height:1.4;margin-top:2px;text-transform:none;letter-spacing:normal}
  `;
  document.head.appendChild(s);
}

export function mount(el){
  snStyles();
  el.innerHTML = `
    <div class="view-head">
      <p class="room-hint" style="text-align:left;margin:0 0 6px"><a href="#/sessions" class="link">← Sessions</a></p>
      <h1 class="page-title">Create a group session</h1>
      <p class="page-sub">Schedule a moment to measure together.</p>
    </div>
    <div class="panel">
      <form id="createForm">
        <div class="form-grid">
          <div class="field full">
            <label for="fName">Session name</label>
            <input type="text" id="fName" placeholder="e.g. Sunday Morning Meditation" required maxlength="80">
          </div>
          <div class="field full">
            <div class="sn-when">
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
            </div>
          </div>
          <div class="field full">
            <label class="sn-option">
              <input type="checkbox" id="fVerified">
              <span class="sn-option-main">
                <span class="sn-option-title">Verified session</span>
                <span class="sn-option-sub">Only legitimate measurements count toward the group results — irregular spinning is excluded from the leaderboard.</span>
              </span>
            </label>
          </div>
          <div class="field full">
            <label class="sn-access-label">Who can join?</label>
            <div class="sn-access">
              <label class="sn-acc">
                <input type="radio" name="snAccess" value="public" checked>
                <span class="sn-acc-main"><span class="sn-acc-title">Anyone</span>
                <span class="sn-acc-sub">Anyone can enter from the Sessions list.</span></span>
              </label>
              <label class="sn-acc">
                <input type="radio" name="snAccess" value="invite">
                <span class="sn-acc-main"><span class="sn-acc-title">Invite link</span>
                <span class="sn-acc-sub">Anyone can see this session, but only people with the invite link can enter.</span></span>
              </label>
              <label class="sn-acc">
                <input type="radio" name="snAccess" value="followers">
                <span class="sn-acc-main"><span class="sn-acc-title">Followers only</span>
                <span class="sn-acc-sub">Only people connected to you can enter. Others will be asked to connect first.</span></span>
              </label>
            </div>
          </div>
        </div>
        <div class="sn-howto">
          <b>How the room works:</b> before the scheduled time the room is already open as a
          practice space — people can join, connect their wheel and spin together.
          Official results are recorded only during the session window.
        </div>
        <div class="organizer-note" id="organizerNote"></div>
        <div class="form-actions">
          <button type="submit" id="btnCreate">Create session</button>
          <span class="form-msg" id="formMsg"></span>
        </div>
      </form>
    </div>
  `;

  const $ = id => el.querySelector('#' + id);
  $('fDate').value = new Date().toISOString().slice(0, 10);

  const unsubAuth = auth.subscribeAuth(a => {
    const note = $('organizerNote');
    const btn = $('btnCreate');
    if(!note || !btn) return;
    if(a.user){
      note.innerHTML = `<span class="organizer-label">Organized by</span> ${avatarHtml(a.avatarUrl, a.displayName)} <b>${esc(a.displayName)}</b>`;
      btn.disabled = false;
    } else {
      note.innerHTML = `<a class="link" href="#/login">Log in</a> to create a session.`;
      btn.disabled = true;
    }
  });

  function setFormMsg(text, state){
    const m = $('formMsg');
    m.className = 'form-msg ' + (state || '');
    m.textContent = text;
  }

  $('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = auth.getState();
    if(!a.user){ setFormMsg('Log in to create a session.', 'err'); return; }
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

    const accessMode = (el.querySelector('input[name="snAccess"]:checked') || {}).value || 'public';
    const row = {
      name,
      scheduled_start: start.toISOString(),
      duration_minutes: duration,
      status: 'scheduled',
      created_by: a.displayName,
      created_by_user_id: a.user.id,
      verified_only: $('fVerified').checked,
      access_mode: accessMode,
    };
    // Invite sessions get an unguessable token; the shareable link is /#/join/<token>.
    if(accessMode === 'invite'){
      row.invite_token = (self.crypto && crypto.randomUUID)
        ? crypto.randomUUID().replace(/-/g, '')
        : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
    }

    $('btnCreate').disabled = true;
    setFormMsg('Creating…', '');
    const { data, error } = await supabase.from('sessions').insert(row).select('id').single();

    if(error){
      $('btnCreate').disabled = false;
      setFormMsg('Error: ' + error.message, 'err');
      return;
    }
    setFormMsg('Session created.', 'ok');
    // Send the user back to the discovery page so they immediately see their session in context.
    setTimeout(() => { location.hash = '#/sessions'; }, 400);
  });

  return () => { unsubAuth(); };
}
