import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  ALL_QUIZ_IMAGE_STYLES,
  QuizPaletteIdSchema,
  EpisodeSchema,
  QUIZ_MIN_QUESTION_COUNT,
  makeId,
  nowIso,
  type Channel,
  type Episode,
  type QuizImageStyle,
  type QuizLayoutId,
  type Task,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { TaskManager } from "../../../tasks.js";

/**
 * Resolves the effective visual style pair for an episode: the caller-requested style
 * (which may be "mixed") and the concrete style actually used for rendering.
 */
export function resolveEpisodeVisualStyles(
  channel: Channel,
  requestedStyle: QuizImageStyle | "mixed" = "mixed",
): { requestedStyle: QuizImageStyle | "mixed"; resolvedStyle: QuizImageStyle } {
  const styles = channel.selected_styles?.length ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const resolvedStyle: QuizImageStyle =
    requestedStyle === "mixed" ? styles[Math.floor(Math.random() * styles.length)] || "pixar_3d" : requestedStyle;
  return { requestedStyle, resolvedStyle };
}

/**
 * Submits the episode generation pipeline task when auto-start is enabled.
 * Returns null when auto-start is off or no task manager is provided.
 */
export function triggerPipelineTask(
  tasks: TaskManager | undefined,
  channelId: string,
  episodeId: string,
  autoStart: boolean = true,
): Task | null {
  if (!autoStart || !tasks) return null;
  return tasks.submit("GENERATE_PIPELINE", channelId, episodeId);
}

/** Normalizes the requested render aspect ratio, rejecting unsupported values. */
export function resolveRenderAspect(renderAspect: string | undefined): "16:9" {
  const resolved = renderAspect ?? "16:9";
  if (resolved !== "16:9") {
    throw new Error(`Unsupported episode render aspect ratio: ${String(resolved)}. Only 16:9 is supported.`);
  }
  return "16:9";
}

export interface BuildEpisodeRecordParams {
  episodeId: string;
  channelId: string;
  channelSlug: string;
  episodeSlug: string;
  title: string;
  premise: string;
  hook: string;
  targetDurationMinutes: number;
  targetWordCount: number;
  questionCount: number;
  quizFormat: string;
  ageBand: string;
  visualTheme: string;
  requestedStyle: QuizImageStyle | "mixed";
  resolvedStyle: QuizImageStyle;
  channel: Channel;
  renderAspect: "16:9";
  archetype?: string;
  targetLayout: QuizLayoutId;
  timestamp: string;
}

/** Builds the validated Episode record persisted as episode.json. */
export function buildEpisodeRecord(params: BuildEpisodeRecordParams): Episode {
  const channelPalette = QuizPaletteIdSchema.safeParse(params.channel.default_palette_id);
  return EpisodeSchema.parse({
    episode_id: params.episodeId,
    channel_id: params.channelId,
    slug: params.episodeSlug,
    topic: { title: params.title, premise: params.premise, hook: params.hook },
    stage: "SELECTED",
    script_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/script.md`,
    research_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/research.md`,
    treatment_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/treatment.md`,
    visual_bible_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/visual_bible.md`,
    scene_plan_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/scene_plan.md`,
    dialogue_script_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/dialogue_script.md`,
    video_prompts_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/video_prompts.md`,
    target_duration_minutes: params.targetDurationMinutes,
    target_word_count: params.targetWordCount,
    quiz_config: {
      question_count: Math.max(QUIZ_MIN_QUESTION_COUNT, params.questionCount),
      quiz_format: params.quizFormat,
      age_band: params.ageBand,
      answer_mode: "voice_and_reveal",
      visual_theme: params.visualTheme,
      visual_style: params.requestedStyle,
      resolved_visual_style: params.resolvedStyle,
      thinking_bar_style: params.channel.default_thinking_bar_style ?? "auto",
      question_counter_style: params.channel.default_counter_style ?? "auto",
      question_box_style: params.channel.default_question_box_style ?? "auto",
      answer_card_style: params.channel.default_answer_card_style ?? "auto",
      background_style: params.channel.default_background_style ?? "auto",
      palette_id: channelPalette.success ? channelPalette.data : "auto",
      style_preset_id: "auto",
      channel_brand_name: "",
      render_aspect_ratio: params.renderAspect,
      archetype: params.archetype,
      target_layout: params.targetLayout,
    },
    created_at: params.timestamp,
    updated_at: params.timestamp,
  });
}

/** Shapes the initial markdown stubs for an episode directory, differing between topic and single-question builds. */
export function buildEpisodeMarkdownStubs(meta: {
  title: string;
  hook: string;
  premise: string;
  isTopic?: boolean;
}): Record<string, string> {
  const dossier = meta.isTopic ? "Research has not started.\n" : "Question Bank direct build.\n";
  const treatment = meta.isTopic ? "Treatment has not started.\n" : "Question Bank direct build.\n";
  const script = meta.isTopic ? "# Script\n\nScript generation has not started.\n" : `# Script\n\n${meta.hook}\n`;
  const brief = meta.isTopic
    ? `# ${meta.title}\n\n## Premise\n\n${meta.premise}\n\n## Hook\n\n${meta.hook}\n`
    : `# ${meta.title}\n\n## Question\n${meta.hook}\n\n## Answer\n${meta.premise}\n`;
  return {
    "brief.md": brief,
    "research.md": `# Research Dossier\n\n${dossier}`,
    "treatment.md": `# Treatment\n\n${treatment}`,
    "script.md": script,
    "visual_bible.md": "# Episode Visual Bible\n\nVisual development has not started.\n",
    "scene_plan.md": `# Scene Plan\n\n${meta.isTopic ? "Scene breakdown has not started.\n" : ""}`,
    "dialogue_script.md": "# Dialogue Script\n\n",
    "video_prompts.md": "# Video Prompts\n\n",
  };
}

export interface EpisodeDirectoryContext {
  parentDir: string;
  episodeSlug: string;
  episodeId: string;
  timestamp: string;
  episodeDirectory: string;
}

/** Resolves the episode parent directory, unique slug, id, timestamp, and full episode directory path. */
export async function prepareEpisodeDirectory(
  repository: RepositoryService,
  channel: Channel,
  slugSeed: string,
): Promise<EpisodeDirectoryContext> {
  const parentDir = repository.resolvePath("channels", channel.slug, "episodes");
  const episodeSlug = await repository.uniqueSlug(slugSeed, parentDir);
  const episodeId = makeId("ep");
  const timestamp = nowIso();
  const episodeDirectory = path.join(parentDir, episodeSlug);
  return { parentDir, episodeSlug, episodeId, timestamp, episodeDirectory };
}

/** Creates the episode directory tree including its assets folder. */
export async function createEpisodeDirectoryStructure(episodeDirectory: string): Promise<void> {
  await mkdir(path.join(episodeDirectory, "assets"), { recursive: true });
}

/** Writes all episode markdown stubs to disk in parallel after the brief lands first. */
export async function writeEpisodeMarkdownStubs(
  repository: RepositoryService,
  episodeDir: string,
  meta: { title: string; hook: string; premise: string; isTopic?: boolean },
): Promise<void> {
  const stubs = buildEpisodeMarkdownStubs(meta);
  await repository.writeTextAtomic(path.join(episodeDir, "brief.md"), stubs["brief.md"]);
  await Promise.all(
    Object.entries(stubs)
      .filter(([fileName]) => fileName !== "brief.md")
      .map(([fileName, content]) => repository.writeTextAtomic(path.join(episodeDir, fileName), content)),
  );
}
