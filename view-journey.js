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

// "Journey device" — a vertical path of six ascending nodes (cyan → violet →
// gold), echoing the level timeline. Pure SVG; no images, no Egely Wheel art.
function heroArtSvg(){
  const ys   = [232, 192, 152, 112, 72, 32];
  const cols = ['#37dbff', '#36b0ee', '#5230da', '#7b3fd6', '#b06fb4', '#f5b700'];
  const rs   = [5, 6, 7, 8.5, 10, 12];
  const nodes = ys.map((y, i) => {
    const top = i === ys.length - 1;
    return `${top ? `<circle cx="80" cy="${y}" r="21" fill="#f5b700" opacity="0.16"/>` : ''}` +
      `<circle cx="80" cy="${y}" r="${rs[i]}" fill="${cols[i]}"/>` +
      `${top ? `<circle cx="80" cy="${y}" r="${rs[i]}" fill="none" stroke="#fff" stroke-width="2.5"/>` : ''}`;
  }).join('');
  // Faint vitality-pulse weaving up the path — a measurement signal at the base
  // that calms into the clean line near the summit (amplitude tapers + fades out).
  const N = 28;
  let pulse = '';
  for(let i = 0; i < N; i++){
    const t = i / (N - 1);                                   // 0 (base) → 1 (summit)
    const y = 232 - t * 200;
    const x = 80 + Math.sin(t * Math.PI * 4.8) * 8 * (1 - t * 0.55);
    pulse += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  return `<svg viewBox="0 0 160 264" class="jr-art-svg" aria-hidden="true">
      <defs>
        <linearGradient id="jrRail" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#37dbff"/>
          <stop offset="0.5" stop-color="#5230da"/>
          <stop offset="1" stop-color="#f5b700"/>
        </linearGradient>
        <linearGradient id="jrPulse" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#37dbff" stop-opacity="0.55"/>
          <stop offset="0.65" stop-color="#5230da" stop-opacity="0.2"/>
          <stop offset="1" stop-color="#5230da" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="jrGlow" cx="0.5" cy="0.42" r="0.55">
          <stop offset="0" stop-color="#5230da" stop-opacity="0.13"/>
          <stop offset="1" stop-color="#5230da" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="160" height="264" fill="url(#jrGlow)"/>
      <path d="${pulse.trim()}" fill="none" stroke="url(#jrPulse)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="80" y1="232" x2="80" y2="32" stroke="url(#jrRail)" stroke-width="4" stroke-linecap="round"/>
      ${nodes}
    </svg>`;
}

export function mount(el){
  // Level timeline — grouped low (1–2) / mid (3–4) / high (5–6) for a quiet
  // cyan → violet → gold progression. Illustrative; not the viewer's own level.
  const levels = LEVELS.map((L, i) => {
    const tier = i <= 1 ? 'low' : i >= 4 ? 'high' : 'mid';
    return `
      <li class="jr-level jr-${tier}">
        <span class="jr-node">${L.idx}</span>
        <div class="jr-level-body">
          <div class="jr-level-head">
            <span class="jr-level-name">${esc(L.title)}</span>
            <span class="jr-level-xp">${L.threshold === 0 ? 'Start' : L.threshold + ' XP'}</span>
          </div>
          <p class="jr-level-desc">${esc(LEVEL_BLURB[L.idx] || '')}</p>
        </div>
      </li>`;
  }).join('');

  const tiers = [
    ['Bronze', TIER_XP.bronze], ['Silver', TIER_XP.silver], ['Gold', TIER_XP.gold], ['Special', TIER_XP.special],
  ].map(([name, xp]) => `<span class="jr-tier jr-tier-${name.toLowerCase()}"><span class="jr-tier-name">${name}</span><b>+${xp}</b></span>`).join('');

  const grow = [
    ['Measurements', 'Every reading is a step — solo, in a session, or inside an experiment.'],
    ['Achievements', 'Small milestones unlock as you practise — first steps, personal bests, rare finds.'],
    ['Consistency', 'Steady streaks reward the quiet, regular work of showing up.'],
    ['Experiments & sessions', 'Guided practice and shared sessions open deeper milestones.'],
  ].map(([t, d]) => `
      <div class="jr-grow-card">
        <span class="jr-grow-dot"></span>
        <div class="jr-grow-t">${t}</div>
        <p class="jr-grow-d">${d}</p>
      </div>`).join('');

  el.innerHTML = `
    <div class="jr-wrap">
      <header class="jr-hero">
        <div class="jr-hero-text">
          <div class="jr-eyebrow">Your path</div>
          <h1 class="jr-title">The Journey</h1>
          <p class="jr-lead">Every measurement is a moment of attention. Over time, those moments become a practice — and the practice becomes a journey you can see.</p>
        </div>
        <div class="jr-hero-art">${heroArtSvg()}</div>
      </header>

      <section class="jr-section jr-why">
        <div class="jr-why-text">
          <h2 class="jr-h">Why this exists</h2>
          <p class="jr-p">The Egely Wheel turns something invisible — your vitality in the moment — into something you can watch, follow, and return to. We built EWR Live to give that practice a shape: a quiet way to notice your progress, stay consistent, and feel part of a wider community walking the same path.</p>
          <p class="jr-p">It isn't a competition, and there's no one to beat. The only journey here is your own.</p>
        </div>
        <div class="jr-triad">
          <div class="jr-step"><span class="jr-step-n">1</span><span class="jr-step-t">Measure</span><span class="jr-step-d">Take a reading</span></div>
          <div class="jr-step"><span class="jr-step-n">2</span><span class="jr-step-t">Notice</span><span class="jr-step-d">See the pattern</span></div>
          <div class="jr-step"><span class="jr-step-n">3</span><span class="jr-step-t">Grow</span><span class="jr-step-d">Build the practice</span></div>
        </div>
      </section>

      <section class="jr-section">
        <h2 class="jr-h">Six levels, one path</h2>
        <p class="jr-p">As you practise, you move through six levels — from your very first reading to a rare, steady mastery. Each level reflects the time and attention you've given, not a test to pass.</p>
        <ol class="jr-levels">${levels}</ol>
      </section>

      <section class="jr-section">
        <h2 class="jr-h">How you grow</h2>
        <p class="jr-p">You earn experience by unlocking <b>achievements</b> — small milestones that mark each step of your practice. Your level is simply the sum of everything you've earned.</p>
        <div class="jr-grow-cards">${grow}</div>
        <div class="jr-rewards">
          <span class="jr-rewards-lbl">XP per achievement</span>
          <div class="jr-tiers">${tiers}</div>
        </div>
        <p class="jr-p jr-muted">More than fifty milestones wait across many themes — first steps, consistency, vitality, stability, endurance, experiments, community, and a few rare surprises.</p>
      </section>

      <section class="jr-closing">
        <h2 class="jr-h">Walk at your own pace</h2>
        <p class="jr-p">There's no rush and no finish line — only your own unfolding. Connect your Egely Wheel, take a reading, and let the next step find you.</p>
        <a class="jr-cta" href="#/home">Back to your dashboard</a>
      </section>
    </div>`;

  return () => {};
}
