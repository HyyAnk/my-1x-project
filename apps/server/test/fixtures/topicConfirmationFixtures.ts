import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BankQuestionSchema, hashBankQuestionSource, type BankQuestion, type TopicRunCandidate, type TopicRunResult } from "@studio/shared";
import { RepositoryService } from "../../src/repository/service.js";
import type { LLMClient } from "../../src/utils/promptSanitizer.js";
import type { TopicConfirmationReceipt } from "../../src/repository/topicConfirmationReceipts.js";

export interface ConfirmationTestFixture {
  repo: RepositoryService;
  channel: Awaited<ReturnType<RepositoryService["createChannel"]>>;
  root: string;
}

export async function createConfirmationTestFixture(
  roots: string[],
  projectRoot: string,
  channelOverrides: Partial<Parameters<RepositoryService["createChannel"]>[0]> = {},
): Promise<ConfirmationTestFixture> {
  const root = await mkdtemp(path.join(os.tmpdir(), "stage4-confirm-test-"));
  roots.push(root);

  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");

  const repo = new RepositoryService(projectRoot, root);
  await repo.ensureBootstrap();

  const channel = await repo.createChannel({
    name: "Test Confirmation Channel",
    description: "Channel for Stage 4 testing",
    target_audience: "Kids",
    language: "en",
    market: "US",
    dna_mode: "example",
    ...channelOverrides,
  });

  return { repo, channel, root };
}

export function makeBankQuestion(id: string, overrides: Partial<BankQuestion> = {}): BankQuestion {
  return BankQuestionSchema.parse({
    id,
    format: "multiple_choice",
    archetype_id: "deep_trivia",
    domain_id: "science",
    subtopic_id: "space",
    language: "en",
    status: "approved",
    age_band: "7-9",
    question: `Question text for ${id}`,
    explanation: `Explanation for ${id}`,
    choices: [
      { id: "c1", text: "Option A", is_correct: true },
      { id: "c2", text: "Option B", is_correct: false },
      { id: "c3", text: "Option C", is_correct: false },
    ],
    correct_choice_id: "c1",
    ...overrides,
  });
}

export async function seedBankQuestions(repo: RepositoryService, questions: BankQuestion[]): Promise<void> {
  for (const q of questions) {
    await repo.saveQuestionBankQuestion(q);
  }
}

export type CandidateSourceBinding = TopicRunCandidate["source_bindings"][number];

export function createSourceBinding(
  sourceQuestionId: string,
  sourceContentHash: string,
  overrides?: Partial<CandidateSourceBinding>,
): CandidateSourceBinding {
  return {
    source_question_id: sourceQuestionId,
    source_hash_version: 1,
    source_content_hash: sourceContentHash,
    projection_provenance: {
      source_variant: "native",
      resolved_language: "en",
      translation_key: null,
      translation_provenance: "native",
      ...(overrides?.projection_provenance ?? {}),
    },
    ...overrides,
  };
}

export function createSourceBindingsForQuestions(
  questions: BankQuestion[],
  overrides?: Partial<CandidateSourceBinding>,
): CandidateSourceBinding[] {
  return questions.map((q) => createSourceBinding(q.id, hashBankQuestionSource(q), overrides));
}

export interface CreateBoundCandidateOptions {
  channelId: string;
  topicId: string;
  contentKind?: "episode" | "short_reel";
  slotId?: string;
  title?: string;
  premise?: string;
  whyItFits?: string;
  hook?: string;
  estimatedPotential?: string;
  generatedAt?: string;
  selected?: boolean;
  archetype?: string;
  aspectRatio?: "16:9" | "9:16";
  origin?: "discovery" | "bank" | "curated";
  questionCount?: number;
  questions?: BankQuestion[];
  sourceBindings?: CandidateSourceBinding[];
  overrides?: Partial<TopicRunCandidate>;
}

export function createBoundCandidate(options: CreateBoundCandidateOptions): TopicRunCandidate {
  const contentKind = options.contentKind ?? "episode";
  const questionCount = options.questionCount ?? (options.questions ? options.questions.length : contentKind === "short_reel" ? 1 : 3);
  const sourceBindings = options.sourceBindings ?? (options.questions ? createSourceBindingsForQuestions(options.questions) : []);

  return {
    slot_id: options.slotId ?? (contentKind === "short_reel" ? "slot_4" : "slot_1"),
    topic_id: options.topicId,
    channel_id: options.channelId,
    content_kind: contentKind,
    archetype: options.archetype ?? "deep_trivia",
    aspect_ratio: options.aspectRatio ?? (contentKind === "short_reel" ? "9:16" : "16:9"),
    title: options.title ?? "Test Topic",
    premise: options.premise ?? "A fun quiz premise",
    why_it_fits: options.whyItFits ?? "Fits category",
    hook: options.hook ?? "Check this out!",
    estimated_potential: options.estimatedPotential ?? "High",
    generated_at: options.generatedAt ?? new Date().toISOString(),
    selected: options.selected ?? false,
    question_count: questionCount,
    source_bindings: sourceBindings,
    ...(options.origin ? { origin: options.origin } : {}),
    ...options.overrides,
  } as TopicRunCandidate;
}

export function createTopicRunResult(
  runId: string,
  candidates: TopicRunCandidate[],
  options: {
    targetEpisodeCount?: number;
    targetShortReelCount?: number;
    shortages?: TopicRunResult["shortages"];
  } = {},
): TopicRunResult {
  const isShortReel = candidates.length > 0 && candidates[0].content_kind === "short_reel";
  return {
    run_id: runId,
    target_episode_count: options.targetEpisodeCount ?? (isShortReel ? 0 : 1),
    target_short_reel_count: options.targetShortReelCount ?? (isShortReel ? 1 : 0),
    candidates,
    shortages: options.shortages ?? [],
  };
}

export function createMockReceipt(
  channelId: string,
  topicId: string,
  overrides: Partial<TopicConfirmationReceipt> = {},
): TopicConfirmationReceipt {
  return {
    receipt_id: overrides.receipt_id ?? "rec_001",
    channel_id: channelId,
    topic_id: topicId,
    content_kind: overrides.content_kind ?? "episode",
    product_id: overrides.product_id ?? "ep_rec_001",
    status: overrides.status ?? "completed",
    confirmed_at: overrides.confirmed_at ?? new Date().toISOString(),
    request_id: overrides.request_id ?? "req_001",
    options_fingerprint: overrides.options_fingerprint ?? "0".repeat(64),
    options: overrides.options ?? { question_count: 3 },
    source_question_ids: overrides.source_question_ids ?? ["q_1", "q_2", "q_3"],
    source_content_hashes: overrides.source_content_hashes ?? ["0".repeat(64), "1".repeat(64), "2".repeat(64)],
    ...overrides,
  };
}

export function createGermanLocalizationStubLlm(questionIds: string[]): LLMClient {
  const translationPayload: Record<string, string> = {
    product_video_description: "Deutsche Beschreibung für das Video",
    product_thumbnail_text: "DEUTSCHER TITEL",
  };

  const numberNames = ["Erste", "Zweite", "Dritte"];

  questionIds.forEach((qid, idx) => {
    const num = idx + 1;
    translationPayload[`${qid}_question`] = `Welche Frage ${num}?`;
    translationPayload[`${qid}_explanation`] = `Erklärung ${num} auf Deutsch.`;
    translationPayload[`${qid}_choice_c1`] = idx === 0 ? "Option A auf Deutsch" : `${numberNames[idx]} Option A auf Deutsch`;
    translationPayload[`${qid}_choice_c2`] = idx === 0 ? "Option B auf Deutsch" : `${numberNames[idx]} Option B auf Deutsch`;
    translationPayload[`${qid}_choice_c3`] = idx === 0 ? "Option C auf Deutsch" : `${numberNames[idx]} Option C auf Deutsch`;
  });

  return {
    connect: () => Promise.resolve(),
    generateContent: () =>
      Promise.resolve({
        text: JSON.stringify(translationPayload),
      }),
  };
}

export function createUnboundCandidate(channelId: string, topicId: string, overrides: Record<string, unknown> = {}) {
  return {
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "episode" as const,
    title: "Unbound Candidate",
    premise: "No bindings",
    why_it_fits: "None",
    hook: "Hook",
    estimated_potential: "Low",
    generated_at: new Date().toISOString(),
    selected: false,
    question_count: 3,
    ...overrides,
  };
}
