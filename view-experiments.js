import * as auth from './auth.js';
import * as ble from './ble.js';
import * as wakeLock from './wake-lock.js';
import * as presence from './presence.js';
import { computeStats, vitalityLevel, vitalityColor as vColor, downsample } from './analytics.js';
import {
  TOPICS, EXPERIMENTS, topicsOrdered, getTopic, getExperiment, experimentsByTopic,
  experimentState, isDayUnlocked, topicProgress, pickContinue, dayNumber, completedExperimentCount,
} from './experiments.js';
import { fetchProgress, fetchExperimentResults, ensureStarted, markDayComplete, saveExperimentMeasurement, rateExperiment } from './experiments-store.js';

// First experiment (in catalog order) the user hasn't completed — the "try next".
function firstUnfinished(progByExp){
  for(const exp of EXPERIMENTS){ const p = progByExp.get(exp.id); if(!p || !p.completed) return exp; }
  return null;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const SAMPLE_MS = 250;
const CHEAT_WINDOW_MS = 2000, SWING_LIMIT = 7, MAX_SWINGS = 2;   // same anti-cheat as Solo / rooms (de-spiked signal)

const durLabel = s => s >= 60 ? `${Math.round(s / 60)} min` : `${s}s`;

function coverHtml(item, extraClass){
  // Cover image with a graceful icon+gradient fallback if the file is missing.
  const icon = item.icon || (getTopic(item.topic)?.icon) || '✦';
  return `<div class="xp-cover ${extraClass || ''}">
    ${item.cover ? `<img src="${esc(item.cover)}" alt="" onerror="this.remove()">` : ''}
    <span class="xp-cover-icon">${icon}</span>
  </div>`;
}

// ============================================================================
//  Experiments main page  (#/experiments)  and  topic page (#/experiments/:id)
// ============================================================================
export function mountExperiments(el, topicId){
  el.innerHTML = `<div id="xpBody"><div class="empty">Loading…</div></div>`;
  const body = el.querySelector('#xpBody');
  let unsubAuth = null;

  async function render(){
    const a = auth.getState();
    const progByExp = await fetchProgress(a.user?.id || null);
    if(topicId) renderTopic(body, topicId, progByExp);
    else renderMain(body, a, progByExp);
  }

  unsubAuth = auth.subscribeAuth(() => { render(); });
  return () => { if(unsubAuth) unsubAuth(); };
}

function renderMain(body, a, progByExp){
  const cont = a.user ? pickContinue(progByExp) : null;
  let hero = '';
  if(cont){
    // Something in progress → pick up where you left off.
    const st = experimentState(cont, progByExp.get(cont.id));
    hero = `
      <a class="xp-hero" href="#/experiment/${esc(cont.id)}">
        ${coverHtml(cont, 'xp-hero-cover')}
        <div class="xp-hero-info">
          <div class="xp-hero-eyebrow">Pick up where you left off</div>
          <div class="xp-hero-title">${esc(cont.title)}</div>
          <div class="xp-hero-meta">Day ${st.currentNumber} of ${st.total}</div>
        </div>
        <span class="xp-hero-cta">Continue →</span>
      </a>`;
  } else {
    // Nothing in progress → recommend the next experiment they HAVEN'T finished.
    const rec = firstUnfinished(progByExp);
    if(rec){
      const eyebrow = (a.user && completedExperimentCount(progByExp) > 0) ? 'Try this next' : 'Start your first experiment';
      hero = `
        <a class="xp-hero xp-hero-new" href="#/experiment/${esc(rec.id)}">
          ${coverHtml(rec, 'xp-hero-cover')}
          <div class="xp-hero-info">
            <div class="xp-hero-eyebrow">${eyebrow}</div>
            <div class="xp-hero-title">${esc(rec.title)}</div>
            <div class="xp-hero-meta">${rec.days.length} days · ${esc(rec.level)}</div>
          </div>
          <span class="xp-hero-cta">Start →</span>
        </a>`;
    } else if(a.user){
      // Everything completed.
      hero = `
        <div class="xp-hero xp-hero-done">
          <div class="xp-hero-info">
            <div class="xp-hero-eyebrow">Nicely done</div>
            <div class="xp-hero-title">You've explored every experiment so far ✨</div>
            <div class="xp-hero-meta">New ones are on the way.</div>
          </div>
        </div>`;
    }
  }

  const topics = topicsOrdered().map(t => {
    const tp = topicProgress(t.id, progByExp);
    const empty = tp.total === 0;
    const counter = empty ? 'Coming soon'
      : (a.user && tp.completed > 0) ? `${tp.completed} / ${tp.total} completed`
      : `${tp.total} experiment${tp.total === 1 ? '' : 's'}`;
    const pct = tp.total ? Math.round(tp.completed / tp.total * 100) : 0;
    const inner = `
      ${coverHtml(t, 'xp-topic-cover')}
      <div class="xp-topic-info">
        <div class="xp-topic-title">${t.icon} ${esc(t.title)}</div>
        <div class="xp-topic-count">${counter}</div>
        ${(!empty && tp.completed > 0) ? `<div class="xp-bar"><div class="xp-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>`;
    return empty
      ? `<div class="xp-topic is-empty">${inner}</div>`
      : `<a class="xp-topic" href="#/experiments/${esc(t.id)}">${inner}</a>`;
  }).join('');

  body.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Experiments</h1>
      <p class="page-sub">Explore a topic, practise daily, and finish each day with a measurement.</p>
    </div>
    ${hero}
    <h2 class="xp-section-h">Topics</h2>
    <div class="xp-topics">${topics}</div>`;
}

function renderTopic(body, topicId, progByExp){
  const topic = getTopic(topicId);
  if(!topic){ body.innerHTML = `<div class="empty">Topic not found.</div>`; return; }
  const exps = experimentsByTopic(topicId);
  const a = auth.getState();

  const cards = exps.map(exp => {
    const st = experimentState(exp, progByExp.get(exp.id));
    let badge, cta;
    if(st.status === 'completed'){ badge = `<span class="xp-status done">✓ Completed</span>`; cta = 'Review'; }
    else if(st.status === 'in-progress'){ badge = `<span class="xp-status going">Continue · Day ${st.currentNumber} of ${st.total}</span>`; cta = 'Continue'; }
    else { badge = `<span class="xp-status">${exp.days.length} days · ${esc(exp.level)}</span>`; cta = 'Start'; }
    const pct = st.total ? Math.round(st.completedCount / st.total * 100) : 0;
    return `
      <a class="xp-exp" href="#/experiment/${esc(exp.id)}">
        ${coverHtml(exp, 'xp-exp-cover')}
        <div class="xp-exp-info">
          <div class="xp-exp-title">${esc(exp.title)}</div>
          ${exp.summary ? `<div class="xp-exp-sum">${esc(exp.summary)}</div>` : ''}
          ${badge}
          ${st.completedCount > 0 && !st.completed ? `<div class="xp-bar"><div class="xp-bar-fill" style="width:${pct}%"></div></div>` : ''}
        </div>
        <span class="xp-exp-cta">${cta} →</span>
      </a>`;
  }).join('');

  body.innerHTML = `
    <p class="room-hint" style="text-align:left;margin:0 0 8px"><a href="#/experiments" class="link">← Experiments</a></p>
    <div class="view-head">
      <h1 class="page-title">${topic.icon} ${esc(topic.title)}</h1>
    </div>
    ${exps.length ? `<div class="xp-exps">${cards}</div>`
      : `<div class="panel"><p class="placeholder">New experiments are coming to this topic soon.</p></div>`}`;
}

// ============================================================================
//  Single experiment  (#/experiment/:id)  — days + inline measurement
// ============================================================================
export function mountExperimentDetail(el, experimentId){
  el.innerHTML = `<div id="xpBody"><div class="empty">Loading…</div></div>`;
  const body = el.querySelector('#xpBody');
  const exp = getExperiment(experimentId);
  if(!exp){ body.innerHTML = `<div class="empty">Experiment not found.</div>`; return () => {}; }

  let unsubAuth = null;
  let teardownMeasure = null;
  let viewDayId = null;          // which day the user is currently looking at

  async function render(){
    if(teardownMeasure){ teardownMeasure(); teardownMeasure = null; }
    const a = auth.getState();
    const uid = a.user?.id || null;
    const [progByExp, resultsByDay] = await Promise.all([
      fetchProgress(uid),
      fetchExperimentResults(uid, exp.id),
    ]);
    const prog = progByExp.get(exp.id);
    if(a.user) ensureStarted(a.user.id, exp.id);   // fire-and-forget: shows in Continue
    const st = experimentState(exp, prog);

    // Which day to show: the one the user picked (if still unlocked) else the current one.
    let day = viewDayId ? exp.days.find(d => d.id === viewDayId) : null;
    if(!day || !isDayUnlocked(exp, day, prog)) day = st.currentDay || exp.days[exp.days.length - 1];
    viewDayId = day.id;
    const done = (prog && prog.completedDays) || new Set();
    const isDone = done.has(day.id);
    const topic = getTopic(exp.topic);

    // Day strip
    const strip = exp.days.map(d => {
      const n = dayNumber(exp, d);
      const dDone = done.has(d.id);
      const unlocked = isDayUnlocked(exp, d, prog);
      const cls = dDone ? 'done' : (d.id === day.id ? 'current' : unlocked ? 'open' : 'locked');
      const mark = dDone ? '✓' : unlocked ? n : '🔒';
      return `<button class="xp-day-dot ${cls}" data-day="${esc(d.id)}" ${unlocked ? '' : 'disabled'} aria-label="Day ${n}">${mark}</button>`;
    }).join('');

    body.innerHTML = `
      <p class="room-hint" style="text-align:left;margin:0 0 8px"><a href="#/experiments/${esc(exp.topic)}" class="link">← ${esc(topic ? topic.title : 'Experiments')}</a></p>
      <div class="view-head">
        <h1 class="page-title">${esc(exp.title)}</h1>
        <p class="page-sub">${exp.days.length} days · ${esc(exp.level)}${st.completed ? ' · ✓ Completed' : ''}</p>
      </div>
      <div class="xp-day-strip">${strip}</div>

      <div class="panel xp-day">
        <div class="xp-day-eyebrow">Day ${dayNumber(exp, day)}${day.title ? ' · ' + esc(day.title) : ''}</div>
        ${day.intro ? `<p class="xp-day-text">${esc(day.intro)}</p>` : ''}
        ${typeof day.practiceMinutes === 'number' ? `<p class="xp-day-text" style="opacity:.7;font-size:.9em;margin:0 0 10px">⏱ Estimated practice time: about ${day.practiceMinutes} minute${day.practiceMinutes === 1 ? '' : 's'}</p>` : ''}
        ${day.task ? `<div class="xp-day-block"><span class="xp-day-label">Try this</span><p>${esc(day.task)}</p></div>` : ''}
        ${day.practice ? `<div class="xp-day-block"><span class="xp-day-label">While you measure</span><p>${esc(day.practice)}</p></div>` : ''}
        <div id="xpMeasureHost"></div>
      </div>
      ${st.completed ? `<div class="panel xp-rating" id="xpRating">
        <div class="xp-rating-q">Was this experiment useful?</div>
        <div class="xp-stars">${[1, 2, 3, 4, 5].map(n => `<button class="xp-star" type="button" data-star="${n}" aria-label="${n} of 5 stars">★</button>`).join('')}</div>
      </div>` : ''}`;

    // Day strip navigation
    body.querySelectorAll('.xp-day-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        if(btn.disabled) return;
        viewDayId = btn.dataset.day;
        render();
      });
    });

    const host = body.querySelector('#xpMeasureHost');
    if(isDone){
      const res = resultsByDay.get(day.id);
      const finishedNote = st.completed ? `<div class="xp-done-note">You finished this experiment — beautifully done. ✨</div>` : '';
      host.innerHTML = res
        ? `<a class="xp-done-card" href="#/m/${esc(String(res.id))}">
             <span class="xp-done-main">✓ Day ${dayNumber(exp, day)} · <b style="color:${vColor(res.avg)}">${res.avg.toFixed(1)}</b> avg ${res.verified ? '<span class="v-badge verified">✓ Verified</span>' : '<span class="warn">Not verified</span>'}</span>
             <span class="xp-done-cta">View measurement →</span>
           </a>${finishedNote}`
        : `<div class="xp-done-note">✓ Day ${dayNumber(exp, day)} completed.</div>${finishedNote}`;
    } else {
      teardownMeasure = setupMeasure(host, exp, day, () => { viewDayId = null; render(); });
    }

    // Rating — only on a fully completed experiment. Private analytics for the
    // admin; aggregates are never shown back to the user.
    if(st.completed){
      const rHost = body.querySelector('#xpRating');
      const stars = [...rHost.querySelectorAll('.xp-star')];
      const paint = n => stars.forEach((s, i) => s.classList.toggle('on', i < n));
      stars.forEach((s, i) => {
        s.addEventListener('mouseenter', () => paint(i + 1));
        s.addEventListener('click', async () => {
          paint(i + 1);
          await rateExperiment(uid, exp.id, i + 1);
          rHost.innerHTML = `<div class="xp-rating-thanks">✓ Thanks — your feedback helps shape future experiments.</div>`;
        });
      });
      rHost.querySelector('.xp-stars').addEventListener('mouseleave', () => paint(0));
    }
  }

  unsubAuth = auth.subscribeAuth(() => { render(); });
  return () => { if(unsubAuth) unsubAuth(); if(teardownMeasure) teardownMeasure(); };
}

// ---- Inline measurement card -----------------------------------------------
// Reuses the BLE stream + the same stats/save as Solo, rendered compactly.
function setupMeasure(host, exp, day, onSaved){
  let connected = ble.getState().connected;
  let curLed = ble.getState().lastFrame ? ble.getState().lastFrame.led : 0;
  let measuring = false, finished = false;
  let samples = [], swingWin = [], swings = 0, wasSwing = false, cheat = false, endMs = 0, stats = null;
  let sampleTimer = null, uiTimer = null;

  const unsubStatus = ble.subscribeStatus(s => { connected = s.connected; if(!measuring && !finished) renderIdle(); });
  const unsubFrames = ble.subscribeFrames(f => {
    curLed = f.led;
    if(measuring){
      const now = Date.now();
      swingWin.push({ t: now, led: f.led });
      swingWin = swingWin.filter(x => now - x.t <= CHEAT_WINDOW_MS);
      const leds = swingWin.map(x => x.led);
      const swingNow = (Math.max(...leds) - Math.min(...leds)) >= SWING_LIMIT;
      if(swingNow && !wasSwing && ++swings >= MAX_SWINGS) cheat = true;
      wasSwing = swingNow;
    }
  });

  function gate(){
    const a = auth.getState();
    if(!a.user) return 'login';
    if(!a.subscriber) return 'subscribe';
    if(!connected) return 'connect';
    return 'ready';
  }

  function renderIdle(){
    const g = gate();
    let cta;
    if(g === 'login') cta = `<button class="cn-cta" data-m="login">Log in to measure</button>`;
    else if(g === 'subscribe') cta = `<button class="cn-cta" data-m="subscribe">Subscribe to measure</button>`;
    else if(g === 'connect') cta = `<p class="xp-measure-hint">Connect your Egely Wheel (top right) to measure.</p>`;
    else cta = `<button class="cn-cta" data-m="start">Start Measurement</button>`;
    host.innerHTML = `
      <div class="xp-measure">
        <div class="xp-measure-head">Complete Day ${dayNumber(exp, day)} · ${durLabel(day.measureSeconds)} measurement</div>
        ${cta}
      </div>`;
  }

  function renderMeasuring(){
    const left = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
    const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
    host.innerHTML = `
      <div class="xp-measure measuring">
        <div class="xp-live-row">
          <div class="xp-live-cell"><div class="xp-live-val">${left}s</div><div class="xp-live-lbl">Time left</div></div>
          <div class="xp-live-cell"><div class="xp-live-val" style="color:${vColor(curLed)}">${curLed}</div><div class="xp-live-lbl">Live</div></div>
          <div class="xp-live-cell"><div class="xp-live-val" style="color:${vColor(avg)}">${avg.toFixed(1)}</div><div class="xp-live-lbl">Avg</div></div>
        </div>
        <div class="xp-verify ${cheat ? 'bad' : 'good'}">${cheat ? 'Unverified — irregular spinning' : '✓ Looks genuine'}</div>
        <button class="btn-secondary" data-m="stop">Stop</button>
      </div>`;
  }

  function renderReview(){
    const lvl = vitalityLevel(stats.avg);
    host.innerHTML = `
      <div class="xp-measure review">
        <div class="xp-review-row">
          <span><b style="color:${vColor(stats.avg)}">${stats.avg.toFixed(1)}</b> Avg</span>
          <span><b style="color:${vColor(stats.peak)}">${stats.peak}</b> Peak</span>
          <span class="${cheat ? 'warn' : 'v-badge verified'}">${cheat ? 'Not verified' : '✓ Verified'}</span>
        </div>
        <div class="xp-review-level" style="color:${lvl.color}">${esc(lvl.name)}</div>
        ${cheat ? `<p class="xp-measure-hint">This one won't count toward your progression. You can save it anyway, or discard and retry.</p>` : ''}
        <div class="field full" style="margin-top:12px">
          <label for="xpComment">Reflection — ${esc(day.reflectionPrompt || 'A note about this session')}</label>
          <textarea id="xpComment" maxlength="500" rows="2" placeholder="Optional…"></textarea>
        </div>
        <div class="form-actions">
          <button class="cn-cta" data-m="save">Save & complete day</button>
          <button class="btn-secondary" data-m="discard">Discard</button>
          <span class="form-msg" data-m-msg></span>
        </div>
      </div>`;
  }

  function start(){
    if(gate() !== 'ready') { renderIdle(); return; }
    samples = []; swingWin = []; swings = 0; wasSwing = false; cheat = false; finished = false; stats = null;
    measuring = true;
    endMs = Date.now() + day.measureSeconds * 1000;
    wakeLock.acquire();
    presence.setExperiment(true);   // show me as "in an experiment" on the Live wall
    sampleTimer = setInterval(() => samples.push(curLed), SAMPLE_MS);
    uiTimer = setInterval(() => { if(measuring){ if(Date.now() >= endMs) finish(); else renderMeasuring(); } }, 250);
    renderMeasuring();
  }

  function cleanupTimers(){
    if(sampleTimer){ clearInterval(sampleTimer); sampleTimer = null; }
    if(uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    presence.setExperiment(false);
    wakeLock.release();
  }

  function abort(){            // manual early stop → discard
    measuring = false; finished = false;
    cleanupTimers();
    renderIdle();
  }

  function finish(){           // reached full duration → review
    measuring = false; finished = true;
    cleanupTimers();
    stats = computeStats(samples);
    if(!stats){ finished = false; renderIdle(); return; }
    renderReview();
  }

  async function save(){
    const a = auth.getState();
    const btn = host.querySelector('[data-m="save"]'); if(btn) btn.disabled = true;
    const msg = host.querySelector('[data-m-msg]');
    if(msg){ msg.className = 'form-msg'; msg.textContent = 'Saving…'; }
    const comment = (host.querySelector('#xpComment')?.value || '').trim();
    const r1 = await saveExperimentMeasurement({
      userId: a.user?.id, identity: (a.displayName || '').trim() || 'Me',
      experiment: exp, day, stats, samples, verified: !cheat, comment,
    });
    if(r1.error){ if(btn) btn.disabled = false; if(msg){ msg.className = 'form-msg err'; msg.textContent = 'Error: ' + r1.error.message; } return; }
    await markDayComplete(a.user.id, exp.id, day.id);
    onSaved();   // re-render the experiment → day shown as completed, next unlocked
  }

  host.addEventListener('click', (e) => {
    const t = e.target.closest('[data-m]'); if(!t) return;
    const act = t.dataset.m;
    if(act === 'login') location.hash = '#/login';
    else if(act === 'subscribe') location.hash = '#/subscribe';
    else if(act === 'start') start();
    else if(act === 'stop') abort();
    else if(act === 'discard') { finished = false; renderIdle(); }
    else if(act === 'save') save();
  });

  renderIdle();
  return () => { measuring = false; cleanupTimers(); unsubStatus(); unsubFrames(); };
}
