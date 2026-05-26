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
export async function saveProfile(fields){
  if(!user) return { error: { message: 'Not logged in' } };
  const { error } = await supabase.from('profiles').upsert({ id: user.id, ...fields });
  if(!error){ await refreshProfile(); emit(); }
  return { error };
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
