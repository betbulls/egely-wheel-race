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
  .wel-head h1{font-family:'Montserrat',sans-serif;font-weight:600;font-size:30px;margin:0 0 8px}
  .wel-head p{color:var(--muted);font-size:15px;line-height:1.55;margin:0}
  .wel-card{background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));
    border:1px solid var(--panel-border);border-radius:18px;padding:26px 24px}
  .wel-avatar-row{display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:22px}
  .wel-avatar{width:96px;height:96px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,var(--blue),var(--accent));color:#fff;font-family:'Montserrat',sans-serif;font-size:38px;font-weight:600;
    border:2px solid rgba(255,255,255,.12)}
  .wel-avatar img{width:100%;height:100%;object-fit:cover}
  .wel-photo-btn{background:rgba(255,255,255,.07);border:1px solid var(--panel-border);color:#fff;
    font-family:'Inter',sans-serif;font-size:13px;font-weight:600;padding:9px 16px;border-radius:9px;cursor:pointer;transition:filter .15s}
  .wel-photo-btn:hover{filter:brightness(1.15)}
  .wel-opt{color:var(--muted);font-weight:400}
  .wel-field{margin-bottom:8px}
  .wel-field label{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:7px}
  .wel-field input{width:100%;box-sizing:border-box;background:rgba(0,0,0,.22);border:1px solid var(--panel-border);
    border-radius:10px;color:#fff;font-family:'Inter',sans-serif;font-size:16px;padding:13px 14px}
  .wel-field input:focus{outline:none;border-color:rgba(155,140,255,.6)}
  .wel-actions{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}
  .wel-btn{flex:1;min-width:140px;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;padding:14px 16px;border-radius:11px;
    cursor:pointer;border:1px solid transparent;transition:filter .15s,transform .15s}
  .wel-btn.primary{background:linear-gradient(90deg,var(--accent),#7d5cff);color:#fff}
  .wel-btn.ghost{background:transparent;border-color:var(--panel-border);color:#cbd0ea}
  .wel-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}
  .wel-btn:disabled{opacity:.6;cursor:default;transform:none}
  .wel-msg{display:block;text-align:center;margin-top:14px;font-size:13px;color:var(--muted);min-height:18px}
  .wel-msg.err{color:#ff8f8f}
  .wel-foot{text-align:center;color:var(--faint,var(--muted));font-size:12.5px;line-height:1.5;margin-top:20px}
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
      <h1>Welcome to EWR Live 👋</h1>
      <p>Two quick things so the community recognizes you on the Live wall. You can change them anytime.</p>
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
    <p class="wel-foot">Exploring and appearing on Live is free. To measure with your own Egely Wheel you will need EWR access — but that can wait.</p>
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
