# Quiz Engine V2

Quiz Engine V2 is the default and only production path for fresh Quiz episodes. The primary **Build video** action runs it automatically.

## Quiz-native fast path (default)

By default the pipeline generates the Quiz directly from the topic (or question-bank bridge) via a `GENERATE_QUIZ` task: the LLM output is parsed by the direct quiz handler into `quiz.json`, which then synthesizes `script.md`, `visual_bible.md`, and `scenes.json` for backward compatibility with tooling that reads those files. The narrative chain (`research → treatment → script → visual bible → scenes`) only runs when `USE_LEGACY_QUIZ_PIPELINE=true`.

## Canonical stages

The canonical stage model (see `apps/server/src/quiz/pipeline/invalidation.ts`) is:

    research | quiz | director | assets | asset_resolution | voice | timeline | render | qa

The execution flow is:

1. **generateQuiz** — derives the Quiz and runs the 30-day duplicate question history check.
2. **generateDirector** — produces the Director plan (a deterministic semantic plan first; LLM-directed plans are the provider boundary). `validateDirectorPlan` requires every Quiz question ID to be covered exactly once, semantic presentation enums only, and an `answer_reveal` intent per beat; age-band thinking-time floors are enforced as blockers.
3. **planAssets** — derives the asset plan.
4. **resolveAssets and generateVoice run concurrently** (`Promise.all`): visual asset resolution and batch voice synthesis (voice segments are fingerprint-cached; an episode-wide `narration.wav` is assembled).
5. **compileTimeline + runQa** — the timeline compiler is pure and deterministic (Quiz, DirectorPlan, VoicePlan, measured durations, centralized age-band timing policy) and fails fatally if any VoicePlan segment is not scheduled. QA raises blockers; the runner auto-heals for up to **3 cycles** (LLM voice-pacing rewrite, asset retry) before failing the task with `QUIZ_QA_BLOCKED`.
6. **GENERATE_VIDEO child task** — prepares the composition and renders through the headless-browser HyperFrames renderer. The 30-day question history ledger is appended only after a successful render and rolled back if the render fails.

Episode description and thumbnail generation are non-blocking: their failure logs a warning and never fails the pipeline, unlike QA blockers.

## Artifacts

Artifacts are persisted under each episode's fixed quiz directory through explicit RepositoryService methods. Every JSON artifact is Zod-validated and written atomically. Quiz artifact writes and invalidations are serialized per episode inside the repository layer, so concurrent pipeline stages (assets + voice) cannot interleave invalidate/write cycles.

## Render preflight and post-render QA

Render preflight blocks canonical answer mismatches, missing required semantic assets, insufficient thinking time, invalid timeline bounds, missing source IDs, and missing measured narration. Post-render QA uses FFprobe to verify the file, video stream, audio stream, duration, resolution, frame rate, and audio/video duration relationship. Render manifests persist stage evidence and avoid machine-specific absolute paths.
