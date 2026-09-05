import path from "node:path";
import { mkdir } from "node:fs/promises";
import {
  ALL_QUIZ_IMAGE_STYLES,
  DirectorPlanSchema,
  EpisodeSchema,
  QuizPaletteIdSchema,
  QuizQuestionSchema,
  QuizV2Schema,
  getQuizGameplayArchetype,
  makeId,
  nowIso,
  normalizeLanguageCode,
  type BankQuestion,
  type BankTranslationContent,
  type Channel,
  type DirectorArchetype,
  type DirectorBeat,
  type DirectorPlan,
  type Episode,
  type QuizImageStyle,
  type QuizLayoutId,
  type QuizQuestion,
  type QuizV2,
  type Task,
  type TopicCandidate,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import {
  DEFAULT_NARRATION_WORDS_PER_SECOND,
  estimateQuizTargetDurationMinutes,
  estimateQuizTargetWordCount,
} from "../../repository/helpers.js";
import type { TaskManager } from "../../tasks.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { transcreateBankQuestion } from "./transcreation/transcreationEngine.js";
import { ensureTopicQuestionsWithJitFallback } from "./questionJitSeeder.js";
import { createDefaultDirectorPlan } from "../director/parseDirectorPlan.js";

export interface ConvertBankQuestionOptions {
  language?: string;
  translation?: BankTranslationContent | null;
}

export function convertBankQuestionToQuizQuestion(bankQuestion: BankQuestion, options: ConvertBankQuestionOptions = {}): QuizQuestion {
  const isTrueFalse = bankQuestion.format === "true_false";
  const requiredCount = isTrueFalse ? 2 : 3;
  const translation = options.translation;

  // Defensive fallback: ensure bankQuestion.choices is a non-empty array
  const rawChoices = Array.isArray(bankQuestion.choices) && bankQuestion.choices.length > 0
    ? bankQuestion.choices.map((c, idx) => {
        if (!translation?.choices) return { ...c };
        const tc =
          translation.choices.find(
            (item) => item.id.trim().toLowerCase() === c.id.trim().toLowerCase(),
          ) ?? translation.choices[idx];
        return {
          ...c,
          text: tc?.text || c.text,
        };
      })
    : isTrueFalse
      ? [
          { id: "choice_tf_1", text: "True", is_correct: true },
          { id: "choice_tf_2", text: "False", is_correct: false },
        ]
      : [
          { id: "choice_mc_1", text: "Option A", is_correct: true },
          { id: "choice_mc_2", text: "Option B", is_correct: false },
          { id: "choice_mc_3", text: "Option C", is_correct: false },
        ];

  // 1. Identify correct choice
  const correctRaw =
    rawChoices.find((c) => c.id === bankQuestion.correct_choice_id) ??
    rawChoices.find((c) => c.is_correct) ??
    rawChoices[0];

  const distractersRaw = rawChoices.filter((c) => c !== correctRaw);

  let finalRawChoices: Array<{ text: string; isCorrect: boolean }> = [];

  if (isTrueFalse) {
    if (distractersRaw.length >= 1) {
      finalRawChoices = [
        { text: (correctRaw.text || "True").trim(), isCorrect: true },
        { text: (distractersRaw[0].text || "False").trim(), isCorrect: false },
      ];
      // If original order had distracter first, keep that order
      if (rawChoices.indexOf(distractersRaw[0]) < rawChoices.indexOf(correctRaw)) {
        finalRawChoices.reverse();
      }
    } else {
      const isCorrectTrue = (correctRaw.text || "").toLowerCase().includes("true");
      finalRawChoices = [
        { text: "True", isCorrect: isCorrectTrue },
        { text: "False", isCorrect: !isCorrectTrue },
      ];
    }
  } else {
    // Requires exactly 3 choices
    const neededDistracters = distractersRaw.slice(0, 2);
    if (neededDistracters.length === 0) {
      neededDistracters.push({ id: "fallback_1", text: "Other Option", is_correct: false });
      neededDistracters.push({ id: "fallback_2", text: "None of the Above", is_correct: false });
    } else if (neededDistracters.length === 1) {
      neededDistracters.push({ id: "fallback_1", text: "All of the Above", is_correct: false });
    }

    // Place correct choice in natural position or middle
    const originalCorrectIndex = rawChoices.indexOf(correctRaw);
    const targetCorrectIndex = Math.min(Math.max(0, originalCorrectIndex), 2);

    finalRawChoices = [
      { text: (neededDistracters[0].text || "Option B").trim(), isCorrect: false },
      { text: (neededDistracters[1].text || "Option C").trim(), isCorrect: false },
    ];
    finalRawChoices.splice(targetCorrectIndex, 0, { text: (correctRaw.text || "Option A").trim(), isCorrect: true });
  }

  // Letters: a, b, c
  const letters = ["a", "b", "c", "d"];
  const quizChoices = finalRawChoices.slice(0, requiredCount).map((c, idx) => ({
    id: letters[idx],
    text: (c.text || "").slice(0, 180).trim() || `Option ${letters[idx].toUpperCase()}`,
  }));

  // Ensure unique normalized texts
  const seenTexts = new Set<string>();
  for (let i = 0; i < quizChoices.length; i++) {
    const norm = quizChoices[i].text.normalize("NFKC").trim().toLowerCase();
    if (seenTexts.has(norm) || !norm) {
      quizChoices[i].text = `${quizChoices[i].text || `Option ${letters[i].toUpperCase()}`} (${letters[i].toUpperCase()})`;
    }
    seenTexts.add(quizChoices[i].text.normalize("NFKC").trim().toLowerCase());
  }

  const correctChoice = quizChoices.find((_, idx) => finalRawChoices[idx].isCorrect) ?? quizChoices[0];

  const localizedQuestion = translation?.question || bankQuestion.question || "Engaging trivia challenge question";
  const localizedExplanation = translation?.explanation || bankQuestion.explanation || "Detailed explanation for the correct answer.";
  const localizedFunFact = translation?.fun_fact !== undefined ? translation.fun_fact : (bankQuestion.fun_fact || "");

  const candidateQuestion = {
    id: (bankQuestion.id || makeId("bq")).slice(0, 80),
    number: 1,
    format: bankQuestion.format || "multiple_choice",
    difficulty: Math.min(Math.max(1, Number(bankQuestion.difficulty) || 2), 5),
    question: localizedQuestion.slice(0, 320).trim(),
    choices: quizChoices,
    correct_choice_id: correctChoice.id,
    explanation: localizedExplanation.slice(0, 600).trim(),
    fun_fact: localizedFunFact.slice(0, 600).trim(),
    source_ids: [],
    visual_opportunity: (bankQuestion.visual_spec?.prompt || "").slice(0, 1000).trim(),
    validation: {
      semantic_status: "validated" as const,
      source_coverage: false,
      fact_locked: true,
    },
  };

  return QuizQuestionSchema.parse(candidateQuestion);
}

export interface CreateEpisodeFromQuestionBankInput {
  question_id: string;
  target_language?: string;
  render_aspect_ratio?: "9:16" | "16:9";
  auto_start_pipeline?: boolean;
  visual_style?: QuizImageStyle | "mixed";
  force?: boolean;
}

export interface CreateEpisodeFromQuestionBankResult {
  episode: Episode;
  task: Task | null;
  cooldown_recorded: boolean;
  quiz: QuizV2;
  director_plan: DirectorPlan;
}

export async function createEpisodeFromQuestionBank(deps: {
  repository: RepositoryService;
  tasks?: TaskManager;
  channelId: string;
  input: CreateEpisodeFromQuestionBankInput;
  llmClient?: LLMClient | null;
}): Promise<CreateEpisodeFromQuestionBankResult> {
  const { repository, tasks, channelId, input } = deps;

  // 1. Fetch channel and question with channel-scoped cooldown
  const channel = await repository.getChannel(channelId);
  const bankQuestion = await repository.getQuestionBankQuestion(input.question_id, channelId);
  if (!bankQuestion) {
    throw new RepositoryError(`Question not found: ${input.question_id}`, "QUESTION_NOT_FOUND");
  }

  // 1b. Check 30-day cooldown enforcement
  const isCooldown = Boolean(bankQuestion.channel_cooldown?.is_cooldown || (bankQuestion as any).is_in_cooldown);
  if (isCooldown && !input.force) {
    const days = bankQuestion.channel_cooldown?.days_remaining ?? 30;
    throw new RepositoryError(
      `Question ${input.question_id} is in 30-day cooldown for channel ${channelId} (${days} days remaining). Set force=true to override.`,
      "QUESTION_IN_COOLDOWN"
    );
  }

  // 2. Blueprint & Layout mapping
  const blueprint = getQuizGameplayArchetype(bankQuestion.archetype_id);
  const targetLayout = blueprint?.targetLayout ?? "full_stack_list";
  const renderAspect = input.render_aspect_ratio ?? "9:16";

  // 3. Visual style
  const requestedStyle = input.visual_style ?? "mixed";
  const availableStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const resolvedStyle: QuizImageStyle =
    requestedStyle === "mixed" ? availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d" : requestedStyle;

  // 3b. Determine target language and manage transcreation
  const targetLanguage = input.target_language || channel.language || "en";
  const targetNormLang = normalizeLanguageCode(targetLanguage);
  const sourceNormLang = normalizeLanguageCode(bankQuestion.language);

  let activeTranslation: BankTranslationContent | null = null;
  if (targetNormLang !== sourceNormLang) {
    if (bankQuestion.translations && bankQuestion.translations[targetNormLang]) {
      activeTranslation = bankQuestion.translations[targetNormLang];
    } else {
      try {
        const transResult = await transcreateBankQuestion(bankQuestion, {
          targetLanguage: targetNormLang,
          channelTone: channel.display_name || channel.target_audience || undefined,
          llmClient: deps.llmClient,
        });
        activeTranslation = transResult.content;
        await repository.saveQuestionBankTranslation(bankQuestion.id, activeTranslation).catch((err) => {
          console.warn(`[QuestionBankBridge] Failed to cache translation for ${bankQuestion.id}:`, err);
        });
      } catch (transErr) {
        console.warn(
          `[QuestionBankBridge] Dynamic transcreation failed for ${bankQuestion.id} (${targetNormLang}), falling back to safe offline translation:`,
          transErr,
        );
        const fallbackResult = await transcreateBankQuestion(bankQuestion, {
          targetLanguage: targetNormLang,
          llmClient: null,
        });
        activeTranslation = fallbackResult.content;
      }
    }
  }

  // 4. Convert question to QuizV2 format
  const quizQuestion = convertBankQuestionToQuizQuestion(bankQuestion, {
    language: targetLanguage,
    translation: activeTranslation,
  });

  const localizedHook = activeTranslation?.question || bankQuestion.question;
  const localizedPremise = activeTranslation?.explanation || bankQuestion.explanation;

  // 5. Generate unique slug and episode id
  const title = `Shorts Quiz: ${localizedHook.slice(0, 50)}`;
  const parentDir = repository.resolvePath("channels", channel.slug, "episodes");
  const episodeSlug = await repository.uniqueSlug(`shorts-${bankQuestion.archetype_id}-${Date.now().toString(36)}`, parentDir);
  const episodeId = makeId("ep");
  const timestamp = nowIso();

  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  const episodeDirectory = path.join(parentDir, episodeSlug);
  await mkdir(path.join(episodeDirectory, "assets"), { recursive: true });

  // 6. Build Episode record
  const episode = EpisodeSchema.parse({
    episode_id: episodeId,
    channel_id: channelId,
    slug: episodeSlug,
    topic: {
      title,
      premise: localizedPremise,
      hook: localizedHook,
    },
    stage: "SELECTED",
    script_path: `channels/${channel.slug}/episodes/${episodeSlug}/script.md`,
    research_path: `channels/${channel.slug}/episodes/${episodeSlug}/research.md`,
    treatment_path: `channels/${channel.slug}/episodes/${episodeSlug}/treatment.md`,
    visual_bible_path: `channels/${channel.slug}/episodes/${episodeSlug}/visual_bible.md`,
    scene_plan_path: `channels/${channel.slug}/episodes/${episodeSlug}/scene_plan.md`,
    dialogue_script_path: `channels/${channel.slug}/episodes/${episodeSlug}/dialogue_script.md`,
    video_prompts_path: `channels/${channel.slug}/episodes/${episodeSlug}/video_prompts.md`,
    target_duration_minutes: 3,
    target_word_count: 50,
    quiz_config: {
      question_count: 3,
      quiz_format: quizQuestion.format,
      age_band: bankQuestion.age_band,
      answer_mode: "voice_and_reveal",
      visual_theme: "candy_pop",
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
      render_aspect_ratio: renderAspect,
      archetype: bankQuestion.archetype_id,
      target_layout: targetLayout,
    },
    created_at: timestamp,
    updated_at: timestamp,
  });

  // 7. Write episode files & stub markdown files
  await repository.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  await repository.writeTextAtomic(
    path.join(episodeDirectory, "brief.md"),
    `# ${title}\n\n## Question\n${localizedHook}\n\n## Answer\n${localizedPremise}\n`,
  );
  await Promise.all([
    repository.writeTextAtomic(path.join(episodeDirectory, "research.md"), "# Research Dossier\n\nQuestion Bank direct build.\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "treatment.md"), "# Treatment\n\nQuestion Bank direct build.\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "script.md"), `# Script\n\n${localizedHook}\n`),
    repository.writeTextAtomic(
      path.join(episodeDirectory, "visual_bible.md"),
      "# Episode Visual Bible\n\nVisual development has not started.\n",
    ),
    repository.writeTextAtomic(path.join(episodeDirectory, "scene_plan.md"), "# Scene Plan\n\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "dialogue_script.md"), "# Dialogue Script\n\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "video_prompts.md"), "# Video Prompts\n\n"),
  ]);

  // 8. Write pre-populated QuizV2 fact sheet
  const quiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: bankQuestion.age_band,
    language: targetLanguage,
    questions: [quizQuestion],
  });
  await repository.writeQuiz(channelId, episodeId, quiz);

  // 8b. Write tailored Director Plan locking target layout & archetype
  const directorArchetype: DirectorArchetype =
    bankQuestion.archetype_id === "mystery_reveal"
      ? "mystery_reveal"
      : bankQuestion.archetype_id === "clue_deduction"
        ? "clue_deduction"
        : bankQuestion.archetype_id === "versus_faceoff" || bankQuestion.archetype_id === "visual_identification"
          ? "visual_multiple_choice"
          : bankQuestion.archetype_id === "verdict_true_false" || bankQuestion.archetype_id === "verdict_fact_myth"
            ? "true_false"
            : bankQuestion.archetype_id === "visual_spotting"
              ? "odd_one_out"
              : bankQuestion.archetype_id === "speed_blitz"
                ? "speed_round"
                : "text_multiple_choice";

  const isRevealArchetype =
    bankQuestion.archetype_id === "mystery_reveal" ||
    bankQuestion.archetype_id === "clue_deduction";

  const directorBeat: DirectorBeat = {
    question_id: quizQuestion.id,
    archetype: directorArchetype,
    energy: "curious",
    visual_density: "focused",
    palette_id: channelPalette.success ? channelPalette.data : "auto",
    layout_id: targetLayout as QuizLayoutId,
    motion_id: "enter.pop",
    transition_id: "bubble_splash",
    thinking_bar_style: channel.default_thinking_bar_style ?? "auto",
    question_counter_style: channel.default_counter_style ?? "auto",
    question_box_style: channel.default_question_box_style ?? "auto",
    answer_card_style: channel.default_answer_card_style ?? "auto",
    background_style: channel.default_background_style ?? "auto",
    thinking_seconds: 7.0,
    beat_intents: [
      "question_enter",
      "choice_reveal",
      "thinking",
      "countdown",
      "answer_reveal",
      "explanation",
      ...(quizQuestion.fun_fact ? ["fun_fact" as const] : []),
      "celebrate" as const,
      "transition",
    ],
    asset_intents: isRevealArchetype ? ["question_illustration", "answer_reveal"] : ["question_illustration"],
    mascot_state: "celebrate",
    sfx_intents: ["countdown_tick", "correct_medium"],
    transition_intent: "zoom",
    reward_intensity: "medium",
  };

  const directorPlan: DirectorPlan = DirectorPlanSchema.parse({
    schema_version: 2,
    episode_id: episodeId,
    archetype_family: "candy_arcade",
    beats: [directorBeat],
    midpoint_question_id: quizQuestion.id,
    final_challenge_question_id: quizQuestion.id,
  });

  await repository.writeDirectorPlan(channelId, episodeId, directorPlan);

  // 9. Append to question_history.json to activate channel 30-day cooldown immediately
  await repository.appendQuestionHistory(channelId, episodeId, [quizQuestion]);

  // 10. Auto-start production pipeline if requested
  let task: Task | null = null;
  if (input.auto_start_pipeline !== false && tasks) {
    task = tasks.submit("GENERATE_PIPELINE", channelId, episodeId);
  }

  await repository.updateChannel(channelId, { updated_at: timestamp });

  return {
    episode,
    task,
    cooldown_recorded: true,
    quiz,
    director_plan: directorPlan,
  };
}

export interface CreateEpisodeFromTopicWithBankInput {
  topic_id: string;
  question_count?: number; // default 3 for Shorts
  target_language?: string;
  render_aspect_ratio?: "9:16" | "16:9";
  auto_start_pipeline?: boolean; // default true
  visual_style?: QuizImageStyle | "mixed";
  force?: boolean;
}

export interface CreateEpisodeFromTopicWithBankResult {
  episode: Episode;
  task: Task | null;
  quiz: QuizV2;
  director_plan: DirectorPlan;
  curated_source: "bank_only" | "jit_only" | "hybrid";
  question_ids: string[];
  cooldown_recorded: boolean;
}

function resolveTargetLayoutForTopic(topic: TopicCandidate): QuizLayoutId {
  if (topic.suggested_layout) {
    return topic.suggested_layout as QuizLayoutId;
  }
  if (topic.archetype) {
    const bp = getQuizGameplayArchetype(topic.archetype as any);
    if (bp?.targetLayout) return bp.targetLayout as QuizLayoutId;
    switch (topic.archetype) {
      case "mystery_reveal":
        return "mystery_reveal";
      case "clue_deduction":
        return "clue_deduction";
      case "verdict_true_false":
      case "verdict_fact_myth":
        return "verdict_true_false";
      case "versus_faceoff":
        return "split_versus_two";
      case "visual_spotting":
        return "visual_choices_three_pure";
      case "visual_identification":
        return "visual_choices_three";
      case "speed_blitz":
        return "full_stack_list";
      case "deep_trivia":
        return "media_left_choices_right";
    }
  }
  if (topic.quiz_format === "true_false") {
    return "verdict_true_false";
  }
  if (topic.quiz_format === "odd_one_out") {
    return "visual_choices_three_pure";
  }
  if (topic.quiz_format === "image_guess") {
    return "mystery_reveal";
  }
  return "media_left_choices_right";
}

function buildTopicDirectorPlan(
  quiz: QuizV2,
  topic: TopicCandidate,
  channel: Channel,
  targetLayout: QuizLayoutId,
): DirectorPlan {
  const basePlan = createDefaultDirectorPlan(quiz);
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  const isReveal = topic.archetype === "mystery_reveal" || topic.archetype === "clue_deduction";

  return DirectorPlanSchema.parse({
    ...basePlan,
    beats: basePlan.beats.map((beat) => {
      const directorArchetype: DirectorArchetype =
        topic.archetype === "mystery_reveal"
          ? "mystery_reveal"
          : topic.archetype === "clue_deduction"
            ? "clue_deduction"
            : topic.archetype === "versus_faceoff" || topic.archetype === "visual_identification"
              ? "visual_multiple_choice"
              : topic.archetype === "verdict_true_false" || topic.archetype === "verdict_fact_myth"
                ? "true_false"
                : topic.archetype === "visual_spotting"
                  ? "odd_one_out"
                  : topic.archetype === "speed_blitz"
                    ? "speed_round"
                    : beat.archetype;

      return {
        ...beat,
        archetype: directorArchetype,
        layout_id: targetLayout,
        palette_id: channelPalette.success ? channelPalette.data : beat.palette_id,
        thinking_bar_style: channel.default_thinking_bar_style ?? beat.thinking_bar_style,
        question_counter_style: channel.default_counter_style ?? beat.question_counter_style,
        question_box_style: channel.default_question_box_style ?? beat.question_box_style,
        answer_card_style: channel.default_answer_card_style ?? beat.answer_card_style,
        background_style: channel.default_background_style ?? beat.background_style,
        asset_intents: isReveal ? ["question_illustration", "answer_reveal"] : beat.asset_intents,
      };
    }),
  });
}

async function transcreateAndConvertTopicQuestions(
  selectedQuestions: BankQuestion[],
  targetLanguage: string,
  channel: Channel,
  repository: RepositoryService,
  llmClient?: LLMClient | null,
): Promise<QuizQuestion[]> {
  const targetNormLang = normalizeLanguageCode(targetLanguage);
  const quizQuestions: QuizQuestion[] = [];

  for (let i = 0; i < selectedQuestions.length; i++) {
    const bankQuestion = selectedQuestions[i];
    const sourceNormLang = normalizeLanguageCode(bankQuestion.language);
    let activeTranslation: BankTranslationContent | null = null;

    if (targetNormLang !== sourceNormLang) {
      if (bankQuestion.translations && bankQuestion.translations[targetNormLang]) {
        activeTranslation = bankQuestion.translations[targetNormLang];
      } else {
        try {
          const transResult = await transcreateBankQuestion(bankQuestion, {
            targetLanguage: targetNormLang,
            channelTone: channel.display_name || channel.target_audience || undefined,
            llmClient,
          });
          activeTranslation = transResult.content;
          await repository.saveQuestionBankTranslation(bankQuestion.id, activeTranslation).catch((err) => {
            console.warn(`[QuestionBankBridge] Failed to cache translation for ${bankQuestion.id}:`, err);
          });
        } catch {
          const fallbackResult = await transcreateBankQuestion(bankQuestion, {
            targetLanguage: targetNormLang,
            llmClient: null,
          });
          activeTranslation = fallbackResult.content;
        }
      }
    }

    const quizQuestion = convertBankQuestionToQuizQuestion(bankQuestion, {
      language: targetLanguage,
      translation: activeTranslation,
    });
    quizQuestion.number = i + 1;
    quizQuestions.push(quizQuestion);
  }

  return quizQuestions;
}

async function writeTopicEpisodeFiles(
  repository: RepositoryService,
  channel: Channel,
  episode: Episode,
  topic: TopicCandidate,
  episodeDirectory: string,
): Promise<void> {
  await repository.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  await repository.writeTextAtomic(
    path.join(episodeDirectory, "brief.md"),
    `# ${topic.title}\n\n## Premise\n\n${topic.premise}\n\n## Hook\n\n${topic.hook}\n`,
  );
  await Promise.all([
    repository.writeTextAtomic(path.join(episodeDirectory, "research.md"), "# Research Dossier\n\nResearch has not started.\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "treatment.md"), "# Treatment\n\nTreatment has not started.\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "script.md"), "# Script\n\nScript generation has not started.\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "visual_bible.md"), "# Episode Visual Bible\n\nVisual development has not started.\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "scene_plan.md"), "# Scene Plan\n\nScene breakdown has not started.\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "dialogue_script.md"), "# Dialogue Script\n\n"),
    repository.writeTextAtomic(path.join(episodeDirectory, "video_prompts.md"), "# Video Prompts\n\n"),
  ]);
  await repository.writeJsonAtomic(
    path.join(repository.resolvePath("channels", channel.slug), "topic_database.json"),
    (await repository.listTopics(channel.channel_id)).map(({ title, premise }) => ({ title, premise })),
  );
}

export async function createEpisodeFromTopicWithBank(deps: {
  repository: RepositoryService;
  tasks?: TaskManager;
  channelId: string;
  input: CreateEpisodeFromTopicWithBankInput;
  llmClient?: LLMClient | null;
}): Promise<CreateEpisodeFromTopicWithBankResult> {
  const { repository, tasks, channelId, input } = deps;

  // a. Fetch channel
  const channel = await repository.getChannel(channelId);

  // b. Find topic candidate
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === input.topic_id);
  if (!topic) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }

  // c. Resolve question count
  const questionCount = input.question_count ?? topic.question_count ?? 3;
  const targetLanguage = input.target_language || channel.language || "en";

  // d. Curate questions with JIT fallback
  const jitResult = await ensureTopicQuestionsWithJitFallback({
    repository,
    channelId,
    topic,
    questionCount,
    targetLanguage,
    llmClient: deps.llmClient,
    forceIncludeCooldown: input.force ?? false,
  });
  const selectedQuestions = jitResult.questions;

  // e. Transcreate and convert to QuizQuestion[]
  const quizQuestions = await transcreateAndConvertTopicQuestions(
    selectedQuestions,
    targetLanguage,
    channel,
    repository,
    deps.llmClient,
  );

  // f. Layout, styling, slug, duration, and Episode record
  const targetLayout = resolveTargetLayoutForTopic(topic);
  const blueprint = topic.archetype ? getQuizGameplayArchetype(topic.archetype as any) : undefined;
  const renderAspect =
    input.render_aspect_ratio ??
    (topic.title.toLowerCase().includes("shorts") || Boolean(topic.archetype) ? "9:16" : "16:9");

  const requestedStyle = input.visual_style ?? topic.visual_style ?? "mixed";
  const availableStyles =
    channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const resolvedStyle: QuizImageStyle =
    requestedStyle === "mixed" ? availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d" : requestedStyle;

  const parentDir = repository.resolvePath("channels", channel.slug, "episodes");
  const episodeSlug = await repository.uniqueSlug(topic.title, parentDir);
  const episodeId = makeId("ep");
  const timestamp = nowIso();
  const episodeDirectory = path.join(parentDir, episodeSlug);
  await mkdir(path.join(episodeDirectory, "assets"), { recursive: true });

  const targetDurationMinutes = estimateQuizTargetDurationMinutes(quizQuestions.length);
  const targetWordCount = estimateQuizTargetWordCount(targetDurationMinutes, DEFAULT_NARRATION_WORDS_PER_SECOND);
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);

  const episode = EpisodeSchema.parse({
    episode_id: episodeId,
    channel_id: channelId,
    slug: episodeSlug,
    topic: { title: topic.title, premise: topic.premise, hook: topic.hook },
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
      question_count: quizQuestions.length,
      quiz_format: blueprint?.defaultFormat ?? quizQuestions[0]?.format ?? topic.quiz_format ?? "multiple_choice",
      age_band: (topic.age_band as any) || selectedQuestions[0]?.age_band || "family",
      answer_mode: "voice_and_reveal",
      visual_theme:
        topic.quiz_format === "image_guess" || topic.archetype === "mystery_reveal" ? "jungle_jamboree" : "candy_pop",
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
      render_aspect_ratio: renderAspect,
      archetype: topic.archetype,
      target_layout: targetLayout,
    },
    created_at: timestamp,
    updated_at: timestamp,
  });

  // g. Write episode files
  await writeTopicEpisodeFiles(repository, channel, episode, topic, episodeDirectory);

  // h. Build and write QuizV2
  const quiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: (topic.age_band as any) || selectedQuestions[0]?.age_band || "family",
    language: targetLanguage,
    questions: quizQuestions,
  });
  await repository.writeQuiz(channelId, episodeId, quiz);

  // i. Build and write DirectorPlan
  const directorPlan = buildTopicDirectorPlan(quiz, topic, channel, targetLayout);
  await repository.writeDirectorPlan(channelId, episodeId, directorPlan);

  // j. Record 30-day channel cooldown
  const questionIds = selectedQuestions.map((q) => q.id);
  if (typeof (repository as any).recordQuestionUsage === "function") {
    await (repository as any).recordQuestionUsage(channelId, episodeId, questionIds);
  }
  await repository.appendQuestionHistory(channelId, episodeId, quizQuestions, 30);

  // k. Mark topic selected
  await repository.markTopicSelected(channelId, topic.topic_id, quizQuestions.length);
  await repository.updateChannel(channelId, { updated_at: timestamp });

  // l. Auto-start pipeline
  let task: Task | null = null;
  if (input.auto_start_pipeline !== false && tasks) {
    try {
      task = tasks.submit("GENERATE_PIPELINE", channelId, episodeId);
    } catch {
      task = (tasks.submit as any)("PIPELINE", channelId, episodeId);
    }
  }

  return {
    episode,
    task,
    quiz,
    director_plan: directorPlan,
    curated_source: jitResult.source,
    question_ids: questionIds,
    cooldown_recorded: true,
  };
}
