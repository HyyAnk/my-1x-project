# Quiz V1 Retirement Handoff

Prepared: 2026-09-11

Status: proposed implementation package, not an implemented upgrade. The owner requested this package for Antigravity. Sending the kickoff prompt authorizes the scoped implementation; material scope changes require an explicit owner decision.

## Outcome

Use one V2 quiz renderer and one quiz-native production pipeline. Remove the V1 scene renderer, its re-render fallback, redundant composition wrappers and alias, and the optional legacy narrative pipeline. Preserve existing V2 output and existing stored videos.

This is a deliberate removal of V1 rendering support, not a migration of stored content and not a redesign of layouts.

## Read order

1. [Scope and design contract](SPEC.md)
2. [Verified code inventory](INVENTORY.md)
3. [Data safety and rollout](DATA_RUNBOOK.md)
4. [Task-by-task implementation plan](EXECUTION_PLAN.md)
5. [Tests and verification commands](TEST_MATRIX.md)
6. [Acceptance checklist](ACCEPTANCE.md)
7. [Execution status](execution/STATUS.md) and [evidence ledger](execution/EVIDENCE.md)
8. [Antigravity kickoff prompt](START_ANTIGRAVITY.md)

## Decisions already made for this proposal

- No V1 renderer, no legacy renderer switch, no replacement compatibility wrapper.
- Rendering requires all five validated V2 artifacts even when an episode already has a video.
- Missing artifacts produce `QUIZ_V2_REQUIRED`; malformed artifacts retain `QUIZ_ARTIFACT_INVALID`.
- The old `USE_LEGACY_QUIZ_PIPELINE` environment variable has no effect after removal.
- The production renderer calls `buildCandyArcadeCompositionBundle` directly.
- The complete bundle is the production output: root HTML, mounted composition files, and transition instances.
- Eight production layouts and the preview `baseline` remain intact.
- No live-data mutation, provider calls, dependency upgrades, broad refactoring, staging, or commits are authorized by this package.
- Verification includes a real local render in isolated test storage, not merely HTML-string tests.

## Scope safety

The working tree was already dirty during planning, including render, layout, transition, mascot, and documentation changes. Those changes are owned by the user or other work. Do not revert them, replace files with old `HEAD` copies, or stage them with this task.

Read the current source before every edit. Use CodeGraph first while `.codegraph/` exists. Line numbers in the inventory are navigation hints from planning, not patch coordinates.

All repository files, examples, tests, messages, and documentation must be English-only. This task changes no page layout or footer and must not burn dashboard credits into video frames.

## Evidence available at handoff

Seven focused test files passed, 28 tests total, on 2026-09-11. The configured storage inspected in the preceding review contained one episode with five valid V2 artifacts and a version-2 render manifest. This is a local snapshot, not a guarantee about other installations or future data.

No implementation, full build, full test suite, browser review, or new video render was performed while preparing this package. Antigravity must repeat the baseline and complete the execution gates.
