# Current Audit

## Evidence levels

- Current source finding: inspected in this handoff review; needs an isolated failing regression before implementation.
- Historical reproduction: reported by the preceding review; must be reproduced against current code.
- Present repair: code now contains a repair; still requires the acceptance matrix.

No new fault-injection tests or live Bank audit ran in this planning pass.

## Current source findings

| ID  | Priority | Evidence and remaining work                                                                                                                                                                                                   |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | High     | bankIndexManager.ts reads and writes index.json without filesystem link containment checks. bankPathResolver.ts only validates lexical segments. Add index symlink/junction tests.                                            |
| B2  | High     | bankMutationEngine.ts delete writes runtime candidates before checking project-root candidates against runtime containment; redirected storage can mutate then throw. Deletion lacks transaction rollback.                    |
| B3  | High     | bankMetadataMigration.ts apply restores batches after errors but not manifest preimage; rollback writes batches sequentially without compensation.                                                                            |
| B4  | Medium   | Migration resolves relative storage_path using process CWD and still throws bare Error/JSON parse errors in several boundaries.                                                                                               |
| T1  | High     | topics.ts legacy array save fabricates 50 qb_synth_* bindings with a constant hash, except for name/origin heuristics.                                                                                                        |
| T2  | High     | boundSourceResolver.ts reads each source separately and checks status/hash/cooldown but not the complete shared eligibility policy.                                                                                           |
| T3  | High     | repository topics.ts confirmTopic checks binding presence/count but creates an Episode without authoritative Bank resolution.                                                                                                 |
| C1  | High     | Episode bridge writes completed receipt before appendQuestionHistory; replay reports cooldown_recorded=true without repairing missing history. Replay also substitutes an empty quiz/director plan when artifacts are absent. |
| C2  | High     | Short-Reel creation precedes preparing receipt. Failure writing that receipt leaves a discoverable Reel; receipt-less legacy replay can mark it completed without checking localization.                                      |
| C3  | High     | Preparing Short-Reel retry resolves source eligibility again. If history was written before completed-receipt failure, its own cooldown can block recovery.                                                                   |
| C4  | Medium   | Episode bridge uses omitted question_count=3 and style=mixed before loading candidate defaults. Establish effective defaults once and fingerprint the same values used by execution.                                          |
| L1  | High     | channels.ts persists changed language then deletes Reel localization files only. Script/cover/export readiness and failure recovery are not reconciled.                                                                       |
| L2  | High     | Episode description orchestrator does not load product localization. Generator uses current channel language and English fallback text, potentially diverging from the confirmed product target.                              |
| U1  | High     | topics.ts availability uses QUIZ_MIN_QUESTION_COUNT rather than requested/candidate count; an 8-question candidate can be marked available with only 3 eligible prefix sources.                                               |
| U2  | Medium   | Latest runs are read through JSON casts; malformed runs require typed fail-closed handling rather than fallback to historical success.                                                                                        |
| U3  | Medium   | ChannelTopicsTab.tsx retains a 1500ms grouping heuristic; useTopicAvailability.ts rejects newer requests based on checked_at clock ordering.                                                                                  |

Paths above are expanded in phase files. Line numbers may move; locate symbols, not stale offsets.

## Repairs now present: preserve and verify

- EpisodeTopicConfirmInputSchema includes target_language.
- Receipts have preparing/completed states.
- Both localization loaders distinguish missing files from corrupt/unreadable artifacts.
- Short-Reel confirmation now serializes callers rather than blindly joining a pending result.
- Short-Reel confirmation appends question history.
- Short-Reel prompt explicitly requires English narrative/action/camera/audio instructions.
- Episode thumbnail service loads localization and projects localized question data.

These observations supersede the older blanket statement that all these repairs are missing. Do not redo them blindly.

## Historical reproductions requiring fresh confirmation

Index symlink read escaping root; migration manifest failure with restored batches but applied manifest; second rollback write leaving mixed pre/post images; redirected delete modifying runtime bytes before UNSAFE_PATH. Earlier live audit found 1262 English questions in configured external storage, not the project-local empty index. That count is historical, not a fresh audit.

## Fresh command evidence

Run from apps/server through pnpm:

```powershell
pnpm --filter @studio/server exec vitest run test/bankStorageSafety.test.ts test/bankMetadataMigration.test.ts test/boundTopicConfirmation.test.ts test/productLocalization.test.ts test/shortReelLocalization.test.ts test/shortReelConfirmationRecovery.test.ts test/topicAvailabilityRoute.test.ts
```

Result: 7 files, 74 tests passed; exit 0. These tests do not prove the uncovered findings above. Full tests, typecheck, build, browser, visual and fault injection were not run in this planning pass.
