/**
 * Mascot Art Generator Facade.
 * Re-exports modular mascot art generators and services for 100% backward compatibility.
 */

export { generateMascotAiImageBytes } from "./services/mascotAiImageClient.js";
export { loadMascotAssetBase64ByUrl, loadMasterReferenceImageBase64 } from "./services/mascotAssetLoader.js";
export { generateMascotStyleBatch } from "./services/mascotBatchScheduler.js";

export {
  deletePreviousMascotAsset,
  resolveSlotPromptModifier,
  resolveSlotReferenceImage,
  generateMascotConceptArt,
  generateMascotActionArt,
  generateMascotActionSprite,
  generateMascotStyleSlot,
  generateMascotSourceImageSlot,
  generateMascotStyleConcept,
} from "./generation/index.js";
