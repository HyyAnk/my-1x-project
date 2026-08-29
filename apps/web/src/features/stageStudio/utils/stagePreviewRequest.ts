import type { Channel, MascotActionType, MascotProfile, SandboxPreviewRequest } from "@studio/shared";
import type { StagePosition, StageQuestionLayout, StageReactionStyle, StageScenarioPhase } from "../types";
import { stageBackgroundPhase, stageBackgroundTime } from "./stageTimeline";

export type StagePreviewRequestInput = {
  targetChannel: Channel | null;
  aspectRatio?: "16:9" | "9:16";
  questionLayoutId: StageQuestionLayout;
  activeMascot: MascotProfile | null;
  selectedMascotId: string | null;
  position: StagePosition;
  scale: number;
  offsetX: number;
  offsetY: number;
  flipHorizontal: boolean;
  scenarioPhase: StageScenarioPhase;
  activePose: MascotActionType;
  reactionStyle: StageReactionStyle;
  mascotPreviewTime: number;
  isPlaying: boolean;
  showInIntro: boolean;
  showInOutro: boolean;
  showInQuestion: boolean;
};

export function buildStagePreviewRequest(input: StagePreviewRequestInput): SandboxPreviewRequest {
  return {
    aspect_ratio: input.aspectRatio ?? "16:9",
    theme: "candy_arcade",
    palette_id: input.targetChannel?.default_palette_id || "lime",
    layout_id: input.questionLayoutId,
    thinking_bar_style: input.targetChannel?.default_thinking_bar_style || "star_slider",
    question_box_style: input.targetChannel?.default_question_box_style || "candy_pop",
    answer_card_style: "glossy_arcade",
    counter_style: input.targetChannel?.default_counter_style || "hanging_woodsign",
    phase: stageBackgroundPhase(input.scenarioPhase),
    timeline_time_seconds: stageBackgroundTime(input.scenarioPhase),
    mascot_enabled: Boolean(input.selectedMascotId && input.activeMascot),
    mascot_id: input.selectedMascotId,
    mascot_position: input.position,
    mascot_scale: input.scale,
    mascot_offset_x: input.offsetX,
    mascot_offset_y: input.offsetY,
    mascot_flip_x: input.flipHorizontal,
    mascot_phase: input.scenarioPhase,
    mascot_action: input.activePose,
    mascot_reveal_outcome: input.reactionStyle === "celebrate" ? "correct" : "wrong",
    mascot_timeline_time_seconds: input.mascotPreviewTime,
    mascot_playing: input.isPlaying,
    mascot_show_in_intro: input.showInIntro,
    mascot_show_in_outro: input.showInOutro,
    mascot_show_in_question: input.showInQuestion,
  };
}
