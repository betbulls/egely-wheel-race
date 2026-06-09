// Supabase auth + subscriber check + profile (name, avatar, practitioner).
// Login is only needed to MEASURE; viewing is open and needs no login.
import { supabase } from './db.js';

let user = null;
let subscriber = false;   // active subscriber?
let profile = null;       // row from public.profiles
const listeners = new Set();

function state(){
  return {
    user,
    email: user?.email || null,
    subscriber,
    profile,
    displayName: profile?.display_name || (user?.email ? user.email.split('@')[0] : null),
    avatarUrl: profile?.avatar_url || null,
    isPractitioner: !!profile?.is_practitioner,
    bio: profile?.bio || '',
    practitionerHandle: profile?.practitioner_handle || null,
    // Spiritual Maker public profile + promotion fields. Loaded via select('*'),
    // exposed here so future consumers (connect page, leaderboard mini-profile,
    // recommended makers) can read them without another query.
    website: profile?.website || '',
    instagram: profile?.instagram_url || '',
    youtube: profile?.youtube_url || '',
    tiktok: profile?.tiktok_url || '',
    facebook: profile?.facebook_url || '',
    affiliateLink: profile?.affiliate_link || '',
    couponCode: profile?.coupon_code || '',
    // Live presence visibility — default ON unless the user explicitly turned it off.
    showOnLive: profile?.show_on_live !== false,
  };
}
function emit(){ const s = state(); listeners.forEach(cb => cb(s)); }

async function refreshSubscriber(){
  if(!user?.email){ subscriber = false; return; }
  const { data, error } = await supabase
    .from('subscribers').select('active').eq('email', user.email.toLowerCase()).maybeSingle();
  subscriber = !error && !!(data && data.active);
}

async function refreshProfile(){
  if(!user){ profile = null; return; }
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if(data){
    // Everyone is a Spiritual Maker: backfill a connection handle for existing members
    // who don't have one yet, so their share link appears without saving the profile.
    if(!data.practitioner_handle){
      const handle = await ensureHandle(data.display_name || (user.email || '').split('@')[0] || 'spiritual-maker');
      const { data: updated } = await supabase.from('profiles')
        .update({ is_practitioner: true, practitioner_handle: handle })
        .eq('id', user.id).select().maybeSingle();
      profile = updated || data;
    } else {
      profile = data;
    }
    return;
  }
  // First-time profile — seed display_name from the email's local part, and give the new
  // member a connection handle right away so their share link exists from day one.
  const fallback = (user.email || '').split('@')[0] || 'User';
  const handle = await ensureHandle(fallback);
  const { data: created } = await supabase.from('profiles')
    .insert({ id: user.id, display_name: fallback, is_practitioner: true, practitioner_handle: handle })
    .select().maybeSingle();
  profile = created || null;
}

function applyUser(u){
  user = u;
  emit();
  // Defer Supabase calls OUTSIDE the auth callback (avoids the auth-lock deadlock).
  setTimeout(async () => { await refreshSubscriber(); await refreshProfile(); emit(); }, 0);
}

supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user || null));
supabase.auth.onAuthStateChange((_event, session) => applyUser(session?.user || null));

export function getState(){ return state(); }
export function subscribeAuth(cb){ listeners.add(cb); cb(state()); return () => listeners.delete(cb); }
export async function recheckSubscriber(){ await refreshSubscriber(); emit(); return subscriber; }

export async function isSubscriberEmail(email){
  const { data, error } = await supabase.rpc('is_subscriber_email', { check_email: email.trim() });
  if(error){ console.warn('subscriber check error:', error.message); return null; }
  return data === true;
}

export function signIn(email){ return supabase.auth.signInWithOtp({ email: email.trim() }); }
export function verifyCode(email, token){ return supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' }); }
export function signOut(){ return supabase.auth.signOut(); }

// ---- Profile ---------------------------------------------------------------
const slugify = s => String(s || '').toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'spiritual-maker';

// Generate a fresh, unique connection handle from a name. Callers decide WHEN to call
// it (only when the profile has no handle yet) — so it always returns a new unique slug.
async function ensureHandle(displayName){
  const base = slugify(displayName);
  for(let i = 0; i < 6; i++){
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await supabase.from('profiles').select('id').eq('practitioner_handle', candidate).maybeSingle();
    if(!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function saveProfile(fields){
  if(!user) return { error: { message: 'Not logged in' } };
  const row = { id: user.id, ...fields };
  if(fields.is_practitioner && !profile?.practitioner_handle){
    row.practitioner_handle = await ensureHandle(fields.display_name);
  }
  const { error } = await supabase.from('profiles').upsert(row);
  if(!error){ await refreshProfile(); emit(); }
  return { error };
}

// ---- Practitioner links ----------------------------------------------------
export async function getPractitionerByHandle(handle){
  // select('*') so the public connect landing also gets the social + affiliate
  // fields. Safe even before those columns exist — '*' just returns what's there.
  const { data } = await supabase.from('profiles')
    .select('*')
    .eq('practitioner_handle', handle).maybeSingle();
  return data || null;
}

// The client initiates the connection (= consent). Reactivates a revoked link.
export async function connectToPractitioner(practitionerId){
  if(!user) return { error: { message: 'Not logged in' } };
  // Make sure the practitioner can identify this client by something better than
  // "Client". Seed a display_name from the email's local part if there's no profile yet.
  try {
    const { data: existing } = await supabase.from('profiles')
      .select('display_name').eq('id', user.id).maybeSingle();
    if(!existing || !existing.display_name){
      const fallback = (user.email || '').split('@')[0] || 'Member';
      await supabase.from('profiles').upsert({ id: user.id, display_name: fallback });
      await refreshProfile(); emit();
    }
  } catch {}
  const { error } = await supabase.from('practitioner_links')
    .upsert({ practitioner_id: practitionerId, client_id: user.id, status: 'active' },
            { onConflict: 'practitioner_id,client_id' });
  return { error };
}

export async function disconnectPractitioner(practitionerId){
  if(!user) return { error: { message: 'Not logged in' } };
  const { error } = await supabase.from('practitioner_links')
    .update({ status: 'revoked' })
    .eq('practitioner_id', practitionerId).eq('client_id', user.id);
  return { error };
}

// Practitioners the current user has connected to (active links) + their profiles.
export async function getMyPractitioners(){
  if(!user) return [];
  const { data: links } = await supabase.from('practitioner_links')
    .select('practitioner_id, created_at').eq('client_id', user.id).eq('status', 'active');
  if(!links || !links.length) return [];
  const ids = links.map(l => l.practitioner_id);
  const { data: profs } = await supabase.from('profiles')
    .select('id, display_name, avatar_url, bio').in('id', ids);
  const byId = new Map((profs || []).map(p => [p.id, p]));
  return links.map(l => ({ ...byId.get(l.practitioner_id), id: l.practitioner_id, connectedAt: l.created_at }));
}

// Clients connected to the current practitioner, each with their latest measurement.
export async function getMyClients(){
  if(!user) return [];
  const { data: links } = await supabase.from('practitioner_links')
    .select('client_id, created_at').eq('practitioner_id', user.id).eq('status', 'active');
  if(!links || !links.length) return [];
  const ids = links.map(l => l.client_id);
  const connectedAt = new Map(links.map(l => [l.client_id, l.created_at]));

  const [{ data: profs }, { data: results }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids),
    supabase.from('results').select('*').in('user_id', ids).order('created_at', { ascending: false }),
  ]);
  const byId = new Map((profs || []).map(p => [p.id, p]));
  const stats = new Map();   // user_id -> { last result, count }
  for(const r of (results || [])){
    const cur = stats.get(r.user_id);
    if(!cur) stats.set(r.user_id, { last: r, count: 1 });
    else cur.count++;          // results are ordered desc, so the first seen is the latest
  }

  return ids.map(id => {
    const p = byId.get(id) || {};
    const s = stats.get(id);
    return {
      id,
      displayName: p.display_name || 'Member',
      avatarUrl: p.avatar_url || null,
      connectedAt: connectedAt.get(id),
      count: s ? s.count : 0,
      last: s ? s.last : null,
    };
  });
}

// A single client's measurement history (practitioner view).
// Connection is verified by the active link; the profile is only for display
// (a client may have connected without setting up a profile yet).
export async function getClientMeasurements(clientId){
  if(!user) return { connected: false, profile: null, rows: [] };
  const { data: link } = await supabase.from('practitioner_links')
    .select('status').eq('practitioner_id', user.id).eq('client_id', clientId).eq('status', 'active').maybeSingle();
  if(!link) return { connected: false, profile: null, rows: [] };
  const [{ data: prof }, { data: rows }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url, bio').eq('id', clientId).maybeSingle(),
    supabase.from('results').select('*').eq('user_id', clientId).order('created_at', { ascending: false }),
  ]);
  return { connected: true, profile: prof || null, rows: rows || [] };
}

// Whether the current user is connected to a given practitioner.
export async function isConnectedTo(practitionerId){
  if(!user) return false;
  const { data } = await supabase.from('practitioner_links')
    .select('status').eq('practitioner_id', practitionerId).eq('client_id', user.id).maybeSingle();
  return !!(data && data.status === 'active');
}

// Shrink + center-crop an avatar to a small square JPEG, entirely in the browser, so a
// multi-MB phone photo becomes ~tens of KB and loads fast everywhere it's shown.
// Cross-browser: a plain <img> element (universal) + canvas.toBlob, with a toDataURL
// fallback for old engines. Any failure resolves to the ORIGINAL file, so upload still
// works. The centre square is kept — the standard avatar crop.
function processAvatar(file, size = 320, quality = 0.82){
  return new Promise(resolve => {
    if(!file || !/^image\//.test(file.type || '')){ resolve(file); return; }   // not an image → as-is
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if(!w || !h){ URL.revokeObjectURL(url); resolve(file); return; }
        const s = Math.min(w, h);                          // centre square (cover crop)
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url);
        const done = blob => resolve(blob || file);
        if(canvas.toBlob){ canvas.toBlob(done, 'image/jpeg', quality); return; }
        // Old-engine fallback: toDataURL → Blob.
        try {
          const b64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
          const bin = atob(b64), arr = new Uint8Array(bin.length);
          for(let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          done(new Blob([arr], { type: 'image/jpeg' }));
        } catch { resolve(file); }
      } catch { URL.revokeObjectURL(url); resolve(file); }
    };
    img.src = url;
  });
}

export async function uploadAvatar(file){
  if(!user) return { error: { message: 'Not logged in' } };
  const blob = await processAvatar(file);
  const processed = blob !== file;   // processed → jpeg; otherwise keep the original type
  const ext = processed ? 'jpg' : (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${user.id}/avatar.${ext}`;
  const contentType = processed ? 'image/jpeg' : (file.type || 'image/jpeg');
  const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType });
  if(error) return { error };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl + '?t=' + Date.now() };
}
