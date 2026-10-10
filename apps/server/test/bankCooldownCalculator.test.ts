import { describe, expect, it } from "vitest";
import { inferQuestionHistoryContentType, type BankQuestion } from "@studio/shared";
import {
  createBankCooldownCalculator,
  type BankCooldownScope,
  type CooldownHistoryEntry,
} from "../src/repository/quiz/bank/bankCooldownCalculator.js";
import { calculateQuestionSimilarity } from "../src/quiz/qa/questionHistory.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_MS = Date.parse("2026-10-09T12:00:00.000Z");
const COOLDOWN_MS = 30 * DAY_MS;

function bankQuestion(id: string, question: string): BankQuestion {
  return {
    id,
    archetype_id: "deep_trivia",
    domain_id: "science",
    subtopic_id: "space",
    language: "en",
    question,
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Mars" },
      { id: "B", text: "Venus" },
      { id: "C", text: "Jupiter" },
    ],
    correct_choice_id: "A",
    explanation: "Explanation.",
    age_band: "family",
    difficulty: 2,
    tags: [],
    status: "approved",
  } as BankQuestion;
}

function historyEntry(questionId: string, text: string, daysAgo: number, contentType: "episode" | "short_reel"): CooldownHistoryEntry {
  return {
    question_id: questionId,
    question_text: text,
    rendered_at: new Date(NOW_MS - daysAgo * DAY_MS).toISOString(),
    episode_id: `ep_${questionId}`,
    episode_title: `Episode ${questionId}`,
    content_type: contentType,
  };
}

/** The per-question algorithm the calculator replaced, kept here as the behavioral reference. */
function referenceCooldown(question: BankQuestion, history: CooldownHistoryEntry[], scope?: BankCooldownScope) {
  const scoped =
    scope === "episode" || scope === "short_reel" ? history.filter((e) => inferQuestionHistoryContentType(e) === scope) : history;
  if (scoped.length === 0) return { ...question, channel_cooldown: { is_cooldown: false, days_remaining: 0 } };
  let matched: CooldownHistoryEntry | null = null;
  let highest = 0;
  for (const entry of scoped) {
    if (entry.question_id === question.id) {
      matched = entry;
      break;
    }
    const sim = calculateQuestionSimilarity(question.question, entry.question_text);
    if (sim >= 0.75 && sim > highest) {
      highest = sim;
      matched = entry;
    }
  }
  if (matched) {
    const diff = NOW_MS - new Date(matched.rendered_at).getTime();
    if (diff < COOLDOWN_MS) {
      return {
        ...question,
        channel_cooldown: {
          is_cooldown: true,
          days_remaining: Math.max(1, Math.ceil((COOLDOWN_MS - diff) / DAY_MS)),
          last_used_at: matched.rendered_at,
          episode_id: matched.episode_id,
          episode_title: matched.episode_title,
          content_type: inferQuestionHistoryContentType(matched),
        },
      };
    }
  }
  return {
    ...question,
    channel_cooldown: { is_cooldown: false, days_remaining: 0, last_used_at: matched ? matched.rendered_at : undefined },
  };
}

const HISTORY: CooldownHistoryEntry[] = [
  historyEntry("Q-OLD", "Which planet is known as the Red Planet?", 45, "episode"),
  historyEntry("Q-1", "Which planet is known as the red planet in our solar system?", 3, "episode"),
  historyEntry("Q-2", "What is the largest ocean on Earth?", 10, "short_reel"),
  historyEntry("Q-3", "Which animal is the fastest on land?", 29, "episode"),
  historyEntry("Q-2", "What is the largest ocean on Earth?", 1, "episode"),
];

const QUESTIONS: BankQuestion[] = [
  bankQuestion("Q-1", "Totally unrelated wording about volcanoes"),
  bankQuestion("Q-NEW-1", "Which planet is known as the Red Planet?"),
  bankQuestion("Q-NEW-2", "What is the largest ocean on planet Earth?"),
  bankQuestion("Q-NEW-3", "Which land animal is the fastest?"),
  bankQuestion("Q-NEW-4", "How many legs does a spider have?"),
  bankQuestion("Q-2", "What is the largest ocean on Earth?"),
  bankQuestion("Q-NEW-5", ""),
];

describe("createBankCooldownCalculator", () => {
  it.each<BankCooldownScope | undefined>([undefined, "all", "episode", "short_reel"])(
    "matches the reference algorithm for scope %s",
    (scope) => {
      const apply = createBankCooldownCalculator(HISTORY, { nowMs: NOW_MS, cooldownMs: COOLDOWN_MS, scope });
      for (const question of QUESTIONS) {
        expect(apply(question)).toEqual(referenceCooldown(question, HISTORY, scope));
      }
    },
  );

  it("prefers an exact question ID match over an earlier similar entry", () => {
    const apply = createBankCooldownCalculator(HISTORY, { nowMs: NOW_MS, cooldownMs: COOLDOWN_MS });
    const result = apply(bankQuestion("Q-3", "Which planet is known as the Red Planet?"));
    expect(result.channel_cooldown).toMatchObject({ is_cooldown: true, episode_id: "ep_Q-3", days_remaining: 1 });
  });

  it("reports no cooldown without history", () => {
    const apply = createBankCooldownCalculator([], { nowMs: NOW_MS, cooldownMs: COOLDOWN_MS });
    expect(apply(QUESTIONS[1]).channel_cooldown).toEqual({ is_cooldown: false, days_remaining: 0 });
  });
});
