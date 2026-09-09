import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashBankQuestionSource, type BankQuestion, type EpisodeTopicCandidate, type ShortReelTopicCandidate } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { confirmShortReelTopic } from "../src/shortReel/topicConfirmation.js";
import { serializeTopicRunOperation } from "../src/repository/topicSelectionProjection.js";
import * as writerAdmission from "../src/repository/shortReelWriterAdmission.js";

const roots: string[] = [];

async function createTestEnv(): Promise<{ repo: RepositoryService; channelId: string; root: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "short-reel-recovery-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n\n- Channel name: Test\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repo = new RepositoryService(root);
  await repo.ensureBootstrap();

  const channel = await repo.createChannel({
    name: "Recovery Test Channel",
    description: "Channel for recovery testing",
    target_audience: "General",
    language: "en",
    market: "US",
    dna_mode: "example",
  });

  return { repo, channelId: channel.channel_id, root };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }).catch(() => {})));
});

function seedBankQuestions(repo: RepositoryService): Promise<BankQuestion[]> {
  const q1: BankQuestion = {
    id: "q-versus-01",
    archetype_id: "versus_faceoff",
    domain_id: "nature_animals",
    subtopic_id: "predators",
    question: "Which cat has greater muscle mass?",
    explanation: "Tigers have denser muscular frames than lions.",
    format: "true_false",
    status: "approved",
    language: "en",
    correct_choice_id: "c1",
    choices: [
      { id: "c1", text: "Tiger" },
      { id: "c2", text: "Lion" },
    ],
    tags: ["animals"],
    difficulty: 2,
    age_band: "family",
    thinking_seconds: 5,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  const q2: BankQuestion = {
    id: "q-trivia-01",
    archetype_id: "deep_trivia",
    domain_id: "space_earth",
    subtopic_id: "planets",
    question: "Which planet rotates on its side?",
    explanation: "Uranus has an extreme axial tilt of approximately 98 degrees.",
    format: "multiple_choice",
    status: "approved",
    language: "en",
    correct_choice_id: "c1",
    choices: [
      { id: "c1", text: "Uranus" },
      { id: "c2", text: "Neptune" },
      { id: "c3", text: "Saturn" },
    ],
    tags: ["space"],
    difficulty: 3,
    age_band: "family",
    thinking_seconds: 5,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  return Promise.all([repo.saveQuestionBankQuestion(q1), repo.saveQuestionBankQuestion(q2)]);
}

describe("Task B3: Durable Topic Selection Projection and Recovery", () => {
  it("completes one projection without waiting for unrelated in-flight projection work", async () => {
    const { repo, channelId } = await createTestEnv();
    const channel = await repo.getChannel(channelId);
    const directory = repo.resolvePath("channels", channel.slug, "topics");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "projection.json"),
      JSON.stringify({
        candidates: [
          { topic_id: "first", content_kind: "short_reel", selected: false },
          { topic_id: "second", content_kind: "short_reel", selected: false },
        ],
      }),
    );
    let unblockFirst!: () => void;
    let unblockSecond!: () => void;
    let enteredFirst!: () => void;
    let enteredSecond!: () => void;
    const firstEntered = new Promise<void>((resolve) => {
      enteredFirst = resolve;
    });
    const secondEntered = new Promise<void>((resolve) => {
      enteredSecond = resolve;
    });
    const firstGate = new Promise<void>((resolve) => {
      unblockFirst = resolve;
    });
    const secondGate = new Promise<void>((resolve) => {
      unblockSecond = resolve;
    });
    const originalWrite = repo.writeJsonAtomic.bind(repo);
    let writes = 0;
    const spy = vi.spyOn(repo, "writeJsonAtomic").mockImplementation(async (file, value) => {
      if (++writes === 1) {
        enteredFirst();
        await firstGate;
      } else {
        enteredSecond();
        await secondGate;
      }
      await originalWrite(file, value);
    });
    let firstFinished = false;
    let reservedSecond!: () => void;
    const secondReserved = new Promise<void>((resolve) => {
      reservedSecond = resolve;
    });
    const reserve = writerAdmission.reserveWriterOperation;
    let reservations = 0;
    const reserveSpy = vi.spyOn(writerAdmission, "reserveWriterOperation").mockImplementation((...args) => {
      const done = reserve(...args);
      if (++reservations === 2) reservedSecond();
      return done;
    });
    const first = repo.markTopicSelected(channelId, "first", 1).then(() => {
      firstFinished = true;
    });
    await firstEntered;
    const second = repo.markTopicSelected(channelId, "second", 1);
    await secondReserved;
    unblockFirst();
    await secondEntered;
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(firstFinished).toBe(true);
    } finally {
      unblockSecond();
      await Promise.all([first, second]);
      spy.mockRestore();
      reserveSpy.mockRestore();
      await repo.close();
    }
  });

  it("observes a failed serialized operation without emitting an unhandled rejection", async () => {
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", listener);
    try {
      await expect(serializeTopicRunOperation("failure-test", async () => Promise.reject(new Error("disk failure")))).rejects.toThrow(
        "disk failure",
      );
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", listener);
    }
  });

  it("concurrently selects both reel topics in the same run; both remain selected after reopening", async () => {
    const { repo, channelId, root } = await createTestEnv();
    await seedBankQuestions(repo);

    const topic1: ShortReelTopicCandidate = {
      topic_id: "sr-topic-1",
      channel_id: channelId,
      content_kind: "short_reel",
      archetype: "versus_faceoff",
      title: "Tiger vs Lion Showdown",
      premise: "Muscle mass faceoff",
      why_it_fits: "Viral faceoff",
      hook: "Who is heavier?",
      estimated_potential: "High",
      generated_at: "2026-09-01T00:00:00.000Z",
      selected: false,
      question_count: 1,
      aspect_ratio: "9:16",
      origin: "keyword",
      theme_hint: "cats",
      domain_id: "nature_animals",
    };

    const topic2: ShortReelTopicCandidate = {
      topic_id: "sr-topic-2",
      channel_id: channelId,
      content_kind: "short_reel",
      archetype: "deep_trivia",
      title: "Planetary Tilts",
      premise: "Sideways planet trivia",
      why_it_fits: "Astrophysics curiosity",
      hook: "Which planet rolls on its side?",
      estimated_potential: "High",
      generated_at: "2026-09-01T00:00:00.000Z",
      selected: false,
      question_count: 1,
      aspect_ratio: "9:16",
      origin: "discovery",
      domain_id: "space_earth",
    };

    const epTopic1: EpisodeTopicCandidate = {
      topic_id: "ep-topic-1",
      channel_id: channelId,
      content_kind: "episode",
      archetype: "deep_trivia",
      quiz_format: "multiple_choice",
      title: "Episode Topic 1",
      premise: "Premise 1",
      why_it_fits: "Fits 1",
      hook: "Hook 1",
      estimated_potential: "High",
      generated_at: "2026-09-01T00:00:00.000Z",
      selected: false,
      question_count: 8,
      origin: "discovery",
      domain_id: "nature_animals",
    };

    const epTopic2 = { ...epTopic1, topic_id: "ep-topic-2", title: "Episode Topic 2" };
    const epTopic3 = { ...epTopic1, topic_id: "ep-topic-3", title: "Episode Topic 3" };

    await repo.saveTopicRun(channelId, [epTopic1, epTopic2, epTopic3, topic1, topic2]);

    // Concurrently mark both selected
    await Promise.all([repo.markTopicSelected(channelId, topic1.topic_id, 1), repo.markTopicSelected(channelId, topic2.topic_id, 1)]);

    // Reopen repository in new instance
    const reopened = new RepositoryService(root);
    await reopened.ensureBootstrap();

    const topics = await reopened.listTopics(channelId);
    const selectedIds = topics.filter((t) => t.selected).map((t) => t.topic_id);

    expect(selectedIds).toContain(topic1.topic_id);
    expect(selectedIds).toContain(topic2.topic_id);
    expect(selectedIds).toHaveLength(2);
  });

  it("repairs incomplete projection when confirming an already-persisted Short-Reel", async () => {
    const { repo, channelId, root: _root } = await createTestEnv();
    const [q1] = await seedBankQuestions(repo);

    const topic: ShortReelTopicCandidate = {
      topic_id: "sr-topic-repair",
      channel_id: channelId,
      content_kind: "short_reel",
      archetype: "versus_faceoff",
      title: "Tiger vs Lion Showdown",
      premise: "Muscle mass faceoff",
      why_it_fits: "Viral faceoff",
      hook: "Who is heavier?",
      estimated_potential: "High",
      generated_at: "2026-09-01T00:00:00.000Z",
      selected: false,
      question_count: 1,
      aspect_ratio: "9:16",
      origin: "keyword",
      domain_id: "nature_animals",
      source_bindings: [
        {
          source_question_id: q1.id,
          source_hash_version: 1,
          source_content_hash: hashBankQuestionSource(q1),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
      ],
    };

    const dummy1 = {
      ...topic,
      topic_id: "dummy-1",
      title: "Dummy 1",
      content_kind: "episode" as const,
      quiz_format: "multiple_choice" as const,
      question_count: 8,
    };
    const dummy2 = {
      ...topic,
      topic_id: "dummy-2",
      title: "Dummy 2",
      content_kind: "episode" as const,
      quiz_format: "multiple_choice" as const,
      question_count: 8,
    };
    const dummy3 = {
      ...topic,
      topic_id: "dummy-3",
      title: "Dummy 3",
      content_kind: "episode" as const,
      quiz_format: "multiple_choice" as const,
      question_count: 8,
    };
    const dummy4 = { ...topic, topic_id: "dummy-4", title: "Dummy 4" };

    await repo.saveTopicRun(channelId, [dummy1, dummy2, dummy3, topic, dummy4]);

    // Confirm once
    const firstConfirm = await confirmShortReelTopic({
      repository: repo,
      channelId,
      topicId: topic.topic_id,
      requestId: "req-first",
    });
    expect(firstConfirm.content_kind).toBe("short_reel");
    expect(firstConfirm.short_reel.topic.title).toBe("Tiger vs Lion Showdown");

    // Simulate an incomplete projection: manually reset selected to false in stored topic run
    const channel = await repo.getChannel(channelId);
    const topicsDir = repo.resolvePath("channels", channel.slug, "topics");
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(topicsDir);
    const runFile = path.join(topicsDir, entries[0]);
    const runContent = JSON.parse(await readFile(runFile, "utf8")) as {
      candidates: Array<{ topic_id: string; selected: boolean }>;
    };
    const targetCandidate = runContent.candidates.find((c) => c.topic_id === topic.topic_id);
    if (targetCandidate) targetCandidate.selected = false;
    await repo.writeJsonAtomic(runFile, runContent);

    // Verify selected is indeed false in topic list
    const topicsBeforeRetry = await repo.listTopics(channelId);
    expect(topicsBeforeRetry.find((t) => t.topic_id === topic.topic_id)?.selected).toBe(false);

    // Replay confirmShortReelTopic: should return existing reel AND repair projection
    const replayed = await confirmShortReelTopic({
      repository: repo,
      channelId,
      topicId: topic.topic_id,
      requestId: "req-first",
    });

    expect(replayed.content_kind).toBe("short_reel");
    expect(replayed.short_reel.reel_id).toBe(firstConfirm.short_reel.reel_id);

    // Verify projection was repaired
    const topicsAfterRetry = await repo.listTopics(channelId);
    expect(topicsAfterRetry.find((t) => t.topic_id === topic.topic_id)?.selected).toBe(true);

    // Verify exactly one Short-Reel was created
    const reels = await repo.listShortReels(channelId);
    expect(reels).toHaveLength(1);
    expect(reels[0].reel_id).toBe(firstConfirm.short_reel.reel_id);
  });
});
