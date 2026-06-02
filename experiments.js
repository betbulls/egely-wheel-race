// Experiments content catalog — pure data, authored by hand. Adding new topics
// or experiments here requires NO other code changes.
//
// IMPORTANT invariants (keep these to avoid breaking user progress):
//  - Every experiment `id` is stable and UNIQUE and is NEVER reused.
//  - Every day has a stable `id` (e.g. 'd1') that is NEVER reused or repurposed.
//    Progress is keyed on these day ids — so you can insert/reorder days later
//    without corrupting anyone's progress. (Display order = array order.)
//  - `measureSeconds` is the required measurement length to complete that day.
//  - Cover images are static files in the repo, e.g. assets/experiments/<file>.

export const TOPICS = [
  { id: 'telekinesis',  title: 'Telekinesis',     icon: '🧠', cover: 'assets/experiments/telekinesis.jpg',  order: 1 },
  { id: 'meditation',   title: 'Meditation',      icon: '🧘', cover: 'assets/experiments/meditation.jpg',   order: 2 },
  { id: 'breathwork',   title: 'Breathwork',      icon: '🌬️', cover: 'assets/experiments/breathwork.jpg',   order: 3 },
  { id: 'energy-focus', title: 'Energy & Focus',  icon: '⚡', cover: 'assets/experiments/energy-focus.jpg', order: 4 },
];

export const EXPERIMENTS = [
  {
    id: 'telekinesis-fundamentals',
    topic: 'telekinesis',
    title: 'Telekinesis Fundamentals',
    level: 'Beginner',
    cover: 'assets/experiments/telekinesis-fundamentals.jpg',
    order: 1,
    summary: 'Five gentle days to learn the basics of focused intention with your Egely Wheel.',
    days: [
      { id: 'd1', title: 'Getting Grounded',
        intro: 'Before influencing anything outside you, settle what is inside you. Today is about arriving — calm body, quiet mind, steady breath.',
        task: 'Sit comfortably for two minutes. Let your shoulders drop and your breathing slow. Notice the wheel in front of you without trying to move it.',
        practice: 'Rest your attention lightly on the wheel. No effort, no force — just presence.',
        reflectionPrompt: 'How did your body feel before the measurement?',
        measureSeconds: 120 },
      { id: 'd2', title: 'Finding Your Focus',
        intro: 'Energy follows attention. Today you practise pointing a single, soft beam of focus at one spot.',
        task: 'Pick one point on the wheel. Keep returning your gaze and intention to it whenever the mind wanders.',
        practice: 'Hold a calm, unbroken focus for the full measurement. Soft, not strained.',
        reflectionPrompt: 'Where did your attention drift, and how did you bring it back?',
        measureSeconds: 150 },
      { id: 'd3', title: 'Intention Without Force',
        intro: 'The paradox of energy work: the harder you push, the less happens. Today is about willing without straining.',
        task: 'Imagine the wheel already moving the way you wish. Hold the feeling of it, not the effort of it.',
        practice: 'Measure while keeping a relaxed, confident intention — as if the outcome is already true.',
        reflectionPrompt: 'Did relaxing your effort change anything you noticed?',
        measureSeconds: 150 },
      { id: 'd4', title: 'Breath as a Lever',
        intro: 'The breath is the simplest tool to raise and steady your energy. Today you pair breath with intention.',
        task: 'Breathe slowly: four counts in, six counts out. On each exhale, send calm attention toward the wheel.',
        practice: 'Keep the slow breath going through the whole measurement.',
        reflectionPrompt: 'How did the slow breathing affect your reading?',
        measureSeconds: 180 },
      { id: 'd5', title: 'Putting It Together',
        intro: 'Grounding, focus, relaxed intention, breath — today you bring all four into one calm session.',
        task: 'Run through each skill briefly, then settle into a single steady state of focused calm.',
        practice: 'Measure in that combined state and simply observe what your energy does today.',
        reflectionPrompt: 'What felt different from Day 1?',
        measureSeconds: 180 },
    ],
  },
  {
    id: 'telekinesis-focus-intention',
    topic: 'telekinesis',
    title: 'Focus & Intention',
    level: 'Beginner',
    cover: 'assets/experiments/telekinesis-focus-intention.jpg',
    order: 2,
    summary: 'Four days sharpening the quality of your attention and the clarity of your intent.',
    days: [
      { id: 'd1', title: 'One-Pointed Attention',
        intro: 'A scattered mind spreads energy thin. Today you gather it into a single point.',
        task: 'Choose one LED light on the wheel and keep your attention there, returning gently each time it slips.',
        practice: 'Hold the single point for the whole measurement.',
        reflectionPrompt: 'How long could you hold focus before drifting?',
        measureSeconds: 120 },
      { id: 'd2', title: 'Clarity of Intent',
        intro: 'Vague wishes produce vague results. Today you make your intention crisp and specific.',
        task: 'Decide exactly what you intend before you start — say it once, clearly, in your mind.',
        practice: 'Measure while holding that one clear intention.',
        reflectionPrompt: 'Was your intention clearer than yesterday?',
        measureSeconds: 150 },
      { id: 'd3', title: 'Holding Steady',
        intro: 'Consistency beats intensity. Today is about a calm, unwavering hold.',
        task: 'Keep the same calm intention from start to finish, resisting the urge to "try harder".',
        practice: 'Steady, even attention for the full session.',
        reflectionPrompt: 'Where did you feel the urge to push, and what happened when you let it go?',
        measureSeconds: 150 },
      { id: 'd4', title: 'Effortless Effort',
        intro: 'The goal state: fully engaged, completely relaxed. Today you aim for that balance.',
        task: 'Engage your focus and intention, then soften everything around it.',
        practice: 'Measure in that engaged-yet-relaxed state.',
        reflectionPrompt: 'Did effortless focus feel different in your body?',
        measureSeconds: 180 },
    ],
  },
];

// ---- Pure helpers over content (+ optional progress) -------------------------

export function topicsOrdered(){ return [...TOPICS].sort((a, b) => a.order - b.order); }
export function getTopic(id){ return TOPICS.find(t => t.id === id) || null; }
export function getExperiment(id){ return EXPERIMENTS.find(e => e.id === id) || null; }
export function experimentsByTopic(topicId){
  return EXPERIMENTS.filter(e => e.topic === topicId).sort((a, b) => a.order - b.order);
}
export function dayIndex(exp, day){ return exp.days.indexOf(day); }
export function dayNumber(exp, day){ return exp.days.indexOf(day) + 1; }

// progress entry shape: { completedDays:Set<dayId>, completed:bool, startedAt, completedAt }
export function experimentState(exp, prog){
  const done = (prog && prog.completedDays) || new Set();
  const total = exp.days.length;
  const completedCount = exp.days.filter(d => done.has(d.id)).length;
  const currentDay = exp.days.find(d => !done.has(d.id)) || null;   // null when fully complete
  const completed = total > 0 && completedCount === total;
  const status = completed ? 'completed' : completedCount > 0 ? 'in-progress' : 'not-started';
  return { total, completedCount, currentDay, completed, status,
           currentNumber: currentDay ? dayNumber(exp, currentDay) : total };
}

// A day is unlocked if it is completed OR it is the current (first incomplete) one.
export function isDayUnlocked(exp, day, prog){
  const done = (prog && prog.completedDays) || new Set();
  if(done.has(day.id)) return true;
  const firstIncomplete = exp.days.find(d => !done.has(d.id));
  return firstIncomplete && firstIncomplete.id === day.id;
}

export function topicProgress(topicId, progByExp){
  const exps = experimentsByTopic(topicId);
  const completed = exps.filter(e => { const p = progByExp.get(e.id); return p && p.completed; }).length;
  return { total: exps.length, completed };
}

// The most recently started, still-incomplete experiment (for the "Continue" hero).
export function pickContinue(progByExp){
  let best = null, bestTime = -1;
  for(const exp of EXPERIMENTS){
    const p = progByExp.get(exp.id);
    if(!p || p.completed || p.completedDays.size === 0) continue;
    const t = p.startedAt ? new Date(p.startedAt).getTime() : 0;
    if(t >= bestTime){ bestTime = t; best = exp; }
  }
  return best;
}

// Count of fully-completed experiments — fed to the achievement engine later.
export function completedExperimentCount(progByExp){
  let n = 0;
  for(const p of progByExp.values()){ if(p && p.completed) n++; }
  return n;
}
