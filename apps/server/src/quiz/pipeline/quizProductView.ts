import {
  episodeProductRef,
  type Episode,
  type QuizPacingProfile,
  type QuizProductKind,
  type QuizProductMediaFields,
  type QuizProductRef,
  type QuizShort,
  type QuizShortLayoutPair,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { toQuizProductRef } from "../../repository/quizProductPaths.js";

/** The configuration slice the Quiz V2 pipeline reads, normalized across Episodes and Quiz Shorts. */
export type QuizProductViewConfig = {
  question_count: number;
  quiz_format: Episode["quiz_config"]["quiz_format"];
  age_band: Episode["quiz_config"]["age_band"];
  answer_mode: Episode["quiz_config"]["answer_mode"];
  render_aspect_ratio: "16:9" | "9:16";
  pacing_profile: QuizPacingProfile;
  layout_pair?: QuizShortLayoutPair;
  target_layout?: Episode["quiz_config"]["target_layout"];
  archetype?: Episode["quiz_config"]["archetype"];
  visual_style: Episode["quiz_config"]["visual_style"];
  resolved_visual_style: Episode["quiz_config"]["resolved_visual_style"];
  visual_theme: Episode["quiz_config"]["visual_theme"];
  mascot_style_selection: Episode["quiz_config"]["mascot_style_selection"];
  mascot_style_id?: string | null;
  channel_brand_name: string;
  intro_enabled: boolean;
  outro_enabled: boolean;
  outro_cta_enabled: boolean;
  fast_render_mode: boolean;
};

export type QuizProductView = {
  kind: QuizProductKind;
  ref: QuizProductRef;
  id: string;
  slug: string;
  topic: Episode["topic"];
  stage: Episode["stage"];
  quiz_config: QuizProductViewConfig;
  media: QuizProductMediaFields;
  /** Raw record for helpers that are still Episode-only (intro/outro, scenes, exports). */
  episode: Episode | null;
  quizShort: QuizShort | null;
};

function pickMediaFields(record: Episode | QuizShort): QuizProductMediaFields {
  return {
    narration_asset_path: record.narration_asset_path,
    narration_generated_at: record.narration_generated_at,
    narration_duration_seconds: record.narration_duration_seconds,
    narration_segment_count: record.narration_segment_count,
    measured_narration_words_per_second: record.measured_narration_words_per_second,
    video_asset_path: record.video_asset_path,
    video_generated_at: record.video_generated_at,
    video_duration_seconds: record.video_duration_seconds,
    render_manifest_path: record.render_manifest_path,
    render_stale: record.render_stale,
  };
}

export function quizProductViewFromEpisode(episode: Episode): QuizProductView {
  const config = episode.quiz_config;
  return {
    kind: "episode",
    ref: episodeProductRef(episode.channel_id, episode.episode_id),
    id: episode.episode_id,
    slug: episode.slug,
    topic: episode.topic,
    stage: episode.stage,
    quiz_config: {
      ...config,
      render_aspect_ratio: config.render_aspect_ratio,
      pacing_profile: "standard",
      outro_cta_enabled: config.outro_enabled,
    },
    media: pickMediaFields(episode),
    episode,
    quizShort: null,
  };
}

export function quizProductViewFromQuizShort(quizShort: QuizShort): QuizProductView {
  const config = quizShort.quiz_config;
  return {
    kind: "quiz_short",
    ref: { kind: "quiz_short", channel_id: quizShort.channel_id, product_id: quizShort.quiz_short_id },
    id: quizShort.quiz_short_id,
    slug: quizShort.slug,
    topic: quizShort.topic,
    stage: quizShort.stage,
    quiz_config: {
      ...config,
      render_aspect_ratio: config.render_aspect_ratio,
      pacing_profile: config.pacing_profile,
      // Quiz Shorts never carry intro or outro bookends; the CTA clip is the only closing beat.
      intro_enabled: false,
      outro_enabled: false,
    },
    media: pickMediaFields(quizShort),
    episode: null,
    quizShort,
  };
}

export async function loadQuizProductView(repository: RepositoryService, ref: QuizProductRef): Promise<QuizProductView> {
  if (ref.kind === "episode") return quizProductViewFromEpisode(await repository.getEpisode(ref.channel_id, ref.product_id));
  return quizProductViewFromQuizShort(await repository.getQuizShort(ref.channel_id, ref.product_id));
}

/**
 * Pipeline inputs keep `channelId` + `episodeId` for every existing Episode call site. The
 * explicit `product` ref wins when present; otherwise the kind follows the id prefix.
 */
export function resolvePipelineProductRef(input: { channelId: string; episodeId: string; product?: QuizProductRef }): QuizProductRef {
  return input.product ?? toQuizProductRef(input.channelId, input.episodeId);
}

export async function loadPipelineProductView(input: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  product?: QuizProductRef;
}): Promise<QuizProductView> {
  return loadQuizProductView(input.repository, resolvePipelineProductRef(input));
}
