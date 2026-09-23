import { describe, expect, it } from "vitest";
import type { ReelSegment } from "@studio/shared";
import {
  formatTimeSeconds,
  formatTimingRange,
  getSegmentsWithCumulativeTimings,
  formatFullScriptText,
  formatScriptDialogueOnly,
} from "./scriptText";

describe("scriptText utilities", () => {
  const mockSegments: ReelSegment[] = [
    {
      index: 1,
      mode: "generate",
      duration_seconds: 9,
      narrative: "Host opens with high energy on a sunlit lawn.",
      dialogue: "Can you guess which animal runs fastest?",
      audio_direction: "Upbeat energetic synth intro.",
      text_cues: [
        {
          role: "question",
          text: "Which animal runs fastest?",
          start_seconds: 1,
          end_seconds: 7,
        },
      ],
      start_state: {
        character_identity: "Host",
        position: "center",
        action: "waving",
        camera: "wide",
        environment: "lawn",
        props: [],
        visible_text: [],
        revealed_facts: [],
      },
      end_state: {
        character_identity: "Host",
        position: "center",
        action: "pointing",
        camera: "medium",
        environment: "lawn",
        props: [],
        visible_text: [],
        revealed_facts: [],
      },
    },
    {
      index: 2,
      mode: "extend",
      duration_seconds: 8,
      narrative: "Split screen comparing the cheetah and falcon.",
      dialogue: "Cheetah sprints at 70 mph while falcon dives at 200!",
      audio_direction: "Tense riser with ticking clock.",
      text_cues: [],
      start_state: {
        character_identity: "Host",
        position: "center",
        action: "pointing",
        camera: "medium",
        environment: "lawn",
        props: [],
        visible_text: [],
        revealed_facts: [],
      },
      end_state: {
        character_identity: "Host",
        position: "center",
        action: "waiting",
        camera: "medium",
        environment: "lawn",
        props: [],
        visible_text: [],
        revealed_facts: [],
      },
    },
    {
      index: 3,
      mode: "extend",
      duration_seconds: 8,
      narrative: "Final verdict reveals cheetah holds the land title.",
      audio_direction: "Triumphant victory chord.",
      text_cues: [
        {
          role: "answer",
          text: "Cheetah (70 mph)",
          start_seconds: 0.5,
          end_seconds: 6,
        },
      ],
      start_state: {
        character_identity: "Host",
        position: "center",
        action: "waiting",
        camera: "medium",
        environment: "lawn",
        props: [],
        visible_text: [],
        revealed_facts: [],
      },
      end_state: {
        character_identity: "Host",
        position: "center",
        action: "celebrating",
        camera: "close-up",
        environment: "lawn",
        props: [],
        visible_text: [],
        revealed_facts: [],
      },
    },
  ];

  it("formats seconds into MM:SS correctly", () => {
    expect(formatTimeSeconds(0)).toBe("0:00");
    expect(formatTimeSeconds(9)).toBe("0:09");
    expect(formatTimeSeconds(65)).toBe("1:05");
  });

  it("formats timing range correctly", () => {
    expect(formatTimingRange(0, 9)).toBe("0:00 - 0:09");
    expect(formatTimingRange(9, 17)).toBe("0:09 - 0:17");
  });

  it("computes cumulative segment timings accurately", () => {
    const timed = getSegmentsWithCumulativeTimings(mockSegments);
    expect(timed).toHaveLength(3);
    expect(timed[0].start).toBe(0);
    expect(timed[0].end).toBe(9);
    expect(timed[1].start).toBe(9);
    expect(timed[1].end).toBe(17);
    expect(timed[2].start).toBe(17);
    expect(timed[2].end).toBe(25);
  });

  it("formats full script text with title, hook, question, answer and all segments", () => {
    const text = formatFullScriptText(mockSegments, {
      topic: {
        topic_id: "top_1",
        channel_id: "ch_1",
        title: "Speed Duel",
        premise: "A duel of speed",
        hook: "Who is really the fastest animal?",
        origin: "discovery",
      },
      source: {
        fidelity: "complete",
        original_question: {} as never,
        question_id: "q_1",
        archetype_id: "versus_faceoff",
        question_text: "Which animal runs fastest?",
        selected_answer_text: "Cheetah",
        content_hash: "hash_1",
        choices: [],
        correct_choice_id: "A",
        explanation: "Cheetahs can reach up to 70 mph.",
        source_language: "en",
        translation_provenance: "source",
        original_updated_at: "2026-01-01",
      },
    });

    expect(text).toContain("TITLE: Speed Duel");
    expect(text).toContain("HOOK: Who is really the fastest animal?");
    expect(text).toContain("QUESTION: Which animal runs fastest?");
    expect(text).toContain("ANSWER: Cheetah");
    expect(text).toContain("TOTAL DURATION: 25s");
    expect(text).toContain("--- SEGMENT 1 (0:00 - 0:09 | 9s) ---");
    expect(text).toContain("[SPOKEN DIALOGUE]");
    expect(text).toContain('"Can you guess which animal runs fastest?"');
    expect(text).toContain("Host opens with high energy on a sunlit lawn.");
    expect(text).toContain('• [QUESTION] "Which animal runs fastest?" (1s - 7s)');
    expect(text).toContain("--- SEGMENT 3 (0:17 - 0:25 | 8s) ---");
    expect(text).toContain('• [ANSWER] "Cheetah (70 mph)" (0.5s - 6s)');
  });

  it("formats dialogue-only text correctly with fallback for visual-only segments", () => {
    const text = formatScriptDialogueOnly(mockSegments);
    expect(text).toContain("Segment 1 (0:00 - 0:09):");
    expect(text).toContain("Can you guess which animal runs fastest?");
    expect(text).toContain("Segment 2 (0:09 - 0:17):");
    expect(text).toContain("Cheetah sprints at 70 mph while falcon dives at 200!");
    expect(text).toContain("Segment 3 (0:17 - 0:25):");
    expect(text).toContain("(Visual only - no spoken dialogue)");
  });
});
