# Provider system

Reviewed against repository boundaries on 2026-09-09. Configured remote generation can require credentials, network access and billable requests. Local storage does not imply fully offline generation.

In Quiz Engine V2, provider generation operates primarily on quiz voice plans and asset plans, with scene-level interfaces maintained for backward compatibility:

- **Quiz V2 Audio:** The voice pipeline plans and synthesizes episode narration segments using `AudioProvider` / Chatterbox Turbo, assembling the final `narration.wav` and measuring segment durations for timeline alignment.
- **Quiz V2 Visual Assets:** The asset resolution pipeline calls `ImageProvider.generateReference` to render visual questions, hero clues, and choice illustrations according to the director's asset plan.
- **Compatibility Scene Model:** A provider-neutral scene contract (`dialogue`, `visual_prompt`, `duration_seconds`, `audio_asset_path`) is retained for compatibility utilities.

```ts
export interface AudioProvider {
  generateDialogue(dialogue: string, voice: string): Promise<{ asset_path: string }>;
}
```

The optional `voice` value is either the channel's local `assets/voice_reference.wav` path or `default`. A reference clip is never required.

The sidecar loads `ChatterboxTTS` once at startup and exposes:

- `GET /health` for readiness checks;
- `POST /synthesize` with dialogue, optional voice reference, `exaggeration`, and `cfg_weight`, returning `audio/wav` bytes.

Narration-only `<!-- AUDIO_CUE: chuckle -->` and `<!-- AUDIO_CUE: laugh -->` comments are converted to native tags by the default Chatterbox Turbo sidecar. The launcher sets `CHATTERBOX_MODEL=turbo` and automatically replaces a cue-less sidecar if one is already running. `GET /health` reports the active model and `paralinguistic_tags` capability.

Audio is a provider task, not an LLM turn. Trace [task handling](../apps/server/src/tasks/) and [Chatterbox](../apps/server/src/providers/chatterbox.ts) for timeout, error and output validation behavior. Do not create Codex thread identifiers or promise one universal error string for every audio failure.

Image generation is already implemented behind `ImageProvider.generateReference`; see [provider exports](../apps/server/src/providers/index.ts) and [asset resolution](../apps/server/src/quiz/assets/resolveQuizAssets.ts). Do not treat it as a future-only interface. The exported `VideoProvider` and `ResearchProvider` interfaces alone do not establish an active integration; trace their callers before extending them. Current quiz video production uses the [video task runner](../apps/server/src/tasks/videoRunner.ts). See [System architecture](architecture.md) for the current cross-system boundaries.
