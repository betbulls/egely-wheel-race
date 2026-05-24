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
    device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'Egely' }, { services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });
    device.addEventListener('gattserverdisconnected', onDisconnect);
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    txChar = await service.getCharacteristic(TX_CHAR_UUID);
    await txChar.startNotifications();
    txChar.addEventListener('characteristicvaluechanged', onData);
    buffer = '';
    status = 'connected'; emitStatus();
  } catch(err){
    status = 'error'; errorMsg = err.message; emitStatus();
  }
}

export function disconnect(){
  if(device && device.gatt && device.gatt.connected) device.gatt.disconnect();
  else onDisconnect();
}

function onDisconnect(){
  device = null; txChar = null; buffer = '';
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
