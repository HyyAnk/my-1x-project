import type { RepositoryRoots } from "./types.js";
import type { EntityIdResolver } from "./cache/entityIdResolver.js";
import type { ChannelCache } from "./cache/channelCache.js";
import type { QuizShortSlugCache } from "./cache/quizShortSlugCache.js";
import type {
  IStorageRepository,
  IChannelRepository,
  IEpisodeRepository,
  IMascotRepository,
  IQuizArtifactRepository,
  IQuizShortRepository,
  IQuestionBankRepository,
  IShortReelRepository,
  IMediaRepository,
  IChannelAssetRepository,
} from "./contracts/index.js";

export * from "./contracts/index.js";
export type { QuizProductId } from "./quizProductPaths.js";
export type { QuizProductLocation, QuizProductRecord, QuizProductRecordPatch } from "./quizProductLocator.js";

export interface RepositoryRuntime
  extends
    IStorageRepository,
    IChannelRepository,
    IEpisodeRepository,
    IMascotRepository,
    IQuizArtifactRepository,
    IQuizShortRepository,
    IQuestionBankRepository,
    IShortReelRepository,
    IMediaRepository,
    IChannelAssetRepository {
  readonly serviceId: string;
  readonly rootDirectory: string;
  readonly storageRoot: string;
  readonly entityIdResolver: EntityIdResolver;
  readonly channelCache: ChannelCache;
  readonly quizShortSlugCache: QuizShortSlugCache;
  roots: RepositoryRoots;
  questionHistoryWrites: Map<string, Promise<void>>;
  usageLedgerWrites: Map<string, Promise<void>>;
  artifactMutationQueues: Map<string, Promise<void>>;
  shortReelMutationQueues: Map<string, Promise<void>>;
  introOutroSelectionWrites: Map<string, Promise<void>>;
}
