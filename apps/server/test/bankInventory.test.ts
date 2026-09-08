import { describe, expect, it } from "vitest";
import { hashBankQuestionSource, type BankQuestionWithCooldown } from "@studio/shared";
import { scanBankInventory } from "../src/quiz/bank/bankInventory.js";

const q = (id: string): BankQuestionWithCooldown => ({
  id,
  archetype_id: "deep_trivia",
  domain_id: "science",
  subtopic_id: "space",
  language: "en",
  question: `Question ${id}`,
  format: "multiple_choice",
  choices: [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ],
  correct_choice_id: "a",
  explanation: "Explanation",
  fun_fact: "",
  age_band: "family",
  difficulty: 2,
  tags: [],
  status: "approved",
});

describe("bank inventory scan", () => {
  it("scans all pages and reports complete eligibility counts", async () => {
    const result = await scanBankInventory(
      {
        queryQuestionBankQuestions: ({ offset = 0 }) =>
          Promise.resolve(offset === 0 ? { questions: [q("1")], total: 2 } : { questions: [q("2")], total: 2 }),
      },
      { channelId: "channel-1", targetLanguage: "en", pageSize: 1 },
    );
    expect(result.scan_status).toBe("complete_nonempty");
    expect(result.scanned_count).toBe(2);
    expect(result.eligible_by_policy.short_reel).toBe(2);
    expect(result.eligible_sources.filter((source) => source.policy === "episode")).toHaveLength(2);
    expect(result.eligible_sources.filter((source) => source.policy === "short_reel")).toHaveLength(2);
    expect(
      new Set(result.eligible_sources.filter((source) => source.policy === "short_reel").map((source) => source.candidate.question.id))
        .size,
    ).toBe(2);
    expect(result.eligible_sources[0].source_content_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps Bank availability snapshots independent of channel target language", async () => {
    const reader = { queryQuestionBankQuestions: () => Promise.resolve({ questions: [q("1")], total: 1 }) };
    const english = await scanBankInventory(reader, { channelId: "channel-1", targetLanguage: "en" });
    const german = await scanBankInventory(reader, { channelId: "channel-1", targetLanguage: "de" });
    expect(german.snapshot_token).toBe(english.snapshot_token);
    expect(german.eligible_by_policy).toEqual(english.eligible_by_policy);
  });

  it("reports truncation as incomplete rather than an empty inventory", async () => {
    const result = await scanBankInventory(
      { queryQuestionBankQuestions: () => Promise.resolve({ questions: [q("1")], total: 2 }) },
      { channelId: "channel-1", targetLanguage: "en", pageSize: 1, maxPages: 1 },
    );
    expect(result.scan_status).toBe("incomplete");
  });

  it("reports reader errors as unavailable", async () => {
    const result = await scanBankInventory(
      {
        queryQuestionBankQuestions: () => Promise.reject(new Error("permission denied")),
      },
      { channelId: "channel-1", targetLanguage: "en" },
    );
    expect(result.scan_status).toBe("unavailable");
    expect(result.error_code).toBe("BANK_READ_FAILED");
  });

  it("rejects duplicate IDs as an inconsistent snapshot", async () => {
    const result = await scanBankInventory(
      { queryQuestionBankQuestions: () => Promise.resolve({ questions: [q("1"), q("1")], total: 2 }) },
      { channelId: "channel-1", targetLanguage: "en", pageSize: 2 },
    );
    expect(result.scan_status).toBe("incomplete");
    expect(result.error_code).toBe("BANK_SCAN_INCONSISTENT");
  });

  it("keeps localized Bank translation fields out of the source content hash", async () => {
    const translated = {
      ...q("1"),
      language: "en",
      translations: {
        en: {
          language: "en",
          question: "Which planet is red?",
          explanation: "Mars is red.",
          choices: [
            { id: "a", text: "Mars" },
            { id: "b", text: "Venus" },
            { id: "c", text: "Jupiter" },
          ],
          verified: true,
        },
      },
    } as BankQuestionWithCooldown;
    const result = await scanBankInventory(
      { queryQuestionBankQuestions: () => Promise.resolve({ questions: [translated], total: 1 }) },
      { channelId: "channel-1", targetLanguage: "en" },
    );
    const source = result.eligible_sources.find((entry) => entry.policy === "episode");
    expect(source?.source_content_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(source?.source_content_hash).toBe(hashBankQuestionSource(translated));
  });

  it("rejects rows returned beyond the reported total", async () => {
    const result = await scanBankInventory(
      { queryQuestionBankQuestions: () => Promise.resolve({ questions: [q("1")], total: 0 }) },
      { channelId: "channel-1", targetLanguage: "en" },
    );
    expect(result.scan_status).toBe("incomplete");
    expect(result.error_code).toBe("BANK_SCAN_INCONSISTENT");
  });

  it("rejects duplicate IDs in snapshot reader as an inconsistent snapshot", async () => {
    const result = await scanBankInventory(
      {
        queryQuestionBankQuestions: () => Promise.resolve({ questions: [], total: 0 }),
        readQuestionBankQuestionsSnapshot: () =>
          Promise.resolve({
            questions: [q("dup-1"), q("dup-1")],
            total: 2,
            revision: 1,
          }),
      },
      { channelId: "channel-1", targetLanguage: "en" },
    );
    expect(result.scan_status).toBe("incomplete");
    expect(result.error_code).toBe("BANK_SCAN_INCONSISTENT");
  });
});
