import type {
  MascotRenderAspectRatio,
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizChoicePresentation,
  QuizLayoutCapability,
  QuizPreviewLayoutId,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizQuestionFormat,
  QuizThinkingBarStyle,
} from "@studio/shared";
import type { QuizPalette, QuizTemplateScene } from "../../visual/types.js";

export type QuizScenePhase = "question" | "choices" | "thinking" | "reveal" | "explain";

export type QuizSceneState = {
  phase: QuizScenePhase;
  choices: "hidden" | "visible";
  answers: "pending" | "revealed";
  thinking: "hidden" | "visible";
  fact: "hidden" | "visible";
  reward: "hidden" | "visible";
};

export type QuizSceneTiming = {
  start: number;
  choicesStart: number;
  thinkingStart: number;
  revealStart: number;
  rewardStart: number;
  end: number;
};

export type QuizSceneResolvedLayout = {
  id: QuizPreviewLayoutId;
  source: "auto" | "explicit" | "preview";
  capability: QuizLayoutCapability<QuizPreviewLayoutId>;
  presentation: QuizChoicePresentation;
};

export type QuizSceneElementStyles = {
  thinkingBar: Exclude<QuizThinkingBarStyle, "auto">;
  questionBox: Exclude<QuizQuestionBoxStyle, "auto">;
  answerCard: Exclude<QuizAnswerCardStyle, "auto">;
  counter: Exclude<QuizQuestionCounterStyle, "auto">;
  background: Exclude<QuizBackgroundStyle, "auto">;
};

export type QuizSceneMascotOccupancy = { occupied: false; anchor: null } | { occupied: true; anchor: "bottom_left" | "bottom_right" };

export type QuizSceneMedia = {
  source: string | null;
  altText: string;
  fallback: { subject: string; seed: number };
};

export type QuizSceneChoice = {
  id: string;
  order: number;
  text: string;
  media: QuizSceneMedia;
};

export type QuizSceneQuestionInput = {
  id: string;
  number: number;
  format: QuizQuestionFormat;
  text: string;
  visualOpportunity: string;
  explanation: string;
  funFact: string;
  choices: readonly { id: string; text: string }[];
  correctChoiceId: string;
};

export type QuizSceneRenderModel = {
  id: string;
  question: {
    id: string;
    number: number;
    total: number;
    format: QuizQuestionFormat;
    text: string;
    visualOpportunity: string;
    factText: string;
    correctChoiceId: string;
  };
  choices: readonly QuizSceneChoice[];
  state: QuizSceneState;
  layout: QuizSceneResolvedLayout;
  aspectRatio: MascotRenderAspectRatio;
  mascot: QuizSceneMascotOccupancy;
  assets: { hero: QuizSceneMedia };
  palette: QuizPalette;
  styles: QuizSceneElementStyles;
  visual: Pick<QuizTemplateScene, "motionId" | "transitionId">;
  channelBrandName: string | null;
  brandVisible: boolean;
  isFinal: boolean;
};

export type BuildQuizSceneRenderModelInput = {
  question: QuizSceneQuestionInput;
  totalQuestions: number;
  state: QuizSceneState;
  layout: QuizSceneResolvedLayout;
  aspectRatio: MascotRenderAspectRatio;
  mascot: QuizSceneMascotOccupancy;
  hero: QuizSceneMedia;
  choiceMedia: Readonly<Record<string, QuizSceneMedia>>;
  palette: QuizPalette;
  styles: QuizSceneElementStyles;
  visual: Pick<QuizTemplateScene, "motionId" | "transitionId">;
  channelBrandName?: string | null;
  brandVisible: boolean;
  isFinal: boolean;
};
