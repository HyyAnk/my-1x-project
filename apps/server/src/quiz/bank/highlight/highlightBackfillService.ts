import type { BankQuestion } from "@studio/shared";
import { AsyncMutex } from "../batch/utils/batchAsyncUtils.js";
import { annotateHighlightPhrases, needsHighlightPhrase } from "./highlightAnnotationService.js";
import type {
  HighlightBackfillOptions,
  HighlightBackfillProgress,
  HighlightBackfillReport,
  HighlightBackfillRepository,
  HighlightCoverage,
} from "./highlightBackfill.types.js";

const DEFAULT_QUESTIONS_PER_PROMPT = 25;
const DEFAULT_CONCURRENCY = 3;
const MAX_SAMPLE_ERRORS = 5;

/** Archived questions are hidden from every product, so they are neither counted nor annotated. */
export async function readActiveBankQuestions(repository: HighlightBackfillRepository): Promise<BankQuestion[]> {
  const snapshot = await repository.readQuestionBankSnapshot();
  return snapshot.batches.flatMap((batch) => batch.questions).filter((question) => question.status !== "archived");
}

export function summarizeHighlightCoverage(questions: readonly BankQuestion[]): HighlightCoverage {
  const missing = questions.filter(needsHighlightPhrase).length;
  return { total: questions.length, withPhrase: questions.length - missing, missing };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

/**
 * Writes the phrase onto the latest stored copy of the question. A question whose text changed (or that was
 * deleted) since the snapshot is skipped, so a concurrent manual edit is never overwritten.
 */
async function persistPhrase(repository: HighlightBackfillRepository, original: BankQuestion, phrase: string): Promise<"saved" | "stale"> {
  const current = await repository.getQuestionBankQuestion(original.id);
  if (!current || current.question !== original.question) return "stale";
  const { channel_cooldown: _cooldown, ...question } = current;
  await repository.saveQuestionBankQuestion({ ...question, highlight_phrase: phrase });
  return "saved";
}

class HighlightBackfillRun {
  private readonly saveMutex = new AsyncMutex();
  readonly report: HighlightBackfillReport;

  constructor(
    private readonly repository: HighlightBackfillRepository,
    private readonly options: HighlightBackfillOptions,
    total: number,
  ) {
    this.report = { total, processed: 0, annotated: 0, unresolved: 0, skippedStale: 0, saveFailures: 0, sampleErrors: [] };
  }

  async processChunk(questions: BankQuestion[]): Promise<void> {
    this.options.signal?.throwIfAborted();
    const result = await annotateHighlightPhrases(questions, {
      ...this.options,
      chunkSize: questions.length,
    });
    const annotated = new Set(result.annotatedIds);
    await this.saveMutex.run(async () => {
      for (const question of result.questions) {
        if (annotated.has(question.id) && question.highlight_phrase) await this.saveOne(question, question.highlight_phrase);
      }
    });
    this.report.processed += questions.length;
    this.report.unresolved += result.unresolvedIds.length;
    this.options.onProgress?.(this.progress());
  }

  private async saveOne(question: BankQuestion, phrase: string): Promise<void> {
    try {
      const outcome = await persistPhrase(this.repository, question, phrase);
      if (outcome === "saved") this.report.annotated += 1;
      else this.report.skippedStale += 1;
    } catch (error) {
      this.report.saveFailures += 1;
      if (this.report.sampleErrors.length < MAX_SAMPLE_ERRORS) {
        this.report.sampleErrors.push(`${question.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private progress(): HighlightBackfillProgress {
    const { sampleErrors: _errors, ...progress } = this.report;
    return progress;
  }
}

/**
 * Gives every active Question Bank question without a valid highlight phrase an LLM-chosen one.
 * Safe to re-run: questions that already carry a valid phrase are never sent to the model.
 */
export async function runHighlightBackfill(
  repository: HighlightBackfillRepository,
  options: HighlightBackfillOptions,
): Promise<HighlightBackfillReport> {
  const pending = (await readActiveBankQuestions(repository)).filter(needsHighlightPhrase);
  const run = new HighlightBackfillRun(repository, options, pending.length);
  options.onProgress?.({ ...run.report });
  const queue = chunk(pending, options.questionsPerPrompt ?? DEFAULT_QUESTIONS_PER_PROMPT);
  const worker = async (): Promise<void> => {
    for (let next = queue.shift(); next; next = queue.shift()) await run.processChunk(next);
  };
  const workerCount = Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, queue.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return run.report;
}
