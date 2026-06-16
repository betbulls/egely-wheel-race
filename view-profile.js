import * as auth from './auth.js';
import { qrSvg, qrCanvas } from './qrcode.js';
import { COUNTRY_CODES, countryName } from './countries.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
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
// Layout (columns/gaps) comes from the surrounding grid, not inline margins.
function urlInput(id, label, placeholder, value){
  return `
    <div class="field full">
      <label for="${id}">${esc(label)}</label>
      <input id="${id}" type="url" inputmode="url" maxlength="200" value="${esc(value || '')}" placeholder="${esc(placeholder)}">
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
function prefixInput(id, label, prefix, ph, value){
  return `
    <div class="field">
      <label for="${id}">${esc(label)}</label>
      <div class="prefix-input">
        <span class="prefix-input-pre">${esc(prefix)}</span>
        <input id="${id}" type="text" autocapitalize="none" autocorrect="off" spellcheck="false"
               maxlength="120" value="${esc(value || '')}" placeholder="${esc(ph)}">
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

export function mount(el){
  const s = auth.getState();
  if(!s.user){
    el.innerHTML = `
      <div class="view-head"><h1 class="page-title">Profile</h1></div>
      <div class="panel">
        <p class="placeholder">Log in to set up your profile.</p>
        <div class="form-actions"><a class="btn-join" href="#/login">Log in</a></div>
      </div>`;
    return () => {};
  }

  let avatarUrl = s.avatarUrl || '';

  el.innerHTML = `
    <div class="view-head">
      <h1 class="page-title">Profile</h1>
      <p class="page-sub">Your Spiritual Maker profile — name, photo, links and promotion.</p>
    </div>

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
            <label for="pfBio">Short bio</label>
            <textarea id="pfBio" maxlength="400" rows="3" placeholder="A few words about you — shown on your connection page.">${esc(s.bio || '')}</textarea>
          </div>
          <div class="field">
            <label for="pfCountry">Country <span class="pf-label-note">— auto-detected; shown as a flag on Live</span></label>
            <select id="pfCountry">${countryOptions(s.country)}</select>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <h2>Social Links</h2>
      <p class="page-sub" style="margin:-8px 0 14px">All optional — just your username, we build the link.</p>
      <div class="pf-socials">
        ${urlInput('pfWebsite', 'Website', 'https://yoursite.com', s.website)}
        ${prefixInput('pfInsta', 'Instagram', 'instagram.com/', 'yourhandle', handleFromUrl(s.instagram, 'instagram.com/'))}
        ${prefixInput('pfYt', 'YouTube', 'youtube.com/', '@yourchannel', handleFromUrl(s.youtube, 'youtube.com/'))}
        ${prefixInput('pfTt', 'TikTok', 'tiktok.com/', '@yourhandle', handleFromUrl(s.tiktok, 'tiktok.com/'))}
        ${prefixInput('pfFb', 'Facebook', 'facebook.com/', 'yourpage', handleFromUrl(s.facebook, 'facebook.com/'))}
      </div>
    </div>

    <div class="panel">
      <h2>Promotion</h2>
      <p class="page-sub" style="margin:-8px 0 14px">Optional — used later to support your recommendations.</p>
      <div class="pf-promo">
        ${urlInput('pfAff', 'Affiliate link', 'https://egelywheel.com/?ref=you', s.affiliateLink)}
        <div class="field">
          <label for="pfCoupon">Coupon code</label>
          <input id="pfCoupon" maxlength="40" value="${esc(s.couponCode || '')}" placeholder="e.g. SPIRIT10">
        </div>
      </div>
    </div>

    <div class="pf-savebar">
      <span class="form-msg" id="pfMsg"></span>
      <button id="pfSave">Save profile</button>
    </div>

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
            <p>The value swung around too much to be a steady reading. It is still saved and counts toward your overall progress — it just does not earn the verification marks.</p>
          </div>
        </div>
      </div>
    </div>

    <div id="pfLinkPanel"></div>
    <div id="pfFollowing"></div>`;

  const $ = id => el.querySelector('#' + id);
  const msg = $('pfMsg');

  // Custom upload pill — the native input stays (hidden) and keeps its logic.
  $('pfUploadBtn').addEventListener('click', () => $('pfFile').click());

  $('pfFile').addEventListener('change', async () => {
    const file = $('pfFile').files[0];
    if(!file) return;
    msg.className = 'form-msg'; msg.textContent = 'Uploading photo…';
    const { url, error } = await auth.uploadAvatar(file);
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Upload error: ' + error.message; return; }
    avatarUrl = url;
    $('pfAvatar').innerHTML = avatarHtml(avatarUrl, $('pfName').value);
    msg.className = 'form-msg ok'; msg.textContent = 'Photo ready — click Save profile.';
  });

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
      bio: $('pfBio').value.trim() || null,
      is_practitioner: true,   // everyone can be a Spiritual Maker / gather members
      coupon_code: $('pfCoupon').value.trim() || null,
      show_on_live: $('pfLive').checked,
      country: $('pfCountry').value || null,
    };
    // Validate + normalise every URL field (all optional; empty is fine).
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
    // Socials: username in → full URL stored. Reflect the cleaned handle back.
    for(const sf of SOCIAL){
      payload[sf.col] = urlFromHandle(sf.prefix, $(sf.id).value);
      $(sf.id).value = handleFromUrl(payload[sf.col], sf.prefix);
    }

    $('pfSave').disabled = true; msg.className = 'form-msg'; msg.textContent = 'Saving…';
    const { error } = await auth.saveProfile(payload);
    $('pfSave').disabled = false;
    if(error){ msg.className = 'form-msg err'; msg.textContent = 'Error: ' + error.message; return; }
    msg.className = 'form-msg ok'; msg.textContent = 'Profile saved.';
    renderLinkPanel();
  });

  // ---- Practitioner's own connection link ----------------------------------
  function renderLinkPanel(){
    const a = auth.getState();
    const panel = $('pfLinkPanel');
    if(!a.isPractitioner || !a.practitionerHandle){ panel.innerHTML = ''; return; }
    const url = connectUrl(a.practitionerHandle);
    panel.innerHTML = `
      <div class="panel">
        <h2>Your connection link</h2>
        <p class="page-sub" style="margin:2px 0 12px">Share this with your members — by link, QR code, or social media. When they open it, they can connect with you.</p>
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

  // ---- Practitioners following me (the client's control) -------------------
  async function renderFollowing(){
    const panel = $('pfFollowing');
    const list = await auth.getMyPractitioners();
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

  return () => {};
}
