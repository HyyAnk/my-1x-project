import { vi } from "vitest";
import type { ReelScript } from "@studio/shared";
import { createMockChannel, createMockShortReel } from "./shortReelFixture";
import type { Notice } from "../../src/components/types";

export { createMockChannel, createMockShortReel };

export const createNoticeSpy = () => vi.fn<(notice: NonNullable<Notice>) => void>();

export function createMockScript(): ReelScript {
  return {
    segments: [
      {
        index: 1,
        mode: "generate",
        duration_seconds: 8,
        narrative: "Two animals line up at the starting mark, ready for a sprint duel.",
        text_cues: [
          {
            role: "question",
            text: "Which animal has the fastest recorded land sprint speed?",
            start_seconds: 0.5,
            end_seconds: 5.5,
          },
        ],
        audio_direction: "Upbeat electronic countdown tension.",
        start_state: {
          character_identity: "Novy",
          position: "center",
          action: "announcing",
          camera: "wide",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
        end_state: {
          character_identity: "Novy",
          position: "center",
          action: "dropping flag",
          camera: "wide",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
      },
      {
        index: 2,
        mode: "extend",
        duration_seconds: 9,
        narrative: "The cheetah explodes out of the gate, reaching peak acceleration in seconds.",
        text_cues: [
          {
            role: "supporting",
            text: "Cheetahs can hit 60 mph in under 3 seconds!",
            start_seconds: 1,
            end_seconds: 6,
          },
        ],
        audio_direction: "Dramatic whoosh sound effect.",
        start_state: {
          character_identity: "Novy",
          position: "left",
          action: "pointing right",
          camera: "side tracking",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
        end_state: {
          character_identity: "Novy",
          position: "left",
          action: "cheering",
          camera: "side tracking",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
      },
      {
        index: 3,
        mode: "extend",
        duration_seconds: 8.5,
        narrative: "Cheetah crosses the finish line ahead, confirming top sprint speed.",
        text_cues: [
          {
            role: "answer",
            text: "Answer: Cheetah sprints up to 70 mph!",
            start_seconds: 1,
            end_seconds: 6,
          },
        ],
        audio_direction: "Triumphant victory chords.",
        start_state: {
          character_identity: "Novy",
          position: "finish line",
          action: "waving flag",
          camera: "close-up",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
        end_state: {
          character_identity: "Novy",
          position: "finish line",
          action: "celebrating",
          camera: "close-up",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
      },
    ],
  };
}

export function createMockReadyUnits() {
  const script = createMockScript();
  return {
    references: {
      state: "ready" as const,
      last_accepted_payload: {
        references: [
          {
            asset_id: "ref-1",
            role: "mascot" as const,
            path: "refs/mascot.png",
            mime_type: "image/png",
            width: 1024,
            height: 1024,
            checksum: "abcdef123456",
          },
        ],
      },
      current_attempt: null,
    },
    script: {
      state: "ready" as const,
      last_accepted_payload: {
        script,
        compiled_prompts: ["Prompt 1 text", "Prompt 2 text", "Prompt 3 text"] as [string, string, string],
      },
      current_attempt: null,
    },
    cover: {
      state: "ready" as const,
      last_accepted_payload: {
        asset_id: "cover-1",
        path: "covers/cover.png",
        mime_type: "image/png",
        width: 1080 as const,
        height: 1920 as const,
        checksum: "fedcba654321",
      },
      current_attempt: null,
    },
    publishing: {
      state: "ready" as const,
      last_accepted_payload: {
        hook: "Who hits 60 mph fastest?",
        description: "Cheetah vs Greyhound speed comparison.",
        cta: "Subscribe for more nature facts!",
        hashtags: ["#animals", "#speed"],
      },
      current_attempt: null,
    },
  };
}
