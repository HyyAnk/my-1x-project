import { describe, expect, it } from "vitest";
import { compileDualThumbnailPrompts, compileThumbnailPrompt, resolveThumbnailLayout } from "../src/quiz/thumbnail/index.js";
import type { MascotProfile } from "@studio/shared";

describe("Thumbnail Layout Resolver & Prompt Compiler (Step 2)", () => {
  const sampleMascot: MascotProfile = {
    id: "mascot_kiko",
    name: "Kiko",
    description: "A smart robotic fox",
    visual_style: "pixar_3d",
    master_prompt: "a clever fluffy robotic fox with glowing cyan eyes and chrome accents",
    color_theme: "#06b6d4",
    master_image_url: "/mascots/kiko/master.png",
    actions: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("auto-resolves 'split_vs' layout for versus topics and formats", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "T-Rex vs Giant Mecha Robot: Would You Rather?",
      questionFormat: "versus",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("split_vs");
    expect(plan.hookText).toBe("WHICH WOULD YOU CHOOSE?");
    expect(plan.mascotPersona.role).toBe("Referee / Confused Judge");
    expect(plan.subjectAnchors.length).toBeGreaterThanOrEqual(2);
  });

  it("auto-resolves 'mystery_silhouette' layout for mystery and guess topics", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Guess The Superhero By Shadow - Can You Guess Who?",
      questionFormat: "guess_image",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("mystery_silhouette");
    expect(plan.hookText).toBe("WHO IS THIS?");
    expect(plan.badgeText).toContain("ONLY 1% KNOW");
    expect(plan.mascotPersona.role).toBe("Master Detective");
  });

  it("auto-resolves 'odd_one_out' for spot the difference topics", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Spot The Difference: Find The Odd Imposter Duck",
      questionFormat: "spot_difference",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("odd_one_out");
    expect(plan.hookText).toBe("FIND THE ODD ONE!");
    expect(plan.mascotPersona.role).toBe("Sharp Investigator");
  });

  it("auto-resolves 'difficulty_tier' for IQ level progression", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "IQ Test: 4 Levels From Easy To Impossible",
      questionFormat: "difficulty_tier",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("difficulty_tier");
    expect(plan.badgeText).toContain("IQ 140+");
    expect(plan.mascotPersona.expression).toContain("dizzy");
  });

  it("auto-resolves 'true_false' for myths and facts", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "10 Biggest Scientific Myths: True or False?",
      questionFormat: "true_false",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("true_false");
    expect(plan.hookText).toBe("TRUE OR FALSE?");
  });

  it("defaults to 'mega_grid' for general knowledge quizzes", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "General Knowledge Trivia Quiz",
      questionCount: 100,
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("mega_grid");
    expect(plan.badgeText).toBe("100 QUESTIONS");
  });

  it("adapts mascot costume and props to space topic", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Deep Space Astronomy & Solar System Secrets",
      questionCount: 50,
      mascotProfile: sampleMascot,
    });

    expect(plan.mascotPersona.role).toBe("Space Explorer");
    expect(plan.mascotPersona.costume).toContain("space helmet");
    expect(plan.mascotPersona.prop).toContain("moon");
  });

  it("compiles 16:9 prompt with YouTube timestamp safe zone directive", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "General Knowledge 100",
      questionCount: 100,
      mascotProfile: sampleMascot,
    });

    const prompt169 = compileThumbnailPrompt(plan, "16:9", sampleMascot);
    expect(prompt169).toContain("16:9");
    expect(prompt169).toContain("bottom-right corner");
    expect(prompt169).toContain("Kiko");
    expect(prompt169).toContain("GENERAL KNOWLEDGE");
  });

  it("compiles 9:16 prompt with Shorts UI overlay safe zone directive", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "General Knowledge 100",
      questionCount: 100,
      mascotProfile: sampleMascot,
    });

    const prompt916 = compileThumbnailPrompt(plan, "9:16", sampleMascot);
    expect(prompt916).toContain("9:16");
    expect(prompt916).toContain("middle 60% vertical safe zone");
    expect(prompt916).toContain("bottom 25%");
  });

  it("compiles dual prompts simultaneously", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Dinosaur vs Alien Mech",
      questionFormat: "versus",
      mascotProfile: sampleMascot,
    });

    const dual = compileDualThumbnailPrompts(plan, sampleMascot);
    expect(dual.prompt_16_9).toContain("16:9");
    expect(dual.prompt_9_16).toContain("9:16");
    expect(dual.plan.layout).toBe("split_vs");
  });

  it("strictly uses English '15 QUESTIONS' for English channels and '15 PREGUNTAS' for Spanish channels", () => {
    const englishPlan = resolveThumbnailLayout({
      topicTitle: "General Knowledge Trivia Secrets",
      questionCount: 15,
      language: "English",
      mascotProfile: sampleMascot,
    });
    expect(englishPlan.badgeText).toBe("15 QUESTIONS");
    expect(englishPlan.hookText).toBe("GENERAL KNOWLEDGE");

    const spanishPlan = resolveThumbnailLayout({
      topicTitle: "Cultura General y Curiosidades",
      questionCount: 15,
      language: "Spanish",
      mascotProfile: sampleMascot,
    });
    expect(spanishPlan.badgeText).toBe("15 PREGUNTAS");
    expect(spanishPlan.hookText).toBe("CULTURA GENERAL");
  });

  it("extracts clean visual choice objects and enforces strict zero question text rule in prompts", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Space Trivia",
      questionCount: 15,
      language: "English",
      questions: [
        {
          question: "Which planet could float in water?",
          choices: ["Neptune", "Jupiter", "Saturn", "Mars"],
          answer: "Saturn",
        },
      ],
      mascotProfile: sampleMascot,
    });

    expect(plan.subjectAnchors[0].visualPrompt).toContain("Neptune");
    expect(plan.subjectAnchors[0].visualPrompt).not.toContain("Which planet could float in water?");
    expect(plan.subjectAnchors[2].visualPrompt).toContain("Saturn");
    expect(plan.subjectAnchors[2].badge).toBe("✓");

    const prompt = compileThumbnailPrompt(plan, "16:9", sampleMascot);
    expect(prompt).toContain("STRICT NO QUESTION TEXT & NO NUMBER LABELS");
    expect(prompt).toContain("ZERO number badges");
  });

  it("strictly generates authentic Japanese YouTube thumbnail text for Japanese channels", () => {
    // 1. Japanese Mega Grid
    const jaGrid = resolveThumbnailLayout({
      topicTitle: "一般常識クイズ 15問",
      questionCount: 15,
      language: "Japanese",
      mascotProfile: sampleMascot,
    });
    expect(jaGrid.layout).toBe("mega_grid");
    expect(jaGrid.hookText).toBe("一般常識クイズ");
    expect(jaGrid.badgeText).toBe("全15問");

    // 2. Japanese Split VS
    const jaVs = resolveThumbnailLayout({
      topicTitle: "究極の２択！どっちを選ぶ？",
      questionFormat: "versus",
      language: "Japanese",
      mascotProfile: sampleMascot,
    });
    expect(jaVs.layout).toBe("split_vs");
    expect(jaVs.hookText).toBe("どっちを選ぶ？");
    expect(jaVs.badgeText).toContain("究極の２択");

    // 3. Japanese Mystery Silhouette
    const jaMystery = resolveThumbnailLayout({
      topicTitle: "影から当てる！この人は誰？",
      questionFormat: "guess_image",
      language: "ja",
      mascotProfile: sampleMascot,
    });
    expect(jaMystery.layout).toBe("mystery_silhouette");
    expect(jaMystery.hookText).toBe("この人は誰？");
    expect(jaMystery.badgeText).toContain("正解率1%");

    // 4. Japanese Compiled Prompt verification
    const jaPrompt = compileThumbnailPrompt(jaGrid, "16:9", sampleMascot);
    expect(jaPrompt).toContain("一般常識クイズ");
    expect(jaPrompt).toContain("全15問");
  });

  it("strictly generates authentic German and French thumbnail text for German and French channels", () => {
    // 1. German Mega Grid
    const deGrid = resolveThumbnailLayout({
      topicTitle: "Allgemeinwissen Quiz 15 Fragen",
      questionCount: 15,
      language: "German",
      mascotProfile: sampleMascot,
    });
    expect(deGrid.layout).toBe("mega_grid");
    expect(deGrid.hookText).toBe("ALLGEMEINWISSEN");
    expect(deGrid.badgeText).toBe("15 FRAGEN");

    // 2. German Split VS
    const deVs = resolveThumbnailLayout({
      topicTitle: "Was würdest du wählen?",
      questionFormat: "versus",
      language: "German",
      mascotProfile: sampleMascot,
    });
    expect(deVs.hookText).toBe("WAS WÜRDEST DU WÄHLEN?");
    expect(deVs.badgeText).toBe("WÄHLE EINS! ⚡");

    // 3. French Mega Grid
    const frGrid = resolveThumbnailLayout({
      topicTitle: "Culture Générale Quiz 15 Questions",
      questionCount: 15,
      language: "French",
      mascotProfile: sampleMascot,
    });
    expect(frGrid.layout).toBe("mega_grid");
    expect(frGrid.hookText).toBe("CULTURE GÉNÉRALE");
    expect(frGrid.badgeText).toBe("15 QUESTIONS");

    // 4. French True or False
    const frTf = resolveThumbnailLayout({
      topicTitle: "Vrai ou Faux : 10 Mythes Scientifiques",
      questionFormat: "true_false",
      language: "French",
      mascotProfile: sampleMascot,
    });
    expect(frTf.hookText).toBe("VRAI OU FAUX ?");
    expect(frTf.badgeText).toBe("VRAI OU FAUX ? ⚡");
  });

  it("strictly generates authentic Nordic and Dutch thumbnail texts for all 10 core languages", () => {
    // 1. Dutch (Tiếng Hà Lan)
    const nlPlan = resolveThumbnailLayout({
      topicTitle: "Algemene Kennis Quiz",
      questionCount: 15,
      language: "Dutch",
      mascotProfile: sampleMascot,
    });
    expect(nlPlan.hookText).toBe("ALGEMENE KENNIS");
    expect(nlPlan.badgeText).toBe("15 VRAGEN");

    // 2. Norwegian (Tiếng Na Uy)
    const noPlan = resolveThumbnailLayout({
      topicTitle: "Generell Kunnskap Quiz",
      questionCount: 15,
      language: "Norwegian",
      mascotProfile: sampleMascot,
    });
    expect(noPlan.hookText).toBe("GENERELL KUNNSKAP");
    expect(noPlan.badgeText).toBe("15 SPØRSMÅL");

    // 3. Swedish (Tiếng Thụy Điển)
    const svPlan = resolveThumbnailLayout({
      topicTitle: "Allmänbildning Quiz",
      questionCount: 15,
      language: "Swedish",
      mascotProfile: sampleMascot,
    });
    expect(svPlan.hookText).toBe("ALLMÄNBILDNING");
    expect(svPlan.badgeText).toBe("15 FRÅGOR");

    // 4. Danish (Tiếng Đan Mạch)
    const daPlan = resolveThumbnailLayout({
      topicTitle: "Almen Viden Quiz",
      questionCount: 15,
      language: "Danish",
      mascotProfile: sampleMascot,
    });
    expect(daPlan.hookText).toBe("ALMEN VIDEN");
    expect(daPlan.badgeText).toBe("15 SPØRGSMÅL");

    // 5. Finnish (Tiếng Phần Lan)
    const fiPlan = resolveThumbnailLayout({
      topicTitle: "Yleistieto Tietovisa",
      questionCount: 15,
      language: "Finnish",
      mascotProfile: sampleMascot,
    });
    expect(fiPlan.hookText).toBe("YLEISTIETO");
    expect(fiPlan.badgeText).toBe("15 KYSYMYSTÄ");
  });

  it("resolves curiosity trigger badges in multiple languages", () => {
    const enPlan = resolveThumbnailLayout({
      topicTitle: "Space Planets",
      questionCount: 15,
      language: "English",
      badgeOverride: "99_percent_fail",
      mascotProfile: sampleMascot,
    });
    expect(enPlan.hookText).toBe("SOLAR SYSTEM QUIZ");
    expect(enPlan.badgeText).toBe("99% FAIL! 🔥");

    const jaPlan = resolveThumbnailLayout({
      topicTitle: "太陽系の惑星クイズ",
      questionCount: 15,
      language: "Japanese",
      badgeOverride: "genius_only",
      mascotProfile: sampleMascot,
    });
    expect(jaPlan.hookText).toBe("宇宙クイズ");
    expect(jaPlan.badgeText).toBe("天才専用 🧠");

    const esPlan = resolveThumbnailLayout({
      topicTitle: "Quiz del Sistema Solar y Planetas",
      questionCount: 15,
      language: "Spanish",
      badgeOverride: "iq_test",
      mascotProfile: sampleMascot,
    });
    expect(esPlan.hookText).toBe("QUIZ DEL ESPACIO");
    expect(esPlan.badgeText).toBe("TEST DE CI 140+ ⚡");
  });

  it("compiles high-contrast prompts with rim lighting and dynamic mascot action pose", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Solar System Planets Quiz",
      questionCount: 15,
      language: "English",
      badgeOverride: "99_percent_fail",
      mascotProfile: sampleMascot,
    });

    const prompt169 = compileThumbnailPrompt(plan, "16:9", sampleMascot);
    expect(prompt169).toContain("SOLAR SYSTEM QUIZ");
    expect(prompt169).toContain("99% FAIL! 🔥");
    expect(prompt169).toContain(plan.mascotPersona.poseDescription);
    expect(prompt169).toContain("rim light");
    expect(prompt169).toContain("STRICT NO thick outer border");
  });

  it("contextualizes food & cookie quiz topics and resolves Pastry Chef mascot persona", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Bakes Around the Globe: World Cookie Tour",
      topicSummary: "Journey across world cultures to discover famous national biscuits, celebration cookies, and sweet bakery traditions",
      questionCount: 11,
      language: "English",
      questions: [
        {
          question: "Which country is famous for delicate pastel Macaron cookies?",
          choices: ["France", "England", "Germany", "Netherlands"],
          answer: "France",
        },
      ],
      mascotProfile: sampleMascot,
    });

    expect(plan.hookText).toBe("WORLD COOKIE TOUR!");
    expect(plan.mascotPersona.role).toBe("Master Pastry Chef");
    expect(plan.mascotPersona.costume).toContain("chef hat");
    expect(plan.subjectAnchors[0].visualPrompt).toContain("specialty cookie or pastry representing France");
  });

  it("uses Antigravity AI Planner to synthesize high-CTR semantic thumbnail plans", async () => {
    const { planThumbnailWithAI } = await import("../src/quiz/thumbnail/thumbnailAiPlanner.js");

    const mockLlmClient = {
      connect: () => Promise.resolve(),
      startThread: () => Promise.resolve("thread_thumb_test"),
      startTurn: () => Promise.resolve("turn_thumb_test"),
      interruptTurn: () => Promise.resolve(),
      on: (event: string, cb: (payload: unknown) => void) => {
        if (event === "notification") {
          setTimeout(() => {
            cb({
              method: "turn/completed",
              params: {
                turn: {
                  status: "completed",
                },
              },
            });
          }, 10);
          setTimeout(() => {
            cb({
              method: "item/agentMessage/delta",
              params: {
                delta: JSON.stringify({
                  hook_text: "LEGENDARY WEAPONS!",
                  badge_text: "99% FAIL! 🔥",
                  layout: "split_vs",
                  mascot_persona: {
                    role: "Mythic Warrior",
                    costume: "Golden knight armor with glowing runic cape",
                    prop: "Excalibur glowing sacred sword",
                    expression: "Heroic, fearless, confident smile",
                    poseDescription: "Holding the sacred blade upright ready for battle",
                  },
                  subject_anchors: [
                    { label: "Option A", visualPrompt: "3D legendary Excalibur golden sword" },
                    { label: "Option B", visualPrompt: "3D Norse Mjolnir thunder warhammer" },
                  ],
                }),
              },
            });
          }, 5);
        }
      },
      off: () => {},
    };

    const aiPlan = await planThumbnailWithAI({
      topicTitle: "Mythology: Weapons of Ancient Gods",
      questionCount: 10,
      language: "English",
      llmClient: mockLlmClient,
      mascotProfile: sampleMascot,
    });

    expect(aiPlan.hookText).toBe("LEGENDARY WEAPONS!");
    expect(aiPlan.badgeText).toBe("99% FAIL! 🔥");
    expect(aiPlan.layout).toBe("split_vs");
    expect(aiPlan.mascotPersona.role).toBe("Mythic Warrior");
    expect(aiPlan.subjectAnchors[0].visualPrompt).toContain("Excalibur");
  });

  it("strictly disallows 'odd_one_out' for 9:16 portrait format and falls back to 'mystery_silhouette'", () => {
    // 1. Topic and format matching spot the difference with 9:16 aspect ratio
    const plan916 = resolveThumbnailLayout({
      topicTitle: "Spot The Difference: Find The Odd Imposter Duck",
      questionFormat: "spot_difference",
      aspectRatio: "9:16",
      mascotProfile: sampleMascot,
    });

    expect(plan916.layout).not.toBe("odd_one_out");
    expect(plan916.layout).toBe("mystery_silhouette");

    // 2. Explicit layoutOverride of 'odd_one_out' with 9:16 aspect ratio
    const overridePlan916 = resolveThumbnailLayout({
      topicTitle: "Find the Odd Emoji",
      layoutOverride: "odd_one_out",
      aspectRatio: "9:16",
      mascotProfile: sampleMascot,
    });

    expect(overridePlan916.layout).not.toBe("odd_one_out");
    expect(overridePlan916.layout).toBe("mystery_silhouette");

    // 3. Explicit layoutOverride of 'odd_one_out' with comparison topic falls back to 'split_vs'
    const comparisonPlan916 = resolveThumbnailLayout({
      topicTitle: "Cat vs Dog: Which is the odd one out?",
      questionFormat: "versus",
      layoutOverride: "odd_one_out",
      aspectRatio: "9:16",
      mascotProfile: sampleMascot,
    });

    expect(comparisonPlan916.layout).not.toBe("odd_one_out");
    expect(comparisonPlan916.layout).toBe("split_vs");

    // 4. In 16:9 widescreen, 'odd_one_out' is still allowed
    const plan169 = resolveThumbnailLayout({
      topicTitle: "Spot The Difference: Find The Odd Imposter Duck",
      questionFormat: "spot_difference",
      aspectRatio: "16:9",
      mascotProfile: sampleMascot,
    });

    expect(plan169.layout).toBe("odd_one_out");
  });

  it("compiles 9:16 thumbnail prompt enforcing 440px bottom buffer and bottom 25% clear area", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Space Mystery Quiz",
      aspectRatio: "9:16",
      mascotProfile: sampleMascot,
    });

    const prompt916 = compileThumbnailPrompt(plan, "9:16", sampleMascot);

    // Verify safe-zone directives
    expect(prompt916).toContain("440px bottom buffer");
    expect(prompt916).toContain("bottom 25%");
    expect(prompt916).toContain("TikTok/Shorts");
    expect(prompt916).toContain("captions, sounds, creator handle");
    expect(prompt916).toContain("middle 60% vertical safe zone");

    // Verify vertical composition directives
    expect(prompt916).toContain("zero cluttered 3-card or 3-subject matrices");
    expect(prompt916).toContain("clear vertical stacking");
  });

  describe("Phase 3 AI Planner & Guardrail Integration", () => {
    function createMockLlm(responsePayload: Record<string, unknown>) {
      return {
        connect: () => Promise.resolve(),
        startThread: () => Promise.resolve("thread_thumb_test"),
        startTurn: () => Promise.resolve("turn_thumb_test"),
        interruptTurn: () => Promise.resolve(),
        on: (event: string, cb: (payload: unknown) => void) => {
          if (event === "notification") {
            setTimeout(() => {
              cb({
                method: "turn/completed",
                params: {
                  turn: {
                    status: "completed",
                  },
                },
              });
            }, 10);
            setTimeout(() => {
              cb({
                method: "item/agentMessage/delta",
                params: {
                  delta: JSON.stringify(responsePayload),
                },
              });
            }, 5);
          }
        },
        off: () => {},
      };
    }

    it("buildAiPlannerPrompt explicitly directs LLM to generate 2 to 6 words MAX, strictly under 30 characters", async () => {
      const { buildAiPlannerPrompt } = await import("../src/quiz/thumbnail/thumbnailAiPlanner.js");
      const prompt = buildAiPlannerPrompt({
        topicTitle: "Space Planets",
        language: "English",
      });
      expect(prompt).toContain("2 to 6 words MAX, strictly under 30 characters");
      expect(prompt).toContain("Ultra-punchy 2-6 word headline, strictly under 30 characters");
    });

    it("AI Planner accepts valid 2-6 word hook under 30 chars from LLM", async () => {
      const { planThumbnailWithAI } = await import("../src/quiz/thumbnail/thumbnailAiPlanner.js");
      const mockLlm = createMockLlm({
        hook_text: "SECRET PLANETS!",
        badge_text: "99% FAIL! 🔥",
        layout: "mega_grid",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "Astronomy Secrets",
        language: "English",
        llmClient: mockLlm,
        mascotProfile: sampleMascot,
      });

      expect(plan.hookText).toBe("SECRET PLANETS!");
      const prompt = compileThumbnailPrompt(plan, "16:9", sampleMascot);
      expect(prompt).toContain("SECRET PLANETS!");
    });

    it("AI Planner automatically condenses overlong AI hook (>6 words / >30 chars) without crashing", async () => {
      const { planThumbnailWithAI } = await import("../src/quiz/thumbnail/thumbnailAiPlanner.js");
      const mockLlm = createMockLlm({
        hook_text: "Arcade Game Secrets: True or False Gaming Showdown", // 8 words / 50 chars
        badge_text: "ONLY 1% WIN ⚡",
        layout: "split_vs",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "Arcade Games Trivia",
        language: "English",
        llmClient: mockLlm,
        mascotProfile: sampleMascot,
      });

      // Delimiter split condensation should extract first valid segment
      expect(plan.hookText).toBe("ARCADE GAME SECRETS");
      const prompt = compileThumbnailPrompt(plan, "16:9", sampleMascot);
      expect(prompt).toContain("ARCADE GAME SECRETS");
    });

    it("AI Planner falls back to archetype template when AI hook is 1 word or un-condensable without crashing", async () => {
      const { planThumbnailWithAI } = await import("../src/quiz/thumbnail/thumbnailAiPlanner.js");
      const mockLlm = createMockLlm({
        hook_text: "Secrets", // 1 word, rejected by guardrail
        badge_text: "ONLY 1% WIN ⚡",
        layout: "true_false",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "Myths and Facts",
        questionFormat: "true_false",
        language: "English",
        llmClient: mockLlm,
        mascotProfile: sampleMascot,
      });

      // Should fall back cleanly to true_false archetype template "TRUE OR FALSE?"
      expect(plan.hookText).toBe("TRUE OR FALSE?");
    });

    it("AI Planner prioritizes sanitized manual customHookText over AI output", async () => {
      const { planThumbnailWithAI } = await import("../src/quiz/thumbnail/thumbnailAiPlanner.js");
      const mockLlm = createMockLlm({
        hook_text: "AI GENERATED HOOK",
        badge_text: "GENIUS TIER",
        layout: "mega_grid",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "Space Trivia",
        language: "English",
        customHookText: "CUSTOM USER HOOK!",
        llmClient: mockLlm,
        mascotProfile: sampleMascot,
      });

      expect(plan.hookText).toBe("CUSTOM USER HOOK!");
    });

    it("resolveThumbnailLayout sanitizes overlong customHookText through guardrail", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Space Trivia",
        customHookText: "This Is An Overlong Manual Hook Headline That Exceeds Word Limits",
        mascotProfile: sampleMascot,
      });

      // Guardrail condenses or falls back safely
      expect(plan.hookText.length).toBeLessThanOrEqual(30);
      expect(plan.hookText).not.toBe("This Is An Overlong Manual Hook Headline That Exceeds Word Limits");
    });

    it("compileThumbnailPrompt consumes sanitized hook in top banner instruction", () => {
      const rawPlan = resolveThumbnailLayout({
        topicTitle: "Space Planets",
        mascotProfile: sampleMascot,
      });

      // Even if raw plan had un-sanitized lowercase hook
      rawPlan.hookText = "can you pass this quiz?";
      const prompt = compileThumbnailPrompt(rawPlan, "16:9", sampleMascot);
      expect(prompt).toContain("CAN YOU PASS THIS QUIZ?");
    });
  });
});
