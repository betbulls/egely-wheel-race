// Achievement engine: pure functions over the user's measurement history + a
// few aggregates. No persistent storage — each badge is recomputed on load.
//
// A definition has: id, category, tier, icon, title, description, and a
// progress(data) function returning { current, target, unlockedAt? }.
// `unlocked` is derived as current >= target.

const T = { bronze: 'bronze', silver: 'silver', gold: 'gold', special: 'special' };

export const CATEGORIES = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'discovery',       title: 'Discovery' },
  { id: 'consistency',     title: 'Consistency' },
  { id: 'vitality',        title: 'Vitality Milestones' },
  { id: 'stability',       title: 'Stability & Control' },
  { id: 'endurance',       title: 'Endurance' },
  { id: 'personal-growth', title: 'Personal Growth' },
  { id: 'social',          title: 'Social & Community' },
  { id: 'race',            title: 'Races' },
  { id: 'experiments',     title: 'Experiments' },
  { id: 'practitioner',    title: 'Spiritual Maker Path', practitionerOnly: true },
  { id: 'special',         title: 'Rare & Special' },
];

// XP value per tier — used by the Level system.
export const TIER_XP = { bronze: 10, silver: 25, gold: 50, special: 100 };
export const LEVELS = [
  { idx: 1, title: 'Explorer', threshold: 0    },
  { idx: 2, title: 'Adept',    threshold: 100  },
  { idx: 3, title: 'Seeker',   threshold: 250  },
  { idx: 4, title: 'Guide',    threshold: 500  },
  { idx: 5, title: 'Master',   threshold: 900  },
  { idx: 6, title: 'Luminary', threshold: 1500 },
];

export function xpForAchievement(a){ return TIER_XP[a.tier] || 0; }

export function computeLevelState(achievements){
  const totalXP = achievements.filter(a => a.unlocked).reduce((s, a) => s + xpForAchievement(a), 0);
  let level = LEVELS[0], nextLevel = null;
  for(let i = 0; i < LEVELS.length; i++){
    if(totalXP >= LEVELS[i].threshold){
      level = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    }
  }
  const isMax = !nextLevel;
  const xpInLevel = totalXP - level.threshold;
  const xpForThis = nextLevel ? (nextLevel.threshold - level.threshold) : 0;
  const xpToNext = nextLevel ? (nextLevel.threshold - totalXP) : 0;
  const pct = nextLevel ? Math.min(100, Math.round((xpInLevel / xpForThis) * 100)) : 100;
  return { totalXP, level, nextLevel, isMax, xpInLevel, xpForThis, xpToNext, pct };
}

// ---- helpers ---------------------------------------------------------------
const longestStreak = (arr, pred) => {
  let best = 0, cur = 0;
  for(const x of arr){ if(pred(x)){ cur++; if(cur > best) best = cur; } else cur = 0; }
  return best;
};
const firstAt = (asc, pred) => { for(const r of asc){ if(pred(r)) return r.created_at; } return null; };
const distinctDays = results => {
  const s = new Set();
  for(const r of results){
    // Local date so "different days" matches the user's lived experience.
    s.add(new Date(r.created_at).toLocaleDateString('en-CA'));
  }
  return s.size;
};
// A result's kind — explicit column wins; derivation fallback for older rows.
// Group-session achievements use this so a RACE never counts as a session.
const rkind = r => r.kind || (r.experiment_id != null ? 'experiment' : r.session_id != null ? 'session' : 'solo');

// ---- definitions -----------------------------------------------------------
export const ACHIEVEMENTS = [
  // Getting Started
  { id: 'first-solo', category: 'getting-started', tier: T.bronze, icon: '🎯',
    title: 'First Solo Measurement', description: 'Save your first solo session.',
    progress: d => {
      const c = d.results.filter(r => r.session_id == null).length;
      return { current: Math.min(c, 1), target: 1,
        unlockedAt: c ? firstAt(d.resultsAsc, r => r.session_id == null) : null };
    }},
  { id: 'first-group', category: 'getting-started', tier: T.bronze, icon: '🤝',
    title: 'First Group Session', description: 'Take part in your first group session.',
    progress: d => {
      const c = d.results.filter(r => rkind(r) === 'session').length;
      return { current: Math.min(c, 1), target: 1,
        unlockedAt: c ? firstAt(d.resultsAsc, r => rkind(r) === 'session') : null };
    }},
  { id: 'first-saved', category: 'getting-started', tier: T.bronze, icon: '💾',
    title: 'First Saved Result', description: 'Save any measurement.',
    progress: d => ({ current: Math.min(d.results.length, 1), target: 1,
      unlockedAt: d.resultsAsc[0] ? d.resultsAsc[0].created_at : null })},
  { id: 'first-verified', category: 'getting-started', tier: T.bronze, icon: '✅',
    title: 'First Verified Measurement', description: 'Earn your first verified mark.',
    progress: d => {
      const hit = d.results.some(r => r.verified);
      return { current: hit ? 1 : 0, target: 1,
        unlockedAt: hit ? firstAt(d.resultsAsc, r => r.verified) : null };
    }},
  { id: 'first-connected-practitioner', category: 'getting-started', tier: T.bronze, icon: '🔗',
    title: 'First Connected Spiritual Maker', description: 'Connect to your first Spiritual Maker.',
    progress: d => ({ current: d.connectedPractitionersCount > 0 ? 1 : 0, target: 1 })},
  { id: 'first-connected-client', category: 'getting-started', tier: T.bronze, icon: '👥',
    title: 'First Connected Member', description: 'Welcome your first member.',
    progress: d => ({ current: d.clientsCount > 0 ? 1 : 0, target: 1 })},

  // Consistency — counts
  ...[
    [3,   T.bronze, '🌱', '3 Measurements'],
    [10,  T.bronze, '🌿', '10 Measurements'],
    [25,  T.silver, '🌳', '25 Measurements'],
    [50,  T.silver, '⭐', '50 Measurements'],
    [100, T.gold,   '💯', '100 Measurements'],
  ].map(([n, tier, icon, title]) => ({
    id: 'count-' + n, category: 'consistency', tier, icon, title,
    description: `Complete ${n} measurements.`,
    progress: d => ({ current: d.results.length, target: n,
      unlockedAt: d.results.length >= n && d.resultsAsc[n-1] ? d.resultsAsc[n-1].created_at : null })
  })),
  // Consistency — days
  ...[
    [3,  T.bronze, '📅', '3 Different Days'],
    [7,  T.silver, '📆', '7 Different Days'],
    [30, T.gold,   '🗓️', '30 Different Days'],
  ].map(([n, tier, icon, title]) => ({
    id: 'days-' + n, category: 'consistency', tier, icon, title,
    description: `Measure on ${n} different days.`,
    progress: d => ({ current: d.distinctDays, target: n })
  })),

  // Vitality Milestones
  { id: 'first-yellow-avg', category: 'vitality', tier: T.bronze, icon: '🌅',
    title: 'First Yellow Average', description: 'Average vitality in the yellow zone (6–13).',
    progress: d => {
      const pred = r => (r.avg || 0) >= 6 && (r.avg || 0) < 13;
      const hit = d.results.some(pred);
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit ? firstAt(d.resultsAsc, pred) : null };
    }},
  { id: 'first-green-avg', category: 'vitality', tier: T.silver, icon: '🌿',
    title: 'First Green Average', description: 'Average vitality in the green zone (13+).',
    progress: d => {
      const pred = r => (r.avg || 0) >= 13;
      const hit = d.results.some(pred);
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit ? firstAt(d.resultsAsc, pred) : null };
    }},
  ...[
    [12, T.bronze, '⚡', 'Peak 12+'],
    [18, T.silver, '✨', 'Peak 18+'],
    [24, T.gold,   '💥', 'Peak 24'],
  ].map(([n, tier, icon, title]) => ({
    id: 'peak-' + n, category: 'vitality', tier, icon, title,
    description: `Reach a peak of ${n}.`,
    progress: d => {
      const pred = r => (r.peak || 0) >= n;
      return { current: d.bestPeak, target: n,
        unlockedAt: d.bestPeak >= n ? firstAt(d.resultsAsc, pred) : null };
    }
  })),

  // Stability & Control
  { id: 'first-stable', category: 'stability', tier: T.bronze, icon: '🧘',
    title: 'First Highly Stable Measurement', description: 'Steadiness 80 or higher.',
    progress: d => {
      const pred = r => (r.steadiness || 0) >= 80;
      const hit = d.results.some(pred);
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit ? firstAt(d.resultsAsc, pred) : null };
    }},
  { id: 'stable-streak-3', category: 'stability', tier: T.silver, icon: '🌊',
    title: '3 Stable Measurements in a Row', description: 'Three consecutive with steadiness 70+.',
    progress: d => ({ current: longestStreak(d.resultsAsc, r => (r.steadiness || 0) >= 70), target: 3 })},
  { id: 'verified-streak-10', category: 'stability', tier: T.gold, icon: '🛡️',
    title: '10 Verified in a Row', description: 'Ten consecutive verified measurements.',
    progress: d => ({ current: longestStreak(d.resultsAsc, r => !!r.verified), target: 10 })},

  // Endurance
  ...[
    [300,  T.bronze, '⏱️', '5-Minute Measurement',  '5 minutes'],
    [600,  T.silver, '🔥', '10-Minute Measurement', '10 minutes'],
  ].map(([sec, tier, icon, title, label]) => ({
    id: 'endurance-' + sec, category: 'endurance', tier, icon, title,
    description: `Complete a ${label} measurement.`,
    progress: d => {
      const pred = r => (r.duration_seconds || 0) >= sec;
      const hit = d.results.some(pred);
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit ? firstAt(d.resultsAsc, pred) : null };
    }
  })),
  // Gold tier: measurements are capped at 10 minutes, so a single 20-minute
  // measurement is impossible — the crown is earned by ACCUMULATING 20 minutes
  // of measurement within one (local) day. The id stays `endurance-1200` so
  // anyone who unlocked the old single-measurement version keeps their badge.
  { id: 'endurance-1200', category: 'endurance', tier: T.gold, icon: '👑',
    title: '20-Minute Day', description: 'Measure 20 minutes in total within a single day.',
    progress: d => {
      const sums = new Map();
      let best = 0, unlockedAt = null;
      for(const r of d.resultsAsc){
        const day = new Date(r.created_at).toLocaleDateString('en-CA');
        const s = (sums.get(day) || 0) + (r.duration_seconds || 0);
        sums.set(day, s);
        if(s > best) best = s;
        if(!unlockedAt && s >= 1200) unlockedAt = r.created_at;
      }
      return { current: Math.min(Math.floor(best / 60), 20), target: 20, unlockedAt };
    }
  },

  // Social & Community
  { id: 'joined-5', category: 'social', tier: T.bronze, icon: '🎈',
    title: 'Joined 5 Sessions', description: 'Take part in 5 group sessions.',
    progress: d => ({ current: d.results.filter(r => rkind(r) === 'session').length, target: 5 })},
  { id: 'joined-10', category: 'social', tier: T.silver, icon: '🎪',
    title: 'Joined 10 Sessions', description: 'Take part in 10 group sessions.',
    progress: d => ({ current: d.results.filter(r => rkind(r) === 'session').length, target: 10 })},
  { id: 'hosted-1', category: 'social', tier: T.bronze, icon: '🎙️',
    title: 'Hosted First Session', description: 'Create your first group session.',
    progress: d => ({ current: Math.min(d.hostedSessionsCount, 1), target: 1 })},
  { id: 'hosted-10', category: 'social', tier: T.gold, icon: '🌟',
    title: 'Hosted 10 Sessions', description: 'Create ten group sessions.',
    progress: d => ({ current: d.hostedSessionsCount, target: 10 })},

  // Practitioner Path (hidden unless is_practitioner)
  { id: 'practitioner-first-client', category: 'practitioner', tier: T.bronze, icon: '🪞',
    title: 'First Member Connected', description: 'Welcome your first member.',
    progress: d => ({ current: Math.min(d.clientsCount, 1), target: 1 })},
  { id: 'practitioner-clients-5', category: 'practitioner', tier: T.silver, icon: '🌐',
    title: '5 Members Connected', description: 'Five active member connections.',
    progress: d => ({ current: d.clientsCount, target: 5 })},
  { id: 'practitioner-clients-10', category: 'practitioner', tier: T.gold, icon: '🌍',
    title: '10 Members Connected', description: 'Ten active member connections.',
    progress: d => ({ current: d.clientsCount, target: 10 })},
  { id: 'practitioner-first-client-measurement', category: 'practitioner', tier: T.bronze, icon: '📡',
    title: 'First Member Measurement', description: 'See your first member save a measurement.',
    progress: d => ({ current: d.clientFirstMeasurementSeen ? 1 : 0, target: 1 })},
  { id: 'practitioner-guided-session', category: 'practitioner', tier: T.silver, icon: '🧭',
    title: 'Guided First Session', description: 'Host a session where one of your members joined.',
    progress: d => ({ current: d.guidedSession ? 1 : 0, target: 1 })},

  // Rare & Special
  { id: 'green-streak-3', category: 'special', tier: T.special, icon: '🌿',
    title: 'Three Green Averages in a Row', description: 'Three consecutive green-zone averages.',
    progress: d => ({ current: longestStreak(d.resultsAsc, r => (r.avg || 0) >= 13), target: 3 })},
  { id: 'verified-streak-25', category: 'special', tier: T.special, icon: '🏆',
    title: '25 Verified in a Row', description: 'Twenty-five consecutive verified measurements.',
    progress: d => ({ current: longestStreak(d.resultsAsc, r => !!r.verified), target: 25 })},
  { id: 'perfect-verification', category: 'special', tier: T.special, icon: '💎',
    title: 'Perfect Verification', description: '20 measurements, every single one verified.',
    progress: d => {
      const total = d.results.length;
      const verified = d.results.filter(r => r.verified).length;
      const flawless = total > 0 && verified === total;
      return { current: flawless ? total : 0, target: 20 };
    }},

  // Discovery — when (time of day, weekly rhythm)
  { id: 'morning-energy', category: 'discovery', tier: T.bronze, icon: '☀️',
    title: 'Morning Energy', description: 'Measure between 6:00 and 8:00 in the morning.',
    progress: d => {
      const pred = r => { const h = new Date(r.created_at).getHours(); return h >= 6 && h < 8; };
      const hit = d.results.some(pred);
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit ? firstAt(d.resultsAsc, pred) : null };
    }},
  { id: 'night-owl', category: 'discovery', tier: T.bronze, icon: '🌙',
    title: 'Night Owl', description: 'Measure after 10 PM.',
    progress: d => {
      const pred = r => new Date(r.created_at).getHours() >= 22;
      const hit = d.results.some(pred);
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit ? firstAt(d.resultsAsc, pred) : null };
    }},
  { id: 'around-the-clock', category: 'discovery', tier: T.silver, icon: '🕰️',
    title: 'Around the Clock', description: 'Measure morning, midday, and evening — all on the same day.',
    progress: d => {
      const byDate = new Map();
      for(const r of d.results){
        const dt = new Date(r.created_at);
        const key = dt.toLocaleDateString('en-CA');
        const h = dt.getHours();
        const seg = h >= 6 && h < 12 ? 'm' : h >= 12 && h < 18 ? 'n' : h >= 18 ? 'e' : null;
        if(!seg) continue;
        if(!byDate.has(key)) byDate.set(key, new Set());
        byDate.get(key).add(seg);
      }
      const hit = [...byDate.values()].some(s => s.size === 3);
      return { current: hit ? 1 : 0, target: 1 };
    }},
  { id: 'weekly-explorer', category: 'discovery', tier: T.gold, icon: '📅',
    title: 'Weekly Explorer', description: 'Measure on every weekday — Monday through Sunday.',
    progress: d => {
      const days = new Set();
      for(const r of d.results){ days.add(new Date(r.created_at).getDay()); }
      return { current: days.size, target: 7 };
    }},

  // Personal Growth — improvement-driven badges
  { id: 'personal-best', category: 'personal-growth', tier: T.bronze, icon: '📈',
    title: 'New Personal Best', description: 'Beat your previous best average by 10% or more.',
    progress: d => {
      let best = 0, hit = null;
      for(let i = 0; i < d.resultsAsc.length; i++){
        const r = d.resultsAsc[i];
        if(i >= 5 && best > 0 && (r.avg || 0) >= best * 1.1){ hit = r.created_at; break; }
        if((r.avg || 0) > best) best = r.avg || 0;
      }
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit };
    }},
  { id: 'breakthrough', category: 'personal-growth', tier: T.silver, icon: '🚀',
    title: 'Breakthrough', description: 'A single measurement 20% above your previous 10-average.',
    progress: d => {
      let hit = null;
      for(let i = 10; i < d.resultsAsc.length; i++){
        const prev10 = d.resultsAsc.slice(i - 10, i);
        const mean = prev10.reduce((s, x) => s + (x.avg || 0), 0) / 10;
        if(mean > 0 && (d.resultsAsc[i].avg || 0) >= 1.2 * mean){ hit = d.resultsAsc[i].created_at; break; }
      }
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit };
    }},
  { id: 'consistency-wins', category: 'personal-growth', tier: T.silver, icon: '🎯',
    title: 'Consistency Wins', description: 'Last 5 measurements with very low variation.',
    progress: d => {
      if(d.resultsAsc.length < 5) return { current: 0, target: 1 };
      const last5 = d.resultsAsc.slice(-5).map(r => r.avg || 0);
      const mean = last5.reduce((s, v) => s + v, 0) / 5;
      const std = Math.sqrt(last5.reduce((s, v) => s + (v - mean) ** 2, 0) / 5);
      return { current: std < 1.5 ? 1 : 0, target: 1 };
    }},
  { id: 'trend-up', category: 'personal-growth', tier: T.silver, icon: '📊',
    title: 'Trend Up', description: '5 consecutive measurements, each better than the last.',
    progress: d => {
      let cur = 1, best = 1;
      for(let i = 1; i < d.resultsAsc.length; i++){
        if((d.resultsAsc[i].avg || 0) > (d.resultsAsc[i - 1].avg || 0)){ cur++; if(cur > best) best = cur; }
        else cur = 1;
      }
      return { current: best, target: 5 };
    }},

  // Social additions
  { id: 'joined-25', category: 'social', tier: T.silver, icon: '🏕️',
    title: 'Community Member', description: 'Take part in 25 group sessions.',
    progress: d => ({ current: d.results.filter(r => rkind(r) === 'session').length, target: 25 })},
  { id: 'community-host', category: 'social', tier: T.silver, icon: '🎤',
    title: 'Community Host', description: 'Host a session with 5+ participants.',
    progress: d => ({ current: d.hostedParticipantsMax || 0, target: 5 })},
  { id: 'crowd-leader', category: 'social', tier: T.gold, icon: '🏟️',
    title: 'Crowd Leader', description: 'Host a session with 20+ participants.',
    progress: d => ({ current: d.hostedParticipantsMax || 0, target: 20 })},

  // Races (competitive). Win/Podium need ≥2 officially-ranked racers — a solo race
  // never grants them (raceWin / racePodium are computed with that rule upstream).
  { id: 'first-race', category: 'race', tier: T.bronze, icon: '🏁',
    title: 'First Race', description: 'Take part in your first race.',
    progress: d => ({ current: Math.min(d.raceCount || 0, 1), target: 1 })},
  { id: 'first-race-hosted', category: 'race', tier: T.bronze, icon: '🎬',
    title: 'First Race Hosted', description: 'Create your first race.',
    progress: d => ({ current: Math.min(d.hostedRacesCount || 0, 1), target: 1 })},
  { id: 'joined-5-races', category: 'race', tier: T.silver, icon: '🏎️',
    title: 'Joined 5 Races', description: 'Take part in five races.',
    progress: d => ({ current: d.raceCount || 0, target: 5 })},
  { id: 'hosted-5-races', category: 'race', tier: T.silver, icon: '📣',
    title: 'Hosted 5 Races', description: 'Create five races.',
    progress: d => ({ current: d.hostedRacesCount || 0, target: 5 })},
  { id: 'first-podium', category: 'race', tier: T.silver, icon: '🥉',
    title: 'First Podium', description: 'Finish top 3 in a race (with at least two ranked racers).',
    progress: d => ({ current: d.racePodium ? 1 : 0, target: 1 })},
  { id: 'first-race-win', category: 'race', tier: T.gold, icon: '🏆',
    title: 'First Race Win', description: 'Win a race — 1st place, with at least two ranked racers.',
    progress: d => ({ current: d.raceWin ? 1 : 0, target: 1 })},

  // Practitioner additions
  { id: 'practitioner-mentor-3', category: 'practitioner', tier: T.silver, icon: '🌱',
    title: 'Mentor', description: 'Three active member connections.',
    progress: d => ({ current: d.clientsCount, target: 3 })},
  { id: 'practitioner-circle', category: 'practitioner', tier: T.gold, icon: '🏛️',
    title: 'Spiritual Maker Circle', description: 'Five of your members in the same session.',
    progress: d => ({ current: d.practitionerCircleCount || 0, target: 5 })},

  // Vitality additions (Egely-specific)
  { id: 'balance', category: 'vitality', tier: T.bronze, icon: '⚖️',
    title: 'Balance', description: 'Spend time in the red, yellow, and green zones in one measurement.',
    progress: d => {
      const pred = r => (r.zone_red || 0) > 0 && (r.zone_yellow || 0) > 0 && (r.zone_green || 0) > 0;
      const hit = d.results.some(pred);
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit ? firstAt(d.resultsAsc, pred) : null };
    }},
  { id: 'flow-state', category: 'vitality', tier: T.gold, icon: '🌊',
    title: 'Flow State', description: '5+ continuous minutes in the green zone in one measurement.',
    progress: d => {
      const meets = r => {
        if(!Array.isArray(r.curve) || r.curve.length < 2) return false;
        const dt = (r.duration_seconds || 60) / r.curve.length;
        let run = 0;
        for(const v of r.curve){
          if(v >= 13){ run++; if(run * dt >= 300) return true; }
          else run = 0;
        }
        return false;
      };
      const hit = d.results.some(meets);
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit ? firstAt(d.resultsAsc, meets) : null };
    }},
  { id: 'vitality-master', category: 'vitality', tier: T.silver, icon: '💚',
    title: 'Vitality Master', description: 'Ten measurements with green-zone average.',
    progress: d => ({ current: d.results.filter(r => (r.avg || 0) >= 13).length, target: 10 })},

  // Experiments — milestones for finishing whole experiments (not per-topic, so
  // adding new experiments never spawns new badges). Fed by d.experimentsCompleted.
  { id: 'experiment-first', category: 'experiments', tier: T.bronze, icon: '🧪',
    title: 'First Experiment', description: 'Complete your first experiment.',
    progress: d => ({ current: Math.min(d.experimentsCompleted || 0, 1), target: 1 })},
  { id: 'experiment-5', category: 'experiments', tier: T.silver, icon: '⚗️',
    title: '5 Experiments', description: 'Complete five experiments.',
    progress: d => ({ current: d.experimentsCompleted || 0, target: 5 })},
  { id: 'experiment-10', category: 'experiments', tier: T.gold, icon: '🔬',
    title: '10 Experiments', description: 'Complete ten experiments.',
    progress: d => ({ current: d.experimentsCompleted || 0, target: 10 })},
  { id: 'experiment-25', category: 'experiments', tier: T.special, icon: '🧭',
    title: '25 Experiments', description: 'Complete twenty-five experiments.',
    progress: d => ({ current: d.experimentsCompleted || 0, target: 25 })},
];

// Build the full state list from a data bundle.
//   data = { results, hostedSessionsCount, connectedPractitionersCount,
//            isPractitioner, clientsCount, clientFirstMeasurementSeen, guidedSession }
export function computeAchievements(data){
  const results = data.results || [];
  const resultsAsc = [...results].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const bestPeak = results.reduce((m, r) => Math.max(m, r.peak || 0), 0);
  const bestAvg = results.reduce((m, r) => Math.max(m, r.avg || 0), 0);
  const d = { ...data, results, resultsAsc, bestPeak, bestAvg, distinctDays: distinctDays(results) };

  return ACHIEVEMENTS
    .filter(a => {
      const cat = CATEGORIES.find(c => c.id === a.category);
      return !cat || !cat.practitionerOnly || data.isPractitioner;
    })
    .map(a => {
      const p = a.progress(d);
      const current = Math.max(0, p.current || 0);
      const target = p.target;
      return {
        id: a.id, category: a.category, tier: a.tier, icon: a.icon,
        title: a.title, description: a.description,
        current, target,
        unlocked: current >= target,
        unlockedAt: p.unlockedAt || null,
      };
    });
}

// Pick the most relevant locked badges to highlight as "Next milestones".
export function pickNextMilestones(achievements, n = 3){
  const locked = achievements.filter(a => !a.unlocked);
  if(!locked.length) return [];
  const ratio = a => a.current / a.target;
  const withProgress = locked.filter(a => a.current > 0).sort((a, b) => ratio(b) - ratio(a));
  let picked;
  if(withProgress.length >= n){
    picked = withProgress.slice(0, n);
  } else {
    const seen = new Set(withProgress.map(a => a.id));
    const fallback = locked.filter(a => !seen.has(a.id))
      .sort((a, b) => {
        const ag = a.category === 'getting-started' ? 0 : 1;
        const bg = b.category === 'getting-started' ? 0 : 1;
        if(ag !== bg) return ag - bg;
        return a.target - b.target;
      });
    picked = [...withProgress, ...fallback].slice(0, n);
  }
  // Always feature the nearest Experiments milestone (a gentle nudge toward the
  // new feature). If none is already in the list, give it the last slot.
  if(n > 0 && !picked.some(a => a.category === 'experiments')){
    const exp = locked.filter(a => a.category === 'experiments')
      .sort((a, b) => (ratio(b) - ratio(a)) || (a.target - b.target))[0];
    if(exp) picked = [...picked.slice(0, n - 1), exp];
  }
  return picked.slice(0, n);
}
