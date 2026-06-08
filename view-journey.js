// view-journey.js — "The Journey": a calm, brand-toned page that explains the
// level path (Explorer → Luminary), how XP is earned, and why EWR Live exists.
// Static + public (no login needed). Linked from the Home Level Journey block.
import { LEVELS, TIER_XP } from './achievements.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// One evocative line per level (keyed by level idx).
const LEVEL_BLURB = {
  1: "You've arrived. Curiosity is all it takes to begin.",
  2: "The habit is forming — you're learning what your own readings feel like.",
  3: "You measure with intention now, and the patterns begin to speak.",
  4: "Your consistency is real — steady enough to light the way for others.",
  5: "A practiced, grounded presence. You and the wheel move together.",
  6: "The summit. A rare, radiant consistency — the journey, fully lived.",
};

export function mount(el){
  const levels = LEVELS.map(L => `
    <li class="jr-level jr-l${L.idx}">
      <span class="jr-node">${L.idx}</span>
      <div class="jr-level-body">
        <div class="jr-level-head">
          <span class="jr-level-name">${esc(L.title)}</span>
          <span class="jr-level-xp">${L.threshold === 0 ? 'Start' : L.threshold + ' XP'}</span>
        </div>
        <p class="jr-level-desc">${esc(LEVEL_BLURB[L.idx] || '')}</p>
      </div>
    </li>`).join('');

  const tiers = [
    ['Bronze', TIER_XP.bronze], ['Silver', TIER_XP.silver], ['Gold', TIER_XP.gold], ['Special', TIER_XP.special],
  ].map(([name, xp]) => `<span class="jr-tier jr-tier-${name.toLowerCase()}">${name}<b>+${xp}</b></span>`).join('');

  el.innerHTML = `
    <div class="jr-wrap">
      <header class="jr-hero">
        <div class="jr-eyebrow">Your path</div>
        <h1 class="jr-title">The Journey</h1>
        <p class="jr-lead">Every measurement is a moment of attention. Over time, those moments become a practice — and the practice becomes a journey you can see.</p>
      </header>

      <section class="jr-section">
        <h2 class="jr-h">Why this exists</h2>
        <p class="jr-p">The Egely Wheel turns something invisible — your vitality in the moment — into something you can watch, follow, and return to. We built EWR Live to give that practice a shape: a quiet way to notice your progress, stay consistent, and feel part of a wider community walking the same path.</p>
        <p class="jr-p">It isn't a competition, and there's no one to beat. The only journey here is your own.</p>
      </section>

      <section class="jr-section">
        <h2 class="jr-h">Six levels, one path</h2>
        <p class="jr-p">As you practice, you move through six levels — from your very first reading to a rare, steady mastery. Each level reflects the time and attention you've given, not a test to pass.</p>
        <ol class="jr-levels">${levels}</ol>
      </section>

      <section class="jr-section">
        <h2 class="jr-h">How you grow</h2>
        <p class="jr-p">You earn experience by unlocking <b>achievements</b> — small milestones that mark each step of your practice: your first measurement, a steady streak, a personal best, a deeper experiment. Your level is simply the sum of everything you've earned.</p>
        <div class="jr-tiers">${tiers}</div>
        <p class="jr-p jr-muted">More than fifty milestones wait across many themes — first steps, consistency, vitality, stability, endurance, experiments, community, and a few rare surprises.</p>
      </section>

      <section class="jr-closing">
        <h2 class="jr-h">Walk at your own pace</h2>
        <p class="jr-p">There's no rush and no finish line — only your own unfolding. Connect your Egely Wheel, take a reading, and let the next step find you.</p>
        <a class="jr-back" href="#/home">← Back to your dashboard</a>
      </section>
    </div>`;

  return () => {};
}
