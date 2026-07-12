// view-spiritual-makers.js — the "Spiritual Maker Features" page (#/spiritual-makers).
// A premium, image-led landing that tells the business story of becoming a
// visible, trusted, commercially-active maker inside EWR Live:
//   get seen → build trust → recommend → earn → keep creating.
//
// Self-contained: injects scoped <style id="smStyles"> (.sm-*), returns cleanup.
// All decorative motion is pure CSS, content-tied, paused off-screen
// (IntersectionObserver) and in background tabs (visibilitychange); a static
// resolved state ships for prefers-reduced-motion. Business / access / auth
// logic is NOT touched — the page only describes the programme.

const AFFILIATE = 'https://egelywheel.com/pages/egely-wheel-affiliate';
const PORTAL = 'https://affiliate.egelywheel.com/';
const VP_IMG = 'https://cdn.shopify.com/s/files/1/0946/2382/6306/files/VitalityPack-EgelyWheel.jpg?v=1777371828';

const I = {
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 14.5l5-5"/><path d="M8 12L6 14a3.5 3.5 0 0 0 5 5l2-2"/><path d="M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2"/></svg>`,
  badge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/></svg>`,
  inf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a3 3 0 1 0 0 6c2.2 0 3.3-2.2 6-2.2S15.8 15 18 15a3 3 0 1 0 0-6c-2.2 0-3.3 2.2-6 2.2S8.2 9 6 9z"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 11H7L6 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  ext: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>`,
};

function styles(){
  if(document.getElementById('smStyles')) return;
  const el = document.createElement('style');
  el.id = 'smStyles';
  el.textContent = `
  .sm-wrap{max-width:1000px;margin:0 auto;padding:4px 0 24px;--acc:#37dbff;--acc2:#5230da;--accSoft:rgba(55,219,255,.18)}
  .sm-eyebrow{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--ewr-accent)}

  /* ============ HERO — one wide image scene, text in the left negative space ============ */
  .sm-hero{position:relative;border-radius:24px;overflow:hidden;background:#0a1c29;box-shadow:0 24px 60px -28px rgba(1,22,36,.5)}
  /* image covers the whole hero behind the in-flow text, so the text (logo + CTAs)
     drives the hero height and can never be clipped */
  .sm-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right center;z-index:0}
  .sm-hero-bg.mob{display:none}
  .sm-hero-scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(255,255,255,.97) 0%,rgba(255,255,255,.92) 28%,rgba(255,255,255,.55) 46%,rgba(255,255,255,0) 64%)}
  .sm-hero-text{position:relative;z-index:2;width:56%;padding:40px 24px 42px 42px}
  .sm-hero-logo{width:184px;max-width:48%;height:auto;display:block;margin-bottom:18px}
  .sm-hero h1{font-family:'Montserrat',sans-serif;font-weight:600;font-size:40px;line-height:1.07;letter-spacing:-0.6px;color:var(--ewr-text);margin:12px 0 14px}
  .sm-hero-lead{color:#3a4852;font-size:16px;line-height:1.55;margin:0 0 22px;max-width:430px}
  .sm-cta-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}

  /* ============ benefit strip ============ */
  .sm-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin:22px 0 6px;padding:16px 20px;border-radius:16px;
    background:linear-gradient(180deg,rgba(82,48,218,.06),rgba(55,219,255,.05));border:1px solid rgba(82,48,218,.12)}
  .sm-strip-i{display:flex;align-items:center;gap:11px}
  .sm-strip-ic{width:34px;height:34px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
    color:#fff;background:var(--ewr-gradient)}
  .sm-strip-ic svg{width:18px;height:18px}
  .sm-strip-t{font-size:13px;font-weight:700;color:var(--ewr-text);line-height:1.25}

  /* ============ feature bands ============ */
  .sm-band{display:grid;grid-template-columns:1fr 1.05fr;gap:36px;align-items:center;margin:34px 0;padding:30px 32px;border-radius:22px}
  .sm-band.card{background:var(--ewr-surface);border:1px solid var(--ewr-border);box-shadow:var(--ewr-shadow-card)}
  .sm-band.tint{background:linear-gradient(180deg,rgba(82,48,218,.085),rgba(55,219,255,.06));border:1px solid rgba(82,48,218,.14)}
  .sm-band.alt .sm-band-media{order:-1}
  .sm-band-text,.sm-band-media{min-width:0}
  .sm-band h2{font-family:'Montserrat',sans-serif;font-weight:700;font-size:25px;line-height:1.16;letter-spacing:-0.3px;color:var(--ewr-text);margin:9px 0 10px}
  .sm-band p{color:var(--ewr-text-muted);font-size:15px;line-height:1.6;margin:0 0 12px}
  .sm-fine{font-size:12px;color:var(--ewr-text-soft);line-height:1.5}

  /* split coupon vs commission */
  .sm-split{display:flex;flex-direction:column;gap:10px;margin:4px 0 14px}
  .sm-split-row{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;background:var(--ewr-surface);border:1px solid var(--ewr-border)}
  .sm-split-row.coupon{border-color:rgba(55,219,255,.4);background:linear-gradient(180deg,rgba(55,219,255,.07),var(--ewr-surface))}
  .sm-split-row.earn{border-color:rgba(32,178,107,.4);background:linear-gradient(180deg,rgba(32,178,107,.07),var(--ewr-surface))}
  .sm-split-k{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ewr-text-soft)}
  .sm-split-v{font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:var(--ewr-text);line-height:1.1}
  .sm-split-v b{color:var(--ewr-accent-strong)}
  .sm-split-row.earn .sm-split-v b{color:#0f8a52}
  /* compact save/earn pair under the affiliate demo */
  .sm-earn-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
  .sm-earn-item{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:11px;background:var(--ewr-surface);border:1px solid var(--ewr-border)}
  .sm-earn-item.coupon{border-color:rgba(55,219,255,.4);background:linear-gradient(180deg,rgba(55,219,255,.07),var(--ewr-surface))}
  .sm-earn-item.earn{border-color:rgba(32,178,107,.4);background:linear-gradient(180deg,rgba(32,178,107,.07),var(--ewr-surface))}
  .sm-earn-ic{flex-shrink:0;display:flex;color:#2aa9d6}
  .sm-earn-ic svg{width:20px;height:20px}
  .sm-earn-item.earn .sm-earn-ic{color:#0f8a52}
  .sm-earn-k{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ewr-text-soft)}
  .sm-earn-v{font-size:13px;font-weight:700;color:var(--ewr-text);line-height:1.15}
  .sm-earn-v b{color:var(--ewr-accent-strong)}
  .sm-earn-item.earn .sm-earn-v b{color:#0f8a52}
  /* filler brand image between bands */
  .sm-feature-img{margin:34px 0;border-radius:22px;overflow:hidden;background:#fff;border:1px solid var(--ewr-border);box-shadow:var(--ewr-shadow-card)}
  .sm-feature-img img{display:block;width:100%;height:auto}

  /* ============ navy demo panel ============ */
  .sm-screen{position:relative;background:#081a27;border:1px solid #1c3140;border-radius:16px;padding:16px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
  .sm-screen-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;min-height:18px}
  .sm-tag{display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#cfe8f2}
  .sm-tag i{width:7px;height:7px;border-radius:50%;background:var(--acc);box-shadow:0 0 7px var(--acc);animation:smBlink 1.6s ease-in-out infinite}
  @keyframes smBlink{0%,100%{opacity:1}50%{opacity:.32}}

  /* ---- Live wall demo (real man portrait as the maker profile) ---- */
  .sm-lw-feat{font-size:10.5px;font-weight:700;color:#ffd66b}
  .sm-lw-list{position:relative;height:184px}
  .sm-lw-ghost{display:flex;align-items:center;gap:10px;height:38px;border-radius:10px;padding:0 10px;background:#0c2230;margin-bottom:8px;opacity:.5}
  .sm-lw-ghost .av{width:24px;height:24px;border-radius:50%;background:#16344a;flex-shrink:0}
  .sm-lw-ghost .bar{height:7px;border-radius:4px;background:#16344a}
  .sm-lw-ghost .w1{width:42%}.sm-lw-ghost .w2{width:58%}.sm-lw-ghost .w3{width:50%}
  .sm-lw-maker{position:absolute;left:0;right:0;top:6%;display:flex;align-items:center;gap:10px;height:42px;border-radius:11px;padding:0 11px;
    background:linear-gradient(90deg,rgba(55,219,255,.16),rgba(82,48,218,.14));border:1px solid rgba(55,219,255,.42);
    box-shadow:0 10px 24px -12px rgba(55,219,255,.45);animation:smLwRise 8s ease-in-out infinite}
  .sm-lw-face{width:30px;height:30px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(55,219,255,.6)}
  .sm-lw-face img{width:100%;height:100%;object-fit:cover;object-position:22% 26%;display:block;filter:grayscale(.15)}
  .sm-lw-id{min-width:0}
  .sm-lw-nm{font-size:12.5px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px}
  .sm-lw-bdg{display:inline-flex;align-items:center;gap:3px;font-size:8.5px;font-weight:800;color:#9a7400;background:linear-gradient(135deg,#ffe9a8,#f5c451);border-radius:999px;padding:2px 6px}
  .sm-lw-bdg svg{width:8px;height:8px}
  .sm-lw-sub{font-size:10px;color:#9fb3bf}
  .sm-lw-visit{margin-left:auto;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;animation:smLwVisit 8s ease-in-out infinite}
  .sm-lw-visit .vav{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#2fd07a,#0f8a52);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#001019}
  .sm-lw-visit .vtx{font-size:9.5px;font-weight:700;color:#9fe6c0}
  .sm-lw-coupon{position:absolute;left:11px;bottom:8px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:9.5px;font-weight:800;color:#001019;
    background:#37dbff;border-radius:999px;padding:4px 10px;animation:smLwCoupon 8s ease-in-out infinite}
  @keyframes smLwRise{0%{top:58%;opacity:0}9%{top:58%;opacity:1}38%,100%{top:6%;opacity:1}}
  @keyframes smLwVisit{0%,52%{opacity:0;transform:translateX(6px)}62%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
  @keyframes smLwCoupon{0%,68%{opacity:0;transform:translateY(6px)}78%,94%{opacity:1;transform:none}99%,100%{opacity:0;transform:translateY(6px)}}

  /* ---- Affiliate demo: big product + payout ladder ---- */
  .sm-prod{width:100%;height:210px;border-radius:13px;background:#fff;border:1px solid #1c3140;overflow:hidden;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
  .sm-prod img{width:100%;height:100%;object-fit:contain;display:block;padding:10px;box-sizing:border-box}
  .sm-ladder{display:flex;flex-direction:column;gap:7px}
  .sm-ladder-h{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7d8c97;margin-bottom:2px}
  .sm-rung{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 13px;border-radius:10px;
    background:#0c2230;border:1px solid #1c3140;transition:border-color .4s ease,background .4s ease}
  .sm-rung-n{font-size:12px;font-weight:700;color:#cdd9e0}
  .sm-rung-v{font-family:'Montserrat',sans-serif;font-weight:700;font-size:15px;color:#8ea0ac;transition:color .4s ease}
  .sm-rung.r1{animation:smRung1 6s ease-in-out infinite}
  .sm-rung.r2{animation:smRung2 6s ease-in-out infinite}
  .sm-rung.r3{animation:smRung3 6s ease-in-out infinite}
  .sm-rung.r1 .sm-rung-v{animation:smRungV1 6s ease-in-out infinite}
  .sm-rung.r2 .sm-rung-v{animation:smRungV2 6s ease-in-out infinite}
  .sm-rung.r3 .sm-rung-v{animation:smRungV3 6s ease-in-out infinite}
  @keyframes smRung1{0%,28%{background:rgba(47,208,122,.12);border-color:rgba(47,208,122,.5)}40%,100%{background:#0c2230;border-color:#1c3140}}
  @keyframes smRung2{0%,30%{background:#0c2230;border-color:#1c3140}40%,62%{background:rgba(47,208,122,.12);border-color:rgba(47,208,122,.5)}74%,100%{background:#0c2230;border-color:#1c3140}}
  @keyframes smRung3{0%,64%{background:#0c2230;border-color:#1c3140}76%,100%{background:rgba(47,208,122,.14);border-color:rgba(47,208,122,.55)}}
  @keyframes smRungV1{0%,28%{color:#fff}40%,100%{color:#8ea0ac}}
  @keyframes smRungV2{0%,30%{color:#8ea0ac}40%,62%{color:#fff}74%,100%{color:#8ea0ac}}
  @keyframes smRungV3{0%,64%{color:#8ea0ac}76%,100%{color:#fff}}

  /* ---- Badge demo ---- */
  .sm-badgefx{display:flex;flex-direction:column;gap:14px}
  .sm-pcard{position:relative;display:flex;align-items:center;gap:12px;background:#0c2230;border:1px solid #1c3140;border-radius:14px;padding:14px;overflow:hidden}
  .sm-pcard-av{width:42px;height:42px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#37dbff,#5230da)}
  .sm-pcard-nm{font-size:13.5px;font-weight:700;color:#eaf0f3}
  .sm-pcard-sub{font-size:11px;color:#7d8c97}
  .sm-pcard-badge{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;color:#9a7400;
    background:linear-gradient(135deg,#ffe9a8,#f5c451);border-radius:999px;padding:5px 10px;animation:smBadgeIn 4.4s ease-in-out infinite}
  .sm-pcard-badge svg{width:11px;height:11px}
  @keyframes smBadgeIn{0%,26%{opacity:0;transform:scale(.65)}42%,92%{opacity:1;transform:scale(1)}98%,100%{opacity:0;transform:scale(.65)}}
  .sm-pcard-sweep{position:absolute;top:0;bottom:0;width:42%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);animation:smSweep 4.4s ease-in-out infinite}
  @keyframes smSweep{0%,30%{left:-46%}46%{left:120%}100%{left:120%}}
  .sm-where{display:flex;flex-wrap:wrap;gap:7px}
  .sm-where span{font-size:10.5px;font-weight:600;color:#9fb3bf;background:#0c2230;border:1px solid #1c3140;border-radius:999px;padding:5px 11px}

  /* ---- Lifetime access pass (no "1 year" anywhere) ---- */
  .sm-pass-wrap{display:flex;align-items:center;justify-content:center;min-height:170px}
  .sm-pass{position:relative;width:260px;background:linear-gradient(160deg,#0e2434,#0a1c29);border:1px solid #1f3849;border-radius:16px;padding:18px 18px 20px}
  .sm-pass-top{display:flex;align-items:center;justify-content:space-between}
  .sm-pass-lbl{font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8ea0ac}
  .sm-pass-badge{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#9a7400;
    background:linear-gradient(135deg,#ffe9a8,#f5c451);box-shadow:0 6px 16px -6px rgba(245,196,81,.6);animation:smBadgeDrop 5s ease-in-out infinite}
  .sm-pass-badge svg{width:15px;height:15px}
  @keyframes smBadgeDrop{0%,18%{opacity:0;transform:translateY(-8px) scale(.6)}34%,100%{opacity:1;transform:none}}
  .sm-pass-big{font-family:'Montserrat',sans-serif;font-weight:700;font-size:30px;letter-spacing:-0.5px;color:#fff;margin:12px 0 2px}
  .sm-pass-state{font-size:11px;font-weight:700;color:#9be7ff;opacity:0;animation:smStateIn 5s ease-in-out infinite}
  @keyframes smStateIn{0%,40%{opacity:0}55%,100%{opacity:1}}
  .sm-pass-inf{display:block;width:80px;height:28px;margin:12px auto 0}
  .sm-pass-inf path{fill:none;stroke:var(--acc);stroke-width:2.4;stroke-linecap:round;stroke-dasharray:96;stroke-dashoffset:96;animation:smInf 5s ease-in-out infinite}
  @keyframes smInf{0%,46%{stroke-dashoffset:96}82%,100%{stroke-dashoffset:0}}

  /* ---- Live Voice demo (breathing mic ring + waveform + replay pill) ---- */
  .sm-va-rec{display:inline-flex;align-items:center;font-size:9.5px;font-weight:800;letter-spacing:.08em;color:#9a7400;
    background:linear-gradient(135deg,#ffe9a8,#f5c451);border-radius:999px;padding:3px 9px}
  .sm-va-host{display:flex;align-items:center;gap:12px;background:#0c2230;border:1px solid #1c3140;border-radius:14px;padding:14px}
  .sm-va-ring{width:46px;height:46px;border-radius:50%;flex-shrink:0;padding:3px;box-sizing:border-box;
    background:linear-gradient(135deg,#37dbff,#5230da);animation:smVaBreath 2.6s ease-in-out infinite}
  .sm-va-ring i{display:flex;width:100%;height:100%;border-radius:50%;background:#0a1c29;align-items:center;justify-content:center;color:#9be7ff}
  .sm-va-ring svg{width:19px;height:19px}
  @keyframes smVaBreath{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(55,219,255,.35)}50%{transform:scale(1.07);box-shadow:0 0 0 9px rgba(55,219,255,0)}}
  .sm-va-nm{font-size:13px;font-weight:700;color:#eaf0f3}
  .sm-va-sub{font-size:10.5px;color:#9fb3bf}
  .sm-wave{margin-left:auto;display:flex;align-items:center;gap:3px;height:26px;flex-shrink:0}
  .sm-wave i{width:3.5px;border-radius:2px;background:linear-gradient(180deg,#37dbff,#5230da);animation:smWave 1.15s ease-in-out infinite}
  .sm-wave i:nth-child(1){height:35%}
  .sm-wave i:nth-child(2){animation-delay:.12s;height:55%}
  .sm-wave i:nth-child(3){animation-delay:.24s;height:80%}
  .sm-wave i:nth-child(4){animation-delay:.36s;height:60%}
  .sm-wave i:nth-child(5){animation-delay:.48s;height:85%}
  .sm-wave i:nth-child(6){animation-delay:.6s;height:45%}
  .sm-wave i:nth-child(7){animation-delay:.72s;height:65%}
  @keyframes smWave{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}
  .sm-va-replay{margin-top:12px;display:flex;align-items:center;gap:10px;background:#0c2230;border:1px solid rgba(255,214,107,.4);
    border-radius:12px;padding:10px 12px;animation:smVaReplay 7s ease-in-out infinite}
  .sm-va-play{width:24px;height:24px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#ffe9a8,#f5c451);
    display:flex;align-items:center;justify-content:center;color:#5b4300;font-size:9px}
  .sm-va-rt b{display:block;font-size:11.5px;font-weight:700;color:#ffd66b}
  .sm-va-rt span{font-size:10px;color:#9fb3bf;line-height:1.35}
  @keyframes smVaReplay{0%,42%{opacity:0;transform:translateY(8px)}56%,100%{opacity:1;transform:none}}

  /* ============ summary + closing ============ */
  .sm-sum{background:var(--ewr-surface);border:1px solid var(--ewr-border);border-radius:18px;padding:24px 28px;box-shadow:var(--ewr-shadow-card);display:grid;grid-template-columns:1fr 1fr;gap:12px 26px}
  .sm-sum li{list-style:none;display:flex;align-items:flex-start;gap:11px;font-size:14.5px;color:var(--ewr-text);line-height:1.4}
  .sm-sum li svg{width:18px;height:18px;color:var(--ewr-green);flex-shrink:0;margin-top:1px}
  .sm-section-h{font-family:'Montserrat',sans-serif;font-weight:600;font-size:22px;letter-spacing:-0.2px;color:var(--ewr-text);text-align:center;margin:44px 0 10px}

  .sm-close{position:relative;overflow:hidden;background:var(--ewr-dark);border-radius:22px;padding:40px 34px;text-align:center;margin-top:26px;box-shadow:0 22px 54px -24px rgba(1,22,36,.7)}
  .sm-close::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,#37dbff,#5230da)}
  .sm-close h2{font-family:'Montserrat',sans-serif;font-weight:600;font-size:26px;color:#fff;margin:0 0 10px;letter-spacing:-0.3px}
  .sm-close p{color:#aeb9c2;font-size:15px;line-height:1.6;margin:0 auto 22px;max-width:520px}
  .sm-close-cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .sm-close .sm-portal{margin-top:30px;font-size:13px;color:#8ea0ac}
  .sm-portal a{color:#9be7ff;font-weight:700;text-decoration:none;border-bottom:1px solid rgba(155,231,255,.4)}
  .sm-portal a:hover{color:#cdeeff}

  /* ============ buttons ============ */
  .sm-go,.sm-ghost{display:inline-flex;align-items:center;gap:8px;font-family:'Inter',sans-serif;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;
    border-radius:999px;padding:13px 22px;text-decoration:none;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease,color .15s ease,background .15s ease}
  .sm-go svg,.sm-ghost svg{width:16px;height:16px}
  .sm-go{color:#fff;background:var(--ewr-accent-strong);border:1px solid transparent;box-shadow:0 10px 24px -12px rgba(64,29,145,.6)}
  .sm-go:hover{background:var(--ewr-text);color:#fff;transform:translateY(-1px)}
  .sm-ghost{color:var(--ewr-text);background:var(--ewr-surface);border:1px solid var(--ewr-border)}
  .sm-ghost:hover{border-color:var(--ewr-accent);color:var(--ewr-accent);transform:translateY(-1px)}
  .sm-close .sm-ghost{color:#dbe2e6;background:transparent;border-color:#2a3f4d}
  .sm-close .sm-ghost:hover{border-color:var(--acc);color:#fff}
  .sm-go:focus-visible,.sm-ghost:focus-visible{outline:2px solid var(--ewr-accent);outline-offset:3px}

  /* ============ motion control ============ */
  .sm-anim:not(.in-view) *,.sm-anim.sm-hidden *{animation-play-state:paused!important}
  /* On-camera band — a REAL 9:16 session share video in a framed player */
  .sm-cam-wrap{position:relative;border-radius:16px;overflow:hidden;background:#0b1b28;box-shadow:0 18px 44px rgba(1,22,36,.18);
    display:flex;justify-content:center}
  .sm-cam-clip{display:block;max-height:500px;width:auto;max-width:100%;object-fit:contain}
  .sm-cam-tag{position:absolute;left:12px;bottom:12px;display:inline-flex;align-items:center;gap:7px;padding:5px 12px;
    border-radius:999px;background:rgba(4,15,25,.62);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:11.5px;font-weight:600}
  .sm-cam-tag i{width:7px;height:7px;border-radius:50%;background:#3ddc8e;box-shadow:0 0 8px rgba(61,220,142,.9)}
  .sm-cam-rec{position:absolute;right:12px;top:12px;padding:4px 10px;border-radius:999px;background:rgba(4,15,25,.55);
    border:1px solid rgba(232,184,75,.5);color:#e8b84b;font-size:10px;font-weight:700;letter-spacing:.08em}

  .sm-reveal .sm-band,.sm-reveal .sm-strip{opacity:0;transform:translateY(16px);transition:opacity .55s ease,transform .55s ease}
  .sm-reveal .sm-band.in-view,.sm-reveal .sm-strip.in-view{opacity:1;transform:none}

  @media (prefers-reduced-motion:reduce){
    .sm-anim *{animation:none!important}
    .sm-lw-maker{top:6%;opacity:1}.sm-lw-visit,.sm-lw-coupon{opacity:1}
    .sm-rung.r3{background:rgba(47,208,122,.14);border-color:rgba(47,208,122,.55)}.sm-rung.r3 .sm-rung-v{color:#fff}
    .sm-pcard-badge,.sm-pass-badge{opacity:1;transform:none}.sm-pass-state{opacity:1}.sm-pass-inf path{stroke-dashoffset:0}
    .sm-va-replay{opacity:1;transform:none}
  }

  /* ============ responsive ============ */
  @media (max-width:860px){
    .sm-hero{background:var(--ewr-surface)}
    .sm-hero-bg.dsk{display:none}
    .sm-hero-bg.mob{display:block;position:static;width:100%;height:auto}
    .sm-hero-scrim{display:none}
    .sm-hero-text{position:relative;z-index:auto;width:auto;padding:22px 20px 20px}
    .sm-hero-logo{width:152px;max-width:56%}
    .sm-hero h1{font-size:30px}
    .sm-hero-lead{max-width:none}
    .sm-strip{grid-template-columns:1fr 1fr}
    .sm-band{grid-template-columns:1fr;gap:22px;padding:24px 20px}
    .sm-band.alt .sm-band-media{order:0}
    .sm-band h2{font-size:21px}
    .sm-sum{grid-template-columns:1fr;padding:20px}
  }
  @media (max-width:720px){
    .sm-close-cta{flex-direction:column;align-items:center}
    .sm-close-cta .sm-go,.sm-close-cta .sm-ghost{width:100%;max-width:360px;justify-content:center}
  }
  @media (max-width:560px){
    .sm-hero-logo{width:148px;max-width:60%}
    .sm-hero h1{font-size:26px}
    .sm-strip{grid-template-columns:1fr 1fr;gap:10px;padding:14px}
    .sm-cta-row,.sm-close-cta{flex-direction:column;align-items:stretch}
    .sm-cta-row .sm-go,.sm-cta-row .sm-ghost,.sm-close-cta .sm-go,.sm-close-cta .sm-ghost{width:100%;justify-content:center}
  }
  `;
  document.head.appendChild(el);
}

function pageHtml(){
  return `
  <div class="sm-wrap">
    <section class="sm-hero">
      <img class="sm-hero-bg dsk" src="assets/sm-maker-woman-desktop.jpg" alt="A Spiritual Maker holding an Egely Wheel" loading="eager">
      <img class="sm-hero-bg mob" src="assets/sm-maker-woman-mobile.jpg" alt="A Spiritual Maker holding an Egely Wheel" loading="eager">
      <div class="sm-hero-scrim" aria-hidden="true"></div>
      <div class="sm-hero-text">
        <img class="sm-hero-logo" src="assets/spiritual-maker-logo.png" alt="Spiritual Maker logo">
        <span class="sm-eyebrow">Spiritual Maker Features</span>
        <h1>Be visible. Build&nbsp;trust. Grow with EWR&nbsp;Live.</h1>
        <p class="sm-hero-lead">Spiritual Makers receive a dedicated presence inside EWR Live — helping people discover them, share measurements with them, and purchase an Egely Wheel through their recommendation.</p>
        <div class="sm-cta-row">
          <a class="sm-go" href="${AFFILIATE}" target="_blank" rel="noopener">Become a Spiritual Maker ${I.ext}</a>
          <a class="sm-ghost" href="#/profile">Already a maker? Open your profile</a>
        </div>
      </div>
    </section>

    <div class="sm-strip">
      <div class="sm-strip-i"><span class="sm-strip-ic">${I.eye}</span><span class="sm-strip-t">Live wall visibility</span></div>
      <div class="sm-strip-i"><span class="sm-strip-ic">${I.link}</span><span class="sm-strip-t">Affiliate tools</span></div>
      <div class="sm-strip-i"><span class="sm-strip-ic">${I.mic}</span><span class="sm-strip-t">Live voice hosting</span></div>
      <div class="sm-strip-i"><span class="sm-strip-ic">${I.badge}</span><span class="sm-strip-t">Recognizable status</span></div>
      <div class="sm-strip-i"><span class="sm-strip-ic">${I.inf}</span><span class="sm-strip-t">Lifetime access</span></div>
    </div>

    <section class="sm-band card">
      <div class="sm-band-text">
        <span class="sm-eyebrow">Get discovered</span>
        <h2>Stay discoverable on the Live wall</h2>
        <p>Activate your Spiritual Maker presence and rise to the top of the Live community as a verified, featured maker. People discover your profile, connect with you, follow their own progress with you, and see your Egely Wheel recommendation.</p>
        <p class="sm-fine">Spotlight is a listing — it never marks you as online; your real online and measuring status is shown separately.</p>
      </div>
      <div class="sm-band-media">
        <div class="sm-screen sm-anim in-view" aria-hidden="true">
          <div class="sm-screen-bar"><span class="sm-tag"><i></i>Live community</span><span class="sm-lw-feat">Featured on Live</span></div>
          <div class="sm-lw-list">
            <div class="sm-lw-ghost"><span class="av"></span><span class="bar w2"></span></div>
            <div class="sm-lw-ghost"><span class="av"></span><span class="bar w1"></span></div>
            <div class="sm-lw-ghost"><span class="av"></span><span class="bar w3"></span></div>
            <div class="sm-lw-maker">
              <span class="sm-lw-face"><img src="assets/sm-maker-man.jpg" alt=""></span>
              <div class="sm-lw-id">
                <div class="sm-lw-nm">Spiritual Maker <span class="sm-lw-bdg">${I.spark} Verified</span></div>
                <div class="sm-lw-sub">Your public maker profile</div>
              </div>
              <span class="sm-lw-visit"><span class="vav">+</span><span class="vtx">connected</span></span>
            </div>
            <span class="sm-lw-coupon">${I.spark} Your offer · SAVE $50</span>
          </div>
        </div>
      </div>
    </section>

    <section class="sm-band tint alt">
      <div class="sm-band-text">
        <span class="sm-eyebrow">Recommend &amp; earn</span>
        <h2>Give your audience a reason to begin</h2>
        <p>Your public maker page can carry your personal affiliate link and a $50 customer coupon. Your audience saves — and you earn a commission on every eligible sale.</p>
        <p class="sm-fine">Your audience uses your $50 coupon; you earn the commission — Advocate, Pro or Ambassador tier, per eligible sale. Subject to the programme terms.</p>
        <div class="sm-earn-pair">
          <div class="sm-earn-item coupon"><span class="sm-earn-ic">${I.link}</span><div><div class="sm-earn-k">Your audience saves</div><div class="sm-earn-v"><b>$50</b> coupon</div></div></div>
          <div class="sm-earn-item earn"><span class="sm-earn-ic">${I.spark}</span><div><div class="sm-earn-k">You earn</div><div class="sm-earn-v">up to <b>$100</b>/sale</div></div></div>
        </div>
      </div>
      <div class="sm-band-media">
        <div class="sm-screen sm-anim in-view" aria-hidden="true">
          <div class="sm-screen-bar"><span class="sm-tag"><i></i>What your audience buys</span></div>
          <div class="sm-prod"><img src="${VP_IMG}" alt="Egely Wheel Vitality Pack" loading="lazy"></div>
          <div class="sm-ladder">
            <div class="sm-ladder-h">Maker commission · per eligible sale</div>
            <div class="sm-rung r1"><span class="sm-rung-n">Advocate</span><span class="sm-rung-v">$50</span></div>
            <div class="sm-rung r2"><span class="sm-rung-n">Pro</span><span class="sm-rung-v">$70</span></div>
            <div class="sm-rung r3"><span class="sm-rung-n">Ambassador</span><span class="sm-rung-v">$100</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="sm-band card">
      <div class="sm-band-text">
        <span class="sm-eyebrow">Recognizable status</span>
        <h2>Stand out as a Spiritual Maker</h2>
        <p>Your profile, community presence and shared sessions carry the Spiritual Maker badge, making your role immediately recognizable across the Live wall, your connection page, sessions and races, and the ranking.</p>
      </div>
      <div class="sm-band-media">
        <div class="sm-screen sm-badgefx sm-anim in-view" aria-hidden="true">
          <div class="sm-screen-bar"><span class="sm-tag"><i></i>Your profile</span></div>
          <div class="sm-pcard">
            <span class="sm-pcard-av"></span>
            <div><div class="sm-pcard-nm">Your name</div><div class="sm-pcard-sub">@your-handle</div></div>
            <span class="sm-pcard-badge">${I.spark} Spiritual Maker</span>
            <span class="sm-pcard-sweep"></span>
          </div>
          <div class="sm-where"><span>Live wall</span><span>Connection page</span><span>Sessions &amp; races</span><span>Ranking</span></div>
        </div>
      </div>
    </section>

    <div class="sm-feature-img"><img src="assets/sm-maker-man.jpg" alt="A Spiritual Maker"></div>

    <section class="sm-band card">
      <div class="sm-band-text">
        <span class="sm-eyebrow">Live voice</span>
        <h2>Guide them live — with your voice</h2>
        <p>Go live with your voice inside your own sessions and races — guide the group through the measurement, or commentate the race as it unfolds. Everything you say during the official window is recorded with the session and becomes a replayable guided practice your followers can return to any time.</p>
        <p class="sm-fine">Voice hosting is a Spiritual Maker feature. Listeners simply press play — right in the browser.</p>
      </div>
      <div class="sm-band-media">
        <div class="sm-screen sm-anim in-view" aria-hidden="true">
          <div class="sm-screen-bar"><span class="sm-tag"><i></i>Live voice</span><span class="sm-va-rec">● REC</span></div>
          <div class="sm-va-host">
            <span class="sm-va-ring"><i>${I.mic}</i></span>
            <div><div class="sm-va-nm">Your voice, live</div><div class="sm-va-sub">Guiding your session</div></div>
            <span class="sm-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
          </div>
          <div class="sm-va-replay">
            <span class="sm-va-play">▶</span>
            <div class="sm-va-rt"><b>Listen again · Replay</b><span>Your words stay with the session — followers can relive it any time</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="sm-band tint alt">
      <div class="sm-band-text">
        <span class="sm-eyebrow">On camera</span>
        <h2>Go live on camera — and keep the video</h2>
        <p>Turn your camera on inside your own sessions and races: your circle watches you guide the whole practice, live. Afterwards the recording is composed into a share-ready video — your face and the group’s energy in one frame, in 9:16 for TikTok and Reels or 16:9 for YouTube.</p>
        <p class="sm-fine">Shown here: a real session share video — the maker on camera above the group’s live pulse. Camera hosting is a Spiritual Maker feature.</p>
      </div>
      <div class="sm-band-media">
        <div class="sm-cam-wrap" aria-hidden="true">
          <video class="sm-cam-clip" src="assets/session-share-demo.mp4" muted loop playsinline preload="metadata"></video>
          <span class="sm-cam-tag"><i></i>Share-ready · 9:16</span>
        </div>
      </div>
    </section>

    <section class="sm-band card">
      <div class="sm-band-text">
        <span class="sm-eyebrow">Included for life</span>
        <h2>EWR Live access, included for life</h2>
        <p>Approved Spiritual Makers receive lifetime access to EWR Live measurement features, so they can keep measuring, hosting voice-guided sessions and supporting their community.</p>
        <p class="sm-fine">Lifetime access to the EWR Live software — not a free physical Egely Wheel.</p>
      </div>
      <div class="sm-band-media">
        <div class="sm-screen sm-pass-wrap sm-anim in-view" aria-hidden="true">
          <div class="sm-pass">
            <div class="sm-pass-top"><span class="sm-pass-lbl">EWR Live access</span><span class="sm-pass-badge">${I.spark}</span></div>
            <div class="sm-pass-big">Lifetime</div>
            <div class="sm-pass-state">Lifetime access active</div>
            <svg class="sm-pass-inf" viewBox="0 0 80 28"><path d="M40 14 C40 3 24 3 24 14 C24 25 40 25 40 14 C40 3 56 3 56 14 C56 25 40 25 40 14 Z"/></svg>
          </div>
        </div>
      </div>
    </section>

    <h2 class="sm-section-h">Everything a Spiritual Maker gets</h2>
    <ul class="sm-sum">
      <li>${I.check}<span>Live wall visibility for your profile</span></li>
      <li>${I.check}<span>A public Spiritual Maker profile</span></li>
      <li>${I.check}<span>$50 customer coupon and affiliate tools</span></li>
      <li>${I.check}<span>Up to $100 commission per eligible sale</span></li>
      <li>${I.check}<span>Live voice hosting in your sessions &amp; races</span></li>
      <li>${I.check}<span>Recordings your followers can replay any time</span></li>
      <li>${I.check}<span>Recognizable Spiritual Maker status</span></li>
      <li>${I.check}<span>Lifetime EWR Live software access</span></li>
    </ul>

    <section class="sm-close">
      <h2>Bring your practice into the EWR Live community</h2>
      <p>Host with your live voice, be seen on the Live wall, and earn a commission on every eligible sale to your audience — joining the programme is free.</p>
      <div class="sm-close-cta">
        <a class="sm-go" href="${AFFILIATE}" target="_blank" rel="noopener">Become a Spiritual Maker ${I.ext}</a>
        <a class="sm-ghost" href="#/profile">Already a Spiritual Maker? Open your profile</a>
      </div>
      <p class="sm-portal"><a href="${PORTAL}" target="_blank" rel="noopener">Affiliate login &amp; registration ↗</a></p>
    </section>
  </div>`;
}

export function mount(el){
  styles();
  el.innerHTML = pageHtml();

  const wrap = el.querySelector('.sm-wrap');
  const supportsIO = 'IntersectionObserver' in window;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Scroll-reveal only when we can observe AND motion is allowed; otherwise the
  // page renders fully visible (no hidden-by-default content).
  if(wrap && supportsIO && !reduce) wrap.classList.add('sm-reveal');

  let io = null;
  if(supportsIO){
    io = new IntersectionObserver(
      es => es.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting)),
      { rootMargin: '0px 0px -6% 0px' });
    el.querySelectorAll('.sm-anim, .sm-band, .sm-strip').forEach(p => io.observe(p));
  }
  // Pause decorative motion in a background tab.
  const onVis = () => el.querySelectorAll('.sm-anim').forEach(p => p.classList.toggle('sm-hidden', document.hidden));
  document.addEventListener('visibilitychange', onVis);

  // The on-camera clip (Abi) plays only while its band is on screen; reduced
  // motion leaves it paused on the first frame.
  const camClip = el.querySelector('.sm-cam-clip');
  let camTimer = 0;
  if(camClip && !reduce){
    camTimer = setInterval(() => {
      const band = camClip.closest('.sm-band');
      const on = !document.hidden && (!supportsIO || (band && band.classList.contains('in-view')));
      if(on && camClip.paused) camClip.play().catch(() => {});
      else if(!on && !camClip.paused) camClip.pause();
    }, 700);
  }

  return () => {
    if(io) io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    if(camTimer) clearInterval(camTimer);
  };
}
