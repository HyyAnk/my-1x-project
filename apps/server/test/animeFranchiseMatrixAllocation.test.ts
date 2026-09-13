import { describe, expect, it } from "vitest";
import type { BankQuestion } from "@studio/shared";
import {
  scoreDomainKeywordMatch,
  scoreQuestionKeywordMatch,
  selectDiscoveryCandidates,
  selectSteeredCandidates,
  extractHintTokens,
} from "../src/context/bankTopicKeywordExtractor.js";
import { selectAutoCandidates } from "../src/quiz/bank/matrix/selectors/matrixAutoSelector.js";
import { selectManualCandidates } from "../src/quiz/bank/matrix/selectors/matrixManualSelector.js";
import { planTopicSuggestionMatrix } from "../src/context/topicMatrixPlanner.js";
import type { EvaluatedBankQuestionCandidate } from "../src/quiz/bank/bankEligibility.js";

function makeQuestion(overrides: Partial<BankQuestion> = {}): BankQuestion {
  const id = overrides.id ?? "q1";
  const format = overrides.format ?? "multiple_choice";
  const choices = [
    { id: "A", text: "Choice A" },
    { id: "B", text: "Choice B" },
    { id: "C", text: "Choice C" },
  ];
  return {
    id,
    archetype_id: "deep_trivia",
    domain_id: "anime_manga",
    subtopic_id: "shonen_legends",
    language: "en",
    question: `Question about ${id}?`,
    format,
    choices,
    correct_choice_id: "A",
    explanation: "Detailed explanation",
    fun_fact: "Interesting fact",
    age_band: "family",
    difficulty: 2,
    tags: ["anime"],
    status: "approved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeEvaluatedCandidate(q: BankQuestion): EvaluatedBankQuestionCandidate {
  return {
    candidateId: q.id,
    question: q,
    fingerprint: `fp_${q.id}`,
    sourceArchetype: q.archetype_id,
    resolvedLanguage: "en",
    translationKey: null,
    cooldownActive: false,
    cooldownDaysRemaining: 0,
  };
}

describe("Phase 2: Anime and Franchise Allocation Logic", () => {
  describe("Keyword Extractor and Synonyms", () => {
    it("scores domain matches using anime_manga synonyms (anime legends, ghibli, shonen, otaku)", () => {
      expect(scoreDomainKeywordMatch("anime_manga", ["anime"])).toBeGreaterThan(0);
      expect(scoreDomainKeywordMatch("anime_manga", ["manga"])).toBeGreaterThan(0);
      expect(scoreDomainKeywordMatch("anime_manga", ["legends"])).toBeGreaterThan(0);
      expect(scoreDomainKeywordMatch("anime_manga", ["ghibli"])).toBeGreaterThan(0);
      expect(scoreDomainKeywordMatch("anime_manga", ["shonen"])).toBeGreaterThan(0);
      expect(scoreDomainKeywordMatch("anime_manga", ["otaku"])).toBeGreaterThan(0);
    });

    it("scores questions matching anime_manga domain synonyms even when text differs", () => {
      const q = makeQuestion({
        domain_id: "anime_manga",
        subtopic_id: "iconic_franchises",
        question: "Who holds the title of the pirate king?",
      });
      const score = scoreQuestionKeywordMatch(q, ["anime", "legends"]);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe("Topic Matrix Planner Steering", () => {
    it("steers matrix to anime_manga when topicHint is 'Anime Legends'", () => {
      const plan = planTopicSuggestionMatrix({
        topicHint: "Anime Legends",
      });
      expect(plan.slots[0].domainId).toBe("anime_manga");
      expect(plan.slots[0].isKeySteered).toBe(true);
      expect(plan.slots[3].isKeySteered).toBe(true);
    });
  });

  describe("Candidate Group Prioritization in Topic Allocation", () => {
    it("selectDiscoveryCandidates prioritizes iconic_franchises over other viable subtopics", () => {
      const shonenCandidates: EvaluatedBankQuestionCandidate[] = Array.from({ length: 8 }, (_, i) =>
        makeEvaluatedCandidate(
          makeQuestion({
            id: `shonen_${i + 1}`,
            subtopic_id: "shonen_legends",
            difficulty: 2,
          }),
        ),
      );

      const franchiseCandidates: EvaluatedBankQuestionCandidate[] = Array.from({ length: 8 }, (_, i) =>
        makeEvaluatedCandidate(
          makeQuestion({
            id: `franchise_${i + 1}`,
            subtopic_id: "iconic_franchises",
            difficulty: 1,
          }),
        ),
      );

      // Pass shonen candidates first in the array to ensure ordering is deliberate
      const combined = [...shonenCandidates, ...franchiseCandidates];
      const selected = selectDiscoveryCandidates(combined, 8);

      expect(selected).toHaveLength(8);
      // Must select from iconic_franchises group
      for (const item of selected) {
        expect(item.question.subtopic_id).toBe("iconic_franchises");
      }
    });

    it("selectDiscoveryCandidates sorts difficulty 1 before difficulty 2 within a group", () => {
      const mixedDifficultyCandidates: EvaluatedBankQuestionCandidate[] = [
        makeEvaluatedCandidate(makeQuestion({ id: "q_diff2_a", difficulty: 2 })),
        makeEvaluatedCandidate(makeQuestion({ id: "q_diff1_a", difficulty: 1 })),
        makeEvaluatedCandidate(makeQuestion({ id: "q_diff2_b", difficulty: 2 })),
        makeEvaluatedCandidate(makeQuestion({ id: "q_diff1_b", difficulty: 1 })),
      ];

      const selected = selectDiscoveryCandidates(mixedDifficultyCandidates, 4);
      expect(selected).toHaveLength(4);
      expect(selected[0].question.difficulty).toBe(1);
      expect(selected[1].question.difficulty).toBe(1);
      expect(selected[2].question.difficulty).toBe(2);
      expect(selected[3].question.difficulty).toBe(2);
    });

    it("selectSteeredCandidates applies priority bonus to iconic_franchises and difficulty 1", () => {
      const candidates: EvaluatedBankQuestionCandidate[] = [
        makeEvaluatedCandidate(
          makeQuestion({
            id: "q_shonen_diff2",
            subtopic_id: "shonen_legends",
            difficulty: 2,
          }),
        ),
        makeEvaluatedCandidate(
          makeQuestion({
            id: "q_franchise_diff1",
            subtopic_id: "iconic_franchises",
            difficulty: 1,
          }),
        ),
      ];

      const { hintTokens } = extractHintTokens("anime legends");
      const selected = selectSteeredCandidates(candidates, hintTokens, 1);
      expect(selected).not.toBeNull();
      expect(selected!).toHaveLength(1);
      expect(selected![0].question.id).toBe("q_franchise_diff1");
    });
  });

  describe("Matrix Selectors Franchise-First Priority", () => {
    it("selectAutoCandidates selects iconic_franchises entities before secondary characters", () => {
      const candidates = selectAutoCandidates([], {
        count: 25,
        domain_id: "anime_manga",
        archetype_ids: ["deep_trivia"],
      });

      expect(candidates).toHaveLength(25);
      for (const c of candidates) {
        expect(c.subtopic_id).toBe("iconic_franchises");
      }
    });

    it("selectManualCandidates sorts iconic_franchises before others when current_variants are equal", () => {
      const candidates = selectManualCandidates([], {
        count: 20,
        domain_id: "anime_manga",
        archetype_ids: ["versus_faceoff"],
      });

      expect(candidates).toHaveLength(20);
      for (const c of candidates) {
        expect(c.subtopic_id).toBe("iconic_franchises");
        expect(c.current_variants).toBe(0);
      }
    });

    it("selectManualCandidates sorts difficulty 1 before difficulty 2 when subtopic is the same", () => {
      const candidates = selectManualCandidates([], {
        count: 10,
        domain_id: "anime_manga",
        subtopic_id: "shonen_legends",
        archetype_ids: ["deep_trivia"],
      });

      expect(candidates.length).toBeGreaterThan(0);
      // Check that all difficulty 1 candidates come before difficulty 2
      let seenDiff2 = false;
      for (const c of candidates) {
        if (["Son Goku", "Monkey D. Luffy", "Naruto Uzumaki", "Saitama"].includes(c.entity_name)) {
          expect(seenDiff2).toBe(false);
        }
        if (["Vegeta", "Roronoa Zoro", "Sasuke Uchiha"].includes(c.entity_name)) {
          seenDiff2 = true;
        }
      }
    });
  });
});
