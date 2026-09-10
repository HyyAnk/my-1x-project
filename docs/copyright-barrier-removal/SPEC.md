# Copyright Barrier Removal Specification

## Decision and scope

Choose actual removal of local copyright enforcement. A feature flag leaves dormant policy, and an allowlist creates a new gate, so neither meets the requested outcome.

This specification covers all repository-owned paths: quiz research, treatment, script, direct generation, question-bank batches, semantic QA, asset compilation, thumbnail compilation, provider recovery, knowledge-base metadata, API reports, web copy, CLI output, tests, and active prompt documentation. Short Reel, curated assets, and provider adapters are integration surfaces to inspect, not invitations for unrelated rewrites.

The owner asserts permission for the content. Do not introduce rights verification or attempt to establish a legal conclusion. No third-party license notices, asset attribution, or source evidence should be deleted.

## Requirements

| ID  | Required outcome                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 | Local generation/QA never rejects or warns solely because a subject contains a copyright/trademark name or the legacy lion-cub terms                            |
| R02 | Active prompts contain no instructions to avoid copyrighted subjects, require public-domain-only subjects, or substitute generic proxies because of IP identity |
| R03 | Subject names survive deterministic image and thumbnail compilation; ordinary whitespace/framing processing can remain                                          |
| R04 | Provider content-filter rejection is reported honestly without automatic renaming, obfuscation, or a success-shaped fallback                                    |
| R05 | Obsolete validators, rule tables, classifiers, and exports are removed after their consumers are updated                                                        |
| R06 | The four enforcement-only knowledge fields are removed through a lossless, reversible, idempotent migration; curated provenance remains intact                  |
| R07 | New batch reports and visible UI no longer expose copyright rejection as an active QA category; old persisted payloads remain readable                          |
| R08 | Historical failures remain historical; explicit reassessment uses all surviving checks and cannot manufacture missing candidates                                |
| R09 | Old automatically generated proxy assets cannot silently satisfy a new identity-preserving generation request through stale cache keys                          |
| R10 | Tests are hermetic; protected validation and asynchronous behavior remain correct; the rebuilt/restarted artifact is exercised                                  |
| R11 | Pre-existing working-tree edits, real media, source/attribution records, and unrelated safeguards are preserved                                                 |
| R12 | A residual scan classifies every match; no live copyright enforcement remains under a renamed or generic policy label                                           |

## Protected behavior

- Schema validation, supported choice counts, correct-answer mapping, fact locks, source coverage, deduplication, history checks, and quality limits.
- Child-appropriate content rules unrelated to IP identity, existing non-copyright safety policies, prompt/output shape checks, and thumbnail spoiler/clutter rules.
- Authentication, authorization, path traversal checks, untrusted-input validation, limits, cancellation, provider timeouts, and structured error reporting.
- Existing source order for explicit episode assets, curated assets, channel assets, generated caches, and configured providers. Do not replace the asset resolver architecture.
- CuratedEntityAsset fields such as `license_type`, `source_url`, `source_domain`, `attribution`, dimensions, IDs, and variants.
- Topic names, factual entity disambiguation, aliases, visual anchors, correct choices, research claims, and authored descriptions.

An instruction such as “no logos” needs purpose-based review. Preserve anti-clutter intent, but it must not suppress a specifically requested logo or emblem that is the subject. Prefer “Do not add unrelated logos or watermark overlays; retain identifying marks explicitly required by the subject.” This does not authorize watermark removal from source media.

## Target architecture

No new policy engine or generic framework is required.

```text
Requested topic / imported candidate
  -> existing parsing and non-copyright validation
  -> canonical quiz / question-bank records
  -> existing asset planning using the actual subject
  -> identity-preserving prompt compilation
  -> explicit/curated/cache/provider resolution
  -> accurate success, partial result, or provider error
```

Prompt builders define output contracts, not copyright policy. Domain QA evaluates correctness, not IP names. Provider adapters retain transport/error handling, not local IP substitution. Knowledge entities contain facts and visual descriptions, not enforcement flags. Migration I/O lives outside the normal application workflow.

Use dedicated types and a pure transformation for the migration; keep filesystem validation, backups, atomic replacement, and logging in separate script modules. Do not add business workflows to UI components or large handlers.

## Public contracts

- Keep existing task entry points and QuizV2 schema/version. Removing copyright checks is not a reason to change quiz serialization.
- `runAutoQaOnQuestion` and `runBatchAutoQa` retain their signatures. Active issue kinds become `duplicate | schema | quality`.
- New QA summaries contain `duplicateRejections`, `schemaRejections`, and `qualityRejections`. Legacy input can contain `copyrightRejections`, but it is not evaluated as active policy or silently remapped into another error category.
- Remove the obsolete report field in the coordinated in-repository server/web/script update. Before changing the response, discover external consumers. If one requires the old field, pause for a compatibility rollout decision; do not leave a permanent zero-valued field or introduce a second API without approval.
- Knowledge entity migration removes exactly `copyright_risk`, `is_trademark_ip`, `forbidden_visual_keywords`, `safe_visual_proxy`. Retain all other keys, including unknown future fields. Runtime loaders may read legacy extra fields without using them; migration must not require a widened domain type.

## Provider behavior

Removing local restrictions cannot make external services accept every request. Send the intended prompt using the existing supported integration. Content-filter rejection must stop automatic identity-changing recovery and surface the actual error. Do not retry a terminal policy rejection through renaming or newly added provider failover.

Retain bounded transport retry for genuinely transient failures under the adapter's existing rules. Preserve cancellation and rate-limit behavior. A provider refusal is not proof of a legal violation; do not invent a rejection category. Existing non-IP safety sanitizers may remain where separately used, but no dormant copyright rewrite instructions may survive.

## Interaction and synchronization plan

| Flow                             | Immediate state                             | Confirmed success                                          | Failure / recovery                                                               |
| -------------------------------- | ------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Batch generation/import          | Pending action; block duplicate submit only | Refresh list, counts, batch result                         | Keep input; show QA/provider error; safe retry                                   |
| Direct quiz generation           | Existing task status/progress               | Saved quiz, downstream invalidation, updated episode stage | Do not advance stage before repository confirmation                              |
| Asset or thumbnail generation    | Pending asset/version                       | Reconcile asset list and active preview                    | Preserve last confirmed version; show failed item; no substitute marked complete |
| Explicit historical reassessment | Pending selected record                     | Fresh report from surviving checks                         | Keep history and unrelated failures                                              |
| Reconnect/concurrent update      | Show latest known task state                | Reconcile from server revision/current record              | Ignore stale response; avoid duplicate application                               |

Reuse existing event/cache refresh mechanisms. No new modal, warning banner, copyright toggle, or proof-of-rights form. At desktop and mobile widths, remove obsolete copy without adding decorative text; keep primary controls and keyboard/touch recovery accessible. Honor reduced motion. Preserve the existing footer; the supplied global footer-credit rule conflicts with the English-only file rule, so do not modify footer content in this project. If footer changes become necessary, obtain clarification before making them.

## Global constraints

- All new and modified repository content must be in English.
- Preserve all pre-existing working-tree changes.
- Do not add production dependencies for this removal project.
- Do not use OS-level mouse, keyboard, clipboard, or focus-stealing automation.
- Do not bypass unrelated validation or external provider restrictions.
- Do not mutate live content or run paid/bulk generation without exact-target approval.
- Run the updated artifact after implementation, not only its build.
- Report evidence and unverified boundaries honestly.

## Completion boundary

Implementation acceptance means R01-R12 are verified against the integrated code and an isolated running application, including migration apply/rollback rehearsal. Live-data rollout is a separate signed-off operation. If it is not approved or performed, report “implementation verified; live-data rollout pending,” not “the entire live system is upgraded.”
