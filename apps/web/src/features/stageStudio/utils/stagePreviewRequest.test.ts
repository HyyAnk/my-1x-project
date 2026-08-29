import { describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import { buildStagePreviewRequest } from "./stagePreviewRequest";

const mascot = { id: "mascot-1" } as MascotProfile;

describe("Stage Studio preview request", () => {
  it("sends the complete canonical mascot contract state to the shared preview renderer", () => {
    const request = buildStagePreviewRequest({
      targetChannel: null,
      questionLayoutId: "media_left_choices_right",
      activeMascot: mascot,
      selectedMascotId: mascot.id,
      position: "bottom_right",
      scale: 1.84,
      offsetX: 21,
      offsetY: 90,
      flipHorizontal: true,
      scenarioPhase: "reveal",
      activePose: "oops",
      reactionStyle: "oops",
      mascotPreviewTime: 10,
      isPlaying: false,
      showInIntro: false,
      showInOutro: true,
      showInQuestion: true,
    });

    expect(request).toMatchObject({
      mascot_id: "mascot-1",
      mascot_position: "bottom_right",
      mascot_scale: 1.84,
      mascot_offset_x: 21,
      mascot_offset_y: 90,
      mascot_flip_x: true,
      mascot_phase: "reveal",
      mascot_action: "oops",
      mascot_reveal_outcome: "wrong",
      mascot_timeline_time_seconds: 10,
      mascot_playing: false,
      mascot_show_in_intro: false,
      mascot_show_in_outro: true,
      mascot_show_in_question: true,
    });
  });
});
