import type { MascotAssetRegistration, MascotBounds, MascotCanvasSize, MascotPoint } from "../../renderTypes.js";
import type {
  AlphaCodec,
  AnimationLoopPolicy,
  AnimationState,
  FRAME_DURATION_MS,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
} from "../animationConstants.js";

export interface MascotFrameRect {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  duration_ms: number;
}

export interface MascotFrameRectV1 extends MascotFrameRect {
  duration_ms: typeof FRAME_DURATION_MS;
}

export interface MascotAnimationAssetV1 {
  version: 1;
  state: AnimationState;
  atlas_url: string;
  manifest_url: string;
  frame_count: typeof REQUIRED_FRAME_COUNT;
  fps: typeof REQUIRED_FPS;
  loop: boolean;
  loop_policy?: AnimationLoopPolicy;
  frames: MascotFrameRectV1[];
  registration: MascotAssetRegistration;
  content_fingerprint: string;
  source_fingerprint: string;
  qa_report_url?: string | null;
  published_at?: string | null;
  slot_index?: number;
  recipe_id?: string;
  transparent_video_url?: string;
  alpha_codec?: AlphaCodec;
  duration_ms?: number;
}

export interface MascotVideoAnimationAsset {
  version: 1;
  state: AnimationState;
  atlas_url?: string;
  manifest_url: string;
  frame_count: number;
  fps: number;
  duration_ms?: number;
  loop: boolean;
  loop_policy?: AnimationLoopPolicy;
  frames?: MascotFrameRect[];
  registration: MascotAssetRegistration;
  content_fingerprint: string;
  source_fingerprint: string;
  qa_report_url?: string | null;
  published_at?: string | null;
  slot_index?: number;
  recipe_id?: string;
  transparent_video_url?: string;
  alpha_codec?: AlphaCodec;
}

export type MascotPublishedAnimationAsset = MascotAnimationAssetV1 | MascotVideoAnimationAsset;

export interface MascotAnimationManifestAtlas {
  file_path?: string;
  url?: string;
  width: number;
  height: number;
  cols?: number;
  rows?: number;
}

export interface MascotAnimationCurationMetadata {
  reviewed: boolean;
  approved: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
  rating?: number | null;
  selection_tag?: string | null;
}

export interface MascotAnimationManifest {
  version: 1;
  state: AnimationState;
  recipe_id: string;
  style_id?: string;
  slot_index?: number;
  frame_count: number;
  fps: number;
  duration_ms?: number;
  loop: boolean;
  loop_policy: AnimationLoopPolicy;
  atlas?: MascotAnimationManifestAtlas;
  frames?: MascotFrameRect[];
  registration: MascotAssetRegistration;
  fingerprint: string;
  source_fingerprint?: string;
  processing_fingerprint?: string;
  qa_report_url?: string | null;
  curation?: MascotAnimationCurationMetadata;
  transparent_video_url?: string;
  alpha_codec?: AlphaCodec;
}

export interface MascotVideoAnimationManifest {
  version: 1;
  style_id: string;
  state: AnimationState;
  slot_index: number;
  frame_count: number;
  source_fps?: number;
  playback_fps: number;
  duration_ms: number;
  loop: boolean;
  loop_mode: AnimationLoopPolicy;
  atlas?: MascotAnimationManifestAtlas;
  frames?: MascotFrameRect[];
  frame_urls?: string[];
  canvas: MascotCanvasSize;
  content_bounds: MascotBounds;
  pivot: MascotPoint;
  registration: MascotAssetRegistration;
  source_fingerprint?: string;
  processing_fingerprint: string;
  qa_report_url?: string | null;
  curation?: MascotAnimationCurationMetadata;
  transparent_video_url?: string;
  alpha_codec?: AlphaCodec;
}

export interface AnimationContentFingerprintInput {
  recipeId: string;
  atlasChecksumOrUrl: string;
  frames: MascotFrameRect[];
  registration: MascotAssetRegistration;
  sourceFingerprint: string;
}

export interface AnimationPlaybackTarget {
  fps?: number;
  playback_fps?: number;
  frame_count?: number;
  duration_ms?: number;
  loop?: boolean;
  loop_policy?: AnimationLoopPolicy;
  loop_mode?: AnimationLoopPolicy;
  frames?: MascotFrameRect[];
  registration: MascotAssetRegistration;
  atlas_url?: string;
  transparent_video_url?: string;
  alpha_codec?: AlphaCodec;
}
