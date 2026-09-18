# Architecture and Contracts

## Workflow

Step 1: Mascot Concept and Styles -> master concept and style anchor.
Step 2: Expressive States -> ten Thinking and ten Celebrate source variants per style; large half-body 16:9 source images; original and transparent downloads.
Step 3: Animation Processing -> upload 16:9 720p video; decode frames; strict matting; alpha cleanup; common registration; sequence, atlas and manifest; QA.
Step 4: Motion and Animation -> manifest-driven preview and final quiz placement.

## Layer ownership
- UI renders controls, progress, slot state, retry and curation.
- Hooks manage server state, cancellation and stale updates.
- Routes validate input and call application services.
- Services own processing orchestration and publish gates.
- Adapters own FFmpeg, matting and storage I/O.
- Repositories own immutable attempts and asset metadata.
- Shared code owns typed contracts, frame math, deterministic selection and render resolution.

## Source and output separation
The source image and uploaded video preserve a large neutral composition. Final bottom-left placement is applied only by the render bundle. Do not bake final placement into frames.

## Core invariants
1. A slot belongs to exactly one style, state and slot index.
2. A ready revision has a complete frame sequence, manifest, registration and QA report.
3. One failed required frame fails the processing attempt.
4. A replacement cannot overwrite an approved revision until it succeeds.
5. Preview and production use the same manifest and frame resolver.
6. Rendering uses no unseeded randomness, wall-clock time or required network fetch.
7. Existing Concept and Add Style behavior remains unchanged.
