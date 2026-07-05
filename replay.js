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
// Shared transport bar (round play/pause + seek + time + speed cycle) used by
// the curve replay (R1) and the race replay (R2). Classes come from the
// global player language in ewr-redesign.css (.vp-play/.vp-seek/.vp-time/
// .rp-speed).
// ---------------------------------------------------------------------------
const SPEED_STEPS = [1, 2, 4];
function mountTransport(barEl, opts){
  const durationMs = Math.max(1, (opts.durationSeconds || 60) * 1000);
  // Arrow keys on the seek slider should move ~1 second of event time, not
  // 1/1000 of the recording (60ms on a 1-minute solo would be useless).
  const seekStep = Math.max(1, Math.round(1000 / (opts.durationSeconds || 60)));
  barEl.innerHTML = `
    <button type="button" class="vp-play rp-play" data-rp-toggle aria-label="Play the replay">${PLAY_SVG}</button>
    <input type="range" class="vp-seek" data-rp-seek min="0" max="1000" value="1000" step="${seekStep}" aria-label="Seek in the replay">
    <span class="vp-time" data-rp-time></span>
    <button type="button" class="rp-speed" data-rp-speed aria-label="Playback speed: 1×">1×</button>`;
  const toggleBtn = barEl.querySelector('[data-rp-toggle]');
  const seekEl = barEl.querySelector('[data-rp-seek]');
  const timeEl = barEl.querySelector('[data-rp-time]');
  const speedBtn = barEl.querySelector('[data-rp-speed]');
  toggleBtn.addEventListener('click', () => opts.onToggle());
  seekEl.addEventListener('input', () => {
    // The ~1s step grid rarely divides 1000 evenly, so the drag maxes out one
    // partial step short of the end — snap the topmost sliver to the true end,
    // otherwise the replay could never reach "done" by dragging.
    const v = Number(seekEl.value);
    const frac = (1000 - v < seekStep) ? 1 : v / 1000;
    opts.onSeek(frac * durationMs);
  });
  let speed = 1;
  speedBtn.addEventListener('click', () => {
    speed = SPEED_STEPS[(SPEED_STEPS.indexOf(speed) + 1) % SPEED_STEPS.length];
    speedBtn.textContent = speed + '×';
    speedBtn.setAttribute('aria-label', 'Playback speed: ' + speed + '×');
    opts.onSpeed(speed);
  });
  return {
    paint(t){
      timeEl.textContent = fmt(t) + ' / ' + fmt(durationMs);
      const frac = durationMs ? t / durationMs : 0;
      if(!seekEl.matches(':active')) seekEl.value = Math.round(frac * 1000);
      seekEl.style.setProperty('--vp-fill', (frac * 100).toFixed(2) + '%');
      seekEl.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(durationMs));
    },
    setPlaying(playing, done){
      toggleBtn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
      toggleBtn.setAttribute('aria-label', playing ? 'Pause the replay' : (done ? 'Replay again' : 'Play the replay'));
    },
  };
}

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

  let destroyed = false;

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

  // Shared transport (play/pause + seek + time + speed). The callbacks close
  // over `clock`, created below — they only ever run after mount completes.
  const transport = mountTransport(o.barEl, {
    durationSeconds: o.durationSeconds || 60,
    onToggle: () => { showHero(); clock.toggle(); },
    onSeek: ms => { showHero(); clock.seek(ms); },
    onSpeed: x => clock.setSpeed(x),
  });

  function updateBar(led){
    const lit = led == null ? 0 : led;
    [...bar.children].forEach((cell, i) => {
      const idx = i + 1;
      cell.className = 'led-cell' + (idx <= lit ? ' lit ' + (idx < 6 ? 'red' : idx < 13 ? 'yellow' : 'green') : '');
    });
  }

  // The hero stays hidden until the first play/seek (a frozen end-of-
  // measurement value before any playback read as a bug — Csaba). It sits
  // BELOW the transport bar, so revealing it never moves the button or the
  // slider the user is interacting with.
  let heroShown = false;
  function showHero(){
    if(heroShown) return;
    heroShown = true;
    o.heroEl.hidden = false;
  }

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

    transport.paint(t);
  }

  const clock = createReplayClock({
    durationMs,
    onFrame: paint,
    onState: s => {
      transport.setPlaying(s.playing, s.done);
      // Playback ran to the end (or the slider was dragged there): fold the
      // live readout away — back to the entry look, the full curve alone
      // (Csaba). A mid-way pause keeps it up for reading the values.
      if(s.done && !s.playing && heroShown){ heroShown = false; o.heroEl.hidden = true; }
    },
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

// ---------------------------------------------------------------------------
// RACE REPLAY (R2) — re-runs a finished race from the saved per-slot curves:
// the pucks move on the live view's relative track (the leader rides the
// clock, everyone else trails by score ratio — the exact live formula), rank
// badges swap, scores count up, the clock counts down; the maker's recorded
// commentary plays in sync when the race has a ready recording.
//
// Lane markup/classes come from the live race (view-race.js injectRaceStyles:
// .rr-lane/.rr-track/.rr-puck/…), the transport from the shared player
// language. Data arrives lazily via callbacks, so the results page stays
// light until the user actually presses Replay:
//
// mountRaceReplay(el, {
//   durationMs, totalSlots, raceStartMs,
//   loadLanes: async () => [{ id, name, puckHtml, flagHtml, isHost, mine,
//                             curve, raceScore, finalRank, firstSlot, verified }],
//   loadAudio: async () => ({ url, duration, recStartMs } | null),
//   onAudioTakeover: () => {},   // the replay now owns the commentary audio
// }) -> { destroy() }
// ---------------------------------------------------------------------------
export function mountRaceReplay(el, o){
  const SLOT_MS = 500, SPREAD = 1.5, GRACE_SLOTS = 10;   // = the live view's constants
  const N = Math.max(1, o.totalSlots || 1);
  const durationMs = Math.max(1, o.durationMs || N * SLOT_MS);
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let destroyed = false, built = false, loading = false;
  let clock = null, transport = null, audio = null, offsetMs = 0;
  let playing = false, speed = 1, lastPaintT = -1, lastK = -1;
  let lanes = [];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // ---- Entry card: nothing heavy is fetched until this button is pressed.
  function intro(){
    el.innerHTML = `
      <div class="rp-intro">
        <button type="button" class="vp-play" data-rrp-go aria-label="Replay the race">${PLAY_SVG}</button>
        <div class="rp-intro-txt">
          <b>Race replay</b>
          <small data-rrp-sub aria-live="polite">Watch the race run again — every move, every overtake.</small>
        </div>
      </div>`;
    el.querySelector('[data-rrp-go]').addEventListener('click', start);
  }

  // Back to the entry look: the intro card returns and the view restores the
  // Listen-again card (onClose). The finished board is NEVER closed
  // automatically — only this explicit gesture leaves it, so the final
  // standings stay up as long as the viewer wants them.
  function teardownToIntro(){
    if(destroyed) return;
    if(clock){ clock.destroy(); clock = null; }
    if(audio){ try{ audio.pause(); }catch(_){} audio.src = ''; audio = null; }
    built = false; loading = false; playing = false; speed = 1;
    lastPaintT = -1; lastK = -1;
    transport = null; lanes = []; offsetMs = 0;
    if(o.onClose){ try{ o.onClose(); }catch(_){} }
    intro();
    const b = el.querySelector('[data-rrp-go]');
    if(b) b.focus();
  }

  async function start(){
    if(loading || built || destroyed) return;
    loading = true;
    const sub = el.querySelector('[data-rrp-sub]');
    const btn = el.querySelector('[data-rrp-go]');
    if(sub) sub.textContent = 'Loading the replay…';
    if(btn) btn.disabled = true;
    let laneRows = [], audioInfo = null, failed = false;
    try{
      [laneRows, audioInfo] = await Promise.all([
        o.loadLanes(),
        o.loadAudio ? o.loadAudio().catch(() => null) : Promise.resolve(null),
      ]);
    }catch(_){ failed = true; }
    loading = false;
    if(destroyed || !el.isConnected) return;
    lanes = failed ? [] : (laneRows || []).map(prep);
    if(!lanes.length || !lanes.some(p => p.cum[N - 1] > 0)){
      // A fetch hiccup is not "no data" — invite a retry instead of lying.
      if(sub) sub.textContent = failed
        ? 'Could not load the replay — tap play to try again.'
        : 'No replayable measurement data was saved for this race.';
      if(btn) btn.disabled = false;
      return;
    }
    build(audioInfo);
  }

  // Cumulative score per slot (prefix sums, padded/truncated to N slots).
  function prep(r){
    const curve = Array.isArray(r.curve) ? r.curve : [];
    const cum = new Array(N);
    let s = 0;
    for(let i = 0; i < N; i++){ const v = curve[i]; if(v != null) s += v; cum[i] = s; }
    return { ...r, curve, cum, ranked: r.firstSlot != null && r.firstSlot <= GRACE_SLOTS };
  }

  function laneHtml(p){
    return `
      <div class="rr-lane ${p.mine ? 'me' : ''} ${p.ranked ? '' : 'unranked'}" data-rank="">
        <div class="rr-rank dash">–</div>
        <div class="rr-info">
          <div class="rr-name-row"><span class="rr-name">${esc(p.name)}</span>${p.flagHtml || ''}${p.isHost ? '<span class="rr-tag host">Host</span>' : ''}${p.mine ? '<span class="rr-tag you">You</span>' : ''}${p.ranked ? '' : '<span class="rr-tag unranked">Late · Unranked</span>'}${p.verified === false ? '<span class="rr-vrf bad">Unverified</span>' : ''}</div>
          <div class="rr-track"><span class="rr-finish"></span><span class="rr-puck"><span class="rr-tail"></span>${p.puckHtml || ('<span class="rr-puck-init">' + esc((p.name || '?').charAt(0).toUpperCase()) + '</span>')}</span></div>
        </div>
        <div class="rr-nums"><div class="rr-live-wrap"><div class="rr-livev">0</div><div class="rr-live-lbl">Live</div></div><div class="rr-score">SCORE 0</div></div>
      </div>`;
  }

  function build(audioInfo){
    built = true;
    // Lane order mirrors the live lock: host, you, then name — never reshuffles.
    lanes.sort((a, b) => {
      if(!!a.isHost !== !!b.isHost) return a.isHost ? -1 : 1;
      if(!!a.mine !== !!b.mine) return a.mine ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    el.innerHTML = `
      <div class="rp-board">
        <div class="rp-head">
          <span class="rp-head-pill"><span class="d"></span>REPLAY</span>
          <span class="rp-head-right">
            <span class="rp-clock" data-rrp-clock>--:--</span>
            <button type="button" class="rp-close" data-rrp-close aria-label="Close the replay">✕ Close</button>
          </span>
        </div>
        <div class="rr-list">${lanes.map(laneHtml).join('')}</div>
        <div class="rp-bar" data-rrp-bar></div>
      </div>`;
    el.querySelector('[data-rrp-close]').addEventListener('click', teardownToIntro);
    const laneEls = [...el.querySelectorAll('.rr-lane')];
    lanes.forEach((p, i) => { p.el = laneEls[i]; });

    const barEl = el.querySelector('[data-rrp-bar]');
    transport = mountTransport(barEl, {
      durationSeconds: Math.round(durationMs / 1000),
      onToggle: () => clock.toggle(),
      onSeek: ms => clock.seek(ms),
      onSpeed: x => clock.setSpeed(x),
    });

    // Wall-clock alignment: the storage filename carries the recording's
    // exact start ms. Unknown (legacy) → assume the recording began with the
    // race. A recording that STARTS AFTER the race window (the host announced
    // the winners in the post-roll) can never sound inside the replay — skip
    // the takeover entirely so the Listen-again card stays in charge.
    if(audioInfo && audioInfo.url){
      const off = (audioInfo.recStartMs != null && o.raceStartMs) ? (audioInfo.recStartMs - o.raceStartMs) : 0;
      if(off < durationMs){
        audio = new Audio(audioInfo.url);
        audio.preload = 'auto';
        offsetMs = off;
        // If the commentary starts by ANY route, a stale "Enable commentary"
        // CTA must not stay in the bar contradicting the audible state.
        audio.addEventListener('play', () => {
          const fx = el.querySelector('[data-rrp-audiofix]');
          if(fx) fx.remove();
        });
        const chip = document.createElement('span');
        chip.className = 'voice-chip';
        chip.textContent = '🎙 Commentary';
        barEl.appendChild(chip);
        if(o.onAudioTakeover){ try{ o.onAudioTakeover(); }catch(_){} }
      }
    }

    clock = createReplayClock({ durationMs, onFrame, onState });
    clock.play();   // the user already pressed Replay — run from the top

    // Keyboard flow: the intro button just vanished with the innerHTML swap —
    // land focus on the transport toggle, the logical next control.
    const tb = el.querySelector('[data-rp-toggle]');
    if(tb) tb.focus();
  }

  function onState(s){
    playing = s.playing; speed = s.speed;
    if(transport) transport.setPlaying(s.playing, s.done);
    if(audio){
      audio.playbackRate = speed;
      if(!s.playing && !audio.paused) audio.pause();
    }
    if(s.done && !s.playing) paintFinal();
  }

  function onFrame(t){
    if(transport) transport.paint(t);
    paintLanes(t, false);
    syncAudio(t);
  }

  function syncAudio(t){
    if(!audio || destroyed) return;
    const desired = (t - offsetMs) / 1000;
    const over = isFinite(audio.duration) && audio.duration > 0 && desired > audio.duration;
    if(!playing || t >= durationMs || desired < 0 || over){
      if(!audio.paused) audio.pause();
      return;
    }
    // Snap on drift (seek, hidden-tab hold, buffering) — ~⅓s tolerance.
    if(Math.abs((audio.currentTime || 0) - desired) > 0.35){
      try{ audio.currentTime = Math.max(0, desired); }catch(_){}
    }
    if(audio.paused) audio.play().catch(() => showAudioHint());
  }

  // Autoplay policy ate the commentary (the URL fetch consumed the gesture):
  // offer a one-tap enable instead of failing silently.
  function showAudioHint(){
    if(destroyed || el.querySelector('[data-rrp-audiofix]')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rp-speed'; b.setAttribute('data-rrp-audiofix', '');
    b.textContent = '🎙 Enable commentary';
    b.addEventListener('click', () => {
      // Sound and picture stay together: a paused/finished replay resumes,
      // so syncAudio keeps governing the commentary it just enabled.
      if(clock && !playing) clock.play();
      if(audio) audio.play().catch(() => {});
      b.remove();
    });
    const bar = el.querySelector('[data-rrp-bar]');
    if(bar) bar.appendChild(b);
  }

  function paintLanes(t, force){
    if(destroyed || !built) return;
    const k = t >= durationMs ? N - 1 : Math.max(0, Math.min(N - 1, Math.floor(t / SLOT_MS)));
    // The lanes repaint on slot changes (500ms event time) — the CSS puck
    // transition smooths between ticks, exactly like the live 300ms paint.
    if(!force && k === lastK && (t - lastPaintT) < 250 && t < durationMs) return;
    lastPaintT = t; lastK = k;

    const rankedNow = lanes.filter(p => p.ranked).slice().sort((a, b) => b.cum[k] - a.cum[k]);
    const rankOf = new Map(rankedNow.map((p, i) => [p, i + 1]));
    const leader = (rankedNow.length && rankedNow[0].cum[k] > 0) ? rankedNow[0] : null;
    const leaderScore = leader ? leader.cum[k] : 0;
    const leaderPos = 8 + Math.max(0, Math.min(1, t / durationMs)) * 88;

    for(const p of lanes){
      const row = p.el; if(!row) continue;
      const score = p.cum[k];
      const lv = p.curve[k] || 0;
      const isLeader = p === leader;
      const rank = p.ranked ? (rankOf.get(p) || null) : null;

      const rankEl = row.querySelector('.rr-rank');
      const newRank = rank != null ? String(rank) : '–';
      if(rank != null){ rankEl.textContent = newRank; rankEl.classList.remove('dash'); }
      else { rankEl.textContent = '–'; rankEl.classList.add('dash'); }
      if(!reduce && rank != null && row.dataset.rank && row.dataset.rank !== newRank){
        rankEl.classList.remove('bump'); void rankEl.offsetWidth; rankEl.classList.add('bump');
      }
      row.dataset.rank = newRank;

      row.classList.toggle('leader', isLeader);
      row.classList.toggle('moving', playing && lv > 0);

      const puck = row.querySelector('.rr-puck');
      const pos = !(score > 0) ? 0
        : Math.max(0, Math.min(96, leaderPos * Math.pow(leaderScore > 0 ? score / leaderScore : 0, SPREAD)));
      if(puck) puck.style.left = pos.toFixed(1) + '%';

      const liveEl = row.querySelector('.rr-livev');
      if(liveEl){ liveEl.textContent = lv; liveEl.style.color = lv > 0 ? zText(lv) : '#99a2a7'; }
      const scoreEl = row.querySelector('.rr-score');
      if(scoreEl){
        if(isLeader) scoreEl.innerHTML = `SCORE ${score} · <span style="color:#b8860b">LEADER</span>`;
        else if(rank != null && leaderScore > 0){ const gap = leaderScore - score; scoreEl.textContent = `SCORE ${score}${gap > 0 ? ` · ${gap} behind` : ''}`; }
        else scoreEl.textContent = `SCORE ${score}`;
      }
    }

    const clockEl = el.querySelector('[data-rrp-clock]');
    if(clockEl){
      const left = Math.max(0, durationMs - t);
      clockEl.textContent = fmt(left) + ' left';
      clockEl.classList.toggle('final10', left <= 10000 && left > 0);
    }
  }

  // The race is over: snap badges/scores to the OFFICIAL results — the DB
  // finalize can differ from a curve re-simulation on exact ties or on rows
  // it excluded, and the official numbers are the truth.
  function paintFinal(){
    if(destroyed || !built) return;
    for(const p of lanes){
      const row = p.el; if(!row) continue;
      const rankEl = row.querySelector('.rr-rank');
      if(p.finalRank != null){ rankEl.textContent = p.finalRank; rankEl.classList.remove('dash'); }
      else { rankEl.textContent = '–'; rankEl.classList.add('dash'); }
      row.dataset.rank = p.finalRank != null ? String(p.finalRank) : '–';
      row.classList.toggle('leader', p.finalRank === 1);
      row.classList.remove('moving');
      const scoreEl = row.querySelector('.rr-score');
      if(scoreEl){
        if(p.finalRank === 1) scoreEl.innerHTML = `SCORE ${p.raceScore || 0} · <span style="color:#b8860b">WINNER</span>`;
        else scoreEl.textContent = 'SCORE ' + (p.raceScore || 0);
      }
    }
    const clockEl = el.querySelector('[data-rrp-clock]');
    if(clockEl){ clockEl.textContent = 'Race finished'; clockEl.classList.remove('final10'); }
  }

  intro();

  return {
    destroy(){
      destroyed = true;
      if(clock) clock.destroy();
      if(audio){ try{ audio.pause(); }catch(_){} audio.src = ''; audio = null; }
      el.innerHTML = '';
    },
  };
}

// ---------------------------------------------------------------------------
// SESSION REPLAY (R3) — the finished session's results page comes alive: the
// VIEW supplies renderFrame(tMs) (it redraws the Pulse trio, every racer
// card's curve and the temporary live chips), and this component owns the
// shell: entry card, dark header (clock + Close), transport, the replay
// clock and the synced maker recording. The board's end state equals the
// static results, so nothing needs visual restoring at the end; Close folds
// the controls away and the view brings the Listen-again card back (onClose).
//
// mountSessionReplay(el, { durationMs, eventStartMs, loadAudio, onStart,
//   renderFrame, onTakeover, onClose }) -> { destroy() }
// ---------------------------------------------------------------------------
export function mountSessionReplay(el, o){
  const durationMs = Math.max(1, o.durationMs || 60000);
  let destroyed = false, built = false, loading = false;
  let clock = null, transport = null, audio = null, offsetMs = 0;
  let playing = false, lastFrameT = -1;

  function intro(){
    el.innerHTML = `
      <div class="rp-intro">
        <button type="button" class="vp-play" data-rp-go aria-label="Replay this session">${PLAY_SVG}</button>
        <div class="rp-intro-txt">
          <b>Session replay</b>
          <small data-rp-sub aria-live="polite">Watch the session unfold again — the group pulse and every curve, in time.</small>
        </div>
      </div>`;
    el.querySelector('[data-rp-go]').addEventListener('click', start);
  }

  async function start(){
    if(loading || built || destroyed) return;
    loading = true;
    const sub = el.querySelector('[data-rp-sub]');
    const btn = el.querySelector('[data-rp-go]');
    if(sub) sub.textContent = 'Loading the replay…';
    if(btn) btn.disabled = true;
    const audioInfo = o.loadAudio ? await o.loadAudio().catch(() => null) : null;
    loading = false;
    if(destroyed || !el.isConnected) return;
    build(audioInfo);
  }

  // Back to the entry look. The finished board is NEVER folded automatically —
  // only this explicit gesture leaves it.
  function teardownToIntro(){
    if(destroyed) return;
    if(clock){ clock.destroy(); clock = null; }
    if(audio){ try{ audio.pause(); }catch(_){} audio.src = ''; audio = null; }
    built = false; loading = false; playing = false;
    transport = null; offsetMs = 0; lastFrameT = -1;
    if(o.onClose){ try{ o.onClose(); }catch(_){} }
    intro();
    const b = el.querySelector('[data-rp-go]');
    if(b) b.focus();
  }

  function build(audioInfo){
    built = true;
    el.innerHTML = `
      <div class="rp-board">
        <div class="rp-head">
          <span class="rp-head-pill"><span class="d"></span>REPLAY</span>
          <span class="rp-head-right">
            <span class="rp-clock" data-rp-clock>--:--</span>
            <button type="button" class="rp-close" data-rp-close aria-label="Close the replay">✕ Close</button>
          </span>
        </div>
        <div class="rp-bar" data-rp-bar></div>
      </div>`;
    el.querySelector('[data-rp-close]').addEventListener('click', teardownToIntro);
    const barEl = el.querySelector('[data-rp-bar]');
    transport = mountTransport(barEl, {
      durationSeconds: Math.round(durationMs / 1000),
      onToggle: () => clock.toggle(),
      onSeek: ms => clock.seek(ms),
      onSpeed: x => clock.setSpeed(x),
    });
    // Same recording rules as the race replay: a recording that starts after
    // the official window can never sound inside the replay — no takeover.
    if(audioInfo && audioInfo.url){
      const off = (audioInfo.recStartMs != null && o.eventStartMs) ? (audioInfo.recStartMs - o.eventStartMs) : 0;
      if(off < durationMs){
        audio = new Audio(audioInfo.url);
        audio.preload = 'auto';
        offsetMs = off;
        audio.addEventListener('play', () => { const fx = el.querySelector('[data-rp-audiofix]'); if(fx) fx.remove(); });
        const chip = document.createElement('span');
        chip.className = 'voice-chip';
        chip.textContent = '🎙 Voice guidance';
        barEl.appendChild(chip);
        if(o.onTakeover){ try{ o.onTakeover(); }catch(_){} }
      }
    }
    if(o.onStart){ try{ o.onStart(); }catch(_){} }
    clock = createReplayClock({ durationMs, onFrame, onState });
    clock.play();
    // Keyboard flow: the intro button vanished with the innerHTML swap.
    const tb = el.querySelector('[data-rp-toggle]');
    if(tb) tb.focus();
  }

  function onState(s){
    playing = s.playing;
    if(transport) transport.setPlaying(s.playing, s.done);
    if(audio){
      audio.playbackRate = s.speed;
      if(!s.playing && !audio.paused) audio.pause();
    }
    if(s.done && !s.playing){
      const c = el.querySelector('[data-rp-clock]');
      if(c){ c.textContent = 'Session finished'; c.classList.remove('final10'); }
    }
  }

  function onFrame(t){
    if(destroyed || !built) return;
    if(transport) transport.paint(t);
    const c = el.querySelector('[data-rp-clock]');
    if(c){
      const left = Math.max(0, durationMs - t);
      c.textContent = fmt(left) + ' left';
      c.classList.toggle('final10', left <= 10000 && left > 0);
    }
    // The heavy repaint (trio + every racer canvas) is throttled to ~5 Hz;
    // the final frame always lands.
    if(t >= durationMs || lastFrameT < 0 || Math.abs(t - lastFrameT) >= 200){
      lastFrameT = t;
      try{ o.renderFrame(t); }catch(_){}
    }
    syncAudio(t);
  }

  function syncAudio(t){
    if(!audio || destroyed) return;
    const desired = (t - offsetMs) / 1000;
    const over = isFinite(audio.duration) && audio.duration > 0 && desired > audio.duration;
    if(!playing || t >= durationMs || desired < 0 || over){
      if(!audio.paused) audio.pause();
      return;
    }
    if(Math.abs((audio.currentTime || 0) - desired) > 0.35){
      try{ audio.currentTime = Math.max(0, desired); }catch(_){}
    }
    if(audio.paused) audio.play().catch(() => showAudioHint());
  }

  function showAudioHint(){
    if(destroyed || el.querySelector('[data-rp-audiofix]')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rp-speed'; b.setAttribute('data-rp-audiofix', '');
    b.textContent = '🎙 Enable voice';
    b.addEventListener('click', () => {
      if(clock && !playing) clock.play();
      if(audio) audio.play().catch(() => {});
      b.remove();
    });
    const bar = el.querySelector('[data-rp-bar]');
    if(bar) bar.appendChild(b);
  }

  intro();

  return {
    destroy(){
      destroyed = true;
      if(clock) clock.destroy();
      if(audio){ try{ audio.pause(); }catch(_){} audio.src = ''; audio = null; }
      el.innerHTML = '';
    },
  };
}
