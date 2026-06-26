// Shared, persistent Egely Wheel Bluetooth connection manager.
// Lives for the lifetime of the SPA, so the connection survives view changes.
// Protocol: Microchip Transparent UART.
//   Service:  49535343-FE7D-4AE5-8FA9-9FAFD205E455
//   TX (notify, wheel -> us): 49535343-1E4D-4BD9-BA61-23C647249616
// Frame format: "counterMsb,counterLsb|led,battery|hwVer,fwVer\n"
//
// "Remember my wheel" / best-effort auto-reconnect:
//   Web Bluetooth deliberately gates pairing: the FIRST connect always needs a
//   user gesture (requestDevice + the chooser). Once granted, the page may
//   reconnect WITHOUT a chooser — via the in-memory `device` object (survives
//   view changes in this SPA) or, across a reload, via getDevices().
//
//   Policy (deliberately conservative, so this never makes Bluetooth WORSE):
//     - SILENT auto-reconnect only IN-SESSION: when an already-connected wheel
//       drops (out of range, screen lock, tab backgrounded), we keep the device
//       handle and retry gatt.connect() with backoff, and also on focus /
//       visibility / network return — but only within RECENT_MS of the last live
//       connection, and never while the tab is hidden, so a wheel left off does
//       not grind the radio forever.
//     - After a full RELOAD (no in-memory device) we do NOT silently power the
//       wheel on; the header shows a one-tap, chooser-free "Reconnect" instead,
//       so merely opening the site to browse never puts you on-air.
//     - NEVER auto-reconnect after the user pressed Disconnect.
//   Best-effort, not a native-app forever connection: out of range, a dead
//   battery, or an OS that suspends Bluetooth in the background can still drop
//   it — and then we recover when the wheel/page comes back.

const SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const TX_CHAR_UUID = '49535343-1e4d-4bd9-ba61-23c647249616';

const REMEMBER_KEY = 'ewr_ble_wheel';   // localStorage: minimal, non-sensitive meta
const RECONNECT_DELAYS = [400, 800, 1500, 3000, 5000, 8000];  // backoff schedule
const RECONNECT_CAP = 10000;            // delay cap once the schedule runs out
const RECONNECT_BUDGET_MS = 60000;      // how long one loud reconnect burst keeps trying
const CONNECT_TIMEOUT_MS = 12000;       // bound a wedged gatt.connect so it can't hang forever
const RECENT_MS = 15 * 60 * 1000;       // auto-reconnect only this long after the last live link
const KEEPALIVE_MIN = 30000;            // gentle background retry of an in-session dropped wheel
const KEEPALIVE_MAX = 300000;           // ...backing off to this when it keeps failing

let device = null;
let txChar = null;
let buffer = '';
let status = 'idle';          // 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'
let errorMsg = null;
let lastFrame = null;         // last parsed frame
let lastConnectedTs = 0;      // when we were last truly connected (gates auto-reconnect recency)

let manualDisconnect = false; // user pressed Disconnect -> no auto-reconnect
let attempting = false;       // single-flight: an establish attempt is running (any path)
let attemptGen = 0;           // bumped to supersede/cancel any in-flight attempt
let keepaliveDelay = KEEPALIVE_MIN;
let keepaliveTimer = null;

// --- Spike filter -----------------------------------------------------------
// Known PIC hardware glitch: the wheel (often when idle) suddenly reports the
// top rail (24) for a few frames, then drops back to baseline. A real reading
// never teleports into the top zone in one ~700ms frame — it ramps through the
// middle. So: hold the last clean value through any sudden jump INTO the rail,
// and resume once the signal returns to a plausible value. The drop back to a
// low value is always accepted, so the filter can never get stuck high.
const SPIKE_RAIL = 22;        // top zone the glitch pins to
const SPIKE_JUMP = 10;        // a single-frame jump this big into the rail = glitch
let cleanLed = null;          // last accepted (de-spiked) LED value
function despike(raw){
  if(cleanLed === null){ cleanLed = raw; return cleanLed; }
  const glitch = raw >= SPIKE_RAIL && (raw - cleanLed) >= SPIKE_JUMP;
  if(!glitch) cleanLed = raw;
  return cleanLed;
}

const statusListeners = new Set();
const frameListeners = new Set();

function isGetDevices(){ return !!(navigator.bluetooth && navigator.bluetooth.getDevices); }
function recentlyConnected(){ return lastConnectedTs > 0 && (Date.now() - lastConnectedTs) < RECENT_MS; }

export function getState(){
  return {
    status,
    connected: status === 'connected',
    reconnecting: status === 'reconnecting',
    deviceName: device ? (device.name || null) : null,
    remembered: !!getRemembered(),
    // Whether a chooser-free reconnect is even possible (in-memory device, or a
    // usable remembered wheel on a browser that supports getDevices). Drives the
    // header showing "Reconnect" vs "Connect".
    canReconnect: !!device || (hasUsableRemembered() && isGetDevices()),
    errorMsg,
    lastFrame,
  };
}

// Subscribe to connection-status changes. Fires immediately with current state.
export function subscribeStatus(cb){
  statusListeners.add(cb);
  cb(getState());
  return () => statusListeners.delete(cb);
}

// Subscribe to parsed measurement frames.
export function subscribeFrames(cb){
  frameListeners.add(cb);
  return () => frameListeners.delete(cb);
}

function emitStatus(){
  const s = getState();
  statusListeners.forEach(cb => cb(s));
}

// --- Remembered wheel (localStorage) ----------------------------------------
// Only persist a record we can actually match later (id or name). A record with
// neither would surface a "Reconnect" button that can never find the device.
function remember(dev){
  if(!dev || (!dev.id && !dev.name)) return;
  try { localStorage.setItem(REMEMBER_KEY, JSON.stringify({ id: dev.id || null, name: dev.name || null, ts: Date.now() })); } catch {}
}
function forget(){
  try { localStorage.removeItem(REMEMBER_KEY); } catch {}
}
function getRemembered(){
  try { return JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null'); } catch { return null; }
}
function hasUsableRemembered(){
  const r = getRemembered();
  return !!(r && (r.id || r.name));
}

// --- Device binding ---------------------------------------------------------
// The 'gattserverdisconnected' listener is attached exactly once per device.
function clearDevice(){
  if(device){ try { device.removeEventListener('gattserverdisconnected', onDisconnect); } catch {} }
}
function bindDevice(dev){
  clearDevice();
  device = dev;
  device.addEventListener('gattserverdisconnected', onDisconnect);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Reject `p` after `ms` (running onTimeout to abort the underlying work), so a
// wedged BLE stack can never leave us hanging in 'connecting'/'reconnecting'.
function withTimeout(p, ms, onTimeout){
  let t;
  const timer = new Promise((_, rej) => { t = setTimeout(() => { try { onTimeout && onTimeout(); } catch {} rej(new Error('BLE connect timed out')); }, ms); });
  return Promise.race([p, timer]).finally(() => clearTimeout(t));
}

// Open GATT + notifications on `dev` and return the link WITHOUT touching module
// state. Pure on purpose: a superseded/cancelled attempt can be discarded (and
// its GATT torn down) without ever clobbering a live connection. Tears the link
// down itself on ANY failure, so it never leaves a half-open GATT.
async function openLink(dev){
  const server = await withTimeout(dev.gatt.connect(), CONNECT_TIMEOUT_MS, () => { try { dev.gatt.disconnect(); } catch {} });
  try {
    const service = await server.getPrimaryService(SERVICE_UUID);
    const char = await service.getCharacteristic(TX_CHAR_UUID);
    await char.startNotifications();
    return { server, char };
  } catch(err){
    try { server.disconnect(); } catch {}
    if(err && err.name === 'NotFoundError'){
      // The service lookup failing means this isn't an Egely Wheel (possible
      // since the picker lists everything). Give the user a clear nudge.
      throw new Error('That device is not an Egely Wheel. Turn the wheel ON and pick it from the list.');
    }
    throw err;
  }
}

// Commit a freshly-opened link as the live connection. Only the generation
// winner calls this. Swaps the frame listener so we never double-count frames.
function commitLink(link){
  if(txChar){ try { txChar.removeEventListener('characteristicvaluechanged', onData); } catch {} }
  txChar = link.char;
  txChar.addEventListener('characteristicvaluechanged', onData);
  buffer = ''; cleanLed = null;     // fresh spike-filter state for the new session
  remember(device);
  lastConnectedTs = Date.now();
  status = 'connected'; errorMsg = null; emitStatus();
}

// Supersede any in-flight attempt: bump the generation (so it bails on its next
// await) AND release the mutex now, so a fresh attempt can start immediately
// instead of waiting for the old loop to wake from a throttled backoff sleep.
// The gen-gated `finally` clauses guarantee the old loop won't clear the new
// attempt's `attempting` flag.
function cancelAttempt(){ attemptGen++; attempting = false; }

// Find the remembered wheel among already-granted devices (no chooser). Needs
// getDevices() — absent on iOS/Bluefy, where this is a no-op (in-session
// reconnect still works via the in-memory `device`). Only ever binds the wheel
// we actually remember, and never an ambiguous name match.
async function acquireDeviceIfNeeded(){
  if(device) return true;
  if(!isGetDevices()) return false;
  const rem = getRemembered();
  if(!rem || (!rem.id && !rem.name)) return false;
  try {
    const devs = await navigator.bluetooth.getDevices();
    let dev = rem.id ? devs.find(d => d.id === rem.id) : null;
    if(!dev && rem.name){
      // Name is a weak key — only trust it when it identifies exactly one device.
      const named = devs.filter(d => d.name && d.name === rem.name);
      if(named.length === 1) dev = named[0];
    }
    if(!dev) return false;
    bindDevice(dev);
    return true;
  } catch { return false; }
}

// --- Manual connect (the only path that opens the chooser) ------------------
export async function connect(){
  if(!navigator.bluetooth){
    status = 'error';
    errorMsg = 'Web Bluetooth is not available (needs HTTPS + Chrome/Edge).';
    emitStatus();
    return;
  }
  manualDisconnect = false;
  cancelAttempt();                       // supersede any in-flight auto-reconnect
  status = 'connecting'; errorMsg = null; emitStatus();

  let dev;
  try {
    // requestDevice() needs transient user activation, so it MUST run before any
    // await in the click. Why acceptAllDevices instead of filters: the Egely
    // Wheel (Microchip Transparent UART) does NOT advertise its 128-bit service
    // UUID, so a `{ services: [...] }` filter never matches on scan; iOS/Bluefy
    // also withholds the name during scan, so a namePrefix filter misses too.
    // Showing all devices is the only cross-platform approach (mirrors the
    // Google Web Bluetooth sample). We verify by fetching the UART service after
    // connecting, so a wrong pick fails fast in openLink().
    dev = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID],
    });
  } catch(err){
    // Cancelling the picker (NotFoundError) isn't an error — just return to idle.
    if(err && err.name === 'NotFoundError'){ status = 'idle'; errorMsg = null; }
    else { status = 'error'; errorMsg = err.message; }
    emitStatus();
    return;
  }

  // Now (after the gesture is spent) let any still-in-flight auto attempt unwind
  // so we don't run two gatt operations at once.
  for(let i = 0; attempting && i < 60; i++) await sleep(50);   // bounded ≤3s
  const gen = ++attemptGen;
  attempting = true;
  try {
    bindDevice(dev);
    const link = await openLink(dev);
    if(gen !== attemptGen || manualDisconnect){ try { link.server.disconnect(); } catch {} return; }
    commitLink(link);
  } catch(err){
    if(gen !== attemptGen) return;
    // A wrong/failed pick leaves no usable connection — drop the handle so the
    // auto-reconnect machinery never targets a non-wheel.
    clearDevice(); device = null; txChar = null;
    status = 'error'; errorMsg = err.message; emitStatus();
  } finally {
    if(gen === attemptGen) attempting = false;   // only the current owner releases the mutex
  }
}

// --- Manual disconnect (stops all auto-reconnect, forgets the wheel) --------
export function disconnect(){
  manualDisconnect = true;
  cancelAttempt();
  forget();
  if(device && device.gatt && device.gatt.connected) device.gatt.disconnect();
  else onDisconnect();
}

// --- Stop an in-progress reconnect WITHOUT forgetting the wheel -------------
// The header's "Stop" (shown during 'reconnecting') means "quit retrying for
// now", not "forget my wheel" — so unlike disconnect() it keeps the remembered
// device and the one-tap Reconnect affordance.
export function stopReconnect(){
  manualDisconnect = true;        // halt auto-reconnect until the user re-initiates
  cancelAttempt();
  if(status === 'reconnecting' || status === 'connecting'){ status = 'idle'; emitStatus(); }
}

// --- "Reconnect" affordance (header button) ---------------------------------
// User-initiated and chooser-free when possible; falls back to the chooser if
// no chooser-free path exists.
export function reconnect(){
  manualDisconnect = false;
  armKeepalive();
  if(device || isGetDevices()) loudReconnect(true);
  else connect();
}

// Fired by the OS when the GATT link drops (our own gatt.disconnect() and an
// unexpected drop both route here).
function onDisconnect(){
  txChar = null; buffer = ''; cleanLed = null; lastFrame = null;
  if(manualDisconnect){
    clearDevice(); device = null;
    cancelAttempt();
    status = 'idle'; emitStatus();
    return;
  }
  // Unexpected in-session drop — keep the device handle and get it back.
  // Drop the now-stale 'connected'/'connecting' first, or loudReconnect's own
  // guard would see a live connection and refuse to retry. No emit here —
  // loudReconnect emits the single 'reconnecting' transition.
  if(status === 'connected' || status === 'connecting') status = 'reconnecting';
  armKeepalive();
  loudReconnect(false);
}

// Loud reconnect: shows 'reconnecting' and retries with backoff for one budget
// window. allowAcquire=true permits a chooser-free getDevices lookup (the
// explicit Reconnect button); automatic triggers pass false so they only revive
// an in-session device still in memory. Status is emitted ONCE on entry and
// ONCE on resolve — never per retry — so subscribers don't churn on backoff.
async function loudReconnect(allowAcquire){
  if(attempting || manualDisconnect) return;
  if(status === 'connected' || status === 'connecting') return;
  if(!device && !allowAcquire) return;
  if(!device && !hasUsableRemembered()) return;

  const gen = ++attemptGen;
  attempting = true;
  status = 'reconnecting'; errorMsg = null; emitStatus();
  try {
    if(!device){
      const ok = await acquireDeviceIfNeeded();
      if(gen !== attemptGen) return;
      if(!ok){
        // An explicit Reconnect that can't find the granted wheel (revoked
        // permission, OS-unpaired) must not dead-end on a button that keeps
        // doing nothing — forget it so the header offers the chooser instead.
        if(allowAcquire) forget();
        status = 'idle'; emitStatus();
        return;
      }
    }
    const start = Date.now();
    let i = 0;
    while(gen === attemptGen && !manualDisconnect){
      await sleep(RECONNECT_DELAYS[i] ?? RECONNECT_CAP);
      if(gen !== attemptGen) return;                 // superseded mid-wait
      if(manualDisconnect) break;
      // Budget bounds the burst regardless of visibility, so a tab left hidden
      // doesn't pin 'reconnecting' + the mutex forever — it returns to idle and
      // the next focus/visibility trigger starts a fresh burst.
      if(Date.now() - start > RECONNECT_BUDGET_MS) break;
      // Don't burn the radio attempting while backgrounded — it would just fail.
      // We resume on a fresh visibility/focus trigger after this burst ends.
      if(typeof document !== 'undefined' && document.visibilityState === 'hidden'){ i++; continue; }
      try {
        if(!device) break;
        const link = await openLink(device);
        if(gen !== attemptGen || manualDisconnect){ try { link.server.disconnect(); } catch {} return; }
        commitLink(link);
        return;
      } catch { /* still down — keep trying within budget */ }
      i++;
    }
    if(gen === attemptGen && status === 'reconnecting'){ status = 'idle'; emitStatus(); }
  } finally {
    if(gen === attemptGen) attempting = false;   // only the current owner releases the mutex
  }
}

// Quiet attempt: a single chooser-free reconnect of an IN-SESSION wheel that
// stays invisible unless it succeeds. Used only by the keepalive (never on
// boot), so a backgrounded/idle page never silently powers a wheel on.
async function quietAttempt(){
  if(attempting || manualDisconnect) return;
  if(status === 'connected' || status === 'connecting' || status === 'reconnecting') return;
  if(!device) return;
  const gen = ++attemptGen;
  attempting = true;
  try {
    const link = await openLink(device);
    if(gen !== attemptGen || manualDisconnect){ try { link.server.disconnect(); } catch {} return; }
    commitLink(link);
  } catch { /* stay idle, silently */ }
  finally { if(gen === attemptGen) attempting = false; }
}

// Gentle background safety-net: retry an in-session dropped wheel while the tab
// is visible AND the link was live recently, backing off as it keeps failing.
// Once a wheel has been unreachable past RECENT_MS it stops doing radio work
// (a user gesture or a fresh drop re-arms it), so a wheel left off never grinds.
async function keepaliveTick(){
  keepaliveTimer = null;
  if(document.visibilityState === 'visible' && device && !manualDisconnect && recentlyConnected() &&
     status !== 'connected' && status !== 'connecting' && status !== 'reconnecting'){
    await quietAttempt();
    keepaliveDelay = (status === 'connected') ? KEEPALIVE_MIN : Math.min(keepaliveDelay * 2, KEEPALIVE_MAX);
  } else {
    keepaliveDelay = KEEPALIVE_MIN;
  }
  scheduleKeepalive();
}
function scheduleKeepalive(){
  if(keepaliveTimer) return;
  keepaliveTimer = setTimeout(keepaliveTick, keepaliveDelay);
}
function armKeepalive(){ keepaliveDelay = KEEPALIVE_MIN; }   // reset cadence on user activity

// Automatic trigger: only revive an in-session device still in memory, and only
// within RECENT_MS of the last live link, so casually refocusing the tab hours
// later never kicks a radio burst for a wheel that's long gone.
function autoReconnect(){
  if(device && recentlyConnected()){ armKeepalive(); loudReconnect(false); }
}

function onData(event){
  buffer += new TextDecoder().decode(event.target.value);
  while(true){
    const idx = buffer.indexOf('\n');
    if(idx === -1) break;
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    const frame = parseLine(line);
    if(frame){
      frame.rawLed = frame.led;        // keep the raw value (debugging)
      frame.led = despike(frame.led);  // everything downstream uses the de-spiked value
      lastFrame = frame;
      frameListeners.forEach(cb => cb(frame));
    }
  }
  if(buffer.length > 200) buffer = buffer.slice(-200);
}

function parseLine(line){
  line = line.trim();
  if(!line) return null;
  const parts = line.split('|');
  if(parts.length !== 3) return null;
  const c = parts[0].split(',');
  if(c.length !== 2) return null;
  const counterMsb = parseInt(c[0], 10);
  const counterLsb = parseInt(c[1], 10);
  if(isNaN(counterMsb) || isNaN(counterLsb)) return null;
  const counter = (counterMsb << 8) | counterLsb;
  const ledParts = parts[1].split(',');
  if(ledParts.length !== 2) return null;
  const led = parseInt(ledParts[0], 10);
  const battery = ledParts[1];
  if(isNaN(led) || led < 0 || led > 24) return null;
  const verParts = parts[2].split(',');
  return {
    counter, counterMsb, counterLsb, led, battery,
    hw: verParts[0] || '', fw: verParts[1] || '', raw: line,
  };
}

// --- Auto-reconnect triggers (best-effort, all guarded + no-op when idle) ----
if(typeof document !== 'undefined'){
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') autoReconnect(); });
}
if(typeof window !== 'undefined'){
  window.addEventListener('focus', autoReconnect);
  window.addEventListener('online', autoReconnect);
  window.addEventListener('pageshow', autoReconnect);
  scheduleKeepalive();
}
