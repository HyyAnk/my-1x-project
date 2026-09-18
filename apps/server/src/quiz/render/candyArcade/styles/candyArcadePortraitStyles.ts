/**
 * Universal 9:16 portrait safe-zone styles (TikTok, Shorts, Reels).
 */

export function candyArcadePortraitStylesCss(): string {
  return `
/* Universal 9:16 portrait safe-zone custom properties (TikTok, Shorts, Reels) */
#stage[data-aspect-ratio="9:16"] {
  --safe-zone-top: 180px;
  --safe-zone-bottom: 440px;
  --safe-zone-left: 36px;
  --safe-zone-right: 140px;
}
#stage[data-aspect-ratio="9:16"] .candy-scene { padding: 32px 36px 24px; }
#stage[data-aspect-ratio="9:16"] .game-header { top: 0; left: 24px; width: 250px; height: 194px; justify-content: flex-start; transform: none; }
#stage[data-aspect-ratio="9:16"] .game-header > :first-child { margin-top: 0; }
#stage[data-aspect-ratio="9:16"] .game-stage,
#stage[data-aspect-ratio="9:16"] .has-mascot .game-stage { width: calc(100% - 72px); min-height: 0; margin: 184px auto 0; padding-bottom: 160px; box-sizing: border-box; }
#stage[data-aspect-ratio="9:16"] .has-mascot { --mascot-content-width: calc(100% - 20px); --question-card-width: 100%; --question-card-left-edge: 0px; }
#stage[data-aspect-ratio="9:16"] .has-mascot .game-header { top: 0; left: 24px; width: 250px; height: 194px; justify-content: flex-start; transform: none; }
#stage[data-aspect-ratio="9:16"] .question-title { width: 100%; max-width: 100%; height: auto; min-height: 208px; margin: 0; }
#stage[data-aspect-ratio="9:16"] .question-title h1 { overflow-wrap: break-word; word-break: break-word; }
#stage[data-aspect-ratio="9:16"] .question-card-inner { padding: 24px 34px; }
#stage[data-aspect-ratio="9:16"] .phase-region { left: 36px; right: var(--safe-zone-right, 140px); bottom: var(--safe-zone-bottom, 440px); width: auto; transform: none; }
#stage[data-aspect-ratio="9:16"] .phase-region > .thinking-bar { width: calc(100% - 120px); left: 50%; transform: translateX(-50%); }
#stage[data-aspect-ratio="9:16"] .phase-region > .fact-card { width: 100%; left: 0; transform: none; }
#stage[data-aspect-ratio="9:16"] .phase-region.portrait-phase-embedded { position: relative; left: auto; right: auto; bottom: auto; top: auto; width: 100%; transform: none; }
#stage[data-aspect-ratio="9:16"] .phase-region.portrait-phase-embedded > .fact-card { position: relative; bottom: auto; left: auto; transform: none; width: 100%; margin: 0 auto; }
#stage[data-aspect-ratio="9:16"] .phase-region.portrait-phase-embedded > .thinking-bar { position: relative; bottom: auto; left: auto; transform: none; width: 100%; margin: 0 auto; }
#stage[data-aspect-ratio="9:16"] .candy-intro .intro-card,
#stage[data-aspect-ratio="9:16"] .candy-outro .outro-card { width: min(900px, 100%); padding: 0 28px; }
#stage[data-aspect-ratio="9:16"] .intro-card h1,
#stage[data-aspect-ratio="9:16"] .outro-card h1 { max-width: 850px; font-size: 76px; letter-spacing: -2px; }
#stage[data-aspect-ratio="9:16"] .intro-card p,
#stage[data-aspect-ratio="9:16"] .outro-card p { max-width: 800px; font-size: 30px; }
#stage[data-aspect-ratio="9:16"] .outro-cta-badges { flex-wrap: wrap; max-width: 760px; }
#stage[data-aspect-ratio="9:16"] .quiz-question-clip .candy-mascot-container.mascot-v2-container,
#stage[data-aspect-ratio="9:16"] .candy-scene:not(.candy-intro):not(.candy-outro) .candy-mascot-container.mascot-v2-container {
  bottom: var(--safe-zone-bottom, 440px);
}
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.anchor-bottom_left {
  left: 36px;
}
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.anchor-bottom_right {
  right: var(--safe-zone-right, 140px);
}
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-intro,
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-outro { bottom: 24px; }
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-intro.anchor-bottom_left,
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-outro.anchor-bottom_left { left: 24px; }
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-intro.anchor-bottom_right,
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-outro.anchor-bottom_right { right: 24px; }
`;
}
