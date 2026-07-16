// view-showcase.js — the public SHOWCASE gallery (#/showcase).
//
// Vitality readings members chose to publish (results.published = true,
// solo rows only). Anyone can browse and open a reading (the measurement page
// plays the replay + the camera/voice recording via the public Fn paths);
// logged-in members can applaud (solo_likes). Newest first by default, with a
// "Most liked" sort. Publishing happens on the measurement page (owner-only
// RPC set_solo_published) — this page only reads.

import { supabase } from './db.js';
import * as auth from './auth.js';
import { flagUrl } from './countries.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Muted zone colour for numbers on light surfaces (the detail page's zText).
const zText = v => v < 6 ? '#c2415b' : v < 13 ? '#b8860b' : '#0f8a52';

let cssDone = false;
function injectCss(){
  if(cssDone || document.getElementById('showcaseStyles')){ cssDone = true; return; }
  cssDone = true;
  const s = document.createElement('style');
  s.id = 'showcaseStyles';
  s.textContent = `
.sc-tabs{display:flex;gap:8px;margin:2px 0 16px}
.sc-tab{padding:8px 18px;border-radius:999px;border:1px solid var(--ewr-border,#dfe3e6);background:var(--ewr-surface,#fff);
  color:var(--ewr-text-muted,#67737c);font:600 13px Inter,sans-serif;cursor:pointer}
.sc-tab.on{background:var(--ewr-accent-strong,#401d91);border-color:transparent;color:#fff}
.sc-tab:not(.on):hover{border-color:rgba(82,48,218,.4);color:var(--ewr-accent-strong,#401d91);background:rgba(82,48,218,.06)}
.sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px}
.sc-card{background:var(--ewr-surface,#fff);border:1px solid var(--ewr-border,#dfe3e6);border-radius:18px;padding:16px 18px;
  box-shadow:0 10px 28px rgba(1,22,36,.05);cursor:pointer;transition:transform .18s ease, box-shadow .18s ease;display:flex;flex-direction:column;gap:10px}
.sc-card:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(1,22,36,.09)}
.sc-top{display:flex;align-items:center;gap:11px}
.sc-ava{width:42px;height:42px;border-radius:50%;overflow:hidden;flex:none;background:linear-gradient(135deg,#37dbff,#5230da);padding:2px}
.sc-ava img,.sc-ava span{display:flex;width:100%;height:100%;border-radius:50%;object-fit:cover;background:#eef2f5;
  align-items:center;justify-content:center;font:700 16px Montserrat,sans-serif;color:#33424d}
.sc-who{min-width:0;flex:1}
.sc-who b{display:flex;align-items:center;gap:7px;font:600 14px Inter,sans-serif;color:var(--ewr-text,#011624);white-space:nowrap;overflow:hidden}
.sc-name{min-width:0;overflow:hidden;text-overflow:ellipsis}
.sc-who small{display:block;font:500 12px Inter,sans-serif;color:var(--ewr-text-muted,#67737c);margin-top:1px}
.sc-flag{width:18px;height:13px;border-radius:2.5px;object-fit:cover;flex:none}
.sc-check{color:#0f8a52;font-size:12px;flex:none}
.sc-media{flex:none;padding:4px 11px;border-radius:999px;font:600 11.5px Inter,sans-serif;letter-spacing:.02em;
  border:1px solid rgba(184,134,11,.35);color:#8a6508;background:rgba(232,184,75,.1);white-space:nowrap}
.sc-maker{flex:none;padding:3px 10px;border-radius:999px;font:700 10px Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;
  border:1px solid rgba(184,134,11,.4);color:#8a6508;background:linear-gradient(135deg,rgba(232,184,75,.16),rgba(232,184,75,.06))}
.sc-title{margin:0;font:600 16.5px Montserrat,Inter,sans-serif;color:var(--ewr-text,#011624);line-height:1.3;
  overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.sc-spark{display:block;width:100%;height:44px;border-radius:10px;background:linear-gradient(180deg,rgba(82,48,218,.045),rgba(82,48,218,.015));padding:4px 6px;box-sizing:border-box}
.sc-spark.big{height:60px}
/* Spiritual Maker hero card: the wheel photo fills the left edge */
.sc-card.hero{grid-column:1/-1;flex-direction:row;padding:0;overflow:hidden}
.sc-hero-photo{width:236px;flex:none;position:relative;background:#eef2f5}
.sc-hero-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.sc-hero-body{flex:1;min-width:0;padding:18px 22px;display:flex;flex-direction:column;gap:10px}
.sc-card.hero .sc-title{font-size:19px}
@media (max-width:620px){
  .sc-card.hero{flex-direction:column}
  .sc-hero-photo{width:100%;height:190px}
  .sc-who b{flex-wrap:wrap;row-gap:3px}   /* narrow phones: the gold pill drops below the name instead of clipping */
}
.sc-stats{display:flex;gap:22px;align-items:baseline}
.sc-stat b{font:700 20px Montserrat,sans-serif}
.sc-stat small{font:600 10.5px Inter,sans-serif;letter-spacing:.08em;color:var(--ewr-text-muted,#67737c);margin-left:5px}
.sc-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px;border-top:1px dashed var(--ewr-border,#dfe3e6)}
.sc-like{display:inline-flex;align-items:center;gap:7px;padding:7px 15px;border-radius:999px;border:1px solid var(--ewr-border,#dfe3e6);
  background:#fff;color:var(--ewr-text-muted,#67737c);font:600 13px Inter,sans-serif;cursor:pointer;text-decoration:none}
.sc-like:hover{border-color:rgba(82,48,218,.4);color:var(--ewr-accent-strong,#401d91)}
.sc-like.on{background:rgba(82,48,218,.08);border-color:rgba(82,48,218,.4);color:var(--ewr-accent-strong,#401d91)}
.sc-like:disabled{opacity:.55;cursor:default}
.sc-watch{font:600 12.5px Inter,sans-serif;color:var(--ewr-accent-strong,#401d91)}
.sc-empty{background:var(--ewr-surface,#fff);border:1px dashed var(--ewr-border,#dfe3e6);border-radius:18px;
  padding:34px 22px;text-align:center;color:var(--ewr-text-muted,#67737c);font:500 14px Inter,sans-serif}
.sc-hint{margin-top:18px;text-align:center;font:500 12.5px Inter,sans-serif;color:var(--ewr-text-muted,#67737c)}
.sc-hint a{color:var(--ewr-accent-strong,#401d91)}`;
  document.head.appendChild(s);
}

function avaHtml(url, name){
  return `<span class="sc-ava">${url ? `<img src="${esc(url)}" alt="">` : `<span>${esc((name || '?').charAt(0).toUpperCase())}</span>`}</span>`;
}
const fmtWhen = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtDur = s => !s ? '' : s >= 60 ? Math.round(s / 60) + ' min' : s + ' s';

// The reading's curve as a small sparkline — the card must SHOW the
// measurement, not just talk about it (Csaba, 2026-07-12). Pen-up across
// nulls; long curves are downsampled.
const zVivid = v => v < 6 ? '#e14b64' : v < 13 ? '#eab308' : '#10b981';
function sparkSvg(curve, cls){
  if(!Array.isArray(curve) || curve.length < 2) return '';
  const n = curve.length, W = 100, H = 32, step = Math.max(1, Math.ceil(n / 140));
  let d = '', pen = false, last = null, lastV = 0;
  for(let i = 0; i < n; i += step){
    const raw = curve[i];
    const v = raw == null ? null : Number(raw);
    if(v == null || !Number.isFinite(v)){ pen = false; continue; }
    const x = (i / (n - 1)) * W;
    const y = H - 2 - (Math.max(0, Math.min(24, v)) / 24) * (H - 6);
    d += (pen ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    pen = true; last = [x, y]; lastV = v;
  }
  if(!d) return '';
  return `<svg class="${cls || 'sc-spark'}" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d.trim()}" fill="none" stroke="#5230da" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    ${last ? `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.4" fill="${zVivid(lastV)}"/>` : ''}
  </svg>`;
}

export function mount(el){
  injectCss();
  let disposed = false;
  let sort = 'latest';
  let items = [];                 // { r, prof, media, likes, liked }
  const me = () => auth.getState().user || null;

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Showcase</h1>
      <p class="page-sub">Vitality readings our community chose to share — watch the replay, hear the guidance, leave some applause.</p>
    </div>
    <div class="sc-tabs" id="scTabs" hidden>
      <button type="button" class="sc-tab on" data-sort="latest">Latest</button>
      <button type="button" class="sc-tab" data-sort="liked">Most liked</button>
    </div>
    <div id="scBody"><div class="sc-empty">Loading the showcase…</div></div>
    <p class="sc-hint" id="scHint" hidden></p>`;

  const body = el.querySelector('#scBody');

  el.querySelector('#scTabs').addEventListener('click', ev => {
    const b = ev.target.closest('[data-sort]');
    if(!b || b.dataset.sort === sort) return;
    sort = b.dataset.sort;
    el.querySelectorAll('.sc-tab').forEach(t => t.classList.toggle('on', t.dataset.sort === sort));
    paint();
  });

  function cardHtml(it){
    const r = it.r, u = me();
    const own = !!(u && r.user_id === u.id);
    const name = r.racer_name || (it.prof && it.prof.display_name) || 'Member';
    const media = it.media === 'video' ? '🎥 On camera' : it.media === 'audio' ? '🎙 With voice' : '';
    const isMaker = !!(it.prof && it.prof.approved_maker);
    const heroPhoto = isMaker ? ((it.prof.wheel_photo_url || '').trim()) : '';
    const likeInner = `♥ ${it.likes}`;
    const like = u
      ? `<button type="button" class="sc-like ${it.liked ? 'on' : ''}" data-like="${r.id}" ${own ? 'disabled title="Your own reading"' : ''}>${likeInner}</button>`
      : `<a class="sc-like" href="#/login" title="Log in to applaud" data-stop>${likeInner}</a>`;
    const who = `
        <div class="sc-top">
          ${avaHtml(it.prof && it.prof.avatar_url, name)}
          <div class="sc-who">
            <b><span class="sc-name">${esc(name)}</span>${it.prof && it.prof.country ? `<img class="sc-flag" src="${esc(flagUrl(it.prof.country))}" alt="">` : ''}${r.verified ? '<span class="sc-check">✓</span>' : ''}${isMaker ? '<span class="sc-maker">Spiritual Maker</span>' : ''}</b>
            <small>${esc(fmtWhen(r.created_at))}${r.duration_seconds ? ' · ' + fmtDur(r.duration_seconds) : ''}</small>
          </div>
          ${media ? `<span class="sc-media">${media}</span>` : ''}
        </div>`;
    const body = `
        ${who}
        <h3 class="sc-title">${esc(r.label || 'Vitality reading')}</h3>
        ${sparkSvg(r.curve, heroPhoto ? 'sc-spark big' : 'sc-spark')}
        <div class="sc-stats">
          <span class="sc-stat"><b style="color:${zText(r.avg || 0)}">${(r.avg || 0).toFixed(1)}</b><small>AVG</small></span>
          <span class="sc-stat"><b style="color:${zText(r.peak || 0)}">${r.peak || 0}</b><small>PEAK</small></span>
        </div>
        <div class="sc-foot">${like}<span class="sc-watch">Watch the replay →</span></div>`;
    // A Spiritual Maker with a wheel photo gets the HERO treatment: the photo
    // fills the card's left edge, the reading breathes next to it.
    if(heroPhoto) return `
      <article class="sc-card hero" data-open="${r.id}">
        <div class="sc-hero-photo"><img src="${esc(heroPhoto)}" alt="${esc(name)} holding the Egely Wheel" loading="lazy" onerror="this.closest('.sc-hero-photo').style.display='none'"></div>
        <div class="sc-hero-body">${body}</div>
      </article>`;
    return `
      <article class="sc-card" data-open="${r.id}">${body}</article>`;
  }

  function paint(){
    if(disposed || !el.isConnected) return;
    const list = items.slice();
    if(sort === 'liked') list.sort((a, b) => (b.likes - a.likes) || (Date.parse(b.r.created_at) - Date.parse(a.r.created_at)));
    if(!list.length){
      body.innerHTML = `<div class="sc-empty">No shared readings yet — be the first! Open one of your measurements and publish it to the Showcase.</div>`;
      return;
    }
    body.innerHTML = `<div class="sc-grid">${list.map(cardHtml).join('')}</div>`;
  }

  // Open the reading / toggle the applause (event delegation keeps re-renders cheap).
  body.addEventListener('click', async ev => {
    const likeBtn = ev.target.closest('[data-like]');
    if(likeBtn){
      ev.stopPropagation();
      const u = me(); if(!u || likeBtn.disabled) return;
      const id = Number(likeBtn.dataset.like);
      const it = items.find(x => x.r.id === id); if(!it) return;
      likeBtn.disabled = true;
      try{
        if(it.liked){
          const { error } = await supabase.from('solo_likes').delete().eq('result_id', id).eq('user_id', u.id);
          if(!error){ it.liked = false; it.likes = Math.max(0, it.likes - 1); }
        } else {
          const { error } = await supabase.from('solo_likes').insert({ result_id: id, user_id: u.id });
          if(!error) { it.liked = true; it.likes++; }
        }
      }catch(_){}
      paint();
      return;
    }
    if(ev.target.closest('[data-stop]')) return;   // anon like → login link navigates itself
    const card = ev.target.closest('[data-open]');
    if(card) location.hash = '#/m/' + card.dataset.open;
  });

  (async () => {
    // Published solos (newest first). Degrades to the empty state if the
    // published column / policies are not deployed yet.
    const { data: rows, error } = await supabase.from('results')
      .select('id, user_id, racer_name, label, avg, peak, verified, duration_seconds, created_at, curve')
      .eq('published', true).is('session_id', null)
      .order('created_at', { ascending: false }).limit(60);
    if(disposed) return;
    if(error || !rows || !rows.length){ items = []; paint(); hint(); return; }

    const ids = rows.map(r => r.id);
    const uids = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const [profs, recs, likes] = await Promise.all([
      uids.length ? supabase.from('profiles').select('id, display_name, avatar_url, country, approved_maker, wheel_photo_url').in('id', uids) : { data: [] },
      supabase.from('session_recordings').select('result_id, media').eq('kind', 'solo').eq('status', 'ready').in('result_id', ids),
      supabase.from('solo_likes').select('result_id, user_id').in('result_id', ids),
    ]);
    if(disposed) return;
    const profMap = new Map(((profs && profs.data) || []).map(p => [p.id, p]));
    const mediaMap = new Map();
    (((recs && recs.data) || [])).forEach(x => {
      const cur = mediaMap.get(x.result_id);
      if(x.media === 'video' || !cur) mediaMap.set(x.result_id, x.media || 'audio');   // video wins
    });
    const likeRows = ((likes && likes.data) || []);
    const u = me();
    items = rows.map(r => ({
      r,
      prof: profMap.get(r.user_id) || null,
      media: mediaMap.get(r.id) || null,
      likes: likeRows.filter(l => l.result_id === r.id).length,
      liked: !!(u && likeRows.some(l => l.result_id === r.id && l.user_id === u.id)),
    }));
    el.querySelector('#scTabs').hidden = false;
    paint();
    hint();
  })();

  function hint(){
    const h = el.querySelector('#scHint');
    if(!h) return;
    h.hidden = false;
    h.innerHTML = me()
      ? `Want yours here? Open a measurement in <a href="#/me">My measurements</a> and publish it to the Showcase.`
      : `Members publish their own readings here — <a href="#/login">log in</a> to share yours and applaud others.`;
  }

  return () => { disposed = true; };
}
