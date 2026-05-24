// Shared Supabase client for the whole app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://lhyychkrcrndjptptkii.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeXljaGtyY3JuZGpwdHB0a2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MjY0NTYsImV4cCI6MjA5NTIwMjQ1Nn0.m94K_KVl-Fdj1vkrAh0mPN3lku4FmcfnHs5W3p_gBFk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
