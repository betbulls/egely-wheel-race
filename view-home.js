import { supabase } from './db.js';
import * as auth from './auth.js';
import { vitalityColor as vColor } from './analytics.js';
import { CATEGORIES, LEVELS, TIER_XP, computeAchievements, pickNextMilestones, computeLevelState } from './achievements.js';
import { fetchUserAchievements, recordNewUnlocks, markSeen } from './achievements-store.js';
import { fetchProgress } from './experiments-store.js';
import { completedExperimentCount, pickContinue, experimentState, getTopic } from './experiments.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// YYYY-MM-DD in local time, used for achievement unlock dates in the info popup.
const shortDate = iso => iso ? new Date(iso).toLocaleDateString('en-CA') : '';

// Migration helper: pre-hybrid dashboards used this flag to know they'd been
// loaded before. We reuse it once to silently sync existing unlocks to the DB
// without flooding the user with NEW pulses for past progress.
const MIGRATION_FLAG = 'ewr_seen_init';

// ---- Public landing (logged-out home) --------------------------------------
// Lazy-load the locally vendored Lottie player (shared with the connect guide).
let lottieLoading = null;
function loadLottie(){
  if(window.lottie) return Promise.resolve(window.lottie);
  if(lottieLoading) return lottieLoading;
  lottieLoading = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'assets/lottie.min.js';
    s.onload = () => resolve(window.lottie || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return lottieLoading;
}

function phFallbackArt(){
  return `<svg class="ph-art" viewBox="0 0 240 300" role="img" aria-label="Live energy core">
    <defs><linearGradient id="phg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#37dbff"/><stop offset="1" stop-color="#5230da"/></linearGradient></defs>
    <circle cx="120" cy="150" r="70" fill="none" stroke="url(#phg)" stroke-width="2.5" opacity="0.45"/>
    <circle cx="120" cy="150" r="48" fill="none" stroke="url(#phg)" stroke-width="2.5" stroke-dasharray="5 7" stroke-linecap="round"/>
    <circle cx="120" cy="150" r="26" fill="url(#phg)" opacity="0.92"/>
    <path d="M120 62v28M120 210v28M32 150h28M180 150h28" stroke="url(#phg)" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
  </svg>`;
}

// ---- Service showcase deck (animated, dark premium cards) ------------------
// One reusable card: text side + a live HTML "preview" widget on the media side.
function svcCard(o){
  const pts = (o.points || []).map(p => `<li>${p}</li>`).join('');
  const ctas = (o.ctas || []).map(c => {
    const ext = c.ext ? ' target="_blank" rel="noopener"' : '';
    return `<a class="${c.cls}" href="${c.href}"${ext}>${c.label}</a>`;
  }).join('');
  return `<article class="svc-card in-view svc-${o.mod}${o.alt ? ' svc-alt' : ''}">
    <div class="svc-text">
      <span class="svc-eyebrow">${o.eyebrow}</span>
      <h2 class="svc-h">${o.h}</h2>
      <p class="svc-lead">${o.lead}</p>
      <ul class="svc-points">${pts}</ul>
      <div class="svc-cta">${ctas}</div>
    </div>
    <div class="svc-media" aria-hidden="true">${o.media}</div>
  </article>`;
}

// Seamless vitality "wave": period 160, two tiles → translateX(-160) loops cleanly.
const linePts = ys => Array.from({ length: 21 }, (_, i) => `${i * 16},${ys[i % 10]}`).join(' ');
const YOU_PTS  = linePts([78, 60, 46, 56, 38, 30, 44, 34, 52, 66]);
const HOST_PTS = linePts([50, 44, 52, 40, 48, 38, 46, 42, 50, 46]);
const GRP_PTS  = linePts([64, 58, 66, 56, 62, 54, 60, 56, 64, 60]);

// Solo chart geometry (shared by the static initial frame + the JS driver) so
// the curve, the live number and the average line all come from ONE series.
const SOLO_W = 160, SOLO_H = 118, SOLO_STEP = 10, SOLO_PAD = 8, SOLO_VMAX = 18;
const soloY = v => SOLO_H - (v / SOLO_VMAX) * (SOLO_H - 2 * SOLO_PAD) - SOLO_PAD;
// Heat thresholds derived from the SAME band geometry as .sw-zones (equal thirds
// of the full chart height) so the live number's colour flips exactly where the
// plotted point crosses a band edge / the Strong·Balanced·Low label changes.
const soloVAt = y => (SOLO_H - SOLO_PAD - y) * SOLO_VMAX / (SOLO_H - 2 * SOLO_PAD);
const SOLO_Z_HI = soloVAt(SOLO_H / 3);       // ≈12.5 — green/Strong band above this
const SOLO_Z_LO = soloVAt(SOLO_H * 2 / 3);   // ≈5.5  — red/Low band below this
const soloZCol = v => v < SOLO_Z_LO ? '#f0746b' : v < SOLO_Z_HI ? '#ffd66b' : '#5fe0a0';
const SOLO_INIT = (() => {
  const ys = [8, 10, 9, 11, 10, 12, 9, 8, 10, 11, 9, 10, 12, 10, 9, 11, 10, 9];
  const avg = ys.reduce((a, b) => a + b, 0) / ys.length;
  const read = ys[ys.length - 1];
  return {
    ys,
    pts: ys.map((v, i) => `${i * SOLO_STEP},${soloY(v).toFixed(1)}`).join(' '),
    avgTop: (soloY(avg) / SOLO_H * 100).toFixed(1),
    avgLabel: avg.toFixed(1),
    read: read.toFixed(1),
    color: soloZCol(read),
  };
})();

function soloMedia(){
  return `<div class="svc-screen">
    <div class="svc-screen-bar"><span class="svc-tag"><i></i>Solo · live reading</span><span class="sw-readout" data-fx="solo-read" style="color:${SOLO_INIT.color}">${SOLO_INIT.read}</span></div>
    <div class="sw-chart" data-fx="solo-chart">
      <div class="sw-zones"><span class="z-hi"></span><span class="z-mid"></span><span class="z-lo"></span></div>
      <div class="sw-grid"></div>
      <span class="sw-zlabel zl-hi">Strong</span>
      <span class="sw-zlabel zl-mid">Balanced</span>
      <span class="sw-zlabel zl-lo">Low</span>
      <svg class="sw-svg" viewBox="0 0 160 118" preserveAspectRatio="none" aria-hidden="true"><g class="sw-scroll-js" data-fx="solo-scroll"><polyline class="sw-line l-you" data-fx="solo-path" points="${SOLO_INIT.pts}"/></g></svg>
      <div class="sw-avg" data-fx="solo-avg" style="top:${SOLO_INIT.avgTop}%"><span class="sw-avg-pill">AVG ${SOLO_INIT.avgLabel}</span></div>
    </div>
    <div class="sw-foot"><span>Live vitality</span><span>VQ</span></div>
  </div>`;
}

function sessionMedia(){
  const ava = ['A', 'M', 'K', 'R', 'S'].map((c, i) => `<i class="${i < 4 ? 'sw-ava-on' : ''}">${c}</i>`).join('');
  return `<div class="svc-screen">
    <div class="svc-screen-bar"><span class="svc-tag"><i></i>Live session</span><span class="sw-room">● <b data-fx="room">6</b> in the room</span></div>
    <div class="sw-chart" style="height:88px">
      <div class="sw-zones"><span class="z-hi"></span><span class="z-mid"></span><span class="z-lo"></span></div>
      <div class="sw-grid"></div>
      <svg class="sw-svg" viewBox="0 0 160 88" preserveAspectRatio="none" aria-hidden="true"><g class="sw-scroll">
        <polyline class="sw-line l-host" points="${HOST_PTS}"/>
        <polyline class="sw-line l-grp" points="${GRP_PTS}"/>
        <polyline class="sw-line l-you" points="${YOU_PTS}"/>
      </g></svg>
    </div>
    <div class="sw-legend"><span class="lg-host">Host</span><span class="lg-grp">Group</span><span class="lg-you">You</span></div>
    <div class="sw-ava">${ava}<span class="sw-ava-more">+ practicing together</span></div>
  </div>`;
}

function raceMedia(){
  const lane = (rk, col, label, val, left, fillW, lead) => `
      <div class="sw-lane${lead ? ' lead' : ''}" style="--laneCol:${col}">
        <span class="sw-rk">${rk}</span>
        <div class="sw-track"><span class="sw-track-fill" style="width:${fillW}%"></span><span class="sw-fin"></span><span class="sw-puck" style="left:${left}%">${label}</span></div>
        <span class="sw-v">${val}</span>
      </div>`;
  return `<div class="svc-screen sw-race">
    <div class="svc-screen-bar"><span class="svc-tag"><i></i>Race preview</span><span class="sw-clock" data-fx="clock">18s</span></div>
    <div class="sw-lanes">
      ${lane(1, '#caa23c', 'A', 18, 67, 70, true)}
      ${lane(2, '#6a4cf0', 'You', 15, 57, 60, false)}
      ${lane(3, '#c0407a', 'M', 11, 44, 46, false)}
    </div>
  </div>`;
}

function expMedia(){
  const nodes = Array.from({ length: 7 }, (_, i) => {
    const st = i < 2 ? 'done' : (i === 2 ? 'cur' : '');
    const inner = i < 2 ? '✓' : (i + 1);
    return `<div class="sw-node ${st}" data-node="${i}"><span class="sw-node-d">${inner}</span><span class="sw-node-l">D${i + 1}</span></div>`;
  }).join('');
  return `<div class="svc-screen">
    <div class="svc-screen-bar"><span class="svc-tag"><i></i>Guided experiment</span><span class="sw-day">Day <b data-fx="day">3</b><span style="color:#5f6f7a">/7</span></span></div>
    <div class="sw-topic"><span class="sw-topic-ic">🌬️</span><div><div class="sw-topic-t">Breath &amp; Vitality</div><div class="sw-topic-s">7-day guided practice</div></div></div>
    <div class="sw-path">
      <div class="sw-path-line"></div><div class="sw-path-fill" data-fx="exp-fill" style="width:33%"></div>
      <div class="sw-nodes">${nodes}</div>
    </div>
  </div>`;
}

function makerMedia(){
  const tier = (i, name, pay, on) => `<div class="sw-tier${on ? ' on' : ''}" data-tier="${i}"><span class="sw-tier-n"><b></b>${name}</span><span class="sw-tier-pay">${pay}</span></div>`;
  return `<div class="sw-maker">
    <div class="sw-maker-logo"><img src="assets/spiritual-maker-logo.png" alt="Spiritual Maker" loading="lazy"></div>
    <div class="sw-tiers">
      ${tier(0, 'Advocate', '$50', false)}
      ${tier(1, 'Pro', '$70', true)}
      ${tier(2, 'Ambassador', '$100', false)}
    </div>
    <div class="sw-maker-foot"><b>30,000+</b> wheels sold · 30-year legacy</div>
  </div>`;
}

function membersMedia(){
  const row = (av, name, sub, stat, val, grad) => `
      <div class="sw-mem-row">
        <span class="sw-mem-av" style="--mg:${grad}">${av}</span>
        <div class="sw-mem-id"><span class="sw-mem-name">${name}</span><span class="sw-mem-sub">${sub}</span></div>
        ${stat === 'live'
          ? `<span class="sw-mem-stat live"><i></i><b data-memval style="color:${soloZCol(parseFloat(val))}">${val}</b></span>`
          : stat === 'online'
            ? `<span class="sw-mem-stat on">Online</span>`
            : `<span class="sw-mem-stat off">Idle</span>`}
      </div>`;
  return `<div class="svc-screen">
    <div class="svc-screen-bar"><span class="svc-tag"><i></i>Your members</span><span class="sw-room">● <b data-fx="mem-live">2</b> sharing live</span></div>
    <div class="sw-mem">
      ${row('A', 'Anna R.', 'Solo · live now', 'live', '12.4', 'linear-gradient(135deg,#37dbff,#5230da)')}
      ${row('M', 'Marco B.', 'Session · live now', 'live', '9.1', 'linear-gradient(135deg,#2fd07a,#0f8a52)')}
      ${row('K', 'Kai L.', 'Last seen 2m ago', 'online', '', 'linear-gradient(135deg,#ffd66b,#caa23c)')}
      ${row('S', 'Sofia P.', '3 measurements shared', 'off', '', 'linear-gradient(135deg,#f78da7,#c0407a)')}
    </div>
    <div class="sw-mem-foot">You share your readings back with your circle</div>
  </div>`;
}

function levelsMedia(){
  const NAMES = ['Explorer', 'Adept', 'Seeker', 'Guide', 'Master', 'Luminary'];
  const marks = NAMES.map((t, i) => `<div class="sw-lvl-mk${i < 3 ? ' reached' : ''}${i === 2 ? ' cur' : ''}" data-lvmk="${i}" style="left:${(i / 5 * 100).toFixed(2)}%"><span class="sw-lvl-dot"></span></div>`).join('');
  const BADGES = ['🎯', '🌿', '🛡️', '🏆', '💎', '🚀', '📈', '🌟'];
  const badges = BADGES.map((b, i) => `<span class="sw-badge${i < 3 ? ' got' : ''}" data-badge="${i}">${b}</span>`).join('');
  return `<div class="svc-screen">
    <div class="svc-screen-bar"><span class="svc-tag"><i></i>Your progress</span><span class="sw-xp"><b data-fx="xp">470</b> XP</span></div>
    <div class="sw-lvl">
      <div class="sw-lvl-head"><span class="sw-lvl-cur" data-fx="lvl-title">Level 3 · Seeker</span><span class="sw-lvl-next" data-fx="lvl-next">Next · Guide</span></div>
      <div class="sw-lvl-track"><div class="sw-lvl-fill" data-fx="lvl-fill" style="width:57.6%"></div>${marks}</div>
      <div class="sw-lvl-ends"><span>Explorer</span><span>Luminary</span></div>
    </div>
    <div class="sw-badges-head"><span class="sw-badges-lbl">Badges</span><span class="sw-badges-meta" data-fx="badge-meta">3 of 53 earned</span></div>
    <div class="sw-badges">${badges}</div>
  </div>`;
}

// Drives the live numbers/positions in the showcase widgets. CSS handles the
// ambient motion (scrolling lines, pulses); this ticks the dynamic values.
// Returns a stop() that clears every timer (called on re-render / unmount).
function startLandingFx(root){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return () => {};
  const timers = [];
  const cardOf = sel => root.querySelector(sel);

  // Pause a widget's ticking when its card is in a background tab OR scrolled
  // out of view (IntersectionObserver toggles .in-view; CSS pauses the pure-CSS
  // motion the same way). Credible, low-cost animation.
  let io = null;
  if('IntersectionObserver' in window){
    io = new IntersectionObserver(
      es => es.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting)),
      { rootMargin: '0px 0px -8% 0px' });
    root.querySelectorAll('.svc-card').forEach(c => io.observe(c));
  }
  const live = card => !document.hidden && (!card || card.classList.contains('in-view'));
  const every = (ms, fn, card) => timers.push(setInterval(() => { if(live(card)) fn(); }, ms));

  // Solo — ONE simulated series drives the curve, the live number AND the
  // average line, so nothing on the chart can contradict anything else.
  const soloChart = root.querySelector('[data-fx="solo-chart"]');
  if(soloChart){
    const soloCard = cardOf('.svc-solo');
    const g = soloChart.querySelector('[data-fx="solo-scroll"]');
    const path = soloChart.querySelector('[data-fx="solo-path"]');
    const readEl = root.querySelector('[data-fx="solo-read"]');
    const avgEl = soloChart.querySelector('[data-fx="solo-avg"]');
    const avgPill = avgEl && avgEl.querySelector('.sw-avg-pill');
    const series = SOLO_INIT.ys.slice();
    let last = series[series.length - 1];
    const TICK = 1000;
    const redraw = () => {
      if(path) path.setAttribute('points', series.map((v, i) => `${i * SOLO_STEP},${soloY(v).toFixed(1)}`).join(' '));
      const newest = series[series.length - 1];
      if(readEl){ readEl.textContent = newest.toFixed(1); readEl.style.color = soloZCol(newest); }
      const avg = series.reduce((a, b) => a + b, 0) / series.length;
      if(avgEl) avgEl.style.top = (soloY(avg) / SOLO_H * 100).toFixed(1) + '%';
      if(avgPill) avgPill.textContent = 'AVG ' + avg.toFixed(1);
    };
    every(TICK, () => {
      // Mean-reverting wander: lively, but stays in the readable mid-upper band
      // instead of flat-lining at the clamps.
      last = Math.max(4, Math.min(15, last + (Math.random() - 0.5) * 2.4 + (9.5 - last) * 0.1));
      series.push(Math.round(last * 10) / 10);
      series.shift();
      redraw();
      // Seamless leftward glide: reset to 0 (no transition), then animate one
      // sample-step left over the tick — the redraw already shifted the data.
      if(g){
        g.style.transition = 'none';
        g.style.transform = 'translateX(0)';
        void g.getBoundingClientRect();
        g.style.transition = `transform ${TICK}ms linear`;
        g.style.transform = `translateX(-${SOLO_STEP}px)`;
      }
    }, soloCard);
  }

  // Session room count — drifts gently.
  const room = root.querySelector('[data-fx="room"]');
  if(room) every(3200, () => { room.textContent = 5 + Math.floor(Math.random() * 4); }, cardOf('.svc-sess'));

  // Experiments — day cycles 1..7, nodes fill in, path grows.
  const dayEl = root.querySelector('[data-fx="day"]');
  const expFill = root.querySelector('[data-fx="exp-fill"]');
  const nodes = [...root.querySelectorAll('.sw-node')];
  if(dayEl && nodes.length){
    let day = 3;
    every(1500, () => {
      day = day >= 7 ? 1 : day + 1;
      dayEl.textContent = day;
      if(expFill) expFill.style.width = Math.round((day - 1) / 6 * 100) + '%';
      nodes.forEach((n, i) => {
        n.classList.remove('done', 'cur');
        const d = n.querySelector('.sw-node-d');
        if(i < day - 1){ n.classList.add('done'); if(d) d.textContent = '✓'; }
        else { if(i === day - 1) n.classList.add('cur'); if(d) d.textContent = i + 1; }
      });
    }, cardOf('.svc-exp'));
  }

  // Spiritual Maker — highlight cycles up the tier ladder.
  const tiers = [...root.querySelectorAll('.sw-tier')];
  if(tiers.length){
    let ti = 1;
    every(1700, () => {
      ti = (ti + 1) % tiers.length;
      tiers.forEach((el, i) => el.classList.toggle('on', i === ti));
    }, cardOf('.svc-maker'));
  }

  // Members — the live readings of members currently sharing tick like real data.
  const memVals = [...root.querySelectorAll('[data-memval]')];
  if(memVals.length){
    every(900, () => {
      memVals.forEach(el => {
        const prev = parseFloat(el.textContent) || 10;
        const v = Math.max(4, Math.min(15, prev + (Math.random() - 0.5) * 1.8 + (9.5 - prev) * 0.12));
        el.textContent = v.toFixed(1);
        el.style.color = soloZCol(v);
      });
    }, cardOf('.svc-members'));
  }

  // Levels — XP climbs, the journey fills, levels light up, badges unlock.
  const xpEl = root.querySelector('[data-fx="xp"]');
  const lvlFill = root.querySelector('[data-fx="lvl-fill"]');
  const lvlTitle = root.querySelector('[data-fx="lvl-title"]');
  const lvlNext = root.querySelector('[data-fx="lvl-next"]');
  const lvMarks = [...root.querySelectorAll('[data-lvmk]')];
  const lvBadges = [...root.querySelectorAll('[data-badge]')];
  const badgeMeta = root.querySelector('[data-fx="badge-meta"]');
  if(xpEl && lvMarks.length){
    const TH = [0, 100, 250, 500, 900, 1500];
    const NAMES = ['Explorer', 'Adept', 'Seeker', 'Guide', 'Master', 'Luminary'];
    let xp = 470;
    const paintLvl = () => {
      let idx = 0;
      for(let i = 0; i < TH.length; i++){ if(xp >= TH[i]) idx = i; }
      const nextTh = TH[idx + 1];
      const within = nextTh != null ? (xp - TH[idx]) / (nextTh - TH[idx]) : 0;
      const fill = (idx / 5 + within / 5) * 100;
      if(lvlFill) lvlFill.style.width = Math.min(100, fill).toFixed(1) + '%';
      xpEl.textContent = Math.round(xp);
      if(lvlTitle) lvlTitle.textContent = `Level ${idx + 1} · ${NAMES[idx]}`;
      if(lvlNext) lvlNext.textContent = nextTh != null ? `Next · ${NAMES[idx + 1]}` : 'Max level ✨';
      lvMarks.forEach((m, i) => { m.classList.toggle('reached', xp >= TH[i]); m.classList.toggle('cur', i === idx); });
      const got = Math.min(lvBadges.length, Math.max(1, Math.round(xp / 180)));
      if(badgeMeta) badgeMeta.textContent = got + ' of 53 earned';
      lvBadges.forEach((b, i) => {
        const on = i < got;
        if(on){ if(!b.classList.contains('got')) b.classList.add('got', 'pop'); }
        else b.classList.remove('got', 'pop');
      });
    };
    paintLvl();
    every(1000, () => {
      xp += 28 + Math.random() * 22;
      if(xp > 1500){ xp = 60; lvBadges.forEach(b => b.classList.remove('pop')); }
      paintLvl();
    }, cardOf('.svc-levels'));
  }

  // Race — a live simulation: scores climb, pucks glide, ranks reshuffle,
  // the clock counts down, then it resets for the next heat.
  const raceLanes = [...root.querySelectorAll('.sw-race .sw-lane')].map(el => ({
    el, rk: el.querySelector('.sw-rk'), puck: el.querySelector('.sw-puck'),
    fill: el.querySelector('.sw-track-fill'), v: el.querySelector('.sw-v'), score: 0, rate: 1,
  }));
  const clockEl = root.querySelector('[data-fx="clock"]');
  if(raceLanes.length){
    const FINISH = 22;
    let clock = 18;
    const paint = () => {
      raceLanes.forEach(l => {
        const left = 7 + Math.min(l.score, FINISH) / FINISH * 80;
        if(l.puck) l.puck.style.left = left + '%';
        if(l.fill) l.fill.style.width = left + '%';
        if(l.v) l.v.textContent = Math.round(l.score);
      });
      [...raceLanes].sort((a, b) => b.score - a.score).forEach((l, i) => {
        if(l.rk) l.rk.textContent = i + 1;
        l.el.classList.toggle('lead', i === 0);
      });
    };
    const seed = [16.5, 13.75, 10.2];
    raceLanes.forEach((l, i) => { l.score = seed[i] != null ? seed[i] : 8; l.rate = 0.7 + Math.random(); });
    paint();
    every(850, () => {
      clock -= 1;
      const leader = Math.max(...raceLanes.map(l => l.score));
      if(clock <= 0 || leader >= FINISH){
        clock = 18;
        raceLanes.forEach(l => { l.score = Math.random() * 2; l.rate = 0.7 + Math.random(); });
        if(clockEl) clockEl.textContent = '18s';
        paint();
        return;
      }
      raceLanes.forEach(l => { l.score += l.rate * (0.6 + Math.random() * 0.9); });
      if(clockEl) clockEl.textContent = clock + 's';
      paint();
    }, cardOf('.svc-race'));
  }

  return () => { timers.forEach(clearInterval); if(io) io.disconnect(); };
}

function publicLandingHtml(){
  return `
  <div class="ph-wrap">
    <section class="ph-hero">
      <div class="ph-hero-text">
        <span class="ph-eyebrow"><span class="ph-eyebrow-dot"></span> A live space for your Egely Wheel</span>
        <h1>Measure your vitality. Practice together. Race live.</h1>
        <p class="ph-lead">Turn every Egely Wheel reading into visible progress — measure solo, join live sessions, race friends, or follow guided experiments in real time.</p>
        <div class="ph-cta-row">
          <a class="btn-join" href="#/login">Log in or sign up</a>
          <a class="btn-secondary" href="#/how-to-connect">How to connect your wheel</a>
        </div>
        <p class="ph-note">Watching is free. Measuring requires an Egely Wheel.</p>
      </div>
      <div class="ph-stage" id="phStage">
        <div class="ph-energy" aria-hidden="true"><span class="ph-glow"></span><span class="ph-ring"></span><span class="ph-ring"></span><span class="ph-ring"></span></div>
        <div class="ph-lottie" id="phLottie"></div>
        <div class="ph-fallback">${phFallbackArt()}</div>
      </div>
    </section>

    <h2 class="ph-section-h">How EWR Live works</h2>
    <div class="ph-steps">
      <div class="ph-step"><span class="ph-step-n">1</span><span class="ph-step-t">Connect your wheel</span></div>
      <span class="ph-step-sep" aria-hidden="true"></span>
      <div class="ph-step"><span class="ph-step-n">2</span><span class="ph-step-t">Measure, practice or race live</span></div>
      <span class="ph-step-sep" aria-hidden="true"></span>
      <div class="ph-step"><span class="ph-step-n">3</span><span class="ph-step-t">Watch your progress grow</span></div>
    </div>

    <div class="svc-intro">
      <h2>Turn one reading into a whole practice</h2>
      <p>Connect your Egely Wheel in the browser and bring every measurement to life — measure, practice, compete, connect and grow, all in one live space.</p>
    </div>
    <div class="svc-deck">
      ${svcCard({
        mod: 'solo', eyebrow: 'Solo',
        h: 'Measure your vitality, live',
        lead: 'Watch your reading move in real time on a calm, zone-aware chart — then save every measurement to follow your vitality over days and weeks.',
        points: ['See your vitality change moment by moment', 'Every measurement saved to your history', 'Personal trends, peaks and steadiness'],
        ctas: [{ cls: 'svc-go', href: '#/login', label: 'Start measuring' }, { cls: 'svc-ghost', href: '#/how-to-connect', label: 'How to connect' }],
        media: soloMedia(),
      })}
      ${svcCard({
        mod: 'maker', alt: true, eyebrow: 'Spiritual Maker',
        h: 'Share the practice. Earn on every wheel.',
        lead: 'Join the Spiritual Maker partner program and recommend a wheel with a 30-year legacy and 30,000+ sold — with a dedicated profile page, ready-made marketing assets and a personal manager behind you.',
        points: ['Earn $50–$100 per Egely Wheel sale', 'Your own Spiritual Maker profile page', 'Marketing assets + dedicated manager support'],
        ctas: [{ cls: 'svc-go', href: 'https://egelywheel.com/pages/egely-wheel-affiliate', label: 'Become a Spiritual Maker ↗', ext: true }, { cls: 'svc-ghost', href: '#/spiritual-makers', label: 'Maker features' }],
        media: makerMedia(),
      })}
      ${svcCard({
        mod: 'sess', eyebrow: 'Live Sessions',
        h: 'Practice together, in real time',
        lead: 'Join a live room and measure alongside others. Host, group and your own line move together as one shared, official session.',
        points: ['See everyone’s energy move live', 'Host or join official group measurements', 'Verified results and a saved group average'],
        ctas: [{ cls: 'svc-go', href: '#/sessions', label: 'Explore sessions' }, { cls: 'svc-ghost', href: '#/login', label: 'Join free' }],
        media: sessionMedia(),
      })}
      ${svcCard({
        mod: 'race', alt: true, eyebrow: 'Race',
        h: 'Turn a measurement into a race',
        lead: 'Invite friends, enter the lobby, and race together. Your live vitality drives your racer forward — while the measured score decides the official result.',
        points: ['Race from different phones or computers', 'Public, invite-only and follower races', 'Live positions, a verified result, saved to your history'],
        ctas: [{ cls: 'svc-go', href: '#/races', label: 'Explore races' }, { cls: 'svc-ghost', href: '#/login', label: 'Create a race' }],
        media: raceMedia(),
      })}
      ${svcCard({
        mod: 'exp', eyebrow: 'Experiments',
        h: 'Guided, day-by-day practice',
        lead: 'Follow structured experiments that build a habit. Finish each day with a measurement and a short reflection, and watch your progress fill in.',
        points: ['Multi-day guided programmes', 'A measurement to close every day', 'Track completion and growth over time'],
        ctas: [{ cls: 'svc-go', href: '#/experiments', label: 'Browse experiments' }, { cls: 'svc-ghost', href: '#/login', label: 'Start free' }],
        media: expMedia(),
      })}
      ${svcCard({
        mod: 'members', alt: true, eyebrow: 'Members',
        h: 'Build your circle. Share your energy.',
        lead: 'Share your connect link to gather members, watch their readings arrive live, and share your own measurements back with the people you trust.',
        points: ['Gather followers with your connect link', 'See your members’ live measurements and results', 'Share your own readings with people you choose'],
        ctas: [{ cls: 'svc-go', href: '#/login', label: 'Build your circle' }, { cls: 'svc-ghost', href: '#/live', label: 'See the Live wall' }],
        media: membersMedia(),
      })}
      ${svcCard({
        mod: 'levels', eyebrow: 'Levels & Badges',
        h: 'Level up your practice',
        lead: 'Every saved measurement earns XP. Climb from Explorer to Luminary and unlock badges for streaks, milestones and breakthroughs along the way.',
        points: ['Earn XP from every measurement', 'Climb 6 levels — Explorer to Luminary', 'Unlock 50+ badges across 11 categories'],
        ctas: [{ cls: 'svc-go', href: '#/login', label: 'Start your journey' }, { cls: 'svc-ghost', href: '#/journey', label: 'How levels work' }],
        media: levelsMedia(),
      })}
    </div>

    <h2 class="ph-section-h">Free to explore. Measure with a wheel.</h2>
    <div class="ph-compare">
      <div class="ph-col">
        <div class="ph-col-h">Free account</div>
        <ul class="ph-list">
          <li>Watch the Live community</li>
          <li>Explore sessions, races and the ranking</li>
          <li>Watch live races and explore results</li>
          <li>Build your profile and join in</li>
        </ul>
      </div>
      <div class="ph-col ph-col-wheel">
        <div class="ph-col-h">With an Egely Wheel</div>
        <ul class="ph-list ph-list-wheel">
          <li>Connect your wheel in the browser</li>
          <li>Save your solo measurements</li>
          <li>Complete guided experiments</li>
          <li>Join and host official sessions</li>
          <li>Join and host live races</li>
        </ul>
        <div class="ph-price">
          <div class="ph-price-row">
            <span class="ph-price-label">EWR Live access</span>
            <span class="ph-price-vals"><span class="ph-price-old">$99</span><span class="ph-price-new">$49</span><span class="ph-price-per">/ year</span></span>
          </div>
          <p class="ph-price-note">1 year included free with the <a href="https://egelywheel.com/products/vitality-pack" target="_blank" rel="noopener">Egely Wheel Vitality Pack</a>.</p>
          <a class="btn-join ph-compare-cta" href="https://egelywheel.com/products/ewr-subscription" target="_blank" rel="noopener">Subscribe to measure</a>
        </div>
      </div>
    </div>

    <div class="ph-vpack">
      <div class="ph-vpack-media">
        <img src="https://cdn.shopify.com/s/files/1/0946/2382/6306/files/VitalityPack-EgelyWheel.jpg?v=1777371828" alt="Egely Wheel Vitality Pack" loading="lazy" onerror="this.closest('.ph-vpack-media').classList.add('noimg')">
        <span class="ph-vpack-ph">Egely Wheel Vitality Pack</span>
      </div>
      <div class="ph-vpack-body">
        <span class="ph-vpack-eyebrow">Complete kit</span>
        <h3>Egely Wheel Vitality Pack</h3>
        <span class="ph-vpack-incl">✓ Includes 1 year of EWR Live access</span>
        <p>The Egely Wheel and EWR Live together give you the full measurement experience — measure, practice and grow from your very first reading.</p>
        <div class="ph-vpack-foot">
          <span class="ph-vpack-price">$499</span>
          <a class="btn-join" href="https://egelywheel.com/products/vitality-pack" target="_blank" rel="noopener">See the Vitality Pack</a>
        </div>
      </div>
    </div>

    <h2 class="ph-section-h">Connect right in the browser</h2>
    <div class="ph-connect">
      <div class="ph-connect-items">
        <div class="ph-connect-item"><img class="ph-connect-logo" src="assets/android.png" alt="Android" loading="lazy"><span class="ph-connect-dev">Android</span><span class="ph-connect-how">Chrome</span></div>
        <div class="ph-connect-item"><img class="ph-connect-logo" src="assets/chrome.png" alt="Chrome" loading="lazy"><span class="ph-connect-dev">Mac &amp; Windows</span><span class="ph-connect-how">Chrome</span></div>
        <div class="ph-connect-item ph-connect-ios"><img class="ph-connect-logo" src="assets/apple.png" alt="Apple" loading="lazy"><span class="ph-connect-dev">iPhone &amp; iPad</span><span class="ph-connect-how">Bluefy — Web BLE browser</span></div>
      </div>
      <a class="btn-secondary" href="#/how-to-connect">See the connection guide</a>
    </div>

    <div class="ph-practice">
      <h2 class="ph-section-h" style="margin:0 0 8px">Friendly competition. Meaningful progress.</h2>
      <p>Race for the moment, then keep the result as part of your longer journey — every run feeds your measurements, achievements and progress over time.</p>
    </div>
  </div>`;
}

export function mount(el){
  // One delegated handler for the badge "i" buttons, bound for the whole
  // lifetime of the view. It MUST live here (not inside render/async): the
  // dashboard re-renders on every auth change, and overlapping async renders
  // used to bind this twice to the same #homeBody — so a tap toggled
  // `.expanded` an even number of times and appeared to do nothing.
  const onInfoClick = (e) => {
    const btn = e.target.closest('.db-info');
    if(!btn) return;
    e.preventDefault();
    const card = btn.closest('.dash-badge, .dash-recent-card');
    if(card) card.classList.toggle('expanded');
  };
  el.addEventListener('click', onInfoClick);

  // Auth state can resolve AFTER mount on a hard refresh (Supabase session
  // restoration is async). Re-render whenever the state changes meaningfully
  // so we don't get stuck on the logged-out screen.
  let sig = null;
  let publicAnim = null;   // Lottie instance on the public landing (torn down on re-render/unmount)
  let publicFx = null;     // showcase-deck animation timers (stop() torn down on re-render/unmount)
  const unsubAuth = auth.subscribeAuth(() => {
    const a = auth.getState();
    const newSig = (a.user?.id || '') + '|' + (a.displayName || '') + '|' + (a.isPractitioner ? '1' : '0');
    if(newSig === sig) return;
    sig = newSig;
    render();
  });
  // The upcoming-sessions teaser counts down once per second, so the final
  // minute ticks to zero instead of freezing on a stale "in 40s".
  const cdTimer = setInterval(() => {
    const now = Date.now();
    el.querySelectorAll('.home-sess-card').forEach(card => {
      const start = Number(card.dataset.start);
      const cd = card.querySelector('.hs-cd');
      if(!cd || !start) return;
      if(now >= start){
        if(!card.classList.contains('live')){
          card.classList.add('live');
          cd.innerHTML = '<span class="hs-live">● Live now</span>';
        }
      } else {
        cd.textContent = 'in ' + formatUntil(start - now);
      }
    });
  }, 1000);
  return () => { clearInterval(cdTimer); unsubAuth(); el.removeEventListener('click', onInfoClick); if(publicAnim){ try { publicAnim.destroy(); } catch {} } if(publicFx){ try { publicFx(); } catch {} } };

  function render(){
    const a = auth.getState();
    const userId = a.user?.id || null;

    // Any prior public-landing Lottie / showcase timers are torn down first.
    if(publicAnim){ try { publicAnim.destroy(); } catch {} publicAnim = null; }
    if(publicFx){ try { publicFx(); } catch {} publicFx = null; }

    // Logged-out home: the public EWR Live landing page.
    if(!userId){
      el.innerHTML = publicLandingHtml();
      publicFx = startLandingFx(el);
      // Honor prefers-reduced-motion: skip the looping Lottie wheel entirely and
      // keep the static fallback art (lottie drives frames via JS, so no CSS
      // @media rule could otherwise stop it).
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const stage = el.querySelector('#phStage');
      const box = el.querySelector('#phLottie');
      if(!reduceMotion) loadLottie().then(lottie => {
        if(!lottie || !stage || !box) return;
        try {
          publicAnim = lottie.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: true, path: 'assets/egely-wheel.json' });
          publicAnim.addEventListener('DOMLoaded', () => stage.classList.add('loaded'));
        } catch { /* keep the fallback art */ }
      });
      return;
    }

    el.innerHTML = `
      <div class="view-head">
        <h1 class="page-title">Welcome${a.displayName ? ', ' + esc(a.displayName) : ''}</h1>
        <p class="page-sub">Your journey at a glance.</p>
      </div>
      <div id="homeBody"><div class="empty">Loading…</div></div>`;

  (async () => {
    // ---- One coordinated data fetch -----------------------------------------
    // Sessions that started in the past 4 hours (still possibly live) or in the
    // future — capped to ~10 for the small teaser block on the dashboard.
    const sessionWindow = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
    const [resR, hostedR, prRecvR, stored, upcomingR, progByExp, upcomingRacesR] = await Promise.all([
      supabase.from('results').select('*').eq('user_id', userId),
      supabase.from('sessions').select('id, event_type').eq('created_by_user_id', userId),
      supabase.from('practitioner_links').select('practitioner_id').eq('client_id', userId).eq('status', 'active'),
      fetchUserAchievements(userId),
      supabase.from('sessions')
        .select('id, name, scheduled_start, duration_minutes, created_by_user_id, created_by, verified_only, access_mode')
        .eq('event_type', 'session')
        .gte('scheduled_start', sessionWindow)
        .order('scheduled_start', { ascending: true })
        .limit(10),
      fetchProgress(userId),
      supabase.from('sessions')
        .select('id, name, scheduled_start, duration_minutes, created_by_user_id, created_by, verified_only, access_mode')
        .eq('event_type', 'race')
        .gte('scheduled_start', sessionWindow)
        .order('scheduled_start', { ascending: true })
        .limit(10),
    ]);
    const results = resR.data || [];
    const experimentsCompleted = completedExperimentCount(progByExp);
    const continueExp = pickContinue(progByExp);
    const hostedRows = (hostedR.data || []).filter(s => s.event_type !== 'race');   // sessions only
    const hostedRacesCount = (hostedR.data || []).filter(s => s.event_type === 'race').length;
    const hostedIds = hostedRows.map(s => s.id);

    // Participants in my hosted sessions — needed for Community Host / Crowd
    // Leader / Practitioner Circle. Single query, useful for everyone.
    let hostedParticipants = new Map();   // session_id -> Set of user_ids
    if(hostedIds.length){
      const { data: hostedRes } = await supabase.from('results')
        .select('user_id, session_id').in('session_id', hostedIds);
      for(const r of (hostedRes || [])){
        if(!hostedParticipants.has(r.session_id)) hostedParticipants.set(r.session_id, new Set());
        hostedParticipants.get(r.session_id).add(r.user_id);
      }
    }
    const hostedParticipantsMax = hostedParticipants.size
      ? Math.max(...[...hostedParticipants.values()].map(s => s.size))
      : 0;

    let clientsCount = 0, clientFirstMeasurementSeen = false, guidedSession = false, practitionerCircleCount = 0;
    if(a.isPractitioner){
      const { data: cli } = await supabase.from('practitioner_links')
        .select('client_id').eq('practitioner_id', userId).eq('status', 'active');
      const clientIds = (cli || []).map(c => c.client_id);
      clientsCount = clientIds.length;

      if(clientIds.length){
        const { data: anyRes } = await supabase.from('results')
          .select('id').in('user_id', clientIds).limit(1);
        clientFirstMeasurementSeen = !!(anyRes && anyRes.length);

        const clientSet = new Set(clientIds);
        for(const set of hostedParticipants.values()){
          let circle = 0;
          for(const uid of set){ if(clientSet.has(uid)) circle++; }
          if(circle > practitionerCircleCount) practitionerCircleCount = circle;
        }
        guidedSession = practitionerCircleCount > 0;
      }
    }

    // Race competitive flags — First Race Win / Podium require ≥2 officially-ranked
    // racers (a solo race never grants them).
    const raceResults = results.filter(r => r.kind === 'race');
    const raceCount = raceResults.length;
    let raceWin = false, racePodium = false;
    const myRankedRaces = raceResults.filter(r => r.final_rank != null && r.session_id != null);
    if(myRankedRaces.length){
      const rids = [...new Set(myRankedRaces.map(r => r.session_id))];
      const { data: fieldRows } = await supabase.from('results')
        .select('session_id').eq('kind', 'race').in('session_id', rids).not('final_rank', 'is', null);
      const fieldSize = new Map();
      for(const fr of (fieldRows || [])) fieldSize.set(fr.session_id, (fieldSize.get(fr.session_id) || 0) + 1);
      for(const r of myRankedRaces){
        if((fieldSize.get(r.session_id) || 1) >= 2){
          if(r.final_rank === 1) raceWin = true;
          if(r.final_rank <= 3) racePodium = true;
        }
      }
    }

    const data = {
      results,
      raceCount, hostedRacesCount, raceWin, racePodium,
      hostedSessionsCount: hostedRows.length,
      connectedPractitionersCount: (prRecvR.data || []).length,
      isPractitioner: !!a.isPractitioner,
      clientsCount, clientFirstMeasurementSeen, guidedSession,
      hostedParticipantsMax, practitionerCircleCount,
      experimentsCompleted,
    };
    const achievements = computeAchievements(data);

    // ---- Upcoming Sessions for the Home teaser -----------------------------
    const tNow = Date.now();
    const upcoming = (upcomingR.data || [])
      .filter(s => {
        const start = new Date(s.scheduled_start).getTime();
        const end = start + (s.duration_minutes || 0) * 60000;
        return tNow <= end;   // live OR future
      })
      .slice(0, 3);
    // Participant count = distinct user_ids in `results` for that session.
    // Live sessions can already have a few; future sessions sit at zero (no RSVP).
    if(upcoming.length){
      const ids = upcoming.map(s => s.id);
      const { data: parts } = await supabase.from('results')
        .select('session_id, user_id').in('session_id', ids);
      const counts = new Map();
      for(const r of (parts || [])){
        if(!counts.has(r.session_id)) counts.set(r.session_id, new Set());
        counts.get(r.session_id).add(r.user_id);
      }
      for(const s of upcoming) s._participants = (counts.get(s.id) || new Set()).size;

      // Host face + name for each card — the host is a trust/community anchor.
      const hostIds = [...new Set(upcoming.map(s => s.created_by_user_id).filter(Boolean))];
      if(hostIds.length){
        const { data: hp } = await supabase.from('profiles')
          .select('id, display_name, avatar_url').in('id', hostIds);
        const hostById = new Map((hp || []).map(p => [p.id, p]));
        for(const s of upcoming){
          const p = s.created_by_user_id ? hostById.get(s.created_by_user_id) : null;
          s._host = { name: (p && p.display_name) || s.created_by || 'Host', avatar: p && p.avatar_url };
        }
      }
    }

    // ---- Upcoming Races (its own block + query — never mixed with sessions) -
    const upcomingRaces = (upcomingRacesR.data || [])
      .filter(s => tNow <= new Date(s.scheduled_start).getTime() + (s.duration_minutes || 0) * 60000)
      .slice(0, 3);
    await enrichUpcoming(upcomingRaces);

    // ---- "Once earned, always shown" ----------------------------------------
    // Stored unlocks are canonical. If the DB has a row but compute currently
    // says false (e.g. test data was deleted), keep the badge unlocked.
    for(const ach of achievements){
      if(stored.has(ach.id) && !ach.unlocked){
        ach.unlocked = true;
        if(ach.current < ach.target) ach.current = ach.target;
      }
    }

    // ---- Sync newly-earned unlocks to the DB --------------------------------
    // First hybrid load for an existing user (DB empty but compute has unlocks
    // and they've used the dashboard before) is a silent migration — no flood.
    const unlockedNow = achievements.filter(a => a.unlocked);
    const missing = unlockedNow.filter(a => !stored.has(a.id));
    const hadPriorDashboardLoad = !!localStorage.getItem(MIGRATION_FLAG);
    const silentMigration = stored.size === 0 && missing.length > 0 && hadPriorDashboardLoad;

    // Optimistically update the local map so render reflects this state.
    const nowIso = new Date().toISOString();
    for(const a of missing){
      stored.set(a.id, { achievement_id: a.id, unlocked_at: nowIso, seen_at: silentMigration ? nowIso : null });
    }
    // Persist in the background — best-effort, the UI doesn't wait.
    if(missing.length) recordNewUnlocks(userId, missing.map(a => a.id), { silent: silentMigration });
    try { localStorage.setItem(MIGRATION_FLAG, '1'); } catch {}

    // NEW = unlocked AND not yet seen.
    const newIds = new Set();
    for(const a of unlockedNow){
      const s = stored.get(a.id);
      if(s && !s.seen_at) newIds.add(a.id);
    }
    // After render, mark them seen for next time.
    if(newIds.size){
      setTimeout(() => markSeen(userId, [...newIds]), 0);
    }

    const sessionCount = results.filter(r => r.kind ? r.kind === 'session' : (r.session_id != null && r.experiment_id == null)).length;
    const soloCount = results.filter(r => r.kind ? r.kind === 'solo' : (r.session_id == null && r.experiment_id == null)).length;
    const verifiedRatio = results.length
      ? Math.round(results.filter(r => r.verified).length / results.length * 100)
      : 0;
    const bestAvg = results.reduce((m, r) => Math.max(m, r.avg || 0), 0);

    const levelState = computeLevelState(achievements);

    // Persist the current level so the header pill can show it everywhere,
    // and notify any listening UI to refresh.
    try {
      localStorage.setItem('ewr_level', JSON.stringify({
        idx: levelState.level.idx, title: levelState.level.title,
      }));
      window.dispatchEvent(new CustomEvent('ewr-level-changed'));
    } catch {}

    // Level-up detection. Silent on first run so we don't celebrate a
    // migration; otherwise show a celebration banner above the Level card.
    const LEVEL_SEEN_KEY = 'ewr_level_seen';
    let lastSeen = null;
    try { const s = localStorage.getItem(LEVEL_SEEN_KEY); lastSeen = s ? parseInt(s, 10) : null; } catch {}
    let levelUpFromTitle = null;
    if(lastSeen == null){
      try { localStorage.setItem(LEVEL_SEEN_KEY, String(levelState.level.idx)); } catch {}
    } else if(levelState.level.idx > lastSeen){
      const fromLvl = LEVELS.find(l => l.idx === lastSeen);
      levelUpFromTitle = fromLvl ? fromLvl.title : '';
      try { localStorage.setItem(LEVEL_SEEN_KEY, String(levelState.level.idx)); } catch {}
    }

    el.querySelector('#homeBody').innerHTML = `
      ${levelUpFromTitle != null ? renderLevelUp(levelUpFromTitle, levelState.level.title) : ''}
      ${renderLevel(levelState)}
      ${renderStats({
        sessionCount, soloCount, raceCount, experimentsCompleted,
        clientsCount: a.isPractitioner ? clientsCount : null,
        bestAvg, verifiedRatio, total: results.length,
      })}
      ${renderContinueExperiment(continueExp, progByExp)}
      ${renderUpcoming(upcoming)}
      ${renderUpcoming(upcomingRaces, 'Upcoming Races', '#/race/', 'Enter')}
      ${renderRecent(achievements, newIds, stored)}
      ${renderNext(achievements)}
      ${renderCollection(achievements, newIds, stored)}
    `;

  })();
  }
}

// ---- Level-up celebration --------------------------------------------------
function renderLevelUp(from, to){
  return `
    <div class="level-up-banner">
      <span class="lub-sparkle">✨</span>
      <div class="lub-text">
        <div class="lub-eyebrow">Level Up</div>
        <div class="lub-title">${from ? `From <b>${esc(from)}</b> to ` : 'You have reached '}<b>${esc(to)}</b></div>
      </div>
      <span class="lub-sparkle">✨</span>
    </div>`;
}

// ---- Level Journey ---------------------------------------------------------
// Compact 3-column "journey" view: where you are, the whole path with dots,
// where you're heading. Dots are equidistant for readable labels; the bar's
// fill is mapped piecewise so each level segment owns equal visual space.
function renderLevel(s){
  const { level, nextLevel, isMax, totalXP, xpInLevel, xpForThis, xpToNext } = s;
  const span = LEVELS.length - 1;

  const fillPct = (() => {
    if(isMax) return 100;
    const from = (level.idx - 1) / span;
    const to   = level.idx       / span;
    const within = xpForThis > 0 ? (xpInLevel / xpForThis) : 0;
    return Math.max(0, Math.min(100, (from + within * (to - from)) * 100));
  })();

  const markers = LEVELS.map(L => {
    const pos = (L.idx - 1) / span * 100;
    const reached = totalXP >= L.threshold;
    const isCurrent = L.idx === level.idx;
    const status = isCurrent ? 'current' : reached ? 'reached' : 'future';
    return `
      <div class="lj-marker ${status}" style="left:${pos}%">
        <div class="lj-dot"></div>
        <div class="lj-label">${esc(L.title)}</div>
      </div>`;
  }).join('');

  return `
    <section class="level-journey level-tier-${level.idx}">
      <div class="lj-side lj-left">
        <div class="lj-eyebrow">Level ${level.idx}</div>
        <div class="lj-title">${esc(level.title)}</div>
        ${isMax
          ? '<div class="lj-meta lj-max">Max level reached ✨</div>'
          : `<div class="lj-meta">${xpInLevel} / ${xpForThis} XP</div>
             <div class="lj-meta lj-to-next">${xpToNext} XP to ${esc(nextLevel.title)}</div>`}
        <div class="lj-meta lj-total">Total XP · ${totalXP}</div>
      </div>
      <div class="lj-track">
        <div class="lj-bar"><div class="lj-bar-fill" style="width:${fillPct}%"></div></div>
        ${markers}
      </div>
      <div class="lj-side lj-right">
        ${isMax
          ? `<div class="lj-eyebrow">Mastery</div>
             <div class="lj-title-sm">Achieved ✨</div>`
          : `<div class="lj-eyebrow">Next</div>
             <div class="lj-title-sm">${esc(nextLevel.title)}</div>
             <div class="lj-meta">Unlocks at ${nextLevel.threshold} XP</div>`}
      </div>
    </section>
    <a class="lj-link" href="#/journey">What do the levels mean? <span>→</span></a>`;
}

// ---- Stats -----------------------------------------------------------------
function injectStatGridStyles(){
  if(document.getElementById('sgStyles')) return;
  const st = document.createElement('style'); st.id = 'sgStyles';
  st.textContent = `
  .dash-stats.sg-r4{grid-template-columns:repeat(4,1fr)}
  .dash-stats.sg-r3{grid-template-columns:repeat(3,1fr)}
  .dash-stats.sg-r2{grid-template-columns:repeat(2,1fr)}
  .ds-race-flag{display:inline-block;width:8px;height:8px;margin-right:5px;vertical-align:baseline;border-radius:2px;
    background:repeating-conic-gradient(#5230da 0 25%, transparent 0 50%) 0 / 4px 4px;opacity:.6}
  @media (max-width:600px){
    .dash-stats.sg-r4,.dash-stats.sg-r3,.dash-stats.sg-r2{grid-template-columns:repeat(2,1fr)}
    .dash-stats.sg-r3 > :last-child:nth-child(odd){grid-column:span 2}
  }`;
  document.head.appendChild(st);
}

// Stable 4 + 3 grid: row 1 = the four activity counts, row 2 = the rest.
function renderStats(s){
  injectStatGridStyles();
  const row1 = [
    { label: 'Sessions', val: s.sessionCount, color: '#5230da' },
    { label: 'Solo',     val: s.soloCount,    color: '#401d91' },
    { label: 'Experiments', val: s.experimentsCompleted || 0, color: '#6b3fd4' },
    { label: 'Races', val: s.raceCount || 0, color: '#5230da', race: true },
  ];
  const row2 = [
    s.clientsCount != null ? { label: 'Members', val: s.clientsCount, color: '#0f8a52' } : null,
    { label: 'Best Avg', val: s.total ? s.bestAvg.toFixed(1) : '–', color: s.total ? vColor(s.bestAvg) : '#99a2a7' },
    { label: 'Verified', val: s.total ? s.verifiedRatio + '%' : '–', color: '#b8860b' },
  ].filter(Boolean);
  const card = c => `
      <div class="dash-stat">
        <div class="dash-stat-val" style="color:${c.color}">${c.val}</div>
        <div class="dash-stat-lbl">${c.race ? '<span class="ds-race-flag" aria-hidden="true"></span>' : ''}${esc(c.label)}</div>
      </div>`;
  return `<div class="dash-stats sg-r4">${row1.map(card).join('')}</div>
    <div class="dash-stats sg-r${row2.length}" style="margin-top:10px">${row2.map(card).join('')}</div>`;
}

// ---- Continue Experiment ---------------------------------------------------
function renderContinueExperiment(exp, progByExp){
  if(!exp) return '';
  const st = experimentState(exp, progByExp.get(exp.id));
  const topic = getTopic(exp.topic);
  return `
    <h2 class="dash-h">Continue Experiment</h2>
    <a class="home-continue" href="#/experiment/${esc(exp.id)}">
      <span class="hc-icon">${topic ? topic.icon : '🧪'}</span>
      <div class="hc-info">
        <div class="hc-title">${esc(exp.title)}</div>
        <div class="hc-meta">Day ${st.currentNumber} of ${st.total}</div>
      </div>
      <span class="hc-cta">Continue →</span>
    </a>`;
}

// ---- Upcoming Sessions teaser ---------------------------------------------
function formatUntil(ms){
  if(ms <= 0) return 'now';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins  = Math.floor((totalSec % 3600) / 60);
  if(days >= 1)  return `${days} day${days > 1 ? 's' : ''}`;
  if(hours >= 1) return `${hours} hr${hours > 1 ? 's' : ''}`;
  if(mins >= 1)  return `${mins} min`;
  return `${totalSec}s`;   // final minute: count the seconds down to zero
}

function hsAvatar(host){
  const name = (host && host.name) || 'Host';
  if(host && host.avatar) return `<img class="sess-avatar" src="${esc(host.avatar)}" alt="">`;
  return `<span class="sess-avatar sess-avatar-initial">${esc(name.charAt(0).toUpperCase())}</span>`;
}

// Shared enrichment for an upcoming list (participant counts + host face).
async function enrichUpcoming(list){
  if(!list.length) return;
  const ids = list.map(s => s.id);
  const { data: parts } = await supabase.from('results').select('session_id, user_id').in('session_id', ids);
  const counts = new Map();
  for(const r of (parts || [])){ if(!counts.has(r.session_id)) counts.set(r.session_id, new Set()); counts.get(r.session_id).add(r.user_id); }
  for(const s of list) s._participants = (counts.get(s.id) || new Set()).size;
  const hostIds = [...new Set(list.map(s => s.created_by_user_id).filter(Boolean))];
  if(hostIds.length){
    const { data: hp } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', hostIds);
    const hostById = new Map((hp || []).map(p => [p.id, p]));
    for(const s of list){ const p = s.created_by_user_id ? hostById.get(s.created_by_user_id) : null; s._host = { name: (p && p.display_name) || s.created_by || 'Host', avatar: p && p.avatar_url }; }
  }
}

function renderUpcoming(sessions, heading = 'Upcoming Sessions', base = '#/room/', enterCta = 'View'){
  if(!sessions.length) return '';
  const now = Date.now();
  return `
    <h2 class="dash-h">${heading}</h2>
    <div class="home-sess">
      ${sessions.map(s => {
        const start = new Date(s.scheduled_start).getTime();
        const end   = start + (s.duration_minutes || 0) * 60000;
        const isLive = now >= start && now <= end;
        const time  = isLive ? '<span class="hs-live">● Live now</span>'
                             : `in ${esc(formatUntil(start - now))}`;
        const host  = s._host || { name: s.created_by || 'Host', avatar: null };
        const verified = s.verified_only ? ' <span class="sess-verified">✓ Verified</span>' : '';
        const accBase = 'display:inline-block;margin-left:6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:2px 8px;vertical-align:middle;';
        const access = s.access_mode === 'invite' ? ` <span style="${accBase}color:#5230da;background:rgba(82,48,218,.1)">Invite link</span>`
          : s.access_mode === 'followers' ? ` <span style="${accBase}color:#0e7490;background:rgba(14,116,144,.1)">Followers only</span>` : '';
        const partsTxt = s._participants > 0 ? ` · ${s._participants} measuring` : '';
        return `
          <a class="home-sess-card${isLive ? ' live' : ''}" href="${base}${s.id}" data-start="${start}" data-end="${end}">
            <div class="hs-row">
              <div class="hs-name">${esc(s.name || 'Untitled')}${verified}${access}</div>
              <span class="hs-action">${isLive ? 'Join' : enterCta} →</span>
            </div>
            <div class="hs-host">
              <span class="hs-host-av">${hsAvatar(host)}</span>
              <div class="hs-host-info">
                <span class="hs-host-name">Hosted by <b>${esc(host.name)}</b></span>
                <span class="hs-host-when"><span class="hs-cd">${time}</span>${partsTxt}</span>
              </div>
            </div>
          </a>`;
      }).join('')}
    </div>`;
}

// ---- Recent achievements ---------------------------------------------------
function renderRecent(achievements, newIds, stored){
  const unlocked = achievements.filter(a => a.unlocked);
  if(!unlocked.length) return '';
  // Sort newest first by the DB-stored unlocked_at (precise audit-trail).
  const tsOf = a => {
    const s = stored.get(a.id);
    return s && s.unlocked_at ? new Date(s.unlocked_at).getTime() : 0;
  };
  const sorted = [...unlocked].sort((a, b) => tsOf(b) - tsOf(a));
  // Float NEW ones to the very front so the pulse is immediately visible.
  sorted.sort((a, b) => (newIds.has(b.id) ? 1 : 0) - (newIds.has(a.id) ? 1 : 0));
  const top = sorted.slice(0, 8);
  const newBadge = newIds.size
    ? ` <span class="dash-new-count">${newIds.size} new</span>`
    : '';
  return `
    <h2 class="dash-h">Recent Achievements${newBadge}</h2>
    <div class="dash-recent">
      ${top.map(a => recentCard(a, newIds.has(a.id), stored)).join('')}
    </div>`;
}

function descBlock(a, stored){
  const xp = TIER_XP[a.tier] || 0;
  const storedEntry = stored ? stored.get(a.id) : null;
  const unlockedAt = storedEntry && storedEntry.unlocked_at;
  const metaParts = [];
  metaParts.push(`<span class="db-desc-xp">+${xp} XP</span>`);
  if(a.unlocked && unlockedAt){
    metaParts.push(`<span class="db-desc-when">Unlocked ${esc(shortDate(unlockedAt))}</span>`);
  } else if(a.unlocked){
    metaParts.push('<span class="db-desc-when">Unlocked</span>');
  }
  return `
    <div class="db-desc">
      <p class="db-desc-text">${esc(a.description)}</p>
      <div class="db-desc-meta">${metaParts.join(' · ')}</div>
    </div>`;
}

function recentCard(a, isNew, stored){
  return `
    <div class="dash-recent-card tier-${a.tier}${isNew ? ' is-new' : ''}" title="${esc(a.description)}">
      ${isNew ? '<span class="dash-new-pill">NEW</span>' : ''}
      <button type="button" class="db-info" aria-label="Info">i</button>
      <div class="drc-icon">${a.icon}</div>
      <div class="drc-title">${esc(a.title)}</div>
      ${descBlock(a, stored)}
    </div>`;
}

// ---- Next milestones -------------------------------------------------------
function renderNext(achievements){
  const next = pickNextMilestones(achievements, 3);
  if(!next.length){
    return `<h2 class="dash-h">Next milestones</h2>
      <div class="dash-empty">You've unlocked every milestone — beautifully done. ✨</div>`;
  }
  return `<h2 class="dash-h">Next milestones <span class="dash-h-sub">your closest unlocks</span></h2>
    <div class="dash-next">${next.map(milestoneCard).join('')}</div>`;
}

function milestoneCard(a){
  const pct = Math.min(100, Math.round((a.current / a.target) * 100));
  return `
    <div class="dash-milestone tier-${a.tier}">
      <div class="dm-row">
        <span class="dm-icon">${a.icon}</span>
        <div class="dm-title">${esc(a.title)}</div>
      </div>
      <div class="dm-bar"><div class="dm-bar-fill" style="width:${pct}%"></div></div>
      <div class="dm-progress">${a.current} / ${a.target}</div>
    </div>`;
}

// ---- Achievement collection ------------------------------------------------
function renderCollection(achievements, newIds, stored){
  const groups = new Map();
  for(const a of achievements){
    if(!groups.has(a.category)) groups.set(a.category, []);
    groups.get(a.category).push(a);
  }
  const totalUnlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;

  const sections = CATEGORIES
    .filter(c => groups.has(c.id))
    .map(c => {
      const items = groups.get(c.id);
      const unlocked = items.filter(x => x.unlocked).length;
      return `
        <section class="dash-cat">
          <div class="dash-cat-head">
            <h3 class="dash-cat-title">${esc(c.title)}</h3>
            <span class="dash-cat-count">${unlocked} / ${items.length}</span>
          </div>
          <div class="dash-badges">${items.map(a => badgeCard(a, newIds && newIds.has(a.id), stored)).join('')}</div>
        </section>`;
    });

  return `
    <h2 class="dash-h">Achievement Collection <span class="dash-h-sub">${totalUnlocked} / ${total} unlocked</span></h2>
    ${sections.join('')}`;
}

function badgeCard(a, isNew, stored){
  const status = a.unlocked
    ? '<div class="db-status unlocked">✓ Unlocked</div>'
    : `<div class="db-status">${a.current} / ${a.target}</div>`;
  const cls = ['dash-badge'];
  if(a.unlocked){ cls.push('unlocked', 'tier-' + a.tier); }
  else { cls.push('locked'); }
  if(isNew) cls.push('is-new');
  return `
    <div class="${cls.join(' ')}" title="${esc(a.description)}">
      ${isNew ? '<span class="dash-new-pill">NEW</span>' : ''}
      <button type="button" class="db-info" aria-label="Info">i</button>
      <div class="db-icon">${a.icon}</div>
      <div class="db-title">${esc(a.title)}</div>
      ${status}
      ${descBlock(a, stored)}
    </div>`;
}
