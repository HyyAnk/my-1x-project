import { describe, expect, it } from "vitest";
import { isSequenceOutputFailure, normalizeQuizBeatMetadata, parseBeatsOutput, planSequenceResume } from "../src/tasks.js";

describe("sequence retry planning", () => {
  it("classifies malformed shot-plan JSON as retryable", () => {
    expect(() => parseBeatsOutput('[{"dialogue":"Opening",}]')).toThrow("Shot-plan JSON output malformed");
    expect(isSequenceOutputFailure("Shot-plan JSON output malformed: Expected double-quoted property name")).toBe(true);
  });

  it("canonicalizes quiz answer labels and prefixes to the visible choice text", () => {
    const beats = parseBeatsOutput(
      JSON.stringify([
        {
          dialogue: "The answer is ready.",
          visual_prompt: "CAMERA\nCard\nACTION\nChoices appear\nLIGHTING\nSoft\nATMOSPHERE\nBright\nCONTINUITY\nQuiz palette",
          quiz: {
            phase: "question",
            question_number: 1,
            question: "Which lever?",
            choices: ["A. Lever", "B. Inclined plane", "C. Pulley"],
            answer: "The correct answer is B — Inclined plane",
            explanation: "It changes force direction.",
          },
        },
      ]),
    );

    expect(beats[0].quiz?.choices).toEqual(["Lever", "Inclined plane", "Pulley"]);
    expect(beats[0].quiz?.answer).toBe("Inclined plane");
  });

  it("repairs repeated quiz beats that omit or corrupt redundant answer metadata", () => {
    const beats = parseBeatsOutput(
      JSON.stringify([
        {
          dialogue: "Question.",
          visual_prompt: "CAMERA\nA\nACTION\nB\nLIGHTING\nC\nATMOSPHERE\nD\nCONTINUITY\nE",
          quiz: {
            phase: "question",
            question_number: 1,
            question: "Which lever?",
            choices: ["Lever", "Inclined plane", "Pulley"],
            answer: "Inclined plane",
            explanation: "It changes force direction.",
          },
        },
        {
          dialogue: "Reveal.",
          visual_prompt: "CAMERA\nA2\nACTION\nB2\nLIGHTING\nC2\nATMOSPHERE\nD2\nCONTINUITY\nE2",
          quiz: {
            phase: "reveal",
            question_number: 1,
            question: "Which lever?",
            choices: ["Wrong choice", "Another choice"],
            answer: "Option C",
            explanation: "",
          },
        },
      ]),
    );

    const normalized = normalizeQuizBeatMetadata(beats);
    expect(normalized[1].quiz?.choices).toEqual(["Lever", "Inclined plane", "Pulley"]);
    expect(normalized[1].quiz?.answer).toBe("Inclined plane");
    expect(normalized[1].quiz?.explanation).toBe("It changes force direction.");
    expect(normalized[0].source_ids).toEqual(["C01"]);
    expect(normalized[1].source_ids).toEqual(["C01"]);
  });

  it("populates fallback source_ids for quiz beats lacking source_ids to pass quality gate", () => {
    const rawBeats = parseBeatsOutput(
      JSON.stringify([
        {
          dialogue: "Welcome to the quiz!",
          sequence_id: "sequence-1",
          visual_prompt: "CAMERA\nA\nACTION\nB\nLIGHTING\nC\nATMOSPHERE\nD\nCONTINUITY\nE",
          continuity_bundle_id: "CB-01",
          continuity_note: "Fix theme",
          quiz: { phase: "intro", question_number: null },
        },
        {
          dialogue: "Which planet is red?",
          sequence_id: "sequence-1",
          visual_prompt: "CAMERA\nA2\nACTION\nB2\nLIGHTING\nC2\nATMOSPHERE\nD2\nCONTINUITY\nE2",
          continuity_bundle_id: "CB-01",
          continuity_note: "Fix theme",
          quiz: {
            phase: "question",
            question_number: 1,
            question: "Which planet is red?",
            choices: ["Mars", "Venus", "Jupiter"],
            answer: "Mars",
            explanation: "Mars has iron oxide.",
          },
        },
      ]),
    );

    expect(rawBeats[0].source_ids).toEqual([]);
    expect(rawBeats[1].source_ids).toEqual([]);

    const normalized = normalizeQuizBeatMetadata(rawBeats);
    expect(normalized[0].source_ids).toEqual(["C01"]);
    expect(normalized[1].source_ids).toEqual(["C01"]);
  });

  it("reuses fresh sequence drafts and queues only missing sequences", () => {
    const scriptModifiedAt = "2026-08-20T10:00:00.000Z";
    const plan = planSequenceResume(
      4,
      [
        { sequenceNumber: 1, modified_at: "2026-08-20T10:00:01.000Z" },
        { sequenceNumber: 2, modified_at: "2026-08-20T10:00:02.000Z" },
      ],
      scriptModifiedAt,
      false,
    );

    expect(plan).toEqual({ shouldClearDrafts: false, reusedSequenceNumbers: [1, 2], pendingSequenceNumbers: [3, 4] });
  });

  it("invalidates every draft when an upstream artifact changed or a draft is stale", () => {
    const scriptModifiedAt = "2026-08-20T10:00:00.000Z";
    expect(planSequenceResume(3, [{ sequenceNumber: 1, modified_at: "2026-08-20T09:59:59.000Z" }], scriptModifiedAt, false)).toEqual({
      shouldClearDrafts: true,
      reusedSequenceNumbers: [],
      pendingSequenceNumbers: [1, 2, 3],
    });
    expect(planSequenceResume(3, [{ sequenceNumber: 1, modified_at: "2026-08-20T10:00:01.000Z" }], scriptModifiedAt, true)).toEqual({
      shouldClearDrafts: true,
      reusedSequenceNumbers: [],
      pendingSequenceNumbers: [1, 2, 3],
    });
    expect(
      planSequenceResume(
        2,
        [
          { sequenceNumber: 1, modified_at: "2026-08-20T10:00:01.000Z" },
          { sequenceNumber: 3, modified_at: "2026-08-20T10:00:02.000Z" },
        ],
        scriptModifiedAt,
        false,
      ),
    ).toEqual({ shouldClearDrafts: true, reusedSequenceNumbers: [], pendingSequenceNumbers: [1, 2] });
  });
});
