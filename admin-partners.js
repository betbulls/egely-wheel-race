// admin-partners.js — "Influencer onboarding" tab of the admin console (#/admin).
// Krisztián & Csaba manage partner influencers here: invite by email, fill the deal
// (tier/coupons/offer), upload the agreement, set tracking, manage/customize steps,
// and see at a glance who needs attention across MANY partners. Writes go straight
// to the partner tables under admin RLS policies (is_app_admin()).
import { supabase } from './db.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const escAttr = esc;

const TIERS = { advocate: 50, pro: 70, ambassador: 100 };
const HUB_URL = 'https://live.egelywheel.com/#/onboarding';

function styles(){
  if(document.getElementById('admpStyles')) return;
  const el = document.createElement('style');
  el.id = 'admpStyles';
  el.textContent = `
  .admp{max-width:1080px;margin:0 auto}
  .admp .sec{font:600 12px 'Montserrat',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#67737c;margin:24px 0 12px}
  .admp-att{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .admp-attcard{background:#fff;border:1px solid #dfe3e6;border-top:3px solid #b8860b;border-radius:14px;padding:15px;
    box-shadow:0 10px 28px rgba(1,22,36,.08)}
  .admp-attcard .who{display:flex;align-items:center;gap:9px}
  .admp-attcard .who b{font:600 14px 'Inter',sans-serif;color:#011624;display:block}
  .admp-attcard .who small{font:400 11px 'Inter',sans-serif;color:#99a2a7}
  .admp-attcard p{font:400 12.5px 'Inter',sans-serif;color:#67737c;margin:9px 0 0;line-height:1.5}
  .admp-attcard p b{color:#011624}
  .admp-attcard .row{display:flex;gap:8px;margin-top:11px}
  .admp-av{width:34px;height:34px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#37dbff,#5230da);color:#fff;font:600 14px 'Montserrat',sans-serif}
  .admp-btn{font:700 11px 'Montserrat',sans-serif;letter-spacing:.05em;text-transform:uppercase;padding:9px 16px;
    border-radius:999px;cursor:pointer;border:1px solid transparent;background:#401d91;color:#fff;white-space:nowrap}
  .admp-btn:hover{background:#011624}
  .admp-btn:disabled{opacity:.6;cursor:default}
  .admp-btn.line{background:#fff;color:#011624;border:1px solid #dfe3e6}
  .admp-btn.line:hover{background:#f7f8f8;color:#011624}
  .admp-tablewrap{overflow-x:auto;background:#fff;border:1px solid #dfe3e6;border-radius:16px;box-shadow:0 10px 28px rgba(1,22,36,.08)}
  .admp-roster{width:100%;border-collapse:collapse;min-width:840px}
  .admp-roster th{font:600 10.5px 'Montserrat',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#99a2a7;
    text-align:left;padding:13px 16px;border-bottom:1px solid #dfe3e6}
  .admp-roster td{padding:12px 16px;border-bottom:1px solid #f2f3f4;font:400 13px 'Inter',sans-serif;color:#67737c;vertical-align:middle}
  .admp-roster tr:last-child td{border-bottom:none}
  .admp-roster tr[data-open]{cursor:pointer}
  .admp-roster tr[data-open]:hover td{background:#fbfbfc}
  .admp-p{display:flex;align-items:center;gap:9px}
  .admp-p b{font:600 13.5px 'Inter',sans-serif;color:#011624;display:block}
  .admp-p small{font:400 11px 'Inter',sans-serif;color:#99a2a7}
  .admp-bar{width:86px;height:7px;background:#f2f3f4;border-radius:999px;overflow:hidden;display:inline-block;
    vertical-align:middle;margin-right:8px}
  .admp-bar i{display:block;height:100%;background:linear-gradient(135deg,#37dbff,#5230da)}
  .admp-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 9px;font:600 10.5px 'Inter',sans-serif;white-space:nowrap}
  .admp-chip.them{background:rgba(82,48,218,.1);color:#401d91;border:1px solid rgba(82,48,218,.24)}
  .admp-chip.us{background:#f2f3f4;color:#67737c;border:1px solid #dfe3e6}
  .admp-ok{color:#0f8a52;font-weight:600}
  .admp-warn{color:#b8860b;font-weight:600}
  /* editor */
  .admp-editor{background:#fff;border:1.6px solid #5230da;border-radius:16px;box-shadow:0 10px 28px rgba(82,48,218,.14);
    margin-top:14px;overflow:hidden}
  .admp-edhead{display:flex;align-items:center;gap:11px;padding:16px 20px;border-bottom:1px solid #dfe3e6;flex-wrap:wrap}
  .admp-edhead h3{font:700 17px 'Montserrat',sans-serif;color:#011624;margin:0}
  .admp-edhead .mail{font:400 13px 'Inter',sans-serif;color:#67737c}
  .admp-edbody{display:grid;grid-template-columns:1fr 1fr;gap:0}
  .admp-col{padding:18px 20px;min-width:0}
  .admp-col + .admp-col{border-left:1px solid #f2f3f4}
  .admp-col h5{font:600 11px 'Montserrat',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#67737c;margin:0 0 12px}
  .admp-f{margin-bottom:10px}
  .admp-f label{display:block;font:600 11px 'Inter',sans-serif;color:#99a2a7;margin-bottom:4px}
  .admp-f input,.admp-f select,.admp-f textarea{width:100%;box-sizing:border-box;background:#f7f8f8;border:1px solid #dfe3e6;
    border-radius:9px;color:#011624;font:400 13.5px 'Inter',sans-serif;padding:9px 11px}
  .admp-f textarea{min-height:74px;resize:vertical}
  .admp-f input:focus,.admp-f select:focus,.admp-f textarea:focus{outline:none;border-color:#5230da;background:#fff}
  .admp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .admp-msg{display:inline-block;margin-left:10px;font:500 12.5px 'Inter',sans-serif;color:#67737c}
  .admp-msg.ok{color:#0f8a52}.admp-msg.err{color:#c2415b}
  .admp-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
  .admp-step{display:grid;grid-template-columns:1fr auto auto;gap:9px;align-items:center;background:#f7f8f8;
    border:1px solid #dfe3e6;border-radius:10px;padding:8px 11px}
  .admp-step .t b{font:600 12.5px 'Inter',sans-serif;color:#011624;display:block}
  .admp-step .t small{font:400 10.5px 'Inter',sans-serif;color:#99a2a7}
  .admp-step select{background:#fff;border:1px solid #dfe3e6;border-radius:8px;font:600 11.5px 'Inter',sans-serif;
    color:#011624;padding:5px 7px}
  .admp-step .del{background:none;border:none;color:#c2415b;cursor:pointer;font-size:14px;padding:2px 5px}
  .admp-step .pf{display:flex;gap:6px;margin-top:7px;align-items:center}
  .admp-step .pf input{flex:1;min-width:0;font:400 11.5px 'Inter',sans-serif;padding:5px 8px;border-radius:7px;
    border:1px solid #dfe3e6;background:#fff;color:#011624}
  .admp-step .pf .admp-btn{padding:6px 11px;font-size:9.5px}
  .admp-plink{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;
    border-bottom:1px dashed #f2f3f4;font:500 12.5px 'Inter',sans-serif;color:#67737c}
  .admp-plink:last-of-type{border-bottom:none}
  .admp-modal-bg{position:fixed;inset:0;background:rgba(1,22,36,.45);backdrop-filter:blur(3px);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px}
  .admp-modal{background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(1,22,36,.3);width:100%;max-width:580px;
    max-height:88vh;display:flex;flex-direction:column;overflow:hidden}
  .admp-modal-h{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid #dfe3e6}
  .admp-modal-h b{font:700 16px 'Montserrat',sans-serif;color:#011624;display:block}
  .admp-modal-h span{font:400 12.5px 'Inter',sans-serif;color:#67737c}
  .admp-modal-x{margin-left:auto;background:none;border:none;font-size:17px;color:#99a2a7;cursor:pointer;
    width:30px;height:30px;border-radius:8px}
  .admp-modal-x:hover{background:#f2f3f4;color:#011624}
  .admp-modal-b{padding:18px 20px;overflow-y:auto}
  .admp-modal-b textarea{width:100%;box-sizing:border-box;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:10px;
    color:#011624;font:400 13.5px 'Inter',sans-serif;line-height:1.6;padding:12px 13px;resize:vertical}
  .admp-modal-b textarea:focus,.admp-modal-b input:focus{outline:none;border-color:#5230da;background:#fff}
  .admp-modal-note{margin-top:10px;font:400 11.5px 'Inter',sans-serif;color:#99a2a7;line-height:1.5}
  .admp-modal-f{display:flex;align-items:center;gap:10px;padding:14px 20px;border-top:1px solid #dfe3e6;background:#fbfbfc}
  .admp-copybox{background:#f7f8f8;border:1px dashed #b9c2c8;border-radius:12px;padding:13px;margin-top:12px}
  .admp-copybox h6{font:600 10.5px 'Montserrat',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#67737c;margin:0 0 8px}
  .admp-copybox p{font:400 12px 'Inter',sans-serif;color:#67737c;margin:0 0 10px;line-height:1.5}
  @media (max-width:760px){
    .admp-att{grid-template-columns:1fr}
    .admp-edbody{grid-template-columns:1fr}
    .admp-col + .admp-col{border-left:none;border-top:1px solid #f2f3f4}
  }`;
  document.head.appendChild(el);
}

const daysAgo = iso => { if(!iso) return null; const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5); return d; };
const fmtAgo = iso => { const d = daysAgo(iso); if(d == null) return '—'; if(d <= 0) return 'today'; if(d === 1) return '1 d ago'; return d + ' d ago'; };

export function mountPartners(host){
  styles();
  let partners = [], stepsByPartner = new Map(), templates = [], profilesById = new Map(), emailsByPartner = new Map();
  let openId = null;

  async function loadAll(){
    const [{ data: ps }, { data: st }, { data: tpl }] = await Promise.all([
      supabase.from('partner_onboarding').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_steps').select('*').order('sort', { ascending: true }),
      supabase.from('partner_step_templates').select('*').order('sort', { ascending: true }),
    ]);
    partners = ps || [];
    templates = tpl || [];
    stepsByPartner = new Map();
    (st || []).forEach(s => {
      if(!stepsByPartner.has(s.partner_id)) stepsByPartner.set(s.partner_id, []);
      stepsByPartner.get(s.partner_id).push(s);
    });
    // Connect-page handles for claimed partners (for the "Partner links" block).
    profilesById = new Map();
    const uids = partners.map(p => p.user_id).filter(Boolean);
    if(uids.length){
      const { data: profs } = await supabase.from('profiles').select('id,practitioner_handle').in('id', uids);
      (profs || []).forEach(r => profilesById.set(r.id, r));
    }
    // Sent-email log (for "last nudge") — degrades to empty if the table isn't there yet.
    emailsByPartner = new Map();
    const { data: emails } = await supabase.from('partner_emails')
      .select('partner_id,kind,sent_at').order('sent_at', { ascending: false });
    (emails || []).forEach(e => {
      if(!emailsByPartner.has(e.partner_id)) emailsByPartner.set(e.partner_id, []);
      emailsByPartner.get(e.partner_id).push(e);
    });
  }

  // ---- per-partner rollup ------------------------------------------------------
  function rollup(p){
    const steps = stepsByPartner.get(p.id) || [];
    const req = steps.filter(s => s.required && s.status !== 'skipped');
    const done = req.filter(s => s.status === 'done').length;
    const pct = req.length ? Math.round(done / req.length * 100) : 0;
    const launched = req.length > 0 && done === req.length;
    // What are we waiting on? First not-done step decides.
    const open = steps.find(s => s.status !== 'done' && s.status !== 'skipped');
    let waitingOn = null;
    if(open){
      const needsAdmin = open.owner === 'team'
        || (open.key === 'agreement' && !p.contract_path)
        || (open.key === 'offer' && p.wheel_price_usd == null);
      waitingOn = { side: needsAdmin ? 'us' : 'them', step: open };
    }
    const lastActivity = steps.reduce((m, s) => s.done_at && (!m || s.done_at > m) ? s.done_at : m, null) || p.updated_at || p.created_at;
    const emails = emailsByPartner.get(p.id) || [];
    const lastEmailAt = emails.length ? emails[0].sent_at : null;
    return { steps, pct, launched, waitingOn, lastActivity, lastEmailAt, claimed: !!p.user_id };
  }

  function reminderEmail(p, r){
    const todo = r.steps.filter(s => s.status !== 'done' && s.status !== 'skipped' && s.owner === 'partner')
      .filter(s => !(s.key === 'agreement' && !p.contract_path) && !(s.key === 'offer' && p.wheel_price_usd == null))
      .slice(0, 3);
    const name = (p.invite_name || '').trim().split(' ')[0] || 'there';
    const lines = todo.map(s => `  • ${s.title}${s.minutes ? ` (~${s.minutes} min)` : ''}`).join('\n');
    return {
      subject: 'Your Spiritual Maker launch — quick next step',
      body: `Hi ${name},\n\nYour Spiritual Maker partner hub is waiting for you — here's what's next on your side:\n\n${lines || '  • Log in and check your next step'}\n\nIt all lives here: ${HUB_URL}\n(log in with this email address)\n\nWe handle everything else. Any question — just reply.\n\nKrisztián\nBrand Manager · Egely Wheel`,
    };
  }

  function welcomeEmail(p){
    const name = (p.invite_name || '').trim().split(' ')[0] || 'there';
    return {
      subject: 'Welcome to the Spiritual Maker Partner Program 🌀',
      body: `Hi ${name},\n\nGreat to have you on board! We've set up your personal partner hub — it walks you through everything from your agreement to your first live event, step by step, and shows exactly what we handle for you.\n\nYour hub: ${HUB_URL}\n\nHow to get in:\n  1. Open the link above\n  2. Log in with THIS email address (${p.email}) — you'll get an 8-digit code, no password needed\n  3. Your journey starts on the first screen\n\nMost steps take just a few minutes. I'm your dedicated Brand Manager — any question, just reply to this email.\n\nKrisztián\nBrand Manager · Egely Wheel`,
    };
  }

  // ---- email composer (send via the send-partner-email Edge Fn) ----------------
  function closeComposer(){ document.getElementById('admpModal')?.remove(); }

  function openComposer(partnerId, kind){
    const p = partners.find(x => x.id === partnerId);
    if(!p) return;
    const { subject, body } = kind === 'welcome' ? welcomeEmail(p) : reminderEmail(p, rollup(p));
    const last = (emailsByPartner.get(partnerId) || [])[0];
    closeComposer();
    const wrap = document.createElement('div');
    wrap.id = 'admpModal';
    wrap.className = 'admp-modal-bg';
    wrap.innerHTML = `
      <div class="admp-modal" role="dialog" aria-modal="true">
        <div class="admp-modal-h">
          <div><b>${kind === 'welcome' ? 'Welcome email' : 'Reminder email'}</b><span>to ${esc(p.invite_name || p.email)} · ${esc(p.email)}</span></div>
          <button class="admp-modal-x" data-mc-close aria-label="Close">✕</button>
        </div>
        <div class="admp-modal-b">
          <div class="admp-f"><label>Subject</label><input type="text" data-mc="subject" value="${escAttr(subject)}"></div>
          <div class="admp-f"><label>Message — edit freely before sending</label><textarea data-mc="body" rows="14">${esc(body)}</textarea></div>
          <div class="admp-modal-note">Sends from <b>hello@spiritualmaker.com</b> — your Spiritual Maker assistant.${last ? ` · last email ${fmtAgo(last.sent_at)}` : ''}</div>
        </div>
        <div class="admp-modal-f">
          <span class="admp-msg" data-mc-msg></span>
          <span style="flex:1"></span>
          <button class="admp-btn line" data-mc-copy>Copy</button>
          <button class="admp-btn" data-mc-send>Send email</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const getVals = () => ({
      subject: wrap.querySelector('[data-mc="subject"]').value.trim(),
      body: wrap.querySelector('[data-mc="body"]').value.trim(),
    });
    wrap.querySelector('[data-mc-close]').addEventListener('click', closeComposer);
    wrap.addEventListener('click', e => { if(e.target === wrap) closeComposer(); });
    wrap.querySelector('[data-mc-copy]').addEventListener('click', (e) => {
      const { subject, body } = getVals();
      copyText(`Subject: ${subject}\n\n${body}`, e.target);
    });
    wrap.querySelector('[data-mc-send]').addEventListener('click', async (e) => {
      const { subject, body } = getVals();
      const msg = wrap.querySelector('[data-mc-msg]');
      if(!subject || !body){ msg.className = 'admp-msg err'; msg.textContent = 'Subject and message are required.'; return; }
      e.target.disabled = true; msg.className = 'admp-msg'; msg.textContent = 'Sending…';
      let error, data;
      try {
        const res = await supabase.functions.invoke('send-partner-email', { body: { partnerId, kind, subject, body } });
        error = res.error; data = res.data;
      } catch(ex){ error = ex; }
      if(error || (data && data.error)){
        // supabase-js wraps a non-2xx Fn response in FunctionsHttpError with a generic
        // .message; the real {error} body lives on error.context (an unread Response).
        let reason = data?.error || error?.message || 'unknown error';
        if(error && error.context && typeof error.context.json === 'function'){
          try { const b = await error.context.json(); if(b && b.error) reason = b.error; } catch {}
        }
        e.target.disabled = false; msg.className = 'admp-msg err';
        msg.textContent = 'Could not send: ' + reason;
        return;
      }
      msg.className = 'admp-msg ok';
      msg.textContent = (data && data.logged === false) ? 'Sent ✓ (not logged)' : 'Sent ✓';
      setTimeout(async () => { closeComposer(); await loadAll(); render(); }, 700);
    });
  }

  // ---- render --------------------------------------------------------------------
  function render(){
    const rolls = partners.map(p => ({ p, r: rollup(p) }));
    const attention = rolls.filter(({ r }) => {
      if(!r.waitingOn) return false;
      const d = daysAgo(r.lastActivity) || 0;
      return r.waitingOn.side === 'us' || d >= 3;
    }).slice(0, 6);

    host.innerHTML = `
    <div class="admp">
      <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <h1 style="font:700 24px 'Montserrat',sans-serif;color:#011624;margin:0">Influencer onboarding</h1>
          <p style="font:400 13.5px 'Inter',sans-serif;color:#67737c;margin:5px 0 0">
            ${partners.length} partner${partners.length === 1 ? '' : 's'}
            ${attention.length ? ` · <b style="color:#b8860b">${attention.length} need${attention.length === 1 ? 's' : ''} attention</b>` : ' · all quiet ✓'}
          </p>
        </div>
        <div style="flex:1"></div>
        <button class="admp-btn" data-act="add-open">＋ Add partner</button>
      </div>

      <div id="admpAdd" hidden style="margin-top:14px;background:#fff;border:1px solid #dfe3e6;border-radius:14px;
        box-shadow:0 10px 28px rgba(1,22,36,.08);padding:16px 18px">
        <h5 style="font:600 11px 'Montserrat',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#67737c;margin:0 0 10px">New partner</h5>
        <div class="admp-grid2">
          <div class="admp-f"><label>Email (they log in with this)</label><input type="email" id="admpNewMail" placeholder="influencer@example.com"></div>
          <div class="admp-f"><label>Name</label><input type="text" id="admpNewName" placeholder="Anna Rivers"></div>
        </div>
        <button class="admp-btn" data-act="add-save">Create partner</button>
        <span class="admp-msg" id="admpAddMsg"></span>
      </div>

      ${attention.length ? `
      <div class="sec">Needs attention today</div>
      <div class="admp-att">
        ${attention.map(({ p, r }) => `
          <div class="admp-attcard">
            <div class="who">
              <span class="admp-av">${esc((p.invite_name || p.email)[0].toUpperCase())}</span>
              <div><b>${esc(p.invite_name || p.email)}</b><small>${esc(p.tier || 'ambassador')} · ${r.launched ? 'launched' : 'onboarding ' + r.pct + '%'}</small></div>
            </div>
            <p>Waiting on <b>${r.waitingOn.side === 'us' ? 'US' : 'THEM'}</b> — ${esc(r.waitingOn.step.title)} · ${fmtAgo(r.lastActivity)} · ${r.lastEmailAt ? 'nudged ' + fmtAgo(r.lastEmailAt) : 'not nudged yet'}</p>
            <div class="row">
              ${r.waitingOn.side === 'them' ? `<button class="admp-btn" data-remind="${p.id}">📧 Send reminder</button>` : ''}
              <button class="admp-btn line" data-open-editor="${p.id}">Open</button>
            </div>
          </div>`).join('')}
      </div>` : ''}

      <div class="sec">All partners</div>
      ${partners.length ? `
      <div class="admp-tablewrap"><table class="admp-roster">
        <tr><th>Partner</th><th>Stage</th><th>Waiting on</th><th>Last activity</th><th></th></tr>
        ${rolls.map(({ p, r }) => `
          <tr data-open="${p.id}" ${openId === p.id ? 'style="background:#fbfaff"' : ''}>
            <td><div class="admp-p">
              <span class="admp-av">${esc((p.invite_name || p.email)[0].toUpperCase())}</span>
              <div><b>${esc(p.invite_name || p.email)}</b><small>${esc(p.email)}${r.claimed ? '' : ' · not logged in yet'}</small></div>
            </div></td>
            <td>${r.launched
              ? '<span class="admp-ok">Launched ✓</span>'
              : `<span class="admp-bar"><i style="width:${r.pct}%"></i></span>${r.pct}%`}</td>
            <td>${r.waitingOn
              ? `<span class="admp-chip ${r.waitingOn.side}">${r.waitingOn.side === 'us' ? '🛠 US' : 'THEM'} · ${esc(r.waitingOn.step.title)}</span>`
              : '<span class="admp-ok">—</span>'}</td>
            <td>${fmtAgo(r.lastActivity)}${r.lastEmailAt ? `<br><span style="font-size:10.5px;color:#99a2a7">nudged ${fmtAgo(r.lastEmailAt)}</span>` : ''}</td>
            <td>${r.waitingOn && r.waitingOn.side === 'them' && (daysAgo(r.lastActivity) || 0) >= 3
              ? `<button class="admp-btn" data-remind="${p.id}" title="Send reminder">📧</button>` : `<button class="admp-btn line" data-open-editor="${p.id}">Open</button>`}</td>
          </tr>
        `).join('')}
      </table></div>
      ${(() => { const op = partners.find(x => x.id === openId); return op ? editorHtml(op, rollup(op)) : ''; })()}` : `
      <div style="background:#fff;border:1px solid #dfe3e6;border-radius:14px;padding:22px;color:#99a2a7;font:400 14px 'Inter',sans-serif">
        No partners yet — add the first one above. They get a personal onboarding hub the moment they log in with that email.
      </div>`}
    </div>`;

    bind();
  }

  // ---- editor ---------------------------------------------------------------------
  function editorHtml(p, r){
    const pts = Array.isArray(p.contract_points) ? p.contract_points : [];
    return `
    <div class="admp-editor" data-editor="${p.id}">
      <div class="admp-edhead">
        <h3>${esc(p.invite_name || p.email)}</h3>
        <span class="mail">${esc(p.email)}</span>
        <span style="flex:1"></span>
        <button class="admp-btn line" data-welcome="${p.id}">📧 Welcome email</button>
        <button class="admp-btn line" data-remind="${p.id}">📧 Send reminder</button>
        <button class="admp-btn line" data-close-editor>✕ Close</button>
      </div>
      <div class="admp-edbody">
        <div class="admp-col">
          <h5>Deal &amp; tier</h5>
          <div class="admp-grid2">
            <div class="admp-f"><label>Tier</label>
              <select data-p="tier">
                ${Object.keys(TIERS).map(t => `<option value="${t}" ${p.tier === t ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)} · $${TIERS[t]}</option>`).join('')}
              </select></div>
            <div class="admp-f"><label>Commission $ / sale</label><input type="number" data-p="commission_usd" value="${p.commission_usd ?? ''}" placeholder="${TIERS[p.tier] || 100}"></div>
            <div class="admp-f"><label>Wheel price $ (0 = free)</label><input type="number" step="0.01" data-p="wheel_price_usd" value="${p.wheel_price_usd ?? ''}" placeholder="0"></div>
            <div class="admp-f"><label>Wheel coupon</label><input type="text" data-p="wheel_coupon" value="${escAttr(p.wheel_coupon || '')}" placeholder="ANNA-WHEEL"></div>
            <div class="admp-f"><label>Audience coupon</label><input type="text" data-p="audience_coupon" value="${escAttr(p.audience_coupon || '')}" placeholder="ANNA10"></div>
            <div class="admp-f"><label>Affiliate link</label><input type="url" data-p="affiliate_link" value="${escAttr(p.affiliate_link || '')}" placeholder="https://…"></div>
          </div>
          <div class="admp-f"><label>Offer URL (product / cart link the “Claim” button opens)</label><input type="url" data-p="offer_url" value="${escAttr(p.offer_url || '')}" placeholder="https://egelywheel.com/products/…"></div>

          <h5 style="margin-top:18px">Agreement</h5>
          <div class="admp-f"><label>Contract PDF ${p.contract_path ? '· <span style="color:#0f8a52">uploaded ✓</span>' : '· <span style="color:#b8860b">not uploaded</span>'}</label>
            <input type="file" accept="application/pdf" data-p-file="contract"></div>
          <div class="admp-f"><label>Key commitments (one per line — shown to the partner)</label>
            <textarea data-p="contract_points_text" placeholder="Unboxing video&#10;1 content round per month&#10;3 months (Aug–Oct 2026)">${esc(pts.join('\n'))}</textarea></div>

          <h5 style="margin-top:18px">Shipping</h5>
          <div class="admp-grid2">
            <div class="admp-f"><label>Carrier</label>
              <select data-p="shipping_carrier">
                ${['', 'fedex', 'usps', 'ups', 'other'].map(c => `<option value="${c}" ${p.shipping_carrier === c ? 'selected' : ''}>${c ? c.toUpperCase() : '—'}</option>`).join('')}
              </select></div>
            <div class="admp-f"><label>Tracking number</label><input type="text" data-p="tracking_number" value="${escAttr(p.tracking_number || '')}"></div>
          </div>
          <label style="display:flex;gap:8px;align-items:center;font:500 13px 'Inter',sans-serif;color:#011624;margin:2px 0 12px">
            <input type="checkbox" data-p="delivered" ${p.delivered ? 'checked' : ''}> Delivered
          </label>
          <button class="admp-btn" data-save="${p.id}">Save partner</button>
          <span class="admp-msg" data-savemsg></span>
          ${(() => {
            // The partner's shareable money-links — same set as their hub rail,
            // here so Krisztián can paste them straight into emails.
            const prof = p.user_id ? profilesById.get(p.user_id) : null;
            const links = [];
            if(p.affiliate_link){
              links.push(['Affiliate link', p.affiliate_link]);
              links.push(['Earnings dashboard', 'https://affiliate.egelywheel.com']);
            }
            if(prof && prof.practitioner_handle) links.push(['EWR Live connect page', `https://live.egelywheel.com/#/connect/${prof.practitioner_handle}`]);
            return links.length ? `
            <h5 style="margin-top:20px">Partner links</h5>
            ${links.map(([l, u]) => `<div class="admp-plink"><span>${esc(l)}</span><button class="admp-btn line" data-copylink="${escAttr(u)}">Copy</button></div>`).join('')}` : '';
          })()}
        </div>

        <div class="admp-col" data-stepscol="${p.id}">${stepsColHtml(p)}</div>
      </div>
    </div>`;
  }

  // The steps column re-renders ALONE after step mutations, so the admin's unsaved
  // deal fields / picked contract PDF in the left column survive untouched.
  function stepsColHtml(p){
    const r = rollup(p);
    return `
          <h5>Steps · ${r.pct}% ${r.launched ? '· launched ✓' : ''}</h5>
          <ul class="admp-steps">
            ${r.steps.map(s => `
              <li class="admp-step" data-step="${s.id}">
                <div class="t"><b>${esc(s.title)}</b><small>${s.owner === 'team' ? '🛠 our side' : 'partner'} · act ${s.act}${s.minutes ? ' · ~' + s.minutes + ' min' : ''}${s.needs_proof ? ' · 🔗 proof' : ''}${s.done_at ? ' · done ' + new Date(s.done_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</small>
                  ${s.needs_proof ? `<div class="pf">
                    <input type="url" data-proof-in="${s.id}" placeholder="proof link — required to close" value="${escAttr((s.payload && s.payload.proof_url) || '')}">
                    <button class="admp-btn line" data-proof-save="${s.id}">Set</button>
                    ${s.payload && s.payload.proof_url ? `<a href="${escAttr(s.payload.proof_url)}" target="_blank" rel="noopener">↗</a>` : ''}
                  </div>` : ''}
                </div>
                <select data-step-status="${s.id}">
                  ${['todo', 'waiting', 'done', 'skipped'].map(v => `<option value="${v}" ${s.status === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
                ${s.is_custom ? `<button class="del" data-step-del="${s.id}" title="Remove custom step">✕</button>` : '<span></span>'}
              </li>`).join('')}
          </ul>
          <div class="admp-copybox">
            <h6>＋ Custom step for this partner</h6>
            <div class="admp-grid2">
              <div class="admp-f"><label>Title</label><input type="text" data-cs="title" placeholder="Record a guided intro"></div>
              <div class="admp-f"><label>Owner</label><select data-cs="owner"><option value="partner">partner</option><option value="team">team (us)</option></select></div>
              <div class="admp-f"><label>Act (1 = get ready, 2 = go live)</label><select data-cs="act"><option value="1">1</option><option value="2" selected>2</option></select></div>
              <div class="admp-f"><label>~ Minutes (optional)</label><input type="number" data-cs="minutes" placeholder="10"></div>
            </div>
            <div class="admp-f"><label>Description (optional)</label><input type="text" data-cs="descr" placeholder="What exactly should they do?"></div>
            <label style="display:flex;gap:7px;align-items:center;font:500 12px 'Inter',sans-serif;color:#011624;margin:0 0 10px">
              <input type="checkbox" data-cs="proof"> 🔗 Requires a link as proof to close
            </label>
            <button class="admp-btn line" data-cs-add="${p.id}">Add step</button>
            <span class="admp-msg" data-csmsg></span>
          </div>`;
  }

  // ---- actions ---------------------------------------------------------------------
  async function copyText(text, btn){
    try {
      await navigator.clipboard.writeText(text);
      const t = btn.textContent; btn.textContent = 'Copied ✓';
      setTimeout(() => { btn.textContent = t; }, 1400);
    } catch { alert(text); }
  }

  function bind(){
    const $ = sel => host.querySelector(sel);

    host.querySelector('[data-act="add-open"]')?.addEventListener('click', () => {
      const box = $('#admpAdd'); box.hidden = !box.hidden;
    });

    host.querySelector('[data-act="add-save"]')?.addEventListener('click', async (e) => {
      const email = $('#admpNewMail').value.trim().toLowerCase();
      const name = $('#admpNewName').value.trim();
      const msg = $('#admpAddMsg');
      if(!/.+@.+\..+/.test(email)){ msg.className = 'admp-msg err'; msg.textContent = 'Enter a valid email.'; return; }
      if(!templates.length){
        msg.className = 'admp-msg err';
        msg.textContent = 'Step templates could not be loaded — refresh the page, then try again.';
        return;
      }
      e.target.disabled = true; msg.className = 'admp-msg'; msg.textContent = 'Creating…';
      const { data: created, error } = await supabase.from('partner_onboarding')
        .insert({ email, invite_name: name || null }).select().maybeSingle();
      if(error || !created){
        e.target.disabled = false; msg.className = 'admp-msg err';
        msg.textContent = 'Error: ' + (error?.message || 'could not create');
        return;
      }
      // Instantiate the step checklist from the templates.
      const rows = templates.map(t => ({
        partner_id: created.id, key: t.key, title: t.title, descr: t.descr, owner: t.owner,
        minutes: t.minutes, wait_note: t.wait_note, act: t.act, sort: t.sort, required: t.required,
        needs_proof: !!t.needs_proof,
      }));
      const { error: e2 } = await supabase.from('partner_steps').insert(rows);
      e.target.disabled = false;
      if(e2) alert('Partner created, but the checklist could not be added: ' + e2.message + '\nOpen the partner and add steps manually, or delete and re-create them.');
      await loadAll();
      openId = created.id;
      render();
      // Offer to send the welcome email right away.
      openComposer(created.id, 'welcome');
    });

    host.querySelectorAll('[data-open-editor]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      openId = Number(b.dataset.openEditor); render();
      host.querySelector(`[data-editor="${openId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    host.querySelectorAll('tr[data-open]').forEach(tr => tr.addEventListener('click', (e) => {
      if(e.target.closest('button, select, input, a')) return;
      const id = Number(tr.dataset.open);
      openId = openId === id ? null : id;
      render();
    }));
    host.querySelector('[data-close-editor]')?.addEventListener('click', () => { openId = null; render(); });

    host.querySelectorAll('[data-remind]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      openComposer(Number(b.dataset.remind), 'reminder');
    }));
    host.querySelectorAll('[data-welcome]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      openComposer(Number(b.dataset.welcome), 'welcome');
    }));
    host.querySelectorAll('[data-copylink]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(b.dataset.copylink, b);
    }));

    // save partner fields
    host.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', async () => {
      const id = Number(b.dataset.save);
      const ed = host.querySelector(`[data-editor="${id}"]`);
      const msg = ed.querySelector('[data-savemsg]');
      const val = sel => ed.querySelector(`[data-p="${sel}"]`);
      const num = sel => { const v = val(sel).value.trim(); return v === '' ? null : Number(v); };
      const patch = {
        tier: val('tier').value,
        commission_usd: num('commission_usd'),
        wheel_price_usd: num('wheel_price_usd'),
        wheel_coupon: val('wheel_coupon').value.trim() || null,
        audience_coupon: val('audience_coupon').value.trim() || null,
        affiliate_link: val('affiliate_link').value.trim() || null,
        offer_url: val('offer_url').value.trim() || null,
        shipping_carrier: val('shipping_carrier').value || null,
        tracking_number: val('tracking_number').value.trim() || null,
        delivered: ed.querySelector('[data-p="delivered"]').checked,
        contract_points: val('contract_points_text').value.split('\n').map(s => s.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      };
      b.disabled = true; msg.className = 'admp-msg'; msg.textContent = 'Saving…';

      // Contract PDF upload (if a file was picked)
      const fileIn = ed.querySelector('[data-p-file="contract"]');
      const file = fileIn?.files?.[0];
      if(file){
        const path = `contracts/${id}/contract-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from('partner-files')
          .upload(path, file, { contentType: 'application/pdf', upsert: true });
        if(upErr){ b.disabled = false; msg.className = 'admp-msg err'; msg.textContent = 'PDF upload failed: ' + upErr.message; return; }
        patch.contract_path = path;
      }

      const { error } = await supabase.from('partner_onboarding').update(patch).eq('id', id);
      b.disabled = false;
      if(error){ msg.className = 'admp-msg err'; msg.textContent = 'Error: ' + error.message; return; }
      msg.className = 'admp-msg ok'; msg.textContent = 'Saved ✓';
      await loadAll(); render();
      host.querySelector(`[data-editor="${id}"]`)?.scrollIntoView({ block: 'nearest' });
    }));

    // Step mutations refresh ONLY the steps column — the left column's unsaved
    // deal inputs and picked contract PDF survive.
    if(openId != null) bindStepsCol(openId);
  }

  function refreshStepsCol(pid){
    const col = host.querySelector(`[data-stepscol="${pid}"]`);
    const p = partners.find(x => x.id === pid);
    if(!col || !p) return;
    col.innerHTML = stepsColHtml(p);
    bindStepsCol(pid);
  }

  function bindStepsCol(pid){
    const col = host.querySelector(`[data-stepscol="${pid}"]`);
    if(!col) return;

    col.querySelectorAll('[data-step-status]').forEach(sel => sel.addEventListener('change', async () => {
      const id = Number(sel.dataset.stepStatus);
      const status = sel.value;
      const patch = { status, done_at: status === 'done' ? new Date().toISOString() : null };
      const step = (stepsByPartner.get(pid) || []).find(s => s.id === id);
      // Social-proof gate: a proof step can't be closed — by ANYONE — without the link.
      if(status === 'done' && step && step.needs_proof && !(step.payload && step.payload.proof_url)){
        const typed = (col.querySelector(`[data-proof-in="${id}"]`)?.value || '').trim();
        const u = /^https?:\/\/.+\..+/.test(typed) ? typed
          : (prompt('This step needs a social-proof link (where was it shared?). Paste it:') || '').trim();
        if(!/^https?:\/\/.+\..+/.test(u)){
          alert('Not closed — a valid proof link is required.');
          sel.value = step.status;
          return;
        }
        patch.payload = { ...(step.payload || {}), proof_url: u };
      }
      const { error } = await supabase.from('partner_steps').update(patch).eq('id', id);
      if(error){ alert('Could not save the step: ' + error.message); return; }
      stepsByPartner.set(pid, (stepsByPartner.get(pid) || []).map(s => s.id === id ? { ...s, ...patch } : s));
      refreshStepsCol(pid);
    }));

    col.querySelectorAll('[data-proof-save]').forEach(b => b.addEventListener('click', async () => {
      const id = Number(b.dataset.proofSave);
      const u = (col.querySelector(`[data-proof-in="${id}"]`)?.value || '').trim();
      if(!/^https?:\/\/.+\..+/.test(u)){ alert('Paste a valid link (https://…).'); return; }
      const arr = stepsByPartner.get(pid) || [];
      const step = arr.find(s => s.id === id);
      const payload = { ...((step && step.payload) || {}), proof_url: u };
      const { error } = await supabase.from('partner_steps').update({ payload }).eq('id', id);
      if(error){ alert('Could not save: ' + error.message); return; }
      stepsByPartner.set(pid, arr.map(s => s.id === id ? { ...s, payload } : s));
      refreshStepsCol(pid);
    }));

    col.querySelectorAll('[data-step-del]').forEach(b => b.addEventListener('click', async () => {
      if(!confirm('Remove this custom step?')) return;
      const id = Number(b.dataset.stepDel);
      const { error } = await supabase.from('partner_steps').delete().eq('id', id);
      if(error){ alert('Could not remove the step: ' + error.message); return; }
      stepsByPartner.set(pid, (stepsByPartner.get(pid) || []).filter(s => s.id !== id));
      refreshStepsCol(pid);
    }));

    col.querySelectorAll('[data-cs-add]').forEach(b => b.addEventListener('click', async () => {
      const msg = col.querySelector('[data-csmsg]');
      const cs = sel => col.querySelector(`[data-cs="${sel}"]`);
      const title = cs('title').value.trim();
      if(!title){ msg.className = 'admp-msg err'; msg.textContent = 'Give the step a title.'; return; }
      const steps = stepsByPartner.get(pid) || [];
      const act = Number(cs('act').value);
      const maxSort = steps.filter(s => s.act === act).reduce((m, s) => Math.max(m, s.sort), act * 100);
      const minutes = cs('minutes').value.trim();
      const { data: ins, error } = await supabase.from('partner_steps').insert({
        partner_id: pid,
        key: 'custom-' + Date.now().toString(36),
        title, descr: cs('descr').value.trim() || null,
        owner: cs('owner').value, act, sort: maxSort + 5,
        minutes: minutes === '' ? null : Number(minutes),
        required: true, is_custom: true,
        needs_proof: !!col.querySelector('[data-cs="proof"]')?.checked,
      }).select().maybeSingle();
      if(error){ msg.className = 'admp-msg err'; msg.textContent = 'Error: ' + error.message; return; }
      const row = Array.isArray(ins) ? ins[0] : ins;
      if(row){ steps.push(row); steps.sort((a, b) => a.sort - b.sort); stepsByPartner.set(pid, steps); }
      refreshStepsCol(pid);
    }));
  }

  (async () => {
    host.innerHTML = '<p style="color:#99a2a7;font:400 14px Inter,sans-serif">Loading partners…</p>';
    await loadAll();
    render();
  })();

  return () => { closeComposer(); };
}
