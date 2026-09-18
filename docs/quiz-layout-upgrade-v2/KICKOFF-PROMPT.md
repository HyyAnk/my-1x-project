# Coding agent kickoff prompt

Copy the prompt below into a coding task opened at this repository root.

```text
Implement the complete Quiz Layout Upgrade V2 described in docs/quiz-layout-upgrade-v2/README.md.

This is an implementation request, not another planning-only task. Read the entire handoff package in its prescribed order, especially SCOPE.md, all four specs, data/layout-targets.json, ARCHITECTURE.md, FILE-MAP.md, ROADMAP.md and VERIFICATION.md. Follow all 12 phase documents and keep PROGRESS.md plus evidence/phase-NN.md current.

Preserve the user's existing dirty worktree. Do not reset, stash, overwrite unrelated changes, rewrite historical channel/bank data or regenerate old images. Reinspect source hashes and current files before editing; this plan records the state observed on 2026-09-16 and may need a documented rebase onto newer code.

Implement the exact pixel targets, supported image ratios and the full data-to-render behavior:
- Larger images and detached badges/text surfaces across the specified layouts.
- Fact dock down40px in fact-bearing layouts.
- Split Versus and Verdict without letter badges.
- Mystery only one correct answer throughout schema, generation, persistence, narration, preview and production.
- Mystery stage920x540 with an880x500 slot containing an880x495 image; answer bottom70px above canvas bottom.
- Mystery timer fully disappears, then reveal begins exactly0.5seconds later.
- Mystery retains explanation/fact narration and has no visual fact card.
- New image prompts and provider requests use the computed closest ratio and safe framing.

Use shared typed geometry and focused modules; do not add more responsibilities to oversized files. Keep ordinary multiple-choice/binary flows intact. Do not silently revise numeric targets, hide overflow, fabricate distractors, weaken tests, bypass visual checks or count skipped checks as passed.

After each phase, run the relevant checks and rerun the updated primary workflow. Final completion requires a fresh build/restart, all seven layouts verified in current preview and production paths, temporal Mystery evidence, correct provider request ratios, responsive UI checks and the final requirement-to-evidence matrix. Follow applicable tool/skill approval rules for rendering; if approval, credentials or paid provider usage is required, report the exact pending gate and ask rather than pretending completion.

All repository artifacts and UI text must remain English. Communicate progress to me in Vietnamese. Begin with phase01, proceed in order without unnecessary scope questions, and continue until all authorized implementation and verification work is complete or a concrete external blocker requires my action. Do not create separate user-owned tasks automatically.

At handoff, provide the changed files, commands/results, inspected screenshots/video evidence, deviations, remaining blockers and a concise summary of what is genuinely complete.
```
