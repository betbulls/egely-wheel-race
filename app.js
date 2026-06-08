import * as ble from './ble.js';
import * as auth from './auth.js';
import { mount as mountHome } from './view-home.js';
import { mount as mountSessions } from './view-sessions.js';
import { mount as mountRoom } from './view-room.js';
import { mount as mountSolo } from './view-solo.js';
import { mount as mountMeasurements } from './view-measurements.js';
import { mount as mountMeasurementDetail } from './view-measurement-detail.js';
import { mount as mountProfile } from './view-profile.js';
import { mount as mountConnect } from './view-connect.js';
import { mount as mountClients } from './view-clients.js';
import { mount as mountLeaderboard } from './view-leaderboard.js';
import { mount as mountSessionNew } from './view-session-new.js';
import { mountExperiments, mountExperimentDetail } from './view-experiments.js';
import { mount as mountLive } from './view-live.js';
import * as presence from './presence.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const view = document.getElementById('view');

// ---- Router -----------------------------------------------------------------
// Hash routes: #/sessions, #/room/<id>, #/solo
function parseHash(){
  const raw = location.hash.replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  return { path: '/' + (parts[0] || 'home'), param: parts[1] || null };
}

let cleanup = null;
function setView(mountFn, ...args){
  if(cleanup){ cleanup(); cleanup = null; }
  view.innerHTML = '';
  const res = mountFn(view, ...args);
  if(typeof res === 'function') cleanup = res;
}

function router(){
  const { path, param } = parseHash();
  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === path);
  });
  if(path === '/room') setView(mountRoom, param);
  else if(path === '/live') setView(mountLive);
  else if(path === '/experiments') setView(mountExperiments, param);
  else if(path === '/experiment') setView(mountExperimentDetail, param);
  else if(path === '/solo') setView(mountSolo);
  else if(path === '/m') setView(mountMeasurementDetail, param);
  else if(path === '/me') setView(mountMeasurements);
  else if(path === '/profile') setView(mountProfile);
  else if(path === '/clients') setView(mountClients, param);
  else if(path === '/leaderboard') setView(mountLeaderboard);
  else if(path === '/connect') setView(mountConnect, param);
  else if(path === '/login') setView(mountLogin);
  else if(path === '/sessions'){
    if(param === 'new') setView(mountSessionNew);
    else setView(mountSessions);
  }
  else setView(mountHome);
}

// ---- Login view -------------------------------------------------------------
function mountLogin(el){
  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Log in</h1>
      <p class="page-sub">Log in with your email to measure. Watching is free — no login needed.</p>
    </div>
    <div class="panel">
      <div class="field full">
        <label for="liEmail">Email</label>
        <input id="liEmail" type="email" placeholder="you@example.com" autocomplete="email">
      </div>
      <div class="field full" id="liCodeWrap" hidden>
        <label for="liCode">Login code (from your email)</label>
        <input id="liCode" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="6-digit code">
      </div>
      <div class="form-actions">
        <button id="liSend">Send code</button>
        <button id="liVerify" hidden>Verify &amp; log in</button>
        <span class="form-msg" id="liMsg"></span>
      </div>
      <div class="subscribe-note" id="liSubscribe" hidden></div>
    </div>`;
  const msg = el.querySelector('#liMsg');
  const emailInput = el.querySelector('#liEmail');
  const codeWrap = el.querySelector('#liCodeWrap');
  const codeInput = el.querySelector('#liCode');
  const sendBtn = el.querySelector('#liSend');
  const verifyBtn = el.querySelector('#liVerify');
  const subNote = el.querySelector('#liSubscribe');
  const SUBSCRIBE_URL = 'https://egelywheel.com/products/ewr-subscription';

  sendBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if(!email){ msg.className = 'form-msg err'; msg.textContent = 'Enter your email.'; return; }
    msg.className = 'form-msg'; msg.textContent = 'Checking…';
    sendBtn.disabled = true;
    subNote.hidden = true;

    // Only send a login code to active subscribers.
    const sub = await auth.isSubscriberEmail(email);
    if(sub === false){
      sendBtn.disabled = false;
      msg.textContent = '';
      subNote.hidden = false;
      subNote.innerHTML = `
        <p>This email isn't an active subscriber yet. Subscribe to measure — watching always stays free:</p>
        <a class="btn-join" href="${SUBSCRIBE_URL}" target="_blank" rel="noopener">Subscribe to Egely Wheel</a>`;
      return;
    }

    msg.textContent = 'Sending…';
    const { error } = await auth.signIn(email);
    sendBtn.disabled = false;
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Error: ' + error.message; return; }
    codeWrap.hidden = false;
    verifyBtn.hidden = false;
    sendBtn.textContent = 'Resend code';
    msg.className = 'form-msg ok';
    msg.textContent = 'We sent a 6-digit code to your email. Enter it below.';
    codeInput.focus();
  });

  verifyBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const code = codeInput.value.trim();
    if(!code){ msg.className = 'form-msg err'; msg.textContent = 'Enter the code from your email.'; return; }
    msg.className = 'form-msg'; msg.textContent = 'Verifying…';
    verifyBtn.disabled = true;
    const { error } = await auth.verifyCode(email, code);
    verifyBtn.disabled = false;
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Error: ' + error.message; return; }
    msg.className = 'form-msg ok';
    msg.textContent = 'Logged in!';
  });
}

// ---- Global Egely Wheel status bar ------------------------------------------
const bleBar = document.getElementById('bleBar');
const bleText = document.getElementById('bleText');
const bleBtn = document.getElementById('bleBtn');

function statusText(s){
  if(s.status === 'connected') return 'Egely Wheel connected' + (s.deviceName ? ` · ${s.deviceName}` : '');
  if(s.status === 'connecting') return 'Connecting to Egely Wheel…';
  if(s.status === 'error') return s.errorMsg || 'Connection error';
  return 'Egely Wheel not connected';
}

// Short form for the cramped mobile header — CSS swaps between the two.
function shortStatusText(s){
  if(s.status === 'connected') return 'Connected';
  if(s.status === 'connecting') return 'Connecting…';
  if(s.status === 'error') return 'Error';
  return 'Not connected';
}

// The Connect button is the single gate for measuring (Solo + rooms both use
// the connected wheel). Only logged-in active subscribers can connect.
function updateBleButton(){
  const s = ble.getState();
  const a = auth.getState();
  if(s.connected){ bleBtn.textContent = 'Disconnect'; bleBtn.dataset.mode = 'disconnect'; bleBtn.disabled = false; }
  else if(!a.user){ bleBtn.textContent = 'Log in to measure'; bleBtn.dataset.mode = 'login'; bleBtn.disabled = false; }
  else if(!a.subscriber){ bleBtn.textContent = 'Subscribe to measure'; bleBtn.dataset.mode = 'subscribe'; bleBtn.disabled = false; }
  else { bleBtn.textContent = 'Connect'; bleBtn.dataset.mode = 'connect'; bleBtn.disabled = s.status === 'connecting'; }
}

ble.subscribeStatus(s => {
  bleBar.className = 'ble-bar ' + s.status;
  bleText.innerHTML =
    `<span class="ble-full">${esc(statusText(s))}</span>` +
    `<span class="ble-short">${esc(shortStatusText(s))}</span>`;
  updateBleButton();
});

bleBtn.addEventListener('click', () => {
  const mode = bleBtn.dataset.mode;
  if(mode === 'disconnect') ble.disconnect();
  else if(mode === 'login') location.hash = '#/login';
  else if(mode === 'subscribe') window.open('https://egelywheel.com/products/ewr-subscription', '_blank');
  else ble.connect();
});

// ---- Auth header area -------------------------------------------------------
const authArea = document.getElementById('authArea');

function levelPillHtml(){
  try {
    const stored = localStorage.getItem('ewr_level');
    if(!stored) return '';
    const lv = JSON.parse(stored);
    return `<a class="header-level lv-${lv.idx}" href="#/home" title="Level ${lv.idx} · ${esc(lv.title)}">
      <span class="hl-num">L${lv.idx}</span><span class="hl-name">${esc(lv.title)}</span></a>`;
  } catch { return ''; }
}

function closeAccountMenu(){
  const m = document.getElementById('accountMenu');
  const t = document.getElementById('accountTrigger');
  if(m) m.hidden = true;
  if(t) t.setAttribute('aria-expanded', 'false');
}

// Only one header/FAB overlay may be open at a time, so the screen always has a
// single focus on mobile. Any open path calls this first, then opens its own.
// (closeNavMore / closeFabMenu are function declarations below — hoisted, so
// they're safe to reference here; this only ever runs on a user click.)
function closeAllMenus(){
  closeNavMore();
  closeAccountMenu();
  closeFabMenu();
}

function renderAuthArea(){
  const a = auth.getState();
  if(a.user){
    const name = a.displayName || a.email;
    const avatar = a.avatarUrl
      ? `<img class="auth-avatar" src="${esc(a.avatarUrl)}" alt="">`
      : `<span class="auth-avatar auth-avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
    const clientsItem = a.isPractitioner
      ? `<a href="#/clients" data-route="/clients">Members</a>`
      : '';
    authArea.innerHTML = `
      ${levelPillHtml()}
      <button type="button" class="account-trigger" id="accountTrigger" aria-haspopup="true" aria-expanded="false">
        ${avatar}
        <span class="auth-email">${esc(name)}</span>
        <span class="account-chevron">▾</span>
      </button>
      <div class="account-menu" id="accountMenu" hidden>
        <a href="#/me" data-route="/me">My measurements</a>
        ${clientsItem}
        <a href="#/profile" data-route="/profile">Profile</a>
        <hr>
        <button type="button" id="logoutBtn">Log out</button>
      </div>`;
    const trigger = authArea.querySelector('#accountTrigger');
    const menu = authArea.querySelector('#accountMenu');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = menu.hidden;
      closeAllMenus();
      if(willOpen){
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
    menu.addEventListener('click', (e) => {
      if(e.target.closest('a, button')) closeAccountMenu();
    });
    authArea.querySelector('#logoutBtn').addEventListener('click', () => auth.signOut());
  } else {
    authArea.innerHTML = '<a class="auth-btn" href="#/login">Log in</a>';
  }
  updateBleButton();
}

auth.subscribeAuth(a => {
  if(a.user && location.hash === '#/login'){
    let pending = null;
    try { pending = localStorage.getItem('ewr_pending_connect'); } catch {}
    location.hash = pending ? '#/connect/' + pending : '#/home';
  }
  renderAuthArea();
});

// ---- "More" nav menu (mobile only — surfaces Sessions + Global Ranking) -----
const navMoreBtn = document.getElementById('navMore');
const navMoreMenu = document.getElementById('navMoreMenu');
function closeNavMore(){
  if(navMoreMenu) navMoreMenu.hidden = true;
  if(navMoreBtn) navMoreBtn.setAttribute('aria-expanded', 'false');
}
if(navMoreBtn && navMoreMenu){
  navMoreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = navMoreMenu.hidden;
    closeAllMenus();
    if(willOpen){
      navMoreMenu.hidden = false;
      navMoreBtn.setAttribute('aria-expanded', 'true');
    }
  });
  navMoreMenu.addEventListener('click', (e) => {
    if(e.target.closest('a')) closeNavMore();
  });
}

// Outside-click / Escape close for both header dropdowns.
document.addEventListener('click', (e) => {
  if(navMoreMenu && !navMoreMenu.hidden &&
     !e.target.closest('#navMore') && !e.target.closest('#navMoreMenu')) closeNavMore();
  const accMenu = document.getElementById('accountMenu');
  if(accMenu && !accMenu.hidden &&
     !e.target.closest('#accountTrigger') && !e.target.closest('#accountMenu')) closeAccountMenu();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){ closeNavMore(); closeAccountMenu(); }
});

// Refresh the header pill the instant the dashboard recomputes the level.
window.addEventListener('ewr-level-changed', renderAuthArea);

// ---- Floating Action Button (Start a measurement) ---------------------------
const fab = document.getElementById('fab');
const fabMenu = document.getElementById('fabMenu');
function closeFabMenu(){
  if(!fabMenu) return;
  fabMenu.hidden = true;
  if(fab){ fab.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); }
}
function openFabMenu(){
  if(!fabMenu || !fab) return;
  fabMenu.hidden = false;
  fab.classList.add('open');
  fab.setAttribute('aria-expanded', 'true');
}
if(fab && fabMenu){
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = fabMenu.hidden;
    closeAllMenus();
    if(willOpen) openFabMenu();
  });
  document.addEventListener('click', (e) => {
    if(fabMenu.hidden) return;
    if(e.target.closest('#fab') || e.target.closest('#fabMenu')) return;
    closeFabMenu();
  });
  fabMenu.addEventListener('click', (e) => {
    if(e.target.closest('[data-fab-item]')) closeFabMenu();
  });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeFabMenu();
  });
  // Only show the FAB to logged-in users — measurement requires login anyway.
  auth.subscribeAuth(a => {
    fab.hidden = !a.user;
    if(!a.user) closeFabMenu();
  });
}

// ---- Boot -------------------------------------------------------------------
presence.init();   // app-level Live presence (joins the shared channel)
window.addEventListener('hashchange', router);
if(!location.hash) location.hash = '#/home';
router();
