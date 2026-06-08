// Shared, persistent Egely Wheel Bluetooth connection manager.
// Lives for the lifetime of the SPA, so the connection survives view changes.
// Protocol: Microchip Transparent UART.
//   Service:  49535343-FE7D-4AE5-8FA9-9FAFD205E455
//   TX (notify, wheel -> us): 49535343-1E4D-4BD9-BA61-23C647249616
// Frame format: "counterMsb,counterLsb|led,battery|hwVer,fwVer\n"

const SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const TX_CHAR_UUID = '49535343-1e4d-4bd9-ba61-23c647249616';

let device = null;
let txChar = null;
let buffer = '';
let status = 'idle';          // 'idle' | 'connecting' | 'connected' | 'error'
let errorMsg = null;
let lastFrame = null;         // last parsed frame

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

export function getState(){
  return {
    status,
    connected: status === 'connected',
    deviceName: device ? (device.name || null) : null,
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

export async function connect(){
  if(!navigator.bluetooth){
    status = 'error';
    errorMsg = 'Web Bluetooth is not available (needs HTTPS + Chrome/Edge).';
    emitStatus();
    return;
  }
  try {
    status = 'connecting'; errorMsg = null; emitStatus();
    // Why acceptAllDevices instead of filters:
    // The Egely Wheel (Microchip Transparent UART module) does NOT put its
    // 128-bit service UUID in the advertising packet, so a `{ services: [...] }`
    // filter never matches it on scan. Desktop Chrome found it only via the
    // `namePrefix: 'Egely'` filter — but iOS/Bluefy doesn't return the device
    // name during scan, so BOTH filter branches missed and the picker came up
    // empty. Showing all devices is the only approach that works cross-platform
    // (it mirrors the Google Web Bluetooth sample, which did see the wheel on
    // iPhone). The user picks the wheel; we still verify by fetching the UART
    // service after connecting, so a wrong pick simply fails fast below.
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID],
    });
    device.addEventListener('gattserverdisconnected', onDisconnect);
    const server = await device.gatt.connect();
    let service;
    try {
      service = await server.getPrimaryService(SERVICE_UUID);
    } catch {
      // Picked a device that isn't an Egely Wheel (possible now that the picker
      // lists everything). Disconnect and guide the user back to the right one.
      try { server.disconnect(); } catch {}
      device = null;
      throw new Error('That device is not an Egely Wheel. Turn the wheel ON and pick it from the list.');
    }
    txChar = await service.getCharacteristic(TX_CHAR_UUID);
    await txChar.startNotifications();
    txChar.addEventListener('characteristicvaluechanged', onData);
    buffer = ''; cleanLed = null;     // fresh spike-filter state for the new session
    status = 'connected'; emitStatus();
  } catch(err){
    // Cancelling the device picker (or no device chosen) isn't an error — just
    // return to idle without a scary banner.
    if(err && err.name === 'NotFoundError'){
      status = 'idle'; errorMsg = null;
    } else {
      status = 'error'; errorMsg = err.message;
    }
    emitStatus();
  }
}

export function disconnect(){
  if(device && device.gatt && device.gatt.connected) device.gatt.disconnect();
  else onDisconnect();
}

function onDisconnect(){
  device = null; txChar = null; buffer = ''; cleanLed = null;
  status = 'idle';
  emitStatus();
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
