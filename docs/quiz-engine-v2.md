# Quiz Engine V2

Quiz Engine V2 is the default and only production path for fresh Quiz episodes. The primary **Build video** action executes it automatically.

---

## 1. Quiz-Native Fast Path (Default Architecture)

Fresh episodes default to the streamlined **Quiz-Native Fast Path** orchestrated by [`quizProductionPipelineRunner.ts`](apps/server/src/tasks/pipeline/quizProductionPipelineRunner.ts):

- **Direct Quiz Generation:** A single `GENERATE_QUIZ` task directly prompts the configured LLM engine (Codex or Antigravity) to produce structured quiz content.
- **Deterministic Choice Balancing:** The output is parsed and normalized by [`directQuizHandler.ts`](apps/server/src/tasks/handlers/directQuizHandler.ts), which applies [`balanceQuizChoicePositions`](apps/server/src/quiz/domain/quiz.ts) to guarantee that correct answer positions rotate deterministically across questions and avoid consecutive repeat choices.
- **Backward-Compatible Stubs:** `directQuizHandler.ts` synthesizes `script.md`, `visual_bible.md`, and `scenes.json` on the fly, allowing legacy inspection tools, editors, and downstream readers to function seamlessly without requiring the old narrative steps.
- **Legacy Pipeline Switch:** The multi-stage narrative sequence (`GENERATE_RESEARCH` → `TREATMENT` → `SCRIPT` → `VISUAL_BIBLE` → `SEQUENCE_SCENES`) is completely bypassed by default. It only executes when explicitly enabled via the environment flag:
  ```bash
  USE_LEGACY_QUIZ_PIPELINE=true
  ```

---

## 2. Canonical Pipeline Stages & Execution Flow

The canonical stage lifecycle (defined in [`apps/server/src/quiz/pipeline/invalidation.ts`](apps/server/src/quiz/pipeline/invalidation.ts)) consists of:

```text
research | quiz | director | assets | asset_resolution | voice | timeline | render | qa
```

Pipeline execution in [`quizV2PipelineRunner.ts`](apps/server/src/tasks/pipeline/quizV2PipelineRunner.ts) follows these distinct phases:

### Phase 1: Quiz Derivation & Director Planning
1. **`generateQuiz`:** Derives normalized `quiz.json` and evaluates candidate questions against the 30-day question history ledger (`questionHistory.ts`) using Token Jaccard and Character Bigram Dice similarity algorithms.
2. **`generateDirector`:** Generates a deterministic `director_plan.json`. Validated by [`validateDirectorPlan.ts`](apps/server/src/quiz/director/validateDirectorPlan.ts), which strictly requires:
   - Coverage of every Quiz question ID exactly once (no orphaned or missing questions).
   - Strict adherence to semantic presentation enums.
   - An explicit `answer_reveal` intent on every beat.
   - Enforcement of age-band thinking-time floors (`4-6` ≥ 7.2s, `7-9`/`family` ≥ 6.8s, `10-12` ≥ 6.5s).
3. **`planAssets`:** Extracts visual asset requirements into `asset_plan.json` matching visual themes and scene requirements.

### Phase 2: Integrated YouTube Description (Non-Blocking)
- Immediately following asset planning, [`generateEpisodeDescription`](apps/server/src/quiz/description/index.ts) is triggered automatically.
- It formats channel hashtags, age-appropriate descriptions, and scoring tiers into `video_description.json`.
- **Non-blocking safety:** The step is wrapped in a non-fatal `try/catch` block. If LLM description generation fails, the error is logged as a warning and pipeline execution continues without interruption.

### Phase 3: Concurrent Asset & Batch Voice Synthesis (`Promise.all`)
When both visual assets and voice narration require generation, [`quizV2PipelineRunner.ts`](apps/server/src/tasks/pipeline/quizV2PipelineRunner.ts) executes both stages in parallel using `Promise.all`:

```typescript
await Promise.all([
  (async () => {
    assetsStart = Date.now();
    await resolveAssets(input);
    assetsEnd = Date.now();
  })(),
  (async () => {
    voiceStart = Date.now();
    await generateVoice(input);
    voiceEnd = Date.now();
  })(),
]);
```

- **`resolveAssets` ([`resolveQuizAssets.ts`](apps/server/src/quiz/assets/resolveQuizAssets.ts)):** Concurrently resolves and fetches visual assets based on the active channel visual style and provider configuration.
- **`generateVoice` ([`assetsVoiceStages.ts`](apps/server/src/quiz/pipeline/stages/assetsVoiceStages.ts)):** Synthesizes all question voice segments in batch through the local Chatterbox neural TTS sidecar (`services/tts/app.py`), measures precise audio durations per segment, compiles the initial timeline, and stitches together the full episode narration into `narration.wav`.
- **Parallel Timing Metrics:** Execution durations for both concurrent branches are recorded via `recordParallelTiming("assets_voice", ...)`.

### Phase 4: Integrated Thumbnail Generation (Non-Blocking)
- Automated thumbnail synthesis ([`generateEpisodeThumbnail`](apps/server/src/quiz/thumbnail/index.ts)) runs automatically following asset resolution and again prior to video rendering.
- It leverages high-CTR prompt engineering and channel visual branding.
- **Non-blocking safety:** Like episode descriptions, thumbnail generation is wrapped in non-fatal error handling: any failure logs a warning and does not block video rendering.

### Phase 5: Timeline Compilation & Autonomous QA Healing
1. **`compileTimeline` ([`compileTimeline.ts`](apps/server/src/quiz/timeline/compileTimeline.ts)):** Deterministically aligns narration segments, thinking music, sound effects, mascot actions, and visual cues against measured audio durations. Every planned audio segment must be scheduled, or compilation halts fatally.
2. **Deterministic QA Gates:** [`runQa`](apps/server/src/quiz/pipeline/stages/timelineAssessmentStages.ts) evaluates timeline bounds, copyright compliance (`copyrightValidator.ts`), answer verification, and voice pacing safety (`assessVoiceQa.ts`).
3. **3-Cycle Autonomous Healing Loop:** If QA blockers are detected, [`executeQuizQaGatesWithHealing`](apps/server/src/tasks/pipeline/quizPipelineVoiceStep.ts) initiates up to 3 automated remediation cycles before escalating:
   - **Voice Pacing Blocker (`voice_pace_unsafe` / `voice_pace_fast`):** Automatically invokes [`voicePacingHealer.ts`](apps/server/src/quiz/audio/voicePacingHealer.ts) (`healVoicePlanWithPacingRewrite`) to re-prompt the LLM to rewrite dialogue segments to meet target Words Per Second (WPS) thresholds, invalidates downstream voice/timeline artifacts, and re-synthesizes speech.
   - **Asset Blocker (`asset_required_unresolved` / `asset_generation_failed`):** Automatically retries visual asset resolution (`resolveAssets`).
   - **Dual Blockers:** When both voice pacing and asset blockers exist simultaneously, the healing loop resolves assets and rewrites voice pacing concurrently via `Promise.all`.
   - **Fatal Escalation:** If blockers persist after 3 complete healing cycles, the runner halts with a typed `QUIZ_QA_BLOCKED` exception.

### Phase 6: Video Composition & HyperFrames Render
- **Child Task Execution:** The runner launches `runVideoTask` ([`videoRunner.ts`](apps/server/src/tasks/videoRunner.ts)).
- **HTML5 Composition Preparation:** Prepares HTML5 composition assets and mixed audio (`soundtrack.wav`) via [`videoCompositionPreparer.ts`](apps/server/src/tasks/video/videoCompositionPreparer.ts).
- **Headless Browser Render:** Executes frame-by-frame rendering with [`videoRenderExecution.ts`](apps/server/src/tasks/video/videoRenderExecution.ts) using the headless browser renderer to produce broadcast-quality MP4 video (`quiz-video.mp4`) and `render_manifest.json`.
- **History Ledger Commit:** On successful render completion, newly rendered questions and BGM tracks are appended to the 30-day history ledger. If rendering fails, additions are rolled back.

---

## 3. Artifact Storage & Atomic Persistence

Artifacts are persisted in each episode's dedicated filesystem directory via [`RepositoryService`](apps/server/src/repository.ts) and [`quizArtifacts.ts`](apps/server/src/repository/quizArtifacts.ts):
- Every JSON artifact (`quiz.json`, `director_plan.json`, `asset_plan.json`, `asset_resolution.json`, `voice_plan.json`, `timeline.json`, `assessment.json`, `video_description.json`, `render_manifest.json`) is validated against strict Zod schemas before persistence.
- Writes are performed atomically (write to temporary file followed by atomic rename).
- Writes and stage invalidations are serialized per episode using dedicated repository locks, guaranteeing that concurrent pipeline operations (e.g. `resolveAssets` and `generateVoice`) cannot corrupt state or interleave dirty writes.

---

## 4. Preflight & Post-Render Quality Assurance

- **Preflight Verification:** Blocks rendering if any of the following occur: canonical answer mismatches, missing required semantic assets, thinking time below the age-band floor, timeline bounds out of range, or unmeasured audio segments.
- **Post-Render FFprobe Verification:** Inspects the rendered MP4 file verifying container integrity, video/audio stream codecs, target dimensions (1920x1080 landscape or 1080x1920 portrait), frame rate, duration, and audio-video synchronization alignment.
