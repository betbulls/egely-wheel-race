// time-controls.js — shared "when + how long" UI for Solo / Create Session /
// Create Race / Edit modal. One source of truth for the 10-minute cap, the
// duration presets (pill segmented control + capped custom stepper), the
// "Start soon / Schedule" start picker and the live human-readable summary.
//
// All components are plain-DOM factories: they render into a container element
// and return a small API ({get,set,...}). Styles are injected once (tcStyles),
// so no index.html ?v bump is needed. NOTE the brand.css button-bleed gotcha:
// every <button> here gets explicit base + :hover styles (playbook §5d).

export const MAX_EVENT_MINUTES = 10;   // sessions + races
export const MAX_SOLO_SECONDS = 600;   // solo (= 10 minutes)

const pad2 = n => String(n).padStart(2, '0');

function injectStyles(){
  if(document.getElementById('tcStyles')) return;
  const s = document.createElement('style');
  s.id = 'tcStyles';
  s.textContent = `
  .tc-seg{display:flex;flex-wrap:wrap;gap:8px}
  .tc-pill{display:inline-flex;align-items:center;justify-content:center;gap:7px;
    font-family:'Inter',sans-serif;font-size:13.5px;font-weight:600;line-height:1;
    color:#011624;background:#fff;border:1px solid #dfe3e6;border-radius:999px;
    padding:10px 16px;cursor:pointer;transition:border-color .15s,background .15s,color .15s}
  .tc-pill:hover{background:#faf9ff;border-color:#b9b1e8;color:#011624}
  .tc-pill.on{background:#401d91;border-color:#401d91;color:#fff}
  .tc-pill.on:hover{background:#401d91;border-color:#401d91;color:#fff}
  .tc-pill:focus-visible{outline:2px solid #5230da;outline-offset:2px}
  .tc-reco{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
    color:#0f8a52;background:rgba(32,178,107,.14);border-radius:999px;padding:2px 7px}
  .tc-pill.on .tc-reco{color:#c9f5de;background:rgba(255,255,255,.18)}
  .tc-pane{margin-top:10px}
  .tc-dtrow{display:flex;gap:10px;margin-top:12px}
  .tc-dt{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
  .tc-dt>span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#67737c}
  .tc-tz{margin-top:8px;font-size:12px;color:#99a2a7}
  .tc-tz b{color:#67737c;font-weight:600}
  .tc-hint{margin-top:12px;font-size:12.5px;line-height:1.5;color:#4a5a64;
    background:rgba(82,48,218,.05);border:1px solid rgba(82,48,218,.14);
    border-radius:10px;padding:9px 12px}
  .tc-step{display:inline-flex;align-items:center;gap:12px;margin-top:10px;
    background:#f7f8f8;border:1px solid #dfe3e6;border-radius:999px;padding:6px 8px}
  .tc-step-btn{width:30px;height:30px;border-radius:50%;border:1px solid #dfe3e6;
    background:#fff;color:#011624;font-size:16px;font-weight:700;cursor:pointer;
    display:flex;align-items:center;justify-content:center;padding:0;line-height:1;
    transition:background .15s,border-color .15s}
  .tc-step-btn:hover{background:#efeaff;border-color:#c9bcf2;color:#011624}
  .tc-step-btn:focus-visible{outline:2px solid #5230da;outline-offset:2px}
  .tc-step-val{min-width:66px;text-align:center;font-weight:700;color:#011624;
    font-size:14px;font-variant-numeric:tabular-nums}
  .tc-summary{background:linear-gradient(135deg,rgba(55,219,255,.09),rgba(82,48,218,.09));
    border:1px solid rgba(82,48,218,.18);border-radius:12px;padding:12px 16px;margin:14px 0 4px}
  .tc-sum-t{font-family:'Montserrat','Inter',sans-serif;font-weight:600;color:#011624;font-size:15px}
  .tc-sum-s{font-size:12.5px;color:#5b6770;margin-top:3px}
  .tc-disabled{opacity:.55;pointer-events:none}
  @media (max-width:600px){
    .tc-pill{flex:1 1 auto}
    .tc-dtrow{flex-direction:column}
  }
  `;
  document.head.appendChild(s);
}

// Short local timezone label, e.g. "EDT" / "CET". Empty string if unavailable.
export function tzLabel(){
  try{
    const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());
    const p = parts.find(x => x.type === 'timeZoneName');
    return p ? p.value : '';
  }catch(_){ return ''; }
}

// "Sat, Jul 4 at 3:30 PM" — matches the display format used across the app.
export function fmtStartLabel(d){
  const day = d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
}

// Human duration label from seconds: "30s", "1 min", "2m 30s".
export function fmtSeconds(v){
  if(v < 60) return v + 's';
  if(v % 60 === 0) return (v / 60) + ' min';
  return Math.floor(v / 60) + 'm ' + (v % 60) + 's';
}

/* ---------------------------------------------------------------------------
   durationPicker(container, { options:[{label,value}], value, custom, onChange })
   custom: { min, max, step, format(v) } — capped stepper shown when Custom is on.
--------------------------------------------------------------------------- */
export function durationPicker(container, opts){
  injectStyles();
  const o = Object.assign({ options: [], value: null, custom: null, onChange: null }, opts);
  let value = o.value;
  let customActive = !o.options.some(op => op.value === value);

  const wrap = document.createElement('div');
  wrap.className = 'tc-dur';
  const seg = document.createElement('div');
  seg.className = 'tc-seg';
  wrap.appendChild(seg);

  let stepper = null, stepVal = null;
  const emit = () => { if(o.onChange) o.onChange(value); };

  function paint(){
    seg.querySelectorAll('button').forEach(b => {
      const on = b.dataset.v === 'custom' ? customActive
        : (!customActive && Number(b.dataset.v) === value);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if(stepper){
      stepper.hidden = !customActive;
      if(customActive) stepVal.textContent = o.custom.format(value);
    }
  }

  o.options.forEach(op => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tc-pill'; b.dataset.v = String(op.value);
    b.textContent = op.label;
    b.addEventListener('click', () => { customActive = false; value = op.value; paint(); emit(); });
    seg.appendChild(b);
  });

  if(o.custom){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tc-pill'; b.dataset.v = 'custom'; b.textContent = 'Custom';
    b.addEventListener('click', () => {
      customActive = true;
      value = Math.max(o.custom.min, Math.min(o.custom.max, value));
      paint(); emit();
    });
    seg.appendChild(b);

    stepper = document.createElement('div');
    stepper.className = 'tc-step'; stepper.hidden = true;
    const minus = document.createElement('button');
    minus.type = 'button'; minus.className = 'tc-step-btn'; minus.textContent = '−';
    minus.setAttribute('aria-label', 'Decrease duration');
    stepVal = document.createElement('span'); stepVal.className = 'tc-step-val';
    const plus = document.createElement('button');
    plus.type = 'button'; plus.className = 'tc-step-btn'; plus.textContent = '+';
    plus.setAttribute('aria-label', 'Increase duration');
    minus.addEventListener('click', () => { value = Math.max(o.custom.min, value - o.custom.step); paint(); emit(); });
    plus.addEventListener('click', () => { value = Math.min(o.custom.max, value + o.custom.step); paint(); emit(); });
    stepper.append(minus, stepVal, plus);
    wrap.appendChild(stepper);
  }

  container.appendChild(wrap);
  paint();

  return {
    get: () => value,
    set: (v) => { value = v; customActive = !o.options.some(op => op.value === v); paint(); },
    setDisabled: (dis) => {
      wrap.classList.toggle('tc-disabled', !!dis);
      wrap.querySelectorAll('button').forEach(b => { b.disabled = !!dis; });
    },
  };
}

/* ---------------------------------------------------------------------------
   startPicker(container, { mode:'session'|'race', initial:Date|null, onChange })
   "When should it start?" — Start soon (quick chips) / Schedule (date chips +
   native date/time inputs + timezone note). getDate() computes "soon" times at
   READ time so an idle form still submits an accurate start.
--------------------------------------------------------------------------- */
export function startPicker(container, opts){
  injectStyles();
  const o = Object.assign({ mode: 'session', initial: null, onChange: null }, opts);
  const isRace = o.mode === 'race';
  let kind = o.initial ? 'schedule' : 'soon';
  let soonMin = isRace ? 5 : 15;

  const tz = tzLabel();
  const wrap = document.createElement('div');
  wrap.className = 'tc-start';
  wrap.innerHTML = `
    <div class="tc-seg" data-tabs>
      <button type="button" class="tc-pill" data-tab="soon">Start soon</button>
      <button type="button" class="tc-pill" data-tab="schedule">Schedule</button>
    </div>
    <div class="tc-pane" data-pane="soon">
      <div class="tc-seg">
        <button type="button" class="tc-pill" data-soon="5">In 5 min${isRace ? ' <span class="tc-reco">recommended</span>' : ''}</button>
        <button type="button" class="tc-pill" data-soon="15">In 15 min</button>
        <button type="button" class="tc-pill" data-soon="30">In 30 min</button>
      </div>
    </div>
    <div class="tc-pane" data-pane="schedule" hidden>
      <div class="tc-seg" data-datechips>
        <button type="button" class="tc-pill" data-dc="today">Today</button>
        <button type="button" class="tc-pill" data-dc="tomorrow">Tomorrow</button>
        <button type="button" class="tc-pill" data-dc="weekend">This weekend</button>
      </div>
      <div class="tc-dtrow">
        <label class="tc-dt"><span>Date</span><input type="date" data-date></label>
        <label class="tc-dt"><span>Start time</span><input type="time" data-time></label>
      </div>
      <div class="tc-tz">Times are shown in your local timezone${tz ? ': <b>' + tz + '</b>' : ''}.</div>
    </div>
    <div class="tc-hint">${isRace
      ? 'The lobby opens right away — people can join and warm up. The official race begins at the selected time.'
      : 'The practice room opens right away — official results begin at the selected time.'}</div>
  `;
  container.appendChild(wrap);

  const q = sel => wrap.querySelector(sel);
  const dateIn = q('[data-date]');
  const timeIn = q('[data-time]');

  const emit = () => { if(o.onChange) o.onChange(); };

  function localDateStr(d){ return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
  function localTimeStr(d){ return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

  // Defaults: today + roughly an hour from now, rounded up to :00/:30.
  function defaultSchedule(){
    const t = new Date(Date.now() + 60 * 60000);
    t.setSeconds(0, 0);
    t.setMinutes(t.getMinutes() <= 30 ? 30 : 60);
    return t;
  }
  const init = o.initial || defaultSchedule();
  dateIn.value = localDateStr(init);
  timeIn.value = localTimeStr(init);

  function weekendDate(){
    const d = new Date();
    const dow = d.getDay();                        // 0=Sun … 6=Sat
    if(dow !== 6 && dow !== 0) d.setDate(d.getDate() + (6 - dow));  // next Saturday
    return d;                                      // Sat/Sun: the weekend is today
  }

  function paint(){
    wrap.querySelectorAll('[data-tab]').forEach(b => {
      const on = b.dataset.tab === kind;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    q('[data-pane="soon"]').hidden = kind !== 'soon';
    q('[data-pane="schedule"]').hidden = kind !== 'schedule';
    wrap.querySelectorAll('[data-soon]').forEach(b => {
      const on = kind === 'soon' && Number(b.dataset.soon) === soonMin;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const today = localDateStr(new Date());
    const tom = new Date(); tom.setDate(tom.getDate() + 1);
    const chipVal = { today, tomorrow: localDateStr(tom), weekend: localDateStr(weekendDate()) };
    wrap.querySelectorAll('[data-dc]').forEach(b => {
      b.classList.toggle('on', kind === 'schedule' && dateIn.value === chipVal[b.dataset.dc]);
    });
  }

  wrap.querySelectorAll('[data-tab]').forEach(b =>
    b.addEventListener('click', () => { kind = b.dataset.tab; paint(); emit(); }));
  wrap.querySelectorAll('[data-soon]').forEach(b =>
    b.addEventListener('click', () => { soonMin = Number(b.dataset.soon); paint(); emit(); }));
  wrap.querySelectorAll('[data-dc]').forEach(b =>
    b.addEventListener('click', () => {
      const d = b.dataset.dc === 'today' ? new Date()
        : b.dataset.dc === 'tomorrow' ? (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t; })()
        : weekendDate();
      dateIn.value = localDateStr(d);
      paint(); emit();
    }));
  dateIn.addEventListener('change', () => { paint(); emit(); });
  timeIn.addEventListener('change', () => { paint(); emit(); });

  paint();

  return {
    // { kind:'soon'|'schedule', soonMin, date:Date|null } — date computed now.
    get(){
      if(kind === 'soon'){
        const t = Math.ceil((Date.now() + soonMin * 60000) / 60000) * 60000;  // round up to a whole minute
        return { kind, soonMin, date: new Date(t) };
      }
      if(!dateIn.value || !timeIn.value) return { kind, soonMin, date: null };
      const d = new Date(`${dateIn.value}T${timeIn.value}`);
      return { kind, soonMin, date: isNaN(d.getTime()) ? null : d };
    },
  };
}

/* ---------------------------------------------------------------------------
   summaryBar(container, mode) — compact human-readable confirmation panel.
   update({ start:{kind,soonMin,date}, durationLabel }) re-renders it.
--------------------------------------------------------------------------- */
export function summaryBar(container, mode){
  injectStyles();
  const isRace = mode === 'race';
  const el = document.createElement('div');
  el.className = 'tc-summary';
  el.hidden = true;
  container.appendChild(el);
  return {
    update(info){
      const start = info && info.start;
      if(!start || !start.date){ el.hidden = true; return; }
      el.hidden = false;
      const noun = isRace ? 'Race' : 'Session';
      const t = start.kind === 'soon'
        ? `${noun} starts in ${start.soonMin} minutes`
        : `${noun} starts ${fmtStartLabel(start.date)}`;
      const open = isRace ? 'Lobby opens right away' : 'Practice room opens right away';
      el.innerHTML = `<div class="tc-sum-t">${t}</div>
        <div class="tc-sum-s">${info.durationLabel} official ${isRace ? 'race' : 'measurement'} · ${open}</div>`;
    },
  };
}
