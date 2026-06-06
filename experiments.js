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
  { id: 'telekinesis',    title: `Telekinesis`,    icon: '🧠', cover: 'assets/experiments/telekinesis.jpg',    order: 1 },
  { id: 'meditation',     title: `Meditation`,     icon: '🧘', cover: 'assets/experiments/meditation.jpg',     order: 2 },
  { id: 'energy-healing', title: `Energy Healing`, icon: '🤲', cover: 'assets/experiments/energy-healing.jpg', order: 3 },
  { id: 'human-connection', title: `Human Connection`, icon: '🤝', cover: 'assets/experiments/human-connection.jpg', order: 4 },
  { id: 'crystal-healing', title: `Crystal Healing`, icon: '💎', cover: 'assets/experiments/crystal-healing.jpg', order: 5 },
  { id: 'kundalini-energy', title: `Kundalini Energy`, icon: '🌀', cover: 'assets/experiments/kundalini-energy.jpg', order: 6 },
  { id: 'psi-research', title: `Psi Research`, icon: '🔬', cover: 'assets/experiments/psi-research.jpg', order: 7 },
  { id: 'intuition', title: `Intuition`, icon: '🧭', cover: 'assets/experiments/intuition.jpg', order: 8 },
  { id: 'rituals-and-tradition', title: `Rituals & Human Tradition`, icon: '🕯️', cover: 'assets/experiments/rituals-and-tradition.jpg', order: 9 },
  { id: 'quantum-healing', title: `Quantum Healing`, icon: '⚛️', cover: 'assets/experiments/quantum-healing.jpg', order: 10 },
  { id: 'yoga', title: `Yoga`, icon: '🪷', cover: 'assets/experiments/yoga.jpg', order: 11 },
  { id: 'reiki', title: `Reiki`, icon: '👐', cover: 'assets/experiments/reiki.jpg', order: 12 },
  { id: 'aura', title: `Aura`, icon: '✨', cover: 'assets/experiments/aura.jpg', order: 13 },
  { id: 'food-and-awareness', title: `Food & Awareness`, icon: '🍎', cover: 'assets/experiments/food-and-awareness.jpg', order: 14 },
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

  // ##########################################################################
  //  MEDITATION TOPIC
  //  Dramaturgy: the OPPOSITE of Telekinesis. Not focus & intention, but
  //  observation & presence — "what happens when you stop trying to control
  //  your mind?" The wheel runs quietly WHILE you observe; it is never aimed
  //  at or controlled. Fewer historical figures; lean on self-observation,
  //  everyday noticing and psychology. Never religious (no chakras, spirit
  //  guides, higher self, energy healing).
  // ##########################################################################

  // ==========================================================================
  //  1 — The Observer  (who watches your thoughts?)
  // ==========================================================================
  {
    id: 'the-observer',
    topic: 'meditation',
    title: `The Observer`,
    level: 'Beginner',
    cover: 'assets/experiments/the-observer.jpg',
    order: 1,
    summary: `Four days turning attention around — from your thoughts to the one who notices them. Less doing, more watching.`,
    days: [
      { id: 'd1', title: `Thoughts Appear on Their Own`,
        intro: `Here's a small experiment: for the next few seconds, try to stop thinking entirely. Most people find a thought arrives anyway, completely uninvited — we like to believe we produce our thoughts, but most of them simply appear, like sounds drifting in from another room. Today you stop chasing them and just watch them arrive.`,
        task: `Sit comfortably with your Egely Wheel running quietly in front of you. You're not trying to focus on it — let it simply be there, measuring, while you turn your attention inward. Watch for the next thought to appear, and the next, without following any of them.`,
        practice: `For the whole measurement, just notice thoughts arriving — not their content, only the fact that they keep coming on their own. Notice the very first thought that appears once you stop trying to think.`,
        reflectionPrompt: `What was the first thought that appeared once you stopped trying to think?`,
        measureSeconds: 120 },
      { id: 'd2', title: `You Don't Choose Them`,
        intro: `If you really ran your own mind, you could answer a simple question: what will your next thought be? Try to predict it — and notice that you can't. Thoughts seem to arrive a half-second before "you" do, which raises a strange and interesting question: if you didn't pick them, who did?`,
        task: `With the wheel running quietly, sit and try to predict each thought just before it comes. You'll keep being surprised — that's the point. Each time a thought arrives unannounced, simply note "there's one", and wait for the next.`,
        practice: `Through the measurement, keep gently trying to catch a thought before it appears, and watch it beat you every time. Notice whether you can ever truly predict your next thought.`,
        reflectionPrompt: `Could you predict any of your thoughts before they appeared — or did they always arrive first?`,
        measureSeconds: 120 },
      { id: 'd3', title: `Watching Without Judging`,
        intro: `Most of us don't just have thoughts — we instantly rate them: good, bad, embarrassing, important. That second layer, the judging, is often noisier than the thoughts themselves. There's a quieter option: to watch a thought the way you'd watch a bird land and fly off, without deciding anything about it.`,
        task: `Let the wheel run and settle into watching your thoughts — but this time, drop the commentary. When a thought appears, don't label it good or bad; just see it, let it go, and wait for the next. If you catch yourself judging, notice that too, without judging the judging.`,
        practice: `For the measurement, watch your thoughts without rating them, as neutrally as you can. Notice whether dropping the judgment leaves the mind quieter than usual.`,
        reflectionPrompt: `Did watching your thoughts without judging them make your mind feel any quieter?`,
        measureSeconds: 150 },
      { id: 'd4', title: `The Inner Narrator`,
        intro: `There's a part of you that never seems to stop talking — narrating your day, replaying conversations, planning the next thing. Brain scientists have mapped a network that lights up for exactly this: a kind of inner storyteller that "rescripts the movie of your life" whenever you're not busy. Today you simply listen to that narrator instead of being swept along by it.`,
        task: `With the wheel running, sit back and notice the running commentary in your head — the voice that comments, plans and remembers. Don't argue with it or silence it; just listen to it the way you'd overhear someone talking in the next seat.`,
        practice: `For the measurement, stay in the listener's seat while the narrator talks. Notice whether simply hearing the inner voice — rather than believing every word — changes how loud it feels.`,
        reflectionPrompt: `When you listened to your inner narrator instead of following it, did it get quieter or louder?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — The Breath  (why does almost every tradition use the breath?)
  // ==========================================================================
  {
    id: 'the-breath',
    topic: 'meditation',
    title: `The Breath`,
    level: 'Beginner',
    cover: 'assets/experiments/the-breath.jpg',
    order: 2,
    summary: `Five days with the one anchor nearly every tradition lands on — the breath — and what your mind does when it finally has somewhere to rest.`,
    days: [
      { id: 'd1', title: `The Universal Anchor`,
        intro: `Almost every meditation tradition on Earth, going back thousands of years, eventually arrives at the same simple anchor: the breath. The Buddhist practice of anapanasati — "mindfulness of breathing" — may be the most widely used meditation method ever devised. There's a reason it keeps being rediscovered: the breath is always with you, always moving, and always now.`,
        task: `Let the wheel run quietly and simply find your breath. Don't change it — just feel it: the air arriving, the small pause, the air leaving. When your mind wanders off, come back to the next breath.`,
        practice: `For the measurement, rest your attention on the breath, returning to it each time you drift. Notice whether having one simple anchor makes the mind easier to settle than having nothing to rest on.`,
        reflectionPrompt: `Did having the breath as an anchor make your mind easier to settle?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Automatic vs. Conscious`,
        intro: `Your breath is unusual: it runs perfectly well on its own, yet the moment you notice it, you can take the wheel. It sits right on the border between automatic and chosen — one of the only body processes you can either ignore completely or guide deliberately. Today you explore that border.`,
        task: `With the wheel running, first just watch your breath happen by itself for a while — no interfering. Then gently take over: lengthen it slightly, smooth it out, make it your own. Then let go and watch it run on its own again.`,
        practice: `For the measurement, move softly between watching the breath and gently guiding it. Notice whether your mind feels different when you let the breath run by itself versus when you take conscious control.`,
        reflectionPrompt: `Did your mind feel different when you guided the breath versus letting it run on its own?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Rhythm`,
        intro: `Under extreme stress, Navy SEALs use a trick they call tactical breathing: in for four, hold for four, out for four, hold for four — a steady square. The slow, even rhythm quietly signals to the nervous system that all is well, which is why a soldier, a surgeon and a nervous public speaker can all reach for the very same breath. Today you borrow their square.`,
        task: `With the wheel running, breathe in a slow box: four counts in, four holding, four out, four holding. Keep the four sides even and unhurried. If you lose count, just start the square again.`,
        practice: `Hold the steady box-breathing rhythm through the measurement. Notice whether a calm, even rhythm settles your mind and body more than ordinary breathing did.`,
        reflectionPrompt: `Did the steady box rhythm leave you calmer than your normal breathing?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Coming Back`,
        intro: `Here's the quiet secret of breath meditation: you will lose the breath, again and again, and that isn't the failure — it's the whole exercise. The breath isn't there to be gripped; it's there to be returned to. Every time you notice you've wandered and come back, the returning itself is the practice.`,
        task: `Rest on the breath again, with the wheel running. This time, count how many times your attention leaves and comes back — not with frustration, but with a kind of friendly curiosity. Each return is one repetition.`,
        practice: `For the measurement, simply keep returning to the breath, as many times as it takes. Notice how many times your attention wandered off and came back over the session.`,
        reflectionPrompt: `Roughly how many times did you leave the breath and come back?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Resting in the Breath`,
        intro: `After finding the anchor, exploring its border, steadying its rhythm and practising the return, the breath stops feeling like a task and starts feeling like a place to rest. Today there's nothing to do but settle there. Before you start, make a quiet prediction: will your mind feel steadier here than it did on Day 1?`,
        task: `Let the wheel run and simply rest in the breath — no counting, no controlling, no goal. Let each breath carry your attention, and when you drift, drift back. Soft, easy, here.`,
        practice: `Rest in the breath for the whole measurement, returning gently whenever you slip. Notice how settled the mind feels now compared with the first day — and whether your prediction held.`,
        reflectionPrompt: `How settled did resting in the breath feel compared with Day 1?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Silence Between Thoughts  (is there a gap between two thoughts?)
  //  Kept purely experiential — self-observation, no citations.
  // ==========================================================================
  {
    id: 'silence-between-thoughts',
    topic: 'meditation',
    title: `Silence Between Thoughts`,
    level: 'Intermediate',
    cover: 'assets/experiments/silence-between-thoughts.jpg',
    order: 3,
    summary: `Five days hunting for something most people have never looked for: the small silences hiding between one thought and the next.`,
    days: [
      { id: 'd1', title: `The Constant Noise`,
        intro: `Sit quietly for a moment and really listen to your own mind. For most of us it sounds like a room that never empties — comments, plans, fragments of songs, half-finished worries, all running together. We're so used to this mental noise that we mistake it for silence. Today you start to actually hear it.`,
        task: `With the wheel running quietly, close your eyes for a moment and simply listen to the activity in your mind, the way you'd listen to traffic outside a window. Don't try to quiet it — just notice how busy it really is.`,
        practice: `For the measurement, listen to your own mental noise without adding to it or fighting it. Notice just how constant the inner chatter actually is once you stop and pay attention.`,
        reflectionPrompt: `When you really listened, how constant was the noise in your mind?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Spaces Appear`,
        intro: `Here's something strange that almost no one notices: thoughts don't actually run in a single continuous line. One ends, and for a tiny moment — before the next begins — there's a gap. It's usually too quick to catch, but it's there. Today you go looking for it.`,
        task: `With the wheel running, watch your thoughts as before, but this time pay attention to the seams — the brief moments where one thought has ended and the next hasn't started yet. Don't manufacture them; just catch the ones that are already there.`,
        practice: `For the measurement, watch for the small gaps between thoughts. Notice whether you can catch even one clear moment of space between one thought and the next.`,
        reflectionPrompt: `Could you catch a gap between two thoughts — and what did that small space feel like?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Not Pushing Thoughts Away`,
        intro: `It's tempting to think the way to find silence is to shove your thoughts out — but you've probably already noticed that fighting a thought only feeds it. The gaps don't come from force; they appear on their own when you stop struggling. Silence, it turns out, is less something you make and more something you allow.`,
        task: `With the wheel running, let your thoughts come freely — don't suppress a single one. Paradoxically, by not fighting them, you give the natural pauses room to show up. Just watch, allow, and wait.`,
        practice: `For the measurement, let every thought come and go without resistance. Notice whether allowing the thoughts — rather than fighting them — lets more quiet appear on its own.`,
        reflectionPrompt: `Did allowing your thoughts, instead of fighting them, let more silence appear?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Listening to Silence`,
        intro: `Most of us treat silence as nothing — an absence, a blank. But sit with it a little and you'll find it has a texture of its own, almost something you can listen to, the way you might suddenly notice the deep quiet of a house at night. Today you stop treating the gaps as empty and start actually sensing them.`,
        task: `With the wheel running, settle in and turn your attention toward the quiet itself — the background stillness underneath the thoughts, not the thoughts in front of it. When a gap appears, rest in it for as long as it lasts.`,
        practice: `For the measurement, listen to the silence rather than the noise, resting in each gap you find. Notice whether the quiet between thoughts has a feel of its own.`,
        reflectionPrompt: `Did the silence between your thoughts have a quality you could actually sense?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Widening the Gaps`,
        intro: `Over four days you've heard the noise, caught the gaps, stopped fighting your thoughts, and started sensing the quiet. None of it was about forcing silence — only about noticing what was always there. Today you simply rest in that noticing and see whether the gaps, left alone, grow a little on their own.`,
        task: `With the wheel running, take the relaxed, allowing attention you've built and just sit with your mind. Don't chase silence and don't chase thoughts — rest in between, and let the spaces be whatever they are.`,
        practice: `For the measurement, rest in that easy awareness, grasping at neither silence nor thought. Notice whether the gaps between thoughts feel any wider or more frequent than on Day 1.`,
        reflectionPrompt: `Did the silences feel wider or more frequent than when you started?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Open Awareness  (what happens when you concentrate on nothing?)
  // ==========================================================================
  {
    id: 'open-awareness',
    topic: 'meditation',
    title: `Open Awareness`,
    level: 'Intermediate',
    cover: 'assets/experiments/open-awareness.jpg',
    order: 4,
    summary: `Five days doing the opposite of focusing — opening attention wide to sound, sensation and the whole present moment at once.`,
    days: [
      { id: 'd1', title: `Letting Go of the Object`,
        intro: `Everything you've practised so far has had an anchor — an LED, the breath, a single point. But researchers who study meditation describe a second, very different mode: instead of narrowing onto one thing, you open to everything at once, watching the whole field of experience without grabbing any part of it. Today you let go of the object entirely.`,
        task: `With the wheel running, don't focus on it — or on anything. Let your attention go wide and soft, like switching from a spotlight to a floodlight. Whatever appears — a sound, a sensation, a thought — let it be there, and let it pass.`,
        practice: `For the measurement, hold a wide, open attention with no chosen object. Notice how different it feels to attend to everything at once rather than to one single thing.`,
        reflectionPrompt: `How did open, objectless attention feel compared with focusing on one thing?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The World of Sound`,
        intro: `Right now, without moving, you're surrounded by sounds you'd stopped hearing — a hum, a distant car, the room itself. Your brain filters most of them out so you can function, but they never actually left. Today you let the filter drop and listen to all of it at once.`,
        task: `With the wheel running, close your eyes and open your hearing in every direction. Don't chase any one sound or name them; just let the whole soundscape arrive — near, far, and the quiet underneath. Be the listener everything reaches.`,
        practice: `For the measurement, rest in open listening, receiving every sound without holding onto any. Notice how many sounds were there all along that you'd simply stopped hearing.`,
        reflectionPrompt: `How many sounds did you notice that had been there all along, unheard?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Body Hum`,
        intro: `Your body is quietly broadcasting all the time — a faint buzz in the hands, warmth, the weight of sitting, a hundred small sensations you normally ignore. They're not new; your attention just rarely visits them. Today you turn the volume up on the body and listen.`,
        task: `With the wheel running, leave sound behind and open your attention to physical sensation instead. Don't go looking part by part; let the whole body announce itself at once — tingling, pressure, temperature, the subtle hum of simply being alive.`,
        practice: `For the measurement, rest in open awareness of the whole body at once. Notice the sensations that were quietly there the entire time, just beneath your usual attention.`,
        reflectionPrompt: `What did your body feel like once you opened your attention to all of it at once?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Everything at Once`,
        intro: `So far you've opened to sound, then to the body, one field at a time. But the present moment doesn't actually arrive in separate channels — it all happens together. Today you stop sorting it and simply let the whole of now in: sound, sensation, thought, the wheel, the room, all at the same time.`,
        task: `With the wheel running, drop every filter and let the entire present moment be your "object" — nothing excluded, nothing chosen. The wheel becomes just one more thing present in a wide-open field. Receive it all, and hold onto none of it.`,
        practice: `For the measurement, rest in the whole of the present moment at once. Notice whether holding everything at once feels overwhelming, spacious, or surprisingly calm.`,
        reflectionPrompt: `Did holding the whole present moment at once feel overwhelming, spacious, or calm?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Just Sitting`,
        intro: `In Zen there's a practice with a wonderfully plain name: shikantaza — "just sitting". No object, no goal, no method; you simply sit in open awareness and let reality be exactly as it is, thoughts and all. After a week of opening your attention, you're ready to do nothing — beautifully.`,
        task: `With the wheel running, just sit. Don't focus, don't analyse, don't try to reach any state. Let thoughts come and go, let sounds and sensations arrive, let the wheel turn — and simply be present with all of it, doing nothing at all.`,
        practice: `For the measurement, just sit in open, choiceless awareness, with nowhere to get to. Notice what "doing nothing" actually feels like when you fully allow it.`,
        reflectionPrompt: `What did it feel like to simply sit and do nothing at all?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Presence  (what does it feel like to simply be present?)
  // ==========================================================================
  {
    id: 'presence',
    topic: 'meditation',
    title: `Presence`,
    level: 'Advanced',
    cover: 'assets/experiments/presence.jpg',
    order: 5,
    summary: `Five days exploring the strangest, simplest place there is — the present moment — and what happens to a mind that fully arrives in it.`,
    days: [
      { id: 'd1', title: `Where Your Mind Actually Is`,
        intro: `Catch yourself at any random moment and you'll usually find your mind somewhere other than here — replaying the past or rehearsing the future, almost anywhere but the present. The odd part is that "now" is the only moment that ever actually happens; everything else is memory or imagination. Today you check, honestly, where your mind really spends its time.`,
        task: `With the wheel running, sit quietly and keep asking one gentle question: "Where is my attention right now?" Past, future, or here? Each time you find it has slipped to another time, bring it back to this exact moment.`,
        practice: `For the measurement, keep noticing where your mind is and returning it to now. Notice how often your attention was somewhere other than the present moment.`,
        reflectionPrompt: `How often did you catch your mind somewhere other than right now?`,
        measureSeconds: 150 },
      { id: 'd2', title: `Arriving in the Now`,
        intro: `There's a difference between knowing you're here and actually feeling it. For much of the day we're physically present but mentally elsewhere, running on autopilot. Fully arriving — senses awake, mind quiet, right here — is rarer than it sounds, and unmistakable once it happens.`,
        task: `With the wheel running, deliberately arrive: feel your body in the seat, your breath moving, the room around you, the wheel in front of you. Let "later" and "earlier" fall away, and be completely here, as if this moment were the only one.`,
        practice: `For the measurement, keep choosing to be fully here, returning whenever you drift off into time. Notice the difference between merely sitting here and actually being present.`,
        reflectionPrompt: `Could you feel the difference between just sitting here and truly being present?`,
        measureSeconds: 180 },
      { id: 'd3', title: `When Time Bends`,
        intro: `Ask an artist, an athlete or anyone fully absorbed in something they love, and they describe the same strange thing: time stops behaving normally — an hour vanishes in a moment, or a moment stretches out. The psychologist who studied this called it "flow", and that bending of time is one of its surest signs. Today you watch how your own sense of time behaves as you settle.`,
        task: `With the wheel running, settle into deep presence and, every so often, gently check in on time: does it feel like it's moving quickly, slowly, or has it gone quiet altogether? Don't calculate — just sense the texture of time passing.`,
        practice: `For the measurement, rest in the present and let your sense of time be whatever it is. Notice whether time felt faster, slower, or strangely absent while you were fully here.`,
        reflectionPrompt: `How did your sense of time behave — faster, slower, or absent — while you were present?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Presence Without Effort`,
        intro: `Early on, being present takes effort — you keep dragging your attention back. But there's a tipping point where presence stops being something you do and becomes simply where you are, the way you don't have to try to hear once a room goes quiet. Today you look for that shift from effort to ease.`,
        task: `With the wheel running, settle into presence as you have, but stop "trying" to be present. Let the effort soften, and see whether being here can simply hold itself once you stop pushing. If it slips, return — gently, without force.`,
        practice: `For the measurement, let presence become effortless rather than maintained. Notice whether being here can hold on its own once you stop working at it.`,
        reflectionPrompt: `Did presence ever hold on its own, without you having to maintain it?`,
        measureSeconds: 210 },
      { id: 'd5', title: `Simply Being`,
        intro: `Across these weeks you've watched your thoughts, rested in the breath, found the silence between them, opened to everything at once, and arrived, finally, in the present. All of it pointed at one simple thing that's strangely hard to reach: being here, now, with nothing added. Today you just are — and let the wheel quietly keep you company while you do.`,
        task: `With the wheel running, do the simplest and hardest thing of all: just be. No focus, no method, no goal, nothing to fix or reach. Sit in open, present awareness, and let this moment be completely enough.`,
        practice: `For the measurement, simply be present with whatever is here, the wheel included, asking nothing of it. Notice what "simply being" feels like after everything you've explored.`,
        reflectionPrompt: `After this whole journey, what does it feel like to simply be present?`,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  ENERGY HEALING TOPIC
  //  Frame (Csaba's key rule): we do NOT investigate whether anything "heals".
  //  We observe what effect different states, intentions and human interactions
  //  have on how the measurement feels. The wheel's question here is CONNECTION
  //  & human interaction. NEVER any healing claim (cures / removes disease /
  //  restores health) and NEVER any woo (vibrational frequency, cosmic energy,
  //  higher dimensions, quantum healing). Lean on real research. Many days work
  //  best with another person — always give a solo fallback (great for
  //  practitioners doing it WITH a member, and for solo users alike).
  // ##########################################################################

  // ==========================================================================
  //  1 — Human Presence  (alone vs. someone's attention on you)
  // ==========================================================================
  {
    id: 'human-presence',
    topic: 'energy-healing',
    title: `Human Presence`,
    level: 'Beginner',
    cover: 'assets/experiments/human-presence.jpg',
    order: 1,
    summary: `Four days on a question we rarely examine: does it actually feel different to be alone, versus to have another person's attention on you?`,
    days: [
      { id: 'd1', title: `The Eyes of Others`,
        intro: `In the 1920s, factory researchers stumbled onto something odd: workers' output rose almost no matter what they changed — brighter light, dimmer light — as long as the workers knew they were being watched. The "Hawthorne effect" became shorthand for a truth most of us feel daily: we behave differently when someone is paying attention. Today you turn that lens on yourself, with the wheel.`,
        task: `Run this one alone. Sit with the wheel and measure as you normally would, simply noticing how it feels to do it by yourself — relaxed, private, unobserved.`,
        practice: `For the measurement, just be with the wheel on your own, paying attention to your inner state — your ease, your breathing, your sense of being unwatched. Notice exactly how it feels to do this completely alone.`,
        reflectionPrompt: `How did it feel to measure completely alone — relaxed, private, something else?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Someone Is Watching`,
        intro: `Yesterday you measured alone. Today you add one thing: another presence. You've probably felt it — the small shift in your body when someone's eyes land on you, even before you turn to look. We're remarkably sensitive to being watched, and today you simply notice what that does to you.`,
        task: `If you can, ask someone to sit quietly nearby and watch you measure — they don't speak or help, just attend. If you're on your own, place a photo of someone who matters in view, or vividly imagine a friend sitting beside you.`,
        practice: `With the wheel in front of you, measure with that sense of being watched, real or imagined, staying tuned to your body. Notice whether being observed changes how you feel compared with measuring alone yesterday.`,
        reflectionPrompt: `Did being watched — really or in your imagination — feel different from measuring alone?`,
        measureSeconds: 120 },
      { id: 'd3', title: `Performing for an Audience`,
        intro: `Back in 1898 a researcher noticed cyclists rode faster alongside others than alone, and later studies confirmed it: an audience tends to lift our performance on things we're good at — and rattle us on things we're not. Psychologists call it social facilitation. Today you explore which way an audience tips you on the wheel.`,
        task: `With someone watching (or strongly imagined), approach the measurement as if it slightly matters — a gentle sense of "performing". Notice the difference between yesterday's quiet observation and today's mild spotlight.`,
        practice: `Measure with that light sense of an audience present. Notice whether the feeling of being watched lifts you, settles you, or makes you tense.`,
        reflectionPrompt: `Did a sense of audience lift you, settle you, or make you tense?`,
        measureSeconds: 150 },
      { id: 'd4', title: `The Comfort of Presence`,
        intro: `Being watched isn't only pressure. The very same presence that can make us nervous can also make us feel safe — think how a child settles just because a parent is in the room. Presence cuts both ways, and today you look for its warmer side.`,
        task: `If you can, have someone sit with you not as an observer but as a calm, friendly presence — no watching, no judging, just there. Alone, bring to mind someone whose company puts you at ease and let that feeling fill the room.`,
        practice: `With the wheel in front of you, measure inside that supportive presence, real or remembered. Notice whether a warm, friendly presence feels different on you than being studied did.`,
        reflectionPrompt: `Did a warm, supportive presence feel different from being observed or judged?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Intention & Support  (does good intention matter? we just look)
  // ==========================================================================
  {
    id: 'intention-support',
    topic: 'energy-healing',
    title: `Intention & Support`,
    level: 'Beginner',
    cover: 'assets/experiments/intention-support.jpg',
    order: 2,
    summary: `Five days on a quiet question: when someone genuinely wishes you well, does anything change? We make no claim — we just look.`,
    days: [
      { id: 'd1', title: `Being Rooted For`,
        intro: `Think back to a moment when someone was truly in your corner — a friend at the finish line, a parent in the audience, a hand on your shoulder before something hard. Most of us can feel the difference between facing something alone and facing it knowing someone wants us to do well. Today you bring that feeling to the wheel.`,
        task: `Recall, as vividly as you can, a person who has genuinely rooted for you, and let that "someone's on my side" feeling settle in. If they can be there in person and silently wish you well, even better.`,
        practice: `Measure while holding that sense of being supported. Notice whether feeling that someone wants you to do well changes your inner state at all.`,
        reflectionPrompt: `Did feeling supported — someone in your corner — change how you felt while measuring?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Power of Expectation`,
        intro: `Here's one of the strangest findings in medicine: people often feel real relief from a sugar pill — and remarkably, this can happen even when they're told outright it's a placebo. Expectation alone can shape what we experience. That doesn't make the effect fake; it makes it a genuine, if mysterious, part of how the mind works. Today you notice the role your own expectations play.`,
        task: `Before you measure, set a quiet, positive expectation — "this will feel calm and steady" — without forcing it. Don't try to make anything happen; just notice the expectation you're carrying in.`,
        practice: `With the wheel in front of you, measure while gently aware of what you expected going in. Notice whether your expectation seems to colour how the session actually feels.`,
        reflectionPrompt: `Did the expectation you carried in seem to colour how the measurement felt?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Receiving Attention`,
        intro: `There's a particular comfort in being the one attended to — when someone's full, kind attention is simply pointed at you, with nothing demanded in return. It's rarer than it should be; most attention comes with an agenda. Today you explore being the quiet focus of someone's goodwill.`,
        task: `If you can, ask someone to sit with you and hold a kind, supportive attention toward you while you measure — no talking, no fixing. Alone, imagine being held in that warm, undemanding attention.`,
        practice: `With the wheel in front of you, measure inside that supportive attention, real or imagined. Notice whether being the focus of someone's goodwill feels different from doing this on your own.`,
        reflectionPrompt: `Did being the focus of kind attention feel different from measuring on your own?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Doing It Together`,
        intro: `Humans are built to do things together — our ancestors hunted, built and survived in groups, and something in us still eases when we're not going it alone. Even a shared, wordless task can feel steadier than the same task done solo. Today you turn the measurement into something shared.`,
        task: `If you can, measure alongside another person doing their own quiet practice at the same time — not watching each other, just sharing the moment. Alone, sense yourself as part of the wider community of people measuring with their wheels right now.`,
        practice: `Measure with that sense of doing this together rather than alone. Notice whether sharing the moment, even loosely, changes how it feels.`,
        reflectionPrompt: `Did sharing the moment, rather than going it alone, change how the measurement felt?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Does It Matter?`,
        intro: `Over these days you've measured while supported, expectant, attended to and accompanied. We've made no claim about whether any of it "works" on the wheel — that was never the point. The point was to notice, honestly, whether good intention changes anything in your own experience. Today you gather it all and look one more time.`,
        task: `Before you start, make a prediction: do you think feeling supported changes your measurement, or only how you feel? Then bring in every warm, supportive feeling you've explored this week and simply measure.`,
        practice: `Measure inside that full sense of support and goodwill. Notice what, if anything, feels different — and compare it honestly with your prediction.`,
        reflectionPrompt: `Did good intention change anything you could notice — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Touch & Connection  (why is human touch so important?)
  // ==========================================================================
  {
    id: 'touch-connection',
    topic: 'energy-healing',
    title: `Touch & Connection`,
    level: 'Intermediate',
    cover: 'assets/experiments/touch-connection.jpg',
    order: 3,
    summary: `Five days on the oldest comfort there is — human touch — and the surprisingly deep science of why a hand or a hug changes us.`,
    days: [
      { id: 'd1', title: `The Chemistry of a Hug`,
        intro: `A warm hug isn't only pleasant — it's chemistry. Physical touch triggers the release of oxytocin, sometimes called the "bonding hormone", which lowers the stress hormone cortisol and leaves us calmer and more trusting. A long hug from someone you love can measurably lower your blood pressure. Today you bring a little of that chemistry to the wheel.`,
        task: `If you can, share a real, unhurried hug (or hold hands) with someone just before you measure. Alone, give yourself the next best thing: a hand resting warmly on your own chest and a few slow breaths.`,
        practice: `Measure soon after that touch, while the calm of it is still with you. Notice whether your body feels different in the wake of warm physical contact.`,
        reflectionPrompt: `Did your body feel calmer or different in the moments after warm touch?`,
        measureSeconds: 120 },
      { id: 'd2', title: `What the Monkeys Taught Us`,
        intro: `In a famous and rather sad experiment, infant monkeys were given two artificial "mothers": one of wire that dispensed milk, and one of soft cloth that gave only warmth. The babies clung to the soft one and ran to it whenever they were frightened — choosing comfort over food. It revealed something true for human infants too: touch isn't a luxury, it's a need. Today you treat it as one.`,
        task: `Make this measurement a moment of comfort, not effort. If someone is with you, a hand on your back or shoulder is enough; alone, wrap yourself in something soft and warm. Let the body feel held.`,
        practice: `Measure from that place of physical comfort and warmth. Notice whether feeling physically "held" changes the quality of your attention and calm.`,
        reflectionPrompt: `Did feeling physically comforted change your calm or attention?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Your Own Hands`,
        intro: `You don't always need someone else — your own touch carries some of the same signal. A hand placed gently on the heart, a slow massage of the hands, even crossing your arms to hold yourself: the body reads these as care and tends to settle. Today you are both the giver and the receiver.`,
        task: `Before and during the measurement, offer yourself a little calming touch — a warm hand over your heart, or slowly pressing each fingertip. Keep it gentle and unhurried, as you would for someone you cared about.`,
        practice: `With the wheel in front of you, measure while giving yourself that quiet, caring touch. Notice whether your own touch can settle you the way another person's might.`,
        reflectionPrompt: `Could your own touch settle you the way another person's touch might?`,
        measureSeconds: 150 },
      { id: 'd4', title: `The Distance Between Us`,
        intro: `Touch is powerful, but connection doesn't always need contact — sit close to someone you trust and you can feel the difference without a single touch. Closeness itself, that shared small space, carries something. Today you explore connection at arm's length.`,
        task: `If you can, sit close to another person — near, but not touching — and measure together in that shared closeness. Alone, picture someone you feel deeply connected to sitting just beside you, close enough to sense.`,
        practice: `With the wheel in front of you, measure inside that sense of closeness, with or without touch. Notice whether simply being near a connection — real or vividly felt — has an effect of its own.`,
        reflectionPrompt: `Did closeness without touch carry an effect of its own?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Why Connection Keeps Us Going`,
        intro: `This isn't soft sentiment: when researchers pooled data from millions of people, they found that strong social bonds predict how long we live about as powerfully as not smoking does. Loneliness, by the same measure, is a serious health risk. Touch and closeness aren't extras on top of a healthy life — they're part of the fabric of one. Today you close this experiment by simply valuing that.`,
        task: `Gather everything from this week — touch, warmth, closeness, care — and bring whoever or whatever gives you that feeling into the moment, in person or in mind. Then measure, unhurried and held.`,
        practice: `Measure from that full sense of connection. Notice how being warmly connected feels compared with the alone, unobserved measurement back at the start of this topic.`,
        reflectionPrompt: `How did measuring while warmly connected compare with measuring alone earlier in the topic?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Guided Energy Practices  (no claims — only what YOU notice)
  // ==========================================================================
  {
    id: 'guided-energy-practices',
    topic: 'energy-healing',
    title: `Guided Energy Practices`,
    level: 'Intermediate',
    cover: 'assets/experiments/guided-energy-practices.jpg',
    order: 4,
    summary: `Five days looking — without claims — at the practices millions of people use to support one another: Reiki, Qigong, healing touch. The only question is what YOU notice.`,
    days: [
      { id: 'd1', title: `A Practice Millions Use`,
        intro: `Across the world, an enormous number of people practise some form of directing care through attention and the hands — over a million trained in Reiki, and by some estimates a hundred million in Qigong. We're not here to argue whether it does what its practitioners believe; we're here to do something more interesting — see what you actually experience. Today you simply step in with an open, curious mind.`,
        task: `Sit with the wheel and set aside, for now, both belief and disbelief. If you've ever received Reiki, Qigong or something similar, recall how it felt; if not, simply hold an openness to the idea of supportive attention. Approach as a curious explorer, not a judge.`,
        practice: `Measure from that open, unhurried, curious state. Notice what you actually feel when you set aside both belief and doubt and simply pay attention.`,
        reflectionPrompt: `With both belief and doubt set aside, what did you actually notice?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Receiving`,
        intro: `At the heart of most of these traditions is a simple act: one person quietly directing calm, caring attention toward another. Stripped of any theory, that's just deep attentiveness — and being on the receiving end of it is surprisingly rare, and surprisingly pleasant. Today you let yourself receive.`,
        task: `If someone is willing, ask them to sit near you and gently hold the intention of calm and wellbeing toward you while you measure — hands near you, or simply present. Alone, imagine receiving that calm, caring attention, as if from someone who wishes you well.`,
        practice: `With the wheel in front of you, measure while receiving that supportive attention, real or imagined. Notice whether being the receiver of someone's calm intention has any effect you can feel.`,
        reflectionPrompt: `Did receiving someone's calm, caring attention have an effect you could feel?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Giving`,
        intro: `There's an old observation among people who practise these methods: the giver often feels as much as the receiver, sometimes more. Directing calm, focused goodwill at another person seems to settle the one doing it too. Today, if you can, you sit on the giving side.`,
        task: `If you have a willing partner, gently direct calm, kind attention toward them as they sit with you — no agenda, just steady goodwill — while you measure. Alone, send that same warm, caring intention outward toward someone you care about, holding them in mind.`,
        practice: `With the wheel in front of you, measure while giving calm, caring attention to another. Notice whether offering goodwill to someone else changes your own state.`,
        reflectionPrompt: `Did directing calm goodwill toward someone else change how you felt?`,
        measureSeconds: 150 },
      { id: 'd4', title: `The Hands`,
        intro: `Many of these traditions use the hands — held near the body, moving slowly, never needing to touch. Whatever you make of the explanations, the human hand is dense with nerves and warmth, and we're deeply tuned to its nearness; most people can feel a hand hovering close to their skin with their eyes shut. Today you explore that simple sensitivity.`,
        task: `If you can, have someone slowly bring a warm hand close to your hands or face — not touching — while you measure, and just feel its nearness. Alone, hold your own two palms close together until you sense the warmth between them, then keep that subtle awareness as you measure.`,
        practice: `With the wheel in front of you, measure while attending to the felt nearness of a hand — another's or your own. Notice how sensitive you actually are to warmth and closeness you can't see.`,
        reflectionPrompt: `How clearly could you feel the nearness and warmth of a hand without seeing it?`,
        measureSeconds: 150 },
      { id: 'd5', title: `What You Take From It`,
        intro: `You've stepped into these practices as an explorer — receiving, giving, feeling the nearness of a hand — and formed your own first-hand impressions, which are worth more than anyone else's claims. Millions find something here that matters to them; whether you do is entirely yours to decide. Today you simply gather your own honest experience.`,
        task: `Combine whatever felt meaningful this week — open curiosity, receiving, giving, the warmth of the hands — into one calm session, alone or with a willing partner.`,
        practice: `With the wheel in front of you, measure from that gathered, open, attentive state. Notice what, across this whole experiment, actually stood out for you — not what you were told to feel.`,
        reflectionPrompt: `Across this whole experiment, what stood out as real in your own experience?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Healing Encounters  (not "energy heals" — human connection is special)
  // ==========================================================================
  {
    id: 'healing-encounters',
    topic: 'energy-healing',
    title: `Healing Encounters`,
    level: 'Advanced',
    cover: 'assets/experiments/healing-encounters.jpg',
    order: 5,
    summary: `Five days on the deepest question of the topic — not whether energy heals, but why simply being with the right person can make us feel so much better.`,
    days: [
      { id: 'd1', title: `Being Truly Heard`,
        intro: `Think of the difference between someone half-listening to you and someone genuinely, fully there — it's night and day, and we feel it instantly. Being truly heard is one of the rarest and most restoring experiences a person can have, and it involves no technique at all, only presence. Today you start from there.`,
        task: `Recall a time you felt completely heard and understood by another person, and let that feeling — of being met, of mattering — come back as vividly as you can. If someone can simply listen to you for a minute beforehand, even better.`,
        practice: `With the wheel in front of you, measure while holding that sense of being truly heard and met. Notice whether feeling genuinely received by another person settles something in you.`,
        reflectionPrompt: `Did the feeling of being truly heard settle something in you?`,
        measureSeconds: 150 },
      { id: 'd2', title: `Wired for Response`,
        intro: `In a now-classic experiment, mothers were asked to face their babies and suddenly go blank — a still, unresponsive face. Within seconds the infants grew distressed, working hard to win back the connection. It shows how deeply, from our very first months, we're built to need another person's responsiveness. That wiring never leaves us. Today you honour it.`,
        task: `If you can, sit with someone who is warmly responsive to you — meeting your eyes, present, engaged — for a short while before and during the measurement. Alone, vividly recall being with someone whose responsiveness made you feel safe.`,
        practice: `With the wheel in front of you, measure inside that responsive, engaged connection, real or remembered. Notice what a sense of being truly responded to does to your inner state.`,
        reflectionPrompt: `What did a sense of being truly responded to do to how you felt?`,
        measureSeconds: 180 },
      { id: 'd3', title: `The Weight of Compassion`,
        intro: `There's a reason a compassionate presence feels different from a merely competent one: we read warmth in others almost instantly, and it changes how safe we feel. You can even generate it from the inside — wishing yourself or others well reliably tilts the body toward calm. Today you become the source of that warmth.`,
        task: `Before and during the measurement, hold a simple wish of goodwill — for yourself, or someone you care about: "may you be well, may you be at ease." Let the warmth of it be genuine, not mechanical. If a kind person can sit with you, let their warmth join yours.`,
        practice: `With the wheel in front of you, measure while holding that warm, compassionate wish. Notice whether generating genuine warmth changes how your body and mind feel.`,
        reflectionPrompt: `Did holding genuine warmth and goodwill change how you felt?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Connection as Medicine`,
        intro: `We tend to file "support" under nice-to-have, but the evidence says otherwise: close, caring relationships predict our health and even our lifespan about as strongly as the big medical risk factors do. In a real sense, connection isn't only comforting — it's protective. Today you sit with that, and let a caring connection simply be present.`,
        task: `Bring a genuinely caring connection into the moment — a person who is good for you, present in the room or held clearly in mind — and let yourself fully receive that care. No task beyond letting it in.`,
        practice: `With the wheel in front of you, measure while fully receiving a caring connection. Notice whether letting care all the way in feels different from merely thinking about it.`,
        reflectionPrompt: `Did fully letting a caring connection in feel different from just thinking about it?`,
        measureSeconds: 210 },
      { id: 'd5', title: `Something Special`,
        intro: `Across this whole topic you've explored presence, support, touch, attention and compassion — and made no grand claims about energy along the way. The thread running through all of it is quieter and, perhaps, more remarkable: human connection genuinely changes how we feel, and that is no small thing. Today you simply rest in the best of it.`,
        task: `Gather everything that felt true this month — being seen, supported, touched, heard, cared for — and bring the warmest of it into one last session, with someone present or vividly in mind.`,
        practice: `With the wheel in front of you, measure from that full sense of human connection, asking nothing more of it. Notice what feels most different about you now, at the end of this exploration of being with others.`,
        reflectionPrompt: `After exploring connection in all these ways, what feels most special about being with another person?`,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  HUMAN CONNECTION TOPIC
  //  Dramaturgy: the first topic that is NOT about the individual. Telekinesis
  //  was "me and my attention", Meditation "me and my mind", Energy Healing
  //  "me and support" — Human Connection is about WE: what happens when two
  //  people's attention meets. Here the wheel is NOT the protagonist; PEOPLE
  //  are. The wheel is simply the shared object two (or more) people attend to
  //  together — a neutral focal point, never reading or proving connection.
  //  Most days work best with another person; always give a solo fallback
  //  (perfect for Spiritual Makers doing it WITH a member, and for solo users).
  //  Ties directly into the app's social features: sessions, group sessions,
  //  Spiritual Makers, followers, paired measurements. ~2 real "wow" sources
  //  per experiment; the rest is everyday human observation. Never woo.
  // ##########################################################################

  // ==========================================================================
  //  1 — Being Seen  (why does being watched change us?)
  // ==========================================================================
  {
    id: 'being-seen',
    topic: 'human-connection',
    title: `Being Seen`,
    level: 'Beginner',
    cover: 'assets/experiments/being-seen.jpg',
    order: 1,
    summary: `Four short days on a feeling everyone knows but few examine: how being watched — even by a single pair of eyes — quietly changes the way we act.`,
    days: [
      { id: 'd1', title: `Alone, Unwatched`,
        intro: `There's a version of you that only exists when no one is around — the one who sings in the car, talks to the dog, moves without a second thought. The moment we sense another person, something subtly tightens or shifts. Before exploring that shift, today you simply meet your unwatched self, with the wheel as a quiet companion.`,
        task: `Run this one completely alone, with the door shut if you can. Set up the wheel and measure exactly as you normally would — no audience, real or imagined — and let yourself be entirely unselfconscious.`,
        practice: `For the measurement, just be with the wheel on your own, paying attention to how loose and private it feels. Notice what your body and attention are like when you are certain no one is watching.`,
        reflectionPrompt: `What were your body and attention like when you were certain no one could see you?`,
        measureSeconds: 120 },
      { id: 'd2', title: `A Pair of Watching Eyes`,
        intro: `Here's a strange one: at a university coffee station with an honest-payment box, researchers taped up a small poster that switched each week between flowers and a pair of eyes. On the weeks the eyes were watching, people paid almost three times as much for their drinks — without ever noticing why. A picture of eyes can't actually see you, yet some old part of the brain responds as if it can.`,
        task: `Today, give yourself a watcher. Prop up a photo of a face, or even a simple drawing of eyes, where it seems to look at you while you measure. You know it isn't real — set it there anyway and let yourself be quietly watched.`,
        practice: `Measure under that gaze, paying attention to your inner state. Notice whether even an imaginary pair of eyes changes how you feel or hold yourself.`,
        reflectionPrompt: `Did even a pretend pair of watching eyes change how you felt while measuring?`,
        measureSeconds: 120 },
      { id: 'd3', title: `The Imaginary Audience`,
        intro: `We tend to believe everyone notices us far more than they do. In a famous study, people sent into a room wearing an embarrassing T-shirt were sure about half the others had clocked it — really, only a quarter had. Psychologists call it the "spotlight effect": we live under a spotlight that mostly shines in our own heads. Today you turn that light off and see what changes.`,
        task: `As you set up the wheel, deliberately let go of the imagined audience — the sense that anyone, anywhere, is judging how you do this. Remind yourself, honestly, that no one is watching and no one is keeping score. Then measure just for you.`,
        practice: `Measure with the spotlight switched off, as privately and freely as you can. Notice whether dropping the imagined audience leaves you looser than when you feel watched.`,
        reflectionPrompt: `Did letting go of an imagined audience feel different from being watched?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Being Seen`,
        intro: `Over three days you've measured unwatched, under a pretend gaze, and with the spotlight switched off — and felt how sensitive we are to being seen, even by eyes that aren't really there. Today you bring in the real thing: another living person, actually present. Before you start, make a quiet prediction — will a real observer feel stronger than the imaginary ones did?`,
        task: `If you can, ask someone to sit nearby and simply watch you measure — no talking, no helping, just present and attentive. If you're on your own, picture, as vividly as you can, one specific person sitting across from you, eyes on you.`,
        practice: `Measure inside that sense of being genuinely seen by another person, real or vividly imagined. Notice how a real human presence compares with the pretend watchers of the last few days — and whether your prediction held.`,
        reflectionPrompt: `How did being seen by a real person compare with the imaginary watchers — and did it match your prediction?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Shared Attention  (what happens when two people attend to one thing?)
  // ==========================================================================
  {
    id: 'shared-attention',
    topic: 'human-connection',
    title: `Shared Attention`,
    level: 'Beginner',
    cover: 'assets/experiments/shared-attention.jpg',
    order: 2,
    summary: `Five days on a quiet kind of magic: what happens when two people point their attention at the very same thing, at the very same time.`,
    days: [
      { id: 'd1', title: `Two People, One Focus`,
        intro: `Think of the last time you and someone else looked at the same thing at once — a sunset, a screen, a baby doing something ridiculous. There's a particular pleasure in it that solo looking doesn't have; we instinctively point things out so others can see them too. Today you and the wheel begin exploring that pull toward sharing what we notice.`,
        task: `Sit with the wheel and, if someone is willing, invite them to watch it alongside you — both of you simply attending to the same turning wheel, without talking. Alone, picture someone beside you whose attention rests on the same wheel as yours.`,
        practice: `Measure while sharing your focus on the wheel with another person, real or imagined. Notice whether attending to something together feels different from attending to it alone.`,
        reflectionPrompt: `Did focusing on the wheel together feel different from focusing on it alone?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Why Shared Things Feel Bigger`,
        intro: `Researchers once had people taste chocolate side by side — and found that when two people tasted it at the exact same moment, without saying a word, they liked it more than when the other person was simply nearby doing something else. The same chocolate, made better purely by being shared. Bitter chocolate, oddly, tasted even worse when shared. Whatever we attend to together seems to come in louder.`,
        task: `As you measure, hold the clear sense that another person is attending to this very wheel at the same moment as you — in the room if possible, or vividly in mind. Treat it as a genuinely shared experience, not a solo one with company.`,
        practice: `Measure with that feeling of true co-attention on the wheel. Notice whether sharing the focus makes the experience feel any more vivid or intense than usual.`,
        reflectionPrompt: `Did sharing your attention on the wheel make the experience feel more vivid?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The First Thing We Share`,
        intro: `Long before a baby can speak, somewhere around nine months, it does something quietly profound: it follows your gaze, looks at what you're looking at, then looks back at you — checking that you're sharing the moment too. Researchers see this "joint attention" as one of the foundation stones of being human; almost everything social grows from it. Today you practise that very old skill on purpose.`,
        task: `With the wheel running, share attention the way infants first learn to: if someone is with you, glance at the wheel, then at them, then back — silently confirming you're both here, on the same thing. Alone, alternate gently between the wheel and a clear image of your partner's face, holding the thread between you.`,
        practice: `Measure while keeping that loop of shared attention alive — the wheel, the other person, and the quiet sense of being here together. Notice whether consciously sharing your focus deepens the sense of connection.`,
        reflectionPrompt: `Did deliberately sharing your attention back and forth deepen the sense of being connected?`,
        measureSeconds: 150 },
      { id: 'd4', title: `A Shared Point`,
        intro: `Couples watch a fire. Crowds watch a stage. Teams gather around a single screen. There's something steadying about a shared focal point — a thing in the middle that holds everyone's attention and, through it, holds the people together. Today the wheel becomes that thing in the middle.`,
        task: `Let the wheel sit between you and another person (or a vividly imagined one) as a shared centre — not yours, not theirs, but a point you both share. Both of you simply rest your attention on it, letting it be the still point between you.`,
        practice: `Measure with the wheel held as a shared centre between you and another. Notice whether having a common point to focus on creates any sense of being on the same team.`,
        reflectionPrompt: `Did sharing a single focal point create a feeling of being on the same team?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Together`,
        intro: `Over these days you've felt the pull to share what you notice, watched shared things grow more vivid, practised the infant's first act of joint attention, and let the wheel become a point held in common. Today you gather all of it into one shared session. Before you begin, predict: will attending together feel noticeably stronger than the solo focus you started with?`,
        task: `With a partner present or clearly in mind, bring everything together: glance between the wheel and them, feel the shared focus, and let the wheel be the centre you both attend to. One wheel, two minds, the same moment.`,
        practice: `Measure in that full sense of shared attention. Notice how attending together now compares with attending alone on Day 1 — and whether your prediction held.`,
        reflectionPrompt: `How did fully shared attention compare with focusing alone at the start — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Synchrony  (why do bodies near each other fall into the same rhythm?)
  // ==========================================================================
  {
    id: 'synchrony',
    topic: 'human-connection',
    title: `Synchrony`,
    level: 'Intermediate',
    cover: 'assets/experiments/synchrony.jpg',
    order: 3,
    summary: `Five days on one of the stranger things bodies do near each other: without deciding to, they begin to fall into the same rhythm.`,
    days: [
      { id: 'd1', title: `Falling Into Step`,
        intro: `Walk beside someone for a while and watch your feet: chances are you've drifted into step without either of you arranging it. Scattered applause in a hall will sometimes collapse, on its own, into a single clap. Bodies near each other seem to reach for the same rhythm. Today you start noticing that pull, with the wheel as your metronome.`,
        task: `Switch on the wheel and let your breathing settle into an easy, steady rhythm as you watch it turn. If someone is with you, simply breathe near each other; alone, imagine a person breathing quietly beside you.`,
        practice: `Measure while holding a calm, steady rhythm in your breath alongside another's, real or imagined. Notice whether being near another person's rhythm does anything to your own.`,
        reflectionPrompt: `Did being near someone else's rhythm change your own without you trying?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Rocking Chairs`,
        intro: `In one elegant experiment, people sat side by side in rocking chairs and were simply asked to rock at their own pace. They couldn't help themselves: their chairs gradually slid into sync, rocking forward and back together, with no one intending it. Just sharing the sight and sound of another's movement was enough to pull two rhythms into one.`,
        task: `Find a gentle, repeating movement to pair with the wheel — a slow sway, a soft nod, a finger tapping. With a partner, let your movements happen in view of each other without coordinating on purpose; alone, picture moving in time with someone beside you.`,
        practice: `Measure while keeping that easy rhythmic movement near another's. Notice whether your rhythm and theirs drift toward each other on their own, the way the rocking chairs did.`,
        reflectionPrompt: `Did your rhythm and the other person's start to pull together without you arranging it?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Same Beat`,
        intro: `Put on a strong beat in a room full of people and watch heads start to nod and feet start to tap — usually together. Music is one of humanity's oldest ways of making many bodies move as one, which is why every culture sings and drums and dances in groups. A shared beat is a shortcut to a shared rhythm. Today you borrow one.`,
        task: `Pick a slow, steady beat — a quiet metronome, a calm song, or just a count in your head — and let both you and your partner ride it while the wheel runs. Alone, hold a steady internal beat and imagine someone keeping it with you.`,
        practice: `Measure while you and another move or breathe to the same simple beat. Notice whether a shared rhythm makes the sense of being together stronger than silence did.`,
        reflectionPrompt: `Did sharing the same beat strengthen the feeling of being together?`,
        measureSeconds: 150 },
      { id: 'd4', title: `On the Same Team`,
        intro: `Here's why armies march and choirs sing: when researchers had people move in perfect synchrony — stepping or singing together — they went on to cooperate more afterward, even when helping cost them something. Moving as one seems to quietly tell us we're on the same team. The rhythm comes first; the closeness follows.`,
        task: `With a partner, deliberately synchronise something simple for the whole session — breathe in and out together, or sway in time — keeping it as matched as you can while the wheel runs. Alone, vividly synchronise your breath with someone you feel close to, imagined beside you.`,
        practice: `Measure while staying deliberately in sync with another person. Notice whether moving as one shifts how connected — how much on the same team — you feel toward them.`,
        reflectionPrompt: `Did deliberately moving in sync make you feel more like you were on the same team?`,
        measureSeconds: 150 },
      { id: 'd5', title: `In Rhythm`,
        intro: `You've felt rhythms drift together, watched the rocking chairs sync, ridden a shared beat, and used synchrony to feel like a team. Today you bring it all into one synchronised session. Before you start, predict: will being deliberately in rhythm with another person feel different on the wheel than going it alone?`,
        task: `With a partner present or clearly imagined, settle into a shared rhythm — breath, sway, or beat — and begin the measurement together, as matched as you can manage. Two rhythms folded into one.`,
        practice: `Measure in that full, shared rhythm. Notice how being in sync with another person compares with the solo rhythm you began this topic with — and whether your prediction held.`,
        reflectionPrompt: `How did being in sync with someone compare with your solo rhythm at the start — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Empathy  (how much can we actually sense another person?)
  // ==========================================================================
  {
    id: 'empathy',
    topic: 'human-connection',
    title: `Empathy`,
    level: 'Intermediate',
    cover: 'assets/experiments/empathy.jpg',
    order: 4,
    summary: `Five days on the quiet antenna we all carry — the one that picks up what another person is feeling, often before a single word is spoken.`,
    days: [
      { id: 'd1', title: `Reading the Room`,
        intro: `You can walk into a room and feel, within seconds, that something is wrong — before anyone says a word, before you could explain how you know. We're constantly reading faces, postures and tiny signals beneath our awareness, picking up the emotional weather around us. Today you tune that antenna with the wheel.`,
        task: `Before measuring, bring to mind one specific person and how they tend to feel — calm, anxious, warm, tired. If someone is with you, quietly sense their mood without asking. Then carry that felt sense of another's state to the wheel.`,
        practice: `Measure while holding a clear sense of another person's emotional state, real or recalled. Notice whether tuning into someone else's feeling colours your own state at all.`,
        reflectionPrompt: `Did tuning into another person's mood colour how you felt while measuring?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Catching Feelings`,
        intro: `Emotions are contagious in the most literal sense. One person's yawn pulls out yours; a friend's laughter tips you over before you know the joke; a single anxious person can set a whole room on edge. Researchers call it emotional contagion: we automatically, invisibly mimic the people around us, and feel a faint echo of whatever they feel. Today you watch the echo arrive.`,
        task: `As you settle with the wheel, call up a person carrying a strong, clear feeling — someone calm and content works well — and let yourself catch a little of it, the way you'd catch a yawn. Don't manufacture it; just let their state seep into yours.`,
        practice: `Measure while letting another person's emotion gently become your own. Notice whether you can actually feel a trace of someone else's state settle into you.`,
        reflectionPrompt: `Could you feel a trace of someone else's emotion settle into you?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Mirror Inside`,
        intro: `In the early 1990s, scientists recording a monkey's brain noticed something they didn't expect: the same cells fired when the monkey reached for food and when it merely watched someone else reach for it. These "mirror neurons" hinted at a brain partly built to simulate what others do — to feel, a little, from the inside, what we see. How far this goes in humans is still debated, but the everyday version is familiar: we wince when someone else stubs a toe.`,
        task: `With the wheel running, watch or vividly recall someone doing something simple — reaching, smiling, breathing slowly — and let yourself feel it from the inside, as if lightly doing it with them. If a partner is there, mirror their calm without copying obviously.`,
        practice: `Measure while quietly mirroring another person's state from the inside. Notice whether sensing what someone else feels — as if from within — changes anything in you.`,
        reflectionPrompt: `Did feeling another person's state from the inside change anything in you?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Without a Word`,
        intro: `Watch two friends deep in conversation and you'll catch it: one leans on the table, the other follows; one crosses their arms, so does the other — a slow, unconscious dance neither of them notices. We mirror the people we're attuned to, posture for posture, without meaning to. The body keeps a conversation going beneath the words.`,
        task: `With the wheel running and a partner near (or clearly imagined), let your posture and breath quietly soften toward theirs — not copying on purpose, just allowing yourself to settle into their shape. Attune without speaking.`,
        practice: `Measure while wordlessly attuning your body to another's. Notice whether matching someone without words creates a sense of closeness on its own.`,
        reflectionPrompt: `Did quietly matching another person, without words, create a sense of closeness?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Feeling the Other`,
        intro: `This week you've read the room, caught a feeling, mirrored another from the inside, and attuned without a word. Today you gather it into one session of full, open empathy. Before you begin, predict: will deliberately sensing another person feel different on the wheel than focusing only on yourself?`,
        task: `With a partner present or vividly held in mind, open your whole attention toward them — their mood, their rhythm, their state — and let yourself feel it as you measure, while staying gently aware of your own state too.`,
        practice: `Measure in that full, open attunement to another person. Notice how reaching toward someone else compares with the inward focus of your earlier topics — and whether your prediction held.`,
        reflectionPrompt: `How did opening toward another person compare with focusing only on yourself — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Collective Intention  (what happens when many attend at once?)
  //  The culmination — points openly at the app's live & group sessions.
  // ==========================================================================
  {
    id: 'collective-intention',
    topic: 'human-connection',
    title: `Collective Intention`,
    level: 'Advanced',
    cover: 'assets/experiments/collective-intention.jpg',
    order: 5,
    summary: `Five days on the biggest version of the question — what happens when not two, but many people turn their attention toward the same thing at the same time.`,
    days: [
      { id: 'd1', title: `Part of Something Bigger`,
        intro: `Most of us can remember a moment of being swept up by a crowd — a stadium roaring as one, a concert where thousands sang the same line, a room that fell silent together. Something happens in those moments that two people alone can't quite make. Today you begin reaching toward that larger sense of we, with the wheel in front of you.`,
        task: `As you measure, hold in mind that you are not really alone: somewhere, other people are sitting with their own wheels, part of the same quiet community. Let yourself feel like one node in a much larger web of people doing this too.`,
        practice: `Measure while holding the sense of being part of a wider community of people, not a lone user. Notice whether feeling part of something larger changes your state at all.`,
        reflectionPrompt: `Did feeling part of a larger community change how the measurement felt?`,
        measureSeconds: 150 },
      { id: 'd2', title: `The Energy of the Crowd`,
        intro: `Over a century ago, a sociologist watched people in shared ceremonies and named what he saw: "collective effervescence" — a current of feeling that rises in a gathering and lifts everyone past their ordinary selves. Modern researchers find the same thing at concerts, services and festivals: a sense of connection and of something special, and people leave measurably happier. A crowd can be more than the sum of its people.`,
        task: `Recall, as vividly as you can, a time you felt that lift in a crowd — the shared roar, the collective hush — and carry that feeling of communal energy into the session. If others are measuring with you, let the shared mood build between you.`,
        practice: `Measure while holding that sense of collective, shared energy. Notice whether the feeling of a gathering — even remembered — has a different quality from being one-on-one.`,
        reflectionPrompt: `Did the remembered energy of a crowd feel different from one-on-one connection?`,
        measureSeconds: 180 },
      { id: 'd3', title: `Smarter Together`,
        intro: `When researchers measured how well groups solve problems, they found a real "group intelligence" — but it barely depended on how smart the individual members were. What predicted it was how well the group listened: taking turns evenly, and being sensitive to each other. Groups, it turns out, can be wiser than any of their members, but only when attention flows between them. Today you practise that kind of generous, shared attention.`,
        task: `With others present or imagined, hold the session as a group would at its best: attention shared evenly, no one dominating, everyone tuned to everyone. Alone, picture a circle of people around the wheel, each giving and receiving attention in equal measure.`,
        practice: `Measure while holding that balanced, group-wide attention around the wheel. Notice whether imagining attention shared evenly among many feels different from sharing it with just one.`,
        reflectionPrompt: `Did attention shared evenly among many feel different from sharing it with one person?`,
        measureSeconds: 180 },
      { id: 'd4', title: `The Whole Community`,
        intro: `We're built for connection, yet there's a limit to it: one well-known estimate suggests a person can truly hold only around a hundred and fifty stable relationships at once. And yet here, through a screen, hundreds or thousands can turn toward the same moment together — far past what any village ever allowed. A live session, a group room, a shared practice: these are old human gatherings in a new form. Today you step into one.`,
        task: `If a live or group session is available, join it and measure together with others in real time. If not, set a clear intention that you are measuring alongside the whole community right now, and feel the others on the other side of the screen, turned toward the same thing.`,
        practice: `Measure as part of the wider gathering, live or imagined. Notice whether knowing that many others are turned toward the same moment changes how present or connected you feel.`,
        reflectionPrompt: `Did being part of a larger gathering change how connected or present you felt?`,
        measureSeconds: 210 },
      { id: 'd5', title: `All Together`,
        intro: `Across this whole topic you've been seen, shared attention, fallen into rhythm, felt another from the inside, and reached toward the crowd. None of it was really about the wheel — it was about us, and what passes between people when their attention meets. Today, one last time, you join the largest we you can. Before you start, predict: will measuring as part of something collective feel different from the solo focus you began with, weeks ago?`,
        task: `Join a live or group session if you can, or hold the whole community vividly in mind, and bring everything together: be present, share the attention, sync your rhythm, stay open to others — all at once, as part of the many.`,
        practice: `Measure inside that full sense of collective connection. Notice what feels most different now, at the end — between this shared moment and the solo measurements you started with — and whether your prediction held.`,
        reflectionPrompt: `After exploring connection from two people to many, what feels most different about measuring together rather than alone?`,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  CRYSTAL HEALING TOPIC
  //  Frame (like Energy Healing): we do NOT ask whether crystals "work" — the
  //  boring debate. Instead: what happens to a person's attention, intention
  //  and perception when they give MEANING to an object? Telekinesis = focus,
  //  Meditation = awareness, Energy Healing = connection, Crystal Healing =
  //  MEANING & SYMBOLS. The crystal is NEVER the protagonist — it is a pretext
  //  for observation; the PERSON is the protagonist. The wheel is an observing
  //  instrument: "is it a different experience to measure near an object you've
  //  given meaning to?" — a question we invite, never answer. NEVER any woo
  //  (vibrational frequency, crystal energy, healing vibration, quantum crystal,
  //  raising your frequency) and NEVER a healing claim. Real curiosities only:
  //  why we keep stones from trips, why a wedding ring matters, athletes' lucky
  //  objects, why rituals work. ~2 real "wow" sources per experiment; the rest
  //  is everyday human observation.
  // ##########################################################################

  // ==========================================================================
  //  1 — The Meaning We Give Objects  (what makes a thing more than matter?)
  // ==========================================================================
  {
    id: 'meaning-of-objects',
    topic: 'crystal-healing',
    title: `The Meaning We Give Objects`,
    level: 'Beginner',
    cover: 'assets/experiments/meaning-of-objects.jpg',
    order: 1,
    summary: `Four short days on a quiet human habit: turning ordinary objects into something that matters — and what that meaning does to us, with the wheel nearby.`,
    days: [
      { id: 'd1', title: `The Object You'd Never Replace`,
        intro: `Somewhere you probably own an object you would never swap for an identical copy — a worn wedding ring, a grandparent's watch, a stone you carried home from a trip. A perfect duplicate would feel wrong, even though it's physically the same. The matter hasn't changed; the meaning has. Today you bring one such object near the wheel.`,
        task: `Find one object that carries real meaning for you and set it beside the wheel where you can see it as you measure. Don't expect anything of it — simply let it be present, the way a photo sits on a desk.`,
        practice: `Measure with your meaningful object in view, staying tuned to your own state. Notice whether having something that matters to you nearby changes how the measurement feels.`,
        reflectionPrompt: `Did having a meaningful object nearby change how the measurement felt?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Copying Machine`,
        intro: `Psychologists once showed young children a machine that seemed to make perfect copies of any object. The children happily accepted a duplicate of a toy — but when it came to their own beloved blanket or teddy, most refused, and some burst into tears. Even small children sense that a treasured object holds something a copy can't. We call this hunch essentialism: the feeling that a thing is more than its atoms.`,
        task: `Hold your meaningful object from yesterday and ask yourself, honestly: would an identical copy really be the same? Sit with whatever the answer stirs up, then set the original beside the wheel.`,
        practice: `Measure while holding the sense that this particular object is irreplaceable, not just its shape and colour. Notice whether treating it as one-of-a-kind changes the feeling of having it near.`,
        reflectionPrompt: `Did treating your object as truly irreplaceable change how its presence felt?`,
        measureSeconds: 120 },
      { id: 'd3', title: `A Stranger's Touch`,
        intro: `Here's how far this goes: at auction, a sweater sells for far more if people believe a beloved celebrity once wore it — and for far less if they're told it was washed clean first. The same garment, valued differently by an invisible "essence" we imagine clinging to it. We treat objects as if they soak up something from the people and places they've touched.`,
        task: `Choose an object that has been touched by someone who matters to you, or that comes from a place you love. Bring it to the wheel and let yourself feel whatever it seems to carry from that person or place.`,
        practice: `Measure while sensing the invisible history your object seems to hold. Notice whether an object's story — who or where it came from — changes how it feels to have it with you.`,
        reflectionPrompt: `Did the story behind your object — its origin, or who touched it — change how it felt to hold?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Your Own Meaning`,
        intro: `Over three days you've felt how an object can become irreplaceable, why a copy feels wrong, and how we sense a history clinging to things. None of that lives in the material — it lives in you, in the meaning you give. Today you do it on purpose. Before you start, predict: will an object you have deliberately made meaningful feel different from a random one?`,
        task: `Take any simple object — a stone, a coin, the crystal if you have one — and spend a moment giving it meaning: decide what it stands for, and why it matters to you now. Then set it by the wheel as your own charged object.`,
        practice: `Measure with the meaning you've just given it held clearly in mind. Notice whether an object you chose to make meaningful feels different from one with no story at all — and whether your prediction held.`,
        reflectionPrompt: `Did an object you deliberately made meaningful feel different from a random one — and was your prediction right?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Focus Through Symbols  (can an object give attention something to hold?)
  // ==========================================================================
  {
    id: 'focus-through-symbols',
    topic: 'crystal-healing',
    title: `Focus Through Symbols`,
    level: 'Beginner',
    cover: 'assets/experiments/focus-through-symbols.jpg',
    order: 2,
    summary: `Five days on an old trick humans use everywhere: giving the restless mind a single object or symbol to rest on — and what a concrete anchor does for your attention.`,
    days: [
      { id: 'd1', title: `Something to Hold`,
        intro: `Attention left with nothing to hold drifts almost at once — but give it one concrete thing to rest on and it steadies, the way a hand finds a railing. This is why people reach for something to look at or hold when they want to concentrate. Today an object becomes your railing, with the wheel running beside it.`,
        task: `Pick one small object — the crystal, a stone, anything with a clear shape — and place it where you can rest your eyes on it. Let your attention settle onto that single object as the wheel turns.`,
        practice: `Measure with your attention anchored to the object, returning to it whenever you drift. Notice whether having one concrete thing to focus on steadies your attention more than focusing on nothing.`,
        reflectionPrompt: `Did having one concrete object to rest on steady your attention?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Beads Around the World`,
        intro: `Look across the world's religions and you'll find the same quiet invention again and again: a string of beads to count prayers on. The Hindu and Buddhist mala has 108, the Catholic rosary its decades, the Muslim misbaha its ninety-nine — arising separately, yet all the same idea. Across cultures that never met, humans reached for a physical object to hold their attention steady. Today you join that very old habit.`,
        task: `Hold your object in your hand and let it be the thing that keeps you here — fingers resting on it, attention returning to it. If it helps, slowly turn or pass it through your fingers as you settle.`,
        practice: `Measure while keeping light physical contact with your object, letting it hold you in the moment. Notice whether something to hold, not just to look at, anchors you even more.`,
        reflectionPrompt: `Did having something to physically hold anchor you even more than looking at it?`,
        measureSeconds: 150 },
      { id: 'd3', title: `A Centre to Return To`,
        intro: `Many traditions arrange their focus objects around a single centre — a still point the eye keeps coming back to. The pattern matters less than the returning: a fixed centre gives wandering attention a home to find its way back to, over and over. Today your object becomes that centre.`,
        task: `Set your object as the clear centre of your attention, and treat everything else — sounds, thoughts, the wheel's motion — as the edges. Each time you drift to the edges, come gently back to the centre.`,
        practice: `Measure with your object held as the still centre you return to. Notice how it feels to always have one place to come back to, rather than drifting with nowhere to land.`,
        reflectionPrompt: `Did always having one centre to return to change how your attention wandered?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Looking Through, Not At`,
        intro: `There's a subtle shift available with any focus object: instead of staring at it, you can let it become a kind of window — a thing you look through to reach a quieter, steadier state. The object isn't the destination; it's the doorway. Today you try looking through yours.`,
        task: `Rest your attention on your object, then let your gaze soften so it stops being a thing you examine and becomes a doorway into stillness. Don't analyse it — use it to settle past it.`,
        practice: `Measure while using the object as a doorway rather than a destination. Notice whether looking through your object, instead of at it, opens into a calmer state.`,
        reflectionPrompt: `Did using your object as a doorway, rather than staring at it, open into something calmer?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Your Focal Object`,
        intro: `You've used an object to anchor attention, held it the way half the world holds prayer beads, made it a centre to return to, and a doorway to look through. Today you bring all of it into one session with your chosen focal object. Before you begin, predict: will focusing through a meaningful object feel steadier than the bare attention you started with?`,
        task: `Settle with your object as a complete focal symbol — something to hold, a centre to return to, a doorway to look through — and bring your steadiest attention to the wheel through it.`,
        practice: `Measure with your object fully serving as your focal symbol. Notice how anchored attention feels now compared with Day 1, when you focused on nothing — and whether your prediction held.`,
        reflectionPrompt: `How did focusing through your object compare with focusing on nothing on Day 1 — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Beauty & Attention  (why do certain forms pull and hold the eye?)
  // ==========================================================================
  {
    id: 'beauty-and-attention',
    topic: 'crystal-healing',
    title: `Beauty & Attention`,
    level: 'Intermediate',
    cover: 'assets/experiments/beauty-and-attention.jpg',
    order: 3,
    summary: `Five days on a question hiding in plain sight: why do certain shapes and patterns pull our eyes and hold them — and what happens when we really look.`,
    days: [
      { id: 'd1', title: `What Catches the Eye`,
        intro: `Some forms simply pull the eye and won't let go — the facets of a crystal, a spiral shell, a balanced face. A crystal, in fact, is matter arranged in a strict, repeating order all the way down, which is exactly why it grows those clean, flat faces. Today you let one beautiful object catch and hold your attention.`,
        task: `Choose the most visually interesting object you have — the crystal if you own one, or anything with pleasing form — and place it before the wheel. Simply let your eyes be drawn to it and rest there.`,
        practice: `Measure while letting a genuinely interesting form hold your gaze. Notice whether something beautiful to look at holds your attention more easily than something plain.`,
        reflectionPrompt: `Did something beautiful to look at hold your attention more easily than something plain?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Six Sides, No Two Alike`,
        intro: `Every snowflake that has ever fallen shares one rule: six sides, set by the way water molecules lock together as they freeze. Within that rule the variations are endless — a farmer named Wilson Bentley photographed over five thousand and never found a repeat. Order and uniqueness at once: a strict pattern that never makes the same thing twice. Nature is full of this, and it quietly fascinates us.`,
        task: `Look closely at the structure of your object — its edges, its faces, the way it catches light — as if seeing its hidden order for the first time. Hunt for the rules and the irregularities together.`,
        practice: `Measure while studying the fine structure of your object, its order and its quirks. Notice what details appear once you look for the pattern, instead of just glancing.`,
        reflectionPrompt: `What hidden order or detail appeared in your object once you really looked for it?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Nature Counts in Spirals`,
        intro: `Count the spirals in a sunflower head and you'll keep landing on the same numbers — 34 one way, 55 the other; in a pinecone, 8 and 13. These are Fibonacci numbers, and plants use them because spacing each seed about 137.5 degrees from the last packs them most efficiently. The beauty we see in these forms is the visible side of a hidden mathematics. Today you look for that order around you.`,
        task: `Before measuring, find one natural pattern near you — a plant, a shell, the grain of wood, your crystal — and really look at its repeating structure. Bring that freshly-seen pattern to mind as you settle at the wheel.`,
        practice: `Measure while holding the sense that order and pattern run quietly through everything you find beautiful. Notice whether seeing the structure beneath beauty changes how you attend to your object.`,
        reflectionPrompt: `Did noticing the hidden structure beneath a beautiful form change how you looked at it?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Why Symmetry Feels Good`,
        intro: `There may be a simple reason symmetry pleases us: it's easy for the brain to process, and we tend to feel that ease as beauty. A symmetrical pattern carries less information, so the mind handles it smoothly — and that smoothness arrives as a quiet sense of this is good. Even animals prefer symmetry. Today you feel that ease directly.`,
        task: `Rest your gaze on the most balanced, symmetrical part of your object — or fold your attention around its central axis. Let the eye settle into the symmetry and notice how effortless it feels.`,
        practice: `Measure while resting in the easy, balanced symmetry of your object. Notice whether something the eye processes smoothly also leaves your attention calmer.`,
        reflectionPrompt: `Did resting on something smooth and symmetrical leave your attention calmer?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Beauty in Front of You`,
        intro: `You've let a form catch your eye, found order in a snowflake, counted nature's spirals, and felt why symmetry pleases. Today you simply rest in the beauty of your object while you measure. Before you begin, predict: will attending to something genuinely beautiful feel different from an ordinary measurement?`,
        task: `Place your most beautiful object before the wheel and give it your full, appreciative attention — its form, its order, its symmetry — letting yourself simply enjoy looking at it.`,
        practice: `Measure while resting in the simple pleasure of attending to something beautiful. Notice how this compares with an ordinary measurement — and whether your prediction held.`,
        reflectionPrompt: `Did attending to something beautiful feel different from an ordinary measurement — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Expectation & Experience  (does what we expect shape what we feel?)
  // ==========================================================================
  {
    id: 'expectation-and-experience',
    topic: 'crystal-healing',
    title: `Expectation & Experience`,
    level: 'Intermediate',
    cover: 'assets/experiments/expectation-and-experience.jpg',
    order: 4,
    summary: `Five days on one of the mind's strangest powers: how what we expect to feel quietly shapes what we actually feel — even before anything happens.`,
    days: [
      { id: 'd1', title: `What You Expect`,
        intro: `Tell someone a coffee is exceptional and the first sip tastes better; warn them a path is long and it feels longer. We don't meet the world raw — we meet it through a fog of expectation, usually without noticing. Today you watch your own expectations arrive at the wheel.`,
        task: `Before you measure, notice honestly what you expect this session to be like — calm, restless, good, dull. Don't try to change it; just name the expectation you're carrying in.`,
        practice: `Measure while quietly aware of the expectation you brought with you. Notice whether what you expected seems to shape what you actually experience.`,
        reflectionPrompt: `Did what you expected going in seem to shape how the session actually felt?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Wine That Wasn't Red`,
        intro: `In a classic study, wine students were given a glass of red to describe — cherry, cedar, spice — never realising it was white wine dyed red. Their expert noses followed their eyes, not the liquid. Expectation didn't just colour their words; it seems to have changed what they actually tasted. We perceive, to a startling degree, what we expect to perceive.`,
        task: `Choose an object and decide, in advance, one quality it will seem to have for you today — calming, grounding, gently energising. Set that expectation deliberately, then bring the object to the wheel.`,
        practice: `Measure while holding the quality you decided the object would have. Notice whether expecting a particular feeling actually makes you more likely to feel it.`,
        reflectionPrompt: `Did expecting a particular quality from your object make you more likely to feel it?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Price of Pleasure`,
        intro: `Researchers gave people the same wine twice, once calling it cheap and once expensive, while scanning their brains. The "expensive" wine wasn't just rated as nicer — the brain's pleasure regions genuinely lit up more. The enjoyment was real, measured in neurons; only the price was fake. What we believe about a thing reaches all the way down into how much we actually enjoy it.`,
        task: `Pick an object and treat it, today, as something rare and valuable — handle it with a little extra care, as if it were precious. Let that sense of value sit with you as you measure.`,
        practice: `Measure while treating your object as genuinely valuable. Notice whether holding something as precious changes the quality of your experience, even though the object hasn't changed.`,
        reflectionPrompt: `Did treating your object as precious change your experience, even though the object itself hadn't changed?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Belief Shapes Feeling`,
        intro: `This is where crystals get interesting. If you hold a stone expecting calm and you genuinely feel calmer, something real has happened — not in the stone, but in you. Expectation can produce true, felt changes; that's not a trick, it's how the mind works. The honest and far more fascinating question isn't whether the stone does it, but what your own expectation can do.`,
        task: `Hold your object and let yourself fully expect one gentle effect — say, a settled, steady calm — without arguing about whether the object causes it. Just let the expectation be wholehearted as you measure.`,
        practice: `Measure while wholeheartedly expecting a gentle effect, watching your own state rather than the object. Notice whether your expectation alone can produce something you genuinely feel.`,
        reflectionPrompt: `Could your expectation alone produce a change you genuinely felt?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Your Expectation`,
        intro: `You've watched expectation flavour a session, redraw a taste, deepen a pleasure, and produce a real feeling on its own. Today you put it to work deliberately. Before you begin, predict: how much of what you feel this session will come from the object, and how much from what you expect?`,
        task: `Choose an object, set one clear, positive expectation for what this session will give you, and hold it fully — then measure, letting the expectation do its quiet work.`,
        practice: `Measure inside a clear, deliberate expectation. Notice how much of your experience seems to flow from your own mind rather than the object — and whether your prediction held.`,
        reflectionPrompt: `How much of your experience came from your own expectation rather than the object — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Personal Rituals  (why do we build rituals — and do they steady us?)
  //  The culmination — the closing lesson: the difference lives in you, not
  //  the crystal. We invite the question; we never answer it.
  // ==========================================================================
  {
    id: 'personal-rituals',
    topic: 'crystal-healing',
    title: `Personal Rituals`,
    level: 'Advanced',
    cover: 'assets/experiments/personal-rituals.jpg',
    order: 5,
    summary: `Five days on something nearly everyone does and few examine: the small private rituals we build — and how an object, a routine and a little meaning can genuinely steady us.`,
    days: [
      { id: 'd1', title: `The Things We Always Do`,
        intro: `Almost everyone has them: the same mug each morning, a fixed order of getting ready, a lucky shirt for big days. We rarely call them rituals, but that's what they are — small fixed sequences that make the world feel a little more under control. Today you notice your own, and build one around the wheel.`,
        task: `Before measuring, create a simple opening routine — the same three small actions each time: settle the object, take one slow breath, set your attention. Do it deliberately, the same way, then begin.`,
        practice: `Measure after performing your small opening routine. Notice whether a fixed little sequence beforehand changes how you settle into the session.`,
        reflectionPrompt: `Did a small fixed routine beforehand change how you settled into the measurement?`,
        measureSeconds: 150 },
      { id: 'd2', title: `The Champion's Routine`,
        intro: `Watch top athletes and you'll see it everywhere: one tennis great lines up his water bottles with every label facing exactly the same way; a baseball star ate chicken before every single game; another player bounces the ball precisely five times before serving. They aren't naive — many say these routines simply help them focus and feel ready. Today you borrow a champion's trick.`,
        task: `Give your measurement the seriousness of a pre-game routine: arrange your object and your space in a fixed, deliberate way, exactly as you intend to each time. Treat the setup itself as part of the performance.`,
        practice: `Measure after a careful, athlete-style setup. Notice whether preparing with deliberate routine leaves you more focused or ready than just starting cold.`,
        reflectionPrompt: `Did a deliberate, athlete-style setup leave you more focused than starting cold?`,
        measureSeconds: 180 },
      { id: 'd3', title: `The Lucky Ball`,
        intro: `In one experiment, golfers sank noticeably more putts when simply told they were using a "lucky" ball — same ball, same green. The charm didn't bend the laws of physics; it raised their confidence, and the steadier, more committed stroke did the rest. A lucky object can work, but the power runs through you, not the object. Today you test that on the wheel.`,
        task: `Choose an object to be your lucky one for today, and let yourself genuinely treat it as such — confident, a little reassured by its presence. Set it by the wheel as your charm.`,
        practice: `Measure with your lucky object present and the quiet confidence it lends you. Notice whether feeling a little luckier or steadier changes how the session goes.`,
        reflectionPrompt: `Did treating an object as lucky lend you a steadiness you could feel?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Why Rituals Calm Us`,
        intro: `Researchers found that performing a short ritual before a stressful task — a fixed little sequence of actions — measurably lowered people's anxiety and improved how they did. The strange twist: the calming effect appeared only when people thought of it as a "ritual", not as "random behaviours". The meaning we assign the act is part of what makes it work. Today you lean into that.`,
        task: `Do your opening routine again, but this time hold it clearly in mind as a real ritual — something with meaning and weight, not just motions. Let that framing settle you before you measure.`,
        practice: `Measure after a routine you've deliberately treated as a meaningful ritual. Notice whether naming it a true ritual, rather than going through the motions, calms you more.`,
        reflectionPrompt: `Did treating your routine as a meaningful ritual calm you more than just going through the motions?`,
        measureSeconds: 210 },
      { id: 'd5', title: `Your Own Ritual`,
        intro: `Across this whole topic you've given objects meaning, used them to focus, found beauty in their order, watched expectation shape experience, and built rituals that steady you. Through all of it the crystal was never really the point — what's remarkable is what your attention, expectation and meaning can do. Today you bring it together into one ritual of your own. Before you start, predict: will your complete personal ritual feel different from the plain measurement you began with, weeks ago?`,
        task: `Build your full ritual: your meaningful object set just so, your fixed opening routine, a clear expectation, and the quiet sense that this act matters. Then measure, giving it the full weight of a personal ritual.`,
        practice: `Measure inside your complete personal ritual. Notice what feels most different now, at the end — and whether the change lives in the object, or in you — and whether your prediction held.`,
        reflectionPrompt: `After this whole journey, does the difference live in the object, or in you?`,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  KUNDALINI ENERGY TOPIC
  //  Frame (like Telekinesis): we do NOT ask whether kundalini is "real" or
  //  "awaken" anything — the spiritual/skeptic trap. Instead: what intense
  //  inner experiences have people across cultures described for centuries, and
  //  what does modern consciousness & body research find? A CULTURAL +
  //  EXPERIENTIAL topic — never supernatural, religious or medical. Telekinesis
  //  = focus, Meditation = awareness, Energy Healing = connection, Crystal
  //  Healing = meaning, Kundalini = OBSERVING INNER EXPERIENCE & STATES OF
  //  CONSCIOUSNESS. Bridges two worlds: ancient yoga traditions <-> modern
  //  science (interoception, breathing/HRV, posture, flow/altered-state
  //  research). The wheel proves nothing — it's an instrument the user sits
  //  beside while observing themselves. The word "kundalini" appears
  //  prominently only in experiment 5, and even there as "how traditions spoke
  //  of it", never "now we awaken it". NEVER woo: chakra activation, serpent
  //  power awakening, DNA activation, third eye opening, ascension, frequency
  //  upgrades. ~2 real "wow" sources per experiment; the rest is self-observation.
  // ##########################################################################

  // ==========================================================================
  //  1 — Awakening Attention  (what happens when you first attend to yourself?)
  // ==========================================================================
  {
    id: 'awakening-attention',
    topic: 'kundalini-energy',
    title: `Awakening Attention`,
    level: 'Beginner',
    cover: 'assets/experiments/awakening-attention.jpg',
    order: 1,
    summary: `Four short days turning attention inward for the first time — noticing the quiet stream of body sensation that is always there, just beneath awareness, with the wheel running beside you.`,
    days: [
      { id: 'd1', title: `Turning Attention Inward`,
        intro: `Most of the day your attention points outward — at screens, tasks, other people. It's surprisingly rare to simply turn it around and notice what's happening inside your own body, right now. Yet that inner landscape is always there, quietly broadcasting. Today you turn the attention inward, with the wheel running quietly nearby.`,
        task: `Let the wheel run, and instead of watching it, close your eyes and sweep your attention slowly through your body — head to feet — simply noticing whatever is there. Don't look for anything special; just visit each part.`,
        practice: `For the measurement, keep your attention turned inward, scanning the body without judging what you find. Notice how much is happening inside you that you usually never feel.`,
        reflectionPrompt: `How much was happening inside your body that you normally never notice?`,
        measureSeconds: 120 },
      { id: 'd2', title: `What the Brain Filters Out`,
        intro: `Your senses pour in something like eleven million bits of information every second — yet your conscious mind handles only around forty of them. The rest is filtered out before you ever notice, including most of what your body is feeling. We're not aware of very much; we just think we are. Today you reclaim a little of what usually gets filtered.`,
        task: `With the wheel running, pick one small region — your hands, or your feet — and rest your full attention there. Stay long enough for the faint signals to surface: warmth, weight, a pulse, a faint tingle.`,
        practice: `For the measurement, keep your attention parked on that one small area, letting hidden sensations rise into awareness. Notice what appears once you stop filtering it out.`,
        reflectionPrompt: `What sensations rose into awareness once you really attended to one part of your body?`,
        measureSeconds: 120 },
      { id: 'd3', title: `The Body Beneath Thinking`,
        intro: `We live so much in our thoughts that the body becomes a kind of background hum we stop hearing. But underneath the mental chatter, the body is always present, always sensing. Slipping below the level of thinking, into pure sensation, is a different way of being awake. Today you drop beneath the thoughts.`,
        task: `With the wheel running, each time you notice you've drifted into thinking, gently drop your attention back down into raw body sensation — the feeling of sitting, breathing, the air on your skin. Thought, then back to the body.`,
        practice: `For the measurement, keep returning from thought to direct sensation. Notice whether resting in the body, beneath thinking, feels different from your usual mental chatter.`,
        reflectionPrompt: `Did resting in pure body sensation feel different from being lost in thought?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Awake to Yourself`,
        intro: `Over three days you've turned attention inward, met what the brain usually filters out, and dropped beneath thinking into the body. This simple inward awareness is the doorway to everything this topic explores. Before you start, predict: after a few days of practice, will tuning into your body feel easier than it did on Day 1?`,
        task: `With the wheel running, settle into a calm, full awareness of your whole inner state at once — body, breath, the subtle field of sensation — awake to yourself without straining. Just be present to what is already there.`,
        practice: `For the measurement, rest in that open inner awareness, noticing whatever arises. Notice how tuning into yourself feels now compared with the first day — and whether your prediction held.`,
        reflectionPrompt: `How did tuning into your inner world feel now compared with Day 1 — and was your prediction right?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Energy & Sensation  (why do we call certain body feelings "energy"?)
  // ==========================================================================
  {
    id: 'energy-and-sensation',
    topic: 'kundalini-energy',
    title: `Energy & Sensation`,
    level: 'Beginner',
    cover: 'assets/experiments/energy-and-sensation.jpg',
    order: 2,
    summary: `Five days on a word people reach for all over the world — energy — and the real, surprising sensations underneath it: tingling, warmth, pulsing, the quiet electricity of a living body.`,
    days: [
      { id: 'd1', title: `The Language of Energy`,
        intro: `People everywhere describe certain feelings as "energy" — a buzz of excitement, a wave of warmth, a tingling up the arms. They're not measuring anything with instruments; they're reaching for a word to capture a vivid bodily sensation. Today we set aside whether any energy "moves" and simply look at what the body actually feels.`,
        task: `With the wheel running, scan your body for any sensation you'd naturally call "energy" — a tingle, a buzz, a warmth, a restlessness. Don't explain it; just locate it and feel it clearly.`,
        practice: `For the measurement, stay curious about whatever sensations you'd label "energy", observing them as plainly as you can. Notice what is actually there, underneath the word.`,
        reflectionPrompt: `What did the sensations you'd call "energy" actually feel like, underneath the word?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Tingling on Demand`,
        intro: `Here's a strange, real fact: breathe quickly for a little while and many people feel tingling spread through their hands, feet and face. It isn't mysterious — fast breathing lowers carbon dioxide and shifts the body's chemistry, making the nerves fire differently. A dramatic "energy" sensation, produced entirely by breath. Today you explore it gently.`,
        task: `Before measuring, breathe a little faster and fuller than usual for a short while — only until you feel a mild tingling or buzzing, then stop and let your breath return to normal. Never push to dizziness; gentle is enough.`,
        practice: `Measure as the sensation settles, observing the tingling or buzz with curious attention. Notice how a simple change in breathing can produce a vivid bodily "energy" of its own.`,
        reflectionPrompt: `What did the breath-made tingling feel like — and did it resemble what people call "energy"?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Shivers Down the Spine`,
        intro: `Almost everyone has felt it: a piece of music swells, and a wave of chills runs down the spine, raising the hairs on your arms. Scientists call it frisson, and it's real and measurable — a burst of dopamine and a spike of nervous-system arousal you can record on the skin. A genuine rush of "energy" through the body, triggered by nothing but sound. Today you chase that wave.`,
        task: `Before or during the measurement, play a piece of music that reliably gives you chills, and let the wave of frisson move through you. Feel exactly where it travels in the body.`,
        practice: `Measure while staying open to those waves of chills, tracking them as they rise and fade. Notice the path the sensation takes through your body, and how strong it feels.`,
        reflectionPrompt: `Where did the wave of chills travel in your body, and how strong was it?`,
        measureSeconds: 150 },
      { id: 'd4', title: `The Sensing Body`,
        intro: `There's a whole sense most people never name: interoception, the felt sense of your own insides — heartbeat, breath, the gut, the subtle tone of the body. Some people feel it vividly, others barely at all, and you can sharpen it simply by paying attention. Today you turn that inner sense up.`,
        task: `With the wheel running, see if you can feel your own heartbeat without touching your pulse — just by attending to your chest, throat, or fingertips. If you can't find it, rest on the breath or the gut instead.`,
        practice: `For the measurement, keep listening inward for the body's quiet signals — pulse, breath, subtle movement. Notice how much of your own inner workings you can actually feel from the inside.`,
        reflectionPrompt: `How much of your body's inner activity could you actually feel from the inside?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Reading Your Own Signals`,
        intro: `You've met the sensations behind the word "energy", made tingling with your breath, ridden waves of chills, and listened to your body from the inside. None of it required believing anything moves — only paying close attention. Before you begin, predict: will your body feel more alive and detailed now than it did at the start of this experiment?`,
        task: `With the wheel running, take an unhurried inventory of every sensation you can find — warmth, pulse, tingle, the subtle hum of being alive — and simply read them, like a rich inner weather report.`,
        practice: `For the measurement, rest in that full, detailed sensing of your body. Notice how alive and textured your inner world feels now compared with Day 1 — and whether your prediction held.`,
        reflectionPrompt: `Did your body feel more alive and detailed than at the start — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Breath, Posture & Awareness  (how body architecture reshapes attention)
  // ==========================================================================
  {
    id: 'breath-posture-awareness',
    topic: 'kundalini-energy',
    title: `Breath, Posture & Awareness`,
    level: 'Intermediate',
    cover: 'assets/experiments/breath-posture-awareness.jpg',
    order: 3,
    summary: `Five days on something every yoga tradition discovered and modern science now measures: how the simple architecture of breath and posture quietly reshapes your attention and your state.`,
    days: [
      { id: 'd1', title: `The Upright Spine`,
        intro: `Yoga has always begun with the seat — Patanjali's ancient definition of posture is simply "steady and comfortable". Modern research backs the instinct: in one study, people held in an upright posture under stress felt more enthusiastic and confident, while those who slumped felt sluggish and fearful. How you hold the body shapes how you feel. Today you sit up and notice.`,
        task: `Before measuring, set your spine: sit tall but not stiff, crown lifting gently, shoulders easy — steady and comfortable. Settle into the posture before you reach for the wheel.`,
        practice: `Measure from that upright, easy posture, staying aware of how it feels. Notice whether sitting tall changes your mood, alertness or attention compared with slumping.`,
        reflectionPrompt: `Did sitting upright change your mood or alertness compared with how you usually sit?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Pace of Breath`,
        intro: `There's a breathing rate — around six slow breaths a minute — where something quietly clicks: the heart and breath fall into step, and the calming branch of the nervous system takes over. Researchers call it resonance, and it's one of the fastest drug-free ways we know to settle the body. Many old breathing practices land near this same slow pace. Today you find it.`,
        task: `With the wheel running, slow your breath toward roughly six a minute — in for about five seconds, out for about five — smooth and unforced. Don't strain for the count; just breathe slow and even.`,
        practice: `Measure while holding that slow, even breath. Notice whether breathing at this calm pace shifts your body and attention into something steadier.`,
        reflectionPrompt: `Did slowing your breath to a calm, even pace shift your state?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Breath as a Dial`,
        intro: `Breath is the one body rhythm you can either leave on automatic or take over at will — which makes it a kind of dial for your own state. Quick and shallow tends to rouse you; slow and deep tends to settle you. Most people never realise they're holding the dial. Today you turn it both ways.`,
        task: `With the wheel running, experiment: breathe a little quicker and lighter for a stretch, then slow and deepen it, and feel how each changes you. Then leave the breath wherever feels best and rest there.`,
        practice: `Measure while gently steering your breath and feeling its effect, then letting it settle. Notice how directly your breathing seems to set the dial of your inner state.`,
        reflectionPrompt: `How directly did changing your breath change your state?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Where Attention Sits`,
        intro: `Notice where "you" seem to be located right now — most people feel themselves somewhere behind the eyes, up in the head. But attention can be moved: drop it into the chest, the belly, the whole body, and your sense of yourself shifts with it. The traditions that explore inner experience spend a lot of time moving attention down, out of the head. Today you try.`,
        task: `With the wheel running and your posture steady, deliberately move the centre of your attention out of your head — down into your chest, then your belly, resting it low and settled in the body.`,
        practice: `Measure while keeping your attention settled low in the body rather than up in the head. Notice whether moving where attention "sits" changes how you feel.`,
        reflectionPrompt: `Did moving your attention down out of your head change how you felt?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Body as Instrument`,
        intro: `You've set the spine, found the resonant breath, used breath as a dial, and moved attention through the body. Together these are the oldest tools for tuning a human being — the body played like an instrument. Before you begin, predict: will a deliberately tuned posture and breath feel noticeably different from how you started this topic?`,
        task: `With the wheel running, bring it all together: an upright, easy spine, a slow even breath, attention settled low in the body. Tune yourself fully, then simply rest in the result.`,
        practice: `Measure from that fully tuned state of body and breath. Notice how this compares with your ordinary, untuned sitting — and whether your prediction held.`,
        reflectionPrompt: `How did a fully tuned posture and breath compare with how you began — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — States of Consciousness  (why does the same mind feel so different?)
  // ==========================================================================
  {
    id: 'states-of-consciousness',
    topic: 'kundalini-energy',
    title: `States of Consciousness`,
    level: 'Intermediate',
    cover: 'assets/experiments/states-of-consciousness.jpg',
    order: 4,
    summary: `Five days on a quiet mystery: why the same mind can feel so different from one moment to the next — absorbed, spacious, sharpened, or strangely still — and what the science of altered states has found.`,
    days: [
      { id: 'd1', title: `Not One Single Mind`,
        intro: `We talk as if we have one steady mind, but your state of consciousness shifts all day — drowsy, alert, daydreaming, absorbed, anxious, calm. Each feels like a slightly different version of you. We rarely stop to notice these shifts, let alone explore them on purpose. Today you start watching your own states change.`,
        task: `With the wheel running, simply observe the quality of your consciousness right now — sharp or foggy, busy or still, tense or open — without changing it. Just take an honest reading of your current state.`,
        practice: `For the measurement, keep noticing the texture of your state and any small shifts in it. Notice how your state of mind actually feels, and whether it stays put or drifts.`,
        reflectionPrompt: `What did your state of mind actually feel like — and did it stay steady or shift?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Lost in Absorption`,
        intro: `Some people can become so absorbed in a book, a piece of music or a memory that the outside world simply falls away — psychologists measure this as a trait called "absorption". The more absorbed you become, the more your ordinary sense of time and self loosens. It's an everyday doorway into an altered state, and almost everyone has walked through it. Today you walk through on purpose.`,
        task: `With the wheel running, let yourself become completely absorbed in one thing — the sensation of breathing, a sound, the turning wheel itself. Sink into it fully, letting everything else fade to the edges.`,
        practice: `Measure while sinking as deeply into absorption as you can. Notice whether deep absorption changes your sense of time, of yourself, or of being present.`,
        reflectionPrompt: `When you became fully absorbed, did your sense of time or self change?`,
        measureSeconds: 150 },
      { id: 'd3', title: `When the Mind Goes Quiet`,
        intro: `Here's a surprising discovery: many altered states — flow, the runner's high, deep meditation — seem to share one thing, a temporary quieting of the brain's busy front region, the part that plans, judges and monitors you. When that inner manager goes quiet, self-consciousness fades and things feel effortless. The "higher" state is, oddly, partly a switching-off. Today you look for that quiet.`,
        task: `With the wheel running, do something simple and absorbing with full attention, and watch for the moment the inner commentator — the one judging and planning — goes quiet. Don't force it; just notice when effort drops away.`,
        practice: `Measure while letting the self-monitoring mind grow quiet, doing without commenting. Notice whether things feel more effortless when the inner manager steps back.`,
        reflectionPrompt: `Did anything feel more effortless when your inner commentator went quiet?`,
        measureSeconds: 150 },
      { id: 'd4', title: `The Effortless State`,
        intro: `In the states people prize most — deep in a craft, a sport, music — action and awareness seem to merge: you stop watching yourself do the thing and simply become the doing. There's no separate "you" standing back and managing. It feels less like trying and more like being carried. Today you reach toward that merging at the wheel.`,
        task: `With the wheel running, give yourself fully to attending to it, until the line between you-watching and the-watching softens — no manager, no effort, just the activity happening. If the separate "you" reappears, gently dissolve back into the doing.`,
        practice: `Measure while letting watcher and watched merge as much as they will. Notice whether the sense of a separate self managing things fades at all.`,
        reflectionPrompt: `Did the sense of a separate self, watching and managing, fade at all?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Shifting State at Will`,
        intro: `You've read your own states, sunk into absorption, felt the busy mind go quiet, and tasted the merging of action and awareness. These are the building blocks of what every tradition calls a "higher" or "altered" state — reached not by magic but by attention. Before you begin, predict: can you deliberately shift into a noticeably different state of consciousness now?`,
        task: `With the wheel running, deliberately guide yourself into a shifted state — deeply absorbed, quiet-minded, effortless — using everything you've practised. Then rest there and simply observe it.`,
        practice: `Measure from that deliberately shifted state. Notice how different it feels from your ordinary waking mind — and whether your prediction held.`,
        reflectionPrompt: `Could you deliberately shift into a different state — and how different did it feel?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Kundalini Traditions  (what did the traditions mean by kundalini?)
  //  The culmination — the word appears prominently, openly, as culture &
  //  experience; ancient practice meets modern science. We never "awaken"
  //  anything and never answer the question — we explore how people described it.
  // ==========================================================================
  {
    id: 'kundalini-traditions',
    topic: 'kundalini-energy',
    title: `Kundalini Traditions`,
    level: 'Advanced',
    cover: 'assets/experiments/kundalini-traditions.jpg',
    order: 5,
    summary: `Five days meeting, at last, the old and striking idea people have called kundalini — not to awaken anything, but to explore how different cultures described intense inner experience, and where ancient practice meets modern science.`,
    days: [
      { id: 'd1', title: `The Coiled Word`,
        intro: `The word kundalini is Sanskrit for "coiled" — picture a coiled spring, or a sleeping serpent. For centuries, yogic traditions used it to describe a latent inner potential said to rest at the base of the spine, and it reached the West only in 1919, when a British scholar translated the old texts. We're not here to awaken anything — only to explore what people meant by it. Today you simply sit with the idea.`,
        task: `With the wheel running, sit tall and bring a curious, open mind to the idea that humans have long imagined a reservoir of inner potential along the spine. You don't have to believe it — just hold it lightly and notice the base of your spine, the length of your back.`,
        practice: `Measure while resting attention along the spine, from base to crown, with open curiosity. Notice what you actually feel along the spine when you simply pay attention to it.`,
        reflectionPrompt: `What did you actually notice along your spine when you simply attended to it?`,
        measureSeconds: 150 },
      { id: 'd2', title: `An Old Map of the Inner World`,
        intro: `Long before brain scans, yogis built remarkably detailed maps of inner experience. Patanjali laid out an eight-step path from posture and breath all the way to deep absorption; a fifteenth-century manual, the Hatha Yoga Pradipika, catalogued breathing and concentration techniques in extraordinary detail. Whatever you make of their cosmology, these were careful observers of the inner world. Today you borrow their method: attention, turned inward, with care.`,
        task: `With the wheel running, follow the old sequence in miniature: steady posture, slow breath, then attention drawn inward and gathered to a single point. Move through it slowly, as a practised observer would.`,
        practice: `Measure while holding that gathered, inward-drawn attention. Notice what becomes available when you follow an old, careful method instead of just sitting.`,
        reflectionPrompt: `Did following an old, structured method change what you noticed inside?`,
        measureSeconds: 180 },
      { id: 'd3', title: `Inner Heat, Measured`,
        intro: `In 1982, a Harvard researcher published something startling in the journal Nature: Tibetan monks practising a meditation of "inner heat" could raise the temperature of their fingers and toes by several degrees, drying cold wet sheets draped over their shoulders with body warmth alone. An ancient practice, producing an effect you can put a thermometer on. Tradition and science, meeting on the same body. Today you turn toward your own inner warmth.`,
        task: `With the wheel running, sit steady and bring your attention to the centre of your body, imagining a gentle warmth there with each slow breath. Don't strain to heat anything — just attend, softly, to warmth and the breath feeding it.`,
        practice: `Measure while resting attention on a sense of inner warmth. Notice whether focused attention on the body can produce any real, felt change in it.`,
        reflectionPrompt: `Could focused attention on your body produce any real, felt change you could notice?`,
        measureSeconds: 180 },
      { id: 'd4', title: `One Experience, Many Names`,
        intro: `When the psychologist Carl Jung studied kundalini in 1932, he didn't take it as literal serpents and energy — he read it as a vivid map of inner psychological growth. And across the world, cultures that never met described strikingly similar intense inner experiences, each in their own language. The big question of this whole topic sits right here: why do so many traditions report something so alike? Today you hold that question open.`,
        task: `With the wheel running, settle deeply and simply pay open, honest attention to your own inner experience — whatever sensations, states or shifts arise — without naming them with anyone's system. Let it be your own first-hand report.`,
        practice: `Measure while observing your inner experience as directly as you can, free of any tradition's labels. Notice what is genuinely there for you, before any name is put on it.`,
        reflectionPrompt: `Setting aside every tradition's labels, what was genuinely there in your own experience?`,
        measureSeconds: 210 },
      { id: 'd5', title: `Your Own Experience`,
        intro: `Across this whole topic you've turned attention inward, met the sensations behind the word "energy", tuned breath and posture, explored shifting states, and looked at how traditions and science describe intense inner experience. Through all of it the wheel proved nothing — it simply kept you company while you observed yourself. Before you begin, predict: after these weeks, will your inner world feel richer and more familiar than when you started?`,
        task: `With the wheel running, bring everything together: steady posture, slow breath, attention turned fully inward, open and curious. Then explore your inner experience freely, as your own quiet investigator.`,
        practice: `Measure from that full, inward, exploring state. Notice what feels most different now about your inner world — and whether the richest part lives in any tradition, or simply in your own attention — and whether your prediction held.`,
        reflectionPrompt: `After this whole journey inward, what feels most different about your own inner world?`,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  PSI RESEARCH TOPIC
  //  Frame: the most STORYTELLING topic — about people, researchers, labs and
  //  strange experiments, NOT a "paranormal course". Big question: why did
  //  scientists, engineers, military researchers and universities spend decades
  //  studying phenomena most people call impossible? We do NOT prove psi /
  //  telepathy / remote viewing — we look at what was actually researched. The
  //  six earlier roles: Telekinesis = explorer, Meditation = observer, Energy
  //  Healing = connector, Crystal Healing = meaning-seeker, Kundalini = inner
  //  experiencer, Psi Research = THE RESEARCHER. The wheel is almost a lab
  //  instrument; the mood is "today YOU are a researcher", never "today you
  //  develop powers". NO propaganda in either direction — not "look, it works!"
  //  and not "look, it's nonsense!", but "this happened, this is what they
  //  studied, what do you think?". Real names & places encouraged (the topic is
  //  historical): William James, J.B. Rhine, Karl Zener, Robert Jahn, Brenda
  //  Dunne, Russell Targ, Harold Puthoff, Ingo Swann, Joseph McMoneagle.
  //  >=2 real "I can't believe this actually happened" moments per experiment.
  //  Experiment 5 stays OPEN — never a verdict; the story isn't over.
  // ##########################################################################

  // ==========================================================================
  //  1 — The First Researchers  (how curiosity became a science)
  // ==========================================================================
  {
    id: 'the-first-researchers',
    topic: 'psi-research',
    title: `The First Researchers`,
    level: 'Beginner',
    cover: 'assets/experiments/the-first-researchers.jpg',
    order: 1,
    summary: `Four short days at the strange birth of a science — when Victorian scholars, and even Nobel-winning scientists, decided to study the impossible properly. Today you take the researcher's seat.`,
    days: [
      { id: 'd1', title: `Taking the Researcher's Seat`,
        intro: `There are three things you can do with an extraordinary claim: believe it, dismiss it, or investigate it. Most people pick one of the first two; a researcher picks the third. This whole topic invites you into that third stance — curious, careful, and slow to conclude. Today you simply take the researcher's seat at the wheel.`,
        task: `Set up the wheel as if it were an instrument in your own small laboratory. Before you measure, decide one thing to observe carefully today — not to prove, just to watch — and approach it like a scientist taking notes.`,
        practice: `Measure as a neutral observer, gathering impressions without deciding what they mean. Notice how it feels to investigate something rather than to believe or dismiss it.`,
        reflectionPrompt: `How did it feel to investigate, rather than believe or dismiss, what you observed?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Society for Psychical Research`,
        intro: `In 1882, a group of Cambridge scholars did something nobody had quite done before: they founded a society to study reports of the unexplained using the tools of science. The Society for Psychical Research, led by the philosopher Henry Sidgwick, set out to examine such claims without prejudice and in a scientific spirit. Not to believe — to investigate. Today you borrow their motto.`,
        task: `Choose one ordinary thing about your measurement to study without prejudice — your focus, your breathing, the wheel's motion — and observe it as carefully as those first researchers tried to. No conclusions, just careful attention.`,
        practice: `Measure in that scientific spirit, examining one chosen thing closely and honestly. Notice what careful, unbiased observation reveals that ordinary glancing would miss.`,
        reflectionPrompt: `What did careful, unprejudiced observation reveal that you'd normally overlook?`,
        measureSeconds: 120 },
      { id: 'd3', title: `Scientists, Not Just Spiritualists`,
        intro: `It's easy to imagine only the gullible took these questions seriously — but the list of investigators is startling. A Nobel-winning physiologist, Charles Richet; a Nobel-winning physicist, Lord Rayleigh; the chemist William Crookes, who discovered the element thallium — all spent real time on this. Whatever they concluded, the curiosity of such serious minds is itself worth noticing. Today you bring that same rigour.`,
        task: `Approach the wheel the way a working scientist approaches a puzzling result: interested, exacting, unwilling to fool yourself. Set one careful question and observe toward it.`,
        practice: `Measure with a scientist's mix of open curiosity and hard honesty. Notice whether holding both at once — open yet rigorous — changes how you observe.`,
        reflectionPrompt: `Could you hold open curiosity and strict honesty at the same time — and what did that feel like?`,
        measureSeconds: 150 },
      { id: 'd4', title: `The White Crow`,
        intro: `The great psychologist William James, who investigated these matters for years, put it memorably: to disprove the rule that all crows are black, you don't need to check every crow — one white crow is enough. He thought a single well-documented exception deserved real study, not dismissal. That open, evidence-first mind is the researcher's gift. Before you start, predict: will observing like a scientist feel different from how you began on Day 1?`,
        task: `Take everything from these four days — the neutral seat, the careful eye, the rigorous curiosity — and run one clean observation at the wheel, hunting honestly for anything worth a second look. Make your prediction first, then measure.`,
        practice: `Measure as a true investigator, neither hoping nor doubting, just watching for your white crow. Notice how the researcher's stance compares with how you observed on Day 1 — and whether your prediction held.`,
        reflectionPrompt: `How did observing like a researcher compare with Day 1 — and was your prediction right?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Testing the Impossible  (turning anecdote into a countable experiment)
  // ==========================================================================
  {
    id: 'testing-the-impossible',
    topic: 'psi-research',
    title: `Testing the Impossible`,
    level: 'Beginner',
    cover: 'assets/experiments/testing-the-impossible.jpg',
    order: 2,
    summary: `Five days on a quiet revolution: how researchers turned vague claims into something you could actually test, count and argue about — with cards, statistics, and a great many trials.`,
    days: [
      { id: 'd1', title: `From Story to Experiment`,
        intro: `"My grandmother knew the phone would ring." It's a good story — but a story isn't evidence. The leap that built a science was turning such anecdotes into something testable: a setup with clear rules, a known chance of guessing right, and a way to count the results. Today you make that leap with the wheel.`,
        task: `Turn your session into a tiny experiment: before you begin, decide exactly what you'll observe and what you'd expect by pure chance. Then measure, keeping honest notes as you go.`,
        practice: `Measure as a controlled little test rather than a free experience, tracking what actually happens against what you expected. Notice the difference between having a story and having a result.`,
        reflectionPrompt: `What changed when you treated your session as a test with clear rules, not just an experience?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Cards That Made a Science`,
        intro: `In the 1930s a Duke University psychologist named Karl Zener designed a simple deck for testing hunches: five symbols — circle, square, cross, wavy lines, and a star — twenty-five cards in all. With five choices, pure guessing should hit one in five. That clean, countable baseline is what let researchers ask: does anyone beat chance? Today you set your own clear baseline.`,
        task: `Before measuring, define your "chance" line as plainly as the Zener deck did — what would an ordinary, unremarkable session look like? Then measure, watching for anything that clearly departs from that baseline.`,
        practice: `Measure against your clear baseline, noting whether anything stands out from the ordinary. Notice how having a known chance level sharpens what counts as surprising.`,
        reflectionPrompt: `Did having a clear baseline make it easier to spot what was genuinely surprising?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Counting Past Luck`,
        intro: `Joseph Banks Rhine ran the numbers obsessively: in 1931 alone, at his Duke laboratory, he and his students completed ten thousand card-guessing trials. Why so many? Because anyone can be lucky a few times — only large numbers can reveal whether a real pattern hides under the noise. Statistics, not single hits, was his true instrument. Today you respect the numbers.`,
        task: `Measure with the patience of someone gathering data, not chasing a dramatic moment. Treat this as one data point among many you might collect over days, worth recording honestly whatever it shows.`,
        practice: `Measure calmly, valuing an honest record over an exciting result. Notice how it feels to care about the long pattern rather than this single session.`,
        reflectionPrompt: `Did caring about the long-run pattern, not one session, change how you measured?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Why One Hit Means Nothing`,
        intro: `Here's the trap every researcher learns to dodge: a single striking coincidence feels like proof, but it isn't. Flip enough coins and someone gets ten heads in a row by pure chance. The honest question is never "did something amazing happen once?" but "does it keep happening, more than luck allows?". Today you practise that discipline.`,
        task: `If something surprising shows up in your measurement, notice your urge to make it mean something — then gently set that urge aside. Record it as one event, no more, and keep observing.`,
        practice: `Measure while resisting the pull to over-read any single moment. Notice how strong the temptation is to turn one coincidence into a conclusion.`,
        reflectionPrompt: `How strong was the urge to turn a single surprising moment into proof?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Be the Experimenter`,
        intro: `You've turned a story into a test, set a baseline, valued the numbers, and resisted reading too much into one hit. That is, in miniature, how an entire field tried to study the impossible. Before you begin, predict: after a week of thinking like an experimenter, will you observe more carefully than on Day 1?`,
        task: `Run one last clean experiment: a clear prediction, a fair baseline, honest notes, and no leaping to conclusions. Be your own careful experimenter from start to finish.`,
        practice: `Measure as the disciplined experimenter you've become this week. Notice how this compares with the looser way you observed on Day 1 — and whether your prediction held.`,
        reflectionPrompt: `How did measuring as a disciplined experimenter compare with Day 1 — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Remote Viewing  (the real, decades-long secret government program)
  // ==========================================================================
  {
    id: 'remote-viewing',
    topic: 'psi-research',
    title: `Remote Viewing`,
    level: 'Intermediate',
    cover: 'assets/experiments/remote-viewing.jpg',
    order: 3,
    summary: `Five days inside one of the strangest true stories in modern science: a secret, decades-long government program that paid people to describe places they'd never seen. You can't spy — but you can think like its researchers.`,
    days: [
      { id: 'd1', title: `A Secret the Government Kept`,
        intro: `This part sounds invented, but it's documented: for more than twenty years, the U.S. government quietly funded research into whether people could describe distant, hidden places using the mind alone. The program — eventually code-named Star Gate — cost around twenty million dollars and was only made public in 1995. Whatever you make of it, it really happened. Today you step into the researchers' shoes.`,
        task: `Set up the wheel as your instrument and adopt the calm, classified-lab mindset: serious, methodical, quietly astonished to be here at all. Before measuring, note one thing you intend to observe.`,
        practice: `Measure with that careful, almost official seriousness, as if keeping a research log. Notice how treating the session as real research changes your attention.`,
        reflectionPrompt: `Did approaching the session as genuine research change how you paid attention?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Physicists at SRI`,
        intro: `The work was led not by mystics but by two laser physicists, Russell Targ and Harold Puthoff, at the Stanford Research Institute, starting in 1972. They built careful protocols: a viewer would try to describe a location while a researcher, far away, was actually there. Real scientists, real controls, a genuinely odd question. Today you borrow their care.`,
        task: `Before you begin, make one specific prediction about your session — a number, a feeling, how steady you'll be — and write it down, the way a viewer recorded impressions before the target was revealed.`,
        practice: `Measure, then compare what happened against your written prediction. Notice how it feels to commit to a guess in advance and check it honestly afterward.`,
        reflectionPrompt: `How close was your written prediction to what actually happened?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Describing the Unseen`,
        intro: `A New York artist named Ingo Swann helped shape the method: rather than naming a target outright, viewers sketched and described raw impressions — shapes, textures, feelings — which were only later checked against the real place. The discipline was to report what you sensed without guessing what it should be. Today you practise that pure, unfiltered noticing.`,
        task: `As you measure, gather raw impressions — sensations, images, hunches — without rushing to interpret or name them. Jot them down plainly, like a viewer's notes, before judging any of it.`,
        practice: `Measure while collecting unfiltered impressions and resisting interpretation. Notice how hard it is to simply report what you sense without your mind tidying it into a story.`,
        reflectionPrompt: `Was it hard to report raw impressions without your mind turning them into a story?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Remote Viewer 001`,
        intro: `The Army's first official remote viewer, known simply as Remote Viewer 001, was a soldier named Joseph McMoneagle, working out of Fort Meade from 1978. His results were genuinely mixed — sometimes uncanny, often vague — and he said so himself. That honesty about hits and misses is exactly what separates a researcher from a believer. Before you start, predict how your session will go.`,
        task: `Make a clear prediction, measure, then judge the outcome with total honesty — counting the misses as carefully as the hits, the way a good researcher logs everything.`,
        practice: `Measure and then assess yourself with unsparing fairness, hits and misses alike. Notice whether you're tempted to remember the hits and quietly forget the misses.`,
        reflectionPrompt: `Were you tempted to remember your hits and forget your misses — and did you resist?`,
        measureSeconds: 150 },
      { id: 'd5', title: `The Researcher's Verdict`,
        intro: `For two decades, careful people gathered this strange data — and still reached no agreement. When the program closed in 1995, one reviewer saw a real effect in the numbers; another said it was far too soon to claim anything. Two honest experts, the same data, different verdicts. Before you begin, predict your result, then weigh it as neutrally as they tried to.`,
        task: `Run one final, careful session: a clear prediction, honest observation, and a fair-minded verdict at the end that you'd be willing to defend to a skeptic and a believer alike.`,
        practice: `Measure, then sit with your own honest, undecided assessment of what you saw. Notice how it feels to reach a careful "I'm not sure" instead of a tidy conclusion.`,
        reflectionPrompt: `How did it feel to land on an honest "I'm not sure" rather than a tidy conclusion?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — The PEAR Laboratory  (engineers at Princeton, ~30 years, the RNG)
  // ==========================================================================
  {
    id: 'the-pear-laboratory',
    topic: 'psi-research',
    title: `The PEAR Laboratory`,
    level: 'Intermediate',
    cover: 'assets/experiments/the-pear-laboratory.jpg',
    order: 4,
    summary: `Five days with the most unlikely lab of all — an engineering department at Princeton that spent nearly thirty years asking whether the mind can nudge a machine. Here the wheel feels most like a real instrument.`,
    days: [
      { id: 'd1', title: `An Engineer's Curiosity`,
        intro: `In 1979, the Dean of Engineering at Princeton University, Robert Jahn, did something that raised eyebrows across science: he opened a laboratory to test whether human intention could affect machines. Not a mystic — a respected aerospace engineer, asking an honest question with proper equipment. The Princeton Engineering Anomalies Research lab would run for almost thirty years. Today you open your own small version.`,
        task: `Treat the wheel as Jahn treated his machines: a precise instrument, observed by a careful mind. Before measuring, frame one clear, testable question and approach it like an engineer, not a believer.`,
        practice: `Measure with an engineer's precision and neutrality, gathering clean observations. Notice whether an exacting, technical mindset changes how you sit with the wheel.`,
        reflectionPrompt: `Did approaching the wheel as a precise instrument change how you observed it?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Random Machine`,
        intro: `The lab's signature device was a random event generator — a machine producing an unpredictable stream of outputs, like an electronic coin-flipper. Volunteers simply sat with it and intended it to drift one way or the other, while the machine logged everything. It's a striking parallel to sitting with a wheel and quietly observing. Today you run that experiment yourself.`,
        task: `Before measuring, pick one gentle intention for your session — steadier, higher, calmer — and hold it lightly while the wheel runs, exactly as PEAR's volunteers did with their machine. Don't force; just hold and observe.`,
        practice: `Measure while holding your light intention, logging what actually happens without forcing anything. Notice the difference between gently intending and straining for a result.`,
        reflectionPrompt: `Could you hold a light intention toward the wheel without straining for an outcome?`,
        measureSeconds: 150 },
      { id: 'd3', title: `A Tiny, Stubborn Effect`,
        intro: `Here's what makes PEAR so debated: across millions of trials over the years, the team reported an effect — but a minuscule one, a deviation of about a tenth of one percent from chance. Far too small to see in any single session, yet, they argued, stubbornly there in the totals. Today you meet the humbling scale of such research.`,
        task: `Measure knowing that whatever you observe today, no single session could ever settle anything — real effects at this scale only show up across thousands of trials. Hold that humility as you watch.`,
        practice: `Measure with full attention but zero expectation of a dramatic result, valuing the honest data point. Notice how it feels to take part in something whose answer no single try can reveal.`,
        reflectionPrompt: `How did it feel to contribute one honest data point to a question no single session can answer?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Signal or Noise?`,
        intro: `This is the question that keeps everyone up at night: when a tiny pattern persists, is it a faint real signal — or just noise that hasn't averaged out yet? Brilliant people have looked at the very same PEAR numbers and reached opposite, sincere conclusions. Learning to sit inside that uncertainty is a genuine skill. Today you practise it.`,
        task: `As you measure, watch for any pattern that seems to emerge — and then ask yourself, honestly, whether it could simply be chance dressed up as meaning. Hold the question open.`,
        practice: `Measure while weighing every apparent pattern against the possibility of pure noise. Notice how genuinely hard it is to tell a faint signal from random chance.`,
        reflectionPrompt: `How hard was it to tell a possible signal from simple noise?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Your Own Anomalies Lab`,
        intro: `You've opened an engineer's lab, run the machine, met the tiny effect, and wrestled with signal versus noise. For nearly thirty years, real scientists did exactly this, and left the question open when they closed the doors in 2007. Before you begin, predict your session, then judge it with an engineer's cool honesty.`,
        task: `Run your final session as a complete little anomalies experiment: precise setup, a light intention, a clear prediction, and a neutral verdict — your own PEAR lab, for one day.`,
        practice: `Measure as the careful researcher you've become, then weigh the result without bias. Notice how this disciplined neutrality compares with how you first approached the wheel — and whether your prediction held.`,
        reflectionPrompt: `How did your cool, neutral verdict compare with how you first judged the wheel — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — The Open Question  (why there is still no agreement — stays OPEN)
  // ==========================================================================
  {
    id: 'the-open-question',
    topic: 'psi-research',
    title: `The Open Question`,
    level: 'Advanced',
    cover: 'assets/experiments/the-open-question.jpg',
    order: 5,
    summary: `Five days on the most honest part of the whole story: why, after more than a century of research, there is still no agreement — and why that unfinished question might be the most interesting thing of all.`,
    days: [
      { id: 'd1', title: `The Hardest Test in Science`,
        intro: `Science trusts a result only when others can reproduce it — do the same thing, get the same answer. That single demand is where psi research has always struggled: effects that appear in one lab often shrink or vanish in the next. Reproducibility is the real battleground, and it matters far beyond this topic. Today you feel that demand yourself.`,
        task: `Try to reproduce a result from earlier in your journey: repeat, as exactly as you can, a session that once felt notable, and see whether it comes out the same. Predict first whether it will.`,
        practice: `Measure while attempting an honest repeat of a past session. Notice whether you can reproduce your own earlier experience — or whether it slips away when you try.`,
        reflectionPrompt: `Could you reproduce your own earlier result — or did it change when you repeated it?`,
        measureSeconds: 150 },
      { id: 'd2', title: `The Ganzfeld Debate`,
        intro: `In the 1980s, the telepathy experiment called the ganzfeld became a battleground between two honest opponents: researcher Charles Honorton, who found hit rates around 38% where chance was 25%, and skeptic Ray Hyman, who hunted for flaws. Remarkably, they co-wrote a joint statement agreeing on stricter rules for future tests. Disagreement done well — that is science working. Today you hold both views at once.`,
        task: `As you measure, deliberately run two minds in parallel: the believer who notices anything promising, and the skeptic who looks for the ordinary explanation. Let them both watch the same session.`,
        practice: `Measure while giving fair hearing to both the hopeful and the doubting voice. Notice which one you naturally lean toward, and whether you can hold them in balance.`,
        reflectionPrompt: `Did you lean more toward the hopeful or the skeptical voice — and could you balance them?`,
        measureSeconds: 180 },
      { id: 'd3', title: `The Experiment That Shook Psychology`,
        intro: `In 2011, a respected psychologist, Daryl Bem, published nine experiments in a top journal appearing to show people could feel the future. The shock wasn't only the claim — it was that his methods were the standard ones everyone used. When others couldn't replicate it, psychology was forced to overhaul how it does research altogether. Psi research, oddly, helped clean up all of science. Today you honour rigour.`,
        task: `Hold your session to an unusually high standard: a clear prediction made in advance, no shifting the goalposts afterward, and an honest record whatever it shows. Be stricter with yourself than you need to be.`,
        practice: `Measure under your own strict rules, refusing to bend them after the fact. Notice whether tighter standards change what you let yourself conclude.`,
        reflectionPrompt: `Did holding yourself to stricter standards change what you allowed yourself to conclude?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Two Honest Conclusions`,
        intro: `When the government's remote-viewing program was reviewed in 1995, two experts examined the same evidence. The statistician Jessica Utts concluded the effect was real and statistically established; the psychologist Ray Hyman concluded it was premature to say any such thing. Both were careful, honest, and reasonable — and they disagreed. Today you sit with that genuine uncertainty.`,
        task: `Measure, then form two honest verdicts about what you observed: the strongest fair case that something happened, and the strongest fair case that it was ordinary. Argue both sincerely.`,
        practice: `Measure while preparing to make both cases as fairly as you can. Notice how it feels to hold two reasonable, opposite conclusions without forcing a winner.`,
        reflectionPrompt: `Could you hold two opposite but reasonable conclusions at once, without forcing one to win?`,
        measureSeconds: 210 },
      { id: 'd5', title: `What Do You Think?`,
        intro: `Across this whole topic you've met the first societies, the card decks, the secret programs, the engineers' lab, and the long, unresolved debate. Notice what we never did: tell you the answer. After more than a century, careful people still disagree — and that open question is now yours to carry, as a researcher, not a believer or a skeptic. Before you begin, predict, and then simply observe.`,
        task: `Run one last, complete session as the researcher you've become: a prediction, careful observation, honest notes — and then let the verdict stay open, exactly as the real story does.`,
        practice: `Measure, and rather than reaching for an answer, rest in the honest, unfinished question. Notice what it's like to end not with a conclusion, but with genuine, curious uncertainty.`,
        reflectionPrompt: `After all this, what do you actually think — and can you hold the question open, the way the science still does?`,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  INTUITION TOPIC
  //  Frame: the most PERSONAL topic — SELF-KNOWLEDGE. Not "is intuition
  //  supernatural" but "how do we sense and use our hunches?". Big question:
  //  where does the feeling of "I just know this" come from — what happens when
  //  we know something before we can explain it? Roles so far: Telekinesis =
  //  focus, Meditation = awareness, Energy Healing = connection, Crystal Healing
  //  = meaning, Kundalini = inner experience, Psi Research = the researcher,
  //  Intuition = SELF-KNOWLEDGE. The reader should keep recognising themselves
  //  ("oh, that's how I work too"), never feel lectured. NOT paranormal — no
  //  psychic powers, prophecy or future prediction; "prediction" here always
  //  means a hunch about the session, to test. The wheel's predict->observe
  //  mechanic fits perfectly: most days start "make a prediction", then
  //  "observe what actually happens". Real research, lightly worn: thin-slicing
  //  (Ambady/Gladwell), somatic markers & the Iowa Gambling Task (Damasio), the
  //  gut "second brain", recognition-primed decision (Gary Klein), Gigerenzer's
  //  gut feelings, Kahneman's System 1/2 & availability heuristic, the
  //  Kahneman-Klein conditions for intuitive expertise. ~2 "wow" sources per
  //  experiment; closing feeling: "I understand my own mind better."
  // ##########################################################################

  // ==========================================================================
  //  1 — First Impressions  (how much do we decide in the first seconds?)
  // ==========================================================================
  {
    id: 'first-impressions',
    topic: 'intuition',
    title: `First Impressions`,
    level: 'Beginner',
    cover: 'assets/experiments/first-impressions.jpg',
    order: 1,
    summary: `Four short days on the snap judgments you make before you can think — how much your mind decides in the first couple of seconds, and how often it is onto something.`,
    days: [
      { id: 'd1', title: `The First Two Seconds`,
        intro: `Walk into a room, meet a stranger, hear a new song — and within a second or two, you've already formed an opinion. You didn't reason your way there; it simply arrived. We make a surprising number of judgments this fast, long before we could explain them. Today you catch your own snap judgments in the act, with the wheel.`,
        task: `Before you switch on the wheel, make a quick gut prediction about the session — will it feel steady or restless, better or worse than usual? Don't deliberate; take the first answer that pops up. Then begin.`,
        practice: `Measure while holding the snap prediction you made, and simply observe what actually happens. Notice how your instant first impression compares with how the session truly unfolds.`,
        reflectionPrompt: `How close was your instant first impression to how the session actually went?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Thin Slices`,
        intro: `In one striking study, people watched just two seconds of a teacher on silent video — no sound, no context — and their snap ratings closely matched what students thought after a whole semester. Two seconds held almost as much as four months. Malcolm Gladwell called this "thin-slicing": the mind reads a tiny sample and quietly catches the pattern. Today you trust a thin slice of your own.`,
        task: `Glance at the wheel for just a moment as it starts, and let an immediate impression form — without studying it. Make that snap read your prediction for the session, then settle in.`,
        practice: `Measure while observing whether your two-second impression held up over the full session. Notice how much information your mind seemed to pull from almost nothing.`,
        reflectionPrompt: `Did a two-second impression turn out to carry more than you'd expect?`,
        measureSeconds: 120 },
      { id: 'd3', title: `Faster Than Thought`,
        intro: `Here's the strange order of things: the judgment usually comes first, and the reasons arrive afterward. We feel sure, then our mind politely supplies an explanation that sounds logical — as if we'd reasoned our way there all along. Noticing this gap is oddly freeing. Today you watch the feeling beat the reasoning.`,
        task: `As the wheel runs, catch your very first reaction to how it's going — then notice the explanation your mind rushes in to justify it. Watch which one actually came first.`,
        practice: `Measure while separating the instant feeling from the after-the-fact reasoning. Notice whether your gut reaction tends to arrive before any logical explanation for it.`,
        reflectionPrompt: `Did your gut reaction arrive before the reasons your mind gave for it?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Your First Read`,
        intro: `Over three days you've met your snap judgments, trusted a thin slice, and watched feeling outrun reason. None of this is mystical — it's just your brain doing what it does best, reading patterns at speed. Before you start, make your boldest quick prediction yet about this session, and see how good your first read really is.`,
        task: `Take one fast, confident gut prediction about the whole session — set it before you think twice. Then measure, treating it as a small experiment in trusting your first read.`,
        practice: `Measure while comparing your confident first read against what actually happens. Notice how reliable your instant impressions have been across these four days.`,
        reflectionPrompt: `Across these four days, how reliable did your instant first impressions turn out to be?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Gut Feelings  (why does a decision feel right or wrong in the body?)
  // ==========================================================================
  {
    id: 'gut-feelings',
    topic: 'intuition',
    title: `Gut Feelings`,
    level: 'Beginner',
    cover: 'assets/experiments/gut-feelings.jpg',
    order: 2,
    summary: `Five days on the oldest advisor you have — the body — and the real reasons a decision can feel right or wrong in your chest or stomach before you can say why.`,
    days: [
      { id: 'd1', title: `A Feeling in the Body`,
        intro: `Notice the language we use: a "gut" feeling, a decision that sits heavy on the chest, a choice that makes us uneasy. These aren't only metaphors — we genuinely feel our hunches somewhere in the body. Each of us has a private map of where yes and no live. Today you start drawing yours.`,
        task: `Before measuring, bring a small real decision to mind — anything — and notice where in your body the leaning shows up: chest, stomach, shoulders, throat. Then carry that body-awareness to the wheel.`,
        practice: `Measure while staying tuned to bodily signals — tension, ease, a flutter, a settling. Notice where in your body your sense of "this is going well" or "not" actually shows up.`,
        reflectionPrompt: `Where in your body did your sense of how it was going actually appear?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Body Decides First`,
        intro: `In a famous card-game experiment, people's hands began to sweat as they reached toward a risky deck — and the sweating started before they consciously knew which decks were bad. Their bodies had worked out the danger and were sounding a quiet alarm ahead of the mind. The neuroscientist Antonio Damasio called these bodily warnings "somatic markers". Today you listen for yours.`,
        task: `Before you start, make a prediction about the session, then notice any faint bodily signal that comes with it — a tightening, a lift, a hesitation. Allow that the body may be reading something first.`,
        practice: `Measure while watching for the body's early signals, the ones that arrive before any clear thought. Notice whether your body seemed to know how things were going before your mind did.`,
        reflectionPrompt: `Did your body seem to sense how things were going before your mind put it into words?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Second Brain`,
        intro: `It turns out "gut feeling" is almost literal: your digestive tract is lined with around five hundred million neurons — a network so rich that scientists call it the "second brain". It's in constant conversation with your head through a thick nerve highway. No wonder big decisions are felt in the belly. Today you check in with that second brain.`,
        task: `With the wheel running, rest your attention gently on your stomach and gut, the way you'd listen for a faint sound. Make a soft prediction about the session and notice whether your gut seems to agree or disagree.`,
        practice: `Measure while keeping a light awareness on the gut, that second brain. Notice whether it offers any quiet signal of its own as the session unfolds.`,
        reflectionPrompt: `Did your gut offer any quiet signal of its own during the session?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Listening Below Words`,
        intro: `The hard part of a gut feeling is that it speaks before language — a lean, a pull, a quiet no, with no sentence attached. We often talk right over it, because words are louder than sensations. Learning to listen below the words is a real skill. Today you practise it.`,
        task: `Before measuring, ask yourself a simple yes-or-no question about the session and wait for the body's answer before any words form. Take the first wordless lean as your prediction, then begin.`,
        practice: `Measure while trusting that wordless lean, noticing it without rushing to explain it. Notice how it feels to follow a signal that has no sentence attached to it.`,
        reflectionPrompt: `What was it like to follow a wordless signal, before any explanation arrived?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Your Gut, Read Honestly`,
        intro: `You've mapped where feelings live, met the body's early-warning system, listened to the second brain, and heard the signal below words. None of it is magic — it's your body processing more than your conscious mind can keep up with. Before you start, make a clear gut prediction, and read your body as honestly as you can.`,
        task: `Set one honest gut prediction about the session, noting exactly how it feels in the body. Then measure, and afterward check the body's read against what actually happened.`,
        practice: `Measure while tracking your body's signals from start to finish. Notice how trustworthy your gut feelings turned out to be over these five days — honestly, hits and misses both.`,
        reflectionPrompt: `Honestly, how trustworthy did your gut feelings turn out to be this week?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Pattern Recognition  (what the brain notices before it reaches you)
  // ==========================================================================
  {
    id: 'pattern-recognition',
    topic: 'intuition',
    title: `Pattern Recognition`,
    level: 'Intermediate',
    cover: 'assets/experiments/pattern-recognition.jpg',
    order: 3,
    summary: `Five days on the engine under intuition: a brain that has quietly memorised thousands of patterns, and recognises them long before you can say what it saw.`,
    days: [
      { id: 'd1', title: `Knowing Without Knowing How`,
        intro: `A nurse senses a patient is about to crash before the monitors agree. A parent knows their child's cry means trouble. A mechanic hears the engine and just knows. None of them can fully explain it — yet they're often right. This is intuition as recognition, built quietly from experience. Today you look for your own version.`,
        task: `Before measuring, think of one area where you just know things — your work, driving, cooking, people. Bring that same recognising mind to the wheel, and make a prediction from it.`,
        practice: `Measure while trusting your experienced eye, the part of you that recognises without explaining. Notice whether a practised, recognising attention reads the session differently.`,
        reflectionPrompt: `Where in your life do you "just know" things — and could you bring that same sense here?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Firefighter's Sixth Sense`,
        intro: `A fire commander once ordered his team out of a burning building moments before the floor collapsed — he called it a sixth sense. The researcher Gary Klein studied hundreds of such cases and found something less spooky but more amazing: the commander's trained mind had read subtle wrong-feeling cues — too quiet, too hot — and raised the alarm before he could explain it. Expertise, not magic. Today you trust your trained cues.`,
        task: `As the wheel runs, watch for the faint "something's off" or "this is right" signals that experience sends up. Don't analyse them — just note them, the way the commander noticed without yet knowing why.`,
        practice: `Measure while staying alert to those quiet expert cues. Notice whether your mind flags anything as off or right before you can explain the reason.`,
        reflectionPrompt: `Did your mind flag anything as "off" or "right" before you could explain why?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Built From Experience`,
        intro: `Here's the reassuring truth about intuition: it isn't a gift some people are born with — it's compressed experience. Every situation you've lived through is quietly filed away, and intuition is your brain matching now against all of it, instantly. Which means your hunches are most trustworthy exactly where you have the most experience. Today you lean on your own.`,
        task: `Before you measure, recall how the wheel has felt across your past sessions, then let that accumulated experience shape a prediction for today. Trust the pattern you've built.`,
        practice: `Measure while drawing on everything you've learned about the wheel so far. Notice whether your growing experience makes your predictions sharper than at the very start.`,
        reflectionPrompt: `Did your accumulated experience make today's prediction sharper than your early ones?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Less Can Be More`,
        intro: `The psychologist Gerd Gigerenzer found something counter-intuitive: simple gut rules often beat complicated analysis. Ask someone who knows little about sport which team will win, and "pick the one you've heard of" is right surprisingly often. Sometimes knowing less, and trusting recognition, decides better than drowning in detail. Today you let simple recognition lead.`,
        task: `Before measuring, make a fast prediction using only your gut sense of recognition — no weighing of pros and cons, just the simple first answer. Then begin.`,
        practice: `Measure while trusting that lean, simple recognition rather than over-thinking. Notice whether a quick, uncluttered hunch reads the session as well as careful analysis would.`,
        reflectionPrompt: `Did a quick, simple hunch read the session as well as careful analysis might have?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Your Trained Eye`,
        intro: `You've found where you just know, met the firefighter's trained alarm, seen that intuition is stored experience, and let simple recognition lead. Together they reveal intuition as a skill you've been building your whole life. Before you start, make a prediction straight from your trained eye, and see how good it has become.`,
        task: `Make one confident prediction drawn purely from your built-up sense of the wheel, then measure. Treat it as a test of the trained eye you've been sharpening all week.`,
        practice: `Measure while comparing your experienced prediction against the outcome. Notice how much your pattern-reading has sharpened since the start of this topic.`,
        reflectionPrompt: `How much sharper has your pattern-reading become since this topic began?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Signals & Noise  (when to trust the gut, and when not to)
  // ==========================================================================
  {
    id: 'signals-and-noise',
    topic: 'intuition',
    title: `Signals & Noise`,
    level: 'Intermediate',
    cover: 'assets/experiments/signals-and-noise.jpg',
    order: 4,
    summary: `Five days on the most useful intuition skill of all: telling a true quiet signal apart from the loud static of fear, habit and bias — knowing when to trust the gut and when not to.`,
    days: [
      { id: 'd1', title: `Two Speeds of Mind`,
        intro: `Daniel Kahneman described the mind as two systems. One is fast, automatic and intuitive — it reads faces, senses danger, jumps to conclusions. The other is slow, effortful and logical — it checks, calculates and doubts. Intuition is the fast one talking; wisdom is knowing when to let the slow one answer. Today you meet both.`,
        task: `Before measuring, make a fast intuitive prediction — then pause and ask your slower, deliberate mind whether it agrees. Notice the two voices, then begin.`,
        practice: `Measure while listening for both minds: the quick hunch and the slow second-guess. Notice which one you tend to trust, and whether they agreed today.`,
        reflectionPrompt: `Which mind did you trust more today — the fast hunch or the slow check?`,
        measureSeconds: 120 },
      { id: 'd2', title: `When the Gut Misleads`,
        intro: `Intuition isn't always wise. Ask people what's more dangerous, a shark or a vending machine, and most say shark — though vending machines harm far more people. Vivid, scary, recent images come to mind easily, so we mistake "easy to imagine" for "likely to happen". Kahneman called this the availability trap, and it's fear wearing intuition's clothes. Today you spot the difference.`,
        task: `Before measuring, notice any prediction driven by worry or a vivid recent memory rather than calm sensing — that's likely noise, not signal. Set it aside, and make a quieter prediction instead.`,
        practice: `Measure while watching for fear dressed up as a hunch. Notice the difference between a calm intuition and an anxious one demanding to be heard.`,
        reflectionPrompt: `Could you tell a calm intuition apart from an anxious, fearful one?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Fear or Intuition?`,
        intro: `Real intuition and plain fear can feel maddeningly similar — both arrive as a bodily no. But they tend to have different textures: intuition is often quiet, steady, almost neutral, while fear is loud, urgent and full of vivid stories. Learning their different voices is one of the most useful things you can do. Today you compare them.`,
        task: `Before you start, summon a genuine quiet hunch and, separately, a worried fearful thought, and feel how each sits in the body. Then make your prediction from the quiet one, not the loud one.`,
        practice: `Measure while keeping the quiet signal and the loud fear distinct. Notice how a true hunch feels different in the body from anxiety.`,
        reflectionPrompt: `How did a quiet hunch feel different in your body from loud anxiety?`,
        measureSeconds: 150 },
      { id: 'd4', title: `The First-Instinct Trap`,
        intro: `"Always trust your first instinct" is popular advice — and often wrong. When researchers studied students changing exam answers, switches went from wrong to right about twice as often as the reverse; second thoughts usually helped. We just remember the painful times we changed a right answer and felt burned. The honest lesson: the gut is a brilliant first draft, not the final word. Today you let yours be revised.`,
        task: `Before measuring, make your gut prediction — then deliberately give your slower mind a chance to revise it, and notice whether it wants to. Go with whichever feels genuinely truer.`,
        practice: `Measure while staying open to revising your first instinct rather than clinging to it. Notice whether your second thought improved on your first, or not.`,
        reflectionPrompt: `Did your second thought improve on your first instinct — or was the gut right after all?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Sorting Signal From Noise`,
        intro: `You've met the two minds, caught fear dressed as a hunch, learned the quiet texture of true intuition, and seen that first instincts can be wrong. Together they make a single skill: separating the real signal from the noise around it. Before you start, make a prediction — but this time, sort it: is this a calm signal, or just noise?`,
        task: `Make a prediction, then judge it honestly: does it feel like a clean, quiet signal, or like fear, habit or wishful thinking? Commit to the version you trust, then measure.`,
        practice: `Measure while holding your sorted prediction, signal kept and noise discarded. Notice whether filtering out the noise made your intuition more accurate.`,
        reflectionPrompt: `Did filtering out the noise make your intuition more accurate this time?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Trusting Yourself  (when, and how much, to rely on your own hunches)
  //  The culmination — closing feeling: "I understand my own mind better."
  // ==========================================================================
  {
    id: 'trusting-yourself',
    topic: 'intuition',
    title: `Trusting Yourself`,
    level: 'Advanced',
    cover: 'assets/experiments/trusting-yourself.jpg',
    order: 5,
    summary: `Five days bringing it together — learning the honest conditions under which your own hunches are worth trusting, and how to grow an inner compass you can actually rely on.`,
    days: [
      { id: 'd1', title: `When Intuition Is Trustworthy`,
        intro: `Two researchers who usually disagreed — Daniel Kahneman, the great skeptic of intuition, and Gary Klein, its great champion — sat down together and, remarkably, agreed on a rule. Intuition can be trusted when two things are true: the situation is regular enough to hold real patterns, and you've had enough practice with honest feedback to learn them. Outside those conditions, a hunch is just a guess. Today you ask where you meet that bar.`,
        task: `Before measuring, consider: with the wheel, have you had enough honest practice for real intuition to form? Make a prediction, holding that question lightly, then begin.`,
        practice: `Measure while noticing whether your hunches about the wheel rest on real, repeated experience — or on too little to go on. Notice how that changes your confidence.`,
        reflectionPrompt: `Do your hunches about the wheel rest on real experience yet — or still too little to trust?`,
        measureSeconds: 150 },
      { id: 'd2', title: `Confidence Isn't Accuracy`,
        intro: `Here's the humbling catch the same researchers found: how confident a hunch feels tells you almost nothing about whether it's right. A strong gut feeling can be dead wrong, and a faint one spot on. Certainty is an emotion, not evidence. The honest intuitive learns to hold even strong hunches lightly. Today you separate confidence from accuracy.`,
        task: `Before measuring, make a prediction and rate how confident you feel about it. Then measure, and afterward compare your confidence with how accurate you actually were.`,
        practice: `Measure while paying attention to your level of certainty. Notice whether your most confident predictions were really your most accurate ones — or not.`,
        reflectionPrompt: `Were your most confident predictions actually your most accurate ones?`,
        measureSeconds: 180 },
      { id: 'd3', title: `Calibrating the Inner Compass`,
        intro: `Intuition gets better the same way any skill does: predict, check the result, and let the gap teach you. Every honest comparison of what you felt against what happened quietly tunes the instrument. This is exactly why you've been predicting before measuring all along. Today you calibrate on purpose.`,
        task: `Make a clear prediction, measure, and then study the gap between them as useful information, not as a score to feel good or bad about. Let the feedback adjust your inner compass.`,
        practice: `Measure while treating the difference between hunch and outcome as a lesson. Notice whether deliberately checking your predictions sharpens the next one.`,
        reflectionPrompt: `Did honestly checking your prediction against reality sharpen your next hunch?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Your Own Track Record`,
        intro: `You don't have to trust your intuition in general — you can trust it where it has earned trust. Most of us have areas where the gut is reliably right, and others where it leads us astray, and the wisdom is knowing which is which. Honest self-knowledge beats blanket confidence or blanket doubt. Today you take stock.`,
        task: `Before measuring, recall where your wheel predictions have tended to land — close, or wide? Let your real track record, not hope, shape today's prediction. Then measure.`,
        practice: `Measure while grounding your confidence in your actual history of hits and misses. Notice how it feels to trust your intuition exactly as much as it has earned — no more, no less.`,
        reflectionPrompt: `Could you trust your intuition exactly as much as your track record has earned?`,
        measureSeconds: 210 },
      { id: 'd5', title: `Knowing Your Own Mind`,
        intro: `Across this whole topic you've watched your snap judgments, listened to your body, recognised your trained patterns, sorted signal from noise, and learned when your gut is worth trusting. Notice what you did not learn: a mystical power. What you gained is quieter and better — a clearer sense of how your own mind actually works. Before you start, make one last prediction, as the more self-aware person you've become.`,
        task: `Make a final, honest prediction — informed by everything you now know about your own intuition — then measure as your own calm, well-calibrated investigator.`,
        practice: `Measure while bringing all of it together: the fast read, the body, the trained eye, the honest filter. Notice what feels most different now about how you understand your own mind.`,
        reflectionPrompt: `After this whole journey, what do you understand about your own mind that you didn't before?`,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  RITUALS & HUMAN TRADITION TOPIC
  //  Frame: the most ANTHROPOLOGICAL topic — about humanity, not the individual.
  //  Big question: why do rituals appear in nearly every human culture, across
  //  millennia? NOT religion / superstition / which-faith-is-right — purely
  //  human behaviour: why do people DO this? Roles so far: ... Psi Research =
  //  the researcher, Intuition = self-knowledge, Rituals = HUMAN CULTURE. Heavy
  //  on STORIES, lighter on psychology. The aha is "wait... I do this too" —
  //  connecting the reader to all of humanity. May speak of temples, monks,
  //  ceremonies as human behaviour, never about which religion is correct. The
  //  wheel does NOT measure the ritual; it asks: "is it a different experience
  //  to measure after deliberately framing the act as a ritual — same place,
  //  same gesture, same order?". FRESH sources, deliberately NOT repeating
  //  Crystal Healing (essentialism / celebrity contagion / Damisch / Brooks /
  //  Nadal) or Human Connection (Gabriel / Wiltermuth / rocking chairs): habit
  //  loop & ~40-45% habits (Graybiel/Wood), ichigo ichie & the tea ceremony,
  //  the endowment effect (mug), inalienable possessions (Weiner) & wedding-ring
  //  history, Jordan's UNC shorts & the haka, Xygalatas's fire-walking
  //  heart-rate study, the Kumbh Mela, Durkheim & Turner's communitas, van
  //  Gennep's rites of passage. ~2 "wow" stories per experiment; closing
  //  feeling: "I am part of this."
  // ##########################################################################

  // ==========================================================================
  //  1 — Everyday Rituals  (you use more rituals than you think)
  // ==========================================================================
  {
    id: 'everyday-rituals',
    topic: 'rituals-and-tradition',
    title: `Everyday Rituals`,
    level: 'Beginner',
    cover: 'assets/experiments/everyday-rituals.jpg',
    order: 1,
    summary: `Four short days noticing something hiding in plain sight: how many small rituals already shape your day — and what changes when you do one of them on purpose.`,
    days: [
      { id: 'd1', title: `The Rituals You Don't Notice`,
        intro: `The first coffee in the same favourite mug. The exact order you get ready. The route you always take, the way you always settle into a chair. We rarely call these rituals, but that's what they are — small repeated acts that quietly steady the day. Before this topic is over, you'll spot dozens of your own. Today you start looking.`,
        task: `Before you measure, notice the little routine you already bring to it — where you sit, what you do first, the order of your movements. Don't change anything yet; just observe the ritual you didn't know you had.`,
        practice: `Measure while quietly aware of the small habits surrounding the act. Notice how much of what you do is already a quiet, repeated ritual.`,
        reflectionPrompt: `What small rituals did you notice you already bring to your day, without realising?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Habit or Ritual?`,
        intro: `Researchers estimate that something like forty percent of what we do each day isn't decided at all — it's habit, run automatically by an older part of the brain that "chunks" repeated actions so we don't have to think. A habit is autopilot. A ritual is the same repeated act, but filled with attention and meaning. That single difference is what this whole topic explores. Today you turn one habit into a ritual.`,
        task: `Take an automatic part of your measurement routine and do it with full, deliberate attention instead — slowly, on purpose, as if it mattered. Turn the autopilot off for just this once.`,
        practice: `Measure while performing your usual routine with real attention rather than on autopilot. Notice whether doing the same act consciously feels different from doing it automatically.`,
        reflectionPrompt: `Did doing your routine with full attention feel different from doing it on autopilot?`,
        measureSeconds: 120 },
      { id: 'd3', title: `One Time, One Meeting`,
        intro: `In the Japanese tea ceremony there's a guiding phrase — ichigo ichie, "one time, one meeting". It means that even if the same people gather in the same room a hundred times, this particular moment will never come again, so it deserves your full presence. The tea master Sen no Rikyu built an entire art around treating a simple cup of tea as unrepeatable. Today you bring that spirit to the wheel.`,
        task: `Approach this measurement as if it could only ever happen once — because, in truth, it can. Set up slowly and attentively, treating the ordinary act as a small ceremony that will never be repeated exactly.`,
        practice: `Measure with the sense that this exact session is unrepeatable and worth your full presence. Notice whether treating a routine moment as once-in-a-lifetime changes how it feels.`,
        reflectionPrompt: `Did treating this session as unrepeatable change how present you were?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Framing the Measurement`,
        intro: `Over three days you've found your hidden rituals, told habit from ritual, and met the art of treating a moment as unrepeatable. Now you build something on purpose: a small ritual frame around the measurement — a fixed place, a gesture, an order. Before you start, predict: will giving the act a deliberate frame change the experience at all?`,
        task: `Design a simple opening ritual and use it: the same spot, perhaps a candle or a chosen object, one calming gesture, then begin — the same way each time. Perform it deliberately, then measure.`,
        practice: `Measure inside the ritual frame you've just created. Notice whether deliberately framing the act, rather than just doing it, changes what you experience — and whether your prediction held.`,
        reflectionPrompt: `Did giving the act a deliberate ritual frame change the experience — and was your prediction right?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Objects of Meaning  (how a simple object becomes priceless)
  // ==========================================================================
  {
    id: 'objects-of-meaning',
    topic: 'rituals-and-tradition',
    title: `Objects of Meaning`,
    level: 'Beginner',
    cover: 'assets/experiments/objects-of-meaning.jpg',
    order: 2,
    summary: `Five days on a deeply human habit: taking ordinary objects — a ring, a stone, a worn keepsake — and filling them with meaning, until they become things we would never trade for anything.`,
    days: [
      { id: 'd1', title: `More Than an Object`,
        intro: `Somewhere you own a thing that's worthless to everyone but you — a ring, a ticket stub, a chipped mug, a stone from a beach. To a stranger it's nothing; to you it holds a whole story. Humans do this everywhere: we pour meaning into matter until the object carries it. Today you bring one such thing to the wheel.`,
        task: `Find one object that means something to you and place it where you can see it as you measure. You're not asking anything of it — just letting a meaningful thing be present, part of the moment.`,
        practice: `Measure with your meaningful object nearby, noticing your own sense of it. Notice what it adds, if anything, to have something that matters to you in the room.`,
        reflectionPrompt: `What did it add to have a personally meaningful object present?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Why Owning Changes Everything`,
        intro: `Here's a neat experiment: give people a plain mug, then ask what they'd sell it for — and ask others what they'd pay to buy the same mug. Owners consistently demanded about twice as much as buyers would offer. Nothing about the mug changed; only that it was now theirs. Mere ownership quietly makes a thing more valuable to us. Today you notice that pull.`,
        task: `Pick an object that is distinctly yours and, as you measure, hold the simple awareness that it belongs to you — not to anyone else. Let that quiet sense of "mine" be part of the session.`,
        practice: `Measure while aware of your sense of ownership over the object. Notice whether something being truly yours makes you regard it differently from any identical copy.`,
        reflectionPrompt: `Did the simple fact that the object is yours make you value it more than an identical one?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Heirlooms`,
        intro: `Anthropologists have noticed that every culture keeps certain objects that are never meant to be sold — heirlooms, passed hand to hand down the generations, carrying the family's story with them. The researcher Annette Weiner called these "inalienable possessions": things that seem to hold the very identity of the people who owned them. A grandmother's ring isn't jewellery; it's her, still here. Today you honour that kind of object.`,
        task: `If you have something handed down to you — or simply an object tied to someone you love — bring it to the measurement and let its history be present with you. If not, picture one clearly in mind.`,
        practice: `Measure while sensing the chain of people and time your object carries. Notice whether an object that links you to others feels different from one that's only yours.`,
        reflectionPrompt: `Did an object that connects you to other people or to the past feel different to hold?`,
        measureSeconds: 150 },
      { id: 'd4', title: `The Ring`,
        intro: `Consider the wedding ring. Ancient Romans gave iron bands and wore them on the fourth finger of the left hand, believing a "vein of love" ran from there straight to the heart. The anatomy was wrong, but the custom stuck — and across thousands of years and countless cultures, humans keep choosing a small circle of metal to carry their deepest bonds. A tiny object, an enormous meaning. Today you reflect on that.`,
        task: `Bring to mind, or wear, an object that stands for a bond or a promise in your life. As you measure, let it represent that connection, the way a ring stands in for a vow.`,
        practice: `Measure while letting a small object hold a large meaning for you. Notice how much weight a simple thing can carry once we agree to let it.`,
        reflectionPrompt: `How much meaning could a single small object hold once you let it stand for something?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Your Object of Meaning`,
        intro: `You've met the worthless-yet-priceless keepsake, felt how ownership changes value, honoured the heirloom, and seen a ring carry a vow. None of this meaning lives in the matter — we put it there, as humans always have. Before you start, predict: will measuring with a truly meaningful object present feel different from measuring with nothing?`,
        task: `Choose your single most meaningful object and make it the centre of a small ritual: place it deliberately, take a moment with what it stands for, then measure with it present.`,
        practice: `Measure inside that meaning, the object holding its story beside you. Notice whether a deliberately meaningful object changes the session — and whether your prediction held.`,
        reflectionPrompt: `Did measuring with a deeply meaningful object present feel different — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Rituals Before Performance  (why every high-stakes domain invents them)
  // ==========================================================================
  {
    id: 'rituals-before-performance',
    topic: 'rituals-and-tradition',
    title: `Rituals Before Performance`,
    level: 'Intermediate',
    cover: 'assets/experiments/rituals-before-performance.jpg',
    order: 3,
    summary: `Five days on a pattern you'll find wherever the stakes are high — athletes, performers, soldiers and surgeons all build private ceremonies before the big moment. Why does nearly everyone, everywhere, do this?`,
    days: [
      { id: 'd1', title: `Before the Big Moment`,
        intro: `Watch anyone facing a high-stakes moment and you'll spot it: the deep breath at the free-throw line, the singer's backstage routine, the soldier squaring away his kit. Across completely different worlds, people independently invent the same thing — a ritual to cross from ordinary time into "now it counts". Today you notice your own threshold.`,
        task: `Before you measure, create a clear "now it begins" moment — a breath, a phrase, a small gesture that marks the shift from getting ready to doing. Cross that line deliberately, then start.`,
        practice: `Measure while aware of having stepped across a deliberate threshold into the act. Notice whether marking a clear start changes how focused or ready you feel.`,
        reflectionPrompt: `Did marking a clear "now it begins" moment change how ready you felt?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Champion's Secret`,
        intro: `Michael Jordan wore his old University of North Carolina shorts under his Chicago Bulls uniform for every single game of his career — a private good-luck ritual he never played without. He's far from alone; elite athletes are full of these fixed routines, and most say the same thing: it isn't magic, it helps them feel ready and focused. Today you borrow a champion's trick.`,
        task: `Choose one small, fixed thing to do before you measure — the same each time — and treat it as your personal good-luck routine, the way Jordan reached for those shorts. Do it, then begin.`,
        practice: `Measure after your fixed personal routine, noticing your state. Notice whether having a reliable pre-game ritual leaves you steadier or more focused.`,
        reflectionPrompt: `Did a fixed personal ritual beforehand leave you steadier or more focused?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Warrior's Dance`,
        intro: `Before every match, New Zealand's rugby team performs the haka — a thunderous Maori ceremonial chant and dance, stamping and chanting in perfect unison. Its creators are clear that it isn't really about frightening opponents; it's about building the players' courage inwardly and binding them together as one. Cultures the world over have such rituals to summon strength before a trial. Today you summon yours.`,
        task: `Before measuring, do something physical and deliberate to gather your energy — a few firm breaths, a stretch, a posture of readiness — your own small version of a pre-contest ritual. Then settle and begin.`,
        practice: `Measure from that gathered, readied state. Notice whether a physical ritual of preparation changes how present and strong you feel.`,
        reflectionPrompt: `Did a physical ritual of preparation change how present or strong you felt?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Theaters and Barracks`,
        intro: `The pattern is everywhere once you see it. Actors never say "Macbeth" inside a theatre and wish each other to "break a leg". Soldiers polish drill and ceremony to a mirror shine. Surgeons scrub in with an exact, unvarying sequence. None of these is mere superstition — each marks a passage into a serious, focused state. Today you treat your own act with that seriousness.`,
        task: `Give the measurement the dignity of a professional's routine: prepare your space and yourself with care and in a set order, as a surgeon or performer would before they begin. Then measure.`,
        practice: `Measure after a careful, professional-style preparation. Notice whether treating the act with ceremony changes the quality of your attention.`,
        reflectionPrompt: `Did preparing with real ceremony change the quality of your attention?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Your Performance Ritual`,
        intro: `You've marked a threshold, borrowed a champion's charm, gathered yourself like a warrior, and prepared with a professional's care. Across every field, humans reach for ritual exactly when it matters most — not because it's magic, but because it readies the mind. Before you start, predict: will a full pre-performance ritual change your session compared with just beginning cold?`,
        task: `Build your complete performance ritual — threshold, lucky element, physical readying, careful order — and run it fully before you measure, like an athlete before the whistle.`,
        practice: `Measure after your full performance ritual. Notice how it compares with simply starting cold, the way you might on an ordinary day — and whether your prediction held.`,
        reflectionPrompt: `Did a full performance ritual change your session compared with starting cold — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Collective Rituals  (what happens when many do the same thing at once)
  // ==========================================================================
  {
    id: 'collective-rituals',
    topic: 'rituals-and-tradition',
    title: `Collective Rituals`,
    level: 'Intermediate',
    cover: 'assets/experiments/collective-rituals.jpg',
    order: 4,
    summary: `Five days on something humans cannot seem to stop doing: gathering in their thousands and millions to move, sing and feel as one. What happens to us when we do the same thing together?`,
    days: [
      { id: 'd1', title: `Doing It Together`,
        intro: `A crowd singing the same song. A stadium rising as one. A congregation, a festival, a dance floor. There's a particular feeling that only appears when many people do the same thing at the same time — and humans have chased it for as long as we've existed. Today you reach toward it, even alone at your wheel.`,
        task: `As you measure, hold the sense that you are not really alone — that others, somewhere, are sitting with their own wheels, part of the same quiet shared practice. Let yourself feel like one of many.`,
        practice: `Measure while imagining yourself part of a wider gathering all doing this together. Notice whether feeling part of something collective changes the experience.`,
        reflectionPrompt: `Did imagining yourself part of a wider gathering change how the measurement felt?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Hearts in Sync`,
        intro: `In a Spanish village, anthropologists wired up people at a fire-walking festival — both the walkers crossing the burning coals and their families watching. Astonishingly, the spectators' heart rates rose and fell in sync with their loved ones on the fire, beat for beat, though they sat perfectly still. A shared ritual had physically linked their bodies. Today you feel how shared experience reaches across people.`,
        task: `Before measuring, bring vividly to mind someone you feel deeply connected to, and imagine you are both part of the same moment. Carry that felt connection into the session.`,
        practice: `Measure while holding a strong sense of being in sync with someone who matters to you. Notice whether feeling connected to another person colours the experience.`,
        reflectionPrompt: `Did holding a strong sense of connection to someone colour the experience?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Largest Gathering on Earth`,
        intro: `Every twelve years in India, the Kumbh Mela draws crowds almost beyond imagining — the 2025 gathering was expected to reach around four hundred million people, more than the entire population of the United States, all coming to bathe at a sacred river. Even the famous Hajj to Mecca, at roughly two million, is small beside it. Whatever draws us, the human pull to gather and do the same thing is enormous. Today you sit with that scale.`,
        task: `As you measure, picture the vast, unbroken line of human beings — across countries and centuries — who have gathered to share a meaningful act, and place yourself quietly among them. One more person in a very long tradition.`,
        practice: `Measure while feeling yourself part of that immense human story of gathering. Notice whether belonging to something so much larger than yourself shifts anything.`,
        reflectionPrompt: `Did sensing yourself part of a vast human tradition shift anything in you?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Communitas`,
        intro: `The sociologist Emile Durkheim had a name for the electricity of a crowd in shared ritual: "collective effervescence", a wave of energy that lifts people beyond themselves. The anthropologist Victor Turner went further, describing "communitas" — the deep, equal fellowship that arises when people share a ritual and, for a while, all status falls away and they are simply human together. Today you reach for that levelling warmth.`,
        task: `As you measure, set aside every role and label you carry — job, status, the lot — and rest in the simple fact of being one human among humans. Let that equal, shared feeling fill the moment.`,
        practice: `Measure from that stripped-down sense of plain human fellowship. Notice whether letting go of your roles, even briefly, changes how you feel.`,
        reflectionPrompt: `Did letting go of your everyday roles, even briefly, change how you felt?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Joining In`,
        intro: `You've imagined the gathering, felt hearts sync across a fire, sat with the scale of millions, and tasted the equal fellowship of communitas. Humans gather and ritualise together because it binds us — that's the quiet anthropological truth under every festival and ceremony. Before you start, predict: will measuring as part of the wider community feel different from measuring purely alone?`,
        task: `If a live or group session is available, join it and measure with others in real time. If not, hold the whole community of fellow users vividly in mind, and measure as one of many doing this together right now.`,
        practice: `Measure inside that full sense of shared, collective practice. Notice how being part of the many compares with going it alone — and whether your prediction held.`,
        reflectionPrompt: `How did measuring as part of the community compare with going it alone — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Transformation Rituals  (why cultures mark life's turning points)
  //  The culmination — closing feeling: "I am part of humanity's oldest pattern."
  // ==========================================================================
  {
    id: 'transformation-rituals',
    topic: 'rituals-and-tradition',
    title: `Transformation Rituals`,
    level: 'Advanced',
    cover: 'assets/experiments/transformation-rituals.jpg',
    order: 5,
    summary: `Five days on the deepest pattern of all: why, in every culture on Earth, the great turning points of a life — birth, adulthood, marriage, death — are marked with ritual. And why, by the end, you may feel part of that unbroken human story yourself.`,
    days: [
      { id: 'd1', title: `Marking the Threshold`,
        intro: `Think of the moments a life turns: a wedding, a graduation, a coming of age, a funeral. No culture leaves these unmarked — every one of them, everywhere, surrounds the great transitions with ceremony. It seems we cannot simply slip from one chapter to the next; we need to cross the threshold deliberately. Today you reflect on the thresholds you've crossed.`,
        task: `Before measuring, bring to mind one real turning point in your own life and how it was marked — or wasn't. Carry that sense of a life-passage with you, then begin.`,
        practice: `Measure while holding awareness of life's turning points and how we mark them. Notice what it brings up to sit with the idea of thresholds and change.`,
        reflectionPrompt: `What did it bring up to reflect on the thresholds you've crossed in your life?`,
        measureSeconds: 150 },
      { id: 'd2', title: `The Three Stages`,
        intro: `Over a century ago, the ethnographer Arnold van Gennep noticed something remarkable: rituals of transition, all over the world, share the same hidden three-part shape. First separation — you leave your old self behind. Then a strange in-between, neither here nor there. Then reincorporation — you return, changed, with a new status. Wedding, initiation, graduation — all follow this same ancient pattern. Today you walk it in miniature.`,
        task: `Shape your session in three deliberate steps: a clear letting-go of the day behind you, a quiet in-between as you settle, and a conscious return as you finish. Move through separation, threshold and return on purpose.`,
        practice: `Measure as the middle, in-between stage of that three-part passage. Notice whether moving through a deliberate beginning, middle and end changes the experience.`,
        reflectionPrompt: `Did shaping the session as a clear passage — leaving, crossing, returning — change it?`,
        measureSeconds: 180 },
      { id: 'd3', title: `Betwixt and Between`,
        intro: `The anthropologist Victor Turner gave a name to that strange middle stage of any rite of passage: liminality, from the Latin for "threshold" — the time when you are no longer who you were and not yet who you'll be. It can feel disorienting, but Turner saw it as where transformation actually happens, and where people bond most deeply. Today you rest in your own threshold.`,
        task: `As you measure, let yourself sit in a deliberately in-between state — nothing to finish, nowhere to be, simply on the threshold. Don't reach forward or back; rest in the middle.`,
        practice: `Measure while resting in that betwixt-and-between, open and unhurried. Notice what it feels like to dwell in a threshold rather than rushing across it.`,
        reflectionPrompt: `What did it feel like to rest in an in-between, threshold state rather than rushing through?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Coming of Age Around the World`,
        intro: `Look at how cultures turn a child into an adult and the variety is dazzling: a bar or bat mitzvah, a quinceanera at fifteen, Japan's coming-of-age day in bright kimono, a young Maasai's long initiation, the Vanuatu islanders whose land-diving leaps inspired the bungee jump. Utterly different on the surface — yet all saying the same thing: you are not a child anymore. Same human need, a thousand beautiful forms. Today you honour your own becoming.`,
        task: `Before measuring, reflect on a way you have grown or changed — and silently mark it, the way a ceremony would: this happened, I am different now. Then measure in acknowledgement of it.`,
        practice: `Measure while quietly honouring some real growth in yourself, as a rite of passage would. Notice whether formally marking a change makes it feel more real.`,
        reflectionPrompt: `Did deliberately marking a real change in yourself make it feel more real?`,
        measureSeconds: 210 },
      { id: 'd5', title: `Your Own Passage`,
        intro: `Across this whole topic you've found your hidden rituals, filled objects with meaning, prepared like a champion, gathered with the millions, and walked the ancient shape of transition. Notice the feeling underneath it all — the quiet recognition that you do these things too, exactly as humans always have. You are part of an unbroken tradition stretching back as far as our species. Before you start, predict, then measure this final session as a small rite marking the end of the journey.`,
        task: `Make this last measurement a complete ritual of your own: a clear threshold, a meaningful object, a gathered state, an honest sense of marking the end of something. Bring everything the topic gave you into one deliberate ceremony.`,
        practice: `Measure inside that full, self-made rite, present to being part of humanity's oldest pattern. Notice what feels most different now — and whether you feel, at last, that you do this too — and whether your prediction held.`,
        reflectionPrompt: `After this whole journey, where do you recognise yourself in humanity's oldest tradition of ritual?`,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  QUANTUM HEALING TOPIC
  //  Frame: the most INTELLECTUAL topic — BIG QUESTIONS. The term "Quantum
  //  Healing" appears as a HISTORICAL & CULTURAL phenomenon, never as a medical
  //  or scientific claim. Big question: why did people start using the language
  //  of quantum physics to talk about consciousness, healing and human
  //  potential? We examine how modern physics met human imagination — we do NOT
  //  heal with quantum energy or activate quantum vibrations. Do NOT teach
  //  physics (no exam); aim for "that's fascinating", not Schrödinger revision.
  //  Pseudoscientific phrases (quantum vibrations, quantum frequency healing,
  //  DNA activation, quantum manifestation) appear ONLY as cultural examples,
  //  never as fact. BE PRECISE, especially on the observer / double-slit: in
  //  physics "observation" = physical interaction with a detector, NOT a
  //  conscious mind; "consciousness collapses the wave function" is a documented
  //  misconception (and itself the cultural phenomenon we study). Real people as
  //  short "wow" moments, not biographies: Planck, Einstein, Heisenberg, Bohr,
  //  Schrödinger, Everett, Wheeler, Gell-Mann, Chalmers. The wheel is a reminder
  //  that observation itself is interesting; the user measures with different
  //  mental frames to OBSERVE, not to prove. Closing feeling: "the world is much
  //  stranger and more interesting than I thought."
  // ##########################################################################

  // ==========================================================================
  //  1 — The Quantum Revolution  (when the clockwork universe cracked open)
  // ==========================================================================
  {
    id: 'the-quantum-revolution',
    topic: 'quantum-healing',
    title: `The Quantum Revolution`,
    level: 'Beginner',
    cover: 'assets/experiments/the-quantum-revolution.jpg',
    order: 1,
    summary: `Four short days at the moment science got strange — when the tidy, predictable universe of Newton cracked open, and reality turned out to be far weirder than anyone expected.`,
    days: [
      { id: 'd1', title: `The Clockwork World`,
        intro: `For two centuries after Newton, science pictured the universe as a vast, perfect clockwork: know the position of every part, and you could in principle predict the entire future. It was orderly, reassuring, and almost complete. Then, around 1900, that whole picture began to crack. Today you start at the edge of that old certainty.`,
        task: `Set up the wheel and, before you measure, adopt the old clockwork view for a moment: as if everything were perfectly predictable, including this session. Notice how that assumption feels.`,
        practice: `Measure while holding the tidy idea that everything is, in principle, predictable. Notice whether the world actually feels as orderly and certain as the clockwork picture promised.`,
        reflectionPrompt: `Did the world feel as predictable as the old clockwork picture promised?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The World Comes in Pieces`,
        intro: `In 1900, Max Planck stumbled onto something he found almost unbelievable: energy doesn't flow in a smooth stream — it comes in tiny, indivisible packets he called "quanta". He was a conservative man and called it an act of desperation, hoping someone would explain it away. No one could. The smooth world had a graininess no one had suspected. Today you look closely.`,
        task: `As you measure, look at the wheel's movement as if examining it for hidden structure — not one smooth flow, but something with fine grain, the way Planck peered into energy itself. Look closely, with curiosity.`,
        practice: `Measure while attending to the fine detail and texture of what you observe. Notice whether close attention reveals structure where you'd normally see a smooth blur.`,
        reflectionPrompt: `Did looking closely reveal fine structure where you'd normally see a smooth blur?`,
        measureSeconds: 120 },
      { id: 'd3', title: `The End of Certainty`,
        intro: `In 1927, Werner Heisenberg proved something stranger still: you cannot know a particle's exact position and motion at the same time — not because our instruments are clumsy, but as a built-in limit of reality itself. Even Einstein recoiled, insisting "God does not play dice". But the dice, it seemed, were real. Certainty itself had quietly ended.`,
        task: `Before measuring, accept that you genuinely cannot predict exactly how this session will go — and treat that not as a problem but as the honest truth of an uncertain world. Then measure without needing to know in advance.`,
        practice: `Measure while letting go of the need to predict or control the outcome. Notice how it feels to sit with genuine uncertainty rather than expecting a fixed result.`,
        reflectionPrompt: `How did it feel to measure while accepting that you genuinely couldn't predict the outcome?`,
        measureSeconds: 150 },
      { id: 'd4', title: `A Stranger Universe`,
        intro: `In barely three decades, the clockwork shattered: energy in packets, limits on what can be known, dice at the foundation of things. The lesson wasn't that physics had failed — it was that reality is far stranger and more interesting than the old certainties allowed. Today you simply stand in that strangeness as an observer.`,
        task: `Approach this measurement with fresh eyes, as if the world were newly revealed to be mysterious and surprising. You're not here to explain anything — just to observe a strange, interesting world.`,
        practice: `Measure as a curious observer of a stranger-than-expected reality. Notice whether meeting the world as genuinely mysterious changes how you pay attention.`,
        reflectionPrompt: `Did meeting the world as genuinely strange and mysterious change how you observed?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Observer & Observation  (the most famous, most misunderstood experiment)
  // ==========================================================================
  {
    id: 'observer-and-observation',
    topic: 'quantum-healing',
    title: `Observer & Observation`,
    level: 'Beginner',
    cover: 'assets/experiments/observer-and-observation.jpg',
    order: 2,
    summary: `Five days with the most famous and most misunderstood experiment in all of science — and a careful, honest look at what "the observer" really means, and what it definitely doesn't.`,
    days: [
      { id: 'd1', title: `The Famous Experiment`,
        intro: `Fire tiny particles, one at a time, at a barrier with two slits, and something baffling happens: over many particles they build up a striped pattern that only makes sense if each one somehow behaved like a spreading wave passing through both slits at once. Send them one by one, and they still interfere with themselves. It's real, repeatable, and genuinely strange. Today you sit with that strangeness.`,
        task: `As you measure, let yourself be struck by the simple oddness that the world allows such a thing — a single particle behaving like a wave. Hold the wheel's motion in that same spirit of "how is any of this possible?".`,
        practice: `Measure while holding a sense of open wonder at how strange the physical world really is. Notice whether genuine wonder changes the quality of your attention.`,
        reflectionPrompt: `Did sitting with genuine wonder at the world's strangeness change how you attended?`,
        measureSeconds: 120 },
      { id: 'd2', title: `What Observation Really Means`,
        intro: `Here's the famous twist: if you place a detector to see which slit each particle goes through, the wave pattern vanishes and they behave like ordinary specks. It sounds magical — but the precise truth matters. "Observation" here means a physical interaction with a measuring device; the detector disturbs the system whether or not any human is watching. A machine alone gets the same result. No consciousness required.`,
        task: `Today, observe precisely: notice the difference between simply being aware of the wheel and actively interacting with it. Keep the two clearly separate in your mind as you measure.`,
        practice: `Measure while distinguishing passive awareness from active, physical interaction. Notice that watching something and physically acting on it are genuinely two different things.`,
        reflectionPrompt: `Could you feel the difference between merely being aware of something and physically interacting with it?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Beautiful Misunderstanding`,
        intro: `Because the word "observer" sounds like it means a conscious mind, a seductive idea spread: that consciousness itself creates reality, that simply looking collapses the world into being. It's a beautiful story — and physicists are clear that it's a misreading of what the experiment shows. Today we don't dismiss the idea or believe it; we just notice how easily a technical word grew into a myth.`,
        task: `As you measure, watch your own mind reach for tidy, dramatic explanations of what you see — and gently notice each time it does. Don't believe or reject; just catch the storytelling impulse.`,
        practice: `Measure while observing your mind's urge to spin a neat story around what you notice. Notice how naturally and quickly we turn an observation into a grand explanation.`,
        reflectionPrompt: `How quickly did your mind try to turn what you observed into a grand story?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Observation in Everyday Life`,
        intro: `Step away from physics and observation really does change things — just not mysteriously. You behave differently when you know you're watched; pay attention to your breath and it shifts; look closely at anything and you notice what you'd have missed. These are ordinary effects of attention, quite separate from the quantum kind — and interesting in their own right. Today you explore that everyday observer effect.`,
        task: `Measure while deliberately observing yourself closely — your posture, breath, focus — and notice whether the simple act of watching yourself changes any of it.`,
        practice: `Measure while paying unusually close attention to your own state. Notice whether observing yourself, in this ordinary way, changes what you observe.`,
        reflectionPrompt: `Did closely observing yourself change what you were observing — in this ordinary, non-mysterious way?`,
        measureSeconds: 150 },
      { id: 'd5', title: `The Act of Looking`,
        intro: `Across these days you've met the famous experiment, learned what "observation" really means, watched a myth grow from a word, and felt how attention shapes ordinary life. The honest conclusion is rich enough on its own: observation is genuinely fascinating — in physics and in your own mind — without needing any mystical claim. Before you start, simply decide to look well.`,
        task: `Make this session purely about the quality of your looking: observe the wheel, and yourself observing it, as clearly and honestly as you can. Nothing to prove — just clean, careful attention.`,
        practice: `Measure as an act of pure, honest observation. Notice what becomes available when looking itself, done well, is the whole point.`,
        reflectionPrompt: `What did you notice when the entire point was simply to observe well?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Quantum Ideas in Culture  (how a word escaped the lab)
  // ==========================================================================
  {
    id: 'quantum-ideas-in-culture',
    topic: 'quantum-healing',
    title: `Quantum Ideas in Culture`,
    level: 'Intermediate',
    cover: 'assets/experiments/quantum-ideas-in-culture.jpg',
    order: 3,
    summary: `Five days on a genuinely fascinating human story: how a word from physics escaped the laboratory and became one of the most powerful, slippery and over-used ideas in modern culture.`,
    days: [
      { id: 'd1', title: `A Word Escapes the Lab`,
        intro: `Some words stay put; others break loose and roam. "Quantum" was always a precise, technical term — until it leapt into everyday speech, advertising and spirituality, where it came to mean something more like "mysterious, powerful, beyond the ordinary". Today you notice how a single word can carry wildly different meanings depending on who's holding it.`,
        task: `As you measure, simply hold the question of what the word "quantum" conjures for you personally — power, mystery, science, nonsense? Notice your own associations without judging them.`,
        practice: `Measure while observing your own reactions to a loaded word and idea. Notice how much meaning a single word can carry before anyone defines it.`,
        reflectionPrompt: `What did the word "quantum" actually conjure for you — and where did that come from?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Physics Meets Mysticism`,
        intro: `In 1975, the physicist Fritjof Capra published "The Tao of Physics", arguing that modern physics and ancient Eastern mysticism were describing strangely similar worlds. Serious or not, it struck a deep chord and opened a door: for the first time, huge numbers of people began linking quantum ideas with consciousness and spirituality. Today you sit with that very human wish — to connect science and meaning.`,
        task: `As you measure, notice your own pull, if any, toward wanting the strange and the meaningful to be connected. Don't act on it or dismiss it — just observe the wish itself.`,
        practice: `Measure while noticing any desire to find deep meaning in what you observe. Notice how strong the human urge is to weave science and significance together.`,
        reflectionPrompt: `Did you notice a pull to find deeper meaning in what you observed — and how strong was it?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Quantum Everything`,
        intro: `From there it spread everywhere. In 1989 the physician Deepak Chopra popularised "quantum healing"; a 2004 film, "What the Bleep Do We Know!?", spun quantum imagery into spiritual claims; and "quantum" became a marketing word stuck on everything from face cream to self-help. The same eight letters came to mean a hundred different things. Today you watch a word stretch.`,
        task: `As you measure, treat this simply as a study in human culture: how an idea, once loose, gets reshaped to fit whatever people hope for. Observe with the curiosity of an anthropologist, not a judge.`,
        practice: `Measure while holding a neutral, curious stance toward how ideas spread and mutate. Notice how easily a single idea can be stretched to mean almost anything.`,
        reflectionPrompt: `What did you notice about how easily a single idea can be reshaped to fit our hopes?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Quantum Flapdoodle`,
        intro: `Physicists noticed too. The Nobel laureate Murray Gell-Mann coined a wonderful phrase for the misuse of quantum language to dress up unrelated claims: "quantum flapdoodle". The point of the joke isn't to mock people, but to mark a clear line between what the physics actually says and what gets attached to it. Today you practise that clean line — interested, but precise.`,
        task: `Measure while holding both attitudes at once: genuine openness to what's strange and real, and a calm refusal to be fooled by impressive-sounding words. Curious and clear-eyed together.`,
        practice: `Measure while balancing open wonder with honest skepticism. Notice whether you can stay fascinated and clear-headed at the same time.`,
        reflectionPrompt: `Could you stay genuinely fascinated and clear-headed at the same time?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Why the Word Spread`,
        intro: `So why did this one word capture so many imaginations? Perhaps because it seemed to promise exactly what people longed for: that reality is open, that mind matters, that science and meaning might meet. The claims may be loose, but the longing behind them is deeply human and worth understanding. Before you start, set aside both belief and scorn, and simply be curious.`,
        task: `Measure as a fair-minded observer of the human appetite for mystery and meaning — including your own. Hold the whole phenomenon with warmth and clear eyes at once.`,
        practice: `Measure while observing, without judgement, the very human hunger for wonder that this word fed. Notice what that longing feels like in yourself.`,
        reflectionPrompt: `What did you notice about the human hunger for wonder — and do you feel it too?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Possibility & Choice  (the captivating idea of many possibilities)
  // ==========================================================================
  {
    id: 'possibility-and-choice',
    topic: 'quantum-healing',
    title: `Possibility & Choice`,
    level: 'Intermediate',
    cover: 'assets/experiments/possibility-and-choice.jpg',
    order: 4,
    summary: `Five days on one of the most captivating ideas physics ever produced — that reality might hold many possibilities at once — and the very human reason we find open possibilities so irresistible.`,
    days: [
      { id: 'd1', title: `Many Possibilities at Once`,
        intro: `One of quantum theory's strangest features is superposition: before it's measured, a tiny system can behave as if it holds several possibilities at the same time, rather than one definite state. It's a real and useful part of the physics — and also an idea that has fascinated people far beyond the lab, because it hints that things might be more open than they look. Today you hold that sense of openness.`,
        task: `Before you measure, deliberately hold several possibilities open in your mind about how the session might go, without settling on one. Then begin, carrying that sense of "many ways this could unfold".`,
        practice: `Measure while keeping a few possible outcomes open rather than fixing on one. Notice how it feels to hold several possibilities at once before things become definite.`,
        reflectionPrompt: `How did it feel to hold several possibilities open at once before the session settled?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Cat in the Box`,
        intro: `In 1935, Erwin Schrödinger imagined his famous cat — sealed in a box, seemingly both alive and dead until observed. Here's the twist most people miss: he invented it as a joke, a way of showing how absurd it would be to take quantum weirdness literally at human scale. He didn't believe the cat was really both. The most famous quantum image was meant as a warning, not a wonder. Today you enjoy that irony.`,
        task: `As you measure, notice how tempting it is to take a vivid image literally — and gently hold the cat as Schrödinger meant it, a thought experiment, not a fact. Stay playful and precise.`,
        practice: `Measure while holding a striking idea lightly, as a thought experiment rather than a literal truth. Notice how easily a vivid image can be mistaken for reality.`,
        reflectionPrompt: `How easily does a vivid image, like the cat, get mistaken for literal truth?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Worlds That Branch`,
        intro: `In 1957, the physicist Hugh Everett proposed something audacious: maybe nothing ever collapses into a single outcome — maybe every possibility actually happens, each in its own branching world. It remains one of several serious, competing interpretations, and no one knows if it's true. But the idea that every unchosen path is taken somewhere thrills and unsettles us in equal measure. Today you feel its pull.`,
        task: `Before measuring, imagine for a moment that every way this session could go genuinely happens, somewhere. Then measure this one, here, and notice how it feels to live just this single branch.`,
        practice: `Measure while playing with the idea of countless branching possibilities, then resting in this one real moment. Notice whether imagining the alternatives changes how you value the actual one.`,
        reflectionPrompt: `Did imagining all the alternative possibilities change how you valued this actual one?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Why We Love Open Doors`,
        intro: `Our love of possibility isn't only romantic — it's measurable. In one experiment, people played a game with closing doors and irrationally paid real costs just to keep options open, unable to bear watching a door shut, even when it cost them. We're powerfully drawn to the unchosen, the "what if", the path not taken. Today you notice your own pull toward open doors.`,
        task: `As you measure, notice your own relationship with keeping options open versus committing — do you cling to "maybe", or settle easily? Just observe your tendency without changing it.`,
        practice: `Measure while noticing how you feel about closing options and committing to one path. Notice whether you, too, are pulled to keep doors open.`,
        reflectionPrompt: `Are you pulled to keep your options open — and what does committing to one path feel like?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Living With Possibility`,
        intro: `You've held many outcomes at once, met the misunderstood cat, imagined branching worlds, and felt your own love of open doors. Underneath the physics is a very human theme: we live suspended between what could be and what is. Before you start, hold several possibilities for this session, make a gentle prediction among them, then watch the many become one.`,
        task: `Hold a few real possibilities for how this session might go, quietly predict which will happen, then measure and watch one of them become actual — the "could be" settling into the "is".`,
        practice: `Measure while noticing the moment possibility becomes actuality, and whether your prediction was among the paths that came true. Notice how it feels when the open settles into the real.`,
        reflectionPrompt: `How did it feel to watch open possibility settle into one actual outcome — and was your prediction among them?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — The Open Mystery  (where the smartest people still disagree)
  //  The culmination — stays OPEN; closing feeling: "the world is stranger and
  //  more interesting than I thought." Never a verdict.
  // ==========================================================================
  {
    id: 'the-open-mystery',
    topic: 'quantum-healing',
    title: `The Open Mystery`,
    level: 'Advanced',
    cover: 'assets/experiments/the-open-mystery.jpg',
    order: 5,
    summary: `Five days at the genuine edge of human knowledge — where the world's smartest people still disagree, the deepest questions remain unanswered, and the honest response is wonder rather than certainty.`,
    days: [
      { id: 'd1', title: `Nobody Fully Understands`,
        intro: `Here's a secret the textbooks rarely shout: although quantum physics predicts experiments with breathtaking precision, no one agrees on what it actually means. A recent survey of physicists found no interpretation with majority support — they're split between several rival views. Richard Feynman put it bluntly: "I think I can safely say that nobody understands quantum mechanics". The math works; the meaning is wide open. Today you sit in that honest gap.`,
        task: `As you measure, hold the strange comfort that even the experts don't fully understand — so you needn't pretend to either. Simply observe, releasing any need to explain what it all means.`,
        practice: `Measure while resting in the fact that the deepest meaning is genuinely unsettled, for everyone. Notice how it feels to observe without needing to understand.`,
        reflectionPrompt: `How did it feel to observe freely, without needing to understand what it all means?`,
        measureSeconds: 150 },
      { id: 'd2', title: `The Participatory Universe`,
        intro: `The physicist John Wheeler, who coined the term "black hole", spent his later years on a daring question: what if observation is somehow woven into the fabric of reality — the universe not as a finished thing we look at, but one we take part in? His "participatory universe" remains bold speculation, not established fact, but it comes from one of the great minds of physics, asked in complete seriousness. Today you sit with a giant's open question.`,
        task: `As you measure, entertain Wheeler's question lightly — not as a belief, but as a wondering: what is the relationship between observing and what's observed? Hold the question, expect no answer.`,
        practice: `Measure while holding a genuine open question about observer and observed, without resolving it. Notice what it's like to carry a question a great physicist couldn't answer either.`,
        reflectionPrompt: `What was it like to hold an open question that even a great physicist left unanswered?`,
        measureSeconds: 180 },
      { id: 'd3', title: `The Hardest Problem`,
        intro: `There's a mystery even deeper than quantum physics, sitting right behind your eyes. In 1995 the philosopher David Chalmers named it the "hard problem of consciousness": we can map every neuron, yet still have no idea why any of it should be accompanied by inner experience at all — why there's something it feels like to be you. After decades of brilliant work, this remains genuinely unsolved. Today you meet the mystery directly.`,
        task: `As you measure, turn attention to the simple, staggering fact that you are experiencing anything at all — the very having of an experience. Don't explain it; just notice that it's happening.`,
        practice: `Measure while resting in the plain wonder that experience itself exists. Notice what it's like to attend to the fact of your own awareness, rather than its contents.`,
        reflectionPrompt: `What was it like to notice the sheer fact that you are experiencing anything at all?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Sitting With Not Knowing`,
        intro: `Faced with a real mystery, the mind wants to bolt — either toward a tidy mystical answer or a quick dismissal. Both close the question; both are more comfortable than the truth, which is that we simply don't know yet. Learning to rest in honest not-knowing, without flinching either way, is rare and quietly powerful. Today you practise it.`,
        task: `As you measure, hold one of the big open questions — about reality, mind, or meaning — and deliberately resist resolving it in either direction. Stay in the honest middle: "I don't know, and that's all right".`,
        practice: `Measure while dwelling in genuine not-knowing, refusing both easy belief and easy dismissal. Notice how it feels to leave a great question genuinely open.`,
        reflectionPrompt: `Could you leave a big question genuinely open, without rushing to either belief or dismissal?`,
        measureSeconds: 210 },
      { id: 'd5', title: `A Stranger, Richer World`,
        intro: `Across this whole topic you've watched the clockwork crack, met the misunderstood observer, traced a word's journey into culture, played with possibility, and stood at the edge of what anyone knows. Notice where you've arrived: not at proof of anything mystical, but at something better — a world far stranger, deeper and more interesting than the tidy one you might have assumed. Before you start, simply let yourself be amazed.`,
        task: `Make this final session an act of pure wonder: measure as someone who has looked hard at reality and found it genuinely astonishing, with the biggest questions still gloriously open.`,
        practice: `Measure while resting in open, honest amazement at how strange and rich the world turned out to be. Notice what feels different now from when you began this topic.`,
        reflectionPrompt: `After all this, does the world feel stranger and more interesting than when you started — and how?`,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  YOGA TOPIC
  //  Frame: the most HANDS-ON, "doing" topic — move, stretch, breathe, THEN
  //  measure. NOT an asana collection (YouTube has a thousand poses). Big
  //  question: what was yoga actually trying to achieve? Historically, primarily
  //  ATTENTION, awareness, self-observation, presence — not flexibility — which
  //  fits the Egely Wheel perfectly. Practices are VERY simple (doable in a
  //  hotel, office or living room; no headstands, no advanced asana, no
  //  flexibility contest). The wheel ALWAYS comes at the END. Per-day pattern:
  //  short interesting intro -> 2-3 min practice (in `task`) -> wheel measurement
  //  (`practice`) -> reflection. Each day carries `practiceMinutes` (the
  //  "Estimated practice time" hint Csaba requested). Real yoga history used
  //  briefly as "wow" moments: Patanjali & the eight limbs, "yoga = stilling the
  //  mind" (Sutra 1.2), Hatha Yoga Pradipika, trataka, drishti, and the surprise
  //  that modern posture-yoga is barely a century old (Singleton). Experiment
  //  personalities: 1 perception, 2 breath, 3 balance, 4 stillness, 5 the deeper
  //  goal — a discovery journey, not a yoga class. Closing feeling: "the body
  //  was only ever the doorway; the real practice was attention."
  // ##########################################################################

  // ==========================================================================
  //  1 — Yoga Begins with Awareness  (the real beginning is noticing)
  // ==========================================================================
  {
    id: 'yoga-begins-with-awareness',
    topic: 'yoga',
    title: `Yoga Begins with Awareness`,
    level: 'Beginner',
    cover: 'assets/experiments/yoga-begins-with-awareness.jpg',
    order: 1,
    summary: `Four short days on a surprise hiding inside yoga: before it was ever about stretching, it was about noticing. Gentle movement, then the wheel — the point is awareness, not exercise.`,
    days: [
      { id: 'd1', title: `The Real Beginning`,
        intro: `Most people picture yoga as stretching, but historically it began with something far quieter: simply noticing the body from the inside. No effort, no flexibility — just attention. Today you start exactly where the tradition did, with a gentle body scan, and then you measure.`,
        task: `Sit comfortably. For about two minutes, slowly move your attention through your body — feet, legs, belly, chest, shoulders, face — noticing each part as you arrive, without changing anything.`,
        practice: `Then measure, carrying that head-to-toe body awareness with you. Notice whether scanning your body first changes how present you feel at the wheel.`,
        reflectionPrompt: `Did a slow body scan beforehand change how present you felt while measuring?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd2', title: `Loosening the Shoulders`,
        intro: `We carry the whole day in our shoulders without noticing — they slowly creep up toward the ears. A few slow shoulder rolls, and the body quietly reports just how much it was holding. Today you listen to that.`,
        task: `For about two minutes, slowly roll your shoulders — up, back, and down — big and unhurried, a few times each direction, then let them rest heavy and low.`,
        practice: `Measure afterward, noticing how your shoulders and upper body feel now. Notice whether releasing held tension changes the quality of your attention.`,
        reflectionPrompt: `Did releasing your shoulders change how settled or attentive you felt?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd3', title: `The Weight of the Head`,
        intro: `Your head weighs roughly as much as a bowling ball, balanced all day on a slim neck. Gentle neck movement reminds you how much quiet effort that takes — and how good it feels to ease it. Today you give it that ease.`,
        task: `For two to three minutes, slowly and gently move your neck — ear toward shoulder, chin toward chest, slow easy turns — never forcing, just releasing.`,
        practice: `Measure afterward, attention resting in the released neck and head. Notice whether easing the neck lets your attention settle more easily.`,
        reflectionPrompt: `Did gently easing your neck help your attention settle?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd4', title: `Noticing, Not Exercising`,
        intro: `Across three days the point was never the movement — it was the noticing. The first yogis weren't athletes; they were careful observers of their own bodies and minds. Before you start, predict: will a few minutes of gentle noticing change your measurement?`,
        task: `Combine it: two to three minutes of slow body scan, easy shoulder rolls and gentle neck movement — all as pure noticing, never as a workout. Then settle.`,
        practice: `Measure from that aware, gently-loosened state. Notice how this compares with measuring cold, without any awareness practice first — and whether your prediction held.`,
        reflectionPrompt: `How did measuring after gentle awareness practice compare with measuring cold — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Breath & Movement  (what happens when breath and movement marry)
  // ==========================================================================
  {
    id: 'breath-and-movement',
    topic: 'yoga',
    title: `Breath & Movement`,
    level: 'Beginner',
    cover: 'assets/experiments/breath-and-movement.jpg',
    order: 2,
    summary: `Five days on the quiet heart of yoga: what happens when breath and movement stop being separate and start moving as one. Simple motion, led by the breath, then the wheel.`,
    days: [
      { id: 'd1', title: `Moving With the Breath`,
        intro: `In yoga, movement and breath are wedded — you don't just move, you move on the breath. It's a small shift that changes everything, turning exercise into something closer to meditation. Today you try it.`,
        task: `Sit tall. For about two minutes, raise your arms slowly as you breathe in, and lower them slowly as you breathe out — letting the breath lead the movement, not the other way around.`,
        practice: `Measure afterward, keeping breath and attention gently linked. Notice whether letting the breath lead leaves you calmer than ordinary movement would.`,
        reflectionPrompt: `Did letting your breath lead the movement leave you calmer?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd2', title: `The Cat and the Cow`,
        intro: `One of yoga's oldest gentle movements flows the spine between two shapes — arching and rounding — in time with the breath. It's called cat-cow, and it wakes up the whole back without any strain at all. Today you flow it.`,
        task: `On hands and knees, or seated if easier, for two to three minutes: breathe in and gently arch, lifting your gaze; breathe out and round your back, dropping your head. Slow and smooth, led by the breath.`,
        practice: `Measure afterward, spine awake and breath settled. Notice whether moving the spine with the breath changes how your body feels at rest.`,
        reflectionPrompt: `Did flowing your spine with the breath change how your body felt afterward?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd3', title: `Why Yogis Breathe`,
        intro: `The old texts spend far less time on poses than on breath. The fifteenth-century Hatha Yoga Pradipika devotes itself to pranayama — breath control — because the yogis noticed something simple and powerful: steady the breath, and the mind steadies too. Today you borrow that ancient discovery.`,
        task: `For two to three minutes, do simple seated stretches — reach up, gentle side bends — but make each one slow, smooth and matched to a long, even breath. The breath is the real practice; the stretch just follows it.`,
        practice: `Measure with that slow, even breath continuing. Notice whether steadying the breath also steadies your mind, as the old yogis claimed.`,
        reflectionPrompt: `Did steadying your breath also steady your mind?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd4', title: `Finding Your Rhythm`,
        intro: `Every body has its own natural pace. When movement and breath find a shared rhythm, effort falls away and the practice almost moves itself — like a rower who stops fighting the boat. Today you look for that rhythm.`,
        task: `For about three minutes, repeat one simple movement — arms rising and lowering, or gentle seated twists — with the breath, until the two settle into an easy, repeating rhythm of their own.`,
        practice: `Measure while that rhythm still hums in you. Notice whether finding a breath-and-movement rhythm leaves you more settled than effortful movement does.`,
        reflectionPrompt: `Did finding an easy breath-and-movement rhythm leave you more settled?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd5', title: `Breath as the Thread`,
        intro: `Across these days the breath has been the thread tying everything together — fittingly, the word "yoga" comes from a root meaning "to yoke", to join, and the breath is how movement and mind get joined. Before you start, predict: will a few minutes of breath-led movement change your measurement?`,
        task: `Combine it: about three minutes of simple movement, every motion led by a slow, even breath, until body, breath and attention move as one. Then settle.`,
        practice: `Measure from that joined, breath-led state. Notice how it compares with Day 1 of this topic — and whether your prediction held.`,
        reflectionPrompt: `How did measuring after breath-led movement compare with the start of this topic — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Balance & Stability  (balance is attention made visible)
  // ==========================================================================
  {
    id: 'balance-and-stability',
    topic: 'yoga',
    title: `Balance & Stability`,
    level: 'Intermediate',
    cover: 'assets/experiments/balance-and-stability.jpg',
    order: 3,
    summary: `Five days on why the gentle balance poses teach more than the dramatic strong ones — because balance, it turns out, is simply attention you can see. Balance a little, then measure.`,
    days: [
      { id: 'd1', title: `Standing on One Foot`,
        intro: `Try standing on one foot and watch what happens: the very moment your attention wanders, you wobble. Balance, it turns out, has less to do with strong legs than with steady attention. Today you test that for yourself.`,
        task: `Stand near a wall or chair for safety. For about two minutes, balance on one foot, then the other, simply noticing what your body does to stay upright. Wobbling is completely fine — that's the lesson.`,
        practice: `Measure afterward, attention sharpened by the balancing. Notice whether a couple of minutes of balancing leaves your focus keener.`,
        reflectionPrompt: `Did balancing on one foot leave your attention sharper?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd2', title: `A Thousand Tiny Corrections`,
        intro: `Standing still on one leg looks like doing nothing, but inside, your brain is blending signals from your inner ear, your eyes and sensors in your muscles, firing constant tiny corrections to your ankle and hip. Balance is a furious, hidden act of attention. Today you feel it happening.`,
        task: `For two to three minutes, balance on one foot and try to feel the tiny constant adjustments — the flickers in your ankle, the little sways and catches. Don't try to stop them; just notice them.`,
        practice: `Measure afterward, aware of how much quiet adjusting your body is always doing. Notice whether tuning into your body's micro-corrections changes your attention at the wheel.`,
        reflectionPrompt: `Could you feel the constant tiny corrections your body makes to stay balanced?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd3', title: `The Steady Gaze`,
        intro: `Yogis discovered a trick: fix your eyes on one unmoving point and the whole body steadies. They call it drishti, a focused gaze, and every balance pose has one. Where the eyes settle, the body — and the mind — tend to follow. Today you use it.`,
        task: `Balance on one foot — try Tree Pose, resting the sole of one foot against the other leg — and fix your gaze on a single still point ahead. Hold for two to three minutes, returning your eyes whenever they drift.`,
        practice: `Measure afterward, keeping a soft, steady gaze. Notice whether a fixed point of focus steadies your attention the way it steadied your balance.`,
        reflectionPrompt: `Did a steady gaze point steady your attention as well as your balance?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd4', title: `Falling and Returning`,
        intro: `Here's the real secret of balance: you never actually hold still. You're always tipping slightly and catching yourself — balance is a constant falling-and-returning, exactly the way attention wanders and comes back. The skill isn't never wobbling; it's returning, kindly, each time.`,
        task: `For about three minutes, balance and treat every wobble not as a failure but as a chance to return — gently catch yourself and re-center, over and over, without any frustration.`,
        practice: `Measure afterward, carrying that patient "wobble and return" attitude into your attention. Notice whether treating wandering as normal makes returning easier.`,
        reflectionPrompt: `Did treating each wobble as a chance to return, not a failure, change how it felt?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd5', title: `Balance as Attention`,
        intro: `Across these days you've felt the truth the yogis built whole practices on: balance is attention made visible. A steady body and a steady mind turn out to be the very same skill. Before you start, predict: will a few minutes of balancing change your measurement?`,
        task: `Combine it: about three minutes of balancing on one foot, holding a steady drishti gaze, returning patiently from every wobble. Then settle.`,
        practice: `Measure from that balanced, focused state. Notice how it compares with measuring without the balance practice — and whether your prediction held.`,
        reflectionPrompt: `How did measuring after balance practice compare with measuring without it — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — The Art of Stillness  (why is it so hard to sit still?)
  // ==========================================================================
  {
    id: 'the-art-of-stillness',
    topic: 'yoga',
    title: `The Art of Stillness`,
    level: 'Intermediate',
    cover: 'assets/experiments/the-art-of-stillness.jpg',
    order: 4,
    summary: `Five days on the hardest posture in all of yoga — sitting perfectly still — and what the restlessness it reveals can teach you. A few minutes of stillness, then the wheel.`,
    days: [
      { id: 'd1', title: `The Hardest Pose`,
        intro: `Of all of yoga's postures, the hardest isn't a backbend or a headstand — it's sitting perfectly still. Within seconds an itch appears, a leg wants to shift, the body quietly begs to move. Today you meet that restlessness head-on.`,
        task: `Sit comfortably and, for about two minutes, simply don't move. When the urge to fidget, scratch or shift arrives — and it will — just notice it, and stay still anyway.`,
        practice: `Measure afterward, holding that same stillness. Notice how strong the urge to move really is once you decide not to.`,
        reflectionPrompt: `How strong was the urge to move once you decided to stay perfectly still?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd2', title: `Why the Yogis Sat`,
        intro: `For thousands of years, yogis sat motionless for hours — not as punishment, but because they had discovered that when the body grows still, the mind slowly follows. Stillness was the doorway, not the goal. Today you crack that door open.`,
        task: `Sit still for two to three minutes, and each time the body settles a little deeper, notice whether the mind quietens too — testing the old yogic claim for yourself.`,
        practice: `Measure while holding that settled stillness. Notice whether a still body really does let the mind grow quieter.`,
        reflectionPrompt: `As your body grew still, did your mind grow quieter too?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd3', title: `The Restless Mind`,
        intro: `When the body finally stops, you notice the other restlessness — the mind's. Thoughts the day's busyness kept hidden suddenly get loud. This isn't failure; it's the first time you're really hearing how active the mind has been all along. Today you listen.`,
        task: `Sit still for two to three minutes and turn your attention to the mind's activity — the thoughts, plans and jumps — simply watching them arrive and go, without chasing or stopping them.`,
        practice: `Measure while watching the mind from that still seat. Notice how busy the mind turns out to be once the body stops distracting you from it.`,
        reflectionPrompt: `Once your body was still, how busy did your mind turn out to be?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd4', title: `A Single Point`,
        intro: `One classic yogic remedy for a restless mind is trataka — resting the gaze softly on a single point, such as a candle flame, until the mind grows quiet around it. Giving the restlessness one place to settle works better than fighting it. Today you try it.`,
        task: `Place one small object or point in front of you — a candle, a dot on the wall, a small mark. For two to three minutes, rest a soft, steady gaze on it, returning gently whenever you drift.`,
        practice: `Measure while keeping that quiet, single-pointed attention. Notice whether giving the mind one point to rest on calms the restlessness.`,
        reflectionPrompt: `Did resting your gaze on a single point calm your restless mind?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd5', title: `Comfortable Stillness`,
        intro: `Patanjali's whole definition of a posture was just two words: steady and comfortable. Across these days you've found that stillness isn't rigid holding — it's a relaxed, alert settledness the body can actually rest in. Before you start, predict: will a few minutes of stillness change your measurement?`,
        task: `Sit for about three minutes in stillness that is both steady and comfortable — alert but at ease, neither rigid nor slumping — letting body and mind settle together. Then begin.`,
        practice: `Measure from that steady, comfortable stillness. Notice how it compares with the restless start of this topic — and whether your prediction held.`,
        reflectionPrompt: `How did comfortable stillness compare with the restlessness you started with — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Yoga Beyond Postures  (the deeper goal: a quiet mind)
  //  The culmination — closing feeling: "the body was only ever the doorway."
  // ==========================================================================
  {
    id: 'yoga-beyond-postures',
    topic: 'yoga',
    title: `Yoga Beyond Postures`,
    level: 'Advanced',
    cover: 'assets/experiments/yoga-beyond-postures.jpg',
    order: 5,
    summary: `Five days on the part of yoga the cameras never show — its real, ancient goal. Why did people practise this for thousands of years? Gentle practice, then the wheel, then the bigger picture.`,
    days: [
      { id: 'd1', title: `Only One of Eight`,
        intro: `The poses everyone pictures as "yoga" are, in the original system, just one of eight parts. Patanjali laid out eight limbs — ethics, breath, the senses, concentration, meditation and more — and physical posture was a single rung on a tall ladder. Today you glimpse the bigger picture.`,
        task: `Before measuring, do two to three minutes of any gentle movement or stretch you've learned so far — but hold in mind that this posture is only one small limb of a much larger practice.`,
        practice: `Measure afterward, sensing yourself as part of something larger than the poses. Notice whether seeing posture as just one piece changes how you approach it.`,
        reflectionPrompt: `Did realising posture is just one of yoga's eight limbs change how you saw the practice?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd2', title: `What Yoga Actually Meant`,
        intro: `Here is the sentence that defines the whole tradition. Around two thousand years ago, Patanjali wrote that yoga is "the stilling of the fluctuations of the mind". Not stretching, not fitness — a quiet mind. Everything else, the poses included, was only ever preparation for that. Today you aim straight at it.`,
        task: `Do a minute or two of gentle movement to settle the body, then sit and spend the rest simply aiming at a quieter mind — the real target of all yoga.`,
        practice: `Measure while reaching, gently, for that stilling of the mind's chatter. Notice whether approaching the practice as "quieting the mind" feels different from approaching it as exercise.`,
        reflectionPrompt: `Did aiming for a quiet mind, rather than a stretch, change the whole practice for you?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
      { id: 'd3', title: `The Yoga on Your Screen Is New`,
        intro: `Here's a genuine surprise: the athletic, posture-heavy yoga all over social media is barely a century old. Scholars like Mark Singleton have shown it was shaped in the early 1900s by blending older yoga with Western gymnastics. The ancient practice was far quieter and far more inward. Today you practise the older way.`,
        task: `Skip anything athletic. For two to three minutes do only the gentlest movement and breath, then grow still — much closer to how yoga was actually practised for most of its long history.`,
        practice: `Measure from that quiet, inward, old-style practice. Notice whether the slower, gentler version reaches something the athletic kind might miss.`,
        reflectionPrompt: `Did a quieter, gentler practice reach something a workout-style one might miss?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd4', title: `Concentration Becomes Meditation`,
        intro: `Deep in Patanjali's ladder sit two neighbouring rungs: dharana, holding attention on one thing, and dhyana, the moment that holding becomes effortless and turns into meditation. The first you do; the second happens to you. Today you walk from one toward the other.`,
        task: `Settle, then for three to four minutes hold your attention on one simple thing — the breath, a point, a sensation — returning each time it slips, until holding it starts to feel less like effort.`,
        practice: `Measure while resting in that gathered attention. Notice whether concentration, held long enough, ever softens into something more effortless.`,
        reflectionPrompt: `Did holding your attention long enough ever start to feel effortless rather than forced?`,
        practiceMinutes: 4,
        measureSeconds: 210 },
      { id: 'd5', title: `The Real Practice`,
        intro: `Across this whole topic you've moved, breathed, balanced and grown still — and discovered that none of it was really about the body. The body was always the doorway; the real practice was attention, awareness, a quiet mind. That is what people have sought in yoga for thousands of years. Before you start, predict, then practise it whole.`,
        task: `Bring it together: a few minutes of gentle, breath-led movement to settle, then stillness and gathered attention — the body as the doorway, the quiet mind as the room you step into. Then measure.`,
        practice: `Measure from that complete, quiet practice. Notice what feels most different now about yoga — and about your own attention — from when you began, and whether your prediction held.`,
        reflectionPrompt: `After this whole journey, what do you understand about yoga — and your own attention — that you didn't before?`,
        practiceMinutes: 4,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  REIKI TOPIC
  //  Frame: the CALMEST topic — presence. If Telekinesis's rule was "don't
  //  prove", Reiki's rule is "DON'T HEAL". Big question: why do millions
  //  practise Reiki worldwide? About ATTENTION, PRESENCE, INTENTION, CONNECTION
  //  — never treating disease, diagnosis or cures. LESS science (no lab /
  //  statistics), MORE human story, origin story and first-person experience.
  //  AVOID: healing diseases, cures, medical claims, miracle stories. Real
  //  sources, lightly worn: Mikao Usui (1922, Mount Kurama), the five precepts
  //  (Gokai), Chujiro Hayashi, Hawayo Takata (Reiki to the West), Carl Rogers &
  //  high-quality listening, the Penfield homunculus, mudras & laying-on-of-
  //  hands across cultures. The wheel asks: "is it a different experience to
  //  measure after a few minutes of giving full presence — to yourself or
  //  someone else?". FIRST topic with optional SOLO / WITH A PARTNER versions
  //  (esp. experiment 4) — fits the Session & Human Connection direction and a
  //  future "Partner Experiments" category. Distinct from Energy Healing (which
  //  was research-y: oxytocin / Harlow / Holt-Lunstad / Hawthorne / placebo /
  //  Tronick) — here it is the SPECIFIC practice's story, presence and
  //  phenomenology. Most days carry practiceMinutes. Closing feeling: "whatever
  //  Reiki is, giving and receiving full presence is real and worth something."
  // ##########################################################################

  // ==========================================================================
  //  1 — The Origins of Reiki  (a surprisingly young, very human story)
  // ==========================================================================
  {
    id: 'the-origins-of-reiki',
    topic: 'reiki',
    title: `The Origins of Reiki`,
    level: 'Beginner',
    cover: 'assets/experiments/the-origins-of-reiki.jpg',
    order: 1,
    summary: `Four short days on a surprising story: where Reiki actually came from, who created it, and how a quiet Japanese practice travelled the world — far more recent, and more human, than most people assume.`,
    days: [
      { id: 'd1', title: `A Surprisingly Young Tradition`,
        intro: `Most people assume Reiki is ancient — thousands of years old, lost in the mists of time. In fact it was created just over a century ago, in 1922, by a single Japanese man named Mikao Usui. It has a real founder, a real beginning, and a documented history. Today you start right at the source.`,
        task: `Before measuring, simply sit with that surprise — that a practice now used worldwide is barely a hundred years old, with one identifiable person behind it. Carry that curiosity to the wheel.`,
        practice: `Measure with a curious, open mind toward this young tradition. Notice what it's like to approach something as recent human history rather than ancient mystery.`,
        reflectionPrompt: `Did learning Reiki is barely a century old change how you think about it?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Mountain`,
        intro: `The story goes that in 1922, Mikao Usui climbed Mount Kurama, a sacred mountain near Kyoto, and spent twenty-one days fasting and meditating in search of insight. He described a moment when a great light seemed to enter him — and he named the experience "Reiki", joining two Japanese words: rei, spirit, and ki, life energy. Whatever happened on that mountain, it began everything. Today you borrow a sliver of that stillness.`,
        task: `Find a quiet spot and sit for about two minutes in deliberate stillness, as Usui did on his mountain — no goal, just quiet attention. Then come to the wheel.`,
        practice: `Measure carrying that mountain-quiet with you. Notice whether beginning with a few minutes of stillness changes how the measurement feels.`,
        reflectionPrompt: `Did beginning with a few minutes of deliberate stillness change the measurement?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd3', title: `Just for Today`,
        intro: `At the heart of what Usui taught were not techniques but five simple precepts, recited morning and evening: "Just for today, do not be angry. Do not worry. Be grateful. Work honestly. Be kind to every living thing." He said Reiki was half energy and half these principles. Notice how gentle they are — and that they ask only for today. Today you try one.`,
        task: `Choose one precept — not angry, not worried, grateful, honest, or kind — and hold it lightly for a couple of minutes as your intention, "just for today". Then settle at the wheel.`,
        practice: `Measure while quietly holding your chosen precept. Notice whether carrying a simple, kind intention changes your inner state.`,
        reflectionPrompt: `Did holding one gentle precept "just for today" change how you felt?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd4', title: `Around the World`,
        intro: `Reiki might have stayed in Japan if not for Hawayo Takata, a Japanese-American woman who learned it in the 1930s and carried it home to Hawaii, then to the American mainland. From her, it spread across the world — today it's practised by enormous numbers of people and offered, for comfort and calm, in hundreds of hospitals. A mountain near Kyoto, and now the whole globe. Before you start, predict: will knowing this human story change how you measure?`,
        task: `Bring the whole journey to mind — one man, one mountain, one woman who carried it across an ocean, and millions of quiet hands since. Then measure as one more person in that long line.`,
        practice: `Measure feeling yourself part of a century-long, worldwide human story. Notice whether sensing that lineage changes the experience — and whether your prediction held.`,
        reflectionPrompt: `Did feeling part of Reiki's worldwide human story change the measurement — and was your prediction right?`,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — The Power of Presence  (the quietest, most underrated human gift)
  // ==========================================================================
  {
    id: 'the-power-of-presence',
    topic: 'reiki',
    title: `The Power of Presence`,
    level: 'Beginner',
    cover: 'assets/experiments/the-power-of-presence.jpg',
    order: 2,
    summary: `Five days on the quietest and most underrated human gift: being fully present with someone — or yourself. No technique, no doing, just complete, kind attention, then the wheel.`,
    days: [
      { id: 'd1', title: `Fully Present`,
        intro: `Think of the rare feeling of someone being completely present with you — no phone, no glancing away, not just waiting for their turn to speak. It's surprisingly uncommon, and unmistakable when it happens. Reiki, stripped of everything else, is largely this: full presence. Today you give it to yourself.`,
        task: `For about two minutes before measuring, give yourself your own complete, undistracted attention — just being fully here with yourself, the way a good friend would sit with you. Then begin.`,
        practice: `Measure from that state of full self-presence. Notice whether giving yourself complete attention first changes how the session feels.`,
        reflectionPrompt: `Did giving yourself a few minutes of full presence change the measurement?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd2', title: `The Listener Who Changes You`,
        intro: `The psychologist Carl Rogers spent his life on a quiet discovery: that being met with warm, non-judgmental attention — what he called unconditional positive regard — lets people relax and open in a way nothing else does. Modern research agrees: simply being truly listened to measurably lifts wellbeing. Presence isn't passive; it changes people. Today you offer yourself that quality of attention.`,
        task: `For about two minutes, attend to yourself the way Rogers described a good listener — warmly, without judging, simply allowing whatever is there. No fixing, just kind attention. Then settle.`,
        practice: `Measure while holding that warm, non-judgmental attention toward yourself. Notice whether being met kindly, even by yourself, settles something.`,
        reflectionPrompt: `Did meeting yourself with warm, non-judgmental attention settle something?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd3', title: `The Gift of Doing Nothing`,
        intro: `Presence is strange because it isn't doing anything — there's no task, no technique, nothing to achieve. It's purely a quality of attention. That makes it both the simplest thing in the world and, for busy minds, one of the hardest. Today you practise the art of simply being here.`,
        task: `For about two minutes, do absolutely nothing but be present — not meditating toward a goal, not relaxing on purpose, just here, attentive, with no task at all. Then come to the wheel.`,
        practice: `Measure while continuing to simply be present, with nothing to do. Notice how it feels to value attention itself, rather than any action.`,
        reflectionPrompt: `What was it like to offer pure presence, with nothing to do or achieve?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd4', title: `Presence Without Words`,
        intro: `Some of the deepest presence happens in silence — sitting with someone you love and saying nothing, yet feeling completely together. Words can even get in the way. Reiki is almost always wordless, and so is today's practice. Today you let silence do the work.`,
        task: `For two to three minutes, rest in deliberate, attentive silence — no inner commentary, no planning, just quiet presence. If words arise in your mind, let them pass. Then measure.`,
        practice: `Measure from that wordless, present silence. Notice whether presence without words feels different from your usual busy quiet.`,
        reflectionPrompt: `Did wordless, attentive silence feel different from your usual quiet?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd5', title: `Present With Yourself`,
        intro: `Across these days you've met full presence, warm attention, the gift of doing nothing, and the depth of silence. None of it required any technique — only the willingness to truly be here. Before you start, predict: will a few minutes of full presence change your measurement compared with diving straight in?`,
        task: `Give yourself three unhurried minutes of complete, kind, wordless presence — everything you've practised this week, gathered into one quiet sitting. Then measure.`,
        practice: `Measure from that full, gathered presence. Notice how it compares with measuring cold at the start of this topic — and whether your prediction held.`,
        reflectionPrompt: `How did measuring after full presence compare with the start of this topic — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Hands & Awareness  (why humans everywhere give the hands meaning)
  // ==========================================================================
  {
    id: 'hands-and-awareness',
    topic: 'reiki',
    title: `Hands & Awareness`,
    level: 'Intermediate',
    cover: 'assets/experiments/hands-and-awareness.jpg',
    order: 3,
    summary: `Five days on a question almost no one asks: why do humans everywhere use their hands to bless, greet, pray and care? A gentle look at the most expressive, sensitive instruments we own.`,
    days: [
      { id: 'd1', title: `Why Hands?`,
        intro: `Notice how often the hands carry meaning: a blessing, a handshake, hands pressed together in prayer, a palm laid gently on a shoulder. Nearly every culture and tradition gives the hands a special role, and Reiki does too. Before exploring why, today you simply notice your own hands as if for the first time.`,
        task: `Before measuring, look at your hands as though you'd never seen them — their lines, their movement, their constant quiet usefulness. Then rest them, still, and come to the wheel.`,
        practice: `Measure with a fresh awareness of your hands resting quietly. Notice how it feels to give attention to a part of you that usually just works, unnoticed.`,
        reflectionPrompt: `What did you notice about your hands when you really looked at them?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Brain's Map`,
        intro: `There's a reason hands feel so expressive: in the brain's map of the body, the hands take up a huge, disproportionate share — far more than their size suggests. Drawn to scale, this "homunculus" has enormous hands, because so much of our sensation and fine control lives there. Your hands are among the most attention-rich instruments you own. Today you feel that richness.`,
        task: `For about two minutes, rest your full attention in your hands — the subtle warmth, tingling, pulse and aliveness in the palms and fingertips. Just feel, in detail, what's already there. Then measure.`,
        practice: `Measure while keeping a quiet awareness in your hands. Notice how much sensation your hands hold once you actually pay attention to them.`,
        reflectionPrompt: `How much could you feel in your hands once you gave them full attention?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd3', title: `Gestures Across the World`,
        intro: `Humans have always spoken with their hands. Buddhist and Hindu statues hold precise mudras — gestures meaning peace, fearlessness, teaching. Priests bless with the laying on of hands; San healers of southern Africa lay hands to draw out sickness. Across unconnected cultures, the hand became a vessel for intention. Today you join that very old habit.`,
        task: `Choose a simple, deliberate hand position — palms together, palms open and upturned, or one hand resting over the heart — and hold it for about two minutes as a gesture of calm intention. Then settle at the wheel.`,
        practice: `Measure while holding your chosen gesture, or letting your hands rest from it. Notice whether giving your hands a deliberate, meaningful position changes your state.`,
        reflectionPrompt: `Did holding a deliberate, meaningful hand gesture change how you felt?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd4', title: `Feeling Through the Hands`,
        intro: `Hold your palms a few centimetres apart and many people report something — warmth, a faint buzz, a sense of pressure between the hands. We won't claim what it is; the interesting part is simply how much your hands can sense when you ask them to. Today you explore that sensitivity with an open, honest mind.`,
        task: `For two to three minutes, slowly bring your palms close together, almost touching, and explore whatever you can feel between and within them — warmth, tingling, texture — without deciding in advance what it means. Then measure.`,
        practice: `Measure while keeping that fine attention in your hands. Notice, honestly, what you actually sense — and what you might be expecting to sense.`,
        reflectionPrompt: `What did you honestly feel between your hands — and how much was sensation versus expectation?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd5', title: `Hands and Attention`,
        intro: `Across these days you've rediscovered your hands, felt their richness, borrowed the world's gestures, and explored what they can sense. The thread is simple: the hands are a powerful place to focus attention — which is exactly why so many traditions use them. Before you start, predict: will a few minutes of hand-focused attention change your measurement?`,
        task: `Bring it together: about three minutes resting full, calm attention in your hands — held in a gesture or simply open — as a focus for presence. Then measure.`,
        practice: `Measure from that hand-focused, present state. Notice how it compares with an ordinary measurement — and whether your prediction held.`,
        reflectionPrompt: `Did focusing attention through your hands change the measurement — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Giving & Receiving  (the two halves of care; SOLO / WITH A PARTNER)
  // ==========================================================================
  {
    id: 'giving-and-receiving',
    topic: 'reiki',
    title: `Giving & Receiving`,
    level: 'Intermediate',
    cover: 'assets/experiments/giving-and-receiving.jpg',
    order: 4,
    summary: `Five days on the two halves of every caring exchange — giving attention and receiving it — with both a solo version and an optional partner version each day. This is where Reiki meets real connection.`,
    days: [
      { id: 'd1', title: `Two Roles`,
        intro: `Every act of care has two sides: someone gives attention, and someone receives it. Most of us are far more practised at one than the other — quick to help but awkward to be helped, or the reverse. Reiki is built around this giving and receiving. Today you notice which role feels familiar.`,
        task: `Solo: for about two minutes, alternate — first give yourself calm attention, then let yourself simply receive it — and notice which feels easier. With a partner: decide who gives and who receives first, and sit together quietly for two minutes. Then measure.`,
        practice: `Measure afterward, noticing which role — giving or receiving — felt more natural to you. Notice the difference between the two.`,
        reflectionPrompt: `Which felt more natural to you — giving attention or receiving it?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd2', title: `Receiving`,
        intro: `Being on the receiving end of someone's calm, full attention — with nothing asked of you in return — is surprisingly rare, and surprisingly affecting. Many people find it harder to receive than to give. Today you practise simply receiving.`,
        task: `Solo: for two to three minutes, vividly recall or imagine being held in someone's warm, complete attention, and let yourself fully receive it. With a partner: be the receiver — sit quietly while your partner offers you calm, silent attention. Then measure.`,
        practice: `Measure while still in the receiver's seat. Notice what it feels like to simply be given attention, with nothing to do in return.`,
        reflectionPrompt: `What was it like to simply receive attention, asking nothing of yourself?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd3', title: `Giving`,
        intro: `Here's something research on listening keeps finding: the giver often benefits as much as the receiver. Offering someone your full, calm attention tends to settle you, too — generosity with presence runs both ways. Today you sit on the giving side.`,
        task: `Solo: for two to three minutes, hold someone you care about in mind and quietly send them calm, warm attention. With a partner: be the giver — offer your partner steady, silent, caring attention, asking nothing back. Then measure.`,
        practice: `Measure while still giving that calm attention. Notice whether offering presence to another settles something in you, too.`,
        reflectionPrompt: `Did offering calm attention to someone else change how you felt?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd4', title: `The Exchange`,
        intro: `When giving and receiving flow back and forth — each person taking both roles — something settles in everyone involved. The exchange itself, not either half alone, seems to be where the warmth lives. Today you let it flow both ways.`,
        task: `Solo: for about three minutes, gently alternate between giving yourself attention and receiving it, letting the two flow into each other. With a partner: take turns — a couple of minutes giving, then swap — so you each both give and receive. Then measure.`,
        practice: `Measure afterward, holding the sense of that back-and-forth exchange. Notice whether moving through both roles feels different from staying in just one.`,
        reflectionPrompt: `Did experiencing both giving and receiving feel different from just one role?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd5', title: `Together or Alone`,
        intro: `Across these days you've found your familiar role, practised receiving, practised giving, and let them flow together. Whether alone or with another person, the heart of it is the same: full, caring attention, freely given and openly received. Before you start, predict: will a giving-and-receiving practice change your measurement? Then choose your version.`,
        task: `Solo: three minutes of calm attention flowing between giving to yourself and receiving from a remembered connection. With a partner: three minutes of shared, alternating giving and receiving in quiet presence. Then measure.`,
        practice: `Measure from that full exchange of presence. Notice how it compares with an ordinary, unconnected measurement — and whether your prediction held.`,
        reflectionPrompt: `How did measuring after giving and receiving presence compare with an ordinary one — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — The Reiki Experience  (not "is it true?" but "what do you observe?")
  //  The culmination — neutral phenomenology; never a healing claim.
  // ==========================================================================
  {
    id: 'the-reiki-experience',
    topic: 'reiki',
    title: `The Reiki Experience`,
    level: 'Advanced',
    cover: 'assets/experiments/the-reiki-experience.jpg',
    order: 5,
    summary: `Five days on the honest question at the centre of it all: not "is Reiki true?" but "what do people actually experience — and what can you observe in yourself?" Curiosity, not conclusions.`,
    days: [
      { id: 'd1', title: `What People Report`,
        intro: `Ask people what they feel during Reiki and the answers vary widely: warmth, tingling in the hands, a deep calm, a floating heaviness — and sometimes nothing much at all. We're not here to decide who's right or what it "really" is. We're here for the more interesting question: what do people actually experience? Today you stay curious.`,
        task: `Before measuring, set aside any verdict — believer or skeptic — and adopt the stance of a curious observer of human experience. Carry that open neutrality to the wheel.`,
        practice: `Measure as a neutral, curious observer rather than someone trying to prove or disprove anything. Notice how that open stance feels compared with needing an answer.`,
        reflectionPrompt: `What was it like to stay genuinely curious, rather than for or against?`,
        measureSeconds: 150 },
      { id: 'd2', title: `Your Own Report`,
        intro: `The only experience you can truly study is your own. So today you become both the practitioner and the observer: you'll spend a few quiet minutes in presence and gentle hand attention, then report — honestly — what you actually noticed, whatever it was.`,
        task: `For about three minutes, sit in calm presence with your hands resting open or near your body, then simply observe what you feel — warmth, tingling, calm, restlessness, or nothing in particular. There's no right answer. Then measure.`,
        practice: `Measure while honestly noting your own experience, without inflating or dismissing it. Notice what you genuinely felt, as plainly as you can.`,
        reflectionPrompt: `What did you genuinely notice — honestly, without adding to or subtracting from it?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
      { id: 'd3', title: `Expectation and Experience`,
        intro: `Here's an honest complication worth holding: what we expect to feel shapes what we do feel. If you expect warmth, warmth is more likely to appear. This doesn't make an experience fake — your experience is real either way — but it keeps us honest and curious about where our sensations come from. Today you watch both at once.`,
        task: `For about three minutes, sit in quiet presence — but this time notice your expectations alongside your sensations: what did you anticipate feeling, and what actually arrived? Then measure.`,
        practice: `Measure while holding both your expectations and your actual experience side by side. Notice how much of what you feel might be shaped by what you expected.`,
        reflectionPrompt: `How much of what you felt seemed shaped by what you expected to feel?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd4', title: `The Calm That Remains`,
        intro: `Whatever else people disagree about, one thing comes up again and again in Reiki accounts: a calm that lingers afterward. You don't need to explain it to notice it — and noticing the aftereffect is its own honest experiment. Today you look for what remains.`,
        task: `For three to four minutes, give yourself a full, quiet practice of presence and hand attention — then stop, and simply notice the state you're left in. Then measure from there.`,
        practice: `Measure in the quiet that follows the practice. Notice whether any calm or shift lingers afterward — and how long it stays.`,
        reflectionPrompt: `Did any calm or change linger after the practice — and what was it like?`,
        practiceMinutes: 4,
        measureSeconds: 210 },
      { id: 'd5', title: `What You Observed`,
        intro: `Across this whole topic you've met Reiki's young history, its precepts, the power of presence, the language of hands, and the dance of giving and receiving. Through all of it we never asked whether Reiki is "true" — only what you could honestly observe. Before you start, predict, then gather everything into one last honest session. Whatever you conclude, the presence and the care were real.`,
        task: `Bring it together: a few quiet minutes of full presence, hands and calm intention — toward yourself, or with a partner, between you — then settle and measure.`,
        practice: `Measure from that complete, present state. Notice what, across this whole topic, you actually observed in your own experience — and whether your prediction held.`,
        reflectionPrompt: `After all this, what did you honestly observe in your own experience — and what feels worth keeping?`,
        practiceMinutes: 4,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  AURA TOPIC
  //  Frame: like Telekinesis / Reiki / Psi — NOT "learn to see auras". Big
  //  question: why have people for centuries spoken of an "energy field" around
  //  humans — what did they actually see and experience? About PERCEPTION,
  //  ATTENTION, human experience and culture. NOT aura reading / diagnosis /
  //  colour meanings (those appear only as a CULTURAL artefact, never as fact).
  //  Strong because the same idea recurs across cultures (aura, light body,
  //  halo, prana, qi, vitality). LEAN on real perception science + cultural
  //  history, demystifying respectfully (never sneering). FRESH sources, NOT
  //  repeating Intuition's thin-slicing or Telekinesis's "sense of being
  //  stared at": Troxler fading & complementary afterimages (a mundane reason a
  //  steadily-watched person can seem to glow), the halo/nimbus across cultures,
  //  Ekman's microexpressions & nonverbal leakage, the cross-cultural life-force
  //  words (qi/prana/ki/pneuma/ruach — many literally meaning "breath"), Kirlian
  //  photography (electrical, demystified) and synesthesia (some people really
  //  do see colours around people — neurology, not woo), plus the modern term's
  //  Theosophy origin. The wheel asks: "do you measure differently after a few
  //  minutes attending to a person's presence, or your own vitality?" — an
  //  observing instrument. Suggested arc placement (Csaba): Energy Healing ->
  //  Reiki -> Aura -> Human Connection -> Intuition (a full library reorder is a
  //  separate, optional step). Closing ending stays OPEN: "what did you observe?"
  // ##########################################################################

  // ==========================================================================
  //  1 — Seeing More Than We Notice  (the eye is not a camera)
  // ==========================================================================
  {
    id: 'seeing-more-than-we-notice',
    topic: 'aura',
    title: `Seeing More Than We Notice`,
    level: 'Beginner',
    cover: 'assets/experiments/seeing-more-than-we-notice.jpg',
    order: 1,
    summary: `Four short days on a surprise about your own eyes: how much you actually see, how much your brain quietly invents, and why a steadily-watched person can seem to shimmer or glow.`,
    days: [
      { id: 'd1', title: `The Edges of Sight`,
        intro: `Your sharp, detailed vision is tiny — only a thumbnail's width at arm's length. Everything else, the whole wide world at the edges, is vague, colour-poor and mostly guessed at by the brain. We almost never notice this, because attention darts to fill the gaps. Today you explore the edges of your own sight.`,
        task: `Fix your eyes softly on one point ahead, and for about two minutes, without moving them, become aware of how much sits in your peripheral vision — and how blurry and uncertain it really is out there.`,
        practice: `Measure while keeping that soft, wide awareness of the visual edges. Notice how much of what surrounds you is sensed only vaguely, at the rim of sight.`,
        reflectionPrompt: `How much of the world around you turned out to be vague and uncertain at the edges of sight?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd2', title: `When Things Fade`,
        intro: `Here's a strange, real quirk of the eye: if you hold your gaze perfectly still and attend to the edges, stationary things there begin to fade and vanish — the brain stops bothering with what doesn't change. It's called Troxler's fading, and only the eye's constant tiny movements normally keep the world from dissolving. It's also one honest reason a steadily-watched person's outline can seem to shimmer or shift.`,
        task: `Fix your gaze on a single point and hold it as still as you can for a couple of minutes, paying attention to whether things at the edges dim, blur or fade. Don't force anything; just watch what your own vision does.`,
        practice: `Measure while continuing that steady, unmoving gaze. Notice whether parts of your visual field fade or change the longer you hold still.`,
        reflectionPrompt: `Did anything at the edges of your vision fade or shift when you held your gaze still?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd3', title: `The Ghost the Eye Paints`,
        intro: `Stare at a bright colour for a while, then look at a plain white wall, and a glowing patch appears in the opposite colour — a green spot becomes pink, a red one becomes cyan. The eye itself paints these "afterimages"; nothing is really there. Look steadily at a person against a plain background and the same effect can lay a faint coloured glow along their edge. The eye, it turns out, can paint a halo all on its own.`,
        task: `Try it: rest your eyes on something colourful for thirty seconds or so, then look at a blank pale surface and watch the afterimage bloom and fade. Do this a couple of times before you settle.`,
        practice: `Measure while remembering that your eye can generate colour and glow with nothing physically there. Notice how convincing these self-made images can be.`,
        reflectionPrompt: `How real did the eye's self-made afterimage glow seem, even though nothing was there?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd4', title: `What the Eye Adds`,
        intro: `Across three days you've found that vision is vague at the edges, that steady things fade, and that the eye paints glows of its own. The lesson isn't that people are fooling themselves — it's that seeing is far stranger and more creative than we assume. Before you start, predict: will paying attention to how you see change the measurement?`,
        task: `Settle and simply look — at the wheel, the room, your own hands — with fresh awareness that your eye is not a passive camera but an active, inventive organ. Then measure.`,
        practice: `Measure while holding that awareness of how much your eye and brain add to what you see. Notice whether knowing this changes how you trust your own seeing — and whether your prediction held.`,
        reflectionPrompt: `Did realising how much your eye adds change how you trust what you see — and was your prediction right?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Light Around People  (the halo motif across cultures)
  // ==========================================================================
  {
    id: 'light-around-people',
    topic: 'aura',
    title: `Light Around People`,
    level: 'Beginner',
    cover: 'assets/experiments/light-around-people.jpg',
    order: 2,
    summary: `Five days on a striking pattern in human art: across cultures that never met, people painted light around their holiest and most vital figures. Why does this same image keep appearing?`,
    days: [
      { id: 'd1', title: `The Glow of the Sacred`,
        intro: `Look at sacred art from almost anywhere and you'll find the same thing: a ring or glow of light around the head or body of holy and powerful figures. We call it a halo, and it's so familiar we forget how strange it is that cultures everywhere, independently, reached for the very same image. Today you begin noticing it.`,
        task: `Before measuring, picture a few images of light around a figure — a saint's halo, a glowing Buddha, a radiant icon — and simply hold the curiosity of why this image is so universal. Then settle.`,
        practice: `Measure while holding that sense of a very old, very widespread human image. Notice what it stirs to sit with something so many cultures arrived at on their own.`,
        reflectionPrompt: `What did it stir to consider how universal the image of light-around-a-person really is?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Halos East and West`,
        intro: `The halo is everywhere. Christian saints wear golden rings; Buddhist figures sit before flaming aureoles; Hindu deities glow within a prabhamandala, a circle of light; Persian Zoroastrian kings carried the khvarenah, a god-given radiance; even ancient Egyptian and Greek art used it. Different worlds, the same instinct: mark the special with light. Today you stand in that long tradition.`,
        task: `Before measuring, choose one of these images that appeals to you and hold it in mind — the golden ring, the flames, the circle of light. Let it be a focus, the way a painter once did. Then settle at the wheel.`,
        practice: `Measure while holding that single image of radiance. Notice whether dwelling on this ancient, shared symbol changes anything in your state.`,
        reflectionPrompt: `Did focusing on an age-old image of radiance change how you felt?`,
        measureSeconds: 150 },
      { id: 'd3', title: `Light as Meaning`,
        intro: `Maybe the halo isn't mysterious at all — maybe it's meaning made visible. Across every language, light stands for life and goodness: we "brighten up", have a "bright" idea, call someone a "shining" example, fear the "dark". Painting light around a revered figure may simply be showing, in pictures, what we already feel in words. Today you notice light-as-meaning.`,
        task: `For a couple of minutes before measuring, notice how naturally your mind links light with good, alive and uplifted states — and darkness with the opposite. Just observe the link. Then begin.`,
        practice: `Measure while aware of that deep link between light and aliveness in your own mind. Notice how automatic the connection between light and vitality really is.`,
        reflectionPrompt: `How automatic was the link in your mind between light and being alive or well?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd4', title: `The Light You Project`,
        intro: `We use the same language for living people every day: someone is "radiant" with health, "glowing" with happiness, "lit up" when they talk about what they love — or "dimmed" and "grey" when low. Long before any theory of auras, humans described each other in light. Today you notice that in yourself.`,
        task: `Before measuring, recall a time you felt genuinely "lit up" — alive, warm, bright — and let a little of that quality return now. Carry it to the wheel.`,
        practice: `Measure while holding that felt sense of your own "brightness" or vitality. Notice whether deliberately summoning that lit-up quality changes your inner state.`,
        reflectionPrompt: `Did summoning your own "lit-up" quality change how you felt while measuring?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd5', title: `Radiance`,
        intro: `Across these days you've met the universal halo, traced it East and West, seen light stand for life itself, and felt your own "glow". Whatever the halo is, it sits at the meeting point of perception, meaning and culture — which is far richer than any single explanation. Before you start, predict: will attending to a sense of radiance change your measurement?`,
        task: `Settle, and hold a quiet sense of radiance — your own vitality, or the warm image of light around a person — without straining for anything. Then measure.`,
        practice: `Measure while resting in that sense of radiance. Notice how it compares with an ordinary measurement — and whether your prediction held.`,
        reflectionPrompt: `Did attending to a sense of radiance change the measurement — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Attention & Presence  (we read others without words)
  // ==========================================================================
  {
    id: 'attention-and-presence',
    topic: 'aura',
    title: `Attention & Presence`,
    level: 'Intermediate',
    cover: 'assets/experiments/attention-and-presence.jpg',
    order: 3,
    summary: `Five days on a real, everyday kind of perception that can feel almost psychic: how much we pick up about another person's state — their mood, their energy — without a single word being spoken.`,
    days: [
      { id: 'd1', title: `Reading Without Words`,
        intro: `A friend walks in and you know, instantly, that something's wrong — before they speak, before you could say how you know. We read each other constantly through a thousand silent signals, and we're remarkably good at it. Some of what people call sensing someone's "energy" may be exactly this. Today you tune that antenna.`,
        task: `Before measuring, bring to mind one person and their current mood or state, sensing it as fully as you can without words. Then carry that attentive, reading attitude to the wheel.`,
        practice: `Measure while holding a wordless sense of another person's state. Notice how much you seem to know about someone without anything being said.`,
        reflectionPrompt: `How much did you seem to sense about another person without a single word?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd2', title: `Faster Than a Blink`,
        intro: `True feelings leak. The psychologist Paul Ekman documented "microexpressions" — flickers of real emotion that cross the face in as little as one twenty-fifth of a second, faster than a blink. Most people never consciously catch them, yet we often come away with an accurate "feeling" about someone anyway. We perceive far more than we register. Today you respect that hidden channel.`,
        task: `Before measuring, recall a time you "just had a feeling" about someone that turned out right — and consider how much your eyes may have caught that your mind never noticed. Then settle.`,
        practice: `Measure while trusting that you perceive more than you consciously know. Notice what it's like to credit your fast, wordless reading of people.`,
        reflectionPrompt: `Have you ever "just sensed" something true about someone — and where might that have come from?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd3', title: `The Whole Body Speaks`,
        intro: `It isn't only faces. Posture, the set of the shoulders, the rhythm of breath, the energy of a walk — the whole body broadcasts a person's state, and we read it without naming any of it. A tired person, a tense room, an excited friend: we feel these as a whole, instantly. Today you read the body.`,
        task: `Before measuring, picture someone you know well and "read" their whole-body state — how they hold themselves, move, breathe. Sense the overall impression, then come to the wheel.`,
        practice: `Measure while holding that whole-body impression of another person. Notice how much a person's state comes through their body, beneath any words.`,
        reflectionPrompt: `How much of a person's state did you sense from the body alone, with no words?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd4', title: `Sensing a Presence`,
        intro: `Sit near someone, even in silence, and you feel something — a presence, an atmosphere, a quality you'd struggle to name. Some of it is those tiny signals; some is simply attention meeting attention. Whatever it is, it's real and worth observing honestly. Today you attend to presence itself.`,
        task: `Solo: hold in mind, vividly, someone whose presence you know well, and sense the quality of "being with" them. With a partner: sit quietly near each other for a couple of minutes and simply notice the felt sense of their presence. Then measure.`,
        practice: `Measure while attending to that felt presence, real or remembered. Notice what you actually perceive of another's presence, beneath words and labels.`,
        reflectionPrompt: `What did you actually perceive of another person's presence, beneath any words?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd5', title: `What You Pick Up`,
        intro: `Across these days you've read moods in an instant, trusted what flashes by faster than a blink, sensed states from the whole body, and attended to presence itself. Much of what gets called "seeing someone's aura" may be this — fast, genuine, wordless human perception. Before you start, predict: will attending closely to presence change your measurement?`,
        task: `Bring it together: hold a clear, attentive sense of another person's presence and state — or your own — and measure from that finely-tuned attention.`,
        practice: `Measure while holding that full, attentive reading of presence. Notice how it compares with an ordinary, distracted measurement — and whether your prediction held.`,
        reflectionPrompt: `Did finely attending to presence change the measurement — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Human Energy Traditions  (every culture's word for aliveness)
  // ==========================================================================
  {
    id: 'human-energy-traditions',
    topic: 'aura',
    title: `Human Energy Traditions`,
    level: 'Intermediate',
    cover: 'assets/experiments/human-energy-traditions.jpg',
    order: 4,
    summary: `Five days on a remarkable coincidence — or is it? — that cultures all over the world, with no contact between them, each invented a word for the invisible "aliveness" that fills a living being.`,
    days: [
      { id: 'd1', title: `A Word for Aliveness`,
        intro: `There's an obvious, mysterious difference between a living body and a still one — a quality of aliveness we can feel but can't quite point to. Every culture noticed it, and every culture made a word for it. Today you start with the plain fact of your own aliveness.`,
        task: `Before measuring, simply notice that you are alive — the warmth, the breath, the quiet hum of a living body — the very thing every culture tried to name. Sit with it for a moment, then begin.`,
        practice: `Measure while staying aware of the simple, felt fact of being alive. Notice what that "aliveness" actually feels like when you attend to it directly.`,
        reflectionPrompt: `When you attended to it directly, what did your own "aliveness" actually feel like?`,
        practiceMinutes: 2,
        measureSeconds: 120 },
      { id: 'd2', title: `Qi, Prana, Pneuma`,
        intro: `The names are different, the idea is uncannily alike. In China they called it qi; in India, prana; in Japan, ki; in ancient Greece, pneuma; in Hebrew, ruach; across Polynesia, mana. Cultures that never met each arrived at the same notion: an invisible life-energy animating every living thing. Today you sit with that striking convergence.`,
        task: `Before measuring, pick whichever of these words appeals to you — qi, prana, ki — and simply hold the idea it points to: the felt vitality in you, right now. Then settle.`,
        practice: `Measure while holding that idea of a living vitality, by whatever name. Notice whether naming and attending to your aliveness changes how present it feels.`,
        reflectionPrompt: `Did giving your sense of aliveness a name make it feel any more present?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd3', title: `Life Is Breath`,
        intro: `Here's the quiet clue hidden in all those words: so many of them literally mean "breath" or "air". Prana, qi, pneuma, ruach, the Latin spiritus — all trace back to breathing. It makes sense: breath is the most visible sign of life, the thing that stops when life does. Cultures everywhere located aliveness in the breath. Today you do too.`,
        task: `For a couple of minutes before measuring, simply attend to your breath as the ancients did — not controlling it, just feeling it as the living movement it is. Then come to the wheel.`,
        practice: `Measure while keeping a gentle awareness of your breath as the sign of life moving in you. Notice whether attending to the breath as "aliveness" feels different from ordinary breathing.`,
        reflectionPrompt: `Did attending to your breath as the sign of life feel different from ordinary breathing?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd4', title: `Your Own Vitality`,
        intro: `Set the theories aside and the felt thing remains: some days you feel full of life, other days drained and flat. That fluctuating vitality is real and familiar, whatever we call it or however we explain it. Today you simply read your own, honestly.`,
        task: `Before measuring, take stock of your vitality right now — high or low, warm or tired, bright or dim — without judging it. Just an honest reading of your own aliveness today. Then settle.`,
        practice: `Measure while staying aware of your current level of vitality. Notice whether your felt aliveness seems to colour the measurement at all.`,
        reflectionPrompt: `What was your honest level of vitality today — and did it seem to colour the measurement?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd5', title: `The Felt Sense of Life`,
        intro: `Across these days you've met the universal word for aliveness, its many names, its root in the breath, and your own changing vitality. Whatever the truth behind qi and prana, the felt sense of being alive is undeniable — and worth paying attention to. Before you start, predict: will measuring while attending to your own vitality feel different?`,
        task: `Settle, and bring a full, warm awareness to your own aliveness — breath, warmth, the quiet energy of being a living being. Then measure from within that awareness.`,
        practice: `Measure while resting in the felt sense of your own vitality. Notice how it compares with a distracted, ordinary measurement — and whether your prediction held.`,
        reflectionPrompt: `Did measuring while attending to your own vitality feel different — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — The Aura Question  (what does "aura" mean today? — stays OPEN)
  //  The culmination — honest, demystifying-but-respectful; never a verdict.
  // ==========================================================================
  {
    id: 'the-aura-question',
    topic: 'aura',
    title: `The Aura Question`,
    level: 'Advanced',
    cover: 'assets/experiments/the-aura-question.jpg',
    order: 5,
    summary: `Five days on the modern idea of the aura itself — where the word came from, the honest explanations behind it, and the genuine surprise that some people really do see colours around others. Curiosity, not conclusions.`,
    days: [
      { id: 'd1', title: `A Surprisingly Modern Word`,
        intro: `The word "aura" is ancient — in Greek and Latin it simply meant a breeze or breath. But the modern idea of a colourful energy field around the body, with meanings for each colour, is surprisingly recent: it was largely shaped around 1900 by the Theosophists, especially Charles Leadbeater. Like Reiki, much of what feels timeless here is barely a century old. Today you start with that surprise.`,
        task: `Before measuring, simply sit with the curiosity that a familiar idea has a traceable, recent history — invented and shaped by particular people, not handed down from the dawn of time. Then begin.`,
        practice: `Measure with that historical curiosity in mind. Notice what it's like to hold a familiar idea as a piece of recent human history rather than ancient truth.`,
        reflectionPrompt: `Did learning the modern aura idea is barely a century old change how you think about it?`,
        measureSeconds: 150 },
      { id: 'd2', title: `Photographing the Invisible`,
        intro: `In 1939 a Soviet couple, the Kirlians, discovered they could photograph a glowing outline around objects placed on an electrified plate — and "aura photography" was born. The glow is real, but it's a high-voltage electrical effect: change the moisture, sweat or pressure of a fingertip and the glow changes completely. A genuine phenomenon, with an honest, electrical explanation. Today you hold both at once.`,
        task: `Before measuring, practise holding two true things together: the image is real and striking, and it has an ordinary physical cause. Carry that both-and curiosity, neither gullible nor dismissive, to the wheel.`,
        practice: `Measure while holding that balanced, curious stance — open to the phenomenon, clear about the explanation. Notice whether you can stay fascinated and clear-headed at once.`,
        reflectionPrompt: `Could you hold something as both genuinely striking and ordinarily explained at the same time?`,
        practiceMinutes: 2,
        measureSeconds: 180 },
      { id: 'd3', title: `Some People Really Do See Colours`,
        intro: `Here's the genuine surprise. A small number of people have synesthesia — their senses cross-wire, so they might taste words or see sounds. In one form, they automatically see colours around people, tied to who the person is and how they feel. Researchers think this may explain some sincere "aura seers": for them, the colours are perfectly real, produced by an unusual brain. Not woo — neurology. Today you stay open to how varied human perception is.`,
        task: `Before measuring, consider how differently another brain might experience the very same room — colours, halos, sensations you'll never have. Hold that wonder at the range of human perception. Then settle.`,
        practice: `Measure while holding the genuine strangeness that perception itself varies so much between people. Notice what it's like to accept that others may honestly see what you cannot.`,
        reflectionPrompt: `What was it like to accept that some people genuinely perceive things you never will?`,
        practiceMinutes: 2,
        measureSeconds: 180 },
      { id: 'd4', title: `Belief and Perception`,
        intro: `One honest thread runs through everything: what we expect and believe shapes what we perceive. Expect a glow and you may well see one; expect nothing and you may miss what's there. This doesn't make experiences false — perception is always part expectation — but it keeps us humble and curious about our own. Today you watch the watcher.`,
        task: `Before measuring, notice your own expectations about what you might sense or see — then deliberately hold them lightly, neither chasing nor banishing them. Then measure.`,
        practice: `Measure while keeping an eye on how your expectations shape your perceptions. Notice how much of what you experience might be coloured by what you expected.`,
        reflectionPrompt: `How much of what you perceived seemed shaped by what you expected to perceive?`,
        practiceMinutes: 2,
        measureSeconds: 210 },
      { id: 'd5', title: `What Did You Observe?`,
        intro: `Across this whole topic you've explored how the eye invents, how cultures painted light around people, how we read each other without words, how every people named a life-force, and where the modern aura really comes from. Notice what we never did: tell you what an aura "is". That question stays open, and now it's yours. Before you start, predict, then simply observe.`,
        task: `Settle into a few minutes of open, curious attention — to your own vitality, or to the presence of another — and then measure, gathering everything this topic gave you into one honest observation.`,
        practice: `Measure as a curious, open-minded observer of your own experience. Notice what, across this whole journey, you genuinely observed — and whether your prediction held.`,
        reflectionPrompt: `After this whole journey, what did you honestly observe — and what do you now make of the aura question?`,
        practiceMinutes: 3,
        measureSeconds: 240 },
    ],
  },

  // ##########################################################################
  //  FOOD & AWARENESS TOPIC
  //  Frame: the most EVERYDAY topic — deliberately NOT "Nutrition" or "Healthy
  //  Eating" (too dietetic, a thousand apps do that). Big question: how much do
  //  we actually pay attention to what we eat? EXPERIENCE-centred: "what do I
  //  notice about myself?". NOT a diet topic — AVOID calories, diets, macros,
  //  weight loss, and "good food / bad food". The FIRST topic built around real
  //  MINI-TASKS (eat one bite slowly, a meal without the phone, a raisin, notice
  //  fullness). The wheel comes after: "is your measurement different after a
  //  mindful meal?". CRITICAL: do NOT cite Brian Wansink (retracted / data
  //  fraud); use credible non-Wansink sources: Rozin's amnesic-patients study,
  //  Robinson 2013 attentive-eating meta-analysis, retronasal smell (~80% of
  //  flavour), the raisin exercise (Kabat-Zinn/MBSR), hunger-vs-craving, the
  //  PREDICT/ZOE study (same food -> very different responses, so observe
  //  YOURSELF, never prescribe), commensality & fasting across cultures. NEVER
  //  instruct the user to actually fast or skip meals (health) — fasting appears
  //  only as cultural reflection. Experiment 5 connects to the Rituals topic.
  //  Closing feeling: "the most ordinary thing — eating — is full of attention,
  //  pleasure and meaning I'd stopped noticing."
  // ##########################################################################

  // ==========================================================================
  //  1 — Mindless Eating  (how often do we eat barely noticing?)
  // ==========================================================================
  {
    id: 'mindless-eating',
    topic: 'food-and-awareness',
    title: `Mindless Eating`,
    level: 'Beginner',
    cover: 'assets/experiments/mindless-eating.jpg',
    order: 1,
    summary: `Four short days on something you do every single day, usually on autopilot: eating. How often do you barely notice it happening — and what changes the moment you do?`,
    days: [
      { id: 'd1', title: `Eating on Autopilot`,
        intro: `Think about how you usually eat: scrolling a phone, watching a screen, working, walking — the food vanishing almost without you tasting it. Most of our eating happens on autopilot, while our attention is somewhere else entirely. Today you simply catch yourself doing it.`,
        task: `Before measuring, recall your last few meals or snacks and notice how many you ate while distracted, barely tasting them. No judgment — just an honest look at how automatic eating has become.`,
        practice: `Measure while reflecting on how much of your eating happens without attention. Notice what it's like to realise how often you eat on autopilot.`,
        reflectionPrompt: `How many of your recent meals did you eat on autopilot, barely noticing?`,
        measureSeconds: 120 },
      { id: 'd2', title: `The Meal You Forgot`,
        intro: `Here's a striking experiment: researchers offered a full second lunch to patients with severe memory loss, just minutes after the first — and they happily ate it, and started a third, because they couldn't remember having eaten. It suggests we stop eating partly because we remember we ate, not only because we're full. So what happens when we barely remember our meals at all?`,
        task: `Before measuring, try to recall in real detail exactly what you ate yesterday — every meal and snack. Notice how much is surprisingly hazy.`,
        practice: `Measure while holding how patchy the memory of your own eating can be. Notice whether food eaten without attention leaves much of a trace at all.`,
        reflectionPrompt: `How clearly could you actually remember everything you ate yesterday?`,
        measureSeconds: 120 },
      { id: 'd3', title: `One Bite, Fully Noticed`,
        intro: `You don't need a whole meal to break the autopilot — a single bite will do. The difference between gulping something down and truly tasting one mouthful is surprisingly large, and surprisingly available, any time you choose. Today you take one fully-noticed bite.`,
        task: `Take one bite of any food and eat it as slowly and attentively as you possibly can — the smell, the first taste, the texture, the chewing, the swallow. Spend a couple of minutes on that single bite.`,
        practice: `Measure straight afterward, still in that slowed-down attention. Notice whether one truly-noticed bite feels different from a normal, automatic one.`,
        reflectionPrompt: `How different did one fully-noticed bite feel from how you normally eat?`,
        practiceMinutes: 2,
        measureSeconds: 150 },
      { id: 'd4', title: `A Meal Without Distraction`,
        intro: `When researchers gathered the studies together, a clear pattern emerged: people who eat while distracted tend to eat more — and, oddly, eat even more later — than those who pay attention. Attention to a meal genuinely changes the meal. Before you start, predict: will eating something with full attention feel different from eating it distracted?`,
        task: `Eat one small thing — a piece of fruit, a snack — with zero distraction: no phone, no screen, no reading. Just you and the food, for as long as it takes. Then come to the wheel.`,
        practice: `Measure after that undistracted eating. Notice how it compares with your usual distracted eating — and whether your prediction held.`,
        reflectionPrompt: `How did eating with full, undistracted attention compare with your usual way — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
    ],
  },

  // ==========================================================================
  //  2 — Taste & Attention  (how much of flavour do we actually perceive?)
  // ==========================================================================
  {
    id: 'taste-and-attention',
    topic: 'food-and-awareness',
    title: `Taste & Attention`,
    level: 'Beginner',
    cover: 'assets/experiments/taste-and-attention.jpg',
    order: 2,
    summary: `Five days rediscovering a sense you use constantly but rarely attend to: taste. Simple, surprising little experiments with flavour, smell and texture, then the wheel.`,
    days: [
      { id: 'd1', title: `The Raisin`,
        intro: `There's a famous mindfulness exercise that uses a single raisin. You examine it as though you'd never seen one — its wrinkles, weight, smell — then eat it impossibly slowly, noticing everything. People are often astonished how much is in one raisin they'd normally swallow in a second. Today you try it, with a raisin or any small food.`,
        task: `Take one small piece of food and spend two to three minutes with it: look at it closely, smell it, feel its texture, then eat it as slowly as you can, noticing every sensation. Treat it as if tasting for the first time.`,
        practice: `Measure straight afterward, still in that heightened attention to taste. Notice how much flavour and detail appeared once you truly paid attention.`,
        reflectionPrompt: `How much more did you notice in one small food when you really paid attention?`,
        practiceMinutes: 3,
        measureSeconds: 120 },
      { id: 'd2', title: `Flavour Is Mostly Smell`,
        intro: `Here's a surprise: most of what you call "taste" is actually smell. As you chew, aromas travel up the back of your throat to your nose, and that's where the richness comes from — around eighty percent of flavour. Pinch your nose while eating and food turns flat and hard to identify; let go, and the flavour floods back. Today you prove it on yourself.`,
        task: `Take a bite of something flavourful while gently pinching your nose shut, and notice how muted it tastes. Then release your nose mid-chew and feel the flavour rush in. Try it a couple of times.`,
        practice: `Measure afterward, struck by how much of taste is really smell. Notice how differently you'll think about flavour now.`,
        reflectionPrompt: `What happened to the flavour when you blocked, then released, your nose?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd3', title: `Five Tastes, a Thousand Smells`,
        intro: `Your tongue is surprisingly simple: it detects only five basic tastes — sweet, sour, salty, bitter and savoury (umami). The old "tongue map" with zones for each is a myth; every part tastes everything. All the richness — apple versus pear, coffee versus chocolate — comes from your nose detecting thousands of aromas. Today you separate the two.`,
        task: `Eat something and try to tease apart what is pure taste (one of the five) from what is really smell. Notice how little the tongue alone reports, and how much the nose adds.`,
        practice: `Measure while holding that fresh sense of how taste and smell combine. Notice how much of eating's pleasure actually comes through the nose.`,
        reflectionPrompt: `Could you tell apart the simple tongue-tastes from the rich smells in your food?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd4', title: `Texture and Temperature`,
        intro: `Flavour isn't the whole story of eating. So much of the pleasure is texture and temperature — the crunch, the creaminess, the warmth, the cold — a whole world of sensation we rarely attend to. The same food can delight or disappoint on texture alone. Today you notice the feel of food.`,
        task: `Eat something with an interesting texture and, for a couple of minutes, attend only to how it feels in your mouth — crunch, softness, temperature, how it changes as you chew. Forget the flavour; feel the food.`,
        practice: `Measure afterward, still attentive to mouth-feel. Notice how much of eating you'd been missing by ignoring texture and temperature.`,
        reflectionPrompt: `What did you notice about texture and temperature that you'd normally ignore?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd5', title: `A Meal, Fully Tasted`,
        intro: `Across these days you've slowed down to a raisin, found that flavour is mostly smell, separated taste from aroma, and felt the texture of food. Together they turn eating from a blur into a rich, layered experience. Before you start, predict: will a slowly, fully-tasted few minutes of eating change your measurement?`,
        task: `Eat a small portion of something you enjoy with complete attention — smell, taste, texture, temperature, all of it — for a few unhurried minutes. Then come to the wheel.`,
        practice: `Measure from that fully-tasted state. Notice how attentive eating compares with the blur of Day 1 — and whether your prediction held.`,
        reflectionPrompt: `How did fully tasting your food compare with how you ate at the start — and was your prediction right?`,
        practiceMinutes: 3,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  3 — Hunger & Craving  (the difference between needing and wanting)
  // ==========================================================================
  {
    id: 'hunger-and-craving',
    topic: 'food-and-awareness',
    title: `Hunger & Craving`,
    level: 'Intermediate',
    cover: 'assets/experiments/hunger-and-craving.jpg',
    order: 3,
    summary: `Five days on a distinction almost no one makes but everyone feels: the difference between real hunger and a craving — and what we're often actually reaching for when we reach for food.`,
    days: [
      { id: 'd1', title: `Are You Actually Hungry?`,
        intro: `We eat for all kinds of reasons that have nothing to do with hunger: the clock says lunchtime, the food is just there, we're bored, tired, stressed or celebrating. Genuine physical hunger is only one of many reasons we put food in our mouths. Today you start checking which is which.`,
        task: `Before measuring, think of the last time you ate or wanted to eat, and ask honestly: was that real hunger, or something else — habit, boredom, emotion, the clock? Just notice, without judging.`,
        practice: `Measure while reflecting on how often you eat for reasons other than hunger. Notice how rarely, or often, pure physical hunger is actually the trigger.`,
        reflectionPrompt: `How often do you eat for reasons other than genuine hunger?`,
        measureSeconds: 120 },
      { id: 'd2', title: `Hunger or Craving?`,
        intro: `Hunger and craving feel similar but behave differently. Real hunger builds slowly, comes from the body, and any food will satisfy it. A craving arrives suddenly, comes from the brain's reward system, and demands one specific thing — and often won't quit even after you've eaten. There's a simple test: would plain food do?`,
        task: `Next time you want to eat, pause and run the test: would something plain — a piece of bread, an apple, plain rice — satisfy you? If yes, it's likely hunger. If only one specific treat will do, it's likely a craving. Notice which it is.`,
        practice: `Measure while holding what you discovered about your own wanting. Notice how it feels to tell true hunger apart from a craving.`,
        reflectionPrompt: `When you ran the test, was it real hunger or a craving — and how could you tell?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Feeling Behind the Food`,
        intro: `Here's the interesting part: a craving is often not really about the food at all. We reach for chocolate wanting comfort, for crisps wanting to soothe stress, for sweets wanting a small reward. Underneath the craving for a thing is usually a craving for a feeling. Today you look underneath.`,
        task: `When a craving shows up, pause and ask what feeling you're actually after — comfort, calm, reward, distraction, energy? Name the feeling beneath the food, then decide freely what to do.`,
        practice: `Measure while aware of the feeling that was driving the craving. Notice whether naming the real need changes the pull of the food.`,
        reflectionPrompt: `What feeling were you really reaching for, underneath the craving?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Watching a Craving`,
        intro: `A craving feels urgent, as if it will only grow until you give in — but watch one closely and you'll often find it rises, peaks and fades on its own, like a wave, usually within a few minutes. You don't always have to fight it or feed it; sometimes you can simply watch it pass. Today you try.`,
        task: `When a craving arrives, instead of acting on it, spend two to three minutes simply observing it — where you feel it, how strong it is, whether it grows or fades — with curiosity, not a battle.`,
        practice: `Measure while watching the craving rather than obeying it. Notice whether a craving, simply observed, changes or passes on its own.`,
        reflectionPrompt: `When you watched a craving instead of acting on it, what did it do?`,
        practiceMinutes: 3,
        measureSeconds: 150 },
      { id: 'd5', title: `Eating From Choice`,
        intro: `Across these days you've separated hunger from craving, found the feeling beneath the food, and watched a craving rise and fall. The point was never to deny yourself anything — only to eat from clear, awake choice rather than autopilot. Before you start, predict: will eating (or not) from a conscious choice feel different?`,
        task: `Next time you eat, make it a genuine choice: notice whether it's hunger or craving, what you actually want, and then choose freely and without guilt. Then come to the wheel.`,
        practice: `Measure after eating, or choosing not to, from real awareness. Notice how eating from conscious choice compares with eating on autopilot — and whether your prediction held.`,
        reflectionPrompt: `How did eating from a conscious choice compare with autopilot eating — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  4 — Energy & Food  (notice how YOU feel — no good foods, no bad foods)
  // ==========================================================================
  {
    id: 'energy-and-food',
    topic: 'food-and-awareness',
    title: `Energy & Food`,
    level: 'Intermediate',
    cover: 'assets/experiments/energy-and-food.jpg',
    order: 4,
    summary: `Five days as your own honest observer: how do different foods and meals leave you feeling? Not dietetics, not good-versus-bad — just careful self-observation, with the wheel as your instrument.`,
    days: [
      { id: 'd1', title: `How You Feel After Eating`,
        intro: `Some meals leave you heavy and sleepy; others leave you light and clear; some pick you up, some flatten you an hour later. We rarely connect the dots between what we ate and how we then feel. Today you start paying attention to the afterward.`,
        task: `After a meal today, pause and read your state honestly: energised or drowsy, light or heavy, clear or foggy, calm or restless? Then come to the wheel soon after eating.`,
        practice: `Measure not long after a meal, staying aware of how that meal left you feeling. Notice whether your post-meal state seems to show up in the session at all.`,
        reflectionPrompt: `How did your last meal leave you feeling — and did you notice it in the measurement?`,
        measureSeconds: 120 },
      { id: 'd2', title: `No Good Foods, No Bad Foods`,
        intro: `One of the largest nutrition studies ever run found something freeing: the very same food can produce up to an eightfold difference in how people respond to it — even identical twins react differently. There is no universal good or bad food; there is only how a food affects you. That's why this topic asks you to observe, never to follow rules.`,
        task: `Before measuring, drop every idea of "healthy" or "unhealthy", "good" or "bad" food, and replace it with one honest question: how does this particular food actually make me feel? Carry that curiosity in.`,
        practice: `Measure as your own personal scientist, interested only in your real responses, not in rules. Notice how it feels to study your own body instead of obeying food advice.`,
        reflectionPrompt: `What changed when you swapped food rules for honest self-observation?`,
        measureSeconds: 150 },
      { id: 'd3', title: `The Afternoon Dip`,
        intro: `That heavy, sleepy slump after a big meal is real — and the same study found it varies enormously from person to person, with your sleep, timing and movement mattering as much as the food itself. Your body is not a textbook; it's its own experiment. Today you watch your own energy curve.`,
        task: `Notice your energy in the hour or two after eating today — does it dip, hold steady, or lift? Then bring that awareness of your own rhythm to the wheel.`,
        practice: `Measure while aware of where you are on your own post-meal energy curve. Notice whether your energy after eating seems to show up in how the session feels.`,
        reflectionPrompt: `What did your energy do after eating — dip, hold, or lift — and did it appear in the session?`,
        measureSeconds: 150 },
      { id: 'd4', title: `Empty and Full`,
        intro: `One of the simplest experiments you can run is to compare yourself empty versus full. Measuring on an empty stomach and measuring soon after a meal can feel like two different states — and only you can know your own difference. Today you pay attention to one side of that comparison.`,
        task: `Choose your state deliberately today — either clearly hungry and empty, or comfortably after a meal — and note which you've chosen before you begin. Over time you'll feel the contrast.`,
        practice: `Measure in your chosen state, empty or full, paying attention to how your body feels. Notice how this state compares with how you remember the other one feeling.`,
        reflectionPrompt: `How did measuring empty (or full) compare with how the opposite state usually feels?`,
        measureSeconds: 150 },
      { id: 'd5', title: `Your Own Map`,
        intro: `Across these days you've watched how meals leave you, dropped the good-food/bad-food rules, tracked your energy, and compared empty with full. Quietly, you've been drawing a personal map that no diet book could give you: how food actually affects you. Before you start, predict: will measuring after a deliberately-noticed meal feel different?`,
        task: `Eat a meal today with full attention to how it leaves you feeling, then come to the wheel as the careful observer of yourself you've become. No rules — just your own honest data.`,
        practice: `Measure from that attentive, post-meal state. Notice what your personal map is starting to show you — and whether your prediction held.`,
        reflectionPrompt: `What is your own map starting to show about how food affects you — and was your prediction right?`,
        measureSeconds: 180 },
    ],
  },

  // ==========================================================================
  //  5 — Food Traditions  (why food means community & meaning everywhere)
  //  Connects to the Rituals topic. Fasting appears only as cultural reflection.
  // ==========================================================================
  {
    id: 'food-traditions',
    topic: 'food-and-awareness',
    title: `Food Traditions`,
    level: 'Advanced',
    cover: 'assets/experiments/food-traditions.jpg',
    order: 5,
    summary: `Five days on the deepest truth about food: it was never only fuel. In every culture, eating carries community, memory and meaning — and noticing that can change the simplest meal.`,
    days: [
      { id: 'd1', title: `Breaking Bread Together`,
        intro: `Almost everywhere, the most important moments happen around food: the family dinner, the celebration feast, the deal sealed over a meal. The word "companion" literally means "one you share bread with". Researchers find that people who eat with others are happier and more connected — eating together may be one of humanity's oldest bonding tools. Today you notice that.`,
        task: `Before measuring, bring to mind a meal shared with people who matter to you — the food, the table, the company — and let that warmth return. If you can, eat something today in good company.`,
        practice: `Measure while holding that sense of food as connection, not just fuel. Notice whether thinking of eating as something shared changes your state.`,
        reflectionPrompt: `What did it bring up to think of eating as a way of being connected to others?`,
        measureSeconds: 150 },
      { id: 'd2', title: `The Feast`,
        intro: `Every culture has its feast foods — the dishes that only appear at celebrations, weddings, holidays and homecomings. They're rarely the most practical foods; they're the ones soaked in joy, abundance and belonging. A feast says: this moment matters, and we mark it with food. Today you honour that.`,
        task: `Before measuring, recall a feast or celebration meal that meant something to you — the special dish, the occasion, the people. Let the significance of it, not just the flavour, come back. Then settle.`,
        practice: `Measure while holding the meaning a celebration meal can carry. Notice how different food feels when it stands for joy and belonging, not just nourishment.`,
        reflectionPrompt: `How did food feel when you remembered it carrying joy and meaning, not just flavour?`,
        measureSeconds: 180 },
      { id: 'd3', title: `The Fast`,
        intro: `Just as cultures gather to feast, nearly all of them also set times to deliberately not eat — Ramadan, Lent, Yom Kippur and many more. Across traditions, going without food for a while is used to sharpen attention, mark something sacred, and feel solidarity with others. Feasting and fasting are two sides of giving food meaning. Today you simply reflect on hunger, without changing how you eat.`,
        task: `Before your next normal meal, let yourself notice the natural hunger that has built up — the very edge that fasting traditions work with — without skipping or delaying anything. Just feel ordinary hunger consciously for a moment. Then eat as usual and, later, measure.`,
        practice: `Measure while reflecting on how differently cultures relate to going without, and on your own everyday hunger. Notice what attention to natural hunger, before a normal meal, reveals.`,
        reflectionPrompt: `What did you notice when you paid attention to ordinary hunger before a meal?`,
        measureSeconds: 180 },
      { id: 'd4', title: `Food as Memory`,
        intro: `Certain foods are time machines: a grandmother's recipe, a dish from your childhood, a taste from a place you love. Food carries memory and identity more powerfully than almost anything — one bite can return an entire world. Today you let a food carry its meaning.`,
        task: `Before measuring, bring to mind a food tied to a strong memory or to who you are — where you're from, who made it, when you ate it. If you can, taste a little of it. Let the memory come with the flavour.`,
        practice: `Measure while holding the memory and meaning your food carries. Notice whether food connected to memory feels different from ordinary eating.`,
        reflectionPrompt: `What memory or sense of identity did a meaningful food bring back for you?`,
        practiceMinutes: 2,
        measureSeconds: 210 },
      { id: 'd5', title: `Your Table`,
        intro: `Across this whole topic you've found how mindlessly we usually eat, how rich taste really is, the difference between hunger and craving, how food shapes your energy, and how deeply it carries community and meaning. The quiet conclusion isn't a diet — it's that eating well means eating with awareness. Before you start, predict, then bring it all to one meal.`,
        task: `Eat a meal today with everything you've gathered: full attention, real tasting, honest hunger, and a sense of its meaning and connection. Then come to the wheel.`,
        practice: `Measure from that complete, aware, meaningful meal. Notice what feels most different now about the simple act of eating — and whether your prediction held.`,
        reflectionPrompt: `After this whole journey, what feels most different about the everyday act of eating?`,
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
