import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildApp, type StudioApp } from "../src/app.js";
import { convertBankQuestionToQuizQuestion, createEpisodeFromQuestionBank } from "../src/quiz/bank/questionBankToQuizBridge.js";
import type { BankQuestion, BankTranslationContent } from "@studio/shared";

describe("Question Bank 1-Click Integration & Bridge", () => {
  let app: StudioApp;
  let testChannelId: string;
  let tempStorage: string;

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    app = await buildApp(curr);
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "qb-integration-storage-"));
    app.repository.setStorageRoot(tempStorage);
    await app.repository.deleteQuestionBankQuestion("INT-TEST-001").catch(() => {});
    await app.repository.deleteQuestionBankQuestion("INT-TEST-002").catch(() => {});
    await app.repository.deleteQuestionBankQuestion("INT-AUTO-TRANS-001").catch(() => {});
    await app.repository.deleteQuestionBankQuestion("INT-TRANS-ROUTE-001").catch(() => {});
    const channel = await app.repository.createChannel({
      name: "Integration Channel",
      language: "Spanish",
    });
    testChannelId = channel.channel_id;
  });

  afterAll(async () => {
    await app.repository.deleteQuestionBankQuestion("INT-TEST-001").catch(() => {});
    await app.repository.deleteQuestionBankQuestion("INT-TEST-002").catch(() => {});
    await app.repository.deleteQuestionBankQuestion("INT-AUTO-TRANS-001").catch(() => {});
    await app.repository.deleteQuestionBankQuestion("INT-TRANS-ROUTE-001").catch(() => {});
    await app.close();
    if (tempStorage) {
      await rm(tempStorage, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe("convertBankQuestionToQuizQuestion", () => {
    it("converts true_false format to exactly 2 choices with lowercase ids", () => {
      const bankQ: BankQuestion = {
        id: "VFM-NAT-001",
        archetype_id: "verdict_fact_myth",
        domain_id: "nature_animals",
        subtopic_id: "ocean_giants",
        question: "Is the blue whale the largest animal ever known to have lived on Earth?",
        format: "true_false",
        choices: [
          { id: "A", text: "True", is_correct: true },
          { id: "B", text: "False", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Blue whales can weigh up to 200 tons, exceeding any known dinosaur!",
        fun_fact: "A blue whale heart is roughly the size of a small car.",
        difficulty: 1,
        status: "approved",
        tags: ["ocean"],
      };

      const quizQ = convertBankQuestionToQuizQuestion(bankQ);
      expect(quizQ.id).toBe("VFM-NAT-001");
      expect(quizQ.number).toBe(1);
      expect(quizQ.format).toBe("true_false");
      expect(quizQ.choices).toHaveLength(2);
      expect(quizQ.choices.map((c) => c.id)).toEqual(["a", "b"]);
      expect(quizQ.correct_choice_id).toBe("a");
      expect(quizQ.explanation).toContain("Blue whales");
      expect(quizQ.fun_fact).toContain("blue whale heart");
    });

    it("converts multiple_choice with 4 choices to exactly 3 choices preserving correct choice", () => {
      const bankQ: BankQuestion = {
        id: "SPB-LOG-002",
        archetype_id: "speed_blitz",
        domain_id: "logic_puzzles",
        subtopic_id: "tricky_riddles",
        question: "What can you hold in your left hand but never in your right hand?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "Your left hand", is_correct: false },
          { id: "B", text: "Your right elbow", is_correct: true },
          { id: "C", text: "A pencil", is_correct: false },
          { id: "D", text: "A mobile phone", is_correct: false },
        ],
        correct_choice_id: "B",
        explanation: "Your right hand cannot physically hold your right elbow!",
        fun_fact: "This is a classic anatomical riddle.",
        difficulty: 2,
        status: "approved",
        tags: ["riddle"],
      };

      const quizQ = convertBankQuestionToQuizQuestion(bankQ);
      expect(quizQ.format).toBe("multiple_choice");
      expect(quizQ.choices).toHaveLength(3);
      expect(quizQ.choices.map((c) => c.id)).toEqual(["a", "b", "c"]);
      const correctChoice = quizQ.choices.find((c) => c.id === quizQ.correct_choice_id);
      expect(correctChoice?.text).toBe("Your right elbow");
    });

    it("translates question, choices, and explanation when translation option is passed, preserving visual_opportunity prompt in English", () => {
      const englishQuestion: BankQuestion = {
        id: "ENG-Q-001",
        language: "en",
        archetype_id: "speed_blitz",
        domain_id: "science_tech",
        subtopic_id: "astronomy",
        question: "Which planet is known as the Red Planet?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "Mars", is_correct: true },
          { id: "B", text: "Venus", is_correct: false },
          { id: "C", text: "Jupiter", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Mars appears red due to iron oxide (rust) on its surface.",
        fun_fact: "Mars has the largest volcano in the solar system, Olympus Mons.",
        difficulty: 1,
        status: "approved",
        visual_spec: {
          prompt: "Cinematic 3D render of planet Mars glowing red in dark outer space with stars",
          composition: "centered",
        },
      };

      const translation: BankTranslationContent = {
        language: "es",
        question: "¿Qué planeta se conoce como el Planeta Rojo?",
        choices: [
          { id: "A", text: "Marte" },
          { id: "B", text: "Venus" },
          { id: "C", text: "Júpiter" },
        ],
        explanation: "Marte tiene un color rojizo por el óxido de hierro en su superficie.",
        fun_fact: "Marte alberga el Monte Olimpo, el volcán más grande del sistema solar.",
        translated_at: new Date().toISOString(),
        verified: true,
      };

      const converted = convertBankQuestionToQuizQuestion(englishQuestion, {
        language: "Spanish",
        translation,
      });

      expect(converted.question).toBe("¿Qué planeta se conoce como el Planeta Rojo?");
      expect(converted.choices.map((c) => c.text)).toEqual(["Marte", "Venus", "Júpiter"]);
      expect(converted.explanation).toContain("óxido de hierro");
      expect(converted.fun_fact).toContain("Monte Olimpo");
      // Critical requirement: visual_opportunity must remain 100% English prompt for image generation
      expect(converted.visual_opportunity).toBe("Cinematic 3D render of planet Mars glowing red in dark outer space with stars");
    });
  });

  describe("createEpisodeFromQuestionBank Service & REST Route", () => {
    it("creates episode, writes quiz.json, records cooldown and queues pipeline", async () => {
      // 1. Ensure question exists in bank
      const seedQuestion: BankQuestion = {
        id: "INT-TEST-001",
        archetype_id: "speed_blitz",
        domain_id: "logic_puzzles",
        subtopic_id: "tricky_riddles",
        question: "How many months in a year have 28 days?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "1 month", is_correct: false },
          { id: "B", text: "12 months", is_correct: true },
          { id: "C", text: "2 months", is_correct: false },
        ],
        correct_choice_id: "B",
        explanation: "Every month in a calendar year has at least 28 days!",
        fun_fact: "February has 28 days, or 29 in a leap year.",
        difficulty: 1,
        status: "approved",
        tags: ["calendar"],
      };

      await app.repository.saveQuestionBankQuestion(seedQuestion);

      // 2. Call service
      const result = await createEpisodeFromQuestionBank({
        repository: app.repository,
        tasks: app.tasks,
        channelId: testChannelId,
        input: {
          question_id: "INT-TEST-001",
          render_aspect_ratio: "9:16",
          auto_start_pipeline: true,
        },
      });

      expect(result.episode).toBeDefined();
      expect(result.episode.episode_id).toBeDefined();
      expect(result.episode.quiz_config.archetype).toBe("speed_blitz");
      expect(result.episode.quiz_config.target_layout).toBe("full_stack_list");
      expect(result.episode.quiz_config.render_aspect_ratio).toBe("9:16");
      expect(result.cooldown_recorded).toBe(true);

      // 3. Verify quiz.json was written
      const storedQuiz = await app.repository.readQuiz(testChannelId, result.episode.episode_id);
      expect(storedQuiz).toBeDefined();
      expect(storedQuiz?.questions).toHaveLength(1);
      expect(storedQuiz?.questions[0].question).toContain("How many months");

      // 4. Verify channel question cooldown is now ACTIVE
      const cooldownQuery = await app.repository.queryQuestionBankQuestions({
        channelId: testChannelId,
        search: "How many months in a year have 28 days?",
      });

      expect(cooldownQuery.questions).toHaveLength(1);
      const q = cooldownQuery.questions[0];
      expect(q.channel_cooldown?.is_cooldown).toBe(true);
      expect(q.channel_cooldown?.days_remaining).toBeGreaterThanOrEqual(29);
    });

    it("POST /api/channels/:channelId/question-bank/create-episode creates episode via REST API", async () => {
      const seedQuestion: BankQuestion = {
        id: "INT-TEST-002",
        archetype_id: "verdict_fact_myth",
        domain_id: "nature_animals",
        subtopic_id: "ocean_giants",
        question: "Do sharks ever get cancer?",
        format: "true_false",
        choices: [
          { id: "A", text: "True", is_correct: false },
          { id: "B", text: "False", is_correct: true },
        ],
        correct_choice_id: "B",
        explanation: "Scientists have documented numerous cases of sharks developing tumors and cancer.",
        fun_fact: "This false rumor originally started to promote shark cartilage supplements.",
        difficulty: 2,
        status: "approved",
        tags: ["shark", "myth"],
      };

      await app.repository.saveQuestionBankQuestion(seedQuestion);

      const res = await app.server.inject({
        method: "POST",
        url: `/api/channels/${testChannelId}/question-bank/create-episode`,
        payload: {
          question_id: "INT-TEST-002",
          render_aspect_ratio: "9:16",
          auto_start_pipeline: false,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.episode).toBeDefined();
      expect(body.episode.quiz_config.archetype).toBe("verdict_fact_myth");
      expect(body.episode.quiz_config.target_layout).toBe("verdict_true_false");
      expect(body.cooldown_recorded).toBe(true);
    });

    it("auto-transcreates English question on Spanish channel and caches translation to Question Bank", async () => {
      const enQuestion: BankQuestion = {
        id: "INT-AUTO-TRANS-001",
        language: "en",
        archetype_id: "speed_blitz",
        domain_id: "science_tech",
        subtopic_id: "physics",
        question: "What is the speed of light in a vacuum?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "300,000 km/s", is_correct: true },
          { id: "B", text: "150,000 km/s", is_correct: false },
          { id: "C", text: "3,000 km/s", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Light travels at approximately 299,792 kilometers per second in a vacuum.",
        fun_fact: "Nothing in the universe can travel faster than light.",
        difficulty: 2,
        status: "approved",
        visual_spec: {
          prompt: "A beam of glowing photon light accelerating across the cosmos, neon rays",
          composition: "wide_angle",
        },
      };

      await app.repository.saveQuestionBankQuestion(enQuestion);

      const emitter = new EventEmitter();
      const mockLlmClient = Object.assign(emitter, {
        connect: async () => {},
        startThread: async () => "thread-mock-int-1",
        startTurn: async (threadId: string, prompt: string) => {
          setTimeout(() => {
            emitter.emit("notification", {
              method: "item/agentMessage/delta",
              params: {
                delta: JSON.stringify({
                  language: "es",
                  question: "¿Cuál es la velocidad de la luz en el vacío?",
                  choices: [
                    { id: "A", text: "300.000 km/s" },
                    { id: "B", text: "150.000 km/s" },
                    { id: "C", text: "3.000 km/s" },
                  ],
                  explanation: "La luz viaja a aproximadamente 299.792 kilómetros por segundo en el vacío.",
                  fun_fact: "Nada en el universo puede viajar más rápido que la velocidad de la luz.",
                  verified: true,
                }),
              },
            });
            emitter.emit("notification", {
              method: "turn/completed",
              params: { turn: { status: "completed" } },
            });
          }, 10);
          return "turn-mock-int-1";
        },
      });

      // 1. Create episode using bridge with mock LLM client
      const result = await createEpisodeFromQuestionBank({
        repository: app.repository,
        tasks: app.tasks,
        channelId: testChannelId, // Spanish channel
        llmClient: mockLlmClient as any,
        input: {
          question_id: "INT-AUTO-TRANS-001",
          render_aspect_ratio: "9:16",
          auto_start_pipeline: false,
        },
      });

      expect(result.episode).toBeDefined();
      expect(result.quiz.language).toBe("Spanish");
      expect(result.quiz.questions[0].question).toBe("¿Cuál es la velocidad de la luz en el vacío?");
      expect(result.quiz.questions[0].choices[0].text).toBe("300.000 km/s");
      // Visual prompt strictly preserved in English
      expect(result.quiz.questions[0].visual_opportunity).toBe("A beam of glowing photon light accelerating across the cosmos, neon rays");
      // Localized topic
      expect(result.episode.topic.hook).toBe("¿Cuál es la velocidad de la luz en el vacío?");

      // 2. Verify cached translation was persisted in Question Bank on disk
      const updatedQuestion = await app.repository.getQuestionBankQuestion("INT-AUTO-TRANS-001");
      expect(updatedQuestion?.translations?.es).toBeDefined();
      expect(updatedQuestion?.translations?.es?.question).toBe("¿Cuál es la velocidad de la luz en el vacío?");
      expect(updatedQuestion?.translations?.es?.choices[0].text).toBe("300.000 km/s");
    });

    it("POST /api/question-bank/:id/transcreate translates on-demand and caches to disk", async () => {
      const seedQuestion: BankQuestion = {
        id: "INT-TRANS-ROUTE-001",
        language: "en",
        archetype_id: "verdict_fact_myth",
        domain_id: "nature_animals",
        subtopic_id: "dinosaurs",
        question: "Did Tyrannosaurus Rex have feathers?",
        format: "true_false",
        choices: [
          { id: "A", text: "True", is_correct: true },
          { id: "B", text: "False", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Recent fossil evidence suggests many theropods had proto-feathers.",
        fun_fact: "T-Rex was one of the largest apex predators in Earth's history.",
        difficulty: 2,
        status: "approved",
      };

      await app.repository.saveQuestionBankQuestion(seedQuestion);

      // Call transcreate route (offline fallback if no llmClient configured on server)
      const res = await app.server.inject({
        method: "POST",
        url: "/api/question-bank/INT-TRANS-ROUTE-001/transcreate",
        payload: {
          target_language: "es",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.language).toBe("es");
      expect(body.content).toBeDefined();
      expect(body.content.choices).toHaveLength(2);

      // Verify cached on disk
      const questionAfter = await app.repository.getQuestionBankQuestion("INT-TRANS-ROUTE-001");
      expect(questionAfter?.translations?.es).toBeDefined();

      // Second call returns cached: true
      const res2 = await app.server.inject({
        method: "POST",
        url: "/api/question-bank/INT-TRANS-ROUTE-001/transcreate",
        payload: {
          target_language: "es",
        },
      });
      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.body);
      expect(body2.cached).toBe(true);
    });
  });
});
