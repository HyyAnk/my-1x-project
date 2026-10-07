import { THUMBNAIL_DIMENSION_SPECS, type ThumbnailAspectRatio } from "@studio/shared";
import type { EditorialGeometry, EditorialThumbnailDesign } from "./editorialTypes.js";

export function editorialGeometry(ratio: ThumbnailAspectRatio, design: EditorialThumbnailDesign): EditorialGeometry {
  const { width, height } = THUMBNAIL_DIMENSION_SPECS[ratio];
  const landscape = ratio === "16:9";
  const count = design.candidateCount;
  return {
    width,
    height,
    headline: landscape ? { left: 48, top: 36, width: 660, height: 240 } : { left: 64, top: 248, width: 830, height: 310 },
    labelCenters: Array.from({ length: count }, (_, index) => ({
      x: landscape ? Math.round(160 + (index * 620) / Math.max(1, count - 1)) : Math.round(200 + (index % 2) * 490),
      y: landscape ? 634 : count === 4 ? 940 + Math.floor(index / 2) * 360 : 1220,
    })),
  };
}
