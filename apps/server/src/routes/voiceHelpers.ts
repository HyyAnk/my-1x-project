import type { AppConfig } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import type { RepositoryService } from "../repository.js";
import { synthesizeWav } from "../providers/chatterbox.js";

const VOICE_PREVIEW_TEXT = "This is a preview of this narrator voice for AI Quiz Studio.";

export async function createVoiceWithPreview(
  repository: RepositoryService,
  name: string,
  reference: Uint8Array,
  audioConfig: AppConfig["audio_generation"],
  logger?: StudioLogger,
) {
  const profile = await repository.createVoiceProfile(name, reference, reference);
  try {
    const sample = await synthesizeWav(audioConfig, VOICE_PREVIEW_TEXT, repository.resolveContextPath(profile.reference_path), 60_000);
    await repository.updateVoiceSample(profile.voice_id, sample);
  } catch (error) {
    logger?.warn(`Could not synthesize voice preview for "${name}": ${error instanceof Error ? error.message : String(error)}`);
  }
  return repository.getVoice(profile.voice_id);
}
