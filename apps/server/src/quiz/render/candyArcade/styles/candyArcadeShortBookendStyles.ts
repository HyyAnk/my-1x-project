const STAGE = '#stage[data-aspect-ratio="9:16"]';
const HEADLINE_FONT = '"Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif';
const TITLE_INK = "#0B3D91";
const TITLE_HIGHLIGHT = "#FF5A79";

/**
 * Short Intro & Outro styles: the looped intro backdrop, the title card drawn on the intro's blank
 * canvas (badge and the word-by-word title synced to the voice).
 */
export function candyArcadeShortBookendStylesCss(): string {
  const scene = `${STAGE} .short-intro-scene`;
  return `
${scene} { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
${scene} .short-intro-video { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; object-fit: cover; }
${scene} .short-intro-title-card { position: absolute; z-index: 2; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px; text-align: center; }
${scene} .short-intro-badge { display: inline-flex; padding: 16px 34px; border-radius: 999px; background: ${TITLE_HIGHLIGHT}; color: #FFFFFF; font-family: ${HEADLINE_FONT}; font-size: 40px; font-weight: 900; letter-spacing: 3px; box-shadow: 0 8px 0 rgba(11,61,145,.22); animation: short-intro-drop .55s cubic-bezier(.18,1.42,.34,1) var(--badge-enter-at, .15s) both; }
${scene} .short-intro-title { margin: 0; max-width: 100%; font-family: ${HEADLINE_FONT}; font-size: var(--title-size, 112px); font-weight: 900; line-height: 1.08; letter-spacing: -1px; color: ${TITLE_INK}; text-wrap: balance; overflow-wrap: anywhere; text-shadow: 0 6px 0 rgba(255,255,255,.95), 0 14px 28px rgba(11,61,145,.18); }
${scene} .short-intro-word { display: inline-block; transform-origin: 50% 80%; animation: short-intro-word-in .45s cubic-bezier(.18,1.42,.34,1) var(--word-enter-at, .3s) both, short-intro-word-beat .5s cubic-bezier(.22,.8,.3,1) var(--word-highlight-at, 1s) both; }
@keyframes short-intro-drop { from { opacity: 0; transform: translateY(-36px) scale(.85); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes short-intro-word-in { from { opacity: 0; transform: translateY(28px) scale(.7); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes short-intro-word-beat { 0% { color: ${TITLE_INK}; scale: 1; } 35% { color: ${TITLE_HIGHLIGHT}; scale: 1.12; } 100% { color: ${TITLE_HIGHLIGHT}; scale: 1; } }
`;
}
