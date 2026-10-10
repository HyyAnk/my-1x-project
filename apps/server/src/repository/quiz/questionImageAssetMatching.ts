import type { QuizAssetRequirement } from "@studio/shared";

/** The asset fields shared by planned requirements and resolved assets that slot matching relies on. */
export type MatchableQuizAsset = Pick<QuizAssetRequirement, "asset_id" | "question_id" | "semantic_key" | "purpose">;

export interface QuestionAssetRef {
  questionId: string;
  questionNumber: number;
}

export interface ChoiceAssetRef extends QuestionAssetRef {
  choiceId: string | undefined;
}

/**
 * Reads a property that is not part of the declared schema (for example a legacy `choice_id`
 * persisted by older writers) without widening the record to `any`.
 */
export function readUndeclaredProperty(value: object, key: string): unknown {
  return (value as Record<string, unknown>)[key];
}

export function readUndeclaredStringProperty(value: object | null | undefined, key: string): string | undefined {
  if (!value) return undefined;
  const property = readUndeclaredProperty(value, key);
  return typeof property === "string" ? property : undefined;
}

export function readAssetChoiceId(asset: object): unknown {
  return readUndeclaredProperty(asset, "choice_id");
}

export function belongsToQuestion(asset: MatchableQuizAsset, ref: QuestionAssetRef): boolean {
  return asset.question_id === ref.questionId || asset.question_id === `q${ref.questionNumber}`;
}

export function belongsToQuestionWithPurpose(
  asset: MatchableQuizAsset,
  ref: QuestionAssetRef,
  purpose: MatchableQuizAsset["purpose"],
): boolean {
  return belongsToQuestion(asset, ref) && asset.purpose === purpose;
}

/** Matches a planned or resolved asset to an answer-choice slot using every known id convention. */
export function matchesChoiceSlotAsset(asset: MatchableQuizAsset, ref: ChoiceAssetRef): boolean {
  const { questionId, questionNumber, choiceId } = ref;
  return (
    belongsToQuestion(asset, ref) &&
    (readAssetChoiceId(asset) === choiceId ||
      asset.asset_id === `asset-${questionId}-${choiceId}` ||
      asset.asset_id === `asset-q${questionNumber}-${choiceId}` ||
      asset.asset_id === `q${questionNumber}_${choiceId}` ||
      asset.asset_id.endsWith(`-${choiceId}`) ||
      Boolean(asset.semantic_key?.endsWith(`:choice:${choiceId}`)) ||
      Boolean(asset.semantic_key?.includes(`:choice:${choiceId}`)))
  );
}

/** Matches the upload target of a choice slot (a narrower convention set than slot listing). */
export function matchesChoiceUploadAsset(asset: MatchableQuizAsset, ref: ChoiceAssetRef): boolean {
  const { questionId, choiceId } = ref;
  return (
    belongsToQuestion(asset, ref) &&
    (readAssetChoiceId(asset) === choiceId ||
      Boolean(asset.semantic_key?.endsWith(`:choice:${choiceId}`)) ||
      asset.asset_id.endsWith(`-${choiceId}`) ||
      asset.asset_id === `asset-${questionId}-${choiceId}`)
  );
}

export function matchesHeroUploadAsset(asset: MatchableQuizAsset, ref: QuestionAssetRef): boolean {
  return (
    asset.asset_id === `q${ref.questionNumber}_hero` ||
    belongsToQuestionWithPurpose(asset, ref, "hero_question_image")
  );
}

export interface UploadTargetRef extends ChoiceAssetRef {
  assetId: string;
  isChoiceSlot: boolean;
}

/** Finds the asset an uploaded image replaces: exact asset id first, then slot conventions. */
export function matchesUploadTarget(asset: MatchableQuizAsset, ref: UploadTargetRef): boolean {
  if (asset.asset_id === ref.assetId) return true;
  return ref.isChoiceSlot ? matchesChoiceUploadAsset(asset, ref) : matchesHeroUploadAsset(asset, ref);
}

export interface ChoiceDeleteRef extends ChoiceAssetRef {
  assetId: string | undefined;
}

export function matchesChoiceDeleteAsset(asset: MatchableQuizAsset, ref: ChoiceDeleteRef): boolean {
  return matchesChoiceUploadAsset(asset, ref) || (belongsToQuestion(asset, ref) && asset.asset_id === ref.assetId);
}

export function matchesHeroDeleteAsset(asset: MatchableQuizAsset, ref: QuestionAssetRef): boolean {
  return (
    belongsToQuestion(asset, ref) &&
    (asset.purpose === "hero_question_image" || asset.asset_id === `q${ref.questionNumber}_hero`)
  );
}
