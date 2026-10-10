import type { ThumbnailComposition, ThumbnailDesignTemplate } from "@studio/shared";

export type EditorialBackgroundPalette = "cream" | "navy" | "bright" | (string & {});

export interface EditorialThumbnailDesign {
  version: 1;
  template: ThumbnailDesignTemplate;
  background: EditorialBackgroundPalette;
  candidateCount: 0 | 2 | 4;
  /** Placement of mascot, hero subject and headline for single-subject designs. */
  composition?: ThumbnailComposition;
  backgroundAtmosphere?: string;
  spatialComposition?: string;
}

export interface EditorialGeometry {
  width: number;
  height: number;
  headline: { left: number; top: number; width: number; height: number };
  labelCenters: Array<{ x: number; y: number }>;
}
