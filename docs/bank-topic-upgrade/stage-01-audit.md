# Stage 1 Read-Only Bank Audit

Date: 2026-09-08. Auditor: bank_audit, gpt-5.6-luna; coordinator records returned evidence. No files, live records, providers, server or Flow were changed or started by the auditor.

## Active Root And Scan

The project .quiz-studio/storage.local.json selects D:/1a Cursor Project/My 1x Youtube Channel File; effective Bank is its .quiz-studio/question_bank directory. Project-local Bank is empty and is not the redirected runtime Bank. Audit parsed 143 valid JSON batch files, 1,262 records, zero JSON parse failures. Batch scan is complete_nonempty. Application endpoint correlation remains an integration check; the auditor did not start the app.

| Archetype             | Records |
| --------------------- | ------: |
| deep_trivia           |     150 |
| versus_faceoff        |     169 |
| clue_deduction        |     169 |
| mystery_reveal        |     153 |
| speed_blitz           |     175 |
| verdict_true_false    |     158 |
| visual_identification |     174 |
| visual_spotting       |     114 |

All 1,262 records are approved. All 150 Deep Trivia records satisfy three-choice structure, unique IDs, correct-choice lookup, nonempty question and explanation; all 169 Versus records satisfy the corresponding two-choice structure. 1,261 records lack language; the one declared en record is verdict_true_false. No record has translations.en. Thus all 150 Deep Trivia and all 169 Versus records are ineligible for Short-Reel due to MISSING_ENGLISH_METADATA. The inspected novy channel has no question_history.json, so cooldown is not the observed cause.

Index current_total is 1,262, but by_archetype sums to 1,460 because verdict_true_false is mirrored under legacy verdict_fact_myth. Do not sum alias buckets as distinct inventory.

## Producer Root Cause

- apps/server/src/quiz/bank/prompts/batchPromptOutputParser.ts constructs BankQuestion without language in both parsers.
- apps/server/src/quiz/bank/batch/batchChunkScheduler.ts supplies input.language to prompt builders but omits it from parser metadata.
- apps/server/src/quiz/bank/questionJitSeeder.ts includes language in prompts but omits parser metadata.
- Persistence preserves optional missing language; it cannot establish provenance retroactively.

## Implementation Input

Propagate explicit requested generation language through parser for new records and cover parser/batch/JIT tests. Preserve unknown historical metadata. Do not silently relax eligibility or label all legacy records English. User-data backfill needs explicit reviewed scope; software can honestly show diagnostics and no feasible reel slots meanwhile.

No product tests were run by this read-only audit. Stage 2 tests and later integration checks must verify new behavior, not treat this report as execution evidence.
