import path from "node:path";
import { EpisodeSchema, SceneSchema, nowIso, quizChoiceCountForFormat, type Episode, type Scene } from "@studio/shared";
import { invalidateQuizArtifacts as quizInvalidationStages } from "../quiz/pipeline/invalidation.js";
import { RepositoryError } from "./errors.js";
import { parseScenes, serializeDialogue, serializePrompts, serializeScenes } from "./sceneCodec.js";
import { synthesizeScenesFromQuiz } from "../quiz/domain/quizArtifactSynthesizer.js";
import type { RepositoryRuntime } from "./runtime.js";

export {
  listBundleImages,
  getBundleImagePath,
  getBundleImageFile,
  writeBundleImage,
  saveBundleImage,
  writeBundleImageFromFile,
  clearBundleImages,
  deleteBundleImage,
} from "./bundleImages.js";

function clearSceneAudio(scene: Scene): Scene {
  return { ...scene, audio_asset_path: null, audio_generated_at: null, audio_duration_seconds: null };
}

export function assertQuizSceneChoicePolicy(scenes: Scene[], episode: Episode): void {
  const normalizedFormat = episode.quiz_config.quiz_format === "knowledge" ? "multiple_choice" : episode.quiz_config.quiz_format;
  const defaultRequiredChoiceCount = quizChoiceCountForFormat(normalizedFormat);
  for (const scene of scenes) {
    if (!scene.quiz || !scene.quiz.question_number || ["intro", "outro"].includes(scene.quiz.phase)) continue;
    const isSingleReveal =
      scene.quiz.answer_mode === "single_reveal" || (scene.quiz.choices.length === 1 && episode.quiz_config.quiz_format === "image_guess");
    const requiredChoiceCount = isSingleReveal ? 1 : defaultRequiredChoiceCount;
    if (scene.quiz.choices.length !== requiredChoiceCount) {
      throw new RepositoryError(
        `Question ${scene.quiz.question_number} must have exactly ${requiredChoiceCount} choices; received ${scene.quiz.choices.length}`,
        "QUIZ_CHOICE_COUNT_INVALID",
      );
    }
  }
}

export async function readScenes(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<Scene[]> {
  const [file, episode] = await Promise.all([
    this.getEpisodeFile(channelId, episodeId, "scene_plan.md"),
    this.getEpisode(channelId, episodeId),
  ]);
  let scenes = parseScenes(file.content, episodeId);
  if (scenes.length === 0) {
    const quiz = typeof this.readQuiz === "function" ? await this.readQuiz(channelId, episodeId).catch(() => null) : null;
    if (quiz && quiz.questions.length > 0) {
      scenes = synthesizeScenesFromQuiz(quiz);
      try {
        const channel = await this.getChannel(channelId);
        const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
        await this.writeTextAtomic(path.join(episodeDirectory, "scene_plan.md"), serializeScenes(scenes));
        await this.writeTextAtomic(path.join(episodeDirectory, "dialogue_script.md"), serializeDialogue(scenes));
        await this.writeTextAtomic(path.join(episodeDirectory, "video_prompts.md"), serializePrompts(scenes));
      } catch {
        // Non-blocking fallback sync
      }
    }
  }
  assertQuizSceneChoicePolicy(scenes, episode);
  return scenes;
}

export async function attachBundleReference(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleId: string,
  assetPath: string,
): Promise<number> {
  const scenes = await this.readScenes(channelId, episodeId);
  const matching = scenes.filter((scene) => scene.continuity_bundle_id.toUpperCase() === bundleId.toUpperCase());
  if (matching.length === 0) return 0;
  const next = scenes.map((scene) =>
    scene.continuity_bundle_id.toUpperCase() === bundleId.toUpperCase()
      ? SceneSchema.parse({ ...scene, reference_asset_ids: [...new Set([...scene.reference_asset_ids, assetPath])] })
      : scene,
  );
  await this.saveScenes(channelId, episodeId, next);
  return matching.length;
}

export async function saveScenes(this: RepositoryRuntime, channelId: string, episodeId: string, scenes: Scene[]): Promise<void> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const previousScenes = await this.readScenes(channelId, episodeId);
  const normalized = scenes.map((scene, index) => SceneSchema.parse({ ...scene, scene_number: index + 1, episode_id: episodeId }));
  assertQuizSceneChoicePolicy(normalized, episode);
  const withFreshAudio = normalized.map((scene) => {
    const previous = previousScenes.find((item) => item.scene_number === scene.scene_number);
    if (previous && previous.dialogue !== scene.dialogue) return clearSceneAudio(scene);
    return scene;
  });
  const scenesChanged = JSON.stringify(withFreshAudio) !== JSON.stringify(previousScenes);
  const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
  await this.writeTextAtomic(path.join(episodeDirectory, "scene_plan.md"), serializeScenes(withFreshAudio));
  await this.writeTextAtomic(path.join(episodeDirectory, "dialogue_script.md"), serializeDialogue(withFreshAudio));
  await this.writeTextAtomic(path.join(episodeDirectory, "video_prompts.md"), serializePrompts(withFreshAudio));
  await this.writeJsonAtomic(
    path.join(episodeDirectory, "episode.json"),
    EpisodeSchema.parse({ ...episode, stage: "SCENE_READY", updated_at: nowIso() }),
  );
  if (scenesChanged) await this.invalidateQuizSourceArtifacts(channelId, episodeId);
}

export async function invalidateQuizSourceArtifacts(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<void> {
  await this.invalidateQuizArtifacts(channelId, episodeId, quizInvalidationStages("research"));
}
