// ============================================================================
//  EXPERIMENTS CONTENT — this is the only file you edit to add/change content.
// ============================================================================
//  See EXPERIMENTS-GUIDE.md for a full, step-by-step authoring guide.
//
//  VOICE & STANDARD (keep this for every experiment):
//   • Write like an intelligent, well-read friend who shows you something
//     interesting and says "Try it — I'm curious what happens for you."
//     Never a teacher, coach, guru, salesperson or skeptic. The user is
//     PARTICIPATING IN AN EXPERIMENT, never doing homework.
//   • The Egely Wheel is always the protagonist — every day is something the
//     user tries with THEIR OWN wheel, not an article they read.
//   • intro = a hook. Mostly a simple human observation ("Have you ever
//     noticed..."). Each experiment also has 1-2 real "wow, I didn't know that"
//     moments (a real study or figure) — never as a lecture, just as a curio.
//     Every fact must be REAL and verifiable. Never invent facts.
//   • Favour surprising, memorable tasks. Sometimes ask for a PREDICTION first.
//   • task ("Try this")       = exactly what to do with the wheel, concrete.
//   • practice ("While you measure") = what to carry into the measurement,
//     ending with a "Notice ..." cue; reflectionPrompt asks back about it.
//   • The wheel NEVER reads your mind and NEVER proves anything. Say
//     "observe what happens" / "notice whether anything feels different".
//   • Telekinesis the word appears only in the final experiment. The early
//     ones build attention, perception, concentration and intention, so the
//     user gradually arrives at the question themselves — and we never answer it.
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
    summary: `Four short days exploring, with your own Egely Wheel, how steady your attention really is — and what a focused, intentional mind feels like.`,
    days: [
      { id: 'd1', title: `One-Pointed Attention`,
        intro: `When researchers pinged thousands of people at random moments to ask what they were thinking, the result was startling: our minds are wandering off-task nearly half of our waking lives — and most of the time we don't even realise it. We only feel how restless attention is when we ask it to stay in one place. Today your Egely Wheel gives you a simple way to watch this happen in real time.`,
        task: `Switch on your wheel and pick one single LED — just one. Rest your eyes and your attention on that one light. Every time you catch your mind sliding off to something else, bring it gently back to your LED — no effort, no frustration, just back.`,
        practice: `Keep that one light as your anchor for the whole measurement, returning whenever you slip. Don't try to make anything happen — just hold it and watch your own mind. Notice how often it wanders off before you catch it.`,
        reflectionPrompt: `How many times did your attention slip away before you noticed?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Clarity of Intention`,
        intro: `Here's something you can test on yourself directly: "I'll try to focus" tends to dissolve within seconds, while "I'll keep my eyes on this one light" somehow holds. The clearer and simpler the instruction you give yourself, the more your mind seems to follow it. The wheel gives you a way to feel whether a sharper intention actually changes how steady you are.`,
        task: `Before you start, choose one exact intention and say it once, quietly, in your mind — something like "I'll keep my attention on this single LED." Don't repeat it or push it. Just set it, then let it steer you toward the wheel.`,
        practice: `Hold that one clear intention through the measurement, coming back to it whenever you drift. Notice whether a precise aim makes it easier to stay than yesterday's open focus did.`,
        reflectionPrompt: `Did a clear, specific intention make it easier to stay than open focus did yesterday?`,
        measureSeconds: 120 },
      { id: 'd3', title: `Holding a Single Thought`,
        intro: `Try a strange little experiment right now: for the next ten seconds, do your best not to think about a white bear. Most people find the bear shows up almost instantly — the mind rebels against "don't", and the harder you push a thought away, the louder it gets. Holding a single thought works the opposite way: not by force, but by gently letting the intruders pass.`,
        task: `Choose one quiet anchor for today — a simple word like "steady", or just the image of your wheel. Keep returning to it. When another thought barges in — a white bear, a to-do, anything — don't wrestle it; let it drift past and come back.`,
        practice: `Stay with your one anchor for the whole session, as unbroken as you can, never forcing. Notice how long you can hold it before the first replacement thought sneaks in.`,
        reflectionPrompt: `How long could you hold your single thought before another one took its place?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Intention Measurement`,
        intro: `Over three days you've felt three things most people never separate: how restless attention is on its own, how a clear intention steadies it, and how holding one thought is more about letting go than pushing. Today you bring focus and intention together on the wheel and simply see what a calm, aimed mind feels like. Consider this your first reference point — later experiments may feel different, and this gives you something to compare them against.`,
        task: `Before you begin, make a quiet prediction: do you think this combined state will feel steadier than Day 1? Then settle, set one clear intention, and rest your attention on a single point of the wheel — relaxed and engaged at once, never forcing.`,
        practice: `Hold focus and intention together for the full measurement. Notice whether this combined state feels steadier than focus or intention did on their own — and whether your prediction was right.`,
        reflectionPrompt: `Did focus and intention together feel steadier than either one alone — and did it match your prediction?`,
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
    summary: `Five days getting to know your own attention with the wheel — how it wanders, how it returns, and how it slowly learns to stay.`,
    days: [
      { id: 'd1', title: `The Wandering Mind`,
        intro: `When your mind drifts, it isn't malfunctioning — it's doing exactly what brains do the moment a task lets go: slipping into memories, plans and small daydreams. The interesting part is how rarely we catch it happening. Today the wheel becomes a kind of mirror: a single point to rest on, so you can watch your own mind wander and return.`,
        task: `Sit comfortably with the wheel in front of you and let your attention rest on one LED, loosely. Don't try to control your mind — just watch where it goes. Each time you realise you've drifted, quietly note "wandering", and come back.`,
        practice: `For the whole measurement, your only job is to catch the wandering, not to prevent it. Stay relaxed and curious about your own mind. Notice the moment you realise you'd drifted — that small flash of "oh, I left" is the skill you're building.`,
        reflectionPrompt: `How quickly did you tend to notice once your mind had wandered off?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Returning Without Frustration`,
        intro: `"The faculty of voluntarily bringing back a wandering attention, over and over again," wrote William James in 1890, "is the very root of judgment, character, and will." Notice what he praised: not a mind that never wanders, but one that returns. By that measure, every time your attention slips and you bring it back, you're not failing the exercise — you're doing the very thing that strengthens it.`,
        task: `Rest your attention on your LED again. This time, treat each wandering as a welcome chance to practise the return. No irritation, no scorekeeping — just a calm, friendly "and back".`,
        practice: `Through the measurement, return as many times as you need, each time a little more kindly. Notice whether dropping the frustration makes the returning itself feel easier and smoother.`,
        reflectionPrompt: `Did letting go of frustration make it easier to bring your attention back?`,
        measureSeconds: 120 },
      { id: 'd3', title: `Extended Attention`,
        intro: `Here's a quirk even professionals can't escape: studies of radar and airport screeners found that the longer someone watches, the more they miss — attention naturally slides downhill over time. Knowing the dip is coming changes how you meet it. Today you watch for your own dip and learn to ride through it.`,
        task: `Choose your LED and settle in for a slightly longer hold than before. When the mid-session dullness arrives — and it will — meet it with one small fresh breath and a renewed look, rather than more effort.`,
        practice: `Carry your attention through the whole measurement, especially the middle stretch where focus usually fades. Notice when the dip arrives, and what helps you stay with it.`,
        reflectionPrompt: `When did your focus dip during the session, and what helped you stay with it?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Quiet Observation`,
        intro: `So far you've been gently steering your attention. Today you try the opposite: not steering at all, just watching — letting thoughts come and go the way you'd watch clouds without grabbing at them. It sounds passive, but most people find it's a sharper, more awake state than it seems.`,
        task: `Let your attention rest on the wheel, and instead of correcting your mind, simply observe it — thoughts, sensations, the wandering, the returning, all of it. Watch without joining in.`,
        practice: `For the measurement, take the seat of the quiet observer. Don't push or fix anything; only watch. Notice whether observing your mind, rather than wrestling with it, leaves you calmer.`,
        reflectionPrompt: `Did watching your mind instead of managing it leave you calmer or steadier?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Stable Presence`,
        intro: `After catching the wander, returning without frustration, lasting through the dip, and simply watching, something quiet tends to accumulate: the mind finds "one place" more easily than it did on Day 1. Today there's nothing new to learn — just a chance to notice how much your attention has changed in five days.`,
        task: `Before you start, make a prediction: will holding your LED feel noticeably easier than it did on the first day? Then take your anchor and don't "try" at all — let the attention settle the way it now knows how, and stay: soft, awake, present.`,
        practice: `Rest in that settled presence for the whole measurement, returning gently if you drift. Notice how this trained attention compares with the restless mind of Day 1.`,
        reflectionPrompt: `How different did your attention feel today compared with the first day?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Object Awareness  (the lost art of really seeing; the wheel as object)
  // ==========================================================================
  {
    id: 'object-awareness',
    topic: 'telekinesis',
    title: `Object Awareness`,
    level: 'Intermediate',
    cover: 'assets/experiments/object-awareness.jpg',
    order: 3,
    summary: `Five days on the lost art of really seeing — turning a fresh, detailed attention toward the wheel itself.`,
    days: [
      { id: 'd1', title: `Looking Without Judging`,
        intro: `Your brain is brilliantly lazy: the instant it recognises something — "a wheel", "a light" — it stops truly looking and runs on the label instead. It's efficient, but it means we spend most of the day not really seeing what's in front of us. Today you switch the labelling off and look at the wheel as if for the very first time.`,
        task: `Place the Egely Wheel in front of you and look at it as though you'd never seen one before. Drop the words and the function; just take in shape, colour, surface, the way light sits on it. Whenever your mind says "I know what this is", set the thought down and keep looking.`,
        practice: `For the measurement, keep looking without naming or judging — pure, fresh seeing. Notice how much more appears once you stop telling yourself you already know what's there.`,
        reflectionPrompt: `What did you notice about the wheel that you'd never really seen before?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Exploring Details`,
        intro: `In a now-famous 1999 experiment, people watching a video and counting basketball passes were so absorbed that half of them completely missed a person in a gorilla suit walking through and beating their chest for nine full seconds. We don't see with our eyes so much as with our attention — and details only exist for us when we go looking for them. Today you go hunting on the wheel.`,
        task: `Examine the wheel closely and find three small details you've never consciously registered — a mark, a reflection, the exact way one LED sits beside another. Move slowly; let each detail fully arrive before the next.`,
        practice: `During the measurement, keep your attention fine and exploratory, drinking in detail. Notice whether actively searching for more actually makes more appear.`,
        reflectionPrompt: `Did searching for detail make the wheel reveal more than passive looking did?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Feeling Familiarity`,
        intro: `There's a quiet paradox in attention: the things we see most often, we see least. A face we love, a room we live in, a tool we use daily — repetition makes them fade into the background until we barely register them. By now the wheel has started to become familiar to you too. Today you deliberately keep it from going invisible.`,
        task: `Look at the wheel you now know well — and refuse to let it fade. Find the freshness inside the familiar: see it the way you did on Day 1, but with everything you've since learned about looking.`,
        practice: `Hold that fresh-yet-familiar attention through the measurement. Notice whether you can keep something familiar from quietly slipping into the background.`,
        reflectionPrompt: `Could you keep the familiar wheel feeling vivid, or did it start to fade from attention?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Object Connection`,
        intro: `Most people will swear they can feel it when someone is staring at them from behind — a small, specific sensation we almost never stop to question. Whatever lies behind it, it hints at something worth exploring: attention can feel less like a one-way look and more like a line drawn between you and what you're attending to. Today you point that line at the wheel.`,
        task: `Rest your full attention on the wheel and let it become less like "looking at an object" and more like "being with" it — a quiet, two-way attention, as if you and the wheel share the same small space.`,
        practice: `Keep that sense of connected attention through the measurement, present and unhurried. Notice whether attending to the wheel as a connection feels any different from simply staring at it.`,
        reflectionPrompt: `Did attending to the wheel as a connection feel different from plain looking?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Sustained Awareness`,
        intro: `Long before psychology labs, yogis practised trataka — gazing steadily at a single flame or point until the eyes water and the mind grows still. A 15th-century manual describes it as a bridge from concentration into meditation, making it one of the oldest attention trainings we know of. Today you give the wheel that same patient, unbroken gaze.`,
        task: `Settle in and rest a soft, steady gaze on one point of the wheel. Blink when you must, but keep returning to the same point, letting the looking become calm and continuous.`,
        practice: `Sustain that quiet, one-pointed awareness for the whole measurement. Notice what happens in your mind — and to your sense of the wheel — when you simply keep looking.`,
        reflectionPrompt: `What changed in your attention, or in the wheel, the longer you held a steady gaze?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Directed Intention  (learning to aim; a few old experiments appear)
  // ==========================================================================
  {
    id: 'directed-intention',
    topic: 'telekinesis',
    title: `Directed Intention`,
    level: 'Intermediate',
    cover: 'assets/experiments/directed-intention.jpg',
    order: 4,
    summary: `Five days learning to aim — pointing a calm, clear intention at the wheel, and meeting a few people who once tried to measure exactly that.`,
    days: [
      { id: 'd1', title: `Choosing a Direction`,
        intro: `Attention works in two ways: it gets yanked around by whatever is loudest — a flash, a sudden noise — or it gets aimed, on purpose, by you. That second mode, deliberately choosing where the mind points, is quietly one of the most useful things a person can practise. So far you've steadied attention; now you begin to direct it at the wheel.`,
        task: `Decide, before you begin, exactly where your attention and intention will go — one chosen LED, one clear aim. Then place them there deliberately, like setting something down with care.`,
        practice: `Keep your attention where you chose to put it for the whole measurement, returning it on purpose each time. Notice the difference between attention that drifts and attention you actively aim.`,
        reflectionPrompt: `Could you feel the difference between attention wandering and attention you deliberately aimed?`,
        measureSeconds: 150 },
      { id: 'd2', title: `Mental Consistency`,
        intro: `In the 1930s a botanist named J. B. Rhine set up a laboratory at Duke University and spent years on a strange question: could a person, just by intending it, nudge how tossed dice landed? Across tens of thousands of throws, what seemed to matter wasn't dramatic effort but consistency — a calm, repeated intention held the same way each time. Whatever you make of his results, that's a skill worth borrowing.`,
        task: `Pick one simple intention toward a single LED and commit to keeping it identical from start to finish — same point, same calm aim, no changing your mind midway. Consistency over intensity.`,
        practice: `Hold that one unchanging intention through the measurement. Notice how hard or easy it is to keep a single aim perfectly steady, without it shifting or quietly escalating.`,
        reflectionPrompt: `How steady could you keep one unchanging intention from start to finish?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Intentional Focus`,
        intro: `There's a sweet spot that's surprisingly hard to find: fully focused and fully relaxed at the same time. Push too hard and you tense up and tire; relax too much and the aim dissolves. Athletes and musicians spend years chasing this exact balance. Today you look for it with the wheel.`,
        task: `Choose one clear, simple intention toward your LED and hold it with a focus that is alert but loose — engaged, never clenched. Aim, but don't grip.`,
        practice: `Keep that intentional focus through the measurement, calm and pointed at once. Notice whether you can stay sharply focused and physically relaxed at the same time.`,
        reflectionPrompt: `Were you able to hold a sharp intention while keeping your body and mind relaxed?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Reducing Mental Noise`,
        intro: `At a loud party you can somehow lock onto one voice and let the rest blur into a murmur — an everyday miracle that the scientist Colin Cherry named the "cocktail party effect" back in 1953. A clear signal isn't only about turning the signal up; it's just as much about turning the noise down. Today you quiet the inner party so a single intention can stand out.`,
        task: `Before you begin, take a few slow breaths and let the mental chatter settle. Then bring up one clear intention toward the wheel, and let everything else fade to background, the way that one voice does at a party.`,
        practice: `Hold the quiet, single intention through the measurement, gently lowering any noise that rises. Notice whether less mental noise makes your one intention feel clearer and stronger.`,
        reflectionPrompt: `Did quieting your mental chatter make your single intention feel clearer?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Directed Measurement`,
        intro: `You've chosen a direction, held it consistently, found the focused-yet-relaxed balance, and cleared the noise around it. Those four are the whole craft of directed intention — and the same craft those old laboratories were clumsily reaching for. Today you simply put them together and aim, cleanly, at the wheel.`,
        task: `Before you start, predict: will a fully aimed intention feel different on the wheel than the scattered attention you began this topic with? Then settle, quiet the noise, choose one clear direction, and place a steady, relaxed intention on your LED — all the pieces at once, lightly held.`,
        practice: `Hold that complete, directed intention for the full measurement. Notice how a fully aimed mind feels compared with where you started — and whether your prediction held.`,
        reflectionPrompt: `How did a fully directed intention compare with the scattered attention you began this topic with?`,
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
        intro: `Nikola Tesla claimed he could build a machine entirely in his head — "I needed no models, drawings or experiments", he wrote; he would picture a device, run it, and even watch it wear out, all in his imagination. Whatever the truth of it, it shows how vivid and real a well-prepared mental image can become. Before any serious attempt at anything, the mind is prepared first — and that's where you begin.`,
        task: `Before measuring, take a full minute to prepare: settle the body, steady the breath, and bring up a calm, clear picture of yourself focused on the wheel — relaxed, present, intent. Don't measure yet; just prepare the mind completely.`,
        practice: `Carry that prepared state into the measurement on the wheel and simply hold it. Notice whether a minute of deliberate preparation changes the quality of the focus that follows.`,
        reflectionPrompt: `Did preparing your mind first change how steady your focus felt afterward?`,
        measureSeconds: 150 },
      { id: 'd2', title: `Stable Intention`,
        intro: `For nearly thirty years, an engineering lab at Princeton ran a quiet, much-debated experiment: people sat before a machine producing random numbers and simply held the intention for it to drift a little higher or lower. The effect they reported was tiny and argued over for decades — but the instruction given to volunteers was beautifully simple, and it's yours today: hold one stable intention, and let go of trying.`,
        task: `Choose a single, clear intention toward the wheel and hold it with a light, unwavering steadiness. Don't strain toward a result — set the intention and let it rest, stable and patient.`,
        practice: `Maintain that one stable intention through the whole measurement, calm and unforced. Notice the difference between holding an intention and straining for an outcome.`,
        reflectionPrompt: `Could you hold a stable intention without slipping into straining for a result?`,
        measureSeconds: 180 },
      { id: 'd3', title: `Deep Focus`,
        intro: `Concentration has a deeper gear most people rarely reach: a point where holding attention stops feeling like effort and starts to feel like resting in one place. Athletes call a cousin of it "flow", and it almost never appears in the first restless minute — it has to be waited for. Today you give it room.`,
        task: `Settle into your prepared, intentional state on the wheel and let it deepen. Don't chase any special experience; just keep returning, patiently, past the first restless minutes, and let the focus grow quiet and absorbed.`,
        practice: `Hold a deep, settled focus for the whole measurement, letting it deepen rather than forcing it. Notice whether, past the early restlessness, your attention drops into something quieter.`,
        reflectionPrompt: `Did your focus deepen into something quieter once the early restlessness passed?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Extended Measurement`,
        intro: `If anything subtle is ever going to show itself, the people who chased these effects agreed on one thing: it would be small, and it would need time and patience rather than force. So today is simply about staying — holding your prepared, stable, deep focus longer than feels natural, with nothing to prove. Here, endurance isn't strain; it's just the willingness to remain.`,
        task: `Bring everything you've built — preparation, stable intention, deep focus — and settle in for a longer hold than usual. When the urge to stop or check the time arrives, meet it with one more calm breath and stay.`,
        practice: `Sustain the state for the full, longer measurement, patient and unforcing throughout. Notice what happens to your mind — and your sense of the wheel — when you simply stay longer than usual.`,
        reflectionPrompt: `What shifted when you held your focus longer than felt comfortable?`,
        measureSeconds: 210 },
      { id: 'd5', title: `Final Telekinesis Session`,
        intro: `People have called it telekinesis for over a century — the idea that a focused mind might reach out and quietly touch the physical world. Believe in it or not, over these weeks you've built the one thing every serious attempt at it has ever depended on: a calm, trained, single-pointed, intentional mind. Today is your full session — and whatever the wheel does or doesn't do, what you've built is yours to keep.`,
        task: `Prepare fully, quiet the noise, set one clear and stable intention, and bring your deepest, most relaxed focus to the wheel. This is everything you've practised, gathered into a single calm session.`,
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
