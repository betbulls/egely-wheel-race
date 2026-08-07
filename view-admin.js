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
  let built = false, partnersCleanup = null;
  const teardownPartners = () => { if(partnersCleanup){ partnersCleanup(); partnersCleanup = null; } };

  function render(a){
    if(!a.user){
      built = false; teardownPartners();
      el.innerHTML = `<div class="adm-wrap"><div class="adm-card"><p class="adm-empty">Please <a href="#/login">log in</a>.</p></div></div>`;
      return;
    }
    if(!a.profile){
      if(!built) el.innerHTML = `<div class="adm-wrap"><div class="adm-card"><p class="adm-empty">Loading…</p></div></div>`;
      return;
    }
    if(!a.isAdmin){
      built = false; teardownPartners();
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
      <div class="adm-wrap" style="max-width:${tab === 'partners' || tab === 'usage' ? '1080px' : '640px'}">
        <div class="adm-tabs">
          <button type="button" class="adm-tab ${tab === 'makers' ? 'on' : ''}" data-tab="makers">Makers &amp; access</button>
          <button type="button" class="adm-tab ${tab === 'usage' ? 'on' : ''}" data-tab="usage">Usage</button>
          <button type="button" class="adm-tab ${tab === 'partners' ? 'on' : ''}" data-tab="partners">Influencer onboarding</button>
        </div>
        <div id="admTabHost"></div>
      </div>`;
    el.querySelectorAll('.adm-tab').forEach(b => b.addEventListener('click', () => {
      if(b.dataset.tab === tab) return;
      tab = b.dataset.tab;
      teardownPartners();
      buildShell();
    }));
    const host = el.querySelector('#admTabHost');
    if(tab === 'partners') partnersCleanup = mountPartners(host);
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
        <p>Every registered member, sorted by most recent activity. “Last activity” is their latest saved measurement. “Last sign-in” is the last time they typed a login code — long-lived sessions don’t refresh it, so regulars who never re-log-in can look older there than they are.</p>
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

    function paintChips(){
      const vis = visibleRows();
      const lastAct = r => Math.max(r.last_measure_at ? +new Date(r.last_measure_at) : 0, r.last_sign_in_at ? +new Date(r.last_sign_in_at) : 0);
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
      const q = (search.value || '').trim().toLowerCase();
      const base = visibleRows();
      const list = q ? base.filter(r =>
        (r.display_name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q)) : base;
      if(!list.length){ body.innerHTML = `<tr><td colspan="11" class="adm-empty" style="padding:16px">No members match.</td></tr>`; return; }
      body.innerHTML = list.map(r => `
        <tr>
          <td class="admu-member">
            <div class="n">${esc(r.display_name || '—')}${r.subscriber ? '<span class="admu-badge sub">Sub</span>' : ''}${r.maker ? '<span class="admu-badge maker">Maker</span>' : ''}${r.seed ? '<span class="admu-badge seed">Bot</span>' : ''}</div>
            <div class="e">${esc(r.email || '')}${r.country ? ' · ' + esc(r.country) : ''}</div>
          </td>
          <td>${fmtAgo(r.last_measure_at)}</td>
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
  return () => { teardownPartners(); if(unsub) unsub(); };
}
