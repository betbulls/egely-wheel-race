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
  else if(path === '/solo') setView(mountSolo);
  else if(path === '/m') setView(mountMeasurementDetail, param);
  else if(path === '/me') setView(mountMeasurements);
  else if(path === '/profile') setView(mountProfile);
  else if(path === '/connect') setView(mountConnect, param);
  else if(path === '/login') setView(mountLogin);
  else if(path === '/sessions') setView(mountSessions);
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
  bleText.textContent = statusText(s);
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
auth.subscribeAuth(a => {
  if(a.user){
    const name = a.displayName || a.email;
    const avatar = a.avatarUrl
      ? `<img class="auth-avatar" src="${esc(a.avatarUrl)}" alt="">`
      : `<span class="auth-avatar auth-avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
    authArea.innerHTML = `<a class="auth-user" href="#/profile" title="Profile">${avatar}<span class="auth-email">${esc(name)}</span></a><button class="auth-btn" id="logoutBtn">Log out</button>`;
    authArea.querySelector('#logoutBtn').addEventListener('click', () => auth.signOut());
    if(location.hash === '#/login') location.hash = '#/home';
  } else {
    authArea.innerHTML = '<a class="auth-btn" href="#/login">Log in</a>';
  }
  updateBleButton();
});

// ---- Boot -------------------------------------------------------------------
window.addEventListener('hashchange', router);
if(!location.hash) location.hash = '#/home';
router();
