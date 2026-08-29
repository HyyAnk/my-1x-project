import { getAnswerCardsCss, getCounterBadgesCss, getQuestionBoxesCss, getThinkingBarsCss } from "../../visual/elements/index.js";
import { candyArcadeFontFaceCss, type CandyArcadeFontMode } from "./candyArcadeFonts.js";

export const CANDY_ARCADE_LAYOUT_DIMENSIONS = {
  baseline: { width: 800, height: 284 },
  media_left_choices_right: { width: 840, height: 580 },
  visual_choices_three: { width: 501, height: 500, count: 3 },
} as const;

export function candyArcadeHeroAreaRatio(layout: keyof typeof CANDY_ARCADE_LAYOUT_DIMENSIONS): number {
  const frameArea = 1920 * 1080;
  if (layout === "visual_choices_three") {
    const dimensions = CANDY_ARCADE_LAYOUT_DIMENSIONS.visual_choices_three;
    return Number(((dimensions.width * dimensions.height * dimensions.count) / frameArea).toFixed(4));
  }
  const dimensions = CANDY_ARCADE_LAYOUT_DIMENSIONS[layout];
  return Number(((dimensions.width * dimensions.height) / frameArea).toFixed(4));
}

export function candyArcadeCss(options: { fontMode?: CandyArcadeFontMode } = {}): string {
  return `
${candyArcadeFontFaceCss(options.fontMode ?? "render")}
:root {
  --candy-layer-transition: 10;
  --candy-layer-mascot: 11;
  font-family: "Fredoka", "Nunito", "Trebuchet MS", sans-serif;
}
* { box-sizing: border-box; }
html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #16285c; }
#stage { position: relative; width: 1920px; height: 1080px; overflow: hidden; }
.clip { position: absolute; inset: 0; }
.candy-scene { --depth-edge: rgba(13,35,71,.16); --depth-shadow: rgba(13,35,71,.22); isolation: isolate; overflow: hidden; padding: 33px 80px 16px; background: var(--bg-primary); color: var(--ink); }
.bg-gradient { position: absolute; z-index: 0; inset: 0; background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary)); }
.bg-gradient::after { position: absolute; z-index: 0; top: 3%; left: 9%; width: 460px; height: 250px; border-radius: 50%; background: rgba(255,255,255,.16); content: ""; transform: rotate(-15deg); }
.bg-rays { position: absolute; z-index: 1; inset: -30%; opacity: .065; background: repeating-conic-gradient(from 8deg, rgba(255,255,255,.9) 0 7deg, transparent 7deg 18deg); animation: ray-spin 150s linear var(--clip-start) infinite both; }
.bg-pattern { position: absolute; z-index: 1; opacity: .085; pointer-events: none; }
.pattern-circles { inset: 0; background-image: repeating-linear-gradient(45deg, transparent 0 23px, rgba(255,255,255,.9) 24px 27px, transparent 28px 52px); background-size: 82px 82px; animation: drift var(--scene-duration) linear var(--clip-start) 1 both; }
.pattern-sprinkles { right: -110px; bottom: -135px; width: 620px; height: 620px; border: 35px dotted rgba(255,255,255,.7); border-radius: 50%; transform: rotate(-14deg); }
.bg-shape { position: absolute; z-index: 1; border-radius: 48% 52% 43% 57%; background: rgba(255,255,255,.11); animation: ambient-drift var(--scene-duration) ease-in-out var(--clip-start) 1 alternate both; }
.shape-a { top: 17%; right: 7%; width: 310px; height: 190px; transform: rotate(-15deg); }
.shape-b { bottom: 10%; left: -4%; width: 360px; height: 250px; border-radius: 63% 37% 54% 46%; animation-delay: -7s; }
.shape-c { right: 24%; bottom: -8%; width: 290px; height: 210px; opacity: .7; animation-delay: -12s; }
.game-header { position: absolute; z-index: 6; top: 0; left: 40px; }
.hanging-wood-sign { position: relative; z-index: 6; display: flex; flex-direction: column; align-items: center; width: 250px; transform-origin: 50% 0; animation: hanging-sign-enter .64s cubic-bezier(.18,1.42,.34,1) var(--clip-start) both, hanging-sign-sway 4.8s ease-in-out calc(var(--clip-start) + .64s) infinite alternate both; }
.hanging-ropes { position: relative; display: flex; justify-content: space-between; width: 170px; height: 44px; pointer-events: none; }
.wood-rope { width: 9px; height: 100%; border-radius: 4px; background: repeating-linear-gradient(135deg, #D4A373 0px, #D4A373 5px, #A75C1C 5px, #A75C1C 10px); box-shadow: 2px 2px 5px rgba(13,35,71,.28); }
.wood-sign-plank { position: relative; width: 240px; height: 150px; min-height: 150px; padding: 10px; border: 6.5px solid #48200A; border-radius: 34px; background: linear-gradient(180deg, #A25324 0%, #823E17 50%, #642B0D 100%); box-shadow: inset 0 4px 0 rgba(255,215,120,.5), inset 0 -5px 0 rgba(35,14,5,.6), 0 12px 0 var(--depth-shadow), 0 22px 32px rgba(10,25,60,.24); display: grid; place-items: center; }
.rope-bracket { position: absolute; top: -9px; width: 24px; height: 16px; border: 4px solid #331505; border-radius: 8px; background: #FFC436; box-shadow: inset 0 2px 0 #FFF, 0 2px 4px rgba(0,0,0,.3); }
.bracket-left { left: 28px; }
.bracket-right { right: 28px; }
.wood-inner-panel { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 108px; border-radius: 22px; border: 4px solid #3E1A07; background: linear-gradient(180deg, #6F3010 0%, #522208 100%); box-shadow: inset 0 4px 8px rgba(0,0,0,.55), inset 0 -3px 0 rgba(255,215,120,.22); }
.question-number-val { font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 74px; font-weight: 900; line-height: 1; color: #FFFDF0; text-shadow: 0 4px 0 #331505, 0 8px 18px rgba(0,0,0,.5); letter-spacing: -1px; }
.wood-sign-star { position: absolute; pointer-events: none; }
.wood-sign-star.star-tl { top: -10px; left: -10px; color: #FFD43F; font-size: 26px; text-shadow: 0 0 12px rgba(255,212,63,.85); transform: rotate(-15deg); }
.wood-sign-star.star-br { bottom: -10px; right: -10px; color: #FFB703; font-size: 28px; text-shadow: 0 3px 0 #331505; transform: rotate(15deg); }
.game-stage { position: relative; z-index: 3; display: grid; justify-items: center; align-content: start; width: 1580px; min-height: 945px; margin: 12px 40px 0 auto; }
.question-title { position: relative; z-index: 3; max-width: 1440px; width: 100%; height: 168px; min-height: 168px; justify-self: end; margin-left: auto; text-align: center; display: flex; align-items: center; justify-content: center; }
.question-card-inner { position: relative; width: 100%; height: 100%; min-height: 168px; display: flex; align-items: center; justify-content: center; padding: 18px 64px; box-sizing: border-box; border: 7px solid #FFC938; border-radius: 42px; background: linear-gradient(180deg, #FFFFFF 0%, #FFFDF7 28%, #FFF8EA 100%); box-shadow: inset 0 4px 0 rgba(255,255,255,0.95), inset 0 8px 0 rgba(56,189,248,0.25), inset 0 -5px 0 rgba(245,166,35,0.22), 0 16px 0 var(--depth-shadow), 0 26px 42px rgba(10,25,60,0.16); }
.question-title h1 { margin: 0; color: #342245; font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: var(--question-size); font-weight: 800; line-height: var(--question-leading); letter-spacing: -0.5px; text-wrap: balance; text-shadow: 0 2px 0 rgba(255,255,255,0.8), 0 3px 0 rgba(16,35,75,0.08); width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.keyword-highlight { color: #047857; text-shadow: 0 1px 0 rgba(255,255,255,0.8); }
.q-badge-star { position: absolute; top: -26px; left: -18px; z-index: 5; display: grid; place-items: center; width: 68px; height: 68px; border: 4.5px solid #fff; border-radius: 22px; background: linear-gradient(145deg, #FFDD44 0%, #FFA826 100%); color: #fff; box-shadow: 0 8px 0 rgba(13,35,71,0.22), 0 12px 20px rgba(13,35,71,0.18); transform: rotate(-10deg); animation: star-wobble 3.6s ease-in-out infinite alternate; }
.star-shape { font-size: 42px; line-height: 1; text-shadow: 0 2px 0 rgba(180,100,0,0.4); }
.star-sparkle { position: absolute; font-style: normal; pointer-events: none; }
.star-sp-1 { top: -10px; right: -12px; color: #5CE1E6; font-size: 24px; text-shadow: 0 0 8px rgba(92,225,230,0.8); animation: sparkle-blink 2s ease-in-out infinite; }
.star-sp-2 { bottom: -6px; left: -10px; color: #FF66A1; font-size: 18px; animation: sparkle-blink 2s ease-in-out infinite 0.7s; }
.q-decor-corner { position: absolute; z-index: 4; pointer-events: none; }
.q-decor-top-right { top: -12px; right: 18px; color: #FFD43F; font-size: 28px; text-shadow: 0 0 10px rgba(255,212,63,0.7); animation: sparkle-blink 2.4s ease-in-out infinite 0.3s; }
.q-decor-bottom-right { bottom: -14px; right: 14px; color: #C084FC; font-size: 30px; text-shadow: 0 3px 0 rgba(13,35,71,0.14); transform: rotate(12deg); }
.image-card { position: relative; z-index: 3; display: block; margin: 0; overflow: hidden; border: 12px solid #fff; border-radius: 42px; background: #fff; box-shadow: 0 20px 0 rgba(13,35,71,.2), 0 29px 44px rgba(13,35,71,.18); }
.image-card img { display: block; width: 100%; height: 100%; object-fit: cover; }
.image-shine { position: absolute; z-index: 4; inset: 0; background: linear-gradient(125deg, rgba(255,255,255,.35), transparent 31%); pointer-events: none; }
.game-stage > .hero-image { width: ${CANDY_ARCADE_LAYOUT_DIMENSIONS.baseline.width}px; height: ${CANDY_ARCADE_LAYOUT_DIMENSIONS.baseline.height}px; margin-top: 39px; }
.hero-image img { transform-origin: center; animation: hero-ken-burn var(--scene-duration) ease-in-out var(--clip-start) 1 alternate both; }
.layout-media_left_choices_right .game-stage { grid-template-columns: minmax(0, 1.08fr) minmax(520px, .92fr); grid-template-areas: "title title" "hero answers"; align-items: start; column-gap: 42px; row-gap: 35px; }
.layout-media_left_choices_right .question-title { grid-area: title; width: 100%; max-width: 1440px; justify-self: end; margin-left: auto; }
.layout-media_left_choices_right .game-stage > .hero-image { grid-area: hero; width: 100%; height: 580px; margin-top: 0; }
.layout-media_left_choices_right .answer-grid { grid-area: answers; grid-template-columns: 1fr; width: 100%; height: 580px; margin-top: 0; padding-top: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; }
.layout-media_left_choices_right .answer-grid.answer-count-2 { gap: 50px; height: 580px; padding-top: 100px; }
.layout-media_left_choices_right .answer-count-2 .answer-card, .layout-media_left_choices_right .answer-count-3 .answer-card { height: 116px; min-height: 116px; margin-left: 76px; padding: 12px 34px 12px 42px; }
.layout-media_left_choices_right .answer-count-2 .answer-card::before, .layout-media_left_choices_right .answer-count-3 .answer-card::before { inset: 6px 14px 6px 24px; border-width: 3px; }
.layout-media_left_choices_right .answer-count-2 .answer-card > b, .layout-media_left_choices_right .answer-count-3 .answer-card > b { width: 138px; height: 138px; margin-left: -74px; font-size: 72px; border-width: 8px; }
.layout-media_left_choices_right .answer-count-2 .answer-card span, .layout-media_left_choices_right .answer-count-3 .answer-card span { font-size: 48px; }
.layout-media_left_choices_right .answer-count-2.choice-tier-medium span, .layout-media_left_choices_right .answer-count-3.choice-tier-medium span, .layout-media_left_choices_right .choice-tier-medium.answer-card span { font-size: 40px; }
.layout-media_left_choices_right .answer-count-2.choice-tier-long span, .layout-media_left_choices_right .answer-count-3.choice-tier-long span, .layout-media_left_choices_right .choice-tier-long.answer-card span { font-size: 32px; }
.layout-media_left_choices_right .answer-count-2.choice-tier-very_long span, .layout-media_left_choices_right .answer-count-2.choice-tier-overflow span, .layout-media_left_choices_right .answer-count-3.choice-tier-very_long span, .layout-media_left_choices_right .answer-count-3.choice-tier-overflow span, .layout-media_left_choices_right .choice-tier-very_long.answer-card span, .layout-media_left_choices_right .choice-tier-overflow.answer-card span { font-size: 26px; }
.layout-media_left_choices_right .answer-grid.answer-count-3 { gap: 50px; height: 580px; padding-top: 18px; }
.layout-visual_choices_three .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; align-items: start; row-gap: 35px; }
.layout-visual_choices_three .question-title { grid-area: title; width: 100%; max-width: 1440px; justify-self: end; margin-left: auto; }
.layout-visual_choices_three .visual-answer-grid { grid-area: answers; width: 1560px; margin-top: 0; gap: 28px; }
.phase-region { position: absolute; z-index: 5; left: 50%; bottom: 10px; width: 100%; height: 110px; transform: translateX(-50%); }
.phase-region > .thinking-bar { position: absolute; z-index: 5; bottom: -15px; left: 50%; margin-top: 0; transform: translateX(-50%); width: min(82vw, 1540px); min-height: 84px; }
.phase-region > .fact-card { position: absolute; z-index: 5; bottom: -45px; left: 50%; margin-top: 0; transform: translateX(-50%); width: min(1220px, 100%); }
.answer-card:nth-child(1), .visual-answer-card:nth-child(1) { --choice-stroke: #FFFFFF; --choice-stroke-shadow: #9A3412; --choice-depth-shadow: #E09000; --choice-badge-grad: linear-gradient(180deg, #FFB800 0%, #FF6D00 100%); --choice-badge-border: #FFFFFF; --choice-bg-tint: linear-gradient(180deg, #FFDF40 0%, #FFB800 100%); --choice-pattern: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='32' viewBox='0 0 64 32'%3E%3Cpath d='M0 16 Q 16 6 32 16 T 64 16' fill='none' stroke='%23FFFFFF' stroke-opacity='0.12' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E"); --choice-text-color: #78350F; --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.75); }
.answer-card:nth-child(2), .visual-answer-card:nth-child(2) { --choice-stroke: #FFFFFF; --choice-stroke-shadow: #881337; --choice-depth-shadow: #CC2556; --choice-badge-grad: linear-gradient(180deg, #FF4572 0%, #D80036 100%); --choice-badge-border: #FFFFFF; --choice-bg-tint: linear-gradient(180deg, #FF80A6 0%, #FF4D7E 100%); --choice-pattern: repeating-linear-gradient(-45deg, transparent, transparent 16px, rgba(255,255,255,0.09) 16px, rgba(255,255,255,0.09) 32px); --choice-text-color: #831843; --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.75); }
.answer-card:nth-child(3), .visual-answer-card:nth-child(3) { --choice-stroke: #FFFFFF; --choice-stroke-shadow: #034E7B; --choice-depth-shadow: #007ECC; --choice-badge-grad: linear-gradient(180deg, #2E93FF 0%, #0062E6 100%); --choice-badge-border: #FFFFFF; --choice-bg-tint: linear-gradient(180deg, #66D1FF 0%, #29B2FF 100%); --choice-pattern: radial-gradient(circle, rgba(255,255,255,0.12) 28%, transparent 29%); --choice-text-color: #0C4A6E; --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.75); }
.answer-grid { position: relative; z-index: 3; display: grid; gap: 28px; width: 1540px; margin-top: 28px; opacity: 0; animation: phase-enter .01s steps(1,end) calc(var(--clip-start) + var(--choices-at)) both; }
.answer-count-2 { grid-template-columns: repeat(2, 1fr); }
.answer-count-3 { grid-template-columns: repeat(3, 1fr); }
.answer-card { position: relative; z-index: 3; display: flex; align-items: center; min-height: 122px; gap: 20px; margin-left: 76px; padding: 14px 36px 14px 40px; overflow: visible; border: 8px solid var(--choice-stroke); border-radius: 9999px; background: var(--choice-pattern), var(--choice-bg-tint); background-size: 64px 32px, 100% 100%; box-shadow: 0 16px 0 var(--choice-depth-shadow), inset 0 4px 0 rgba(255,255,255,.7), 0 18px 32px rgba(10,25,60,.28); font-size: 44px; font-weight: 900; }
.answer-card::before { content: ""; position: absolute; inset: 6px 14px 6px 24px; border: 3px dashed rgba(255, 255, 255, 0.7); border-radius: 9999px; pointer-events: none; z-index: 3; }
.answer-card > b, .visual-answer-label > b { position: relative; z-index: 4; display: grid; flex: 0 0 auto; place-items: center; width: 156px; height: 156px; margin-left: -86px; border: 8px solid var(--choice-badge-border); border-radius: 50%; background: var(--choice-badge-grad); color: #FFFFFF !important; box-shadow: 0 12px 0 var(--choice-stroke-shadow), 0 14px 28px rgba(10,25,60,.35), -4px 6px 14px rgba(0,0,0,0.18), inset 0 -6px 0 rgba(0,0,0,0.22), inset 0 4px 0 rgba(255,255,255,0.85); font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 80px; font-weight: 900; line-height: 1; -webkit-text-stroke: 4px var(--choice-stroke-shadow); paint-order: stroke fill; text-shadow: 0 4px 0 var(--choice-stroke-shadow), 0 2px 6px rgba(0,0,0,.35); letter-spacing: -0.5px; }
.answer-card > b::after, .visual-answer-label > b::after { position: absolute; top: 4px; left: 12px; right: 12px; height: 44%; border-radius: 50% 50% 35% 35%; background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 65%, rgba(255,255,255,0) 100%); content: ""; pointer-events: none; z-index: 5; }
.answer-card span { position: relative; z-index: 4; flex: 1 1 auto; min-width: 0; padding-right: 48px; line-height: 1.15; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--choice-text-color, #1e293b) !important; text-shadow: var(--choice-text-shadow); }
.answer-card img { position: relative; z-index: 4; width: 68px; height: 68px; border-radius: 20px; object-fit: cover; animation: answer-float var(--scene-duration) ease-in-out calc(var(--clip-start) + var(--item-phase)) 1 alternate both; }
.choice-tier-medium span { font-size: 38px; }
.choice-tier-long span { font-size: 32px; }
.choice-tier-very_long span, .choice-tier-overflow span { font-size: 26px; }
.answer-card.answer-correct { animation: correct-card-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--reveal-at) + .14s) forwards; }
.answer-card.answer-correct > b { animation: correct-badge-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--reveal-at) + .14s) forwards; }
.answer-card.answer-incorrect { animation: incorrect-card-settle .38s ease-out calc(var(--clip-start) + var(--reveal-at)) forwards; }
.answer-check, .answer-cross { position: absolute; z-index: 6; top: 14px; right: 20px; display: grid; place-items: center; width: 54px; height: 54px; border: 4px solid #FFFFFF; border-radius: 50%; background: var(--correct); color: #FFFFFF; box-shadow: 0 6px 0 rgba(13,35,71,.22), 0 4px 12px rgba(0,0,0,0.18); font-size: 34px; font-weight: 900; font-style: normal; opacity: 0; animation: status-pop .38s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--reveal-at) + .16s) both; }
.answer-cross { background: var(--incorrect); }
.thinking-bar { position: relative; z-index: 5; isolation: isolate; display: flex; align-items: center; justify-content: center; width: min(82vw, 1540px); min-height: 84px; margin: 0 auto; padding: 6px 0; border: 0; border-radius: 9999px; background: transparent; box-shadow: none; opacity: 0; animation: phase-hold var(--timer-duration) steps(1,end) var(--clip-start) both, timer-exit-fade .28s cubic-bezier(.22,.8,.3,1) calc(var(--clip-start) + var(--timer-duration) - .28s) both; }
.thinking-track { position: relative; z-index: 0; width: 100%; height: 58px; overflow: visible; border: 6px solid rgba(255,255,255,.98); border-radius: 9999px; background: rgba(18,38,80,.62); box-shadow: inset 0 3px 6px rgba(255,255,255,.35), inset 0 -4px 8px rgba(0,0,0,.22), 0 8px 22px rgba(13,35,71,.35), 0 0 20px rgba(255,255,255,.25); }
.timer-milestones { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.milestone-star { position: absolute; top: 50%; font-size: 24px; line-height: 1; color: #FFE66D; text-shadow: 0 0 10px rgba(255,230,109,.95), 0 2px 4px rgba(0,0,0,.4); transform: translate(-50%,-50%); animation: quizProgressStarTwinkle 2.4s ease-in-out infinite; }
.milestone-star.star-1 { left: 20%; animation-delay: 0s; }
.milestone-star.star-2 { left: 40%; animation-delay: .6s; }
.milestone-star.star-3 { left: 60%; animation-delay: 1.2s; }
.milestone-star.star-4 { left: 80%; animation-delay: 1.8s; }
.timer-progress { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; border-radius: 9999px; overflow: hidden; background: linear-gradient(90deg, #ff4f5e 0%, #ff7a45 20%, #ffc83d 42%, #6fa9ff 70%, #28d5d0 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; }
.timer-progress::after { position: absolute; top: 0; left: 0; right: 0; height: 50%; border-radius: 9999px 9999px 0 0; background: linear-gradient(to bottom, rgba(255,255,255,.38) 0%, rgba(255,255,255,.1) 40%, rgba(255,255,255,0) 70%); content: ""; pointer-events: none; z-index: 2; }
.timer-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 176px; height: 176px; border: none; background: transparent; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both, quizProgressMarkerPulse 2.4s ease-in-out infinite; z-index: 6; }
.marker-star-svg { position: absolute; inset: -8px; width: 192px; height: 192px; overflow: visible; pointer-events: none; z-index: 4; }
.marker-val { position: absolute; inset: 0; display: grid; place-items: center; font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 64px; font-weight: 900; line-height: 1; color: #FFFFFF; text-shadow: 0 3px 6px rgba(120,20,45,.75), 0 0 12px rgba(255,255,255,.6); opacity: 0; pointer-events: none; z-index: 7; transform: translateY(-2px); }
.val-query { opacity: 1; animation: query-hold var(--cd-query-dur) steps(1,end) var(--clip-start) both; }
.val-5 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--cd5-at)) both; }
.val-4 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--cd4-at)) both; }
.val-3 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--cd3-at)) both; }
.val-2 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--cd2-at)) both; }
.val-1 { animation: number-countdown-final 1s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--cd1-at)) both; }
.timer-sparkles { position: absolute; inset: -20px -14px; pointer-events: none; z-index: 8; }
.timer-sparkles i { position: absolute; color: #FFE66D; font-size: 26px; font-style: normal; text-shadow: 0 0 10px rgba(255,230,109,.95); animation: timer-sparkle var(--timer-duration) ease-in-out calc(var(--clip-start) + var(--ambient-phase)) 1 both; }
.timer-sparkles i:nth-child(1) { right: 6%; top: -18px; }
.timer-sparkles i:nth-child(2) { right: 1%; bottom: -16px; color: #5CE1E6; font-size: 22px; animation-delay: calc(var(--clip-start) + .55s); }
.timer-sparkles i:nth-child(3) { left: 4%; top: -16px; color: #fff; animation-delay: calc(var(--clip-start) + 1.05s); }
.fact-card { position: relative; z-index: 5; max-width: 1220px; margin-top: 14px; padding: 24px 48px; border: 6px solid rgba(255,255,255,.85); border-radius: 38px; background: var(--surface); box-shadow: 0 16px 0 rgba(13,35,71,.18), 0 22px 36px rgba(10,25,60,.14); text-align: center; opacity: 0; animation: phase-enter .01s steps(1,end) calc(var(--clip-start) + var(--reward-at)) both; }
.fact-card span { color: var(--surface-accent); font-size: 24px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; }
.fact-card p { margin: 0; font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 38px; font-weight: 900; line-height: 1.25; letter-spacing: -0.3px; }
.visual-answer-grid { position: relative; z-index: 3; display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; width: 1560px; margin-top: 28px; opacity: 0; animation: phase-enter .01s steps(1,end) calc(var(--clip-start) + var(--choices-at)) both; }
.visual-answer-card { position: relative; z-index: 3; }
.option-image { width: 100%; height: 500px; border-width: 12px; border-radius: 40px; transform-origin: center; animation: visual-choice-float 3.8s ease-in-out calc(var(--clip-start) + var(--item-phase)) infinite alternate both; }
.visual-answer-label { position: relative; z-index: 4; display: flex; align-items: center; gap: 16px; min-height: 94px; margin: -36px 18px 0 38px; padding: 12px 26px 12px 18px; overflow: visible; border: 6px solid var(--choice-stroke); border-radius: 9999px; background: var(--choice-pattern), var(--choice-bg-tint); background-size: 64px 32px, 100% 100%; box-shadow: 0 12px 0 var(--choice-depth-shadow), inset 0 3px 0 rgba(255,255,255,.6), 0 10px 22px rgba(10,25,60,.22); font-size: 32px; font-weight: 900; }
.visual-answer-label::before { content: ""; position: absolute; inset: 5px 10px 5px 16px; border: 2px dashed rgba(255, 255, 255, 0.75); border-radius: 9999px; pointer-events: none; z-index: 3; }
.visual-answer-label > b { width: 92px; height: 92px; margin-left: -50px; border-radius: 50%; border: 6px solid var(--choice-badge-border); font-size: 48px; -webkit-text-stroke: 3px var(--choice-stroke-shadow); paint-order: stroke fill; }
.visual-answer-label span { font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--choice-text-color, #1e293b) !important; text-shadow: var(--choice-text-shadow); }
.choice-tier-medium .visual-answer-label span { font-size: 28px; }
.choice-tier-long .visual-answer-label span, .choice-tier-very_long .visual-answer-label span, .choice-tier-overflow .visual-answer-label span { font-size: 24px; }
.visual-answer-card.answer-correct { animation: visual-correct-card-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--reveal-at) + .14s) forwards; }
.visual-answer-card.answer-correct .visual-answer-label > b { animation: correct-badge-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--reveal-at) + .14s) forwards; }
.visual-answer-card.answer-incorrect { animation: incorrect-card-settle .38s ease-out calc(var(--clip-start) + var(--reveal-at)) forwards; }
.quiz-question-clip .hero-image { animation: hero-enter .62s cubic-bezier(.22,.8,.3,1) var(--clip-start) both, hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + .62s) 1 alternate both; }
.reward-fx { position: absolute; z-index: 7; inset: 0; color: #fff; pointer-events: none; text-shadow: 0 7px 0 rgba(13,35,71,.18); opacity: 0; animation: phase-enter .01s steps(1,end) calc(var(--clip-start) + var(--reward-at)) both; }
.reward-fx i { position: absolute; font-size: 51px; font-style: normal; animation: star-burst .72s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--reward-at)) both; }
.reward-fx i:nth-child(1) { left: 5%; top: 34%; }.reward-fx i:nth-child(2) { right: 6%; top: 38%; animation-delay: calc(var(--clip-start) + .06s); }.reward-fx i:nth-child(3) { left: 9%; bottom: 18%; animation-delay: calc(var(--clip-start) + .12s); }.reward-fx i:nth-child(4) { right: 10%; bottom: 16%; animation-delay: calc(var(--clip-start) + .18s); }.reward-fx i:nth-child(5) { left: 3%; top: 58%; animation-delay: calc(var(--clip-start) + .24s); }.reward-fx i:nth-child(6) { right: 3%; top: 61%; animation-delay: calc(var(--clip-start) + .3s); }.reward-fx i:nth-child(7) { left: 7%; bottom: 8%; animation-delay: calc(var(--clip-start) + .36s); }
.reward-fx i:nth-child(8) { right: 18%; top: 20%; animation-delay: calc(var(--clip-start) + .42s); }.reward-fx i:nth-child(9) { left: 20%; bottom: 23%; animation-delay: calc(var(--clip-start) + .48s); }
.reward-small i { font-size: 57px; }
.reward-big i { font-size: 71px; }
.episode-progress.streak { animation: progress-pop .52s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + .12s) both; }
.episode-progress.streak i { margin-left: 2px; color: var(--surface-accent); font-size: 24px; font-style: normal; }
.quiz-question-clip::after { position: absolute; z-index: 2; top: 58%; left: 50%; width: 980px; height: 440px; border: 26px solid rgba(255,255,255,.54); border-radius: 50%; content: ""; pointer-events: none; transform: translate(-50%,-50%) scale(.45); animation: reveal-impact .7s ease-out calc(var(--clip-start) + var(--reveal-at) + .04s) both; }
.is-final-scene .question-card-inner { border-color: #FF708A; box-shadow: inset 0 4px 0 rgba(255,255,255,0.95), inset 0 8px 0 rgba(255,182,193,0.35), inset 0 -5px 0 rgba(230,60,90,0.25), 0 16px 0 rgba(230,60,90,0.32), 0 26px 42px rgba(10,25,60,0.2); }
.quiz-question-clip .question-title { animation: question-card-enter 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) var(--clip-start) both, question-card-float 4.2s ease-in-out calc(var(--clip-start) + 0.52s) infinite alternate both; }
.layout-media_left_choices_right.quiz-question-clip .hero-image { animation: enter-from-left .66s cubic-bezier(.22,.8,.3,1) var(--clip-start) both, hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + .66s) 1 alternate both; }
.candy-transition { position: absolute; z-index: var(--candy-layer-transition); inset: 0; overflow: hidden; background: transparent; pointer-events: none; }
.transition-bubble_splash { background: transparent; }
.splash-bed { position: absolute; inset: 0; background: var(--from); opacity: 0; transform: scale(.96); animation: splash-bed .86s cubic-bezier(.22,.8,.3,1) var(--clip-start) both; }
.splash-bubble { position: absolute; display: block; width: 840px; height: 840px; border: 12px solid rgba(255,255,255,.72); border-radius: 46% 54% 58% 42%; background: var(--bubble-color, var(--from)); box-shadow: 0 22px 0 rgba(13,35,71,.16), inset 0 10px 0 rgba(255,255,255,.18); opacity: 0; transform: scale(.12) rotate(-12deg); animation: bubble-splash-attack .86s cubic-bezier(.18,1.42,.34,1) var(--clip-start) both; }
.splash-bubble-a { left: -210px; top: -280px; --bubble-color: var(--from); }.splash-bubble-b { right: -230px; top: -230px; --bubble-color: var(--to); animation-delay: calc(var(--clip-start) + .04s); }.splash-bubble-c { left: 220px; bottom: -380px; --bubble-color: var(--to); animation-delay: calc(var(--clip-start) + .08s); }.splash-bubble-d { right: 160px; bottom: -360px; --bubble-color: var(--from); animation-delay: calc(var(--clip-start) + .12s); }.splash-bubble-e { left: 590px; top: -430px; width: 700px; height: 700px; --bubble-color: var(--to); animation-delay: calc(var(--clip-start) + .16s); }.splash-bubble-f { right: 500px; bottom: -430px; width: 680px; height: 680px; --bubble-color: var(--from); animation-delay: calc(var(--clip-start) + .2s); }
.splash-brand { position: absolute; top: 50%; left: 50%; display: grid; place-items: center; width: 152px; height: 152px; border: 9px solid #fff; border-radius: 46px; background: var(--to); color: #fff; box-shadow: 0 18px 0 rgba(13,35,71,.27), inset 0 -8px 0 rgba(13,35,71,.12); font-size: 82px; opacity: 0; transform: translate(-50%,-50%) scale(0) rotate(-22deg); animation: splash-brand-hit .86s cubic-bezier(.18,1.42,.34,1) var(--clip-start) both; }
.splash-particles { position: absolute; top: 50%; left: 50%; color: #fff; font-size: 36px; text-shadow: 0 6px 0 rgba(13,35,71,.2); }
.splash-particles i { position: absolute; font-style: normal; opacity: 0; animation: splash-particle .6s ease-out calc(var(--clip-start) + .34s) both; }.splash-particles i:nth-child(1) { transform: translate(-190px,-80px); }.splash-particles i:nth-child(2) { transform: translate(170px,-115px); color: #FFD34D; animation-delay: calc(var(--clip-start) + .38s); }.splash-particles i:nth-child(3) { transform: translate(190px,90px); animation-delay: calc(var(--clip-start) + .42s); }.splash-particles i:nth-child(4) { transform: translate(-160px,110px); color: #FFD34D; animation-delay: calc(var(--clip-start) + .46s); }
.splash-release { position: absolute; inset: 0; border: 24px solid rgba(255,255,255,.34); opacity: 0; transform: scale(1.08); animation: splash-release .86s ease-out calc(var(--clip-start) + .42s) both; }
.brush { position: absolute; inset: -13% -35%; border-radius: 48% 52% 43% 57%; background: var(--from); transform: translateX(-115%) rotate(-8deg); animation: brush-wave .8s cubic-bezier(.25,.8,.35,1) var(--clip-start) both; }
.brush-two { background: var(--to); transform: translateX(-115%) rotate(8deg) scale(.82); animation-delay: calc(var(--clip-start) + .08s); }
.transition-lightning_brush .brush { border: 18px solid rgba(255,255,255,.38); }
.transition-mark { position: absolute; top: 50%; left: 50%; display: grid; place-items: center; width: 146px; height: 146px; border: 9px solid #fff; border-radius: 47px; background: var(--from); color: #fff; box-shadow: 0 18px 0 rgba(13,35,71,.25); font-size: 82px; transform: translate(-50%,-50%) scale(0) rotate(-26deg); animation: mark-pop .8s cubic-bezier(.18,1.42,.34,1) var(--clip-start) both; }
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
.scene-decor { position: absolute; z-index: 2; inset: 0; pointer-events: none; color: rgba(255,255,255,.62); }
.scene-decor i { position: absolute; display: block; font-style: normal; animation: decor-drift var(--scene-duration) ease-in-out var(--clip-start) 1 alternate both; }
.decor-1 { top: 21%; left: 5%; font-size: 34px; color: var(--accent); }.decor-2 { top: 40%; left: 3%; font-size: 26px; }.decor-3 { top: 13%; right: 12%; font-size: 48px; color: var(--accent); }.decor-4 { right: 5%; bottom: 30%; font-size: 42px; color: rgba(255,255,255,.48); }.decor-5 { left: 18%; bottom: 11%; font-size: 31px; color: #FFD34D; }.decor-6 { right: 24%; top: 28%; font-size: 25px; color: #FFD34D; }.decor-7 { left: 30%; top: 8%; font-size: 18px; }
@keyframes ray-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes drift { to { background-position: 230px 160px; } }
@keyframes ambient-drift { to { transform: translate(24px,-19px) rotate(8deg); } }
@keyframes hero-float { 50% { transform: translateY(-8px) rotate(1deg); } }
@keyframes answer-float { 50% { transform: translateY(-4px) rotate(.25deg); } }
@keyframes visual-choice-float { 0% { transform: translateY(0px) rotate(-0.8deg) scale(1); } 50% { transform: translateY(-7px) rotate(1deg) scale(1.012); } 100% { transform: translateY(-2px) rotate(-0.5deg) scale(1.004); } }
@keyframes decor-drift { 50% { transform: translate(4px,-7px) rotate(2deg); } }
@keyframes question-card-enter { from { opacity: 0; transform: translateY(24px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes question-card-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes hanging-sign-enter { 0% { transform: translateY(-70px) rotate(5deg); opacity: 0; } 70% { transform: translateY(5px) rotate(-2deg); } 100% { transform: translateY(0) rotate(0deg); opacity: 1; } }
@keyframes hanging-sign-sway { 0% { transform: rotate(-1.8deg) translateY(0); } 50% { transform: rotate(0.3deg) translateY(-1px); } 100% { transform: rotate(1.8deg) translateY(0); } }
@keyframes star-wobble { 0% { transform: rotate(-10deg) scale(1); } 100% { transform: rotate(2deg) scale(1.05); } }
@keyframes sparkle-blink { 0%, 100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }
@keyframes title-enter { from { opacity: 0; transform: translateY(28px) scale(.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes hero-enter { from { opacity: 0; transform: translateY(42px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes answer-enter { from { opacity: 0; transform: translateY(32px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes enter-from-left { from { opacity: 0; transform: translateX(-60px) scale(.94); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes enter-from-right { from { opacity: 0; transform: translateX(60px) scale(.94); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes phase-enter { to { opacity: 1; } }
@keyframes phase-hold { 0%,100% { opacity: 0; } 1%,99% { opacity: 1; } }
@keyframes quiz-timer-drain { from { width: 100%; } to { width: 0%; } }
@keyframes quiz-timer-marker-slide { from { left: 100%; } to { left: 0%; } }
@keyframes query-hold { 0%, 99% { opacity: 1; } 100% { opacity: 0; } }
@keyframes number-countdown-tick { 0% { opacity: 0; transform: scale(1.7) rotate(-10deg); text-shadow: 0 0 16px rgba(255,255,255,1), 0 4px 0 rgba(13,35,71,.3); } 20% { opacity: 1; transform: scale(1.08) rotate(0deg); text-shadow: 0 0 10px rgba(255,230,120,.9), 0 3px 0 rgba(13,35,71,.25); } 82% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.72); } }
@keyframes number-countdown-final { 0% { opacity: 0; transform: scale(2) rotate(-15deg); text-shadow: 0 0 24px rgba(255,50,50,1), 0 4px 0 rgba(13,35,71,.35); } 20% { opacity: 1; transform: scale(1.22) rotate(0deg); text-shadow: 0 0 16px rgba(255,40,40,1), 0 3px 0 rgba(13,35,71,.3); } 45% { transform: scale(0.95); } 70% { transform: scale(1.18); } 85% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.6); } }
@keyframes quiz-timer-danger { 0%, 55% { box-shadow: inset 0 3px 0 rgba(255,255,255,.3); } 70% { box-shadow: inset 0 3px 0 rgba(255,255,255,.6), 0 0 16px rgba(255,167,38,.6); } 85% { box-shadow: inset 0 3px 0 rgba(255,255,255,.8), 0 0 24px rgba(255,87,34,.8); } 100% { box-shadow: inset 0 3px 0 rgba(255,255,255,.9), 0 0 32px rgba(244,67,54,.9); } }
@keyframes timer-marker-danger { 0%, 55% { transform: translate(-50%,-50%) scale(1); background: var(--accent); } 65% { transform: translate(-50%,-50%) scale(1.08); background: #FFA726; box-shadow: 0 8px 0 rgba(13,35,71,.24), 0 0 16px rgba(255,167,38,.7); } 78% { transform: translate(-50%,-50%) scale(1.14); background: #FF5722; box-shadow: 0 8px 0 rgba(13,35,71,.24), 0 0 24px rgba(255,87,34,.85); } 88% { transform: translate(-50%,-50%) scale(1.05); background: #F44336; } 94% { transform: translate(-50%,-50%) scale(1.22); background: #E53935; box-shadow: 0 8px 0 rgba(13,35,71,.24), 0 0 32px rgba(229,57,53,1); } 100% { transform: translate(-50%,-50%) scale(1.1); background: #D32F2F; } }
@keyframes timer-urgency-glow { 0%, 55% { box-shadow: inset 0 4px 0 rgba(13,35,71,.12), 0 7px 0 var(--depth-edge), 0 0 24px rgba(255,255,255,.22); } 70% { box-shadow: inset 0 4px 0 rgba(13,35,71,.12), 0 7px 0 var(--depth-edge), 0 0 32px rgba(255,167,38,.55); } 85% { box-shadow: inset 0 4px 0 rgba(13,35,71,.12), 0 7px 0 var(--depth-edge), 0 0 44px rgba(255,87,34,.78); } 100% { box-shadow: inset 0 4px 0 rgba(13,35,71,.12), 0 7px 0 var(--depth-edge), 0 0 56px rgba(244,67,54,.95); } }
@keyframes timer-exit-fade { from { opacity: 1; transform: translateX(-50%) scale(1); } to { opacity: 0; transform: translateX(-50%) scale(.96); } }
@keyframes reveal-enter-smooth { from { opacity: 0; transform: translateY(16px) scale(.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes timer-sparkle { 50% { transform: translateY(-4px) scale(1.16) rotate(12deg); opacity: .7; } }
@keyframes correct-card-reveal { 0% { transform: translateY(0) scale(1); } 55% { transform: translateY(-12px) scale(1.06); box-shadow: 0 18px 0 #15803D, 0 0 40px rgba(74,222,128,.8), inset 0 4px 0 rgba(255,255,255,.95); } 76% { transform: translateY(-2px) scale(1.015); } 100% { transform: translateY(-6px) scale(1.04); border-color: #22C55E; box-shadow: 0 16px 0 #15803D, 0 0 36px rgba(74,222,128,.75), inset 0 4px 0 rgba(255,255,255,.95); } }
@keyframes correct-badge-reveal { 0% { transform: scale(1); } 55% { transform: scale(1.14); } 100% { transform: scale(1.06); } }
@keyframes visual-correct-card-reveal { 0% { transform: translateY(0) scale(1); } 55% { transform: translateY(-12px) scale(1.06); } 100% { transform: translateY(-4px) scale(1.03); } }
@keyframes visual-correct-border { 0% { border-color: #fff; } 55%,100% { border-color: var(--correct); } }
@keyframes incorrect-card-settle { from { opacity: 1; transform: scale(1); filter: grayscale(0%) contrast(1) brightness(1); } to { opacity: .35; transform: scale(.94); filter: grayscale(78%) contrast(0.95) brightness(0.92); border-color: rgba(255,255,255,0.25); box-shadow: 0 2px 0 rgba(10,25,60,.08); } }
@keyframes status-pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
@keyframes cross-pop { 0% { transform: scale(0); } 65% { transform: scale(1.15); } 100% { transform: scale(1); } }
@keyframes hero-reveal-push { from { transform: scale(1); } to { transform: scale(1.035); } }
@keyframes hero-ken-burn { from { transform: scale(1); } to { transform: scale(1.06); } }
@keyframes reveal-pop { from { opacity: 0; transform: scale(.7) rotate(-5deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes reveal-answer-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes stamp-pop { 0% { opacity: 0; transform: scale(0) rotate(-18deg); } 68% { opacity: 1; transform: scale(1.18) rotate(6deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes star-burst { from { opacity: 0; transform: translateY(28px) scale(.2) rotate(-28deg); } to { opacity: 1; transform: translateY(0) scale(1) rotate(0); } }
@keyframes quizProgressStarTwinkle { 0%, 100% { opacity: 0.65; transform: translate(-50%, -50%) scale(0.95); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); } }
@keyframes quizProgressMarkerPulse { 0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); } 25% { transform: translate(-50%, -50%) scale(1.12) rotate(4deg); } 55% { transform: translate(-50%, -50%) scale(0.96) rotate(-3deg); } 75% { transform: translate(-50%, -50%) scale(1.05) rotate(1deg); } }
@media (prefers-reduced-motion: reduce) { .milestone-star { animation: none; } }
@keyframes reveal-impact { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.45); } 25% { opacity: .95; transform: translate(-50%,-50%) scale(1); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(1.12); } }
@keyframes progress-pop { 0% { transform: scale(1); } 58% { transform: scale(1.08); } 100% { transform: scale(1); } }
@keyframes brush-wave { 0% { transform: translateX(-115%); } 48% { transform: translateX(-10%); } 100% { transform: translateX(115%); } }
@keyframes mark-pop { 0%, 18% { transform: translate(-50%,-50%) scale(0) rotate(-26deg); } 52% { transform: translate(-50%,-50%) scale(1.15) rotate(8deg); } 74%, 100% { transform: translate(-50%,-50%) scale(1) rotate(0); } }
@keyframes splash-bed { 0%, 28% { opacity: 0; transform: scale(.96); } 48% { opacity: .94; transform: scale(1); } 78% { opacity: .94; } 100% { opacity: 0; transform: scale(1.04); } }
@keyframes bubble-splash-attack { 0% { opacity: 0; transform: scale(.12) rotate(-12deg); } 34% { opacity: 1; transform: scale(1.04) rotate(4deg); } 56% { opacity: 1; transform: scale(1.08) rotate(0); } 100% { opacity: 0; transform: scale(1.22) rotate(8deg); } }
@keyframes splash-brand-hit { 0%, 32% { opacity: 0; transform: translate(-50%,-50%) scale(0) rotate(-22deg); } 53% { opacity: 1; transform: translate(-50%,-50%) scale(1.16) rotate(8deg); } 67% { opacity: 1; transform: translate(-50%,-50%) scale(1) rotate(0); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(.92) rotate(0); } }
@keyframes splash-particle { 0% { opacity: 0; } 35% { opacity: 1; } 100% { opacity: 0; transform: translate(0,0) scale(.4); } }
@keyframes splash-release { 0%, 55% { opacity: 0; transform: scale(1.08); } 72% { opacity: .9; transform: scale(1); } 100% { opacity: 0; transform: scale(.98); } }
@keyframes phase-exit { to { opacity: 0; } }
.candy-mascot-container { position: absolute; width: 220px; height: 220px; z-index: var(--candy-layer-mascot); pointer-events: none; transform-origin: bottom center; transform: scale(var(--mascot-scale, 1)); }
.candy-mascot-container.anchor-bottom_left { bottom: 18px; left: 32px; }
.candy-mascot-container.anchor-bottom_right { bottom: 18px; right: 32px; }
.has-mascot { --mascot-content-width: 1420px; --question-card-width: 1440px; --question-card-left-edge: 360px; }
.has-mascot .game-header { left: calc(var(--question-card-left-edge) / 2); transform: translateX(-50%); }
.has-mascot .game-stage { width: var(--mascot-content-width); margin-right: 40px; }
.has-mascot .question-title { width: var(--question-card-width); max-width: var(--question-card-width); }
.has-mascot.layout-visual_choices_three .visual-answer-grid { width: 100%; gap: 24px; }
.has-mascot.layout-media_left_choices_right .game-stage { column-gap: 34px; }
.has-mascot .phase-region { left: 0; width: var(--question-card-width); transform: none; }
.has-mascot .phase-region > .thinking-bar, .has-mascot .phase-region > .fact-card { width: min(70vw, 1300px); left: 50%; }
.candy-mascot-container.mascot-intro { bottom: 40px; }
.candy-mascot-container.mascot-outro { bottom: 40px; }
.candy-mascot-container.mascot-intro.anchor-bottom_right, .candy-mascot-container.mascot-outro.anchor-bottom_right { right: 80px; }
.candy-mascot-container.mascot-intro.anchor-bottom_left, .candy-mascot-container.mascot-outro.anchor-bottom_left { left: 80px; }
.candy-mascot-sprite { width: 220px; height: 220px; background-image: var(--sprite-url); background-repeat: no-repeat; background-position: center bottom; background-size: contain; transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)); filter: drop-shadow(0 14px 18px rgba(13,35,71,.35)); }
.mascot-state-layer { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 0.15s ease-out; }
.mascot-state-layer:not([style*="--mascot-frames:1;"]):not([style*="--mascot-frames: 1;"]) .candy-mascot-sprite { background-size: calc(var(--mascot-frames, 1) * 100%) 100%; background-position: 0% 50%; animation: mascot-sprite-play calc(var(--mascot-frames, 1) / var(--mascot-fps, 8) * 1s) steps(calc(var(--mascot-frames, 1) - 1)) infinite; }
.state-idle[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-idle[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-breathe 3.2s ease-in-out infinite alternate; }
.state-thinking[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-thinking[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-sway 2.4s ease-in-out infinite alternate; }
.state-celebrate[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-celebrate[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-jump 0.85s cubic-bezier(.18,1.42,.34,1) infinite alternate; }
.state-oops[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-oops[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-shake 2.0s ease-in-out infinite; }
.state-point[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-point[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-pulse 1.8s ease-in-out infinite alternate; }
.state-wave[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-wave[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-wave 2.0s ease-in-out infinite alternate; }
.state-float[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-float[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-float 2.8s ease-in-out infinite alternate; }
.mascot-intro .candy-mascot-sprite, .mascot-outro .candy-mascot-sprite { animation: mascot-sprite-play calc(var(--mascot-frames, 1) / var(--mascot-fps, 8) * 1s) steps(calc(var(--mascot-frames, 1) - 1)) infinite; }
.quiz-question-clip .mascot-state-layer.state-thinking { opacity: 1; animation: phase-exit .001s linear var(--reveal-at) forwards; }
.quiz-question-clip .mascot-state-layer.state-celebrate { opacity: 0; animation: phase-enter .001s linear var(--reveal-at) forwards; }
@keyframes mascot-sprite-play { from { background-position: 0% 0%; } to { background-position: 100% 0%; } }
@keyframes mascot-single-breathe { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) scale(1); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 6px)) scale(1.025, 0.98); } }
@keyframes mascot-single-sway { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) rotate(-2.5deg); } 100% { transform: translate(calc(var(--action-offset-x, 0px) + 4px), calc(var(--action-offset-y, 0px) - 8px)) rotate(3.5deg); } }
@keyframes mascot-single-jump { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) scale(1, 0.95); } 40% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 22px)) scale(1.04, 1.05) rotate(2deg); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 28px)) scale(1.06, 1.06) rotate(-2deg); } }
@keyframes mascot-single-shake { 0%, 100% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) rotate(0deg); } 25% { transform: translate(calc(var(--action-offset-x, 0px) - 5px), var(--action-offset-y, 0px)) rotate(-4deg); } 75% { transform: translate(calc(var(--action-offset-x, 0px) + 5px), var(--action-offset-y, 0px)) rotate(4deg); } }
@keyframes mascot-single-pulse { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) scale(1); } 100% { transform: translate(calc(var(--action-offset-x, 0px) + 6px), calc(var(--action-offset-y, 0px) - 4px)) scale(1.03); } }
@keyframes mascot-single-wave { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) rotate(-3deg); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 10px)) rotate(4deg) scale(1.03); } }
@keyframes mascot-single-float { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) translateY(0) rotate(0deg); } 50% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 14px)) rotate(1.5deg); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 6px)) rotate(-1.5deg); } }
${getThinkingBarsCss()}
${getQuestionBoxesCss()}
${getCounterBadgesCss()}
${getAnswerCardsCss()}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; } }
`;
}
