import type { MascotRenderAspectRatio, QuizPreviewLayoutId } from "@studio/shared";

export type QuizLayoutSlots = {
  questionBoxHtml: string;
  heroHtml: string;
  choicesHtml: string;
  phaseHtml: string;
};

export type QuizLayoutRenderDefinition = {
  id: QuizPreviewLayoutId;
  renderBody: (slots: QuizLayoutSlots) => string;
  css: (aspectRatio: MascotRenderAspectRatio) => string;
};
