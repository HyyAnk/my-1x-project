import type { BankQuestion } from "@studio/shared";
import { normalizeQuestionText } from "../../qa/questionHistory.js";

/**
 * High-performance deduplication index for Question Bank Auto-QA.
 * Level 1: O(1) exact-match lookup via normalized text map.
 * Level 2: Scoped semantic candidate retrieval by domain_id / entity_id.
 */
export class QuestionBankAutoQaIndex {
  private exactMap = new Map<string, BankQuestion[]>();
  private domainIndex = new Map<string, BankQuestion[]>();
  private entityIndex = new Map<string, BankQuestion[]>();
  private fallbackList: BankQuestion[] = [];
  private allQuestions: BankQuestion[] = [];

  constructor(initialQuestions: BankQuestion[] = []) {
    for (const q of initialQuestions) {
      this.add(q);
    }
  }

  /**
   * Adds a question to the index, updating exact-match and scoped lookup tables.
   */
  public add(question: BankQuestion): void {
    this.allQuestions.push(question);

    const norm = normalizeQuestionText(question.question || "");
    if (norm) {
      let list = this.exactMap.get(norm);
      if (!list) {
        list = [];
        this.exactMap.set(norm, list);
      }
      list.push(question);
    }

    if (question.domain_id) {
      let dList = this.domainIndex.get(question.domain_id);
      if (!dList) {
        dList = [];
        this.domainIndex.set(question.domain_id, dList);
      }
      dList.push(question);
    } else {
      this.fallbackList.push(question);
    }

    if (question.entity_id) {
      let eList = this.entityIndex.get(question.entity_id);
      if (!eList) {
        eList = [];
        this.entityIndex.set(question.entity_id, eList);
      }
      eList.push(question);
    }
  }

  /**
   * Level 1 Fast Path: O(1) lookup to find any exact normalized text duplicate.
   * Returns the matching BankQuestion if an exact duplicate exists (with a different id), or null.
   */
  public findExactMatch(question: BankQuestion): BankQuestion | null {
    const norm = normalizeQuestionText(question.question || "");
    if (!norm) return null;
    const matches = this.exactMap.get(norm);
    if (!matches || matches.length === 0) return null;
    for (const match of matches) {
      if (match.id !== question.id) {
        return match;
      }
    }
    return null;
  }

  /**
   * Level 2 Scoped Semantic Retrieval:
   * Returns candidate questions matching domain_id (and/or entity_id), plus unscoped fallback questions.
   * If candidate lacks domain_id and entity_id, safely falls back to all questions.
   */
  public getSemanticComparisonCandidates(question: BankQuestion): BankQuestion[] {
    if (!question.domain_id && !question.entity_id) {
      return this.allQuestions;
    }

    const result: BankQuestion[] = [];
    const seenIds = new Set<string>();

    const addIfNew = (q: BankQuestion) => {
      if (!seenIds.has(q.id)) {
        seenIds.add(q.id);
        result.push(q);
      }
    };

    if (question.domain_id) {
      const domainQuestions = this.domainIndex.get(question.domain_id);
      if (domainQuestions) {
        for (const q of domainQuestions) addIfNew(q);
      }
    }

    if (question.entity_id) {
      const entityQuestions = this.entityIndex.get(question.entity_id);
      if (entityQuestions) {
        for (const q of entityQuestions) addIfNew(q);
      }
    }

    for (const q of this.fallbackList) {
      addIfNew(q);
    }

    return result;
  }

  /**
   * Returns the total number of indexed questions.
   */
  public get size(): number {
    return this.allQuestions.length;
  }
}
