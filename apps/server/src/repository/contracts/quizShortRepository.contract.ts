import type { QuizShort, QuizShortSettingsInput } from "@studio/shared";
import type { QuizProductLocation, QuizProductRecord, QuizProductRecordPatch } from "../quizProductLocator.js";
import type { QuizProductId } from "../quizProductPaths.js";

export interface IQuizShortRepository {
  // Quiz Short records live at channels/<slug>/quiz_shorts/<slug>/quiz_short.json
  listQuizShorts(channelId: string): Promise<QuizShort[]>;
  getQuizShort(channelId: string, quizShortId: string): Promise<QuizShort>;
  saveQuizShort(channelId: string, quizShort: QuizShort): Promise<QuizShort>;
  deleteQuizShort(channelId: string, quizShortId: string, confirmed?: boolean): Promise<void>;
  updateQuizShortSettings(channelId: string, quizShortId: string, settings: QuizShortSettingsInput): Promise<QuizShort>;

  // Product resolution shared by Episode and Quiz Short artifact helpers
  locateQuizProduct(channelId: string, product: QuizProductId): Promise<QuizProductLocation>;
  writeQuizProductRecordPatch(location: QuizProductLocation, patch: QuizProductRecordPatch): Promise<QuizProductRecord>;
}
