/**
 * Backward-compatibility façade for the decomposed thumbnail manifest modules.
 * New code should import from the focused modules directly:
 * - `thumbnailVariantGenerator.js` — AI provider orchestration for thumbnail variants
 * - `thumbnailManifestStore.js` — manifest read/write, version history, active selection
 * - `thumbnailLegacyMigrator.js` — legacy episode-record thumbnail path sync
 */

export {
  generateThumbnailVariant,
  type GenerateEpisodeThumbnailOptions,
  type GenerateVariantParams,
  type VariantGenerationResult,
} from "./thumbnailVariantGenerator.js";
export {
  deleteThumbnailVersion,
  getEpisodeThumbnailManifest,
  persistThumbnailManifest,
  pruneVersionHistory,
  setActiveThumbnailVersion,
} from "./thumbnailManifestStore.js";
export { syncLegacyEpisodeThumbnailPaths } from "./thumbnailLegacyMigrator.js";
