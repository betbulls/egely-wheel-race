// view-how-to-connect.js — "Connect your Egely Wheel" guide.
// Reassuring, premium-light, mobile-first. Explains browser-based BLE connection:
// Android/Chrome (built-in), iPhone & iPad via Bluefy (a Web BLE browser, recommended),
// Mac/Windows Chrome. NO BLE logic here — static guide + outbound links only.
//
// Self-contained scoped <style> (.htc-*). Route: #/how-to-connect.
const BLUEFY_URL = 'https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055';
const SUPPORT_EMAIL = 'info@egelywheel.com';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

// ---- Small inline function icons (not the topic/achievement set) ------------
const ICONS = {
  android: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><line x1="10" y1="18.5" x2="14" y2="18.5"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><line x1="10" y1="18.5" x2="14" y2="18.5"/></svg>`,
  laptop: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="11" rx="1.6"/><path d="M2 19h20l-1.4-2H3.4z"/></svg>`,
  bluetooth: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10-5 4V3l5 4L7 17"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  star: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.8 6.1 20.8l1.2-6.6L2.5 9l6.6-.9z"/></svg>`,
};

// ---- Hero illustration — abstract phone (showing a Connect step) + Bluetooth pulse
// + abstract disc. Deliberately NOT a render of the real Egely Wheel.
function heroArt(){
  return `<svg class="htc-art" viewBox="0 0 320 230" role="img" aria-label="A phone connecting to a device over Bluetooth">
    <defs>
      <linearGradient id="htcg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#37dbff"/><stop offset="1" stop-color="#5230da"/>
      </linearGradient>
    </defs>
    <!-- abstract device disc (placeholder, not the product) -->
    <circle cx="250" cy="124" r="40" fill="#f2f3f4" stroke="#dfe3e6"/>
    <circle cx="250" cy="124" r="22" fill="none" stroke="url(#htcg)" stroke-width="3" stroke-dasharray="4 6" stroke-linecap="round"/>
    <circle cx="250" cy="124" r="6" fill="url(#htcg)"/>
    <!-- bluetooth pulse between phone and device -->
    <circle cx="188" cy="112" r="15" fill="none" stroke="#5230da" stroke-width="1.5" opacity="0.22"/>
    <circle cx="188" cy="112" r="24" fill="none" stroke="#5230da" stroke-width="1.5" opacity="0.1"/>
    <g fill="none" stroke="#5230da" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M183 106l10 9-5 4V102l5 4-10 9"/>
    </g>
    <!-- phone -->
    <rect x="38" y="30" width="120" height="170" rx="19" fill="#fff" stroke="#dfe3e6" stroke-width="2"/>
    <rect x="38" y="30" width="120" height="170" rx="19" fill="none" stroke="url(#htcg)" stroke-width="2" opacity="0.4"/>
    <!-- browser address bar -->
    <rect x="52" y="50" width="92" height="20" rx="7" fill="#f7f8f8"/>
    <circle cx="62" cy="60" r="3" fill="#20b26b"/>
    <rect x="71" y="57" width="62" height="6" rx="3" fill="#dfe3e6"/>
    <!-- telemetry card -->
    <rect x="52" y="80" width="92" height="64" rx="9" fill="#f7f8f8"/>
    <polyline points="58,128 71,120 82,128 93,100 106,114 118,92 130,106" fill="none" stroke="#5230da" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="130" cy="106" r="4" fill="#20b26b"/>
    <!-- Connect pill (setup-guide cue) -->
    <rect x="60" y="156" width="76" height="26" rx="13" fill="url(#htcg)"/>
    <text x="98" y="173" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="11" font-weight="700" fill="#fff">Connect</text>
  </svg>`;
}

// Hero stage: the real spinning Egely Wheel (Csaba's Lottie) with blue energy waves
// radiating out (the vitality signal). The abstract SVG stays as a graceful fallback.
function heroStage(){
  return `<div class="htc-stage" id="htcStage">
    <div class="htc-energy" aria-hidden="true">
      <span class="htc-glow"></span>
      <span class="htc-ring"></span><span class="htc-ring"></span><span class="htc-ring"></span>
    </div>
    <div class="htc-lottie" id="htcLottie"></div>
    <div class="htc-fallback">${heroArt()}</div>
  </div>`;
}

// Lazy-load the locally vendored Lottie player (only on this page; not app-wide).
let lottieLoading = null;
function loadLottie(){
  if(window.lottie) return Promise.resolve(window.lottie);
  if(lottieLoading) return lottieLoading;
  lottieLoading = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'assets/lottie.min.js';
    s.onload = () => resolve(window.lottie || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return lottieLoading;
}

function steps(list){
  return `<ol class="htc-steps">${list.map(s => `<li><span class="htc-step-n"></span><span class="htc-step-t">${s}</span></li>`).join('')}</ol>`;
}

const PLATFORMS = [
  {
    key: 'android', icon: ICONS.android, name: 'Android phone', tag: 'Use Chrome',
    intro: 'Bluetooth connection happens directly in Chrome.',
    list: [
      'Turn on Bluetooth.',
      'Open EWR Live in <b>Chrome</b>.',
      'Tap <b>Connect</b>.',
      'Choose your Egely Wheel from the Bluetooth picker.',
      'Start measuring.',
    ],
  },
  {
    key: 'ios', icon: ICONS.apple, name: 'iPhone & iPad', tag: 'Use Bluefy', featured: true,
    badge: 'Recommended for iPhone',
    intro: 'iPhone and iPad connect through Bluefy, a Web BLE browser.',
    list: [
      'Install <b>Bluefy — Web BLE Browser</b> from the App Store.',
      'Open Bluefy.',
      'Go to <b>live.egelywheel.com</b>.',
      'Log in.',
      'Tap <b>Connect</b> and choose your Egely Wheel.',
    ],
    why: 'Bluefy is a Web BLE browser. It works just like a browser: open Bluefy, visit <b>live.egelywheel.com</b>, then tap Connect inside EWR Live. Your Egely Wheel connects only after you tap Connect — nothing happens in the background.',
    cta: { href: BLUEFY_URL, label: 'Install Bluefy from the App Store' },
  },
  {
    key: 'desktop', icon: ICONS.laptop, name: 'Mac & Windows', tag: 'Use Chrome',
    intro: 'Use Chrome on Mac or Windows and connect from the page.',
    list: [
      'Open <b>Chrome</b> on Mac or Windows.',
      'Make sure Bluetooth is enabled.',
      'Go to <b>live.egelywheel.com</b>.',
      'Tap <b>Connect</b> and choose your Egely Wheel.',
    ],
  },
];

const CHECKLIST = [
  'Your Egely Wheel is turned on',
  'Bluetooth is enabled',
  'Keep the wheel near your phone or laptop',
  'You are on <b>live.egelywheel.com</b> (a secure page)',
  'You are using the recommended browser for your device',
];

const HAPPENS = [
  ['Your browser asks first', 'Connecting always starts with a permission prompt from your browser.'],
  ['You choose the wheel', 'You pick your Egely Wheel yourself from the device list — nothing connects automatically.'],
  ['Live vitality while connected', 'EWR Live reads vitality data from the wheel only while you are connected.'],
  ['Disconnect anytime', 'One tap disconnects. You are always in control.'],
  ['Saved only when you save', 'A measurement is stored only when you save or complete a session.'],
];

const TROUBLE = [
  ['I don’t see my wheel in the list', 'Make sure the wheel is switched on and close by, then tap Connect again. Only nearby, powered-on devices appear in the picker.'],
  ['The connection failed', 'Close any other app or browser tab that might already be connected to the wheel, then try once more. Only one app can use the wheel at a time.'],
  ['My iPhone keeps opening Safari', 'On iPhone and iPad, open the page inside <b>Bluefy</b> instead of Safari. Safari cannot connect to Bluetooth devices — Bluefy can.'],
  ['Bluefy is asking for permission', 'That is expected — tap Allow. Bluefy needs Bluetooth permission once so the page can find your wheel.'],
  ['The wheel keeps disconnecting', 'Keep the wheel within a few metres and avoid locking the screen during a measurement. A weak battery in the wheel can also cause drops.'],
  ['Another app is already connected', 'If the wheel is connected elsewhere (another tab, app, or a paired Bluetooth setting), disconnect it there first — only one connection is allowed at a time.'],
];

function styles(){
  if(document.getElementById('htcStyles')) return;
  const el = document.createElement('style');
  el.id = 'htcStyles';
  el.textContent = `
  .htc-wrap{max-width:880px;margin:0 auto;padding:4px 0 8px}
  .htc-hero{display:flex;align-items:center;gap:26px;background:#fff;border:1px solid #dfe3e6;border-radius:20px;
    padding:28px 30px;box-shadow:0 10px 28px rgba(1,22,36,.08);margin-bottom:26px}
  .htc-hero-text{flex:1;min-width:0}
  .htc-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.12em;
    text-transform:uppercase;color:#5230da;background:rgba(82,48,218,.08);border-radius:999px;padding:5px 11px;margin-bottom:12px}
  .htc-hero h1{font-family:'Montserrat',sans-serif;font-weight:600;font-size:30px;line-height:1.12;margin:0 0 10px;color:#011624;letter-spacing:-0.4px}
  .htc-hero p{color:#67737c;font-size:15px;line-height:1.55;margin:0}
  .htc-hero p b{color:#011624;font-weight:600}
  .htc-art{width:300px;max-width:42%;height:auto;flex-shrink:0}
  /* Hero stage — spinning wheel Lottie + radiating blue energy (the vitality signal). */
  .htc-stage{position:relative;width:300px;max-width:42%;height:288px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .htc-fallback{display:flex;align-items:center;justify-content:center}
  .htc-fallback .htc-art{width:248px;max-width:100%}
  .htc-lottie{display:none;width:188px;height:274px;position:relative;z-index:1}
  .htc-lottie svg{width:100%!important;height:100%!important}
  .htc-stage.loaded .htc-lottie{display:block}
  .htc-stage.loaded .htc-fallback{display:none}
  .htc-energy{display:none;position:absolute;inset:0;align-items:center;justify-content:center;z-index:0}
  .htc-stage.loaded .htc-energy{display:flex}
  .htc-glow{position:absolute;width:210px;height:210px;border-radius:50%;
    background:radial-gradient(circle,rgba(55,219,255,.30),rgba(82,48,218,.10) 55%,transparent 72%);
    animation:htcGlow 3.2s ease-in-out infinite}
  .htc-ring{position:absolute;width:118px;height:118px;border-radius:50%;border:2px solid rgba(55,219,255,.55);
    animation:htcWave 3.2s ease-out infinite}
  .htc-ring:nth-child(3){animation-delay:1.05s}
  .htc-ring:nth-child(4){animation-delay:2.1s}
  @keyframes htcWave{0%{transform:scale(.5);opacity:0}18%{opacity:.6}100%{transform:scale(2.25);opacity:0}}
  @keyframes htcGlow{0%,100%{opacity:.55;transform:scale(.96)}50%{opacity:.9;transform:scale(1.05)}}
  @media (prefers-reduced-motion:reduce){.htc-ring,.htc-glow{animation:none}}
  .htc-h2{font-family:'Montserrat',sans-serif;font-weight:600;font-size:20px;color:#011624;margin:30px 0 14px;letter-spacing:-0.2px}
  /* Mobile segmented device chooser (hidden on desktop) */
  .htc-seg{display:none;gap:8px;margin-bottom:22px}
  .htc-seg button{flex:1;border:1px solid #dfe3e6;background:#fff;border-radius:999px;padding:10px 6px;
    font-family:'Inter',sans-serif;font-size:13px;font-weight:700;color:#67737c;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
  .htc-seg button:hover{background:#f2f3f4;color:#011624;border-color:#dfe3e6}
  .htc-seg button.active,.htc-seg button.active:hover{background:#401d91;color:#fff;border-color:#401d91}
  /* Platform chooser */
  .htc-platforms{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .htc-card{background:#fff;border:1px solid #dfe3e6;border-radius:16px;padding:20px 18px;box-shadow:0 8px 22px rgba(1,22,36,.06);display:flex;flex-direction:column;position:relative}
  .htc-card.featured{border-color:rgba(82,48,218,.4);box-shadow:0 14px 34px rgba(82,48,218,.18);
    background:linear-gradient(180deg,rgba(55,219,255,.1),rgba(82,48,218,.07)),#fff}
  .htc-badge{position:absolute;top:-11px;left:18px;display:inline-flex;align-items:center;gap:5px;
    background:linear-gradient(135deg,#37dbff,#5230da);color:#fff;font-size:10.5px;font-weight:700;
    letter-spacing:.04em;text-transform:uppercase;padding:5px 10px;border-radius:999px;box-shadow:0 4px 12px rgba(82,48,218,.3)}
  .htc-card-head{display:flex;align-items:center;gap:11px;margin-bottom:4px}
  .htc-card.featured .htc-card-head{margin-top:6px}
  .htc-card-ic{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;
    color:#5230da;background:rgba(82,48,218,.08);flex-shrink:0}
  .htc-card.featured .htc-card-ic{color:#fff;background:linear-gradient(135deg,#37dbff,#5230da)}
  .htc-card-name{font-family:'Montserrat',sans-serif;font-weight:600;font-size:16px;color:#011624}
  .htc-card-tag{font-size:12px;font-weight:700;color:#5230da}
  .htc-card.featured .htc-card-tag{color:#401d91}
  .htc-card-intro{color:#67737c;font-size:13px;line-height:1.5;margin:8px 0 14px}
  .htc-steps{list-style:none;counter-reset:s;margin:0;padding:0;display:flex;flex-direction:column;gap:11px}
  .htc-steps li{counter-increment:s;display:flex;align-items:flex-start;gap:10px;font-size:13.5px;line-height:1.45;color:#27384e}
  .htc-step-n{flex-shrink:0;width:21px;height:21px;border-radius:50%;background:#f2f3f4;color:#401d91;
    font-family:'Inter',sans-serif;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:1px}
  .htc-step-n::before{content:counter(s)}
  .htc-card.featured .htc-step-n{background:rgba(82,48,218,.16);color:#401d91}
  .htc-steps b{color:#011624;font-weight:600}
  .htc-why{margin-top:14px;background:rgba(82,48,218,.07);border:1px solid rgba(82,48,218,.16);border-radius:12px;padding:12px 14px}
  .htc-why-h{display:flex;align-items:center;gap:6px;font-family:'Montserrat',sans-serif;font-weight:600;font-size:13px;color:#401d91;margin-bottom:5px}
  .htc-why p{color:#3a4654;font-size:12.5px;line-height:1.5;margin:0}
  .htc-why p b{color:#011624;font-weight:600}
  .htc-card-cta{display:inline-flex;align-items:center;justify-content:center;gap:6px;margin-top:14px;
    background:#401d91;color:#fff;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;
    padding:11px 16px;border-radius:999px;text-decoration:none;transition:background .15s,transform .15s}
  .htc-card-cta:hover{background:#011624;transform:translateY(-1px)}
  /* Checklist + Important */
  .htc-panel{background:#fff;border:1px solid #dfe3e6;border-radius:16px;padding:20px 22px;box-shadow:0 8px 22px rgba(1,22,36,.06)}
  .htc-checklist{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:11px 22px}
  .htc-checklist li{display:flex;align-items:flex-start;gap:9px;font-size:14px;color:#27384e;line-height:1.45}
  .htc-checklist b{color:#011624;font-weight:600}
  .htc-tick{flex-shrink:0;width:20px;height:20px;border-radius:50%;background:rgba(32,178,107,.14);color:#0f8a52;
    display:flex;align-items:center;justify-content:center;margin-top:1px}
  .htc-important{display:flex;gap:12px;align-items:flex-start;margin-top:18px;background:rgba(82,48,218,.06);
    border:1px solid rgba(82,48,218,.18);border-radius:12px;padding:14px 16px;color:#27384e;font-size:14px;line-height:1.5}
  .htc-imp-label{flex-shrink:0;display:inline-flex;align-items:center;gap:5px;background:#401d91;color:#fff;
    font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:999px;margin-top:1px}
  .htc-important b{color:#011624}
  /* What happens */
  .htc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .htc-mini{background:#fff;border:1px solid #dfe3e6;border-radius:14px;padding:16px;box-shadow:0 6px 18px rgba(1,22,36,.05)}
  .htc-mini-t{display:flex;align-items:center;gap:8px;font-family:'Montserrat',sans-serif;font-weight:600;font-size:14px;color:#011624;margin-bottom:6px}
  .htc-mini-t .htc-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#37dbff,#5230da);flex-shrink:0}
  .htc-mini-d{color:#67737c;font-size:13px;line-height:1.5}
  /* Troubleshooting accordion */
  .htc-acc{background:#fff;border:1px solid #dfe3e6;border-radius:14px;overflow:hidden;box-shadow:0 6px 18px rgba(1,22,36,.05)}
  .htc-acc details{border-bottom:1px solid #eef1f3}
  .htc-acc details:last-child{border-bottom:none}
  .htc-acc summary{list-style:none;cursor:pointer;padding:15px 18px;font-weight:600;color:#011624;font-size:14.5px;
    display:flex;align-items:center;justify-content:space-between;gap:12px}
  .htc-acc summary::-webkit-details-marker{display:none}
  .htc-acc summary::after{content:'+';color:#5230da;font-size:20px;font-weight:400;line-height:1;flex-shrink:0}
  .htc-acc details[open] summary::after{content:'–'}
  .htc-acc summary:hover{color:#5230da}
  .htc-acc-body{padding:0 18px 16px;color:#67737c;font-size:13.5px;line-height:1.55}
  .htc-acc-body b{color:#011624}
  /* Still stuck */
  .htc-support{margin-top:22px;text-align:center;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:16px;padding:22px}
  .htc-support-h{font-family:'Montserrat',sans-serif;font-weight:600;font-size:17px;color:#011624;margin:0 0 6px}
  .htc-support p{color:#67737c;font-size:13.5px;line-height:1.55;margin:0 auto 14px;max-width:460px}
  /* Footer CTA */
  .htc-foot{text-align:center;padding:28px 0 6px}
  .htc-foot-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:4px}
  .htc-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:'Inter',sans-serif;
    font-size:14px;font-weight:700;padding:13px 22px;border-radius:999px;text-decoration:none;transition:background .15s,transform .15s,border-color .15s,color .15s}
  .htc-btn.primary{background:#401d91;color:#fff}
  .htc-btn.primary:hover{background:#011624;transform:translateY(-1px)}
  .htc-btn.secondary{background:#fff;border:1px solid #dfe3e6;color:#011624}
  .htc-btn.secondary:hover{border-color:#5230da;color:#5230da}
  @media (max-width:760px){
    .htc-hero{flex-direction:column-reverse;align-items:flex-start;padding:22px 20px;gap:16px}
    .htc-art{width:200px;max-width:60%;align-self:center}
    .htc-stage{width:250px;max-width:80%;height:268px;align-self:center}
    .htc-lottie{width:172px;height:251px}
    .htc-hero h1{font-size:25px}
    .htc-seg{display:flex}
    .htc-platforms{display:block}
    .htc-platforms .htc-card{display:none;margin-bottom:0}
    .htc-platforms .htc-card.dev-active{display:flex}
    .htc-grid{grid-template-columns:1fr}
    .htc-checklist{grid-template-columns:1fr}
  }
  `;
  document.head.appendChild(el);
}

function platformCard(p){
  return `<div class="htc-card dev-${p.key}${p.featured ? ' featured' : ''}${p.key === 'ios' ? ' dev-active' : ''}" data-dev="${p.key}">
    ${p.badge ? `<span class="htc-badge">${ICONS.star} ${esc(p.badge)}</span>` : ''}
    <div class="htc-card-head">
      <div class="htc-card-ic">${p.icon}</div>
      <div>
        <div class="htc-card-name">${esc(p.name)}</div>
        <div class="htc-card-tag">${esc(p.tag)}</div>
      </div>
    </div>
    <div class="htc-card-intro">${p.intro}</div>
    ${steps(p.list)}
    ${p.why ? `<div class="htc-why"><div class="htc-why-h">${ICONS.bluetooth} Why Bluefy?</div><p>${p.why}</p></div>` : ''}
    ${p.cta ? `<a class="htc-card-cta" href="${esc(p.cta.href)}" target="_blank" rel="noopener noreferrer">${esc(p.cta.label)}</a>` : ''}
  </div>`;
}

export function mount(el){
  styles();
  el.innerHTML = `
  <div class="htc-wrap">
    <section class="htc-hero">
      <div class="htc-hero-text">
        <span class="htc-eyebrow">${ICONS.bluetooth} Measure from the browser</span>
        <h1>Connect your Egely Wheel</h1>
        <p>EWR Live reads your vitality directly from the wheel over Bluetooth — <b>no cable, no pairing screen</b>. Pick your device below and follow the steps.</p>
      </div>
      ${heroStage()}
    </section>

    <h2 class="htc-h2">Choose your device</h2>
    <div class="htc-seg" role="tablist">
      <button type="button" data-dev="ios" class="active">iPhone</button>
      <button type="button" data-dev="android">Android</button>
      <button type="button" data-dev="desktop">Computer</button>
    </div>
    <div class="htc-platforms">${PLATFORMS.map(platformCard).join('')}</div>

    <h2 class="htc-h2">Before you connect</h2>
    <div class="htc-panel">
      <ul class="htc-checklist">
        ${CHECKLIST.map(c => `<li><span class="htc-tick">${ICONS.check}</span><span>${c}</span></li>`).join('')}
      </ul>
      <div class="htc-important">
        <span class="htc-imp-label">${ICONS.bluetooth} Important</span>
        <span>Connect from inside EWR Live — <b>not</b> from your phone’s Bluetooth Settings.</span>
      </div>
    </div>

    <h2 class="htc-h2">What happens when you connect?</h2>
    <div class="htc-grid">
      ${HAPPENS.map(([t, d]) => `<div class="htc-mini"><div class="htc-mini-t"><span class="htc-dot"></span>${esc(t)}</div><div class="htc-mini-d">${esc(d)}</div></div>`).join('')}
    </div>

    <h2 class="htc-h2">Having trouble?</h2>
    <div class="htc-acc">
      ${TROUBLE.map(([q, a], i) => `<details name="htc-trouble"${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><div class="htc-acc-body">${a}</div></details>`).join('')}
    </div>

    <div class="htc-support">
      <div class="htc-support-h">Still having trouble?</div>
      <p>Make sure Bluetooth is on, keep the wheel nearby, and open EWR Live from the recommended browser for your device. If it still won’t connect, send us a screenshot of your device and browser.</p>
      <a class="htc-btn secondary" href="mailto:${esc(SUPPORT_EMAIL)}">Contact support</a>
    </div>

    <div class="htc-foot">
      <h2 class="htc-h2" style="margin-bottom:6px">Ready to measure?</h2>
      <div class="htc-foot-actions">
        <a class="htc-btn primary" href="#/home">Go to EWR Live</a>
        <a class="htc-btn secondary" href="${esc(BLUEFY_URL)}" target="_blank" rel="noopener noreferrer">Install Bluefy for iPhone &amp; iPad</a>
      </div>
    </div>
  </div>`;

  // Mobile segmented device chooser — shows one platform card at a time.
  const seg = el.querySelector('.htc-seg');
  const cards = [...el.querySelectorAll('.htc-platforms .htc-card')];
  if(seg){
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dev]');
      if(!btn) return;
      const dev = btn.dataset.dev;
      seg.querySelectorAll('[data-dev]').forEach(b => b.classList.toggle('active', b === btn));
      cards.forEach(c => c.classList.toggle('dev-active', c.dataset.dev === dev));
    });
  }

  // Play the spinning Egely Wheel Lottie; reveal the energy aura once it has loaded.
  // On any failure the abstract SVG fallback simply stays in place.
  let anim = null;
  loadLottie().then(lottie => {
    const stage = el.querySelector('#htcStage');
    const box = el.querySelector('#htcLottie');
    if(!lottie || !stage || !box) return;
    try {
      anim = lottie.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: true, path: 'assets/egely-wheel.json' });
      anim.addEventListener('DOMLoaded', () => stage.classList.add('loaded'));
    } catch { /* keep the fallback */ }
  });

  return () => { if(anim){ try { anim.destroy(); } catch {} } };
}
