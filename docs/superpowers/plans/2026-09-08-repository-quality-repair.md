# Repository Quality Repair Implementation Plan

> For agentic workers: use test-driven repair and scoped execution checkpoints. Parent owns integration; assigned Luna workers report to this task.

**Goal:** Eliminate all errors reported by repository lint and format gates without reducing coverage or hiding errors, preserving product behavior.

**Architecture:** Five disjoint implementation slices on the current main checkout. Parent fixes lint-project discovery, coordinates exclusive zones and final freeze/release, reviews returned diffs, and assigns further bounded repairs until all gates pass.

**Tech Stack:** TypeScript, React, Fastify, Zod, ESLint, Prettier, Vitest, Playwright, authenticated coordination CLI.

**Spec:** Explicit user request dated 2026-09-08 for a separate all-errors remediation campaign with gpt-5.6-luna workers and parent final control.

## Global Constraints

- Preserve all pre-existing dirty work and public contracts. No commits, branches, worktrees, provider charges, Flow actions or runtime-data cleanup.
- No added suppressions, skipped tests, disabled rules, relaxed thresholds or baseline updates to make failures disappear.
- Every writer captures baseline and claims concrete comma-separated paths; exclusive zones may require sequencing.
- Inspect CodeGraph before source searches. Read current instructions and coordination docs.
- Behavioral fixes require a failing regression first; type/format-only changes require narrow lint and consumer verification.
- Max two test workers per agent; no full test/build concurrently. Parent schedules final integrated checks.
- English repository artifacts; leave existing footer conflict unchanged.

## Task 1: Typed Lint Coverage

Owner: parent plus shared worker, disjoint files.

- Parent modifies eslint.config.mjs: replace packages/_/tsconfig.json with packages/_/tsconfig.eslint.json in parser project discovery.
- Shared worker creates packages/shared/tsconfig.eslint.json extending tsconfig.json, noEmit true, rootDir ../.., includes src/**/\*.ts and test/**/*.ts.
- Red evidence: pnpm exec eslint packages/shared/test/shortReel.test.ts fails because the test is absent from parser projects.
- Verify parser errors disappear and genuine typed rule findings remain visible. Do not change production build inclusion.
- Review resulting errors across shared tests; shared worker fixes them.

## Task 2: Web

Owner: Kuhn, gpt-5.6-luna high.
Files: discovered concrete failing paths only beneath apps/web/src and apps/web/test; no configs or other workers' paths.

- Capture scoped ESLint and format diagnostics.
- Group unused bindings, unsafe typing, promises, casts and complexity by feature.
- Claim exact files before editing; extract cohesive functions only for actual complexity.
- Run scoped lint, format and affected component/hook tests.
- Record complete changed files, evidence and unresolved findings in lint-repair-web-20260908.md handoff.

## Task 3: Server Tests

Owner: Rawls, gpt-5.6-luna high.
Files: discovered concrete paths beneath apps/server/test only.

- Replace unsafe fixture/response casts with schemas and explicit contracts.
- Await real asynchronous work/teardown; preserve assertions and tested failure paths.
- Do not change production functions; request changes through parent.
- Run focused tests and lint; document in lint-repair-server-tests-20260908.md.

## Task 4: Server Source

Owner: Boyle, gpt-5.6-luna high.
Files: discovered concrete paths beneath apps/server/src only.

- Fix unsafe boundaries and unused code; preserve error causes and safe transport errors.
- Extract coherent responsibilities for complexity violations.
- Request test edits via parent/server-test owner, not overlapping writes.
- Verify focused tests and lint; document in lint-repair-server-source-20260908.md.

## Task 5: Shared Contracts

Owner: Chandrasekhar, gpt-5.6-luna high.
Files: packages/shared/src, packages/shared/test and dedicated ESLint tsconfig, concrete claim required.

- Preserve public schemas, literal values and runtime validation.
- Fix casts, unused imports and test typing; format exact scope.
- Run explicit node --import tsx --test shared suites.
- Report in lint-repair-shared-20260908.md.

## Task 6: Tooling

Owner: Pasteur, gpt-5.6-luna high.
Files: scripts, concrete claims; do not change lint/suppression/baseline configs.

- Parent releases agent-coordination setup claim before worker writes exclusive zone.
- Fix duplicate keys, unused state, caught errors and async handling preserving coordination authentication.
- Run corresponding CLI/coordination tests.
- Report in lint-repair-tooling-20260908.md.

## Task 7: Integration And Remaining Errors

Owner: parent.

- Compare actual diffs and claims to reports; inspect behavior-affecting edits and reject type escapes or suppressed errors.
- Freeze writes briefly to serialize claim verification/release. Handle legitimate concurrent drift with authenticated rebaseline.
- Run pnpm lint, pnpm format:check, pnpm typecheck, pnpm test, pnpm build and explicit shared tests.
- Run browser and visual workflows against isolated storage, mock providers only.
- Run zone validation and git diff --check.
- Assign any remaining errors, including files outside first-wave slices, to a new exact scoped repair; repeat verification until zero failures.
- Do not claim completion while any required gate fails, any worker claim remains active/unverified, or introduced regression remains.
- Record final integration evidence and release. Phase 08 manual Flow/final user acceptance remains a separate gate.

## Progress

- Initial known baseline: over 1,000 lint findings; formatting failures; five shared tests excluded from parser projects.
- Five Luna workers dispatched; current exact diagnostics are being collected in each slice.
- Implementation and final acceptance are not yet complete.
