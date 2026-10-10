import { readFile } from "node:fs/promises";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { hashBankQuestionSource, quizShortProductRef, type BankQuestion, type Task } from "@studio/shared";
import type { TaskManager } from "../src/tasks.js";
import { createQuizShortFromTopicWithBank } from "../src/quiz/bank/questionBankToQuizBridge.js";
import { getTopicConfirmationReceipt, saveTopicConfirmationReceipt } from "../src/repository/topicConfirmationReceipts.js";
import { loadQuizShortLocalizationArtifact } from "../src/quiz/bank/localization/productLocalization.js";
import {
  createBoundCandidate,
  createConfirmationTestFixture,
  createGermanLocalizationStubLlm,
  createMockReceipt,
  createSourceBinding,
  createTopicRunResult,
  makeBankQuestion,
  seedBankQuestions,
  type ConfirmationTestFixture,
} from "./fixtures/topicConfirmationFixtures.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }).catch(() => {})));
});

function yesNoQuestion(id: string): BankQuestion {
  return makeBankQuestion(id, {
    archetype_id: "verdict_yes_no",
    format: "yes_no",
    question: `Is ${id} true?`,
    choices: [
      { id: "c1", text: "Yes", is_correct: true },
      { id: "c2", text: "No", is_correct: false },
    ],
    visual_spec: { intent: "question_illustration", prompt: `A picture for ${id}`, aspect_ratio: "9:16" },
  });
}

function imageQuestion(id: string): BankQuestion {
  return makeBankQuestion(id, { visual_spec: { intent: "question_illustration", prompt: `A picture for ${id}`, aspect_ratio: "9:16" } });
}

/** Five text questions with Yes/No questions in positions 2 and 4, like the director fixture. */
function textTopicQuestions(prefix: string): BankQuestion[] {
  return [1, 2, 3, 4, 5].map((n) => (n % 2 === 0 ? yesNoQuestion(`${prefix}_${n}`) : makeBankQuestion(`${prefix}_${n}`)));
}

async function seedQuizShortTopic(fixture: ConfirmationTestFixture, topicId: string, questions: BankQuestion[]) {
  await seedBankQuestions(fixture.repo, questions);
  const candidate = createBoundCandidate({
    channelId: fixture.channel.channel_id,
    topicId,
    contentKind: "quiz_short",
    title: `Topic ${topicId}`,
    questions,
    overrides: { archetype: undefined, age_band: "7-9" },
  });
  await fixture.repo.saveTopicRun(fixture.channel.channel_id, createTopicRunResult(`run_${topicId}`, [candidate]));
  return candidate;
}

function confirm(fixture: ConfirmationTestFixture, topicId: string, extra: Record<string, unknown> = {}, tasks?: TaskManager) {
  return createQuizShortFromTopicWithBank({
    repository: fixture.repo,
    tasks,
    channelId: fixture.channel.channel_id,
    input: { topic_id: topicId, auto_start_pipeline: false, ...extra },
  });
}

describe("Quiz Short topic confirmation", () => {
  it("creates the record, quiz and alternating portrait director plan", async () => {
    const fixture = await createConfirmationTestFixture(roots, projectRoot);
    const questions = textTopicQuestions("qs_text");
    await seedQuizShortTopic(fixture, "topic_text", questions);

    const result = await confirm(fixture, "topic_text");
    const { quiz_short: quizShort } = result;

    expect(quizShort.quiz_short_id.startsWith("qshort_")).toBe(true);
    expect(quizShort.stage).toBe("SELECTED");
    expect(quizShort.quiz_config.question_count).toBe(5);
    expect(quizShort.quiz_config.render_aspect_ratio).toBe("9:16");
    expect(quizShort.quiz_config.layout_pair).toEqual({ primary: "short_stack_list", secondary: "short_verdict_yes_no" });
    expect(result.quiz.questions.map((question) => question.number)).toEqual([1, 2, 3, 4, 5]);
    expect(result.director_plan.beats.map((beat) => beat.layout_id)).toEqual([
      "short_stack_list",
      "short_verdict_yes_no",
      "short_stack_list",
      "short_verdict_yes_no",
      "short_stack_list",
    ]);
    expect(result.question_ids).toEqual(questions.map((question) => question.id));
    expect(result.task).toBeNull();

    const productDir = fixture.repo.resolvePath("channels", fixture.channel.slug, "quiz_shorts", quizShort.slug);
    const record = JSON.parse(await readFile(path.join(productDir, "quiz_short.json"), "utf8")) as { quiz_short_id: string };
    expect(record.quiz_short_id).toBe(quizShort.quiz_short_id);
    const ref = quizShortProductRef(fixture.channel.channel_id, quizShort.quiz_short_id);
    expect((await fixture.repo.readQuiz(fixture.channel.channel_id, ref))?.questions).toHaveLength(5);
    expect((await fixture.repo.readDirectorPlan(fixture.channel.channel_id, ref))?.beats).toHaveLength(5);
    expect(await readFile(path.join(productDir, "sources.md"), "utf8")).toContain(questions[0].id);

    const receipt = await getTopicConfirmationReceipt(fixture.repo, fixture.channel.channel_id, "topic_text");
    expect(receipt?.content_kind).toBe("quiz_short");
    expect(receipt?.status).toBe("completed");
    expect(receipt?.product_id).toBe(quizShort.quiz_short_id);

    const history = await fixture.repo.readQuestionHistory(fixture.channel.channel_id);
    const entries = history.filter((entry) => entry.episode_id === quizShort.quiz_short_id);
    expect(entries).toHaveLength(5);
    expect(entries.every((entry) => entry.content_type === "quiz_short")).toBe(true);
    const topic = (await fixture.repo.listTopics(fixture.channel.channel_id)).find((item) => item.topic_id === "topic_text");
    expect(topic?.selected).toBe(true);
  });

  it("adapts the versus beats of an image topic to two choices", async () => {
    const fixture = await createConfirmationTestFixture(roots, projectRoot);
    const questions = [1, 2, 3, 4, 5].map((n) => imageQuestion(`qs_img_${n}`));
    await seedQuizShortTopic(fixture, "topic_image", questions);

    const result = await confirm(fixture, "topic_image");
    expect(result.quiz_short.quiz_config.layout_pair).toEqual({ primary: "short_media_top_choices", secondary: "short_versus_two" });
    expect(result.quiz.questions.map((question) => question.choices.length)).toEqual([3, 2, 3, 2, 3]);
    expect(result.quiz.questions[1].adapted_from_choice_ids).toHaveLength(1);
    expect(result.quiz.questions[0].adapted_from_choice_ids).toBeUndefined();
    expect(result.director_plan.beats.map((beat) => beat.layout_id)).toEqual([
      "short_media_top_choices",
      "short_versus_two",
      "short_media_top_choices",
      "short_versus_two",
      "short_media_top_choices",
    ]);
    expect((await fixture.repo.getQuestionBankQuestion(questions[1].id))?.choices).toHaveLength(3);
  });

  it("replays a completed receipt with the same record and no new task", async () => {
    const fixture = await createConfirmationTestFixture(roots, projectRoot);
    await seedQuizShortTopic(fixture, "topic_replay", textTopicQuestions("qs_replay"));

    const first = await confirm(fixture, "topic_replay");
    const second = await confirm(fixture, "topic_replay");
    expect(second.quiz_short.quiz_short_id).toBe(first.quiz_short.quiz_short_id);
    expect(second.quiz.questions).toEqual(first.quiz.questions);
    expect(second.task).toBeNull();
    expect(await fixture.repo.listQuizShorts(fixture.channel.channel_id)).toHaveLength(1);

    await expect(confirm(fixture, "topic_replay", { question_count: 3 })).rejects.toThrow(/CONFIRMATION_OPTIONS_CONFLICT/);
  });

  it("rejects a topic already confirmed as another kind", async () => {
    const fixture = await createConfirmationTestFixture(roots, projectRoot);
    await seedQuizShortTopic(fixture, "topic_kind", textTopicQuestions("qs_kind"));
    await saveTopicConfirmationReceipt(
      fixture.repo,
      fixture.channel.channel_id,
      createMockReceipt(fixture.channel.channel_id, "topic_kind", { content_kind: "episode" }),
    );
    await expect(confirm(fixture, "topic_kind")).rejects.toThrow(/CONFIRMATION_KIND_CONFLICT/);
  });

  it("rejects non Quiz Short candidates, insufficient capacity and modified sources", async () => {
    const fixture = await createConfirmationTestFixture(roots, projectRoot);
    const channelId = fixture.channel.channel_id;
    const three = [1, 2, 3].map((n) => makeBankQuestion(`qs_cap_${n}`));
    await seedQuizShortTopic(fixture, "topic_capacity", three);
    await expect(confirm(fixture, "topic_capacity", { question_count: 5 })).rejects.toThrow(/INSUFFICIENT_SOURCE_CAPACITY/);

    const modified = makeBankQuestion("qs_mod_1");
    await seedBankQuestions(fixture.repo, [modified]);
    const staleCandidate = createBoundCandidate({
      channelId,
      topicId: "topic_modified",
      contentKind: "quiz_short",
      questionCount: 3,
      sourceBindings: [
        createSourceBinding(modified.id, "0".repeat(64)),
        createSourceBinding(three[0].id, hashBankQuestionSource(three[0])),
        createSourceBinding(three[1].id, hashBankQuestionSource(three[1])),
      ],
      overrides: { archetype: undefined },
    });
    const episodeCandidate = createBoundCandidate({ channelId, topicId: "topic_episode", contentKind: "episode", questions: three });
    await fixture.repo.saveTopicRun(channelId, createTopicRunResult("run_mixed", [staleCandidate, episodeCandidate]));

    await expect(confirm(fixture, "topic_modified")).rejects.toThrow(/SOURCE_QUESTION_MODIFIED/);
    await expect(confirm(fixture, "topic_episode")).rejects.toMatchObject({ code: "INVALID_TOPIC_KIND" });
    await expect(confirm(fixture, "topic_capacity", { render_aspect_ratio: "16:9" })).rejects.toMatchObject({
      code: "UNSUPPORTED_ASPECT_RATIO",
    });
    expect(await fixture.repo.listQuizShorts(channelId)).toHaveLength(0);
  });

  it("localizes the questions of a non-English channel and writes the artifact", async () => {
    const fixture = await createConfirmationTestFixture(roots, projectRoot, { language: "de" });
    const questions = [1, 2, 3].map((n) => makeBankQuestion(`qs_de_${n}`));
    await seedQuizShortTopic(fixture, "topic_de", questions);

    const result = await createQuizShortFromTopicWithBank({
      repository: fixture.repo,
      channelId: fixture.channel.channel_id,
      llmClient: createGermanLocalizationStubLlm(questions.map((question) => question.id)),
      input: { topic_id: "topic_de", auto_start_pipeline: false },
    });

    expect(result.quiz.language).toBe("de");
    expect(result.quiz.questions[0].question).toBe("Welche Frage 1?");
    expect(result.quiz.questions[0].choices.map((choice) => choice.text)).toContain("Option A auf Deutsch");
    const artifact = await loadQuizShortLocalizationArtifact(fixture.repo, fixture.channel.channel_id, result.quiz_short.quiz_short_id);
    expect(artifact?.content_kind).toBe("quiz_short");
    expect(artifact?.target_language).toBe("de");
    expect(artifact?.status).toBe("applied");
    expect(artifact?.quiz_questions).toHaveLength(3);
  });

  it("submits the pipeline task for the Quiz Short product when auto start is on", async () => {
    const fixture = await createConfirmationTestFixture(roots, projectRoot);
    await seedQuizShortTopic(fixture, "topic_task", textTopicQuestions("qs_task"));
    const submitted: unknown[] = [];
    const tasks = {
      submitForProduct: (taskType: string, ref: unknown) => {
        submitted.push([taskType, ref]);
        return { task_id: "task_qs_1", task_type: taskType, product_kind: "quiz_short" } as unknown as Task;
      },
    } as unknown as TaskManager;

    const result = await confirm(fixture, "topic_task", { auto_start_pipeline: true }, tasks);
    expect(result.task?.task_id).toBe("task_qs_1");
    expect(submitted).toEqual([
      ["GENERATE_PIPELINE", { kind: "quiz_short", channel_id: fixture.channel.channel_id, product_id: result.quiz_short.quiz_short_id }],
    ]);
  });
});
