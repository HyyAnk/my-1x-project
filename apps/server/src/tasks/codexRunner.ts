import { copyFile, readFile, rename } from "node:fs/promises";
import { nowIso, type Task, type TaskEvent } from "@studio/shared";
import type { CodexServerRequest } from "../codex.js";
import { calibratedScriptTargetWords, extractNarrationSections, scriptWordBounds } from "../production.js";
import { Gpti2ImageProvider } from "../providers/gpti2Image.js";
import { ShopAiKeyImageProvider } from "../providers/shopAiKeyImage.js";
import { optimizeShortScenes, packBeatsIntoScenes, rebalanceEditorialOverlays } from "../sceneTiming.js";
import { extractArtifactSectionNumbers } from "../artifactSections.js";
import { parseContinuityBundles } from "../visualBundles.js";
import { extractMarkdown, extractScriptMarkdown, parseBeatsOutput, parseRegeneration, parseTopicCandidates } from "./parsers.js";
import { normalizeQuizBeatMetadata } from "./normalizers.js";
import {
  isSequenceOutputFailure,
  validateBeatOutput,
  validateNarrationCoverage,
  validateQuizResearch,
  validateQuizScript,
  validateQuizTreatment,
  validateQuizVisualBible,
  validateResearch,
  validateScript,
  validateTreatment,
  validateVisualBible,
} from "./validators.js";
import type { ActiveRun, TaskManagerRuntime } from "./runtime.js";
import { retryQuizResearch, retryScript, retrySequenceScenes, retryVisualBible } from "./codexRetries.js";

export { retryQuizResearch, retryScript, retryVisualBible, retrySequenceScenes };

export async function run(this: TaskManagerRuntime, task: Task): Promise<void> {
  if (task.task_type === "GENERATE_PIPELINE") {
    await this.runPipelineTask(task);
    return;
  }
  if (task.task_type === "GENERATE_VIDEO") {
    await this.runVideoTask(task);
    return;
  }
  if (task.task_type === "GENERATE_BUNDLE_IMAGE") {
    const provider = this.imageConfig.provider ?? "gpti2";
    if (provider === "gpti2" && Gpti2ImageProvider.isConfigured(this.imageConfig.api_key)) {
      await this.runGpti2BundleImageTask(task);
      return;
    }
    if (provider === "shopaikey" && (this.imageConfig.api_key || ShopAiKeyImageProvider.isConfigured())) {
      await this.runShopAiKeyImageTask(task);
      return;
    }
    if (provider === "custom" && this.imageConfig.api_key) {
      await this.runShopAiKeyImageTask(task);
      return;
    }
    if (this.activeEngine === "antigravity") {
      await this.runAntigravityBundleImageTask(task);
      return;
    }
    if (ShopAiKeyImageProvider.isConfigured(this.imageConfig.api_key)) {
      await this.runShopAiKeyImageTask(task);
      return;
    }
  }
  const context = { profileId: task.channel_id, workerId: task.task_id, step: `run_task:${task.task_type}` };
  try {
    await this.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Preparing scoped context",
    });
    const topicHint = this.topicHints.get(task.task_id);
    const manifest = await this.contextEngine.build(
      task.task_type,
      task.channel_id,
      task.episode_id,
      this.findSceneNumber(task.task_id),
      this.imageVariants.get(task.task_id) ?? 0,
      topicHint,
    );
    const isAntigravity = this.activeEngine === "antigravity" && Boolean(this.antigravity);
    const client = isAntigravity ? this.antigravity! : this.codex;
    const engineName = isAntigravity ? "Antigravity" : "Codex";
    await this.update(task.task_id, { progress_message: `Connecting to ${engineName}` });
    await client.connect();
    const threadId = task.codex_thread_id ? await client.resumeThread(task.codex_thread_id) : await client.startThread();
    const completionPromise = new Promise<void>((resolve) => this.completionWaiters.set(task.task_id, resolve));
    const activeRecord: ActiveRun = {
      task: this.get(task.task_id),
      threadId,
      turnId: "",
      output: "",
      manifest,
      researchAttempts: 0,
      scriptAttempts: 0,
      visualBibleAttempts: 0,
      sequenceAttempts: 0,
    };
    this.active.set(task.task_id, activeRecord);
    const turnId = await client.startTurn(threadId, manifest.prompt);
    activeRecord.turnId = turnId;
    if (this.get(task.task_id).status === "RUNNING") {
      void this.update(task.task_id, { codex_thread_id: threadId, codex_turn_id: turnId, progress_message: "Generating" });
    }
    this.logger.step(`${engineName} turn started`, context);
    await completionPromise;
  } catch (error) {
    await this.finish(task.task_id, "FAILED", error instanceof Error ? error.message : "Task failed");
    this.logger.error(`${this.activeEngine === "antigravity" ? "Antigravity" : "Codex"} task failed`, context);
  }
}

export function handleNotification(this: TaskManagerRuntime, method: string, params: Record<string, unknown>): void {
  const threadId =
    typeof params.threadId === "string"
      ? params.threadId
      : typeof (params.turn as { threadId?: unknown } | undefined)?.threadId === "string"
        ? (params.turn as { threadId: string }).threadId
        : null;
  const turnId =
    typeof params.turnId === "string"
      ? params.turnId
      : typeof (params.turn as { id?: unknown } | undefined)?.id === "string"
        ? (params.turn as { id: string }).id
        : null;
  const active = [...this.active.values()].find(
    (run) => (threadId ? run.threadId === threadId : true) && (!run.turnId || !turnId || run.turnId === turnId),
  );
  if (!active) return;
  if (turnId && !active.turnId) active.turnId = turnId;
  if (method === "item/agentMessage/delta") {
    const delta =
      typeof params.delta === "string"
        ? params.delta
        : params.delta && typeof params.delta === "object"
          ? JSON.stringify(params.delta)
          : "";
    active.output += delta;
    void this.update(active.task.task_id, { progress_message: "Receiving output" });
  } else if (active.task.task_type === "GENERATE_BUNDLE_IMAGE" && /^item\/(?:image|file|media|attachment|output)/i.test(method)) {
    const media = JSON.stringify(params);
    if (/(?:data:image|b64_json|base64|\.(?:png|jpe?g|webp)\b)/i.test(media)) {
      active.output += media;
      void this.update(active.task.task_id, { progress_message: "Receiving image output" });
    }
  } else if (method === "turn/completed") {
    const turn = params.turn as { status?: string; error?: { message?: string } } | undefined;
    if (turn?.status === "failed") void this.finish(active.task.task_id, "FAILED", turn.error?.message ?? "Codex turn failed");
    else if (turn?.status === "interrupted") void this.finish(active.task.task_id, "CANCELLED", "Turn interrupted");
    else void this.completeWithOutput(active);
  } else if (method === "error") {
    const error = params.error as { message?: string } | undefined;
    void this.finish(active.task.task_id, "FAILED", error?.message ?? "Codex error");
  }
}

export function handleServerRequest(this: TaskManagerRuntime, request: CodexServerRequest): void {
  const threadId = typeof request.params.threadId === "string" ? request.params.threadId : null;
  const turnId = typeof request.params.turnId === "string" ? request.params.turnId : null;
  const active = [...this.active.values()].find((run) => run.threadId === threadId && (!turnId || run.turnId === turnId));
  if (!active) {
    this.codex.rejectRequest(request.id, "No active dashboard task owns this request");
    return;
  }
  this.approvalRequests.set(request.id, { taskId: active.task.task_id, request });
  void this.update(active.task.task_id, { status: "WAITING_APPROVAL", progress_message: "Waiting for approval" });
  const approval = {
    kind: request.method,
    reason: typeof request.params.reason === "string" ? request.params.reason : undefined,
    command: typeof request.params.command === "string" ? request.params.command : undefined,
    cwd: typeof request.params.cwd === "string" ? request.params.cwd : undefined,
  };
  this.emitEvent({ type: "approval.requested", task: this.get(active.task.task_id), request_id: request.id, approval });
}

export async function completeWithOutput(this: TaskManagerRuntime, active: ActiveRun): Promise<void> {
  try {
    const output = active.output.trim();
    const task = active.task;
    const channel = await this.repository.getChannel(task.channel_id);
    const isQuiz = channel.engine === "quiz";
    let outputFiles: string[] = [];
    if (task.task_type === "GENERATE_DNA") {
      await this.repository.saveChannelDna(task.channel_id, extractMarkdown(output, "# Channel DNA"));
      outputFiles = [`channels/${(await this.repository.getChannel(task.channel_id)).slug}/channel_dna.md`];
    } else if (task.task_type === "SUGGEST_TOPICS") {
      const topicHint = this.topicHints.get(task.task_id);
      const candidates = parseTopicCandidates(output, task.channel_id, topicHint);
      await this.repository.saveTopicRun(task.channel_id, candidates);
      outputFiles = [`channels/${(await this.repository.getChannel(task.channel_id)).slug}/topics/`];
    } else if (task.task_type === "GENERATE_RESEARCH") {
      const research = extractMarkdown(output, "# Research Dossier");
      const episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      if (isQuiz) validateQuizResearch(research, episode.quiz_config.question_count);
      else validateResearch(research);
      await this.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "research.md", research);
      await this.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "RESEARCH_READY");
      outputFiles = [(await this.repository.getEpisodeFile(task.channel_id, task.episode_id!, "research.md")).path];
    } else if (task.task_type === "GENERATE_TREATMENT") {
      const treatment = extractMarkdown(output, "# Treatment");
      const episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      if (isQuiz) validateQuizTreatment(treatment, episode.quiz_config.question_count);
      else validateTreatment(treatment);
      await this.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "treatment.md", treatment);
      await this.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "TREATMENT_READY");
      outputFiles = [(await this.repository.getEpisodeFile(task.channel_id, task.episode_id!, "treatment.md")).path];
    } else if (task.task_type === "GENERATE_SCRIPT") {
      const episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      const script = extractScriptMarkdown(output, episode.topic.title);
      if (isQuiz) validateQuizScript(script, episode.quiz_config.question_count);
      else validateScript(script, calibratedScriptTargetWords(episode, this.videoConfig.narration_words_per_second));
      await this.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "script.md", script);
      await this.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "SCRIPT_READY");
      outputFiles = [`${(await this.repository.getEpisodeFile(task.channel_id, task.episode_id!, "script.md")).path}`];
    } else if (task.task_type === "GENERATE_VISUAL_BIBLE") {
      const visualBible = extractMarkdown(output, "# Episode Visual Bible");
      const episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      const treatment = await this.repository.getEpisodeFile(task.channel_id, task.episode_id!, "treatment.md");
      const requiredSections = isQuiz
        ? Array.from({ length: episode.quiz_config.question_count }, (_, index) => index + 1)
        : extractArtifactSectionNumbers(treatment.content, "sequence");
      if (isQuiz) validateQuizVisualBible(visualBible, requiredSections);
      else validateVisualBible(visualBible, requiredSections);
      await this.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md", visualBible);
      await this.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "VISUAL_BIBLE_READY");
      outputFiles = [(await this.repository.getEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md")).path];
    } else if (task.task_type === "GENERATE_BUNDLE_IMAGE") {
      if (!this.imageConfig.enabled) throw new Error("Image generation is disabled in Settings");
      const bundleNumber = this.findSceneNumber(task.task_id);
      if (!bundleNumber) throw new Error("Bundle number is required");
      const episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      const imageTarget = {
        channelId: task.channel_id,
        episodeId: task.episode_id!,
        bundleNumber,
        variant: this.imageVariants.get(task.task_id) ?? 0,
        theme: episode.quiz_config?.visual_theme,
      };
      const visualBible = await this.repository.getEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md").catch(() => null);
      let promptToUse = active.manifest.prompt;
      if (visualBible?.content) {
        const bundles = parseContinuityBundles(visualBible.content);
        const bundle = bundles.find((b) => b.bundle_number === bundleNumber);
        if (bundle?.anchor_prompt) {
          promptToUse = bundle.anchor_prompt;
        }
      }
      const { image } = await this.generateBundleImageWithSafetyRetry(
        task,
        imageTarget,
        promptToUse,
        undefined,
        output,
        visualBible?.content,
      );
      const bundleId = `CB-${String(bundleNumber).padStart(2, "0")}`;
      await this.repository.attachBundleReference(task.channel_id, task.episode_id!, bundleId, image.asset_path);
      outputFiles = [image.asset_path];
    } else if (task.task_type === "GENERATE_SEQUENCE_SCENES") {
      const sequenceNumber = this.findSceneNumber(task.task_id);
      if (!sequenceNumber) throw new Error("Sequence number is required");
      const parsedBeats = parseBeatsOutput(output);
      const beats = isQuiz
        ? normalizeQuizBeatMetadata(parsedBeats)
        : parsedBeats.map((beat) => {
            if (beat.source_ids.length === 0 && beat.asset_type !== "transition") {
              return { ...beat, source_ids: [`C${String(sequenceNumber).padStart(2, "0")}`] };
            }
            return beat;
          });
      validateBeatOutput(beats, 1, isQuiz);
      const episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      const script = await this.repository.getEpisodeFile(task.channel_id, task.episode_id!, "script.md");
      const scriptSections = extractNarrationSections(script.content);
      const section = scriptSections[sequenceNumber - 1];
      if (!section) throw new Error(`Script sequence ${sequenceNumber} was not found`);
      validateNarrationCoverage(section.text, beats, 0.975);
      const scenes = optimizeShortScenes(
        packBeatsIntoScenes(
          beats,
          this.videoConfig.max_scene_duration_seconds,
          episode.measured_narration_words_per_second ?? this.videoConfig.narration_words_per_second,
          task.episode_id!,
        ),
        this.videoConfig.max_scene_duration_seconds,
        task.episode_id!,
      );
      await this.repository.saveSequenceDraft(task.episode_id!, sequenceNumber, scenes);
      outputFiles = [`.documentary-studio/shot-drafts/${task.episode_id}/sequence-${String(sequenceNumber).padStart(2, "0")}.json`];
      if (!this.assemblingEpisodes.has(task.episode_id!)) {
        const drafts = await this.repository.readSequenceDrafts(task.episode_id!);
        if (drafts.length === scriptSections.length && !this.assemblingEpisodes.has(task.episode_id!)) {
          this.assemblingEpisodes.add(task.episode_id!);
          try {
            if (await this.repository.commitSequenceDrafts(task.channel_id, task.episode_id!, scriptSections.length)) {
              const channel = await this.repository.getChannel(task.channel_id);
              outputFiles = [`channels/${channel.slug}/episodes/${episode.slug}/scene_plan.md`];
            }
          } finally {
            this.assemblingEpisodes.delete(task.episode_id!);
          }
        }
      }
    } else if (task.task_type === "GENERATE_SCENES") {
      const parsedBeats = parseBeatsOutput(output);
      const beats = isQuiz
        ? normalizeQuizBeatMetadata(parsedBeats)
        : parsedBeats.map((beat, idx) => {
            if (beat.source_ids.length === 0 && beat.asset_type !== "transition") {
              const seqMatch = beat.sequence_id.match(/\d+/);
              const seqNum = seqMatch ? Number(seqMatch[0]) : idx + 1;
              return { ...beat, source_ids: [`C${String(seqNum).padStart(2, "0")}`] };
            }
            return beat;
          });
      validateBeatOutput(beats, 5, isQuiz);
      const episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      const script = await this.repository.getEpisodeFile(task.channel_id, task.episode_id!, "script.md");
      validateNarrationCoverage(script.content, beats, 0.975);
      const scenes = optimizeShortScenes(
        packBeatsIntoScenes(
          beats,
          this.videoConfig.max_scene_duration_seconds,
          episode.measured_narration_words_per_second ?? this.videoConfig.narration_words_per_second,
          task.episode_id!,
        ),
        this.videoConfig.max_scene_duration_seconds,
        task.episode_id!,
      );
      await this.repository.saveScenes(task.channel_id, task.episode_id!, scenes);
      const persistedEpisode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      const channel = await this.repository.getChannel(task.channel_id);
      outputFiles = [
        `channels/${channel.slug}/episodes/${persistedEpisode.slug}/scene_plan.md`,
        `channels/${channel.slug}/episodes/${persistedEpisode.slug}/dialogue_script.md`,
        `channels/${channel.slug}/episodes/${persistedEpisode.slug}/video_prompts.md`,
      ];
    } else {
      const scenes = await this.repository.readScenes(task.channel_id, task.episode_id!);
      const targetNumber = this.findSceneNumber(task.task_id);
      const current = scenes.find((scene) => scene.scene_number === targetNumber);
      if (!current) throw new Error("Regeneration target scene not found");
      const parsed = parseRegeneration(output);
      const next = scenes.map((scene) => (scene.scene_number === targetNumber ? { ...scene, ...parsed } : scene));
      await this.repository.backupEpisodeFile(task.channel_id, task.episode_id!, "scene_plan.md");
      await this.repository.saveScenes(task.channel_id, task.episode_id!, next);
      const episode = await this.repository.getEpisode(task.channel_id, task.episode_id!);
      const channel = await this.repository.getChannel(task.channel_id);
      outputFiles = [`channels/${channel.slug}/episodes/${episode.slug}/scene_plan.md`];
    }
    await this.finish(task.task_id, "COMPLETED", null, outputFiles);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not persist Codex output";
    if (
      active.task.task_type === "GENERATE_RESEARCH" &&
      active.researchAttempts < 1 &&
      message.startsWith("Quiz research quality gate failed")
    ) {
      try {
        await this.retryQuizResearch(active, message);
        return;
      } catch (retryError) {
        await this.finish(active.task.task_id, "FAILED", retryError instanceof Error ? retryError.message : message);
        return;
      }
    }
    if (
      active.task.task_type === "GENERATE_SCRIPT" &&
      active.scriptAttempts < 1 &&
      (message.startsWith("Script quality gate failed") || message.startsWith("Quiz script quality gate failed"))
    ) {
      try {
        await this.retryScript(active, message);
        return;
      } catch (retryError) {
        await this.finish(active.task.task_id, "FAILED", retryError instanceof Error ? retryError.message : message);
        return;
      }
    }
    if (
      active.task.task_type === "GENERATE_VISUAL_BIBLE" &&
      active.visualBibleAttempts < 1 &&
      (message.startsWith("Visual bible quality gate failed") || message.startsWith("Quiz visual bible quality gate failed"))
    ) {
      try {
        await this.retryVisualBible(active, message);
        return;
      } catch (retryError) {
        await this.finish(active.task.task_id, "FAILED", retryError instanceof Error ? retryError.message : message);
        return;
      }
    }
    if (active.task.task_type === "GENERATE_SEQUENCE_SCENES" && active.sequenceAttempts < 2 && isSequenceOutputFailure(message)) {
      try {
        await this.retrySequenceScenes(active, message);
        return;
      } catch (retryError) {
        await this.finish(active.task.task_id, "FAILED", retryError instanceof Error ? retryError.message : message);
        return;
      }
    }
    await this.finish(active.task.task_id, "FAILED", message);
  }
}
