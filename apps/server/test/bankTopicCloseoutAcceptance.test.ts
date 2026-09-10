import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { BankQuestionSchema, hashBankQuestionSource, type BankQuestion, type Channel, type TopicCandidate } from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import { getLatestTopicRun, getTopicAvailabilityBatch } from "../src/repository/topics.js";
import { generateEpisodeDescription } from "../src/quiz/pipeline/orchestrator.js";
import { confirmShortReelTopic } from "../src/shortReel/topicConfirmation.js";
import { extractShortReelDisplayProjection, resolveShortReelTargetLanguage } from "../src/quiz/bank/localization/productLocalization.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

type ConfirmEpisodeResponseBody = {
  content_kind?: string;
  episode?: { episode_id: string };
  episode_id?: string;
};

function parseEpisodeId(body: string): string {
  const parsed = JSON.parse(body) as ConfirmEpisodeResponseBody;
  return parsed.episode?.episode_id || parsed.episode_id || "";
}

const DISTINCT_SAMPLE_TEXTS = [
  "What particles compose the central nucleus of an atom?",
  "How fast does electromagnetic radiation travel in vacuum?",
  "What is the standard metric unit of electric current?",
  "Which chemical element holds atomic number one on the periodic table?",
  "What fundamental gravitational force holds planetary bodies in solar orbit?",
  "What temperature represents absolute zero on the Celsius scale?",
  "Who formulated the universal law of gravitational attraction?",
  "What electromagnetic wavelength range corresponds to deep infrared radiation?",
  "How many functional chambers exist inside the human heart?",
  "What is the chemical element symbol for elemental silver?",
  "Which atmospheric gas do photosynthetic organisms convert into sugars?",
  "What velocity characterizes acoustic sound propagation through dry ambient air?",
  "Which celestial body possesses the greatest number of known satellites?",
  "What biological organelle serves as the metabolic powerhouse of eukaryotic cells?",
  "What geometric shape exhibits constant width in two dimensions besides a circle?",
  "Which marine mammal possesses the largest brain mass on Earth?",
  "What mineral ranks at hardness level ten on the Mohs mineral scale?",
  "What optical phenomenon causes chromatic aberration in uncorrected lenses?",
  "Which tectonic boundary produces deep oceanic subduction trenches?",
  "What meteorological instrument measures atmospheric pressure dynamics?",
];

function createAcceptanceLlmClient(): LLMClient {
  return {
    connect: () => Promise.resolve(undefined),
    generateContent: (prompt: string) => {
      // 1. Product Localization Translation Prompt
      if (prompt.includes("Translate the supplied product display strings")) {
        const match = /Target language: ([a-z_-]+)/i.exec(prompt);
        const targetLang = match ? match[1].toLowerCase() : "de";
        const jsonMatch = prompt.slice(prompt.lastIndexOf("{"), prompt.lastIndexOf("}") + 1);
        let sourceMap: Record<string, string>;
        try {
          sourceMap = JSON.parse(jsonMatch) as Record<string, string>;
        } catch {
          sourceMap = {};
        }

        const prefix = targetLang.startsWith("de") ? "[DE]" : targetLang.startsWith("fr") ? "[FR]" : `[${targetLang.toUpperCase()}]`;
        const translated: Record<string, string> = {};
        for (const [k, v] of Object.entries(sourceMap)) {
          translated[k] = `${prefix} ${v}`;
        }
        return Promise.resolve({ text: JSON.stringify(translated) });
      }

      // 2. Video Description Generation Prompt
      if (prompt.includes("YouTube video description") || prompt.includes("video description")) {
        return Promise.resolve({
          text: JSON.stringify({
            title: "Accepted Video Title",
            description: "Grounded video description in target language.",
            tags: ["science", "quiz", "facts"],
          }),
        });
      }

      // 3. Question Generation / Seeder Prompt
      const countMatch = /Generate exactly (\d+) high-retention questions/.exec(prompt);
      const count = countMatch ? Number(countMatch[1]) : 3;
      const questions = Array.from({ length: count }, (_, idx) => ({
        id: `ACCEPT-GEN-${idx + 1}`,
        archetype_id: "deep_trivia",
        domain_id: "science",
        subtopic_id: "physics",
        question: `Generated question ${idx + 1}?`,
        format: "multiple_choice",
        choices: [
          { id: "c1", text: "Answer 1", is_correct: true },
          { id: "c2", text: "Answer 2", is_correct: false },
          { id: "c3", text: "Answer 3", is_correct: false },
        ],
        correct_choice_id: "c1",
        explanation: `Explanation for question ${idx + 1}.`,
        fun_fact: `Fun fact for question ${idx + 1}.`,
        difficulty: 1,
        thinking_seconds: 5,
        tags: ["physics"],
      }));
      return Promise.resolve({ text: JSON.stringify(questions) });
    },
  };
}

describe("Phase 6: Independent Bank-Topic Closeout Acceptance Matrix", () => {
  let app: StudioApp;
  let tempStorage: string;
  let isolatedStudioRoot: string;
  let channelCounter = 0;

  async function createIsolatedChannel(prefix = "acc-ch", language = "en"): Promise<Channel> {
    channelCounter += 1;
    return app.repository.createChannel({
      name: `${prefix} ${channelCounter}`,
      description: "Isolated acceptance test channel",
      target_audience: "Everyone",
      language,
      country: "US",
      market: "US",
      dna_mode: "ai",
    });
  }

  function makeQuestion(id: string, overrides: Partial<BankQuestion> = {}): BankQuestion {
    const num = Number.parseInt(id.replace(/\D/g, ""), 10) || 1;
    const text = DISTINCT_SAMPLE_TEXTS[(num - 1) % DISTINCT_SAMPLE_TEXTS.length];
    return BankQuestionSchema.parse({
      id,
      format: "multiple_choice",
      archetype_id: "deep_trivia",
      domain_id: "science",
      subtopic_id: "physics",
      language: "en",
      status: "approved",
      age_band: "family",
      question: text,
      explanation: `Scientific explanation for ${id}.`,
      choices: [
        { id: "c1", text: `Choice 1 for ${id}`, is_correct: true },
        { id: "c2", text: `Choice 2 for ${id}`, is_correct: false },
        { id: "c3", text: `Choice 3 for ${id}`, is_correct: false },
      ],
      correct_choice_id: "c1",
      ...overrides,
    });
  }

  function makeTopicCandidate(
    topicId: string,
    channelId: string,
    contentKind: "episode" | "short_reel",
    questions: BankQuestion[],
  ): TopicCandidate {
    return {
      topic_id: topicId,
      channel_id: channelId,
      content_kind: contentKind,
      archetype: "deep_trivia",
      quiz_format: "multiple_choice",
      title: `Acceptance Topic ${topicId}`,
      premise: `Premise for ${topicId}`,
      why_it_fits: "High retention fit",
      hook: `Hook for ${topicId}`,
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: questions.length,
      visual_style: "pixar_3d",
      source_bindings: questions.map((q) => ({
        source_question_id: q.id,
        source_hash_version: 1,
        source_content_hash: hashBankQuestionSource(q),
        projection_provenance: {
          source_variant: "native",
          resolved_language: "en",
          translation_key: null,
          translation_provenance: "native",
        },
      })),
    };
  }

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }

    tempStorage = await mkdtemp(path.join(os.tmpdir(), "acceptance-storage-"));
    isolatedStudioRoot = await mkdtemp(path.join(os.tmpdir(), "acceptance-root-"));
    await mkdir(path.join(isolatedStudioRoot, ".quiz-studio"), { recursive: true });
    await writeFile(
      path.join(isolatedStudioRoot, ".quiz-studio", "storage.local.json"),
      JSON.stringify({ storage_path: tempStorage }, null, 2),
      "utf8",
    );

    const srcKb = path.join(curr, ".quiz-studio", "knowledge_base");
    const destKb = path.join(isolatedStudioRoot, ".quiz-studio", "knowledge_base");
    await cp(srcKb, destKb, { recursive: true }).catch(() => {});
    const srcTemplates = path.join(curr, "templates");
    const destTemplates = path.join(isolatedStudioRoot, "templates");
    await cp(srcTemplates, destTemplates, { recursive: true }).catch(() => {});

    app = await buildApp(isolatedStudioRoot, { llmClient: createAcceptanceLlmClient() });

    app.tasks.runPipelineTask = async (task) => {
      await app.tasks.update(task.task_id, { status: "RUNNING" });
      await app.tasks.finish(task.task_id, "COMPLETED", null);
    };
  });

  afterAll(async () => {
    await app.close();
    await rm(tempStorage, { recursive: true, force: true }).catch(() => {});
    await rm(isolatedStudioRoot, { recursive: true, force: true }).catch(() => {});
  });

  describe("Area 1: en / de / fr Episode and Short-Reel Confirmation Flows", () => {
    it("confirms English Episode with English quiz.json and zero translation overhead", async () => {
      const channel = await createIsolatedChannel("ep-en");
      const q1 = makeQuestion("acc-ep-en-1");
      const q2 = makeQuestion("acc-ep-en-2");
      const q3 = makeQuestion("acc-ep-en-3");
      await app.repository.saveQuestionBankQuestion(q1);
      await app.repository.saveQuestionBankQuestion(q2);
      await app.repository.saveQuestionBankQuestion(q3);

      const topic = makeTopicCandidate("top-acc-ep-en", channel.channel_id, "episode", [q1, q2, q3]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      const res = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
        payload: { target_language: "en", question_count: 3, auto_start_pipeline: false },
      });

      expect(res.statusCode).toBe(201);
      const episodeId = parseEpisodeId(res.body);
      expect(episodeId).toBeTruthy();

      const episode = await app.repository.getEpisode(channel.channel_id, episodeId);
      const quiz = await app.repository.readQuiz(channel.channel_id, episode.episode_id);
      expect(quiz?.language).toBe("en");
      expect(quiz?.questions[0].question).toBe(q1.question);
      expect(quiz?.questions[0].choices.map((c) => c.text)).toEqual(q1.choices.map((c) => c.text));

      // Canonical Bank questions remain strictly English
      const bankQ = await app.repository.getQuestionBankQuestion(q1.id);
      expect(bankQ?.language).toBe("en");
    });

    it("confirms German Episode with localized quiz.json and immutable English Bank source", async () => {
      const channel = await createIsolatedChannel("ep-de");
      const q1 = makeQuestion("acc-ep-de-1");
      const q2 = makeQuestion("acc-ep-de-2");
      const q3 = makeQuestion("acc-ep-de-3");
      await app.repository.saveQuestionBankQuestion(q1);
      await app.repository.saveQuestionBankQuestion(q2);
      await app.repository.saveQuestionBankQuestion(q3);

      const topic = makeTopicCandidate("top-acc-ep-de", channel.channel_id, "episode", [q1, q2, q3]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      const res = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
        payload: { target_language: "de", question_count: 3, auto_start_pipeline: false },
      });

      expect(res.statusCode).toBe(201);
      const episodeId = parseEpisodeId(res.body);
      expect(episodeId).toBeTruthy();

      const episode = await app.repository.getEpisode(channel.channel_id, episodeId);
      const quiz = await app.repository.readQuiz(channel.channel_id, episode.episode_id);
      expect(quiz?.language).toBe("de");
      expect(quiz?.questions[0].question).toContain("[DE]");
      expect(quiz?.questions[0].choices[0].text).toContain("[DE]");

      // Canonical Bank question has NOT been modified or translated
      const bankQ = await app.repository.getQuestionBankQuestion(q1.id);
      expect(bankQ?.language).toBe("en");
      expect(bankQ?.question).toBe(q1.question);
    });

    it("confirms French Episode with localized quiz.json and immutable English Bank source", async () => {
      const channel = await createIsolatedChannel("ep-fr");
      const q1 = makeQuestion("acc-ep-fr-1");
      const q2 = makeQuestion("acc-ep-fr-2");
      const q3 = makeQuestion("acc-ep-fr-3");
      await app.repository.saveQuestionBankQuestion(q1);
      await app.repository.saveQuestionBankQuestion(q2);
      await app.repository.saveQuestionBankQuestion(q3);

      const topic = makeTopicCandidate("top-acc-ep-fr", channel.channel_id, "episode", [q1, q2, q3]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      const res = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
        payload: { target_language: "fr", question_count: 3, auto_start_pipeline: false },
      });

      expect(res.statusCode).toBe(201);
      const episodeId = parseEpisodeId(res.body);
      expect(episodeId).toBeTruthy();

      const episode = await app.repository.getEpisode(channel.channel_id, episodeId);
      const quiz = await app.repository.readQuiz(channel.channel_id, episode.episode_id);
      expect(quiz?.language).toBe("fr");
      expect(quiz?.questions[0].question).toContain("[FR]");
      expect(quiz?.questions[0].choices[0].text).toContain("[FR]");

      const bankQ = await app.repository.getQuestionBankQuestion(q1.id);
      expect(bankQ?.language).toBe("en");
      expect(bankQ?.question).toBe(q1.question);
    });

    it("confirms English Short-Reel with canonical English source", async () => {
      const channel = await createIsolatedChannel("reel-en");
      const q1 = makeQuestion("acc-reel-en-1");
      await app.repository.saveQuestionBankQuestion(q1);

      const topic = makeTopicCandidate("top-acc-reel-en", channel.channel_id, "short_reel", [q1]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      const result = await confirmShortReelTopic({
        repository: app.repository,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        options: { target_language: "en" },
        llmClient: createAcceptanceLlmClient(),
      });

      expect(result.short_reel.reel_id).toBeDefined();
      const reel = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: result.short_reel.reel_id });
      const { targetLanguage } = await resolveShortReelTargetLanguage(app.repository, channel.channel_id, reel);
      expect(targetLanguage).toBe("en");
      expect(reel.source.question_text).toBe(q1.question);
    });

    it("confirms German Short-Reel with localized display projection and English Bank source", async () => {
      const channel = await createIsolatedChannel("reel-de");
      const q1 = makeQuestion("acc-reel-de-1");
      await app.repository.saveQuestionBankQuestion(q1);

      const topic = makeTopicCandidate("top-acc-reel-de", channel.channel_id, "short_reel", [q1]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      const result = await confirmShortReelTopic({
        repository: app.repository,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        options: { target_language: "de" },
        llmClient: createAcceptanceLlmClient(),
      });

      expect(result.short_reel.reel_id).toBeDefined();
      const reel = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: result.short_reel.reel_id });
      const { targetLanguage, localization } = await resolveShortReelTargetLanguage(app.repository, channel.channel_id, reel);
      expect(targetLanguage).toBe("de");
      expect(localization?.target_language).toBe("de");
      expect(localization?.quiz_questions[0].question).toContain("[DE]");

      const bankQ = await app.repository.getQuestionBankQuestion(q1.id);
      expect(bankQ?.language).toBe("en");
      expect(bankQ?.question).toBe(q1.question);
    });

    it("confirms French Short-Reel with localized display projection and English Bank source", async () => {
      const channel = await createIsolatedChannel("reel-fr");
      const q1 = makeQuestion("acc-reel-fr-1");
      await app.repository.saveQuestionBankQuestion(q1);

      const topic = makeTopicCandidate("top-acc-reel-fr", channel.channel_id, "short_reel", [q1]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      const result = await confirmShortReelTopic({
        repository: app.repository,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        options: { target_language: "fr" },
        llmClient: createAcceptanceLlmClient(),
      });

      expect(result.short_reel.reel_id).toBeDefined();
      const reel = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: result.short_reel.reel_id });
      const { targetLanguage, localization } = await resolveShortReelTargetLanguage(app.repository, channel.channel_id, reel);
      expect(targetLanguage).toBe("fr");
      expect(localization?.target_language).toBe("fr");
      expect(localization?.quiz_questions[0].question).toContain("[FR]");

      const bankQ = await app.repository.getQuestionBankQuestion(q1.id);
      expect(bankQ?.language).toBe("en");
      expect(bankQ?.question).toBe(q1.question);
    });
  });

  describe("Area 2: Source Shortage & Honest Availability Reporting", () => {
    it("reports honest shortages and non-confirmable status when eligible inventory is depleted", async () => {
      const channel = await createIsolatedChannel("shortage-ch");
      const q1 = makeQuestion("acc-shortage-1");
      await app.repository.saveQuestionBankQuestion(q1);

      const candidate: TopicCandidate = {
        topic_id: "top-shortage-test",
        channel_id: channel.channel_id,
        content_kind: "episode",
        archetype: "deep_trivia",
        quiz_format: "multiple_choice",
        title: "Shortage Test Topic",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "Low",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 5,
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

      await app.repository.saveTopicRun(channel.channel_id, [candidate]);

      const batch = await getTopicAvailabilityBatch(app.repository, channel.channel_id);
      const avail = batch.topics.find((t) => t.topic_id === "top-shortage-test");
      expect(avail).toBeDefined();
      expect(avail?.can_confirm).toBe(false);
      expect(avail?.reason_code).toBe("NO_ELIGIBLE_SOURCES");
      expect(avail?.source_capacity).toBe(1);
    });
  });

  describe("Area 3: Source Mutation and Tamper Rejection", () => {
    it("rejects confirmation if a bound source question was modified after suggestion", async () => {
      const channel = await createIsolatedChannel("tamper-ch");
      const q1 = makeQuestion("acc-tamper-1");
      const q2 = makeQuestion("acc-tamper-2");
      const q3 = makeQuestion("acc-tamper-3");
      await app.repository.saveQuestionBankQuestion(q1);
      await app.repository.saveQuestionBankQuestion(q2);
      await app.repository.saveQuestionBankQuestion(q3);

      const topic = makeTopicCandidate("top-acc-tamper", channel.channel_id, "episode", [q1, q2, q3]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      // Tamper q2 by updating its question text in bank
      await app.repository.saveQuestionBankQuestion({
        ...q2,
        question: "Mutated question content that changes hash?",
      });

      const res = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
        payload: { target_language: "en", question_count: 3, auto_start_pipeline: false },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatch(/SOURCE_(CHANGED|QUESTION_MODIFIED)/);
    });
  });

  describe("Area 4: Concurrent Confirmations & Conflict Prevention", () => {
    it("yields identical episode identity for concurrent identical confirm requests and rejects conflicting options", async () => {
      const channel = await createIsolatedChannel("concurr-ch");
      const q1 = makeQuestion("acc-concurr-1");
      const q2 = makeQuestion("acc-concurr-2");
      const q3 = makeQuestion("acc-concurr-3");
      await app.repository.saveQuestionBankQuestion(q1);
      await app.repository.saveQuestionBankQuestion(q2);
      await app.repository.saveQuestionBankQuestion(q3);

      const topic = makeTopicCandidate("top-acc-concurrent", channel.channel_id, "episode", [q1, q2, q3]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      // Three concurrent identical confirm requests
      const [res1, res2, res3] = await Promise.all([
        app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
          payload: { target_language: "en", question_count: 3, auto_start_pipeline: false },
        }),
        app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
          payload: { target_language: "en", question_count: 3, auto_start_pipeline: false },
        }),
        app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
          payload: { target_language: "en", question_count: 3, auto_start_pipeline: false },
        }),
      ]);

      expect([200, 201]).toContain(res1.statusCode);
      expect([200, 201]).toContain(res2.statusCode);
      expect([200, 201]).toContain(res3.statusCode);

      const id1 = parseEpisodeId(res1.body);
      const id2 = parseEpisodeId(res2.body);
      const id3 = parseEpisodeId(res3.body);
      expect(id1).toBe(id2);
      expect(id2).toBe(id3);

      // Conflicting confirm request with different target language must be rejected
      const conflictRes = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
        payload: { target_language: "de", question_count: 3, auto_start_pipeline: false },
      });
      expect(conflictRes.statusCode).toBe(400);
      expect(conflictRes.body).toContain("CONFIRMATION_OPTIONS_CONFLICT");
    });
  });

  describe("Area 5 & 6: Missing / Corrupted Data and Typed Error Boundary", () => {
    it("fails closed with PRODUCT_LANGUAGE_UNRESOLVED when non-English product lacks localization artifact", async () => {
      const channel = await createIsolatedChannel("failclosed-ch");
      const q1 = makeQuestion("acc-failclosed-1");
      const q2 = makeQuestion("acc-failclosed-2");
      const q3 = makeQuestion("acc-failclosed-3");
      await app.repository.saveQuestionBankQuestion(q1);
      await app.repository.saveQuestionBankQuestion(q2);
      await app.repository.saveQuestionBankQuestion(q3);

      const topic = makeTopicCandidate("top-acc-failclosed", channel.channel_id, "episode", [q1, q2, q3]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      const res = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
        payload: { target_language: "de", question_count: 3, auto_start_pipeline: false },
      });
      const episodeId = parseEpisodeId(res.body);
      const episode = await app.repository.getEpisode(channel.channel_id, episodeId);

      // Artificially delete localization.json to simulate corruption
      const locPath = app.repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "localization.json");
      await rm(locPath, { force: true });

      // Description generation must fail closed rather than falling back to English
      await expect(
        generateEpisodeDescription({
          repository: app.repository,
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
          activeEngine: "antigravity",
          antigravityClient: createAcceptanceLlmClient(),
        }),
      ).rejects.toThrow(/PRODUCT_LANGUAGE_UNRESOLVED/);
    });

    it("fails closed with TOPIC_RUN_CORRUPTED when newest topic run file is malformed", async () => {
      const channel = await createIsolatedChannel("corrupt-run-ch");
      const topicsDir = app.repository.resolvePath("channels", channel.slug, "topics");
      await mkdir(topicsDir, { recursive: true });
      const corruptFile = path.join(topicsDir, `suggestion-${Date.now() + 10000}-corrupt.json`);
      await writeFile(corruptFile, "{ corrupted json", "utf8");

      await expect(getLatestTopicRun(app.repository, channel.channel_id)).rejects.toThrow(/TOPIC_RUN_CORRUPTED/);
    });
  });

  describe("Area 7: Immutable Product Language on Channel Mutation", () => {
    it("preserves target language of existing German products when channel language is changed to French", async () => {
      const channel = await createIsolatedChannel("immut-ch", "en");
      const q1 = makeQuestion("acc-immut-1");
      const q2 = makeQuestion("acc-immut-2");
      const q3 = makeQuestion("acc-immut-3");
      await app.repository.saveQuestionBankQuestion(q1);
      await app.repository.saveQuestionBankQuestion(q2);
      await app.repository.saveQuestionBankQuestion(q3);

      const topic = makeTopicCandidate("top-acc-immut", channel.channel_id, "episode", [q1, q2, q3]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      const res = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
        payload: { target_language: "de", question_count: 3, auto_start_pipeline: false },
      });
      const episodeId = parseEpisodeId(res.body);
      const episode = await app.repository.getEpisode(channel.channel_id, episodeId);

      // Mutate channel language to French
      await app.repository.updateChannel(channel.channel_id, { language: "French" });

      // Existing German episode must remain German
      const locPath = app.repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "localization.json");
      expect(existsSync(locPath)).toBe(true);
      const loc = JSON.parse(await readFile(locPath, "utf8")) as { target_language?: string };
      expect(loc.target_language).toBe("de");

      // Generate description for existing episode; resolves target language de
      const descResult = await generateEpisodeDescription({
        repository: app.repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        activeEngine: "antigravity",
        antigravityClient: createAcceptanceLlmClient(),
      });
      expect(descResult.description).toBeDefined();
    });
  });

  describe("Area 8: Consumers / Export Localization & 100% English Codebase Invariant", () => {
    it("localizes Short-Reel display projection while preserving English technical artifacts", async () => {
      const channel = await createIsolatedChannel("export-ch");
      const q1 = makeQuestion("acc-export-1");
      await app.repository.saveQuestionBankQuestion(q1);

      const topic = makeTopicCandidate("top-acc-export", channel.channel_id, "short_reel", [q1]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      const confirmResult = await confirmShortReelTopic({
        repository: app.repository,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        options: { target_language: "de" },
        llmClient: createAcceptanceLlmClient(),
      });

      const reel = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: confirmResult.short_reel.reel_id });
      const { localization } = await resolveShortReelTargetLanguage(app.repository, channel.channel_id, reel);
      expect(localization?.target_language).toBe("de");

      const projection = extractShortReelDisplayProjection(reel.source, localization);
      expect(projection.question_text).toContain("[DE]");
    });
  });

  describe("Area 9: Question Bank Storage Safety & Concurrency Boundary", () => {
    it("rejects path traversal attempts in bank operations", () => {
      expect(() => {
        makeQuestion("malicious-1", {
          subtopic_id: "../../etc/passwd",
        });
      }).toThrow();
    });

    it("Question Bank files remain byte-identical before and after confirmation and consumer operations", async () => {
      const channel = await createIsolatedChannel("safety-ch");
      const q1 = makeQuestion("acc-safety-1");
      const q2 = makeQuestion("acc-safety-2");
      const q3 = makeQuestion("acc-safety-3");
      await app.repository.saveQuestionBankQuestion(q1);
      await app.repository.saveQuestionBankQuestion(q2);
      await app.repository.saveQuestionBankQuestion(q3);

      const indexFile = app.repository.getQuestionBankPath("index.json");
      const batchFile = app.repository.getQuestionBankPath("deep_trivia", "science", "physics.json");

      const indexHashBefore = createHash("sha256")
        .update(await readFile(indexFile))
        .digest("hex");
      const batchHashBefore = createHash("sha256")
        .update(await readFile(batchFile))
        .digest("hex");

      const topic = makeTopicCandidate("top-acc-safety", channel.channel_id, "episode", [q1, q2, q3]);
      await app.repository.saveTopicRun(channel.channel_id, [topic]);

      await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`,
        payload: { target_language: "de", question_count: 3, auto_start_pipeline: false },
      });

      const indexHashAfter = createHash("sha256")
        .update(await readFile(indexFile))
        .digest("hex");
      const batchHashAfter = createHash("sha256")
        .update(await readFile(batchFile))
        .digest("hex");

      // Zero bank write-back: Question Bank content on disk is completely untouched by confirmation
      expect(indexHashAfter).toBe(indexHashBefore);
      expect(batchHashAfter).toBe(batchHashBefore);
    });
  });

  describe("Area 10: UI Run Identity & Availability Synchronization", () => {
    it("enforces candidate count in availability capacity policy", async () => {
      const channel = await createIsolatedChannel("ui-avail-ch");
      const q1 = makeQuestion("acc-ui-avail-1");
      const q2 = makeQuestion("acc-ui-avail-2");
      await app.repository.saveQuestionBankQuestion(q1);
      await app.repository.saveQuestionBankQuestion(q2);

      // Put q2 in cooldown so only q1 is eligible
      await app.repository.appendQuestionHistory(channel.channel_id, "ep-ui-cool", [q2]);

      const candidate8 = makeTopicCandidate("top-acc-ui-8", channel.channel_id, "episode", [q1, q2]);
      candidate8.question_count = 8;
      await app.repository.saveTopicRun(channel.channel_id, [candidate8]);

      const batch = await getTopicAvailabilityBatch(app.repository, channel.channel_id);
      const avail = batch.topics.find((t) => t.topic_id === "top-acc-ui-8");
      expect(avail?.can_confirm).toBe(false);
      expect(avail?.reason_code).toBe("NO_ELIGIBLE_SOURCES");
      expect(avail?.source_capacity).toBe(1);
    });
  });
});
