export {
  WORD_PATTERN,
  PARALINGUISTIC_TAG_PATTERN,
  SCRIPT_WORD_TOLERANCE,
  calibratedScriptTargetWords,
  scriptWordBounds,
  countWords,
  splitAtNarrativeBoundaries,
  splitLongUnit,
} from "./production/speechChunker.js";

export {
  HUMOR_POLICY_MARKER,
  hasHumorPolicyMarker,
  extractNarration,
  extractNarrationForAudio,
  extractNarrationSections,
  extractNarrationChunks,
} from "./production/narrationExtractor.js";

export { assessProduction } from "./production/assessment.js";
