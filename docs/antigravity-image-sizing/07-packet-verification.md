# Packet Verification

## Scope

This document records verification of the handoff packet, not verification of the future implementation. The packet contains documentation and baseline evidence only. Proposed production modules and tests are intentionally not created here.

## Source audit

- Inspected the existing catalog, policy/types, sample generator, Sandbox adapter, choice/hero CSS, production scene adapter, asset planner, prompt framing, provider request seams, completion validator, asset resolver, pipeline runner, render preparation, optimizer, schemas, task synchronization, and fingerprint paths.
- Confirmed that current catalog ratios are shared by Sandbox and asset planning but not calculated from image viewport geometry.
- Measured the three reported image viewports in Chromium and extended the inventory to all eight layouts. See `baseline-measurements.json` for environment and limits.
- Found that current completeness logic and the separate 18%-tolerance validator do not constitute one shared live metadata gate. The plan explicitly addresses integration, not just adding another helper.
- Found that the full build plans assets only when the plan is missing, while direct render loads persisted plans. Both paths are included in stale-sizing acceptance.
- Found that optimizer reuse currently depends on source/output mtime, and one render asset path omits parts of image provider configuration. Both are included in the focused implementation scope.

## Packet checks

The preparation pass checks local Markdown links, JSON syntax, repository paths labeled as existing, formula expectations, English-only ASCII text, and whitespace/formatting. Requirements R1-R11 are mapped to implementation tasks and acceptance evidence. Proposed file paths are differentiated from existing source files.

Verified on 2026-09-11:

- Nine packet files; baseline JSON contains eight active layouts.
- All local Markdown links resolve. No non-ASCII text or unresolved planning markers were found.
- All 40 existing source-file paths in the source-map tables exist.
- Independently recalculated the three choice recommendations: 4:3 at 672 x 504, 1:1 at 728 x 728, and 16:9 at 1024 x 576. They match the JSON expectations.
- `pnpm exec prettier --check docs/antigravity-image-sizing/*.md docs/antigravity-image-sizing/*.json`: passed.
- `pnpm --filter @studio/server exec vitest run test/quizLayoutAssetAspectRatioE2E.test.ts test/imageOptimizer.test.ts test/imgstudioClient.test.ts`: 3 files passed, 40 tests passed. These are current baseline tests, not implementation acceptance.
- `git diff --check -- docs/antigravity-image-sizing`: no reported whitespace errors. New packet files are untracked; the separate formatter check covers their contents.

## Verification limits

- Current passing tests preserve old assumptions; they are baseline evidence only.
- No production code, settings, existing Episode, or generated media is intentionally changed by this packet.
- No paid generation or MP4 render is part of packet preparation. The implementation plan requires local fixture MP4 verification before Antigravity claims completion.
- Fractional hero measurements and all style/phase combinations must be recaptured with local fonts ready during execution.
- This packet selects a geometry-preserving sizing correction, not a redesign making every slot exactly match a standard ratio. Remaining crop/contain space is explicitly reported and tested.
