import { resolveChannelBrandName, type MascotRenderAspectRatio } from "@studio/shared";
import { esc, escAttr } from "./candyArcadeSvg.js";

/**
 * Renders the Channel Brand Mark HTML component.
 *
 * Visibility Contract:
 * - Only renders when mascot HTML is actually present (hasMascot === true).
 * - If mascot is off, none, missing, or invalid, returns empty string.
 *
 * Structure Contract:
 * - Line 1: Monochrome white YouTube/play SVG icon.
 * - Line 2: Escaped channel brand name (single line, no wrap).
 * - Line 3: QUIZ subtitle.
 */
export function renderChannelBrandMark(
  brandName?: string | null,
  hasMascot = false,
  aspectRatio: MascotRenderAspectRatio = "16:9",
): string {
  if (!hasMascot) return "";

  const resolvedName = resolveChannelBrandName(brandName);
  const safeName = esc(resolvedName);
  const safeAttr = escAttr(resolvedName);

  return `<div class="channel-brand-mark" data-layout-ignore aria-hidden="true" data-aspect-ratio="${aspectRatio}">
  <div class="brand-mark-icon" data-layout-ignore aria-hidden="true">
    <svg viewBox="0 0 28 20" width="28" height="20" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M27.4 3.1c-.3-1.2-1.2-2.1-2.4-2.4C22.9.1 14 .1 14 .1s-8.9 0-11 .6C1.8 1 .9 1.9.6 3.1 0 5.2 0 10 0 10s0 4.8.6 6.9c.3 1.2 1.2 2.1 2.4 2.4 2.1.6 11 .6 11 .6s8.9 0 11-.6c1.2-.3 2.1-1.2 2.4-2.4.6-2.1.6-6.9.6-6.9s0-4.8-.6-6.9zM11.2 14.2V5.8L18.5 10l-7.3 4.2z" fill-rule="evenodd"/>
    </svg>
  </div>
  <span class="brand-mark-channel-name" data-layout-ignore data-brand-name="${safeAttr}">${safeName}</span>
  <span class="brand-mark-sub" data-layout-ignore>QUIZ</span>
</div>`;
}

/**
 * Client-side script fragment to auto-fit channel brand names to their container width
 * after web fonts are fully loaded and before renderer captures the frame.
 */
export function channelBrandMarkFitScript(): string {
  return `function fitChannelBrandMarks() {
    try {
      const elements = document.querySelectorAll('.channel-brand-mark .brand-mark-channel-name');
      elements.forEach(function(el) {
        const parent = el.parentElement;
        if (!parent) return;
        const maxWidth = parent.clientWidth || 240;
        let size = parent.getAttribute('data-aspect-ratio') === '9:16' ? 18 : 22;
        const minSize = 13;
        el.style.fontSize = size + 'px';
        while (el.scrollWidth > maxWidth && size > minSize) {
          size -= 1;
          el.style.fontSize = size + 'px';
        }
      });
    } catch(e) {}
  }`;
}
