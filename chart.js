// Shared vitality chart engine — ONE visual language for every measurement
// chart (Live expanded, Solo, detail, experiments): light zone bands, faint
// grid, violet line, zone-coloured last-value marker, optional avg overlay.

const ZONE_VIVID = led => led < 6 ? '#f04438' : led < 13 ? '#f5b700' : '#20b26b';
const ZONE_MUTED = led => led < 6 ? '#c2415b' : led < 13 ? '#b8860b' : '#0f8a52';

// Low-level renderer. pts = [{ x: 0..1, led: 0-24|null }] (null = gap, pen up).
// opts: { xLabels: [{frac, text}], avg: number|null, marker: bool (default true) }
export function drawVitalitySeries(canvas, pts, opts = {}){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padL = 38, padR = 14, padT = 12, padB = 22;
  const x0 = padL, y0 = padT, plotW = w - padL - padR, plotH = h - padT - padB;
  const ledToY = led => y0 + plotH - (led / 24) * plotH;

  const band = (lo, hi, color) => { const yt = ledToY(hi); ctx.fillStyle = color; ctx.fillRect(x0, yt, plotW, ledToY(lo) - yt); };
  band(0, 6, 'rgba(240,68,56,0.10)');
  band(6, 13, 'rgba(245,183,0,0.12)');
  band(13, 24, 'rgba(32,178,107,0.12)');

  ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [0, 6, 13, 24].forEach(v => {
    const y = ledToY(v);
    ctx.strokeStyle = 'rgba(1,22,36,0.08)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + plotW, y); ctx.stroke();
    ctx.fillStyle = '#67737c'; ctx.fillText(String(v), x0 - 8, y);
  });

  if(opts.xLabels && opts.xLabels.length){
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#99a2a7';
    for(const l of opts.xLabels) ctx.fillText(l.text, x0 + l.frac * plotW, y0 + plotH + 5);
  }

  // Running-average reference line (dashed, muted zone colour, readable on white).
  if(opts.avg != null){
    const y = ledToY(opts.avg), c = ZONE_MUTED(opts.avg);
    ctx.strokeStyle = c; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + plotW, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = c; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('avg ' + opts.avg.toFixed(1), x0 + 4, y - 2);
  }

  if(!pts || pts.length < 2) return;
  ctx.beginPath();
  let pen = false;   // pen up over null buckets so the line breaks at gaps (not measured)
  let lastX = null, lastY = null, lastV = null;
  pts.forEach(p => {
    if(p.led == null){ pen = false; return; }
    const x = x0 + p.x * plotW, y = ledToY(p.led);
    if(pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    pen = true;
    lastX = x; lastY = y; lastV = p.led;
  });
  ctx.strokeStyle = '#5230da'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();

  // Marker on the last measured value, coloured by its vitality zone.
  if(opts.marker !== false && lastX != null){
    ctx.beginPath(); ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = ZONE_VIVID(lastV); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }
}

// Convenience wrapper: an evenly-spaced led array over a duration (stored
// curves — the 80-bucket time-anchored arrays from results.curve).
export function drawVitalityChart(canvas, leds, durationSeconds){
  const n = leds ? leds.length : 0;
  const pts = n ? leds.map((v, i) => ({ x: n > 1 ? i / (n - 1) : 0, led: v })) : [];
  const xLabels = durationSeconds
    ? [0, 1, 2, 3, 4].map(i => ({ frac: i / 4, text: Math.round((i / 4) * durationSeconds) + 's' }))
    : null;
  drawVitalitySeries(canvas, pts, { xLabels });
}

// Trio chart: Host (orange), Group (blue), You (navy) on the same vitality scale.
// Each series is an array of { t, led }. opts.durationMs sets the X-axis span.
export const TRIO_COLORS = { host: '#f5a623', group: '#0033ff', me: '#011624' };

export function drawTrio(canvas, series, opts){
  if(!canvas) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padL = 38, padR = 14, padT = 12, padB = 22;
  const x0 = padL, y0 = padT, plotW = w - padL - padR, plotH = h - padT - padB;
  const span = (opts && opts.durationMs) || 60000;
  const ledToY = led => y0 + plotH - (led / 24) * plotH;
  const xOf = t => x0 + (Math.min(t, span) / span) * plotW;

  const band = (lo, hi, color) => { const yt = ledToY(hi); ctx.fillStyle = color; ctx.fillRect(x0, yt, plotW, ledToY(lo) - yt); };
  band(0, 6, 'rgba(240,68,56,0.10)');
  band(6, 13, 'rgba(245,183,0,0.12)');
  band(13, 24, 'rgba(32,178,107,0.12)');

  ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [0, 6, 13, 24].forEach(v => {
    const y = ledToY(v);
    ctx.strokeStyle = 'rgba(1,22,36,0.08)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + plotW, y); ctx.stroke();
    ctx.fillStyle = '#67737c'; ctx.fillText(String(v), x0 - 8, y);
  });

  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#99a2a7';
  if(opts && opts.xLabels){
    for(const l of opts.xLabels) ctx.fillText(l.text, x0 + l.frac * plotW, y0 + plotH + 5);
  } else {
    const totalSec = Math.round(span / 1000);
    for(let i = 0; i <= 4; i++){
      const frac = i / 4;
      ctx.fillText(Math.round(frac * totalSec) + 's', x0 + frac * plotW, y0 + plotH + 5);
    }
  }

  const drawLine = (hist, color, lineWidth) => {
    if(!hist || hist.length < 2) return;
    ctx.beginPath();
    let pen = false;   // break the line over null points (gaps where nobody measured)
    hist.forEach(pt => {
      if(pt.led == null){ pen = false; return; }
      const x = xOf(pt.t), y = ledToY(pt.led);
      if(pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      pen = true;
    });
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineJoin = 'round'; ctx.stroke();
  };
  drawLine(series.group, TRIO_COLORS.group, 2);
  drawLine(series.host,  TRIO_COLORS.host,  2.5);
  drawLine(series.me,    TRIO_COLORS.me,    2);
}
