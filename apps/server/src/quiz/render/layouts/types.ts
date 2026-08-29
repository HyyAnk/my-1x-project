import type { MascotRenderAspectRatio, QuizPreviewLayoutId } from "@studio/shared";

export type QuizLayoutDimensions = {
  width: number;
  height: number;
  count?: number;
};

export type QuizLayoutSlots = {
  questionBoxHtml: string;
  heroHtml: string;
  textChoicesHtml: string;
  visualChoicesHtml: string;
  phaseHtml: string;
};

export type QuizLayoutRenderDefinition = {
  id: QuizPreviewLayoutId;
  dimensions: QuizLayoutDimensions;
  renderBody: (slots: QuizLayoutSlots) => string;
  css: (aspectRatio: MascotRenderAspectRatio) => string;
};
