// view-admin.js — admin-only console for managing who shows the "Spiritual Maker"
// badge/label. Visible only to profiles with is_admin = true (George). All writes go
// through SECURITY DEFINER RPCs (admin_set_maker / admin_list_makers) which (a) verify
// the caller is an admin and (b) run as the definer so the self-grant trigger lets them
// through. The client never writes approved_maker / is_admin directly.
//
// Self-contained scoped <style> (.adm-*) — no index.html edits.
import * as auth from './auth.js';
import { supabase } from './db.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function styles(){
  if(document.getElementById('admStyles')) return;
  const el = document.createElement('style');
  el.id = 'admStyles';
  el.textContent = `
  .adm-wrap{max-width:640px;margin:0 auto;padding:8px 0}
  .adm-head{margin-bottom:20px}
  .adm-head h1{font-family:'Montserrat',sans-serif;font-weight:600;font-size:28px;margin:0 0 6px;color:#011624;letter-spacing:-0.3px}
  .adm-head p{color:#67737c;font-size:14px;line-height:1.5;margin:0}
  .adm-card{background:#fff;border:1px solid #dfe3e6;border-radius:16px;padding:20px 20px;
    box-shadow:0 10px 28px rgba(1,22,36,.08);margin-bottom:18px}
  .adm-card h2{font-family:'Montserrat',sans-serif;font-weight:600;font-size:13px;letter-spacing:.12em;
    text-transform:uppercase;color:#67737c;margin:0 0 14px}
  .adm-add{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}
  .adm-add input{flex:1;min-width:200px;box-sizing:border-box;background:#f7f8f8;border:1px solid #dfe3e6;
    border-radius:10px;color:#011624;font-family:'Inter',sans-serif;font-size:15px;padding:12px 14px}
  .adm-add input:focus{outline:none;border-color:#5230da;background:#fff;box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .adm-btn{font-family:'Inter',sans-serif;font-size:14px;font-weight:700;padding:12px 18px;border-radius:999px;
    white-space:nowrap;cursor:pointer;border:1px solid transparent;background:#401d91;color:#fff;
    transition:background .15s,transform .15s}
  .adm-btn:hover{background:#011624;transform:translateY(-1px)}
  .adm-btn:disabled{opacity:.6;cursor:default;transform:none}
  .adm-msg{display:block;margin-top:12px;font-size:13px;color:#67737c;min-height:18px}
  .adm-msg.ok{color:#0f8a52}
  .adm-msg.err{color:#c2415b}
  .adm-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
  .adm-row{display:flex;align-items:center;gap:12px;background:#f7f8f8;border:1px solid #dfe3e6;
    border-radius:12px;padding:10px 12px}
  .adm-av{width:38px;height:38px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#37dbff,#5230da);color:#fff;font-family:'Montserrat',sans-serif;font-weight:600;font-size:16px}
  .adm-info{flex:1;min-width:0}
  .adm-name{font-weight:700;color:#011624;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .adm-mail{color:#67737c;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .adm-remove{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;padding:8px 14px;border-radius:999px;
    cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#67737c;flex-shrink:0;transition:border-color .15s,color .15s}
  .adm-remove:hover{border-color:#c2415b;color:#c2415b}
  .adm-remove:disabled{opacity:.6;cursor:default}
  .adm-empty{color:#99a2a7;font-size:14px;padding:6px 2px}
  @media (max-width:600px){
    .adm-add input{min-width:0;width:100%;flex:none}
    .adm-add .adm-btn{width:100%}
  }
  `;
  document.head.appendChild(el);
}

export function mount(el){
  styles();
  let built = false;

  function render(a){
    if(!a.user){
      built = false;
      el.innerHTML = `<div class="adm-wrap"><div class="adm-card"><p class="adm-empty">Please <a href="#/login">log in</a>.</p></div></div>`;
      return;
    }
    if(!a.profile){
      if(!built) el.innerHTML = `<div class="adm-wrap"><div class="adm-card"><p class="adm-empty">Loading…</p></div></div>`;
      return;
    }
    if(!a.isAdmin){
      built = false;
      el.innerHTML = `<div class="adm-wrap"><div class="adm-card">
        <h1 style="font-family:'Montserrat',sans-serif;font-weight:600;color:#011624;margin:0 0 6px">Not found</h1>
        <p class="adm-empty">This page isn't available. <a href="#/home">Back to home</a></p></div></div>`;
      return;
    }
    if(built) return;   // already showing the panel — don't rebuild (keeps the input)
    built = true;
    buildAdmin();
  }

  function buildAdmin(){
    el.innerHTML = `
    <div class="adm-wrap">
      <div class="adm-head">
        <h1>Admin · Spiritual Makers</h1>
        <p>Approve who shows the “✓ Spiritual Maker” badge and label across the app. People keep their account either way — this only controls the public maker badge.</p>
      </div>
      <div class="adm-card">
        <h2>Add a Spiritual Maker</h2>
        <div class="adm-add">
          <input id="admEmail" type="email" placeholder="member@example.com" autocomplete="off">
          <button class="adm-btn" id="admAdd" type="button">Add as Spiritual Maker</button>
        </div>
        <span class="adm-msg" id="admMsg"></span>
      </div>
      <div class="adm-card">
        <h2>Current Spiritual Makers</h2>
        <ul class="adm-list" id="admList"><li class="adm-empty">Loading…</li></ul>
      </div>
    </div>`;

    const $ = id => el.querySelector('#' + id);
    const emailIn = $('admEmail');
    const addBtn = $('admAdd');
    const msg = $('admMsg');
    const list = $('admList');

    async function loadList(){
      const { data, error } = await supabase.rpc('admin_list_makers');
      if(error){ list.innerHTML = `<li class="adm-empty">Could not load: ${esc(error.message)}</li>`; return; }
      const rows = data || [];
      if(!rows.length){ list.innerHTML = `<li class="adm-empty">No Spiritual Makers yet — add one above.</li>`; return; }
      list.innerHTML = rows.map(r => {
        const nm = r.display_name || r.practitioner_handle || 'Member';
        return `<li class="adm-row" data-email="${esc(r.email)}">
          <span class="adm-av">${esc((nm[0] || '?').toUpperCase())}</span>
          <div class="adm-info">
            <div class="adm-name">${esc(nm)}</div>
            <div class="adm-mail">${esc(r.email)}</div>
          </div>
          <button class="adm-remove" type="button" data-remove>Remove</button>
        </li>`;
      }).join('');
    }

    async function setMaker(email, approved, statusEl){
      const { data, error } = await supabase.rpc('admin_set_maker', { p_email: email, p_approved: approved });
      if(error) return { ok: false, text: 'Error: ' + error.message };
      if(data === 'no-account') return { ok: false, text: 'No account with that email yet — they need to register first.' };
      if(data === 'no-profile') return { ok: false, text: 'That account has no profile yet.' };
      return { ok: true, text: approved ? `Added ${data} as a Spiritual Maker.` : `Removed ${data}.` };
    }

    addBtn.addEventListener('click', async () => {
      const email = emailIn.value.trim();
      if(!email){ msg.className = 'adm-msg err'; msg.textContent = 'Enter an email.'; return; }
      addBtn.disabled = true; msg.className = 'adm-msg'; msg.textContent = 'Adding…';
      const res = await setMaker(email, true, msg);
      addBtn.disabled = false;
      msg.className = 'adm-msg ' + (res.ok ? 'ok' : 'err');
      msg.textContent = res.text;
      if(res.ok){ emailIn.value = ''; loadList(); }
    });

    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-remove]');
      if(!btn) return;
      const row = btn.closest('.adm-row');
      const email = row?.dataset.email;
      if(!email) return;
      btn.disabled = true; btn.textContent = 'Removing…';
      const res = await setMaker(email, false, msg);
      msg.className = 'adm-msg ' + (res.ok ? 'ok' : 'err');
      msg.textContent = res.text;
      if(res.ok) loadList();
      else { btn.disabled = false; btn.textContent = 'Remove'; }
    });

    loadList();
  }

  const unsub = auth.subscribeAuth(render);
  return () => { if(unsub) unsub(); };
}
