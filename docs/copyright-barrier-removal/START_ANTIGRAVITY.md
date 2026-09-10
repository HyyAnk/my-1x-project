# Antigravity Startup Prompt

Copy the following prompt into Antigravity with the current project workspace open.

```text
Implement the application-owned copyright barrier removal described in:
D:\1a Cursor Project\My 1x Project\docs\copyright-barrier-removal\README.md

This is implementation authorization for the code change, hermetic tests, and migration rehearsal defined by this package. Work on the CURRENT WORKING TREE, not an old clean copy of HEAD. The owner states that the relevant content is authorized. Do not add a new rights-verification gate, allowlist, bypass toggle, or always-success validator.

Before editing, read the repository AGENTS.md and GEMINI.md, then read the entire package in README reading order: SPEC, INVENTORY, EXECUTION_PLAN, TEST_MATRIX, DATA_RUNBOOK, ACCEPTANCE, and execution status/evidence. Read each phase completely before executing it. These documents are the intended design; validate their assumptions against current source. Do not stop merely to write another high-level plan.

Execute P0 through P6 sequentially with red-green tests and a diff review at each gate. Use CodeGraph before grep/file discovery while the repository has .codegraph. Preserve all pre-existing modified and untracked work. Compare the planning snapshot against current files; if another task changed an overlapping responsibility and you cannot safely integrate, report the exact conflict instead of overwriting it. No parallel editors without my explicit approval.

CRITICAL FIRST STEP: the existing episodeCopyrightRemediation.test.ts reads a real sibling channel directory and writes its quiz/qa.json. Isolate it and inspect comparable test I/O before running the full suite. All automated tests must use temporary repositories and injected providers, without live account/data writes or paid calls.

Remove all LOCAL copyright/trademark keyword rejection and warnings, forced generic-subject substitution, copyright prompt instructions, and dead rule/classifier structures. Cover generation, QA, bank batches, image prompts, thumbnails, provider recovery, knowledge metadata, API reports, UI copy, CLI logs, shared rules, and active templates. Preserve schema/factual/source/duplicate/quality checks, child-appropriate non-IP safety, auth, path safety, cancellation, timeouts, provenance, license records, and source credits.

Do not attempt to remove or evade external provider restrictions. Content-filter rejection must remain an accurate failure, not trigger identity-changing automatic rewriting, visual-bible writeback, or fake success. Keep legitimate transient-error recovery bounded.

Verify cache reuse beyond just a version bump: current code can accept a stale fingerprint if a file exists and can label old automatic bundle copies as explicit_episode. Test identity freshness, provider/style consistency, and preservation of actually selected/curated assets.

Implement the metadata migration with dry-run by default, exact-root validation, hashes, backups, a recoverable journal, atomic file replacement, idempotence, and conflict-safe rollback. Rehearse on synthetic/copied test fixtures only. Do not automatically approve historical failures or regenerate media.

Ask me before applying a migration to live storage, restarting a non-task-owned process, making paid provider calls, bulk regeneration, changing a contract used by a discovered external client, or deleting unrelated data. Show exact targets, cost/impact, and rollback first. These approval boundaries do not prevent finishing code and isolated verification.

Keep code, filenames, docs, UI, logs, and commit messages in English; communicate progress with me in Vietnamese. Preserve the existing footer because this upgrade does not require changing it. Follow structured color-coded logging and do not use OS mouse/keyboard/clipboard automation.

After every phase, update execution/STATUS.md and execution/EVIDENCE.md with actual commands, results, changed files, and the next exact action. Never mark VERIFIED without fresh evidence. If interrupted, leave a precise resume checkpoint. Do not stash/reset/clean the workspace, stage everything, commit, or push without my approval.

Before handoff, run the required typecheck, tests, lint, format check, build, repository audit, residual-policy scan, migration rehearsal/rollback, updated batch CLI, and the primary workflow in a rebuilt/restarted isolated application. Check desktop/mobile, pending/success/error/retry/reconnect/out-of-order states and automatic view refresh. Report pre-existing failures and unverified boundaries honestly.

Deliver the completed ACCEPTANCE checklist, exact verification evidence, task-only change summary, retired structures, preserved safeguards, migration results, and live rollout status. Do not call the entire live system upgraded if live data/deployment was not applied. Begin with P0 now.
```
