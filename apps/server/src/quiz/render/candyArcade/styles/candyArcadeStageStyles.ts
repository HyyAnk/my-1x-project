import { getQuizPreviewLayoutCapability, MASCOT_CANVAS_SIZES, type MascotRenderAspectRatio } from "@studio/shared";
import { candyArcadePortraitStylesCss } from "./candyArcadePortraitStyles.js";
import { candyArcadeMascotCapacityStylesCss } from "./candyArcadeMascotCapacityStyles.js";
import { counterQuestionLayoutCss } from "../../frame/counterQuestionLayout.js";

export interface CandyArcadeStageStyleOptions {
  aspectRatio?: MascotRenderAspectRatio;
  canvas?: { width: number; height: number };
  baselineRenderMetrics?: { width: number; height: number };
}

const LEGACY_QUESTION_CARD_GEOMETRY = {
  x: 370,
  y: 45,
  height: 168,
} as const;

/**
 * Stage geometry, scenes, safe zones, and layout containers.
 */
export function candyArcadeStageCss(options: CandyArcadeStageStyleOptions = {}): string {
  const aspectRatio = options.aspectRatio ?? "16:9";
  const canvas = options.canvas ?? MASCOT_CANVAS_SIZES[aspectRatio];
  const baselineRenderMetrics = options.baselineRenderMetrics ?? getQuizPreviewLayoutCapability("baseline").metrics.render;

  return `
#stage { position: relative; width: ${canvas.width}px; height: ${canvas.height}px; overflow: hidden; }
#stage[data-aspect-ratio="16:9"] {
  --safe-zone-top: 54px;
  --safe-zone-bottom: 54px;
  --safe-zone-left: 96px;
  --safe-zone-right: 96px;
}
.clip { position: absolute; inset: 0; }
.candy-scene { --depth-edge: rgba(13,35,71,.16); --depth-shadow: rgba(13,35,71,.22); isolation: isolate; overflow: hidden; padding: 33px 80px 16px; background: var(--bg-primary); color: var(--ink); contain: layout paint; }
${counterQuestionLayoutCss(".candy-scene:not(.quiz-frame-unified)", LEGACY_QUESTION_CARD_GEOMETRY)}
.hanging-wood-sign { --counter-badge-mount-height: 64px; --counter-badge-body-height: 150px; position: relative; z-index: 6; display: flex; flex-direction: column; align-items: center; width: 250px; transform-origin: 50% 0; animation: hanging-sign-enter .64s cubic-bezier(.18,1.42,.34,1) var(--clip-start) both, hanging-sign-sway 4.8s ease-in-out calc(var(--clip-start) + .64s) infinite alternate both; will-change: transform; }
.hanging-ropes { position: relative; display: flex; justify-content: space-between; width: 170px; height: 64px; pointer-events: none; }
.wood-rope { width: 9px; height: calc(100% + 8px); margin-top: -8px; border-radius: 4px; background: repeating-linear-gradient(135deg, #D4A373 0px, #D4A373 5px, #A75C1C 5px, #A75C1C 10px); box-shadow: 2px 2px 5px rgba(13,35,71,.28); }
.wood-sign-plank { position: relative; width: 240px; height: 150px; min-height: 150px; padding: 10px; border: 6.5px solid #48200A; border-radius: 34px; background: linear-gradient(180deg, #A25324 0%, #823E17 50%, #642B0D 100%); box-shadow: inset 0 4px 0 rgba(255,215,120,.5), inset 0 -5px 0 rgba(35,14,5,.6), 0 12px 0 var(--depth-shadow), 0 22px 32px rgba(10,25,60,.24); display: grid; place-items: center; }
.rope-bracket { position: absolute; top: -9px; width: 24px; height: 16px; border: 4px solid #331505; border-radius: 8px; background: #FFC436; box-shadow: inset 0 2px 0 #FFF, 0 2px 4px rgba(0,0,0,.3); }
.bracket-left { left: 28px; }
.bracket-right { right: 28px; }
.wood-inner-panel { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 108px; border-radius: 22px; border: 4px solid #3E1A07; background: linear-gradient(180deg, #6F3010 0%, #522208 100%); box-shadow: inset 0 4px 8px rgba(0,0,0,.55), inset 0 -3px 0 rgba(255,215,120,.22); }
.question-number-val { font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 74px; font-weight: 900; line-height: 1; color: #FFFDF0; text-shadow: 0 4px 0 #331505, 0 8px 18px rgba(0,0,0,.5); letter-spacing: -1px; }
.wood-sign-star { position: absolute; pointer-events: none; }
.wood-sign-star.star-tl { top: -10px; left: -10px; color: #FFD43F; font-size: 26px; text-shadow: 0 0 12px rgba(255,212,63,.85); transform: rotate(-15deg); }
.wood-sign-star.star-br { bottom: -10px; right: -10px; color: #FFB703; font-size: 28px; text-shadow: 0 3px 0 #331505; transform: rotate(15deg); }
.game-stage { position: relative; z-index: 3; display: grid; justify-items: center; align-content: start; width: 1420px; min-height: 945px; margin: 12px 40px 0 auto; contain: layout style; }
.question-title { position: relative; z-index: 3; width: var(--question-card-width, 1440px); max-width: var(--question-card-width, 1440px); height: 168px; min-height: 168px; justify-self: center; margin-left: auto; margin-right: auto; text-align: center; display: flex; align-items: center; justify-content: center; contain: layout style; }
.question-card-inner { position: relative; width: 100%; height: 100%; min-height: 168px; display: flex; align-items: center; justify-content: center; padding: 16px 52px; box-sizing: border-box; border: 7px solid #FFC938; border-radius: 42px; background: linear-gradient(180deg, #FFFFFF 0%, #FFFDF7 28%, #FFF8EA 100%); box-shadow: inset 0 4px 0 rgba(255,255,255,0.95), inset 0 8px 0 rgba(56,189,248,0.25), inset 0 -5px 0 rgba(245,166,35,0.22), 0 16px 0 var(--depth-shadow), 0 26px 42px rgba(10,25,60,0.16); }
.question-title h1 { margin: 0; color: #342245; font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: var(--question-size, 50px); font-weight: 800; line-height: var(--question-leading, 1.18); letter-spacing: -0.5px; text-wrap: balance; text-shadow: 0 2px 0 rgba(255,255,255,0.8), 0 3px 0 rgba(10,35,75,0.08); width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: break-word; word-break: break-word; }
.keyword-highlight { color: #047857; text-shadow: 0 1px 0 rgba(255,255,255,0.8); }
.q-badge-star { position: absolute; top: -26px; left: -18px; z-index: 5; display: grid; place-items: center; width: 68px; height: 68px; border: 4.5px solid #fff; border-radius: 22px; background: linear-gradient(145deg, #FFDD44 0%, #FFA826 100%); color: #fff; box-shadow: 0 8px 0 rgba(13,35,71,0.22), 0 12px 20px rgba(13,35,71,0.18); transform: rotate(-10deg); animation: star-wobble 3.6s ease-in-out infinite alternate; will-change: transform; }
.star-shape { font-size: 42px; line-height: 1; text-shadow: 0 2px 0 rgba(180,100,0,0.4); }
.star-sparkle { position: absolute; font-style: normal; pointer-events: none; }
.star-sp-1 { top: -10px; right: -12px; color: #5CE1E6; font-size: 24px; text-shadow: 0 0 8px rgba(92,225,230,0.8); animation: sparkle-blink 2s ease-in-out infinite; }
.star-sp-2 { bottom: -6px; left: -10px; color: #FF66A1; font-size: 18px; animation: sparkle-blink 2s ease-in-out infinite 0.7s; }
.q-decor-corner { position: absolute; z-index: 4; pointer-events: none; }
.q-decor-top-right { top: -12px; right: 18px; color: #FFD43F; font-size: 28px; text-shadow: 0 0 10px rgba(255,212,63,0.7); animation: sparkle-blink 2.4s ease-in-out infinite 0.3s; }
.q-decor-bottom-right { bottom: -14px; right: 14px; color: #C084FC; font-size: 30px; text-shadow: 0 3px 0 rgba(13,35,71,0.14); transform: rotate(12deg); }
.image-card { position: relative; z-index: 3; display: block; margin: 0; overflow: hidden; border: 12px solid #fff; border-radius: 42px; background: #fff; box-shadow: 0 20px 0 rgba(13,35,71,.2), 0 29px 44px rgba(13,35,71,.18); contain: layout paint; }
.image-card img { display: block; width: 100%; height: 100%; object-fit: cover; }
.image-shine { position: absolute; z-index: 4; inset: 0; background: linear-gradient(125deg, rgba(255,255,255,.35), transparent 31%); pointer-events: none; }
.game-stage > .hero-image { width: ${baselineRenderMetrics.width}px; height: ${baselineRenderMetrics.height}px; margin-top: 39px; }
.hero-image img { transform-origin: center; animation: hero-ken-burn var(--scene-duration) ease-in-out var(--clip-start) 1 alternate both; will-change: transform; }
.phase-region { position: absolute; z-index: 5; left: 0; bottom: 10px; width: var(--question-card-width, 1440px); height: 110px; transform: none; contain: layout style; pointer-events: none; }
.phase-region > .thinking-bar { position: absolute; z-index: 5; bottom: -15px; left: 50%; margin-top: 0; transform: translateX(-50%); width: min(70vw, 1300px); min-height: 84px; animation: phase-hold var(--timer-duration) steps(1,end) var(--timer-start) both, timer-exit-fade-centered .28s cubic-bezier(.22,.8,.3,1) calc(var(--timer-start) + var(--timer-duration) - .28s) both; }
.phase-region > .fact-card { position: absolute; z-index: 5; bottom: -45px; left: 50%; margin-top: 0; transform: translateX(-50%); width: min(70vw, 1300px); }

.candy-intro, .candy-outro { display: grid; place-items: center; background: #F6B83D; color: #172A59; }
.intro-rays { position: absolute; z-index: 0; inset: -30%; opacity: .12; background: repeating-conic-gradient(from 8deg, rgba(255,255,255,.9) 0 9deg, transparent 9deg 19deg); animation: ray-spin 150s linear 0s infinite both; }
.intro-card, .outro-card { position: relative; z-index: 3; display: grid; justify-items: center; text-align: center; }
.intro-card > span, .outro-card > span { display: inline-flex; padding: 15px 23px; border-radius: 999px; background: #FF6277; color: #172A59; box-shadow: 0 10px 0 rgba(13,35,71,.18); font-size: 25px; font-weight: 900; letter-spacing: 1.5px; }
.intro-card h1, .outro-card h1 { max-width: 1050px; margin: 29px 0 9px; font-size: 96px; line-height: 1.02; letter-spacing: -4px; }
.intro-card p, .outro-card p { margin: 0; font-size: 37px; font-weight: 900; }
.intro-stars, .outro-stars { margin-top: 35px; color: #172A59; font-size: 43px; }
.outro-cta-badges { display: flex; gap: 18px; margin-top: 24px; align-items: center; justify-content: center; }
.badge-cta { display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: 999px; background: #FFFFFF; color: #172A59; font-size: 24px; font-weight: 900; box-shadow: 0 8px 0 rgba(13,35,71,.18); border: 3px solid #172A59; }
.badge-comment { background: #29B9A8; color: #172A59; }
.badge-like { background: #FF6277; color: #172A59; }
.badge-sub { background: #FFC436; color: #172A59; }
.intro-dot { position: absolute; z-index: 1; border-radius: 50%; background: #fff; opacity: .47; }.dot-a { top: 126px; left: 250px; width: 158px; height: 158px; }.dot-b { right: 235px; bottom: 149px; width: 128px; height: 128px; }
.brand-mascot { position: absolute; z-index: var(--candy-layer-mascot); right: 255px; bottom: 95px; display: grid; place-items: center; width: 179px; height: 179px; border: 10px solid #fff; border-radius: 53px; background: #29B9A8; color: #172A59; box-shadow: 0 20px 0 rgba(13,35,71,.2); font-size: 93px; transform: rotate(-8deg); }
.outro-blob { position: absolute; z-index: 1; border-radius: 50%; background: rgba(255,255,255,.36); }.outro-blob.blob-a { top: 112px; left: 205px; width: 170px; height: 170px; }.outro-blob.blob-b { right: 220px; bottom: 130px; width: 205px; height: 205px; background: rgba(41,185,168,.36); }
.custom-intro-scene, .custom-outro-scene { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
.custom-intro-video, .custom-outro-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

${candyArcadeMascotCapacityStylesCss()}
${aspectRatio === "9:16" ? candyArcadePortraitStylesCss() : ""}
`;
}
