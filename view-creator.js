// view-creator.js — Creator Studio (#/creator, Spiritual Makers only).
//
// ONE guided flow to a finished, downloadable share video:
//   1 Plan    — title + intro style
//   2 Record  — the REAL solo cockpit embedded (view-solo with hooks): camera
//               armed in the dock, Start runs measurement + recording together,
//               a 60s closing-words post-roll after the window, native Save
//   3 Review  — stats + "Saved to My Measurements" + Showcase publish
//   4 Produce — the REAL share card (mountVideoShare) with the chosen intro
//   5 Share   — caption + checklist + create-another loop
//
// Reuse-first: every functional piece is the existing, live-tested module —
// this view only wraps, guides and gives feedback. The measurement it produces
// IS a normal solo measurement (results row → My Measurements, replay,
// Showcase all behave natively).
import { supabase } from './db.js';
import * as auth from './auth.js';
import { mount as mountSolo } from './view-solo.js';
import { mountVideoShare } from './video-share.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

const STEPS = ['Plan', 'Record', 'Review', 'Produce', 'Share'];
const CAPTION = 'I measured my life energy on camera 🌀 This is my vitality, made visible by the Egely Wheel. ▶ live.egelywheel.com  #EgelyWheel #Vitality #SpiritualMaker';

const INTROS = [
  { key: 'light', name: 'Aura Light', desc: 'clean · bright · brand' },
  { key: 'gold',  name: 'Golden Hour', desc: 'warm · radiant' },
  { key: 'navy',  name: 'Midnight', desc: 'deep · celestial' },
];

function styles(){
  if(document.getElementById('cwStyles')) return;
  const el = document.createElement('style');
  el.id = 'cwStyles';
  el.textContent = `
  .cw-wrap{max-width:860px;margin:0 auto;padding:4px 0 40px}
  .cw-head{background:#011624;border-radius:18px;padding:18px 22px 16px;color:#fff}
  .cw-head-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
  .cw-eyebrow{font-family:'Montserrat',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.22em;color:#8fa2ad;text-transform:uppercase}
  .cw-title{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:600;letter-spacing:-.2px;margin-top:3px}
  .cw-title .grad{background:linear-gradient(90deg,#37dbff,#9b8cff);-webkit-background-clip:text;background-clip:text;color:transparent}
  .cw-exit{flex:none;background:transparent;color:#9fb3bf;border:1.5px solid #2a4252;border-radius:999px;
    padding:7px 14px;font:700 11.5px 'Montserrat',sans-serif;letter-spacing:.05em;cursor:pointer}
  .cw-exit:hover:not(:disabled){background:#152936;color:#fff;border-color:#3b5668}
  .cw-steps{display:flex;gap:6px}
  .cw-st{flex:1;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.06);min-width:0}
  .cw-st b{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.14);color:#cfe3ee;font-size:11px;
    display:flex;align-items:center;justify-content:center;flex:none}
  .cw-st span{font-size:11.5px;color:#9fb3bf;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cw-st.on{background:linear-gradient(90deg,rgba(55,219,255,.25),rgba(82,48,218,.35))}
  .cw-st.on b{background:#fff;color:#011624}
  .cw-st.on span{color:#fff}
  .cw-st.done b{background:#20b26b;color:#fff}
  .cw-st.done span{color:#7fd6ab}
  /* Mobile rail: inactive steps shrink to bare dots, the ACTIVE step stretches
     and keeps its full label readable (Csaba, 2026-07-26). */
  @media (max-width:600px){
    .cw-steps{gap:5px}
    .cw-st{flex:0 1 42px;justify-content:center;padding:8px 5px}
    .cw-st span{display:none}
    .cw-st.on{flex:1 1 auto;justify-content:flex-start;padding:8px 12px}
    .cw-st.on span{display:inline;overflow:visible}
  }
  .cw-coach{display:flex;gap:10px;align-items:flex-start;margin:14px 0 0;background:var(--ewr-accent-tint,rgba(82,48,218,.08));
    border:1px solid rgba(82,48,218,.18);border-radius:13px;padding:11px 14px;font-size:13px;line-height:1.5;color:#26323b}
  .cw-coach b{color:#011624}
  .cw-coach .cw-coach-ic{flex:none;font-size:15px;line-height:1.3}
  .cw-body{margin-top:16px}
  .cw-card{background:#fff;border:1px solid var(--ewr-border,#dfe3e6);border-radius:16px;padding:16px 18px}
  .cw-card h3{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:600;margin:0 0 4px;color:#011624}
  .cw-hint{font-size:12.5px;color:#67737c;line-height:1.5;margin:0}
  .cw-title-input{width:100%;box-sizing:border-box;border:1.5px solid rgba(82,48,218,.45);border-radius:12px;
    padding:12px 14px;font:600 16px 'Montserrat',sans-serif;color:#011624;margin-top:10px}
  .cw-title-input:focus{outline:none;border-color:#5230da;box-shadow:0 0 0 3px rgba(82,48,218,.12)}
  .cw-count{font-size:11px;color:#99a2a7;text-align:right;margin-top:4px}
  .cw-intros{display:flex;gap:12px;margin-top:12px}
  .cw-intro{flex:1;border:1.5px solid var(--ewr-border,#dfe3e6);border-radius:13px;overflow:hidden;cursor:pointer;
    background:#fff;padding:0;text-align:left;transition:border-color .15s,box-shadow .15s}
  .cw-intro.sel{border-color:#5230da;box-shadow:0 0 0 1px #5230da}
  .cw-intro .cw-ip{display:block;height:84px;position:relative}
  .cw-intro .cw-ip-ava{position:absolute;left:50%;top:12px;transform:translateX(-50%);width:38px;height:38px;border-radius:50%;
    object-fit:cover;border:2.5px solid #fff;background:#233c52}
  .cw-intro .cw-ip-ava.init{display:flex;align-items:center;justify-content:center;color:#fff;font:700 15px 'Montserrat',sans-serif}
  .cw-intro .cw-ip-t{position:absolute;bottom:9px;width:100%;text-align:center;font:700 11px 'Montserrat',sans-serif;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 8px;box-sizing:border-box}
  .cw-ip.light{background:linear-gradient(135deg,#e8fbff,#ece7fd)} .cw-ip.light .cw-ip-t{color:#011624}
  .cw-ip.gold{background:linear-gradient(135deg,#3a2c0d,#161003)} .cw-ip.gold .cw-ip-t{color:#ffd75e}
  .cw-ip.gold .cw-ip-ava{border-color:#f5b700}
  .cw-ip.navy{background:radial-gradient(circle at 50% 25%,#16324a,#010b14)} .cw-ip.navy .cw-ip-t{color:#fff}
  .cw-ip.navy .cw-ip-ava{border-color:#37dbff}
  .cw-intro .cw-il{display:block;padding:8px 12px 9px}
  .cw-intro .cw-il b{font-size:12px;color:#011624;display:block}
  .cw-intro .cw-il span{font-size:10.5px;color:#67737c}
  @media (max-width:600px){ .cw-intros{flex-direction:column} .cw-intro .cw-ip{height:72px} }
  .cw-foot{display:flex;justify-content:space-between;align-items:center;margin-top:16px;gap:10px}
  .cw-next{background:#401d91;color:#fff;border:none;border-radius:999px;padding:11px 22px;
    font:700 13px 'Montserrat',sans-serif;letter-spacing:.03em;cursor:pointer}
  .cw-next:hover:not(:disabled){background:#011624}
  .cw-next:disabled{opacity:.45;cursor:default}
  .cw-back{background:transparent;border:none;color:#67737c;font:600 12.5px 'Inter',sans-serif;cursor:pointer;padding:8px 4px}
  .cw-back:hover:not(:disabled){color:#011624;background:transparent}
  .cw-solo-host .view-head{display:none}
  /* Wizard-only reorder of the embedded solo SETUP panel: camera first, the
     Start button LAST — you aim the camera, then you roll (Csaba, 2026-07-26).
     The plain #/solo route keeps its own order. */
  .cw-solo-host .solo-setup{display:flex;flex-direction:column}
  .cw-solo-host .solo-setup .solo-top{order:1}
  .cw-solo-host .solo-setup .solo-durfield{order:2}
  .cw-solo-host .solo-setup #sVoiceDock{order:3}
  .cw-solo-host .solo-setup .solo-controls{order:4;margin-top:14px}
  .cw-solo-host .solo-setup .solo-msg{order:5}
  .cw-solo-host .solo-controls #sStart{width:100%;padding:13px 20px}
  .cw-spin{flex:none;width:15px;height:15px;border-radius:50%;margin-top:2px;
    border:2.5px solid rgba(82,48,218,.25);border-top-color:#5230da;animation:cwspin .8s linear infinite}
  @keyframes cwspin{to{transform:rotate(360deg)}}
  .cw-coach .cw-bar{display:block;height:5px;border-radius:999px;background:#e8e4f8;overflow:hidden;margin-top:8px}
  .cw-coach .cw-bar i{display:block;height:100%;width:40%;border-radius:999px;
    background:linear-gradient(90deg,#37dbff,#5230da);animation:cwslide 1.3s ease-in-out infinite}
  @keyframes cwslide{0%{margin-left:-40%}100%{margin-left:100%}}
  .cw-stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px}
  .cw-stat{background:var(--ewr-surface-muted,#f2f3f4);border:1px solid var(--ewr-border,#dfe3e6);border-radius:12px;
    padding:9px 16px;min-width:78px;text-align:center}
  .cw-stat b{display:block;font:600 20px 'Montserrat',sans-serif;color:#011624}
  .cw-stat span{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#99a2a7}
  .cw-ok{color:#0f8a52;font-weight:700}
  .cw-ghost{display:inline-flex;align-items:center;gap:6px;background:#fff;color:#5230da;
    border:1.5px solid rgba(82,48,218,.4);border-radius:999px;padding:9px 16px;
    font:700 12px 'Montserrat',sans-serif;cursor:pointer}
  .cw-ghost:hover:not(:disabled){background:rgba(82,48,218,.08);color:#401d91}
  .cw-ghost.on{background:rgba(32,178,107,.12);border-color:rgba(32,178,107,.5);color:#0f8a52}
  .cw-cap{border:1px dashed #c9bef2;background:#f8f7fd;border-radius:12px;padding:13px 15px;margin-top:12px}
  .cw-cap b{display:block;font:700 10px 'Montserrat',sans-serif;letter-spacing:.16em;color:#5230da;margin-bottom:6px;text-transform:uppercase}
  .cw-cap p{margin:0;font-size:13px;line-height:1.6;color:#26323b}
  .cw-check{display:flex;gap:8px;align-items:center;font-size:13px;margin-top:8px;color:#26323b}
  .cw-check i{width:18px;height:18px;border-radius:50%;background:rgba(32,178,107,.15);color:#0f8a52;font-style:normal;
    font-size:11px;display:inline-flex;align-items:center;justify-content:center;flex:none}
  .cw-gate{max-width:520px;margin:40px auto;text-align:center}
  .cw-gate h2{font-family:'Montserrat',sans-serif;font-size:20px;margin:0 0 8px}
  .cw-msg{font-size:12.5px;margin-top:8px}
  .cw-msg.err{color:#c2415b}
  `;
  document.head.appendChild(el);
}

export function mount(el){
  styles();
  let destroyed = false, key = null, rendered = false;
  let step = 1;
  let title = '', introStyle = 'light';
  let resultId = null, stats = null, recording = null, published = false;
  let soloCleanup = null, vs = null, vsHost = null;
  let coachTimer = null, recEndsAt = 0, recPhase = 'idle';   // idle|measuring|closing|saved
  let takeGen = 0;            // increments per Start — stale onSaved must never auto-advance
  let recordingError = null;  // the take saved but its recording upload failed

  function dropVideoShare(){
    if(vs){ try { vs.destroy(); } catch {} vs = null; }
    vsHost = null;
  }

  const $ = sel => el.querySelector(sel);

  // ---- auth gate (view-profile pattern: survives the accessReady flap) ------
  const unsub = auth.subscribeAuth(a => {
    if(destroyed) return;
    const uid = a.user?.id || null;
    if(!uid){ renderGate('login'); rendered = false; key = null; return; }
    // accessReady flaps false→true on hourly token refresh / tab refocus: never
    // tear down a rendered wizard, and reset the key when we DO paint the loader
    // so the settle emit always repaints the right gate (view-profile pattern).
    if(!a.accessReady){ if(!rendered){ key = null; renderGate('loading'); } return; }
    const k = uid + '|' + (a.approvedMaker ? 1 : 0);
    if(k === key) return;
    key = k;
    if(!a.approvedMaker){ renderGate('notmaker'); rendered = false; return; }
    resetState();
    renderShell();
    rendered = true;
  });

  function renderGate(kind){
    teardownStep();
    el.innerHTML = `<div class="cw-gate">
      ${kind === 'login' ? `<h2>Creator Studio</h2><p class="cw-hint">This studio is for Spiritual Makers. Please <a class="link" href="#/login">log in</a> to continue.</p>`
      : kind === 'loading' ? `<h2>Creator Studio</h2><p class="cw-hint">Loading…</p>`
      : `<h2>Creator Studio</h2><p class="cw-hint">This studio is where approved Spiritual Makers film and share their vitality readings. Curious? Learn more on the <a class="link" href="#/spiritual-makers">Spiritual Makers</a> page.</p>`}
    </div>`;
  }

  function resetState(){
    teardownStep();
    dropVideoShare();
    step = 1; title = ''; introStyle = 'light';
    resultId = null; stats = null; recording = null; published = false;
    recPhase = 'idle'; recordingError = null;
  }

  // ---- shell + step rail ----------------------------------------------------
  function renderShell(){
    el.innerHTML = `
      <div class="cw-wrap">
        <div class="cw-head">
          <div class="cw-head-row">
            <div>
              <div class="cw-eyebrow">Creator Studio</div>
              <div class="cw-title">Today you film a <span class="grad">vitality reading</span></div>
            </div>
            <button type="button" class="cw-exit" id="cwExit">✕ Exit</button>
          </div>
          <div class="cw-steps" id="cwSteps"></div>
        </div>
        <div class="cw-coach" id="cwCoach" hidden></div>
        <div class="cw-body" id="cwBody"></div>
      </div>`;
    $('#cwExit').addEventListener('click', () => { location.hash = '#/home'; });
    renderStep();
  }

  function paintRail(){
    const host = $('#cwSteps');
    if(!host) return;
    host.innerHTML = STEPS.map((name, i) => {
      const n = i + 1;
      const cls = n < step ? 'done' : n === step ? 'on' : '';
      return `<div class="cw-st ${cls}"><b>${n < step ? '✓' : n}</b><span>${name}</span></div>`;
    }).join('');
  }

  function coach(html, opts2 = {}){
    const c = $('#cwCoach');
    if(!c) return;
    if(!html){ c.hidden = true; return; }
    c.hidden = false;
    const ic = opts2.spinner ? '<span class="cw-spin"></span>' : '<span class="cw-coach-ic">🧭</span>';
    c.innerHTML = `${ic}<span>${html}${opts2.bar ? '<span class="cw-bar"><i></i></span>' : ''}</span>`;
  }

  function teardownStep(){
    if(soloCleanup){ try { soloCleanup(); } catch {} soloCleanup = null; }
    if(coachTimer){ clearInterval(coachTimer); coachTimer = null; }
  }

  function go(n){
    teardownStep();
    step = n;
    renderStep();
  }

  // ---- steps ----------------------------------------------------------------
  function renderStep(){
    paintRail();
    const body = $('#cwBody');
    if(!body) return;
    if(step === 1) stepPlan(body);
    else if(step === 2) stepRecord(body);
    else if(step === 3) stepReview(body);
    else if(step === 4) stepProduce(body);
    else stepShare(body);
  }

  // 1 — PLAN: title + intro style
  function stepPlan(body){
    coach(`<b>Two choices and you're rolling.</b> Name your video, pick the intro look — your photo and this title open the video.`);
    const a = auth.getState();
    const ava = a.avatarUrl
      ? `<img class="cw-ip-ava" src="${esc(a.avatarUrl)}" alt="">`
      : `<span class="cw-ip-ava init">${esc((a.displayName || '?').charAt(0).toUpperCase())}</span>`;
    body.innerHTML = `
      <div class="cw-card">
        <h3>Give your video a title</h3>
        <p class="cw-hint">It appears in the video intro and in your My Measurements list.</p>
        <input class="cw-title-input" id="cwTitle" maxlength="60" placeholder="e.g. Morning Energy Check" value="${esc(title)}">
        <div class="cw-count" id="cwCount"></div>
      </div>
      <div class="cw-card" style="margin-top:12px">
        <h3>Pick your intro</h3>
        <p class="cw-hint">The opening seconds of your video.</p>
        <div class="cw-intros">
          ${INTROS.map(s => `
            <button type="button" class="cw-intro${introStyle === s.key ? ' sel' : ''}" data-intro="${s.key}">
              <span class="cw-ip ${s.key}">${ava}<span class="cw-ip-t" data-ip-title>${esc(title || 'Your title here')}</span></span>
              <span class="cw-il"><b>${s.name}</b><span>${s.desc}</span></span>
            </button>`).join('')}
        </div>
      </div>
      <div class="cw-foot">
        <span></span>
        <button type="button" class="cw-next" id="cwToRecord" ${title.trim() ? '' : 'disabled'}>Set up my camera →</button>
      </div>`;
    const input = $('#cwTitle');
    const count = $('#cwCount');
    const paintCount = () => { count.textContent = `${input.value.length}/60`; };
    paintCount();
    input.addEventListener('input', () => {
      title = input.value;
      paintCount();
      $('#cwToRecord').disabled = !title.trim();
      body.querySelectorAll('[data-ip-title]').forEach(t => { t.textContent = title.trim() || 'Your title here'; });
    });
    body.querySelectorAll('[data-intro]').forEach(b => b.addEventListener('click', () => {
      introStyle = b.dataset.intro;
      body.querySelectorAll('.cw-intro').forEach(x => x.classList.toggle('sel', x === b));
    }));
    $('#cwToRecord').addEventListener('click', () => { title = title.trim().slice(0, 60); go(2); });
  }

  // 2 — RECORD: the real solo cockpit, guided
  function stepRecord(body){
    recPhase = 'idle';
    coach(`<b>1.</b> Tap <b>With camera</b> below and check your frame. &nbsp;<b>2.</b> Hit <b>Start measurement</b> — <b>the wheel measurement and your recording begin together</b>. After the countdown you'll still have up to 60 seconds for closing words.`);
    body.innerHTML = `<div class="cw-solo-host" id="cwSolo"></div>`;
    soloCleanup = mountSolo($('#cwSolo'), {
      presetLabel: title,
      hideLabel: true,
      hideHeader: true,
      onStart(durationSec){
        if(destroyed) return;
        takeGen++;
        recPhase = 'measuring';
        recEndsAt = Date.now() + durationSec * 1000;
        if(coachTimer) clearInterval(coachTimer);
        coachTimer = setInterval(paintRecordCoach, 500);
        paintRecordCoach();
      },
      onFinished(_stats){
        if(destroyed) return;
        if(coachTimer){ clearInterval(coachTimer); coachTimer = null; }
        if(!_stats){
          // Start→Stop within a beat: no samples, no results screen, no Save.
          recPhase = 'idle';
          coach(`That one was too short — tap <b>Start measurement</b> and give it at least a few seconds.`);
          return;
        }
        recPhase = 'closing';
        coach(`<b>Measurement complete ✓</b> The camera is still rolling for your <b>closing words</b> (up to 60s) — tap <b>End</b> when you're done, then <b>Save to my measurements</b>.`);
      },
      onSaving(hasRecording){
        // The camera take upload can take a while on big files — say so LOUDLY
        // so the wait never reads as "stuck" (Csaba feedback, 2026-07-26).
        if(destroyed) return;
        recPhase = 'storing';
        coach(hasRecording
          ? `<b>Storing your recording…</b> A camera take can be big — this may take up to a minute. Hang tight, we'll move on automatically.`
          : `<b>Saving your measurement…</b>`, { spinner: true, bar: true });
      },
      onSaved(id, s, meta){
        if(destroyed) return;
        const g = takeGen;
        resultId = id || null;
        stats = s || null;
        recording = (meta && meta.recording) || null;
        recordingError = (meta && meta.recordingError) || null;
        if(g !== takeGen) return;   // a newer take already started — never yank it away
        recPhase = 'saved';
        coach(recordingError
          ? `<b>Saved</b> — but your recording could not be stored. You can <b>Re-record</b> on the next screen, or continue with a silent video.`
          : `<b>Saved ✓</b> Taking you to your result…`);
        setTimeout(() => { if(!destroyed && step === 2 && g === takeGen) go(3); }, recordingError ? 2600 : 600);
      },
    });
  }

  function paintRecordCoach(){
    if(recPhase !== 'measuring') return;
    const left = Math.max(0, recEndsAt - Date.now());
    const sec = Math.ceil(left / 1000);
    const mm = Math.floor(sec / 60), ss = String(sec % 60).padStart(2, '0');
    coach(sec > 30
      ? `<b>Recording &amp; measuring · ${mm}:${ss} left.</b> Speak to your camera naturally — your energy is telling the story.`
      : `<b>${mm}:${ss} left.</b> Start closing the thought — after the countdown you'll still have up to 60s for closing words.`);
  }

  // 3 — REVIEW: stats + showcase
  function stepReview(body){
    coach(`<b>Beautiful work.</b> Your reading is saved — decide if the community should see it, then let's make the video.`);
    const st = stats || {};
    const avg = typeof st.avg === 'number' ? st.avg.toFixed(1) : '–';
    const peak = st.peak != null ? st.peak : '–';
    const steady = st.steadiness != null ? st.steadiness : '–';
    body.innerHTML = `
      <div class="cw-card">
        <h3>${esc(title)} ✨</h3>
        <p class="cw-hint"><span class="cw-ok">✓ Saved to My Measurements</span>${recording ? ` · ${recording === 'video' ? '🎥 with your camera take' : '🎙 with your voice'}` : ''}</p>
        ${recordingError ? `<p class="cw-hint" style="color:#b8860b;margin-top:4px">⚠ Your recording could not be stored — the video will be silent. Re-record below if you want the take.</p>` : ''}
        <div class="cw-stats">
          <div class="cw-stat"><b>${esc(avg)}</b><span>Avg</span></div>
          <div class="cw-stat"><b>${esc(peak)}</b><span>Peak</span></div>
          <div class="cw-stat"><b>${esc(steady)}</b><span>Steady</span></div>
        </div>
        ${resultId ? `<p class="cw-hint" style="margin-top:10px"><a class="link" href="#/m/${resultId}">Open the full measurement →</a></p>` : ''}
      </div>
      <div class="cw-card" style="margin-top:12px">
        <h3>Show it on the Showcase?</h3>
        <p class="cw-hint">The community can see and applaud your reading.</p>
        <p style="margin:10px 0 0"><button type="button" class="cw-ghost${published ? ' on' : ''}" id="cwPub">${published ? '🌟 On the Showcase — tap to remove' : '☆ Publish to Showcase'}</button>
        <span class="cw-msg" id="cwPubMsg"></span></p>
      </div>
      <div class="cw-foot">
        <button type="button" class="cw-back" id="cwRedo">← Re-record</button>
        <button type="button" class="cw-next" id="cwToProduce">Make my video →</button>
      </div>`;
    $('#cwPub').addEventListener('click', async () => {
      const btn = $('#cwPub'), msg = $('#cwPubMsg');
      if(!resultId){ msg.className = 'cw-msg err'; msg.textContent = 'No saved result found.'; return; }
      btn.disabled = true;
      const want = !published;
      const { error } = await supabase.rpc('set_solo_published', { p_result_id: Number(resultId), p_published: want });
      btn.disabled = false;
      if(error){ msg.className = 'cw-msg err'; msg.textContent = 'Could not update the Showcase right now.'; return; }
      published = want;
      msg.textContent = '';
      btn.classList.toggle('on', published);
      btn.textContent = published ? '🌟 On the Showcase — tap to remove' : '☆ Publish to Showcase';
    });
    $('#cwRedo').addEventListener('click', () => {
      // A fresh take needs a fresh share card — the old one is bound to the
      // discarded result id and would render the WRONG measurement.
      dropVideoShare();
      resultId = null; stats = null; recording = null; published = false; recordingError = null;
      go(2);
    });
    $('#cwToProduce').addEventListener('click', () => go(4));
  }

  // 4 — PRODUCE: the real share card with the chosen intro
  function stepProduce(body){
    coach(`<b>Pick your format(s).</b> The render takes about 1–2 minutes — we'll email you the link too, so you can safely move on. Your <b>${esc((INTROS.find(s => s.key === introStyle) || INTROS[0]).name)}</b> intro opens the video.`);
    body.innerHTML = `
      <div class="cw-card"><div id="cwVs"></div></div>
      <div class="cw-foot">
        <button type="button" class="cw-back" id="cwBackReview">← Back</button>
        <button type="button" class="cw-next" id="cwToShare">Continue to share →</button>
      </div>`;
    if(!vs){
      vsHost = document.createElement('div');
      vs = mountVideoShare(vsHost, { kind: 'solo', targetId: Number(resultId), introStyle });
    }
    $('#cwVs').appendChild(vsHost);
    vs.refresh();   // the poll pauses while the host is detached (step-hopping) — nudge it
    $('#cwBackReview').addEventListener('click', () => go(3));
    $('#cwToShare').addEventListener('click', () => go(5));
  }

  // 5 — SHARE: caption + checklist + loop
  function stepShare(body){
    coach(`<b>Last step.</b> Download above, copy the caption, and post while the energy is fresh.`);
    body.innerHTML = `
      <div class="cw-card"><div id="cwVs2"></div></div>
      <div class="cw-card" style="margin-top:12px">
        <div class="cw-cap"><b>✨ Caption — copy &amp; paste</b><p>${esc(CAPTION)}</p></div>
        <p style="margin:10px 0 0"><button type="button" class="cw-ghost" id="cwCopy">Copy caption</button></p>
        <div class="cw-check"><i>✓</i> Post it while the energy is fresh</div>
        <div class="cw-check"><i>✓</i> Tag <b>&nbsp;@egelywheel&nbsp;</b> — we share it forward</div>
        ${published ? `<div class="cw-check"><i>✓</i> Your reading is live on the Showcase</div>` : ''}
      </div>
      <div class="cw-foot">
        <button type="button" class="cw-back" id="cwBackProduce">← Back</button>
        <button type="button" class="cw-next" id="cwAgain">🎬 Create another one</button>
      </div>`;
    if(vsHost){ $('#cwVs2').appendChild(vsHost); if(vs) vs.refresh(); }
    $('#cwCopy').addEventListener('click', () => {
      const b = $('#cwCopy');
      if(navigator.clipboard) navigator.clipboard.writeText(CAPTION).then(() => { b.textContent = 'Copied ✓'; setTimeout(() => { b.textContent = 'Copy caption'; }, 1600); });
    });
    $('#cwBackProduce').addEventListener('click', () => go(4));
    $('#cwAgain').addEventListener('click', () => { resetState(); renderShell(); });
  }

  return () => {
    destroyed = true;
    unsub();
    teardownStep();
    dropVideoShare();
  };
}
