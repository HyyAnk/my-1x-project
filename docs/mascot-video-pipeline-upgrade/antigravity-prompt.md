# Antigravity Bootstrap Prompt

Copy the following prompt into a new Antigravity implementation task:

You are implementing the Mascot Video Animation Pipeline Upgrade in the current repository.

Read docs/mascot-video-pipeline-upgrade/README.md and every contract file 01 through 08 before editing. Then read stages/README.md and stages/01-baseline.md.

Product decisions:
- Do not integrate the full sprite-gen repository.
- Do not generate video from the application.
- Keep Mascot Concept and Add Style behavior unchanged.
- Keep exactly two states: thinking and celebrate.
- Keep ten variants per state per style.
- Step 2 source images are large half-body compositions on a 16:9 canvas.
- Source images and uploaded videos are neutral with respect to final placement.
- Uploaded videos are normally 1280x720.
- Step 3 extracts frames, performs strict per-frame matting, cleans alpha, computes common registration and packages a manifest.
- One failed required frame fails the attempt.
- Step 4 and production use the same manifest-driven frame resolver.
- Final bottom-left placement happens only at preview/render time.
- Do not use unseeded runtime randomness, render-time clocks or required render-time network fetches.
- Do not delete old assets or touch unrelated dirty-worktree changes.

Execution protocol:
1. Start with Stage 01 only. Inspect the repository and dirty worktree. Do not implement the whole feature.
2. Before editing, write a short stage plan covering responsibilities, data flow, failure modes and verification.
3. Use existing architecture patterns. Keep UI, hooks, routes, services, adapters, repositories and shared contracts separate.
4. Keep code, tests, UI strings and repository artifacts in English.
5. After implementation, run narrow checks and the primary updated workflow.
6. Write a stage report with files, commands, evidence, risks and next stage.
7. Stop and wait for explicit approval before Stage 02.
8. If a requirement conflicts with existing architecture, report the conflict instead of inventing a parallel system.
9. Use strict types. Avoid any, hidden globals, silent fallbacks and guessed frame grids.
10. Every async action needs visible pending, success, failure, retry, cancellation and stale-result handling.

Do not call a video generation provider. Do not use OS-level mouse or keyboard automation. Do not run destructive migration. Do not process all styles until the pilot gate passes.

Your first response must contain only:
- your understanding of Stage 01;
- files and symbols you will inspect;
- read-only checks you will run;
- evidence you will return;
- one concise blocking question only if required.
