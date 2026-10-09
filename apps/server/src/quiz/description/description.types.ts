import type { VideoDescriptionChapter } from "@studio/shared";

export type DescriptionChapter = VideoDescriptionChapter;

export interface ScoreUnitForms {
  one: string;
  other: string;
  /** Text placed between the number and the unit (empty for CJK scripts). */
  spacer: string;
  /** Languages such as French treat zero as singular. */
  zeroIsSingular?: boolean;
}

export interface DescriptionChapterLabels {
  intro: string;
  question: (questionNumber: number) => string;
  results: string;
}

export interface DescriptionSectionLocale {
  scoringHeader: string;
  playlistHeader: string;
  chaptersHeader: string;
  chapterLabels: DescriptionChapterLabels;
  scoreUnit: ScoreUnitForms;
  /** Comment-free CTA used when comments are disabled (Made for Kids). */
  kidsCtaText: string;
  /** Detects CTAs that ask viewers to comment. */
  commentRequestPattern: RegExp;
}

export interface DescriptionAudiencePolicy {
  madeForKids: boolean;
  commentsEnabled: boolean;
}

export interface QuizAnswerKey {
  questionId: string;
  correctTexts: string[];
  distractorTexts: string[];
}

export interface SpoilerLeak {
  questionId: string;
  answerText: string;
  sentence: string;
}
