import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BankQuestionSchema, createSourceSnapshot, type ShortReelRecord, type ShortReelTopicSnapshot } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { releaseWriterAdmission, setShortReelWriteHookForTesting } from "../src/repository/shortReelStorage.js";

const roots: string[] = [];

async function fixture(): Promise<RepositoryService> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-studio-reel-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(
    path.join(root, "templates", "example_channel_dna.md"),
    "# Channel DNA\n\n## Channel Identity\n\n- Channel name: \n",
    "utf8",
  );
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repo = new RepositoryService(root);
  await repo.ensureBootstrap();
  return repo;
}

afterEach(async () => {
  setShortReelWriteHookForTesting(null);
  const currentRoots = roots.splice(0);
  for (const root of currentRoots) {
    await releaseWriterAdmission(root);
  }
  await Promise.all(currentRoots.map((root) => rm(root, { recursive: true, force: true })));
});

const sampleBankQuestion = BankQuestionSchema.parse({
  id: "bank-q-versus-001",
  archetype_id: "versus_faceoff",
  domain_id: "tech_speed",
  subtopic_id: "velocity",
  language: "English",
  question: "Over the same distance, which finishes first: 20 km/h or 10 km/h?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "20 km/h", is_correct: true },
    { id: "B", text: "10 km/h", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "Higher speed reaches destination in less time over equal distance.",
  age_band: "family",
  status: "approved",
});

const sampleTopic: ShortReelTopicSnapshot = {
  topic_id: "topic-motion-001",
  channel_id: "ch_placeholder",
  title: "Speed Comparison: 20 vs 10 km/h",
  premise: "Two racers test velocity over equal distance",
  hook: "Which one finishes first?",
  origin: "keyword",
};

describe("ShortReelRepository Behavioral Tests (Phase 02)", () => {
  describe("RP-01: Persistence round-trip and adapter reconstruction", () => {
    it("creates draft, persists to disk, reconstructs repository adapter, reads back same record with no Episode artifacts", async () => {
      const repo = await fixture();
      const channel = await repo.createChannel({
        name: "Reel Speed Test Channel",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topic = { ...sampleTopic, channel_id: channel.channel_id };
      const source = createSourceSnapshot(sampleBankQuestion);

      const created = await repo.createShortReel(channel.channel_id, topic, source, "req_create_01");

      expect(created.reel_id).toMatch(/^sreel_/);
      expect(created.channel_id).toBe(channel.channel_id);
      expect(created.topic_id).toBe(topic.topic_id);
      expect(created.revision).toBe(1);
      expect(created.aspect_ratio).toBe("9:16");
      expect(created.script).toBeNull();
      expect(created.source.selected_answer_text).toBe("20 km/h");

      // Verify no Episode folders were created
      const channelDir = repo.resolvePath("channels", channel.slug);
      const episodesDir = path.join(channelDir, "episodes");
      let episodeEntries: string[] = [];
      try {
        episodeEntries = await readdir(episodesDir);
      } catch {
        // Directory may not even exist
      }
      expect(episodeEntries.length).toBe(0);

      // Reconstruct repository service on the same storage root
      const reopenedRepo = new RepositoryService(repo.rootDirectory, repo.storageRoot);
      const fetched = await reopenedRepo.getShortReel({
        channel_id: channel.channel_id,
        reel_id: created.reel_id,
      });

      expect(fetched.reel_id).toBe(created.reel_id);
      expect(fetched.revision).toBe(1);
      expect(fetched.source.content_hash).toBe(created.source.content_hash);
      expect(fetched.topic.title).toBe(topic.title);
    });
  });

  describe("RP-02: Concurrent same-revision writes (CAS conflict)", () => {
    it("rejects one of two concurrent writes with the same expected revision and accepts exactly one winner", async () => {
      const repo = await fixture();
      const channel = await repo.createChannel({
        name: "CAS Channel",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topic = { ...sampleTopic, channel_id: channel.channel_id };
      const source = createSourceSnapshot(sampleBankQuestion);
      const reel = await repo.createShortReel(channel.channel_id, topic, source, "req_cas_init");

      const writeA = repo.updateShortReel(
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        { expected_revision: 1, request_id: "req_update_A" },
        { kind: "update_model_note", model_note: "Note from Writer A" },
      );

      const writeB = repo.updateShortReel(
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        { expected_revision: 1, request_id: "req_update_B" },
        { kind: "update_model_note", model_note: "Note from Writer B" },
      );

      const results = await Promise.allSettled([writeA, writeB]);

      const fulfilled = results.filter((r): r is PromiseFulfilledResult<ShortReelRecord> => r.status === "fulfilled");
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const winner = fulfilled[0].value;
      expect(winner.revision).toBe(2);

      const loserError = rejected[0].reason as { code?: string };
      expect(loserError.code).toBe("REVISION_CONFLICT");

      // Verify the winner's data is persisted and readable
      const latest = await repo.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
      expect(latest.revision).toBe(2);
      expect(latest.model_note).toBe(winner.model_note);
    });
  });

  describe("RP-03: Topic creation idempotency and restart safety", () => {
    it("returns the exact same record when called repeatedly or concurrently with the same channel and topic", async () => {
      const repo = await fixture();
      const channel = await repo.createChannel({
        name: "Idempotent Channel",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topic = { ...sampleTopic, channel_id: channel.channel_id };
      const source = createSourceSnapshot(sampleBankQuestion);

      // Concurrent creation calls
      const [first, second] = await Promise.all([
        repo.createShortReel(channel.channel_id, topic, source, "req_concurrent_1"),
        repo.createShortReel(channel.channel_id, topic, source, "req_concurrent_2"),
      ]);

      expect(first.reel_id).toBe(second.reel_id);
      expect(first.topic_id).toBe(second.topic_id);

      // Restart repo and call createShortReel again
      const reopened = new RepositoryService(repo.rootDirectory, repo.storageRoot);
      const third = await reopened.createShortReel(channel.channel_id, topic, source, "req_after_restart");

      expect(third.reel_id).toBe(first.reel_id);

      const all = await reopened.listShortReels(channel.channel_id);
      expect(all.length).toBe(1);
    });
  });

  describe("RP-04: Request replay vs changed payload conflict", () => {
    it("returns original result on identical request ID replay, and rejects changed payload with conflict", async () => {
      const repo = await fixture();
      const channel = await repo.createChannel({
        name: "Replay Channel",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topic = { ...sampleTopic, channel_id: channel.channel_id };
      const source = createSourceSnapshot(sampleBankQuestion);
      const reel = await repo.createShortReel(channel.channel_id, topic, source, "req_init");

      const update1 = await repo.updateShortReel(
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        { expected_revision: 1, request_id: "req_idem_mutation" },
        { kind: "update_model_note", model_note: "Identical Payload Note" },
      );
      expect(update1.revision).toBe(2);

      // Replay exact same request_id and identical payload: returns without incrementing revision
      const replay = await repo.updateShortReel(
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        { expected_revision: 1, request_id: "req_idem_mutation" },
        { kind: "update_model_note", model_note: "Identical Payload Note" },
      );
      expect(replay.revision).toBe(2);
      expect(replay.model_note).toBe("Identical Payload Note");

      // Replay same request_id with DIFFERENT payload: conflicts!
      await expect(
        repo.updateShortReel(
          { channel_id: channel.channel_id, reel_id: reel.reel_id },
          { expected_revision: 1, request_id: "req_idem_mutation" },
          { kind: "update_model_note", model_note: "DIFFERENT Payload Note" },
        ),
      ).rejects.toThrow(/conflict|payload/i);
    });
  });

  describe("RP-05: Cross-channel key and path traversal protection", () => {
    it("rejects cross-channel access and path traversal attempts", async () => {
      const repo = await fixture();
      const channelA = await repo.createChannel({ name: "Channel A", language: "English", dna_mode: "example" });
      const channelB = await repo.createChannel({ name: "Channel B", language: "English", dna_mode: "example" });

      const topic = { ...sampleTopic, channel_id: channelA.channel_id };
      const source = createSourceSnapshot(sampleBankQuestion);
      const reelA = await repo.createShortReel(channelA.channel_id, topic, source, "req_a");

      // Cross-channel read (channel B attempting to read channel A's reel)
      await expect(repo.getShortReel({ channel_id: channelB.channel_id, reel_id: reelA.reel_id })).rejects.toThrow(/not found/i);

      // Traversal in reel_id
      await expect(repo.getShortReel({ channel_id: channelA.channel_id, reel_id: "../../../etc/passwd" })).rejects.toThrow(/unsafe/i);

      // Traversal in channel_id
      await expect(repo.listShortReels("../traversal")).rejects.toThrow(/channel not found|unsafe/i);
    });
  });

  describe("RP-06: Fault injection during write preserves valid record", () => {
    it("leaves existing valid record untouched when write/rename fails, and succeeds on subsequent retry", async () => {
      const repo = await fixture();
      const channel = await repo.createChannel({
        name: "Fault Injection Channel",
        language: "English",
        dna_mode: "example",
      });

      const topic = { ...sampleTopic, channel_id: channel.channel_id };
      const source = createSourceSnapshot(sampleBankQuestion);
      const reel = await repo.createShortReel(channel.channel_id, topic, source, "req_fault_init");
      expect(reel.revision).toBe(1);

      // Inject simulated write failure
      setShortReelWriteHookForTesting(async () => {
        await Promise.resolve();
        throw new Error("Simulated filesystem I/O error during atomic rename");
      });

      // Attempt update with injected failure
      await expect(
        repo.updateShortReel(
          { channel_id: channel.channel_id, reel_id: reel.reel_id },
          { expected_revision: 1, request_id: "req_failing_mutation" },
          { kind: "update_model_note", model_note: "This should fail" },
        ),
      ).rejects.toThrow("Simulated filesystem I/O error");

      // Clear write failure hook
      setShortReelWriteHookForTesting(null);

      // Verify the previous valid record is still intact at revision 1
      const readable = await repo.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
      expect(readable.revision).toBe(1);
      expect(readable.model_note).toBe(reel.model_note);

      // Retry the update cleanly: succeeds at revision 2
      const successfulRetry = await repo.updateShortReel(
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        { expected_revision: 1, request_id: "req_successful_retry" },
        { kind: "update_model_note", model_note: "Successfully updated after fault cleared" },
      );
      expect(successfulRetry.revision).toBe(2);
      expect(successfulRetry.model_note).toBe("Successfully updated after fault cleared");
    });
  });
});
