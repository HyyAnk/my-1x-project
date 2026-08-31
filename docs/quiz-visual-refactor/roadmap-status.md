# Quiz Visual Refactor Roadmap Status

Last dossier verification: 2026-08-31

Phase 2 started from a clean worktree on branch main at commit `595fc3fef332c80bfb511d72dd3c2514d3ce6be4`. The implementation and handoff remain uncommitted; a fresh task must replace this observation with its own git evidence.

Latest Phase 1 execution evidence: detached HEAD at `fd8e877677dc8ff444c3e0b70d0f5aee5f4c9e58`; see
`handoffs/phase-01-2026-08-31-complete.md`. The deterministic BGM fixture repair and authorized formatting
cleanup restored every required workspace gate without changing production behavior.

Latest Phase 2 execution evidence: branch main at `595fc3fef332c80bfb511d72dd3c2514d3ce6be4`; see `handoffs/phase-02-2026-08-31.md`. The typed layout capability policy, consumer migration, targeted suites, and every workspace gate pass.

Latest Phase 3 execution evidence: branch main at the same uncommitted Phase 2 HEAD; see `handoffs/phase-03-2026-08-31.md`. Both composition surfaces now use one normalized scene model and semantic-part builder while timeline, layout slots, choice markup, CSS, and backgrounds remain compatibility-owned.

Latest Phase 4 execution evidence: branch main at the same uncommitted Phase 2–3 HEAD; see `handoffs/phase-04-2026-08-31.md`. Production and Sandbox now use one semantic choice renderer, every Answer Card skin supports text and visual content, all active layouts consume one `choicesHtml` slot, and the Phase 4 legacy adapters are removed.

Latest Phase 5 execution evidence: branch main at the same uncommitted Phase 2–4 HEAD; see `handoffs/phase-05-2026-08-31.md`. CSS ownership boundaries (Layout, Base Component, State, Typography, Skin, Palette Tokens) are established, pure style-resolution policy and palette token serializers in `@studio/shared` are shared across production and preview, zero `!important` in normal cascade, and all 23 Phase 5 matrix cases pass.

Latest Pre-Phase 5 Bundle Hygiene maintenance note: uncommitted maintenance task resolved the >500 kB Vite production chunk warning via route-level code splitting (`DashboardView`, `ChannelsView`, `MascotStudioView`, `TasksView`, `SettingsView`, `AppModals`) and React vendor chunking (`vendor-react`). The initial entry chunk dropped from 1,018.31 kB to 313.99 kB (88.89 kB gzip), every emitted chunk is under 500 kB with zero Vite chunk warnings, and all workspace gates pass. Phase 5 is `COMPLETE`.

Latest Phase 8A execution evidence: branch main at the same cumulative uncommitted HEAD; see `handoffs/phase-08a-2026-08-31.md`. Explicit render style context now preserves Theme/Channel/Episode/Beat boundaries through production, background and transition resolution are correct, Channel/Episode persistence contracts are repaired, all 600 unit/integration tests and 11 E2E tests pass, and the pre-8B lint/format/ResizeObserver cleanup is complete.

Latest Phase 8B execution evidence: branch main at the same cumulative uncommitted HEAD; see `handoffs/phase-08b-2026-08-31.md`. All eight boundary cases have deterministic executable evidence through the real video runner, renderer/composition, HTTP/repository persistence, invalidation, and preview paths. Residual brand-provenance and style-only invalidation defects are fixed at their owning boundaries; all workspace gates pass.

Latest Phase 8C execution evidence: branch main at the same cumulative uncommitted HEAD; see `handoffs/phase-08c-2026-08-31.md`. Production and Sandbox emit one canonical semantic background layer, composition CSS includes only selected variants, the 16-case artifact matrix was browser-inspected and manually reviewed, and the real running UI passes async, responsive, footer, keyboard, touch, reduced-motion, and Channel synchronization checks.

Latest Phase 8D execution evidence: branch main at the same cumulative uncommitted HEAD; see `handoffs/phase-08d-2026-08-31.md`. The caller-free background adapter and dead CSS export are removed, the shared capability catalog is the only dimensions owner, no mechanical module split was justified, all 615 unit/integration tests and 12 E2E tests pass, and the 16-case visual matrix was regenerated and inspected after cleanup.

## Repository-state warning

At dossier creation, these pre-existing working-tree changes were present and were not owned by the dossier task:

- apps/server/src/tasks/video/videoLayoutChecker.ts
- apps/server/src/tasks/videoRunner.ts

Final dossier verification also observed these additional modified paths outside the dossier scope:

- apps/server/src/quiz/visual/candyArcade.ts
- apps/server/test/mascotStudio.test.ts
- apps/server/test/videoLayoutChecker.test.ts
- apps/web/src/features/sandbox/hooks/useSandboxPresets.ts
- eslint-suppressions.json

All were left untouched. This is only a dated observation; the fresh task must treat its own starting `git status` as authoritative because the working tree may change again.

The Phase 2 task started with no dirty paths. Its current working-tree changes are Phase-owned and listed in the dated handoff.

Phase 3 started from that complete but uncommitted Phase 2 working tree. Phase 3-owned additions and overlaps are listed separately in its dated handoff; no Phase 2 path was reverted.

Phase 4 started from the complete but uncommitted Phase 2–3 working tree. Phase 4-owned additions, removals, overlaps, and visual artifacts are listed in its dated handoff; no prior-phase or unrelated path was reverted or staged.

Phase 5 started from the complete but uncommitted Phase 2–4 working tree. Phase 5-owned additions, boundaries, pure style-resolution policy, and test suites are listed in its dated handoff; no prior-phase or unrelated path was reverted or staged.

A fresh task must run git status. It must not revert, overwrite, stage, or include unrelated user changes.

## Planning asset status

Execution briefs, matrices, prompts, and handoff contracts exist for the seven core phases and Phase 8 stabilization. Their existence does not make a phase implementation-ready: only the dependency status and latest factual handoff can move a phase to `READY`.

## Phase status

| Phase                                  | Outcome                                                        | Dependency           | Status   |
| -------------------------------------- | -------------------------------------------------------------- | -------------------- | -------- |
| 1. Characterization baseline           | Executable evidence for current contracts and divergences      | Dossier ready        | COMPLETE |
| 2. Layout capability contract          | Catalog-driven compatibility and metrics                       | Phase 1 complete     | COMPLETE |
| 3. Shared scene pipeline               | One render model and scene-part builder for Sandbox/production | Phase 2 complete     | COMPLETE |
| 4. Unified choice rendering            | One text/visual choice renderer and unified slots              | Phase 3 complete     | COMPLETE |
| 5. CSS ownership and preset resolution | Layout/base/skin/token boundaries and shared precedence        | Phase 4 complete     | COMPLETE |
| 6. New layouts and scalable UI         | Add two explicit 2/3-choice proof layouts and scalable UI      | Phase 5 complete     | COMPLETE |
| 7. Background registry                 | Shared deterministic backgrounds with compatibility default    | Phase 6 complete     | COMPLETE |
| 8A. Production contract stabilization  | Preserve style layers and persistence through production       | Phase 7 complete     | COMPLETE |
| 8B. Boundary integration tests         | Prove production, persistence, and preview boundaries          | Phase 8A complete    | COMPLETE |
| 8C. Production/Sandbox parity          | Semantic/CSS parity and inspected visual/browser evidence      | Phase 8B complete    | COMPLETE |
| 8D. Cleanup and acceptance closure     | Remove bounded debt and close executable acceptance            | Phase 8C complete    | COMPLETE |
| Separate project: four choices         | Domain, generation, timing, history, UI, and 2x2 layouts       | Core refactor stable | DEFERRED |

## Latest Phase 1 status

- Handoff: `handoffs/phase-01-2026-08-31-complete.md`
- Outcome: `COMPLETE`
- Characterization: all matrix cases have executable or record-only evidence; targeted server and web suites pass.
- Workspace gates: format, lint, typecheck, build, full tests, choice audit, and dossier formatting pass.
- Phase 2: `READY`.

## Latest Phase 2 status

- Handoff: `handoffs/phase-02-2026-08-31.md`
- Outcome: `COMPLETE`
- Capability contract: one shared catalog and pure policy own compatibility, auto/explicit resolution, and render/asset metrics.
- Consumer migration: Director, QA, renderer registry, optimizer/asset preparation, Sandbox/API, Episode Preview, and web metadata use the policy.
- Verification: targeted server 87/87, targeted web 17/17, workspace server 431/431, workspace web 57/57, and all format/lint/type/build/audit gates pass.
- Phase 3: `READY`.

## Latest Phase 3 status

- Handoff: `handoffs/phase-03-2026-08-31.md`
- Outcome: `COMPLETE`
- Shared pipeline: production and Sandbox call the same normalized model builder and semantic-part builder through separate state/surface adapters.
- Compatibility boundaries: current choice rendering and split slots remain isolated for Phase 4; legacy background assembly remains isolated for Phase 7.
- Verification: targeted server 103/103, targeted web 17/17, workspace server 447/447, workspace web 57/57, and all format/lint/type/build/audit gates pass.
- Phase 4: `READY`.

## Latest Phase 4 status

- Handoff: `handoffs/phase-04-2026-08-31.md`
- Outcome: `COMPLETE`
- Unified renderer: canonical-ID correctness, normalized ordering, labels, phase states, escaping, tiers, accessibility, and deterministic media fallback have one owner shared by production and Sandbox.
- Skin and slots: all four registered skins support text and visual content through bounded hooks; baseline and both production layouts consume one `choicesHtml` slot; both Phase 4 compatibility adapters and old dual exports are gone.
- Verification: targeted server 114/114, targeted web 17/17, workspace server 458/458, workspace web 57/57, every format/lint/type/build/audit gate, and the reviewed 16:9 plus authoritative full-canvas 9:16 artifact set pass.
- Phase 5: `READY`.

## Latest Phase 5 status

- Handoff: `handoffs/phase-05-2026-08-31.md`
- Outcome: `COMPLETE`
- CSS ownership boundaries: Layout, Base Component, State, Typography, Skin, and Palette Tokens cleanly isolated per ADR-003. Layout CSS publishes capacity custom properties without selector bleed into skin classes; skins own decorations without outer layout placement; zero `!important` in normal cascade.
- Style resolution: Shared pure `resolveQuizStyle` / `resolveBeatQuizStyle` policy and token serializers in `@studio/shared` enforce strict precedence (`Theme < Channel < Preset/Episode < Override < Beat`) with deterministic `auto` inheritance. Visual preset `preview_layout_id` (and legacy `layout_id` adapter) restricted to Sandbox showcase; production layouts remain question-driven per ADR-001.
- Verification: targeted server 27/27 Phase 5 tests, workspace server 485/485, workspace web 67/67, and all format/lint/type/build/audit gates pass.
- Phase 6: `READY`.

## Latest Phase 6 status

- Handoff: `handoffs/phase-06-2026-08-31.md`
- Outcome: `COMPLETE`
- New Layout Proofs: `media_top_choices_bottom` and `full_stack_list` implemented and verified for 2 and 3 choices. ADR-006 explicit-only policy enforced in `resolveQuizLayout` (auto candidates unchanged). Both layout renderers use unified slot contracts and Phase 5 capacity custom properties.
- Scalable UI: Visual Sandbox layout selector refactored into a scalable, accessible, keyboard-navigable combobox control with ARIA support, immediate local acknowledgement, latest-request-wins race protection, and mobile responsive fit.
- Verification: 23/23 Phase 6 matrix tests pass, 3/3 Sandbox layout selector web tests pass, 578/578 workspace tests pass, and all format/lint/type/build/audit gates pass.
- Phase 7: `COMPLETE`.

## Latest Phase 7 status

- Handoff: `handoffs/phase-07-2026-08-31.md`
- Outcome: `COMPLETE`
- Background Variant Registry: Typed, deterministic registry shared between production and Sandbox per ADR-004. Legacy background extracted to compatibility default `candy_rays`. Added proof animated variant `aurora_glow` using pure GPU transforms, deterministic phase calculation (`questionIndex` / `ambientPhaseSeconds`), and static reduced-motion styles.
- Style Integration: Pure resolution policy (`Theme < Channel < Preset/Episode < Override < Beat`) without migration for legacy records. Visual presets, Visual Sandbox design tab, preset modal, channel sync, and Episode Customization Bar fully integrated.
- Verification: 16/16 Phase 7 matrix tests pass, 2/2 background UI web tests pass, 594/594 full workspace tests pass, and all format/lint/type/build/audit gates pass.
- Core 7-Phase Refactor: `COMPLETE`. Separate four-choice project remains `DEFERRED`.

## Latest Phase 8 status

- Shared brief and matrix: `phases/phase-08-end-to-end-stabilization.md` and `phases/phase-08-test-matrix.md`.
- Phase 8A handoff: `handoffs/phase-08a-2026-08-31.md`.
- Phase 8A outcome: `COMPLETE`.
- Production contracts: explicit style context, production background propagation, resolved next-scene transition palette, Channel Answer Card/Background persistence, and Episode inheritance/invalidation are implemented.
- Repository hygiene: root lint, format, typecheck, tests, build, E2E, structure analysis, and diff checks pass; the JSDOM `ResizeObserver` false-positive is removed.
- Phase 8B handoff: `handoffs/phase-08b-2026-08-31.md`.
- Phase 8B outcome: `COMPLETE`; all `P8B-BND-01` through `P8B-BND-08` cases pass through production-adjacent boundaries with local deterministic fixtures.
- Phase 8C handoff: `handoffs/phase-08c-2026-08-31.md`.
- Phase 8C outcome: `COMPLETE`; every `P8C-PAR-*`, `P8C-VIS-*`, `P8C-UI-01`, `P8C-ASY-01`, `P8C-A11Y-01`, and `P8C-E2E-01` case passes with executable or inspected visual evidence of the required type.
- Phase 8D handoff: `handoffs/phase-08d-2026-08-31.md`.
- Phase 8D outcome: `COMPLETE`; every `P8D-DEAD-01` through `P8D-CLOSE-01` case passes with executable, structural, repository, and dossier evidence.
- Phase 8 outcome: `COMPLETE`; the separate four-choice project remains `DEFERRED`.

## Phase 1 exit gate

Phase 1 can become COMPLETE only when:

- the active test matrix has executable coverage or a recorded evidence-based reason for omission;
- no production behavior has been intentionally changed;
- targeted server and web suites pass;
- all applicable workspace gates in `verification-runbook.md` pass;
- current Sandbox and production composition workflows have been rerun through their updated test surfaces;
- the Phase 1 handoff record lists files, commands, results, deviations, and remaining risks;
- this roadmap reflects the final repository state.

## Status update protocol

When starting a phase:

1. Confirm the latest preceding non-template handoff reports COMPLETE and next-phase readiness.
2. Record current branch, HEAD, and git status.
3. Change only that phase from READY to IN_PROGRESS.
4. Do not advance dependent phases.

When completing a phase:

1. Attach or link the handoff record.
2. Record verification commands and results.
3. Update As-Is facts affected by the phase.
4. Add or supersede ADRs for material decisions.
5. Mark the phase COMPLETE and the next dependency-satisfied phase READY.

After Phase 7, the core refactor remains complete, but do not call end-to-end stabilization complete until Phase 8D has passed and its dated handoff closes the matrix. Keep the separate four-choice project DEFERRED until it receives its own approved plan.

When blocked:

- keep evidence and partial work explicit;
- mark BLOCKED only when the task cannot make meaningful progress without new authority or input;
- do not mark later phases ready.

When handing off partial but resumable work, keep the same phase `IN_PROGRESS`, write a `PARTIAL` dated handoff, and resume with the same phase prompt. Never unlock the next phase from partial evidence.
