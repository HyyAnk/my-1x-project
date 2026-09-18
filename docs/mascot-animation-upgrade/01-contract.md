# Scope, Contracts and Target Architecture

## In scope

Replace generated stills for thinking and celebrate style slots with twelve-frame animation rows. Preserve concept creation, style anchors, variant slots, phase policy, reveal mapping, placement, registration, caching and asset localization.

## Out of scope

New semantic states, Grok, video-to-loop, master concept redesign, a new rigging system, automatic destructive migration, or UI orchestration in route handlers.

## Target flow

Concept and style anchor -> animation plan builder -> job repository -> sprite-gen adapter -> extract/curate/compose -> inspect/score -> artifact importer -> animation repository -> shared frame resolver -> Studio preview and production video.

## Layer ownership

- UI: controls, progress, curation and recovery only.
- Application: plans, jobs, publish gate and orchestration.
- Domain: schemas, recipes, fingerprints, selection and frame math.
- Adapter: Codex/sprite-gen subprocess and artifact parsing.
- Repository: durable records and immutable asset versions.
- Renderer: frame-at-time, geometry and phase consumption.

## Invariants

1. One slot belongs to one style and one state.
2. Ready means exactly twelve frames, fps 8, manifest, atlas, registration and QA report.
3. Thinking recipes stay focused; celebrate recipes stay joyful and child-safe.
4. A style is video-ready only when all twenty slots are ready.
5. Preview and production use the same atlas, manifest, frame order, fps, pivot and registration.
6. Idempotency uses a stable input fingerprint.
7. A failed job remains visible, retryable and non-publishable.

## Proposed asset contract

MascotAnimationAssetV1:
- version: 1
- state: thinking or celebrate
- atlas_url and manifest_url
- frame_count: 12
- fps: 8
- loop: explicit boolean
- frames: twelve rectangles with index, x, y, width, height and duration_ms 125
- registration: existing MascotAssetRegistration
- content_fingerprint and source_fingerprint
- qa_report_url and published_at

Extend MascotStateVariant with animation, status, generation_revision and preserve image_url for provenance. A ready slot without a valid animation object must fail schema validation.

