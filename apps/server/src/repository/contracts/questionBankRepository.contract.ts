import type {
  BankIndex,
  BankQuestion,
  BankQuestionWithCooldown,
  BankSubtopicBatch,
  BankTaxonomy,
  BankTranslationContent,
  MatrixCoverageStats,
} from "@studio/shared";
import type { BankQuestionSnapshot } from "../quiz/bank/bankSerializationBoundary.js";
import type { BankCooldownScope, QueryQuestionBankParams } from "../quiz/questionBankRepository.js";

export type { BankCooldownScope, QueryQuestionBankParams } from "../quiz/questionBankRepository.js";

export interface IQuestionBankRepository {
  getQuestionBankPath(...segments: string[]): string;
  readQuestionBankTaxonomy(): Promise<BankTaxonomy>;
  readQuestionBankIndex(): Promise<BankIndex>;
  listQuestionBankBatches(filter?: { archetypeId?: string; domainId?: string }): Promise<BankSubtopicBatch[]>;
  recalculateQuestionBankIndex(): Promise<BankIndex>;
  queryQuestionBankQuestions(
    params?: QueryQuestionBankParams,
    scope?: BankCooldownScope,
  ): Promise<{ questions: BankQuestionWithCooldown[]; total: number }>;
  readQuestionBankQuestionsSnapshot(
    params?: QueryQuestionBankParams,
    scope?: BankCooldownScope,
  ): Promise<{ questions: BankQuestionWithCooldown[]; total: number; revision: number }>;
  getQuestionBankQuestion(questionId: string, channelId?: string, scope?: BankCooldownScope): Promise<BankQuestionWithCooldown | null>;
  readQuestionBankSnapshot(): Promise<BankQuestionSnapshot>;
  saveQuestionBankQuestion(question: BankQuestion): Promise<BankQuestion>;
  saveQuestionBankTranslation(questionId: string, translation: BankTranslationContent): Promise<BankQuestion | null>;
  deleteQuestionBankQuestion(questionId: string): Promise<boolean>;
  clearQuestionBank(): Promise<{ cleared_batches_count: number }>;
  getQuestionBankMatrixCoverage(): Promise<MatrixCoverageStats>;
}
