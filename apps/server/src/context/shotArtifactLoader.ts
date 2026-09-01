import type { Channel, Episode, TaskType } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { StudioLogger } from "../logger.js";
import { continuityBundleId } from "../visualBundles.js";
import {
  excerptForScene,
  selectMarkdownSection,
  selectMarkdownSectionOrFallback,
  selectResearchForQuestion,
  selectSections,
} from "../contextContracts.js";
import { readSharedRules } from "./contextManifestFinalizer.js";
import type { ArtifactContext } from "./pipelineArtifactLoader.js";

export type EpisodeContextInput = {
  repository: RepositoryService;
  logger: StudioLogger;
  channel: Channel;
  episode: Episode;
  taskType: TaskType;
  channelId: string;
  episodeId: string;
  sceneNumber?: number;
  imageVariant: number;
};

export async function loadShotArtifacts(input: EpisodeContextInput, ctx: ArtifactContext): Promise<void> {
  const { repository, taskType, channelId, episodeId, sceneNumber, imageVariant } = input;
  const { sharedFiles, dna, dnaPath, add, loadArtifact, artifact, runtimeConfig } = ctx;

  if (taskType === "GENERATE_BUNDLE_IMAGE") {
    const bundleNumber = sceneNumber ?? 0;
    if (bundleNumber < 1) throw new Error("Bundle number is required for anchor image generation");
    const visualBible = await loadArtifact("visual_bible.md", true);
    const bundleId = continuityBundleId(bundleNumber);
    add({
      path: `${visualBible.path}#${bundleId}`,
      reason: `continuity bundle ${bundleId}`,
      content: selectMarkdownSection(visualBible.content, bundleNumber, /^##\s+Continuity bundle/i),
    });
    add({ path: dnaPath, reason: "visual style and language locks", content: selectSections(dna, ["Visual Style", "Visual Language"]) });
    await readSharedRules(repository, ["visual_bible_rules.md"], sharedFiles);
    const target = await repository.getBundleImagePath(channelId, episodeId, bundleNumber, imageVariant);
    add({ path: target.absolutePath, reason: "requested image output path", content: "" });
  } else if (taskType === "GENERATE_SEQUENCE_SCENES") {
    const questionNumber = sceneNumber ?? 0;
    if (questionNumber < 1) throw new Error("Question number is required for shot generation");
    const research = await loadArtifact("research.md", true);
    const treatment = await loadArtifact("treatment.md", true);
    const script = await loadArtifact("script.md", true);
    const visualBible = await loadArtifact("visual_bible.md", true);
    add({
      path: `${research.path}#question-${questionNumber}`,
      reason: `research claim for question ${questionNumber}`,
      content: selectResearchForQuestion(research.content, questionNumber),
    });
    add({
      path: `${treatment.path}#question-${questionNumber}`,
      reason: `treatment question ${questionNumber}`,
      content: selectMarkdownSectionOrFallback(treatment.content, questionNumber, /^##\s+Question\s+\d+/i, "question", "treatment"),
    });
    add({
      path: `${script.path}#question-${questionNumber}`,
      reason: `script question ${questionNumber}`,
      content: selectMarkdownSectionOrFallback(script.content, questionNumber, /^##\s+/i, "question", "script"),
    });
    add({
      path: `${visualBible.path}#CB-${String(questionNumber).padStart(2, "0")}`,
      reason: `continuity bundle ${questionNumber}`,
      content: selectMarkdownSectionOrFallback(
        visualBible.content,
        questionNumber,
        /^##\s+Continuity bundle/i,
        "continuity_bundle",
        "visual bible",
      ),
    });
    await readSharedRules(repository, ["prompt_rules.md"], sharedFiles);
    add({ path: ".documentary-studio/config.json", reason: "shot duration and narration pace", content: JSON.stringify(runtimeConfig) });
  } else if (taskType === "GENERATE_SCENES") {
    await artifact("research.md", "research claim and source ledger", true);
    await artifact("treatment.md", "sequence plan and time budget", true);
    await artifact("script.md", "confirmed episode script", true);
    await artifact("visual_bible.md", "episode identity and continuity bundles", true);
    add({
      path: dnaPath,
      reason: "visual language and reconstruction rules",
      content: selectSections(dna, ["Visual Style", "Visual Language", "Scene Rules", "AI Reconstruction Rules"]),
    });
    await readSharedRules(repository, ["prompt_rules.md"], sharedFiles);
    add({
      path: ".documentary-studio/config.json",
      reason: "shot duration, narration pace, and aspect ratio",
      content: JSON.stringify(runtimeConfig),
    });
  } else {
    await readSharedRules(repository, ["prompt_rules.md"], sharedFiles);
    const scenes = await repository.readScenes(channelId, episodeId);
    const current = scenes.find((scene) => scene.scene_number === sceneNumber);
    if (!current) throw new Error("Scene is required for regeneration");
    const neighbors = scenes.filter((scene) => Math.abs(scene.scene_number - current.scene_number) <= 1);
    add({
      path: `channels/${input.channel.slug}/episodes/${input.episode.slug}/scene-${current.scene_number}.json`,
      reason: "current scene and immediate neighbors",
      content: JSON.stringify(neighbors),
    });
    const script = await repository.getEpisodeFile(channelId, episodeId, "script.md");
    add({ path: script.path, reason: "script excerpt around scene", content: excerptForScene(script.content, current.scene_number) });
    add({
      path: dnaPath,
      reason: "relevant continuity guidance",
      content: selectSections(dna, ["Visual Language", "Scene Rules", "Narrative Style"]),
    });
  }
}
