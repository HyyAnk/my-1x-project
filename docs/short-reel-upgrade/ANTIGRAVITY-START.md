# Antigravity Startup Prompt

Copy the following prompt into the implementation session.

---

Implement the approved Short-Reel portrait-package upgrade in this repository. The workspace is `D:/1a Cursor Project/My 1x Project`. The implementation pack is `docs/short-reel-upgrade/`. The product design is already approved; do not restart broad brainstorming or replace it with your own simplified design.

First read repository `AGENTS.md`, applicable nested instructions, then these files completely and in order:

1. `docs/short-reel-upgrade/README.md`
2. `docs/short-reel-upgrade/01-approved-design.md`
3. `docs/short-reel-upgrade/02-code-map.md`
4. `docs/short-reel-upgrade/03-contracts-and-state.md`
5. `docs/short-reel-upgrade/IMPLEMENTATION-PLAN.md`
6. `docs/short-reel-upgrade/execution/PROGRESS.md`
7. `docs/short-reel-upgrade/execution/DECISIONS.md`
8. `docs/short-reel-upgrade/verification/acceptance-matrix.md`

Then execute the phase files in order, starting at Phase 00. Read each phase completely before editing its files. Use executing-plans and test-driven-development skills if available; otherwise follow the pack's explicit test-first phase gates. You are authorized to implement and run safe local mocked tests for this approved scope. Do not merely summarize a plan and stop, and do not mark unchecked phases complete without evidence.

Required result:

- A real LLM-generated three-segment script and three current Flow prompts.
- The channel's existing mascot master reference, without recreating or changing the mascot.
- One newly generated 9:16 style scene containing the actual referenced mascot, based on the accepted script. A missing global style anchor must not block this.
- One newly generated 9:16 cover/thumbnail based on the script and accepted style image.
- Exactly two publishing fields: title and description, with hashtags included in description. The LLM must read the full accepted script.
- A Generate Package workflow with correct ordering, partial-success preservation, safe retry/cancel, per-unit progress, automatic UI refresh and consistent ZIP export.
- Backward-compatible reads and safe upgrade-on-write for existing records/tasks; no loss of previous user content.

Non-negotiable engineering constraints:

1. Reuse the existing provider byte APIs and relevant Episode thumbnail planning. Do not pass reel IDs to Episode writers, create fake episodes, or copy the entire Episode workflow.
2. Supply real reference image bytes, not only a path/name/prompt. Unsupported provider capability must fail clearly before charging; never silently drop the reference or switch providers.
3. Request portrait at the provider boundary; reject landscape rather than hiding it with cropping. Final style/cover must validate as 1080x1920.
4. Keep script upstream of style. Style acceptance must not mark script stale. Script changes must invalidate style/cover/publishing and reject older pending results.
5. No accepted placeholder/degraded image, template fallback or fake LLM success. Preserve old accepted output on failure and show the actual safe failure category.
6. Keep responsibilities separated. Implement contracts before consumers. Use existing record queues, revision checks, request receipts, immutable asset storage and task events. Do not bypass safety with direct JSON writes.
7. Every step gets a narrow regression test before implementation and a verified green run afterward. Do not weaken assertions, skip failures or update snapshots just to make checks pass.
8. Preserve unrelated dirty files, curated assets, scripts and user storage. Do not run destructive cleanup, global formatting, broad git staging, or automatic commits.
9. All new files/code/UI text must be English. Preserve existing user content and the existing shared footer without adding another footer.
10. Use browser protocols for UI verification. Never use OS mouse/keyboard automation or focus-stealing tools. Do not manipulate the user's clipboard as an automation transport.
11. Never print credentials or full provider request/reference-image bodies. Use structured contextual logs and sanitized evidence.
12. Do not deploy, post videos, change provider subscriptions/settings, generate final video footage, or introduce unrelated refactors.

After each phase, update `execution/PROGRESS.md`, `execution/EVIDENCE.md`, the acceptance matrix and any new decisions. Report completed work, exact checks, remaining failures, and the next phase. Continue through local implementation phases without repeatedly asking for approval of already approved behavior. If the code map has moved, adapt file locations and record the mapping; if a change would alter behavior/scope/safety, ask first.

If context becomes short, finish the current safe checkpoint and write the exact next unchecked step to PROGRESS.md. Do not restart from Phase 00 or recreate finished work in the next session.

Before Phase 08 paid smoke testing, ask me to approve the target reel and maximum budget. Do not spend image/LLM credits for live verification or mutate my existing reel until that approval is given. Use temporary storage and mocked providers for automated tests. If live approval is absent, finish safe local checks and report the live gate as pending; do not claim full completion.

Start now by inspecting the repository and capturing the Phase 00 baseline. In your first update, state the current phase, the files you will inspect, and how you will keep tests separate from live channel storage.
