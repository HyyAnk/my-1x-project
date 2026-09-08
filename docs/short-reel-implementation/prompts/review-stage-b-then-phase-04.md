# Review Stage B and Continue Directly to Phase 04

Work on the actual main checkout of D:/1a Cursor Project/My 1x Project. The user authorizes Phase 04 after Stage B passes its predecessor gate. Do not spawn another agent, create a branch/worktree, commit, or run live Flow.

Read AGENTS.md, coordination source documents, the latest Short-Reel handoff, and the complete required reading list in prompts/04-script-generation.md. Review Stage B Repair 04 against prior findings and actual code, not its success summary. This must be a fresh reviewer session; do not relabel the implementer's self-review.

Start with progress.md, verification/evidence/phase-03-repair-04.md, phase-03-repair-03.md, and phase-03-repair-01-review.md. Check released claims and exact scope. Run the normal focused checks plus:

```powershell
pnpm --filter @studio/web build
pnpm --filter @studio/server exec vitest run test/shortReelBrowserWorkflow.test.ts test/shortReelAssignedPlan.test.ts test/shortReelConfirmationRecovery.test.ts
pnpm --filter @studio/server test -- --maxWorkers=4 --minWorkers=1
pnpm --filter @studio/web test -- --maxWorkers=2 --minWorkers=1
pnpm typecheck
node scripts/agent-validate-zones.mjs --json
git diff --check
```

The browser workflow uses the built frontend, real HTTP routes and filesystem repository under an isolated temporary root. It verifies card confirmation, draft routing, refresh, offline/online recovery, no Episode/task side effects, and title bounds at three widths. Build first. It does not call Flow or generate provider output.

Review remaining correctness boundaries, including source fidelity, assigned-plan propagation/retry, topic projection concurrency, safe errors and input preservation. If a blocking defect exists, record it precisely and stop before Phase 04. Do not invent findings merely because a planned verification case has a different filename.

If Stage B passes, acquire an exact documentation claim, write the review record, update Phase 03 acceptance, verify and release. Then immediately acquire a separate Phase 04 implementation claim and execute prompts/04-script-generation.md completely. Do not stop just to ask whether to start Phase 04: the user already authorized this conditional continuation. Stop after Phase 04 implementation/handoff, not after starting Phase 05. Never grant final project acceptance for the user.
