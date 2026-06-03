// ============================================================================
//  EXPERIMENTS CONTENT — this is the only file you edit to add/change content.
// ============================================================================
//  See EXPERIMENTS-GUIDE.md for a full, step-by-step authoring guide.
//
//  Voice & standard (keep this for every experiment):
//   • An intelligent friend guiding an interesting experiment — National
//     Geographic + exploration, never guru / teacher / lecturer / skeptic.
//   • intro  = a curious observation (the hook). VARY the source: psychology,
//     attention research, perception, meditation traditions, historical
//     experiments, famous researchers, surprising brain facts. Don't lecture.
//   • task ("Try this")       = exactly what to do, concrete.
//   • practice ("While you measure") = what to carry into the measurement,
//     ending with a "Notice ..." cue; reflectionPrompt asks back about that cue.
//   • Never claim what the wheel measures — say "observe what happens",
//     "notice whether anything changes". The wheel is a discovery instrument.
//   • The user is PARTICIPATING IN AN EXPERIMENT, never doing homework.
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
  // ==========================================================================
  //  1 — Focus & Intention  (the gentle entry: how steady is attention, really?)
  // ==========================================================================
  {
    id: 'focus-intention',
    topic: 'telekinesis',
    title: `Focus & Intention`,
    level: 'Beginner',
    cover: 'assets/experiments/focus-intention.jpg',
    order: 1,
    summary: `Four short days exploring how steady your attention really is — and what a focused, intentional mind feels like.`,
    days: [
      { id: 'd1', title: `One-Pointed Attention`,
        intro: `Researchers who pinged people at random moments found something humbling: our minds are wandering nearly half of our waking lives — and most of the time we don't even notice. We only feel how restless attention is when we ask it to stay in one place. Today you find out how long yours can hold.`,
        task: `Pick one small point on the Egely Wheel — a single light, an edge, anything tiny. Rest your eyes and your attention there. Each time you catch your mind drifting off, bring it back to that one point — no effort, no frustration, just return.`,
        practice: `Keep that single point as your anchor for the whole measurement, returning to it whenever you slip. Don't try to make anything happen — simply hold your attention and observe. Notice how often your mind wanders off before you catch it.`,
        reflectionPrompt: `How many times did your attention slip away before you noticed?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Clarity of Intention`,
        intro: `There is a curious gap between "I want to focus" and "I will keep my eyes on this one light." Psychologists have found that a vague aim tends to evaporate, while a specific, concrete one sticks — the clearer the instruction you give yourself, the more your mind obeys it. Today you test that on yourself.`,
        task: `Before you begin, choose one simple, exact intention and say it once in your mind — for example, "I will rest my attention on this single point." Don't repeat it or strain over it. Set it clearly, then let it quietly steer you.`,
        practice: `Hold that one clear intention through the measurement, coming back to it whenever you drift. Notice whether a precise aim makes it easier to stay than yesterday's open focus did.`,
        reflectionPrompt: `Did a clear, specific intention make it easier to stay than open focus did yesterday?`,
        measureSeconds: 120 },
      { id: 'd3', title: `Holding a Single Thought`,
        intro: `Try not to think of a white bear — and suddenly it's all you can think of. The psychologist Daniel Wegner used exactly this to show how the mind rebels against force: the harder you push a thought, the louder it gets. Holding a single thought works the other way around — not by force, but by gently noticing the replacements and letting them pass.`,
        task: `Choose one quiet anchor tied to your focus — a word like "steady" or "here", or simply the image of the wheel. Keep returning to it. When another thought arrives, don't fight it; let it drift by and come back.`,
        practice: `Stay with your one anchor for the whole session, as unbroken as you can, without forcing. Notice how long you can hold it before the first replacement thought slips in.`,
        reflectionPrompt: `How long could you hold your single thought before another one took its place?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Intention Measurement`,
        intro: `You've now felt three things most people never separate: how restless raw attention is, how a clear intention steadies it, and how holding a single thought asks for patience rather than effort. Today you simply bring them together and watch what a calm, intentional mind does — no goal, no pushing. Think of it as a baseline you'll quietly return to as the journey goes on.`,
        task: `Settle for a moment, set one clear intention, and rest your attention on the wheel the way you've practised. Keep it relaxed and engaged at the same time — present, but never straining.`,
        practice: `Hold focus and intention together for the full measurement. Notice whether this combined state feels steadier than focus or intention did on their own.`,
        reflectionPrompt: `Did focus and intention together feel steadier than either one alone?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Attention Training  (the training ground: wander, return, last, watch)
  // ==========================================================================
  {
    id: 'attention-training',
    topic: 'telekinesis',
    title: `Attention Training`,
    level: 'Beginner',
    cover: 'assets/experiments/attention-training.jpg',
    order: 2,
    summary: `Five days getting to know your own attention — how it wanders, how it returns, and how it slowly learns to stay.`,
    days: [
      { id: 'd1', title: `The Wandering Mind`,
        intro: `When your mind drifts, it isn't malfunctioning — it's doing exactly what brains do at rest. There's a whole network that switches on the moment a task lets go, pulling you into memories, plans and daydreams. The first step in training attention isn't to stop the wandering; it's simply to see it happening.`,
        task: `Sit comfortably with the wheel in front of you and let your attention rest on it loosely. Don't try to control your mind — just watch where it goes. Each time you realise you've drifted, quietly note "wandering", and return.`,
        practice: `For the whole measurement, your only job is to catch the wandering, not prevent it. Stay relaxed and curious about your own mind. Notice the moment you realise you'd drifted — that flash of "oh, I left" is the skill you're building.`,
        reflectionPrompt: `How quickly did you tend to notice once your mind had wandered off?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Returning Without Frustration`,
        intro: `"The faculty of voluntarily bringing back a wandering attention, over and over again," wrote William James in 1890, "is the very root of judgment, character, and will." Notice what he praised: not a mind that never wanders, but one that returns. Every drift, then, isn't a failure — it's one more repetition that strengthens the muscle.`,
        task: `Rest your attention on the wheel again. This time, treat each wandering as a welcome chance to practise the return. No irritation, no scorekeeping — just a calm, friendly "and back".`,
        practice: `Through the measurement, return as many times as you need, each time a little more kindly. Notice whether letting go of frustration makes the returning easier and smoother.`,
        reflectionPrompt: `Did dropping the frustration make it easier to bring your attention back?`,
        measureSeconds: 120 },
      { id: 'd3', title: `Extended Attention`,
        intro: `Even trained watchers — radar operators, airport screeners — show a strange dip: the longer they look, the more they miss. Attention has a natural slope downward over time, which is why simply lasting is a skill in itself. Today you lean gently into that slope instead of fighting it.`,
        task: `Choose your single anchor on the wheel and settle in for a slightly longer hold than before. When the mid-session dullness arrives — and it will — meet it with a small fresh breath and a renewed look, rather than more effort.`,
        practice: `Carry your attention through the whole measurement, especially the middle stretch where focus usually fades. Notice when the dip arrives, and what helps you ride through it.`,
        reflectionPrompt: `When did your focus dip during the session, and what helped you stay with it?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Quiet Observation`,
        intro: `In many contemplative traditions there's a quiet shift from doing to watching — from steering the mind to simply witnessing it, the way you'd watch clouds without grabbing at them. It sounds passive, but it's a sharper, more alert state than it seems. Today you practise being the observer rather than the manager of your mind.`,
        task: `Let your attention rest on the wheel, and instead of correcting your mind, just observe it — thoughts, sensations, the wandering, the returning, all of it. Watch without joining in.`,
        practice: `For the measurement, take the seat of the quiet observer. Don't push or fix anything; only watch. Notice whether observing your mind, rather than wrestling with it, changes how steady you feel.`,
        reflectionPrompt: `Did watching your mind instead of managing it leave you calmer or steadier?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Stable Presence`,
        intro: `After days of catching the wander, returning, lasting and watching, something quietly accumulates: presence — being here, with one thing, without strain. It's less a technique than a place the mind can now find more easily. Today you simply rest there and see how it holds.`,
        task: `Take your anchor on the wheel one more time, but this time don't "try" at all. Let the attention settle the way it has learned to, and stay — soft, awake, present.`,
        practice: `Rest in that stable presence for the whole measurement, returning gently if you drift. Notice how this trained, settled attention feels compared with the restless mind of Day 1.`,
        reflectionPrompt: `How different did your attention feel today compared with the first day?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Object Awareness  (the lost art of really seeing; the wheel as target)
  // ==========================================================================
  {
    id: 'object-awareness',
    topic: 'telekinesis',
    title: `Object Awareness`,
    level: 'Intermediate',
    cover: 'assets/experiments/object-awareness.jpg',
    order: 3,
    summary: `Five days on the lost art of really seeing — and turning that fresh, detailed attention toward the wheel itself.`,
    days: [
      { id: 'd1', title: `Looking Without Judging`,
        intro: `Your brain is brilliantly lazy: the instant it recognises something — "a wheel", "a light" — it stops truly looking and runs on the label instead. It's efficient, but it means we spend most of the day not really seeing what's in front of us. Today you switch the labelling off and look as if for the first time.`,
        task: `Place the Egely Wheel in front of you and look at it as though you'd never seen one before. Drop the words and the function; just take in shape, colour, surface, light. Whenever your mind says "I know what this is", set the thought down and keep looking.`,
        practice: `For the measurement, keep looking without naming or judging — pure, fresh seeing. Notice how much more appears once you stop telling yourself you already know what's there.`,
        reflectionPrompt: `What did you notice about the wheel that you'd never really seen before?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Exploring Details`,
        intro: `In a famous 1999 experiment, people watching a video and counting basketball passes were so absorbed that half of them missed a person in a gorilla suit strolling through and beating their chest for nine whole seconds. We don't see with our eyes so much as with our attention — and details only exist for us when we go looking for them. Today you go hunting.`,
        task: `Examine the wheel closely and find three small details you've never consciously registered — a mark, a reflection, the exact way the light sits on one edge. Move slowly; let each detail fully arrive before the next.`,
        practice: `During the measurement, keep your attention fine and exploratory, drinking in detail. Notice whether actively looking for more actually makes more appear.`,
        reflectionPrompt: `Did searching for detail make the wheel reveal more than passive looking did?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Feeling Familiarity`,
        intro: `There's a quiet paradox in attention: the things we see most often, we see least. A face we love, a room we live in, a tool we use daily — familiarity makes them fade into the background, a process the brain calls habituation. Today you deliberately un-fade something that has already grown familiar to you: the wheel.`,
        task: `Look at the wheel you now know well — and refuse to let it go invisible. Find the freshness inside the familiar: see it the way you did on the very first day, but with everything you've since learned about looking.`,
        practice: `Hold that fresh-yet-familiar attention through the measurement. Notice whether you can keep something familiar from quietly fading into the background.`,
        reflectionPrompt: `Could you keep the familiar wheel feeling vivid, or did it start to fade from attention?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Object Connection`,
        intro: `Most people will tell you they can feel when someone is staring at them from behind — and surveys across several countries put that figure as high as nine in ten. Whatever explains it, it points to something we rarely examine: attention can feel like a kind of connection, a line drawn between you and whatever you attend to. Today you explore that line, pointed at the wheel.`,
        task: `Rest your full attention on the wheel and let it become less like "looking at an object" and more like "being with" it — a quiet, two-way attention, as if you and the wheel share the same small space.`,
        practice: `Keep that sense of connected attention through the measurement, present and unhurried. Notice whether attending to the wheel as a connection feels different from simply staring at it.`,
        reflectionPrompt: `Did attending to the wheel as a connection feel different from plain looking?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Sustained Awareness`,
        intro: `Long before laboratories, yogis practised trataka — gazing steadily at a single flame or point until the eyes water and the mind grows still. Described in a 15th-century manual as a bridge from concentration into meditation, it's one of the oldest attention trainings we know of. Today you give the wheel that same patient, unbroken gaze.`,
        task: `Settle in and rest a soft, steady gaze on one point of the wheel. Blink when you must, but keep returning to the same point, letting the looking become calm and continuous.`,
        practice: `Sustain that quiet, one-pointed awareness for the whole measurement. Notice what happens in your mind — and to your sense of the wheel — when you simply keep looking.`,
        reflectionPrompt: `What changed in your attention, or in the wheel, the longer you held a steady gaze?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Directed Intention  (learning to aim; the old experiments appear)
  // ==========================================================================
  {
    id: 'directed-intention',
    topic: 'telekinesis',
    title: `Directed Intention`,
    level: 'Intermediate',
    cover: 'assets/experiments/directed-intention.jpg',
    order: 4,
    summary: `Five days learning to aim — pointing a calm, clear intention at the wheel, and meeting the people who once tried to measure exactly that.`,
    days: [
      { id: 'd1', title: `Choosing a Direction`,
        intro: `Attention has two modes: it gets yanked around by whatever is loudest — a flash, a noise — or it gets aimed, on purpose, by you. That second mode, deliberately choosing where the mind points, is one of the quiet superpowers of being human. So far you've steadied attention; now you start to direct it.`,
        task: `Decide, before you begin, exactly where your attention and intention will go on the wheel — one chosen point, one clear aim. Then place them there deliberately, like setting something down with care.`,
        practice: `Keep your attention where you chose to put it for the whole measurement, returning it on purpose each time. Notice the difference between attention that drifts and attention you actively aim.`,
        reflectionPrompt: `Could you feel the difference between attention wandering and attention you deliberately aimed?`,
        measureSeconds: 150 },
      { id: 'd2', title: `Mental Consistency`,
        intro: `In the 1930s a botanist named J. B. Rhine set up a lab at Duke University and spent years on a strange question: could a person, just by intending it, nudge how tossed dice landed? Across tens of thousands of throws, what seemed to matter wasn't dramatic effort but consistency — a steady, repeated intention. Whatever you make of his results, the real lesson is the discipline of holding one aim, unwavering.`,
        task: `Pick one simple intention toward the wheel and commit to keeping it identical from start to finish — same point, same calm aim, no changing your mind midway. Consistency over intensity.`,
        practice: `Hold that one unchanging intention through the measurement. Notice how hard or easy it is to keep a single aim perfectly steady, without it shifting or escalating.`,
        reflectionPrompt: `How steady could you keep one unchanging intention from start to finish?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Intentional Focus`,
        intro: `Forty years ago the physicist Helmut Schmidt built a machine driven by radioactive decay — about as random as nature gets — and asked volunteers to make a red light flash more often than a green one using nothing but intention. The experiments are still argued over, but the posture he asked of people is worth borrowing: relaxed, focused, intending one clear thing without tensing for it. Today you take that posture toward the wheel.`,
        task: `Choose one clear, simple intention and hold it with a focus that is alert but loose — engaged, never clenched. Aim, but don't grip.`,
        practice: `Keep that intentional focus through the measurement, calm and pointed at once. Notice whether you can stay sharply focused and physically relaxed at the same time.`,
        reflectionPrompt: `Were you able to hold a sharp intention while keeping your body and mind relaxed?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Reducing Mental Noise`,
        intro: `At a loud party you can somehow follow one voice and let the rest blur into a murmur — an everyday miracle psychologists named the "cocktail party effect" back in 1953. A clear signal isn't only about turning the signal up; it's about turning the noise down. Today you quiet the inner party so your single intention can stand out.`,
        task: `Before you begin, take a few slow breaths and let the mental chatter settle. Then bring up one clear intention toward the wheel, and let everything else fade to background, the way that one voice does at a party.`,
        practice: `Hold the quiet, single intention through the measurement, gently lowering any noise that rises. Notice whether less mental noise makes your one intention feel clearer and stronger.`,
        reflectionPrompt: `Did quieting your mental chatter make your single intention feel clearer?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Directed Measurement`,
        intro: `You've chosen a direction, held it consistently, sharpened it while staying loose, and cleared the noise around it. Those four are the whole craft of directed intention — the same craft those old laboratories were clumsily reaching for. Today you simply put them together and aim, cleanly, at the wheel.`,
        task: `Settle, quiet the noise, choose one clear direction, and place a steady, relaxed intention on the wheel — all the pieces at once, lightly held.`,
        practice: `Hold that complete, directed intention for the full measurement. Notice how a fully aimed mind feels compared with the scattered attention you started this topic with.`,
        reflectionPrompt: `How did a fully directed intention feel compared with where you began this topic?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Telekinesis Foundations  (the culmination; the word appears, openly)
  // ==========================================================================
  {
    id: 'telekinesis-foundations',
    topic: 'telekinesis',
    title: `Telekinesis Foundations`,
    level: 'Advanced',
    cover: 'assets/experiments/telekinesis-foundations.jpg',
    order: 5,
    summary: `Five days bringing it all together — and meeting, at last, the old and stubborn question that people have called telekinesis.`,
    days: [
      { id: 'd1', title: `Preparing the Mind`,
        intro: `Nikola Tesla claimed he could build a machine entirely in his head — "I needed no models, drawings or experiments", he wrote; he would picture a device, run it, and even watch it wear out, all in his mind. Whatever the truth of it, it shows how real a vividly prepared mental image can become. Before any session, the mind is prepared — and that is where you begin.`,
        task: `Before measuring, take a minute to prepare: settle the body, steady the breath, and bring up a calm, clear picture of what you intend — focused, relaxed, present. Don't measure yet; just prepare the mind fully.`,
        practice: `Carry that prepared state into the measurement and simply hold it. Notice whether a minute of deliberate preparation changes the quality of the focus that follows.`,
        reflectionPrompt: `Did preparing your mind first change how steady your focus felt afterward?`,
        measureSeconds: 150 },
      { id: 'd2', title: `Stable Intention`,
        intro: `For nearly thirty years an engineering lab at Princeton ran a quiet, controversial experiment: people sat before a machine spitting out random numbers and simply held the intention for it to drift higher or lower. The effect they reported was tiny and hotly debated — but the instruction given to volunteers was beautifully simple, and it's yours today: hold one stable intention, and let go of trying.`,
        task: `Choose a single, clear intention toward the wheel and hold it with a light, unwavering steadiness. Don't strain toward a result — set the intention and let it rest, stable and patient.`,
        practice: `Maintain that one stable intention through the whole measurement, calm and unforced. Notice the difference between holding an intention and straining for an outcome.`,
        reflectionPrompt: `Could you hold a stable intention without slipping into straining for a result?`,
        measureSeconds: 180 },
      { id: 'd3', title: `Deep Focus`,
        intro: `In the yogic map of the mind, steady concentration can tip into a deeper, more absorbed state where attention stops feeling like effort and starts to feel like resting in one place. Athletes know a cousin of it as "flow". It tends to arrive only after the easy distractions have burned off. Today you give it room to appear.`,
        task: `Settle into your prepared, intentional state on the wheel and let it deepen. Don't chase a special experience; simply keep returning, patiently, past the first restless minutes, and let the focus grow quiet and absorbed.`,
        practice: `Hold a deep, settled focus for the whole measurement, letting it deepen rather than forcing it. Notice whether, past the early restlessness, your attention drops into something quieter.`,
        reflectionPrompt: `Did your focus deepen into something quieter once the early restlessness passed?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Extended Measurement`,
        intro: `If anything subtle is ever going to show, the old researchers tended to agree on one thing: it would be small, and it would need time and patience rather than force. So today is simply about staying — holding your prepared, stable, deep focus longer than feels natural, with nothing to prove. Endurance here isn't strain; it's the willingness to remain.`,
        task: `Bring everything you've built — preparation, stable intention, deep focus — and settle in for a longer hold than usual. When the urge to stop or check the time arrives, meet it with one more calm breath and stay.`,
        practice: `Sustain the state for the full, longer measurement, patient and unforcing throughout. Notice what happens to your mind — and your sense of the wheel — when you simply stay longer than usual.`,
        reflectionPrompt: `What shifted when you held your focus longer than felt comfortable?`,
        measureSeconds: 210 },
      { id: 'd5', title: `Final Telekinesis Session`,
        intro: `People have called it telekinesis for over a century — the idea that a focused mind might reach out and touch the physical world. Believe in it or not, you've spent these days quietly building the very thing every serious attempt at it rests on: a calm, trained, single-pointed, intentional mind. Today is your full session — and whatever the wheel does or doesn't do, that mind is yours to keep.`,
        task: `Prepare fully, quiet the noise, set one clear and stable intention, and bring your deepest, most relaxed focus to the wheel. This is everything you've practised, gathered into one calm session.`,
        practice: `Hold your complete, prepared, intentional focus for the whole measurement, present and unforcing. Simply observe what happens — in the wheel, and in you — and let that be enough.`,
        reflectionPrompt: `After this whole journey, what feels most different about your attention and intention?`,
        measureSeconds: 240 },
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
