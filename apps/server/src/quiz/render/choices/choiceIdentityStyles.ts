/**
 * Semantic answer identity colors for layouts that visibly render letter badges.
 * Text-only and single-reveal layouts are intentionally excluded.
 */
export function choiceIdentityStyles(): string {
  return `
/* Standard A/B/C identity palette for visible-badge answer layouts. */
:where(
  .choice-card[data-choice-variant="detached_badge"],
  .choice-card[data-choice-variant="media_bottom_badge"]
):nth-child(1) {
  --choice-stroke: #F5A623;
  --choice-stroke-shadow: #9A3412;
  --choice-depth-shadow: #D97706;
  --choice-badge-grad: linear-gradient(180deg, #FFD84D 0%, #FF9F0A 48%, #FF6700 100%);
  --choice-badge-border: #FFF4C2;
  --choice-bg-tint: linear-gradient(180deg, #FFFFFF 0%, #FFF8E9 100%);
  --choice-pattern: linear-gradient(115deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 42%);
  --choice-text-color: #7C2D12;
  --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.9);
}

:where(
  .choice-card[data-choice-variant="detached_badge"],
  .choice-card[data-choice-variant="media_bottom_badge"]
):nth-child(2) {
  --choice-stroke: #168DF2;
  --choice-stroke-shadow: #064A9F;
  --choice-depth-shadow: #0878C9;
  --choice-badge-grad: linear-gradient(180deg, #58D5FF 0%, #1687FF 48%, #0759DB 100%);
  --choice-badge-border: #D9F4FF;
  --choice-bg-tint: linear-gradient(180deg, #FFFFFF 0%, #EAF6FF 100%);
  --choice-pattern: linear-gradient(115deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 42%);
  --choice-text-color: #0B3B78;
  --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.9);
}

:where(
  .choice-card[data-choice-variant="detached_badge"],
  .choice-card[data-choice-variant="media_bottom_badge"]
):nth-child(3) {
  --choice-stroke: #9448F5;
  --choice-stroke-shadow: #5B21B6;
  --choice-depth-shadow: #7026D3;
  --choice-badge-grad: linear-gradient(180deg, #C96BFF 0%, #8C35F5 48%, #6418D8 100%);
  --choice-badge-border: #F0DCFF;
  --choice-bg-tint: linear-gradient(180deg, #FFFFFF 0%, #F4EBFF 100%);
  --choice-pattern: linear-gradient(115deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 42%);
  --choice-text-color: #4C1D95;
  --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.9);
}

:where(
  .choice-card[data-choice-variant="detached_badge"],
  .choice-card[data-choice-variant="media_bottom_badge"]
):nth-child(4) {
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
