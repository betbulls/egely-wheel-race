// view-render.js — hidden social-video render stage.
//
// Routes: #/render/race/:id  and  #/render/session/:id
// This view is NEVER shown to app users — a headless browser (the Railway
// render worker, F2) loads it, plays the sequence, and screen-records it to an
// mp4 for TikTok / Reels / Shorts. It renders a dedicated dark "Replay Cinema"
// 9:16 (1080x1920) composition with its OWN styling, driven by the real event
// data and the shared replay clock (replay.js createReplayClock).
//
// Sequence (F1 step 2): intro card (~2.5s) → animated replay board → finale
// card (~3s). Step 1 (this pass) renders the three RACE frames statically from
// live data so we can verify the design holds with real content.

import { supabase } from './db.js';
import { createReplayClock } from './replay.js';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const zCol = v => v < 6 ? '#ff6257' : v < 13 ? '#ffc933' : '#3ddc8e';   // dark-stage zone colours
const flagHtml = cc => cc ? `<img class="rv-flag" src="https://flagcdn.com/80x60/${esc(String(cc).toLowerCase())}.png" alt="">` : '';
const initial = n => esc((n || '?').trim().charAt(0).toUpperCase() || '?');

const fmtClock = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const fmtWhen = iso => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch (_) { return ''; }
};

// Avatar disc: real photo inside a gradient ring, else a monogram coin.
function avatarHtml(url, name, cls) {
  const inner = url ? `<img src="${esc(url)}" alt="">` : `<span>${initial(name)}</span>`;
  return `<span class="rv-ava ${cls || ''}">${inner}</span>`;
}

// Cumulative score per 500ms slot (prefix sums, padded to N), 0 = unmeasured.
function cumOf(curve, N) {
  const cum = new Array(N);
  let s = 0;
  for (let i = 0; i < N; i++) { const v = Array.isArray(curve) ? curve[i] : null; if (v != null) s += v; cum[i] = s; }
  return cum;
}

// ---------------------------------------------------------------------------
// Data loading — mirrors view-race.js renderResults/loadLanes exactly, but
// viewer-neutral (no "You"): the video belongs to no single racer.
// ---------------------------------------------------------------------------
async function loadRace(id) {
  const rid = Number(id);
  const { data: session } = await supabase.from('sessions')
    .select('name, scheduled_start, duration_minutes, created_by, created_by_user_id, verified_only')
    .eq('id', rid).maybeSingle();
  if (!session) return null;

  const startMs = new Date(session.scheduled_start).getTime();
  const durationMs = (session.duration_minutes || 0) * 60000;
  const totalSlots = Math.max(1, Math.round(durationMs / 500));

  const { data: rows } = await supabase.from('results')
    .select('user_id, racer_name, curve, race_score, final_rank, first_slot, is_host, verified, avg, peak, steadiness')
    .eq('session_id', rid).eq('kind', 'race');
  const all = rows || [];

  const uids = [...new Set(all.map(r => r.user_id).filter(Boolean))];
  let prof = new Map();
  if (uids.length) {
    const { data: ps } = await supabase.from('profiles')
      .select('id, avatar_url, country, display_name').in('id', uids);
    prof = new Map((ps || []).map(p => [p.id, p]));
  }
  const hostProf = session.created_by_user_id ? prof.get(session.created_by_user_id) : null;

  const racers = all.map(r => {
    const p = prof.get(r.user_id) || {};
    return {
      name: r.racer_name || 'Racer',
      avatar: p.avatar_url || null,
      country: p.country || null,
      isHost: !!r.is_host,
      verified: r.verified,
      curve: Array.isArray(r.curve) ? r.curve : [],
      cum: cumOf(r.curve, totalSlots),
      raceScore: r.race_score || 0,
      finalRank: r.final_rank,
      firstSlot: r.first_slot,
      avg: r.avg || 0, peak: r.peak || 0, steadiness: r.steadiness || 0,
      ranked: r.first_slot != null && r.first_slot <= 10,
    };
  });
  // If nobody has a first_slot (legacy), treat everyone as ranked so the board is never empty.
  if (!racers.some(r => r.ranked)) racers.forEach(r => { r.ranked = true; });

  const totalSlotsForAvg = totalSlots;
  const avgOf = r => totalSlotsForAvg ? r.raceScore / totalSlotsForAvg : r.avg;

  return {
    kind: 'race', session, startMs, durationMs, totalSlots,
    title: session.name || 'Race',
    host: { name: (hostProf && hostProf.display_name) || session.created_by || 'The host', avatar: hostProf && hostProf.avatar_url },
    racers, avgOf,
    count: racers.length,
  };
}

// ---------------------------------------------------------------------------
// Frame templates
// ---------------------------------------------------------------------------
function headerHtml(d, label) {
  return `
    <div class="rv-brandrow">
      <div class="rv-brand">EWR <span>LIVE</span></div>
      <div class="rv-pill ${label.gold ? 'gold' : ''}"><i class="rv-dot"></i>${esc(label.text)}</div>
    </div>
    <div class="rv-event">
      ${avatarHtml(d.host.avatar, d.host.name, 'big')}
      <div class="rv-ev-txt">
        <div class="rv-ev-name">${esc(d.title)}</div>
        <div class="rv-ev-meta"><b>${d.kind === 'solo' ? '' : 'Hosted by '}${esc(d.host.name)}</b> · ${esc(fmtWhen(d.session.scheduled_start))} · ${d.durText || d.session.duration_minutes + ' min'}</div>
      </div>
    </div>`;
}

// In-flow placeholder for the camera band. The actual <video> lives in ONE
// absolutely-positioned layer on the stage (buildCamLayer) so playback never
// hiccups when the board frame swaps to the finale — the boards change UNDER it.
const camSpace = d => d.cam ? '<div class="rv-camspace"></div>' : '';

function introHtml(d, label, nounCount) {
  const pucks = (d.racers || d.members || []).slice(0, 3).map((r, i) =>
    `<span class="rv-puck" style="left:${18 + i * 19}%">${avatarHtml(r.avatar, r.name, 'pk')}</span>`).join('');
  return `
    <div class="rv-brandrow"><div class="rv-brand">EWR <span>LIVE</span></div></div>
    <div class="rv-center">
      <div class="rv-pill"><i class="rv-dot"></i>${esc(label.text)}</div>
      ${avatarHtml(d.host.avatar, d.host.name, 'hero')}
      <div class="rv-in-host">${d.kind === 'solo' ? '' : 'Hosted by '}<b>${esc(d.host.name)}</b></div>
      <div class="rv-in-name">${esc(d.title)}</div>
      <div class="rv-in-meta">${esc(fmtWhen(d.session.scheduled_start))}${d.kind === 'solo' ? '' : ` · ${d.count} ${nounCount}`} · ${d.durText || d.session.duration_minutes + ' min'}</div>
      ${d.cam ? '<div class="rv-pill gold rv-camchip"><i class="rv-dot"></i>🎥&nbsp; FILMED LIVE</div>' : ''}
      ${pucks ? `<div class="rv-mini-track"><span class="rv-finish"></span>${pucks}</div>` : ''}
    </div>
    <div class="rv-ft"><div class="rv-url">▶ replayed on <b>live.egelywheel.com</b></div></div>`;
}

function raceBoardHtml(d) {
  return `
    ${headerHtml(d, { text: 'RACE REPLAY' })}
    ${camSpace(d)}
    <div class="rv-lanes" id="rvLanes"></div>
    <div class="rv-more" id="rvMore" hidden></div>
    <div class="rv-ft">
      <div class="rv-clockrow"><div class="rv-clock" id="rvClock">0:00<small>left</small></div><div class="rv-spd" id="rvSpd">REPLAY · 1×</div></div>
      <div class="rv-prog"><i id="rvProg" style="width:0%"></i></div>
      <div class="rv-url">⚡ <b>live.egelywheel.com</b></div>
    </div>`;
}

function raceLaneHtml(r, rank, pos, live, isLeader) {
  const rc = rank < 4 ? 'r' + rank : 'rx';
  return `
    <div class="rv-lane ${isLeader ? 'leader' : ''}">
      <div class="rv-rank ${rc}">${rank}</div>
      <div class="rv-mid">
        <div class="rv-nrow"><span class="rv-nm">${esc(r.name)}</span>${flagHtml(r.country)}${r.isHost ? '<span class="rv-tag host">HOST</span>' : ''}</div>
        <div class="rv-track"><span class="rv-finish"></span>
          <span class="rv-puck" style="left:${pos.toFixed(1)}%">${avatarHtml(r.avatar, r.name, 'pk')}</span></div>
      </div>
      <div class="rv-nums"><div class="rv-lv" style="color:${zCol(live)}">${live}</div><div class="rv-lvl">LIVE</div>
        <div class="rv-sc">SCORE ${r.cumScore}${isLeader ? '<b>LEADER</b>' : ''}</div></div>
    </div>`;
}

function finalHtml(d) {
  const ranked = d.racers.filter(r => r.finalRank != null).sort((a, b) => a.finalRank - b.finalRank);
  const win = ranked[0] || d.racers.slice().sort((a, b) => b.raceScore - a.raceScore)[0];
  const others = ranked.slice(1, 3);
  const podCard = (r, rank) => `
    <div class="rv-pod-card ${rank === 3 ? 'bronze' : ''}">
      <div class="rv-pod-rank">${rank}</div>${avatarHtml(r.avatar, r.name, 'pod')}
      <div><div class="rv-pod-nm">${esc(r.name)}</div><div class="rv-pod-pts">${r.raceScore} pts</div></div>
    </div>`;
  return `
    ${headerHtml(d, { text: 'RACE FINISHED', gold: true })}
    ${camSpace(d)}
    <div class="rv-confetti" id="rvConfetti"></div>
    <div class="rv-win-wrap">
      <div class="rv-win-pill">🏆&nbsp; WINNER</div>
      ${avatarHtml(win.avatar, win.name, 'win goldring')}
      <div class="rv-win-name">${esc(win.name)}</div>
      <div class="rv-win-pts">${win.raceScore} pts</div>
      <div class="rv-win-meta">avg ${d.avgOf(win).toFixed(1)} · peak ${win.peak} · steadiness ${win.steadiness}</div>
      ${others.length ? `<div class="rv-podium">${others.map((r, i) => podCard(r, i + 2)).join('')}</div>` : ''}
      <div class="rv-win-count">${ranked.length} finisher${ranked.length === 1 ? '' : 's'} · ${esc(d.title)} · ${esc(fmtWhen(d.session.scheduled_start).split(' · ')[0])}</div>
      <div class="rv-cta">Race with us → live.egelywheel.com</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Race board: build the lane DOM ONCE (stable elements → CSS transitions work
// + avatar images don't reload), then repaint each frame — pucks glide (per-
// frame left), scores/ranks tick, and lanes swap places via FLIP when the
// standings change (the bar-chart-race drama the design calls for).
// ---------------------------------------------------------------------------
const TOP_LANES = 7;

function buildRaceLanes(stage, d) {
  const lanesEl = stage.querySelector('#rvLanes');
  // Ranked racers get a lane; unranked (late) go only to the "+N more" strip.
  d._laneRacers = d.racers.filter(r => r.ranked);
  lanesEl.innerHTML = d._laneRacers.map(raceLaneShell).join('');
  d._laneRacers.forEach((r, i) => { r.laneEl = lanesEl.children[i]; });
  d._lastOrder = '';
}

function raceLaneShell(r) {
  return `
    <div class="rv-lane" data-rid="${esc(r.name)}">
      <div class="rv-rank">–</div>
      <div class="rv-mid">
        <div class="rv-nrow"><span class="rv-nm">${esc(r.name)}</span>${flagHtml(r.country)}${r.isHost ? '<span class="rv-tag host">HOST</span>' : ''}</div>
        <div class="rv-track"><span class="rv-finish"></span>
          <span class="rv-puck" style="left:0%">${avatarHtml(r.avatar, r.name, 'pk')}</span></div>
      </div>
      <div class="rv-nums"><div class="rv-lv">0</div><div class="rv-lvl">LIVE</div>
        <div class="rv-sc">SCORE 0</div></div>
    </div>`;
}

function paintRaceFrame(stage, d, t) {
  const N = d.totalSlots, SLOT = 500, dur = d.durationMs;
  const k = t >= dur ? N - 1 : Math.max(0, Math.min(N - 1, Math.floor(t / SLOT)));

  const now = d._laneRacers.slice().sort((a, b) => b.cum[k] - a.cum[k]);
  const leader = (now[0] && now[0].cum[k] > 0) ? now[0] : null;
  const leaderScore = leader ? leader.cum[k] : 0;
  const leaderPos = 8 + Math.max(0, Math.min(1, t / dur)) * 88;

  const shown = now.slice(0, d._top || TOP_LANES);
  const rest = now.slice(d._top || TOP_LANES).concat(d.racers.filter(r => !r.ranked));

  now.forEach(r => {
    const el = r.laneEl; if (!el) return;
    const inTop = shown.indexOf(r) >= 0;
    el.style.display = inTop ? '' : 'none';
    if (!inTop) return;
    const rank = shown.indexOf(r) + 1;
    const score = r.cum[k];
    const live = r.curve[k] || 0;
    const isLeader = r === leader;
    const pos = !(score > 0) ? 0 : Math.max(0, Math.min(96, leaderPos * Math.pow(leaderScore > 0 ? score / leaderScore : 0, 1.5)));

    const rk = el.querySelector('.rv-rank');
    rk.textContent = String(rank);
    rk.className = 'rv-rank ' + (rank < 4 ? 'r' + rank : 'rx');
    el.classList.toggle('leader', isLeader);
    el.querySelector('.rv-puck').style.left = pos.toFixed(1) + '%';
    const lv = el.querySelector('.rv-lv');
    lv.textContent = live; lv.style.color = zCol(live);
    el.querySelector('.rv-sc').innerHTML = 'SCORE ' + score + (isLeader ? '<b>LEADER</b>' : '');
  });

  // FLIP re-order only when the standings actually changed.
  const order = shown.map(r => r.laneEl && r.laneEl.dataset.rid).join(',');
  if (order !== d._lastOrder) {
    flipReorder(stage.querySelector('#rvLanes'), shown.map(r => r.laneEl));
    d._lastOrder = order;
  }

  const moreEl = stage.querySelector('#rvMore');
  if (rest.length) {
    const next = rest[0];
    moreEl.hidden = false;
    moreEl.innerHTML = `＋ ${rest.length} more racing <span>next: ${esc(next.name)} · ${next.cum[k]} pts</span>`;
  } else { moreEl.hidden = true; }

  const left = Math.max(0, dur - t);
  const clockEl = stage.querySelector('#rvClock');
  if (clockEl) clockEl.innerHTML = fmtClock(left) + '<small>left</small>';
  const progEl = stage.querySelector('#rvProg');
  if (progEl) progEl.style.width = Math.max(0, Math.min(100, (t / dur) * 100)).toFixed(1) + '%';
}

// Classic FLIP: measure → reorder DOM → invert with a transform → play to zero.
function flipReorder(container, lanes) {
  const first = lanes.map(l => l.getBoundingClientRect().top);
  lanes.forEach(l => container.appendChild(l));   // apply the new order
  lanes.forEach((l, i) => {
    const dy = first[i] - l.getBoundingClientRect().top;
    if (!dy) return;
    l.style.transition = 'none';
    l.style.transform = `translateY(${dy}px)`;
    requestAnimationFrame(() => {
      l.style.transition = 'transform .55s cubic-bezier(.2,.8,.2,1)';
      l.style.transform = '';
    });
  });
}

// Csaba (2026-07-09): every video plays 1× — social platforms can speed up on
// upload; a sped-up master can't be slowed back down. (__rvSpeed still overrides.)
const raceSpeed = () => 1;

function showPhase(stage, ph) {
  stage.querySelectorAll('.rv-frame').forEach(f => { f.hidden = f.dataset.phase !== ph; });
}

// ---------------------------------------------------------------------------
// Camera composite. One <video> in one absolutely-positioned layer over the
// stage: the board→finale swap happens UNDER it, so playback never stutters.
// The board and finale frames reserve identical room via .rv-camspace; the
// layer is measured against the board's slot once it becomes visible.
// The element stays muted — the camera's own audio is muxed by the worker.
// ---------------------------------------------------------------------------
function buildCamLayer(stage, d) {
  const layer = document.createElement('div');
  layer.className = 'rv-camlayer';
  const inner = document.createElement('div');
  inner.className = 'rv-camin';
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  v.src = d.cam.url;                                   // .src property, never innerHTML
  const tag = document.createElement('div');
  tag.className = 'rv-camtag';
  tag.textContent = '🎥 ' + d.host.name;               // textContent → XSS-safe
  inner.appendChild(v); inner.appendChild(tag);
  layer.appendChild(inner);
  stage.appendChild(layer);
  d._cam = { layer, video: v };
}

function placeCam(stage, d) {
  const slot = stage.querySelector('.rv-frame[data-phase="board"] .rv-camspace');
  if (!slot || !d._cam) return;
  const r = slot.getBoundingClientRect();              // stage is fixed at (0,0) → page coords
  d._cam.layer.style.top = r.top + 'px';
  d._cam.layer.style.height = r.height + 'px';
}

// Auto sequence: intro hold (~2.5s) → board (sped up so the clip stays social-
// length) → finale → __rvDone. Driven by a performance.now() loop (real
// elapsed wall time × speed) rather than the clock's per-frame delta
// accumulator, so the timeline stays true regardless of the headless frame rate.
// The capture worker can override: __rvSpeed (1× when a voice recording will be
// muxed) and __rvHoldMs (finale holds until the recorded audio runs out).
function playSequence(stage, d, paintFrame, defSpeed, setStop) {
  window.__rvDone = false;
  showPhase(stage, 'intro');
  const SPEED = window.__rvSpeed || defSpeed(d.durationMs);
  const HOLD = window.__rvHoldMs || 3000;
  const spd = stage.querySelector('#rvSpd');
  if (spd) spd.textContent = 'REPLAY · ' + SPEED + '×' + (d.cam ? ' · 🎥 ON CAMERA' : window.__rvVoice ? ' · 🎙 LIVE VOICE' : '');
  let raf = 0, stopped = false;
  setStop(() => { stopped = true; if (raf) cancelAnimationFrame(raf); if (d._cam) { try { d._cam.video.pause(); } catch (_) {} } });
  // Prime the video decoder during the intro (play→pause→rewind) so playback
  // starts frame-instant at board time — kills the ~0.4s cold-start lag the
  // F0 spike measured in headless Chrome.
  if (d._cam) {
    const v = d._cam.video;
    const p = v.play();
    if (p && p.then) p.then(() => { v.pause(); try { v.currentTime = 0; } catch (_) {} }).catch(() => {});
  }
  setTimeout(() => {
    if (stopped || !stage.isConnected) return;
    showPhase(stage, 'board');
    if (d._cam) {                                       // camera cuts in with the board
      placeCam(stage, d);
      d._cam.layer.classList.add('on');
      const v = d._cam.video;
      // measure how late the first camera frame actually paints after the cut —
      // the worker shifts the muxed audio by this much (lip-sync)
      const t0 = performance.now();
      v.addEventListener('playing', () => { window.__rvCamLagMs = Math.round(performance.now() - t0); }, { once: true });
      const pl = v.play();
      if (pl && pl.catch) pl.catch(() => {});
    }
    d._lastOrder = '';
    const start = performance.now();
    const loop = () => {
      if (stopped) return;
      const t = Math.min(d.durationMs, (performance.now() - start) * SPEED);
      paintFrame(stage, d, t);
      if (t >= d.durationMs) {
        showPhase(stage, 'final');
        if (d._cam) d._cam.layer.classList.add('fin');   // gold frame — closing words over the results
        if (d.kind === 'race') paintConfetti(stage);
        setTimeout(() => { window.__rvDone = true; }, HOLD);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }, 2500);
}

function paintConfetti(stage) {
  const el = stage.querySelector('#rvConfetti');
  if (!el) return;
  const cols = ['#e8b84b', '#37dbff', '#7a5cff', '#ffffff'];
  let s = 0, h = '';
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  // with the camera band on stage the winner area sits lower — drop the
  // confetti below the camera so it isn't hidden behind the video layer
  const yBase = stage.classList.contains('rv-with-cam') ? 770 : 140;
  for (let i = 0; i < 16; i++) {
    const x = 60 + rnd() * 960, y = yBase + rnd() * 520, w = 10 + rnd() * 12, hh = 16 + rnd() * 14, rot = rnd() * 90 - 45;
    h += `<span style="left:${x}px;top:${y}px;width:${w}px;height:${hh}px;background:${cols[i % 4]};transform:rotate(${rot}deg);opacity:${(.4 + rnd() * .45).toFixed(2)}"></span>`;
  }
  el.innerHTML = h;
}

// ---------------------------------------------------------------------------
// SESSION — Group Pulse hero + running-average member rows. Mirrors view-room
// renderResults data; the video sorts rows by RUNNING AVERAGE (Csaba's call),
// not the live value. Viewer-neutral (no "You").
// ---------------------------------------------------------------------------
const sanitizeCurve = c => Array.isArray(c) ? c.map(v => v == null ? null : (Number.isFinite(Number(v)) ? Number(v) : null)) : [];

// O(1) running average: prefix sum + count over non-null LEDs.
function prefixStats(curve) {
  const n = curve.length, psum = new Array(n), pcnt = new Array(n);
  let s = 0, c = 0;
  for (let i = 0; i < n; i++) { const v = curve[i]; if (v != null) { s += v; c++; } psum[i] = s; pcnt[i] = c; }
  return { n, psum, pcnt };
}
const kAt = (n, frac) => Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
const ravgAt = (m, frac) => { const k = kAt(m.n, frac); return m.pcnt[k] ? m.psum[k] / m.pcnt[k] : 0; };

async function loadSession(id) {
  const sid = Number(id);
  const { data: session } = await supabase.from('sessions')
    .select('name, scheduled_start, duration_minutes, created_by, created_by_user_id, verified_only, group_avg')
    .eq('id', sid).maybeSingle();
  if (!session) return null;

  const startMs = new Date(session.scheduled_start).getTime();
  const durationMs = (session.duration_minutes || 0) * 60000;

  const { data: rows } = await supabase.from('results')
    .select('user_id, racer_name, avg, peak, steadiness, curve, is_host, verified')
    .eq('session_id', sid);
  const all = rows || [];

  const uids = [...new Set(all.map(r => r.user_id).filter(Boolean))];
  let prof = new Map();
  if (uids.length) {
    const { data: ps } = await supabase.from('profiles').select('id, avatar_url, country, display_name').in('id', uids);
    prof = new Map((ps || []).map(p => [p.id, p]));
  }
  const hostProf = session.created_by_user_id ? prof.get(session.created_by_user_id) : null;
  const verifiedOnly = !!session.verified_only;

  let members = all.map(r => {
    const p = prof.get(r.user_id) || {};
    const curve = sanitizeCurve(r.curve);
    return {
      name: r.racer_name || 'Racer', avatar: p.avatar_url || null, country: p.country || null,
      isHost: !!r.is_host, verified: r.verified, curve,
      avg: Number(r.avg) || 0, peak: r.peak || 0, steadiness: r.steadiness || 0,
      ...prefixStats(curve),
    };
  });
  members = (verifiedOnly ? members.filter(m => m.verified === true) : members).sort((a, b) => b.avg - a.avg);

  // Group curve (blue line): per-bucket average LED across members (null where none measured).
  const maxLen = members.reduce((m, r) => Math.max(m, r.curve.length), 0);
  const groupLeds = [];
  for (let i = 0; i < maxLen; i++) { let s = 0, n = 0; for (const r of members) { const v = r.curve[i]; if (v != null) { s += v; n++; } } groupLeds.push(n ? s / n : null); }

  return {
    kind: 'session', session, startMs, durationMs,
    title: session.name || 'Session',
    host: { name: (hostProf && hostProf.display_name) || session.created_by || 'The host', avatar: hostProf && hostProf.avatar_url },
    members, groupLeds, groupPrefix: prefixStats(groupLeds),
    groupHost: members.find(m => m.isHost) || null,
    groupAvg: members.length ? members.reduce((s, r) => s + r.avg, 0) / members.length : 0,
    count: members.length,
  };
}

const SVG_DEFS = `<svg width="0" height="0" style="position:absolute"><defs>
  <linearGradient id="rvsg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#37dbff"/><stop offset="1" stop-color="#7a5cff"/></linearGradient>
  <linearGradient id="rvsf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#37dbff" stop-opacity=".22"/><stop offset="1" stop-color="#37dbff" stop-opacity="0"/></linearGradient>
</defs></svg>`;

function sessionBoardHtml(d) {
  return `
    ${SVG_DEFS}
    ${headerHtml(d, { text: 'SESSION REPLAY' })}
    ${camSpace(d)}
    <div class="rv-hero-card">
      <div class="rv-hc-head">
        <div>
          <div class="rv-hc-title">GROUP PULSE</div>
          <div class="rv-legend">
            <div class="rv-lg"><i style="background:linear-gradient(90deg,#37dbff,#7a5cff)"></i>Group average</div>
            <div class="rv-lg"><i style="background:#e8b84b"></i>Host</div>
            <div class="rv-lg"><i style="background:rgba(255,255,255,.28)"></i>everyone</div>
          </div>
        </div>
        <div class="rv-hc-avg"><div class="lbl">GROUP AVG</div><div class="val" id="rvGavg">–</div></div>
      </div>
      <svg id="rvHero" width="888" height="${d.cam ? 230 : 330}" viewBox="0 0 888 ${d.cam ? 230 : 330}"></svg>
    </div>
    <div class="rv-rows" id="rvRows"></div>
    <div class="rv-more" id="rvMore" hidden></div>
    <div class="rv-ft">
      <div class="rv-clockrow"><div class="rv-clock" id="rvClock">0:00<small>left</small></div><div class="rv-spd" id="rvSpd">REPLAY · 4×</div></div>
      <div class="rv-prog"><i id="rvProg" style="width:0%"></i></div>
      <div class="rv-url">⚡ <b>live.egelywheel.com</b></div>
    </div>`;
}

const TOP_ROWS = 5;

function buildSessionRows(stage, d) {
  const rowsEl = stage.querySelector('#rvRows');
  rowsEl.innerHTML = d.members.map(sessionRowShell).join('');
  d.members.forEach((m, i) => { m.rowEl = rowsEl.children[i]; });
  d._lastOrder = '';
}

function sessionRowShell(m) {
  return `
    <div class="rv-row" data-rid="${esc(m.name)}">
      <div class="rv-idx">–</div>
      ${avatarHtml(m.avatar, m.name, 'row')}
      <div class="rv-rname">
        <span class="rv-nm">${esc(m.name)}</span>
        <div class="rv-rmeta">${flagHtml(m.country)}${m.isHost ? '<span class="rv-tag host">HOST</span>' : ''}<span class="rv-tag top rv-topavg" hidden>TOP AVG</span><span class="rv-livechip">live <b>–</b></span></div>
      </div>
      <svg class="rv-spark" viewBox="0 0 272 64"></svg>
      <div class="rv-rnums"><div class="rv-ravg">–</div><div class="rv-rlbl">AVG</div></div>
    </div>`;
}

// Prefix path up to bucket k, pen-up across nulls; x from the full-N time model.
function prefixPath(curve, kmax, W, H) {
  const n = curve.length; if (n < 2) return { d: '', last: null };
  let d = '', pen = false, last = null;
  for (let i = 0; i <= kmax; i++) {
    const v = curve[i];
    if (v == null) { pen = false; continue; }
    const p = [(i / (n - 1)) * W, H - (v / 24) * H];
    d += (pen ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ';
    pen = true; last = p;
  }
  return { d: d.trim(), last };
}

function heroChartSvg(d, t) {
  const W = 888, H = d.cam ? 230 : 330, y = v => H - (v / 24) * H;
  const frac = Math.max(0, Math.min(1, t / d.durationMs));
  let s = '';
  s += `<rect x="0" y="0" width="${W}" height="${y(13)}" fill="#3ddc8e" opacity=".05"/>`;
  s += `<rect x="0" y="${y(13)}" width="${W}" height="${y(6) - y(13)}" fill="#ffc933" opacity=".05"/>`;
  s += `<rect x="0" y="${y(6)}" width="${W}" height="${H - y(6)}" fill="#ff6257" opacity=".06"/>`;
  [6, 13].forEach(v => { s += `<line x1="0" y1="${y(v)}" x2="${W}" y2="${y(v)}" stroke="rgba(255,255,255,.08)" stroke-width="1.5"/>`; });
  [[24, 14], [13, y(13) + 6], [6, y(6) + 6]].forEach(([v, yy]) => { s += `<text x="${W - 8}" y="${yy}" text-anchor="end" fill="#5f7280" font-size="20" font-family="Inter">${v}</text>`; });
  const kOf = c => kAt(c.length, frac);
  d.members.forEach(m => { if (m === d.groupHost) return; const r = prefixPath(m.curve, kOf(m.curve), W, H); if (r.d) s += `<path d="${r.d}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2.5"/>`; });
  if (d.groupHost) { const r = prefixPath(d.groupHost.curve, kOf(d.groupHost.curve), W, H); if (r.d) s += `<path d="${r.d}" fill="none" stroke="#e8b84b" stroke-opacity=".82" stroke-width="4" stroke-linecap="round"/>`; }
  const g = prefixPath(d.groupLeds, kOf(d.groupLeds), W, H);
  if (g.d) { s += `<path d="${g.d}" fill="none" stroke="#37dbff" stroke-opacity=".28" stroke-width="13" stroke-linecap="round"/>`; s += `<path d="${g.d}" fill="none" stroke="url(#rvsg)" stroke-width="7" stroke-linecap="round"/>`; }
  const px = frac * W;
  s += `<line x1="${px.toFixed(1)}" y1="0" x2="${px.toFixed(1)}" y2="${H}" stroke="rgba(255,255,255,.22)" stroke-width="2" stroke-dasharray="4 8"/>`;
  if (g.last) s += `<circle cx="${g.last[0].toFixed(1)}" cy="${g.last[1].toFixed(1)}" r="10" fill="${zCol(d.groupLeds[kOf(d.groupLeds)] || 6)}" stroke="#0b1b28" stroke-width="3"/>`;
  return s;
}

function sparkSvg(curve, k) {
  const W = 272, H = 58;
  const { d, last } = prefixPath(curve, k, W, H);
  if (!d) return '';
  const area = d + (last ? ` L ${last[0].toFixed(1)} ${H} L 0 ${H} Z` : '');
  const lv = curve[k];
  return `<path d="${area}" fill="url(#rvsf)"/><path d="${d}" fill="none" stroke="url(#rvsg)" stroke-width="4" stroke-linecap="round"/>${last ? `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="7" fill="${zCol(lv != null ? lv : 6)}"/>` : ''}`;
}

function paintSessionFrame(stage, d, t) {
  const dur = d.durationMs, frac = Math.max(0, Math.min(1, t / dur));
  const hero = stage.querySelector('#rvHero');
  if (hero) hero.innerHTML = heroChartSvg(d, t);

  const gk = kAt(d.groupPrefix.n, frac);
  const gAvg = d.groupPrefix.pcnt[gk] ? d.groupPrefix.psum[gk] / d.groupPrefix.pcnt[gk] : 0;
  const gEl = stage.querySelector('#rvGavg');
  if (gEl) { gEl.textContent = gAvg ? gAvg.toFixed(1) : '–'; gEl.style.color = zCol(gAvg); }

  const now = d.members.slice().sort((a, b) => ravgAt(b, frac) - ravgAt(a, frac));
  const shown = now.slice(0, d._top || TOP_ROWS);
  const topAvg = shown[0];
  now.forEach(m => {
    const el = m.rowEl; if (!el) return;
    const inTop = shown.indexOf(m) >= 0;
    el.style.display = inTop ? '' : 'none';
    if (!inTop) return;
    const idx = shown.indexOf(m) + 1;
    const k = kAt(m.n, frac);
    const ravg = m.pcnt[k] ? m.psum[k] / m.pcnt[k] : 0;
    const live = m.curve[k];
    el.querySelector('.rv-idx').textContent = String(idx);
    el.classList.toggle('first', idx === 1);
    el.querySelector('.rv-spark').innerHTML = sparkSvg(m.curve, k);
    const chip = el.querySelector('.rv-livechip b');
    if (chip) { chip.textContent = live == null ? '–' : live; chip.style.color = live == null ? '' : zCol(live); }
    const ta = el.querySelector('.rv-topavg'); if (ta) ta.hidden = m !== topAvg;
    const av = el.querySelector('.rv-ravg'); av.textContent = ravg ? ravg.toFixed(1) : '–'; av.style.color = zCol(ravg);
    el.querySelector('.rv-rlbl').textContent = 'AVG · peak ' + m.peak;
  });

  const order = shown.map(m => m.rowEl && m.rowEl.dataset.rid).join(',');
  if (order !== d._lastOrder) { flipReorder(stage.querySelector('#rvRows'), shown.map(m => m.rowEl)); d._lastOrder = order; }

  const rest = now.slice(d._top || TOP_ROWS);
  const moreEl = stage.querySelector('#rvMore');
  if (rest.length) { moreEl.hidden = false; moreEl.innerHTML = `＋ ${rest.length} more in the circle <span>everyone counts in the group pulse</span>`; } else moreEl.hidden = true;

  const clockEl = stage.querySelector('#rvClock');
  if (clockEl) clockEl.innerHTML = fmtClock(Math.max(0, dur - t)) + '<small>left</small>';
  const progEl = stage.querySelector('#rvProg');
  if (progEl) progEl.style.width = (frac * 100).toFixed(1) + '%';
}

function sessionFinalHtml(d) {
  const topAvg = d.members[0];
  const topPeak = d.members.slice().sort((a, b) => b.peak - a.peak)[0];
  const steadiest = d.members.slice().sort((a, b) => b.steadiness - a.steadiness)[0];
  const hl = (l, m, v) => m ? `<div class="rv-hl"><div class="rv-hl-l">${l}</div><div class="rv-hl-w">${avatarHtml(m.avatar, m.name, 'pod')}<span>${esc(m.name)}</span></div><div class="rv-hl-v">${v}</div></div>` : '';
  return `
    ${headerHtml(d, { text: 'SESSION COMPLETE', gold: true })}
    ${camSpace(d)}
    <div class="rv-win-wrap">
      <div class="rv-sfin-avg"><div class="rv-sfin-num">${d.groupAvg.toFixed(1)}</div><div class="rv-sfin-lbl">GROUP AVERAGE</div></div>
      <div class="rv-hls">
        ${hl('Top average', topAvg, topAvg ? topAvg.avg.toFixed(1) : '')}
        ${hl('Highest peak', topPeak, topPeak ? topPeak.peak : '')}
        ${hl('Steadiest', steadiest, steadiest ? steadiest.steadiness + ' / 100' : '')}
      </div>
      <div class="rv-win-count">${d.count} in the circle · ${esc(d.title)} · ${esc(fmtWhen(d.session.scheduled_start).split(' · ')[0])}</div>
      <div class="rv-cta">Join the circle → live.egelywheel.com</div>
    </div>`;
}

const sessionSpeed = () => 1;

// ---------------------------------------------------------------------------
// SOLO — one measurer, one story: a big living curve with a large readout.
// Solo results are RLS-private, so the render worker (service role) fetches the
// row and injects it as window.__rvSoloData before the app loads; an anonymous
// page query would come back empty.
// ---------------------------------------------------------------------------
async function loadSolo(id) {
  let raw = window.__rvSoloData || null;
  if (!raw) {
    const { data: r } = await supabase.from('results')
      .select('id, user_id, racer_name, label, avg, peak, steadiness, zone_red, zone_yellow, zone_green, duration_seconds, curve, verified, created_at')
      .eq('id', Number(id)).is('session_id', null).maybeSingle();
    if (!r) return null;
    let profile = null;
    if (r.user_id) { const { data: p } = await supabase.from('profiles').select('id, avatar_url, country, display_name').eq('id', r.user_id).maybeSingle(); profile = p || null; }
    raw = { result: r, profile };
  }
  const r = raw.result, p = raw.profile || {};
  if (!r || !Array.isArray(r.curve) || !r.curve.length) return null;
  const curve = sanitizeCurve(r.curve);
  const durationMs = (r.duration_seconds || Math.round(curve.length / 4)) * 1000;
  return {
    kind: 'solo', durationMs,
    session: { scheduled_start: r.created_at, duration_minutes: Math.max(1, Math.round((r.duration_seconds || 60) / 60)) },
    durText: (r.duration_seconds || 60) < 120 ? `${r.duration_seconds || 60}s` : `${Math.round((r.duration_seconds || 60) / 60)} min`,
    title: r.label || 'Solo vitality reading',
    host: { name: r.racer_name || (p.display_name || 'Measurer'), avatar: p.avatar_url || null },
    country: p.country || null, verified: r.verified,
    curve, ...prefixStats(curve),
    stats: { avg: Number(r.avg) || 0, peak: r.peak || 0, steadiness: r.steadiness || 0, zoneGreen: Math.round(Number(r.zone_green) || 0) },
    count: 1, members: [],
  };
}

function soloBoardHtml(d) {
  return `
    ${SVG_DEFS}
    ${headerHtml(d, { text: 'SOLO REPLAY' })}
    ${camSpace(d)}
    <div class="rv-solo-hero">
      <div class="rv-solo-val"><div class="v" id="rvSoloV">–</div><div class="l">VITALITY</div></div>
      <div class="rv-solo-side">
        <div class="rv-sstat"><div class="v" id="rvSoloAvg">–</div><div class="l">AVG</div></div>
        <div class="rv-sstat"><div class="v" id="rvSoloPeak">–</div><div class="l">PEAK</div></div>
      </div>
    </div>
    <div class="rv-hero-card rv-solo-card">
      <svg id="rvHero" width="888" height="${d.cam ? 300 : 430}" viewBox="0 0 888 ${d.cam ? 300 : 430}"></svg>
    </div>
    <div class="rv-ft">
      <div class="rv-clockrow"><div class="rv-clock" id="rvClock">0:00<small>left</small></div><div class="rv-spd" id="rvSpd">REPLAY</div></div>
      <div class="rv-prog"><i id="rvProg" style="width:0%"></i></div>
      <div class="rv-url">⚡ <b>live.egelywheel.com</b></div>
    </div>`;
}

function soloHeroSvg(d, t) {
  const W = 888, H = d.cam ? 300 : 430, y = v => H - (v / 24) * H;
  const frac = Math.max(0, Math.min(1, t / d.durationMs));
  const k = kAt(d.n, frac);
  let s = '';
  s += `<rect x="0" y="0" width="${W}" height="${y(13)}" fill="#3ddc8e" opacity=".05"/>`;
  s += `<rect x="0" y="${y(13)}" width="${W}" height="${y(6) - y(13)}" fill="#ffc933" opacity=".05"/>`;
  s += `<rect x="0" y="${y(6)}" width="${W}" height="${H - y(6)}" fill="#ff6257" opacity=".06"/>`;
  [6, 13].forEach(v => { s += `<line x1="0" y1="${y(v)}" x2="${W}" y2="${y(v)}" stroke="rgba(255,255,255,.08)" stroke-width="1.5"/>`; });
  [[24, 16], [13, y(13) + 7], [6, y(6) + 7]].forEach(([v, yy]) => { s += `<text x="${W - 8}" y="${yy}" text-anchor="end" fill="#5f7280" font-size="21" font-family="Inter">${v}</text>`; });
  const g = prefixPath(d.curve, k, W, H);
  if (g.d) {
    const area = g.d + (g.last ? ` L ${g.last[0].toFixed(1)} ${H} L 0 ${H} Z` : '');
    s += `<path d="${area}" fill="url(#rvsf)"/>`;
    s += `<path d="${g.d}" fill="none" stroke="#37dbff" stroke-opacity=".3" stroke-width="14" stroke-linecap="round"/>`;
    s += `<path d="${g.d}" fill="none" stroke="url(#rvsg)" stroke-width="7" stroke-linecap="round"/>`;
  }
  const px = frac * W;
  s += `<line x1="${px.toFixed(1)}" y1="0" x2="${px.toFixed(1)}" y2="${H}" stroke="rgba(255,255,255,.22)" stroke-width="2" stroke-dasharray="4 8"/>`;
  const lv = d.curve[k];
  if (g.last) s += `<circle cx="${g.last[0].toFixed(1)}" cy="${g.last[1].toFixed(1)}" r="11" fill="${zCol(lv != null ? lv : 6)}" stroke="#0b1b28" stroke-width="3"/>`;
  return s;
}

function paintSoloFrame(stage, d, t) {
  const frac = Math.max(0, Math.min(1, t / d.durationMs));
  const k = kAt(d.n, frac);
  const hero = stage.querySelector('#rvHero');
  if (hero) hero.innerHTML = soloHeroSvg(d, t);
  const lv = d.curve[k];
  const vEl = stage.querySelector('#rvSoloV');
  if (vEl) { vEl.textContent = lv == null ? '–' : lv; vEl.style.color = lv == null ? '#5f7280' : zCol(lv); }
  const ravg = d.pcnt[k] ? d.psum[k] / d.pcnt[k] : 0;
  const aEl = stage.querySelector('#rvSoloAvg');
  if (aEl) { aEl.textContent = ravg ? ravg.toFixed(1) : '–'; aEl.style.color = zCol(ravg); }
  let pk = 0; for (let i = 0; i <= k; i++) { const v = d.curve[i]; if (v != null && v > pk) pk = v; }
  const pEl = stage.querySelector('#rvSoloPeak');
  if (pEl) { pEl.textContent = pk; pEl.style.color = zCol(pk); }
  const clockEl = stage.querySelector('#rvClock');
  if (clockEl) clockEl.innerHTML = fmtClock(Math.max(0, d.durationMs - t)) + '<small>left</small>';
  const progEl = stage.querySelector('#rvProg');
  if (progEl) progEl.style.width = (frac * 100).toFixed(1) + '%';
}

function soloFinalHtml(d) {
  const hl = (l, v) => `<div class="rv-hl"><div class="rv-hl-l">${l}</div><div></div><div class="rv-hl-v">${v}</div></div>`;
  return `
    ${headerHtml(d, { text: 'READING COMPLETE', gold: true })}
    ${camSpace(d)}
    <div class="rv-win-wrap">
      <div class="rv-sfin-avg"><div class="rv-sfin-num">${d.stats.avg.toFixed(1)}</div><div class="rv-sfin-lbl">AVERAGE VITALITY</div></div>
      <div class="rv-hls">
        ${hl('Peak', d.stats.peak)}
        ${hl('Steadiness', d.stats.steadiness + ' / 100')}
        ${hl('Time in green', d.stats.zoneGreen + '%')}
      </div>
      <div class="rv-win-count">${d.verified ? 'Verified reading · ' : ''}${esc(d.title)} · ${esc(fmtWhen(d.session.scheduled_start).split(' · ')[0])}</div>
      <div class="rv-cta">Measure with us → live.egelywheel.com</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
export function mount(el, kind, id) {
  injectStyles();
  kind = (kind === 'session' || kind === 'room') ? 'session' : (kind === 'solo' || kind === 'm') ? 'solo' : 'race';
  document.body.classList.add('rv-mode');

  const stage = document.createElement('div');
  stage.className = 'rvid-stage';
  stage.innerHTML = '<div class="rv-loading">Preparing render…</div>';
  el.appendChild(stage);

  let destroyed = false, stopSeq = null;

  (async () => {
    let d = null;
    try { d = kind === 'race' ? await loadRace(id) : kind === 'solo' ? await loadSolo(id) : await loadSession(id); } catch (e) { console.error('rv load error', e); }
    if (destroyed) return;
    if (!d) { stage.innerHTML = `<div class="rv-loading">No renderable data for ${esc(kind)} ${esc(id)}.</div>`; window.__rvReady = true; return; }
    if (!d.count) { stage.innerHTML = `<div class="rv-loading">No measurements saved for ${esc(kind)} ${esc(id)}.</div>`; window.__rvReady = true; return; }

    const K = d.kind;
    // Camera composite (Broadcast layout): the worker injects __rvCamUrl when the
    // event has a camera recording. Without it every layout is byte-identical to
    // the voice-only render — all camera styling hangs off .rv-with-cam.
    d.cam = window.__rvCamUrl ? { url: String(window.__rvCamUrl) } : null;
    stage.dataset.kind = K;
    if (d.cam) stage.classList.add('rv-with-cam');
    // The camera band costs vertical room: fewer list rows, same podium math
    // (rows are score-sorted, so 1st–3rd can never scroll out of frame).
    d._top = K === 'race' ? (d.cam ? 5 : TOP_LANES) : (d.cam ? 4 : TOP_ROWS);
    const pillTxt = K === 'race' ? 'RACE REPLAY' : K === 'solo' ? 'SOLO REPLAY' : 'SESSION REPLAY';
    const paintFrame = K === 'race' ? paintRaceFrame : K === 'solo' ? paintSoloFrame : paintSessionFrame;
    const defSpeed = K === 'session' ? sessionSpeed : raceSpeed;
    try {
      stage.innerHTML = `
        <div class="rv-hair"></div>
        <div class="rv-frame" data-phase="intro">${introHtml(d, { text: pillTxt }, K === 'race' ? (d.count === 1 ? 'racer' : 'racers') : 'in the circle')}</div>
        <div class="rv-frame" data-phase="board" hidden>${K === 'race' ? raceBoardHtml(d) : K === 'solo' ? soloBoardHtml(d) : sessionBoardHtml(d)}</div>
        <div class="rv-frame" data-phase="final" hidden>${K === 'race' ? finalHtml(d) : K === 'solo' ? soloFinalHtml(d) : sessionFinalHtml(d)}</div>`;
      if (K === 'race') { buildRaceLanes(stage, d); paintConfetti(stage); }
      else if (K === 'session') buildSessionRows(stage, d);
      if (d.cam) buildCamLayer(stage, d);
      paintFrame(stage, d, d.durationMs * 0.62);
    } catch (e) {
      console.error('rv build error', e);
      stage.innerHTML = '<div class="rv-loading">Build error: ' + esc(String((e && e.message) || e)) + '</div>';
      window.__rvReady = true;
      return;
    }

    // The capture worker (F2) waits for __rvReady, starts recording, calls
    // __rvPlay(), then waits for __rvDone. __rvShow is a manual phase switch.
    window.__rvShow = ph => showPhase(stage, ph);
    window.__rvPlay = () => playSequence(stage, d, paintFrame, defSpeed, fn => { stopSeq = fn; });
    window.__rvData = { kind: d.kind, id, count: d.count, durationMs: d.durationMs, speed: defSpeed(d.durationMs), cam: !!d.cam };
    window.__rvReady = true;
    window.__rvDone = false;
  })();

  return () => {
    destroyed = true;
    if (stopSeq) { stopSeq(); stopSeq = null; }
    document.body.classList.remove('rv-mode');
    try { delete window.__rvReady; delete window.__rvShow; delete window.__rvPlay; delete window.__rvData; delete window.__rvDone; } catch (_) {}
    stage.remove();
  };
}

// ---------------------------------------------------------------------------
// Styles — a self-contained dark "Replay Cinema" stage, scoped under
// .rvid-stage so nothing leaks into the light app (and the app can't leak in).
// ---------------------------------------------------------------------------
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || document.getElementById('rvidStyles')) { stylesInjected = true; return; }
  stylesInjected = true;
  const s = document.createElement('style');
  s.id = 'rvidStyles';
  s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
body.rv-mode > header, body.rv-mode #navMoreMenu, body.rv-mode .fab, body.rv-mode #vpackFab, body.rv-mode #bleBar { display:none !important; }
.rvid-stage{
  position:fixed; inset:0; z-index:99999; overflow:hidden;
  display:flex; flex-direction:column;
  font-family:Inter,system-ui,sans-serif; color:#f4f7f9;
  --gold:#e8b84b; --muted:#8da0ab; --faint:#5f7280;
  --card:rgba(255,255,255,.05); --cardb:rgba(255,255,255,.10);
  --grad:linear-gradient(135deg,#37dbff,#5230da);
  background:
    radial-gradient(1000px 560px at 50% -140px, rgba(82,48,218,.38), transparent 70%),
    radial-gradient(760px 420px at 88% 18%, rgba(55,219,255,.10), transparent 60%),
    linear-gradient(180deg,#0b1b28 0%, #040f19 100%);
}
.rvid-stage:after{content:'';position:absolute;left:0;right:0;bottom:0;height:240px;background:linear-gradient(transparent, rgba(0,0,0,.38));pointer-events:none}
.rv-loading{margin:auto;color:#8da0ab;font-size:30px}
.rv-hair{height:8px;background:var(--grad);flex:none}
.rv-frame{flex:1;display:flex;flex-direction:column;padding:44px 64px 64px;position:relative;z-index:1;min-height:0}

.rv-brandrow{display:flex;justify-content:space-between;align-items:center}
.rv-brand{font:800 34px Montserrat;letter-spacing:.08em;color:#fff}
.rv-brand span{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.rv-pill{display:inline-flex;align-items:center;gap:14px;padding:14px 26px;border-radius:999px;border:1.5px solid rgba(255,255,255,.16);background:rgba(82,48,218,.16);font:600 24px Inter;letter-spacing:.14em;color:#dfe8ee}
.rv-pill .rv-dot{width:14px;height:14px;border-radius:50%;background:var(--grad);box-shadow:0 0 18px rgba(55,219,255,.9)}
.rv-pill.gold{border-color:rgba(232,184,75,.4);background:rgba(232,184,75,.10);color:#f2ddad}
.rv-pill.gold .rv-dot{background:var(--gold);box-shadow:0 0 18px rgba(232,184,75,.9)}

.rv-event{display:flex;gap:30px;align-items:center;margin-top:44px}
.rv-ev-txt{min-width:0}
.rv-ev-name{font:700 68px Montserrat;line-height:1.06;color:#fff;letter-spacing:-.01em}
.rv-ev-meta{margin-top:14px;font:500 29px Inter;color:var(--muted)}
.rv-ev-meta b{color:#fff;font-weight:600}

.rv-ava{display:block;border-radius:50%;background:var(--grad);padding:4px;flex:none}
.rv-ava.goldring{background:linear-gradient(135deg,#f6d98a,#c9922c)}
.rv-ava>span,.rv-ava>img{display:grid;place-items:center;border-radius:50%;width:100%;height:100%;background:#132635;color:#fff;font:700 44px Montserrat;object-fit:cover}
.rv-ava.big{width:124px;height:124px}
.rv-ava.hero{width:200px;height:200px}.rv-ava.hero>span{font-size:74px}
.rv-ava.win{width:190px;height:190px;padding:5px;box-shadow:0 0 90px -8px rgba(232,184,75,.55)}.rv-ava.win>span{font-size:70px}
.rv-ava.pod{width:92px;height:92px}.rv-ava.pod>span{font-size:34px}
.rv-ava.pk{width:58px;height:58px;padding:3px}.rv-ava.pk>span{font-size:24px}

.rv-flag{width:38px;height:29px;border-radius:5px;object-fit:cover;flex:none}
.rv-tag{display:inline-flex;align-items:center;padding:6px 16px;border-radius:999px;font:700 20px Inter;letter-spacing:.1em;flex:none}
.rv-tag.host{border:1.5px solid rgba(232,184,75,.5);color:var(--gold);background:rgba(232,184,75,.09)}
.rv-tag.top{border:1.5px solid rgba(55,219,255,.5);color:#37dbff;background:rgba(55,219,255,.08)}

.rv-lanes{display:flex;flex-direction:column;gap:14px;margin-top:30px}
.rv-lane{display:grid;grid-template-columns:60px 1fr 250px;gap:22px;align-items:center;background:var(--card);border:1.5px solid var(--cardb);border-radius:28px;padding:21px 34px;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.rv-lane.leader{border-color:rgba(232,184,75,.55);box-shadow:0 0 46px -12px rgba(232,184,75,.4);background:linear-gradient(180deg,rgba(232,184,75,.05),rgba(255,255,255,.04))}
.rv-rank{font:800 50px Montserrat;text-align:center;color:var(--faint)}
.rv-rank.r1{color:var(--gold);text-shadow:0 0 26px rgba(232,184,75,.65)}.rv-rank.r2{color:#c9d6de}.rv-rank.r3{color:#d99a6c}
.rv-nrow{display:flex;align-items:center;gap:16px;min-width:0}
.rv-nm{font:600 35px Inter;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rv-track{position:relative;height:22px;border-radius:12px;margin-top:20px;background:rgba(255,255,255,.075);background-image:radial-gradient(rgba(255,255,255,.13) 2px, transparent 2.6px);background-size:46px 22px;background-position:8px 50%}
.rv-finish{position:absolute;right:6px;top:-5px;bottom:-5px;width:18px;border-radius:4px;opacity:.85;background:repeating-conic-gradient(#dfe6ea 0% 25%, #17242e 0% 50%) 0 0/9px 9px}
.rv-puck{position:absolute;top:50%;transform:translate(-50%,-50%);z-index:2}
.rv-puck:before{content:'';position:absolute;right:52%;top:50%;transform:translateY(-50%);width:120px;height:12px;border-radius:8px;background:linear-gradient(90deg,transparent,rgba(55,219,255,.6))}
.rv-nums{text-align:right}
.rv-lv{font:700 52px Montserrat;line-height:1}
.rv-lvl{font:600 18px Inter;letter-spacing:.22em;color:var(--faint);margin:4px 0 10px}
.rv-sc{font:600 26px Inter;color:#b9c6cf;white-space:nowrap}
.rv-sc b{display:block;color:var(--gold);font-weight:700;letter-spacing:.12em;margin-top:6px}

.rv-more{display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding:26px 36px;border-radius:24px;border:1.5px dashed rgba(255,255,255,.16);font:600 27px Inter;color:var(--muted)}
.rv-more span{color:var(--faint);font-weight:500}

.rv-ft{margin-top:auto}
.rv-clockrow{display:flex;justify-content:space-between;align-items:baseline}
.rv-clock{font:700 68px Montserrat;color:#fff}
.rv-clock small{font:500 30px Inter;color:var(--muted);margin-left:14px}
.rv-spd{font:600 25px Inter;letter-spacing:.14em;color:var(--faint)}
.rv-prog{height:12px;border-radius:8px;background:rgba(255,255,255,.08);margin-top:18px;overflow:hidden}
.rv-prog i{display:block;height:100%;border-radius:8px;background:var(--grad)}
.rv-url{margin-top:20px;text-align:center;font:600 27px Inter;color:var(--muted);letter-spacing:.04em}
.rv-url b{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}

.rv-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.rv-center .rv-pill{margin-bottom:60px}
.rv-in-host{margin-top:44px;font:500 34px Inter;color:var(--muted)}
.rv-in-host b{color:#fff;font-weight:600}
.rv-in-name{margin-top:22px;font:700 92px Montserrat;line-height:1.05;color:#fff;max-width:900px}
.rv-in-meta{margin-top:26px;font:500 31px Inter;color:var(--muted)}
.rv-mini-track{position:relative;width:660px;height:20px;border-radius:12px;margin-top:96px;background:rgba(255,255,255,.07)}
.rv-mini-track .rv-finish{right:4px}
.rv-mini-track .rv-ava.pk{width:46px;height:46px}.rv-mini-track .rv-ava.pk>span{font-size:18px}

.rv-win-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.rv-win-pill{display:inline-flex;align-items:center;gap:14px;padding:16px 34px;border-radius:999px;border:1.5px solid rgba(232,184,75,.55);background:rgba(232,184,75,.12);font:700 28px Inter;letter-spacing:.22em;color:var(--gold);margin-bottom:48px}
.rv-win-name{margin-top:34px;font:700 76px Montserrat;color:#fff}
.rv-win-pts{margin-top:14px;font:700 50px Montserrat;color:var(--gold)}
.rv-win-meta{margin-top:14px;font:500 29px Inter;color:var(--muted)}
.rv-podium{display:flex;gap:22px;margin-top:64px}
.rv-pod-card{display:flex;align-items:center;gap:20px;padding:22px 34px;border-radius:24px;background:var(--card);border:1.5px solid var(--cardb)}
.rv-pod-card .rv-ava{background:linear-gradient(135deg,#dfe8ee,#94a6b2)}
.rv-pod-card.bronze .rv-ava{background:linear-gradient(135deg,#e6b07e,#a86a3c)}
.rv-pod-rank{font:800 40px Montserrat;color:#c9d6de}
.rv-pod-card.bronze .rv-pod-rank{color:#d99a6c}
.rv-pod-nm{font:600 30px Inter;color:#fff;text-align:left}
.rv-pod-pts{font:600 25px Inter;color:var(--muted);text-align:left;margin-top:4px}
.rv-win-count{margin-top:52px;font:500 28px Inter;color:var(--faint)}
.rv-cta{margin-top:30px;display:inline-block;padding:26px 58px;border-radius:999px;background:var(--grad);font:700 33px Montserrat;color:#fff;box-shadow:0 18px 60px -14px rgba(82,48,218,.65)}
.rv-confetti span{position:absolute;border-radius:3px;opacity:.75}

/* session */
.rv-hero-card{margin-top:34px;background:var(--card);border:1.5px solid var(--cardb);border-radius:28px;padding:30px 32px}
.rv-hc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.rv-hc-title{font:700 24px Inter;letter-spacing:.2em;color:var(--muted)}
.rv-legend{display:flex;gap:24px;margin-top:14px;flex-wrap:wrap}
.rv-lg{display:flex;align-items:center;gap:10px;font:500 22px Inter;color:var(--muted)}
.rv-lg i{width:26px;height:7px;border-radius:4px}
.rv-hc-avg{text-align:right;flex:none}
.rv-hc-avg .lbl{font:600 20px Inter;letter-spacing:.2em;color:var(--faint)}
.rv-hc-avg .val{font:700 62px Montserrat;line-height:1.05}
#rvHero{margin-top:24px;display:block;width:100%;height:auto}
.rv-rows{display:flex;flex-direction:column;gap:14px;margin-top:26px}
.rv-row{display:grid;grid-template-columns:44px 84px 1fr 272px 190px;gap:20px;align-items:center;background:var(--card);border:1.5px solid var(--cardb);border-radius:26px;padding:20px 28px;transition:transform .55s cubic-bezier(.2,.8,.2,1)}
.rv-row.first{border-color:rgba(55,219,255,.45);box-shadow:0 0 40px -14px rgba(55,219,255,.4)}
.rv-idx{font:700 34px Montserrat;color:var(--faint);text-align:center}
.rv-ava.row{width:76px;height:76px}.rv-ava.row>span{font-size:30px}
.rv-rname{min-width:0}
.rv-rname .rv-nm{font-size:31px;display:block;margin-bottom:8px}
.rv-rmeta{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.rv-livechip{display:inline-flex;align-items:center;gap:8px;padding:4px 14px;border-radius:999px;border:1.5px solid rgba(255,255,255,.14);font:600 21px Inter;color:var(--muted)}
.rv-livechip b{font-weight:700}
.rv-spark{width:272px;height:64px}
.rv-rnums{text-align:right}
.rv-ravg{font:700 46px Montserrat;line-height:1}
.rv-rlbl{font:600 17px Inter;letter-spacing:.2em;color:var(--faint);margin-top:4px}
.rv-sfin-avg{text-align:center;margin:10px 0 24px}
.rv-sfin-num{font:800 132px Montserrat;line-height:1;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.rv-sfin-lbl{font:600 26px Inter;letter-spacing:.24em;color:var(--muted);margin-top:10px}
.rv-hls{display:flex;flex-direction:column;gap:14px;width:100%;max-width:760px;margin-top:12px}
.rv-hl{display:grid;grid-template-columns:1fr auto auto;gap:20px;align-items:center;background:var(--card);border:1.5px solid var(--cardb);border-radius:22px;padding:18px 30px}
.rv-hl-l{font:600 21px Inter;letter-spacing:.14em;color:var(--faint);text-transform:uppercase;text-align:left}
.rv-hl-w{display:flex;align-items:center;gap:16px;font:600 30px Inter;color:#fff}
.rv-hl-v{font:700 34px Montserrat;color:var(--gold)}

/* solo */
.rv-solo-hero{display:flex;justify-content:space-between;align-items:flex-end;margin-top:44px;padding:0 8px}
.rv-solo-val .v{font:800 170px Montserrat;line-height:.95}
.rv-solo-val .l{font:600 24px Inter;letter-spacing:.26em;color:var(--faint);margin-top:10px}
.rv-solo-side{display:flex;gap:44px;padding-bottom:14px}
.rv-sstat{text-align:right}
.rv-sstat .v{font:700 62px Montserrat;line-height:1}
.rv-sstat .l{font:600 19px Inter;letter-spacing:.22em;color:var(--faint);margin-top:8px}
.rv-solo-card{margin-top:30px}

/* ── camera composite (Broadcast layout) ─────────────────────────────────
   The camera band is the top act; boards below get a tighter rhythm. All of
   it is scoped to .rv-with-cam so camera-less renders stay byte-identical. */
.rv-camspace{height:430px;margin:24px 0 26px;flex:none}
.rv-with-cam[data-kind="solo"] .rv-camspace{height:640px}
.rv-camlayer{position:absolute;left:64px;right:64px;z-index:6;display:none;border-radius:34px;padding:4px;
  background:linear-gradient(135deg,#37dbff,#5230da);box-shadow:0 34px 90px -22px rgba(82,48,218,.6)}
.rv-camlayer.on{display:block}
.rv-camlayer.fin{background:linear-gradient(135deg,#f6d98a,#c9922c);box-shadow:0 34px 90px -22px rgba(232,184,75,.55)}
.rv-camin{position:relative;width:100%;height:100%;border-radius:30px;overflow:hidden;background:#0b1b28}
.rv-camin video{width:100%;height:100%;object-fit:cover;display:block}
.rv-camtag{position:absolute;left:22px;bottom:20px;display:inline-flex;align-items:center;gap:10px;padding:10px 24px;
  border-radius:999px;background:rgba(4,15,25,.62);border:1.5px solid rgba(255,255,255,.14);font:600 24px Inter;color:#f4f7f9;white-space:nowrap}
.rv-camchip{margin-top:30px}
.rv-center .rv-camchip{margin-bottom:0}

/* header tightens + title clamps to one line (deterministic camera geometry) */
.rv-with-cam .rv-event{margin-top:22px;gap:22px}
.rv-with-cam .rv-ava.big{width:96px;height:96px}
.rv-with-cam .rv-ev-name{font-size:52px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rv-with-cam .rv-ev-meta{margin-top:8px;font-size:25px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rv-with-cam .rv-clock{font-size:54px}
.rv-with-cam .rv-clock small{font-size:25px}
.rv-with-cam .rv-url{margin-top:14px}

/* race: 5 lanes under the commentator band */
.rv-with-cam .rv-lanes{gap:12px;margin-top:0}
.rv-with-cam .rv-lane{grid-template-columns:46px 1fr 205px;gap:18px;padding:13px 26px;border-radius:22px}
.rv-with-cam .rv-rank{font-size:37px}
.rv-with-cam .rv-nm{font-size:28px}
.rv-with-cam .rv-nrow{gap:12px}
.rv-with-cam .rv-flag{width:30px;height:23px}
.rv-with-cam .rv-tag{padding:4px 12px;font-size:16px}
.rv-with-cam .rv-track{height:18px;margin-top:12px;background-size:40px 18px}
.rv-with-cam .rv-ava.pk{width:46px;height:46px}
.rv-with-cam .rv-ava.pk>span{font-size:19px}
.rv-with-cam .rv-lv{font-size:38px}
.rv-with-cam .rv-lvl{font-size:14px;margin:2px 0 6px}
.rv-with-cam .rv-sc{font-size:21px}
.rv-with-cam .rv-sc b{margin-top:3px;font-size:19px}
.rv-with-cam .rv-more{margin-top:14px;padding:17px 28px;font-size:23px;border-radius:20px}

/* session: slimmer pulse card + 3 rows */
.rv-with-cam .rv-hero-card{margin-top:0;padding:20px 26px}
.rv-with-cam .rv-hc-title{font-size:20px}
.rv-with-cam .rv-legend{gap:16px;margin-top:8px}
.rv-with-cam .rv-lg{font-size:18px}
.rv-with-cam .rv-hc-avg .val{font-size:46px}
.rv-with-cam #rvHero{margin-top:12px}
.rv-with-cam .rv-rows{gap:12px;margin-top:16px}
.rv-with-cam .rv-row{grid-template-columns:38px 66px 1fr 220px 155px;gap:16px;padding:13px 22px;border-radius:22px}
.rv-with-cam .rv-ava.row{width:60px;height:60px}
.rv-with-cam .rv-ava.row>span{font-size:24px}
.rv-with-cam .rv-idx{font-size:28px}
.rv-with-cam .rv-rname .rv-nm{font-size:26px;margin-bottom:5px}
.rv-with-cam .rv-livechip{font-size:18px;padding:3px 11px}
.rv-with-cam .rv-spark{width:220px;height:52px}
.rv-with-cam .rv-ravg{font-size:38px}
.rv-with-cam .rv-rlbl{font-size:14px}

/* solo: readout + chart share the room below the big camera */
.rv-with-cam .rv-solo-hero{margin-top:0;padding:0 6px}
.rv-with-cam .rv-solo-val .v{font-size:120px}
.rv-with-cam .rv-solo-val .l{font-size:20px;margin-top:6px}
.rv-with-cam .rv-sstat .v{font-size:50px}
.rv-with-cam .rv-solo-card{margin-top:20px;padding:20px 26px}

/* finale: closing words on camera above the results */
.rv-with-cam .rv-win-pill{margin-bottom:24px;padding:12px 26px;font-size:24px}
.rv-with-cam .rv-ava.win{width:140px;height:140px}
.rv-with-cam .rv-ava.win>span{font-size:52px}
.rv-with-cam .rv-win-name{margin-top:20px;font-size:58px}
.rv-with-cam .rv-win-pts{margin-top:8px;font-size:40px}
.rv-with-cam .rv-win-meta{margin-top:8px;font-size:25px}
.rv-with-cam .rv-podium{margin-top:32px;gap:16px}
.rv-with-cam .rv-pod-card{padding:16px 26px;border-radius:20px}
.rv-with-cam .rv-ava.pod{width:72px;height:72px}
.rv-with-cam .rv-ava.pod>span{font-size:27px}
.rv-with-cam .rv-pod-nm{font-size:25px}
.rv-with-cam .rv-pod-pts{font-size:21px}
.rv-with-cam .rv-win-count{margin-top:28px;font-size:24px}
.rv-with-cam .rv-cta{margin-top:22px;padding:20px 46px;font-size:28px}
.rv-with-cam .rv-sfin-avg{margin:0 0 14px}
.rv-with-cam .rv-sfin-num{font-size:96px}
.rv-with-cam .rv-sfin-lbl{font-size:21px;margin-top:6px}
.rv-with-cam .rv-hls{gap:11px;max-width:700px;margin-top:6px}
.rv-with-cam .rv-hl{padding:13px 24px;border-radius:18px}
.rv-with-cam .rv-hl-l{font-size:18px}
.rv-with-cam .rv-hl-w{font-size:25px;gap:12px}
.rv-with-cam .rv-hl-v{font-size:27px}
`;
  document.head.appendChild(s);
}
