import { supabase } from './db.js';
import * as auth from './auth.js';
import { vitalityLevel, vitalityColor as vColor } from './analytics.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function hostChipHtml(host){
  if(!host) return '';
  const url = host.avatar_url;
  const name = host.display_name || 'Host';
  const av = url
    ? `<img class="sess-avatar" src="${esc(url)}" alt="">`
    : `<span class="sess-avatar sess-avatar-initial">${esc(name.charAt(0).toUpperCase())}</span>`;
  return ` · hosted by <span class="me-host">${av}<span class="me-host-name">${esc(name)}</span></span>`;
}

export function mount(el){
  const userId = auth.getState().user?.id || null;

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">My Measurements</h1>
      <p class="page-sub">Your stored measurements — solo and group sessions.</p>
    </div>
    <div id="meList"><div class="empty">Loading…</div></div>
  `;

  const list = el.querySelector('#meList');

  if(!userId){
    list.innerHTML = `
      <div class="panel">
        <p class="placeholder">Log in to see your measurements.</p>
        <div class="form-actions"><a class="btn-join" href="#/login">Log in</a></div>
      </div>`;
    return () => {};
  }

  (async () => {
    const [resR, sessR] = await Promise.all([
      supabase.from('results').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('sessions').select('id, name, created_by, created_by_user_id'),
    ]);
    const sessMap = new Map((sessR.data || []).map(s => [s.id, s]));
    const rows = resR.data || [];

    if(rows.length === 0){
      list.innerHTML = '<div class="panel"><p class="placeholder">No measurements yet. Try a Solo measurement or join a session.</p></div>';
      return;
    }

    // Profiles for the session hosts (avatar + display_name)
    const hostIds = [...new Set((sessR.data || []).map(s => s.created_by_user_id).filter(Boolean))];
    const hostsById = new Map();
    if(hostIds.length){
      const { data: profs } = await supabase.from('profiles')
        .select('id, display_name, avatar_url').in('id', hostIds);
      for(const p of (profs || [])) hostsById.set(p.id, p);
    }
    const hostFor = sess => {
      if(!sess) return null;
      const p = sess.created_by_user_id ? hostsById.get(sess.created_by_user_id) : null;
      return { display_name: (p && p.display_name) || sess.created_by, avatar_url: p && p.avatar_url };
    };

    list.innerHTML = rows.map(r => {
      const solo = r.session_id == null;
      const lvl = vitalityLevel(r.avg || 0);
      const when = new Date(r.created_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const sess = solo ? null : sessMap.get(r.session_id);
      const title = solo ? (r.label || 'Solo measurement') : ((sess && sess.name) || 'Session');
      const host = solo ? null : hostFor(sess);
      return `
        <a class="me-card" href="#/m/${r.id}">
          <div class="me-main">
            <div class="me-title-row">
              <span class="me-kind ${solo ? 'solo' : 'session'}">${solo ? 'Solo' : 'Session'}</span>
              <span class="me-title">${esc(title)}</span>
              ${r.verified ? '<span class="v-badge verified">✓</span>' : '<span class="v-badge unverified">unverified</span>'}
            </div>
            <div class="me-meta">${when} · <span style="color:${lvl.color}">${esc(lvl.name)}</span>${hostChipHtml(host)}</div>
          </div>
          <div class="me-stats">
            <div class="rs"><div class="rs-val" style="color:${vColor(r.avg)}">${(r.avg || 0).toFixed(1)}</div><div class="rs-lbl">Avg</div></div>
            <div class="rs"><div class="rs-val" style="color:${vColor(r.peak)}">${r.peak}</div><div class="rs-lbl">Peak</div></div>
            <div class="rs"><div class="rs-val">${r.steadiness}</div><div class="rs-lbl">Steady</div></div>
          </div>
        </a>`;
    }).join('');
  })();

  return () => {};
}
