import { supabase } from './db.js';
import * as auth from './auth.js';
import { ACHIEVEMENTS, computeLevelState } from './achievements.js';
import { fetchUserAchievements } from './achievements-store.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

// Central, admin-managed offer — the SAME official Egely Wheel pack for every
// Spiritual Maker. Only shown when the maker filled in an affiliate link +
// coupon code. The product image is NOT taken from the maker's profile; set the
// official image URL here once and every maker reuses it.
const OFFER = {
  name: 'Egely Wheel Vitality Pack',
  // Official Vitality Pack product image (from the Shopify store). Central — the
  // same for every Spiritual Maker; swap this one URL to change it everywhere.
  image: 'https://cdn.shopify.com/s/files/1/0946/2382/6306/files/VitalityPack-EgelyWheel.jpg?v=1777371828',
  features: ['Egely Wheel', 'Vitality Indicator', '1 Year Free EWR Membership'],
  regularPrice: '$499',
  yourPrice: '$449',
};

// Social icons (inline SVG). `field` is the profiles column the link lives in.
const SOCIALS = [
  { field: 'website',       label: 'Website',   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>` },
  { field: 'youtube_url',   label: 'YouTube',   icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.8-.5-5.6a3 3 0 0 0-2.1-2.1C18.6 3.8 12 3.8 12 3.8s-6.6 0-8.4.5A3 3 0 0 0 1.5 6.4C1 8.2 1 12 1 12s0 3.8.5 5.6a3 3 0 0 0 2.1 2.1c1.8.5 8.4.5 8.4.5s6.6 0 8.4-.5a3 3 0 0 0 2.1-2.1C23 15.8 23 12 23 12zM9.8 15.5v-7l6 3.5-6 3.5z"/></svg>` },
  { field: 'instagram_url', label: 'Instagram', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>` },
  { field: 'facebook_url',  label: 'Facebook',  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h2.5l.5-3H13v-2c0-.6.4-1 1-1z"/></svg>` },
  { field: 'tiktok_url',    label: 'TikTok',    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.3 2.3 1.9 4 4 4.2v3c-1.5 0-2.9-.5-4-1.3V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V3h3z"/></svg>` },
];

// Public-facing mini landing page reached via a Spiritual Maker's shared link.
export function mount(el, handle){
  el.innerHTML = `<div id="cnBody"><div class="empty">Loading…</div></div>`;
  const body = el.querySelector('#cnBody');
  let unsubAuth = null;
  let removeModal = null;

  (async () => {
    const pr = handle ? await auth.getPractitionerByHandle(handle) : null;
    if(!pr || !pr.is_practitioner){
      body.innerHTML = `
        <div class="connect-card">
          <h1 class="connect-title">Link not found</h1>
          <p class="connect-lead">This connection link isn't active. Please ask for an up-to-date link.</p>
        </div>`;
      return;
    }
    const name = pr.display_name || 'A Spiritual Maker';
    const now = Date.now();

    // ---- Public stats --------------------------------------------------------
    // Connected Members needs a SECURITY DEFINER RPC — practitioner_links RLS
    // hides rows from a stranger, so a direct count would return 0. Sessions and
    // achievements are publicly readable, so those work directly.
    const [memberCountR, sessionsR, resultsR, stored] = await Promise.all([
      supabase.rpc('practitioner_member_count', { pid: pr.id }),
      supabase.from('sessions')
        .select('id, name, scheduled_start, duration_minutes, verified_only')
        .eq('created_by_user_id', pr.id),
      supabase.from('results').select('verified').eq('user_id', pr.id),
      fetchUserAchievements(pr.id),
    ]);

    const connectedMembers = memberCountR && typeof memberCountR.data === 'number' ? memberCountR.data : 0;
    const allSessions = sessionsR.data || [];
    const results = resultsR.data || [];
    const verifiedRate = results.length
      ? Math.round(results.filter(r => r.verified).length / results.length * 100)
      : null;
    const levelState = computeLevelState(ACHIEVEMENTS.map(a => ({ ...a, unlocked: stored.has(a.id) })));

    // Upcoming (live or future) hosted sessions — up to 3, with participant counts.
    const upcoming = allSessions
      .filter(s => now <= new Date(s.scheduled_start).getTime() + (s.duration_minutes || 0) * 60000)
      .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start))
      .slice(0, 3);
    if(upcoming.length){
      const { data: parts } = await supabase.from('results')
        .select('session_id, user_id').in('session_id', upcoming.map(s => s.id));
      const counts = new Map();
      for(const r of (parts || [])){
        if(!counts.has(r.session_id)) counts.set(r.session_id, new Set());
        counts.get(r.session_id).add(r.user_id);
      }
      for(const s of upcoming) s._participants = (counts.get(s.id) || new Set()).size;
    }

    const socials = SOCIALS.filter(s => (pr[s.field] || '').trim());
    const hasOffer = !!((pr.affiliate_link || '').trim() && (pr.coupon_code || '').trim());

    body.innerHTML = `
      <div class="cn-wrap">
        ${renderHero(pr, name, socials, connectedMembers)}
        ${renderWhat(name)}
        ${renderUpcoming(upcoming, now, name)}
        ${renderCommunity({ connectedMembers, hostedSessions: allSessions.length, level: levelState.level, verifiedRate })}
        ${hasOffer ? renderOffer(pr, name) : ''}
        ${renderFinal()}
      </div>`;

    // ---- Connect flow --------------------------------------------------------
    function setCtas(html){
      body.querySelectorAll('[data-cta-slot]').forEach(slot => { slot.innerHTML = html; });
    }

    const ctaSub = `<p class="cn-cta-sub">Connect to share your measurements with ${esc(name)} so they can follow your progress. You stay in control.</p>`;

    async function updateConnectUI(){
      const a = auth.getState();
      if(!a.user){
        setCtas(`<button class="cn-cta" data-act="login">Connect with ${esc(name)}</button>${ctaSub}`);
        return;
      }
      if(a.user.id === pr.id){
        setCtas(`<p class="cn-note">This is your own page — share this link with the people you want to follow your journey.</p>`);
        return;
      }
      // Finish a connection the visitor started before logging in.
      let pending = null; try { pending = localStorage.getItem('ewr_pending_connect'); } catch {}
      if(pending === handle){
        try { localStorage.removeItem('ewr_pending_connect'); } catch {}
        await auth.connectToPractitioner(pr.id);
      }
      const connected = await auth.isConnectedTo(pr.id);
      if(connected){
        setCtas(`<p class="cn-note ok">✓ You're connected — ${esc(name)} can now follow your measurements.</p>
                 <button class="btn-secondary" data-act="disconnect">End connection</button>`);
      } else {
        setCtas(`<button class="cn-cta" data-act="connect">Connect with ${esc(name)}</button>${ctaSub}`);
      }
    }

    body.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      if(!btn) return;
      const act = btn.dataset.act;
      if(act === 'login'){
        try { localStorage.setItem('ewr_pending_connect', handle); } catch {}
        location.hash = '#/login';
      } else if(act === 'connect'){
        openConfirm();
      } else if(act === 'disconnect'){
        btn.disabled = true;
        await auth.disconnectPractitioner(pr.id);
        updateConnectUI();
      } else if(act === 'copy-coupon'){
        const code = btn.dataset.coupon || '';
        try { await navigator.clipboard.writeText(code); } catch {}
        const prev = btn.textContent; btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = prev; }, 1600);
      }
    });

    // Confirmation panel — connection only happens after the visitor confirms.
    function openConfirm(){
      if(removeModal) removeModal();
      const overlay = document.createElement('div');
      overlay.className = 'cn-modal-backdrop';
      overlay.innerHTML = `
        <div class="cn-modal" role="dialog" aria-modal="true">
          <div class="cn-modal-avatar">${avatarHtml(pr.avatar_url, name)}</div>
          <h3 class="cn-modal-title">Connect with ${esc(name)}</h3>
          <p class="cn-modal-text">${esc(name)} will be able to view your future measurements and follow your progress. You can disconnect at any time.</p>
          <div class="cn-modal-actions">
            <button class="cn-cta" data-confirm>Connect</button>
            <button class="btn-secondary" data-cancel>Cancel</button>
          </div>
          <span class="form-msg" data-modal-msg></span>
        </div>`;
      el.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('open'));
      const close = () => { overlay.remove(); removeModal = null; };
      removeModal = close;
      overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
      overlay.querySelector('[data-cancel]').addEventListener('click', close);
      overlay.querySelector('[data-confirm]').addEventListener('click', async () => {
        const cbtn = overlay.querySelector('[data-confirm]'); cbtn.disabled = true;
        const msg = overlay.querySelector('[data-modal-msg]');
        msg.className = 'form-msg'; msg.textContent = 'Connecting…';
        const { error } = await auth.connectToPractitioner(pr.id);
        if(error){ cbtn.disabled = false; msg.className = 'form-msg err'; msg.textContent = 'Error: ' + error.message; return; }
        close();
        updateConnectUI();
      });
    }

    unsubAuth = auth.subscribeAuth(() => updateConnectUI());
  })();

  return () => { if(unsubAuth) unsubAuth(); if(removeModal) removeModal(); };
}

// ---- Section renderers -------------------------------------------------------
function renderHero(pr, name, socials, connectedMembers){
  const socialHtml = socials.length ? `
    <div class="cn-socials">
      ${socials.map(s => `<a class="cn-social" href="${esc((pr[s.field] || '').trim())}" target="_blank" rel="noopener noreferrer nofollow" aria-label="${esc(s.label)}" title="${esc(s.label)}">${s.icon}</a>`).join('')}
    </div>` : '';
  const trust = connectedMembers > 0
    ? `<p class="cn-trust">Trusted by <b>${connectedMembers}</b> connected member${connectedMembers === 1 ? '' : 's'}</p>`
    : '';
  return `
    <section class="cn-hero">
      <div class="cn-hero-avatar">${avatarHtml(pr.avatar_url, name)}</div>
      <div class="cn-badge">✦ Spiritual Maker</div>
      <h1 class="cn-name">${esc(name)}</h1>
      ${pr.bio ? `<p class="cn-intro">${esc(pr.bio)}</p>` : ''}
      ${socialHtml}
      <div class="cn-cta-slot" data-cta-slot><button class="cn-cta" data-act="connect">Connect with ${esc(name)}</button></div>
      ${trust}
    </section>`;
}

function renderWhat(name){
  const items = [
    ['You share your measurements', `${name} can see the measurements and results you record from now on.`],
    ['They follow your progress', 'They can see how your vitality develops over time — for guidance, feedback or deeper analysis.'],
    ['Join their community', `You become one of ${name}'s connected members.`],
    ['You stay in control', 'Disconnect at any time — you decide who follows your journey.'],
  ];
  return `
    <section class="cn-card">
      <h2 class="cn-h">What happens when you connect?</h2>
      <p class="cn-sub">Connecting shares your measurements with ${esc(name)} so they can follow and support your journey — it is not about watching their sessions.</p>
      <ul class="cn-check">
        ${items.map(([t, d]) => `<li><span class="cn-tick">✓</span><div class="cn-check-body"><div class="cn-check-t">${esc(t)}</div><div class="cn-check-d">${esc(d)}</div></div></li>`).join('')}
      </ul>
    </section>`;
}

function renderCommunity({ connectedMembers, hostedSessions, level, verifiedRate }){
  const stats = [
    { label: 'Connected Members', val: connectedMembers },
    { label: 'Hosted Sessions',   val: hostedSessions },
    { label: 'Current Level',     val: level.title },
    { label: 'Verification Rate', val: verifiedRate == null ? '–' : verifiedRate + '%' },
  ];
  return `
    <section class="cn-card">
      <h2 class="cn-h">Community</h2>
      <div class="cn-stats">
        ${stats.map(s => `<div class="cn-stat"><div class="cn-stat-val">${esc(String(s.val))}</div><div class="cn-stat-lbl">${esc(s.label)}</div></div>`).join('')}
      </div>
    </section>`;
}

function fmtWhen(iso){
  return new Date(iso).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function renderUpcoming(upcoming, now, name){
  const body = upcoming.length
    ? `<div class="cn-sessions">
        ${upcoming.map(s => {
          const start = new Date(s.scheduled_start).getTime();
          const live = now >= start && now <= start + (s.duration_minutes || 0) * 60000;
          const parts = s._participants > 0 ? ` · ${s._participants} measuring` : '';
          return `
            <a class="cn-session" href="#/room/${esc(String(s.id))}">
              <div class="cn-session-main">
                <div class="cn-session-name">${esc(s.name || 'Untitled session')}${s.verified_only ? ' <span class="sess-verified">✓ Verified</span>' : ''}</div>
                <div class="cn-session-meta">${live ? '<span class="hs-live">● Live now</span>' : esc(fmtWhen(s.scheduled_start))}${parts}</div>
              </div>
              <span class="cn-session-pill ${live ? 'live' : 'up'}">${live ? 'Join' : 'View'} →</span>
            </a>`;
        }).join('')}
      </div>`
    : `<div class="cn-empty">No upcoming sessions yet. Connect to be notified when ${esc(name)} hosts one.</div>`;
  return `
    <section class="cn-card">
      <h2 class="cn-h">Upcoming sessions</h2>
      ${body}
    </section>`;
}

function renderOffer(pr, name){
  const link = esc((pr.affiliate_link || '').trim());
  const coupon = esc((pr.coupon_code || '').trim());
  const img = OFFER.image
    ? `<img class="cn-offer-img" src="${esc(OFFER.image)}" alt="${esc(OFFER.name)}" onerror="this.style.display='none'">`
    : `<div class="cn-offer-img cn-offer-img-ph">Official<br>Egely Wheel<br>image</div>`;
  return `
    <section class="cn-card cn-offer">
      <div class="cn-offer-tag">★ Maker recommendation</div>
      <h2 class="cn-h">Recommended by ${esc(name)}</h2>
      <div class="cn-offer-body">
        ${img}
        <div class="cn-offer-info">
          <div class="cn-offer-name">${esc(OFFER.name)}</div>
          <ul class="cn-check cn-offer-feats">
            ${OFFER.features.map(f => `<li><span class="cn-tick">✓</span><span>${esc(f)}</span></li>`).join('')}
          </ul>
          <div class="cn-price">
            <span class="cn-price-reg"><s>${esc(OFFER.regularPrice)}</s></span>
            <span class="cn-price-your">${esc(OFFER.yourPrice)}</span>
            <span class="cn-price-lbl">your price</span>
          </div>
          <div class="cn-coupon">
            <span class="cn-coupon-lbl">Coupon</span>
            <span class="cn-coupon-code">${coupon}</span>
            <button type="button" class="cn-coupon-copy" data-act="copy-coupon" data-coupon="${coupon}">Copy</button>
          </div>
          <div class="cn-offer-actions">
            <a class="cn-cta" href="${link}" target="_blank" rel="noopener noreferrer nofollow">Buy through ${esc(name)}</a>
            <a class="btn-secondary" href="${link}" target="_blank" rel="noopener noreferrer nofollow">View product</a>
          </div>
        </div>
      </div>
    </section>`;
}

function renderFinal(){
  return `
    <section class="cn-final">
      <h2 class="cn-final-h">Ready to connect?</h2>
      <div class="cn-cta-slot" data-cta-slot><button class="cn-cta" data-act="connect">Connect</button></div>
    </section>`;
}
