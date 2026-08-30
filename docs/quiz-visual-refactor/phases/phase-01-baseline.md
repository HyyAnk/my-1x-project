# Phase 1 Execution Brief: Characterization Baseline

Status: COMPLETE; see `../handoffs/phase-01-2026-08-31-complete.md`

## Goal

Create a deterministic, reviewable baseline for current quiz layout, choice, style, phase, aspect-ratio, mascot, and preview behavior. Phase 1 must make later refactors safer without intentionally changing production behavior.

## User-visible outcome

There should be no intentional visual or interaction change. The deliverable is executable evidence: focused tests, reusable fixtures or snapshots where justified, and a completed handoff that states exactly what current behavior is protected or intentionally documented as a divergence.

## Prerequisites

- Read every document listed in the dossier README Start here section.
- Follow `phase-execution-protocol.md`.
- Check branch, HEAD, and git status.
- Preserve pre-existing user changes.
- Use CodeGraph before grep or direct file reads when .codegraph exists.
- Confirm the current choice-count and layout catalogs still match the As-Is map.

## In scope

1. Inventory existing coverage before adding tests.
2. Add the smallest cohesive characterization tests needed to cover the mandatory cases in phase-01-test-matrix.md.
3. Prefer public functions and observable output over private implementation details.
4. Reuse current quiz, director, mascot, and preview fixtures where they fit.
5. Add focused fixture builders only when they remove repeated setup across multiple cases.
6. Record current Sandbox/production differences explicitly.
7. Record repository baseline and all verification results in a Phase 1 handoff file.
8. Update roadmap-status.md when work starts and completes.

## Out of scope

- No new layout IDs.
- No changes to choice-count schemas or prompts.
- No layout capability resolver.
- No unified scene model.
- No unified choice renderer or slot migration.
- No production/Sandbox parity fix.
- No CSS ownership refactor.
- No new preset or style resolver.
- No background registry.
- No UI redesign.
- No broad snapshot rewrite.

If a production change appears necessary merely to make current behavior testable, first look for an existing public seam. If no safe seam exists, record the blocker and request a scope decision rather than introducing a new production abstraction during Phase 1.

## Required deliverables

### Server characterization

- Current format-specific choice counts and fourth-choice rejection.
- Layout registry versus production catalog exhaustiveness.
- Auto and explicit layout resolution behavior.
- Slot selection for baseline, media-left, and visual-three layouts.
- Production text-choice default path versus explicit variant path.
- Production visual-choice independence from selected Answer Card skin.
- Sandbox text and visual choice behavior across representative phases.
- Explicit Answer Card registry completeness and default resolution.
- Representative 16:9 and 9:16 layout CSS evidence.
- Mascot-on content geometry independence from bottom-left versus bottom-right anchor.
- Current typography tier behavior, including mascot capacity and unused layoutId influence.
- Current fixed/duplicated background-layer observations where a stable assertion is practical.

### Web characterization

- Production layout UI catalog remains exhaustive and unique.
- Director-selected and inferred layouts reach Episode Preview.
- Sandbox design state preserves selected layout and element styles.
- Preview requests carry the latest selected layout and content.
- A superseded async preview response cannot overwrite the newest selection.

### Evidence and documentation

- Map each mandatory test-matrix case to an existing or new test.
- Record any case intentionally supported by structural evidence instead of a new test.
- Create a completed handoff from handoffs/phase-01-handoff-template.md.
- Update As-Is documents only when repository inspection disproves them.

## Test design constraints

- Assert semantics and contracts, not irrelevant whitespace.
- Do not snapshot the entire generated composition when focused assertions can prove the contract.
- Use full snapshots only for stable, intentionally reviewed fragments.
- Do not assert generated CSS comments or formatting unless formatting is itself a required contract.
- Preserve current rejected-input tests; do not weaken them.
- Avoid a full Cartesian product. Use pairwise representative coverage plus exhaustive registry/catalog parity tests.
- Test production and Sandbox through their real public entry points when possible.
- Keep fixtures deterministic; no network, provider, random seed, user repository, or real channel mutation.

## Suggested test organization

Extend nearby tests when the behavior already belongs there. If new cases would make an existing file mixed-responsibility, create focused files such as:

- apps/server/test/quizVisualCharacterization.test.ts
- apps/web/src/features/quizLayouts/quizVisualCharacterization.test.tsx

These names are suggestions, not requirements. Follow the current test organization after inspection.

## Execution outline

1. Mark Phase 1 IN_PROGRESS and record repository state.
2. Map every mandatory matrix case to existing evidence.
3. Run targeted tests before editing to establish the initial baseline.
4. Add only missing characterization coverage.
5. Run targeted tests after each cohesive test group.
6. Run workspace gates and the choice-count audit.
7. Review the diff for accidental source changes and brittle assertions.
8. Complete the handoff and mark Phase 1 COMPLETE only if every exit criterion is satisfied.

## Acceptance criteria

- Every MUST_AUTOMATE case in phase-01-test-matrix.md is covered and passing.
- Every RECORD_ONLY case has precise evidence and a reason it is not an automated invariant.
- No intentional production behavior or persisted schema changed.
- No unrelated user-owned files were modified.
- Targeted server and web suites pass.
- pnpm typecheck passes.
- pnpm build passes.
- pnpm test passes.
- pnpm audit:quiz-choices passes.
- pnpm lint and pnpm format:check pass, or any pre-existing unrelated failure is recorded with evidence.
- Dossier Markdown passes its targeted Prettier check.
- The handoff lists exact commands, results, files, deviations, and unverified items.
- roadmap-status.md and any affected As-Is facts are current.

## Stop rules

Stop and report instead of expanding scope when:

- a required case can only be tested through a material production refactor;
- current code contradicts an accepted ADR in a way that changes the Phase 1 goal;
- existing tests fail before Phase 1 changes and the failure is unrelated;
- pre-existing user changes overlap a file Phase 1 must modify;
- a deterministic baseline cannot be produced without changing runtime behavior.

## Required final report

The task's final response must contain:

- outcome first;
- tests and files added or updated;
- matrix coverage summary;
- exact verification commands and results;
- production behavior confirmation;
- unrelated changes preserved;
- blockers or remaining risks;
- readiness of Phase 2.
