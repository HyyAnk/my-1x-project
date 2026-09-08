# Contract Ledger

## Phase 05 Review Repair: Assets, Providers and Export

- `ReferenceResolveOptions.mascotAssetPath` / `styleAssetPath` accept only canonical `/api/mascots/<selected-id>/assets/<filename>` handles for the chosen mascot. They are not filesystem paths or arbitrary URLs. An explicit missing style ID fails instead of selecting another style. Known sprite-atlas assets are rejected even when explicitly selected.
- `packageImage.ts` validates allowed raster formats, byte/pixel limits, single-frame metadata and full pixel decoding. Metadata alone is not image validation. This cannot semantically recognize every unknown sprite sheet; users must select a real single-frame reference.
- `packageAssets.ts` bounds reads, enforces real-path containment, rejects linked destinations, and writes unique new asset files with exclusive creation and fsync under writer admission. Accepted bytes are never overwritten by another attempt. Asset IDs include content hashes and selected mascot/style identity. Unaccepted complete files are unreferenced, never presented as ready; no automatic asset pruning is authorized here.
- `generateReelCoverImage` requires an injected image provider. Missing providers and degraded placeholder output fail explicitly; the previous automatic SVG substitute is removed. Provider output is decoded and cropped to 1080x1920 without stretching. The prompt includes source/topic and selected reference handles/checksums. The adapter does not guarantee that a provider honors reference conditioning; live visual fidelity remains unverified. Phase 06 must inject an Episode-independent provider, never construct a dummy Episode.
- Cover options accept `signal` and `timeoutMs`; the boundary propagates cancellation and limits provider waiting to at most 60 seconds. Publishing uses the existing bounded text-provider boundary. Configured-provider failure/invalid output/cancellation never silently becomes successful fallback copy. Without an LLM, deterministic source-grounded publishing copy remains supported; it is not described as a successful LLM call.
- `runPackageAttempt` uses the record returned by begin, coalesces concurrent identical operation calls on the canonical storage root and replays completed operations without invoking a provider again. Persisted interrupted/failed operation IDs require a new retry ID. Errors are safe and failure-state persistence failure is explicitly reported as `STATE_WRITE_FAILED`, not swallowed. Phase 06 still owns HTTP request-id/body validation and restart task reconciliation.
- Full-package orchestration preserves already-ready units, uses collision-resistant operation IDs, and awaits independent cover/publishing outcomes so one failure cannot erase another success. Explicit reference options trigger reference resolution; a current script is required before subsequent component work.
- Export requires an explicit safe-integer revision, strict script/currentness checks, exactly one reference of each role, and real asset byte/checksum/MIME/decoded-dimension validation within the reel directory. Mismatch fails with `INVALID_ASSET`. The final revision check rejects edits during assembly. Prompts are compiled using the actual bundled reference filenames; manifest hashes are computed from the exact exported bytes.
- Dependencies remain those in Phase 04: publishing uses source and topic story premise, not mutable structured-script text; cover uses title/premise/source/references, not an untracked hook field. No new dependency hash contract is silently introduced.

See [Phase 05 review/repair](verification/evidence/phase-05-review.md). No Phase 06 UI/routes or live Flow/provider actions are included.

## Phase 04 Review Repair: Persisted Script Lifecycle

This additive repair restores the existing Phase 04 requirements; it does not authorize Phase 05/06 product work or live Flow actions.

- `ShortReelRecord.stale_segments?: SegmentIndex[]` records downstream currentness. Absence on older records means no recorded segment invalidation; no automatic migration occurs. Segment 1 edits retain segments 2/3 but mark them stale; segment 2 edits mark 3 stale. Explicitly resaving a segment clears only its own stale marker and invalidates downstream segments. A complete validated script save clears all markers.
- `validateReelScript(script, source, staleSegments = [])` always validates structure, exact canonical cues and reveal placement. Only the draft-edit path passes stale indices to defer continuity checks at those incoming boundaries. Generation and export must use strict validation with no stale exemptions. Canonical question cues belong in segment 1 and answer cues in segment 3, as required by the existing unmodified reveal decision.
- `shortReelEdits.ts` owns edit application and operation retirement. User edits retire affected attempts, including pending targets, without erasing unrelated accepted payloads. Source replacement retires every creative attempt. Model-note edits invalidate the derived prompt projection only.
- `shortReelTransaction.ts` performs internal lifecycle mutations under the exact canonical-root/record queue used by ordinary edits. It validates the record, advances revision once per actual change, and uses the existing strict atomic writer. It is not an HTTP arbitrary-patch interface.
- `revisionPolicy.ts` remains the public application entry point. Pure hashes/invalidation live in `dependencyPolicy.ts`; persistence orchestration lives in `unitLifecycle.ts`.
- Call `beginReelUnitAttempt(repository, key, unitKey, operationId)` before provider dispatch. Use the returned stored dependency fingerprint with `acceptReelUnitResult`. An unregistered, retired, superseded, failed or cancelled attempt cannot write. Same-operation successful replay is a no-write acknowledgement; changed payload is rejected. Retry uses a new operation ID. Sibling acceptances share the repository lock and merge rather than competing in a bounded CAS retry loop.
- `cancelReelUnitAttempt` and `failReelUnitAttempt` change only the matching pending attempt, retain accepted payloads and share the same lock as completion. Failure records contain a stable generation code, never provider messages. Cancellation after success is a no-op.
- Accepted generated script payloads persist three deterministic `compiled_prompts` derived from the accepted structured script and current model note. Ordinary script edits clear this projection. Phase 05 must strictly validate current script, reject nonempty stale markers and stale/pending/failed mandatory units, and recompile from its consistent export snapshot rather than trusting a nullable or old cached projection.
- `generateReelScript` validates complete source provenance, snapshots its context, shares one correction budget across parse/schema errors, and bounds the whole operation to at most 60 seconds. The provider boundary races cancellation/deadline against uncooperative adapters, propagates its AbortSignal, and returns safe typed errors. Source delimiter encoding is reversible, including quotes and literal escape sequences. It never substitutes source characters with placeholder tokens.
- The shared single-prompt adapter checks cancellation around connection/thread creation and interrupts late-arriving turn IDs. The existing Question Bank batch consumer treats intentional cancellation as cancellation, not generation failure.

Evidence: [Phase 04 review and repair](verification/evidence/phase-04-review.md). New contract consumers are covered by real repository tests, shared tests, typechecks and the web regression suite.

## Stage A Repair 03: Complete Writes and Draining Admission

This section supersedes Repair 02's incomplete-write and five-second drain behavior; historical sections below remain evidence of prior contracts.

- `ShortReelSourceSnapshotSchema` remains the read/recovery union. No legacy record is migrated or rewritten automatically.
- `CompleteShortReelSourceSnapshotSchema` is exported from the shared barrel and is required by the initial-record constructor and `replace_source_question` edit schema. Repository creation validates a complete source only when creating a new record; an existing same-topic record remains discoverable and is returned without recreating it.
- The repository maps missing provenance to `INCOMPLETE_SOURCE` and invalid complete projections to `INVALID_SOURCE`. Script, segment, references, cover and publishing writes require complete current source. Model-note edits and explicit replacement with a valid complete source are allowed for recovery. Rejected writes do not alter prior bytes/revision. Reading a legacy payload does not prove it ready for generation/export; future services must enforce this boundary too.
- `shortReelSourcePolicy.ts` owns repository source-write policy, separate from storage and transport.
- `shortReelWriterAdmission.ts` owns the canonical-root SQLite lease and per-owner pending counts. `shortReelMutationQueue.ts` owns canonical-root/reel ordering. The atomic file writer retains existing exported admission/queue names through re-exports and keeps strict no-copy replacement behavior.
- `runInCanonicalShortReelQueue(root, key, task, ownerId?)` reserves the owner's pending operation synchronously before queueing, and releases that reservation exactly once on success/failure. It rejects unadmitted or closing-owner work with `STORAGE_BUSY`. A pending reservation protects both running and queued work.
- Releasing an owner marks it closing and waits for that owner's pending operations. Other admitted owners remain usable and retain the lock. Releasing the last owner changes the root to draining and rejects new owners/work until all accepted work settles; only then does SQLite close. There is no time-based force unlock. Root-wide release without owner ID drains all existing owners rather than bypassing their work.
- Closing the SQLite handle unsuccessfully leaves admission fail-closed and reports `STORAGE_BUSY`. Abrupt process termination still releases OS-held handles. A permanently stalled operation keeps shutdown pending; cancellation/recovery must stop the work or terminate the owning process, not unlock underneath it.
- `RepositoryService` blocks Short-Reel submissions while switching root or closed. Root switching awaits the current owner's queued writes before mutating `roots`; closing a non-owner cannot release another owner's lease. `RepositoryRuntime.serviceId` is explicit and `releaseWriterAdmission()` returns `Promise<void>`.

Verification and self-review: [Repair 03 evidence](verification/evidence/phase-02-repair-03.md). Independent Stage A acceptance remains required.

Version: 1.0 proposed implementation baseline. Phase 02 freezes implemented names and module paths here with a decision entry. Later agents must consume that frozen version. Any change requires producer/consumer tests and coordinated ownership, not local casts.

## Naming And Source

Persisted fields use snake_case to match existing schemas. TypeScript function names use camelCase. Reuse `BankQuestionSchema` and `BankQuestion`; do not copy the bank schema. New public types are inferred from Zod and exported from `@studio/shared`.

The existing bank record has `id`, `archetype_id`, `question`, `choices`, `correct_choice_id`, `explanation`, `status`, optional `language` and `translations`. Deep Trivia requires three choices, Versus Face-off two. Validate unique choice IDs and that the correct choice resolves exactly once; do not weaken bank-wide contracts to make a fixture pass.

## Content Discrimination

`TopicCandidateSchema` becomes a discriminated union on `content_kind`:

- `episode`: landscape quiz layout and existing question-count rules.
- `short_reel`: `question_count: 1`, `aspect_ratio: "9:16"`, supported archetype, no quiz layout, no Episode render options.
- Both retain topic/channel IDs, title/premise/hook and provenance `origin: "keyword" | "discovery"`. The server assigns provenance from a slot plan; do not trust an LLM's label alone.

Fixed mixed slot plan: 1 Episode keyword (or discovery without hint), 2-3 Episode discovery, 4 Short-Reel keyword (or discovery without hint), 5 Short-Reel discovery. One keyword candidate per pillar does not mean blindly counting exact-string appearances; test slot assignment and review semantic integration.

Confirm response is a union: `{ content_kind: "episode", episode, task }` using existing Episode/task values, or `{ content_kind: "short_reel", short_reel }`. No return-value shape is selected by title text or aspect alone. Existing portrait records are not converted into reels.

## Structured Script

```ts
type ReelArchetype = "versus_faceoff" | "deep_trivia";
type SegmentIndex = 1 | 2 | 3;
type TextCue = {
  role: "question" | "answer" | "supporting";
  text: string;
  start_seconds: number;
  end_seconds: number;
};
type ContinuityState = {
  character_identity: string;
  position: string;
  action: string;
  camera: string;
  environment: string;
  props: string[];
  visible_text: string[];
  revealed_facts: string[];
};
type ReelSegment = {
  index: SegmentIndex;
  mode: "generate" | "extend";
  duration_seconds: number;
  narrative: string;
  text_cues: TextCue[];
  audio_direction: string;
  start_state: ContinuityState;
  end_state: ContinuityState;
};
type ReelScript = { segments: [ReelSegment, ReelSegment, ReelSegment] };
```

All objects reject unknown mutation fields. Segment index/mode must equal 1/generate, 2/extend, 3/extend. Durations are finite numbers in [8,10]. Each cue satisfies `0 <= start < end <= segment duration`. Script total is derived and in [24,30]. Cumulative times are derived, not persisted editable data.

Question cue equals the selected English question text; answer cue equals the text of `correct_choice_id` in the same English choice set. At least one question cue appears before the first answer cue. Default compiler places the answer in segment 3; a deliberate different reveal requires a reviewed decision. Multiple cues may overlap deliberately; reject mutually conflicting question/answer presentation before the chosen reveal.

Start state of segment N+1 must equal the preceding end state for identity/environment/props/visible text and explicitly continue position/action/camera. Exact boundary state can be copied by the generator and validated structurally. Narrative meaning still needs review; do not advertise semantic proof from string equality.

## Record And Deliverables

- `ShortReelRecord`: `schema_version: 1`, `reel_id`, `channel_id`, `topic_id`, topic snapshot, `aspect_ratio: "9:16"`, immutable source snapshot, `revision`, `model_note`, `created_at`, `updated_at`, optional validated script and per-unit outputs.
- Source snapshot: original validated bank record plus selected English text/choices/explanation, source language/translation provenance, original `updated_at` if present and a stable content hash. Derive selected answer from the choice ID. Do not call draft selection a rendered Episode.
- A newly selected draft has no script, not three empty pretend-valid segments. `ReelScriptSchema` only applies when a script exists.
- Four output groups are references, script/prompts, cover, publishing. Internal script segment statuses allow downstream invalidation without adding deliverable groups.
- Unit state: `missing | pending | ready | stale | failed | cancelled`; include last accepted payload separately from current attempt so a failure does not erase usable prior work.
- Attempt metadata: operation ID, dependency fingerprint, timestamps and structured error. Ready requires a payload matching current dependencies; export rejects stale or pending mandatory units.
- References: immutable asset IDs/validated internal paths, checksum, MIME, dimensions and role (`mascot` or `style`). External URLs are not arbitrary filesystem paths.
- Publishing: hook, description, optional CTA, hashtags as a string array. Do not label generated guesses as current trends.

## Domain And Repository Interfaces

These signatures define semantic contracts; Phase 02 may adapt plumbing to the current repository facade with an explicit mapping in this ledger.

```ts
interface ReelKey {
  channel_id: string;
  reel_id: string;
}
interface MutationContext {
  expected_revision: number;
  request_id: string;
}
type GenerationTarget = "script" | "segment_1" | "segment_2" | "segment_3" | "references" | "cover" | "publishing" | "package";
```

| Function                  | Inputs                                                     | Output And Invariant                                                  |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `createShortReel`         | channel/topic, validated source snapshot, request ID       | Persisted record; same channel/topic returns same record              |
| `getShortReel`            | ReelKey                                                    | Record or typed not-found; verify channel containment                 |
| `listShortReels`          | channel ID                                                 | Records in deterministic updated-time order                           |
| `updateShortReel`         | ReelKey, MutationContext, validated edit command           | New revision or conflict; never mutate source through arbitrary patch |
| `selectShortReelQuestion` | topic, eligible-bank reader                                | One snapshot or `BANK_EMPTY`; stable ID tie-break                     |
| `generateReelScript`      | frozen source/topic/style context, LLM client, AbortSignal | Validated ReelScript or structured generation error                   |
| `compileFlowPrompts`      | ReelScript, reference labels, model note                   | `[string, string, string]`; deterministic and no I/O                  |
| `affectedReelUnits`       | validated edit kind and segment index if applicable        | Explicit affected units from invalidation table                       |
| `acceptReelUnitResult`    | ReelKey, operation ID, dependency fingerprint, payload     | Atomic accepted/discarded result against latest record                |
| `exportShortReelPackage`  | ReelKey, expected revision                                 | Validated archive bytes for one consistent snapshot                   |

Use injected interfaces at external boundaries, not a new generic dependency framework. `request_id` permits replay of an identical mutation; reuse with different payload returns conflict. A retry following a known failed attempt uses a new request ID.

## HTTP Surface

Base path: `/api/channels/:channelId/short-reels`. Validate params and body; never trust client asset paths or client content kind over stored topic.

| Method / Suffix                  | Request                                               | Response                                           |
| -------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| GET base                         | none                                                  | `{ short_reels }`                                  |
| GET `/:reelId`                   | none                                                  | `{ short_reel }`                                   |
| PATCH `/:reelId`                 | expected_revision, request_id, validated edit command | `{ short_reel }`                                   |
| POST `/:reelId/generate`         | expected_revision, request_id, target                 | 202 `{ task, short_reel }`                         |
| POST `/:reelId/cancel`           | operation_id, request_id                              | acknowledged cancellation with current record/task |
| GET `/:reelId/export?revision=N` | required numeric revision                             | ZIP with attachment headers, or conflict/not-ready |

Creation is through existing topic confirmation after stored-topic discrimination. Do not create two separate creation paths with different idempotency behavior.

Errors: stable `code`, safe English `message`, optional field errors and retryable flag. Map invalid input to 400, missing channel/reel/topic to 404, stale revision/reused request/active conflicting operation to 409, no eligible question or invalid source to 422, unavailable upstream to 503, timeout to 504. Match existing transport wrapper where possible; expose no raw provider stack, secrets or absolute internal paths.

## Invalidation Table

| Change                                           | Invalidate                                     | Preserve                                                          |
| ------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------- |
| Replace source question through explicit command | all creative units and review acknowledgements | original bank and unrelated reels                                 |
| Topic premise/hook used by generation            | script, cover, publishing                      | validated references                                              |
| Mascot/style reference change                    | script, cover                                  | source question and unrelated records                             |
| Segment 1 edit/duration                          | compiled prompts and segment 2/3 currentness   | old downstream content, references, cover if its inputs unchanged |
| Segment 2 edit/duration                          | compiled prompts and segment 3 currentness     | segment 1 and old segment 3 content                               |
| Segment 3 edit                                   | compiled prompts                               | segments 1/2                                                      |
| Publishing edit                                  | export projection                              | script, references, cover                                         |
| Cover retry                                      | cover attempt/export readiness                 | successful script/publishing                                      |

Phase 02 must define exact dependency hashes from these inputs; exclude unrelated record revision and transient status so siblings do not invalidate each other. Derived prompt/export files must never be served as current after upstream edits.

## Phase 02 Frozen Implementations

Phase 02 freezes the following public schemas, types, DTOs, and repository interfaces:

- **Public Schema Modules (`@studio/shared`)**:
  - `packages/shared/src/shortReel/shortReel.schema.ts`: Zod schemas (`ReelArchetypeSchema`, `SegmentIndexSchema`, `TextCueRoleSchema`, `TextCueSchema`, `ContinuityStateSchema`, `ReelSegmentSchema`, `ReelScriptSchema`, `ShortReelTopicSnapshotSchema`, `ShortReelSourceSnapshotSchema`, `ShortReelUnitStateSchema`, `ShortReelUnitSchema`, `ShortReelUnitsSchema`, `ShortReelRecordSchema`, `ShortReelEditCommandSchema`), cryptographic pure-JS SHA-256 hash `sha256Hex`, and validation helpers (`validateReelScript`, `calculateScriptTotalDuration`, `calculateCumulativeTimings`, `createSourceSnapshot`, `createInitialShortReel`).
  - `packages/shared/src/shortReel/shortReel.types.ts`: TypeScript contracts inferred from Zod schemas.
  - `packages/shared/src/shortReel/shortReel.api.ts`: API DTO schemas (`ReelKeySchema`, `MutationContextSchema`, `ShortReelListResponseSchema`, `ShortReelResponseSchema`, `UpdateShortReelRequestSchema`, `GenerateShortReelRequestSchema`, `GenerateShortReelResponseSchema`, `CancelShortReelRequestSchema`, `CancelShortReelResponseSchema`).
  - `packages/shared/src/shortReel/index.ts` and `packages/shared/src/index.ts`: Barrel exports.

- **Server Storage & Facade (`apps/server`)**:
  - `apps/server/src/repository/shortReelStorage.ts`: Channel-contained directory resolution (`channels/<channelSlug>/short_reels/<reelId>/reel.json`), path traversal protection, atomic JSON writer with temporary file rename and test fault injection hook, safe JSON reader with Zod parsing.
  - `apps/server/src/repository/shortReels.ts`: Domain repository operations (`listShortReels`, `getShortReel`, `getShortReelByTopic`, `createShortReel`, `updateShortReel`), serialized compare-and-swap (CAS) mutation queue per reel, topic creation idempotency, request replay protection, and cascading unit invalidations.
  - `apps/server/src/repository/bindings/shortReelBindings.ts`: Prototype binding object for `RepositoryService`.
  - `apps/server/src/repository/service.ts`: Wired `shortReelBindings` and `shortReelMutationQueues`.
  - `apps/server/src/repository/runtime.ts`: Declared typed signatures for `RepositoryRuntime`.

- **Verification Tests**:
  - `packages/shared/test/shortReel.test.ts`: 13 contract tests verifying SC-01 through SC-06.
  - `apps/server/test/shortReelRepository.test.ts`: 6 repository tests verifying RP-01 through RP-06.

## Stage A Repaired Contracts (Phase 02 / 03 Boundary Repair - Attempt 02)

Stage A repairs the source snapshot, writer admission model, atomic writer safety, persistence validation boundary, and concurrency safety (resolving review rejection findings A-R01 through A-R08 and F03-08):

- **Extracted Source Snapshot Contract (`@studio/shared`)**:
  - `packages/shared/src/shortReel/shortReelSource.schema.ts`:
    - Defines `ShortReelSourceProvenanceSchema` (`"source" | "verified_translation"`), `ShortReelSourceChoiceSchema`, and `ShortReelSourceSnapshotSchema` as a union of `CompleteShortReelSourceSnapshotSchema` and `IncompleteLegacyShortReelSourceSnapshotSchema`.
    - Deep validation with `superRefine` enforces that projected English question text, choices, and `correct_choice_id` match the underlying `original_question` (or its verified English translation), with correct choice IDs resolving unambiguously and `content_hash === computeSourceContentHash(...)`. Forged choices, forged question text, and dummy/zero hashes fail schema validation immediately.
    - Legacy v1 drafts without `original_question` parse safely with `fidelity: "incomplete"`, ensuring backwards readability without data loss.
    - Pure cryptographic SHA-256 hex hashing `sha256Hex` and deterministic canonical JSON serializer `canonicalJsonStringify` (recursive key sorting) exported for shared usage.
  - `packages/shared/src/shortReel/shortReelSource.ts`:
    - `computeSourceContentHash(payload)`: Deterministic SHA-256 hex hash of the canonical JSON string of the source snapshot payload excluding `content_hash`. Invariant under object key ordering.
    - `createEnglishSourceSnapshot(bankQuestion, provenance)`: Strictly validates approved status, supported archetype (`versus_faceoff` | `deep_trivia`), explicit English language or verified English translation. Preserves exact canonical strings without trimming and rejects contradictory translation language metadata.
    - `createSourceSnapshot(bankQuestion)`: Backward-compatible wrapper delegating to `createEnglishSourceSnapshot`.
  - `packages/shared/test/shortReelSource.test.ts`: 12 comprehensive unit tests verifying immutability, approved status, archetype validation, non-English rejection, verified translation acceptance, unverified translation rejection, contradictory metadata rejection, forged choice rejection, forged question rejection, forged hash rejection, exact whitespace preservation, and deterministic content hashing.

- **Process-Wide Concurrency & Fail-Closed Single-Writer Admission Contract (`apps/server`)**:
  - `apps/server/src/repository/shortReelAtomicWriter.ts` & `shortReelStorage.ts`:
    - Canonical storage root resolution via `resolveCanonicalStorageRoot(storageRoot)` prevents lock evasion through relative paths or symlinks.
    - Process-wide mutation queue `runInCanonicalShortReelQueue` serializes mutations per `${channelId}:${reelId}` and `${channelId}:create:${topicId}` across distinct `RepositoryService` instances in the same process, eliminating lost updates.
    - OS-level fail-closed single-writer lock per canonical root using `node:sqlite` `DatabaseSync` on `.short_reel_writer.lock` with `PRAGMA locking_mode = EXCLUSIVE; BEGIN EXCLUSIVE;`.
    - Contending processes attempting write operations receive structured `RepositoryError` (`STORAGE_BUSY`).
    - Process crash / termination (`SIGKILL`) immediately releases the OS-held lock.
    - Writer admission tracked by owner ID (`serviceId`); root switches clean up prior root locks, and non-owner releases are rejected without releasing active locks.
    - Errors from SQLite lock acquisition are sanitized to safe English strings without leaking internal paths or drivers.
    - Clean app lifecycle shutdown via `app.close()` closes codex, server, and repository cleanly.

- **Strict No-Copy Atomic Writer Contract (`apps/server`)**:
  - `writeShortReelJsonAtomic(targetPath, record)`: Writes to a process-unique temporary file in the same directory, flushes bytes to disk via `handle.sync()`, closes the handle, and performs atomic rename with exponential backoff retries.
  - Failures during open, write, or sync clean up the temporary file via guaranteed `try ... catch ... finally` unlinking before throwing.
  - Strict NO-COPY guarantee: Upon retry exhaustion or fatal error, the temporary file is deleted and the error propagated. `copyFile` is NEVER invoked over an existing destination file.

- **Persistence Boundary Validation & Durable Replay Protection (`apps/server`)**:
  - `apps/server/src/repository/shortReels.ts`:
    - `createShortReel` and `updateShortReel` enforce writer admission via `ensureWriterAdmission(this.storageRoot)`.
    - Script and segment updates strictly validate cues against `record.source` using `validateReelScript`. Mismatches in question text or answer text throw typed `INVALID_SCRIPT` errors without touching disk.
    - Source question replacement retains previous script payloads in `units.script.last_accepted_payload` marked as `"stale"`, preserving historical work.
    - Unbounded durable `mutation_history` persisted in `ShortReelRecord` provides replay protection across process restarts without arbitrary eviction caps.
    - Conflicting payload reuse with the same request ID throws `REQUEST_CONFLICT` on both create and update operations.

- **Stage A Verification Test Inventory (`@studio/shared` & `apps/server`)**:
  - `packages/shared/test/shortReel.test.ts`: 13 contract tests verifying SC-01 through SC-06.
  - `packages/shared/test/shortReelSource.test.ts`: 12 unit tests verifying source snapshot creation, validation, translation metadata, exact string preservation, and hash tamper detection.
  - `apps/server/test/shortReelAtomicWriter.test.ts`: 6 tests verifying atomic write, transient rename retry, strict no-copy upon retry exhaustion, write fault cleanup, write/sync temp cleanup, and writer admission lifecycle.
  - `apps/server/test/shortReelWriterSafety.test.ts`: 6 cross-process tests verifying single-writer admission, STORAGE_BUSY contention, alias path contention, SIGKILL crash lock release, barrier-driven same-process concurrent CAS serialization, and multi-process restart verification with durable replay protection.
  - `apps/server/test/shortReelSourcePersistence.test.ts`: 10 persistence boundary tests verifying question/answer cue drift rejection, segment drift rejection, stale payload retention, forged source projection rejection, forged choice rejection, forged hash rejection, legacy incomplete draft coexistence, duplicate legacy creation prevention, and cross-process source fidelity.
  - `apps/server/test/shortReelQuestionSelection.test.ts`: 6 question selection integration tests (including TP-03, TP-04, TP-06) verifying selection, scoring, and source snapshot creation via `createEnglishSourceSnapshot`.
  - `apps/server/test/shortReelRepository.test.ts`: 5 repository integration tests verifying standard repository CRUD workflows.
