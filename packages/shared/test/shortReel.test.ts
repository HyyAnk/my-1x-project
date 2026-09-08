import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import { BankQuestionSchema } from "../src/index.js";
import {
  ShortReelRecordSchema,
  ReelScriptSchema,
  ReelSegmentSchema,
  TextCueSchema,
  ShortReelSourceSnapshotSchema,
  ShortReelEditCommandSchema,
  validateReelScript,
  calculateScriptTotalDuration,
  calculateCumulativeTimings,
  createSourceSnapshot,
  createInitialShortReel,
  type ReelScript,
  type ReelSegment,
} from "../src/shortReel/index.js";

type TestCallback = () => void | Promise<void>;

const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};

const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

export const validBankQuestionVersus = BankQuestionSchema.parse({
  id: "test-reel-versus-001",
  archetype_id: "versus_faceoff",
  domain_id: "vehicles_technology",
  subtopic_id: "motion",
  language: "English",
  question: "Over the same distance, which finishes first: 20 km/h or 10 km/h?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "20 km/h", is_correct: true },
    { id: "B", text: "10 km/h", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "For the same distance at constant speed, the higher speed takes less time.",
  age_band: "family",
  status: "approved",
});

export const validBankQuestionTrivia = BankQuestionSchema.parse({
  id: "test-reel-trivia-001",
  archetype_id: "deep_trivia",
  domain_id: "science_nature",
  subtopic_id: "astronomy",
  language: "English",
  question: "Which celestial body has the strongest gravitational pull in our solar system?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "The Sun", is_correct: true },
    { id: "B", text: "Jupiter", is_correct: false },
    { id: "C", text: "Saturn", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "The Sun contains 99.8% of the mass of the solar system, yielding the highest gravity.",
  age_band: "family",
  status: "approved",
});

function createValidScript(): ReelScript {
  const seg1: ReelSegment = {
    index: 1,
    mode: "generate",
    duration_seconds: 8,
    narrative: "Two race vehicles line up at the starting line, engines revving as the question appears.",
    text_cues: [
      {
        role: "question",
        text: "Over the same distance, which finishes first: 20 km/h or 10 km/h?",
        start_seconds: 0.5,
        end_seconds: 5.5,
      },
    ],
    audio_direction: "Upbeat electronic countdown tension.",
    start_state: {
      character_identity: "Novy the mascot",
      position: "left side flag position",
      action: "holding starting flag",
      camera: "wide tracking shot",
      environment: "futuristic neon racetrack",
      props: ["starting flag", "neon banner"],
      visible_text: ["Over the same distance, which finishes first: 20 km/h or 10 km/h?"],
      revealed_facts: [],
    },
    end_state: {
      character_identity: "Novy the mascot",
      position: "left side flag position",
      action: "dropping starting flag",
      camera: "wide tracking shot",
      environment: "futuristic neon racetrack",
      props: ["starting flag", "neon banner"],
      visible_text: ["Over the same distance, which finishes first: 20 km/h or 10 km/h?"],
      revealed_facts: [],
    },
  };

  const seg2: ReelSegment = {
    index: 2,
    mode: "extend",
    duration_seconds: 9,
    narrative: "The 20 km/h speeder pulls ahead while the 10 km/h vehicle steadily trails behind.",
    text_cues: [
      {
        role: "supporting",
        text: "Speed determines transit time over equal distance!",
        start_seconds: 1,
        end_seconds: 6,
      },
    ],
    audio_direction: "Whooshing acceleration and ticking clock sound effect.",
    start_state: {
      character_identity: "Novy the mascot",
      position: "left side flag position",
      action: "pointing toward leader vehicle",
      camera: "side tracking speed shot",
      environment: "futuristic neon racetrack",
      props: ["starting flag", "neon banner"],
      visible_text: ["Over the same distance, which finishes first: 20 km/h or 10 km/h?"],
      revealed_facts: [],
    },
    end_state: {
      character_identity: "Novy the mascot",
      position: "finish line observation tower",
      action: "watching finish gate",
      camera: "high angle finish overview",
      environment: "futuristic neon racetrack",
      props: ["finish line sensor"],
      visible_text: [],
      revealed_facts: ["20 km/h vehicle arrives first"],
    },
  };

  const seg3: ReelSegment = {
    index: 3,
    mode: "extend",
    duration_seconds: 10,
    narrative: "The 20 km/h vehicle crosses the finish line triumphantly and the canonical answer is confirmed.",
    text_cues: [
      {
        role: "answer",
        text: "20 km/h",
        start_seconds: 0.5,
        end_seconds: 5.5,
      },
      {
        role: "supporting",
        text: "For the same distance at constant speed, the higher speed takes less time.",
        start_seconds: 6,
        end_seconds: 9.5,
      },
    ],
    audio_direction: "Celebratory chime fanfare and conclusive resolution chord.",
    start_state: {
      character_identity: "Novy the mascot",
      position: "finish line observation tower",
      action: "raising trophy for winner",
      camera: "dynamic hero celebration shot",
      environment: "futuristic neon racetrack",
      props: ["finish line sensor"],
      visible_text: [],
      revealed_facts: ["20 km/h vehicle arrives first"],
    },
    end_state: {
      character_identity: "Novy the mascot",
      position: "finish line podium",
      action: "waving to audience",
      camera: "centered celebration framing",
      environment: "futuristic neon racetrack",
      props: ["trophy"],
      visible_text: ["20 km/h"],
      revealed_facts: ["20 km/h vehicle arrives first", "higher speed takes less time"],
    },
  };

  return { segments: [seg1, seg2, seg3] };
}

describe("Short-Reel Schema Behavioral Tests (Phase 02)", () => {
  describe("SC-01: Draft acceptance and segment count validation", () => {
    it("accepts a newly created draft without a script", () => {
      const source = createSourceSnapshot(validBankQuestionVersus);
      const draft = createInitialShortReel({
        channel_id: "ch_test_01",
        topic: {
          topic_id: "top_001",
          channel_id: "ch_test_01",
          title: "Speed Challenge: 20 vs 10 km/h",
          premise: "Two speeders race across equal distance",
          hook: "Can you guess which one arrives first?",
          origin: "keyword",
        },
        source,
      });

      const parsed = ShortReelRecordSchema.parse(draft);
      assert.equal(parsed.script, null);
      assert.equal(parsed.aspect_ratio, "9:16");
      assert.equal(parsed.revision, 1);
      assert.equal(parsed.units.script.state, "missing");
    });

    it("rejects malformed scripts with 0, 2, or 4 segments", () => {
      const script = createValidScript();

      // 0 segments
      assert.throws(() => {
        ReelScriptSchema.parse({ segments: [] });
      });

      // 2 segments
      assert.throws(() => {
        ReelScriptSchema.parse({ segments: [script.segments[0], script.segments[1]] });
      });

      // 4 segments
      assert.throws(() => {
        ReelScriptSchema.parse({
          segments: [script.segments[0], script.segments[1], script.segments[2], script.segments[2]],
        });
      });

      // Exactly 3 segments passes
      const valid = ReelScriptSchema.parse(script);
      assert.equal(valid.segments.length, 3);
    });
  });

  describe("SC-02: Segment index and mode contract enforcement", () => {
    it("rejects duplicate index 1 or non-generate mode at index 1", () => {
      const script = createValidScript();

      // Duplicate index 1
      assert.throws(() => {
        ReelScriptSchema.parse({
          segments: [script.segments[0], { ...script.segments[1], index: 1 as const }, script.segments[2]],
        });
      });

      // Mode extend at index 1
      assert.throws(() => {
        ReelScriptSchema.parse({
          segments: [{ ...script.segments[0], mode: "extend" as const }, script.segments[1], script.segments[2]],
        });
      });

      // Mode generate at index 2
      assert.throws(() => {
        ReelScriptSchema.parse({
          segments: [script.segments[0], { ...script.segments[1], mode: "generate" as const }, script.segments[2]],
        });
      });
    });
  });

  describe("SC-03: Duration constraints and cue boundary validation", () => {
    it("rejects durations outside [8, 10], NaN, and Infinity", () => {
      const script = createValidScript();

      assert.throws(() => {
        ReelSegmentSchema.parse({ ...script.segments[0], duration_seconds: 7.9 });
      });

      assert.throws(() => {
        ReelSegmentSchema.parse({ ...script.segments[0], duration_seconds: 10.1 });
      });

      assert.throws(() => {
        ReelSegmentSchema.parse({ ...script.segments[0], duration_seconds: Number.NaN });
      });

      assert.throws(() => {
        ReelSegmentSchema.parse({ ...script.segments[0], duration_seconds: Number.POSITIVE_INFINITY });
      });
    });

    it("rejects negative cue start, start >= end, and end > duration", () => {
      // Negative start
      assert.throws(() => {
        TextCueSchema.parse({
          role: "question",
          text: "What is this?",
          start_seconds: -1,
          end_seconds: 4,
        });
      });

      // start == end
      assert.throws(() => {
        TextCueSchema.parse({
          role: "question",
          text: "What is this?",
          start_seconds: 3,
          end_seconds: 3,
        });
      });

      // end beyond segment duration in segment schema
      assert.throws(() => {
        ReelSegmentSchema.parse({
          ...createValidScript().segments[0],
          duration_seconds: 8,
          text_cues: [
            {
              role: "question",
              text: "Question text",
              start_seconds: 2,
              end_seconds: 8.5,
            },
          ],
        });
      });
    });

    it("accepts durations 8, 9, 10 and derives total duration to 27", () => {
      const script = createValidScript();
      script.segments[0].duration_seconds = 8;
      script.segments[1].duration_seconds = 9;
      script.segments[2].duration_seconds = 10;

      const valid = ReelScriptSchema.parse(script);
      const totalDuration = calculateScriptTotalDuration(valid);
      assert.equal(totalDuration, 27);

      const timings = calculateCumulativeTimings(valid);
      assert.deepEqual(timings, [
        { segment_index: 1, start: 0, end: 8 },
        { segment_index: 2, start: 8, end: 17 },
        { segment_index: 3, start: 17, end: 27 },
      ]);
    });
  });

  describe("SC-04: Source snapshot validation and fidelity", () => {
    it("creates a source snapshot with correct answer derived from correct choice", () => {
      const snapshot = createSourceSnapshot(validBankQuestionVersus);
      assert.equal(snapshot.question_id, "test-reel-versus-001");
      assert.equal(snapshot.archetype_id, "versus_faceoff");
      assert.equal(snapshot.selected_answer_text, "20 km/h");
      assert.equal(snapshot.choices.length, 2);
      assert.ok(snapshot.content_hash.length === 64);
    });

    it("rejects source missing correct choice, duplicate choices, or non-approved status", () => {
      // Missing correct choice
      assert.throws(() => {
        ShortReelSourceSnapshotSchema.parse({
          question_id: "q_bad",
          archetype_id: "versus_faceoff",
          question_text: "Bad question",
          choices: [
            { id: "A", text: "Choice A", is_correct: false },
            { id: "B", text: "Choice B", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "Explanation",
          selected_answer_text: "Choice A",
          source_language: "English",
          translation_provenance: "source",
          content_hash: "a".repeat(64),
          original_updated_at: null,
        });
      });

      // Duplicate choice IDs
      assert.throws(() => {
        ShortReelSourceSnapshotSchema.parse({
          question_id: "q_bad",
          archetype_id: "versus_faceoff",
          question_text: "Bad question",
          choices: [
            { id: "A", text: "Choice A", is_correct: true },
            { id: "A", text: "Choice duplicate", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "Explanation",
          selected_answer_text: "Choice A",
          source_language: "English",
          translation_provenance: "source",
          content_hash: "a".repeat(64),
          original_updated_at: null,
        });
      });

      // Unsupported archetype (e.g. multiple_choice_four)
      assert.throws(() => {
        ShortReelSourceSnapshotSchema.parse({
          question_id: "q_bad",
          archetype_id: "multiple_choice_four",
          question_text: "Bad question",
          choices: [
            { id: "A", text: "Choice A", is_correct: true },
            { id: "B", text: "Choice B", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "Explanation",
          selected_answer_text: "Choice A",
          source_language: "English",
          translation_provenance: "source",
          content_hash: "a".repeat(64),
          original_updated_at: null,
        });
      });
    });
  });

  describe("SC-05: Canonical question/answer cue fidelity and reveal ordering", () => {
    it("validates that canonical question and answer cues match source snapshot", () => {
      const source = createSourceSnapshot(validBankQuestionVersus);
      const script = createValidScript();

      const validation = validateReelScript(script, source);
      assert.equal(validation.valid, true);
      assert.equal(validation.errors.length, 0);
    });

    it("rejects modified question cue text or answer cue text", () => {
      const source = createSourceSnapshot(validBankQuestionVersus);
      const script = createValidScript();

      // Alter question text in cue
      script.segments[0].text_cues[0].text = "Which car is faster: 20 or 10?";
      const validation1 = validateReelScript(script, source);
      assert.equal(validation1.valid, false);
      assert.ok(validation1.errors.some((e) => e.includes("question text")));

      // Reset and alter answer text
      const script2 = createValidScript();
      script2.segments[2].text_cues[0].text = "10 km/h";
      const validation2 = validateReelScript(script2, source);
      assert.equal(validation2.valid, false);
      assert.ok(validation2.errors.some((e) => e.includes("answer text")));
    });

    it("rejects answer appearing before the question cue", () => {
      const source = createSourceSnapshot(validBankQuestionVersus);
      const script = createValidScript();

      // Move answer to segment 1 at 0.2s before question at 0.5s
      script.segments[0].text_cues.unshift({
        role: "answer",
        text: "20 km/h",
        start_seconds: 0.1,
        end_seconds: 0.4,
      });

      const validation = validateReelScript(script, source);
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some((e) => e.includes("before") || e.includes("reveal")));
    });
  });

  describe("SC-06: Continuity and strict edit command schema validation", () => {
    it("rejects unknown mutation fields in edit commands (strict mode)", () => {
      assert.throws(() => {
        ShortReelEditCommandSchema.parse({
          kind: "update_model_note",
          model_note: "Omni 1.1 Flash",
          extra_unauthorized_field: "injected",
        });
      });
    });

    it("validates continuity across adjacent segments", () => {
      const source = createSourceSnapshot(validBankQuestionVersus);
      const script = createValidScript();

      // Break character identity continuity from segment 1 to segment 2
      script.segments[1].start_state.character_identity = "Unknown stranger";
      const validation = validateReelScript(script, source);
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some((e) => e.includes("character_identity") || e.includes("Continuity")));
    });
  });
});
