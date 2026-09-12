/**
 * Facade module bridging the Question Bank and Quiz episode generation pipelines.
 * Re-exports conversion utilities, single-question episode creation,
 * and topic candidate episode confirmation.
 */

export {
  convertBankQuestionToQuizQuestion,
  convertBankQuestionToQuizQuestionLossless,
  type ConvertBankQuestionOptions,
} from "./bridge/bankQuestionConverter.js";

export {
  type CreateEpisodeFromQuestionBankInput,
  type CreateEpisodeFromQuestionBankResult,
  type CreateEpisodeFromTopicWithBankInput,
  type CreateEpisodeFromTopicWithBankResult,
} from "./bridge/bankEpisodeBootstrapper.js";

export {
  publishStagedEpisode,
  stageAndPublishSingleQuestionEpisodeFiles,
  stageAndPublishTopicEpisodeFiles,
  type StageAndPublishSingleQuestionParams,
  type StageAndPublishTopicParams,
} from "./bridge/episodeStagingPublisher.js";

export {
  createEpisodeFromQuestionBank,
  createEpisodeFromBankQuestions,
} from "./bridge/singleQuestionBridge.js";

export {
  createEpisodeFromTopicWithBank,
  createEpisodeFromTopicCandidate,
  executeEpisodeConfirmation,
  handleExistingConfirmationReceipt,
} from "./bridge/topicEpisodeBridge.js";

export {
  withTopicConfirmationLock,
  isTopicConfirmationLocked,
  clearAllTopicConfirmationLocks,
} from "./bridge/topicConfirmationLock.js";
