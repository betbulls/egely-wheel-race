import * as ble from './ble.js';
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
  else if(path === '/sessions') setView(mountSessions);
  else setView(mountHome);
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

// ---- Boot -------------------------------------------------------------------
window.addEventListener('hashchange', router);
if(!location.hash) location.hash = '#/home';
router();
