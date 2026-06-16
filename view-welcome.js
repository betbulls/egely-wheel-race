// view-welcome.js — light first-login onboarding. Two quick things (name + optional
// photo) so a new member is recognizable on the Live wall right away. Everything else
// (bio, social links, connect page) stays optional on the full Profile page.
//
// Skippable, no DB migration: "needs welcome" is decided by app.js from the profile
// (still the email-fallback name + no photo) and a per-account localStorage flag set
// here on Save or Skip. Self-contained scoped <style> (.wel-*) — no index.html edits.
import * as auth from './auth.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function styles(){
  if(document.getElementById('welStyles')) return;
  const el = document.createElement('style');
  el.id = 'welStyles';
  el.textContent = `
  .wel-wrap{max-width:460px;margin:0 auto;padding:8px 0}
  .wel-head{text-align:center;margin-bottom:22px}
  .wel-head h1{font-family:'Montserrat',sans-serif;font-weight:600;font-size:30px;margin:0 0 8px;color:#011624;letter-spacing:-0.3px}
  .wel-head p{color:#67737c;font-size:15px;line-height:1.55;margin:0}
  .wel-card{background:#fff;border:1px solid #dfe3e6;border-radius:18px;padding:26px 24px;
    box-shadow:0 10px 28px rgba(1,22,36,.08)}
  .wel-avatar-row{display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:22px}
  .wel-avatar{width:96px;height:96px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#37dbff,#5230da);color:#fff;font-family:'Montserrat',sans-serif;font-size:38px;font-weight:600;
    border:3px solid #fff;box-shadow:0 0 0 2px rgba(82,48,218,.22),0 6px 18px rgba(82,48,218,.16)}
  .wel-avatar img{width:100%;height:100%;object-fit:cover}
  .wel-photo-btn{background:#fff;border:1px solid #dfe3e6;color:#011624;
    font-family:'Inter',sans-serif;font-size:13px;font-weight:700;
    padding:10px 18px;border-radius:999px;cursor:pointer;transition:border-color .15s,color .15s}
  .wel-photo-btn:hover{border-color:#5230da;color:#5230da}
  .wel-opt{color:#99a2a7;font-weight:600}
  .wel-field{margin-bottom:8px}
  .wel-field label{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5a6571;font-weight:700;margin-bottom:7px}
  .wel-field input{width:100%;box-sizing:border-box;background:#f7f8f8;border:1px solid #dfe3e6;
    border-radius:10px;color:#011624;font-family:'Inter',sans-serif;font-size:16px;padding:13px 14px}
  .wel-field input:focus{outline:none;border-color:#5230da;background:#fff;box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .wel-actions{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}
  .wel-btn{flex:1;min-width:140px;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;
    padding:14px 16px;border-radius:999px;white-space:nowrap;
    cursor:pointer;border:1px solid transparent;transition:background .15s,color .15s,border-color .15s,transform .15s}
  .wel-btn.primary{background:#401d91;color:#fff}
  .wel-btn.primary:hover{background:#011624;transform:translateY(-1px)}
  .wel-btn.ghost{background:transparent;border-color:transparent;color:#67737c}
  .wel-btn.ghost:hover{color:#5230da;transform:none}
  .wel-btn:disabled{opacity:.6;cursor:default;transform:none}
  .wel-msg{display:block;text-align:center;margin-top:14px;font-size:13px;color:#67737c;min-height:18px}
  .wel-msg.err{color:#c2415b}
  .wel-foot{text-align:center;color:#99a2a7;font-size:12px;line-height:1.5;margin-top:16px}
  @media (max-width:420px){
    .wel-actions{flex-direction:column}
    .wel-btn{width:100%;flex:none}
  }
  `;
  document.head.appendChild(el);
}

export function mount(el){
  styles();
  const a = auth.getState();
  if(!a.user){ location.hash = '#/login'; return () => {}; }

  const emailPrefix = (a.email || '').split('@')[0];
  const initialName = a.displayName || emailPrefix || '';
  let uploadedUrl = a.avatarUrl || null;

  const avatarInner = uploadedUrl
    ? `<img src="${esc(uploadedUrl)}" alt="">`
    : `<span>${esc((initialName[0] || '?').toUpperCase())}</span>`;

  el.innerHTML = `
  <div class="wel-wrap">
    <div class="wel-head">
      <h1>Set up your Live profile</h1>
      <p>This is how others will recognize you in sessions and on the Live wall. You can change it anytime.</p>
    </div>
    <div class="wel-card">
      <div class="wel-avatar-row">
        <div class="wel-avatar" id="welAvatar">${avatarInner}</div>
        <button class="wel-photo-btn" id="welPhotoBtn" type="button">Add a photo <span class="wel-opt">(optional)</span></button>
        <input type="file" id="welFile" accept="image/*" hidden>
      </div>
      <div class="wel-field">
        <label for="welName">Your name</label>
        <input id="welName" type="text" maxlength="60" value="${esc(initialName)}" placeholder="What should we call you?" autocomplete="name">
      </div>
      <div class="wel-actions">
        <button class="wel-btn primary" id="welSave">Save &amp; continue</button>
        <button class="wel-btn ghost" id="welSkip" type="button">Skip for now</button>
      </div>
      <span class="wel-msg" id="welMsg"></span>
    </div>
    <p class="wel-foot">Exploring EWR Live is free — measuring with your own wheel can come later.</p>
  </div>`;

  const $ = id => el.querySelector('#' + id);
  const fileInput = $('welFile');
  const msg = $('welMsg');

  function markWelcomed(){ try { localStorage.setItem('ewr_welcomed_' + a.user.id, '1'); } catch {} }

  $('welPhotoBtn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if(!f) return;
    msg.className = 'wel-msg'; msg.textContent = 'Uploading photo…';
    const { url, error } = await auth.uploadAvatar(f);
    if(error){ msg.className = 'wel-msg err'; msg.textContent = 'Could not upload: ' + error.message; return; }
    uploadedUrl = url;
    msg.textContent = '';
    $('welAvatar').innerHTML = `<img src="${esc(url)}" alt="">`;
  });

  $('welSave').addEventListener('click', async () => {
    const name = $('welName').value.trim() || emailPrefix || 'Explorer';
    const btn = $('welSave');
    btn.disabled = true;
    msg.className = 'wel-msg'; msg.textContent = 'Saving…';
    const fields = { display_name: name };
    if(uploadedUrl && uploadedUrl !== a.avatarUrl) fields.avatar_url = uploadedUrl;
    const { error } = await auth.saveProfile(fields);
    btn.disabled = false;
    if(error){ msg.className = 'wel-msg err'; msg.textContent = 'Could not save: ' + error.message; return; }
    markWelcomed();
    location.hash = '#/live';   // land on Live so they see themselves online + the community
  });

  $('welSkip').addEventListener('click', () => { markWelcomed(); location.hash = '#/home'; });

  return () => {};
}
