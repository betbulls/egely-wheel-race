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
