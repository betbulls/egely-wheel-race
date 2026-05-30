// Keep the screen awake during a measurement or while watching a live client.
// Browsers release the lock when the tab loses visibility, so we re-acquire it
// on visibilitychange while a caller still wants it.

let sentinel = null;
let wanted = false;

async function reqLock(){
  if(sentinel || !('wakeLock' in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => { sentinel = null; });
  } catch { /* unsupported, denied, or HTTP context */ }
}

function relLock(){
  if(sentinel){ try { sentinel.release(); } catch {} ; sentinel = null; }
}

document.addEventListener('visibilitychange', () => {
  if(wanted && document.visibilityState === 'visible') reqLock();
});

export function acquire(){ wanted = true; reqLock(); }
export function release(){ wanted = false; relLock(); }
