import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BankQuestionSchema, createSourceSnapshot, type ReelScript, type ShortReelRecord } from "@studio/shared";
import { RepositoryService } from "../../src/repository/service.js";
import { resolveShortReelFile } from "../../src/repository/shortReelStorage.js";
import { saveTopicConfirmationReceipt, computeConfirmationOptionsFingerprint } from "../../src/repository/topicConfirmationReceipts.js";

export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export const repairSource = createSourceSnapshot(
  BankQuestionSchema.parse({
    id: "repair-source",
    format: "multiple_choice",
    archetype_id: "versus_faceoff",
    domain_id: "science",
    subtopic_id: "speed",
    language: "en",
    status: "approved",
    age_band: "family",
    question: "Which speed is higher?",
    explanation: "Twenty is greater than ten.",
    choices: [
      { id: "a", text: "20", is_correct: true },
      { id: "b", text: "10", is_correct: false },
    ],
    correct_choice_id: "a",
  }),
);

export function incompleteSource() {
  const { original_question: _original, fidelity: _fidelity, ...projection } = repairSource;
  return { ...projection, fidelity: "incomplete" as const };
}

export function repairScript(): ReelScript {
  const state = {
    character_identity: "Mascot",
    position: "Center",
    action: "Watching",
    camera: "Wide",
    environment: "Track",
    props: [],
    visible_text: [],
    revealed_facts: [],
  };
  const base = { duration_seconds: 8, narrative: "Compare two speeds", audio_direction: "Quiet", start_state: state, end_state: state };
  return {
    segments: [
      {
        ...base,
        index: 1,
        mode: "generate",
        text_cues: [{ role: "question", text: repairSource.question_text, start_seconds: 0, end_seconds: 4 }],
      },
      { ...base, index: 2, mode: "extend", text_cues: [] },
      {
        ...base,
        index: 3,
        mode: "extend",
        text_cues: [{ role: "answer", text: repairSource.selected_answer_text, start_seconds: 1, end_seconds: 4 }],
      },
    ],
  };
}

export async function repairFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "short-reel-final-repair-"));
  await mkdir(path.join(root, "templates"));
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n");
  const repo = new RepositoryService(root);
  await repo.ensureBootstrap();
  const channel = await repo.createChannel({ name: "Repair fixture", language: "English", dna_mode: "example" });
  const topic = {
    channel_id: channel.channel_id,
    topic_id: "repair-topic",
    title: "Speed",
    premise: "Compare",
    hook: "Which speed?",
    origin: "discovery" as const,
  };
  const reel = await repo.createShortReel(channel.channel_id, topic, repairSource, "create");
  await saveTopicConfirmationReceipt(repo, channel.channel_id, {
    receipt_id: `rec-${reel.reel_id}`,
    channel_id: channel.channel_id,
    topic_id: topic.topic_id,
    content_kind: "short_reel",
    product_id: reel.reel_id,
    status: "completed",
    confirmed_at: new Date().toISOString(),
    request_id: "req-repair-fixture",
    options_fingerprint: computeConfirmationOptionsFingerprint({ target_language: "en" }),
    options: { target_language: "en" },
    source_question_ids: repairSource.original_question ? [repairSource.original_question.id] : [],
    source_content_hashes: [],
  });
  const key = { channel_id: channel.channel_id, reel_id: reel.reel_id };
  const file = resolveShortReelFile(repo.roots, channel.slug, reel.reel_id);
  return {
    root,
    repo,
    channel,
    topic,
    reel,
    key,
    file,
    writeLegacy: async (record: ShortReelRecord = reel) => {
      await writeFile(file, JSON.stringify({ ...record, source: incompleteSource() }));
    },
    cleanup: async () => {
      await repo.close();
      await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    },
  };
}
