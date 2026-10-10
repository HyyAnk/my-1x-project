import { describe, expect, it } from "vitest";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { containsKeyword } from "../src/quiz/thumbnail/utils/keywordMatch.js";
import { resolveTopicSpecificHook } from "../src/quiz/thumbnail/locales/topicHooks.js";
import { assessEditorialHeadline, selectEditorialHeadline } from "../src/quiz/thumbnail/editorial/refinement/headlinePolicy.js";
import type { EditorialHeadlineContext } from "../src/quiz/thumbnail/editorial/refinement/headlineTypes.js";
import { planThumbnailWithAI } from "../src/quiz/thumbnail/thumbnailAiPlanner.js";

function createSequencedLlm(responses: Array<unknown | Error>): LLMClient & { prompts: string[] } {
  const prompts: string[] = [];
  let index = 0;
  return {
    prompts,
    async connect() {},
    async generateContent(prompt: string) {
      prompts.push(prompt);
      const response = responses[Math.min(index++, responses.length - 1)];
      if (response instanceof Error) throw response;
      return typeof response === "string" ? response : JSON.stringify(response);
    },
  } as LLMClient & { prompts: string[] };
}

const visionContext: EditorialHeadlineContext = {
  topicTitle: "Body Senses Detective: Can You Crack How We See?",
  topicSummary: "Explore the eye, the pupil and the retina.",
  questions: [{ question: "Which part of the eye controls how much light enters?", choices: ["Pupil", "Retina"] }],
  languageCode: "en",
};

describe("whole-word topic keyword matching", () => {
  it.each([
    ["the author wrote a classic", "thor", false],
    ["thor's mighty hammer", "thor", true],
    ["coding quiz", "odin", false],
    ["this year we learn", "ear", false],
    ["earth wonders", "ear", false],
    ["giant ears", "ear", true],
    ["a new season", "sea", false],
    ["quiz del sistema solar y planetas", "planet", true],
    ["die planeten", "planet", true],
    ["宇宙クイズ", "宇宙", true],
  ])("matches %j against %j -> %s", (text, keyword, expected) => {
    expect(containsKeyword(text, keyword)).toBe(expected);
  });

  it("no longer classifies storybook authors as Norse mythology", () => {
    expect(resolveTopicSpecificHook("classic tales: who is the author of this book", "en")).not.toBe("NORSE LEGENDS QUIZ!");
    expect(resolveTopicSpecificHook("norse legends: thor and odin", "en")).toBe("NORSE LEGENDS QUIZ!");
  });
});

describe("editorial headline policy", () => {
  it("rejects headlines made only of generic quiz words", () => {
    const codes = assessEditorialHeadline("CAN YOU SOLVE IT?", visionContext).issues.map((issue) => issue.code);
    expect(codes).toContain("generic_only");
    expect(assessEditorialHeadline("CAN YOU GUESS WHO?", visionContext).issues.map((issue) => issue.code)).toContain("generic_only");
  });

  it("accepts a headline with one concrete subject word", () => {
    expect(assessEditorialHeadline("WHO WIELDS THIS?", { ...visionContext, topicTitle: "Norse Legends" }).issues).toEqual([]);
    expect(assessEditorialHeadline("NAME THIS EYE PART", visionContext).issues).toEqual([]);
  });

  it("rejects sensory promises the episode does not contain", () => {
    const assessment = assessEditorialHeadline("CAN YOU TASTE IT?", visionContext);
    expect(assessment.issues.map((issue) => issue.code)).toContain("unsupported_claim");
    const tasteContext = { ...visionContext, questions: [{ question: "Which part of the tongue senses sour flavors?" }] };
    expect(assessEditorialHeadline("CAN YOU TASTE IT?", tasteContext).issues).toEqual([]);
  });

  it("allows yes/no headlines only for the matching format and never allows invented scores", () => {
    expect(assessEditorialHeadline("YES OR NO?", visionContext).issues.map((issue) => issue.code)).toContain("unsupported_claim");
    // A yes/no quiz may promise a verdict, but "YES OR NO?" alone still names nothing.
    expect(assessEditorialHeadline("YES OR NO?", { ...visionContext, questionFormat: "yes_no" }).issues.map((issue) => issue.code)).toEqual(["generic_only"]);
    expect(assessEditorialHeadline("EYES: YES OR NO?", { ...visionContext, questionFormat: "yes_no" }).issues).toEqual([]);
    expect(assessEditorialHeadline("TRUE OR FALSE: EYES", { ...visionContext, questionFormat: "true_false" }).issues).toEqual([]);
    expect(assessEditorialHeadline("ONLY 1% KNOW EYES", visionContext).issues.map((issue) => issue.code)).toContain("unsupported_claim");
    expect(assessEditorialHeadline("IQ TEST: EYES", visionContext).issues.map((issue) => issue.code)).toContain("unsupported_claim");
  });

  it("flags title echoes as a soft issue in any language", () => {
    const context = { ...visionContext, topicTitle: "Norse Legends & Heroes Quiz: Can You Spot Every Mythical Legend?" };
    expect(assessEditorialHeadline("NORSE LEGENDS QUIZ!", context).issues).toEqual([
      expect.objectContaining({ code: "echoes_title", severity: "soft" }),
    ]);
    const spanish = { ...context, topicTitle: "Leyendas nórdicas", languageCode: "es" as const };
    expect(assessEditorialHeadline("LEYENDAS NÓRDICAS", spanish).issues.map((issue) => issue.code)).toEqual(["echoes_title"]);
    expect(assessEditorialHeadline("¿PUEDES ADIVINAR?", spanish).issues).toEqual([]);
  });

  it("prefers clean candidates, then soft-only issues, over hard failures", () => {
    const context = { ...visionContext, topicTitle: "Eye Secrets" };
    expect(selectEditorialHeadline(["CAN YOU SOLVE IT?", "EYE SECRETS!", "WHICH EYE PART?"], context).headline).toBe("WHICH EYE PART?");
    expect(selectEditorialHeadline(["CAN YOU SOLVE IT?", "EYE SECRETS!"], context).headline).toBe("EYE SECRETS!");
    expect(selectEditorialHeadline([null, "CAN YOU SOLVE IT?"], context).headline).toBe("CAN YOU SOLVE IT?");
  });
});

describe("editorial headline refinement in the planner", () => {
  const anime = {
    topicTitle: "Anime Sleuths & Masterminds: Can You Spot Every Iconic Genius?",
    topicSummary: "Famous anime detectives and their gadgets",
    language: "English",
    editorial: true,
    questions: [{ question: "Which detective uses a bow tie voice changer?", choices: ["Conan", "L"] }],
  };
  const genericPlan = {
    hook_text: "CAN YOU SOLVE IT?",
    layout: "mega_grid",
    subject_anchors: [{ label: "Bow tie", visualPrompt: "red bow tie voice changer gadget" }],
  };

  it("asks the model once to rewrite a generic headline and keeps a valid rewrite", async () => {
    const llm = createSequencedLlm([genericPlan, { hook_text: "WHOSE BOW TIE IS THIS?" }]);
    const plan = await planThumbnailWithAI({ ...anime, llmClient: llm });
    expect(plan.hookText).toBe("WHOSE BOW TIE IS THIS?");
    expect(llm.prompts).toHaveLength(2);
    expect(llm.prompts[1]).toContain("No word names the topic");
  });

  it("falls back to a topic headline when the rewrite is still generic or the call fails", async () => {
    const stillGeneric = await planThumbnailWithAI({ ...anime, llmClient: createSequencedLlm([genericPlan, { hook_text: "CAN YOU GUESS IT?" }]) });
    expect(stillGeneric.hookText).toBe("ANIME SLEUTHS & MASTERMINDS");
    const failed = await planThumbnailWithAI({ ...anime, llmClient: createSequencedLlm([genericPlan, new Error("timeout")]) });
    expect(failed.hookText).toBe("ANIME SLEUTHS & MASTERMINDS");
  });

  it("keeps a valid planner headline without a second model call", async () => {
    const llm = createSequencedLlm([{ ...genericPlan, hook_text: "WHICH DETECTIVE GADGET?" }]);
    const plan = await planThumbnailWithAI({ ...anime, llmClient: llm });
    expect(plan.hookText).toBe("WHICH DETECTIVE GADGET?");
    expect(llm.prompts).toHaveLength(1);
  });

  it("never rewrites a manual headline", async () => {
    const llm = createSequencedLlm([genericPlan]);
    const plan = await planThumbnailWithAI({ ...anime, customHookText: "CAN YOU SOLVE IT?", llmClient: llm });
    expect(plan.hookText).toBe("CAN YOU SOLVE IT?");
    expect(llm.prompts).toHaveLength(1);
  });

  it("does not ask the planner to copy fixed headline formulas", async () => {
    const llm = createSequencedLlm([{ ...genericPlan, hook_text: "WHICH DETECTIVE GADGET?" }]);
    await planThumbnailWithAI({ ...anime, llmClient: llm });
    expect(llm.prompts[0]).not.toContain("CAN YOU TASTE IT?");
    expect(llm.prompts[0]).toContain("complement it, never repeat it");
  });
});

describe("pictured subject grounding", () => {
  const inventions = {
    topicTitle: "Invention Busters: True or False Tech Showdown",
    topicSummary: "Myths about famous inventions",
    language: "English",
    editorial: true,
    questionFormat: "yes_no",
    questions: [
      { question: "Was the first computer mouse made out of wood?", choices: ["True", "False"] },
      { question: "Do retro arcade light guns shoot real light beams?", choices: ["True", "False"] },
    ],
  };
  const inventedSubjectPlan = {
    hook_text: "REAL X-RAY HAND?",
    layout: "mega_grid",
    subject_anchors: [{ label: "X-ray hand", visualPrompt: "two glowing hand X-ray films" }],
  };

  it("does not treat a True/False answer pair as an A-vs-B comparison", async () => {
    const plan = await planThumbnailWithAI(inventions);
    expect(plan.editorial?.template).not.toBe("comparison");
    expect(plan.layout).not.toBe("split_vs");
  });

  it("does not accept an incidental 'real' as proof of a real-vs-fake challenge", () => {
    const context: EditorialHeadlineContext = { ...inventions, languageCode: "en" };
    expect(assessEditorialHeadline("REAL X-RAY HAND?", context).issues.map((issue) => issue.code)).toContain("unsupported_claim");
  });

  it("replaces an invented subject with one taken from a question and matches the headline to it", async () => {
    const llm = createSequencedLlm([
      inventedSubjectPlan,
      { hook_text: "WOODEN COMPUTER MOUSE?", subject_anchors: [{ label: "wooden computer mouse", visualPrompt: "a hand-carved wooden mouse" }] },
    ]);
    const plan = await planThumbnailWithAI({ ...inventions, llmClient: llm });
    expect(plan.subjectAnchors).toEqual([{ label: "wooden computer mouse", visualPrompt: "a hand-carved wooden mouse" }]);
    expect(plan.hookText).toBe("WOODEN COMPUTER MOUSE?");
    expect(llm.prompts[1]).toContain("does not appear in any episode question");
    expect(llm.prompts[1]).toContain("subject_anchors");
  });

  it("falls back to the curated seed subject and drops the headline written for the invented subject", async () => {
    const llm = createSequencedLlm([inventedSubjectPlan, { hook_text: "SPOT THE FAKE X-RAY", subject_anchors: [{ label: "X-ray film", visualPrompt: "x-ray" }] }]);
    const plan = await planThumbnailWithAI({ ...inventions, llmClient: llm });
    expect(plan.subjectAnchors[0]?.label).not.toMatch(/x-ray/i);
    expect(plan.hookText).not.toMatch(/X-RAY/);
  });

  it("keeps a grounded planner subject without a rewrite call", async () => {
    const llm = createSequencedLlm([
      { hook_text: "WOODEN COMPUTER MOUSE?", layout: "mega_grid", subject_anchors: [{ label: "computer mouse", visualPrompt: "an early wooden mouse" }] },
    ]);
    const plan = await planThumbnailWithAI({ ...inventions, llmClient: llm });
    expect(plan.subjectAnchors[0]?.label).toBe("computer mouse");
    expect(llm.prompts).toHaveLength(1);
  });

  it("gives the planner enough questions to pick a grounded subject", async () => {
    const questions = Array.from({ length: 20 }, (_, index) => ({ question: `Question number ${index + 1} about inventions?`, choices: ["True", "False"] }));
    const llm = createSequencedLlm([{ ...inventedSubjectPlan, hook_text: "WOODEN COMPUTER MOUSE?" }]);
    await planThumbnailWithAI({ ...inventions, questions, llmClient: llm });
    expect(llm.prompts[0]).toContain("Question number 12 about inventions?");
    expect(llm.prompts[0]).not.toContain("Question number 13 about inventions?");
  });
});

describe("channel headline variety", () => {
  const context: EditorialHeadlineContext = {
    topicTitle: "Norse Legends & Heroes Quiz",
    questions: [{ question: "In Norse myth, who wields a magic hammer?", choices: ["Thor", "Loki"] }],
    languageCode: "en",
    recentHeadlines: ["CRACK THIS CLOCK", "OUTSMART YOUR PUPIL!", "WHO RIDES CATS?"],
  };

  it("flags a reused opening word or sentence pattern as a soft issue", () => {
    expect(assessEditorialHeadline("CRACK THE HAMMER CODE", context).issues).toEqual([expect.objectContaining({ code: "repeats_recent_pattern", severity: "soft" })]);
    expect(assessEditorialHeadline("PULL THIS HAMMER?", context).issues.map((issue) => issue.code)).toEqual(["repeats_recent_pattern"]);
    expect(assessEditorialHeadline("THOR'S HAMMER OR LOKI'S?", context).issues).toEqual([]);
  });

  it("only checks opening words outside English", () => {
    const spanish = { ...context, languageCode: "es" as const, recentHeadlines: ["ROMPE ESTE RELOJ"] };
    expect(assessEditorialHeadline("TIRA ESTE MARTILLO", spanish).issues).toEqual([]);
    expect(assessEditorialHeadline("ROMPE EL MARTILLO", spanish).issues.map((issue) => issue.code)).toEqual(["repeats_recent_pattern"]);
  });

  it("shows the planner the channel's recent headlines and rewrites a repeated pattern", async () => {
    const llm = createSequencedLlm([
      { hook_text: "PULL THIS HAMMER?", layout: "mega_grid", subject_anchors: [{ label: "magic hammer", visualPrompt: "Mjolnir" }] },
      { hook_text: "THOR'S HAMMER OR LOKI'S?" },
    ]);
    const plan = await planThumbnailWithAI({ ...context, language: "English", editorial: true, llmClient: llm });
    expect(llm.prompts[0]).toContain('Headlines already used on this channel: ["CRACK THIS CLOCK"');
    expect(llm.prompts[1]).toContain("same sentence pattern");
    expect(plan.hookText).toBe("THOR'S HAMMER OR LOKI'S?");
  });
});
