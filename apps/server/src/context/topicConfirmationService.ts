import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  ALL_QUIZ_IMAGE_STYLES,
  EpisodeSchema,
  QuizConfigSchema,
  QuizPaletteIdSchema,
  TopicConfirmInputSchema,
  makeId,
  nowIso,
  type Channel,
  type Episode,
  type EpisodeTopicCandidate,
  type QuizImageStyle,
  type TopicCandidate,
} from "@studio/shared";
import { RepositoryError } from "../repository/errors.js";
import { resolveBoundTopicSources, type ResolvedBoundTopicSources } from "../quiz/bank/bridge/boundSourceResolver.js";
import {
  saveTopicConfirmationReceipt,
  computeConfirmationOptionsFingerprint,
  type TopicConfirmationOptions,
} from "../repository/topicConfirmationReceipts.js";
import { normalizeTargetLanguage } from "../quiz/bank/localization/productLocalization.js";
import type { RepositoryService } from "../repository/service.js";
import type { RepositoryRuntime } from "../repository/runtime.js";
import {
  DEFAULT_NARRATION_WORDS_PER_SECOND,
  estimateQuizTargetDurationMinutes,
  estimateQuizTargetWordCount,
} from "../repository/helpers.js";

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

function buildEpisodePaths(channelSlug: string, episodeSlug: string) {
  const base = `channels/${channelSlug}/episodes/${episodeSlug}`;
  return {
    script_path: `${base}/script.md`,
    research_path: `${base}/research.md`,
    treatment_path: `${base}/treatment.md`,
    visual_bible_path: `${base}/visual_bible.md`,
    scene_plan_path: `${base}/scene_plan.md`,
    dialogue_script_path: `${base}/dialogue_script.md`,
    video_prompts_path: `${base}/video_prompts.md`,
  };
}

function buildQuizConfig(
  candidate: EpisodeTopicCandidate,
  channel: Channel,
  selectedQuestionCount: number,
  requestedStyle: QuizImageStyle | "mixed",
  resolvedStyle: QuizImageStyle,
): Episode["quiz_config"] {
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  return QuizConfigSchema.parse({
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
  });
}

interface BuildEpisodeParams {
  episodeId: string;
  channelId: string;
  channelSlug: string;
  episodeSlug: string;
  candidate: EpisodeTopicCandidate;
  selectedQuestionCount: number;
  requestedStyle: QuizImageStyle | "mixed";
  resolvedStyle: QuizImageStyle;
  channel: Channel;
  targetDurationMinutes: number;
  targetWordCount: number;
  timestamp: string;
}

function buildEpisodeSkeleton(params: BuildEpisodeParams): Episode {
  return EpisodeSchema.parse({
    episode_id: params.episodeId,
    channel_id: params.channelId,
    slug: params.episodeSlug,
    topic: { title: params.candidate.title, premise: params.candidate.premise, hook: params.candidate.hook },
    stage: "SELECTED",
    ...buildEpisodePaths(params.channelSlug, params.episodeSlug),
    target_duration_minutes: params.targetDurationMinutes,
    target_word_count: params.targetWordCount,
    quiz_config: buildQuizConfig(
      params.candidate,
      params.channel,
      params.selectedQuestionCount,
      params.requestedStyle,
      params.resolvedStyle,
    ),
    created_at: params.timestamp,
    updated_at: params.timestamp,
  });
}

async function initializeEpisodeFiles(
  repo: RepositoryRuntime,
  episodeDirectory: string,
  candidate: TopicCandidate,
  boundResult?: Partial<ResolvedBoundTopicSources>,
): Promise<void> {
  await mkdir(path.join(episodeDirectory, "assets"), { recursive: true });

  if (boundResult?.questions && boundResult.questions.length > 0 && boundResult.sourceContentHashes) {
    const recordedBindings = boundResult.questions.map((q, idx) => ({
      source_question_id: q.id,
      source_content_hash: boundResult.sourceContentHashes![idx],
      choice_ids: q.choices.map((c) => c.id),
      correct_choice_id: q.correct_choice_id,
    }));
    await repo.writeTextAtomic(
      path.join(episodeDirectory, "sources.md"),
      `# Source Questions\n\n\`\`\`json\n${JSON.stringify(recordedBindings, null, 2)}\n\`\`\`\n`,
    );
  }

  await repo.writeTextAtomic(
    path.join(episodeDirectory, "brief.md"),
    `# ${candidate.title}\n\n## Premise\n\n${candidate.premise}\n\n## Hook\n\n${candidate.hook}\n`,
  );

  const initialDocs = [
    { name: "research.md", content: "# Research Dossier\n\nResearch has not started.\n" },
    { name: "treatment.md", content: "# Treatment\n\nTreatment has not started.\n" },
    { name: "script.md", content: "# Script\n\nScript generation has not started.\n" },
    { name: "visual_bible.md", content: "# Episode Visual Bible\n\nVisual development has not started.\n" },
    { name: "scene_plan.md", content: "# Scene Plan\n\nScene breakdown has not started.\n" },
    { name: "dialogue_script.md", content: "# Dialogue Script\n\n" },
    { name: "video_prompts.md", content: "# Video Prompts\n\n" },
  ];
  await Promise.all(
    initialDocs.map((doc) => repo.writeTextAtomic(path.join(episodeDirectory, doc.name), doc.content)),
  );
}

async function saveConfirmationReceiptRecord(
  repo: RepositoryRuntime,
  channel: Channel,
  episode: Episode,
  topicId: string,
  selectedQuestionCount: number,
  requestedStyle: QuizImageStyle | "mixed",
  timestamp: string,
  boundResult?: Partial<ResolvedBoundTopicSources>,
): Promise<void> {
  const effectiveTargetLang = normalizeTargetLanguage(channel.language ?? "en");
  const confirmOptions: TopicConfirmationOptions = {
    question_count: selectedQuestionCount,
    visual_style: requestedStyle,
    target_language: effectiveTargetLang,
  };

  await saveTopicConfirmationReceipt(repo as unknown as RepositoryService, channel.channel_id, {
    receipt_id: `rec-${episode.episode_id}`,
    channel_id: channel.channel_id,
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
}

function resolveConfirmInvocation(
  callerThis: RepositoryRuntime | void,
  firstParam: RepositoryRuntime | string,
  secondParam: string,
  thirdParam?: number | string,
  fourthParam?: QuizImageStyle | "mixed" | number,
  fifthParam?: QuizImageStyle | "mixed",
): {
  repo: RepositoryRuntime;
  channelId: string;
  topicId: string;
  questionCount?: number;
  visualStyle?: QuizImageStyle | "mixed";
} {
  if (typeof firstParam === "string") {
    return {
      repo: callerThis as RepositoryRuntime,
      channelId: firstParam,
      topicId: secondParam,
      questionCount: thirdParam as number | undefined,
      visualStyle: fourthParam as QuizImageStyle | "mixed" | undefined,
    };
  }
  return {
    repo: firstParam,
    channelId: secondParam,
    topicId: thirdParam as string,
    questionCount: fourthParam as number | undefined,
    visualStyle: fifthParam,
  };
}

export async function confirmTopic(
  this: RepositoryRuntime | void,
  channelId: string,
  topicId: string,
  questionCount?: number,
  visualStyle?: QuizImageStyle | "mixed",
): Promise<Episode>;
export async function confirmTopic(
  this: RepositoryRuntime | void,
  repoOrChannelId: RepositoryRuntime | string,
  channelIdOrTopicId: string,
  questionCountOrTopicId?: number | string,
  visualStyleOrQuestionCount?: QuizImageStyle | "mixed" | number,
  visualStyleParam?: QuizImageStyle | "mixed",
): Promise<Episode> {
  const { repo, channelId, topicId, questionCount, visualStyle } = resolveConfirmInvocation(
    this,
    repoOrChannelId,
    channelIdOrTopicId,
    questionCountOrTopicId,
    visualStyleOrQuestionCount,
    visualStyleParam,
  );

  const channel = await repo.getChannel(channelId);
  const candidate = (await repo.listTopics(channelId)).find((topic) => topic.topic_id === topicId);
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

  let boundResult: Partial<ResolvedBoundTopicSources> | undefined;
  if (candidate.source_bindings && candidate.source_bindings.length > 0) {
    boundResult = await resolveBoundTopicSources({
      repository: repo as unknown as RepositoryService,
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

  await repo.markTopicSelected(channelId, topicId, selectedQuestionCount);
  const episodeSlug = await repo.uniqueSlug(candidate.title, repo.resolvePath("channels", channel.slug, "episodes"));
  const episodeId = makeId("ep");
  const timestamp = nowIso();
  const episodeDirectory = repo.resolvePath("channels", channel.slug, "episodes", episodeSlug);

  const episode = buildEpisodeSkeleton({
    episodeId,
    channelId,
    channelSlug: channel.slug,
    episodeSlug,
    candidate: candidate as EpisodeTopicCandidate,
    selectedQuestionCount,
    requestedStyle,
    resolvedStyle,
    channel,
    targetDurationMinutes,
    targetWordCount,
    timestamp,
  });

  await initializeEpisodeFiles(repo, episodeDirectory, candidate, boundResult);
  await repo.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  repo.entityIdResolver.setEpisodeSlug(channelId, episode.episode_id, episode.slug);
  repo.entityIdResolver.setEpisodeTitle(episode.episode_id, episode.topic?.title || "");
  repo.channelCache.incrementEpisodeCount(channelId);

  await repo.writeJsonAtomic(
    path.join(repo.resolvePath("channels", channel.slug), "topic_database.json"),
    (await repo.listTopics(channelId)).map(({ title, premise }) => ({ title, premise })),
  );
  await repo.updateChannel(channelId, { updated_at: timestamp });

  await saveConfirmationReceiptRecord(
    repo,
    channel,
    episode,
    topicId,
    selectedQuestionCount,
    requestedStyle,
    timestamp,
    boundResult,
  );

  return episode;
}
