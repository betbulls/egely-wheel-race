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

function applyUser(u){
  user = u;
  emit();
  // Defer the subscriber lookup OUTSIDE this callback. Calling another Supabase
  // function directly inside onAuthStateChange deadlocks supabase-js's auth lock
  // (verify succeeds on the server but the promise never resolves).
  setTimeout(async () => { await refreshSubscriber(); emit(); }, 0);
}

supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user || null));
supabase.auth.onAuthStateChange((_event, session) => applyUser(session?.user || null));

export function getState(){ return state(); }

export function subscribeAuth(cb){
  listeners.add(cb);
  cb(state());
  return () => listeners.delete(cb);
}

// Re-verify subscription (e.g. before starting a measurement).
export async function recheckSubscriber(){ await refreshSubscriber(); emit(); return subscriber; }

// Pre-check at login: is this email an active subscriber? (so we don't send
// login codes to non-subscribers). Returns true / false / null (check failed).
export async function isSubscriberEmail(email){
  const { data, error } = await supabase.rpc('is_subscriber_email', { check_email: email.trim() });
  if(error){ console.warn('subscriber check error:', error.message); return null; }
  return data === true;
}

// Sends a login email containing a 6-digit code (more reliable than magic links,
// which email scanners can consume before the user clicks).
export function signIn(email){
  return supabase.auth.signInWithOtp({ email: email.trim() });
}

// Verify the 6-digit code the user typed in.
export function verifyCode(email, token){
  return supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
}

export function signOut(){ return supabase.auth.signOut(); }
