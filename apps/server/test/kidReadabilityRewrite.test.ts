import { describe, expect, it, vi } from "vitest";
import type { BankQuestion } from "@studio/shared";
import {
  buildKidReadabilityRewritePrompt,
  needsKidReadabilityRewrite,
  parseKidReadabilityRewriteOutput,
  rewriteKidReadabilityBatch,
  toKidReadabilityRewriteInput,
  validateKidReadabilityRewrite,
} from "../src/quiz/bank/remediation/kidReadability/index.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

const academicQuestion: BankQuestion = {
  id: "VIS-001",
  archetype_id: "visual_spotting",
  domain_id: "careers_occupations",
  subtopic_id: "medical",
  language: "en",
  question: "Which of these three doctors operates with scalpels?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "Surgeon", is_correct: true },
    { id: "B", text: "Pediatrician", is_correct: false },
    { id: "C", text: "Dentist", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation:
    "Surgeons are specialized medical doctors licensed to perform invasive operative procedures using scalpels and surgical instruments inside sterile theaters.",
  fun_fact: "Surgeons wear green scrubs because staring at bright colors creates distracting after-image illusions.",
  age_band: "family",
  difficulty: 5,
  tags: [],
  status: "approved",
};

const input = toKidReadabilityRewriteInput(academicQuestion);

describe("kid readability rewrite", () => {
  it("selects academic narration and maps the correct answer", () => {
    expect(needsKidReadabilityRewrite(academicQuestion)).toBe(true);
    expect(input.correctAnswer).toBe("Surgeon");
  });

  it("builds a prompt with the kids policy, the payload, and the output contract", () => {
    const prompt = buildKidReadabilityRewritePrompt([input]);
    expect(prompt).toContain("KIDS & FAMILY AUDIENCE POLICY");
    expect(prompt).toContain('"id": "VIS-001"');
    expect(prompt).toContain("exactly 1 objects");
  });

  it("parses fenced JSON output and skips malformed entries", () => {
    const parsed = parseKidReadabilityRewriteOutput(
      '```json\n[{"id":"VIS-001","explanation":"Short.","fun_fact":"Fun."},{"bad":true}]\n```',
    );
    expect([...parsed.keys()]).toEqual(["VIS-001"]);
  });

  it("accepts plain rewrites and rejects hard, unsafe, or letter-referencing ones", () => {
    const plain = {
      explanation: "A surgeon is a doctor who fixes bodies with tiny tools.",
      funFact: "Surgeons wear green clothes so their eyes stay comfy!",
    };
    expect(validateKidReadabilityRewrite(input, plain)).toBeNull();
    expect(validateKidReadabilityRewrite(input, { ...plain, explanation: academicQuestion.explanation })).toMatch(/hard|long/);
    expect(validateKidReadabilityRewrite(input, { ...plain, funFact: "Some surgeons relax with a glass of whiskey." })).toMatch(
      /unsuitable/,
    );
    expect(validateKidReadabilityRewrite(input, { ...plain, explanation: "Choice A is right because surgeons use tools." })).toMatch(
      /letter/,
    );
    expect(validateKidReadabilityRewrite(input, { ...plain, funFact: "" })).toMatch(/dropped/);
  });

  it("keeps validated rewrites and rejects missing ones from a model batch", async () => {
    const second = { ...input, id: "VIS-002" };
    const llmClient = {
      connect: vi.fn(() => Promise.resolve(undefined)),
      generateContent: vi.fn(() =>
        Promise.resolve({
          text: JSON.stringify([
            {
              id: "VIS-001",
              explanation: "A surgeon is a doctor who fixes bodies with tiny tools.",
              fun_fact: "Surgeons wear green clothes to rest their eyes!",
            },
          ]),
        }),
      ),
    } as unknown as LLMClient;
    const result = await rewriteKidReadabilityBatch([input, second], { llmClient });
    expect(result.accepted.map((rewrite) => rewrite.id)).toEqual(["VIS-001"]);
    expect(result.rejected).toEqual([{ id: "VIS-002", reason: "missing from model output" }]);
  });
});
