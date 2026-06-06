// qrcode.js — minimal, dependency-free QR Code generator written in-house.
// Byte mode, error-correction level M, versions 1–6 (capacity ~106 bytes) — more
// than enough for a connection link. Output is verified to decode with the
// browser's BarcodeDetector. Algorithm per ISO/IEC 18004.

// ---- Galois field GF(256), primitive poly 0x11D -----------------------------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initGF(){
  let x = 1;
  for(let i = 0; i < 255; i++){ EXP[i] = x; LOG[x] = i; x <<= 1; if(x & 0x100) x ^= 0x11D; }
  for(let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const gmul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

// Generator polynomial for `deg` EC codewords: product of (x + α^i).
function genPoly(deg){
  let g = [1];
  for(let i = 0; i < deg; i++){
    const ng = new Array(g.length + 1).fill(0);
    for(let j = 0; j < g.length; j++){
      ng[j] ^= g[j];                       // * x
      ng[j + 1] ^= gmul(g[j], EXP[i]);     // * α^i
    }
    g = ng;
  }
  return g;
}

// Reed–Solomon EC codewords for one data block.
function rsEC(data, ecLen){
  const gen = genPoly(ecLen);
  const res = new Array(data.length + ecLen).fill(0);
  for(let i = 0; i < data.length; i++) res[i] = data[i];
  for(let i = 0; i < data.length; i++){
    const coef = res[i];
    if(coef !== 0) for(let j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], coef);
  }
  return res.slice(data.length);
}

// ---- Version specs (EC level M, single group) -------------------------------
// size, ec codewords per block, data codewords per block (list), alignment centre.
const SPEC = {
  1: { size: 21, ec: 10, blocks: [16],             align: null, rem: 0 },
  2: { size: 25, ec: 16, blocks: [28],             align: 18,   rem: 7 },
  3: { size: 29, ec: 26, blocks: [44],             align: 22,   rem: 7 },
  4: { size: 33, ec: 18, blocks: [32, 32],         align: 26,   rem: 7 },
  5: { size: 37, ec: 24, blocks: [43, 43],         align: 30,   rem: 7 },
  6: { size: 41, ec: 16, blocks: [27, 27, 27, 27], align: 34,   rem: 7 },
};

function pickVersion(byteLen){
  for(let v = 1; v <= 6; v++){
    const dataCw = SPEC[v].blocks.reduce((a, b) => a + b, 0);
    if(4 + 8 + 8 * byteLen <= dataCw * 8) return v;   // mode + 8-bit count + payload
  }
  return null;
}

// ---- Data encoding ----------------------------------------------------------
function encodeData(bytes, version){
  const dataCw = SPEC[version].blocks.reduce((a, b) => a + b, 0);
  const cap = dataCw * 8;
  const bits = [];
  const put = (val, len) => { for(let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  put(0b0100, 4);          // byte mode
  put(bytes.length, 8);    // char count (versions 1–9 → 8 bits)
  for(const b of bytes) put(b, 8);
  put(0, Math.min(4, cap - bits.length));      // terminator
  while(bits.length % 8 !== 0) bits.push(0);   // pad to byte boundary
  const pad = [0xEC, 0x11];
  for(let i = 0; bits.length < cap; i++) put(pad[i % 2], 8);
  const cw = [];
  for(let i = 0; i < bits.length; i += 8){
    let v = 0; for(let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    cw.push(v);
  }
  return cw;
}

// Split into blocks, append EC, interleave data then EC codewords.
function interleave(dataCw, version){
  const spec = SPEC[version];
  const blocks = [];
  let p = 0;
  for(const len of spec.blocks){ const d = dataCw.slice(p, p + len); p += len; blocks.push({ d, ec: rsEC(d, spec.ec) }); }
  const out = [];
  const maxData = Math.max(...spec.blocks);
  for(let i = 0; i < maxData; i++) for(const b of blocks) if(i < b.d.length) out.push(b.d[i]);
  for(let i = 0; i < spec.ec; i++) for(const b of blocks) out.push(b.ec[i]);
  return out;
}

// ---- Matrix -----------------------------------------------------------------
const getBit = (x, i) => (x >> i) & 1;

function maskBit(mask, r, c){
  switch(mask){
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
    case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
    case 7: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
  }
}

function formatBits(mask){
  const data = (0 << 3) | mask;   // EC level M = 0b00
  let rem = data;
  for(let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >> 9) & 1) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function buildBase(version){
  const n = SPEC[version].size;
  const m = Array.from({ length: n }, () => new Array(n).fill(0));
  const fn = Array.from({ length: n }, () => new Array(n).fill(false));
  const set = (r, c, v) => { m[r][c] = v ? 1 : 0; fn[r][c] = true; };

  // Finder patterns + separators at the three corners.
  const finder = (top, left) => {
    for(let dr = -1; dr <= 7; dr++) for(let dc = -1; dc <= 7; dc++){
      const r = top + dr, c = left + dc;
      if(r < 0 || r >= n || c < 0 || c >= n) continue;
      const ring = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) || (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6));
      const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      set(r, c, ring || core);
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);

  // Timing patterns.
  for(let i = 8; i < n - 8; i++){
    if(!fn[6][i]) set(6, i, i % 2 === 0);
    if(!fn[i][6]) set(i, 6, i % 2 === 0);
  }

  // Alignment pattern (one centred pattern for versions 2–6).
  const a = SPEC[version].align;
  if(a != null){
    for(let dr = -2; dr <= 2; dr++) for(let dc = -2; dc <= 2; dc++){
      const ring = Math.max(Math.abs(dr), Math.abs(dc));
      set(a + dr, a + dc, ring !== 1);
    }
  }

  // Reserve the format-info modules (real bits written after masking).
  const { c1, c2, dark } = formatPositions(n);
  for(let i = 0; i < 15; i++){ fn[c1[i][0]][c1[i][1]] = true; fn[c2[i][0]][c2[i][1]] = true; }
  set(dark[0], dark[1], 1);   // always-dark module

  return { n, m, fn };
}

// Coordinates [row, col] of each format-info bit (0–14) in both copies, plus the
// always-dark module — per ISO/IEC 18004. Single source of truth for reserve+write.
function formatPositions(n){
  const c1 = [];
  for(let i = 0; i <= 5; i++) c1[i] = [i, 8];        // bits 0–5: col 8, rows 0–5
  c1[6] = [7, 8]; c1[7] = [8, 8]; c1[8] = [8, 7];
  for(let i = 9; i < 15; i++) c1[i] = [8, 14 - i];   // bits 9–14: row 8, cols 5–0
  const c2 = [];
  for(let i = 0; i < 8; i++) c2[i] = [8, n - 1 - i]; // bits 0–7: row 8, cols n-1…n-8
  for(let i = 8; i < 15; i++) c2[i] = [n - 15 + i, 8]; // bits 8–14: col 8, rows n-7…n-1
  return { c1, c2, dark: [n - 8, 8] };
}

function placeData(base, codewords){
  const { n, m, fn } = base;
  let i = 0;
  const total = codewords.length * 8;
  for(let right = n - 1; right >= 1; right -= 2){
    if(right === 6) right = 5;   // skip the timing column
    for(let vert = 0; vert < n; vert++){
      for(let j = 0; j < 2; j++){
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? n - 1 - vert : vert;
        if(!fn[y][x]){
          m[y][x] = (i < total) ? getBit(codewords[i >> 3], 7 - (i & 7)) : 0;
          i++;
        }
      }
    }
  }
}

function placeFormat(grid, n, bits){
  const { c1, c2, dark } = formatPositions(n);
  for(let i = 0; i < 15; i++){ grid[c1[i][0]][c1[i][1]] = getBit(bits, i); grid[c2[i][0]][c2[i][1]] = getBit(bits, i); }
  grid[dark[0]][dark[1]] = 1;
}

function penalty(grid, n){
  let score = 0;
  // Rule 1: runs of 5+ same colour in rows and columns.
  for(let r = 0; r < n; r++){
    let runC = 1, runR = 1;
    for(let c = 1; c < n; c++){
      if(grid[r][c] === grid[r][c - 1]){ runC++; if(runC === 5) score += 3; else if(runC > 5) score++; } else runC = 1;
      if(grid[c][r] === grid[c - 1][r]){ runR++; if(runR === 5) score += 3; else if(runR > 5) score++; } else runR = 1;
    }
  }
  // Rule 2: 2x2 blocks of one colour.
  for(let r = 0; r < n - 1; r++) for(let c = 0; c < n - 1; c++){
    const v = grid[r][c];
    if(v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
  }
  // Rule 3: finder-like 1:1:3:1:1 patterns with a 4-light run, in rows and columns.
  const p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for(let r = 0; r < n; r++){
    for(let c = 0; c <= n - 11; c++){
      let m1 = true, m2 = true;
      for(let k = 0; k < 11; k++){ if(grid[r][c + k] !== p1[k]) m1 = false; if(grid[r][c + k] !== p2[k]) m2 = false; }
      if(m1 || m2) score += 40;
    }
  }
  for(let c = 0; c < n; c++){
    for(let r = 0; r <= n - 11; r++){
      let m1 = true, m2 = true;
      for(let k = 0; k < 11; k++){ if(grid[r + k][c] !== p1[k]) m1 = false; if(grid[r + k][c] !== p2[k]) m2 = false; }
      if(m1 || m2) score += 40;
    }
  }
  // Rule 4: deviation of dark proportion from 50%.
  let dark = 0;
  for(let r = 0; r < n; r++) for(let c = 0; c < n; c++) if(grid[r][c]) dark++;
  const pct = dark * 100 / (n * n);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return score;
}

// Build the final boolean matrix for `text`. Throws if it doesn't fit v1–6.
// `forceMask` (0–7) overrides automatic mask selection — used only for testing.
export function qrMatrix(text, forceMask){
  const bytes = new TextEncoder().encode(String(text));
  const version = pickVersion(bytes.length);
  if(version == null) throw new Error('QR: text too long for versions 1–6');
  const codewords = interleave(encodeData(bytes, version), version);
  const base = buildBase(version);
  placeData(base, codewords);
  const { n, m, fn } = base;

  let best = null;
  for(let mask = 0; mask < 8; mask++){
    if(forceMask != null && mask !== forceMask) continue;
    const grid = m.map((row, r) => row.map((v, c) => fn[r][c] ? v : (v ^ (maskBit(mask, r, c) ? 1 : 0))));
    placeFormat(grid, n, formatBits(mask));
    const pen = penalty(grid, n);
    if(!best || pen < best.pen) best = { grid, pen, mask };
  }
  return { size: n, version, mask: best.mask, modules: best.grid.map(row => row.map(v => v === 1)) };
}

// ---- Rendering --------------------------------------------------------------
export function qrSvg(text, opts = {}){
  const { scale = 6, margin = 4, dark = '#0b0b28', light = '#ffffff' } = opts;
  const { size, modules } = qrMatrix(text);
  const dim = (size + margin * 2) * scale;
  let rects = '';
  for(let r = 0; r < size; r++) for(let c = 0; c < size; c++){
    if(modules[r][c]) rects += `<rect x="${(c + margin) * scale}" y="${(r + margin) * scale}" width="${scale}" height="${scale}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">`
    + `<rect width="${dim}" height="${dim}" fill="${light}"/><g fill="${dark}">${rects}</g></svg>`;
}

// Draw onto a canvas (used for PNG download). Returns the canvas.
export function qrCanvas(text, opts = {}){
  const { scale = 10, margin = 4, dark = '#000000', light = '#ffffff' } = opts;
  const { size, modules } = qrMatrix(text);
  const dim = (size + margin * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = dim; canvas.height = dim;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = light; ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = dark;
  for(let r = 0; r < size; r++) for(let c = 0; c < size; c++){
    if(modules[r][c]) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
  }
  return canvas;
}
