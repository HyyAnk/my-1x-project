import { describe, expect, it } from "vitest";
import {
  ARCHETYPE_GUIDELINES,
  FRANCHISE_ANCHOR_MANDATE,
  FRANCHISE_ANCHOR_MANDATE_LINES,
  VISUAL_ANCHOR_MANDATE,
  VISUAL_ANCHOR_MANDATE_LINES,
  buildBatchGenerationPrompt,
  buildReverseGenerationPrompt,
  type TargetEntityForGeneration,
} from "../src/quiz/bank/batchGeneratorPrompt.js";
import { buildDirectQuizOutputContract } from "../src/context/quizDirectPromptBuilder.js";
import { buildScriptGenerationPrompt } from "../src/shortReel/scriptPrompt.js";

describe("Phase 3: Franchise-Anchored Question Phrasing Directives", () => {
  describe("1. Shared Mandate Constants & Guidelines", () => {
    it("exports FRANCHISE_ANCHOR_MANDATE with all canonical requirements", () => {
      expect(FRANCHISE_ANCHOR_MANDATE).toContain("=== FRANCHISE ANCHOR MANDATE (CRITICAL FOR CASUAL AUDIENCE) ===");
      expect(FRANCHISE_ANCHOR_MANDATE).toContain(
        "When generating questions about anime, manga, gaming, comics, movies, or fictional characters:",
      );
      expect(FRANCHISE_ANCHOR_MANDATE).toContain(
        "1. NEVER formulate a question around an isolated, naked character name (e.g. NEVER ask 'Whose hand clap swaps positions?' or 'Who is Tenko Shimura?').",
      );
      expect(FRANCHISE_ANCHOR_MANDATE).toContain(
        "2. ALWAYS explicitly anchor the parent franchise or show title in the question prompt (e.g. 'In Jujutsu Kaisen, which sorcerer...', 'In Dragon Ball Z, whose signature beam is...', 'In Demon Slayer, what color is Tanjiro's blade?', 'In Naruto, who leads Team 7?').",
      );
      expect(FRANCHISE_ANCHOR_MANDATE).toContain(
        "3. For franchise-level entities (e.g. Dragon Ball, One Piece, Pokemon, Doraemon), ask about world-famous hallmarks, legendary objects, iconic catchphrases, or universal symbols that anyone on social media recognizes immediately.",
      );
      expect(FRANCHISE_ANCHOR_MANDATE).toContain(
        "4. This ensures 100% immediate context and instant engagement for casual viewers and families.",
      );
      expect(FRANCHISE_ANCHOR_MANDATE_LINES.length).toBe(6);
    });

    it("exports VISUAL_ANCHOR_MANDATE with all canonical visual spec rules", () => {
      expect(VISUAL_ANCHOR_MANDATE).toContain("=== VISUAL SPEC & CONTINUITY ANCHOR MANDATE (CRITICAL FOR ACCURATE ILLUSTRATIONS) ===");
      expect(VISUAL_ANCHOR_MANDATE).toContain("ALWAYS explicitly name the character/entity and their parent franchise or lore universe");
      expect(VISUAL_ANCHOR_MANDATE).toContain("NEVER describe iconic subjects with vague generic placeholders");
      expect(VISUAL_ANCHOR_MANDATE).toContain("ALWAYS anchor the subject in an authentic, lore-accurate environment/setting");
      expect(VISUAL_ANCHOR_MANDATE_LINES.length).toBe(8);
    });

    it("includes franchise anchoring instructions in archetype guidelines", () => {
      const deepTriviaIns = ARCHETYPE_GUIDELINES.deep_trivia.instructions.join(" ");
      expect(deepTriviaIns).toContain("FRANCHISE ANCHOR MANDATE");
      expect(deepTriviaIns).toContain("In Dragon Ball Z, whose signature energy wave is the Kamehameha?");
      expect(deepTriviaIns).toContain("In One Piece, what straw accessory was given to Luffy by Shanks?");
      expect(deepTriviaIns).toContain("In Pokemon, which electric mouse is Ash Ketchum's loyal partner?");
      expect(deepTriviaIns).toContain("In Naruto, which swirling blue sphere technique did Minato invent?");
      expect(deepTriviaIns).toContain("In Detective Conan, what gadget lets Conan mimic Kogoro's voice?");
      expect(deepTriviaIns).toContain("ANTI-OBSCURITY NEGATIVE CONSTRAINTS");

      const versusIns = ARCHETYPE_GUIDELINES.versus_faceoff.instructions.join(" ");
      expect(versusIns).toContain("FRANCHISE ANCHOR MANDATE");
      expect(versusIns).toContain("Goku (Dragon Ball) vs Saitama (One Punch Man)");

      const clueIns = ARCHETYPE_GUIDELINES.clue_deduction.instructions.join(" ");
      expect(clueIns).toContain("FRANCHISE ANCHOR MANDATE");
      expect(clueIns).toContain("In Journey to the West, who wields this nine-toothed iron rake?");
    });
  });

  describe("2. Standard Batch Prompt Builder", () => {
    it("injects the Franchise Anchor Mandate block into standard batch prompts", () => {
      const prompt = buildBatchGenerationPrompt({
        archetypeId: "speed_blitz",
        domainId: "pop_culture",
        subtopicId: "anime_shonen",
        count: 5,
        language: "en",
        difficulty: 2,
      });

      expect(prompt).toContain("=== FRANCHISE ANCHOR MANDATE (CRITICAL FOR CASUAL AUDIENCE) ===");
      expect(prompt).toContain("NEVER formulate a question around an isolated, naked character name");
      expect(prompt).toContain("ALWAYS explicitly anchor the parent franchise or show title in the question prompt");
      expect(prompt).toContain("In Jujutsu Kaisen, which sorcerer...");
    });

    it("uses franchise-anchored examples in Golden Deep Trivia Paradigms", () => {
      const prompt = buildBatchGenerationPrompt({
        archetypeId: "deep_trivia",
        domainId: "pop_culture",
        subtopicId: "anime_shonen",
        count: 5,
        language: "en",
        difficulty: 3,
      });

      expect(prompt).toContain("=== GOLDEN DEEP TRIVIA PARADIGMS (PUNCHY & DIVERSE HOOKS) ===");
      expect(prompt).toContain('1. Feat / Signature Action: "In Dragon Ball Z, whose signature energy wave is the Kamehameha?"');
      expect(prompt).toContain('2. Iconic Relic / Hallmarks: "In One Piece, what straw accessory was given to Luffy by Shanks?"');
      expect(prompt).toContain('3. Universal Mascot / Partner: "In Pokemon, which electric mouse is Ash Ketchum\'s loyal partner?"');
      expect(prompt).toContain('4. Signature Jutsu / Technique: "In Naruto, which swirling blue sphere technique did Minato invent?"');
      expect(prompt).toContain('5. Detective Gadget / Identity: "In Detective Conan, what gadget lets Conan mimic Kogoro\'s voice?"');
      expect(prompt).toContain("ANTI-OBSCURITY NEGATIVE CONSTRAINTS:");
      expect(prompt).toContain("NEVER test obscure manga chapter numbers, release dates, or background animator names.");
    });
  });

  describe("3. Reverse Matrix Prompt Builder", () => {
    const mockTarget: TargetEntityForGeneration = {
      entity_id: "ENT-ANI-999",
      name: "Son Goku",
      domain_id: "pop_culture",
      subtopic_id: "anime_shonen",
      visual_anchor: "Super Saiyan aura",
      core_traits: ["Kamehameha", "Saiyan warrior", "Dragon Balls"],
      distractor_pool: ["Vegeta", "Piccolo"],
      facts_and_myths: [
        {
          claim: "Goku was originally sent to destroy Earth",
          verdict: "fact",
          explanation: "As a Saiyan infant, Goku was sent to conquer Earth before bumping his head.",
        },
      ],
      versus_candidates: ["Superman", "Saitama"],
    };

    it("injects the Franchise Anchor Mandate into reverse matrix generation prompts", () => {
      const prompt = buildReverseGenerationPrompt({
        archetypeId: "deep_trivia",
        targets: [mockTarget],
        language: "en",
        difficulty: 2,
      });

      expect(prompt).toContain("=== FRANCHISE ANCHOR MANDATE (CRITICAL FOR CASUAL AUDIENCE) ===");
      expect(prompt).toContain("NEVER formulate a question around an isolated, naked character name");
      expect(prompt).toContain("ALWAYS explicitly anchor the parent franchise or show title in the question prompt");
      expect(prompt).toContain(
        "5. FRANCHISE ANCHORING: If the target entity belongs to anime, manga, gaming, comics, movies, or fictional lore, ALWAYS explicitly include the parent franchise/universe name in the question hook.",
      );
    });

    it("anchors deep trivia phrasing examples in reverse matrix prompt", () => {
      const prompt = buildReverseGenerationPrompt({
        archetypeId: "deep_trivia",
        targets: [mockTarget],
      });

      expect(prompt).toContain('In Dragon Ball Z, whose signature energy wave is the Kamehameha?');
      expect(prompt).toContain('In One Piece, what straw accessory was given to Luffy by Shanks?');
      expect(prompt).toContain("In Pokemon, which electric mouse is Ash Ketchum's loyal partner?");
      expect(prompt).toContain('In Naruto, which swirling blue sphere technique did Minato invent?');
      expect(prompt).toContain("In Detective Conan, what gadget lets Conan mimic Kogoro's voice?");
      expect(prompt).toContain("ANTI-OBSCURITY CONSTRAINTS");
      expect(prompt).toContain("NEVER test secondary character family lineages, blood types, or obscure minor jutsu/spells.");
    });

    it("injects the target entity visual anchor and Visual Anchor Mandate into reverse matrix prompt", () => {
      const prompt = buildReverseGenerationPrompt({
        archetypeId: "deep_trivia",
        targets: [mockTarget],
      });

      expect(prompt).toContain('- Visual Anchor (Use directly for visual_spec.prompt): "Super Saiyan aura"');
      expect(prompt).toContain("=== VISUAL SPEC & CONTINUITY ANCHOR MANDATE (CRITICAL FOR ACCURATE ILLUSTRATIONS) ===");
      expect(prompt).toContain("Detailed cinematic visual prompt in English based on Visual Anchor and entity lore");
    });
  });

  describe("4. Direct Quiz Output Contract", () => {
    it("enforces franchise anchor rule in direct generation contract", () => {
      const contract = buildDirectQuizOutputContract({
        taskType: "GENERATE_QUIZ",
        episode: { episode_id: "ep_anime_01", topic: { title: "Anime Legends" } } as any,
        quizQuestionCount: 5,
        quizLastClaimId: "C05",
        quizSourceMinimum: 3,
      });

      expect(contract).toContain("=== FRANCHISE ANCHOR MANDATE (CRITICAL FOR CASUAL AUDIENCE) ===");
      expect(contract).toContain("Franchise Anchoring: When generating questions about anime, manga, gaming, comics, movies, or fictional characters");
    });
  });

  describe("5. Short-Reel Script Generation", () => {
    it("includes franchise context guidance in video narrative constraints", () => {
      const prompt = buildScriptGenerationPrompt({
        topic: {
          topic_id: "top-1",
          channel_id: "chan-1",
          title: "Anime Rivals",
          premise: "Goku vs Vegeta",
          hook: "Who reached Super Saiyan first?",
          origin: "discovery",
        },
        source: {
          question_id: "q-1",
          question_text: "In Dragon Ball Z, who achieved Super Saiyan first on Namek?",
          archetype_id: "deep_trivia",
          selected_answer_text: "Goku",
          choices: [
            { id: "A", text: "Goku", is_correct: true },
            { id: "B", text: "Vegeta", is_correct: false },
            { id: "C", text: "Gohan", is_correct: false },
          ],
          explanation: "Goku awakened Super Saiyan after Krillin fell against Frieza.",
        },
      });

      expect(prompt).toContain("FRANCHISE CONTEXT: For fictional, anime, gaming, or pop culture topics");
    });
  });
});
