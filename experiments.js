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
