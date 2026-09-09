# LLM Engine Integration (Codex & Google Antigravity)

The platform features native dual-engine support for LLM generation. Users can seamlessly toggle between **OpenAI Codex** and **Google Antigravity** via the interactive topbar selector ([`EngineToggleGroup.tsx`](apps/web/src/components/chrome/topbar/EngineToggleGroup.tsx)). Both engines adhere to identical context boundaries, concurrency locks, and artifact output contracts.

---

## 1. OpenAI Codex Integration

The dashboard supports two local transports for Codex:

- **Local Codex App Server**: starts `codex app-server --listen stdio://` by default. The wire format is newline-delimited JSON-RPC messages without the `jsonrpc` header.
- **Cockpit API Service**: calls the OpenAI-compatible Responses API exposed by Cockpit Tools. Set the Base URL and API key in Settings; the adapter accepts a host URL or a URL that already ends in `/v1`.

Cockpit Tools documents its Codex API service as a bundled CLIProxyAPI sidecar that keeps the same Base URL/API key workflow. The dashboard only stores those settings locally and never commits them.

The local App Server lifecycle is:

```text
connect
  → initialize
  → initialized
  → thread/start or thread/resume
  → turn/start
  → item and turn notifications
  → turn/completed
```

The app records `task_id`, channel, episode, `codex_thread_id`, `codex_turn_id`, lock key, and output files. A task is allowed to run only when its channel/episode lock is free and the global concurrency cap has capacity.

Codex threads remain available in the configured provider after a task reaches a terminal state. Repository files remain the source of truth for generated project artifacts.

### Cockpit Setup

1. Start Cockpit Tools and enable its Codex API service.
2. Open this dashboard's Settings.
3. Select `Cockpit API Service`.
4. Paste the Base URL shown by Cockpit. A value such as `http://127.0.0.1:<port>` is normalized to `/v1`; an existing `/v1` suffix is preserved.
5. Paste the API key. It is written to `.quiz-studio/codex.local.json`, which is ignored by Git.
6. Choose the model from the top-bar dropdown and reconnect Codex.

The adapter uses `POST /responses` with the selected model and scoped prompt, then translates the response back into the dashboard task lifecycle. It also reads `GET /models` when available; the dropdown keeps a small Codex fallback list if Cockpit does not expose that endpoint. Do not put Cockpit keys in `.quiz-studio/config.json`, source files, screenshots, logs, or issue reports.

---

## 2. Google Antigravity Integration

Google Antigravity is implemented as a first-class engine via [`AntigravityClient`](apps/server/src/antigravity/client.ts) and exported through [`apps/server/src/antigravity.ts`](apps/server/src/antigravity.ts):

- **Target & Session Discovery ([`discovery.ts`](apps/server/src/antigravity/discovery.ts)):** Automatically discovers and attaches to running Antigravity sessions. Supports both the local Agent API HTTP endpoint and direct CLI child process execution.
- **Dynamic Model Enumeration ([`models.ts`](apps/server/src/antigravity/models.ts)):** Queries available models from the active Agent API, Google API, or CLI, falling back to canonical defaults (`DEFAULT_ANTIGRAVITY_MODELS`).
- **Turn Execution ([`turnRunner.ts`](apps/server/src/antigravity/turnRunner.ts)):** Coordinates turn lifecycle, streaming responses, error recovery, and abort signal propagation.
- **Real-Time Transcript Watcher ([`transcriptWatcher.ts`](apps/server/src/antigravity/transcriptWatcher.ts)):** Tails the active session's transcript log, streaming incremental generation events and thinking steps back to the dashboard SSE feed.

---

## 3. Context Contract & Engine Parity

`ContextEngine` builds an auditable manifest for every task regardless of which engine is active:
- **Topic suggestions:** Include channel DNA, style/rules, existing titles/premises, and recent episode titles.
- **Quiz / Direct Quiz tasks:** Include confirmed topic brief, channel target audience, age-band rules, and gameplay constraints.
- **Scene / dialogue regeneration:** Include the targeted scene, immediate neighbor scenes, script excerpt, and relevant DNA guidelines.

The exact prompt and included file list are written to `.quiz-studio/logs/context-manifests.jsonl`. Other channels, unrelated episodes, raw task histories, and secrets are strictly excluded.

---

## 4. Approvals and Failure States

Server-initiated approval requests become `WAITING_APPROVAL` and are surfaced in the Tasks view. The user can accept, accept for the session, decline, or cancel. Disconnects, malformed output, timeouts, and upstream errors become visible task failures with technical details preserved in logs and debug state.
