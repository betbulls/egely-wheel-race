// view-admin.js — admin-only console for managing who shows the "Spiritual Maker"
// badge/label. Visible only to profiles with is_admin = true (George). All writes go
// through SECURITY DEFINER RPCs (admin_set_maker / admin_list_makers) which (a) verify
// the caller is an admin and (b) run as the definer so the self-grant trigger lets them
// through. The client never writes approved_maker / is_admin directly.
//
// Self-contained scoped <style> (.adm-*) — no index.html edits.
import * as auth from './auth.js';
import { supabase } from './db.js';
import { mountPartners } from './admin-partners.js';
import { mountWheelBench } from './admin-wheel-bench.js';

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
  .adm-note{color:#67737c;font-size:13px;line-height:1.45;margin:0 0 14px}
  .adm-status{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
    border-radius:999px;padding:2px 8px;vertical-align:middle;margin-left:6px}
  .adm-status.on{background:rgba(32,178,107,.14);color:#0f8a52}
  .adm-status.off{background:#f2f3f4;color:#99a2a7}
  .adm-src{display:inline-block;font-size:10px;color:#99a2a7;margin-left:6px;text-transform:uppercase;letter-spacing:.04em;vertical-align:middle}
  .adm-grant{font-family:'Inter',sans-serif;font-size:13px;font-weight:700;padding:8px 14px;border-radius:999px;
    cursor:pointer;background:#401d91;color:#fff;border:1px solid transparent;flex-shrink:0;transition:background .15s}
  .adm-grant:hover{background:#011624}
  .adm-grant:disabled{opacity:.6;cursor:default}
  .adm-tabs{display:flex;gap:8px;margin:0 0 22px;flex-wrap:wrap}
  .adm-tab{font-family:'Montserrat',sans-serif;font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;
    padding:10px 18px;border-radius:999px;cursor:pointer;border:1px solid #dfe3e6;background:#fff;color:#67737c;transition:all .15s}
  .adm-tab:hover{border-color:#5230da;color:#401d91;background:#fff}
  .adm-tab.on{background:#401d91;color:#fff;border-color:#401d91}
  .adm-tab.on:hover{background:#401d91;color:#fff}
  /* Usage tab */
  .admu-chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px}
  .admu-chip{background:#fff;border:1px solid #dfe3e6;border-radius:14px;padding:14px 16px;box-shadow:0 6px 18px rgba(1,22,36,.05)}
  .admu-chip b{display:block;font-family:'Montserrat',sans-serif;font-size:24px;font-weight:600;color:#011624;line-height:1.1}
  .admu-chip span{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#67737c}
  .admu-tablecard{padding:0;overflow:hidden}
  .admu-scroll{overflow-x:auto}
  .admu-table{width:100%;border-collapse:collapse;font-size:13px;min-width:880px}
  .admu-table th{font-family:'Montserrat',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.08em;
    text-transform:uppercase;color:#67737c;text-align:left;padding:12px 10px;border-bottom:1px solid #dfe3e6;
    background:#f7f8f8;white-space:nowrap;position:sticky;top:0}
  .admu-table td{padding:10px;border-bottom:1px solid #eef1f3;color:#27384e;white-space:nowrap;vertical-align:middle}
  .admu-table tr:hover td{background:#fafbfc}
  .admu-table td.num{text-align:right;font-variant-numeric:tabular-nums}
  .admu-table th.num{text-align:right}
  .admu-member{max-width:240px}
  .admu-member .n{font-weight:700;color:#011624;overflow:hidden;text-overflow:ellipsis;max-width:230px}
  .admu-member .e{color:#67737c;font-size:12px;overflow:hidden;text-overflow:ellipsis;max-width:230px}
  .admu-badge{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
    border-radius:999px;padding:1.5px 7px;margin-left:5px;vertical-align:1px}
  .admu-badge.sub{background:rgba(32,178,107,.14);color:#0f8a52}
  .admu-badge.maker{background:rgba(184,134,11,.14);color:#8a6a08}
  .admu-badge.seed{background:#f2f3f4;color:#99a2a7}
  .admu-toggle{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:#67737c;white-space:nowrap;cursor:pointer;user-select:none}
  .admu-toggle input{accent-color:#5230da}
  .admu-table tr.clickable{cursor:pointer}
  /* Member datasheet (expanded row) */
  .admd-cell{background:#fafbfc !important;padding:18px 16px !important;white-space:normal !important}
  .admd-head{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin-bottom:12px;font-size:13px;color:#27384e}
  .admd-head b{color:#011624}
  .admd-refresh{margin-left:auto;font-family:'Inter',sans-serif;font-size:12px;font-weight:700;padding:7px 14px;
    border-radius:999px;cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#401d91}
  .admd-refresh:hover{border-color:#5230da}
  .admd-diag{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
  .admd-diag-row{display:flex;gap:9px;align-items:flex-start;background:#fff;border:1px solid #dfe3e6;
    border-radius:10px;padding:9px 12px;font-size:13px;line-height:1.45;color:#27384e}
  .admd-diag-row.bad{border-color:rgba(255,92,92,.4);background:rgba(255,92,92,.05)}
  .admd-diag-row.warn{border-color:rgba(184,134,11,.35);background:rgba(184,134,11,.05)}
  .admd-diag-row.ok{border-color:rgba(32,178,107,.3);background:rgba(32,178,107,.05)}
  .admd-tl{list-style:none;margin:0;padding:0;max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
  .admd-tl li{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;padding:6px 8px;border-radius:8px;color:#27384e;line-height:1.4}
  .admd-tl li:nth-child(odd){background:#fff}
  .admd-dot{flex-shrink:0;width:8px;height:8px;border-radius:50%;margin-top:4px;background:#c9ced2}
  .admd-dot.g{background:#3ddc84}.admd-dot.y{background:#f5b700}.admd-dot.r{background:#ff5c5c}
  .admd-ts{flex-shrink:0;color:#99a2a7;font-variant-numeric:tabular-nums;width:118px}
  .admd-raw{display:block;color:#99a2a7;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;margin-top:1px;word-break:break-all}
  .admu-live{display:inline-block;width:7px;height:7px;border-radius:50%;background:#3ddc84;margin-right:6px}
  .admu-dim{color:#99a2a7}
  @media (max-width:600px){
    .adm-add input{min-width:0;width:100%;flex:none}
    .adm-add .adm-btn{width:100%}
  }
  `;
  document.head.appendChild(el);
}

export function mount(el){
  styles();
  // One tab is mounted at a time; whichever mounts registers its cleanup here.
  let built = false, tabCleanup = null;
  const teardownTab = () => { if(tabCleanup){ tabCleanup(); tabCleanup = null; } };

  function render(a){
    if(!a.user){
      built = false; teardownTab();
      el.innerHTML = `<div class="adm-wrap"><div class="adm-card"><p class="adm-empty">Please <a href="#/login">log in</a>.</p></div></div>`;
      return;
    }
    if(!a.profile){
      if(!built) el.innerHTML = `<div class="adm-wrap"><div class="adm-card"><p class="adm-empty">Loading…</p></div></div>`;
      return;
    }
    if(!a.isAdmin){
      built = false; teardownTab();
      el.innerHTML = `<div class="adm-wrap"><div class="adm-card">
        <h1 style="font-family:'Montserrat',sans-serif;font-weight:600;color:#011624;margin:0 0 6px">Not found</h1>
        <p class="adm-empty">This page isn't available. <a href="#/home">Back to home</a></p></div></div>`;
      return;
    }
    if(built) return;   // already showing the panel — don't rebuild (keeps the input)
    built = true;
    buildShell();
  }

  // ---- tabbed shell: "Makers & access" (the original console) + "Influencer onboarding"
  let tab = 'makers';
  function buildShell(){
    el.innerHTML = `
      <div class="adm-wrap" style="max-width:${tab === 'partners' || tab === 'usage' ? '1080px' : tab === 'bench' ? '860px' : '640px'}">
        <div class="adm-tabs">
          <button type="button" class="adm-tab ${tab === 'makers' ? 'on' : ''}" data-tab="makers">Makers &amp; access</button>
          <button type="button" class="adm-tab ${tab === 'usage' ? 'on' : ''}" data-tab="usage">Usage</button>
          <button type="button" class="adm-tab ${tab === 'partners' ? 'on' : ''}" data-tab="partners">Influencer onboarding</button>
          <button type="button" class="adm-tab ${tab === 'bench' ? 'on' : ''}" data-tab="bench">Wheel test</button>
        </div>
        <div id="admTabHost"></div>
      </div>`;
    el.querySelectorAll('.adm-tab').forEach(b => b.addEventListener('click', () => {
      if(b.dataset.tab === tab) return;
      tab = b.dataset.tab;
      teardownTab();
      buildShell();
    }));
    const host = el.querySelector('#admTabHost');
    if(tab === 'partners') tabCleanup = mountPartners(host);
    else if(tab === 'bench') tabCleanup = mountWheelBench(host);
    else if(tab === 'usage') buildUsage(host);
    else buildAdmin(host);
  }

  function buildAdmin(el){
    el.innerHTML = `
    <div>
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

      <div class="adm-head" style="margin-top:34px">
        <h1>Lifetime access</h1>
        <p>Grant measuring access to a registered member — same effect as an active subscription. Search by email to review or revoke.</p>
      </div>
      <div class="adm-card">
        <h2>Grant access</h2>
        <div class="adm-add">
          <input id="accEmail" type="email" placeholder="member@example.com" autocomplete="off">
          <button class="adm-btn" id="accGrant" type="button">Grant access</button>
        </div>
        <span class="adm-msg" id="accMsg"></span>
      </div>
      <div class="adm-card">
        <h2>Find / revoke access</h2>
        <p class="adm-note">Search any member by email — including everyone you've granted before — to see their status and revoke or re-grant.</p>
        <div class="adm-add">
          <input id="accSearch" type="search" placeholder="Search by email…" autocomplete="off">
          <button class="adm-btn" id="accSearchBtn" type="button">Search</button>
        </div>
        <ul class="adm-list" id="accList"><li class="adm-empty">Type an email above to search.</li></ul>
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

    // ---- Lifetime access (subscribers.active via admin RPCs) ----
    const accEmail = $('accEmail'), accGrant = $('accGrant'), accMsg = $('accMsg');
    const accSearch = $('accSearch'), accSearchBtn = $('accSearchBtn'), accList = $('accList');

    async function setAccess(email, active){
      const { data, error } = await supabase.rpc('admin_set_access', { p_email: email, p_active: active });
      if(error) return { ok: false, text: 'Error: ' + error.message };
      if(data === 'no-email') return { ok: false, text: 'Enter an email.' };
      if(data === 'ok-no-account') return { ok: true, text: active
        ? 'Access granted. No account with that email yet — they\'ll have access as soon as they register.'
        : 'Access removed.' };
      return { ok: true, text: active ? 'Access granted.' : 'Access removed.' };
    }

    accGrant.addEventListener('click', async () => {
      const email = accEmail.value.trim();
      if(!email){ accMsg.className = 'adm-msg err'; accMsg.textContent = 'Enter an email.'; return; }
      accGrant.disabled = true; accMsg.className = 'adm-msg'; accMsg.textContent = 'Granting…';
      const res = await setAccess(email, true);
      accGrant.disabled = false;
      accMsg.className = 'adm-msg ' + (res.ok ? 'ok' : 'err');
      accMsg.textContent = res.text;
      if(res.ok){ accEmail.value = ''; if(accSearch.value.trim()) runSearch(); }
    });
    accEmail.addEventListener('keydown', e => { if(e.key === 'Enter') accGrant.click(); });

    async function runSearch(){
      const q = accSearch.value.trim();
      if(!q){ accList.innerHTML = '<li class="adm-empty">Type an email above to search.</li>'; return; }
      accList.innerHTML = '<li class="adm-empty">Searching…</li>';
      const { data, error } = await supabase.rpc('admin_search_subscribers', { p_query: q });
      if(error){ accList.innerHTML = `<li class="adm-empty">Error: ${esc(error.message)}</li>`; return; }
      const rows = data || [];
      if(!rows.length){ accList.innerHTML = '<li class="adm-empty">No one found for that email.</li>'; return; }
      accList.innerHTML = rows.map(r => {
        const nm = r.display_name || r.email;
        const status = r.active ? '<span class="adm-status on">Active</span>' : '<span class="adm-status off">Inactive</span>';
        const src = `<span class="adm-src">${esc(r.source)}</span>`;
        const btn = r.active
          ? `<button class="adm-remove" type="button" data-acc-revoke data-email="${esc(r.email)}">Revoke</button>`
          : `<button class="adm-grant" type="button" data-acc-grant data-email="${esc(r.email)}">Grant</button>`;
        return `<li class="adm-row">
          <div class="adm-info">
            <div class="adm-name">${esc(nm)}${status}${src}</div>
            <div class="adm-mail">${esc(r.email)}</div>
          </div>
          ${btn}</li>`;
      }).join('');
    }

    accSearchBtn.addEventListener('click', runSearch);
    accSearch.addEventListener('keydown', e => { if(e.key === 'Enter') runSearch(); });
    let accDebounce = null;
    accSearch.addEventListener('input', () => { clearTimeout(accDebounce); accDebounce = setTimeout(runSearch, 350); });

    accList.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-acc-revoke], [data-acc-grant]');
      if(!btn) return;
      const grant = btn.hasAttribute('data-acc-grant');
      const email = btn.dataset.email;
      if(!email) return;
      btn.disabled = true; const orig = btn.textContent; btn.textContent = grant ? 'Granting…' : 'Revoking…';
      const res = await setAccess(email, grant);
      if(res.ok) runSearch();
      else { btn.disabled = false; btn.textContent = orig; }
    });

    loadList();
  }

  // ---- Usage tab: every registered member with activity aggregates ----------
  // Data comes from ONE admin RPC (admin_user_activity — SECURITY DEFINER,
  // is_admin-gated) that joins auth.users + profiles + subscribers with an
  // aggregate over results. Read-only; nothing here writes.
  function buildUsage(el){
    el.innerHTML = `
    <div>
      <div class="adm-head">
        <h1>Usage</h1>
        <p>Every registered member, sorted by most recent activity. “Last activity” is their latest saved measurement <b>or</b> app/connection activity (opening the app, connecting a wheel — recorded since the diagnostics went live). “Last sign-in” is the last time they typed a login code — long-lived sessions don’t refresh it.</p>
      </div>
      <div class="admu-chips" id="usChips"></div>
      <div class="adm-card" style="padding:14px 16px;margin-bottom:14px">
        <div class="adm-add" style="align-items:center">
          <input id="usSearch" type="search" placeholder="Filter by name or email…" autocomplete="off">
          <label class="admu-toggle"><input type="checkbox" id="usSeeds"> Include bots &amp; personas</label>
        </div>
      </div>
      <div class="adm-card admu-tablecard">
        <div class="admu-scroll">
          <table class="admu-table">
            <thead><tr>
              <th>Member</th><th>Last activity</th><th>Last sign-in</th>
              <th class="num">Measures</th><th class="num">Last 30d</th>
              <th class="num">Solo</th><th class="num">Session</th><th class="num">Race</th><th class="num">Exp</th>
              <th class="num" title="Solo & experiment rows count actually measured time; session & race rows count the scheduled event length.">Minutes</th><th class="num">Verified</th>
            </tr></thead>
            <tbody id="usBody"><tr><td colspan="11" class="adm-empty" style="padding:16px">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;

    const body = el.querySelector('#usBody');
    const chips = el.querySelector('#usChips');
    const search = el.querySelector('#usSearch');
    const seedsToggle = el.querySelector('#usSeeds');
    let rows = [];
    // Seed personas / bots (profiles.is_seed, set by the Railway bot) measure
    // daily and would drown the real members — hidden by default, toggleable.
    const visibleRows = () => seedsToggle.checked ? rows : rows.filter(r => !r.seed);

    const DAY = 86400000;
    const fmtAgo = ts => {
      if(!ts) return '<span class="admu-dim">—</span>';
      const diff = Date.now() - new Date(ts).getTime();
      const abs = esc(new Date(ts).toLocaleString('en-GB'));
      let rel;
      if(diff < 3600000) rel = Math.max(1, Math.round(diff / 60000)) + 'm ago';
      else if(diff < DAY) rel = Math.round(diff / 3600000) + 'h ago';
      else if(diff < 60 * DAY) rel = Math.round(diff / DAY) + 'd ago';
      else rel = new Date(ts).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
      const fresh = diff < 7 * DAY ? '<span class="admu-live"></span>' : '';
      return `<span title="${abs}">${fresh}${esc(rel)}</span>`;
    };
    const num = v => (v && Number(v) > 0) ? esc(String(v)) : '<span class="admu-dim">·</span>';
    // Latest of "saved a measurement" and "was in the app / touched the wheel"
    // (ble_events). Tolerates an older deployed RPC without last_event_at.
    const lastActivityTs = r => {
      const m = r.last_measure_at ? +new Date(r.last_measure_at) : 0;
      const e = r.last_event_at ? +new Date(r.last_event_at) : 0;
      const t = Math.max(m, e);
      return t ? new Date(t).toISOString() : null;
    };

    function paintChips(){
      const vis = visibleRows();
      const lastAct = r => Math.max(
        r.last_measure_at ? +new Date(r.last_measure_at) : 0,
        r.last_event_at ? +new Date(r.last_event_at) : 0,
        r.last_sign_in_at ? +new Date(r.last_sign_in_at) : 0);
      const act7 = vis.filter(r => Date.now() - lastAct(r) < 7 * DAY).length;
      const act30 = vis.filter(r => Date.now() - lastAct(r) < 30 * DAY).length;
      const subs = vis.filter(r => r.subscriber).length;
      const measured = vis.filter(r => Number(r.measures_total) > 0).length;
      const never = vis.filter(r => !r.last_sign_in_at && !Number(r.measures_total)).length;
      chips.innerHTML = [
        [vis.length, 'Members'], [act7, 'Active · 7 days'], [act30, 'Active · 30 days'],
        [subs, 'Subscribers'], [measured, 'Ever measured'], [never, 'Never signed in'],
      ].map(([v, l]) => `<div class="admu-chip"><b>${esc(String(v))}</b><span>${esc(l)}</span></div>`).join('');
    }

    function paint(){
      openDetail = null;   // a repaint wipes the tbody — the datasheet row goes with it
      const q = (search.value || '').trim().toLowerCase();
      const base = visibleRows();
      const list = q ? base.filter(r =>
        (r.display_name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q)) : base;
      if(!list.length){ body.innerHTML = `<tr><td colspan="11" class="adm-empty" style="padding:16px">No members match.</td></tr>`; return; }
      body.innerHTML = list.map(r => `
        <tr class="clickable" data-uid="${esc(r.uid)}" title="Click for the connection datasheet">
          <td class="admu-member">
            <div class="n">${esc(r.display_name || '—')}${r.subscriber ? '<span class="admu-badge sub">Sub</span>' : ''}${r.maker ? '<span class="admu-badge maker">Maker</span>' : ''}${r.seed ? '<span class="admu-badge seed">Bot</span>' : ''}</div>
            <div class="e">${esc(r.email || '')}${r.country ? ' · ' + esc(r.country) : ''}</div>
          </td>
          <td>${fmtAgo(lastActivityTs(r))}</td>
          <td>${fmtAgo(r.last_sign_in_at)}</td>
          <td class="num"><b>${num(r.measures_total)}</b></td>
          <td class="num">${num(r.measures_30d)}</td>
          <td class="num">${num(r.solo_count)}</td>
          <td class="num">${num(r.session_count)}</td>
          <td class="num">${num(r.race_count)}</td>
          <td class="num">${num(r.experiment_count)}</td>
          <td class="num">${num(r.minutes_total)}</td>
          <td class="num">${r.verified_pct == null ? '<span class="admu-dim">·</span>' : esc(String(Math.round(r.verified_pct))) + '%'}</td>
        </tr>`).join('');
    }

    let usDebounce = null;
    search.addEventListener('input', () => { clearTimeout(usDebounce); usDebounce = setTimeout(paint, 200); });
    seedsToggle.addEventListener('change', () => { paintChips(); paint(); });

    // ---- Member datasheet (click a row) — remote connection diagnostics ------
    const uaSummary = ua => {
      ua = ua || '';
      const dev = /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android'
        : /Windows/.test(ua) ? 'Windows PC' : /Macintosh/.test(ua) ? 'Mac (or iPad in desktop mode)' : 'Unknown device';
      const br = /Bluefy/i.test(ua) ? 'Bluefy' : /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome'
        : /Safari\//.test(ua) ? 'Safari/WebKit' : 'browser?';
      return dev + ' · ' + br;
    };
    const fmtDur = ms => ms == null ? '?' : ms < 60000 ? Math.max(1, Math.round(ms / 1000)) + 's' : Math.round(ms / 60000) + 'm';
    const fmtTs = ts => { try { return new Date(ts).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return '' + ts; } };

    // Every event as one plain-language line + a severity dot.
    function humanEvent(e){
      const d = e.detail || {};
      switch(e.event){
        case 'session_start':     return ['', 'Opened the app — ' + uaSummary(d.ua) + (d.screen ? ' · ' + d.screen : '')];
        case 'connect_start':     return ['', 'Opened the device picker'];
        case 'picker_cancel':     return ['y', 'Closed the picker without choosing (wheel not in the list?)'];
        case 'connected':         return ['g', 'Wheel connected' + (d.device ? ' · ' + d.device : '')];
        case 'wheel_info':        return ['g', 'Wheel details — firmware ' + (d.fw || '?') + ', battery ' + (d.battery || '?')];
        case 'reconnected':       return ['g', 'Connection healed by itself after ' + fmtDur(d.afterMs)];
        case 'reconnect_retry':   return ['', 'Retried the connection automatically (no new drop)'];
        case 'link_drop':         return ['y', 'Link dropped after ' + fmtDur(d.aliveMs) +
                                      (d.visible === 'hidden' ? ' — screen was OFF/locked' : '') +
                                      (d.battery === 'LOW' ? ' — battery was LOW' : '')];
        case 'reconnect_giveup':  return ['y', 'Auto-reconnect gave up (needed a manual Connect)'];
        case 'reconnect_stopped': return ['', 'Member pressed Stop during reconnecting'];
        case 'connect_fail':      return ['r', 'Connect failed: ' + (d.friendly || 'unknown error')];
        case 'terminal_error':    return ['r', 'Gave up: ' + (d.friendly || 'unknown error')];
        case 'manual_disconnect': return ['', 'Member disconnected the wheel'];
        case 'battery_low':       return ['r', 'Wheel battery turned LOW'];
        case 'battery_ok':        return ['g', 'Battery reads OK again (fresh battery?)'];
        default:                  return ['', e.event];
      }
    }

    // Rule-based diagnosis — pattern counts over the fetched window, each with
    // ready-to-send advice + the matching guide entry.
    function diagnose(evs){
      const out = [];
      const det = e => e.detail || {};
      const drops = evs.filter(e => e.event === 'link_drop');
      const shortDrops = drops.filter(e => det(e).aliveMs != null && det(e).aliveMs < 60000);
      const lowSeen = evs.some(e => e.event === 'battery_low') || drops.some(e => det(e).battery === 'LOW');
      const hiddenDrops = drops.filter(e => det(e).visible === 'hidden');
      const gattErr = evs.filter(e => /GATT Server is disconnected/i.test((det(e).raw && det(e).raw.msg) || ''));
      const noBt = evs.filter(e => /connect to Bluetooth/i.test(det(e).friendly || ''));
      const wrongPick = evs.filter(e => /not an Egely Wheel/i.test(det(e).friendly || ''));
      if(lowSeen || shortDrops.length >= 3)
        out.push(['bad', '🔋', `Weak 9V battery pattern — ${shortDrops.length} short-lived link(s)` +
          (lowSeen ? ' and the wheel reported LOW' : '') +
          '. Advice: replace the 9V battery. Guide entry: “The app says Battery low”.']);
      if(hiddenDrops.length >= 2)
        out.push(['warn', '📱', `${hiddenDrops.length} drop(s) happened with the screen off/locked. ` +
          'Advice: Settings → Display & Brightness → Auto-Lock → Never while measuring. Guide entry: “My screen locked…”.']);
      if(gattErr.length)
        out.push(['warn', '⚙️', `${gattErr.length}× “GATT Server is disconnected” — classic OS-level pairing. ` +
          'Advice: remove Egely Wheel from the device’s Bluetooth settings. Guide entry: “I paired the wheel…”.']);
      if(noBt.length)
        out.push(['warn', '🌐', `Tried a browser without Bluetooth support ${noBt.length}×. ` +
          'Advice: iPhone/iPad → the free Bluefy app; computer → Chrome or Edge.']);
      if(wrongPick.length >= 2)
        out.push(['warn', '🎯', `Picked a wrong device ${wrongPick.length}× — the wheel probably shows unnamed in their picker. ` +
          'Advice: switch the wheel off and on, pick the entry that newly appears.']);
      if(!out.length)
        out.push(['ok', '✅', evs.length
          ? 'No obvious problem pattern in the recorded events.'
          : 'No connection events yet — they appear once the member uses the app after this feature went live.']);
      return out;
    }

    let openDetail = null;   // { uid, tr } of the currently open datasheet row
    function closeDetail(){ if(openDetail){ openDetail.tr.remove(); openDetail = null; } }

    async function openDatasheet(rowTr, uid, name){
      closeDetail();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="admd-cell" colspan="11"><span class="adm-empty">Loading events…</span></td>`;
      rowTr.after(tr);
      openDetail = { uid, tr };
      const cell = tr.firstElementChild;

      const load = async () => {
        const { data, error } = await supabase.rpc('admin_user_events', { p_uid: uid });
        if(openDetail?.uid !== uid) return;   // closed / another row opened meanwhile
        if(error){
          cell.innerHTML = `<span class="adm-empty">Could not load: ${esc(error.message)}${/function/i.test(error.message) ? ' — run the ble_events SQL first.' : ''}</span>`;
          return;
        }
        const evs = data || [];
        // Offline-queued events arrive late: created_at is upload time, but
        // client_ts is when it actually happened — order the timeline by that.
        evs.sort((a, b) => new Date(b.client_ts || b.created_at) - new Date(a.client_ts || a.created_at));
        const sess = evs.find(e => e.event === 'session_start');
        const winfo = evs.find(e => e.event === 'wheel_info');
        const diag = diagnose(evs);
        cell.innerHTML = `
          <div class="admd-head">
            <span><b>${esc(name)}</b> · connection datasheet (last 60 days, newest first)</span>
            ${sess ? `<span title="${esc((sess.detail || {}).ua || '')}">📟 <b>${esc(uaSummary((sess.detail || {}).ua))}</b></span>` : ''}
            ${winfo ? `<span>⚙️ firmware <b>${esc((winfo.detail || {}).fw || '?')}</b> · battery <b>${esc((winfo.detail || {}).battery || '?')}</b></span>` : ''}
            <button type="button" class="admd-refresh">↻ Refresh</button>
          </div>
          <div class="admd-diag">${diag.map(([lv, ic, tx]) =>
            `<div class="admd-diag-row ${lv}"><span>${ic}</span><span>${esc(tx)}</span></div>`).join('')}</div>
          <ul class="admd-tl">${evs.map(e => {
            const [dot, text] = humanEvent(e);
            const raw = e.detail && e.detail.raw && e.detail.raw.msg ? `<span class="admd-raw">${esc(e.detail.raw.msg)}</span>` : '';
            return `<li><span class="admd-dot ${dot}"></span><span class="admd-ts">${esc(fmtTs(e.client_ts || e.created_at))}</span><span>${esc(text)}${raw}</span></li>`;
          }).join('') || '<li class="adm-empty">No events recorded.</li>'}</ul>`;
        const rf = cell.querySelector('.admd-refresh');
        if(rf) rf.addEventListener('click', () => { cell.innerHTML = '<span class="adm-empty">Loading events…</span>'; load(); });
      };
      load();
    }

    body.addEventListener('click', (e) => {
      const tr = e.target.closest('tr.clickable');
      if(!tr || !body.contains(tr)) return;
      const uid = tr.dataset.uid;
      if(!uid) return;
      if(openDetail && openDetail.uid === uid){ closeDetail(); return; }
      const r = rows.find(x => x.uid === uid);
      openDatasheet(tr, uid, (r && (r.display_name || r.email)) || 'Member');
    });

    (async () => {
      const { data, error } = await supabase.rpc('admin_user_activity');
      if(error){
        body.innerHTML = `<tr><td colspan="11" class="adm-empty" style="padding:16px">Could not load: ${esc(error.message)}${/function/i.test(error.message) ? ' — run the admin_user_activity SQL first.' : ''}</td></tr>`;
        return;
      }
      rows = data || [];
      paintChips();
      paint();
    })();
  }

  const unsub = auth.subscribeAuth(render);
  return () => { teardownTab(); if(unsub) unsub(); };
}
