// view-subscribe.js — public "get started" page for visitors without a subscription.
// Watching EWR Live is free; connecting your own Egely Wheel over Bluetooth to
// measure needs an Egely Wheel + EWR access. This page explains how, showcases the
// two real Shopify products, and sends people to the right product page.
//
// Self-contained: it injects its own scoped <style> (.sub-*) once, so it does not
// touch index.html's shared stylesheet.
import * as auth from './auth.js';

const SHOP = 'https://egelywheel.com';

// CTAs are Shopify cart permalinks: they land on checkout with the product
// already in the cart (same pattern as the #vpackFab pill); the small
// "View details" link below each button keeps the product page reachable.
const PRODUCTS = {
  pack: {
    name: 'Egely Wheel Vitality Pack',
    tagline: 'New to the Egely Wheel? Everything you need to begin, in one pack.',
    image: 'https://cdn.shopify.com/s/files/1/0946/2382/6306/files/VitalityPack-EgelyWheel.jpg?v=1777371828',
    url: SHOP + '/cart/56459929780610:1?utm_source=ewr-live&utm_medium=subscribe-page&utm_campaign=vitality-pack',
    productUrl: SHOP + '/products/vitality-pack',
    checkoutDirect: true,
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
    image: 'assets/ewr-access-product-card.png',
    // Subscription product: Shopify only sells it with a selling plan, so a
    // cart permalink 500s ("Variant can only be purchased with a selling
    // plan") — this button goes to the product page instead.
    url: SHOP + '/products/ewr-subscription',
    productUrl: SHOP + '/products/ewr-subscription',
    checkoutDirect: false,
    price: '$49',
    priceNote: '1 year of access',
    badge: '',
    features: [
      'Connect your Egely Wheel over Bluetooth',
      'Live races, voice-guided sessions & solo measurements',
      'Replays, history, achievements, XP & levels',
    ],
    cta: 'Get EWR Access',
  },
};

const UNLOCKS = [
  ['Live races', 'Race in real time — then replay every run, move by move.'],
  ['Voice-guided sessions', 'Measure with a Spiritual Maker’s live voice guiding the room.'],
  ['Solo sessions', 'Track your vitality on detailed charts — and replay them any time.'],
  ['History', 'Every measurement saved to your account.'],
  ['Levels & badges', 'Earn XP, climb levels, collect achievements.'],
  ['The Live wall', 'Show up online (and offline) for the community.'],
];

const STEPS = [
  ['Get your gear', 'Order the Vitality Pack — or just EWR Access if you already own an Egely Wheel.'],
  ['Unlocked automatically', 'Your purchase activates measuring for your email. No codes to copy, no waiting.'],
  ['Log in & measure', 'Come back here, log in with the <b>same email</b> you bought with, connect your wheel, and go.'],
];

// Live vitality band: ONE wandering series drives the curve, the end-dot and
// the value pill — the seeded frame doubles as the reduced-motion fallback.
const BAND_N = 13, BAND_W = 600, BAND_H = 100;
const bandY = v => BAND_H - 6 - (v / 24) * (BAND_H - 14);
const BAND_SEED = [7, 8, 9, 11, 10, 12, 14, 13, 15, 14, 16, 15, 17];
const bandPath = ser => ser.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * (BAND_W / (BAND_N - 1))).toFixed(1)},${bandY(v).toFixed(1)}`).join(' ');
const bandCol = v => v < 6 ? '#c2415b' : v < 13 ? '#b8860b' : '#0f8a52';   // muted text colours
const bandDot = v => v < 6 ? '#f04438' : v < 13 ? '#f5b700' : '#20b26b';   // vivid marker colours

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
  .sub-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;
    color:#5a6571;font-weight:700;margin-bottom:14px}
  .sub-eyebrow::before{content:'';width:7px;height:7px;border-radius:50%;flex-shrink:0;
    background:linear-gradient(135deg,#37dbff,#5230da)}
  .sub-hero h1{font-family:'Montserrat',sans-serif;font-weight:600;font-size:40px;line-height:1.1;margin:0 0 14px;
    color:#011624;letter-spacing:-0.5px}
  .sub-hero p{color:#67737c;font-size:16px;max-width:620px;margin:0 auto;line-height:1.6}
  .sub-banner{display:flex;align-items:center;gap:10px;justify-content:center;margin:18px auto 0;max-width:560px;
    background:rgba(32,178,107,.12);border:1px solid rgba(32,178,107,.35);color:#0f8a52;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:600}
  .sub-banner svg{width:18px;height:18px;flex-shrink:0}

  /* Telemetry card — quiet "this is what measuring looks like" proof:
     light card, zone-banded chart, violet line, current-vitality pill. */
  .sub-band{position:relative;max-width:640px;height:132px;margin:26px auto 0;border-radius:16px;overflow:hidden;
    background:#fff;border:1px solid #dfe3e6;box-shadow:0 10px 28px rgba(1,22,36,.08);
    padding:14px 16px;box-sizing:border-box}
  .sub-band-curve{position:absolute;left:16px;right:16px;top:14px;bottom:14px;
    width:calc(100% - 32px);height:calc(100% - 28px);border-radius:8px}
  .sub-band-pill{position:absolute;left:26px;top:22px;display:inline-flex;align-items:baseline;gap:7px;
    background:#fff;border:1px solid #dfe3e6;border-radius:999px;padding:6px 13px;box-shadow:0 4px 14px rgba(1,22,36,.10)}
  .sub-band-big{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:600;color:#0f8a52;line-height:1;font-variant-numeric:tabular-nums}
  .sub-band-cap{font-size:9px;letter-spacing:.12em;font-weight:700;color:#5a6571;text-transform:uppercase}

  .sub-cards{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:30px 0 8px}
  .sub-card{position:relative;display:flex;flex-direction:column;background:#fff;
    border:1px solid #dfe3e6;border-radius:18px;padding:22px;box-shadow:0 10px 28px rgba(1,22,36,.08);
    transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
  .sub-card:hover{transform:translateY(-4px);border-color:#5230da;box-shadow:0 18px 50px -20px rgba(82,48,218,.35)}
  .sub-card.feature{border-color:rgba(82,48,218,.45);box-shadow:0 16px 40px rgba(82,48,218,.16)}
  .sub-ribbon{position:absolute;top:16px;right:16px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;
    color:#fff;background:linear-gradient(135deg,#37dbff,#5230da);padding:5px 11px;border-radius:20px}
  .sub-img{width:100%;height:190px;border-radius:12px;object-fit:contain;object-position:center;box-sizing:border-box;padding:12px;margin-bottom:18px;
    background:#f7f8f8;border:1px solid #eef0f2}
  .sub-eyetag{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#5230da;font-weight:700;margin-bottom:6px}
  .sub-name{font-family:'Montserrat',sans-serif;font-size:22px;font-weight:600;margin:0 0 6px;color:#011624}
  .sub-tag{color:#67737c;font-size:14px;line-height:1.5;margin:0 0 16px}
  .sub-feats{list-style:none;padding:0;margin:0 0 18px;display:flex;flex-direction:column;gap:10px}
  .sub-feats li{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:#011624;line-height:1.45}
  .sub-feats svg{width:18px;height:18px;flex-shrink:0;color:#20b26b;margin-top:1px}
  .sub-price{display:flex;align-items:baseline;gap:8px;margin:auto 0 16px}
  .sub-price b{font-family:'Montserrat',sans-serif;font-size:30px;font-weight:600;color:#011624}
  .sub-price span{font-size:13px;color:#67737c}
  .sub-cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;text-decoration:none;
    font-family:'Inter',sans-serif;font-size:14px;font-weight:700;letter-spacing:0;
    padding:14px 18px;border-radius:999px;transition:background .15s ease,color .15s ease,border-color .15s ease,transform .15s ease}
  .sub-cta svg{width:18px;height:18px}
  .sub-cta.primary{background:#401d91;color:#fff}
  .sub-cta.primary:hover{background:#011624;transform:translateY(-1px)}
  .sub-cta.secondary{background:#fff;color:#011624;border:1px solid #dfe3e6}
  .sub-cta.secondary:hover{border-color:#5230da;color:#5230da;transform:translateY(-1px)}
  .sub-more{text-align:center;margin-top:10px;font-size:12px;color:#99a2a7}
  .sub-more a{color:#5230da;font-weight:600;text-decoration:none}
  .sub-more a:hover{text-decoration:underline}

  .sub-h2{font-family:'Montserrat',sans-serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#5a6571;
    text-align:center;margin:42px 0 18px;font-weight:600}
  /* Quiet benefit tiles — the white elevated cards stay reserved for products. */
  .sub-unlocks{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .sub-tile{background:#f7f8f8;border-radius:13px;padding:16px}
  .sub-tile-h{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600;margin:0 0 4px;color:#011624}
  .sub-tile-h::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;
    background:linear-gradient(135deg,#37dbff,#5230da);margin-right:8px;vertical-align:2px}
  .sub-tile-p{font-size:13px;color:#67737c;line-height:1.45;margin:0}

  .sub-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .sub-step{background:#f7f8f8;border-radius:14px;padding:18px}
  .sub-step-n{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-family:'Montserrat',sans-serif;font-weight:600;font-size:15px;color:#fff;background:linear-gradient(135deg,#37dbff,#5230da);margin-bottom:12px}
  .sub-step-h{font-family:'Montserrat',sans-serif;font-size:16px;font-weight:600;margin:0 0 6px;color:#011624}
  .sub-step-p{font-size:13.5px;color:#67737c;line-height:1.5;margin:0}
  .sub-step-p b{color:#401d91;font-weight:700}

  .sub-note{display:flex;gap:12px;align-items:flex-start;background:rgba(82,48,218,.08);
    border-radius:14px;padding:16px 18px;margin:24px 0;color:#404b55;font-size:14px;line-height:1.55}
  .sub-note b{color:#011624}

  .sub-foot{text-align:center;padding:18px 0 8px}
  .sub-foot-h{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:600;margin:0 0 6px;color:#011624}
  .sub-foot-p{color:#67737c;font-size:14px;margin:0 0 18px}
  .sub-foot-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .sub-link{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:14px;font-weight:700;
    padding:12px 22px;border-radius:999px;
    background:#fff;border:1px solid #dfe3e6;color:#011624;transition:border-color .15s,color .15s}
  .sub-link svg{width:16px;height:16px}
  .sub-link:hover{border-color:#5230da;color:#5230da}
  .sub-link.ghost{background:transparent;border-color:transparent;color:#67737c}
  .sub-link.ghost:hover{color:#5230da}
  .sub-login{text-align:center;margin-top:22px;color:#67737c;font-size:13.5px}
  .sub-login a{color:#5230da;font-weight:600;text-decoration:none}

  @media (max-width:760px){
    .sub-hero{padding:10px 0 4px}
    .sub-hero h1{font-size:28px;margin-bottom:10px}
    .sub-hero p{font-size:15px}
    .sub-band{height:108px}
    .sub-band-pill{left:22px;top:18px}
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
    <div class="sub-eyetag">${recommended ? 'Need the wheel?' : 'Already have a wheel?'}</div>
    <div class="sub-name">${esc(p.name)}</div>
    <p class="sub-tag">${esc(p.tagline)}</p>
    <ul class="sub-feats">
      ${p.features.map(f => `<li>${ICON}<span>${esc(f)}</span></li>`).join('')}
    </ul>
    <div class="sub-price"><b>${esc(p.price)}</b><span>${esc(p.priceNote)}</span></div>
    <a class="sub-cta ${recommended ? 'primary' : 'secondary'}" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
      ${esc(p.cta)} ${ARROW}
    </a>
    ${p.checkoutDirect ? `<div class="sub-more">Straight to secure checkout · <a href="${esc(p.productUrl)}" target="_blank" rel="noopener noreferrer">View details ↗</a></div>` : ''}
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
      <div class="sub-eyebrow">Watching is free · Measuring unlocks with a wheel</div>
      <h1>Bring your own vitality<br>into EWR Live</h1>
      <p>Watching is always free — explore sessions, replay finished races and sessions (with the
         maker’s recorded voice when they hosted live), browse the leaderboard and the Live wall.
         To connect your own Egely Wheel over Bluetooth and record your vitality, you need an
         Egely Wheel and EWR access.</p>
      ${banner}
      <div class="sub-band" aria-hidden="true">
        <svg class="sub-band-curve" viewBox="0 0 ${BAND_W} ${BAND_H}" preserveAspectRatio="none">
          <rect x="0" y="0" width="600" height="46" fill="rgba(32,178,107,.10)"/>
          <rect x="0" y="46" width="600" height="27" fill="rgba(245,183,0,.12)"/>
          <rect x="0" y="73" width="600" height="27" fill="rgba(240,68,56,.09)"/>
          <path data-sub-line d="${bandPath(BAND_SEED)}"
            fill="none" stroke="#5230da" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <circle data-sub-dot-o cx="${BAND_W}" cy="${bandY(BAND_SEED[BAND_N - 1]).toFixed(1)}" r="6.5" fill="#ffffff"/>
          <circle data-sub-dot cx="${BAND_W}" cy="${bandY(BAND_SEED[BAND_N - 1]).toFixed(1)}" r="4" fill="${bandDot(BAND_SEED[BAND_N - 1])}"/>
        </svg>
        <span class="sub-band-pill"><span class="sub-band-big" data-sub-val>${BAND_SEED[BAND_N - 1].toFixed(1)}</span><span class="sub-band-cap">Live vitality</span></span>
      </div>
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
      <p class="sub-foot-p">Watch live sessions, replay finished races move by move, browse the leaderboard, and see who is on the Live wall right now.</p>
      <div class="sub-foot-actions">
        <a class="sub-link" href="#/live">See who is live ${ARROW}</a>
        <a class="sub-link ghost" href="#/home">Back to home</a>
      </div>
    </div>

    <div class="sub-login">Already subscribed? <a href="#/login">Log in to measure →</a></div>
  </div>`;

  // The vitality band comes alive: a mean-reverting wander advances the series,
  // the curve/end-dot/value follow. Paused in background tabs; reduced-motion
  // keeps the seeded static frame.
  let bandTimer = null;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lineEl = el.querySelector('[data-sub-line]');
  if(lineEl && !reduce){
    const dotEl = el.querySelector('[data-sub-dot]');
    const dotO = el.querySelector('[data-sub-dot-o]');
    const valEl = el.querySelector('[data-sub-val]');
    const ser = BAND_SEED.slice();
    let last = ser[ser.length - 1];
    bandTimer = setInterval(() => {
      if(document.hidden) return;
      last = Math.max(2, Math.min(22, last + (Math.random() - 0.5) * 3 + (13 - last) * 0.08));
      ser.push(Math.round(last * 10) / 10);
      ser.shift();
      lineEl.setAttribute('d', bandPath(ser));
      const v = ser[ser.length - 1], y = bandY(v).toFixed(1);
      if(dotEl){ dotEl.setAttribute('cy', y); dotEl.setAttribute('fill', bandDot(v)); }
      if(dotO) dotO.setAttribute('cy', y);
      if(valEl){ valEl.textContent = v.toFixed(1); valEl.style.color = bandCol(v); }
    }, 900);
  }

  return () => { if(bandTimer) clearInterval(bandTimer); };
}
