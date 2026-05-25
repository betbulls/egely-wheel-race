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
    const [mineRes, verifiedRes, verifiedSessRes] = await Promise.all([
      myId ? supabase.from('results').select('*').eq('racer_id', myId)
            : Promise.resolve({ data: [] }),
      supabase.from('results').select('*').eq('verified', true),
      supabase.from('sessions').select('id,name,created_by,verified_only').eq('verified_only', true),
    ]);

    const mine = mineRes.data || [];
    const verified = verifiedRes.data || [];

    // Top racers: verified SESSION measurements ranked by average (solo is personal, excluded from global).
    const topRacers = verified.filter(r => r.session_id != null)
      .sort((a, b) => (b.avg || 0) - (a.avg || 0)).slice(0, 10);

    // Top sessions: average the verified results per verified session (no group_avg dependency).
    const bySession = new Map();
    for(const r of verified){
      if(r.session_id == null) continue;
      if(!bySession.has(r.session_id)) bySession.set(r.session_id, []);
      bySession.get(r.session_id).push(r.avg || 0);
    }
    const topSessions = (verifiedSessRes.data || [])
      .map(s => {
        const a = bySession.get(s.id) || [];
        return { ...s, avg: a.length ? a.reduce((x, y) => x + y, 0) / a.length : null, count: a.length };
      })
      .filter(s => s.count > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);

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
      <div class="top-name">${esc(s.name || 'Session')}<span class="top-sub">by ${esc(s.created_by || '—')} · ${s.count} racer${s.count > 1 ? 's' : ''}</span></div>
      <div class="top-val" style="color:${vColor(s.avg)}">${s.avg.toFixed(1)}</div>
    </div>`).join('');
  return `<div class="panel top-table">
    <div class="top-row top-head"><div class="top-rank">#</div><div class="top-name">Session</div><div class="top-val">Avg</div></div>
    ${items}
  </div>`;
}
