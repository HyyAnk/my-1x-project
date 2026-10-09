import type { ThumbnailLayoutType } from "@studio/shared";
import type { EditorialBackgroundPalette, EditorialThumbnailDesign } from "../editorialTypes.js";

export interface EditorialMascotPose {
  prop: string;
  expression: string;
  poseDescription: string;
}

export interface EditorialSubjectSeed {
  label: string;
  keywords?: string[];
  hook: string;
  visualPrompt: string;
  background?: EditorialBackgroundPalette;
  backgroundAtmosphere?: string;
  spatialComposition?: string;
  mascotPose: EditorialMascotPose;
}

export interface EditorialDomainSeed {
  id: string;
  domainName: string;
  pattern: RegExp;
  preferredLayout: ThumbnailLayoutType;
  preferredTemplate: "big_object" | "comparison" | "reaction";
  background: EditorialBackgroundPalette;
  backgroundAtmosphere?: string;
  subjects: EditorialSubjectSeed[];
}

export interface EditorialChallengeArchetype {
  id: string;
  name: string;
  layout: ThumbnailLayoutType;
  template: "big_object" | "comparison" | "reaction";
  background: EditorialBackgroundPalette;
  backgroundAtmosphere: string;
  candidateCount: EditorialThumbnailDesign["candidateCount"];
  defaultHook: string;
  hookFormulas: string[];
  spatialComposition: string;
  mascotPose: EditorialMascotPose;
}
