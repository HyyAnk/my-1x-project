# Architecture

The app is a local-first modular workspace with a React/Vite frontend, a Fastify server, and a local Chatterbox TTS sidecar. Fastify remains the security boundary: it reads the repository, writes artifacts, coordinates LLM tasks via dual engines (Codex or Antigravity), talks to the TTS sidecar over loopback HTTP, and streams task events. The browser only calls `/api/*` and receives validated data.

## Modules

- `repository`: channel, topic, episode, Markdown, atomic write, backup, and path safety operations;
- `context`: explicit task-specific context manifests and audit logs;
- `codex`: OpenAI Codex transport, JSON-RPC, and Cockpit Responses request lifecycle;
- `antigravity`: Google Antigravity engine client, session/target discovery, CLI/Agent API adapters, and transcript watcher;
- `tasks`: dual-engine LLM queue, audio queue, scope locks, approvals, and task persistence;
- `providers`: provider boundaries for Chatterbox audio plus future video, image, and research work;
- `shared`: the single Zod schema package used by both applications.

No database or cloud backend is required. The TTS process is a local sidecar managed by the Windows launcher rather than a hosted backend. From the user's point of view it is part of the tool startup: the launcher prepares the environment, starts it, and waits for model readiness before opening the dashboard. Runtime voice profiles live under `.quiz-studio/voices/` and are excluded from Git.

Chatterbox is not imported directly into the Node process because it depends on Python, PyTorch, native audio libraries, and a separately loaded model. Keeping that runtime behind loopback HTTP avoids coupling Fastify to those native dependencies while preserving a fully local, automatic workflow.

The Node server queues audio tasks and serializes tasks for the same episode through the existing episode lock. Separate exports are assembled locally as a ZIP; merged exports call the TTS sidecar's `/merge` endpoint, which resamples mismatched WAV formats and inserts the configured silence gap.

## Dual LLM Engine Architecture (Codex + Antigravity)

The platform provides native, first-class dual-engine support for LLM generation:

- **Codex Engine ([`apps/server/src/codex.ts`](apps/server/src/codex.ts)):** Connects to OpenAI Codex via local JSON-RPC stdio app server or the Cockpit API service (`POST /responses`).
- **Antigravity Engine ([`apps/server/src/antigravity.ts`](apps/server/src/antigravity.ts)):** Connects to Google Antigravity via [`AntigravityClient`](apps/server/src/antigravity/client.ts), featuring automatic target discovery (Agent API HTTP or CLI process via [`discovery.ts`](apps/server/src/antigravity/discovery.ts)), dynamic model enumeration (`models.ts`), turn execution (`turnRunner.ts`), and real-time transcript streaming (`transcriptWatcher.ts`).
- **Runtime Engine Toggle ([`EngineToggleGroup.tsx`](apps/web/src/components/chrome/topbar/EngineToggleGroup.tsx)):** The frontend topbar exposes an interactive toggle group enabling users to switch between Codex and Antigravity at any time.
- **Dispatch Parity:** Task runners (`taskQueuePump.ts`, `directQuizHandler.ts`, `textArtifactHandlers.ts`) dynamically route execution to the currently active engine. Both engines adhere to identical context manifests (`.quiz-studio/logs/context-manifests.jsonl`), approval workflows, and strict Zod output validation.

## Audio boundary

Scene audio is a deterministic provider task, not an LLM task. `GENERATE_AUDIO` never calls `codex.connect()`, creates a Codex/Antigravity thread, or builds a context manifest. The server sends scene dialogue and the optional channel voice reference to `services/tts/` over `http://127.0.0.1:8890`.

Audio tasks use the episode lock so they cannot race scene edits or regeneration in the same episode. They use a separate pool controlled by `audio_generation.max_concurrent_tasks`, so audio work does not consume LLM slots and a busy LLM queue does not block audio work.

The tracked configuration contains safe defaults:

```json
{
  "audio_generation": {
    "provider": "chatterbox",
    "service_url": "http://127.0.0.1:8890",
    "exaggeration": 0.5,
    "cfg_weight": 0.5,
    "max_concurrent_tasks": 2
  }
}
```

The API keys for LLM transports and local audio overrides are written to ignored `.quiz-studio/*.local.json` files. Scene WAV files are stored under the selected local content folder and are excluded from Git.
