# Phase 12: Regression, runtime restart and final handoff

Status: Complete

## Objective

Prove the integrated upgrade works in fresh preview and production output, then hand off truthful evidence.

Requirements: R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14.

## Dependencies and required reading

Phase 11 gate passed; read its evidence before editing.

- [VERIFICATION.md](../VERIFICATION.md)
- [data/acceptance-cases.json](../data/acceptance-cases.json)
- [PROGRESS.md](../PROGRESS.md)
- [evidence/FINAL-REPORT-TEMPLATE.md](../evidence/FINAL-REPORT-TEMPLATE.md)

## Concrete implementation steps

1. Run the plan validator and all relevant narrow tests, then repository format check, lint, typecheck, tests, audits, ratchet and build. Record baseline-only failures separately without masking new failures.

2. Restart/rebuild the affected server/web processes using the project's normal commands and verify the newly loaded code. Record URLs/build evidence without exposing secrets.

3. Exercise all seven layouts through sandbox and production paths, including 2-answer supported variants, all answer skins, all timer variants and mascot on/off.

4. Capture settled and animated boundary screenshots with fonts/assets loaded. Compare against numeric targets and inspect before/after contact sheets, not only snapshot hashes.

5. Inspect Mystery at exact timer/reveal boundaries and throughout explanation audio. Verify the produced media remains in-frame, single-answer and fact-card-free.

6. Run the actual HyperFrames check via the project wrapper with bypass disabled and nonzero samples. Follow applicable preview/render approval rules before encoding verification video.

7. After permitted local rendering, inspect metadata, duration, a decoded frame sequence and audio timing. A successful build or nonempty MP4 alone does not pass the gate.

8. Update only intentional visual baselines after inspection; rerun visual tests with update mode off. Never add blanket skip/ignore flags or raise diff thresholds to make results green.

9. Review the final diff for misplaced responsibilities, cycles, duplicated numbers, stale CSS branches, unchecked casts and out-of-scope mutations.

10. Complete the requirement-to-evidence matrix and final report. Record any blocked provider/live-render authority or missing environment as an incomplete gate, not success.

## File ownership

Use the qa-area inventory in data/file-manifest.json and the exact commands in VERIFICATION.md.

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [x] All requirements have concrete tests and inspected runtime evidence.
- [x] All numeric and temporal acceptance cases pass; no active Mystery multi-choice path remains.
- [x] No source code change is considered complete without rerunning its primary workflow.
- [x] Only scoped intentional edits were made; no historical user data was migrated/deleted.
- [x] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [x] Updated primary workflow rerun; screenshots/logs point to the current build.
- [x] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

No required implementation or verification work remains. Otherwise report the exact unfinished gate and next action.

## Deliverables

evidence/phase-12.md, final report, test logs, screenshots, approved verification video evidence, completed PROGRESS.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
