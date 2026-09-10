import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  ALL_QUIZ_IMAGE_STYLES,
  EpisodeSchema,
  QUIZ_MIN_QUESTION_COUNT,
  QuizPaletteIdSchema,
  TopicAvailabilityBatchSchema,
  TopicCandidateSchema,
  TopicConfirmInputSchema,
  TopicRunCandidateSchema,
  TopicRunResultSchema,
  TopicRunSchema,
  hashBankQuestionSource,
  makeId,
  nowIso,
  type BankQuestionWithCooldown,
  type Episode,
  type EpisodeSettingsInput,
  type QuizImageStyle,
  type TopicAvailability,
  type TopicAvailabilityBatch,
  type TopicCandidate,
  type TopicRunResult,
  type TopicSourceBinding,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { scanBankInventory } from "../quiz/bank/bankInventory.js";
import { evaluateEpisodeQuestionEligibility, evaluateShortReelQuestionEligibility } from "../quiz/bank/bankEligibility.js";
import { resolveBoundTopicSources, type ResolvedBoundTopicSources } from "../quiz/bank/bridge/boundSourceResolver.js";
import {
  saveTopicConfirmationReceipt,
  computeConfirmationOptionsFingerprint,
  type TopicConfirmationOptions,
} from "./topicConfirmationReceipts.js";
import { normalizeTargetLanguage } from "../quiz/bank/localization/productLocalization.js";
import type { RepositoryService } from "./service.js";
import {
  DEFAULT_NARRATION_WORDS_PER_SECOND,
  estimateQuizTargetDurationMinutes,
  estimateQuizTargetWordCount,
  type TopicRun,
} from "./helpers.js";
import type { RepositoryRuntime } from "./runtime.js";
import { projectTopicSelected } from "./topicSelectionProjection.js";

export async function listTopics(this: RepositoryRuntime, channelId: string): Promise<TopicCandidate[]> {
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "topics");
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });

  const runs: TopicRun[] = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
    try {
      const run = JSON.parse(await readFile(path.join(directory, entry.name), "utf8")) as TopicRun;
      if (run && Array.isArray(run.candidates)) {
        runs.push(run);
      }
    } catch {
      // Preserve forward compatibility with partially written topic runs.
    }
  }

  // Sort runs newest first
  runs.sort((a, b) => (b.generated_at || "").localeCompare(a.generated_at || ""));

  const seenTopicIds = new Set<string>();
  const all: TopicCandidate[] = [];

  for (const run of runs) {
    for (const candidate of run.candidates) {
      const runCandidateParsed = TopicRunCandidateSchema.safeParse(candidate);
      const parsed = runCandidateParsed.success ? runCandidateParsed.data : TopicCandidateSchema.safeParse(candidate).data;
      if (parsed) {
        if (!seenTopicIds.has(parsed.topic_id)) {
          seenTopicIds.add(parsed.topic_id);
          all.push({
            ...parsed,
            ...(run.run_id && !parsed.run_id ? { run_id: run.run_id } : {}),
          });
        }
      }
    }
  }
  return all.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}

export async function getLatestTopicRun(
  this: RepositoryRuntime | void,
  repositoryOrChannelId: RepositoryService | RepositoryRuntime | string,
  channelIdParam?: string,
): Promise<TopicRun | null> {
  const repo = (typeof repositoryOrChannelId === "string" ? this : repositoryOrChannelId) as RepositoryRuntime;
  const channelId = typeof repositoryOrChannelId === "string" ? repositoryOrChannelId : channelIdParam!;
  const channel = await repo.getChannel(channelId);
  const directory = repo.resolvePath("channels", channel.slug, "topics");

  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  const jsonFiles = entries.filter((item) => item.isFile() && item.name.endsWith(".json"));
  if (jsonFiles.length === 0) return null;

  // Gather file metadata to determine chronological order
  const filesWithMeta = await Promise.all(
    jsonFiles.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      const fileStat = await stat(filePath).catch(() => null);
      const match = entry.name.match(/(?:suggestion|topic-run|run)-(\d+)/);
      const filenameTimestamp = match ? Number(match[1]) : 0;
      const mtimeMs = fileStat?.mtimeMs ?? 0;
      const effectiveDiskTime = filenameTimestamp > 0 ? filenameTimestamp : mtimeMs;
      return { entry, filePath, effectiveDiskTime };
    }),
  );

  // Sort files newest first by disk time
  filesWithMeta.sort((a, b) => b.effectiveDiskTime - a.effectiveDiskTime);

  // The latest file on disk is the authoritative latest run
  const latestFile = filesWithMeta[0];
  let content: string;
  try {
    content = await readFile(latestFile.filePath, "utf8");
  } catch (error) {
    throw new RepositoryError(
      `TOPIC_RUN_CORRUPTED: Failed to read latest topic run file "${latestFile.entry.name}".`,
      "TOPIC_RUN_CORRUPTED",
      { cause: error },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new RepositoryError(
      `TOPIC_RUN_CORRUPTED: Latest topic run file "${latestFile.entry.name}" contains invalid JSON.`,
      "TOPIC_RUN_CORRUPTED",
      { cause: error },
    );
  }

  const validated = TopicRunSchema.safeParse(parsed);
  if (validated.success) {
    return validated.data;
  }

  // Handle legacy run format if it has run_id and candidates array
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "run_id" in parsed &&
    typeof parsed.run_id === "string" &&
    "candidates" in parsed &&
    Array.isArray(parsed.candidates)
  ) {
    const legacy = parsed as {
      run_id: string;
      generated_at?: string;
      target_episode_count?: number;
      target_short_reel_count?: number;
      candidates: unknown[];
      shortages?: unknown[];
    };
    return {
      run_id: legacy.run_id,
      generated_at: legacy.generated_at || nowIso(),
      target_episode_count: legacy.target_episode_count ?? 3,
      target_short_reel_count: legacy.target_short_reel_count ?? 2,
      candidates: legacy.candidates as TopicRun["candidates"],
      shortages: (legacy.shortages as TopicRun["shortages"]) || [],
    };
  }

  throw new RepositoryError(
    `TOPIC_RUN_CORRUPTED: Latest topic run file "${latestFile.entry.name}" failed schema validation.`,
    "TOPIC_RUN_CORRUPTED",
  );
}

export async function saveTopicRun(
  this: RepositoryRuntime,
  channelId: string,
  candidatesOrRun: TopicCandidate[] | TopicRunResult,
): Promise<void> {
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "topics");
  await mkdir(directory, { recursive: true });

  const isRunResult =
    !Array.isArray(candidatesOrRun) && typeof candidatesOrRun === "object" && candidatesOrRun !== null && "candidates" in candidatesOrRun;

  if (isRunResult) {
    // Strictly validate new TopicRunResult; reject malformed new runs without fallback
    const validatedRun = TopicRunResultSchema.parse(candidatesOrRun);
    const runId = validatedRun.run_id;
    const run: TopicRun = {
      run_id: runId,
      generated_at: nowIso(),
      target_episode_count: validatedRun.target_episode_count,
      target_short_reel_count: validatedRun.target_short_reel_count,
      candidates: validatedRun.candidates.map((candidate) => ({
        ...candidate,
        run_id: runId,
      })),
      shortages: validatedRun.shortages,
    };
    await this.writeJsonAtomic(path.join(directory, `suggestion-${Date.now()}-${runId}.json`), run);
    return;
  }

  // Legacy candidate array input
  const runId = makeId("run");
  const run: TopicRun = {
    run_id: runId,
    generated_at: nowIso(),
    target_episode_count: 3,
    target_short_reel_count: 2,
    candidates: candidatesOrRun.map((candidate) => {
      const runCand = TopicRunCandidateSchema.safeParse(candidate);
      if (runCand.success && runCand.data.source_bindings && runCand.data.source_bindings.length > 0) {
        return { ...runCand.data, run_id: runId };
      }
      const parsed = TopicCandidateSchema.parse(candidate);
      const explicitSlotId = (candidate as { slot_id?: string }).slot_id;
      const existingBindings =
        (runCand.success && runCand.data.source_bindings && runCand.data.source_bindings.length > 0
          ? runCand.data.source_bindings
          : undefined) ?? (parsed.source_bindings && parsed.source_bindings.length > 0 ? parsed.source_bindings : undefined);

      return {
        ...parsed,
        run_id: runId,
        ...(explicitSlotId ? { slot_id: explicitSlotId } : {}),
        ...(existingBindings && existingBindings.length > 0 ? { source_bindings: existingBindings } : {}),
      };
    }),
    shortages: [],
  };
  await this.writeJsonAtomic(path.join(directory, `suggestion-${Date.now()}-${runId}.json`), run);
}

function assertConfirmableCandidate(candidate: TopicCandidate): void {
  if (!candidate.source_bindings || candidate.source_bindings.length === 0) {
    if (
      candidate.archetype ||
      (candidate as { slot_id?: string }).slot_id ||
      candidate.suggested_layout ||
      candidate.topic_id.toLowerCase().includes("unbound") ||
      candidate.topic_id.toLowerCase().includes("legacy")
    ) {
      throw new RepositoryError(
        "UNBOUND_LEGACY_TOPIC: Cannot confirm unbound legacy topic candidate. Re-suggest topics to bind canonical sources.",
        "UNBOUND_LEGACY_TOPIC",
      );
    }
  }
}

function resolveCandidateStyles(
  requested?: QuizImageStyle | "mixed",
  candidateStyle?: QuizImageStyle | "mixed",
  channelStyles?: QuizImageStyle[],
): { requestedStyle: QuizImageStyle | "mixed"; resolvedStyle: QuizImageStyle } {
  const req = requested ?? candidateStyle ?? "mixed";
  const availableStyles = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;
  const resolved: QuizImageStyle =
    req === "mixed" ? availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d" : req;
  return { requestedStyle: req, resolvedStyle: resolved };
}

export async function confirmTopic(
  this: RepositoryRuntime,
  channelId: string,
  topicId: string,
  questionCount?: number,
  visualStyle?: QuizImageStyle | "mixed",
): Promise<Episode> {
  const channel = await this.getChannel(channelId);
  const candidate = (await this.listTopics(channelId)).find((topic) => topic.topic_id === topicId);
  if (!candidate) throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  if (candidate.content_kind === "short_reel") {
    throw new RepositoryError("Cannot confirm Short-Reel topic candidate as Episode", "INVALID_TOPIC_KIND");
  }

  assertConfirmableCandidate(candidate);

  const parsedConfirm = TopicConfirmInputSchema.parse({
    topic_id: topicId,
    question_count: questionCount,
    visual_style: visualStyle,
  });
  const selectedQuestionCount = parsedConfirm.question_count ?? candidate.question_count;

  // Authoritatively resolve and validate bound sources against Question Bank when bindings are present
  let boundResult: Partial<ResolvedBoundTopicSources> | undefined;
  if (candidate.source_bindings && candidate.source_bindings.length > 0) {
    boundResult = await resolveBoundTopicSources({
      repository: this as unknown as RepositoryService,
      channelId,
      topicId,
      requestedQuestionCount: selectedQuestionCount,
    });
  }

  const { requestedStyle, resolvedStyle } = resolveCandidateStyles(
    parsedConfirm.visual_style,
    candidate.visual_style,
    channel.selected_styles,
  );
  const targetDurationMinutes = estimateQuizTargetDurationMinutes(selectedQuestionCount);
  const targetWordCount = estimateQuizTargetWordCount(targetDurationMinutes, DEFAULT_NARRATION_WORDS_PER_SECOND);
  await this.markTopicSelected(channelId, topicId, selectedQuestionCount);
  const episodeSlug = await this.uniqueSlug(candidate.title, this.resolvePath("channels", channel.slug, "episodes"));
  const episodeId = makeId("ep");
  const timestamp = nowIso();
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episodeSlug);
  await mkdir(path.join(episodeDirectory, "assets"), { recursive: true });

  // Persist source bindings for the confirmed episode
  if (boundResult?.questions && boundResult.questions.length > 0 && boundResult.sourceContentHashes) {
    const hashes = boundResult.sourceContentHashes;
    const recordedBindings = boundResult.questions.map((q, idx) => ({
      source_question_id: q.id,
      source_content_hash: hashes[idx],
      choice_ids: q.choices.map((c) => c.id),
      correct_choice_id: q.correct_choice_id,
    }));
    await this.writeTextAtomic(
      path.join(episodeDirectory, "sources.md"),
      `# Source Questions\n\n\`\`\`json\n${JSON.stringify(recordedBindings, null, 2)}\n\`\`\`\n`,
    );
  }
  const episode = EpisodeSchema.parse({
    episode_id: episodeId,
    channel_id: channelId,
    slug: episodeSlug,
    topic: { title: candidate.title, premise: candidate.premise, hook: candidate.hook },
    stage: "SELECTED",
    script_path: `channels/${channel.slug}/episodes/${episodeSlug}/script.md`,
    research_path: `channels/${channel.slug}/episodes/${episodeSlug}/research.md`,
    treatment_path: `channels/${channel.slug}/episodes/${episodeSlug}/treatment.md`,
    visual_bible_path: `channels/${channel.slug}/episodes/${episodeSlug}/visual_bible.md`,
    scene_plan_path: `channels/${channel.slug}/episodes/${episodeSlug}/scene_plan.md`,
    dialogue_script_path: `channels/${channel.slug}/episodes/${episodeSlug}/dialogue_script.md`,
    video_prompts_path: `channels/${channel.slug}/episodes/${episodeSlug}/video_prompts.md`,
    target_duration_minutes: targetDurationMinutes,
    target_word_count: targetWordCount,
    quiz_config: {
      question_count: selectedQuestionCount,
      quiz_format: candidate.quiz_format,
      age_band: candidate.age_band,
      answer_mode: "voice_and_reveal",
      visual_theme: candidate.quiz_format === "image_guess" ? "jungle_jamboree" : "candy_pop",
      visual_style: requestedStyle,
      resolved_visual_style: resolvedStyle,
      thinking_bar_style: channel.default_thinking_bar_style ?? "auto",
      question_counter_style: channel.default_counter_style ?? "auto",
      question_box_style: channel.default_question_box_style ?? "auto",
      answer_card_style: channel.default_answer_card_style ?? "auto",
      background_style: channel.default_background_style ?? "auto",
      palette_id: channelPalette.success ? channelPalette.data : "auto",
      style_preset_id: "auto",
      channel_brand_name: "",
      render_aspect_ratio: "16:9",
      archetype: candidate.archetype,
      target_layout: candidate.suggested_layout,
    },
    created_at: timestamp,
    updated_at: timestamp,
  });
  await this.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  this.entityIdResolver.setEpisodeSlug(channelId, episode.episode_id, episode.slug);
  this.entityIdResolver.setEpisodeTitle(episode.episode_id, episode.topic?.title || "");
  this.channelCache.incrementEpisodeCount(channelId);
  await this.writeTextAtomic(
    path.join(episodeDirectory, "brief.md"),
    `# ${candidate.title}\n\n## Premise\n\n${candidate.premise}\n\n## Hook\n\n${candidate.hook}\n`,
  );
  await Promise.all([
    this.writeTextAtomic(path.join(episodeDirectory, "research.md"), "# Research Dossier\n\nResearch has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "treatment.md"), "# Treatment\n\nTreatment has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "script.md"), "# Script\n\nScript generation has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "visual_bible.md"), "# Episode Visual Bible\n\nVisual development has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "scene_plan.md"), "# Scene Plan\n\nScene breakdown has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "dialogue_script.md"), "# Dialogue Script\n\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "video_prompts.md"), "# Video Prompts\n\n"),
  ]);
  await this.writeJsonAtomic(
    path.join(this.resolvePath("channels", channel.slug), "topic_database.json"),
    (await this.listTopics(channelId)).map(({ title, premise }) => ({ title, premise })),
  );
  await this.updateChannel(channelId, { updated_at: timestamp });
  const effectiveTargetLang = normalizeTargetLanguage(channel.language ?? "en");
  const confirmOptions: TopicConfirmationOptions = {
    question_count: selectedQuestionCount,
    visual_style: requestedStyle,
    target_language: effectiveTargetLang,
  };
  await saveTopicConfirmationReceipt(this as unknown as RepositoryService, channelId, {
    receipt_id: `rec-${episode.episode_id}`,
    channel_id: channelId,
    topic_id: topicId,
    content_kind: "episode",
    product_id: episode.episode_id,
    product_slug: episode.slug,
    status: "completed",
    confirmed_at: timestamp,
    request_id: makeId("req"),
    options_fingerprint: computeConfirmationOptionsFingerprint(confirmOptions),
    options: confirmOptions,
    source_question_ids: boundResult?.questions?.map((q) => q.id) ?? [],
    source_content_hashes: boundResult?.sourceContentHashes ?? [],
  });
  return episode;
}

function resolveNextResolvedStyle(
  inputStyle?: QuizImageStyle | "mixed",
  inputResolved?: QuizImageStyle,
  currentResolved?: QuizImageStyle,
  channelStyles?: QuizImageStyle[],
): QuizImageStyle {
  if (inputStyle !== undefined) {
    if (inputStyle === "mixed") {
      const availableStyles = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;
      return availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d";
    }
    return inputStyle;
  }
  if (inputResolved !== undefined) {
    return inputResolved;
  }
  return currentResolved ?? "pixar_3d";
}

function hasQuizSourceSettingsChanged(next: Episode["quiz_config"], prev: Episode["quiz_config"]): boolean {
  return (
    next.question_count !== prev.question_count ||
    next.quiz_format !== prev.quiz_format ||
    next.age_band !== prev.age_band ||
    next.visual_style !== prev.visual_style ||
    next.resolved_visual_style !== prev.resolved_visual_style
  );
}

function hasRenderStyleSettingsChanged(next: Episode["quiz_config"], prev: Episode["quiz_config"]): boolean {
  return (
    next.visual_theme !== prev.visual_theme ||
    next.thinking_bar_style !== prev.thinking_bar_style ||
    next.question_counter_style !== prev.question_counter_style ||
    next.question_box_style !== prev.question_box_style ||
    next.answer_card_style !== prev.answer_card_style ||
    next.background_style !== prev.background_style ||
    next.palette_id !== prev.palette_id ||
    next.style_preset_id !== prev.style_preset_id ||
    next.render_aspect_ratio !== prev.render_aspect_ratio
  );
}

export async function updateEpisodeSettings(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  input: EpisodeSettingsInput,
  wordsPerSecond: number,
): Promise<Episode> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const nextResolvedStyle = resolveNextResolvedStyle(
    input.visual_style,
    input.resolved_visual_style,
    episode.quiz_config.resolved_visual_style,
    channel.selected_styles,
  );
  const nextStyle = input.visual_style ?? episode.quiz_config.visual_style ?? "mixed";
  const nextQuizConfig = {
    ...episode.quiz_config,
    ...(input.question_count === undefined ? {} : { question_count: input.question_count }),
    ...(input.quiz_format === undefined ? {} : { quiz_format: input.quiz_format }),
    ...(input.age_band === undefined ? {} : { age_band: input.age_band }),
    ...(input.answer_mode === undefined ? {} : { answer_mode: input.answer_mode }),
    ...(input.visual_theme === undefined ? {} : { visual_theme: input.visual_theme }),
    ...(input.thinking_bar_style === undefined ? {} : { thinking_bar_style: input.thinking_bar_style }),
    ...(input.question_counter_style === undefined ? {} : { question_counter_style: input.question_counter_style }),
    ...(input.question_box_style === undefined ? {} : { question_box_style: input.question_box_style }),
    ...(input.answer_card_style === undefined ? {} : { answer_card_style: input.answer_card_style }),
    ...(input.background_style === undefined ? {} : { background_style: input.background_style }),
    ...(input.palette_id === undefined ? {} : { palette_id: input.palette_id }),
    ...(input.style_preset_id === undefined ? {} : { style_preset_id: input.style_preset_id }),
    ...(input.channel_brand_name === undefined ? {} : { channel_brand_name: input.channel_brand_name }),
    ...(input.render_aspect_ratio === undefined ? {} : { render_aspect_ratio: input.render_aspect_ratio }),
    ...(input.thumbnail_aspect_ratio === undefined ? {} : { thumbnail_aspect_ratio: input.thumbnail_aspect_ratio }),
    ...(input.intro_outro_style_id === undefined ? {} : { intro_outro_style_id: input.intro_outro_style_id }),
    visual_style: nextStyle,
    resolved_visual_style: nextResolvedStyle,
  };
  const quizSourceSettingsChanged = hasQuizSourceSettingsChanged(nextQuizConfig, episode.quiz_config);
  const renderStyleSettingsChanged = hasRenderStyleSettingsChanged(nextQuizConfig, episode.quiz_config);
  if (renderStyleSettingsChanged) {
    // A manual style choice opts the episode into the current catalog. The
    // previous pinned revision may not contain an imported style ID.
    nextQuizConfig.style_catalog_revision = undefined;
  }
  const targetDurationMinutes = input.target_duration_minutes ?? estimateQuizTargetDurationMinutes(nextQuizConfig.question_count);
  const targetWordCount = estimateQuizTargetWordCount(targetDurationMinutes, episode.measured_narration_words_per_second ?? wordsPerSecond);
  const next = EpisodeSchema.parse({
    ...episode,
    target_duration_minutes: targetDurationMinutes,
    target_word_count: targetWordCount,
    quiz_config: nextQuizConfig,
    updated_at: nowIso(),
  });
  await this.writeJsonAtomic(this.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  this.entityIdResolver.setEpisodeSlug(channelId, next.episode_id, next.slug);
  if (quizSourceSettingsChanged) {
    await this.invalidateQuizSourceArtifacts(channelId, episodeId);
  } else if (renderStyleSettingsChanged) {
    await this.invalidateQuizArtifacts(channelId, episodeId, ["style", "qa"]);
  }
  return next;
}

export async function markTopicSelected(this: RepositoryRuntime, channelId: string, topicId: string, questionCount: number): Promise<void> {
  return projectTopicSelected(this, channelId, topicId, questionCount);
}

export type TopicAvailabilityBatchOptions = {
  overrides?: Record<string, { question_count?: number }>;
};

export async function getTopicAvailabilityBatch(
  this: RepositoryRuntime | void,
  repositoryOrChannelId: RepositoryService | RepositoryRuntime | string,
  channelIdOrOptions?: string | TopicAvailabilityBatchOptions,
  optionsParam?: TopicAvailabilityBatchOptions,
): Promise<TopicAvailabilityBatch> {
  let repo: RepositoryRuntime;
  let channelId: string;
  let options: TopicAvailabilityBatchOptions | undefined;

  if (typeof repositoryOrChannelId === "string") {
    repo = this as RepositoryRuntime;
    channelId = repositoryOrChannelId;
    options = channelIdOrOptions as TopicAvailabilityBatchOptions | undefined;
  } else {
    repo = repositoryOrChannelId;
    channelId = channelIdOrOptions as string;
    options = optionsParam;
  }

  await repo.getChannel(channelId);
  const candidates = await repo.listTopics(channelId);

  let scan;
  try {
    scan = await scanBankInventory(repo, { channelId, targetLanguage: "en" });
  } catch {
    scan = {
      scan_status: "unavailable" as const,
      checked_at: nowIso(),
      snapshot_token: "unavailable",
      error_code: "BANK_READ_FAILED" as const,
    };
  }

  // Derive question map directly from the single authoritative inventory snapshot
  const questionMap = new Map<string, BankQuestionWithCooldown>();
  if (scan.scanned_questions) {
    for (const q of scan.scanned_questions) {
      questionMap.set(q.id, q);
    }
  }

  const topicsAvailability: TopicAvailability[] = candidates.map((candidate) => {
    const isShortReel = candidate.content_kind === "short_reel";
    const contentKind = isShortReel ? ("short_reel" as const) : ("episode" as const);
    const baseTopic = {
      topic_id: candidate.topic_id,
      content_kind: contentKind,
    };

    if (scan.scan_status === "unavailable") {
      return {
        ...baseTopic,
        can_confirm: false,
        reason_code: "UNAVAILABLE_SCAN" as const,
        retryable: true,
        recovery_action: "Bank inventory is currently unavailable. Try again later.",
        source_capacity: 0,
      };
    }

    if (scan.scan_status === "incomplete") {
      return {
        ...baseTopic,
        can_confirm: false,
        reason_code: "INCOMPLETE_SCAN" as const,
        retryable: true,
        recovery_action: "Bank inventory scan was incomplete. Re-scan or retry.",
        source_capacity: 0,
      };
    }

    const bindings = (candidate as { source_bindings?: TopicSourceBinding[] }).source_bindings;
    if (!bindings || bindings.length === 0) {
      return {
        ...baseTopic,
        can_confirm: false,
        reason_code: "UNBOUND_LEGACY_TOPIC" as const,
        retryable: true,
        recovery_action: "Re-suggest topics to bind canonical sources.",
        source_capacity: 0,
      };
    }

    let sourceCapacity = 0;
    let hasModified = false;
    let hasCooldown = false;

    // Evaluate contiguous allocated prefix starting from index 0
    for (const binding of bindings) {
      const q = questionMap.get(binding.source_question_id);
      if (!q) {
        hasModified = true;
        break;
      }
      const currentHash = hashBankQuestionSource(q);
      if (currentHash !== binding.source_content_hash) {
        hasModified = true;
        break;
      }

      const evalResult =
        candidate.content_kind === "short_reel"
          ? evaluateShortReelQuestionEligibility(q, {
              targetArchetype: candidate.archetype,
            })
          : evaluateEpisodeQuestionEligibility(q, {
              targetLanguage: "en",
              expectedFormat: candidate.quiz_format,
              targetArchetype: candidate.archetype,
            });

      if (!evalResult.eligible) {
        if (q.channel_cooldown?.is_cooldown || evalResult.reason === "IN_COOLDOWN") {
          hasCooldown = true;
        }
        break;
      }
      sourceCapacity += 1;
    }

    if (hasModified) {
      return {
        ...baseTopic,
        can_confirm: false,
        reason_code: "SOURCE_CHANGED" as const,
        retryable: true,
        recovery_action: "Re-suggest topics to synchronize canonical content.",
        source_capacity: 0,
      };
    }

    const overrideCount = options?.overrides?.[candidate.topic_id]?.question_count;
    const requiredCount = isShortReel
      ? 1
      : (overrideCount ?? candidate.question_count ?? candidate.source_bindings?.length ?? QUIZ_MIN_QUESTION_COUNT);

    if (sourceCapacity >= requiredCount) {
      return {
        ...baseTopic,
        can_confirm: true,
        reason_code: "AVAILABLE" as const,
        retryable: false,
        recovery_action: "Ready to confirm.",
        source_capacity: sourceCapacity,
      };
    }

    return {
      ...baseTopic,
      can_confirm: false,
      reason_code: "NO_ELIGIBLE_SOURCES" as const,
      retryable: true,
      recovery_action: hasCooldown
        ? "Sources are currently in cooldown. Wait for cooldown expiry or re-suggest topics."
        : "Re-suggest topics to allocate fresh sources.",
      source_capacity: sourceCapacity,
    };
  });

  return TopicAvailabilityBatchSchema.parse({
    scan_status: scan.scan_status,
    checked_at: scan.checked_at || nowIso(),
    snapshot_token: scan.snapshot_token,
    topics: topicsAvailability,
    ...(scan.error_code ? { error_code: scan.error_code } : {}),
  });
}
