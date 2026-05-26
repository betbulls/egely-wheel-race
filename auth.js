// Supabase email (magic-link) authentication wrapper.
// Login is only needed to MEASURE; viewing is open and needs no login.
import { supabase } from './db.js';

let user = null;
const listeners = new Set();

function emit(){ listeners.forEach(cb => cb(user)); }

// Pick up an existing session, and react to login/logout.
supabase.auth.getSession().then(({ data }) => { user = data.session?.user || null; emit(); });
supabase.auth.onAuthStateChange((_event, session) => { user = session?.user || null; emit(); });

export function getUser(){ return user; }
export function getEmail(){ return user?.email || null; }

export function subscribeAuth(cb){
  listeners.add(cb);
  cb(user);
  return () => listeners.delete(cb);
}

// Send a magic login link to the given email.
export function signIn(email){
  return supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
}

export function signOut(){ return supabase.auth.signOut(); }
