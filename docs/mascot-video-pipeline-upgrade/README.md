# Mascot Video Animation Pipeline Upgrade

Status: authoritative implementation handoff

This plan replaces the earlier sprite-gen integration direction. The application owns a first-party upload-to-animation pipeline. Users create and review source videos externally; the application extracts frames, removes backgrounds, packages animation assets, previews them and renders them in production.

## Product decisions
- Keep Mascot Concept and Add Style behavior unchanged.
- Keep exactly two semantic states: thinking and celebrate.
- Keep ten variants per state per style.
- Generate large half-body source images on a 16:9 canvas.
- Source images are neutral with respect to final placement.
- User-created animation uploads are 16:9, normally 1280x720.
- Step 3 performs frame extraction, strict per-frame matting, alpha cleanup, registration, packaging and QA.
- Step 4 previews processed sequences and final quiz placement.
- Do not integrate the full sprite-gen repository.
- Do not generate video from the application.
- Do not silently publish raw frames when processing fails.
- Apply final bottom-left placement only at preview/render time.
- Preview and production use the same manifest-driven frame resolver.

## Reading order
Read 00 through 13, then stages/README.md, stages/01 through stages/18, and antigravity-prompt.md.

## Execution rule
Antigravity must complete one stage, run its checks, record evidence and stop at the stage boundary. Contract changes must update this folder before source implementation continues.

## Existing source boundaries
Inspect and preserve local patterns around packages/shared/src/schemas/mascot.ts, packages/shared/src/mascot/, apps/server/src/quiz/mascot/, apps/server/src/quiz/render/, apps/server/src/repository/mascots.ts, apps/server/src/routes/mascots/ and apps/web/src/features/mascot/.
