import { supabase } from './db.js';
import { vitalityLevel, vitalityColor as vColor, trendLabel } from './analytics.js';
import { drawVitalityChart } from './chart.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// Read-only detail of a single stored measurement.
export function mount(el, id){
  el.innerHTML = `
    <div class="view-head">
      <p class="room-hint" style="text-align:left;margin:0 0 6px"><a href="#/me" class="link">← My measurements</a></p>
      <h1 class="page-title" id="dTitle">Loading…</h1>
    </div>
    <div id="dBody"><div class="empty">Loading…</div></div>
  `;

  let onResize = null;

  (async () => {
    const { data: r, error } = await supabase.from('results').select('*').eq('id', Number(id)).single();
    if(error || !r){ el.querySelector('#dBody').innerHTML = '<div class="empty">Measurement not found.</div>'; return; }

    const solo = r.session_id == null;
    let title = 'Solo measurement';
    if(solo){ title = r.label || 'Solo measurement'; }
    else {
      const { data: sess } = await supabase.from('sessions').select('name').eq('id', r.session_id).single();
      title = (sess && sess.name) || 'Session';
    }
    el.querySelector('#dTitle').textContent = title;

    const lvl = vitalityLevel(r.avg || 0);
    const when = new Date(r.created_at).toLocaleString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const dur = r.duration_seconds
      ? (r.duration_seconds >= 60 ? Math.round(r.duration_seconds / 60) + ' min' : r.duration_seconds + ' s')
      : '—';

    el.querySelector('#dBody').innerHTML = `
      <div class="panel">
        <div class="me-title-row" style="margin-bottom:10px">
          <span class="me-kind ${solo ? 'solo' : 'session'}">${solo ? 'Solo' : 'Session'}</span>
          ${r.verified ? '<span class="v-badge verified">✓ Verified</span>' : '<span class="v-badge unverified">unverified</span>'}
        </div>
        <div class="d-meta">${esc(when)} · ${esc(dur)}</div>

        <div class="eval-level" style="color:${lvl.color};margin-top:16px">${esc(lvl.name)}</div>
        <div class="eval-meaning">${esc(lvl.meaning)}</div>

        ${Array.isArray(r.curve) && r.curve.length > 1
          ? '<div class="solo-chart-wrap" style="margin-top:16px"><canvas id="dChart"></canvas></div>'
          : '<p class="d-meta" style="margin-top:16px">No curve stored for this measurement.</p>'}

        <div class="res-stats" style="justify-content:flex-start;margin-top:18px;gap:22px">
          <div class="rs"><div class="rs-val" style="color:${vColor(r.avg)}">${(r.avg || 0).toFixed(1)}</div><div class="rs-lbl">Avg</div></div>
          <div class="rs"><div class="rs-val" style="color:${vColor(r.peak)}">${r.peak}</div><div class="rs-lbl">Peak</div></div>
          <div class="rs"><div class="rs-val">${r.steadiness}</div><div class="rs-lbl">Steady</div></div>
          <div class="rs"><div class="rs-val rs-trend">${esc(trendLabel(r.trend || 0))}</div><div class="rs-lbl">Trend</div></div>
        </div>

        <div class="zonebar" style="margin-top:16px">
          <span class="z-red" style="width:${r.zone_red || 0}%"></span>
          <span class="z-yellow" style="width:${r.zone_yellow || 0}%"></span>
          <span class="z-green" style="width:${r.zone_green || 0}%"></span>
        </div>

        ${r.comment ? `<div class="d-comment"><div class="d-comment-lbl">Comment</div><p>${esc(r.comment)}</p></div>` : ''}
      </div>
    `;

    if(Array.isArray(r.curve) && r.curve.length > 1){
      onResize = () => drawVitalityChart(el.querySelector('#dChart'), r.curve, r.duration_seconds);
      onResize();
      window.addEventListener('resize', onResize);
    }
  })();

  return () => { if(onResize) window.removeEventListener('resize', onResize); };
}
