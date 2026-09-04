import { resolveChannelMascotPlacement, type Channel, type SandboxPreviewRequest } from "@studio/shared";
import type { EpisodePreviewQuestion } from "../types/episodePreview.types";
import type { EpisodeStyleOverride, ResolvedEpisodePreviewStyle } from "../types/episodeStylePreview.types";

type BuildEpisodePreviewRequestInput = {
  channel: Channel;
  override: EpisodeStyleOverride;
  resolved: ResolvedEpisodePreviewStyle;
  question?: EpisodePreviewQuestion | null;
  styleCatalogRevision?: string;
  aspectRatio?: "16:9" | "9:16";
};

export function buildEpisodePreviewRequest(input: BuildEpisodePreviewRequestInput): SandboxPreviewRequest {
  const aspectRatio = input.aspectRatio ?? "16:9";
  return {
    ...buildStyleRequest(input),
    ...buildQuestionRequest(input),
    ...buildMascotRequest(input.channel, aspectRatio),
    aspect_ratio: aspectRatio,
    style_catalog_revision: input.styleCatalogRevision,
  };
}

function buildStyleRequest({ override, resolved }: BuildEpisodePreviewRequestInput): SandboxPreviewRequest {
  return {
    theme: override.theme ?? resolved.theme,
    palette_id: override.paletteId ?? resolved.paletteId,
    thinking_bar_style: override.thinkingBarStyle ?? resolved.thinkingBarStyle,
    question_box_style: override.questionBoxStyle ?? resolved.questionBoxStyle,
    answer_card_style: override.answerCardStyle ?? resolved.answerCardStyle,
    counter_style: override.counterStyle ?? resolved.counterStyle,
    background_style: override.backgroundStyle ?? resolved.backgroundStyle,
    channel_brand_name: override.channelBrandName ?? resolved.channelBrandName,
  };
}

function buildQuestionRequest({ override, question, resolved }: BuildEpisodePreviewRequestInput): SandboxPreviewRequest {
  return {
    layout_id: question?.layoutId ?? "media_left_choices_right",
    question_format: question?.questionFormat,
    archetype: question?.archetype,
    phase: "choices",
    question_text: question?.text,
    choices: question?.choices,
    correct_choice_index: question?.correctChoiceIndex,
    question_number: question?.number ?? 1,
    total_questions: override.totalQuestions ?? question?.totalQuestions ?? resolved.totalQuestions,
    fact_card_text: question?.factText,
  };
}

function buildMascotRequest(channel: Channel, aspectRatio: "16:9" | "9:16" = "16:9"): SandboxPreviewRequest {
  const config = channel.mascot_config;
  const placement = resolveChannelMascotPlacement(config, aspectRatio);
  return {
    mascot_id: channel.mascot_id && channel.mascot_id !== "none" ? channel.mascot_id : undefined,
    mascot_enabled: config?.enabled ?? false,
    mascot_position: placement.position,
    mascot_scale: placement.scale,
    mascot_offset_x: placement.offset_x,
    mascot_offset_y: placement.offset_y,
    mascot_flip_x: placement.flip_x,
    mascot_show_in_intro: config?.show_in_intro,
    mascot_show_in_outro: config?.show_in_outro,
    mascot_show_in_question: config?.show_in_question,
  };
}
