import type { QuizBackgroundStyle } from "@studio/shared";
import type { QuizPalette } from "../../types.js";

export type QuizBackgroundVariantId = Exclude<QuizBackgroundStyle, "auto">;

export type BackgroundRenderContext = {
  surface: "production" | "sandbox";
  questionIndex: number;
  seed?: number | string;
  duration?: number;
  clipStart?: number;
  palette?: QuizPalette;
};

export type BackgroundPerformanceMetadata = {
  layerCount: number;
  willChangeCount: number;
  animatedProperties: readonly string[];
  usesContinuousMotion: boolean;
  reducedMotionSafe: boolean;
};

export interface QuizBackgroundVariant {
  id: QuizBackgroundVariantId;
  displayName: string;
  description: string;
  performance: BackgroundPerformanceMetadata;
  renderHtml: (context: BackgroundRenderContext) => string;
  renderCss: () => string;
}
