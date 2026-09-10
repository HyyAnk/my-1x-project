import { createHash } from "node:crypto";
import {
  canonicalJsonStringify,
  calculateScriptTotalDuration,
  validateReelScript,
  type ReelKey,
  type ShortReelRecord,
} from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { createZipArchive, type ZipEntry } from "../quiz/zipHelper.js";
import { requireCompleteShortReelSource } from "../repository/shortReelSourcePolicy.js";
import { compileFlowPrompts } from "./flowPromptCompiler.js";
import { readVerifiedAsset, reelAssetRoot } from "./packageAssets.js";
import { extractShortReelDisplayProjection, resolveShortReelTargetLanguage } from "../quiz/bank/localization/productLocalization.js";
import { buildPublishingExport } from "./publishingExport.js";

export type ExportErrorCode =
  "REVISION_CONFLICT" | "INCOMPLETE_PACKAGE" | "STALE_EXPORT" | "INVALID_SCRIPT" | "UNSAFE_PATH" | "DUPLICATE_ENTRY" | "INVALID_ASSET";

export class ExportError extends Error {
  constructor(
    public readonly code: ExportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExportError";
  }
}

/**
 * Maps decoded image MIME types to canonical file extensions.
 */
export function mimeToExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
}

/**
 * Validates that an archive entry name contains no traversal sequences,
 * leading slashes, drive letters, or invalid characters. Also verifies
 * no duplicate entry names are added when a tracker set is provided.
 */
export function assertSafeArchiveEntryName(entryName: string, seenEntries?: Set<string>): void {
  if (!entryName || typeof entryName !== "string") {
    throw new ExportError("UNSAFE_PATH", "Archive entry name cannot be empty.");
  }
  if (entryName.includes("\0")) {
    throw new ExportError("UNSAFE_PATH", "Archive entry name contains null bytes.");
  }
  const normalized = entryName.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new ExportError("UNSAFE_PATH", `Archive entry name "${entryName}" must be a relative path.`);
  }
  const segments = normalized.split("/");
  for (const seg of segments) {
    if (seg === "..") {
      throw new ExportError("UNSAFE_PATH", `Archive entry name "${entryName}" contains directory traversal ("..").`);
    }
  }
  if (seenEntries) {
    if (seenEntries.has(normalized)) {
      throw new ExportError("DUPLICATE_ENTRY", `Duplicate archive entry name "${entryName}".`);
    }
    seenEntries.add(normalized);
  }
}

function buildScriptMarkdown(record: ShortReelRecord): string {
  const script = record.script!;
  const lines: string[] = [
    `# Short-Reel Script: ${record.topic.title}`,
    "",
    `**Channel:** ${record.channel_id} | **Reel ID:** ${record.reel_id} | **Revision:** ${record.revision}`,
    `**Total Duration:** ${calculateScriptTotalDuration(script)}s`,
    `**Question:** ${record.source.question_text}`,
    `**Answer:** ${record.source.selected_answer_text}`,
    "",
    "---",
    "",
  ];

  for (const seg of script.segments) {
    lines.push(`## Segment ${seg.index} (${seg.mode.toUpperCase()}) - ${seg.duration_seconds}s`);
    lines.push(`**Narrative:** ${seg.narrative}`);
    lines.push(`**Audio Direction:** ${seg.audio_direction}`);
    lines.push("**In-Video Text Cues:**");
    if (seg.text_cues.length === 0) {
      lines.push("- *None*");
    } else {
      for (const cue of seg.text_cues) {
        lines.push(`- [${cue.role.toUpperCase()}] "${cue.text}" (${cue.start_seconds}s - ${cue.end_seconds}s)`);
      }
    }
    lines.push("");
    lines.push(
      `**Start Continuity:** Character=${seg.start_state.character_identity}, Pos=${seg.start_state.position}, Cam=${seg.start_state.camera}, Env=${seg.start_state.environment}`,
    );
    lines.push(
      `**End Continuity:** Character=${seg.end_state.character_identity}, Pos=${seg.end_state.position}, Cam=${seg.end_state.camera}, Env=${seg.end_state.environment}`,
    );
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Builds and validates a PKZIP package from a consistent Short-Reel snapshot.
 * Guarantees zero path traversal, no mixed revisions, and strict content hash manifest.
 */
export async function exportShortReelPackage(repository: RepositoryService, key: ReelKey, expectedRevision?: number): Promise<Buffer> {
  const record = await repository.getShortReel(key);

  if (!Number.isSafeInteger(expectedRevision) || record.revision !== expectedRevision) {
    throw new ExportError("REVISION_CONFLICT", `Expected revision ${expectedRevision} but current revision is ${record.revision}.`);
  }

  requireCompleteShortReelSource(record.source);

  if (!record.script) {
    throw new ExportError("INCOMPLETE_PACKAGE", "Cannot export Short-Reel without a generated script.");
  }

  if (record.stale_segments && record.stale_segments.length > 0) {
    throw new ExportError("STALE_EXPORT", `Cannot export Short-Reel with stale segments [${record.stale_segments.join(", ")}].`);
  }

  const { localization } = await resolveShortReelTargetLanguage(repository, key.channel_id, record);
  const displayProjection = extractShortReelDisplayProjection(record.source, localization);
  const scriptValidation = validateReelScript(record.script, record.source, record.stale_segments, displayProjection);
  if (!scriptValidation.valid) {
    throw new ExportError("INVALID_SCRIPT", `Script validation failed: ${scriptValidation.errors.join("; ")}`);
  }

  // Verify all 4 units are ready, explicitly surfacing stale states
  const requiredUnits = ["references", "script", "cover", "publishing"] as const;
  for (const unitKey of requiredUnits) {
    const unit = record.units[unitKey];
    if (unit.state === "stale") {
      throw new ExportError(
        "STALE_EXPORT",
        `Cannot export Short-Reel because deliverable unit "${unitKey}" is stale and requires regeneration.`,
      );
    }
    if (unit.state !== "ready" || !unit.last_accepted_payload) {
      throw new ExportError("INCOMPLETE_PACKAGE", `Deliverable unit "${unitKey}" is not ready (state: "${unit.state}").`);
    }
  }

  const channel = await repository.getChannel(key.channel_id);
  if (channel.mascot_id && record.visual_context?.mascot_id && channel.mascot_id !== record.visual_context.mascot_id) {
    throw new ExportError("STALE_EXPORT", "Channel mascot selection has changed. Package requires regeneration.");
  }

  const refsPayload = record.units.references.last_accepted_payload!;
  const mascotRef = refsPayload.references.find((r) => r.role === "mascot");
  if (
    refsPayload.references.length !== 2 ||
    refsPayload.references.filter((r) => r.role === "mascot").length !== 1 ||
    refsPayload.references.filter((r) => r.role === "style").length !== 1
  )
    throw new ExportError("INVALID_ASSET", "Exactly one mascot and one style reference are required.");
  const styleRef = refsPayload.references.find((r) => r.role === "style");
  if (!mascotRef || !styleRef) {
    throw new ExportError("INCOMPLETE_PACKAGE", "Missing required mascot or style reference payload.");
  }

  const coverPayload = record.units.cover.last_accepted_payload!;

  const root = await reelAssetRoot(repository, key);
  let mascotBytes: Buffer, styleBytes: Buffer, coverBytes: Buffer;
  try {
    [mascotBytes, styleBytes, coverBytes] = await Promise.all([
      readVerifiedAsset(repository, root, mascotRef, "mascot"),
      readVerifiedAsset(repository, root, styleRef, "style"),
      readVerifiedAsset(repository, root, coverPayload, "cover"),
    ]);
  } catch {
    throw new ExportError("INVALID_ASSET", "Package assets are missing, unsafe or do not match accepted image metadata.");
  }

  // Recompile Flow prompts fresh from validated script
  const [prompt1, prompt2, prompt3] = compileFlowPrompts(
    record.script,
    {
      mascotName: `references/mascot.${mimeToExtension(mascotRef.mime_type)}`,
      styleName: `references/style.${mimeToExtension(styleRef.mime_type)}`,
    },
    record.model_note,
  );

  const scriptJson = canonicalJsonStringify(record.script);
  const scriptMd = buildScriptMarkdown(record);
  const pubPayload = record.units.publishing.last_accepted_payload!;
  const publishingTxt = buildPublishingExport(pubPayload);
  const publishingJson = canonicalJsonStringify({
    title: pubPayload.title,
    description: pubPayload.description,
  });

  const mascotExt = mimeToExtension(mascotRef.mime_type);
  const styleExt = mimeToExtension(styleRef.mime_type);
  const coverExt = mimeToExtension(coverPayload.mime_type);

  const entriesMap: Record<string, Uint8Array> = {
    "script.json": Buffer.from(scriptJson, "utf8"),
    "script.md": Buffer.from(scriptMd, "utf8"),
    "prompts/01-generate.txt": Buffer.from(prompt1, "utf8"),
    "prompts/02-extend.txt": Buffer.from(prompt2, "utf8"),
    "prompts/03-extend.txt": Buffer.from(prompt3, "utf8"),
    [`references/mascot.${mascotExt}`]: mascotBytes,
    [`references/style.${styleExt}`]: styleBytes,
    [`cover.${coverExt}`]: coverBytes,
    "publishing.txt": Buffer.from(publishingTxt, "utf8"),
    "publishing.json": Buffer.from(publishingJson, "utf8"),
    ...(localization ? { "localization.json": Buffer.from(canonicalJsonStringify(localization), "utf8") } : {}),
  };

  const seenEntries = new Set<string>();
  const contentHashes: Record<string, string> = {};

  for (const [entryName, bytes] of Object.entries(entriesMap)) {
    assertSafeArchiveEntryName(entryName, seenEntries);
    contentHashes[entryName] = createHash("sha256").update(bytes).digest("hex");
  }

  const manifest = {
    schema_version: 1,
    reel_id: record.reel_id,
    channel_id: record.channel_id,
    topic_id: record.topic_id,
    revision: record.revision,
    source_id: record.source.question_id,
    source_hash: record.source.content_hash,
    dimensions: { width: 1080, height: 1920 },
    references: [mascotRef, styleRef].map((ref) => ({
      role: ref.role,
      asset_id: ref.asset_id,
      checksum: ref.checksum,
      width: ref.width,
      height: ref.height,
      mime_type: ref.mime_type,
    })),
    cover: {
      asset_id: coverPayload.asset_id,
      checksum: coverPayload.checksum,
      width: coverPayload.width,
      height: coverPayload.height,
      mime_type: coverPayload.mime_type,
    },
    provenance: {
      mascot_name: record.visual_context?.mascot_name ?? null,
      art_direction: record.visual_context?.art_direction ?? null,
      model_note: record.model_note ?? null,
    },
    requested_durations: record.script.segments.map((s) => s.duration_seconds),
    total_duration: calculateScriptTotalDuration(record.script),
    content_hashes: contentHashes,
    created_at: record.created_at,
    exported_at: new Date().toISOString(),
  };

  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  assertSafeArchiveEntryName("manifest.json", seenEntries);

  const zipEntries: ZipEntry[] = [
    { filename: "manifest.json", data: manifestBytes },
    ...Object.entries(entriesMap).map(([filename, data]) => ({ filename, data })),
  ];

  // Race check: confirm no concurrent mutation occurred while reading and bundling
  const freshRecord = await repository.getShortReel(key);
  if (freshRecord.revision !== record.revision) {
    throw new ExportError("REVISION_CONFLICT", "Short-Reel revision changed during package assembly.");
  }

  return createZipArchive(zipEntries);
}
