// Hybrid persistence for achievements: the engine (achievements.js) is still
// the source of truth for *progress*, but unlocks land in the user_achievements
// table so we get a precise unlocked_at timestamp, multi-device "seen" sync,
// and a queryable history (analytics, future email notifications, etc.).

import { supabase } from './db.js';

// Returns a Map<achievement_id, { unlocked_at, seen_at }> of stored unlocks.
export async function fetchUserAchievements(userId){
  if(!userId) return new Map();
  const { data, error } = await supabase.from('user_achievements')
    .select('achievement_id, unlocked_at, seen_at')
    .eq('user_id', userId);
  if(error){ console.warn('fetchUserAchievements:', error.message); return new Map(); }
  return new Map((data || []).map(r => [r.achievement_id, r]));
}

// Insert any newly-unlocked achievements. `silent: true` writes seen_at so the
// user doesn't get a flood of NEW pulses on the first hybrid load (migration).
export async function recordNewUnlocks(userId, achievementIds, { silent } = {}){
  if(!userId || !achievementIds || !achievementIds.length) return;
  const seenAt = silent ? new Date().toISOString() : null;
  const rows = achievementIds.map(id => ({
    user_id: userId, achievement_id: id, seen_at: seenAt,
  }));
  const { error } = await supabase.from('user_achievements')
    .upsert(rows, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true });
  if(error) console.warn('recordNewUnlocks:', error.message);
}

// Mark a batch of achievements as seen (clears the NEW pulse on the next load).
export async function markSeen(userId, achievementIds){
  if(!userId || !achievementIds || !achievementIds.length) return;
  const { error } = await supabase.from('user_achievements')
    .update({ seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('achievement_id', achievementIds);
  if(error) console.warn('markSeen:', error.message);
}
