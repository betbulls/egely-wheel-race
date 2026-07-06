import * as auth from './auth.js';
import { qrSvg, qrCanvas } from './qrcode.js';
import { COUNTRY_CODES, countryName } from './countries.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const AFFILIATE_REGISTER = 'https://affiliate.egelywheel.com/register';

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

// Scoped styles for the Live Wall Spotlight card (.pf-spot-*) — no index.html edits.
function spotStyles(){
  if(document.getElementById('pfSpotStyles')) return;
  const st = document.createElement('style');
  st.id = 'pfSpotStyles';
  st.textContent = `
  .pf-spot{border:1px solid rgba(82,48,218,.2);box-shadow:0 10px 28px rgba(82,48,218,.07)}
  .pf-spot-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}
  .pf-spot-icon{font-size:22px;line-height:1;color:#5230da;flex-shrink:0;margin-top:1px}
  .pf-spot-title{font-family:'Montserrat',sans-serif;font-weight:600;font-size:17px;color:#011624;margin:0 0 4px}
  .pf-spot-sub{color:#67737c;font-size:13.5px;line-height:1.5;margin:0;max-width:520px}
  .pf-spot-state{font-size:14px;font-weight:600;border-radius:10px;padding:11px 13px;margin-bottom:14px;display:flex;align-items:center;gap:9px;line-height:1.4}
  .pf-spot-state.on{background:rgba(14,116,144,.08);border:1px solid rgba(14,116,144,.25);color:#0e7490}
  .pf-spot-state.off{background:#f2f3f4;border:1px solid #dfe3e6;color:#67737c}
  .pf-spot-state.off.amber{background:rgba(245,183,0,.1);border-color:rgba(245,183,0,.35);color:#8a6d00}
  .pf-spot-dot{width:8px;height:8px;border-radius:50%;background:#0e7490;box-shadow:0 0 7px 1px rgba(14,116,144,.5);flex-shrink:0}
  .pf-spot-actions{display:flex;gap:10px;flex-wrap:wrap}
  .pf-spot-off{font-family:'Inter',sans-serif;font-size:14px;font-weight:700;padding:11px 18px;border-radius:999px;cursor:pointer;background:#fff;border:1px solid #dfe3e6;color:#67737c;transition:border-color .15s,color .15s}
  .pf-spot-off:hover:not(:disabled){background:#fff;border-color:#c2415b;color:#c2415b}
  .pf-spot-off:disabled{opacity:.6;cursor:default}
  .pf-spot-note{color:#99a2a7;font-size:12px;line-height:1.45;margin:12px 0 0}
  .pf-spot-msg{display:block;margin-top:8px;min-height:16px}
  @media (max-width:600px){ .pf-spot-actions button{flex:1 1 auto;text-align:center} }
  `;
  document.head.appendChild(st);
}

// Country dropdown options (labels via the browser, sorted by name; value = ISO code).
function countryOptions(selected){
  const opts = COUNTRY_CODES.map(c => ({ c, n: countryName(c) })).sort((a, b) => a.n.localeCompare(b.n));
  return `<option value="">— Not set —</option>` +
    opts.map(o => `<option value="${o.c}"${o.c === selected ? ' selected' : ''}>${esc(o.n)}</option>`).join('');
}

function connectUrl(handle){
  return location.origin + location.pathname + '#/connect/' + handle;
}

// One optional URL field (Social Links + Affiliate share this shape).
function urlInput(id, label, placeholder, value, disabled){
  return `
    <div class="field full">
      <label for="${id}">${esc(label)}</label>
      <input id="${id}" type="url" inputmode="url" maxlength="200" value="${esc(value || '')}" placeholder="${esc(placeholder)}"${disabled ? ' disabled' : ''}>
    </div>`;
}

// Lenient URL normaliser for the optional fields.
// Empty → null (valid). Missing scheme → assume https://. Anything that still
// isn't a real URL → { error:true } so we can block the save and point at it.
function cleanUrl(raw){
  const v = (raw || '').trim();
  if(!v) return { value: null };
  const withScheme = /^https?:\/\//i.test(v) ? v : 'https://' + v;
  try {
    const u = new URL(withScheme);
    if(!u.hostname || !u.hostname.includes('.')) return { error: true };
    return { value: u.href };
  } catch { return { error: true }; }
}

// Social platforms where the user types only their username — the platform URL
// is built for them. The DB still stores a full URL, so the connect page is
// unchanged and existing full-URL data keeps working.
const SOCIAL = [
  { col: 'instagram_url', id: 'pfInsta', label: 'Instagram', prefix: 'instagram.com/', ph: 'yourhandle' },
  { col: 'youtube_url',   id: 'pfYt',    label: 'YouTube',   prefix: 'youtube.com/',   ph: '@yourchannel' },
  { col: 'tiktok_url',    id: 'pfTt',    label: 'TikTok',    prefix: 'tiktok.com/',    ph: '@yourhandle' },
  { col: 'facebook_url',  id: 'pfFb',    label: 'Facebook',  prefix: 'facebook.com/',  ph: 'yourpage' },
];

// One prefixed username field: the platform domain is a fixed label; the user
// only types the part after it. NOT "full" — sits in the 2-column socials grid.
function prefixInput(id, label, prefix, ph, value, disabled){
  return `
    <div class="field">
      <label for="${id}">${esc(label)}</label>
      <div class="prefix-input">
        <span class="prefix-input-pre">${esc(prefix)}</span>
        <input id="${id}" type="text" autocapitalize="none" autocorrect="off" spellcheck="false"
               maxlength="120" value="${esc(value || '')}" placeholder="${esc(ph)}"${disabled ? ' disabled' : ''}>
      </div>
    </div>`;
}

// Extract the username from a stored full URL (for showing in a prefixed field).
function handleFromUrl(url, prefix){
  let v = (url || '').trim();
  if(!v) return '';
  v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  if(v.toLowerCase().startsWith(prefix.toLowerCase())) v = v.slice(prefix.length);
  return v.replace(/\/+$/, '');
}

// Build a full URL from a typed username. Tolerates someone pasting a whole URL.
function urlFromHandle(prefix, raw){
  let v = (raw || '').trim();
  if(!v) return null;
  v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  if(v.toLowerCase().startsWith(prefix.toLowerCase())) v = v.slice(prefix.length);
  v = v.replace(/^\/+/, '').replace(/\/+$/, '');
  return v ? 'https://' + prefix + v : null;
}

// The gold "Makers only" pill for locked studio cards.
const lockPill = `<span class="pfs-lockpill">🔒 Makers only</span>`;

// A studio card header: title + (locked → gold pill).
function studioHead(title, sub, locked){
  return `
    <div class="pfs-cardhead">
      <div>
        <h2>${esc(title)}</h2>
        ${sub ? `<p class="pfs-cardsub">${sub}</p>` : ''}
      </div>
      ${locked ? lockPill : ''}
    </div>`;
}

export function mount(el){
  let disposed = false;
  let accountDeleted = false;
  let renderedKey = null;    // `${uid}|${maker}` of the last FULL page render; 'out' = logged-out view
  let editHandler = null;    // active input/change delegate on el (removed on re-render/unmount)

  function detachEditHandler(){
    if(editHandler){
      el.removeEventListener('input', editHandler);
      el.removeEventListener('change', editHandler);
      editHandler = null;
    }
  }

  const unsub = auth.subscribeAuth(s => {
    if(disposed || accountDeleted) return;
    const uid = s.user?.id || '';
    if(!uid){
      if(renderedKey !== 'out'){
        renderedKey = 'out';
        detachEditHandler();
        el.innerHTML = `
          <div class="view-head"><h1 class="page-title">Profile</h1></div>
          <div class="panel">
            <p class="placeholder">Log in to set up your profile.</p>
            <div class="form-actions"><a class="btn-join" href="#/login">Log in</a></div>
          </div>`;
      }
      return;
    }
    if(!s.accessReady){
      // Token refreshes flap accessReady false→true (hourly + on tab refocus).
      // NEVER tear down an already-rendered page — that would wipe in-progress
      // edits. Only show the loader when nothing is rendered yet.
      if(renderedKey === null || renderedKey === 'out'){
        renderedKey = null;
        el.innerHTML = `
          <div class="view-head"><h1 class="page-title">Profile</h1></div>
          <div class="panel"><p class="placeholder">Loading your profile…</p></div>`;
      }
      return;
    }
    const key = uid + '|' + (s.approvedMaker ? 1 : 0);
    if(key === renderedKey) return;
    renderedKey = key;
    detachEditHandler();
    renderPage(s);
  });

  function renderPage(s){
  const isMaker = !!s.approvedMaker;
  spotStyles();   // .pf-spot-state is also used by the locked (non-maker) spotlight card
  let avatarUrl = s.avatarUrl || '';
  let wheelUrl = s.wheelPhotoUrl || '';
  let savedWheel = wheelUrl;   // the pointer currently stored in the DB (uploads use unique paths)
  // Only send wheel_photo_url when the DB column exists (or a new upload forces it),
  // so the page keeps working before the migration runs.
  const hasWheelCol = !!(s.profile && Object.prototype.hasOwnProperty.call(s.profile, 'wheel_photo_url'));
  let wheelTouched = false;

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Profile</h1>
      <p class="page-sub">Your account, your connection link — and the Spiritual Maker studio.</p>
    </div>

    ${isMaker ? `
    <div class="pf-maker-banner">
      <img class="pf-maker-logo" src="assets/spiritual-maker-logo.png" alt="Spiritual Maker" onerror="this.style.display='none'">
      <div class="pf-maker-eyebrow">✓ You're recognized</div>
      <p class="pf-maker-sub">Egely Wheel has recognized you as a <b>Spiritual Maker</b>. Your badge now appears across EWR Live — on the leaderboard, in your sessions, and on your connect page.</p>
    </div>` : ''}

    <div class="panel">
      <div class="panel-head">
        <h2>Basic Profile</h2>
      </div>
      <div class="pf-basic">
        <div class="pf-side">
          <div class="profile-avatar" id="pfAvatar">${avatarHtml(avatarUrl, s.displayName)}</div>
          <button type="button" class="pf-upload" id="pfUploadBtn">Upload photo</button>
          <input id="pfFile" type="file" accept="image/*" hidden>
          <span class="pf-upload-hint">JPG or PNG — resized automatically.</span>
          <label class="toggle pf-live" title="When on, others can see that you're online — and your live wheel values while you measure.">
            <input type="checkbox" id="pfLive" ${s.showOnLive ? 'checked' : ''}>
            <span class="toggle-track"><span class="toggle-knob"></span></span>
            <span class="toggle-label">Show on Live</span>
          </label>
        </div>
        <div class="pf-main">
          <div class="field">
            <label for="pfName">Display name</label>
            <input id="pfName" maxlength="60" value="${esc(s.displayName || '')}" placeholder="Your name">
          </div>
          <div class="field">
            <label for="pfCountry">Country <span class="pf-label-note">— auto-detected; shown as a flag on Live</span></label>
            <select id="pfCountry">${countryOptions(s.country)}</select>
          </div>
        </div>
      </div>
    </div>

    <div id="pfLinkPanel"></div>
    <div id="pfFollowing"></div>

    <!-- ============ SPIRITUAL MAKER STUDIO ============ -->
    <section class="pfs-band" aria-label="Spiritual Maker studio">
      <div class="pfs-band-top">
        <div>
          <div class="pfs-eyebrow">Spiritual Maker Studio</div>
          <h2 class="pfs-title">${isMaker ? 'Your maker toolkit' : 'Services for Spiritual Makers'}</h2>
          <p class="pfs-sub">${isMaker
            ? 'Everything below is live on your public connection page — your photo, your story, your links and your offer. Keep it fresh; it’s what members see first.'
            : 'Spiritual Makers get a public presence on EWR Live — a richer connection page, live visibility, voice-guided sessions and promotion tools. Everything below unlocks when you’re approved.'}</p>
        </div>
        <img class="pfs-logo" src="assets/spiritual-maker-logo.png" alt="" aria-hidden="true" onerror="this.style.display='none'">
      </div>
      <div class="pfs-chips">
        <div class="pfs-chip${isMaker ? '' : ' locked'}"><span class="ic">◎</span>Live Wall Spotlight</div>
        <div class="pfs-chip${isMaker ? '' : ' locked'}"><span class="ic">🎙</span>Voice-guided sessions</div>
        <div class="pfs-chip${isMaker ? '' : ' locked'}"><span class="ic">📸</span>Maker photo</div>
        <div class="pfs-chip${isMaker ? '' : ' locked'}"><span class="ic">🌐</span>Bio &amp; social links</div>
        <div class="pfs-chip${isMaker ? '' : ' locked'}"><span class="ic">🏷️</span>Promotion &amp; coupon</div>
      </div>
      ${isMaker ? `
      <div class="pfs-cta-row">
        <span class="pfs-unlocked">✓ Unlocked — you're an approved Spiritual Maker</span>
        <a class="pfs-features-link" href="#/spiritual-makers">Your maker features ↗</a>
      </div>` : `
      <div class="pfs-cta-row">
        <a class="pfs-cta" href="${AFFILIATE_REGISTER}" target="_blank" rel="noopener">Become a Spiritual Maker ↗</a>
        <a class="pfs-features-link" href="#/spiritual-makers">See what makers get</a>
      </div>`}
    </section>

    ${isMaker ? `<section class="panel pf-spot" id="pfSpot"></section>` : `
    <section class="panel pfs-locked">
      ${studioHead('Live Wall Spotlight', 'Stay featured on the Live wall for 7 days — people discover your connection page, sessions and offer.', true)}
      <div class="pf-spot-state off" style="margin:0">Available to approved Spiritual Makers.</div>
    </section>`}

    <section class="panel ${isMaker ? '' : 'pfs-locked'}" id="pfVoiceCard">
      ${studioHead('Voice-guided sessions', isMaker
        ? 'Host any session or race and go live with your voice — members hear your guidance while they measure, and can listen again afterwards.'
        : 'Makers host sessions and races with their live voice — members hear the guidance while they measure, and can listen again afterwards.', !isMaker)}
      <div class="pfs-voice-row">
        <span class="voice-chip">🎙 Live Voice</span>
        <span class="pfs-voice-note">${isMaker
          ? 'No setup needed — the “Go live with your voice” card appears in every session or race you host.'
          : 'Included automatically for approved makers — no setup needed.'}</span>
      </div>
    </section>

    <section class="panel ${isMaker ? '' : 'pfs-locked'}">
      ${studioHead('Maker photo', 'A photo of you holding your Egely Wheel — shown on your connection page. It’s the strongest trust signal a maker can give.', !isMaker)}
      <div class="pfs-wheel">
        <div class="pfs-wheel-prev" id="pfWheelPrev">${wheelUrl
          ? `<img src="${esc(wheelUrl)}" alt="You holding your Egely Wheel">`
          : `<span class="pfs-wheel-empty">📸<br>No photo yet</span>`}</div>
        <div class="pfs-wheel-side">
          <p class="pfs-wheel-tip">Natural light, wheel clearly visible in your hands, friendly look into the camera. Portrait orientation works best.</p>
          <button type="button" class="pf-upload" id="pfWheelBtn"${isMaker ? '' : ' disabled'}>Upload maker photo</button>
          <input id="pfWheelFile" type="file" accept="image/*" hidden>
          ${isMaker && wheelUrl ? `<button type="button" class="pfs-wheel-remove" id="pfWheelRemove">Remove photo</button>` : ''}
          <span class="pf-upload-hint">JPG or PNG — resized automatically.</span>
        </div>
      </div>
    </section>

    <section class="panel ${isMaker ? '' : 'pfs-locked'}">
      ${studioHead('Short bio', 'A few words about you and your practice — shown on your connection page.', !isMaker)}
      <div class="field">
        <textarea id="pfBio" aria-label="Short bio" maxlength="400" rows="3" placeholder="A few words about you — shown on your connection page."${isMaker ? '' : ' disabled'}>${esc(s.bio || '')}</textarea>
      </div>
    </section>

    <section class="panel ${isMaker ? '' : 'pfs-locked'}">
      ${studioHead('Social links', 'All optional — just your username, we build the link.', !isMaker)}
      <div class="pf-socials">
        ${urlInput('pfWebsite', 'Website', 'https://yoursite.com', s.website, !isMaker)}
        ${prefixInput('pfInsta', 'Instagram', 'instagram.com/', 'yourhandle', handleFromUrl(s.instagram, 'instagram.com/'), !isMaker)}
        ${prefixInput('pfYt', 'YouTube', 'youtube.com/', '@yourchannel', handleFromUrl(s.youtube, 'youtube.com/'), !isMaker)}
        ${prefixInput('pfTt', 'TikTok', 'tiktok.com/', '@yourhandle', handleFromUrl(s.tiktok, 'tiktok.com/'), !isMaker)}
        ${prefixInput('pfFb', 'Facebook', 'facebook.com/', 'yourpage', handleFromUrl(s.facebook, 'facebook.com/'), !isMaker)}
      </div>
    </section>

    <section class="panel ${isMaker ? '' : 'pfs-locked'}">
      ${studioHead('Promotion', 'Your affiliate link and coupon code power the offer on your connection page.', !isMaker)}
      <div class="pf-promo">
        ${urlInput('pfAff', 'Affiliate link', 'https://egelywheel.com/?ref=you', s.affiliateLink, !isMaker)}
        <div class="field">
          <label for="pfCoupon">Coupon code</label>
          <input id="pfCoupon" maxlength="40" value="${esc(s.couponCode || '')}" placeholder="e.g. SPIRIT10"${isMaker ? '' : ' disabled'}>
        </div>
      </div>
    </section>
    <!-- ============ /SPIRITUAL MAKER STUDIO ============ -->

    <div class="panel">
      <h2>Measurement marks</h2>
      <p class="page-sub" style="margin:-8px 0 16px">Every saved measurement carries one of these.</p>
      <div class="verify-help">
        <div class="verify-row">
          <span class="verify-mark"><span class="v-badge verified">✓ Verified</span></span>
          <div class="verify-body">
            <div class="verify-title">Verified measurement</div>
            <p>Your wheel turned smoothly and steadily — the reading counts as genuine, unlocks the verification badges and raises your Verified score.</p>
          </div>
        </div>
        <div class="verify-row">
          <span class="verify-mark"><span class="v-badge unverified">unverified</span></span>
          <div class="verify-body">
            <div class="verify-title">Unverified measurement</div>
            <p>The reading was not steady — either the value swung around too much, or the wheel signal dropped for too long during the measurement. It is still saved and counts toward your overall progress — it just does not earn the verification marks.</p>
          </div>
        </div>
      </div>
    </div>

    <section class="panel pf-danger">
      <h2>Danger zone</h2>
      <p class="pf-danger-sub">Deleting your account removes your login, profile, photos, achievements and connections — permanently. Your past session and race results stay on the boards, but under an anonymous name that can't be traced back to you. This cannot be undone.</p>
      <button type="button" class="pf-danger-btn" id="pfDelToggle">Delete my account…</button>
      <div class="pf-danger-confirm" id="pfDelZone" hidden>
        <p class="pf-danger-warn" id="pfDelWarn">Last check. Type your email address (<b>${esc(s.email || '')}</b>) to confirm:</p>
        <div class="pf-danger-row">
          <input id="pfDelEmail" type="email" autocomplete="off" placeholder="your@email.com"
                 aria-label="Confirm your email address to delete your account" aria-describedby="pfDelWarn">
          <button type="button" class="pf-danger-final" id="pfDelGo" disabled>Permanently delete my account</button>
        </div>
        <span class="form-msg" id="pfDelMsg"></span>
      </div>
    </section>

    <div class="pf2-savebar" id="pfBar">
      <span class="form-msg" id="pfMsg">You have unsaved changes.</span>
      <button id="pfSave">Save profile</button>
    </div>`;

  const $ = id => el.querySelector('#' + id);
  const msg = $('pfMsg');
  const bar = $('pfBar');
  let dirty = false;
  let hideTimer = null;

  function showBar(text){
    if(hideTimer){ clearTimeout(hideTimer); hideTimer = null; }
    msg.className = 'form-msg';
    msg.textContent = text || 'You have unsaved changes.';
    bar.classList.add('show');
  }
  function markDirty(){
    dirty = true;
    if(!bar.classList.contains('show')) showBar();
  }

  // Any edit in a live (non-disabled) field surfaces the sticky save bar.
  // The danger zone + readonly link input are excluded — they never save via the
  // bar. Registered through detachEditHandler-managed slots so re-renders and
  // unmount never leave stale delegates on the router-shared view element.
  function onEdit(e){
    const t = e.target;
    if(!t || !t.matches || !t.matches('input, textarea, select')) return;
    if(t.disabled || t.readOnly) return;
    if(t.closest('.pf-danger')) return;
    if(t.id === 'pfLink' || t.type === 'file') return;
    markDirty();
  }
  detachEditHandler();
  el.addEventListener('input', onEdit);
  el.addEventListener('change', onEdit);
  editHandler = onEdit;

  // ---- Live Wall Spotlight (approved Spiritual Makers only) -----------------
  // A maker can choose to stay featured on the Live wall for 7 days. It is an
  // honest "featured" placement, NOT a fake online status — it lapses on its own
  // (encouraging a return visit), and never claims presence the maker doesn't have.
  if(isMaker){
    const spotEl = $('pfSpot');
    let spotUntil = s.featuredUntil || null;
    const fmtSpot = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    function renderSpot(){
      const active = spotUntil && new Date(spotUntil).getTime() > Date.now();
      const expired = spotUntil && !active;
      let body, actions;
      if(active){
        body = `<div class="pf-spot-state on"><span class="pf-spot-dot"></span>Featured on Live until <b>${esc(fmtSpot(spotUntil))}</b></div>`;
        actions = `<button type="button" class="btn-secondary" data-spot-extend>Extend 7 days</button>
          <button type="button" class="pf-spot-off" data-spot-off>Turn off</button>`;
      } else {
        body = expired
          ? `<div class="pf-spot-state off amber">Your Live spotlight expired. Turn it on again to stay discoverable.</div>`
          : `<div class="pf-spot-state off">Not currently featured on Live.</div>`;
        actions = `<button type="button" class="btn-join" data-spot-on>Turn on for 7 days</button>`;
      }
      spotEl.innerHTML = `
        <div class="pfs-cardhead">
          <div>
            <h2>Live Wall Spotlight</h2>
            <p class="pfs-cardsub">Stay visible on the Live wall for 7 days. People can discover your connection page, sessions, coupon and offer.</p>
          </div>
        </div>
        ${body}
        <div class="pf-spot-actions">${actions}</div>
        <p class="pf-spot-note">Spotlight does not mark you as online. Your real online and measuring status is shown separately.</p>
        <span class="form-msg pf-spot-msg" id="pfSpotMsg"></span>`;
    }

    async function setSpot(until){
      spotEl.querySelectorAll('button').forEach(b => b.disabled = true);
      const setM = (t, cls) => { const m = $('pfSpotMsg'); if(m){ m.className = 'form-msg pf-spot-msg ' + (cls || ''); m.textContent = t; } };
      setM('Saving…');
      const { error } = await auth.saveProfile({ live_featured_until: until });
      if(error){ setM('Error: ' + error.message, 'err'); spotEl.querySelectorAll('button').forEach(b => b.disabled = false); return; }
      spotUntil = until;
      renderSpot();
      setM(until ? "You're featured on Live." : 'Spotlight turned off.', 'ok');
    }

    spotEl.addEventListener('click', (e) => {
      if(e.target.closest('[data-spot-on], [data-spot-extend]')) setSpot(new Date(Date.now() + 7 * 864e5).toISOString());
      else if(e.target.closest('[data-spot-off]')) setSpot(null);
    });
    renderSpot();
  }

  // ---- Avatar upload ---------------------------------------------------------
  $('pfUploadBtn').addEventListener('click', () => $('pfFile').click());
  $('pfFile').addEventListener('change', async () => {
    const file = $('pfFile').files[0];
    if(!file) return;
    showBar('Uploading photo…');
    const { url, error } = await auth.uploadAvatar(file);
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Upload error: ' + error.message; return; }
    avatarUrl = url;
    $('pfAvatar').innerHTML = avatarHtml(avatarUrl, $('pfName').value);
    dirty = true;
    msg.className = 'form-msg ok'; msg.textContent = 'Photo ready — click Save profile.';
  });

  // ---- Maker wheel photo upload ----------------------------------------------
  // Uploads go to a UNIQUE path (wheel-<ts>.jpg), so the currently saved photo is
  // never overwritten before Save; superseded files are cleaned up best-effort.
  if(isMaker){
    $('pfWheelBtn').addEventListener('click', () => $('pfWheelFile').click());
    $('pfWheelFile').addEventListener('change', async () => {
      const file = $('pfWheelFile').files[0];
      if(!file) return;
      showBar('Uploading maker photo…');
      const prevUnsaved = (wheelTouched && wheelUrl && wheelUrl !== savedWheel) ? wheelUrl : null;
      const { url, error } = await auth.uploadWheelPhoto(file);
      if(error){ msg.className = 'form-msg err'; msg.textContent = 'Upload error: ' + error.message; return; }
      if(prevUnsaved) auth.removeWheelObject(prevUnsaved);   // replaced before ever being saved
      wheelUrl = url;
      wheelTouched = true;
      dirty = true;
      $('pfWheelPrev').innerHTML = `<img src="${esc(wheelUrl)}" alt="You holding your Egely Wheel">`;
      msg.className = 'form-msg ok'; msg.textContent = 'Maker photo ready — click Save profile.';
    });
    const rm = $('pfWheelRemove');
    if(rm) rm.addEventListener('click', () => {
      if(wheelTouched && wheelUrl && wheelUrl !== savedWheel) auth.removeWheelObject(wheelUrl);
      wheelUrl = '';
      wheelTouched = true;
      dirty = true;
      $('pfWheelPrev').innerHTML = `<span class="pfs-wheel-empty">📸<br>No photo yet</span>`;
      rm.remove();
      showBar('Photo removed — click Save profile.');
    });
  }

  // ---- Save (sticky bar) -------------------------------------------------------
  // Full-URL fields (validated as URLs). Socials are handled separately as
  // username-only inputs below.
  const URL_FIELDS = [
    ['website',        'pfWebsite', 'Website'],
    ['affiliate_link', 'pfAff',     'Affiliate link'],
  ];

  $('pfSave').addEventListener('click', async () => {
    const display_name = $('pfName').value.trim();
    if(!display_name){ msg.className = 'form-msg err'; msg.textContent = 'Enter a display name.'; return; }

    const payload = {
      display_name, avatar_url: avatarUrl || null,
      is_practitioner: true,   // everyone keeps a connection link / can gather members
      show_on_live: $('pfLive').checked,
      country: $('pfCountry').value || null,
    };

    // Maker-only fields go into the payload ONLY for approved makers, so a
    // regular member's save can never wipe previously stored studio data.
    if(isMaker){
      payload.bio = $('pfBio').value.trim() || null;
      payload.coupon_code = $('pfCoupon').value.trim() || null;
      for(const [col, id, label] of URL_FIELDS){
        const r = cleanUrl($(id).value);
        if(r.error){
          msg.className = 'form-msg err';
          msg.textContent = `Please enter a valid URL for ${label}, or leave it empty.`;
          $(id).focus();
          return;
        }
        payload[col] = r.value;
        $(id).value = r.value || '';   // reflect the normalised value (adds https://)
      }
      for(const sf of SOCIAL){
        payload[sf.col] = urlFromHandle(sf.prefix, $(sf.id).value);
        $(sf.id).value = handleFromUrl(payload[sf.col], sf.prefix);
      }
      if(hasWheelCol || wheelTouched){
        payload.wheel_photo_url = wheelUrl || null;
      }
    }

    $('pfSave').disabled = true; msg.className = 'form-msg'; msg.textContent = 'Saving…';
    const { error } = await auth.saveProfile(payload);
    $('pfSave').disabled = false;
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Error: ' + error.message; return; }
    // The new pointer is stored — clean up the superseded wheel photo file.
    if(isMaker && 'wheel_photo_url' in payload && savedWheel && savedWheel !== wheelUrl){
      auth.removeWheelObject(savedWheel);
    }
    if(isMaker && 'wheel_photo_url' in payload) savedWheel = wheelUrl;
    dirty = false;
    msg.className = 'form-msg ok'; msg.textContent = 'Profile saved.';
    hideTimer = setTimeout(() => { if(!dirty) bar.classList.remove('show'); }, 1800);
    renderLinkPanel();
  });

  // ---- Danger zone --------------------------------------------------------------
  $('pfDelToggle').addEventListener('click', () => {
    const zone = $('pfDelZone');
    zone.hidden = !zone.hidden;
    if(!zone.hidden) $('pfDelEmail').focus();
  });
  $('pfDelEmail').addEventListener('input', () => {
    const match = $('pfDelEmail').value.trim().toLowerCase() === (s.email || '').toLowerCase();
    $('pfDelGo').disabled = !match;
  });
  $('pfDelGo').addEventListener('click', async () => {
    const dm = $('pfDelMsg');
    $('pfDelGo').disabled = true;
    dm.className = 'form-msg'; dm.textContent = 'Deleting your account…';
    const { error } = await auth.deleteAccount();
    if(error){
      dm.className = 'form-msg err';
      dm.textContent = 'Error: ' + error.message;
      $('pfDelGo').disabled = false;
      return;
    }
    accountDeleted = true;   // stop auth re-renders from replacing the farewell
    detachEditHandler();
    el.innerHTML = `
      <div class="view-head"><h1 class="page-title">Account deleted</h1></div>
      <div class="panel">
        <p class="placeholder">Your account has been deleted. Your past results remain under an anonymous name. Take care! 👋</p>
      </div>`;
    // The local session is dropped AFTER the farewell — signing out immediately
    // would trigger app.js's global logout redirect and replace this screen.
    setTimeout(async () => {
      await auth.finalizeAccountDeletion();
      location.hash = '#/home';
    }, 2200);
  });

  // ---- Everyone's connection link ----------------------------------------------
  function renderLinkPanel(){
    const a = auth.getState();
    const panel = $('pfLinkPanel');
    if(!panel) return;
    if(!a.isPractitioner || !a.practitionerHandle){ panel.innerHTML = ''; return; }
    const url = connectUrl(a.practitionerHandle);
    panel.innerHTML = `
      <div class="panel">
        <h2>Your connection link</h2>
        <p class="page-sub" style="margin:2px 0 12px">Everyone can gather followers. Share this link — by message, QR code, or social media — and people who open it can connect with you and follow your journey.</p>
        <div class="link-row">
          <input id="pfLink" class="link-input" readonly value="${esc(url)}">
          <button class="btn-secondary" id="pfCopy">Copy</button>
        </div>
        <span class="form-msg" id="pfCopyMsg"></span>
        <div class="qr-block">
          <div class="qr-img">${qrSvg(url, { scale: 5, margin: 3 })}</div>
          <div class="qr-side">
            <p class="qr-cap">Scan to open your connection page. Print it on packaging, business cards or slides.</p>
            <div class="qr-actions">
              <button class="btn-secondary" id="pfPreview">Preview your page ↗</button>
              <button class="btn-secondary" id="pfQrDl">Download QR (PNG)</button>
            </div>
          </div>
        </div>
      </div>`;
    $('pfCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); }
      catch { $('pfLink').select(); document.execCommand('copy'); }
      $('pfCopyMsg').className = 'form-msg ok'; $('pfCopyMsg').textContent = 'Copied.';
    });
    $('pfPreview').addEventListener('click', () => window.open(url, '_blank', 'noopener'));
    $('pfQrDl').addEventListener('click', () => {
      qrCanvas(url, { scale: 12, margin: 4 }).toBlob(blob => {
        const u = URL.createObjectURL(blob);
        const a2 = document.createElement('a');
        a2.href = u; a2.download = 'egely-connection-qr.png';
        document.body.appendChild(a2); a2.click(); a2.remove();
        setTimeout(() => URL.revokeObjectURL(u), 2000);
      });
    });
  }

  // ---- Spiritual Makers following me (the member's control) --------------------
  async function renderFollowing(){
    const panel = $('pfFollowing');
    const list = await auth.getMyPractitioners();
    if(!panel || !panel.isConnected) return;   // navigated away while loading
    if(!list.length){ panel.innerHTML = ''; return; }
    panel.innerHTML = `
      <div class="panel">
        <h2>Following your journey</h2>
        <p class="page-sub" style="margin:2px 0 12px">These Spiritual Makers can see your measurements. You're in control — end any connection anytime.</p>
        <div class="following-list">
          ${list.map(p => `
            <div class="following-row" data-id="${esc(p.id)}">
              <div class="following-avatar">${avatarHtml(p.avatar_url, p.display_name)}</div>
              <div class="following-name">${esc(p.display_name || 'Spiritual Maker')}</div>
              <button class="btn-secondary following-end" data-id="${esc(p.id)}">End connection</button>
            </div>`).join('')}
        </div>
      </div>`;
    panel.querySelectorAll('.following-end').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const { error } = await auth.disconnectPractitioner(btn.dataset.id);
        if(error){ btn.disabled = false; return; }
        renderFollowing();
      });
    });
  }

  renderLinkPanel();
  renderFollowing();
  }

  return () => { disposed = true; unsub(); detachEditHandler(); };
}
