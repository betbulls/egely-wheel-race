// Achievement engine: pure functions over the user's measurement history + a
// few aggregates. No persistent storage — each badge is recomputed on load.
//
// A definition has: id, category, tier, icon, title, description, and a
// progress(data) function returning { current, target, unlockedAt? }.
// `unlocked` is derived as current >= target.

const T = { bronze: 'bronze', silver: 'silver', gold: 'gold', special: 'special' };

export const CATEGORIES = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'consistency',     title: 'Consistency' },
  { id: 'vitality',        title: 'Vitality Milestones' },
  { id: 'stability',       title: 'Stability & Control' },
  { id: 'endurance',       title: 'Endurance' },
  { id: 'social',          title: 'Social & Community' },
  { id: 'practitioner',    title: 'Practitioner Path', practitionerOnly: true },
  { id: 'special',         title: 'Rare & Special' },
];

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
      const c = d.results.filter(r => r.session_id != null).length;
      return { current: Math.min(c, 1), target: 1,
        unlockedAt: c ? firstAt(d.resultsAsc, r => r.session_id != null) : null };
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
    title: 'First Connected Practitioner', description: 'Connect to your first practitioner.',
    progress: d => ({ current: d.connectedPractitionersCount > 0 ? 1 : 0, target: 1 })},
  { id: 'first-connected-client', category: 'getting-started', tier: T.bronze, icon: '👥',
    title: 'First Connected Client', description: 'Welcome your first client.',
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
    [1200, T.gold,   '👑', '20-Minute Measurement', '20 minutes'],
  ].map(([sec, tier, icon, title, label]) => ({
    id: 'endurance-' + sec, category: 'endurance', tier, icon, title,
    description: `Complete a ${label} measurement.`,
    progress: d => {
      const pred = r => (r.duration_seconds || 0) >= sec;
      const hit = d.results.some(pred);
      return { current: hit ? 1 : 0, target: 1, unlockedAt: hit ? firstAt(d.resultsAsc, pred) : null };
    }
  })),

  // Social & Community
  { id: 'joined-5', category: 'social', tier: T.bronze, icon: '🎈',
    title: 'Joined 5 Sessions', description: 'Take part in 5 group sessions.',
    progress: d => ({ current: d.results.filter(r => r.session_id != null).length, target: 5 })},
  { id: 'joined-10', category: 'social', tier: T.silver, icon: '🎪',
    title: 'Joined 10 Sessions', description: 'Take part in 10 group sessions.',
    progress: d => ({ current: d.results.filter(r => r.session_id != null).length, target: 10 })},
  { id: 'hosted-1', category: 'social', tier: T.bronze, icon: '🎙️',
    title: 'Hosted First Session', description: 'Create your first group session.',
    progress: d => ({ current: Math.min(d.hostedSessionsCount, 1), target: 1 })},
  { id: 'hosted-10', category: 'social', tier: T.gold, icon: '🌟',
    title: 'Hosted 10 Sessions', description: 'Create ten group sessions.',
    progress: d => ({ current: d.hostedSessionsCount, target: 10 })},

  // Practitioner Path (hidden unless is_practitioner)
  { id: 'practitioner-first-client', category: 'practitioner', tier: T.bronze, icon: '🪞',
    title: 'First Client Connected', description: 'Welcome your first client.',
    progress: d => ({ current: Math.min(d.clientsCount, 1), target: 1 })},
  { id: 'practitioner-clients-5', category: 'practitioner', tier: T.silver, icon: '🌐',
    title: '5 Clients Connected', description: 'Five active client connections.',
    progress: d => ({ current: d.clientsCount, target: 5 })},
  { id: 'practitioner-clients-10', category: 'practitioner', tier: T.gold, icon: '🌍',
    title: '10 Clients Connected', description: 'Ten active client connections.',
    progress: d => ({ current: d.clientsCount, target: 10 })},
  { id: 'practitioner-first-client-measurement', category: 'practitioner', tier: T.bronze, icon: '📡',
    title: 'First Client Measurement', description: 'See your first client save a measurement.',
    progress: d => ({ current: d.clientFirstMeasurementSeen ? 1 : 0, target: 1 })},
  { id: 'practitioner-guided-session', category: 'practitioner', tier: T.silver, icon: '🧭',
    title: 'Guided First Session', description: 'Host a session where one of your clients joined.',
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
  const withProgress = locked.filter(a => a.current > 0)
    .sort((a, b) => (b.current / b.target) - (a.current / a.target));
  if(withProgress.length >= n) return withProgress.slice(0, n);
  const seen = new Set(withProgress.map(a => a.id));
  const fallback = locked.filter(a => !seen.has(a.id))
    .sort((a, b) => {
      const ag = a.category === 'getting-started' ? 0 : 1;
      const bg = b.category === 'getting-started' ? 0 : 1;
      if(ag !== bg) return ag - bg;
      return a.target - b.target;
    });
  return [...withProgress, ...fallback].slice(0, n);
}
