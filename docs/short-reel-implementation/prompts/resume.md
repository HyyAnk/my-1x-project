# Resume Short-Reel Work Safely

Work in `D:\1a Cursor Project\My 1x Project` or its actual mounted repository root. Resume the current unfinished Short-Reel phase without assuming access to previous chat history or lease tokens.

Read AGENTS.md and coordination source documents, then `docs/short-reel-implementation/README.md`, agent-runbook.md, progress.md, roadmap.md, decisions.md, specification.md and contracts.md. Inspect the most recent Short-Reel evidence/handoff and current repository status.

Determine the lowest unfinished phase whose predecessors are accepted. If the immediately preceding phase only needs review, follow prompts/reviewer.md before resuming implementation. If progress is inconsistent, compare actual files, test evidence and registry release records; do not simply reset status.

Query `node scripts/agent-status.mjs --json` and capture `git status --porcelain`. An active claim with a token unavailable to this session must be handled through documented recovery/integrator intervention. Never guess a token, scrape token hashes, overwrite an active claim or recreate one to hide drift.

Once ownership is safe, read and follow the exact `prompts/NN-phase-name.md` and corresponding phase file selected from roadmap.md. Those prompts authorize only the selected phase. Reuse completed tested slices, rerun stale checks and repair current-phase defects; do not restart the project or revert unrelated dirty work.

If all technical phases are complete but manual Flow/user acceptance is pending, report the precise outstanding checklist and wait for user-provided results. Do not fabricate acceptance or start unrelated improvements.

Write current evidence and a unique handoff, update progress under a concrete claim, verify/release and report the next action. No unsolicited branches, commits, agent spawning, Flow automation, data cleanup outside Phase 07 or deletion/archive of this folder.
