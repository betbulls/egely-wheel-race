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
  profile = data || null;
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
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'practitioner';

// A practitioner needs a shareable handle for their connection link.
async function ensureHandle(displayName){
  if(profile?.practitioner_handle) return profile.practitioner_handle;
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
  const { data } = await supabase.from('profiles')
    .select('id, display_name, avatar_url, bio, is_practitioner, practitioner_handle')
    .eq('practitioner_handle', handle).maybeSingle();
  return data || null;
}

// The client initiates the connection (= consent). Reactivates a revoked link.
export async function connectToPractitioner(practitionerId){
  if(!user) return { error: { message: 'Not logged in' } };
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

// Whether the current user is connected to a given practitioner.
export async function isConnectedTo(practitionerId){
  if(!user) return false;
  const { data } = await supabase.from('practitioner_links')
    .select('status').eq('practitioner_id', practitionerId).eq('client_id', user.id).maybeSingle();
  return !!(data && data.status === 'active');
}

export async function uploadAvatar(file){
  if(!user) return { error: { message: 'Not logged in' } };
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${user.id}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if(error) return { error };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl + '?t=' + Date.now() };
}
