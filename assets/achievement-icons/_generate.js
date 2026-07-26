// assets/achievement-icons/_generate.js — writes one self-contained SVG per
// achievement badge (all 66). Run from the repo root:  node assets/achievement-icons/_generate.js
//
// Chassis: "aura disc" (V3, Csaba 2026-07-26) — no ring: a faint brand-tint
// disc, the pictogram at 1.5× (the badge speaks for itself), tier dot at the
// bottom-right (bronze/silver/gold). GOLD badges get a gold-tinted disc;
// SPECIAL badges get the navy "celestial" disc with a luminous pictogram.
// Every pictogram draws the badge's actual meaning — no generic icons.
// The app renders these via iconHtml() in achievements.js with an emoji
// fallback, so a missing file can never break a page.

'use strict';
const fs = require('fs');
const path = require('path');

const OUT = __dirname;

// ---------------------------------------------------------------------------
// shared defs (inlined into every file — self-contained SVGs)
// ---------------------------------------------------------------------------
const DEFS = `
<linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#37dbff"/><stop offset="1" stop-color="#5230da"/></linearGradient>
<linearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd75e"/><stop offset="1" stop-color="#d99a12"/></linearGradient>
<linearGradient id="goldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd75e"/><stop offset="1" stop-color="#e6a417"/></linearGradient>
<linearGradient id="greenG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ed388"/><stop offset="1" stop-color="#0f8a52"/></linearGradient>
<linearGradient id="blueG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ea8ff"/><stop offset="1" stop-color="#2f6fe0"/></linearGradient>
<linearGradient id="accG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5cf0"/><stop offset="1" stop-color="#401d91"/></linearGradient>
<linearGradient id="cyanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fd9f8"/><stop offset="1" stop-color="#0e7490"/></linearGradient>
<linearGradient id="roseG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7d6e"/><stop offset="1" stop-color="#e03a2c"/></linearGradient>
<linearGradient id="lumin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ee8ff"/><stop offset=".55" stop-color="#9b8cff"/><stop offset="1" stop-color="#ffd75e"/></linearGradient>
<radialGradient id="navyGlow" cx=".5" cy=".42" r=".65"><stop offset="0" stop-color="#274b66"/><stop offset="1" stop-color="#011624"/></radialGradient>
`;

const TIER_DOT = { gold: '#e6b422', silver: '#aab6bf', bronze: '#c98a4b', special: '#8b5cf6' };

// ---------------------------------------------------------------------------
// small building blocks
// ---------------------------------------------------------------------------
const hi = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r || 1.7}" fill="#fff" opacity=".82"/>`;
const spark4 = (x, y, s, c) => `<path d="M${x} ${y - s} l${(s * .32).toFixed(2)} ${(s - s * .32).toFixed(2)} L${x + s} ${y} l-${(s - s * .32).toFixed(2)} ${(s * .32).toFixed(2)} L${x} ${y + s} l-${(s * .32).toFixed(2)} -${(s - s * .32).toFixed(2)} L${x - s} ${y} l${(s - s * .32).toFixed(2)} -${(s * .32).toFixed(2)} Z" fill="${c}"/>`;
const num = (n, x, y, size, fill, extra) =>
  `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="800" text-anchor="middle" fill="${fill}"${extra || ''}>${n}</text>`;
const zoneBar = (y) => `
  <path d="M-17,${y} h9" stroke="#f04438" stroke-width="5.6" stroke-linecap="round" opacity=".38"/>
  <path d="M-5,${y} h10" stroke="#f5b700" stroke-width="5.6" stroke-linecap="round" opacity=".45"/>
  <path d="M8,${y} h9" stroke="#20b26b" stroke-width="5.6" stroke-linecap="round" opacity=".45"/>`;
const pin = (x, grad) => `
  <path d="M${x},10 C${x - 5.5},2.5 ${x - 8},-1.5 ${x - 8},-6 a8,8 0 1 1 16,0 C${x + 8},-1.5 ${x + 5.5},2.5 ${x},10 Z" fill="url(#${grad})" stroke="#fff" stroke-width="2.2"/>
  <circle cx="${x}" cy="-6" r="3.4" fill="#fff"/>`;
const watch = (frac, col, colSoft) => {
  const a = Math.PI * 2 * frac - Math.PI / 2;
  const large = frac > .5 ? 1 : 0;
  const x = (Math.cos(a) * 10.5).toFixed(1), y = (2 + Math.sin(a) * 10.5).toFixed(1);
  const sector = frac >= 1
    ? `<circle cy="2" r="10.5" fill="${colSoft}"/>`
    : `<path d="M0,2 L0,-8.5 A10.5,10.5 0 ${large} 1 ${x},${y} Z" fill="${colSoft}"/>`;
  return `
  <rect x="-3.4" y="-19.5" width="6.8" height="5" rx="2" fill="${col}"/>
  <line x1="10" y1="-12.5" x2="13.5" y2="-16" stroke="${col}" stroke-width="3" stroke-linecap="round"/>
  <circle cy="2" r="14.5" fill="#fff" stroke="${col}" stroke-width="3.4"/>
  ${sector}
  <circle cy="2" r="2.6" fill="${col}"/>`;
};
// person dot; star=true → gold "maker" dot with a spark
const person = (x, y, r, grad, star) => `
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#${grad})" stroke="#fff" stroke-width="2"/>${hi(x - r * .32, y - r * .36)}
  ${star ? spark4(x, y - r - 6, 3.4, '#f5b700') : ''}`;
// arc of n audience dots centred under (0, y), radius r
const audience = (n, y, r, col) => {
  const out = [];
  const span = Math.min(Math.PI * .8, .5 + n * .22);
  for(let i = 0; i < n; i++){
    const a = Math.PI / 2 - span / 2 + (n === 1 ? span / 2 : span * i / (n - 1));
    out.push(`<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * (r * .55)).toFixed(1)}" r="3.1" fill="${col}"/>`);
  }
  return out.join('');
};
const flag = (x, y, pole) => `
  <line x1="${x}" y1="${y}" x2="${x}" y2="${y + pole}" stroke="#67737c" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M${x},${y} h15 v11 h-15 Z" fill="#fff" stroke="#011624" stroke-width="1.6"/>
  ${[0, 1, 2].map(cx => [0, 1, 2].map(cy => ((cx + cy) % 2 === 0)
    ? `<rect x="${x + cx * 5}" y="${y + cy * 3.67}" width="5" height="3.67" fill="#011624"/>` : '').join('')).join('')}`;
const heart = (grad, scale) => `
  <path transform="scale(${scale || 1})" d="M0,13 C-2.5,10.5 -14,4 -14,-4.5 C-14,-10.5 -9.5,-14 -5,-14 C-2,-14 0,-12.5 0,-10.5 C0,-12.5 2,-14 5,-14 C9.5,-14 14,-10.5 14,-4.5 C14,4 2.5,10.5 0,13 Z"
    fill="url(#${grad})" stroke="#fff" stroke-width="1.8"/>`;

// ---------------------------------------------------------------------------
// pictograms — one per badge id, centred on (0,0), ~44px box (scaled 1.5×)
// ---------------------------------------------------------------------------
const P = {};

// ===== Getting Started =====
P['first-solo'] = `
  <circle cx="-12" cy="9" r="9.5" fill="none" stroke="#b9aef0" stroke-width="1.8" opacity=".7"/>
  <circle cx="-12" cy="9" r="5.8" fill="url(#accG)"/>${hi(-13.8, 7)}
  <path d="M-4.5,7.5 C1,6.5 3,1 8,-3 C12,-6.2 15,-7 18,-11" fill="none" stroke="url(#brand)" stroke-width="4" stroke-linecap="round"/>
  ${spark4(18, -13.5, 4.4, '#f5b700')}`;
P['first-group'] = `
  <circle cx="-10.5" cy="5" r="7" fill="url(#cyanG)" stroke="#fff" stroke-width="2"/>
  <circle cx="10.5" cy="5" r="7" fill="url(#accG)" stroke="#fff" stroke-width="2"/>
  <circle cx="0" cy="-8" r="7.6" fill="url(#brand)" stroke="#fff" stroke-width="2"/>
  ${hi(-2.2, -10.4)}${hi(-12.6, 2.8)}${hi(8.4, 2.8)}`;
P['first-saved'] = `
  <path d="M-15,4 v7 a6,6 0 0 0 6,6 h18 a6,6 0 0 0 6,-6 v-7" fill="none" stroke="url(#accG)" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M0,-17 v18" stroke="url(#brand)" stroke-width="4" stroke-linecap="round"/>
  <path d="M-6.5,-4 L0,3 L6.5,-4" fill="none" stroke="url(#brand)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M-8,11.5 C-4,9.5 4,9.5 8,11.5" fill="none" stroke="#20b26b" stroke-width="2.6" stroke-linecap="round"/>`;
P['first-verified'] = `
  <path d="M0,-17.5 l3.6,2.5 4.4,-.5 1.9,4 4,1.9 -.5,4.4 2.5,3.6 -2.5,3.6 .5,4.4 -4,1.9 -1.9,4 -4.4,-.5 -3.6,2.5 -3.6,-2.5 -4.4,.5 -1.9,-4 -4,-1.9 .5,-4.4 -2.5,-3.6 2.5,-3.6 -.5,-4.4 4,-1.9 1.9,-4 4.4,.5 Z" fill="url(#greenG)"/>
  <path d="M-6.5,-.5 L-1.8,4.8 L7.5,-6" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`;
P['first-connected-practitioner'] = `
  <path d="M-11.5,6 C-4,10 4,2 11.5,-4" fill="none" stroke="url(#brand)" stroke-width="3.6" stroke-linecap="round"/>
  ${person(-11.5, 6, 6.4, 'accG')}${person(11.5, -4, 6.4, 'goldG', true)}`;
P['first-connected-client'] = `
  <path d="M-11.5,-4 C-4,-8 4,0 11.5,6" fill="none" stroke="url(#brand)" stroke-width="3.6" stroke-linecap="round"/>
  ${person(-11.5, -4, 6.8, 'goldG')}${person(11.5, 6, 5.6, 'cyanG')}
  <path d="M11.5,-9 v6 M8.5,-6 h6" stroke="#20b26b" stroke-width="2.8" stroke-linecap="round"/>`;

// ===== Consistency — counts: the number IS the story, a vitality curve under it =====
const countBadge = (n, fill, laurel) => `
  ${laurel ? `
    <path d="M-19,7 C-22,2 -22.5,-4 -20,-9" fill="none" stroke="#e6a417" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M19,7 C22,2 22.5,-4 20,-9" fill="none" stroke="#e6a417" stroke-width="2.4" stroke-linecap="round"/>` : ''}
  ${num(n, 0, 7, n >= 100 ? 19 : 24, fill)}
  <path d="M-12,15 C-7,10.5 -3,17.5 2,13.5 C6,10.5 9,13 12,11.5" fill="none" stroke="url(#greenG)" stroke-width="3.2" stroke-linecap="round"/>`;
P['count-3'] = countBadge(3, '#5230da');
P['count-10'] = countBadge(10, '#5230da');
P['count-25'] = countBadge(25, '#2f6fe0');
P['count-50'] = countBadge(50, '#2f6fe0');
P['count-100'] = countBadge(100, '#c8961a', true);
// days: a calendar page with the day-count
const dayBadge = (n, col) => `
  <rect x="-14" y="-12" width="28" height="26" rx="5" fill="#fff" stroke="${col}" stroke-width="2.8"/>
  <path d="M-14,-4 h28" stroke="${col}" stroke-width="2.4"/>
  <line x1="-7" y1="-16" x2="-7" y2="-9.5" stroke="${col}" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="7" y1="-16" x2="7" y2="-9.5" stroke="${col}" stroke-width="2.8" stroke-linecap="round"/>
  ${num(n, 0, 10, 14, col)}`;
P['days-3'] = dayBadge(3, '#c98a4b');
P['days-7'] = dayBadge(7, '#2f6fe0');
P['days-30'] = dayBadge(30, '#c8961a');

// ===== Vitality =====
P['first-yellow-avg'] = `${zoneBar(12)}${pin(0, 'goldG')}`;
P['first-green-avg'] = `${zoneBar(12)}${pin(12.5, 'greenG')}
  <path d="M12.5,-13.5 C11,-18 7,-20.5 2.5,-20 C3.5,-15.5 7,-13.2 12.5,-13.5 Z" fill="#20b26b"/>`;
P['peak-12'] = `
  <path d="M-17,-6 h34" stroke="#b9c4cc" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 5"/>
  <path d="M-6,14 L1,-6 L8,14 Z" fill="#f5b700" opacity=".22"/>
  <path d="M-16,14 L-6,14 L1,-6 L8,14 L16,14" fill="none" stroke="url(#goldG)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
P['peak-18'] = `
  <path d="M-17,-11 h34" stroke="#b9c4cc" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 5"/>
  <path d="M-6,14 L1,-11 L8,14 Z" fill="#20b26b" opacity=".22"/>
  <path d="M-16,14 L-6,14 L1,-11 L8,14 L16,14" fill="none" stroke="url(#greenG)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  ${spark4(11, -15.5, 3.6, '#3ed388')}`;
P['peak-24'] = (() => {
  const rays = [];
  for(let i = 0; i < 8; i++){
    const a = i * Math.PI / 4, long = i % 2 === 0;
    const r1 = 11, r2 = long ? 22 : 16.5, w = long ? 4.4 : 3;
    rays.push(`<line x1="${(Math.sin(a) * r1).toFixed(1)}" y1="${(-Math.cos(a) * r1).toFixed(1)}" x2="${(Math.sin(a) * r2).toFixed(1)}" y2="${(-Math.cos(a) * r2).toFixed(1)}" stroke-width="${w}" stroke-linecap="round"/>`);
  }
  return `<g stroke="#e6a417">${rays.join('')}</g><circle r="8.4" fill="url(#goldG)"/>${hi(-2.6, -3, 2.6)}`;
})();
P['balance'] = `
  <circle r="14.5" fill="none" stroke="#b9aef0" stroke-dasharray="2.6 4.4" stroke-width="1.7" stroke-linecap="round"/>
  <circle cx="0" cy="-14.5" r="6.4" fill="#f04438"/>${hi(-2, -16.7)}
  <circle cx="12.8" cy="7.4" r="6.4" fill="#f5b700"/>${hi(10.8, 5.2)}
  <circle cx="-12.8" cy="7.4" r="6.4" fill="#20b26b"/>${hi(-14.8, 5.2)}
  <circle r="3" fill="#5230da"/>`;
P['flow-state'] = `
  <path d="M-21,15 C-12,-2 -3,22 7,6 C12,-1 16,4 20,1" fill="none" stroke="#bfe9d5" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M-21,7 C-13,-13 -4,17 5,-3 C10,-13 15,-6 19,-9" fill="none" stroke="url(#greenG)" stroke-width="5" stroke-linecap="round"/>
  <circle cx="19" cy="-9" r="5" fill="#0f8a52"/>${hi(17.4, -10.8)}`;
P['vitality-master'] = (() => {
  let dots = '';
  for(let i = 0; i < 10; i++){
    const a = i * Math.PI * 2 / 10 - Math.PI / 2;
    dots += `<circle cx="${(Math.cos(a) * 15.5).toFixed(1)}" cy="${(Math.sin(a) * 15.5).toFixed(1)}" r="2.5" fill="#20b26b"/>`;
  }
  return `${dots}<circle r="9" fill="url(#greenG)" stroke="#fff" stroke-width="2.6"/>${hi(-2.8, -3.2)}
  <path d="M-4.2,.5 L-1.2,3.8 L4.6,-3" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
})();

// ===== Stability =====
P['first-stable'] = `
  <path d="M-11,-9 C-5,-13.5 5,-13.5 11,-9" fill="none" stroke="#b9aef0" stroke-width="2.6" stroke-linecap="round"/>
  <rect x="-17.5" y="-1" width="35" height="11" rx="5.5" fill="#e2f6ec" stroke="#0f8a52" stroke-width="2.8"/>
  <line x1="-5" y1="-1" x2="-5" y2="10" stroke="#0f8a52" stroke-width="1.6" opacity=".45"/>
  <line x1="5" y1="-1" x2="5" y2="10" stroke="#0f8a52" stroke-width="1.6" opacity=".45"/>
  <circle cx="0" cy="4.5" r="3.4" fill="url(#greenG)"/>${hi(-1, 3.2)}`;
P['stable-streak-3'] = `
  ${[-13, 0, 13].map(x => `
    <rect x="${x - 5.4}" y="-3.5" width="10.8" height="8" rx="4" fill="#e2f6ec" stroke="#0f8a52" stroke-width="2.2"/>
    <circle cx="${x}" cy=".5" r="2.2" fill="#0f8a52"/>`).join('')}
  <path d="M-13,-11 C-6,-14.5 6,-14.5 13,-11" fill="none" stroke="#b9aef0" stroke-width="2.4" stroke-linecap="round" stroke-dasharray=".1 5.6"/>
  <path d="M-13,11 h26" stroke="#b9c4cc" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
P['verified-streak-10'] = `
  <path d="M0,-21 C6,-17 12,-15.4 17,-15 C17,-3 13.5,10 0,20.5 C-13.5,10 -17,-3 -17,-15 C-12,-15.4 -6,-17 0,-21 Z" fill="url(#blueG)"/>
  <path d="M0,-21 C6,-17 12,-15.4 17,-15 C17,-3 13.5,10 0,20.5 Z" fill="#fff" opacity=".14"/>
  <path d="M-7.5,-1.5 L-2.2,5 L8.5,-8" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>`;

// ===== Endurance =====
P['endurance-300'] = watch(5 / 20, '#c98a4b', 'rgba(201,138,75,.28)');
P['endurance-600'] = watch(10 / 20, '#2f6fe0', 'rgba(94,168,255,.30)');
P['endurance-1200'] = `
  <g transform="translate(0,4.5)">${watch(1, '#e6a417', 'rgba(245,183,0,.30)')}</g>
  <path d="M-10,-17.5 L-6.2,-12.5 L0,-19 L6.2,-12.5 L10,-17.5 L8.6,-9.5 L-8.6,-9.5 Z"
    fill="url(#goldG)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" transform="translate(0,-5)"/>`;

// ===== Discovery =====
P['morning-energy'] = `
  <path d="M-19,10 h38" stroke="#67737c" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M-10,10 a10,10 0 0 1 20,0 Z" fill="url(#goldG)"/>
  ${[[-16, -2, -14, 0], [0, -8, 0, -4.5], [16, -2, 14, 0]].map(l =>
    `<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" stroke="#e6a417" stroke-width="3" stroke-linecap="round"/>`).join('')}
  <line x1="-9" y1="-5.5" x2="-7.4" y2="-3.6" stroke="#e6a417" stroke-width="3" stroke-linecap="round"/>
  <line x1="9" y1="-5.5" x2="7.4" y2="-3.6" stroke="#e6a417" stroke-width="3" stroke-linecap="round"/>`;
P['night-owl'] = `
  <path d="M4,-17 A13.5,13.5 0 1 0 17,0 A10.5,10.5 0 0 1 4,-17 Z" fill="url(#accG)"/>${hi(-3, -6, 2)}
  ${spark4(12, -12, 3.2, '#f5b700')}${spark4(17, -3, 2.2, '#b9aef0')}
  <path d="M-14,14 C-9,10.5 -4,16 1,12.5" fill="none" stroke="url(#greenG)" stroke-width="3" stroke-linecap="round"/>`;
P['around-the-clock'] = `
  <circle r="15" fill="#fff" stroke="#2f6fe0" stroke-width="3.2"/>
  <circle cx="0" cy="-15" r="4" fill="url(#goldG)" stroke="#fff" stroke-width="1.8"/>
  <circle cx="13" cy="7.5" r="4" fill="#f5b700" stroke="#fff" stroke-width="1.8"/>
  <circle cx="-13" cy="7.5" r="4" fill="url(#accG)" stroke="#fff" stroke-width="1.8"/>
  <path d="M0,0 L0,-8 M0,0 L5.5,3" stroke="#2f6fe0" stroke-width="2.6" stroke-linecap="round"/>
  <circle r="2" fill="#2f6fe0"/>`;
P['weekly-explorer'] = `
  ${[0, 1, 2, 3, 4, 5, 6].map(i => {
    const x = -18 + i * 6;
    const y = 8 - Math.sin(Math.PI * i / 6) * 7;
    return `<circle cx="${x}" cy="${y.toFixed(1)}" r="2.9" fill="${i < 5 ? '#20b26b' : '#0e7490'}"/>`;
  }).join('')}
  ${spark4(0, -12, 4.6, '#f5b700')}`;

// ===== Personal Growth =====
P['personal-best'] = `
  <path d="M-16,15 h32" stroke="#b9c4cc" stroke-width="2.2" stroke-linecap="round"/>
  <rect x="-14" y="4" width="7" height="11" rx="2" fill="#b9aef0"/>
  <rect x="-3.5" y="-2" width="7" height="17" rx="2" fill="url(#accG)"/>
  <rect x="7" y="-10" width="7" height="21" rx="2" fill="url(#brand)"/>
  <line x1="10.5" y1="-10" x2="10.5" y2="-18" stroke="#67737c" stroke-width="2" stroke-linecap="round"/>
  <path d="M10.5,-18 h8 l-2.6,3 2.6,3 h-8 Z" fill="#f5b700"/>`;
P['breakthrough'] = `
  <path d="M-16,-7 h10 M-2,-7 h4 M6,-7 h10" stroke="#b9c4cc" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M0,14 V-13" stroke="url(#accG)" stroke-width="4.4" stroke-linecap="round"/>
  <path d="M-7,-6 L0,-15 L7,-6" fill="none" stroke="url(#accG)" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
  ${spark4(-9, -14, 2.6, '#37dbff')}${spark4(9, -16, 3, '#f5b700')}`;
P['consistency-wins'] = `
  <path d="M-17,-6 h34 M-17,8 h34" stroke="#b9c4cc" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 5"/>
  ${[-13, -6.5, 0, 6.5, 13].map((x, i) => `<circle cx="${x}" cy="${[1.5, .2, 1, .4, 1.2][i]}" r="3.4" fill="url(#greenG)" stroke="#fff" stroke-width="1.6"/>`).join('')}`;
P['trend-up'] = `
  <path d="M-15,12 L-7.5,8 L0,3 L7.5,-3 L15,-10" fill="none" stroke="url(#brand)" stroke-width="3.6" stroke-linecap="round"/>
  ${[[-15, 12], [-7.5, 8], [0, 3], [7.5, -3]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#5230da" stroke="#fff" stroke-width="1.6"/>`).join('')}
  <path d="M15,-10 m-4.5,-1 l4.5,1 -1,4.5" fill="none" stroke="#5230da" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="15" cy="-10" r="3.2" fill="#5230da" stroke="#fff" stroke-width="1.6"/>`;

// ===== Social =====
P['joined-5'] = `
  ${person(-12, -2, 6.2, 'cyanG')}${person(2, -6, 5.4, 'accG')}
  ${num(5, 10, 15, 15, '#5230da')}`;
P['joined-10'] = `
  ${person(-12, -3, 6.2, 'cyanG')}${person(1, -8, 5.4, 'accG')}${person(-4, 5, 5, 'brand')}
  ${num(10, 10, 15, 14, '#2f6fe0')}`;
P['joined-25'] = `
  ${person(-12, -3, 6.2, 'cyanG')}${person(1, -8, 5.4, 'accG')}${person(-4, 5, 5, 'brand')}
  ${num(25, 10, 15, 14, '#2f6fe0')}`;
P['hosted-1'] = `
  <path d="M-9,14 h18" stroke="#67737c" stroke-width="2.8" stroke-linecap="round"/>
  ${person(0, 5, 6.6, 'accG')}
  <path d="M-10,-4 a11,11 0 0 1 20,0" fill="none" stroke="#8f7bec" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M-15,-7 a17,17 0 0 1 30,0" fill="none" stroke="#b9aef0" stroke-width="2.8" stroke-linecap="round"/>`;
P['hosted-10'] = `
  <path d="M-9,14 h18" stroke="#67737c" stroke-width="2.8" stroke-linecap="round"/>
  ${person(0, 5, 6.6, 'goldG')}
  <path d="M-10,-4 a11,11 0 0 1 20,0" fill="none" stroke="#e6a417" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M-15,-7 a17,17 0 0 1 30,0" fill="none" stroke="#f5cf6e" stroke-width="2.8" stroke-linecap="round"/>
  ${num(10, 15, 16.5, 13, '#c8961a')}`;
P['community-host'] = `
  ${person(0, -7, 6.2, 'accG')}
  ${audience(5, 8, 15, '#0e7490')}`;
P['crowd-leader'] = `
  ${person(0, -11, 6, 'goldG')}
  ${audience(5, 0, 11, '#0e7490')}
  ${audience(7, 7, 18.5, '#5230da')}`;
P['likes-1'] = `
  ${heart('roseG', 1)}
  <path d="M-17,-9 l3,3 M17,-9 l-3,3 M0,-18 v4" stroke="#f5b700" stroke-width="2.6" stroke-linecap="round"/>`;
P['likes-10'] = `
  ${heart('accG', 1)}
  ${num(10, 0, 3.5, 12, '#fff')}`;
P['likes-50'] = `
  ${heart('goldG', 1)}
  ${num(50, 0, 3.5, 12, '#fff')}
  ${spark4(15, -12, 3.6, '#f5b700')}${spark4(-16, -6, 2.6, '#37dbff')}`;

// ===== Races =====
P['first-race'] = `${flag(-8, -16, 30)}
  <path d="M-14,17 C-8,14 8,14 14,17" fill="none" stroke="#b9c4cc" stroke-width="2.4" stroke-linecap="round"/>`;
P['first-race-hosted'] = `${flag(-8, -16, 30)}
  <circle cx="12" cy="8" r="7" fill="url(#greenG)" stroke="#fff" stroke-width="2"/>
  <path d="M12,4.5 v7 M8.5,8 h7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`;
P['joined-5-races'] = `${flag(-12, -14, 28)}
  <g transform="translate(7,3)">${flag(0, -8, 22)}</g>
  ${num(5, 16, 19, 14, '#2f6fe0')}`;
P['hosted-5-races'] = `
  <path d="M-16,-2 L2,-9 L2,7 L-16,0 Z" fill="url(#accG)" stroke="#fff" stroke-width="1.8"/>
  <rect x="-18" y="-4" width="6" height="8" rx="2" fill="#401d91"/>
  <path d="M7,-9 a10,10 0 0 1 0,16 M9,-14 a16,16 0 0 1 0,26" fill="none" stroke="#f5b700" stroke-width="2.8" stroke-linecap="round"/>
  ${num(5, 15, 19, 14, '#2f6fe0')}`;
P['first-podium'] = `
  <rect x="-18" y="1" width="12" height="13" rx="1.5" fill="#b9aef0"/>
  <rect x="-6" y="-6" width="12" height="20" rx="1.5" fill="url(#accG)"/>
  <rect x="6" y="4" width="12" height="10" rx="1.5" fill="#8f7bec"/>
  ${num(2, -12, 11, 9, '#fff')}${num(1, 0, 4, 9, '#fff')}${num(3, 12, 12.5, 9, '#fff')}
  <circle cx="0" cy="-13" r="4.6" fill="url(#goldG)" stroke="#fff" stroke-width="1.8"/>`;
P['first-race-win'] = `
  <path d="M-9,-16 h18 v7 a9,9 0 0 1 -18,0 Z" fill="url(#goldG)" stroke="#fff" stroke-width="1.8"/>
  <path d="M-9,-13 h-5 a5.5,5.5 0 0 0 5.5,5.5 M9,-13 h5 a5.5,5.5 0 0 1 -5.5,5.5" fill="none" stroke="#e6a417" stroke-width="2.4"/>
  <path d="M0,-1 v6" stroke="#e6a417" stroke-width="3.4"/>
  <path d="M-6,9 h12 v4 h-12 Z" fill="url(#goldG)" stroke="#fff" stroke-width="1.6"/>
  ${spark4(0, -9.5, 3.2, '#fff')}`;

// ===== Experiments =====
const flask = (liquid, extra) => `
  <path d="M-4,-17 h8 v9 l8.5,14.5 a4,4 0 0 1 -3.5,6 h-18 a4,4 0 0 1 -3.5,-6 L-4,-8 Z"
    fill="#fff" stroke="#0e7490" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M-7.8,-1.5 L-12.5,6.5 a4,4 0 0 0 3.5,6 h18 a4,4 0 0 0 3.5,-6 L7.8,-1.5 Z" fill="${liquid}" opacity=".85"/>
  <path d="M-6,-17 h12" stroke="#0e7490" stroke-width="3.2" stroke-linecap="round"/>
  <circle cx="-2" cy="5" r="1.8" fill="#fff" opacity=".8"/><circle cx="3.5" cy="8.5" r="1.3" fill="#fff" opacity=".7"/>
  ${extra || ''}`;
P['experiment-first'] = flask('url(#cyanG)');
P['experiment-5'] = flask('url(#accG)', num(5, 14, -8, 14, '#5230da'));
P['experiment-10'] = flask('url(#goldG)', num(10, 14, -8, 13, '#c8961a'));
P['experiment-25'] = `
  <circle r="15.5" fill="none" stroke="url(#lumin)" stroke-width="2.4"/>
  <path d="M0,-13 L3.4,-3.4 L13,0 L3.4,3.4 L0,13 L-3.4,3.4 L-13,0 L-3.4,-3.4 Z" fill="url(#lumin)"/>
  <circle r="3" fill="#fff"/>
  ${num(25, 13, -12, 11, '#7ee8ff')}`;

// ===== Spiritual Maker Path =====
P['practitioner-first-client'] = `
  <path d="M-10,4 C-3,8 3,2 10,-2" fill="none" stroke="url(#brand)" stroke-width="3.4" stroke-linecap="round"/>
  ${person(-10, 4, 6.6, 'goldG', true)}${person(10, -2, 5.4, 'cyanG')}`;
P['practitioner-mentor-3'] = `
  ${person(0, -7, 6.4, 'goldG', true)}
  ${audience(3, 7, 13, '#0e7490')}`;
P['practitioner-clients-5'] = `
  ${person(0, -7, 6.4, 'goldG', true)}
  ${audience(5, 7, 15, '#0e7490')}`;
P['practitioner-clients-10'] = (() => {
  let dots = '';
  for(let i = 0; i < 10; i++){
    const a = i * Math.PI * 2 / 10 - Math.PI / 2;
    dots += `<circle cx="${(Math.cos(a) * 15.5).toFixed(1)}" cy="${(Math.sin(a) * 15.5).toFixed(1)}" r="2.6" fill="#0e7490"/>`;
  }
  return `${dots}<circle r="8" fill="url(#goldG)" stroke="#fff" stroke-width="2.4"/>${spark4(0, 0, 4, '#fff')}`;
})();
P['practitioner-first-client-measurement'] = `
  ${person(-12, 9, 5.6, 'cyanG')}
  <path d="M-6,7 C0,5 2,0 5,-3" fill="none" stroke="url(#greenG)" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="5" cy="-3" r="2.6" fill="#0f8a52"/>
  <path d="M8,-6 a10,10 0 0 1 4,-7 M11.5,-3.5 a15,15 0 0 1 6,-10.5" fill="none" stroke="#e6a417" stroke-width="2.4" stroke-linecap="round"/>
  ${person(14, -14, 4.8, 'goldG')}`;
P['practitioner-guided-session'] = `
  <path d="M-16,12 C-8,8 8,4 16,-4" fill="none" stroke="#8f7bec" stroke-width="3" stroke-linecap="round" stroke-dasharray=".1 6.4"/>
  ${person(12, -6, 6.2, 'goldG', true)}${person(-8, 9, 5.2, 'cyanG')}`;
P['practitioner-circle'] = (() => {
  let dots = '';
  for(let i = 0; i < 5; i++){
    const a = i * Math.PI * 2 / 5 - Math.PI / 2;
    dots += `<circle cx="${(Math.cos(a) * 14.5).toFixed(1)}" cy="${(Math.sin(a) * 14.5).toFixed(1)}" r="4.2" fill="${i % 2 ? 'url(#cyanG)' : 'url(#accG)'}" stroke="#fff" stroke-width="1.8"/>`;
  }
  return `<circle r="14.5" fill="none" stroke="#b9aef0" stroke-width="2" stroke-dasharray="2.4 4.6"/>${dots}
  <circle r="5.6" fill="url(#goldG)" stroke="#fff" stroke-width="2"/>${spark4(0, 0, 3, '#fff')}`;
})();

// ===== Rare & Special (navy chassis, luminous art) =====
P['green-streak-3'] = `
  ${[-12, 0, 12].map(x => `
    <circle cx="${x}" cy="0" r="7.5" fill="#20b26b" opacity=".28"/>
    <circle cx="${x}" cy="0" r="4.8" fill="#3ed388"/>${hi(x - 1.6, -1.8)}`).join('')}
  ${spark4(15, -11, 3, '#7ee8ff')}`;
P['verified-streak-25'] = `
  <path d="M0,-21 C6,-17 12,-15.4 17,-15 C17,-3 13.5,10 0,20.5 C-13.5,10 -17,-3 -17,-15 C-12,-15.4 -6,-17 0,-21 Z"
    fill="none" stroke="url(#lumin)" stroke-width="2.6"/>
  <path d="M0,-21 C6,-17 12,-15.4 17,-15 C17,-3 13.5,10 0,20.5 C-13.5,10 -17,-3 -17,-15 C-12,-15.4 -6,-17 0,-21 Z"
    fill="url(#lumin)" opacity=".2"/>
  ${num(25, 0, 4.5, 13, '#fff')}`;
P['perfect-verification'] = `
  <path d="M-13,-8 L-6.5,-15 H6.5 L13,-8 L0,15 Z" fill="url(#lumin)" opacity=".9"/>
  <path d="M-13,-8 H13 M-6.5,-15 L-4,-8 L0,15 M6.5,-15 L4,-8 L0,15 M-13,-8 L-4,-8 M13,-8 L4,-8"
    fill="none" stroke="#fff" stroke-width="1.4" opacity=".75"/>
  ${spark4(14, -14, 3.2, '#7ee8ff')}${spark4(-15, 2, 2.4, '#ffd75e')}`;

// ---------------------------------------------------------------------------
// tiers + chassis
// ---------------------------------------------------------------------------
const TIERS = {
  'first-solo': 'bronze', 'first-group': 'bronze', 'first-saved': 'bronze', 'first-verified': 'bronze',
  'first-connected-practitioner': 'bronze', 'first-connected-client': 'bronze',
  'count-3': 'bronze', 'count-10': 'bronze', 'count-25': 'silver', 'count-50': 'silver', 'count-100': 'gold',
  'days-3': 'bronze', 'days-7': 'silver', 'days-30': 'gold',
  'first-yellow-avg': 'bronze', 'first-green-avg': 'silver', 'peak-12': 'bronze', 'peak-18': 'silver', 'peak-24': 'gold',
  'balance': 'bronze', 'flow-state': 'gold', 'vitality-master': 'silver',
  'first-stable': 'bronze', 'stable-streak-3': 'silver', 'verified-streak-10': 'gold',
  'endurance-300': 'bronze', 'endurance-600': 'silver', 'endurance-1200': 'gold',
  'joined-5': 'bronze', 'joined-10': 'silver', 'joined-25': 'silver', 'hosted-1': 'bronze', 'hosted-10': 'gold',
  'community-host': 'silver', 'crowd-leader': 'gold', 'likes-1': 'bronze', 'likes-10': 'silver', 'likes-50': 'gold',
  'practitioner-first-client': 'bronze', 'practitioner-clients-5': 'silver', 'practitioner-clients-10': 'gold',
  'practitioner-first-client-measurement': 'bronze', 'practitioner-guided-session': 'silver',
  'practitioner-mentor-3': 'silver', 'practitioner-circle': 'gold',
  'green-streak-3': 'special', 'verified-streak-25': 'special', 'perfect-verification': 'special',
  'morning-energy': 'bronze', 'night-owl': 'bronze', 'around-the-clock': 'silver', 'weekly-explorer': 'gold',
  'personal-best': 'bronze', 'breakthrough': 'silver', 'consistency-wins': 'silver', 'trend-up': 'silver',
  'first-race': 'bronze', 'first-race-hosted': 'bronze', 'joined-5-races': 'silver', 'hosted-5-races': 'silver',
  'first-podium': 'silver', 'first-race-win': 'gold',
  'experiment-first': 'bronze', 'experiment-5': 'silver', 'experiment-10': 'gold', 'experiment-25': 'special',
};

function svgFor(id){
  const tier = TIERS[id];
  const art = P[id];
  if(!art || !tier) throw new Error('missing pictogram or tier for ' + id);
  const dot = `<circle cx="80" cy="80" r="7" fill="${TIER_DOT[tier]}" stroke="#fff" stroke-width="2.4"/>`;
  let disc, sparkles = '';
  if(tier === 'special'){
    disc = `<circle cx="48" cy="48" r="46" fill="url(#navyGlow)"/>`;
    sparkles = `<g fill="#9adfff" opacity=".9">
      <path d="M26 24 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5 Z"/>
      <circle cx="73" cy="27" r="1.4"/><circle cx="69" cy="72" r="1.1"/></g>`;
  } else if(tier === 'gold'){
    disc = `<circle cx="48" cy="48" r="46" fill="url(#goldRing)" opacity=".13"/>`;
  } else {
    disc = `<circle cx="48" cy="48" r="46" fill="url(#brand)" opacity=".09"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs>${DEFS}</defs>
${disc}${sparkles}
<g transform="translate(48,48) scale(1.5)">${art}</g>
${dot}
</svg>`;
}

// ---------------------------------------------------------------------------
let n = 0;
for(const id of Object.keys(TIERS)){
  const svg = svgFor(id).replace(/\n\s+/g, '\n').trim();
  fs.writeFileSync(path.join(OUT, id + '.svg'), svg);
  n++;
}
console.log('wrote', n, 'badge SVGs to', OUT);
