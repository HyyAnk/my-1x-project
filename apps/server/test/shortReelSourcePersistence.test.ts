import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BankQuestionSchema,
  createSourceSnapshot,
  type ReelScript,
  type ShortReelSourceSnapshot,
  type ShortReelTopicSnapshot,
} from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { releaseWriterAdmission, resolveShortReelFile } from "../src/repository/shortReelStorage.js";

describe("ShortReelSourcePersistence Behavioral Tests (Stage A)", () => {
  let tempDir: string;
  let repo: RepositoryService;

  const sampleQuestion = BankQuestionSchema.parse({
    id: "bank-q-persist-001",
    archetype_id: "versus_faceoff",
    domain_id: "science",
    subtopic_id: "astronomy",
    language: "English",
    question: "Which celestial body is larger in diameter: Ganymede or Mercury?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Ganymede", is_correct: true },
      { id: "B", text: "Mercury", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Ganymede is 5,268 km in diameter, while Mercury is 4,879 km.",
    age_band: "family",
    status: "approved",
  });

  const replacementQuestion = BankQuestionSchema.parse({
    id: "bank-q-persist-002",
    archetype_id: "versus_faceoff",
    domain_id: "science",
    subtopic_id: "astronomy",
    language: "English",
    question: "Which planet has more confirmed moons: Saturn or Jupiter?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Saturn", is_correct: true },
      { id: "B", text: "Jupiter", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Saturn has 146 recognized moons compared to Jupiter's 95.",
    age_band: "family",
    status: "approved",
  });

  const sampleTopic: ShortReelTopicSnapshot = {
    topic_id: "topic-persist-001",
    channel_id: "ch_persist",
    title: "Ganymede vs Mercury Size Comparison",
    premise: "Comparing planetary moons and terrestrial planets",
    hook: "Which one has a larger diameter?",
    origin: "keyword",
  };

  function buildValidScript(questionText: string, answerText: string): ReelScript {
    const state1 = {
      character_identity: "Novy the mascot",
      position: "left side flag position",
      action: "holding starting flag",
      camera: "wide tracking shot",
      environment: "futuristic cosmic racetrack",
      props: ["starting flag", "neon banner"],
      visible_text: [questionText],
      revealed_facts: [],
    };

    const state2 = {
      character_identity: "Novy the mascot",
      position: "finish line observation tower",
      action: "watching finish gate",
      camera: "high angle finish overview",
      environment: "futuristic cosmic racetrack",
      props: ["finish line sensor"],
      visible_text: [],
      revealed_facts: ["leading candidate pulls ahead"],
    };

    const state3 = {
      character_identity: "Novy the mascot",
      position: "finish line observation tower",
      action: "raising victory banner",
      camera: "dynamic hero celebration shot",
      environment: "futuristic cosmic racetrack",
      props: ["trophy banner"],
      visible_text: [answerText],
      revealed_facts: ["winner confirmed"],
    };

    return {
      segments: [
        {
          index: 1,
          mode: "generate",
          duration_seconds: 8,
          narrative: "Two celestial bodies are presented side-by-side as the question appears.",
          text_cues: [
            {
              role: "question",
              text: questionText,
              start_seconds: 0.5,
              end_seconds: 5.5,
            },
          ],
          audio_direction: "Upbeat electronic tension theme.",
          start_state: state1,
          end_state: state1,
        },
        {
          index: 2,
          mode: "extend",
          duration_seconds: 9,
          narrative: "The comparison scales fluctuate as planetary statistics are evaluated.",
          text_cues: [
            {
              role: "supporting",
              text: "Evaluating diameters across the solar system!",
              start_seconds: 1,
              end_seconds: 6,
            },
          ],
          audio_direction: "Whooshing acceleration and ticking clock sound effect.",
          start_state: state1,
          end_state: state2,
        },
        {
          index: 3,
          mode: "extend",
          duration_seconds: 10,
          narrative: "The final measurements lock in and the canonical answer is confirmed.",
          text_cues: [
            {
              role: "answer",
              text: answerText,
              start_seconds: 0.5,
              end_seconds: 5.5,
            },
          ],
          audio_direction: "Celebratory chime fanfare and resolution chord.",
          start_state: state2,
          end_state: state3,
        },
      ],
    };
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "reel-source-persist-"));
    await mkdir(path.join(tempDir, "templates"), { recursive: true });
    await writeFile(
      path.join(tempDir, "templates", "example_channel_dna.md"),
      "# Channel DNA\n\n## Channel Identity\n\n- Channel name: \n",
      "utf8",
    );
    await writeFile(path.join(tempDir, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    repo = new RepositoryService(tempDir);
    await repo.ensureBootstrap();
  });

  afterEach(async () => {
    await releaseWriterAdmission(tempDir);
    await rm(tempDir, { recursive: true, force: true });
  });

  async function createChannelAndReel() {
    const channel = await repo.createChannel({
      name: "Persistence Test Channel",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });

    const topic = { ...sampleTopic, channel_id: channel.channel_id };
    const source = createSourceSnapshot(sampleQuestion);
    const created = await repo.createShortReel(channel.channel_id, topic, source, "req-create-001");
    return { channel, reel: created, source };
  }

  it("rejects script update with drifting answer cue without altering disk bytes or revision", async () => {
    const { channel, reel } = await createChannelAndReel();
    const key = { channel_id: channel.channel_id, reel_id: reel.reel_id };
    const before = await repo.getShortReel(key);

    const validScript = buildValidScript(sampleQuestion.question, "Ganymede");
    const changed = structuredClone(validScript);
    changed.segments[2].text_cues.find((cue) => cue.role === "answer")!.text = "Wrong answer";

    await expect(
      repo.updateShortReel(
        key,
        {
          expected_revision: before.revision,
          request_id: "reject-answer-drift",
        },
        { kind: "update_script", script: changed },
      ),
    ).rejects.toMatchObject({ code: "INVALID_SCRIPT" });

    // State on disk and in memory remains 100% identical to before
    const after = await repo.getShortReel(key);
    expect(after).toEqual(before);
    expect(after.revision).toBe(before.revision);
    expect(after.script).toBeNull();
  });

  it("rejects script update with drifting question cue without altering disk bytes or revision", async () => {
    const { channel, reel } = await createChannelAndReel();
    const key = { channel_id: channel.channel_id, reel_id: reel.reel_id };
    const before = await repo.getShortReel(key);

    const validScript = buildValidScript(sampleQuestion.question, "Ganymede");
    const changed = structuredClone(validScript);
    changed.segments[0].text_cues.find((cue) => cue.role === "question")!.text = "Drifted question text?";

    await expect(
      repo.updateShortReel(
        key,
        {
          expected_revision: before.revision,
          request_id: "reject-question-drift",
        },
        { kind: "update_script", script: changed },
      ),
    ).rejects.toMatchObject({ code: "INVALID_SCRIPT" });

    const after = await repo.getShortReel(key);
    expect(after).toEqual(before);
    expect(after.revision).toBe(before.revision);
  });

  it("rejects segment update with drifting cue without altering disk bytes or revision", async () => {
    const { channel, reel } = await createChannelAndReel();
    const key = { channel_id: channel.channel_id, reel_id: reel.reel_id };
    const validScript = buildValidScript(sampleQuestion.question, "Ganymede");

    // Set valid script first
    const withScript = await repo.updateShortReel(
      key,
      {
        expected_revision: 1,
        request_id: "set-valid-script",
      },
      { kind: "update_script", script: validScript },
    );
    expect(withScript.revision).toBe(2);

    const before = await repo.getShortReel(key);
    const driftedSegment3 = structuredClone(validScript.segments[2]);
    driftedSegment3.text_cues.find((c) => c.role === "answer")!.text = "Drifted answer";

    await expect(
      repo.updateShortReel(
        key,
        {
          expected_revision: 2,
          request_id: "reject-segment-drift",
        },
        { kind: "update_segment", segment_index: 3, segment: driftedSegment3 },
      ),
    ).rejects.toMatchObject({ code: "INVALID_SCRIPT" });

    const after = await repo.getShortReel(key);
    expect(after).toEqual(before);
    expect(after.revision).toBe(2);
  });

  it("preserves stale prior payload after source replacement as historical work without rejecting record", async () => {
    const { channel, reel } = await createChannelAndReel();
    const key = { channel_id: channel.channel_id, reel_id: reel.reel_id };
    const validScript = buildValidScript(sampleQuestion.question, "Ganymede");

    // 1. Save valid script for Ganymede question
    const withScript = await repo.updateShortReel(
      key,
      {
        expected_revision: 1,
        request_id: "set-initial-script",
      },
      { kind: "update_script", script: validScript },
    );
    expect(withScript.units.script.state).toBe("ready");
    expect(withScript.units.script.last_accepted_payload?.script).toEqual(validScript);

    // 2. Replace source with new question (Saturn vs Jupiter)
    const newSource = createSourceSnapshot(replacementQuestion);
    const afterReplacement = await repo.updateShortReel(
      key,
      {
        expected_revision: 2,
        request_id: "replace-source-q",
      },
      { kind: "replace_source_question", source: newSource },
    );

    expect(afterReplacement.revision).toBe(3);
    expect(afterReplacement.source.question_id).toBe("bank-q-persist-002");
    expect(afterReplacement.script).toBeNull();
    // Script unit is now stale, but its last_accepted_payload is PRESERVED
    expect(afterReplacement.units.script.state).toBe("stale");
    expect(afterReplacement.units.script.last_accepted_payload?.script).toEqual(validScript);

    // 3. Re-read from a fresh repository instance to verify persistent integrity
    await repo.close();
    const freshRepo = new RepositoryService(tempDir);
    await freshRepo.ensureBootstrap();

    const readBack = await freshRepo.getShortReel(key);
    expect(readBack.source.question_id).toBe("bank-q-persist-002");
    expect(readBack.source.selected_answer_text).toBe("Saturn");
    expect(readBack.units.script.state).toBe("stale");
    expect(readBack.units.script.last_accepted_payload?.script.segments[2].text_cues[0].text).toBe("Ganymede");

    await freshRepo.close();
  });

  it("create -> update -> new process read verifies original source, IDs, and content hash remain unchanged", async () => {
    const { channel, reel, source } = await createChannelAndReel();
    const key = { channel_id: channel.channel_id, reel_id: reel.reel_id };
    const validScript = buildValidScript(sampleQuestion.question, "Ganymede");

    const originalHash = source.content_hash;
    const originalQuestionId = source.original_question.id;
    const originalCorrectChoiceId = source.original_question.correct_choice_id;

    // Apply multiple valid updates
    await repo.updateShortReel(
      key,
      { expected_revision: 1, request_id: "note-update" },
      { kind: "update_model_note", model_note: "Model note v1" },
    );

    await repo.updateShortReel(key, { expected_revision: 2, request_id: "script-update" }, { kind: "update_script", script: validScript });

    await repo.close();

    // Fresh repository adapter simulating a distinct process
    const freshRepo = new RepositoryService(tempDir);
    await freshRepo.ensureBootstrap();

    const finalRecord = await freshRepo.getShortReel(key);
    expect(finalRecord.revision).toBe(3);
    expect(finalRecord.source.content_hash).toBe(originalHash);
    expect(finalRecord.source.original_question.id).toBe(originalQuestionId);
    expect(finalRecord.source.original_question.correct_choice_id).toBe(originalCorrectChoiceId);
    expect(finalRecord.source.selected_answer_text).toBe("Ganymede");
    expect(finalRecord.source.question_text).toBe(sampleQuestion.question);

    await freshRepo.close();
  });

  it("rejects forged source replacement at repository boundary and preserves original record (A-R02)", async () => {
    const { channel, reel, source } = await createChannelAndReel();
    const key = { channel_id: channel.channel_id, reel_id: reel.reel_id };

    // Attempt to forge: change projected correct choice to B and hash to 64 zeroes
    const forgedSource: ShortReelSourceSnapshot = {
      ...source,
      correct_choice_id: "B",
      selected_answer_text: "Mercury",
      choices: [
        { id: "A", text: "Ganymede", is_correct: false },
        { id: "B", text: "Mercury", is_correct: true },
      ],
      content_hash: "0".repeat(64),
    };

    await expect(
      repo.updateShortReel(
        key,
        { expected_revision: 1, request_id: "forged-source-req" },
        { kind: "replace_source_question", source: forgedSource },
      ),
    ).rejects.toThrow();

    // Verify record remains untouched at revision 1
    const untouched = await repo.getShortReel(key);
    expect(untouched.revision).toBe(1);
    expect(untouched.source.correct_choice_id).toBe("A");
    expect(untouched.source.selected_answer_text).toBe("Ganymede");
    expect(untouched.source.content_hash).toBe(source.content_hash);
  });

  it("safely loads and preserves legacy v1 records lacking original_question (A-R03)", async () => {
    const channel = await repo.createChannel({
      name: "Legacy Records Channel",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });

    const legacyReelId = "sreel_legacy_001";
    const legacyRecord = {
      schema_version: 1,
      reel_id: legacyReelId,
      channel_id: channel.channel_id,
      topic_id: "topic-legacy-001",
      topic: {
        topic_id: "topic-legacy-001",
        channel_id: channel.channel_id,
        title: "Legacy Topic",
        premise: "Testing legacy draft preservation",
        hook: "Hook",
        origin: "keyword",
      },
      aspect_ratio: "9:16",
      source: {
        question_id: "bank-q-legacy-001",
        archetype_id: "versus_faceoff",
        question_text: "Which is faster: speed of light or speed of sound?",
        choices: [
          { id: "A", text: "Speed of light", is_correct: true },
          { id: "B", text: "Speed of sound", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Light is much faster than sound.",
        selected_answer_text: "Speed of light",
        source_language: "English",
        translation_provenance: "source",
        content_hash: "legacy-hash-12345",
        original_updated_at: null,
      },
      script: null,
      model_note: "",
      revision: 1,
      units: {
        references: { state: "missing", last_accepted_payload: null, current_attempt: null },
        script: { state: "missing", last_accepted_payload: null, current_attempt: null },
        cover: { state: "missing", last_accepted_payload: null, current_attempt: null },
        publishing: { state: "missing", last_accepted_payload: null, current_attempt: null },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_mutation: null,
      mutation_history: [],
    };

    // Write directly to disk simulating pre-existing v1 draft
    const targetFile = resolveShortReelFile(repo.roots, channel.slug, legacyReelId);
    await mkdir(path.dirname(targetFile), { recursive: true });
    await writeFile(targetFile, JSON.stringify(legacyRecord, null, 2), "utf8");

    // 1. listShortReels MUST return the legacy draft (does NOT hide it)
    const list = await repo.listShortReels(channel.channel_id);
    expect(list.length).toBe(1);
    expect(list[0].reel_id).toBe(legacyReelId);
    expect(list[0].source.fidelity).toBe("incomplete");

    // 2. getShortReel successfully parses it with typed incomplete fidelity
    const fetched = await repo.getShortReel({ channel_id: channel.channel_id, reel_id: legacyReelId });
    expect(fetched.reel_id).toBe(legacyReelId);
    expect(fetched.source.fidelity).toBe("incomplete");
    expect(fetched.source.selected_answer_text).toBe("Speed of light");

    // 3. createShortReel for same topic recognizes existing legacy draft and prevents duplicate recreation
    const dummySource = createSourceSnapshot(sampleQuestion);
    const existing = await repo.createShortReel(
      channel.channel_id,
      legacyRecord.topic as ShortReelTopicSnapshot,
      dummySource,
      "req-dup-create",
    );
    expect(existing.reel_id).toBe(legacyReelId);
  });
});
