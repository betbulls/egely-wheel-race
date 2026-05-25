import { supabase } from './db.js';
import { vitalityLevel, vitalityColor as vColor } from './analytics.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

export function mount(el){
  const myName = (localStorage.getItem('ewr_name') || '').trim();
  const myId = myName ? myName.toLowerCase().replace(/\s+/g, '_') : null;

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">My Measurements</h1>
      <p class="page-sub">Your stored measurements — solo and group sessions.</p>
    </div>
    <div id="meList"><div class="empty">Loading…</div></div>
  `;

  const list = el.querySelector('#meList');

  if(!myId){
    list.innerHTML = '<div class="panel"><p class="placeholder">Enter your name in a Solo or Session measurement first, then your history will appear here.</p></div>';
    return () => {};
  }

  (async () => {
    const [resR, sessR] = await Promise.all([
      supabase.from('results').select('*').eq('racer_id', myId).order('created_at', { ascending: false }),
      supabase.from('sessions').select('id, name'),
    ]);
    const sessMap = new Map((sessR.data || []).map(s => [s.id, s.name]));
    const rows = resR.data || [];

    if(rows.length === 0){
      list.innerHTML = '<div class="panel"><p class="placeholder">No measurements yet. Try a Solo measurement or join a session.</p></div>';
      return;
    }

    list.innerHTML = rows.map(r => {
      const solo = r.session_id == null;
      const lvl = vitalityLevel(r.avg || 0);
      const when = new Date(r.created_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const title = solo ? 'Solo measurement' : (sessMap.get(r.session_id) || 'Session');
      return `
        <div class="me-card">
          <div class="me-main">
            <div class="me-title-row">
              <span class="me-kind ${solo ? 'solo' : 'session'}">${solo ? 'Solo' : 'Session'}</span>
              <span class="me-title">${esc(title)}</span>
              ${r.verified ? '<span class="v-badge verified">✓</span>' : '<span class="v-badge unverified">unverified</span>'}
            </div>
            <div class="me-meta">${when} · <span style="color:${lvl.color}">${esc(lvl.name)}</span></div>
          </div>
          <div class="me-stats">
            <div class="rs"><div class="rs-val" style="color:${vColor(r.avg)}">${(r.avg || 0).toFixed(1)}</div><div class="rs-lbl">Avg</div></div>
            <div class="rs"><div class="rs-val" style="color:${vColor(r.peak)}">${r.peak}</div><div class="rs-lbl">Peak</div></div>
            <div class="rs"><div class="rs-val">${r.steadiness}</div><div class="rs-lbl">Steady</div></div>
          </div>
        </div>`;
    }).join('');
  })();

  return () => {};
}
