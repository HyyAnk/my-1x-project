# Episode workflow

An episode is created in one of two ways:

1. **Topic confirmation** — a `SUGGEST_TOPICS` task returns exactly five candidates. Suggestion is preview-only. Confirming one creates the episode directory, copies the selected topic into `episode.json` and `brief.md`, and sets the episode stage to `SELECTED`. Unselected candidates remain in topic history so future suggestions can avoid repeats.
2. **Question bank bridge** — a one-click topic→episode action creates the episode from curated question-bank entries (see `apps/server/src/quiz/bank/`).

Production then runs the Quiz V2 pipeline end to end (quiz → director → assets + voice → timeline → QA → render); see [quiz-engine-v2.md](quiz-engine-v2.md). The Quiz fast path synthesizes `script.md`, `visual_bible.md`, and `scenes.json` for backward compatibility with tooling that reads those files.

## Scene audio

After a scene breakdown exists, use `Generate Audio` inside that scene's Dialogue / Narration block. The action queues one `GENERATE_AUDIO` task for that scene, runs through the local Chatterbox sidecar, and adds a native audio player when the WAV is ready. Audio generation is per-scene in this phase; there is no episode-level batch action.

If a scene's dialogue changes manually or through `REGENERATE_DIALOGUE` / `REGENERATE_BOTH`, the repository clears `audio_asset_path`, `audio_generated_at`, and `audio_duration_seconds` before saving. Regenerating only the visual prompt keeps existing audio. This prevents a player from representing text that is no longer current.

The dashboard compares the generated WAV duration with the configured scene duration. When the difference exceeds one second or 15 percent, whichever is larger, it shows a warning and a manual `Match duration` action. The duration is never changed silently. Audio can be regenerated to replace the player without a page reload.
