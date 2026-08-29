import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  ContextManifestSchema,
  type ContextManifest,
  type Episode,
  type TaskType,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
} from "@studio/shared";
import { RepositoryService } from "./repository.js";
import { StudioLogger } from "./logger.js";
import { DEFAULT_CONFIG } from "./config.js";
import { calibratedScriptTargetWords, scriptWordBounds } from "./production.js";
import { continuityBundleId } from "./visualBundles.js";
import { extractArtifactSectionNumbers } from "./artifactSections.js";
import { isPlaceholderArtifact } from "./tasks/validators.js";
import {
  buildOutputContract,
  excerptForScene,
  humorGuidanceForDuration,
  selectMarkdownSection,
  selectMarkdownSectionOrFallback,
  selectResearchForSequence,
  selectSections,
  sequenceGuidanceForDuration,
} from "./contextContracts.js";

type ContextFile = { path: string; reason: string; content: string };

export class ContextEngine {
  constructor(
    private readonly repository: RepositoryService,
    private readonly logger: StudioLogger,
  ) {}

  async build(
    taskType: TaskType,
    channelId: string,
    episodeId: string | null,
    sceneNumber?: number,
    imageVariant = 0,
    topicHint?: string,
  ): Promise<ContextManifest> {
    const channel = await this.repository.getChannel(channelId);
    const isQuiz = channel.engine === "quiz" || channel.group_id === "quiz";
    const files: ContextFile[] = [];
    const sharedFiles: ContextFile[] = [];
    const excluded = ["other channels", "full unrelated episodes", "raw task history", "secrets and credentials"];
    const add = (file: ContextFile) => files.push(file);
    const read = async (relativePath: string, reason: string): Promise<string> => {
      const absolute = this.repository.resolveContextPath(relativePath);
      try {
        const content = await (await import("node:fs/promises")).readFile(absolute, "utf8");
        add({ path: relativePath, reason, content });
        return content;
      } catch {
        return "";
      }
    };

    const dnaPath = `channels/${channel.slug}/channel_dna.md`;
    const stylePath = `channels/${channel.slug}/style_guide.md`;
    if (taskType === "GENERATE_DNA") {
      const template = await read("templates/quiz_channel_dna.md", "canonical DNA schema");
      const prompt = this.compose(taskType, channel, null, files, {
        user_description: channel.description,
        metadata: { name: channel.display_name, audience: channel.target_audience, language: channel.language, market: channel.market },
        template,
        output_contract: "Return only the completed Markdown DNA document. Do not write files or perform research.",
      });
      return this.finalize(taskType, channelId, null, files, excluded, prompt);
    }

    const dna = await read(dnaPath, "active channel DNA");
    if (taskType === "SUGGEST_TOPICS") {
      await read(stylePath, "channel style guide");
      await this.readSharedRules(["research_rules.md"], sharedFiles);
      const topics = await this.repository.listTopics(channelId);
      const episodes = await this.repository.listEpisodes(channelId);
      add({
        path: `channels/${channel.slug}/topic_database.json`,
        reason: "existing titles and premises only",
        content: JSON.stringify(topics.map(({ title, premise }) => ({ title, premise }))),
      });
      add({
        path: `channels/${channel.slug}/episodes/index.json`,
        reason: "existing episode titles only",
        content: JSON.stringify(episodes.map((episode) => episode.topic.title)),
      });
      const hintGuidance = topicHint?.trim()
        ? `\nIMPORTANT TOPIC THEME REQUIREMENT: The user specifically requested ideas relating to "${topicHint.trim()}". Exactly 2 candidates MUST be directly inspired by, focused on, or explore specific creative angles of "${topicHint.trim()}" (include "theme_hint": "${topicHint.trim()}" in those 2 JSON objects). The remaining 3 candidates should be diverse, creative topics aligned with the overall channel DNA.`
        : "";
      const prompt = this.compose(taskType, channel, null, [...files, ...sharedFiles], {
        output_contract: isQuiz
          ? `Return exactly 5 JSON candidates with title, premise, why_it_fits, hook, estimated_potential, quiz_format (knowledge|image_guess|multiple_choice|true_false|odd_one_out), question_count (${QUIZ_MIN_QUESTION_COUNT}-${QUIZ_MAX_QUESTION_COUNT}), and age_band (4-6|7-9|10-12|family). Use five different formats where possible.${hintGuidance} Do not research or develop them further.`
          : `Return exactly 5 JSON candidates with title, premise, why_it_fits, hook, and estimated_potential.${hintGuidance} Do not research or develop them further.`,
      });
      return this.finalize(
        taskType,
        channelId,
        null,
        [...files, ...sharedFiles],
        excluded.concat("research/script/scene work for candidates"),
        prompt,
      );
    }

    const episode = episodeId ? await this.repository.getEpisode(channelId, episodeId) : null;
    if (!episode) throw new Error(`Episode is required for ${taskType}`);
    const episodeKey = episode.episode_id;
    const briefFile = await this.repository.getEpisodeFile(channelId, episodeKey, "brief.md");
    add({ path: briefFile.path, reason: "confirmed episode brief", content: briefFile.content });

    const loadArtifact = async (filename: string, required = false) => {
      const file = await this.repository.getEpisodeFile(channelId, episodeKey, filename);
      if (required && isPlaceholderArtifact(file.content)) throw new Error(`${filename} must be ready before ${taskType}`);
      return file;
    };
    const artifact = async (filename: string, reason: string, required = false) => {
      const file = await loadArtifact(filename, required);
      if (!isPlaceholderArtifact(file.content)) add({ path: file.path, reason, content: file.content });
      return file.content;
    };
    const runtimeConfig = (await this.readConfig()) as {
      video_generation?: { max_scene_duration_seconds?: number; narration_words_per_second?: number };
    };
    const narrationWordsPerSecond = runtimeConfig.video_generation?.narration_words_per_second ?? 2.3;
    const calibratedTargetWords = calibratedScriptTargetWords(episode, narrationWordsPerSecond);
    const scriptBounds = scriptWordBounds(calibratedTargetWords);
    const maxBeatWords = Math.max(
      1,
      Math.floor(
        (runtimeConfig.video_generation?.max_scene_duration_seconds ?? 8) *
          (episode.measured_narration_words_per_second ?? runtimeConfig.video_generation?.narration_words_per_second ?? 2.3),
      ),
    );
    const humorGuidance = humorGuidanceForDuration(episode.target_duration_minutes);
    const sequenceGuidance = sequenceGuidanceForDuration(episode.target_duration_minutes);
    const quizQuestionCount = episode.quiz_config.question_count;
    const quizLastClaimId = `C${String(quizQuestionCount).padStart(2, "0")}`;
    const quizSourceMinimum = Math.max(3, Math.ceil(quizQuestionCount / 2));

    if (taskType === "GENERATE_RESEARCH") {
      await read(stylePath, "channel style guide");
      await this.readSharedRules(["research_rules.md"], sharedFiles);
    } else if (taskType === "GENERATE_TREATMENT") {
      await read(stylePath, "channel style guide");
      await artifact("research.md", "verified research dossier", true);
      await this.readSharedRules(["treatment_rules.md"], sharedFiles);
    } else if (taskType === "GENERATE_SCRIPT") {
      await read(stylePath, "channel style guide");
      await artifact("research.md", "verified research dossier", true);
      await artifact("treatment.md", "approved documentary treatment", true);
      await this.readSharedRules(["script_rules.md"], sharedFiles);
    } else if (taskType === "GENERATE_VISUAL_BIBLE") {
      await read(stylePath, "channel style guide");
      await artifact("research.md", "verified research dossier", true);
      await artifact("treatment.md", "approved documentary treatment", true);
      await artifact("script.md", "confirmed episode script", true);
      await this.readSharedRules(["visual_bible_rules.md", "prompt_rules.md"], sharedFiles);
    } else if (taskType === "GENERATE_BUNDLE_IMAGE") {
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
      await this.readSharedRules(["visual_bible_rules.md"], sharedFiles);
      const target = await this.repository.getBundleImagePath(channelId, episodeKey, bundleNumber, imageVariant);
      add({ path: target.absolutePath, reason: "requested image output path", content: "" });
    } else if (taskType === "GENERATE_SEQUENCE_SCENES") {
      const sequenceNumber = sceneNumber ?? 0;
      if (sequenceNumber < 1) throw new Error("Sequence number is required for shot generation");
      const research = await loadArtifact("research.md", true);
      const treatment = await loadArtifact("treatment.md", true);
      const script = await loadArtifact("script.md", true);
      const visualBible = await loadArtifact("visual_bible.md", true);
      add({
        path: `${research.path}#sequence-${sequenceNumber}`,
        reason: `research claim for sequence ${sequenceNumber}`,
        content: selectResearchForSequence(research.content, sequenceNumber, isQuiz),
      });
      add({
        path: `${treatment.path}#sequence-${sequenceNumber}`,
        reason: `treatment sequence ${sequenceNumber}`,
        content: selectMarkdownSectionOrFallback(
          treatment.content,
          sequenceNumber,
          isQuiz ? /^##\s+Question\s+\d+/i : /^##\s+Sequence\s+\d+/i,
          isQuiz ? "question" : "sequence",
          "treatment",
        ),
      });
      add({
        path: `${script.path}#sequence-${sequenceNumber}`,
        reason: `script sequence ${sequenceNumber}`,
        content: selectMarkdownSectionOrFallback(script.content, sequenceNumber, /^##\s+/i, isQuiz ? "question" : "sequence", "script"),
      });
      add({
        path: `${visualBible.path}#CB-${String(sequenceNumber).padStart(2, "0")}`,
        reason: `continuity bundle ${sequenceNumber}`,
        content: selectMarkdownSectionOrFallback(
          visualBible.content,
          sequenceNumber,
          /^##\s+Continuity bundle/i,
          "continuity_bundle",
          "visual bible",
        ),
      });
      const sequenceRules = isQuiz ? ["prompt_rules.md"] : ["visual_rules.md", "prompt_rules.md", "cinematic_prompt_reference.md"];
      await this.readSharedRules(sequenceRules, sharedFiles);
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
      const sceneRules = isQuiz ? ["prompt_rules.md"] : ["visual_rules.md", "prompt_rules.md", "cinematic_prompt_reference.md"];
      await this.readSharedRules(sceneRules, sharedFiles);
      add({
        path: ".documentary-studio/config.json",
        reason: "shot duration, narration pace, and aspect ratio",
        content: JSON.stringify(runtimeConfig),
      });
    } else {
      const regenRules = isQuiz ? ["prompt_rules.md"] : ["visual_rules.md", "prompt_rules.md", "cinematic_prompt_reference.md"];
      await this.readSharedRules(regenRules, sharedFiles);
      const scenes = await this.repository.readScenes(channelId, episodeKey);
      const current = scenes.find((scene) => scene.scene_number === sceneNumber);
      if (!current) throw new Error("Scene is required for regeneration");
      const neighbors = scenes.filter((scene) => Math.abs(scene.scene_number - current.scene_number) <= 1);
      add({
        path: `channels/${channel.slug}/episodes/${episode.slug}/scene-${current.scene_number}.json`,
        reason: "current scene and immediate neighbors",
        content: JSON.stringify(neighbors),
      });
      const script = await this.repository.getEpisodeFile(channelId, episodeKey, "script.md");
      add({ path: script.path, reason: "script excerpt around scene", content: excerptForScene(script.content, current.scene_number) });
      add({
        path: dnaPath,
        reason: "relevant continuity guidance",
        content: selectSections(dna, ["Visual Language", "Scene Rules", "Narrative Style"]),
      });
    }

    const treatmentForPrompt = files.find((file) => file.path.endsWith("/treatment.md"))?.content ?? "";
    const treatmentKind = isQuiz ? "question" : "sequence";
    const requiredBundleNumbers = extractArtifactSectionNumbers(treatmentForPrompt, treatmentKind);
    const requiredBundleInstruction = requiredBundleNumbers.length
      ? `Create exactly ${requiredBundleNumbers.length} continuity bundles with IDs ${requiredBundleNumbers.map((number) => `CB-${String(number).padStart(2, "0")}`).join(", ")}, one bundle for every upstream ${isQuiz ? "question" : "sequence"}.`
      : "Create one continuity bundle for every upstream sequence in order.";

    const outputContract = buildOutputContract({
      taskType,
      isQuiz,
      episode,
      sceneNumber,
      quizQuestionCount,
      quizLastClaimId,
      quizSourceMinimum,
      calibratedTargetWords,
      narrationWordsPerSecond,
      scriptBounds,
      humorGuidance,
      sequenceGuidance,
      requiredBundleInstruction,
      maxBeatWords,
    });

    const prompt = this.compose(taskType, channel, episode, [...files, ...sharedFiles], {
      scene_number: sceneNumber ?? null,
      target_duration_minutes: episode.target_duration_minutes,
      target_word_count: episode.target_word_count,
      output_contract: outputContract,
    });
    return this.finalize(
      taskType,
      channelId,
      episodeKey,
      [...files, ...sharedFiles],
      excluded.concat("other scenes outside immediate neighbors"),
      prompt,
    );
  }

  private async readSharedRules(names: string[], target: ContextFile[]): Promise<void> {
    for (const name of names) {
      const relative = `shared/${name}`;
      const absolute = this.repository.resolveContextPath(relative);
      try {
        const content = await (await import("node:fs/promises")).readFile(absolute, "utf8");
        target.push({ path: relative, reason: "shared production rule", content });
      } catch {
        // A missing optional rule is not fatal; the manifest still records the other inputs.
      }
    }
  }

  private async readConfig(): Promise<unknown> {
    try {
      const raw = JSON.parse(
        await (
          await import("node:fs/promises")
        ).readFile(path.join(this.repository.rootDirectory, ".documentary-studio", "config.json"), "utf8"),
      ) as Record<string, unknown>;
      return { ...raw, video_generation: { ...DEFAULT_CONFIG.video_generation, ...(raw.video_generation as object | undefined) } };
    } catch {
      return { video_generation: DEFAULT_CONFIG.video_generation };
    }
  }

  private compose(
    taskType: TaskType,
    channel: { display_name: string; description: string; target_audience: string; language: string; market: string },
    episode: Episode | null,
    files: ContextFile[],
    extra: Record<string, unknown>,
  ): string {
    const context = files.map((file) => `\n--- FILE: ${file.path} (${file.reason}) ---\n${file.content}`).join("\n");
    const episodeLine = episode
      ? `Episode: ${episode.topic.title}\nPremise: ${episode.topic.premise}\nHook: ${episode.topic.hook}`
      : "No episode is confirmed for this task.";
    return [
      "You are working inside AI Quiz Studio.",
      `Task type: ${taskType}`,
      `Channel: ${channel.display_name}`,
      `Channel description: ${channel.description}`,
      `Audience: ${channel.target_audience}; language: ${channel.language}; market: ${channel.market}`,
      episodeLine,
      taskType === "GENERATE_RESEARCH"
        ? "Use read-only web research to verify this confirmed topic. Prefer primary records, government/university archives, standards bodies, museums, and contemporary reporting. Never invent a source or inaccessible quotation."
        : "Use only the scoped context below. Treat the research claim ledger as the factual boundary and never invent facts, quotes, people, programs, figures, or sources. DO NOT USE ANY WORKSPACE/CODE SEARCH OR EDITING TOOLS; output the final response text or JSON directly.",
      `Task instructions: ${JSON.stringify(extra)}`,
      context,
    ].join("\n");
  }

  private async finalize(
    taskType: TaskType,
    channelId: string,
    episodeId: string | null,
    files: ContextFile[],
    excluded: string[],
    prompt: string,
  ): Promise<ContextManifest> {
    const manifest = ContextManifestSchema.parse({
      task_type: taskType,
      scope: { channel_id: channelId, episode_id: episodeId },
      included_files: files.map(({ path: filePath, reason, content }) => ({ path: filePath, reason, bytes: Buffer.byteLength(content) })),
      excluded_categories: excluded,
      approximate_bytes: Buffer.byteLength(prompt),
      prompt,
    });
    const auditDirectory = path.join(this.repository.roots.runtime, "logs");
    await mkdir(auditDirectory, { recursive: true });
    await appendFile(
      path.join(auditDirectory, "context-manifests.jsonl"),
      `${JSON.stringify({ ...manifest, created_at: new Date().toISOString() })}\n`,
      "utf8",
    );
    this.logger.debug("Context manifest assembled", { step: "context", profileId: channelId });
    return manifest;
  }
}
