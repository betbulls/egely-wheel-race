// research-wheel3d.js — the live 3D wheel panel of the Research workbench.
//
// Renders the real Egely Wheel model (assets/egely_wheel_20230814v2.gltf,
// Blender export, embedded textures) and spins its wheel node at the rpm the
// measurement is showing RIGHT NOW — live, in replay, or at the planted cursor.
// The 24-LED vitality scale under the viewport mirrors the device's own dial:
// LED n = n revolutions per minute, red 1-6, yellow 7-12, green 13-24, and the
// active LED flashes on every completed revolution (design-handoff contract —
// the mapping and flash decay come from the handoff driver and are mandatory).
//
// Engineering notes:
//  - three.js is VENDORED (vendor/three.module.js + GLTFLoader) and imported
//    lazily on first open: the app stays buildless and first paint of the
//    Research page costs nothing extra. The 8.5 MB model also only loads then.
//  - The built-in animation clip of the file is KNOWN BAD (it rewinds; see the
//    handoff README) — the wheel is rotated from code, never via the clip.
//  - The stack rebuilds panel DOM on lens changes / reorders, so everything
//    here must survive re-mounts: the loop self-terminates when its canvas
//    leaves the document, and the WebGL context is explicitly released
//    (contexts are a scarce browser resource).

// LED contract from the design handoff (egely-wheel.js) — logic is mandatory,
// presentation follows the app's design system.
export const LED_COUNT = 24;
export const BASELINE_RPM = 6;              // 6 rpm = 100% vitality quotient
const RED_MAX = 6, YELLOW_MAX = 12;
const LED_COLORS = { red: '#ff3e34', yellow: '#ffcd28', green: '#3ae274' };
const WHEEL_NODE = 'Vita_2';                // wheel mesh, child of housing Vita_1
const MODEL_URL = 'assets/egely_wheel_20230814v2.gltf';

const ledColorOf = i => i === 0 ? null : i <= RED_MAX ? LED_COLORS.red : i <= YELLOW_MAX ? LED_COLORS.yellow : LED_COLORS.green;
export const ledIndexOf = rpm => rpm >= 0.5 ? Math.min(LED_COUNT, Math.round(rpm)) : 0;

// The LEDs of the REAL dial live in the housing's 2048x2048 texture atlas in
// TWO places: the flat panel face carries a small socket ring per LED (the
// dial island sits upside-down in the atlas), while each raised dome cap is
// its own UV island (a big circle elsewhere in the atlas). Lighting only the
// socket made a ring glow around a dark dome — the dome island itself must be
// filled for the whole LED to light. Both tables were measured off the actual
// mesh: sockets from the extracted texture; dome islands by walking the
// geometry (vertices near each dome's 3D spot, panel-face UVs excluded).
const LED_TEX = {};    // n -> socket ring {x, y} on the panel face (2048-space)
for(let n = 1; n <= 23; n += 2)  LED_TEX[n] = { x: 1354.9 - (n - 1) / 2 * 36.86, y: 1815.6 };
for(let n = 2; n <= 24; n += 2)  LED_TEX[n] = { x: 1336.2 - (n - 2) / 2 * 36.86, y: 1878.6 };
const LED_DOME = {     // n -> dome cap UV island {x, y, r} (2048-space)
  1:  { x: 1350, y: 117,  r: 59 },  2:  { x: 1937, y: 1832, r: 65 },
  3:  { x: 1930, y: 124,  r: 72 },  4:  { x: 1930, y: 1977, r: 71 },
  5:  { x: 794,  y: 114,  r: 71 },  6:  { x: 803,  y: 1473, r: 71 },
  7:  { x: 1974, y: 1429, r: 71 },  8:  { x: 1946, y: 901,  r: 71 },
  9:  { x: 1922, y: 1674, r: 85 },  10: { x: 1900, y: 1551, r: 77 },
  11: { x: 1966, y: 760,  r: 85 },  12: { x: 1946, y: 613,  r: 71 },
  13: { x: 1925, y: 425,  r: 84 },  14: { x: 1636, y: 1206, r: 71 },
  15: { x: 938,  y: 129,  r: 82 },  16: { x: 1216, y: 113,  r: 72 },
  17: { x: 513,  y: 116,  r: 73 },  18: { x: 1635, y: 106,  r: 71 },
  19: { x: 1075, y: 113,  r: 71 },  20: { x: 1776, y: 99,   r: 71 },
  21: { x: 649,  y: 117,  r: 72 },  22: { x: 1944, y: 292,  r: 72 },
  23: { x: 1494, y: 104,  r: 40 },  24: { x: 1921, y: 1303, r: 62 },
};

let threeMod = null, loaderMod = null, gltfPromise = null;
async function loadThree(){
  if(!threeMod){
    threeMod = await import('./vendor/three.module.js');
    loaderMod = await import('./vendor/GLTFLoader.js');
  }
  return { THREE: threeMod, GLTFLoader: loaderMod.GLTFLoader };
}
// cache the IN-FLIGHT promise, not the resolved value — concurrent mounts
// (lens flip while the 8.5 MB model is still downloading) must share one
// download and one parse; a rejected load clears the slot so Retry can work
function loadGltf(GLTFLoader){
  if(!gltfPromise){
    gltfPromise = new Promise((res, rej) => new GLTFLoader().load(MODEL_URL, res, undefined, rej));
    gltfPromise.catch(() => { gltfPromise = null; });
  }
  return gltfPromise;
}

function ensureStyles(){
  if(document.getElementById('rw3Styles')) return;
  const el = document.createElement('style');
  el.id = 'rw3Styles';
  el.textContent = wheel3dStyles();
  document.head.appendChild(el);
}

// createWheel3d(host, api) — api.rpm() returns the rpm the panel must show.
// Returns { destroy() }. The render loop is rAF and self-terminates when the
// canvas leaves the document (the stack rebuilds DOM on lens/reorder).
export function createWheel3d(host, api){
  ensureStyles();
  host.innerHTML = `
    <div class="rw3-stage"><canvas class="rw3-canvas"></canvas>
      <div class="rw3-note">Loading the 3D model…</div>
      <div class="rw3-hint">drag to turn · Ctrl+scroll to zoom</div>
    </div>
    <div class="rw3-row"><span class="rw3-rpm">—</span><span class="rw3-q">vitality quotient —</span></div>`;
  const canvas = host.querySelector('.rw3-canvas');
  const note = host.querySelector('.rw3-note');
  const rpmEl = host.querySelector('.rw3-rpm');
  const qEl = host.querySelector('.rw3-q');

  // Driver state — the handoff contract: angle accumulates, a completed
  // revolution sets flash to 1, flash decays at 3.2/s (~0.3 s).
  let rpm = 0, angle = 0, flash = 0, dead = false;
  let three = null;   // { renderer, scene, camera, wheelNode, dispose }

  // Minimal orbit: drag rotates around the target; zoom needs Ctrl (or an
  // active drag) so plain scrolling over the stage still scrolls the PAGE, and
  // touch keeps vertical pan for the page (pan-y) while horizontal drags orbit.
  // Deliberately NOT OrbitControls — that traps page scroll wholesale.
  const cam = { az: -38 * Math.PI / 180, pol: 66 * Math.PI / 180, dist: 0.16 };
  const applyCam = () => {
    if(!three) return;
    const t = three.target;
    three.camera.position.set(
      t.x + cam.dist * Math.sin(cam.pol) * Math.sin(cam.az),
      t.y + cam.dist * Math.cos(cam.pol),
      t.z + cam.dist * Math.sin(cam.pol) * Math.cos(cam.az));
    three.camera.lookAt(t.x, t.y, t.z);
  };
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, az: cam.az, pol: cam.pol };
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  canvas.addEventListener('pointermove', e => {
    if(!drag) return;
    cam.az = drag.az - (e.clientX - drag.x) * 0.01;
    cam.pol = Math.min(Math.PI - 0.15, Math.max(0.15, drag.pol - (e.clientY - drag.y) * 0.01));
    applyCam();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', e => {
    if(!(e.ctrlKey || e.metaKey || drag)) return;   // plain scroll belongs to the page
    e.preventDefault();
    cam.dist = Math.min(0.5, Math.max(0.07, cam.dist * (e.deltaY > 0 ? 1.12 : 0.9)));
    applyCam();
  }, { passive: false });
  canvas.style.touchAction = 'pan-y';   // vertical swipe scrolls the page; horizontal drag orbits

  async function init(){
    try {
      const { THREE, GLTFLoader } = await loadThree();
      if(dead) return;
      const gltf = await loadGltf(GLTFLoader);
      if(dead) return;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      const scene = new THREE.Scene();
      // scene stays transparent — the card's own background shows through
      scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 2.0);
      key.position.set(1, 2, 1);
      scene.add(key);
      // clone so several mounts (lens flips, reorders) never fight over one graph
      const model = gltf.scene.clone(true);
      scene.add(model);
      const wheelNode = model.getObjectByName(WHEEL_NODE);

      // ---- LED glow on the housing itself -----------------------------------
      // The dial's LEDs are painted into the baseColor texture; we light one up
      // by drawing a glow dot at its texel onto an emissiveMap. The intensity
      // (uniform, free per frame) carries the revolution flash; the texture is
      // only re-uploaded when the ACTIVE LED changes.
      let housing = null;
      model.traverse(o => { if(o.isMesh && o.material && o.material.name === 'Vitality' && !housing) housing = o; });
      let setLed = null;
      if(housing){
        const mat = housing.material.clone();   // never mutate the shared cached material
        housing.material = mat;
        const ES = 1024;                        // emissiveMap resolution (UVs are normalized)
        const ecv = document.createElement('canvas');
        ecv.width = ES; ecv.height = ES;
        const ectx = ecv.getContext('2d');
        ectx.fillStyle = '#000'; ectx.fillRect(0, 0, ES, ES);
        const etex = new THREE.CanvasTexture(ecv);
        etex.flipY = false;                     // match the GLTF texture convention
        etex.colorSpace = THREE.SRGBColorSpace;
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveMap = etex;
        mat.emissiveIntensity = 0;
        mat.needsUpdate = true;
        let cur = 0;
        const S = ES / 2048;
        setLed = idx => {
          if(idx === cur) return;
          cur = idx;
          ectx.fillStyle = '#000'; ectx.fillRect(0, 0, ES, ES);
          if(idx > 0){
            const col = ledColorOf(idx);
            // 1) the WHOLE dome cap burns: its UV island filled solid, with a
            //    white-hot core so it reads as a lit LED, not a tinted bump
            const d = LED_DOME[idx];
            const dx = d.x * S, dy = d.y * S, dr = (d.r + 6) * S;
            const dome = ectx.createRadialGradient(dx, dy, 0, dx, dy, dr);
            dome.addColorStop(0, '#ffffff');
            dome.addColorStop(0.45, col);
            dome.addColorStop(0.92, col);
            dome.addColorStop(1, 'rgba(0,0,0,0)');
            ectx.fillStyle = dome;
            ectx.beginPath(); ectx.arc(dx, dy, dr, 0, Math.PI * 2); ectx.fill();
            // 2) soft spill onto the panel around the dome's base
            const p = LED_TEX[idx];
            const x = p.x * S, y = p.y * S;
            const halo = ectx.createRadialGradient(x, y, 0, x, y, 14 * S * 2);
            halo.addColorStop(0, col);
            halo.addColorStop(1, 'rgba(0,0,0,0)');
            ectx.globalAlpha = 0.55;
            ectx.fillStyle = halo;
            ectx.beginPath(); ectx.arc(x, y, 14 * S * 2, 0, Math.PI * 2); ectx.fill();
            ectx.globalAlpha = 1;
          }
          etex.needsUpdate = true;
        };
      }

      const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10);
      // aim at the wheel's height (housing origin + 15.4 mm per the handoff)
      three = { renderer, scene, camera, wheelNode, housingMat: housing ? housing.material : null, setLed, target: { x: 0, y: 0.028, z: 0 } };
      applyCam();
      note.remove();
      resize();
    } catch(err){
      console.error('wheel3d:', err);
      if(note) note.textContent = 'Could not load the 3D model (network?). The measurement is unaffected.';
    }
  }

  function resize(){
    if(!three) return;
    const w = host.clientWidth || 300;
    const h = Math.max(200, Math.round(w * 0.62));
    canvas.parentElement.style.height = h + 'px';
    three.renderer.setSize(w, h, false);
    three.camera.aspect = w / h;
    three.camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // The FIGURE and the LED show the measured reading itself; only the rotation
  // is eased. A displayed number must always be a real sample — and before any
  // sample exists the state is unknown, never a fake "0 rpm / still".
  let lastShown;   // undefined ≠ null: the very first paint must run even with no data
  function paintLeds(measured){
    const noData = measured == null;
    const idx = noData ? 0 : ledIndexOf(measured);
    if(three && three.setLed) three.setLed(idx);
    // revolution flash rides on the emissive intensity — a per-frame uniform,
    // no texture upload; base glow between flashes is 50% (handoff contract)
    if(three && three.housingMat) three.housingMat.emissiveIntensity = idx ? (0.6 + 0.4 * flash) * 3.4 : 0;
    const shown = noData ? null : Math.round(measured * 10) / 10;
    if(shown !== lastShown){
      lastShown = shown;
      rpmEl.textContent = noData ? '—' : (shown >= 0.05 ? shown.toFixed(1) + ' rpm' : 'still');
      qEl.textContent = noData ? 'no reading yet' : 'vitality quotient ' + Math.round(measured / BASELINE_RPM * 100) + '%';
    }
  }

  let prev = null;
  function loop(ts){
    if(dead) return;
    if(!canvas.isConnected){ destroy(); return; }   // stack rebuilt under us
    requestAnimationFrame(loop);
    if(host.offsetParent === null){ prev = null; return; }   // panel collapsed: idle
    if(prev == null){ prev = ts; return; }
    const dt = Math.min(0.1, (ts - prev) / 1000);
    prev = ts;
    // ease the ROTATION toward the measured rpm — readings arrive ~every
    // 0.7 s and the real rotor never steps; the printed number stays raw
    const raw = api.rpm();
    const target = raw == null ? 0 : Math.max(0, raw);
    rpm += (target - rpm) * Math.min(1, dt * 5);
    if(rpm < 0.02 && target === 0) rpm = 0;
    const before = angle;
    angle += rpm / 60 * Math.PI * 2 * dt;
    if(Math.floor(angle / (Math.PI * 2)) > Math.floor(before / (Math.PI * 2))) flash = 1;
    flash = Math.max(0, flash - dt * 3.2);
    if(three){
      if(three.wheelNode) three.wheelNode.rotation.y = angle;
      three.renderer.render(three.scene, three.camera);
    }
    paintLeds(raw);
  }

  function destroy(){
    if(dead) return;
    dead = true;
    ro.disconnect();
    if(three){
      three.renderer.dispose();
      // actively release the WebGL context — browsers cap the live count
      const gl = three.renderer.getContext();
      const lose = gl && gl.getExtension('WEBGL_lose_context');
      if(lose) lose.loseContext();
      three = null;
    }
  }

  init();
  requestAnimationFrame(loop);
  return { destroy };
}

export function wheel3dStyles(){
  return `
  .rw3-stage{position:relative;width:100%;background:radial-gradient(ellipse at 50% 40%, #f2f4f6, #e7ebee);border-radius:12px;overflow:hidden}
  .rw3-canvas{display:block;width:100%;height:100%;cursor:grab}
  .rw3-canvas:active{cursor:grabbing}
  .rw3-note{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    color:#67737c;font-size:12.5px;pointer-events:none}
  .rw3-hint{position:absolute;left:10px;bottom:8px;color:#99a2a7;font-size:10.5px;pointer-events:none}
  .rw3-row{display:flex;align-items:baseline;gap:14px;margin:10px 2px 0}
  .rw3-rpm{font-family:'Montserrat',sans-serif;font-weight:800;font-size:20px;color:#011624;
    font-variant-numeric:tabular-nums}
  .rw3-q{color:#67737c;font-size:12.5px;font-variant-numeric:tabular-nums}
  `;
}
