import * as auth from './auth.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

export function mount(el){
  const s = auth.getState();
  if(!s.user){
    el.innerHTML = `
      <div class="view-head"><h1 class="page-title">Profile</h1></div>
      <div class="panel">
        <p class="placeholder">Log in to set up your profile.</p>
        <div class="form-actions"><a class="btn-join" href="#/login">Log in</a></div>
      </div>`;
    return () => {};
  }

  let avatarUrl = s.avatarUrl || '';

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Profile</h1>
      <p class="page-sub">Set your name and photo. This is how you appear on leaderboards.</p>
    </div>
    <div class="panel">
      <div class="profile-row">
        <div class="profile-avatar" id="pfAvatar">${avatarHtml(avatarUrl, s.displayName)}</div>
        <div class="field" style="flex:1">
          <label for="pfName">Display name</label>
          <input id="pfName" maxlength="60" value="${esc(s.displayName || '')}" placeholder="Your name">
        </div>
      </div>
      <div class="field full" style="margin-top:14px">
        <label for="pfFile">Profile photo</label>
        <input id="pfFile" type="file" accept="image/*">
      </div>
      <label class="check" style="margin-top:16px;display:flex;align-items:center;gap:9px;cursor:pointer">
        <input type="checkbox" id="pfPract" ${s.isPractitioner ? 'checked' : ''}>
        I'm a practitioner (monitor clients' measurements)
      </label>
      <div class="form-actions">
        <button id="pfSave">Save profile</button>
        <span class="form-msg" id="pfMsg"></span>
      </div>
    </div>`;

  const $ = id => el.querySelector('#' + id);
  const msg = $('pfMsg');

  $('pfFile').addEventListener('change', async () => {
    const file = $('pfFile').files[0];
    if(!file) return;
    msg.className = 'form-msg'; msg.textContent = 'Uploading photo…';
    const { url, error } = await auth.uploadAvatar(file);
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Upload error: ' + error.message; return; }
    avatarUrl = url;
    $('pfAvatar').innerHTML = avatarHtml(avatarUrl, $('pfName').value);
    msg.className = 'form-msg ok'; msg.textContent = 'Photo ready — click Save profile.';
  });

  $('pfSave').addEventListener('click', async () => {
    const display_name = $('pfName').value.trim();
    if(!display_name){ msg.className = 'form-msg err'; msg.textContent = 'Enter a display name.'; return; }
    $('pfSave').disabled = true; msg.className = 'form-msg'; msg.textContent = 'Saving…';
    const { error } = await auth.saveProfile({
      display_name, avatar_url: avatarUrl || null, is_practitioner: $('pfPract').checked,
    });
    $('pfSave').disabled = false;
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Error: ' + error.message; return; }
    msg.className = 'form-msg ok'; msg.textContent = 'Profile saved.';
  });

  return () => {};
}
