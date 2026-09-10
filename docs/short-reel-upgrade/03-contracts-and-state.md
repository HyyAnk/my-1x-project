# Normative Contracts and State Rules

These are proposed interfaces to implement, not existing exports. If current repository architecture requires a different adapter location, record a behavior-preserving mapping in `execution/DECISIONS.md`; do not change product behavior or compatibility silently.

## Record and publishing versions

Create `packages/shared/src/shortReel/shortReelPublishing.schema.ts` and a separate `shortReel.legacy.ts` preserving the pre-upgrade v1 record/payload schema. New canonical records use `schema_version: 2`. The canonical `ShortReelRecordSchema` validates v2 only. Export `parseCompatibleShortReelRecord(input: unknown): ShortReelRecord` for storage reads, implemented in `shortReel.compat.ts`.

```ts
export const ReelPublishingPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(8000),
  })
  .strict();

export const GeneratedReelPublishingSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(600),
  })
  .strict();
```

The larger persistence/edit bounds intentionally preserve legacy user content. Generation uses the stricter schema. Do not truncate migrated content to generation limits. UI counters distinguish generation guidance from actual validation limits.

Legacy mapping: title = old hook; description = old description followed by nonempty CTA if not already present and hashtags not already present, separated by blank lines. Preserve order and text; deduplicate hashtag tokens case-insensitively, not substrings. Old hook may be long: retain it and offer an explicit regenerate action. Do not silently translate or rewrite it. Round-trip through the adapter must be idempotent. Old properties are preserved in the original disk backup, not exposed as extra canonical UI fields.

Read adapter never writes. First mutation of a v1 file makes an exclusive, byte-exact sibling `reel.v1.backup.json` under the existing writer queue, verifies it, and atomically writes v2. An existing mismatched backup is a recoverable conflict, not permission to overwrite. Interrupted upgrades must leave a readable old or new record. Downgrading the application requires restoring the matching backup while the writer is stopped, with explicit user authorization; never automatically discard v2 edits.

New optional-compatible attempt metadata: `error_message?: string`, `retryable?: boolean`. Keep `error` as the stable code so old callers still understand it. Introduce a focused package error type; do not restrict all errors to `ScriptGenerationErrorCode`.

Add `accepted_dependency_fingerprint: z.string().nullable().default(null)` to each canonical unit state. This is the fingerprint of the currently accepted payload, independent of `current_attempt`; starting or failing a new attempt must not overwrite it. On accepted generation or validated manual edit, set it to the current canonical input fingerprint for that unit. On migration set it to null until compatibility validation establishes provenance. Readiness is `state === "ready"` AND accepted fingerprint equals current canonical input fingerprint, plus asset/source validation. A ready state string alone is insufficient.

Keep a separate operation fingerprint for segment regeneration that includes the starting script/replacement target; store the normal post-accept canonical script input fingerprint in the unit's accepted field. This avoids making a script depend on its own output while still rejecting concurrent segment edits. Old accepted images without verified input fingerprints remain visible as stale; never fabricate provenance to avoid a retry.

## Visual input snapshot

Keep the four deliverable units (`script`, `references`, `cover`, `publishing`) to avoid inventing a second lifecycle. `references` is accepted only after both mascot and generated style are available. Existing mascot preview is available independently via the channel mascot API while references generation is pending.

Add `visual_context` to v2 (nullable for migrated records). Define its schema in `shortReelVisual.schema.ts`:

```ts
interface ReelVisualContext {
  mascot_id: string;
  mascot_name: string;
  mascot_asset_path: string; // immutable safe reel-relative storage path
  mascot_checksum: string;
  art_direction: string;
  style_preset_id: string | null;
  fingerprint: string;
}
```

`fingerprint` hashes identity, master bytes checksum, and art direction; paths/mtime alone are insufficient. Use the current selected art-direction configuration when available; otherwise explicitly default to `Pixar-style cinematic 3D animation`. This is a per-reel snapshot, not a copy of the entire mascot profile.

At generation start, resolve the current channel mascot safely and adopt the snapshot through the record transaction. Changed identity/art direction invalidates dependent outputs. Before accepting generated image bytes and before export, recheck the actual selected mascot/bytes against the snapshot. If changed, reject as `STALE_DEPENDENCY`; preserve old accepted output. A read-only GET may return additive `input_status: "current" | "changed" | "missing" | "unverified"`; it must not mutate the record or mislabel old output as current. UI disables ready export for non-current input status and offers refresh/regeneration.

Generation never creates or assigns a mascot on the user's behalf. Missing master means an actionable error that points to Mascot Design/channel selection.

## Image-byte boundary

Create `apps/server/src/providers/imageGeneration/imageGeneration.types.ts`:

```ts
export interface ImageReferenceInput {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
}
export interface PortraitImageRequest {
  prompt: string;
  aspectRatio: "9:16";
  reference: ImageReferenceInput;
  operationId: string;
  dependencyFingerprint: string;
  signal: AbortSignal;
}
export interface GeneratedImageBytes {
  bytes: Uint8Array;
  provider: string;
  model: string;
  requestId?: string;
  costVnd?: number;
}
export interface PortraitImageClient {
  readonly supportsReferenceImage: boolean;
  generate(request: PortraitImageRequest): Promise<GeneratedImageBytes>;
}
```

No `episodeId`, repository, output path, or file writes belong in this interface. The factory uses existing configured credentials/model; adapters wrap the actual provider transport. Do not import Mascot art-isolation rules into a full-scene generator. Implement and test the currently configured Gpti2 reference path first. Other providers must either have verified reference-conditioning support or fail preflight with `REFERENCE_INPUT_UNSUPPORTED`; never silently run text-only or switch providers.

Gpti2 uses existing `resolveImageDimensions("9:16", model)` and `generateGpti2ImageBytes`, including `referenceImageBase64`, cancellation and idempotency. No hardcoded model migration. The current size map selects 720x1280 for the configured model; resolve at runtime.

Validate decoded dimensions and require `width < height` and `abs(width / height - 9 / 16) <= 0.01`. Otherwise reject `INVALID_DIMENSIONS`. Normalize accepted portrait to 1080x1920 with Sharp, never stretch. Retain the 20 MiB and decoded-pixel limits and single-frame checks. All writes go through `storePackageAsset` and are followed by `readVerifiedAsset` at export.

Idempotency seed includes unit, operation ID, dependency fingerprint, model, ratio and prompt hash. Retry of the same transport operation uses the same key; an explicit new regenerate uses a new operation ID. Do not add outer blind retries around a client that already retries/polls. Default image operation deadline: 300000 ms, maximum allowed override: 600000 ms. Default LLM operation deadline: 90000 ms. Preserve shorter explicit deadlines in tests. Deadline covers polling, download and normalization; cancellation prevents acceptance even if remote cancellation is unsupported.

## Service interfaces

Types below use existing `RepositoryService`, `ReelKey`, `ShortReelRecord`, `ReelReferencesPayload`, `ReelCoverPayload`, `ReelPublishingPayload`, and `LLMClient` imports.

```ts
interface ReelGenerationDependencies {
  imageClient: PortraitImageClient;
  llmClient: LLMClient;
  signal: AbortSignal;
  onProgress: (progress: ReelGenerationProgress) => Promise<void>;
}
interface ReelGenerationProgress {
  stage: "preflight" | "script" | "style" | "cover" | "publishing" | "finalize";
  state: "pending" | "running" | "completed" | "failed" | "cancelled" | "skipped";
  message: string;
  recordRevision?: number;
}
type ReelGenerationMode = "repair" | "regenerate";
```

Define these in `apps/server/src/shortReel/generation.types.ts`; share only the serialized progress schema with the web through the shared package. Keep byte/client types server-only.

New focused services:

- `resolveMascotReference(repository, key, signal): Promise<ReelVisualContext>` in `mascotReferenceService.ts` resolves/copies immutable master bytes and metadata; adoption into the record is owned by the workflow, not the image provider.
- `buildReelStylePrompt(record): string` in `stylePrompt.ts` requires a current script and visual context.
- `generateReelStyleReferences(repository, key, snapshot, client, operationId, signal): Promise<ReelReferencesPayload>` in `styleImageService.ts` returns exactly one mascot and one style reference, without accepting the unit itself.
- `buildReelCoverPrompt(record): string` in `coverPrompt.ts` uses script/topic plus the accepted style; wrap existing cover entry points for compatibility.
- `generateReelCoverPayload(repository, key, snapshot, client, operationId, signal): Promise<ReelCoverPayload>` in `coverImageService.ts` writes only reel assets.
- `buildPublishingPrompt(record): string` remains a public compatibility export, implemented in `publishingPrompt.ts`; `parsePublishingJson(text)` returns the new generation shape or null.
- `executeReelGeneration(repository, key, request, dependencies): Promise<ShortReelRecord>` in `generationWorkflow.ts` owns ordering and calls existing unit-attempt lifecycle functions. `request` uses shared `GenerateShortReelRequest` with the additive optional `mode`.

Existing public entry points may remain thin wrappers while consumers migrate in this change. Do not create permanent parallel workflows. Remove unused internal compatibility wrappers after all repository consumers/tests move; keep the actual v1 disk/request adapter until a separately approved removal.

## Requests and progress

Extend `GenerateShortReelRequestSchema` and persisted task request schema with optional `mode: "repair" | "regenerate"`. No supplied mode: `package` means repair, individual targets mean regenerate (preserving current button semantics). Include normalized mode in idempotency conflict comparison. Reuse request IDs only when retrying the exact same HTTP submission.

Keep target `references` meaning regenerate the reel style plus refresh the existing mascot reference. Missing/stale script is a prerequisite error for individual image/publishing targets; package handles prerequisites. Regenerate All is `target: "package", mode: "regenerate"`.

Persist additive `short_reel_progress` on Task with a list keyed by stage and latest accepted `record_revision`. Continue to emit existing `task.updated` events through task manager update. Never mutate task maps directly or create a second event bus.

Define the serialized structure in `shortReelProgress.schema.ts` as `{ stages: Array<{ stage, state, message }>, record_revision: number | null }`; stage/state use the exact enums in `ReelGenerationProgress`, messages are bounded to 500 characters, stages are unique by key, and revision is a positive integer or null. Add optional `input_status` to the strict GET response schema and list-item projection where needed, with the four values defined above. Do not send new response properties that shared strict parsers reject.

## Dependency matrix

| Change                               | Script                          | References/style | Cover     | Publishing | Compiled prompts                     |
| ------------------------------------ | ------------------------------- | ---------------- | --------- | ---------- | ------------------------------------ |
| Source/topic factual context         | stale                           | stale            | stale     | stale      | recompute after current script       |
| Mascot identity/master/art direction | stale                           | stale            | stale     | unchanged  | clear/recompute after current inputs |
| Full script or segment content       | accept/segment continuity rules | stale            | stale     | stale      | recompute                            |
| Style/reference replacement          | unchanged                       | accept           | stale     | unchanged  | recompute only                       |
| Cover replacement                    | unchanged                       | unchanged        | accept    | unchanged  | unchanged                            |
| Publishing edit                      | unchanged                       | unchanged        | unchanged | accept     | unchanged                            |
| Model note for video prompts         | unchanged                       | unchanged        | unchanged | unchanged  | recompute only                       |

Self-output changes must not poison input fingerprints. Script generation fingerprints contain source/topic/visual context and the starting script only for segment-replacement operations. References contain accepted script hash + visual-context hash + style-prompt version. Cover contains script hash + accepted reference checksums + cover-prompt version. Publishing contains script hash + topic/source + publishing-prompt version. Do not include global record revision, timestamps, or sibling publishing/cover updates.

Successful identical replay is a no-op. Different result from an already completed operation is rejected. Edits retire conflicting attempts in the same transaction. A pending/failed regenerated script makes downstream jobs ineligible even when an old payload remains visible.

## Error contract

Use safe stable codes: `MISSING_MASCOT`, `INVALID_REFERENCE_PATH`, `CORRUPT_IMAGE`, `REFERENCE_INPUT_UNSUPPORTED`, `IMAGE_PROVIDER_NOT_CONFIGURED`, `PROVIDER_ERROR`, `INVALID_DIMENSIONS`, `TIMEOUT`, `ABORTED`, `STALE_DEPENDENCY`, `VALIDATION_FAILED`, `STATE_WRITE_FAILED`. Preserve existing safe reference codes where already used. Map them centrally to English messages and retryability. Log sanitized underlying causes with task/channel/reel/unit/operation context. Do not leak API response bodies, credentials, filesystem secrets, or silently collapse all errors to provider failure.
