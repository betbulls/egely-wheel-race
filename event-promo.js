// event-promo.js — the Spiritual Maker's announcement toolkit (G3).
//
// While a maker's session/race has not started yet, the practice room shows a
// "Promote" card with TWO ready-made announcement images (1080×1080 feed +
// 1080×1920 story), drawn on canvas from the maker's wheel photo (avatar
// fallback), the event name, the exact US-format date/time WITH timezone and
// the event link. One tap shares them through the native share sheet (that is
// how they reach Instagram / TikTok / Facebook on a phone); desktop gets
// downloads, a Facebook share link and a copy-link button.
//
// Maker-only by design (Csaba: this is a maker perk — the badge rules apply);
// the card renders only for the APPROVED-maker host of an upcoming event.

import * as auth from './auth.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- date/time — ALWAYS US Eastern (Csaba, 2026-07-12: most influencers are
// American; a GMT+2 stamp means nothing to them. Even a Hungarian maker's
// event is announced in US time, with the zone named on the image.)
function fmtDateLine(ms){
  const d = new Date(ms);
  const tz = { timeZone: 'America/New_York' };
  const day = d.toLocaleDateString('en-US', { ...tz, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { ...tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });   // "3:30 PM EDT"
  return { day, time, line: `${day} · ${time}` };
}

// ---- canvas helpers ---------------------------------------------------------
const loadImg = url => new Promise(res => {
  if(!url) return res(null);
  const im = new Image();
  im.crossOrigin = 'anonymous';                       // storage avatars need it for a clean (untainted) canvas
  im.onload = () => res(im);
  im.onerror = () => res(null);
  im.src = url;
});

// object-fit:cover with a slight top bias (faces live in the upper third)
function drawCover(ctx, img, x, y, w, h, r){
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r || 0); ctx.clip();
  const ir = img.width / img.height, fr = w / h;
  let sw, sh, sx, sy;
  if(ir > fr){ sh = img.height; sw = sh * fr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / fr; sx = 0; sy = (img.height - sh) * 0.15; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function wrapLines(ctx, text, maxW, maxLines){
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for(const w of words){
    const t = cur ? cur + ' ' + w : w;
    if(ctx.measureText(t).width <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if(cur) lines.push(cur);
  if(lines.length > maxLines){
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return cut;
  }
  return lines;
}

function grad(ctx, x0, y0, x1, y1){
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#37dbff'); g.addColorStop(1, '#5230da');
  return g;
}

function stageBg(ctx, W, H){
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b1b28'); g.addColorStop(1, '#040f19');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  let r = ctx.createRadialGradient(W * 0.82, -80, 0, W * 0.82, -80, W * 0.75);
  r.addColorStop(0, 'rgba(82,48,218,.34)'); r.addColorStop(1, 'rgba(82,48,218,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  r = ctx.createRadialGradient(W * 0.08, H * 0.12, 0, W * 0.08, H * 0.12, W * 0.5);
  r.addColorStop(0, 'rgba(55,219,255,.10)'); r.addColorStop(1, 'rgba(55,219,255,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
}

function brandRow(ctx, W, y, kindLabel){
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 40px Montserrat, sans-serif';
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
  ctx.fillText('EWR', 56, y);
  const w1 = ctx.measureText('EWR ').width;
  ctx.fillStyle = grad(ctx, 56 + w1, y - 30, 56 + w1 + 110, y);
  ctx.fillText('LIVE', 56 + w1, y);
  // gold kind pill, right-aligned
  ctx.font = '700 24px Inter, sans-serif';
  try{ ctx.letterSpacing = '3px'; }catch(_){}
  const label = '●  ' + kindLabel;
  const tw = ctx.measureText(label).width;
  const px = W - 56 - tw - 48, py = y - 36, ph = 52;
  ctx.beginPath(); ctx.roundRect(px, py, tw + 48, ph, 26);
  ctx.fillStyle = 'rgba(232,184,75,.12)'; ctx.fill();
  ctx.strokeStyle = 'rgba(232,184,75,.55)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#e8b84b';
  ctx.fillText(label, px + 24, py + 35);
  try{ ctx.letterSpacing = '0px'; }catch(_){}
}

function linkChip(ctx, cx, y, text, center){
  // Measure the WHOLE label — bolt icon included (the icon pushed the text
  // past the pill's edge when only `text` was measured; Csaba caught it).
  const label = '⚡ ' + text;
  ctx.font = '600 26px Inter, sans-serif';
  let size = 26, tw = ctx.measureText(label).width;
  while(tw > 620 && size > 18){ size -= 2; ctx.font = `600 ${size}px Inter, sans-serif`; tw = ctx.measureText(label).width; }
  const w = tw + 56, h = 58;
  const x = center ? cx - w / 2 : cx;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 29);
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#9fe8ff'; ctx.textAlign = 'left';
  ctx.fillText(label, x + 28, y + 39);
  return h;
}

function ctaPill(ctx, cx, y, text, center){
  ctx.font = '700 32px Montserrat, sans-serif';
  const tw = ctx.measureText(text).width;
  const w = tw + 92, h = 76;
  const x = center ? cx - w / 2 : cx;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 38);
  ctx.fillStyle = grad(ctx, x, y, x + w, y + h); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
  ctx.fillText(text, x + 46, y + 50);
  return h;
}

function avatarDisc(ctx, img, name, cx, cy, R){
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = grad(ctx, cx - R, cy - R, cx + R, cy + R); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, R - 6, 0, Math.PI * 2); ctx.clip();
  if(img){
    const s = Math.max((R * 2 - 12) / img.width, (R * 2 - 12) / img.height);
    ctx.drawImage(img, cx - img.width * s / 2, cy - img.height * s / 2, img.width * s, img.height * s);
  } else {
    ctx.fillStyle = '#132635'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.fillStyle = '#cfe3ee'; ctx.font = `700 ${Math.round(R * 0.9)}px Montserrat, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((name || '?').charAt(0).toUpperCase(), cx, cy + 4);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

// ---- the two compositions ---------------------------------------------------
function drawSquare(canvas, info, photo, avatar){
  const W = 1080, H = 1080;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  stageBg(ctx, W, H);
  const hasPhoto = !!photo;
  const leftW = hasPhoto ? 500 : 800;
  const lx = 56;

  if(hasPhoto){
    drawCover(ctx, photo, 600, 176, 424, 800, 30);
    ctx.beginPath(); ctx.roundRect(600, 176, 424, 800, 30);
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  // hairline + brand on top of everything
  ctx.fillStyle = grad(ctx, 0, 0, W, 0); ctx.fillRect(0, 0, W, 10);
  brandRow(ctx, W, 96, info.kind === 'race' ? 'LIVE RACE' : 'LIVE SESSION');

  let y = 268;
  ctx.textAlign = 'left';
  ctx.font = '700 27px Inter, sans-serif';
  try{ ctx.letterSpacing = '6px'; }catch(_){}
  ctx.fillStyle = '#e8b84b';
  ctx.fillText('JOIN ME LIVE', lx, y);
  try{ ctx.letterSpacing = '0px'; }catch(_){}
  // no wheel photo → a friendly avatar disc keeps the right side alive
  if(!hasPhoto) avatarDisc(ctx, avatar, info.host, 810, 480, 190);

  y += 62;
  ctx.font = '700 64px Montserrat, sans-serif';
  let lines = wrapLines(ctx, info.title, leftW, 3);
  if(lines.length === 3){ ctx.font = '700 56px Montserrat, sans-serif'; lines = wrapLines(ctx, info.title, leftW, 3); }
  ctx.fillStyle = '#f4f7f9';
  for(const ln of lines){ ctx.fillText(ln, lx, y); y += (lines.length === 3 ? 66 : 76); }

  y += 8;
  ctx.font = '500 30px Inter, sans-serif'; ctx.fillStyle = '#8da0ab';
  ctx.fillText('Hosted by', lx, y);
  const hw = ctx.measureText('Hosted by ').width;
  ctx.font = '600 30px Inter, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(info.host, lx + hw, y);

  y += 74;
  ctx.font = '700 36px Montserrat, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(info.when.day, lx, y);
  y += 52;
  ctx.font = '700 36px Montserrat, sans-serif'; ctx.fillStyle = '#e8b84b';
  ctx.fillText(info.when.time, lx, y);

  y += 74;
  linkChip(ctx, lx, y - 40, info.shortUrl, false);

  ctaPill(ctx, lx, 828, info.kind === 'race' ? 'Race with me →' : 'Join me live →', false);

  ctx.font = '500 25px Inter, sans-serif'; ctx.fillStyle = '#8da0ab'; ctx.textAlign = 'left';
  ctx.fillText('Watching is free · bring your Egely Wheel to measure along', lx, 1010);
}

function drawStory(canvas, info, photo, avatar){
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  stageBg(ctx, W, H);
  const hasPhoto = !!photo;

  if(hasPhoto){
    drawCover(ctx, photo, 0, 0, W, 980, 0);
    const fade = ctx.createLinearGradient(0, 620, 0, 980);
    fade.addColorStop(0, 'rgba(11,27,40,0)'); fade.addColorStop(1, '#0b1b28');
    ctx.fillStyle = fade; ctx.fillRect(0, 620, W, 360);
    // dark scrim under the brand row — the wordmark must survive a bright photo
    const top = ctx.createLinearGradient(0, 0, 0, 210);
    top.addColorStop(0, 'rgba(4,15,25,.66)'); top.addColorStop(1, 'rgba(4,15,25,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, 210);
  } else {
    avatarDisc(ctx, avatar, info.host, W / 2, 460, 210);
  }
  ctx.fillStyle = grad(ctx, 0, 0, W, 0); ctx.fillRect(0, 0, W, 12);
  brandRow(ctx, W, 104, info.kind === 'race' ? 'LIVE RACE' : 'LIVE SESSION');

  ctx.textAlign = 'center';
  let y = hasPhoto ? 1078 : 800;
  ctx.font = '700 30px Inter, sans-serif';
  try{ ctx.letterSpacing = '7px'; }catch(_){}
  ctx.fillStyle = '#e8b84b';
  ctx.fillText('JOIN ME LIVE', W / 2, y);
  try{ ctx.letterSpacing = '0px'; }catch(_){}

  y += 96;
  ctx.font = '700 84px Montserrat, sans-serif';
  let lines = wrapLines(ctx, info.title, 920, 3);
  if(lines.length === 3){ ctx.font = '700 70px Montserrat, sans-serif'; lines = wrapLines(ctx, info.title, 920, 3); }
  ctx.fillStyle = '#f4f7f9';
  for(const ln of lines){ ctx.fillText(ln, W / 2, y); y += (lines.length === 3 ? 84 : 98); }

  y += 6;
  ctx.font = '500 34px Inter, sans-serif'; ctx.fillStyle = '#8da0ab';
  ctx.fillText('Hosted by ' + info.host, W / 2, y);

  y += 92;
  ctx.font = '700 44px Montserrat, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(info.when.day, W / 2, y);
  y += 62;
  ctx.fillStyle = '#e8b84b';
  ctx.fillText(info.when.time, W / 2, y);

  y += 66;
  linkChip(ctx, W / 2, y, info.shortUrl, true);

  ctaPill(ctx, W / 2, y + 130, info.kind === 'race' ? 'Race with me →' : 'Join me live →', true);

  ctx.font = '500 28px Inter, sans-serif'; ctx.fillStyle = '#8da0ab'; ctx.textAlign = 'center';
  ctx.fillText('Watching is free · live.egelywheel.com', W / 2, 1848);
}

// ---- styles -----------------------------------------------------------------
let cssDone = false;
function injectCss(){
  if(cssDone || document.getElementById('eventPromoStyles')){ cssDone = true; return; }
  cssDone = true;
  const s = document.createElement('style');
  s.id = 'eventPromoStyles';
  s.textContent = `
.ep-card{margin:12px 0;background:var(--ewr-surface,#fff);border:1px solid var(--ewr-border,#dfe3e6);border-radius:18px;
  padding:16px 18px;box-shadow:0 10px 28px rgba(1,22,36,.06)}
.ep-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ep-head b{font:600 14.5px Montserrat,Inter,sans-serif;color:var(--ewr-text,#011624)}
.ep-badge{padding:3px 10px;border-radius:999px;font:700 10px Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;
  border:1px solid rgba(184,134,11,.4);color:#8a6508;background:linear-gradient(135deg,rgba(232,184,75,.16),rgba(232,184,75,.06))}
.ep-sub{margin:4px 0 12px;font:500 12.5px Inter,sans-serif;color:var(--ewr-text-muted,#67737c)}
.ep-previews{display:flex;gap:14px;flex-wrap:wrap}
.ep-previews figure{margin:0;display:flex;flex-direction:column;gap:6px}
.ep-previews canvas{display:block;border-radius:12px;box-shadow:0 10px 26px rgba(1,22,36,.18);border:1px solid rgba(1,22,36,.08)}
.ep-previews .ep-sq canvas{width:216px;height:216px}
.ep-previews .ep-st canvas{width:122px;height:216px}
.ep-previews figcaption{font:600 11px Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--ewr-text-muted,#67737c);text-align:center}
.ep-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.ep-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:999px;border:1px solid rgba(82,48,218,.35);
  background:var(--ewr-accent-tint,rgba(82,48,218,.08));color:var(--ewr-accent-strong,#401d91);font:600 13px Inter,sans-serif;cursor:pointer;text-decoration:none}
.ep-btn:hover{background:rgba(82,48,218,.14)}
.ep-btn.primary{background:var(--ewr-accent-strong,#401d91);border-color:transparent;color:#fff}
.ep-btn.primary:hover{background:#011624}
.ep-note{margin-top:10px;font:500 12px Inter,sans-serif;color:var(--ewr-text-muted,#67737c)}`;
  document.head.appendChild(s);
}

// ---- mount ------------------------------------------------------------------
// ---- headless build (for the announcement-pack EMAIL) -------------------------
// Draws both promo images on detached canvases — no DOM mount needed. Used by
// view-session-new right after the maker creates an event, so the images can be
// uploaded and emailed to their inbox ("inbox-first": they post from the phone).
export async function buildPromoBlobs(session, sessionId, kind){
  const a = auth.getState();
  const startMs = Date.parse(session.scheduled_start);
  const info = {
    kind,
    title: session.name || (kind === 'race' ? 'Live race' : 'Live session'),
    host: a.displayName || session.created_by || 'Your host',
    when: fmtDateLine(startMs),
    shortUrl: 'live.egelywheel.com',
  };
  try{ await Promise.all([document.fonts.load('700 64px Montserrat'), document.fonts.load('600 30px Inter'), document.fonts.ready]); }catch(_){}
  const [photo, avatar] = await Promise.all([loadImg((a.wheelPhotoUrl || '').trim() || null), loadImg(a.avatarUrl || null)]);
  const sq = document.createElement('canvas');
  const st = document.createElement('canvas');
  drawSquare(sq, info, photo, avatar);
  drawStory(st, info, photo, avatar);
  const toBlob = c => new Promise(res => c.toBlob(b => res(b), 'image/png'));
  const [feed, story] = await Promise.all([toBlob(sq), toBlob(st)]);
  return { feed, story };
}

export function mountEventPromo(el, { session, sessionId, kind }){
  if(!el || !session || !session.scheduled_start) return { destroy(){} };
  let disposed = false, built = false, unsub = null, timer = 0;
  const startMs = Date.parse(session.scheduled_start);
  const noun = kind === 'race' ? 'race' : 'session';

  const eventUrl = () => {
    const base = location.origin + location.pathname;
    if(session.access_mode === 'invite' && session.invite_token) return base + '#/join/' + session.invite_token;
    return base + '#/' + (kind === 'race' ? 'race' : 'room') + '/' + sessionId;
  };
  // On the IMAGE only the clean domain — an invite token would spill across
  // the chip and a room number adds nothing (Csaba, 2026-07-12). The real
  // link travels with Share… / Copy link / Facebook.
  const shortUrl = () => 'live.egelywheel.com';

  const eligible = () => {
    const a = auth.getState();
    return !!(a.user && session.created_by_user_id === a.user.id && a.approvedMaker && Date.now() < startMs);
  };

  async function render(){
    if(disposed) return;
    if(!eligible()){ el.hidden = true; el.innerHTML = ''; built = false; return; }
    if(built) return;
    built = true;
    injectCss();
    el.hidden = false;
    el.innerHTML = `
      <div class="ep-card">
        <div class="ep-head"><b>📣 Promote this ${noun}</b><span class="ep-badge">Maker toolkit</span></div>
        <p class="ep-sub">Your announcement images are ready — post them anywhere and bring your circle. The link and the exact time are on the image.</p>
        <div class="ep-previews">
          <figure class="ep-sq"><canvas data-ep-sq width="1080" height="1080"></canvas><figcaption>Feed · 1:1</figcaption></figure>
          <figure class="ep-st"><canvas data-ep-st width="1080" height="1920"></canvas><figcaption>Story · 9:16</figcaption></figure>
        </div>
        <div class="ep-actions" data-ep-actions>
          <button type="button" class="ep-btn primary" data-ep-share hidden>📤 Share…</button>
          <button type="button" class="ep-btn" data-ep-dl="sq">⬇ Download 1:1</button>
          <button type="button" class="ep-btn" data-ep-dl="st">⬇ Download Story</button>
          <a class="ep-btn" data-ep-fb target="_blank" rel="noopener">Share on Facebook</a>
          <button type="button" class="ep-btn" data-ep-copy>🔗 Copy event link</button>
        </div>
        <p class="ep-note">Tip: on your phone, <b>Share…</b> drops the image straight into Instagram, TikTok or a Facebook story.</p>
      </div>`;

    const a = auth.getState();
    const info = {
      kind,
      title: session.name || (kind === 'race' ? 'Live race' : 'Live session'),
      host: a.displayName || session.created_by || 'Your host',
      when: fmtDateLine(startMs),
      shortUrl: shortUrl(),
    };
    try{ await Promise.all([document.fonts.load('700 64px Montserrat'), document.fonts.load('600 30px Inter'), document.fonts.ready]); }catch(_){}
    const [photo, avatar] = await Promise.all([loadImg((a.wheelPhotoUrl || '').trim() || null), loadImg(a.avatarUrl || null)]);
    if(disposed || !el.isConnected) return;
    const sq = el.querySelector('[data-ep-sq]');
    const st = el.querySelector('[data-ep-st]');
    try{
      drawSquare(sq, info, photo, avatar);
      drawStory(st, info, photo, avatar);
    }catch(e){ console.error('[event promo] draw failed', e); }

    const fileOf = (canvas, name) => new Promise(res =>
      canvas.toBlob(b => res(b ? new File([b], name, { type: 'image/png' }) : null), 'image/png'));
    const dlName = fmt => `ewr-${kind}-${sessionId}-${fmt === 'sq' ? 'feed' : 'story'}.png`;
    const shareText = `${info.title} — live on EWR · ${info.when.line}\n${eventUrl()}`;

    // native share (the mobile road to Instagram / TikTok / FB stories)
    const shareBtn = el.querySelector('[data-ep-share]');
    if(navigator.canShare){
      fileOf(sq, dlName('sq')).then(f => {
        if(f && navigator.canShare({ files: [f] })) shareBtn.hidden = false;
      });
      shareBtn.addEventListener('click', async () => {
        const files = (await Promise.all([fileOf(sq, dlName('sq')), fileOf(st, dlName('st'))])).filter(Boolean);
        try{ await navigator.share({ files, title: info.title, text: shareText }); }catch(_){}
      });
    }
    el.querySelectorAll('[data-ep-dl]').forEach(b => b.addEventListener('click', () => {
      const canvas = b.dataset.epDl === 'sq' ? sq : st;
      canvas.toBlob(blob => {
        if(!blob) return;
        const u = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = u; link.download = dlName(b.dataset.epDl);
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(u), 5000);
      }, 'image/png');
    }));
    const fb = el.querySelector('[data-ep-fb]');
    fb.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(eventUrl());
    el.querySelector('[data-ep-copy]').addEventListener('click', ev => {
      if(navigator.clipboard) navigator.clipboard.writeText(eventUrl()).then(() => { ev.target.textContent = 'Copied ✓'; });
    });
  }

  render();
  unsub = auth.subscribeAuth(() => render());   // the maker flag settles async after boot
  const left = startMs - Date.now();
  if(left > 0 && left < 86400000) timer = setTimeout(() => { built = false; render(); }, left + 500);

  return { destroy(){ disposed = true; if(unsub) unsub(); if(timer) clearTimeout(timer); el.innerHTML = ''; el.hidden = true; } };
}
