import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { quizShortProductRef, type QuizShort } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";
import { ProductLocalizationArtifactSchema, type ProductLocalizationArtifact, type SupportedBaseLanguage } from "./localization.types.js";
import { findConfirmationReceiptForProduct } from "./productLocalizationStore.js";
import { normalizeTargetLanguage } from "./productLocalization.js";

const LOCALIZATION_FILENAME = "localization.json";

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}

async function resolveQuizShortDirectory(repo: RepositoryService, channelId: string, quizShortId: string): Promise<string> {
  const location = await repo.locateQuizProduct(channelId, quizShortProductRef(channelId, quizShortId));
  return location.directory;
}

/** Writes `localization.json` beside `quiz_short.json`; the record must already be saved. */
export async function saveQuizShortLocalizationArtifact(
  repo: RepositoryService,
  channelId: string,
  quizShortId: string,
  artifact: ProductLocalizationArtifact,
): Promise<void> {
  const validated = ProductLocalizationArtifactSchema.parse(artifact);
  const directory = await resolveQuizShortDirectory(repo, channelId, quizShortId);
  await mkdir(directory, { recursive: true });
  await repo.writeJsonAtomic(path.join(directory, LOCALIZATION_FILENAME), validated);
}

export async function loadQuizShortLocalizationArtifact(
  repo: RepositoryService,
  channelId: string,
  quizShortId: string,
): Promise<ProductLocalizationArtifact | null> {
  const directory = await resolveQuizShortDirectory(repo, channelId, quizShortId);
  let raw: string;
  try {
    raw = await readFile(path.join(directory, LOCALIZATION_FILENAME), "utf8");
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw new RepositoryError("LOCALIZATION_UNREADABLE: Quiz Short localization artifact could not be read.", "LOCALIZATION_UNREADABLE", {
      cause: error,
    });
  }
  try {
    return ProductLocalizationArtifactSchema.parse(JSON.parse(raw));
  } catch (error) {
    throw new RepositoryError("LOCALIZATION_CORRUPTED: Quiz Short localization artifact is invalid.", "LOCALIZATION_CORRUPTED", {
      cause: error,
    });
  }
}

/** Same contract as the Episode resolver: artifact first, then the confirmation receipt, else unresolved. */
export async function resolveQuizShortTargetLanguage(
  repo: RepositoryService,
  channelId: string,
  quizShort: Pick<QuizShort, "quiz_short_id">,
): Promise<{ targetLanguage: SupportedBaseLanguage; localization: ProductLocalizationArtifact | null }> {
  const localization = await loadQuizShortLocalizationArtifact(repo, channelId, quizShort.quiz_short_id);
  if (localization) return { targetLanguage: localization.target_language, localization };

  const receipt = await findConfirmationReceiptForProduct(repo, channelId, quizShort.quiz_short_id);
  if (receipt && receipt.options.target_language) {
    const receiptLang = normalizeTargetLanguage(receipt.options.target_language);
    if (receiptLang !== "en") {
      throw new RepositoryError(
        `PRODUCT_LANGUAGE_UNRESOLVED: Missing localization artifact for non-English confirmed Quiz Short "${quizShort.quiz_short_id}" (target: ${receiptLang}). Recovery required.`,
        "PRODUCT_LANGUAGE_UNRESOLVED",
      );
    }
    return { targetLanguage: "en", localization: null };
  }

  throw new RepositoryError(
    `PRODUCT_LANGUAGE_UNRESOLVED: Product language cannot be established from a validated receipt or localization artifact for Quiz Short "${quizShort.quiz_short_id}".`,
    "PRODUCT_LANGUAGE_UNRESOLVED",
  );
}
