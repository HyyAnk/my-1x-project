# Episode workflow

An episode is created in one of two ways:

1. **Topic confirmation** — a `SUGGEST_TOPICS` task returns candidate topics. Confirming one creates the episode directory, copies the selected topic into `episode.json` and `brief.md`, and sets the episode stage to `SELECTED`. Unselected candidates remain in topic history to prevent repeats.
2. **Question bank bridge** — a one-click topic→episode bridge action creates the episode from curated question-bank entries (see `apps/server/src/quiz/bank/`).

Production then runs the Quiz V2 pipeline end to end (quiz → director → assets + voice → timeline → QA → render); see [quiz-engine-v2.md](quiz-engine-v2.md). The Quiz fast path synthesizes `script.md`, `visual_bible.md`, and `scenes.json` for backward compatibility with tooling that reads those files.

---

## Audio Synthesis & Voice Architecture

Audio synthesis in the production pipeline operates in two modes:

### 1. Episode-Wide Batch Voice Synthesis (Quiz V2 Production Pipeline)

In the automated Quiz V2 pipeline, voice synthesis is an **episode-level batch operation** executed by `generateVoice` ([`apps/server/src/quiz/pipeline/stages/assetsVoiceStages.ts`](apps/server/src/quiz/pipeline/stages/assetsVoiceStages.ts)):

- **Voice Planning:** `buildQuizVoicePlan` extracts dialogue and narration segments for the entire episode into a structured `VoicePlan` (intro, question stems, answer options, thinking countdowns, reveal reactions, explanations, and outro).
- **Batch Synthesis:** `synthesizeQuizVoiceSegments` synthesizes all segments in batch against the local Chatterbox neural TTS sidecar (`services/tts/app.py`), employing content fingerprinting for cache reuse.
- **Duration Measurement & Timeline Alignment:** Measured audio durations for every segment feed directly into `compileQuizTimeline`, locking in deterministic beat boundaries based on actual voice speed.
- **Episode Master Narration Assembly:** `assembleQuizNarration` stitches all synthesized segment WAVs with precise silence offsets into a unified, episode-wide `narration.wav` track used in composition and final video rendering.

### 2. Interactive Scene Audio Regeneration (Compatibility & Fine-Tuning)

For manual tuning in the scene breakdown editor:
- Users can trigger `Generate Audio` on individual scene blocks, queueing a `GENERATE_AUDIO` task for that specific scene through Chatterbox.
- When dialogue is manually modified or regenerated via `REGENERATE_DIALOGUE` / `REGENERATE_BOTH`, the repository automatically invalidates `audio_asset_path`, `audio_generated_at`, and `audio_duration_seconds` before saving.
- The dashboard compares the generated WAV duration against the scene's configured duration, surfacing duration variance warnings when exceeding 1 second or 15%. Audio can be regenerated on-demand to replace the player without a page reload.
