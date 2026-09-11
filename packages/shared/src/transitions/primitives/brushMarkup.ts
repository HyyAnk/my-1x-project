/**
 * Shared brush markup primitive for brush_wave and lightning_brush.
 */
export function renderBrushMarkup(includeMark: boolean): string {
  const markHtml = includeMark
    ? `<div class="transition-mark" data-layout-ignore aria-hidden="true">✦</div>`
    : "";
  return `<div class="brush brush-one" data-layout-allow-occlusion data-layout-allow-overflow></div><div class="brush brush-two" data-layout-allow-occlusion data-layout-allow-overflow></div>${markHtml}`;
}
