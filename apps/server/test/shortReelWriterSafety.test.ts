import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BankQuestionSchema, computeSourceContentHash, createSourceSnapshot, type ShortReelTopicSnapshot } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { releaseWriterAdmission, setShortReelWriteHookForTesting } from "../src/repository/shortReelStorage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("ShortReelWriterSafety Cross-Process Tests (Stage A)", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "reel-writer-safety-"));
  });

  afterEach(async () => {
    setShortReelWriteHookForTesting(null);
    await releaseWriterAdmission(tempDir);
    await rm(tempDir, { recursive: true, force: true });
  });

  const workerScript = `
    const { createRequire } = require('node:module');
    const path = require('node:path');
    const req = createRequire(process.argv[1]);
    const { acquireWriterAdmission, releaseWriterAdmission } = req(path.resolve('${path.resolve(__dirname, "../src/repository/shortReelStorage.ts").replace(/\\/g, "/")}'));
    const { RepositoryService } = req(path.resolve('${path.resolve(__dirname, "../src/repository/service.ts").replace(/\\/g, "/")}'));

    const action = process.argv[2];
    const storageRoot = process.argv[3];
    const extra1 = process.argv[4];
    const extra2 = process.argv[5];

    async function run() {
      try {
        if (action === 'acquire_and_hold') {
          acquireWriterAdmission(storageRoot);
          process.stdout.write('ACQUIRED\\n');
          process.stdin.resume();
          process.stdin.on('data', async () => {
            await releaseWriterAdmission(storageRoot);
            process.stdout.write('RELEASED\\n');
            process.exit(0);
          });
        } else if (action === 'acquire_once') {
          acquireWriterAdmission(storageRoot);
          process.stdout.write('ACQUIRED_ONCE\\n');
          process.exit(0);
        } else if (action === 'workflow_create_and_update') {
          const repo = new RepositoryService(storageRoot);
          await repo.ensureBootstrap();
          const channel = await repo.createChannel({
            name: 'IPC Channel',
            language: 'English',
            market: 'Global',
            dna_mode: 'example',
          });
          const source = JSON.parse(extra1);
          const topic = {
            topic_id: 'topic-ipc-001',
            channel_id: channel.channel_id,
            title: 'IPC Signal Latency',
            premise: 'Testing inter-process persistence',
            hook: 'Which has lower latency?',
            origin: 'keyword',
          };
          const created = await repo.createShortReel(channel.channel_id, topic, source, 'ipc-req-create');
          await repo.updateShortReel(
            { channel_id: channel.channel_id, reel_id: created.reel_id },
            { request_id: 'ipc-req-update-1', expected_revision: 1 },
            { kind: 'update_model_note', model_note: 'Child 1 Model Note' },
          );
          await repo.close();
          process.stdout.write('IPC_STEP_1_OK:' + channel.channel_id + ':' + created.reel_id + '\\n');
          process.exit(0);
        } else if (action === 'workflow_read_and_replay') {
          const repo = new RepositoryService(storageRoot);
          await repo.ensureBootstrap();
          const channelId = extra1;
          const reelId = extra2;
          const reel = await repo.getShortReel({ channel_id: channelId, reel_id: reelId });
          if (reel.revision !== 2 || reel.model_note !== 'Child 1 Model Note') {
            throw new Error('Revision or note mismatch: rev=' + reel.revision + ' note=' + reel.model_note);
          }
          // Replay identical mutation
          const replay = await repo.updateShortReel(
            { channel_id: channelId, reel_id: reelId },
            { request_id: 'ipc-req-update-1', expected_revision: 2 },
            { kind: 'update_model_note', model_note: 'Child 1 Model Note' },
          );
          if (replay.revision !== 2) {
            throw new Error('Replay unexpectedly incremented revision to ' + replay.revision);
          }
          // Conflicting mutation with same request_id
          let conflictDetected = false;
          try {
            await repo.updateShortReel(
              { channel_id: channelId, reel_id: reelId },
              { request_id: 'ipc-req-update-1', expected_revision: 2 },
              { kind: 'update_model_note', model_note: 'Conflicting Child Note' },
            );
          } catch (err) {
            if (err && err.code === 'REQUEST_CONFLICT') {
              conflictDetected = true;
            }
          }
          if (!conflictDetected) {
            throw new Error('Conflicting payload reuse was not rejected');
          }
          // Advance to revision 3
          const next = await repo.updateShortReel(
            { channel_id: channelId, reel_id: reelId },
            { request_id: 'ipc-req-update-2', expected_revision: 2 },
            { kind: 'update_model_note', model_note: 'Child 2 Model Note' },
          );
          if (next.revision !== 3) {
            throw new Error('Next revision mismatch: ' + next.revision);
          }
          await repo.close();
          process.stdout.write('IPC_STEP_2_OK\\n');
          process.exit(0);
        }
      } catch (err) {
        process.stderr.write('ERROR:' + (err.code || err.message) + '\\n');
        process.exit(1);
      }
    }
    run();
  `;

  function spawnWorker(action: string, root: string, ...extraArgs: string[]) {
    const child = spawn(process.execPath, ["--import", "tsx", "-e", workerScript, __filename, action, root, ...extraArgs], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer | string) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer | string) => {
      stderr += data.toString();
    });

    return { child, getStdout: () => stdout, getStderr: () => stderr };
  }

  it("admits exactly one writer per canonical storage root and fails second process with STORAGE_BUSY", async () => {
    // Process 1 acquires and holds
    const worker1 = spawnWorker("acquire_and_hold", tempDir);

    // Wait until worker 1 acquires
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        if (worker1.getStdout().includes("ACQUIRED")) {
          clearInterval(interval);
          resolve();
        }
        if (worker1.getStderr()) {
          clearInterval(interval);
          reject(new Error(worker1.getStderr()));
        }
      }, 50);
    });

    // Process 2 tries to acquire the same root simultaneously -> fails closed
    const worker2 = spawnWorker("acquire_once", tempDir);
    const exitCode2 = await new Promise<number>((resolve) => {
      worker2.child.on("exit", (code) => resolve(code ?? 0));
    });

    expect(exitCode2).toBe(1);
    expect(worker2.getStderr()).toContain("STORAGE_BUSY");

    // Clean up worker 1
    worker1.child.stdin.write("release\n");
    await new Promise((resolve) => worker1.child.on("exit", resolve));
  });

  it("detects contention through alias paths resolving to same canonical root", async () => {
    const subAlias = path.join(tempDir, "subdir", "..");

    const worker1 = spawnWorker("acquire_and_hold", tempDir);
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (worker1.getStdout().includes("ACQUIRED")) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });

    // Worker 2 attempts via alias path
    const worker2 = spawnWorker("acquire_once", subAlias);
    const exitCode2 = await new Promise<number>((resolve) => {
      worker2.child.on("exit", (code) => resolve(code ?? 0));
    });

    expect(exitCode2).toBe(1);
    expect(worker2.getStderr()).toContain("STORAGE_BUSY");

    // Release worker 1
    worker1.child.stdin.write("release\n");
    await new Promise((resolve) => worker1.child.on("exit", resolve));
  });

  it("releases admission upon abrupt process termination (SIGKILL) without stale lease deadlock", async () => {
    const worker1 = spawnWorker("acquire_and_hold", tempDir);
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (worker1.getStdout().includes("ACQUIRED")) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });

    // Abruptly terminate worker 1 (SIGKILL / forced kill)
    worker1.child.kill("SIGKILL");
    await new Promise((resolve) => worker1.child.on("exit", resolve));

    // Worker 2 must now immediately succeed without waiting for any timeout or lease expiration
    const worker2 = spawnWorker("acquire_once", tempDir);
    const exitCode2 = await new Promise<number>((resolve) => {
      worker2.child.on("exit", (code) => resolve(code ?? 0));
    });

    expect(exitCode2).toBe(0);
    expect(worker2.getStdout()).toContain("ACQUIRED_ONCE");
  });

  const sampleQuestion = BankQuestionSchema.parse({
    id: "bank-q-replay-001",
    archetype_id: "versus_faceoff",
    domain_id: "tech",
    subtopic_id: "speed",
    language: "English",
    question: "Which transmission medium has lower latency: fiber optics or satellite?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Fiber optics", is_correct: true },
      { id: "B", text: "Satellite", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Terrestrial fiber paths have much shorter physical distances than geostationary orbits.",
    age_band: "family",
    status: "approved",
  });

  const sampleTopic: ShortReelTopicSnapshot = {
    topic_id: "topic-replay-001",
    channel_id: "ch_replay",
    title: "Fiber vs Satellite Latency",
    premise: "Comparing signal propagation speeds across media",
    hook: "Which one has lower latency?",
    origin: "keyword",
  };

  it("two repository instances in same process serialize CAS via canonical root queue (A-R01)", async () => {
    await mkdir(path.join(tempDir, "templates"), { recursive: true });
    await writeFile(path.join(tempDir, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(tempDir, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    const repo1 = new RepositoryService(tempDir);
    const repo2 = new RepositoryService(tempDir);
    await repo1.ensureBootstrap();
    await repo2.ensureBootstrap();

    const channel = await repo1.createChannel({
      name: "CAS Race Channel",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });

    const topic = { ...sampleTopic, channel_id: channel.channel_id };
    const source = createSourceSnapshot(sampleQuestion);
    const reel = await repo1.createShortReel(channel.channel_id, topic, source, "req-cas-init");
    expect(reel.revision).toBe(1);

    // Concurrently submit two mutations from repo1 and repo2 with expected_revision: 1
    const p1 = repo1.updateShortReel(
      { channel_id: channel.channel_id, reel_id: reel.reel_id },
      { request_id: "req-cas-p1", expected_revision: 1 },
      { kind: "update_model_note", model_note: "From Repo 1" },
    );
    const p2 = repo2.updateShortReel(
      { channel_id: channel.channel_id, reel_id: reel.reel_id },
      { request_id: "req-cas-p2", expected_revision: 1 },
      { kind: "update_model_note", model_note: "From Repo 2" },
    );

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one must succeed and exactly one must fail with REVISION_CONFLICT
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toMatchObject({
      code: "REVISION_CONFLICT",
    });

    const finalRecord = await repo1.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
    expect(finalRecord.revision).toBe(2);

    await repo1.close();
    await repo2.close();
  });

  it("preserves replay conflict rejection after more than 50 mutations (A-R05)", async () => {
    await mkdir(path.join(tempDir, "templates"), { recursive: true });
    await writeFile(path.join(tempDir, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(tempDir, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    const repo = new RepositoryService(tempDir);
    await repo.ensureBootstrap();
    const channel = await repo.createChannel({
      name: "Unbounded History Channel",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });
    const topic = { ...sampleTopic, channel_id: channel.channel_id };
    const source = createSourceSnapshot(sampleQuestion);
    const reel = await repo.createShortReel(channel.channel_id, topic, source, "create-req");

    // Execute 55 consecutive mutations
    for (let i = 1; i <= 55; i++) {
      await repo.updateShortReel(
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        { request_id: `mutation-req-${i}`, expected_revision: i },
        { kind: "update_model_note", model_note: `Note version ${i}` },
      );
    }

    const current = await repo.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
    expect(current.revision).toBe(56);
    expect(current.mutation_history?.length).toBe(56); // 1 create + 55 updates

    // Replay of mutation-req-1 (from 55 mutations ago) with identical payload succeeds
    const replayEarly = await repo.updateShortReel(
      { channel_id: channel.channel_id, reel_id: reel.reel_id },
      { request_id: "mutation-req-1", expected_revision: 56 },
      { kind: "update_model_note", model_note: "Note version 1" },
    );
    expect(replayEarly.revision).toBe(56);

    // Reuse of mutation-req-1 with conflicting payload is REJECTED even after 55 mutations
    await expect(
      repo.updateShortReel(
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        { request_id: "mutation-req-1", expected_revision: 56 },
        { kind: "update_model_note", model_note: "Conflicting Note" },
      ),
    ).rejects.toMatchObject({ code: "REQUEST_CONFLICT" });

    await repo.close();
  });

  it("rejects duplicate createShortReel with same request ID and conflicting payload (A-R05)", async () => {
    await mkdir(path.join(tempDir, "templates"), { recursive: true });
    await writeFile(path.join(tempDir, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(tempDir, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    const repo = new RepositoryService(tempDir);
    await repo.ensureBootstrap();
    const channel = await repo.createChannel({
      name: "Create Replay Channel",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });
    const topic = { ...sampleTopic, channel_id: channel.channel_id };
    const source1 = createSourceSnapshot(sampleQuestion);

    const created1 = await repo.createShortReel(channel.channel_id, topic, source1, "req-create-shared");
    expect(created1.revision).toBe(1);

    // Idempotent create with same requestId and same payload returns existing record
    const replayed = await repo.createShortReel(channel.channel_id, topic, source1, "req-create-shared");
    expect(replayed.reel_id).toBe(created1.reel_id);

    // Conflicting create with same requestId and different source payload is rejected
    const differentQuestion = BankQuestionSchema.parse({
      ...sampleQuestion,
      id: "bank-q-diff-001",
      question: "Different question about signal propagation across mediums?",
    });
    const source2 = createSourceSnapshot(differentQuestion);
    await expect(repo.createShortReel(channel.channel_id, topic, source2, "req-create-shared")).rejects.toMatchObject({
      code: "REQUEST_CONFLICT",
    });

    await repo.close();
  });

  it("runs true fresh-process persistence and replay workflow across distinct child processes (A-R08)", async () => {
    await mkdir(path.join(tempDir, "templates"), { recursive: true });
    await writeFile(path.join(tempDir, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(tempDir, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    const choices = sampleQuestion.choices.map((c) => ({
      id: c.id,
      text: c.text,
      is_correct: c.id === sampleQuestion.correct_choice_id,
    }));
    const hash = computeSourceContentHash(sampleQuestion, {
      question_id: sampleQuestion.id,
      archetype_id: sampleQuestion.archetype_id,
      question_text: sampleQuestion.question,
      choices,
      correct_choice_id: sampleQuestion.correct_choice_id,
      explanation: sampleQuestion.explanation,
      selected_answer_text: "Fiber optics",
      source_language: "English",
      translation_provenance: "source",
      original_updated_at: null,
    });
    const sourceSnapshot = {
      fidelity: "complete",
      original_question: sampleQuestion,
      question_id: sampleQuestion.id,
      archetype_id: sampleQuestion.archetype_id,
      question_text: sampleQuestion.question,
      choices,
      correct_choice_id: sampleQuestion.correct_choice_id,
      explanation: sampleQuestion.explanation,
      selected_answer_text: "Fiber optics",
      source_language: "English",
      translation_provenance: "source",
      content_hash: hash,
      original_updated_at: null,
    };

    // Child Process 1: Create reel and advance to revision 2
    const child1 = spawnWorker("workflow_create_and_update", tempDir, JSON.stringify(sourceSnapshot));
    const exit1 = await new Promise<number>((resolve) => child1.child.on("exit", (code) => resolve(code ?? 0)));
    expect(exit1).toBe(0);
    expect(child1.getStdout()).toContain("IPC_STEP_1_OK");

    const match = child1.getStdout().match(/IPC_STEP_1_OK:([^:]+):([^\s]+)/);
    expect(match).toBeTruthy();
    const channelId = match![1];
    const reelId = match![2];

    // Child Process 2: Fresh separate Node process starts up on same root, reads reel, verifies replay & conflict
    const child2 = spawnWorker("workflow_read_and_replay", tempDir, channelId, reelId);
    const exit2 = await new Promise<number>((resolve) => child2.child.on("exit", (code) => resolve(code ?? 0)));
    expect(exit2).toBe(0);
    expect(child2.getStdout()).toContain("IPC_STEP_2_OK");
  });
});
