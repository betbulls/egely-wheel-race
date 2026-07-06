import { supabase } from './db.js';
import * as auth from './auth.js';
import { ACHIEVEMENTS, computeLevelState } from './achievements.js';
import { fetchUserAchievements } from './achievements-store.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  // onerror: a provisioned avatar URL can 404 until the assets deploy lands —
  // hide the broken image rather than showing the browser's broken-image icon.
  if(url) return `<img src="${esc(url)}" alt="" onerror="this.style.display='none'">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

// Central, admin-managed offer — the SAME official Egely Wheel pack everywhere.
// The maker page adds their referral link + coupon on top; the member page links
// to the plain product page (no referral).
const OFFER = {
  name: 'Egely Wheel Vitality Pack',
  image: 'https://cdn.shopify.com/s/files/1/0946/2382/6306/files/VitalityPack-EgelyWheel.jpg?v=1777371828',
  features: ['Egely Wheel', 'Vitality Indicator', '1 Year Free EWR Membership'],
  regularPrice: '$499',
  couponPrice: '$449',   // shown only for the standard $50-off partner coupons
  plainUrl: 'https://egelywheel.com/products/vitality-pack?utm_source=ewr-live&utm_medium=connect-page',
};

// The offer card always sells the Vitality Pack. A maker's stored affiliate link
// is the store root with the affiliate's tracking query (e.g. ?sca_ref=…), so we
// carry that query onto the Vitality Pack PRODUCT url — the buyer lands on the
// product AND the maker gets credited. Falls back to the plain product page.
const VITALITY_PACK_URL = 'https://egelywheel.com/products/vitality-pack';
function makerBuyUrl(affiliateLink){
  try {
    const u = new URL((affiliateLink || '').trim());
    return u.search ? VITALITY_PACK_URL + u.search : VITALITY_PACK_URL;
  } catch {
    return VITALITY_PACK_URL;
  }
}

// Social icons (inline SVG). `field` is the profiles column the link lives in.
const SOCIALS = [
  { field: 'website',       label: 'Website',   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>` },
  { field: 'youtube_url',   label: 'YouTube',   icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.8-.5-5.6a3 3 0 0 0-2.1-2.1C18.6 3.8 12 3.8 12 3.8s-6.6 0-8.4.5A3 3 0 0 0 1.5 6.4C1 8.2 1 12 1 12s0 3.8.5 5.6a3 3 0 0 0 2.1 2.1c1.8.5 8.4.5 8.4.5s6.6 0 8.4-.5a3 3 0 0 0 2.1-2.1C23 15.8 23 12 23 12zM9.8 15.5v-7l6 3.5-6 3.5z"/></svg>` },
  { field: 'instagram_url', label: 'Instagram', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>` },
  { field: 'facebook_url',  label: 'Facebook',  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h2.5l.5-3H13v-2c0-.6.4-1 1-1z"/></svg>` },
  { field: 'tiktok_url',    label: 'TikTok',    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.3 2.3 1.9 4 4 4.2v3c-1.5 0-2.9-.5-4-1.3V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V3h3z"/></svg>` },
];

// Public-facing landing page reached via a shared connection link.
// Two shapes: a Spiritual Maker gets the full navy hero (wheel photo, bio,
// socials, referral offer); a regular member gets a clean personal invite
// (no bio/socials — those are maker services) with the plain product card.
export function mount(el, handle){
  el.innerHTML = `<div id="cnBody"><div class="empty">Loading…</div></div>`;
  const body = el.querySelector('#cnBody');
  let unsubAuth = null;
  let removeModal = null;

  (async () => {
    const pr = handle ? await auth.getPractitionerByHandle(handle) : null;
    if(!pr || !pr.is_practitioner){
      // Drop any pending-connect token too — otherwise every future login would
      // keep redirecting here (app.js honors the token before #/home).
      try { localStorage.removeItem('ewr_pending_connect'); } catch {}
      body.innerHTML = `
        <div class="connect-card">
          <h1 class="connect-title">Link not found</h1>
          <p class="connect-lead">This connection link isn't active. Please ask for an up-to-date link.</p>
        </div>`;
      return;
    }
    const name = pr.display_name || 'A member';
    const isMaker = !!pr.approved_maker;
    const now = Date.now();

    // ---- Public stats --------------------------------------------------------
    // Connected Members needs a SECURITY DEFINER RPC — practitioner_links RLS
    // hides rows from a stranger, so a direct count would return 0. Sessions and
    // achievements are publicly readable, so those work directly.
    const [memberCountR, sessionsR, resultsR, stored] = await Promise.all([
      supabase.rpc('practitioner_member_count', { pid: pr.id }),
      supabase.from('sessions')
        .select('id, name, scheduled_start, duration_minutes, verified_only, access_mode')
        .eq('created_by_user_id', pr.id).eq('event_type', 'session'),
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

    // Bio + socials are Spiritual Maker services — never shown on a member page.
    const socials = isMaker ? SOCIALS.filter(s => (pr[s.field] || '').trim()) : [];
    const hasReferral = isMaker && !!(pr.affiliate_link || '').trim();

    body.innerHTML = `
      <div class="cn-wrap">
        ${isMaker
          ? renderMakerHero(pr, name, socials, connectedMembers)
          : renderMemberHero(pr, name, connectedMembers)}
        ${renderWhat(name)}
        ${renderUpcoming(upcoming, now, name)}
        ${renderCommunity({ connectedMembers, hostedSessions: allSessions.length, level: levelState.level, verifiedRate })}
        ${hasReferral ? renderMakerOffer(pr, name) : renderPlainOffer()}
        ${renderFinal(name)}
      </div>`;

    // ---- Connect flow --------------------------------------------------------
    function setCtas(html){
      body.querySelectorAll('[data-cta-slot]').forEach(slot => { slot.innerHTML = html; });
    }

    const ctaSub = `<p class="cn-cta-sub">Connect to share your measurements with ${esc(name)} so they can follow your progress. You stay in control.</p>`;
    const freeNote = `<p class="cn-cta-note">Free account — you sign in with just an email code. Watching and following is always free.</p>`;

    async function updateConnectUI(){
      const a = auth.getState();
      if(!a.user){
        setCtas(`<button class="cn-cta" data-act="login">Connect with ${esc(name)}</button>${ctaSub}${freeNote}`);
        return;
      }
      if(a.user.id === pr.id){
        // A pending token must not survive this path either — it would hijack
        // every later login back to this page.
        try { localStorage.removeItem('ewr_pending_connect'); } catch {}
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

// Spiritual Maker hero — the page's navy focus card: identity + bio + socials on
// the left, the maker's "holding the wheel" photo on the right (when they have
// one; the text column simply takes the full width otherwise).
function renderMakerHero(pr, name, socials, connectedMembers){
  const socialHtml = socials.length ? `
    <div class="cn-socials cnm-socials">
      ${socials.map(s => `<a class="cn-social" href="${esc((pr[s.field] || '').trim())}" target="_blank" rel="noopener noreferrer nofollow" aria-label="${esc(s.label)}" title="${esc(s.label)}">${s.icon}</a>`).join('')}
    </div>` : '';
  const trust = connectedMembers > 0
    ? `<p class="cnm-trust">Trusted by <b>${connectedMembers}</b> connected member${connectedMembers === 1 ? '' : 's'}</p>`
    : '';
  const photo = (pr.wheel_photo_url || '').trim();
  return `
    <section class="cnm-hero${photo ? '' : ' no-photo'}">
      <div class="cnm-grid">
        <div class="cnm-text">
          <div class="cnm-id">
            <div class="cnm-avatar">${avatarHtml(pr.avatar_url, name)}</div>
            <div>
              <div class="cnm-eyebrow">✦ Spiritual Maker</div>
              <h1 class="cnm-name">${esc(name)}</h1>
            </div>
          </div>
          ${pr.bio ? `<p class="cnm-bio">${esc(pr.bio)}</p>` : ''}
          ${socialHtml}
          <div class="cn-cta-slot" data-cta-slot><button class="cn-cta" data-act="connect">Connect with ${esc(name)}</button></div>
          ${trust}
        </div>
        ${photo ? `
        <div class="cnm-photo">
          <img src="${esc(photo)}" alt="${esc(name)} holding the Egely Wheel" loading="lazy"
               onerror="this.closest('.cnm-hero').classList.add('no-photo');this.closest('.cnm-photo').style.display='none'">
        </div>` : ''}
      </div>
    </section>`;
}

// Regular member hero — clean personal invite. No bio, no socials, no badge:
// those are Spiritual Maker services.
function renderMemberHero(pr, name, connectedMembers){
  const trust = connectedMembers > 0
    ? `<p class="cn-trust">Trusted by <b>${connectedMembers}</b> connected member${connectedMembers === 1 ? '' : 's'}</p>`
    : '';
  return `
    <section class="cn-hero">
      <div class="cn-hero-avatar">${avatarHtml(pr.avatar_url, name)}</div>
      <h1 class="cn-name">${esc(name)}</h1>
      <p class="cn-intro">invites you to follow their vitality journey on EWR Live.</p>
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
                <div class="cn-session-name">${esc(s.name || 'Untitled session')}${s.verified_only ? ' <span class="sess-verified">✓ Verified</span>' : ''}${s.access_mode === 'invite' ? ` <span style="display:inline-block;margin-left:4px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5230da;background:rgba(82,48,218,.1);border-radius:999px;padding:2px 7px;vertical-align:middle">Invite link</span>` : s.access_mode === 'followers' ? ` <span style="display:inline-block;margin-left:4px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0e7490;background:rgba(14,116,144,.1);border-radius:999px;padding:2px 7px;vertical-align:middle">Followers only</span>` : ''}</div>
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

// Maker offer — the official pack through THEIR referral link, with their coupon.
// The $449 "your price" is only claimed for the standard $50-off partner coupons
// (codes ending in 50); other codes show the coupon without a computed price.
function renderMakerOffer(pr, name){
  const buy = esc(makerBuyUrl(pr.affiliate_link));   // Vitality Pack product + the maker's referral tracking
  const coupon = (pr.coupon_code || '').trim();
  const fiftyOff = /50$/.test(coupon);
  const priceHtml = fiftyOff
    ? `<span class="cn-price-reg"><s>${esc(OFFER.regularPrice)}</s></span>
       <span class="cn-price-your">${esc(OFFER.couponPrice)}</span>
       <span class="cn-price-lbl">with coupon</span>`
    : `<span class="cn-price-your">${esc(OFFER.regularPrice)}</span>
       <span class="cn-price-lbl">${coupon ? 'use the coupon at checkout' : '1 year of EWR Live included'}</span>`;
  const couponHtml = coupon ? `
    <div class="cn-coupon">
      <span class="cn-coupon-lbl">Coupon</span>
      <span class="cn-coupon-code">${esc(coupon)}</span>
      <button type="button" class="cn-coupon-copy" data-act="copy-coupon" data-coupon="${esc(coupon)}">Copy</button>
    </div>` : '';
  return `
    <section class="cn-card cn-offer">
      <div class="cn-offer-tag">★ Maker recommendation</div>
      <h2 class="cn-h">Recommended by ${esc(name)}</h2>
      <div class="cn-offer-body">
        <img class="cn-offer-img" src="${esc(OFFER.image)}" alt="${esc(OFFER.name)}" onerror="this.style.display='none'">
        <div class="cn-offer-info">
          <div class="cn-offer-name">${esc(OFFER.name)}</div>
          <ul class="cn-check cn-offer-feats">
            ${OFFER.features.map(f => `<li><span class="cn-tick">✓</span><span>${esc(f)}</span></li>`).join('')}
          </ul>
          <div class="cn-price">${priceHtml}</div>
          ${couponHtml}
          <div class="cn-offer-actions">
            <a class="cn-cta" href="${buy}" target="_blank" rel="noopener noreferrer nofollow">Get the Vitality Pack</a>
            <span class="cn-offer-fine">Supports ${esc(name)} — your purchase credits them.</span>
          </div>
        </div>
      </div>
    </section>`;
}

// Member page product card — same official pack, plain store link, no referral,
// no coupon. The visitor still learns what the wheel is and where to get it.
function renderPlainOffer(){
  return `
    <section class="cn-card cn-offer">
      <div class="cn-offer-tag">◎ Measure your own vitality</div>
      <h2 class="cn-h">The tool behind this journey</h2>
      <div class="cn-offer-body">
        <img class="cn-offer-img" src="${esc(OFFER.image)}" alt="${esc(OFFER.name)}" onerror="this.style.display='none'">
        <div class="cn-offer-info">
          <div class="cn-offer-name">${esc(OFFER.name)}</div>
          <ul class="cn-check cn-offer-feats">
            ${OFFER.features.map(f => `<li><span class="cn-tick">✓</span><span>${esc(f)}</span></li>`).join('')}
          </ul>
          <div class="cn-price">
            <span class="cn-price-your">${esc(OFFER.regularPrice)}</span>
            <span class="cn-price-lbl">1 year of EWR Live included</span>
          </div>
          <div class="cn-offer-actions">
            <a class="cn-cta" href="${esc(OFFER.plainUrl)}" target="_blank" rel="noopener noreferrer">See the Vitality Pack ↗</a>
          </div>
        </div>
      </div>
    </section>`;
}

function renderFinal(name){
  return `
    <section class="cn-final">
      <h2 class="cn-final-h">Ready to connect?</h2>
      <div class="cn-cta-slot" data-cta-slot><button class="cn-cta" data-act="connect">Connect with ${esc(name)}</button></div>
    </section>`;
}
