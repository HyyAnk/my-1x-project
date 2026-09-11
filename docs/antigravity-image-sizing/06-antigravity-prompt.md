# Antigravity Kickoff Prompt

Copy the following prompt into Antigravity in this repository.

```text
Implement the layout-driven image sizing correction in:
D:\1a Cursor Project\My 1x Project

Read AGENTS.md and the complete handoff packet at:
docs/antigravity-image-sizing/README.md

Follow its read order and implement all eight tasks in 04-implementation-plan.md, using 01-design-contract.md and 02-sizing-contract.md as the design authority and 05-acceptance.md as the completion gate. This prompt approves that scoped implementation; do not stop after writing another plan.

Start by reporting the implementation sequence and inspecting the live working tree. There are extensive pre-existing, uncommitted edits, including the layout and provider files involved here. Preserve them, re-read current code, and use CodeGraph before locating/reading code when available. Do not reset, broadly stage, commit, upgrade dependencies, or re-run the older layout/transition migration packets.

The objective is real shared sizing, not changing sample labels: extract canonical inner image-slot geometry, derive the supported ratio and recommended raster size deterministically, and use the same contract in renderer CSS, Visual Sandbox specimens/details, Episode planning/prompts, provider request construction, actual-output validation, and render optimization/cache identity.

Preserve current frame/card geometry and timing. Under the recorded geometry, Visual Card selects 4:3, Pure Visual Cards selects 1:1, and Split Versus visual mode selects 16:9. Do not force Pure Visual Cards to 3:4 or reshape it to fit an assumed ratio. Include all eight active landscape layouts and actual media roles; text-only paths must not generate unused images. Resolve auto layouts before planning.

Handle legacy plans, wrong-ratio provider bytes, explicit user-selected images, partial failures, stale asynchronous results, and optimizer cache invalidation exactly as the packet specifies. Viewing a page or changing Sandbox layout must never generate images. Preserve original media and user selections. Use existing confirmation mechanisms before newly billable legacy replacements.

Use red-green tests, actual headless-browser measurements, intercepted HTTP payload tests, and isolated fixture Episodes. No live paid API calls, real Episode migrations, publishing, or cloud rendering are authorized for verification. Render and inspect a real local MP4 through the production composition path with local diagnostic image fixtures. Restart/rebuild affected app processes and verify the latest UI at desktop and mobile widths; do not claim completion from edits/build/tests alone.

Keep new code, comments, test data, documentation, and visible UI copy English. Keep responsibilities separated and avoid enlarging existing god files. Owner-facing status may be Vietnamese. Send concise progress updates at task checkpoints.

Write evidence and the final report under docs/antigravity-image-sizing/evidence/, preserving baseline-measurements.json. Include before/after dimensions and ratios, provider payload captures, actual image metadata, commands/results, screenshots, the MP4 path, and any remaining blockers. Explicitly distinguish mocked provider verification from a live paid-provider test. Ask the owner before any material deviation, destructive action, or new spending; otherwise proceed through the scoped implementation and verification.
```
