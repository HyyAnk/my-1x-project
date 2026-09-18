/**
 * Root CSS variables, base resets, and canonical choice arcade tokens.
 */

export function candyArcadeRootVarsCss(): string {
  return `
:root {
  --candy-layer-brand: 9;
  --candy-layer-transition: 10;
  --candy-layer-mascot: 11;
  --mascot-content-width: 1420px;
  --question-card-width: 1440px;
  --question-card-left-edge: 360px;
  --safe-zone-top: 54px;
  --safe-zone-bottom: 54px;
  --safe-zone-left: 96px;
  --safe-zone-right: 96px;
  --safe-zone-title-top: 108px;
  --safe-zone-title-bottom: 108px;
  --safe-zone-title-left: 192px;
  --safe-zone-title-right: 192px;
  --question-size: 50px;
  --question-leading: 1.18;
  --choice-grid-width: 100%;
  --choice-card-min-height: 114px;
  --choice-card-margin-left: 64px;
  --choice-card-padding: 12px 24px 12px 28px;
  --choice-card-gap: 14px;
  --choice-badge-size: 136px;
  --choice-badge-margin-left: -72px;
  --choice-badge-font-size: 70px;
  --choice-font-size-base: 36px;
  --choice-text-padding-right: 24px;
  --choice-font-size-medium: 28px;
  --choice-font-size-long: 23px;
  --choice-font-size-very_long: 19px;
  --choice-font-size-overflow: 19px;
  --choice-label-font-size-base: 26px;
  --choice-label-font-size-medium: 22px;
  --choice-label-font-size-long: 19px;
  --choice-label-font-size-very_long: 17px;
  --choice-label-font-size-overflow: 17px;
  --choice-stroke: #F5A623;
  --choice-stroke-shadow: #9A3412;
  --choice-depth-shadow: rgba(13, 35, 71, 0.2);
  --choice-badge-grad: linear-gradient(180deg, #FFD84D 0%, #FF9F0A 48%, #FF6700 100%);
  --choice-badge-border: #FFF4C2;
  --choice-bg-tint: linear-gradient(180deg, #FFFFFF 0%, #FFF8E9 100%);
  --choice-pattern: linear-gradient(115deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 42%);
  --choice-text-color: #1E293B;
  --choice-text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
  font-family: "Fredoka", "Nunito", "Trebuchet MS", sans-serif;
}
* { box-sizing: border-box; }
html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #16285c; }
`;
}

export function candyArcadeChoiceTokensCss(): string {
  return `
/* Canonical 4th Choice (Choice D) tokens */
.choice-card:nth-child(4), .answer-card:nth-child(4), .visual-answer-card:nth-child(4) {
  --choice-stroke: #F43F75;
  --choice-stroke-shadow: #9F1239;
  --choice-depth-shadow: #C61F53;
  --choice-badge-grad: linear-gradient(180deg, #FF82A8 0%, #F43F75 48%, #BE123C 100%);
  --choice-badge-border: #FFE1EB;
  --choice-bg-tint: linear-gradient(180deg, #FFFFFF 0%, #FFF0F5 100%);
  --choice-pattern: linear-gradient(115deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 42%);
  --choice-text-color: #831843;
  --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.9);
}
`;
}
