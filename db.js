// Shared Supabase client for the whole app.
//
// The library is VENDORED LOCALLY (assets/supabase-umd.js, a single-file UMD
// build loaded as a classic script from index.html BEFORE the module graph
// runs — classic head scripts always execute before deferred modules). It used
// to be imported from the esm.sh CDN with a floating @2 version; on 2026-08-06
// esm.sh rolled to a fresh release whose sub-modules failed to load, and the
// whole app died at boot for every visitor. Boot must never depend on a
// third-party CDN. To upgrade the library: download a new
// https://cdn.jsdelivr.net/npm/@supabase/supabase-js@<ver>/dist/umd/supabase.js
// over assets/supabase-umd.js and test.
const { createClient } = window.supabase;

const SUPABASE_URL = 'https://lhyychkrcrndjptptkii.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeXljaGtyY3JuZGpwdHB0a2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MjY0NTYsImV4cCI6MjA5NTIwMjQ1Nn0.m94K_KVl-Fdj1vkrAh0mPN3lku4FmcfnHs5W3p_gBFk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
