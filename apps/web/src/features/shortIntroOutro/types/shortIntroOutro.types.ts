import type { QuizShortBookendKind, QuizShortBookendPair, QuizShortTitleCanvas } from "@studio/shared";

export type ShortBookendPreview = {
  pairId: string;
  kind: QuizShortBookendKind;
  title: string;
};

export type ShortBookendBusyAction = `delete:${string}` | `canvas:${string}` | null;

export type ShortBookendPairActions = {
  onPreview: (preview: ShortBookendPreview) => void;
  onDelete: (pair: QuizShortBookendPair) => void;
  onSaveTitleCanvas: (pair: QuizShortBookendPair, canvas: QuizShortTitleCanvas) => Promise<boolean>;
};
