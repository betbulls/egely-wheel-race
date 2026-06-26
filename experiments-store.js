// DB layer for Experiments: per-user progress, measurement saving, ratings.
// Progress is keyed on stable day ids (see experiments.js), so editing content
// later never corrupts a user's place.
import { supabase } from './db.js';
import { downsample } from './analytics.js';
import { getExperiment, dayNumber } from './experiments.js';

const racerId = name => String(name || 'Me').trim().toLowerCase().replace(/\s+/g, '_') || 'me';

// Returns Map: experimentId -> { completedDays:Set<dayId>, completed, startedAt, completedAt }
export async function fetchProgress(userId){
  const map = new Map();
  if(!userId) return map;
  const { data } = await supabase.from('user_experiment_progress').select('*').eq('user_id', userId);
  for(const row of (data || [])){
    map.set(row.experiment_id, {
      completedDays: new Set(row.completed_days || []),
      completed: !!row.completed,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    });
  }
  return map;
}

// Returns Map: dayId -> { id, avg, verified, createdAt } for this user's saved
// experiment measurements (latest per day), so completed days can show the
// result and link to its detail page.
export async function fetchExperimentResults(userId, experimentId){
  const map = new Map();
  if(!userId) return map;
  const { data } = await supabase.from('results')
    .select('id, experiment_day, avg, verified, created_at')
    .eq('user_id', userId).eq('experiment_id', experimentId)
    .order('created_at', { ascending: false });
  for(const r of (data || [])){
    if(r.experiment_day && !map.has(r.experiment_day)){
      map.set(r.experiment_day, { id: r.id, avg: Number(r.avg), verified: !!r.verified, createdAt: r.created_at });
    }
  }
  return map;
}

// Mark that the experiment has been opened/started (so it shows up in "Continue"
// even before the first day is completed). Safe to call repeatedly.
export async function ensureStarted(userId, experimentId){
  if(!userId) return;
  const { data: existing } = await supabase.from('user_experiment_progress')
    .select('experiment_id').eq('user_id', userId).eq('experiment_id', experimentId).maybeSingle();
  if(existing) return;
  await supabase.from('user_experiment_progress').upsert({
    user_id: userId, experiment_id: experimentId,
    completed_days: [], completed: false, started_at: new Date().toISOString(),
  }, { onConflict: 'user_id,experiment_id' });
}

// Adds a day id to the user's completed set; flips `completed` when every day is
// done. Returns { error, completed }.
export async function markDayComplete(userId, experimentId, dayId){
  if(!userId) return { error: { message: 'Not logged in' } };
  const exp = getExperiment(experimentId);
  if(!exp) return { error: { message: 'Unknown experiment' } };
  const { data: existing } = await supabase.from('user_experiment_progress')
    .select('completed_days, started_at').eq('user_id', userId).eq('experiment_id', experimentId).maybeSingle();
  const set = new Set((existing && existing.completed_days) || []);
  set.add(dayId);
  const allDone = exp.days.every(d => set.has(d.id));
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from('user_experiment_progress').upsert({
    user_id: userId, experiment_id: experimentId,
    completed_days: [...set],
    completed: allDone,
    started_at: (existing && existing.started_at) || nowIso,
    completed_at: allDone ? nowIso : null,
  }, { onConflict: 'user_id,experiment_id' });
  return { error, completed: allDone };
}

// Saves an experiment measurement as a normal `results` row, tagged with the
// experiment + stable day id. Mirrors the Solo save so it feeds the same stats
// and achievements (verified rows only count toward progression, as everywhere).
export async function saveExperimentMeasurement({ userId, identity, experiment, day, stats, samples, verified, comment }){
  const num = dayNumber(experiment, day);
  const { error } = await supabase.from('results').insert({
    session_id: null, user_id: userId || null,
    racer_id: racerId(identity), racer_name: (identity || 'Me'),
    label: `${experiment.title} · Day ${num}`,
    duration_seconds: day.measureSeconds,
    avg: Number(stats.avg.toFixed(2)), peak: stats.peak, steadiness: stats.steadiness,
    zone_green: Number(stats.zone.green.toFixed(1)), zone_yellow: Number(stats.zone.yellow.toFixed(1)),
    zone_red: Number(stats.zone.red.toFixed(1)), trend: Number(stats.trendTotal.toFixed(2)),
    green_streak: stats.greenStreak, samples: stats.n, is_host: false, verified,
    comment: comment || null, curve: (samples || []).slice(),   // FULL measured series (250ms samples) — no 80-point downsample
    experiment_id: experiment.id, experiment_day: day.id,
  });
  return { error };
}

// Private rating (admin analytics only — never shown back to users).
export async function rateExperiment(userId, experimentId, rating){
  if(!userId) return { error: { message: 'Not logged in' } };
  const { error } = await supabase.from('experiment_ratings').upsert({
    user_id: userId, experiment_id: experimentId, rating,
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id,experiment_id' });
  return { error };
}
