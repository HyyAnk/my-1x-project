# Bank-First Topic Upgrade Design

## Authority And Scope

### Frozen Language Architecture

On 2026-09-08 the user explicitly confirmed that Question Bank is an English-only source-of-truth store. All existing Bank questions are English, and missing language metadata may therefore be repaired to `en` using this attestation rather than language inference. Inventory the exact affected records, preserve source content byte-for-byte except for the metadata addition, back up affected batch bytes, compare semantic contents before and after, and apply through a separately verified migration boundary.

Question Bank generation and import accept only English source content and persist `language: "en"`. Bank records must not contain localized question variants, and product localization must never be cached or written back into Bank. Channel target languages use base codes such as `en`, `de`, and `fr`; regional inputs may normalize to their supported base language. Never map unknown language to English. Vietnamese is prohibited as a generation target and must be rejected rather than remapped.

The system, UI, Topic metadata, scripts, visual directions, image-generation prompts, and model instructions remain English. After a Topic is selected, localization may affect only three audience-facing output groups: (1) displayed quiz question, choices, reveal answer, and displayed explanation; (2) video description; and (3) text rendered inside the thumbnail. Short-Reel narrative/script content remains English, with the exact localized quiz strings embedded as rendering data. Thumbnail imagery and its prompt remain English; only the final in-image text is localized.

This explicit confirmation supersedes BF-12's prior prohibition on live language metadata repair only for the audited existing English Bank records. No other live mutation, provider spending or deletion is authorized.

The user approved this upgrade on 2026-09-08 and requested six implementation stages, coordinated in the current conversation with `gpt-5.6-luna` subagents. The coordinator owns design, sequencing, integration decisions and final checks. This is a new upgrade, not a retroactive claim that the earlier Short-Reel acceptance proved live Bank usability.

This design supersedes the exact-five topic requirement in Short-Reel SR-02 for new Bank-first runs: target three Episode and two Short-Reel suggestions when eligible inventory supports them; return fewer or zero with explicit shortages otherwise. All other source-fidelity, three-segment, manual-Flow, portrait-retirement and user-owned kit-retention requirements remain unchanged.

## Requirements

- BF-01: Diagnose actual Bank eligibility with counts and typed exclusion reasons. Missing language is unknown, never implicitly English.
- BF-02: Reuse one English-source eligibility boundary across planning and confirmation, with distinct structural policies for Episode and Short-Reel. Every eligible Bank source must be approved, explicitly English, and structurally compatible; Bank translations are never an eligibility path.
- BF-03: Allocate actual question IDs and content fingerprints before AI topic generation. Short-Reel uses exactly one; Episode requires the requested count and compatible format from a coherent domain/subtopic group.
- BF-04: Generated topic metadata cannot replace server-assigned IDs, fingerprints, kind, archetype, group or provenance. Creative text is grounded in the selected source, not used to select a weakly related question afterward.
- BF-05: Shortages are normal partial/empty results. Do not fabricate candidates, duplicate one source to fill slots, silently broaden a keyword, or call a provider when there are no feasible slots.
- BF-06: Confirmation consumes persisted bindings, rechecks current source/hash/eligibility before side effects, rejects stale or missing sources with actionable typed errors, and never silently swaps questions. Replaying a completed confirmation returns its existing product.
- BF-07: New Bank-first confirmation never generates, translates, caches, or writes localized content in Question Bank. Localization is a downstream product operation linked to immutable English source IDs and hashes.
- BF-08: Bank changes update topic availability without replacing visible creative text or unsaved input. Refresh after committed mutations, reconnect/focus and cooldown expiry; reject out-of-order responses and stop polling on disposal.
- BF-09: UI acknowledges load/generation/confirmation immediately, prevents duplicate submissions without freezing unrelated controls, preserves partial results and shows retryable errors. Source changes disable invalid confirmation until refreshed.
- BF-10: Legacy topic runs remain readable. Unbound old topics must be explicitly re-suggested before Bank-first creation; already-created products remain accessible and replayable.
- BF-11: All production paths are zone-covered, APIs validated, concerns modular, and tests cover actual boundaries. No new dependencies without a demonstrated need.
- BF-12: Live Bank metadata repair is limited to the user-attested addition of missing `language: "en"`, using a frozen manifest, backups, drift checks, and semantic-preservation verification. No source-text rewrite, paid provider call, Flow automation, publication, commit, branch, or worktree is authorized.
- BF-13: Bound Episode conversion must consume only the bound English source snapshot and must not fabricate missing distractors, truncate source meaning, read Bank translations, or silently remap contradictory answers. Admit only losslessly compatible English source payloads through a strict converter. Existing permissive legacy conversion is not proof of eligibility.
- BF-14: Product localization preserves question identity, choice IDs, correct-answer mapping, and source hash. Only the allowed audience-facing fields may be localized; retries and invalidation operate on product localization artifacts and never mutate Bank.

## Data And Responsibility Boundaries

### Frozen Behavioral Decisions

- Inventory states are `complete_empty`, `complete_nonempty`, `incomplete`, `unavailable`. Only a complete read may establish shortage. I/O failure or pagination truncation is an actionable failure, not an empty Bank. Audit must correlate the configured canonical root with server repository resolution; never expose credentials.
- New Bank-first language policy: every bound source is native English with explicit `language: "en"`. Channel language never filters Bank inventory and no stored translation qualifies a source. Localized output is created only after selection and belongs to the Episode or Short-Reel product.
- A binding identifies source question ID, hash version 1, resolved source language `en`, and SHA-256 over canonical English Bank content. Hash question, choices, correct-choice ID, explanation, domain/subtopic/archetype/status/language; exclude translations, channel cooldown fields, and timestamps. Recheck cooldown separately. Store immutable source context in the persisted server-owned plan or reconstruct only if the exact hash still matches.
- Stable slots are Episode 1/2/3 and Short-Reel 4/5 (Versus/Deep Trivia), not an array index after filtering. Target counts count suggestions, not questions. Each Episode slot defaults to eight sources when available, with an explicit lower supported count no smaller than the existing minimum if planning intentionally chooses it; persist that chosen count before generation. Confirmation may choose only a deterministic prefix of the allocated set within the valid minimum/maximum; greater counts require re-suggesting, not hidden allocation.
- Keyword matching uses normalized case/diacritic/whitespace tokens against taxonomy labels/IDs and source content, with every meaningful query token required in the chosen source/group context; empty stopword-only queries require a useful keyword rather than matching everything. This is lexical relevance, not a claim of semantic proof. Unmatched steered slots remain shortages; other discovery slots may succeed. Do not silently substitute substring score zero.
- Persist allocation state separately from provider-generation state. Inventory shortages cannot be used to conceal parse/provider failure. Preserve already-persisted successful results if a later explicit retry fails. A batch provider response that is invalid may fail the batch clearly without inventing source shortage.
- Single-user local idempotency identity is canonical storage root + channel + topic + product kind, with exact confirmation options recorded in a durable receipt. Do not invent a tenant system. Replay a completed receipt before Bank validation. Serialize competing confirmations with existing root admission and canonical queues; prepare artifacts under a recoverable deterministic identity, publish only a complete product, and reconcile interrupted receipts on retry. Do not hold a non-reentrant topic-projection lock while recursively calling projection.
- Define the source-selection linearization point explicitly: read/validate one immutable source snapshot before publication and prevent cooperating Bank mutations from interleaving through the same canonical Bank mutation boundary, or use a revision-checked publication transaction. External filesystem edits cannot be promised OS-level transactional exclusion; mismatched hashes must be rejected on the next check and the limitation recorded.
- Enumerate every cooperating Bank writer before implementing the boundary, including generation/import, JIT seeding, edit/delete/clear, migration, translation cleanup if separately authorized, and bound confirmation reads. Freeze one lock order and prove with a race barrier that confirmation cannot publish from a mixed snapshot.
- Availability is batch-scoped and returns scan status, checked-at time/snapshot token, per-topic `canConfirm`, stable reason code, retryability and recovery action. Server responses must derive from a coherent snapshot; client request sequencing alone is insufficient. Recheck/return stale if Bank changes during scan, and serialize or revision-tag snapshots rather than accepting mixed-generation counts.

1. Shared contracts define source bindings, inventory/shortage results and availability states.
2. Pure eligibility functions evaluate content structure and language; a Bank reader supplies channel-aware cooldown and immutable snapshots.
3. Allocation selects coherent sources deterministically and computes exact coverage before generation. No persistent reservation or publication cooldown is created merely by suggesting a topic.
4. Topic generation receives only allocated contexts and returns creative fields. The server merges those fields into its assigned plan and persists the run.
5. Confirmation validates the persisted allocation, constructs the product from that exact English snapshot and uses existing serialized/idempotent storage boundaries. Binding hashes are server-derived, never trusted from the browser.
6. A product-localization boundary derives only the allowed audience-facing strings for the channel base language, validates stable choice/correct-answer identity, stores them with the product, and never calls Bank translation storage.
7. HTTP endpoints expose safe availability diagnostics; React hooks own refresh/cancellation, components only render state and dispatch actions.

## Interaction Plan

- Opening Topics loads stored suggestions and checks their availability. Loading feedback is scoped to that area; older useful content stays visible.
- Suggest acknowledges immediately, disables only duplicate suggestion requests and persists feasible results. Empty inventory shows a concise reason and a route to Question Bank, not a generic provider failure.
- Keyword-directed slots require matching eligible sources. Discovery slots may still succeed; a missing keyword slot is reported, never mislabeled discovery as keyword.
- Selecting an Episode count beyond allocated capacity is prevented or explicitly rejected, never fulfilled through hidden JIT generation.
- Confirm transitions available -> confirming -> created, or unavailable/conflict/error. Input and the selected topic remain visible on failure. Repeated confirmation acknowledges one product.
- Bank mutation or cooldown changes invalidate availability only. Reconnect and focus restore authoritative state without F5. Background refresh must not trigger paid AI generation.
- Desktop and mobile retain existing concise layout/footer. Secondary diagnostics use progressive disclosure; errors and unavailable state stay visible and keyboard/touch-accessible. Respect reduced motion.

## Synchronization Strategy

Prefer the existing application event transport where its mutation boundaries can report committed changes. A bounded, visibility-aware availability refresh is an acceptable fallback and covers external file edits and cooldown time passage. Use no full-Bank scan per card; request one channel-scoped availability batch, coalesce refreshes, and apply only the latest response. Availability is advisory until confirmation revalidation succeeds.

## Data Repair And Localization Policy

New Bank generation/import paths must request English, validate English-only metadata, and persist `language: "en"`. The existing audited records may receive only missing-language metadata because the user attested that their source content is English. The migration must not delete or rewrite unrelated fields unless a later exact-scope cleanup is separately reviewed; runtime code must stop reading or writing Bank translations for the upgraded flow.

Localized product data records target base language, source IDs/hash, localization version/status, and the exact three permitted output groups. Failed localization preserves the selected English source and supports idempotent retry. English-target channels may copy the English audience strings without a translation provider. Vietnamese and unsupported targets fail with a typed error before provider invocation.

## Acceptance

### Review Clarifications

- Episode and Short-Reel accept only approved native English Bank sources with explicit `language: "en"`; translations stored in Bank are ignored by the upgraded eligibility path.
- Incomplete/unavailable inventory stops provider invocation, preserves earlier suggestions and reports failure; it never persists a normal empty/shortage success. Test permission errors and truncated scans.
- Compare canonical confirmation options before replay: identical options replay, different options return CONFIRMATION_OPTIONS_CONFLICT without side effects. A topic cannot become multiple variants merely through option changes.
- All allocated source IDs are disjoint across the entire run, including across content kinds. Stable priority is steered slots first, then discovery, while returned slot order remains stable.
- Prompt context includes the full selected English question, choices, correct-choice ID, explanation, group/archetype and source language. Hash the complete canonical English source for change detection. Oversized semantic context fails explicitly before provider invocation; never silently truncate or summarize it.
- Stage 2B freezes the shared canonical Bank read/mutation serialization boundary and writer lock order. Stage 4 consumes and exercises that boundary for bound confirmation: re-read selected sources, validate, write a durable preparation receipt and publish the complete exact-snapshot product. Respect root writer admission and avoid nested acquisition of the same queue.
- Apply the reviewed missing-language manifest through that boundary before Stage 3 creates any binding. Record the post-migration manifest/revision as the hash baseline; all new source hashes use that state. Runtime still treats missing language as unknown outside this exact user-attested manifest.
- The three localized output groups are one atomic product-localization artifact: displayed quiz strings, video description, and thumbnail in-image text. A failed attempt preserves the English source/product state and exposes idempotent retry; it must not publish a mixed-language partial artifact. A completed product remains replayable after later Bank changes. A channel-language change invalidates only the product localization artifact.
- Supported target normalization uses an explicit allowlist from regional input to base code. Tests cover `en`, `de-DE` to `de`, `fr`, `vi`/`vi-VN`, and unknown input. English makes zero translation-provider calls; Vietnamese and unknown codes fail before provider invocation.
- Availability tokens must describe a coherent server snapshot. Apply only latest client requests whose server snapshot has not regressed; a later request carrying older server revision is a tested rejection. A digest-only token is identity, not ordered revision; do not compare hashes lexicographically as freshness.
- Stage 1 evidence is docs/bank-topic-upgrade/stage-01-audit.md; Stage 2 must read it. Its live application endpoint correlation is not yet proven and must remain qualified until Stage 6.

All BF requirements need tests or inspected evidence. Run focused red/green tests per slice, then full lint/format/typecheck/shared/server/web/build/E2E/visual/zones. Execute rebuilt isolated real HTTP/storage/browser workflows with provider doubles, plus read-only diagnostics against the user's current Bank. No actual video or manual Flow acceptance is implied.
