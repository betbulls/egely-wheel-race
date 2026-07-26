// rsvp.js — "I'll be there" RSVP for upcoming sessions & races.
//
// One row per (event, user) in public.event_rsvps (RLS: read for everyone,
// insert/delete own row, insert only while the event is still upcoming).
// Three surfaces share this module:
//   • detail pages (session room / race lobby) → mountRsvpDock: a prominent
//     toggle pill in the header actions + a live "N going" strip with the
//     first few attendee avatars;
//   • list cards (Sessions / Races)            → createRsvpButton (compact)
//     + fetchRsvpMap for batch counts.
// Logged-out visitors see the button too — clicking stashes the return hash
// (same `ewr_pending_room` mechanism as the followers gate) and goes to login.

import { supabase } from './db.js';
import * as auth from './auth.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const STAR_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.36L12 17.37l-5.7 3l1.09-6.36-4.62-4.5 6.38-.93z"/></svg>';

const detailHashOf = s => (s.event_type === 'race' ? '#/race/' : '#/room/') + s.id;
const startMsOf = s => new Date(s.scheduled_start).getTime();

// ---- Data ------------------------------------------------------------------

// Batch counts + my-state for a list page. Returns Map(sessionId -> {count, mine}),
// or NULL when the table is unreachable (e.g. SQL not deployed yet) so callers
// can hide the whole RSVP layer instead of showing dead buttons.
// (Single query; fine at this scale — PostgREST caps at 1000 rows, which is
// far above the realistic RSVP volume across one page of upcoming events.)
export async function fetchRsvpMap(sessionIds){
  const map = new Map();
  const ids = (sessionIds || []).filter(id => id != null);
  if(!ids.length) return map;
  const me = auth.getState().user?.id || null;
  const { data, error } = await supabase.from('event_rsvps')
    .select('session_id, user_id').in('session_id', ids);
  if(error) return null;           // degrade silently (table not deployed yet)
  for(const r of (data || [])){
    let e = map.get(r.session_id);
    if(!e){ e = { count: 0, mine: false }; map.set(r.session_id, e); }
    e.count++;
    if(me && r.user_id === me) e.mine = true;
  }
  return map;
}

// Toggle my RSVP. Resolves { ok, login } — login=true means "not signed in".
export async function setRsvp(sessionId, going){
  const me = auth.getState().user?.id || null;
  if(!me) return { ok: false, login: true };
  if(going){
    const { error } = await supabase.from('event_rsvps').insert({ session_id: sessionId, user_id: me });
    // 23505 = already going (double-click / second tab) — treat as success.
    return { ok: !error || error.code === '23505' };
  }
  const { error } = await supabase.from('event_rsvps').delete()
    .eq('session_id', sessionId).eq('user_id', me);
  return { ok: !error };
}

// ---- Button ----------------------------------------------------------------

// Self-contained toggle pill. opts: { compact, going, loginHash, onToggled }.
// The caller re-creates it on re-render with the current `going` state.
export function createRsvpButton(session, opts = {}){
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rsvp-btn' + (opts.compact ? ' sm' : '');
  let going = !!opts.going;
  let busy = false;

  const paint = () => {
    btn.classList.toggle('on', going);
    btn.innerHTML = going
      ? `<span class="rsvp-face rsvp-face-on">✓ You're going</span><span class="rsvp-face rsvp-face-cancel">✕ Cancel RSVP</span>`
      : `<span class="rsvp-face">${STAR_SVG}<span>I'll be there</span></span>`;
    btn.title = going ? 'Tap to cancel your RSVP' : "Let the host know you'll be there";
  };
  paint();

  btn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    if(busy) return;
    const me = auth.getState().user?.id || null;
    if(!me){
      // Same stash-and-login mechanism as the followers entry gate.
      try { localStorage.setItem('ewr_pending_room', opts.loginHash || detailHashOf(session)); } catch {}
      location.hash = '#/login';
      return;
    }
    // No `disabled` while busy — disabling the focused element drops keyboard
    // focus to <body>; the busy flag already blocks re-entrant clicks.
    busy = true; btn.setAttribute('aria-busy', 'true');
    const want = !going;
    const res = await setRsvp(session.id, want);
    busy = false; btn.removeAttribute('aria-busy');
    if(res.ok){
      going = want;
      paint();
      if(opts.onToggled) opts.onToggled(going);
    } else {
      // Most likely the event just started (RLS blocks late RSVPs) — repaint as-is.
      paint();
    }
  });

  return {
    el: btn,
    setGoing(v){ going = !!v; paint(); },
    get going(){ return going; },
  };
}

// ---- Detail-page dock ------------------------------------------------------

// Mounts the RSVP experience on a session-room / race-lobby header:
//   • toggle pill prepended into opts.actionsEl (hidden for the host);
//   • "N going" + avatar strip rendered into `el`, kept live via one filtered
//     postgres_changes channel (cheap: no presence, one channel per open page).
// Returns { refresh, destroy }.
export function mountRsvpDock(el, session, opts = {}){
  const sessionId = session.id;
  const hostId = session.created_by_user_id || null;
  const startMs = startMsOf(session);
  let destroyed = false;
  let dead = false;   // table unreachable → the whole dock (button included) stands down
  let btn = null;
  let channel = null, unsubA = null, queueTimer = null;
  let lastUid;   // undefined = subscribeAuth hasn't fired yet
  let gen = 0;   // refresh sequencing — a stale (earlier) response must never win

  el.hidden = false;
  el.classList.add('rsvp-dock');
  el.innerHTML = '<span class="rsvp-empty">Loading…</span>';

  const isPre = () => Date.now() < startMs;

  function ensureButton(){
    const me = auth.getState().user?.id || null;
    const eligible = !dead && isPre() && !(me && hostId && me === hostId) && opts.actionsEl;
    if(eligible && !btn){
      btn = createRsvpButton(session, {
        loginHash: location.hash || detailHashOf(session),
        onToggled: () => refresh(),
      });
      opts.actionsEl.insertBefore(btn.el, opts.actionsEl.firstChild);
    } else if(!eligible && btn){
      btn.el.remove(); btn = null;
    }
  }

  async function refresh(){
    if(destroyed) return;
    const g = ++gen;
    const me = auth.getState().user?.id || null;
    const { data, error } = await supabase.from('event_rsvps')
      .select('user_id, created_at').eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if(destroyed || g !== gen) return;   // a newer refresh superseded this one
    if(error || !data){
      // table missing → the whole dock stands down (dead buttons help nobody)
      dead = true; el.hidden = true;
      if(btn){ btn.el.remove(); btn = null; }
      return;
    }
    const rows = data;
    const count = rows.length;
    const mine = !!me && rows.some(r => r.user_id === me);
    if(btn) btn.setGoing(mine);

    // First few faces (earliest RSVPs first) — light social proof.
    let avatarsHtml = '';
    const faceIds = rows.slice(0, 5).map(r => r.user_id);
    if(faceIds.length){
      const { data: profs } = await supabase.from('profiles')
        .select('id, display_name, avatar_url').in('id', faceIds);
      if(destroyed || g !== gen) return;
      const byId = new Map((profs || []).map(p => [p.id, p]));
      avatarsHtml = faceIds.map(id => {
        const p = byId.get(id);
        const name = (p && p.display_name) || '';
        if(p && p.avatar_url) return `<img class="rsvp-av" src="${esc(p.avatar_url)}" alt="" title="${esc(name)}">`;
        return `<span class="rsvp-av rsvp-av-init" title="${esc(name)}">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
      }).join('');
    }
    const more = count - faceIds.length;

    if(count > 0){
      el.innerHTML = `
        <span class="rsvp-going">${STAR_SVG}<span><b class="rsvp-n">${count}</b> going</span></span>
        <span class="rsvp-avs">${avatarsHtml}</span>
        ${more > 0 ? `<span class="rsvp-more">+${more} more</span>` : ''}`;
    } else if(isPre()){
      const meIsHost = !!(me && hostId && me === hostId);
      el.innerHTML = `<span class="rsvp-empty">${meIsHost
        ? 'No RSVPs yet — share your event so people can say they\'ll be there.'
        : 'Be the first to say you\'ll be there.'}</span>`;
    } else {
      el.hidden = true;
    }
    ensureButton();
  }

  const queueRefresh = () => {
    if(destroyed) return;
    clearTimeout(queueTimer);
    queueTimer = setTimeout(refresh, 350);
  };

  // Live counter: one channel filtered to this event's rows. Supabase can't
  // apply the filter to DELETE events server-side, so those fan out for the
  // whole table — the handler drops non-matching ones client-side (the PK
  // covers session_id, so DELETE payloads carry it under default replica
  // identity; when it's absent we refetch to stay safe).
  channel = supabase.channel('rsvp-' + sessionId)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'event_rsvps', filter: 'session_id=eq.' + sessionId },
      payload => {
        if(payload && payload.eventType === 'DELETE' && payload.old && payload.old.session_id != null
          && String(payload.old.session_id) !== String(sessionId)) return;
        queueRefresh();
      })
    .subscribe();

  // Auth settles async after a hard refresh → re-evaluate mine/host state then.
  unsubA = auth.subscribeAuth(a => {
    const uid = a.user?.id || null;
    if(uid === lastUid) return;
    lastUid = uid;
    ensureButton();
    refresh();
  });

  return {
    refresh,
    destroy(){
      destroyed = true;
      clearTimeout(queueTimer);
      if(unsubA) unsubA();
      if(channel) supabase.removeChannel(channel);
      if(btn){ btn.el.remove(); btn = null; }
      el.innerHTML = '';
      el.hidden = true;
    },
  };
}
