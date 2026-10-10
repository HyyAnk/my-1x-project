import type { PortraitImageClient } from "../providers/imageGeneration/imageGeneration.types.js";
import { createPortraitImageClient } from "../providers/imageGeneration/portraitImageClient.js";
import type { TaskManagerRuntime } from "./runtime.js";

/**
 * Resolves the portrait provider for a task run: an injected client wins, otherwise one is built
 * from the runtime image configuration, the same way the other providers are created from config.
 */
export function resolveRuntimePortraitImageClient(
  runtime: Pick<TaskManagerRuntime, "portraitImageClient" | "imageConfig" | "imageFallbackConfig">,
): PortraitImageClient {
  return runtime.portraitImageClient ?? createPortraitImageClient(runtime.imageConfig, runtime.imageFallbackConfig);
}
