// ============================================================================
//  EXPERIMENTS CONTENT — this is the only file you edit to add/change content.
// ============================================================================
//  See EXPERIMENTS-GUIDE.md for a full, step-by-step authoring guide.
//
//  Voice: an intelligent friend guiding an interesting experiment — National
//  Geographic + exploration, never guru/teacher/scientist. Each day:
//    intro = a curious observation (the hook) that opens a question,
//    task  = exactly what to do ("Try this"),
//    practice = what to carry into the measurement, ending with a "Notice ..."
//               cue, and reflectionPrompt asks back about exactly that cue.
//  Telekinesis as a word only appears later in the topic — early experiments
//  build focus, attention, intention, presence first.
//
//  Quick rules:
//   • Wrap every sentence/title in BACKTICKS  ` ... `  (not ' or ").
//   • Each experiment `id` and each day `id` is permanent — never reuse/rename.
//   • Keep every comma and every { } [ ] exactly where it is.
//   • Cover images are square files in  assets/experiments/  (see the guide).
// ============================================================================

export const TOPICS = [
  { id: 'telekinesis',  title: `Telekinesis`,    icon: '🧠', cover: 'assets/experiments/telekinesis.jpg',  order: 1 },
  { id: 'meditation',   title: `Meditation`,     icon: '🧘', cover: 'assets/experiments/meditation.jpg',   order: 2 },
  { id: 'breathwork',   title: `Breathwork`,     icon: '🌬️', cover: 'assets/experiments/breathwork.jpg',   order: 3 },
  { id: 'energy-focus', title: `Energy & Focus`, icon: '⚡', cover: 'assets/experiments/energy-focus.jpg', order: 4 },
];

export const EXPERIMENTS = [
  {
    id: 'focus-intention',
    topic: 'telekinesis',
    title: `Focus & Intention`,
    level: 'Beginner',
    cover: 'assets/experiments/focus-intention.jpg',
    order: 1,
    summary: `Four short days exploring how steady your attention really is — and what a focused, intentional mind looks like on the wheel.`,
    days: [
      { id: 'd1', title: `One-Pointed Attention`,
        intro: `Your attention almost never sits still. Right now, without trying, it has probably already jumped a few times — to a sound, a thought, this very sentence. We rarely notice how restless the mind is until we ask it to stay in one place. Today you find out how long yours can hold.`,
        task: `Pick one small point on the Egely Wheel — a single light, an edge, anything tiny. Rest your eyes and your attention there. Each time you notice your mind has slipped away, gently bring it back to that one point — no effort, no frustration, just return.`,
        practice: `Keep that single point as your anchor for the whole measurement. Don't try to make anything happen — just hold your attention there. Notice how often your mind wanders off before you catch it.`,
        reflectionPrompt: `How many times did your attention slip away before you noticed?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Clarity of Intention`,
        intro: `Yesterday you felt how easily attention drifts. Part of the reason is that the mind needs something clear to hold on to. A vague aim — "focus" — slips away almost at once; a specific one gives attention a place to land. Today you give it one.`,
        task: `Before you begin, decide on one simple, clear intention and say it once in your mind — for example, "I will keep my attention on this one light." Don't repeat it or push it. Just set it, then let it quietly guide you.`,
        practice: `Hold that single intention through the measurement, coming back to it whenever you drift. Notice whether a clear aim makes it easier to stay than yesterday's open focus did.`,
        reflectionPrompt: `Did a clear intention make it easier to stay than open focus did yesterday?`,
        measureSeconds: 120 },
      { id: 'd3', title: `Holding a Single Thought`,
        intro: `A clear aim is easy to set and surprisingly hard to keep. Within seconds the mind offers replacements — a better idea, a small worry, a plan for later. Holding a single thought isn't about force; it's about noticing the swap and choosing to stay. Today you practise the staying.`,
        task: `Choose one quiet anchor tied to your focus — a word like "steady" or "here", or simply the image of the wheel. Keep returning to it. When another thought arrives, let it pass without following it, and come back.`,
        practice: `Stay with your one anchor for the whole session, as unbroken as you can. Notice how long you can hold it before the first replacement thought sneaks in.`,
        reflectionPrompt: `How long could you hold your single thought before another one took over?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Intention Measurement`,
        intro: `You've practised landing your attention, setting a clear intention, and holding it steady. Today you simply put them together and watch what happens — no goal, no straining, just a clean read of a calm, intentional mind. Think of this as the baseline you'll return to as the journey continues.`,
        task: `Settle for a moment, set one clear intention, and rest your attention on the wheel the way you've practised. Keep it relaxed and steady — engaged, but never forcing.`,
        practice: `Hold focus and intention together for the full measurement. Notice whether this combined state feels steadier than focus or intention did on their own.`,
        reflectionPrompt: `Did focus and intention together feel steadier than either one alone?`,
        measureSeconds: 150 },
    ],
  },
];

// ============================================================================
//  Below this line is logic — DO NOT EDIT unless you know what you're doing.
// ============================================================================

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

// Count of fully-completed experiments — fed to the achievement engine.
export function completedExperimentCount(progByExp){
  let n = 0;
  for(const p of progByExp.values()){ if(p && p.completed) n++; }
  return n;
}
