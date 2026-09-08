# Decision Register

## Phase 04 Review Repair

- P04-R1 (2026-09-07): Implement the already-required per-segment stale state as an additive optional record field, preserving old records and downstream payloads. Strict generation/export validation does not use stale-boundary exemptions. See the current contract ledger for producer/consumer details.
- P04-R2 (2026-09-07): Replace application-level read/check/CAS retries with lifecycle callbacks inside the existing repository record queue. Persist operation identity before dispatch and serialize cancellation, failure and acceptance with user edits. Retire affected operations on edits; never accept an unknown operation.
- P04-R3 (2026-09-07): One correction budget covers both parsing and schema repair. Bound connection plus generation plus correction, preserve source text using reversible escaping, and return safe generation errors without raw provider output.
- Authority: the user explicitly requested review and immediate fixes to Phase 04 before proceeding to Phase 05. These changes restore the approved requirements, not new product scope. Initial review of Antigravity work is separate from Codex self-verification of its own repairs; neither is final user acceptance or permission to delete assets/the kit.

## Stage A Repair 03 Follow-up

- D-23 (2026-09-07): Separate legacy read/recovery source from complete new-write validation. Preserve old records; reject creative writes until an explicit valid source replacement. This closes A-C01 without deleting data or inventing provenance.
- D-24 (2026-09-07): Per-owner pending reservations include queued operations. Root admission transitions to draining on final-owner closure, rejects new work and retains SQLite exclusion until completion. No timeout unlock is permitted. This closes A-C02; a stuck operation may keep shutdown pending and requires genuine cancellation/process termination rather than unsafe unlock.
- Authority: user explicitly requested implementation of A-C01/A-C02 after the recheck. These repairs restore existing source-fidelity and single-writer guarantees; no live-data migration or downstream phase implementation is authorized. Acceptance still requires independent/user-integrator review.

## Settled Product Direction

| ID   | Decision                                                           | Authority / Reason                                               |
| ---- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| D-01 | Separate Episode and Short-Reel workflows                          | User-approved product direction                                  |
| D-02 | Three generate/extend/extend segments; text generated inside video | User correction to original concept                              |
| D-03 | Manual Flow operation and final quality control                    | User explicitly operates Flow and reviews output                 |
| D-04 | No legacy portrait playback/compatibility                          | User states historical products are disposable development tests |
| D-05 | No automatic deletion of this execution folder                     | User will delete it after complete acceptance                    |
| D-06 | Existing coordination protocol, sequential phase prompts           | Portable execution without a second claim system                 |

## Implementation Defaults To Preserve Unless Revised Explicitly

| ID   | Default                                                                | Rationale                                                                              |
| ---- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| D-07 | Snake-case persisted DTOs; Zod schemas are public truth                | Current repository conventions                                                         |
| D-08 | 8/8/8-second creative default, editable 8-10 each                      | Fits intended three-segment target without claiming verified provider duration         |
| D-09 | Structured script is editable; prompts are derived                     | Prevent inconsistent script/prompt copies                                              |
| D-10 | Immutable bank snapshot, English source/verified English translation   | Source fidelity and strict English-only new artifacts                                  |
| D-11 | Draft selection/export never claims rendered/published history         | Manual external video operation has no server confirmation                             |
| D-12 | New application folder gets explicit zone coverage before use          | Existing zone globs do not automatically cover arbitrary new server features           |
| D-13 | Pure JS SHA-256 for `@studio/shared` hashing                           | Browser and Node.js runtime neutrality without `@types/node` dependency                |
| D-14 | Per-reel serialized mutation queue with atomic CAS write               | Process-level concurrency safety and crash resilience for short reel storage           |
| D-15 | Canonical question/answer cue fidelity and reveal ordering             | Source question and correct answer text fidelity strictly validated at schema          |
| D-16 | 3:2 Mixed topic suggestion matrix with slot-directed keyword steering  | Slot 1 (Ep kw), Slots 2-3 (Ep disc), Slot 4 (Reel kw), Slot 5 (Reel disc)              |
| D-17 | Discriminator backward compatibility with preprocessing fallback       | Preprocessor defaults absent content_kind to 'episode' for legacy runs and tests       |
| D-18 | Question bank selection with English provenance & bounded pagination   | Approved versus/trivia questions, English resolution, token scoring, BANK_EMPTY        |
| D-19 | Extracted source boundary and verbatim BankQuestion fidelity           | Snapshot stores full original BankQuestion, deep-cloned, with deterministic hash       |
| D-20 | Fail-closed single-writer admission via OS-held SQLite lock            | Cross-process writer safety on canonical storage root; crashes release lock            |
| D-21 | Strict no-copy atomic JSON replacement                                 | Never invokes copyFile upon rename retry exhaustion, preserving destination bytes      |
| D-22 | Persistence boundary cue validation & stale payload preservation       | Rejects cue drift with INVALID_SCRIPT; retains prior payloads after source swap        |
| D-23 | Process-wide canonical root & reel serialization queue                 | Eliminates lost updates between concurrent RepositoryService handles in same process   |
| D-24 | Strict schema-level projection, translation & hash verification        | Schema enforces projection-to-source fidelity, rejects contradictory metadata/hashes   |
| D-25 | Incomplete legacy snapshot schema & selector integration               | Safely parses older v1 drafts as incomplete fidelity without hiding them or dupes      |
| D-26 | Owner-tracked admission lifecycle & durable unbounded mutation history | Explicit serviceId lifetime, app shutdown close, temp cleanup, durable replay receipts |

## Explicit Review Points

- Phase 01: confirm current task/repository/nav seams and all removal paths after recent modularization. Paths from historical plan are discovery seeds, not exhaustive findings.
- Phase 02: freeze exact schema/interface names; document multi-writer storage guarantees before claiming concurrency safety.
- Phase 03: confirm English bank availability without changing Episode localization behavior. Empty eligibility is an honest recoverable state, not a reason to generate new questions.
- Phase 06: reuse the existing footer. Prior global credit wording and later English-only instructions conflict; do not introduce new non-English credit text. If existing chrome cannot satisfy the requirement, ask for a specific user decision before changing that copy.
- Phase 08: observe actual Flow model and extension durations. Record user observations; do not assert they were independently verified by this kit.

## Phase 01 Observations Requiring Later Decisions

- P01-01: Source inventory prepared at 42d2ecd79c2a3e1955499764661d05446a3baf46. It covers 193 expanded source/test paths and four portrait snapshots, plus dynamic integration and historical/protected matches. Independent review remains pending.
- P01-02: New source-zone request is `docs/agent-coordination/short-reel-zone-change-request.md`; integrator approval is pending, and no zone map was edited. Phase 02 mapped contract/repository work is possible after review, but Phase 03 application paths require approval first.
- P01-03: Active bank has 1,261 approved records, 319 allowed-archetype records, no explicit language metadata and no embedded translations. Strict explicit-English filtering would return zero. Request an approved provenance policy before Phase 03 live-data acceptance; no automatic metadata mutation or assumption about actual text language was made.
- P01-04: Current channel has no assigned mascot although three reusable mascot profiles exist. Reference selection/assignment remains a user action; do not silently assign one during packaging.
- P01-05: Managed Episode/topic-run counts are zero, but 27 orphan landscape render caches and 36 voice diagnostics remain. They are retained and are not approved portrait deletion targets; migration backups and all reusable assets are protected.
- P01-06: Storage write queues are process-local; Windows write fallback can copy over the destination. Phase 02 must not promise atomic CAS or multiple-writer safety without dedicated checks and a scoped implementation choice.
- P01-07: The current phase prompt prohibits unrequested spawning; Phase 01 executed directly despite the general parallel-first preference. No policy or later prompt was rewritten during this inventory.

## Change Approval Procedure

Before changing a settled requirement or public contract, record proposed change, reason, affected requirement/test IDs and affected consumers. Obtain user approval for product/scope changes and integrator approval for coordination ownership changes. Preserve the previous decision and append a superseding record with date and authority. Routine internal helper choices within a phase need no product reapproval but belong in its handoff when material.
