// view-partner-onboarding.js — the Spiritual Maker PARTNER HUB (#/onboarding).
// A guided launch journey for invited influencer partners: info guides → details →
// agreement → wheel offer → (our side: affiliate + shipping) → wheel photos →
// socials → unboxing video → first session → announce. Steps live in DB
// (partner_steps, instantiated from partner_step_templates), so admins can add,
// skip or customize steps per partner without code changes.
//
// Access: the partner_onboarding row is matched to the logged-in user by email via
// the claim_partner_onboarding() RPC (idempotent). No partner row → friendly
// "not part of the program" state. All styling is injected (#pobStyles, .pob-*).
import * as auth from './auth.js';
import { supabase } from './db.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const escAttr = esc;

// Public marketing PDFs — uploaded once to the public `partner-assets` bucket.
const ASSET_BASE = 'https://lhyychkrcrndjptptkii.supabase.co/storage/v1/object/public/partner-assets/';
const GUIDES = [
  { file: 'spiritual-maker-showcase.pdf', title: 'Spiritual Maker Showcase', blurb: 'What EWR Live is — and what you can do with it.' },
  { file: 'egely-history.pdf',            title: 'Egely History',            blurb: '30 years of the Egely Wheel story.' },
  { file: 'guide-book.pdf',               title: 'Guide Book — Egely Wheel', blurb: 'A short practical guide to your device.' },
];

const TIERS = {
  advocate:   { name: 'Advocate',   usd: 50,  icon: 'assets/tiers/advocate.png' },
  pro:        { name: 'Pro',        usd: 70,  icon: 'assets/tiers/pro.png' },
  ambassador: { name: 'Ambassador', usd: 100, icon: 'assets/tiers/ambassador.png' },
};

const CARRIERS = {
  fedex: { name: 'FedEx', url: n => 'https://www.fedex.com/fedextrack/?trknbr=' + encodeURIComponent(n) },
  usps:  { name: 'USPS',  url: n => 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + encodeURIComponent(n) },
  ups:   { name: 'UPS',   url: n => 'https://www.ups.com/track?tracknum=' + encodeURIComponent(n) },
  other: { name: 'Carrier', url: () => null },
};

function styles(){
  if(document.getElementById('pobStyles')) return;
  const el = document.createElement('style');
  el.id = 'pobStyles';
  el.textContent = `
  .pob{max-width:1140px;margin:0 auto;padding:6px 0 40px;font-family:'Inter',sans-serif;color:#011624}
  .pob a{color:#401d91}
  .pob-hero{display:flex;gap:30px;align-items:center;margin-bottom:14px}
  .pob-hero-l{flex:1;min-width:0}
  .pob-smrow{display:flex;align-items:center;gap:14px;margin-bottom:6px;flex-wrap:wrap}
  .pob-smrow img{height:48px;display:block}
  .pob-pp{font:600 10.5px 'Montserrat',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#9a7400;
    background:rgba(245,183,0,.16);border:1px solid rgba(154,116,0,.25);border-radius:999px;padding:4px 11px}
  .pob-hero h1{font:700 29px 'Montserrat',sans-serif;letter-spacing:-0.01em;margin:10px 0 7px;color:#011624}
  .pob-sub{color:#67737c;font-size:15px;max-width:56ch;line-height:1.55}
  .pob-sub b{color:#011624}
  .pob-acts{display:flex;align-items:center;margin-top:20px}
  .pob-act{display:flex;align-items:center;gap:9px;padding:8px 16px;border-radius:999px;
    font:600 12px 'Montserrat',sans-serif;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
  .pob-act .n{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px}
  .pob-act.on{background:#401d91;color:#fff;box-shadow:0 16px 40px rgba(82,48,218,.18)}
  .pob-act.on .n{background:rgba(255,255,255,.22);color:#fff}
  .pob-act.next{border:1.5px solid #dfe3e6;color:#011624}
  .pob-act.next .n{background:#f2f3f4;color:#67737c}
  .pob-act.later{color:#99a2a7}
  .pob-act.later .n{background:#f2f3f4;color:#99a2a7}
  .pob-actline{width:24px;height:2px;background:#dfe3e6;flex:none}
  .pob-act small{font:500 11px 'Inter',sans-serif;letter-spacing:0;text-transform:none;opacity:.75}
  .pob-ringbox{display:flex;flex-direction:column;align-items:center;gap:8px;flex:none}
  .pob-ring{position:relative;width:128px;height:128px}
  .pob-ring svg{transform:rotate(-90deg);display:block}
  .pob-ring .pct{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .pob-ring .pct b{font:700 28px 'Montserrat',sans-serif;color:#011624}
  .pob-ring .pct span{font:600 9.5px 'Montserrat',sans-serif;letter-spacing:.14em;color:#67737c;text-transform:uppercase}
  .pob-time{display:inline-flex;align-items:center;gap:7px;background:#f2f3f4;border:1px solid #dfe3e6;
    border-radius:999px;padding:6px 13px;font:600 12px 'Inter',sans-serif;color:#011624}
  .pob-cols{display:grid;grid-template-columns:1fr 350px;gap:24px;margin-top:20px;align-items:start}
  /* navy next-step anchor */
  .pob-next{background:#011624;border:1px solid #1f323e;border-radius:18px;padding:24px 26px;color:#dbe2e6;
    box-shadow:0 14px 36px -16px rgba(1,22,36,.5);position:relative;overflow:hidden;margin-bottom:8px}
  .pob-next:before{content:"";position:absolute;top:-70px;right:-70px;width:220px;height:220px;border-radius:50%;
    background:radial-gradient(circle,rgba(55,219,255,.16),transparent 68%)}
  .pob-next-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .pob-nextlabel{font:700 11px 'Montserrat',sans-serif;letter-spacing:.18em;text-transform:uppercase;
    background:linear-gradient(135deg,#37dbff,#8f7bff);-webkit-background-clip:text;background-clip:text;color:transparent}
  .pob-chip{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 11px;font:600 11px 'Inter',sans-serif;white-space:nowrap}
  .pob-chip.you{background:rgba(82,48,218,.12);color:#401d91;border:1px solid rgba(82,48,218,.28)}
  .pob-chip.us{background:#f2f3f4;color:#67737c;border:1px solid #dfe3e6}
  .pob-chip.time{background:#f2f3f4;color:#011624;border:1px solid #dfe3e6}
  .pob-next .pob-chip.you{background:rgba(255,255,255,.1);color:#cfe6ff;border-color:rgba(255,255,255,.22)}
  .pob-next .pob-chip.time{background:rgba(255,255,255,.08);color:#dbe2e6;border-color:rgba(255,255,255,.16)}
  .pob-next h2{color:#fff;font:700 21px 'Montserrat',sans-serif;margin:12px 0 7px}
  .pob-next p{font-size:14px;line-height:1.55;max-width:58ch;margin:0}
  .pob-next .go{display:inline-block;margin-top:16px;background:linear-gradient(135deg,#37dbff,#5230da);color:#fff;border:none;
    border-radius:999px;padding:12px 24px;font:700 12.5px 'Montserrat',sans-serif;letter-spacing:.06em;text-transform:uppercase;
    box-shadow:0 16px 40px rgba(82,48,218,.18);cursor:pointer;text-decoration:none}
  /* act headers + steps */
  .pob-acth{display:flex;align-items:center;gap:12px;margin:26px 0 12px}
  .pob-acth h3{font:600 12.5px 'Montserrat',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#67737c;margin:0}
  .pob-acth .rule{flex:1;height:2px;background:linear-gradient(90deg,#dfe3e6,transparent)}
  .pob-acth .cnt{font:600 12px 'Inter',sans-serif;color:#99a2a7}
  .pob-step{background:#fff;border:1px solid #dfe3e6;border-radius:14px;margin-bottom:10px;
    box-shadow:0 4px 14px rgba(1,22,36,.04);overflow:hidden}
  .pob-step.doing{border:1.6px solid #5230da;box-shadow:0 10px 28px rgba(82,48,218,.14)}
  .pob-srow{display:grid;grid-template-columns:34px 1fr auto;gap:14px;align-items:center;padding:14px 18px;cursor:pointer}
  .pob-srow .ic{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px}
  .pob-step.done .ic{background:rgba(32,178,107,.14);color:#0f8a52}
  .pob-step.doing .ic{background:linear-gradient(135deg,#37dbff,#5230da);color:#fff}
  .pob-step.wait .ic{background:rgba(245,183,0,.16);color:#b8860b}
  .pob-step.todo .ic{background:#f2f3f4;color:#99a2a7}
  .pob-srow .t b{display:block;font:600 14.5px 'Inter',sans-serif;color:#011624}
  .pob-srow .t span{font:400 12.5px 'Inter',sans-serif;color:#67737c}
  .pob-step.done .t b{color:#67737c}
  .pob-srow .chips{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
  .pob-srow .mini{font:600 12px 'Inter',sans-serif;color:#401d91;white-space:nowrap}
  .pob-pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:#b8860b;animation:pobBlink 1.6s infinite}
  @keyframes pobBlink{50%{opacity:.25}}
  .pob-sbody{border-top:1px dashed #dfe3e6;padding:16px 18px;background:#fbfbfc}
  .pob-sbody[hidden]{display:none}
  .pob-note{font:400 13px 'Inter',sans-serif;color:#67737c;line-height:1.55}
  .pob-field{margin:10px 0}
  .pob-field label{display:block;font:600 12px 'Montserrat',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#67737c;margin-bottom:6px}
  .pob-field input[type=text],.pob-field input[type=url],.pob-field textarea{width:100%;box-sizing:border-box;background:#fff;
    border:1px solid #dfe3e6;border-radius:10px;color:#011624;font:400 14.5px 'Inter',sans-serif;padding:11px 13px}
  .pob-field textarea{min-height:84px;resize:vertical}
  .pob-field input:focus,.pob-field textarea:focus{outline:none;border-color:#5230da;box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .pob-lockmail{display:flex;align-items:center;gap:9px;background:#f2f3f4;border:1px solid #dfe3e6;border-radius:10px;
    padding:11px 13px;font:500 14px 'Inter',sans-serif;color:#67737c}
  .pob-lockmail .ok{color:#0f8a52;font-weight:700}
  .pob-btn{background:#401d91;color:#fff;border:none;border-radius:999px;padding:11px 22px;
    font:700 12px 'Montserrat',sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
  .pob-btn:hover{background:#011624}
  .pob-btn:disabled{opacity:.6;cursor:default}
  .pob-btn.ghost{background:#fff;color:#011624;border:1px solid #dfe3e6}
  .pob-btn.ghost:hover{background:#f7f8f8;color:#011624}
  .pob-msg{display:inline-block;margin-left:12px;font:500 13px 'Inter',sans-serif;color:#67737c}
  .pob-msg.ok{color:#0f8a52}.pob-msg.err{color:#c2415b}
  .pob-guides{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
  .pob-guide{background:#fff;border:1px solid #dfe3e6;border-radius:12px;padding:14px;text-decoration:none;display:block}
  .pob-guide:hover{border-color:#5230da}
  .pob-guide .gi{font-size:20px}
  .pob-guide b{display:block;font:600 13.5px 'Inter',sans-serif;color:#011624;margin:8px 0 3px}
  .pob-guide span{font:400 12px 'Inter',sans-serif;color:#67737c;line-height:1.45;display:block}
  .pob-guide .open{display:inline-block;margin-top:9px;font:600 12px 'Inter',sans-serif;color:#401d91}
  .pob-points{list-style:none;margin:12px 0;padding:0;display:flex;flex-direction:column;gap:8px}
  .pob-points li{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid #dfe3e6;border-radius:10px;
    padding:10px 13px;font:500 13.5px 'Inter',sans-serif;color:#011624}
  .pob-points li:before{content:"✓";color:#0f8a52;font-weight:700}
  .pob-sign{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}
  .pob-sign input[type=text]{flex:1;min-width:180px;background:#fff;border:1px solid #dfe3e6;border-radius:10px;
    color:#011624;font:400 14.5px 'Inter',sans-serif;padding:11px 13px}
  .pob-agreecheck{display:flex;gap:9px;align-items:flex-start;margin-top:10px;font:400 13px 'Inter',sans-serif;color:#67737c}
  .pob-offer{display:flex;gap:16px;align-items:center;background:#fff;border:1px solid #dfe3e6;border-radius:12px;padding:14px}
  .pob-offer img{height:92px;object-fit:contain}
  .pob-offer .big{font:700 20px 'Montserrat',sans-serif;color:#0f8a52}
  .pob-code{font:600 12.5px ui-monospace,Consolas,monospace;background:#f2f3f4;border:1px solid #dfe3e6;border-radius:8px;
    padding:4px 10px;color:#401d91;cursor:pointer}
  .pob-ship{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #dfe3e6;border-radius:12px;padding:14px;
    font:500 14px 'Inter',sans-serif;color:#011624;flex-wrap:wrap}
  .pob-shots{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
  .pob-shot{width:92px;height:92px;border-radius:12px;background-size:cover;background-position:center;border:1px solid #dfe3e6;position:relative}
  .pob-shot .use{position:absolute;left:0;right:0;bottom:0;background:rgba(1,22,36,.72);color:#fff;border:none;font:600 9.5px 'Inter',sans-serif;
    padding:4px 2px;cursor:pointer;border-radius:0 0 11px 11px}
  .pob-shot.chosen{outline:2.5px solid #f5b700}
  .pob-shot.addbox{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    border:1.6px dashed #b9c2c8;background:#fff;color:#67737c;font:600 11px 'Inter',sans-serif;cursor:pointer}
  .pob-shot.addbox b{font-size:20px;font-weight:600;line-height:1;color:#401d91}
  /* rail */
  .pob-rail{display:flex;flex-direction:column;gap:18px}
  .pob-card{background:#fff;border:1px solid #dfe3e6;border-radius:16px;box-shadow:0 10px 28px rgba(1,22,36,.08);overflow:hidden}
  .pob-card .pad{padding:18px 20px}
  .pob-card h4{font:600 11.5px 'Montserrat',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#67737c;margin:0 0 12px}
  .pob-prod{background:#f7f8f8;border-bottom:1px solid #dfe3e6;display:flex;align-items:center;justify-content:center;padding:8px}
  .pob-prod img{height:118px;object-fit:contain}
  .pob-deal{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed #dfe3e6;
    font:500 13px 'Inter',sans-serif;color:#67737c;gap:10px}
  .pob-deal:last-of-type{border-bottom:none}
  .pob-deal b{font:700 14px 'Montserrat',sans-serif;color:#011624}
  .pob-deal b.free{color:#0f8a52}
  .pob-ladder{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
  .pob-rung{border:1px solid #dfe3e6;border-radius:12px;padding:9px 5px 8px;text-align:center;position:relative}
  .pob-rung img{height:36px;object-fit:contain;margin-bottom:4px}
  .pob-rung .nm{font:600 9.5px 'Montserrat',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#67737c}
  .pob-rung .cm{font:700 12.5px 'Montserrat',sans-serif;color:#011624}
  .pob-rung.you{border:1.6px solid #d9b64a;background:rgba(245,183,0,.16)}
  .pob-rung.you:after{content:"YOU";position:absolute;top:-9px;left:50%;transform:translateX(-50%);
    background:#d9a514;color:#fff;font:700 8.5px 'Montserrat',sans-serif;letter-spacing:.1em;padding:2px 8px;border-radius:999px}
  .pob-rung.dim{opacity:.55}
  .pob-rung.dim img{filter:grayscale(1)}
  .pob-fine{margin-top:12px;font:400 11.5px 'Inter',sans-serif;color:#99a2a7;line-height:1.5}
  .pob-link{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px dashed #dfe3e6}
  .pob-link:last-of-type{border-bottom:none}
  .pob-link .ll{flex:1;min-width:0}
  .pob-link .ll b{display:block;font:600 13px 'Inter',sans-serif;color:#011624}
  .pob-link .ll span{display:block;font:400 11px 'Inter',sans-serif;color:#99a2a7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pob-btn.sm{padding:7px 14px;font-size:10.5px;flex:none}
  .pob-mgr{display:flex;align-items:center;gap:11px}
  .pob-mgr .av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#37dbff,#5230da);color:#fff;
    display:flex;align-items:center;justify-content:center;font:600 16px 'Montserrat',sans-serif;flex:none}
  .pob-mgr b{display:block;font:600 14px 'Inter',sans-serif;color:#011624}
  .pob-mgr span{font:600 10px 'Montserrat',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#9a7400}
  .pob-assist{display:flex;gap:9px;align-items:flex-start;font:400 12px 'Inter',sans-serif;color:#67737c;line-height:1.5;padding:0 4px}
  .pob-assist .ai{flex:none;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#37dbff,#5230da);
    display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff}
  .pob-tease{display:flex;align-items:center;gap:12px;background:rgba(82,48,218,.08);border:1px solid rgba(82,48,218,.18);
    border-radius:14px;padding:15px 18px;font:500 13px 'Inter',sans-serif;color:#401d91}
  .pob-empty{max-width:560px;margin:40px auto;background:#fff;border:1px solid #dfe3e6;border-radius:16px;
    box-shadow:0 10px 28px rgba(1,22,36,.08);padding:30px;text-align:center}
  .pob-empty h2{font:700 20px 'Montserrat',sans-serif;color:#011624;margin:12px 0 8px}
  .pob-empty p{color:#67737c;font-size:14px;line-height:1.6}
  @media (max-width:760px){
    .pob-hero{flex-direction:column;align-items:flex-start;gap:16px}
    .pob-ringbox{flex-direction:row;gap:14px}
    .pob-ring{width:92px;height:92px}
    .pob-ring svg{width:92px;height:92px}
    .pob-ring .pct b{font-size:21px}
    .pob-acts{flex-wrap:wrap;gap:8px}
    .pob-actline{display:none}
    .pob-cols{grid-template-columns:1fr;gap:18px}
    .pob-hero h1{font-size:23px}
    .pob-guides{grid-template-columns:1fr}
    .pob-srow{grid-template-columns:30px 1fr;padding:13px 14px}
    .pob-srow .chips{grid-column:2;justify-content:flex-start;margin-top:4px}
  }`;
  document.head.appendChild(el);
}

const fmtDate = iso => { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return ''; } };
const fmtMin = m => { if(m == null) return ''; if(m < 60) return `~${m} min`; const h = Math.round(m / 60); return `~${h} hour${h > 1 ? 's' : ''}`; };

export function mount(el){
  styles();
  let partner = null, steps = [], destroyed = false, openKey = null;
  let loading = false;     // load() in flight — render a loading card, never a false empty state
  let firstEvent = null;   // auto-detected first session/race

  function stepBy(key){ return steps.find(s => s.key === key) || null; }

  // ---- data ------------------------------------------------------------------
  async function load(a){
    const { data: pid, error } = await supabase.rpc('claim_partner_onboarding');
    if(error || !pid){ partner = null; steps = []; return; }
    const [{ data: p }, { data: st }] = await Promise.all([
      supabase.from('partner_onboarding').select('*').eq('id', pid).maybeSingle(),
      supabase.from('partner_steps').select('*').eq('partner_id', pid).order('sort', { ascending: true }),
    ]);
    partner = p || null;
    steps = st || [];
    // Auto-detect the first hosted event (session or race) — ticks the step by itself.
    // Date floor = the invite date, so pre-partnership events don't count.
    const fe = stepBy('first_event');
    if(fe && a.user && partner){
      const { data: ev, error: evErr } = await supabase.from('sessions')
        .select('id,name,event_type,scheduled_start')
        .eq('created_by_user_id', a.user.id)
        .gte('scheduled_start', partner.created_at)
        .order('scheduled_start', { ascending: true }).limit(1).maybeSingle();
      if(evErr) console.warn('first-event check failed:', evErr.message);
      firstEvent = ev || null;
      if(ev && fe.status !== 'done'){
        await setStep('first_event', { status: 'done', payload: { ...fe.payload, session_id: ev.id, title: ev.name } }, false);
      }
    }
  }

  async function setStep(key, patch, rerender = true){
    const s = stepBy(key);
    if(!s) return { error: { message: 'missing step' } };
    const row = { ...patch };
    if(patch.status === 'done' && !s.done_at) row.done_at = new Date().toISOString();
    const { data, error } = await supabase.from('partner_steps').update(row).eq('id', s.id).select().maybeSingle();
    if(!error && data){ steps = steps.map(x => x.id === data.id ? data : x); if(rerender) render(auth.getState()); }
    return { error };
  }

  // ---- derived ---------------------------------------------------------------
  function requiredSteps(){ return steps.filter(s => s.required && s.status !== 'skipped'); }
  function doneCount(list){ return list.filter(s => s.status === 'done').length; }
  function agreementDone(){
    const ag = stepBy('agreement');
    return !ag || ag.status === 'done' || ag.status === 'skipped';
  }
  // The offer is only actionable when the deal is complete enough to redeem:
  // a price AND a way to redeem it (coupon or a direct offer link).
  function offerReady(){
    return !!partner && partner.wheel_price_usd != null && !!(partner.wheel_coupon || partner.offer_url);
  }
  function stepState(s){
    if(s.status === 'done') return 'done';
    if(s.status === 'waiting' || s.owner === 'team') return 'wait';
    // partner steps that depend on admin data / real-world state wait until ready
    if(s.key === 'agreement' && !partner?.contract_path) return 'wait';
    if(s.key === 'offer' && (!offerReady() || !agreementDone())) return 'wait';
    if((s.key === 'photos' || s.key === 'unboxing') && !partner?.delivered) return 'wait';
    return 'todo';
  }
  function waitNote(s){
    if(s.owner === 'team' || s.status === 'waiting') return '🛠 OUR SIDE' + (s.wait_note ? ' · ' + esc(s.wait_note) : '');
    if(s.key === 'agreement') return '🛠 OUR SIDE · being prepared';
    if(s.key === 'offer') return agreementDone() ? '🛠 OUR SIDE · being prepared' : '⏳ after your agreement';
    if(s.key === 'photos' || s.key === 'unboxing') return '⏳ once your wheel arrives';
    return '🛠 OUR SIDE';
  }
  function nextStep(){
    return steps.find(s => s.status !== 'done' && s.status !== 'skipped' && stepState(s) === 'todo') || null;
  }
  function minutesLeft(){
    return steps.filter(s => s.status !== 'done' && s.status !== 'skipped' && s.owner === 'partner')
      .reduce((sum, s) => sum + (s.minutes || 0), 0);
  }

  // ---- step bodies -----------------------------------------------------------
  function guidesBody(s){
    const opened = (s.payload && s.payload.opened) || {};
    return `
      <div class="pob-note">Three short reads that make you fluent in the Egely world — what the wheel measures, the 30-year story, and what your audience gets on EWR Live.</div>
      <div class="pob-guides">${GUIDES.map((g, i) => `
        <a class="pob-guide" href="${ASSET_BASE + g.file}" target="_blank" rel="noopener" data-guide="${i}">
          <span class="gi">📕</span><b>${esc(g.title)}</b><span>${esc(g.blurb)}</span>
          <span class="open">${opened[i] ? 'Opened ✓' : 'Open PDF →'}</span>
        </a>`).join('')}
      </div>
      ${s.status === 'done' ? '' : `<button class="pob-btn" data-act="guides-done">I've read these</button><span class="pob-msg" data-msg></span>`}`;
  }

  function detailsBody(s, a){
    return `
      <div class="pob-field"><label>Email</label>
        <div class="pob-lockmail"><span class="ok">✓</span> ${esc(a.email || '')} <span style="margin-left:auto;font-size:11.5px;color:#99a2a7">verified with your account</span></div>
      </div>
      <div class="pob-field"><label>Your name</label><input type="text" data-f="name" value="${escAttr(a.displayName || '')}" placeholder="How your audience knows you"></div>
      <div class="pob-field"><label>Short intro</label><textarea data-f="bio" placeholder="1–3 sentences about you and your practice — this appears on your Spiritual Maker profile.">${esc(a.bio || '')}</textarea></div>
      <button class="pob-btn" data-act="details-save">Save details</button><span class="pob-msg" data-msg></span>`;
  }

  async function contractUrl(){
    if(!partner?.contract_path) return null;
    const { data } = await supabase.storage.from('partner-files').createSignedUrl(partner.contract_path, 3600);
    return data?.signedUrl || null;
  }

  function agreementBody(s){
    if(!partner?.contract_path){
      return `<div class="pob-note">🛠 <b>We're on it</b> — Krisztián is preparing your agreement. You'll see it here (and get an email) the moment it's ready.</div>`;
    }
    const pts = Array.isArray(partner.contract_points) ? partner.contract_points : [];
    if(s.status === 'done'){
      const sig = s.payload || {};
      return `
        <div class="pob-note">Signed by <b>${esc(sig.signed_name || '')}</b> on ${esc(fmtDate(sig.signed_at))}.</div>
        ${pts.length ? `<ul class="pob-points">${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
        <button class="pob-btn ghost" data-act="agreement-view">View the agreement (PDF)</button>`;
    }
    return `
      <div class="pob-note">Your partnership agreement — the key commitments at a glance:</div>
      ${pts.length ? `<ul class="pob-points">${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      <button class="pob-btn ghost" data-act="agreement-view">Read the full agreement (PDF)</button>
      <label class="pob-agreecheck"><input type="checkbox" data-f="agree"> I've read the agreement and I accept its terms.</label>
      <div class="pob-sign">
        <input type="text" data-f="signname" placeholder="Type your full name to sign">
        <button class="pob-btn" data-act="agreement-sign">Sign</button><span class="pob-msg" data-msg></span>
      </div>`;
  }

  function offerBody(s){
    if(!offerReady()){
      return `<div class="pob-note">🛠 <b>We're on it</b> — Krisztián is preparing your Egely Wheel offer. It shows up here as soon as it's set.</div>`;
    }
    if(!agreementDone()){
      return `<div class="pob-note">⏳ One step first — <b>sign your agreement above</b>, then claim your wheel here.</div>`;
    }
    const free = Number(partner.wheel_price_usd) === 0;
    const url = partner.offer_url || 'https://egelywheel.com';
    return `
      <div class="pob-offer">
        <img src="assets/ewr-access-product-card.png" alt="Egely Wheel">
        <div>
          <div class="big">${free ? 'Free' : '$' + Number(partner.wheel_price_usd)}</div>
          <div class="pob-note">Your Egely Wheel${partner.wheel_coupon ? ` — use coupon <span class="pob-code" data-copy="${escAttr(partner.wheel_coupon)}">${esc(partner.wheel_coupon)}</span> at checkout` : ''}.</div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <a class="pob-btn" style="text-decoration:none" href="${escAttr(url)}" target="_blank" rel="noopener" data-act="offer-open">Claim your wheel →</a>
        ${s.status === 'done' ? '' : `<button class="pob-btn ghost" data-act="offer-done">I've ordered it ✓</button>`}
        <span class="pob-msg" data-msg></span>
      </div>`;
  }

  function affiliateBody(s){
    const has = partner?.audience_coupon || partner?.affiliate_link;
    if(!has) return `<div class="pob-note">🛠 <b>We're on it</b> — we're setting up your UpPromote affiliate account, coupon and link. Usually 1–2 business days.</div>`;
    return `
      <div class="pob-note">Your money-making toolkit — share these anywhere:</div>
      ${partner.audience_coupon ? `<div class="pob-deal"><span>Coupon for your audience</span><span class="pob-code" data-copy="${escAttr(partner.audience_coupon)}">${esc(partner.audience_coupon)} ⧉</span></div>` : ''}
      ${partner.affiliate_link ? `<div class="pob-deal"><span>Your affiliate link</span><span class="pob-code" data-copy="${escAttr(partner.affiliate_link)}" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(partner.affiliate_link)} ⧉</span></div>` : ''}
      <div class="pob-note" style="margin-top:10px">💰 One thing on your side: set your <b>PayPal payout email</b> in UpPromote so commissions can reach you.</div>`;
  }

  function shippingBody(s){
    if(!partner?.tracking_number) return `<div class="pob-note">🛠 <b>We're on it</b> — your wheel ships as soon as your order lands. Tracking appears here.</div>`;
    const c = CARRIERS[partner.shipping_carrier] || CARRIERS.other;
    const link = c.url(partner.tracking_number);
    return `
      <div class="pob-ship">
        <b>${esc(c.name)}</b><span>${esc(partner.tracking_number)}</span>
        ${partner.delivered ? '<span style="color:#0f8a52;font-weight:700">Delivered ✓</span>' : ''}
        ${link ? `<a class="pob-btn ghost" style="text-decoration:none;margin-left:auto" href="${escAttr(link)}" target="_blank" rel="noopener">Track your package →</a>` : ''}
      </div>`;
  }

  function photosBody(s){
    const photos = (s.payload && s.payload.photos) || [];
    const a = auth.getState();
    return `
      <div class="pob-note">Upload a few photos of yourself holding your Egely Wheel — natural light works best. Pick your favorite for your public Maker profile (you can change it any time).</div>
      <div class="pob-shots">
        ${photos.map((u, i) => `
          <div class="pob-shot ${a.wheelPhotoUrl && u.split('?')[0] === String(a.wheelPhotoUrl).split('?')[0] ? 'chosen' : ''}" style="background-image:url('${escAttr(u)}')">
            <button class="use" data-act="photo-use" data-i="${i}">Use on profile</button>
          </div>`).join('')}
        <div class="pob-shot addbox" data-act="photo-add"><b>+</b> Add photo</div>
      </div>
      <input type="file" accept="image/*" multiple hidden data-f="photofile">
      <span class="pob-msg" data-msg></span>`;
  }

  function socialsBody(s, a){
    const f = (label, key, val, ph) => `
      <div class="pob-field"><label>${label}</label><input type="url" data-f="${key}" value="${escAttr(val || '')}" placeholder="${ph}"></div>`;
    return `
      <div class="pob-note">These appear on your Spiritual Maker profile and connect page.</div>
      ${f('Instagram', 'instagram_url', a.instagram, 'https://instagram.com/you')}
      ${f('TikTok', 'tiktok_url', a.tiktok, 'https://tiktok.com/@you')}
      ${f('YouTube', 'youtube_url', a.youtube, 'https://youtube.com/@you')}
      ${f('Facebook', 'facebook_url', a.facebook, 'https://facebook.com/you')}
      <button class="pob-btn" data-act="socials-save">Save links</button><span class="pob-msg" data-msg></span>`;
  }

  // Shared "social proof" widget — steps with needs_proof can ONLY be closed with
  // the link to the actual post. This is how we collect proof of real work.
  function proofBody(s, intro, ph){
    const url = s.payload && s.payload.proof_url;
    if(s.status === 'done' && url){
      return `<div class="pob-note">Shared ✓ — <a href="${escAttr(url)}" target="_blank" rel="noopener">view your post ↗</a></div>`;
    }
    return `
      ${intro}
      <div class="pob-field"><label>Link to your post</label><input type="url" data-f="proofurl" value="${escAttr(url || '')}" placeholder="${escAttr(ph)}"></div>
      <div class="pob-note" style="font-size:12px">The link is required to complete this step — it's how your work gets seen (and celebrated). 🙌</div>
      <button class="pob-btn" data-act="proof-save">Save link</button><span class="pob-msg" data-msg></span>`;
  }

  function unboxingBody(s){
    return proofBody(s, `<div class="pob-note">Film the moment you open the box — your audience loves the first reaction. Post it anywhere (YouTube, Instagram, TikTok), then paste the link to the post here.</div>`, 'https://…');
  }

  function shareVideoBody(s){
    return proofBody(s, `<div class="pob-note">After your event, open its results page and hit <b>“Share as a video”</b> — we render a ready-to-post replay video (TikTok/Reels 9:16 or YouTube 16:9). Post it, then paste the link below.</div>
      <div style="margin:10px 0"><a class="pob-btn ghost" style="text-decoration:none" href="#/my-sessions">Open my events →</a></div>`, 'https://…');
  }

  function makerPageBody(s, a){
    const link = a.practitionerHandle ? `#/connect/${a.practitionerHandle}` : null;
    if(s.status === 'done'){
      return `<div class="pob-note">Your public Spiritual Maker page is live ✓${link ? ` — <a href="${escAttr(link)}">see it here →</a>` : ''}. This is where your audience lands.</div>`;
    }
    return `<div class="pob-note">🛠 <b>We're on it</b> — once your photos, intro and links are in, we assemble your public Spiritual Maker page${link ? ` (<a href="${escAttr(link)}">preview →</a>)` : ''} and polish it with you.</div>`;
  }

  function firstEventBody(s){
    if(s.status === 'done'){
      const t = (s.payload && s.payload.title) || (firstEvent && firstEvent.title) || 'Your event';
      return `<div class="pob-note">Done — <b>“${esc(t)}”</b> is on the calendar. This ticked itself the moment you created it. 🎉</div>`;
    }
    return `
      <div class="pob-note">Schedule your first live event — a guided <b>Session</b> (you lead, everyone measures together) or a <b>Race</b> (a live vitality competition). This step completes automatically when you create one.</div>
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <a class="pob-btn" style="text-decoration:none" href="#/sessions/new">Create a Session →</a>
        <a class="pob-btn ghost" style="text-decoration:none" href="#/races/new">Create a Race →</a>
      </div>`;
  }

  function announceBody(s){
    return proofBody(s, `<div class="pob-note">Open your upcoming event's practice room <b>before it starts</b> — as an approved Spiritual Maker you'll find your <b>promo toolkit</b> there: a branded announcement image with your face, one click. Post it, then paste the link to your post below.</div>
      <div style="margin:10px 0"><a class="pob-btn ghost" style="text-decoration:none" href="#/my-sessions">Open my events →</a></div>`, 'https://instagram.com/p/…');
  }

  function customBody(s){
    // Admin-defined custom steps: free-text description; proof-required customs
    // get the same link-gate as announce/unboxing/share_video.
    if(s.needs_proof && s.owner !== 'team'){
      return proofBody(s, s.descr ? `<div class="pob-note">${esc(s.descr)}</div>` : '', 'https://…');
    }
    return `
      ${s.descr ? `<div class="pob-note">${esc(s.descr)}</div>` : ''}
      ${s.status === 'done' || s.owner === 'team' ? '' : `<div style="margin-top:10px"><button class="pob-btn" data-act="custom-done">Done ✓</button><span class="pob-msg" data-msg></span></div>`}`;
  }

  function stepBody(s, a){
    switch(s.key){
      case 'guides': return guidesBody(s);
      case 'details': return detailsBody(s, a);
      case 'agreement': return agreementBody(s);
      case 'offer': return offerBody(s);
      case 'affiliate': return affiliateBody(s);
      case 'shipping': return shippingBody(s);
      case 'photos': return photosBody(s);
      case 'socials': return socialsBody(s, a);
      case 'unboxing': return unboxingBody(s);
      case 'first_event': return firstEventBody(s);
      case 'announce': return announceBody(s);
      case 'share_video': return shareVideoBody(s);
      case 'maker_page': return makerPageBody(s, a);
      default: return customBody(s);
    }
  }

  // ---- next-step card copy per key --------------------------------------------
  const NEXT_COPY = {
    guides:    { t: 'Get to know us 📕', p: 'Three short guides — the Showcase, 30 years of Egely history, and your wheel guide. Read them and you can talk about this like a pro.' },
    details:   { t: 'Introduce yourself ✍️', p: 'Your name and a short intro — this becomes the heart of your public Spiritual Maker profile.' },
    agreement: { t: 'Sign your agreement 📝', p: 'The key commitments are summarized right on the page — read the PDF, type your name, done.' },
    offer:     { t: 'Claim your Egely Wheel 🎁', p: 'Your personal offer is ready — grab your wheel with your coupon and we ship it straight away.' },
    photos:    { t: 'Show us your wheel 📸', p: 'Your wheel is home! Upload a few photos of yourself holding it — the best one becomes your Maker profile photo.' },
    socials:   { t: 'Link your socials 🔗', p: 'Instagram, TikTok, YouTube — so your audience finds you from your Maker profile.' },
    unboxing:  { t: 'Film your unboxing 🎬', p: 'The first reaction is content gold. Post it anywhere and paste the link to your post here.' },
    first_event: { t: 'Schedule your first event 🗓️', p: 'A guided Session or a live Race — this is where your audience meets you live. It ticks itself when you create one.' },
    announce:  { t: 'Announce it 📣', p: 'One click in your practice room generates a branded promo image with your face — post it and paste the link.' },
    share_video: { t: 'Share your replay video 🎬', p: 'Your event becomes a ready-to-post video with one click — post it and paste the link. This is the full content round done.' },
  };

  // ---- render ------------------------------------------------------------------
  function render(a){
    if(destroyed) return;
    if(!a.user){
      el.innerHTML = `<div class="pob"><div class="pob-empty">
        <img src="assets/spiritual-maker-logo.png" alt="Spiritual Maker" style="height:44px">
        <h2>Partner Hub</h2>
        <p>This area is for invited Spiritual Maker partners.<br>Please <a href="#/login">log in</a> with the email you were invited with.</p>
      </div></div>`;
      return;
    }
    if(loading){
      el.innerHTML = '<div class="pob"><div class="pob-empty"><p>Loading your Partner Hub…</p></div></div>';
      return;
    }
    if(!partner){
      el.innerHTML = `<div class="pob"><div class="pob-empty">
        <img src="assets/spiritual-maker-logo.png" alt="Spiritual Maker" style="height:44px">
        <h2>Almost there…</h2>
        <p>We couldn't find a partner invitation for <b>${esc(a.email || '')}</b>.<br>
        If you were invited with a different email, log in with that one — or ask your Brand Manager.</p>
      </div></div>`;
      return;
    }

    const req = requiredSteps();
    const done = doneCount(req);
    const pct = req.length ? Math.round(done / req.length * 100) : 0;
    const launched = req.length > 0 && done === req.length;
    const act1 = steps.filter(s => s.act === 1), act2 = steps.filter(s => s.act === 2);
    const next = nextStep();
    const mins = minutesLeft();
    const CIRC = 2 * Math.PI * 56;

    const actPill = (n, label, list, active, lastDone) => {
      const cls = active ? 'on' : (lastDone ? 'later' : 'next');
      const cnt = list.length ? `<small>· ${doneCount(list)} of ${list.length}</small>` : '';
      return `<div class="pob-act ${cls}"><span class="n">${n}</span> ${label} ${active ? cnt : ''}</div>`;
    };
    const act1Active = act1.some(s => s.status !== 'done' && s.status !== 'skipped');

    const stepRow = (s) => {
      const st = stepState(s);
      const open = openKey === s.key;
      const icon = st === 'done' ? '✓' : st === 'wait' ? '<span class="pob-pulse"></span>' : (open ? '▾' : '○');
      const chips = [];
      if(st === 'done'){
        chips.push(`<span class="pob-mini">${s.done_at ? 'Done · ' + fmtDate(s.done_at) : 'Done'}</span>`);
      } else if(st === 'wait'){
        chips.push(`<span class="pob-chip us">${waitNote(s)}</span>`);
      } else {
        chips.push(`<span class="pob-chip you">YOUR TURN</span>`);
        if(s.minutes) chips.push(`<span class="pob-chip time">⏱ ${fmtMin(s.minutes)}</span>`);
      }
      return `
      <div class="pob-step ${st} ${next && next.key === s.key ? 'doing' : ''}" data-step="${escAttr(s.key)}">
        <div class="pob-srow" data-toggle="${escAttr(s.key)}">
          <div class="ic">${icon}</div>
          <div class="t"><b>${esc(s.title)}</b><span>${esc(s.descr || '')}</span></div>
          <div class="chips">${chips.join('')}</div>
        </div>
        <div class="pob-sbody" data-body="${escAttr(s.key)}" ${open ? '' : 'hidden'}>${open ? stepBody(s, a) : ''}</div>
      </div>`;
    };

    const tier = TIERS[partner.tier] || TIERS.ambassador;
    const commission = partner.commission_usd != null ? partner.commission_usd : tier.usd;

    const nextCard = launched ? `
      <div class="pob-next">
        <div class="pob-next-top"><span class="pob-nextlabel">You made it</span></div>
        <h2>You're launched, ${esc((a.displayName || '').split(' ')[0] || 'Maker')} 🎉</h2>
        <p>Every setup step is done. From here it's your monthly content rounds — create, announce, host, share the video — and we boost your events to the Egely audience by email.</p>
        <a class="go" href="#/sessions/new">Create your next Session</a>
      </div>`
      : next ? `
      <div class="pob-next">
        <div class="pob-next-top">
          <span class="pob-nextlabel">Your next step</span>
          <span class="pob-chip you">YOUR TURN</span>
          ${next.minutes ? `<span class="pob-chip time">⏱ ${fmtMin(next.minutes)}</span>` : ''}
        </div>
        <h2>${esc((NEXT_COPY[next.key] || { t: next.title }).t)}</h2>
        <p>${esc((NEXT_COPY[next.key] || { p: next.descr || '' }).p)}</p>
        <button class="go" data-goto="${escAttr(next.key)}">Take me there</button>
      </div>` : `
      <div class="pob-next">
        <div class="pob-next-top"><span class="pob-nextlabel">All in our court</span></div>
        <h2>Nothing on your plate right now 🙌</h2>
        <p>Everything left is on our side — we'll email you the moment it's your turn again.</p>
      </div>`;

    el.innerHTML = `
    <div class="pob">
      <div class="pob-hero">
        <div class="pob-hero-l">
          <div class="pob-smrow"><img src="assets/spiritual-maker-logo.png" alt="Spiritual Maker"><span class="pob-pp">Partner Program</span></div>
          <h1>Welcome, ${esc((a.displayName || '').split(' ')[0] || 'Maker')} 👋</h1>
          <div class="pob-sub">This is your partner hub — where your Egely Wheel business lives. Your deal, your content, your commissions in one place, with <b>Krisztián, your dedicated Brand Manager</b>, one message away.</div>
          <div class="pob-acts">
            ${actPill(1, 'Get ready', act1, act1Active, false)}
            <div class="pob-actline"></div>
            ${actPill(2, 'Go live', act2, !act1Active && !launched, false)}
            <div class="pob-actline"></div>
            <div class="pob-act later"><span class="n">3</span> Keep growing</div>
          </div>
        </div>
        <div class="pob-ringbox">
          <div class="pob-ring">
            <svg width="128" height="128" viewBox="0 0 128 128">
              <defs><linearGradient id="pobg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#37dbff"/><stop offset="1" stop-color="#5230da"/></linearGradient></defs>
              <circle cx="64" cy="64" r="56" fill="none" stroke="#eef0f2" stroke-width="11"/>
              <circle cx="64" cy="64" r="56" fill="none" stroke="url(#pobg)" stroke-width="11" stroke-linecap="round"
                stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="${(CIRC * (1 - pct / 100)).toFixed(1)}"/>
            </svg>
            <div class="pct"><b>${pct}%</b><span>to launch</span></div>
          </div>
          ${mins > 0 ? `<div class="pob-time">⏱ ${fmtMin(mins)} of your time left</div>` : ''}
        </div>
      </div>

      <div class="pob-cols">
        <main>
          ${nextCard}
          <div class="pob-acth"><h3>Act 1 · Get ready</h3><div class="rule"></div><span class="cnt">${doneCount(act1)} of ${act1.length} done</span></div>
          ${act1.map(stepRow).join('')}
          <div class="pob-acth"><h3>Act 2 · Go live</h3><div class="rule"></div><span class="cnt">${act1Active ? 'up next' : doneCount(act2) + ' of ' + act2.length + ' done'}</span></div>
          ${act2.map(stepRow).join('')}
          <div class="pob-acth"><h3>Act 3 · Keep growing</h3><div class="rule"></div></div>
          <div class="pob-tease">🚀 Unlocks at launch — your monthly content rounds, and Egely email boosts promoting your events to our audience.</div>
        </main>

        <aside class="pob-rail">
          <div class="pob-card">
            <div class="pob-prod"><img src="assets/ewr-access-product-card.png" alt="Egely Wheel"></div>
            <div class="pad">
              <h4>Your partnership</h4>
              ${partner.commission_usd == null && partner.wheel_price_usd == null ? `
                <div class="pob-note">🛠 Krisztián is preparing your offer — your tier, commission and coupons appear here shortly.</div>` : `
                <div class="pob-deal"><span>Commission per sale</span><b>$${esc(commission)}</b></div>
                ${partner.wheel_price_usd != null ? `<div class="pob-deal"><span>Your Egely Wheel</span><b class="${Number(partner.wheel_price_usd) === 0 ? 'free' : ''}">${Number(partner.wheel_price_usd) === 0 ? 'Free' : '$' + Number(partner.wheel_price_usd)}</b></div>` : ''}
                ${partner.wheel_coupon ? `<div class="pob-deal"><span>Your coupon</span><span class="pob-code" data-copy="${escAttr(partner.wheel_coupon)}">${esc(partner.wheel_coupon)}</span></div>` : ''}
                ${partner.audience_coupon ? `<div class="pob-deal"><span>Audience code</span><span class="pob-code" data-copy="${escAttr(partner.audience_coupon)}">${esc(partner.audience_coupon)}</span></div>` : ''}
                <div class="pob-ladder">
                  ${Object.entries(TIERS).map(([k, t]) => `
                    <div class="pob-rung ${k === (partner.tier || 'ambassador') ? 'you' : 'dim'}">
                      <img src="${t.icon}" alt=""><div class="nm">${t.name}</div><div class="cm">$${t.usd}</div>
                    </div>`).join('')}
                </div>
                <div class="pob-fine">45-day cookie window · payouts via PayPal after a 45-day verification · free lifetime EWR Live access as an approved Maker</div>`}
            </div>
          </div>

          ${(() => {
            // The money links — everything the partner actually shares, one place.
            // Checkout links carry the audience coupon pre-applied (Shopify cart
            // permalink + ?discount=), so their followers land on checkout with
            // the code already active.
            const links = [];
            if(partner.affiliate_link) links.push({ l: 'Your affiliate link', u: partner.affiliate_link });
            if(partner.audience_coupon){
              const d = encodeURIComponent(partner.audience_coupon);
              links.push({ l: 'Egely Wheel · your coupon applied', u: `https://egelywheel.com/cart/56516037312898:1?discount=${d}` });
              links.push({ l: 'Vitality Pack · your coupon applied', u: `https://egelywheel.com/cart/56459929780610:1?discount=${d}` });
            }
            if(a.practitionerHandle) links.push({ l: 'Your EWR Live connect page', u: `${location.origin}/#/connect/${a.practitionerHandle}` });
            return links.length ? `
            <div class="pob-card"><div class="pad">
              <h4>Your links</h4>
              ${links.map(x => `
                <div class="pob-link">
                  <div class="ll"><b>${esc(x.l)}</b><span>${esc(x.u.replace(/^https?:\/\//, ''))}</span></div>
                  <button class="pob-btn ghost sm" data-copy="${escAttr(x.u)}">Copy</button>
                </div>`).join('')}
              <div class="pob-fine">Your coupon is applied automatically at checkout on the store links.</div>
            </div></div>` : '';
          })()}

          <div class="pob-card"><div class="pad">
            <div class="pob-mgr">
              <span class="av">K</span>
              <div><b>Krisztián</b><span>Brand Manager</span></div>
              <a class="pob-btn ghost" style="margin-left:auto;text-decoration:none" href="mailto:egelymedia@egelywheel.net">Email →</a>
            </div>
          </div></div>

          <div class="pob-assist"><span class="ai">✦</span><div>You'll get an <b>email from your Brand Manager</b> whenever it's your turn — so you never have to keep this page open.</div></div>
        </aside>
      </div>
    </div>`;

    bind(a);
  }

  // ---- interactions ------------------------------------------------------------
  function msgIn(bodyEl, text, ok){
    const m = bodyEl.querySelector('[data-msg]');
    if(m){ m.className = 'pob-msg ' + (ok ? 'ok' : 'err'); m.textContent = text; }
  }

  function bind(a){
    // copy-to-clipboard codes
    el.querySelectorAll('[data-copy]').forEach(n => n.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(n.dataset.copy); const t = n.textContent; n.textContent = 'Copied ✓'; setTimeout(() => { n.textContent = t; }, 1200); } catch {}
    }));
    // row toggles
    el.querySelectorAll('[data-toggle]').forEach(row => row.addEventListener('click', (e) => {
      if(e.target.closest('a, button, input, textarea, label')) return;
      const key = row.dataset.toggle;
      openKey = (openKey === key) ? null : key;
      render(auth.getState());
    }));
    // "take me there" scrolls + opens
    el.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => {
      openKey = b.dataset.goto;
      render(auth.getState());
      const t = el.querySelector(`[data-step="${CSS.escape(openKey)}"]`);
      if(t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));

    // per-step actions (delegated per open body)
    el.querySelectorAll('[data-body]').forEach(body => {
      const key = body.dataset.body;
      const s = stepBy(key);
      if(!s || body.hidden) return;

      // guides: track opened PDFs (always read the FRESH step row — a captured `s`
      // goes stale after a rerender:false setStep and would erase earlier flags)
      body.querySelectorAll('[data-guide]').forEach(g => g.addEventListener('click', () => {
        const cur = stepBy(key) || s;
        const opened = { ...(cur.payload?.opened || {}) };
        opened[g.dataset.guide] = true;
        setStep(key, { payload: { ...cur.payload, opened } }, false);
        const lbl = g.querySelector('.open'); if(lbl) lbl.textContent = 'Opened ✓';
      }));

      body.addEventListener('click', async (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if(!act) return;

        if(act === 'guides-done'){
          await setStep(key, { status: 'done' });
        }
        else if(act === 'details-save'){
          const name = body.querySelector('[data-f="name"]').value.trim();
          const bio = body.querySelector('[data-f="bio"]').value.trim();
          if(!name){ msgIn(body, 'Please enter your name.', false); return; }
          const { error } = await auth.saveProfile({ display_name: name, bio });
          if(error){ msgIn(body, error.message, false); return; }
          await setStep(key, { status: 'done', payload: { ...s.payload, name } });
        }
        else if(act === 'agreement-view'){
          e.target.disabled = true;
          const url = await contractUrl();
          e.target.disabled = false;
          if(url) window.open(url, '_blank', 'noopener');
          else msgIn(body, 'Could not open the agreement — try again.', false);
        }
        else if(act === 'agreement-sign'){
          const nm = body.querySelector('[data-f="signname"]').value.trim();
          const ok = body.querySelector('[data-f="agree"]')?.checked;
          if(!ok){ msgIn(body, 'Please tick the acceptance box first.', false); return; }
          if(nm.length < 3){ msgIn(body, 'Please type your full name to sign.', false); return; }
          await setStep(key, { status: 'done', payload: { ...s.payload, signed_name: nm, signed_at: new Date().toISOString() } });
        }
        else if(act === 'offer-open'){
          const cur = stepBy(key) || s;
          setStep(key, { payload: { ...cur.payload, opened_at: new Date().toISOString() } }, false);
        }
        else if(act === 'offer-done'){
          const cur = stepBy(key) || s;
          await setStep(key, { status: 'done', payload: { ...cur.payload, ordered_at: new Date().toISOString() } });
        }
        else if(act === 'photo-add'){
          body.querySelector('[data-f="photofile"]').click();
        }
        else if(act === 'photo-use'){
          const i = Number(e.target.dataset.i);
          const url = (s.payload?.photos || [])[i];
          if(!url) return;
          e.target.textContent = 'Saving…';
          const { error } = await auth.saveProfile({ wheel_photo_url: url });
          if(error){ msgIn(body, error.message, false); e.target.textContent = 'Use on profile'; return; }
          render(auth.getState());
        }
        else if(act === 'socials-save'){
          const g = k => (body.querySelector(`[data-f="${k}"]`)?.value || '').trim();
          const fields = { instagram_url: g('instagram_url'), tiktok_url: g('tiktok_url'), youtube_url: g('youtube_url'), facebook_url: g('facebook_url') };
          // Validate BEFORE saving — saveProfile triggers a synchronous re-render,
          // so feedback must land before the body is replaced.
          if(!Object.values(fields).some(Boolean)){ msgIn(body, 'Add at least one link first.', false); return; }
          const bad = Object.values(fields).find(v => v && !/^https?:\/\/.+\..+/.test(v));
          if(bad){ msgIn(body, 'Links should start with https://', false); return; }
          const { error } = await auth.saveProfile(fields);
          if(error){ msgIn(body, error.message, false); return; }
          await setStep(key, { status: 'done' });
        }
        else if(act === 'proof-save'){
          const url = body.querySelector('[data-f="proofurl"]').value.trim();
          if(!/^https?:\/\/.+\..+/.test(url)){ msgIn(body, 'Please paste the link to your post (https://…).', false); return; }
          const cur = stepBy(key) || s;
          await setStep(key, { status: 'done', payload: { ...cur.payload, proof_url: url } });
        }
        else if(act === 'custom-done'){
          await setStep(key, { status: 'done' });
        }
      });

      // photo file input
      const fileIn = body.querySelector('[data-f="photofile"]');
      if(fileIn) fileIn.addEventListener('change', async () => {
        const files = Array.from(fileIn.files || []).slice(0, 6);
        if(!files.length) return;
        msgIn(body, 'Uploading…', true);
        const urls = [...(s.payload?.photos || [])];
        for(const f of files){
          const res = await auth.uploadWheelPhoto(f);
          if(res.url) urls.push(res.url);
          else { msgIn(body, res.error?.message || 'Upload failed.', false); }
        }
        if(urls.length) await setStep(key, { status: 'done', payload: { ...s.payload, photos: urls } });
      });
    });
  }

  // ---- lifecycle -----------------------------------------------------------------
  let loadedFor = null;
  const unsub = auth.subscribeAuth(async (a) => {
    if(destroyed) return;
    if(!a.user){ partner = null; steps = []; loadedFor = null; render(a); return; }
    if(!a.accessReady){ return; }
    if(loadedFor === a.user.id){ render(a); return; }
    loadedFor = a.user.id;
    loading = true;
    el.innerHTML = '<div class="pob"><div class="pob-empty"><p>Loading your Partner Hub…</p></div></div>';
    await load(a);
    loading = false;
    if(!destroyed) render(auth.getState());
  });

  return () => { destroyed = true; if(unsub) unsub(); };
}
