// Pure measurement analytics — reused by the session results screen and (later)
// the Solo analysis view. Input is an array of LED values (0..24) in time order.

export function computeStats(leds){
  const n = leds.length;
  if(n === 0) return null;
  const avg = leds.reduce((s, v) => s + v, 0) / n;
  const peak = Math.max(...leds);
  const variance = leds.reduce((s, v) => s + (v - avg) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const cv = avg > 0 ? std / avg : 0;
  // Steadiness: 100 = perfectly even, lower = more fluctuation.
  const steadiness = Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));

  let red = 0, yellow = 0, green = 0;
  for(const v of leds){ if(v <= 5) red++; else if(v <= 12) yellow++; else green++; }
  const zone = { red: red / n * 100, yellow: yellow / n * 100, green: green / n * 100 };

  // Linear-regression slope over sample index (LED per sample); net change start->end.
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  leds.forEach((v, i) => { sx += i; sy += v; sxx += i * i; sxy += i * v; });
  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const trendTotal = slope * (n - 1);

  // Longest consecutive run in the green zone (in samples).
  let streak = 0, greenStreak = 0;
  for(const v of leds){ if(v >= 13){ streak++; greenStreak = Math.max(greenStreak, streak); } else streak = 0; }

  return { n, avg, peak, std, cv, steadiness, zone, slope, trendTotal, greenStreak };
}

// Competition categories. `value` extracts the comparable number (higher wins).
export const CATEGORIES = [
  { key: 'avg',       icon: 'star',  name: 'Top Average', desc: 'Highest average vitality',          value: s => s.avg,        fmt: v => v.toFixed(1) },
  { key: 'peak',      icon: 'peak',  name: 'Top Peak',    desc: 'Highest single moment',             value: s => s.peak,       fmt: v => String(v) },
  { key: 'steady',    icon: 'wave',  name: 'Most Steady', desc: 'Most even, least fluctuation',      value: s => s.steadiness, fmt: v => v + ' / 100' },
  { key: 'endurance', icon: 'clock', name: 'Endurance',   desc: 'Most time in the green zone',       value: s => s.zone.green, fmt: v => Math.round(v) + '%' },
  { key: 'climber',   icon: 'trend', name: 'Best Climber', desc: 'Biggest improvement over the session', value: s => s.trendTotal, fmt: v => (v >= 0 ? '+' : '') + v.toFixed(1) },
];

// Short, plain-language explanations for the metric legend.
export const METRIC_HELP = {
  avg:       'Average LED across the whole session.',
  peak:      'The single highest LED reached.',
  steadiness:'How even the value was (100 = rock steady, lower = more swings). Based on relative standard deviation.',
  zones:     'Share of time spent in the red (0-5), yellow (6-12) and green (13-24) zones.',
  trend:     'Whether the value rose or fell over the session (improving vs. fading).',
};

// Minimal inline SVG icons (stroke = currentColor), keyed by name.
export function icon(key){
  const p = {
    star:  '<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9z"/>',
    peak:  '<path d="M3 19h18L14 6l-3.5 6L8 9z"/>',
    wave:  '<path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    trend: '<path d="M3 17l6-6 4 4 7-8"/><path d="M21 7v5h-5"/>',
  }[key] || '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

export function trendLabel(trendTotal){
  if(trendTotal > 1.5) return 'Improving';
  if(trendTotal < -1.5) return 'Fading';
  return 'Steady';
}

// Egely Wheel Vitality Scale (LED ~ RPM). The evaluation level is chosen by the
// average. `max` is the exclusive upper LED bound for the level.
export const VITALITY_LEVELS = [
  { max: 2,        name: 'Very Low Vitality',    meaning: 'Very low, must be improved',  color: '#C0143C' },
  { max: 4,        name: 'Low Vitality',         meaning: 'Low vitality, worth improving', color: '#C0143C' },
  { max: 6,        name: 'Below Average',        meaning: 'Still under average',          color: '#C0143C' },
  { max: 6.5,      name: 'Average Level',        meaning: 'Average level',                color: '#E9D24A' },
  { max: 13,       name: 'Good / Healthy Level', meaning: 'Good, healthy level',          color: '#E9D24A' },
  { max: 24.5,     name: 'Outstanding Level',    meaning: 'Outstandingly high level',     color: '#3CC98A' },
  { max: Infinity, name: 'Exceptional Talent',   meaning: 'Exceptional talent',           color: '#3CC98A' },
];

export function vitalityLevel(led){
  return VITALITY_LEVELS.find(l => led < l.max) || VITALITY_LEVELS[VITALITY_LEVELS.length - 1];
}

// Single source of truth for value colors — always matches the vitality level,
// so e.g. 5.1 ("Below Average") is red, not yellow.
export function vitalityColor(led){
  return vitalityLevel(led).color;
}

// Reduce a long sample series to at most `max` points (for compact curve storage).
export function downsample(arr, max = 80){
  if(!arr || arr.length <= max) return (arr || []).slice();
  const out = [], step = arr.length / max;
  for(let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}
