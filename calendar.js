// calendar.js — "Add to calendar" helper for upcoming group sessions.
// Dependency-free: Google Calendar via a render URL, Apple / Outlook via a
// downloadable .ics file. For the .ics path nothing leaves the browser.

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// UTC timestamp in calendar format: YYYYMMDDTHHMMSSZ.
function stampUTC(d){
  const p = n => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate())
       + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
}

// Normalise a session row into a calendar event. `_hostName` is optional.
export function sessionEvent(session){
  const start = new Date(session.scheduled_start);
  const end = new Date(start.getTime() + (session.duration_minutes || 0) * 60000);
  const title = (session.name || 'Group Session') + ' — Egely Wheel Race';
  const url = location.origin + location.pathname + '#/room/' + session.id;
  const host = session._hostName ? `Hosted by ${session._hostName}. ` : '';
  const details = `${host}Join the live group measurement in Egely Wheel Race.\n\n${url}`;
  return { title, start, end, url, details };
}

export function googleCalendarUrl(ev){
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: stampUTC(ev.start) + '/' + stampUTC(ev.end),
    details: ev.details,
    location: ev.url,
  });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

// RFC 5545 .ics text. Imports into Apple Calendar, Outlook, and most others.
export function icsText(ev){
  const e = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const uid = (ev.url.replace(/[^a-zA-Z0-9]/g, '') || 'ewr') + '@egely-wheel-race';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Egely Wheel Race//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTAMP:' + stampUTC(new Date()),
    'DTSTART:' + stampUTC(ev.start),
    'DTEND:' + stampUTC(ev.end),
    'SUMMARY:' + e(ev.title),
    'DESCRIPTION:' + e(ev.details),
    'URL:' + ev.url,
    'LOCATION:' + e(ev.url),
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(ev.title), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(ev){
  const blob = new Blob([icsText(ev)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (ev.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'session') + '.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Self-contained "Add to calendar" control (button + popover). Returns the root
// element; the caller appends it. Manages its own open/close + outside-click.
export function createAddToCalendar(session){
  const ev = sessionEvent(session);
  const root = document.createElement('div');
  root.className = 'cal-add';
  root.innerHTML = `
    <button type="button" class="cal-btn" aria-haspopup="true" aria-expanded="false" title="Add to calendar">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
      <span>Remind me</span>
    </button>
    <div class="cal-menu" hidden>
      <a class="cal-opt" data-cal="google" href="${esc(googleCalendarUrl(ev))}" target="_blank" rel="noopener noreferrer">Google Calendar</a>
      <button type="button" class="cal-opt" data-cal="ics">Apple / Outlook (.ics)</button>
    </div>`;
  const btn = root.querySelector('.cal-btn');
  const menu = root.querySelector('.cal-menu');
  const close = () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDoc);
  };
  const onDoc = (e) => { if(!root.contains(e.target)) close(); };
  btn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if(menu.hidden){
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      setTimeout(() => document.addEventListener('click', onDoc), 0);
    } else close();
  });
  menu.querySelector('[data-cal="ics"]').addEventListener('click', (e) => { e.preventDefault(); downloadIcs(ev); close(); });
  menu.querySelector('[data-cal="google"]').addEventListener('click', () => close());
  return root;
}
