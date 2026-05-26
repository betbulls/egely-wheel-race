import * as ble from './ble.js';
import * as auth from './auth.js';
import { mount as mountHome } from './view-home.js';
import { mount as mountSessions } from './view-sessions.js';
import { mount as mountRoom } from './view-room.js';
import { mount as mountSolo } from './view-solo.js';
import { mount as mountMeasurements } from './view-measurements.js';
import { mount as mountMeasurementDetail } from './view-measurement-detail.js';

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
      <div class="form-actions">
        <button id="liSend">Send login link</button>
        <span class="form-msg" id="liMsg"></span>
      </div>
    </div>`;
  const msg = el.querySelector('#liMsg');
  el.querySelector('#liSend').addEventListener('click', async () => {
    const email = el.querySelector('#liEmail').value.trim();
    if(!email){ msg.className = 'form-msg err'; msg.textContent = 'Enter your email.'; return; }
    msg.className = 'form-msg'; msg.textContent = 'Sending…';
    const { error } = await auth.signIn(email);
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Error: ' + error.message; return; }
    msg.className = 'form-msg ok';
    msg.textContent = 'Check your email for the login link.';
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

ble.subscribeStatus(s => {
  bleBar.className = 'ble-bar ' + s.status;
  bleText.textContent = statusText(s);
  bleBtn.textContent = s.connected ? 'Disconnect' : 'Connect';
  bleBtn.disabled = s.status === 'connecting';
});

bleBtn.addEventListener('click', () => {
  if(ble.getState().connected) ble.disconnect();
  else ble.connect();
});

// ---- Auth header area -------------------------------------------------------
const authArea = document.getElementById('authArea');
auth.subscribeAuth(user => {
  if(user){
    authArea.innerHTML = `<span class="auth-email" title="${user.email}">${user.email}</span><button class="auth-btn" id="logoutBtn">Log out</button>`;
    authArea.querySelector('#logoutBtn').addEventListener('click', () => auth.signOut());
    if(location.hash === '#/login') location.hash = '#/home';
  } else {
    authArea.innerHTML = '<a class="auth-btn" href="#/login">Log in</a>';
  }
});

// ---- Boot -------------------------------------------------------------------
window.addEventListener('hashchange', router);
if(!location.hash) location.hash = '#/home';
router();
