// view-subscribe.js — public "get started" page for visitors without a subscription.
// Watching EWR Live is free; connecting your own Egely Wheel over Bluetooth to
// measure needs an Egely Wheel + EWR access. This page explains how, showcases the
// two real Shopify products, and sends people to the right product page.
//
// Self-contained: it injects its own scoped <style> (.sub-*) once, so it does not
// touch index.html's shared stylesheet.
import * as auth from './auth.js';

const SHOP = 'https://egelywheel.com';

const PRODUCTS = {
  pack: {
    name: 'Egely Wheel Vitality Pack',
    tagline: 'New to the Egely Wheel? Everything you need to begin, in one pack.',
    image: 'https://cdn.shopify.com/s/files/1/0946/2382/6306/files/VitalityPack-EgelyWheel.jpg?v=1777371828',
    url: SHOP + '/products/vitality-pack',
    price: '$499',
    priceNote: 'one-time',
    badge: 'Best value',
    features: [
      'The original Egely Wheel — the precision measuring device',
      'Vitality Indicator — a pocket tool for practice anywhere',
      '1 full year of EWR access included (a $49 value)',
    ],
    cta: 'Get the Vitality Pack',
  },
  ewr: {
    name: 'EWR Access',
    tagline: 'Already own an Egely Wheel? Just add the digital layer.',
    image: 'https://cdn.shopify.com/s/files/1/0946/2382/6306/files/EWR-App.jpg?v=1777372563',
    url: SHOP + '/products/ewr-subscription',
    price: '$49',
    priceNote: '1 year of access',
    badge: '',
    features: [
      'Connect your Egely Wheel over Bluetooth',
      'Live group races & solo measurements',
      'History, achievements, XP & levels',
      'Appear on the Live page with the community',
    ],
    cta: 'Get EWR Access',
  },
};

const UNLOCKS = [
  ['Live races', 'Measure together with others in real time.'],
  ['Solo sessions', 'Track your vitality with detailed charts.'],
  ['History', 'Every measurement saved to your account.'],
  ['Levels & badges', 'Earn XP, climb levels, collect achievements.'],
  ['The Live wall', 'Show up online (and offline) for the community.'],
  ['Your journey', 'See your progress grow over time.'],
];

const STEPS = [
  ['Get your gear', 'Order the Vitality Pack — or just EWR Access if you already own an Egely Wheel.'],
  ['Unlocked automatically', 'Your purchase activates measuring for your email. No codes to copy, no waiting.'],
  ['Log in & measure', 'Come back here, log in with the <b>same email</b> you bought with, connect your wheel, and go.'],
];

const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
const ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function styles(){
  if(document.getElementById('subStyles')) return;
  const el = document.createElement('style');
  el.id = 'subStyles';
  el.textContent = `
  .sub-wrap{max-width:980px;margin:0 auto}
  .sub-hero{text-align:center;padding:18px 0 8px}
  .sub-eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:14px}
  .sub-hero h1{font-family:'Montserrat',sans-serif;font-weight:600;font-size:40px;line-height:1.08;margin:0 0 14px;
    background:linear-gradient(100deg,#fff 10%,#b9a7ff 55%,#7d9bff 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .sub-hero p{color:var(--muted);font-size:16px;max-width:620px;margin:0 auto;line-height:1.55}
  .sub-banner{display:flex;align-items:center;gap:10px;justify-content:center;margin:18px auto 0;max-width:560px;
    background:rgba(60,201,138,.12);border:1px solid rgba(60,201,138,.4);color:#9be8c2;border-radius:12px;padding:12px 16px;font-size:14px}

  .sub-cards{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:30px 0 8px}
  .sub-card{position:relative;display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));
    border:1px solid var(--panel-border);border-radius:18px;padding:22px;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
  .sub-card:hover{transform:translateY(-4px);border-color:rgba(155,140,255,.5);box-shadow:0 18px 50px -28px rgba(82,48,218,.8)}
  .sub-card.feature{border-color:rgba(155,140,255,.45);background:linear-gradient(180deg,rgba(82,48,218,.16),rgba(82,48,218,.04))}
  .sub-ribbon{position:absolute;top:16px;right:16px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;
    color:#fff;background:linear-gradient(90deg,var(--accent),#7d5cff);padding:5px 11px;border-radius:20px}
  .sub-img{width:100%;height:190px;border-radius:12px;object-fit:cover;background:#0c0f24;margin-bottom:18px}
  .sub-eyetag{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:6px}
  .sub-name{font-family:'Montserrat',sans-serif;font-size:22px;font-weight:600;margin:0 0 6px}
  .sub-tag{color:var(--muted);font-size:14px;line-height:1.5;margin:0 0 16px}
  .sub-feats{list-style:none;padding:0;margin:0 0 18px;display:flex;flex-direction:column;gap:10px}
  .sub-feats li{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:#e7e6f6;line-height:1.45}
  .sub-feats svg{width:18px;height:18px;flex-shrink:0;color:#3CC98A;margin-top:1px}
  .sub-price{display:flex;align-items:baseline;gap:8px;margin:auto 0 16px}
  .sub-price b{font-family:'Montserrat',sans-serif;font-size:30px;font-weight:600;color:#fff}
  .sub-price span{font-size:13px;color:var(--muted)}
  .sub-cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;text-decoration:none;
    font-family:'Inter',sans-serif;font-size:15px;font-weight:600;padding:14px 18px;border-radius:11px;transition:filter .15s ease,transform .15s ease}
  .sub-cta svg{width:18px;height:18px}
  .sub-cta.primary{background:linear-gradient(90deg,var(--accent),#7d5cff);color:#fff}
  .sub-cta.secondary{background:rgba(255,255,255,.07);color:#fff;border:1px solid var(--panel-border)}
  .sub-cta:hover{filter:brightness(1.08);transform:translateY(-1px)}

  .sub-h2{font-family:'Montserrat',sans-serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);
    text-align:center;margin:42px 0 18px;font-weight:600}
  .sub-unlocks{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .sub-tile{background:rgba(255,255,255,.035);border:1px solid var(--panel-border);border-radius:13px;padding:16px}
  .sub-tile-h{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600;margin:0 0 4px;color:#fff}
  .sub-tile-p{font-size:13px;color:var(--muted);line-height:1.45;margin:0}

  .sub-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .sub-step{background:rgba(255,255,255,.035);border:1px solid var(--panel-border);border-radius:14px;padding:18px}
  .sub-step-n{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-family:'Montserrat',sans-serif;font-weight:600;font-size:15px;color:#fff;background:linear-gradient(135deg,var(--blue),var(--accent));margin-bottom:12px}
  .sub-step-h{font-family:'Montserrat',sans-serif;font-size:16px;font-weight:600;margin:0 0 6px}
  .sub-step-p{font-size:13.5px;color:var(--muted);line-height:1.5;margin:0}
  .sub-step-p b{color:#cdbcff;font-weight:600}

  .sub-note{display:flex;gap:12px;align-items:flex-start;background:rgba(0,51,255,.10);border:1px solid rgba(125,155,255,.35);
    border-radius:14px;padding:16px 18px;margin:24px 0;color:#cdd8ff;font-size:14px;line-height:1.55}
  .sub-note b{color:#fff}

  .sub-foot{text-align:center;padding:18px 0 8px}
  .sub-foot-h{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:500;margin:0 0 6px}
  .sub-foot-p{color:var(--muted);font-size:14px;margin:0 0 18px}
  .sub-foot-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .sub-link{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:14px;font-weight:600;
    padding:12px 20px;border-radius:11px;background:rgba(255,255,255,.07);border:1px solid var(--panel-border);color:#fff}
  .sub-link.ghost{background:transparent}
  .sub-link:hover{filter:brightness(1.12)}
  .sub-login{text-align:center;margin-top:22px;color:var(--muted);font-size:13.5px}
  .sub-login a{color:#cdbcff;font-weight:600;text-decoration:none}

  @media (max-width:760px){
    .sub-hero h1{font-size:30px}
    .sub-cards{grid-template-columns:1fr}
    .sub-unlocks{grid-template-columns:1fr 1fr}
    .sub-steps{grid-template-columns:1fr}
  }
  @media (max-width:430px){ .sub-unlocks{grid-template-columns:1fr} }
  `;
  document.head.appendChild(el);
}

function card(p, recommended){
  const img = `<img class="sub-img" src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.style.display='none'">`;
  return `
  <div class="sub-card${recommended ? ' feature' : ''}">
    ${p.badge ? `<span class="sub-ribbon">${esc(p.badge)}</span>` : ''}
    ${img}
    <div class="sub-eyetag">${recommended ? 'Start here' : 'Already have a wheel?'}</div>
    <div class="sub-name">${esc(p.name)}</div>
    <p class="sub-tag">${esc(p.tagline)}</p>
    <ul class="sub-feats">
      ${p.features.map(f => `<li>${ICON}<span>${esc(f)}</span></li>`).join('')}
    </ul>
    <div class="sub-price"><b>${esc(p.price)}</b><span>${esc(p.priceNote)}</span></div>
    <a class="sub-cta ${recommended ? 'primary' : 'secondary'}" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
      ${esc(p.cta)} ${ARROW}
    </a>
  </div>`;
}

export function mount(el){
  styles();
  const a = auth.getState();
  const banner = a.subscriber
    ? `<div class="sub-banner">${ICON}<span>You already have EWR access — connect your wheel and start measuring.</span></div>`
    : '';

  el.innerHTML = `
  <div class="sub-wrap">
    <div class="sub-hero">
      <div class="sub-eyebrow">Watching is free · Measuring needs a wheel</div>
      <h1>Bring your own vitality<br>into EWR Live</h1>
      <p>Exploring sessions, the leaderboard and the Live wall is always free. To connect your own
         Egely Wheel over Bluetooth and record your vitality, you need an Egely Wheel and EWR access.
         Here is how to get set up.</p>
      ${banner}
    </div>

    <div class="sub-cards">
      ${card(PRODUCTS.pack, true)}
      ${card(PRODUCTS.ewr, false)}
    </div>

    <div class="sub-h2">What measuring unlocks</div>
    <div class="sub-unlocks">
      ${UNLOCKS.map(([h, p]) => `<div class="sub-tile"><div class="sub-tile-h">${esc(h)}</div><p class="sub-tile-p">${esc(p)}</p></div>`).join('')}
    </div>

    <div class="sub-h2">How it works</div>
    <div class="sub-steps">
      ${STEPS.map(([h, p], i) => `
        <div class="sub-step">
          <div class="sub-step-n">${i + 1}</div>
          <div class="sub-step-h">${esc(h)}</div>
          <p class="sub-step-p">${p}</p>
        </div>`).join('')}
    </div>

    <div class="sub-note">
      <span>💡</span>
      <span>Subscribe with the <b>same email address</b> you will log in with here — your EWR access is tied to that email, and it unlocks measuring automatically.</span>
    </div>

    <div class="sub-foot">
      <div class="sub-foot-h">Not ready yet? Keep exploring — it is free.</div>
      <p class="sub-foot-p">Watch live sessions, browse the leaderboard, and see who is on the Live wall right now.</p>
      <div class="sub-foot-actions">
        <a class="sub-link" href="#/live">See who is live ${ARROW}</a>
        <a class="sub-link ghost" href="#/home">Back to home</a>
      </div>
    </div>

    <div class="sub-login">Already subscribed? <a href="#/login">Log in to measure →</a></div>
  </div>`;

  return () => {};
}
