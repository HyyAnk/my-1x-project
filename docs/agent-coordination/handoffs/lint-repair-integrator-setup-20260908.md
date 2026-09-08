# Repository Quality Campaign Setup

Date: 2026-09-08. Owner: Codex integrator. Main-direct, dirty baseline preserved.

Five gpt-5.6-luna high workers cover web, server tests, server source, shared and tooling. Parent owns final review and checks. See the repository-quality-repair plan for scope and release sequencing.

Changed files: eslint.config.mjs, the campaign plan and this handoff. Parser discovery now targets dedicated shared lint tsconfig; the shared worker owns its creation. Production builds and lint rules are unchanged. Shared test lint previously failed because test files were excluded from projects. Final verification waits for that tsconfig; no overall passing claim is made.

No branch, commit, deletion, Flow or live provider action. Final lint, format, tests, builds and zone checks remain pending. Do not label the campaign complete based on worker reports alone.
