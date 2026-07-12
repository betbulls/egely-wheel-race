import { supabase } from './db.js';
import * as auth from './auth.js';
import { vitalityLevel } from './analytics.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// Muted vitality-zone colour for NUMBER TEXT on light surfaces — the vivid
// vColor yellow is unreadable on white. Vivid is used only for the spark marker.
const zText  = v => v < 6 ? '#c2415b' : v < 13 ? '#b8860b' : '#0f8a52';
const zVivid = v => v < 6 ? '#f04438' : v < 13 ? '#f5b700' : '#20b26b';

function hostChipHtml(host){
  if(!host) return '';
  const url = host.avatar_url;
  const name = host.display_name || 'Host';
  const av = url
    ? `<img class="sess-avatar" src="${esc(url)}" alt="">`
    : `<span class="sess-avatar sess-avatar-initial">${esc(name.charAt(0).toUpperCase())}</span>`;
  return ` · hosted by <span class="me-host">${av}<span class="me-host-name">${esc(name)}</span></span>`;
}

// A measurement's kind, from which columns are set.
function kindOf(r){
  if(r.kind) return r.kind;                 // explicit kind (race/session/solo/experiment) wins
  if(r.experiment_id != null) return 'experiment';
  if(r.session_id != null) return 'session';
  return 'solo';
}

// Lightweight inline-SVG sparkline of the stored curve — no canvas, no resize,
// no per-card draw calls. Stroke stays uniform via non-scaling-stroke.
function sparkSvg(curve){
  if(!Array.isArray(curve) || curve.length < 2) return '<span class="me-spark-empty">No curve</span>';
  const W = 120, H = 34, pad = 4, MAX = 24, n = curve.length;
  const pts = curve.map((v, i) => {
    const x = pad + (i / (n - 1)) * (W - 2 * pad);
    const c = Math.max(0, Math.min(MAX, v == null ? 0 : v));
    const y = pad + (1 - c / MAX) * (H - 2 * pad);
    return [x, y];
  });
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return `<svg class="me-spark-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${d}" fill="none" stroke="#5230da" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="${zVivid(curve[n - 1] || 0)}"/>
    </svg>`;
}

// Recording chip: 🎥 for a camera take, 🎙 for voice — the same everywhere.
function recChip(media, kind){
  if(!media) return '';
  return media === 'video'
    ? `<span class="voice-chip mini" title="This ${kind} has a camera recording — open it to watch">🎥 Camera</span>`
    : `<span class="voice-chip mini" title="This ${kind} has a voice recording — open its results to listen">🎙 Voice</span>`;
}

function cardHtml(r, sessMap, hostFor, recMap, soloRecMap){
  const kind = kindOf(r);
  const kindLabel = kind === 'race' ? 'Race' : kind === 'experiment' ? 'Experiment' : kind === 'session' ? 'Session' : 'Solo';
  const lvl = vitalityLevel(r.avg || 0);
  const when = new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const usesSession = kind === 'session' || kind === 'race';
  const sess = usesSession ? sessMap.get(r.session_id) : null;
  const title = usesSession ? ((sess && sess.name) || (kind === 'race' ? 'Race' : 'Session')) : (r.label || (kind === 'experiment' ? 'Experiment' : 'Solo measurement'));
  const host = usesSession ? hostFor(sess) : null;
  return `
      <a class="me-card" href="#/m/${r.id}">
        <div class="me-main">
          <div class="me-title-row">
            <span class="me-kind ${kind}">${kindLabel}</span>
            <span class="me-title">${esc(title)}</span>
            ${r.verified ? '<span class="v-badge verified">✓</span>' : '<span class="v-badge unverified">unverified</span>'}
            ${recChip(usesSession ? (recMap && recMap.get(r.session_id)) : (soloRecMap && soloRecMap.get(r.id)), kind)}
            ${r.published ? '<span class="voice-chip mini" title="Public on the Showcase">🌟 Showcased</span>' : ''}
          </div>
          <div class="me-meta">${when} · <span style="color:${zText(r.avg || 0)}">${esc(lvl.name)}</span>${hostChipHtml(host)}</div>
        </div>
        <div class="me-spark">${sparkSvg(r.curve)}</div>
        <div class="me-stats">
          <div class="rs"><div class="rs-val" style="color:${zText(r.avg || 0)}">${(r.avg || 0).toFixed(1)}</div><div class="rs-lbl">Avg</div></div>
          <div class="rs"><div class="rs-val" style="color:${zText(r.peak || 0)}">${r.peak}</div><div class="rs-lbl">Peak</div></div>
          <div class="rs"><div class="rs-val">${r.steadiness}</div><div class="rs-lbl">Steady</div></div>
        </div>
      </a>`;
}

const FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'solo',       label: 'Solo' },
  { id: 'session',    label: 'Session' },
  { id: 'race',       label: 'Race' },
  { id: 'experiment', label: 'Experiment' },
  { id: 'verified',   label: 'Verified' },
  { id: 'showcased',  label: '🌟 Showcased' },
];

function matches(r, filter){
  if(filter === 'all') return true;
  if(filter === 'verified') return !!r.verified;
  if(filter === 'showcased') return !!r.published;
  return kindOf(r) === filter;
}

function renderSummary(rows){
  const total = rows.length;
  const vRate = total ? Math.round(rows.filter(r => r.verified).length / total * 100) : 0;
  const bestAvg = rows.reduce((m, r) => Math.max(m, r.avg || 0), 0);
  const last = rows[0];   // rows are sorted newest-first
  const lastWhen = last ? new Date(last.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  return `
    <div class="me-summary">
      <div class="me-sum"><div class="me-sum-n">${total}</div><div class="me-sum-l">Measurements</div></div>
      <div class="me-sum"><div class="me-sum-n">${vRate}%</div><div class="me-sum-l">Verified</div></div>
      <div class="me-sum"><div class="me-sum-n" style="color:${zText(bestAvg)}">${bestAvg.toFixed(1)}</div><div class="me-sum-l">Best avg</div></div>
      <div class="me-sum"><div class="me-sum-n">${esc(lastWhen)}</div><div class="me-sum-l">Last</div></div>
    </div>`;
}

function renderFilters(){
  return `<div class="me-filters">${FILTERS.map(f =>
    `<button class="me-filter${f.id === 'all' ? ' active' : ''}" data-filter="${f.id}">${f.label}</button>`
  ).join('')}</div>`;
}

export function mount(el){
  const userId = auth.getState().user?.id || null;
  if(!document.getElementById('meRaceKindStyle')){
    const st = document.createElement('style'); st.id = 'meRaceKindStyle';
    st.textContent = `.me-kind.race{color:#5230da;background:rgba(82,48,218,.1)}`;
    document.head.appendChild(st);
  }

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">My Measurements</h1>
      <p class="page-sub">Your stored measurements — solo, sessions and experiments.</p>
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

    // Profiles for the session hosts (avatar + display_name) + voice-chip
    // lookup, in parallel — independent queries, one paint.
    const hostIds = [...new Set((sessR.data || []).map(s => s.created_by_user_id).filter(Boolean))];
    const hostsById = new Map();
    const recIds = [...new Set(rows.map(r => r.session_id).filter(v => v != null))];
    const soloIds = rows.filter(r => r.session_id == null).map(r => r.id);
    const recMap = new Map();       // session_id -> 'audio' | 'video'
    const soloRecMap = new Map();   // result_id  -> 'audio' | 'video'
    const [profQ, recQ, soloRecQ] = await Promise.all([
      hostIds.length
        ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', hostIds)
        : Promise.resolve({ data: [] }),
      recIds.length
        ? supabase.from('session_recordings').select('session_id, media').eq('status', 'ready').in('session_id', recIds)
        : Promise.resolve({ data: [] }),
      soloIds.length
        ? supabase.from('session_recordings').select('result_id, media').eq('status', 'ready').eq('kind', 'solo').in('result_id', soloIds)
        : Promise.resolve({ data: [] }),
    ]);
    for(const p of (profQ.data || [])) hostsById.set(p.id, p);
    // a video row wins if an event somehow has both kinds
    for(const x of (recQ.data || [])) if(x.media === 'video' || !recMap.has(x.session_id)) recMap.set(x.session_id, x.media === 'video' ? 'video' : 'audio');
    for(const x of (soloRecQ.data || [])) if(x.media === 'video' || !soloRecMap.has(x.result_id)) soloRecMap.set(x.result_id, x.media === 'video' ? 'video' : 'audio');
    const hostFor = sess => {
      if(!sess) return null;
      const p = sess.created_by_user_id ? hostsById.get(sess.created_by_user_id) : null;
      return { display_name: (p && p.display_name) || sess.created_by, avatar_url: p && p.avatar_url };
    };


    // Summary strip + filter pills + the (re-renderable) list of cards.
    list.innerHTML = `
      ${renderSummary(rows)}
      ${renderFilters()}
      <div id="meRows"></div>`;

    const rowsHost = list.querySelector('#meRows');
    let filter = 'all';
    const paint = () => {
      const shown = rows.filter(r => matches(r, filter));
      rowsHost.innerHTML = shown.length
        ? shown.map(r => cardHtml(r, sessMap, hostFor, recMap, soloRecMap)).join('')
        : '<div class="panel"><p class="placeholder">No measurements match this filter.</p></div>';
    };

    // Filter pills just re-render the displayed cards — no data refetch.
    list.querySelector('.me-filters').addEventListener('click', (e) => {
      const b = e.target.closest('.me-filter');
      if(!b) return;
      filter = b.dataset.filter;
      list.querySelectorAll('.me-filter').forEach(p => p.classList.toggle('active', p === b));
      paint();
    });

    paint();
  })();

  return () => {};
}
