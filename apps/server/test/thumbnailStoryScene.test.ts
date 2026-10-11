import { describe, expect, it } from "vitest";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { selectHeadlineStyle } from "../src/quiz/thumbnail/editorial/typography/headlineStyleSelector.js";
import { planThumbnailWithAI } from "../src/quiz/thumbnail/thumbnailAiPlanner.js";
import { compileThumbnailPrompt } from "../src/quiz/thumbnail/thumbnailPromptCompiler.js";
import { MASCOT_ARCHETYPES_CATALOG } from "../src/quiz/thumbnail/thumbnailArchetypes.js";

function createLlm(response: unknown): LLMClient & { prompts: string[] } {
  const prompts: string[] = [];
  return {
    prompts,
    async connect() {},
    async generateContent(prompt: string) {
      prompts.push(prompt);
      return JSON.stringify(response);
    },
  } as LLMClient & { prompts: string[] };
}

const norse = {
  topicTitle: "Norse Legends & Heroes Quiz",
  topicSummary: "Vikings, gods and giants",
  language: "English",
  editorial: true,
  questions: [{ question: "In Norse myth, who wields a magic hammer?", choices: ["Thor", "Loki", "Odin"] }],
  archetypesOverride: MASCOT_ARCHETYPES_CATALOG.slice(0, 3),
};

const scenePlan = {
  hook_text: "TOO HEAVY TO LIFT?",
  layout: "mega_grid",
  headline_style: "stone_tablet",
  environment_atmosphere: "a moonlit Viking longship deck under green auroras",
  mascot_persona_variations: [
    {
      archetypeId: 6,
      archetypeName: "The Comedic Panic / Chaos Reactor",
      role: "deckhand",
      costume: "tiny horned helmet",
      prop: "magic hammer",
      expression: "eyes bulging, teeth clenched",
      poseDescription: "straining to lift the hammer with both paws",
      dramaticHook: "the magic hammer will not budge as the mascot strains with all its might",
    },
  ],
  subject_anchors: [{ label: "magic hammer", visualPrompt: "a glowing rune-carved war hammer" }],
};

describe("headline style rotation", () => {
  it("keeps the planner's suggestion when the channel has not used it recently", () => {
    expect(selectHeadlineStyle({ preferred: "stone_tablet", topicText: "Norse legends", recent: ["neon_sign", "brush_banner"] })).toBe(
      "stone_tablet",
    );
  });

  it("replaces a recently used or unknown suggestion with a fresh topic-fitting style", () => {
    expect(
      selectHeadlineStyle({ preferred: "neon_sign", topicText: "space planets", recent: ["neon_sign", "chalkboard"], rng: () => 0 }),
    ).not.toMatch(/neon_sign|chalkboard/);
    expect(selectHeadlineStyle({ preferred: "graffiti", topicText: "Viking myths", recent: ["brush_banner"], rng: () => 0 })).toBe(
      "stone_tablet",
    );
  });

  it("never repeats one of the two latest distinct styles", () => {
    for (const roll of [0, 0.5, 0.99]) {
      const style = selectHeadlineStyle({ topicText: "anything", recent: ["comic_burst", "comic_burst", "hazard_plate"], rng: () => roll });
      expect(style).not.toMatch(/comic_burst|hazard_plate/);
    }
  });
});

describe("story-scene planning", () => {
  it("asks the planner for archetype-driven story moments and a headline style", async () => {
    const llm = createLlm(scenePlan);
    await planThumbnailWithAI({ ...norse, llmClient: llm });
    expect(llm.prompts[0]).toContain("The mascot is the PROTAGONIST");
    expect(llm.prompts[0]).toContain('Archetype ID 1: "The Mind-Blown / Shocked Reactor"');
    expect(llm.prompts[0]).toContain("headline_style");
    expect(llm.prompts[0]).not.toContain("hyper-realistic macro photography");
  });

  it("carries the story moment, setting and headline style into the art prompt", async () => {
    const plan = await planThumbnailWithAI({ ...norse, llmClient: createLlm(scenePlan) });
    expect(plan.mascotPersona.dramaticHook).toContain("will not budge");
    expect(plan.editorial?.headlineStyle).toBe("stone_tablet");
    const prompt = compileThumbnailPrompt(plan, "16:9");
    expect(prompt).toContain("STORY-SCENE THUMBNAIL ART PLATE v2");
    expect(prompt).toContain("STORY MOMENT: the magic hammer will not budge");
    expect(prompt).toContain("moonlit Viking longship deck");
    expect(prompt).toContain("ancient carved stone tablet");
    expect(prompt).toContain("no photographic cut-outs");
    expect(prompt).not.toContain("STRICT SUBJECT REALISM");
    expect(prompt).toContain("spans at least 45% of the frame width");
    expect(compileThumbnailPrompt(plan, "9:16")).toContain("spans at least 70% of the frame width");
  });
});

describe("answer reveal guard", () => {
  const arthur = {
    topicTitle: "Classic Tale Adventurers",
    language: "English",
    editorial: true,
    questions: [
      {
        question: "In King Arthur, what is his legendary magical sword?",
        choices: ["Sting", "Glamdring", "Excalibur"],
        answer: "Excalibur",
      },
      { question: "Which part of your eye has color?", choices: ["The pupil", "The lens", "The iris"], answer: "The iris" },
      { question: "Was Play-Doh made to clean wallpaper?", choices: ["True", "False"], answer: "True" },
    ],
  };

  it("flags a headline that names a correct answer, ignoring articles and verdict answers", async () => {
    const { assessEditorialHeadline } = await import("../src/quiz/thumbnail/editorial/refinement/headlinePolicy.js");
    const context = { ...arthur, languageCode: "en" as const };
    expect(assessEditorialHeadline("WHO CLAIMS EXCALIBUR?", context).issues.map((issue) => issue.code)).toContain("reveals_answer");
    expect(assessEditorialHeadline("WHAT COLORS YOUR IRIS?", context).issues.map((issue) => issue.code)).toContain("reveals_answer");
    expect(assessEditorialHeadline("WHO PULLS THE SWORD?", context).issues).toEqual([]);
    expect(assessEditorialHeadline("TRUE TALE OF THE SWORD?", context).issues.map((issue) => issue.code)).not.toContain("reveals_answer");
  });

  it("asks for a rewrite that avoids the answers and keeps a spoiler-free headline", async () => {
    const llm = createLlm({
      hook_text: "WHO CLAIMS EXCALIBUR?",
      layout: "mega_grid",
      subject_anchors: [{ label: "legendary magical sword", visualPrompt: "a sword in a stone" }],
    });
    const responses = [
      {
        hook_text: "WHO CLAIMS EXCALIBUR?",
        layout: "mega_grid",
        subject_anchors: [{ label: "legendary magical sword", visualPrompt: "a sword in a stone" }],
      },
      { hook_text: "WHO PULLS THE SWORD?" },
    ];
    let call = 0;
    llm.generateContent = async (prompt: string) => {
      llm.prompts.push(prompt);
      return JSON.stringify(responses[Math.min(call++, responses.length - 1)]);
    };
    const plan = await planThumbnailWithAI({ ...arthur, llmClient: llm });
    expect(plan.hookText).toBe("WHO PULLS THE SWORD?");
    expect(llm.prompts[1]).toContain('Never write any of these correct answers in the headline: ["Excalibur","iris"]');
  });
});
