import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { QuizQuestion } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "history-content-type-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  const repository = new RepositoryService(root);
  const channel = await repository.createChannel({
    name: "History Test Channel",
    description: "",
    target_audience: "",
    language: "English",
    market: "",
    dna_mode: "example",
  });
  return { repository, channel };
}

function makeQuestion(id: string, text: string): QuizQuestion {
  return {
    id,
    number: 1,
    format: "multiple_choice_text",
    difficulty: 1,
    question: text,
    choices: [
      { id: "choice-a", text: "Answer A" },
      { id: "choice-b", text: "Answer B" },
    ],
    correct_choice_id: "choice-a",
    explanation: "Explanation text",
    fun_fact: "Fun fact text",
    source_ids: [],
    visual_opportunity: "Opportunity text",
    validation: { semantic_status: "validated", source_coverage: false, fact_locked: true },
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Question History Content Type", () => {
  it("persists content_type as short_reel when explicitly specified", async () => {
    const { repository, channel } = await fixture();
    const reelId = "custom_reel_123";
    const question = makeQuestion("q-short-1", "What is the fastest animal on earth?");

    await repository.appendQuestionHistory(channel.channel_id, reelId, [question], 30, undefined, "short_reel");

    const history = await repository.readQuestionHistory(channel.channel_id);
    expect(history).toHaveLength(1);
    expect(history[0].question_id).toBe("q-short-1");
    expect(history[0].episode_id).toBe(reelId);
    expect(history[0].content_type).toBe("short_reel");
  });

  it("persists content_type as episode when explicitly specified", async () => {
    const { repository, channel } = await fixture();
    const episodeId = "sreel_but_forced_episode";
    const question = makeQuestion("q-ep-1", "What is the capital of France?");

    await repository.appendQuestionHistory(channel.channel_id, episodeId, [question], 30, undefined, "episode");

    const history = await repository.readQuestionHistory(channel.channel_id);
    expect(history).toHaveLength(1);
    expect(history[0].question_id).toBe("q-ep-1");
    expect(history[0].episode_id).toBe(episodeId);
    expect(history[0].content_type).toBe("episode");
  });

  it("falls back to inferQuestionHistoryContentType when contentType is omitted", async () => {
    const { repository, channel } = await fixture();

    // 1. Reel id starting with sreel_ should infer short_reel
    const reelId = "sreel_auto_inferred_01";
    const reelQuestion = makeQuestion("q-infer-reel", "Which element has chemical symbol O?");
    await repository.appendQuestionHistory(channel.channel_id, reelId, [reelQuestion], 30);

    // 2. Standard episode id should infer episode
    const episodeId = "ep_standard_01";
    const epQuestion = makeQuestion("q-infer-ep", "Who wrote Romeo and Juliet?");
    await repository.appendQuestionHistory(channel.channel_id, episodeId, [epQuestion], 30);

    const history = await repository.readQuestionHistory(channel.channel_id);
    expect(history).toHaveLength(2);

    const reelEntry = history.find((e) => e.episode_id === reelId);
    const epEntry = history.find((e) => e.episode_id === episodeId);

    expect(reelEntry).toBeDefined();
    expect(reelEntry?.content_type).toBe("short_reel");

    expect(epEntry).toBeDefined();
    expect(epEntry?.content_type).toBe("episode");
  });

  it("preserves content_type across updates and maintains multiple entries correctly", async () => {
    const { repository, channel } = await fixture();
    const reelId = "sreel_keep_1";
    const episodeId = "ep_keep_1";

    await repository.appendQuestionHistory(channel.channel_id, reelId, [makeQuestion("q1", "Question 1")], 30, undefined, "short_reel");

    await repository.appendQuestionHistory(channel.channel_id, episodeId, [makeQuestion("q2", "Question 2")], 30, undefined, "episode");

    let history = await repository.readQuestionHistory(channel.channel_id);
    expect(history).toHaveLength(2);
    expect(history.find((e) => e.question_id === "q1")?.content_type).toBe("short_reel");
    expect(history.find((e) => e.question_id === "q2")?.content_type).toBe("episode");

    // Overwriting the reel questions updates that reel's entry
    await repository.appendQuestionHistory(
      channel.channel_id,
      reelId,
      [makeQuestion("q1-updated", "Question 1 Updated")],
      30,
      undefined,
      "short_reel",
    );

    history = await repository.readQuestionHistory(channel.channel_id);
    expect(history).toHaveLength(2);
    expect(history.find((e) => e.question_id === "q1-updated")?.content_type).toBe("short_reel");
    expect(history.find((e) => e.question_id === "q2")?.content_type).toBe("episode");
  });
});
