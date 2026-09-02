import type {
  MascotProfile,
  QuizImageStyle,
  ThumbnailAspectRatio,
  ThumbnailLayoutType,
} from "@studio/shared";

export type MascotThemedPersona = {
  role: string;
  costume: string;
  prop: string;
  expression: string;
  poseDescription: string;
};

export type QuizSubjectAnchor = {
  label: string;
  visualPrompt: string;
  badge?: string;
};

export type QuizThumbnailPlan = {
  layout: ThumbnailLayoutType;
  hookText: string;
  badgeText: string;
  subTitle?: string;
  visualStyle: QuizImageStyle;
  colorTheme: string;
  mascotPersona: MascotThemedPersona;
  subjectAnchors: QuizSubjectAnchor[];
  topicTitle: string;
  questionCount: number;
  environmentAtmosphere?: string;
  lightingPalette?: string;
};


export type ResolveThumbnailInput = {
  topicTitle: string;
  topicSummary?: string;
  questionCount?: number;
  questionFormat?: string;
  questions?: Array<{
    question: string;
    choices?: string[];
    answer?: string;
  }>;
  visualStyle?: QuizImageStyle;
  colorTheme?: string;
  layoutOverride?: ThumbnailLayoutType;
  customHookText?: string;
  badgeOverride?: string;
  language?: string;
  mascotProfile?: MascotProfile | null;
};



export type CompiledThumbnailPrompts = {
  plan: QuizThumbnailPlan;
  prompt_16_9: string;
  prompt_9_16: string;
};
