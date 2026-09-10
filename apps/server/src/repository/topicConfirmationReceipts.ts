import { mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { sourceCanonicalJsonStringify } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { RepositoryService } from "./service.js";

export const TopicConfirmationOptionsSchema = z
  .object({
    question_count: z.number().int().positive().optional(),
    visual_style: z.string().trim().min(1).optional(),
    render_aspect_ratio: z.string().trim().min(1).optional(),
    target_language: z.string().trim().min(1).optional(),
    custom_hook_text: z.string().trim().min(1).optional(),
    thumbnail_text: z.string().trim().min(1).optional(),
  })
  .strict();

export type TopicConfirmationOptions = z.infer<typeof TopicConfirmationOptionsSchema>;

export const TopicConfirmationReceiptSchema = z
  .object({
    receipt_id: z.string().trim().min(1),
    channel_id: z.string().trim().min(1),
    topic_id: z.string().trim().min(1),
    content_kind: z.enum(["episode", "short_reel"]),
    product_id: z.string().trim().min(1),
    product_slug: z.string().trim().min(1).optional(),
    status: z.enum(["preparing", "completed"]).default("completed"),
    confirmed_at: z.string().trim().min(1),
    request_id: z.string().trim().min(1),
    options_fingerprint: z.string().regex(/^[a-f0-9]{64}$/, "Expected SHA-256 hex string"),
    options: TopicConfirmationOptionsSchema,
    source_question_ids: z.array(z.string().trim().min(1)),
    source_content_hashes: z.array(z.string().regex(/^[a-f0-9]{64}$/, "Expected SHA-256 hex string")),
  })
  .strict();

export type TopicConfirmationReceipt = z.infer<typeof TopicConfirmationReceiptSchema>;

export function computeConfirmationOptionsFingerprint(options: TopicConfirmationOptions): string {
  const normalized: TopicConfirmationOptions = {
    ...(options.question_count !== undefined ? { question_count: options.question_count } : {}),
    visual_style: options.visual_style?.trim().toLowerCase() || "mixed",
    ...(options.render_aspect_ratio !== undefined ? { render_aspect_ratio: options.render_aspect_ratio } : {}),
    target_language: options.target_language?.trim().toLowerCase() || "en",
    ...(options.custom_hook_text !== undefined ? { custom_hook_text: options.custom_hook_text.trim() } : {}),
    ...(options.thumbnail_text !== undefined ? { thumbnail_text: options.thumbnail_text.trim() } : {}),
  };
  const canonicalJson = sourceCanonicalJsonStringify(normalized);
  return createHash("sha256").update(canonicalJson).digest("hex");
}

function resolveReceiptPath(repo: RepositoryService, channelSlug: string, topicId: string): string {
  return repo.resolvePath("channels", channelSlug, "receipts", `confirm-${topicId}.json`);
}

export async function getTopicConfirmationReceipt(
  repo: RepositoryService,
  channelId: string,
  topicId: string,
): Promise<TopicConfirmationReceipt | null> {
  const channel = await repo.getChannel(channelId);
  const filePath = resolveReceiptPath(repo, channel.slug, topicId);
  try {
    const raw = await readFile(filePath, "utf8");
    try {
      return TopicConfirmationReceiptSchema.parse(JSON.parse(raw));
    } catch (parseErr) {
      throw new RepositoryError(
        `RECEIPT_CORRUPTED: Topic confirmation receipt for topic "${topicId}" is corrupted or invalid.`,
        "RECEIPT_CORRUPTED",
        { cause: parseErr },
      );
    }
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "ENOENT") {
      return null;
    }
    if (err instanceof RepositoryError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new RepositoryError(
      `RECEIPT_UNREADABLE: Failed to read topic confirmation receipt for topic "${topicId}": ${message}`,
      "RECEIPT_UNREADABLE",
      { cause: err },
    );
  }
}

export async function saveTopicConfirmationReceipt(
  repo: RepositoryService,
  channelId: string,
  receipt: TopicConfirmationReceipt,
): Promise<void> {
  const channel = await repo.getChannel(channelId);
  const validated = TopicConfirmationReceiptSchema.parse(receipt);
  const receiptsDir = repo.resolvePath("channels", channel.slug, "receipts");
  await mkdir(receiptsDir, { recursive: true });
  const filePath = resolveReceiptPath(repo, channel.slug, validated.topic_id);
  await repo.writeJsonAtomic(filePath, validated);
}

export function assertConfirmationReplayOrConflict(
  existingReceipt: TopicConfirmationReceipt,
  incomingOptions: TopicConfirmationOptions,
  expectedContentKind?: "episode" | "short_reel",
): { isReplay: true; receipt: TopicConfirmationReceipt } {
  if (expectedContentKind && existingReceipt.content_kind !== expectedContentKind) {
    throw new RepositoryError(
      `CONFIRMATION_KIND_CONFLICT: Topic "${existingReceipt.topic_id}" was already confirmed as ${existingReceipt.content_kind}, cannot confirm as ${expectedContentKind}.`,
      "CONFIRMATION_KIND_CONFLICT",
    );
  }
  const incomingFingerprint = computeConfirmationOptionsFingerprint(incomingOptions);
  if (existingReceipt.options_fingerprint === incomingFingerprint) {
    return { isReplay: true, receipt: existingReceipt };
  }

  throw new RepositoryError(
    `CONFIRMATION_OPTIONS_CONFLICT: Topic "${existingReceipt.topic_id}" was already confirmed with different options. Replay with identical options or re-suggest topics for alternative configurations.`,
    "CONFIRMATION_OPTIONS_CONFLICT",
  );
}
