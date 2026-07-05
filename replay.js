// replay.js — REPLAY (R1): re-play a saved measurement in time, mirroring the
// live cockpit. The stored curve redraws progressively, the readout shows the
// current value / running average / running peak / time-left exactly as the
// racer saw them live, and the chart's zone-colored end marker becomes the
// moving playhead.
//
//  - createReplayClock(...) is the shared timeline (play/pause/seek/speed):
//    R2 (race replay) and R3 (session replay) reuse this same clock and only
//    swap the frame renderer.
//  - mountCurveReplay(...) is the single-curve cockpit used on the
//    measurement-detail page (#/m/<id>).
//
// Curve time model (matches chart.js drawVitalityChart): bucket i sits at
// i/(N-1) of duration_seconds — solo curves are 250ms samples (no nulls),
// session curves 500ms buckets (null = unmeasured), race curves 500ms slots
// (0 = unmeasured). null breaks the line (pen up), exactly like live.

import { drawVitalitySeries } from './chart.js';

const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.4v13.2c0 .8.9 1.3 1.6.9l10.2-6.6c.6-.4.6-1.4 0-1.8L9.6 4.5c-.7-.4-1.6.1-1.6.9z"/></svg>';
const PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.3"/><rect x="13.5" y="5" width="4" height="14" rx="1.3"/></svg>';

// Muted zone colour for number text on light surfaces (same formula the live
// views use; vivid yellow is unreadable on white).
const zText = v => v < 6 ? '#c2415b' : v < 13 ? '#b8860b' : '#0f8a52';

const fmt = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, '0');
  return h ? h + ':' + String(m).padStart(2, '0') + ':' + sec : m + ':' + sec;
};

// ---------------------------------------------------------------------------
// The shared replay timeline. Wall-clock rAF mapped into event time; speed is
// a multiplier. onFrame(tMs) fires on every animation frame while playing and
// once per seek; onState fires on play/pause/end/speed transitions.
// ---------------------------------------------------------------------------
export function createReplayClock({ durationMs, onFrame, onState }){
  let t = durationMs;          // born "at the end" — the idle chart shows the full curve
  let speed = 1, playing = false, raf = 0, lastWall = 0, destroyed = false;

  const state = () => ({ t, speed, playing, done: t >= durationMs });
  const emitState = () => { if(onState){ try{ onState(state()); }catch(_){} } };
  const emitFrame = () => { try{ onFrame(t); }catch(_){} };

  function frame(now){
    raf = 0;
    if(destroyed || !playing) return;
    // Clamp the per-frame delta: rAF starves in a hidden tab, and without the
    // clamp the first frame after returning would jump t forward by the whole
    // hidden stretch. Clamped, a backgrounded replay simply holds its place.
    const dt = Math.min(300, now - lastWall);
    t = Math.min(durationMs, t + dt * speed);
    lastWall = now;
    emitFrame();
    if(t >= durationMs){ playing = false; emitState(); return; }
    raf = requestAnimationFrame(frame);
  }

  return {
    state,
    play(){
      if(destroyed || playing) return;
      if(t >= durationMs) t = 0;             // "Replay again" restarts from the top
      playing = true;
      lastWall = performance.now();
      emitFrame();
      raf = requestAnimationFrame(frame);
      emitState();
    },
    pause(){
      if(destroyed || !playing) return;
      playing = false;
      if(raf){ cancelAnimationFrame(raf); raf = 0; }
      emitState();
    },
    toggle(){ playing ? this.pause() : this.play(); },
    seek(ms){
      if(destroyed) return;
      t = Math.max(0, Math.min(durationMs, ms));
      lastWall = performance.now();
      emitFrame();
      emitState();
    },
    setSpeed(x){
      speed = x > 0 ? x : 1;
      lastWall = performance.now();          // don't retro-apply the new speed
      emitState();
    },
    destroy(){
      destroyed = true;
      playing = false;
      if(raf){ cancelAnimationFrame(raf); raf = 0; }
    },
  };
}

// ---------------------------------------------------------------------------
// Single-curve replay cockpit (measurement detail).
// mountCurveReplay({ heroEl, barEl, canvas, curve, durationSeconds })
//   -> { redraw(), destroy() }
// heroEl: readout row + LED bar (hidden until the first play/seek).
// barEl: play/pause + seek + time + speed controls.
// canvas: the existing detail chart canvas — the component owns all drawing.
// ---------------------------------------------------------------------------
export function mountCurveReplay(o){
  const curve = o.curve, N = curve.length;
  const durationMs = Math.max(1, (o.durationSeconds || 60) * 1000);
  const stepMs = N > 1 ? durationMs / (N - 1) : durationMs;

  // Precompute: full-N-anchored points (never renormalize x to a prefix!),
  // x-axis labels, and O(1) prefix stats (sum/count/peak over non-null leds).
  const ptsAll = curve.map((v, i) => ({ x: N > 1 ? i / (N - 1) : 0, led: v }));
  const xLabels = [0, 1, 2, 3, 4].map(i => ({ frac: i / 4, text: Math.round((i / 4) * (o.durationSeconds || 60)) + 's' }));
  const pre = [];
  { let sum = 0, cnt = 0, peak = null;
    for(const v of curve){
      if(v != null){ sum += v; cnt++; peak = peak == null ? v : Math.max(peak, v); }
      pre.push({ sum, cnt, peak });
    } }

  const SPEEDS = [1, 2, 4];
  let destroyed = false;
  // Arrow keys on the seek slider should move ~1 second of event time, not
  // 1/1000 of the recording (60ms on a 1-minute solo would be useless).
  const seekStep = Math.max(1, Math.round(1000 / (o.durationSeconds || 60)));

  // ---- Static UI --------------------------------------------------------
  o.heroEl.innerHTML = `
    <div class="rp-hero-row">
      <div class="rp-cur"><div class="rp-cur-val" data-rp-val>–</div><div class="rp-cur-lbl">Vitality</div></div>
      <div class="rp-stats">
        <div class="rp-stat"><div class="rp-stat-val" data-rp-avg>–</div><div class="rp-stat-lbl">Avg</div></div>
        <div class="rp-stat"><div class="rp-stat-val" data-rp-peak>–</div><div class="rp-stat-lbl">Peak</div></div>
        <div class="rp-stat"><div class="rp-stat-val" data-rp-left>–</div><div class="rp-stat-lbl">Time left</div></div>
      </div>
    </div>
    <div class="led-bar rp-ledbar" data-rp-bar></div>`;
  const bar = o.heroEl.querySelector('[data-rp-bar]');
  for(let i = 1; i <= 24; i++){ const c = document.createElement('div'); c.className = 'led-cell'; bar.appendChild(c); }

  o.barEl.innerHTML = `
    <button type="button" class="vp-play rp-play" data-rp-toggle aria-label="Replay this measurement">${PLAY_SVG}</button>
    <input type="range" class="vp-seek" data-rp-seek min="0" max="1000" value="1000" step="${seekStep}" aria-label="Seek in the replay">
    <span class="vp-time" data-rp-time></span>
    <button type="button" class="rp-speed" data-rp-speed aria-label="Playback speed: 1×">1×</button>`;
  const q = sel => o.barEl.querySelector(sel);
  const toggleBtn = q('[data-rp-toggle]'), seekEl = q('[data-rp-seek]'), timeEl = q('[data-rp-time]'), speedBtn = q('[data-rp-speed]');

  function updateBar(led){
    const lit = led == null ? 0 : led;
    [...bar.children].forEach((cell, i) => {
      const idx = i + 1;
      cell.className = 'led-cell' + (idx <= lit ? ' lit ' + (idx < 6 ? 'red' : idx < 13 ? 'yellow' : 'green') : '');
    });
  }

  // The hero is visible from mount, pre-filled with the end-of-measurement
  // readout (paint(durationMs) below). Revealing it on the first play used to
  // shift the chart and the just-clicked controls down mid-interaction.
  o.heroEl.hidden = false;

  // ---- Per-frame render --------------------------------------------------
  let lastT = durationMs;
  function paint(t){
    if(destroyed) return;
    lastT = t;
    // stepMs is a rounded double: at t = durationMs the division can land an
    // epsilon under N-1 and floor to N-2 — the end of the timeline must show
    // the final bucket exactly (readout AND the last drawn point).
    const idx = t >= durationMs ? N - 1 : Math.max(0, Math.min(N - 1, Math.floor(t / stepMs)));

    // Chart: prefix up to idx, plus a gliding interpolated head between idx
    // and idx+1 (skipped across null gaps — pen-up stays honest).
    const prefix = ptsAll.slice(0, idx + 1);
    if(idx < N - 1){
      const f = Math.max(0, Math.min(1, (t - idx * stepMs) / stepMs));
      const a = curve[idx], b = curve[idx + 1];
      if(f > 0 && a != null && b != null){
        prefix.push({ x: ptsAll[idx].x + f * (ptsAll[idx + 1].x - ptsAll[idx].x), led: a + f * (b - a) });
      }
    }
    const st = pre[idx];
    const avg = st.cnt ? st.sum / st.cnt : null;
    drawVitalitySeries(o.canvas, prefix, { xLabels, avg, marker: true });

    // Readout — exactly what the live cockpit showed at this moment.
    const cur = curve[idx];
    const vEl = o.heroEl.querySelector('[data-rp-val]');
    vEl.textContent = cur == null ? '–' : cur;
    vEl.style.color = cur == null ? 'var(--ewr-text-soft)' : zText(cur);
    const aEl = o.heroEl.querySelector('[data-rp-avg]');
    aEl.textContent = avg == null ? '–' : avg.toFixed(1);
    aEl.style.color = avg == null ? '' : zText(avg);
    const pEl = o.heroEl.querySelector('[data-rp-peak]');
    pEl.textContent = st.peak == null ? '–' : st.peak;
    pEl.style.color = st.peak == null ? '' : zText(st.peak);
    o.heroEl.querySelector('[data-rp-left]').textContent = fmt(durationMs - t);
    updateBar(cur);

    // Transport row.
    timeEl.textContent = fmt(t) + ' / ' + fmt(durationMs);
    const frac = durationMs ? t / durationMs : 0;
    if(!seekEl.matches(':active')) seekEl.value = Math.round(frac * 1000);
    seekEl.style.setProperty('--vp-fill', (frac * 100).toFixed(2) + '%');
    seekEl.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(durationMs));
  }

  const clock = createReplayClock({
    durationMs,
    onFrame: paint,
    onState: s => {
      toggleBtn.innerHTML = s.playing ? PAUSE_SVG : PLAY_SVG;
      toggleBtn.setAttribute('aria-label', s.playing ? 'Pause the replay' : (s.done ? 'Replay again' : 'Play the replay'));
    },
  });

  toggleBtn.addEventListener('click', () => clock.toggle());
  seekEl.addEventListener('input', () => {
    clock.seek((Number(seekEl.value) / 1000) * durationMs);
  });
  speedBtn.addEventListener('click', () => {
    const cur = clock.state().speed;
    const next = SPEEDS[(SPEEDS.indexOf(cur) + 1) % SPEEDS.length];
    clock.setSpeed(next);
    speedBtn.textContent = next + '×';
    speedBtn.setAttribute('aria-label', 'Playback speed: ' + next + '×');
  });

  // Idle state: the full curve, exactly like the static detail chart was.
  paint(durationMs);

  return {
    // Redraw at the current playhead (the view's resize hook calls this).
    redraw(){ if(!destroyed) paint(lastT); },
    destroy(){
      destroyed = true;
      clock.destroy();
    },
  };
}
