import { supabase } from './db.js';
import * as auth from './auth.js';
import { durationPicker, startPicker, summaryBar, MAX_EVENT_MINUTES } from './time-controls.js';
import { buildPromoBlobs } from './event-promo.js';

// Fire-and-forget after a successful create: the maker gets the ANNOUNCEMENT PACK
// (both promo images + a share caption with the event name/date/link) straight in
// their inbox — inbox-first, they post from their phone. SPA hash-navigation does
// not kill this async task. Silent on any failure (the event itself is created).
async function sendAnnouncementPack(session, kind, a){
  try{
    if(!a || !a.user || !a.approvedMaker) return;
    const { feed, story } = await buildPromoBlobs(session, session.id, kind);
    if(!feed || !story) return;
    const up = async (blob, suffix) => {
      const path = `${a.user.id}/promo-${session.id}-${suffix}.png`;
      const { error } = await supabase.storage.from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/png' });
      if(error) throw error;
      return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    };
    const [feedUrl, storyUrl] = await Promise.all([up(feed, 'feed'), up(story, 'story')]);
    await supabase.functions.invoke('send-event-email', { body: { sessionId: session.id, feedUrl, storyUrl } });
  }catch(e){ console.warn('[announcement pack]', e && e.message ? e.message : e); }
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img class="sess-avatar" src="${esc(url)}" alt="">`;
  return `<span class="sess-avatar sess-avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

function snStyles(){
  if(document.getElementById('snAccessStyles')) return;
  const s = document.createElement('style');
  s.id = 'snAccessStyles';
  s.textContent = `
  .sn-access-label{display:block;margin-bottom:8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#67737c}
  .sn-access{display:flex;flex-direction:column;gap:8px}
  .sn-acc{display:flex;align-items:flex-start;gap:10px;background:#f7f8f8;border:1px solid #dfe3e6;border-radius:12px;
    padding:11px 13px;cursor:pointer;transition:border-color .15s,background .15s}
  .sn-acc:hover{border-color:#c9cfd4}
  .sn-acc input{margin-top:3px;flex-shrink:0;width:auto}
  .sn-acc:has(input:checked){border-color:#5230da;background:#fff;box-shadow:0 0 0 3px rgba(82,48,218,.08)}
  .sn-acc-main{display:flex;flex-direction:column;flex:1;min-width:0}
  .sn-acc-title{font-weight:700;color:#011624;font-size:14px;text-transform:none;letter-spacing:normal}
  .sn-acc-sub{color:#67737c;font-size:12.5px;line-height:1.4;margin-top:2px;text-transform:none;letter-spacing:normal}
  `;
  document.head.appendChild(s);
}

// mode = 'session' (default) | 'race'. A race is a `sessions` row with
// event_type='race' — it reuses this whole create form; only the copy, the
// stored event_type and the post-create destination differ.
export function mount(el, mode = 'session'){
  const isRace = mode === 'race';
  const cfg = isRace ? {
    back: '#/my-races', backLabel: '← Races',
    title: 'Create a race', sub: 'Schedule a live race — everyone measures at the same time and races to the finish.',
    namePh: 'e.g. Friday Night Race',
    verTitle: 'Verified race', verSub: 'Only legitimate measurements count toward the race — irregular spinning is excluded from the standings.',
    anyoneSub: 'Anyone can find and enter this race.',
    howto: '<b>How a race works:</b> before the start time the room is open as a warm-up lobby — people can join, connect their wheel and spin to practise. The official race and the standings begin at the scheduled time.',
    submit: 'Create race', creating: 'Creating…', created: 'Race created.',
    loginMsg: 'Log in to create a race.', noun: 'race', dest: '#/my-races',
  } : {
    back: '#/sessions', backLabel: '← Sessions',
    title: 'Create a group session', sub: 'Schedule a moment to measure together.',
    namePh: 'e.g. Sunday Morning Meditation',
    verTitle: 'Verified session', verSub: 'Only legitimate measurements count toward the group results — irregular spinning is excluded from the leaderboard.',
    anyoneSub: 'Anyone can enter from the Sessions list.',
    howto: '<b>How the room works:</b> before the scheduled time the room is already open as a practice space — people can join, connect their wheel and spin together. Official results are recorded only during the session window.',
    submit: 'Create session', creating: 'Creating…', created: 'Session created.',
    loginMsg: 'Log in to create a session.', noun: 'session', dest: '#/sessions',
  };

  snStyles();
  el.innerHTML = `
    <div class="view-head">
      <p class="room-hint" style="text-align:left;margin:0 0 6px"><a href="${cfg.back}" class="link">${cfg.backLabel}</a></p>
      <h1 class="page-title">${cfg.title}</h1>
      <p class="page-sub">${cfg.sub}</p>
    </div>
    <div class="panel">
      <form id="createForm">
        <div class="form-grid">
          <div class="field full">
            <label for="fName">${isRace ? 'Race' : 'Session'} name</label>
            <input type="text" id="fName" placeholder="${cfg.namePh}" required maxlength="80">
          </div>
          <div class="field full">
            <label>When should it start?</label>
            <div id="tcWhen"></div>
          </div>
          <div class="field full">
            <label>Duration</label>
            <div id="tcDur"></div>
          </div>
          <div class="field full">
            <label class="sn-access-label">Who can join?</label>
            <div class="sn-access">
              <label class="sn-acc">
                <input type="radio" name="snAccess" value="public" checked>
                <span class="sn-acc-main"><span class="sn-acc-title">Anyone</span>
                <span class="sn-acc-sub">${cfg.anyoneSub}</span></span>
              </label>
              <label class="sn-acc">
                <input type="radio" name="snAccess" value="invite">
                <span class="sn-acc-main"><span class="sn-acc-title">Invite link</span>
                <span class="sn-acc-sub">Anyone can see this ${cfg.noun}, but only people with the invite link can enter.</span></span>
              </label>
              <label class="sn-acc">
                <input type="radio" name="snAccess" value="followers">
                <span class="sn-acc-main"><span class="sn-acc-title">Followers only</span>
                <span class="sn-acc-sub">Only people connected to you can enter. Others will be asked to connect first.</span></span>
              </label>
            </div>
          </div>
          <div class="field full">
            <label class="sn-option">
              <input type="checkbox" id="fVerified">
              <span class="sn-option-main">
                <span class="sn-option-title">${cfg.verTitle}</span>
                <span class="sn-option-sub">${cfg.verSub}</span>
              </span>
            </label>
          </div>
        </div>
        <div class="sn-howto">${cfg.howto}</div>
        <div id="tcSummary"></div>
        <div class="organizer-note" id="organizerNote"></div>
        <div class="form-actions">
          <button type="submit" id="btnCreate">${cfg.submit}</button>
          <span class="form-msg" id="formMsg"></span>
        </div>
      </form>
    </div>
  `;

  const $ = id => el.querySelector('#' + id);

  // Shared time controls — races default to a quick 1-minute heat "in 5 min",
  // sessions to a 5-minute practice "in 15 min". Everything is capped at 10 min.
  const durOptions = isRace
    ? [{ label: '1 min', value: 1 }, { label: '2 min', value: 2 }, { label: '3 min', value: 3 }, { label: '5 min', value: 5 }, { label: '10 min', value: 10 }]
    : [{ label: '1 min', value: 1 }, { label: '2 min', value: 2 }, { label: '5 min', value: 5 }, { label: '10 min', value: 10 }];
  const when = startPicker($('tcWhen'), { mode: isRace ? 'race' : 'session', onChange: refreshSummary });
  const dur = durationPicker($('tcDur'), {
    options: durOptions,
    value: isRace ? 1 : 5,
    custom: { min: 1, max: MAX_EVENT_MINUTES, step: 1, format: v => v + ' min' },
    onChange: refreshSummary,
  });
  const sum = summaryBar($('tcSummary'), isRace ? 'race' : 'session');
  function refreshSummary(){
    sum.update({ start: when.get(), durationLabel: dur.get() + '-minute' });
  }
  refreshSummary();

  const unsubAuth = auth.subscribeAuth(a => {
    const note = $('organizerNote');
    const btn = $('btnCreate');
    if(!note || !btn) return;
    if(a.user){
      note.innerHTML = `<span class="organizer-label">Organized by</span> ${avatarHtml(a.avatarUrl, a.displayName)} <b>${esc(a.displayName)}</b>`;
      btn.disabled = false;
    } else {
      note.innerHTML = `<a class="link" href="#/login">Log in</a> to create a ${cfg.noun}.`;
      btn.disabled = true;
    }
  });

  function setFormMsg(text, state){
    const m = $('formMsg');
    m.className = 'form-msg ' + (state || '');
    m.textContent = text;
  }

  $('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = auth.getState();
    if(!a.user){ setFormMsg(cfg.loginMsg, 'err'); return; }
    const name = $('fName').value.trim();
    if(!name){
      setFormMsg(`Please name your ${cfg.noun}.`, 'err');
      return;
    }
    const start = when.get().date;
    if(!start){
      setFormMsg('Please choose a start date and time.', 'err');
      return;
    }
    // Small grace so "In 5 min" can never lose a race against the clock;
    // scheduled picks in the past are rejected.
    if(start.getTime() < Date.now() - 15000){
      setFormMsg('Start time must be in the future.', 'err');
      return;
    }
    const duration = dur.get();
    if(!Number.isInteger(duration) || duration < 1 || duration > MAX_EVENT_MINUTES){
      setFormMsg('Measurements can be up to 10 minutes long.', 'err');
      return;
    }

    const accessMode = (el.querySelector('input[name="snAccess"]:checked') || {}).value || 'public';
    const row = {
      name,
      scheduled_start: start.toISOString(),
      duration_minutes: duration,
      status: 'scheduled',
      created_by: a.displayName,
      created_by_user_id: a.user.id,
      verified_only: $('fVerified').checked,
      access_mode: accessMode,
      event_type: isRace ? 'race' : 'session',
    };
    // Invite sessions/races get an unguessable token; the shareable link is /#/join/<token>.
    if(accessMode === 'invite'){
      row.invite_token = (self.crypto && crypto.randomUUID)
        ? crypto.randomUUID().replace(/-/g, '')
        : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
    }

    $('btnCreate').disabled = true;
    setFormMsg(cfg.creating, '');
    const { data, error } = await supabase.from('sessions').insert(row).select('id').single();

    if(error){
      $('btnCreate').disabled = false;
      setFormMsg('Error: ' + error.message, 'err');
      return;
    }
    setFormMsg(cfg.created, 'ok');
    // Maker → announcement pack lands in their inbox (async, non-blocking).
    sendAnnouncementPack({ ...row, id: data.id }, isRace ? 'race' : 'session', a);
    // Send the user to the management page so they immediately see what they created.
    setTimeout(() => { location.hash = cfg.dest; }, 400);
  });

  return () => { unsubAuth(); };
}
