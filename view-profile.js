import * as auth from './auth.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

function connectUrl(handle){
  return location.origin + location.pathname + '#/connect/' + handle;
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
      <div class="field full" style="margin-top:14px">
        <label for="pfBio">Short bio</label>
        <textarea id="pfBio" maxlength="400" rows="3" placeholder="A few words about you — shown on your connection page.">${esc(s.bio || '')}</textarea>
      </div>
      <label class="check" style="margin-top:16px;display:flex;align-items:center;gap:9px;cursor:pointer">
        <input type="checkbox" id="pfPract" ${s.isPractitioner ? 'checked' : ''}>
        I'm a practitioner (monitor clients' measurements)
      </label>
      <div class="form-actions">
        <button id="pfSave">Save profile</button>
        <span class="form-msg" id="pfMsg"></span>
      </div>
    </div>

    <div id="pfLinkPanel"></div>
    <div id="pfFollowing"></div>`;

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
      display_name, avatar_url: avatarUrl || null,
      bio: $('pfBio').value.trim() || null,
      is_practitioner: $('pfPract').checked,
    });
    $('pfSave').disabled = false;
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Error: ' + error.message; return; }
    msg.className = 'form-msg ok'; msg.textContent = 'Profile saved.';
    renderLinkPanel();
  });

  // ---- Practitioner's own connection link ----------------------------------
  function renderLinkPanel(){
    const a = auth.getState();
    const panel = $('pfLinkPanel');
    if(!a.isPractitioner || !a.practitionerHandle){ panel.innerHTML = ''; return; }
    const url = connectUrl(a.practitionerHandle);
    panel.innerHTML = `
      <div class="panel">
        <h2>Your connection link</h2>
        <p class="page-sub" style="margin:2px 0 12px">Share this with your clients — by email, QR code, or social media. When they open it, they can connect with you.</p>
        <div class="link-row">
          <input id="pfLink" class="link-input" readonly value="${esc(url)}">
          <button class="btn-secondary" id="pfCopy">Copy</button>
        </div>
        <span class="form-msg" id="pfCopyMsg"></span>
      </div>`;
    $('pfCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); }
      catch { $('pfLink').select(); document.execCommand('copy'); }
      $('pfCopyMsg').className = 'form-msg ok'; $('pfCopyMsg').textContent = 'Copied.';
    });
  }

  // ---- Practitioners following me (the client's control) -------------------
  async function renderFollowing(){
    const panel = $('pfFollowing');
    const list = await auth.getMyPractitioners();
    if(!list.length){ panel.innerHTML = ''; return; }
    panel.innerHTML = `
      <div class="panel">
        <h2>Following your journey</h2>
        <p class="page-sub" style="margin:2px 0 12px">These practitioners can see your measurements. You're in control — end any connection anytime.</p>
        <div class="following-list">
          ${list.map(p => `
            <div class="following-row" data-id="${esc(p.id)}">
              <div class="following-avatar">${avatarHtml(p.avatar_url, p.display_name)}</div>
              <div class="following-name">${esc(p.display_name || 'Practitioner')}</div>
              <button class="btn-secondary following-end" data-id="${esc(p.id)}">End connection</button>
            </div>`).join('')}
        </div>
      </div>`;
    panel.querySelectorAll('.following-end').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const { error } = await auth.disconnectPractitioner(btn.dataset.id);
        if(error){ btn.disabled = false; return; }
        renderFollowing();
      });
    });
  }

  renderLinkPanel();
  renderFollowing();

  return () => {};
}
