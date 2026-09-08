import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  ALL_QUIZ_IMAGE_STYLES,
  EpisodeSchema,
  QuizPaletteIdSchema,
  TopicAvailabilityBatchSchema,
  TopicCandidateSchema,
  TopicConfirmInputSchema,
  TopicRunCandidateSchema,
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
  const all: TopicCandidate[] = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
    try {
      const run = JSON.parse(await readFile(path.join(directory, entry.name), "utf8")) as TopicRun;
      if (Array.isArray(run?.candidates)) {
        for (const candidate of run.candidates) {
          const runCandidateParsed = TopicRunCandidateSchema.safeParse(candidate);
          if (runCandidateParsed.success) {
            all.push(runCandidateParsed.data);
          } else {
            const legacyParsed = TopicCandidateSchema.safeParse(candidate);
            if (legacyParsed.success) {
              all.push(legacyParsed.data);
            }
          }
        }
      }
    } catch {
      // Preserve forward compatibility with partially written topic runs.
    }
  }
  return all.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}

export async function saveTopicRun(
  this: RepositoryRuntime,
  channelId: string,
  candidatesOrRun: TopicCandidate[] | TopicRunResult,
): Promise<void> {
  const channel = await this.getChannel(channelId);
  const isRunResult =
    !Array.isArray(candidatesOrRun) && typeof candidatesOrRun === "object" && candidatesOrRun !== null && "candidates" in candidatesOrRun;

  const candidates = isRunResult ? candidatesOrRun.candidates : candidatesOrRun;
  const shortages = isRunResult ? candidatesOrRun.shortages : [];
  const runId = isRunResult ? candidatesOrRun.run_id : makeId("run");
  const targetEpisodeCount = isRunResult ? (candidatesOrRun.target_episode_count ?? 3) : 3;
  const targetShortReelCount = isRunResult ? (candidatesOrRun.target_short_reel_count ?? 2) : 2;

  const directory = this.resolvePath("channels", channel.slug, "topics");
  await mkdir(directory, { recursive: true });
  const run: TopicRun = {
    run_id: runId,
    generated_at: nowIso(),
    target_episode_count: targetEpisodeCount,
    target_short_reel_count: targetShortReelCount,
    candidates: candidates.map((candidate) => {
      const runCand = TopicRunCandidateSchema.safeParse(candidate);
      if (runCand.success && runCand.data.source_bindings && runCand.data.source_bindings.length > 0) {
        return runCand.data;
      }
      const parsed = TopicCandidateSchema.parse(candidate);
      const explicitSlotId = (candidate as { slot_id?: string }).slot_id;
      return {
        ...parsed,
        ...(explicitSlotId ? { slot_id: explicitSlotId } : {}),
        ...(parsed.source_bindings && parsed.source_bindings.length > 0 ? { source_bindings: parsed.source_bindings } : {}),
      };
    }),
    shortages,
  };
  await this.writeJsonAtomic(path.join(directory, `suggestion-${Date.now()}-${runId}.json`), run);
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

  // Reject unbound legacy candidates
  if (!candidate.source_bindings || candidate.source_bindings.length === 0) {
    if (candidate.archetype || (candidate as { slot_id?: string }).slot_id || candidate.suggested_layout) {
      throw new RepositoryError(
        "UNBOUND_LEGACY_TOPIC: Cannot confirm unbound legacy topic candidate. Re-suggest topics to bind canonical sources.",
        "UNBOUND_LEGACY_TOPIC",
      );
    }
  }

  const parsedConfirm = TopicConfirmInputSchema.parse({
    topic_id: topicId,
    question_count: questionCount,
    visual_style: visualStyle,
  });
  const selectedQuestionCount = parsedConfirm.question_count ?? candidate.question_count;

  // Enforce supported source capacity
  if (candidate.source_bindings && selectedQuestionCount > candidate.source_bindings.length) {
    throw new RepositoryError(
      `INSUFFICIENT_SOURCE_CAPACITY: Requested question count (${selectedQuestionCount}) exceeds supported source capacity (${candidate.source_bindings.length})`,
      "INSUFFICIENT_SOURCE_CAPACITY",
    );
  }

  const requestedStyle = parsedConfirm.visual_style ?? candidate.visual_style ?? "mixed";
  const availableStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const resolvedStyle: QuizImageStyle =
    requestedStyle === "mixed" ? availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d" : requestedStyle;
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
  if (candidate.source_bindings && candidate.source_bindings.length > 0) {
    await this.writeTextAtomic(
      path.join(episodeDirectory, "sources.md"),
      `# Source Questions\n\n\`\`\`json\n${JSON.stringify(candidate.source_bindings.slice(0, selectedQuestionCount), null, 2)}\n\`\`\`\n`,
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
  return episode;
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
  let nextResolvedStyle = episode.quiz_config.resolved_visual_style ?? "pixar_3d";
  const nextStyle = input.visual_style ?? episode.quiz_config.visual_style ?? "mixed";
  if (input.visual_style !== undefined) {
    if (input.visual_style === "mixed") {
      const availableStyles =
        channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
      nextResolvedStyle = availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d";
    } else {
      nextResolvedStyle = input.visual_style;
    }
  } else if (input.resolved_visual_style !== undefined) {
    nextResolvedStyle = input.resolved_visual_style;
  }
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
  const quizSourceSettingsChanged =
    nextQuizConfig.question_count !== episode.quiz_config.question_count ||
    nextQuizConfig.quiz_format !== episode.quiz_config.quiz_format ||
    nextQuizConfig.age_band !== episode.quiz_config.age_band ||
    nextQuizConfig.visual_style !== episode.quiz_config.visual_style ||
    nextQuizConfig.resolved_visual_style !== episode.quiz_config.resolved_visual_style;
  const renderStyleSettingsChanged =
    nextQuizConfig.visual_theme !== episode.quiz_config.visual_theme ||
    nextQuizConfig.thinking_bar_style !== episode.quiz_config.thinking_bar_style ||
    nextQuizConfig.question_counter_style !== episode.quiz_config.question_counter_style ||
    nextQuizConfig.question_box_style !== episode.quiz_config.question_box_style ||
    nextQuizConfig.answer_card_style !== episode.quiz_config.answer_card_style ||
    nextQuizConfig.background_style !== episode.quiz_config.background_style ||
    nextQuizConfig.palette_id !== episode.quiz_config.palette_id ||
    nextQuizConfig.style_preset_id !== episode.quiz_config.style_preset_id ||
    nextQuizConfig.render_aspect_ratio !== episode.quiz_config.render_aspect_ratio;
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
  if (quizSourceSettingsChanged) {
    await this.invalidateQuizSourceArtifacts(channelId, episodeId);
  } else if (renderStyleSettingsChanged) {
    await this.invalidateQuizArtifacts(channelId, episodeId, ["render", "qa"]);
  }
  return next;
}

export async function markTopicSelected(this: RepositoryRuntime, channelId: string, topicId: string, questionCount: number): Promise<void> {
  return projectTopicSelected(this, channelId, topicId, questionCount);
}

export async function getTopicAvailabilityBatch(
  this: RepositoryRuntime | void,
  repositoryOrChannelId: RepositoryService | RepositoryRuntime | string,
  channelIdParam?: string,
): Promise<TopicAvailabilityBatch> {
  const repo = (typeof repositoryOrChannelId === "string" ? this : repositoryOrChannelId) as RepositoryRuntime;
  const channelId = typeof repositoryOrChannelId === "string" ? repositoryOrChannelId : channelIdParam!;

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

  // Pre-fetch questions in a single batch to avoid scanning/querying per card
  let questionMap = new Map<string, BankQuestionWithCooldown>();
  if (scan.scan_status === "complete_nonempty" || scan.scan_status === "complete_empty") {
    try {
      const { questions } = await repo.queryQuestionBankQuestions({ channelId, limit: 10000, offset: 0 });
      questionMap = new Map(questions.map((q) => [q.id, q]));
    } catch {
      // Fallback to empty map if query fails
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
      if (isShortReel && candidate.archetype) {
        const hasMatchingQuestion = Array.from(questionMap.values()).some(
          (q) => q.status === "approved" && q.archetype_id === candidate.archetype && !q.channel_cooldown?.is_cooldown,
        );
        if (hasMatchingQuestion) {
          return {
            ...baseTopic,
            can_confirm: true,
            reason_code: "AVAILABLE" as const,
            retryable: false,
            recovery_action: "Ready to confirm.",
            source_capacity: 1,
          };
        }
      }
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
      if (q.status !== "approved") {
        continue;
      }
      if (q.channel_cooldown?.is_cooldown) {
        hasCooldown = true;
        continue;
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

    const minRequired = isShortReel ? 1 : 1;
    if (sourceCapacity >= minRequired) {
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
