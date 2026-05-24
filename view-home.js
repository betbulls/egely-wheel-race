import { supabase } from './db.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
function vColor(led){ if(led <= 5) return '#C0143C'; if(led <= 12) return '#E9D24A'; return '#3CC98A'; }

export function mount(el){
  const myName = (localStorage.getItem('ewr_name') || '').trim();
  const myId = myName ? myName.toLowerCase().replace(/\s+/g, '_') : null;

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Egely Wheel Race</h1>
      <p class="page-sub">Your stats and the community leaderboard.</p>
    </div>
    <div id="homeBody"><div class="empty">Loading…</div></div>
  `;

  (async () => {
    const [mineRes, topRacersRes, topSessRes] = await Promise.all([
      myId ? supabase.from('results').select('*').eq('racer_id', myId)
            : Promise.resolve({ data: [] }),
      supabase.from('results').select('*').eq('verified', true).order('avg', { ascending: false }).limit(10),
      supabase.from('sessions').select('*').eq('verified_only', true).not('group_avg', 'is', null).order('group_avg', { ascending: false }).limit(10),
    ]);

    const mine = mineRes.data || [];
    const topRacers = topRacersRes.data || [];
    const topSessions = topSessRes.data || [];

    renderHome(el.querySelector('#homeBody'), { myName, mine, topRacers, topSessions });
  })();

  return () => {};
}

function renderHome(body, { myName, mine, topRacers, topSessions }){
  body.innerHTML = `
    ${renderPrivate(myName, mine)}
    <h2 class="res-h">Top measurements <span class="res-h-sub">verified only</span></h2>
    ${renderTopRacers(topRacers)}
    <h2 class="res-h">Top sessions <span class="res-h-sub">verified only</span></h2>
    ${renderTopSessions(topSessions)}
  `;
}

function renderPrivate(myName, mine){
  if(!myName){
    return `<div class="panel"><p class="placeholder">Join a session and enter your name to start tracking your personal stats.</p></div>`;
  }
  if(mine.length === 0){
    return `<div class="panel"><h2>Your stats — ${esc(myName)}</h2><p class="placeholder">No finished measurements yet. Your results will appear here.</p></div>`;
  }
  const bestAvg = Math.max(...mine.map(r => r.avg || 0));
  const bestPeak = Math.max(...mine.map(r => r.peak || 0));
  const verifiedCount = mine.filter(r => r.verified).length;
  const verifiedRate = Math.round(verifiedCount / mine.length * 100);
  return `
    <div class="panel">
      <h2>Your stats — ${esc(myName)}</h2>
      <div class="home-stats">
        <div class="hstat"><div class="hstat-val">${mine.length}</div><div class="hstat-lbl">Sessions</div></div>
        <div class="hstat"><div class="hstat-val" style="color:${vColor(bestAvg)}">${bestAvg.toFixed(1)}</div><div class="hstat-lbl">Best avg</div></div>
        <div class="hstat"><div class="hstat-val" style="color:${vColor(bestPeak)}">${bestPeak}</div><div class="hstat-lbl">Best peak</div></div>
        <div class="hstat"><div class="hstat-val">${verifiedRate}%</div><div class="hstat-lbl">Verified</div></div>
      </div>
    </div>`;
}

function renderTopRacers(rows){
  if(rows.length === 0) return `<div class="panel"><p class="placeholder">No verified measurements yet.</p></div>`;
  const items = rows.map((r, i) => `
    <div class="top-row">
      <div class="top-rank">${i + 1}</div>
      <div class="top-name">${esc(r.racer_name || '—')}</div>
      <div class="top-val" style="color:${vColor(r.avg)}">${(r.avg || 0).toFixed(1)}</div>
    </div>`).join('');
  return `<div class="panel top-table">
    <div class="top-row top-head"><div class="top-rank">#</div><div class="top-name">Racer</div><div class="top-val">Avg</div></div>
    ${items}
  </div>`;
}

function renderTopSessions(rows){
  if(rows.length === 0) return `<div class="panel"><p class="placeholder">No verified sessions yet. Create a session with "Verified" enabled.</p></div>`;
  const items = rows.map((s, i) => `
    <div class="top-row">
      <div class="top-rank">${i + 1}</div>
      <div class="top-name">${esc(s.name || 'Session')}<span class="top-sub">by ${esc(s.created_by || '—')} · ${s.racer_count || 0} racers</span></div>
      <div class="top-val" style="color:${vColor(Number(s.group_avg))}">${Number(s.group_avg).toFixed(1)}</div>
    </div>`).join('');
  return `<div class="panel top-table">
    <div class="top-row top-head"><div class="top-rank">#</div><div class="top-name">Session</div><div class="top-val">Avg</div></div>
    ${items}
  </div>`;
}
