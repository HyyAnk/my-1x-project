import { readScenes, attachBundleReference, saveScenes, invalidateQuizSourceArtifacts } from "../scenes.js";
import {
  listBundleImages,
  getBundleImagePath,
  getBundleImageFile,
  writeBundleImage,
  saveBundleImage,
  writeBundleImageFromFile,
  clearBundleImages,
  deleteBundleImage,
} from "../bundleImages.js";

export const sceneBindings = {
  readScenes,
  listBundleImages,
  getBundleImagePath,
  getBundleImageFile,
  writeBundleImage,
  saveBundleImage,
  writeBundleImageFromFile,
  clearBundleImages,
  deleteBundleImage,
  attachBundleReference,
  saveScenes,
  invalidateQuizSourceArtifacts,
};
