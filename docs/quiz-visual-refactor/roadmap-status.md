# Quiz Visual Refactor Roadmap Status

Last dossier verification: 2026-08-31

Documentation baseline observed on branch main at commit fd8e877. Always replace this observation with current git evidence before implementation.

Latest Phase 1 execution evidence: detached HEAD at `fd8e877677dc8ff444c3e0b70d0f5aee5f4c9e58`; see
`handoffs/phase-01-2026-08-31-complete.md`. The deterministic BGM fixture repair and authorized formatting
cleanup restored every required workspace gate without changing production behavior.

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

A fresh task must run git status. It must not revert, overwrite, stage, or include unrelated user changes.

## Planning asset status

Execution briefs, matrices, prompts, and handoff templates exist for all seven phases. Their existence does not make a phase implementation-ready: only the dependency status and latest factual handoff can move a phase to `READY`.

## Phase status

| Phase                                  | Outcome                                                        | Dependency           | Status    |
| -------------------------------------- | -------------------------------------------------------------- | -------------------- | --------- |
| 1. Characterization baseline           | Executable evidence for current contracts and divergences      | Dossier ready        | COMPLETE  |
| 2. Layout capability contract          | Catalog-driven compatibility and metrics                       | Phase 1 complete     | READY     |
| 3. Shared scene pipeline               | One render model and scene-part builder for Sandbox/production | Phase 2 complete     | NOT_READY |
| 4. Unified choice rendering            | One text/visual choice renderer and unified slots              | Phase 3 complete     | NOT_READY |
| 5. CSS ownership and preset resolution | Layout/base/skin/token boundaries and shared precedence        | Phase 4 complete     | NOT_READY |
| 6. New layouts and scalable UI         | Add two explicit 2/3-choice proof layouts and scalable UI      | Phase 5 complete     | NOT_READY |
| 7. Background registry                 | Shared deterministic backgrounds with compatibility default    | Phase 6 complete     | NOT_READY |
| Separate project: four choices         | Domain, generation, timing, history, UI, and 2x2 layouts       | Core refactor stable | DEFERRED  |

## Latest Phase 1 status

- Handoff: `handoffs/phase-01-2026-08-31-complete.md`
- Outcome: `COMPLETE`
- Characterization: all matrix cases have executable or record-only evidence; targeted server and web suites pass.
- Workspace gates: format, lint, typecheck, build, full tests, choice audit, and dossier formatting pass.
- Phase 2: `READY`.

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

After Phase 7, mark the core refactor complete only in its dated handoff and roadmap. Keep the separate four-choice project DEFERRED until it receives its own approved plan.

When blocked:

- keep evidence and partial work explicit;
- mark BLOCKED only when the task cannot make meaningful progress without new authority or input;
- do not mark later phases ready.

When handing off partial but resumable work, keep the same phase `IN_PROGRESS`, write a `PARTIAL` dated handoff, and resume with the same phase prompt. Never unlock the next phase from partial evidence.
