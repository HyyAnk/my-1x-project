import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import type { BankQuestion, BankTranslationContent } from "@studio/shared";
import {
  buildQuestionTranscreationPrompt,
  parseTranscreationOutput,
  transcreateBankQuestion,
} from "../src/quiz/bank/transcreation/index.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

const sampleQuestion: BankQuestion = {
  id: "VFM-NAT-OCN-0001",
  archetype_id: "verdict_fact_myth",
  domain_id: "nature_animals",
  subtopic_id: "ocean_giants",
  language: "en",
  question: "The Blue Whale is the largest animal ever known to have lived on Earth, true or false?",
  format: "true_false",
  choices: [
    { id: "A", text: "TRUE", is_correct: true },
    { id: "B", text: "FALSE", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "Blue whales can reach lengths of up to 30 meters and weigh up to 200 metric tons.",
  fun_fact: "A blue whale's heart alone is the size of a small car!",
  visual_spec: {
    intent: "question_illustration",
    prompt: "Cinematic underwater photograph of a colossal blue whale gliding gracefully through sunlit azure deep ocean waters, 8k resolution.",
    aspect_ratio: "16:9",
  },
  age_band: "family",
  difficulty: 2,
  thinking_seconds: 5,
  tags: ["ocean", "mammals", "whale"],
  status: "approved",
};

const sampleSpeedBlitzQuestion: BankQuestion = {
  id: "SPB-LOG-TRK-0001",
  archetype_id: "speed_blitz",
  domain_id: "logic_puzzles",
  subtopic_id: "tricky_riddles",
  language: "en",
  question: "A stick has 2 ends. How many ends does half a stick have?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "1 end", is_correct: false },
    { id: "B", text: "2 ends", is_correct: true },
    { id: "C", text: "0 ends", is_correct: false },
  ],
  correct_choice_id: "B",
  explanation: "If you break a stick in half, the half piece still has two ends!",
  fun_fact: "Classic misdirection trick question.",
  age_band: "family",
  difficulty: 3,
  thinking_seconds: 4,
  tags: ["riddle"],
  status: "approved",
};

describe("Multilingual Transcreation Module", () => {
  describe("buildQuestionTranscreationPrompt", () => {
    it("builds a culturally nuanced transcreation prompt for verdict_true_false in Spanish", () => {
      const prompt = buildQuestionTranscreationPrompt({
        question: sampleQuestion,
        targetLanguage: "es",
        channelTone: "Humorous, witty, curiosity-driven",
      });

      expect(prompt).toContain('target language: **🇪🇸 Español (code: "es")**');
      expect(prompt).toContain("True or False");
      expect(prompt).toContain('ID: "A"');
      expect(prompt).toContain('ID: "B"');
      expect(prompt).toContain('Correct Choice ID: "A"');
      expect(prompt).toContain("Do NOT translate visual prompt keywords");
      expect(prompt).toContain('Channel Personality / Tone: "Humorous, witty, curiosity-driven"');
      expect(prompt).toContain('"language": "es"');
    });

    it("includes specific Speed Blitz guidelines for fast reflex archetype", () => {
      const prompt = buildQuestionTranscreationPrompt({
        question: sampleSpeedBlitzQuestion,
        targetLanguage: "es",
      });

      expect(prompt).toContain("Speed Blitz");
      expect(prompt).toContain("Preserve wit, humor, and intuitive twist");
      expect(prompt).toContain('target language: **🇪🇸 Español (code: "es")**');
    });
  });

  describe("parseTranscreationOutput", () => {
    it("successfully parses valid raw JSON output", () => {
      const validJson = JSON.stringify({
        language: "es",
        question: "¿Es la ballena azul el animal más grande conocido que jamás haya vivido en la Tierra?",
        choices: [
          { id: "A", text: "VERDADERO" },
          { id: "B", text: "FALSO" },
        ],
        explanation: "Las ballenas azules pueden alcanzar hasta 30 metros de longitud y pesar hasta 200 toneladas métricas.",
        fun_fact: "¡El corazón de una ballena azul es del tamaño de un automóvil pequeño!",
        verified: true,
      });

      const result = parseTranscreationOutput(validJson, sampleQuestion);
      expect(result.language).toBe("es");
      expect(result.question).toContain("ballena azul");
      expect(result.choices).toHaveLength(2);
      expect(result.choices[0].id).toBe("A");
      expect(result.choices[0].text).toBe("VERDADERO");
      expect(result.choices[1].id).toBe("B");
      expect(result.choices[1].text).toBe("FALSO");
      expect(result.explanation).toContain("30 metros");
      expect(result.verified).toBe(true);
    });

    it("successfully extracts JSON wrapped in markdown code fences and surrounding text", () => {
      const wrapped = `
Here is the transcreated question for Spanish YouTube Shorts audience:

\`\`\`json
{
  "language": "es",
  "question": "Un palo tiene 2 extremos. ¿Cuántos extremos tiene medio palo?",
  "choices": [
    { "id": "A", "text": "1 extremo" },
    { "id": "B", "text": "2 extremos" },
    { "id": "C", "text": "0 extremos" }
  ],
  "explanation": "¡Si rompes un palo por la mitad, el pedazo sigue teniendo dos extremos!",
  "fun_fact": "Pregunta con trampa clásica.",
  "verified": true
}
\`\`\`

Hope this viral riddle performs well on Shorts!
      `;

      const result = parseTranscreationOutput(wrapped, sampleSpeedBlitzQuestion);
      expect(result.language).toBe("es");
      expect(result.question).toBe("Un palo tiene 2 extremos. ¿Cuántos extremos tiene medio palo?");
      expect(result.choices).toHaveLength(3);
      expect(result.choices[1].id).toBe("B");
      expect(result.choices[1].text).toBe("2 extremos");
    });

    it("throws an error if JSON is malformed", () => {
      expect(() => parseTranscreationOutput("Not valid JSON at all", sampleQuestion)).toThrow(
        /Failed to parse transcreation JSON output/,
      );
    });

    it("throws an error if choice count mismatches source question", () => {
      const badChoicesJson = JSON.stringify({
        language: "vi",
        question: "Một chiếc gậy?",
        choices: [
          { id: "A", text: "1 đầu" },
          { id: "B", text: "2 đầu" },
        ], // 2 choices provided, but sampleSpeedBlitzQuestion has 3 choices!
        explanation: "Giải thích",
        fun_fact: "",
      });

      expect(() => parseTranscreationOutput(badChoicesJson, sampleSpeedBlitzQuestion)).toThrow(
        /Transcreated choice count mismatch/,
      );
    });

    it("throws an error if choice IDs do not match source question", () => {
      const wrongIdsJson = JSON.stringify({
        language: "vi",
        question: "Cá voi xanh?",
        choices: [
          { id: "1", text: "ĐÚNG" },
          { id: "2", text: "SAI" },
        ],
        explanation: "Giải thích",
        fun_fact: "",
      });

      expect(() => parseTranscreationOutput(wrongIdsJson, sampleQuestion)).toThrow(
        /Transcreated choices missing source choice ID/,
      );
    });
  });

  describe("transcreateBankQuestion", () => {
    it("returns immediately without AI call when source and target language are the same", async () => {
      const result = await transcreateBankQuestion(sampleQuestion, {
        targetLanguage: "en",
      });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.language).toBe("en");
      expect(result.content.question).toBe(sampleQuestion.question);
      expect(result.content.choices[0].text).toBe("TRUE");
    });

    it("returns pre-cached translation if already stored in question.translations", async () => {
      const cachedEs: BankTranslationContent = {
        language: "es",
        question: "Traducción precargada en Question Bank",
        choices: [
          { id: "A", text: "VERDADERO" },
          { id: "B", text: "FALSO" },
        ],
        explanation: "Explicación precargada",
        fun_fact: "Dato curioso precargado",
        verified: true,
      };

      const questionWithCache: BankQuestion = {
        ...sampleQuestion,
        translations: {
          es: cachedEs,
        },
      };

      const result = await transcreateBankQuestion(questionWithCache, {
        targetLanguage: "es",
      });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.content.question).toBe("Traducción precargada en Question Bank");
    });

    it("uses rawOutputOverride when provided for offline testing", async () => {
      const mockAiOutput = JSON.stringify({
        language: "es",
        question: "¿La ballena azul es el animal más grande jamás conocido?",
        choices: [
          { id: "A", text: "VERDADERO" },
          { id: "B", text: "FALSO" },
        ],
        explanation: "Puede pesar hasta 200 toneladas.",
        fun_fact: "¡Corazón gigante!",
        verified: true,
      });

      const result = await transcreateBankQuestion(sampleQuestion, {
        targetLanguage: "es",
        rawOutputOverride: mockAiOutput,
      });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.content.question).toContain("ballena azul");
      expect(result.content.verified).toBe(true);
    });

    it("uses safe offline fallback when no AI client is provided", async () => {
      const result = await transcreateBankQuestion(sampleQuestion, {
        targetLanguage: "es", // Spanish
      });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.language).toBe("es");
      expect(result.content.question).toContain("[ES]");
      expect(result.content.verified).toBe(false);
    });

    it("invokes mock LLMClient with prompt and parses emitted response", async () => {
      const emitter = new EventEmitter();
      const mockLlmClient = Object.assign(emitter, {
        connect: async () => {},
        startThread: async () => "thread-mock-123",
        startTurn: async (threadId: string, prompt: string) => {
          setTimeout(() => {
            emitter.emit("notification", {
              method: "item/agentMessage/delta",
              params: {
                delta: JSON.stringify({
                  language: "es",
                  question: "¿Es la ballena azul el animal más grande del planeta?",
                  choices: [
                    { id: "A", text: "VERDADERO" },
                    { id: "B", text: "FALSO" },
                  ],
                  explanation: "Explicación de LLM mock",
                  fun_fact: "Dato curioso de LLM mock",
                  verified: true,
                }),
              },
            });
            emitter.emit("notification", {
              method: "turn/completed",
              params: { turn: { status: "completed" } },
            });
          }, 10);
          return "turn-mock-123";
        },
      }) as unknown as LLMClient;

      const result = await transcreateBankQuestion(sampleQuestion, {
        targetLanguage: "es",
        llmClient: mockLlmClient,
      });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.language).toBe("es");
      expect(result.content.question).toContain("ballena azul");
      expect(result.content.choices[0].text).toBe("VERDADERO");
      expect(result.content.verified).toBe(true);
    });
  });
});
