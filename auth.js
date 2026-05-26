// Supabase email (magic-link) authentication + subscriber check.
// Login is only needed to MEASURE; viewing is open and needs no login.
import { supabase } from './db.js';

let user = null;
let subscriber = false;   // is the logged-in user an active subscriber?
const listeners = new Set();

function state(){ return { user, email: user?.email || null, subscriber }; }
function emit(){ const s = state(); listeners.forEach(cb => cb(s)); }

// Checks the subscribers table for the logged-in user's own row (RLS allows
// reading only your own row). Active subscriber => may measure.
async function refreshSubscriber(){
  if(!user?.email){ subscriber = false; return; }
  const { data, error } = await supabase
    .from('subscribers')
    .select('active')
    .eq('email', user.email.toLowerCase())
    .maybeSingle();
  subscriber = !error && !!(data && data.active);
}

async function setUser(u){
  user = u;
  await refreshSubscriber();
  emit();
}

supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));

export function getState(){ return state(); }

export function subscribeAuth(cb){
  listeners.add(cb);
  cb(state());
  return () => listeners.delete(cb);
}

// Re-verify subscription (e.g. before starting a measurement).
export async function recheckSubscriber(){ await refreshSubscriber(); emit(); return subscriber; }

export function signIn(email){
  return supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
}

export function signOut(){ return supabase.auth.signOut(); }
