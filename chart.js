// Shared vitality chart: 0-24 Y axis split into red/yellow/green zones with
// numbered axes, plus the measurement curve. Used by Solo and the detail view.

export function drawVitalityChart(canvas, leds, durationSeconds){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padL = 30, padR = 8, padT = 8, padB = 20;
  const x0 = padL, y0 = padT, plotW = w - padL - padR, plotH = h - padT - padB;
  const ledToY = led => y0 + plotH - (led / 24) * plotH;

  const band = (lo, hi, color) => { const yt = ledToY(hi); ctx.fillStyle = color; ctx.fillRect(x0, yt, plotW, ledToY(lo) - yt); };
  band(0, 6, 'rgba(192,20,60,0.12)');
  band(6, 13, 'rgba(233,210,74,0.12)');
  band(13, 24, 'rgba(60,201,138,0.12)');

  ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [0, 6, 13, 24].forEach(v => {
    const y = ledToY(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + plotW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(String(v), x0 - 6, y);
  });

  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
  if(durationSeconds){
    for(let i = 0; i <= 4; i++){ const frac = i / 4; ctx.fillText(Math.round(frac * durationSeconds) + 's', x0 + frac * plotW, y0 + plotH + 5); }
  }

  if(!leds || leds.length < 2) return;
  const n = leds.length;
  ctx.beginPath();
  leds.forEach((v, i) => { const x = x0 + (i / (n - 1)) * plotW, y = ledToY(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.strokeStyle = '#e8e6ff'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
}

// Trio chart: Host (orange), Group (blue), You (white) on the same vitality scale.
// Each series is an array of { t, led }. opts.durationMs sets the X-axis span.
export const TRIO_COLORS = { host: '#f5a623', group: '#9db4ff', me: '#ffffff' };

export function drawTrio(canvas, series, opts){
  if(!canvas) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== Math.round(w * dpr)){ canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padL = 30, padR = 8, padT = 8, padB = 22;
  const x0 = padL, y0 = padT, plotW = w - padL - padR, plotH = h - padT - padB;
  const span = (opts && opts.durationMs) || 60000;
  const ledToY = led => y0 + plotH - (led / 24) * plotH;
  const xOf = t => x0 + (Math.min(t, span) / span) * plotW;

  const band = (lo, hi, color) => { const yt = ledToY(hi); ctx.fillStyle = color; ctx.fillRect(x0, yt, plotW, ledToY(lo) - yt); };
  band(0, 6, 'rgba(192,20,60,0.12)');
  band(6, 13, 'rgba(233,210,74,0.12)');
  band(13, 24, 'rgba(60,201,138,0.12)');

  ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [0, 6, 13, 24].forEach(v => {
    const y = ledToY(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + plotW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(String(v), x0 - 6, y);
  });

  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
  const totalSec = Math.round(span / 1000);
  for(let i = 0; i <= 4; i++){
    const frac = i / 4;
    ctx.fillText(Math.round(frac * totalSec) + 's', x0 + frac * plotW, y0 + plotH + 5);
  }

  const drawLine = (hist, color, lineWidth) => {
    if(!hist || hist.length < 2) return;
    ctx.beginPath();
    hist.forEach((pt, i) => {
      const x = xOf(pt.t), y = ledToY(pt.led);
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineJoin = 'round'; ctx.stroke();
  };
  drawLine(series.group, TRIO_COLORS.group, 2);
  drawLine(series.host,  TRIO_COLORS.host,  2.5);
  drawLine(series.me,    TRIO_COLORS.me,    2);
}
