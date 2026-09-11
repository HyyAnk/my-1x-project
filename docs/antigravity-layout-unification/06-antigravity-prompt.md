# Antigravity Kickoff Prompt

Copy the text below into Antigravity. Sending it authorizes implementation of this packet, not unrelated changes or external publication.

---

Implement the quiz layout unification described in:

`D:\1a Cursor Project\My 1x Project\docs\antigravity-layout-unification\README.md`

Read the complete handoff in its specified order, including `layout-targets.json`, the wireframes, the architecture map, the implementation plan, and acceptance criteria. Treat this as an implementation task, not a request for another generic plan. The source code has not yet been migrated; the packet includes current-renderer evidence and proposed geometry.

Core requirements:

1. On the 1920 x 1080 landscape canvas, use one shared frame for all eight active quiz layouts. Counter Badge, Question Card, Thinking Bar, channel brand with YouTube icon, and Fact Card must have identical anchors across layouts and phases. Preserve their existing visibility semantics.
2. Preserve current reference Counter Badge sizing, the 1420 x 168 Media Left Question Card, and channel-brand component sizing/typography. Do not reskin them.
3. Thinking Bar must match the Media Left reference size, moved DOWN exactly 60 canvas pixels: from `(470,822,1240,84)` to `(470,882,1240,84)`. Keep its selected skin and internal art. Validate the full marker envelope, not only the track.
4. Fact Card uses `(470,846,1240,156)`, the same lower dock center `(1090,924)`, and deterministic text fitting. It must not overlap the timer in time or move with text length.
5. Implement the per-layout Hero Image and Answer Card rectangles, variants, and card internals from `layout-targets.json` and `02-layout-geometry.md`. Preserve layout IDs, valid counts, choice/media semantics, correctness, assets, skins, style revisions, and phase timing. Keep Mystery's reveal layers registered and Clue's existing progression intact.
6. Separate fixed frame geometry from layout content geometry. Do not solve this by copying fixed positions into eight CSS files, adding blanket `!important`, clipping essential content, or bypassing checks. Keep large existing modules thin through focused imports and helpers.
7. Update production, sandbox snapshot, and sandbox rehearsal together. Preserve the public `renderQuizLayoutBody` slot contract and compatibility paths. Do not apply these landscape coordinates to baseline, portrait, Short Reel, intro, or outro.

Execution rules:

- Follow repository `AGENTS.md`; use CodeGraph first when available and indexed. Inspect the current dirty worktree and preserve all unrelated work.
- Work task-by-task through `04-implementation-plan.md`, writing and running failing tests before each behavior change. Use the executing-plans skill if available. Do not create separate user tasks or assume delegation is authorized.
- Do not change dependencies, commit, push, deploy, publish, activate a style revision, or mutate episode data without a separate request. Browser verification must use headless/Playwright/CDP, never OS-level mouse/keyboard/clipboard automation.
- All new or modified artifact content, comments, fixtures, and UI strings must be English.
- Produce separate before/after evidence; preserve the packet's original baseline. Verify real local media, all phases, all valid counts, all built-in element skins, text fitting, mascot collisions, preview refresh/races, and production/preview parity.
- Rebuild/restart the affected process and run the actual updated workflow. Do not claim completion based only on source edits, snapshots, or a successful build.
- Do not replace committed visual baselines until the owner reviews the new captures. Render only local diagnostic fixtures for QA unless separately authorized to render a user episode; no new paid jobs or external uploads.
- If the current reference has materially changed, a preserved skin cannot fit the fixed shell, or a configured mascot collides, show exact measurements and ask one focused question. Do not silently change the five approved anchors or reduce text below the specification.

Start by reporting the scoped files and execution-time baseline, then proceed with the shared-frame contract and its failing tests. Finish with actual measured fixed anchors, before/after captures for all eight layouts, test/build results, diagnostic render evidence, and any remaining limitations. Clearly distinguish implemented-and-verified work from work awaiting visual approval.
