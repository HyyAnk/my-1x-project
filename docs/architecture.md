# System architecture

_Last reviewed: 2026-09-09 against the current working tree, including uncommitted changes_

This is the starting point for coding agents working on AI Quiz Studio. It describes implemented boundaries, not a proposed redesign or a guarantee that every subsystem is correct. Source, schemas, and executable tests take precedence when this guide drifts. Follow [AGENTS.md](../AGENTS.md) for engineering rules and [the system map](system-map.md) for additional navigation.

## Runtime and dependency direction

AI Quiz Studio is a Windows-supported, local-first pnpm/TypeScript workspace. Local persistence does not mean offline generation: configured LLM and image adapters can call external services.

```text
React browser UI
  -> feature hooks -> HTTP API clients
  -> Fastify routes -> application workflows / TaskManager
  -> domain rules + RepositoryService + provider adapters
  -> local content files / LLM transports / Python TTS / render processes

TaskManager events -> /api/events (WebSocket) -> browser task state + refresh
@studio/shared contracts are consumed by both apps
```

- [apps/web](../apps/web/package.json): React 19, Vite, feature-oriented components/hooks, and CSS. Shared task state uses React hooks; do not assume React Query is installed.
- [apps/server](../apps/server/package.json): Fastify HTTP/WebSocket host, workflow orchestration, filesystem persistence, provider integration, and local process boundaries.
- [packages/shared](../packages/shared/src/index.ts): shared types, Zod schemas, API contracts, quiz/layout policies, and Short-Reel contracts. Do not import either application into this package.
- [services/tts](../services/tts/app.py): Python Chatterbox sidecar, separate from Node because of its model/native runtime.
- [app.ts](../apps/server/src/app.ts) is the composition root: loads environment/configuration, creates repository/engines/context/tasks, restores tasks, and registers routes.
- [server index.ts](../apps/server/src/index.ts) defaults to loopback port 4310. Vite uses port 2244 in development; Fastify serves the built frontend when available.

The server owns privileged I/O. Keep filesystem and provider credentials out of browser code. Loopback binding and CORS are not a public multi-user authentication model; do not expose the server remotely without a separate security design.

## Responsibility map

| Responsibility                       | Start here                                                                                                                                                                       | Boundary to preserve                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| UI composition and navigation        | [App.tsx](../apps/web/src/App.tsx), [features](../apps/web/src/features/)                                                                                                        | Render and acknowledge interactions; put stateful workflows in hooks             |
| Browser transport                    | [api.ts](../apps/web/src/api.ts), [API client](../apps/web/src/api/client.ts)                                                                                                    | Feature API modules own requests and transport errors                            |
| HTTP contracts                       | [routes](../apps/server/src/routes/), [shared API contracts](../packages/shared/src/api/)                                                                                        | Parse input, invoke workflows, map failures; avoid new orchestration in handlers |
| Task execution                       | [TaskManager](../apps/server/src/tasks/manager.ts), [runtime contract](../apps/server/src/tasks/runtime.ts)                                                                      | Lifecycle, queues, locks, cancellation, approvals, persistence and progress      |
| Quiz workflows                       | [pipeline orchestrator](../apps/server/src/quiz/pipeline/orchestrator.ts), [task pipeline runners](../apps/server/src/tasks/pipeline/)                                           | Domain stages versus task scheduling and child-task coordination                 |
| Filesystem persistence               | [RepositoryService](../apps/server/src/repository/service.ts), [bindings](../apps/server/src/repository/bindings/), [runtime contract](../apps/server/src/repository/runtime.ts) | Reuse focused repositories behind the facade; preserve path and write safety     |
| Question bank and topic confirmation | [bank bridge](../apps/server/src/quiz/bank/questionBankToQuizBridge.ts), [bank storage](../apps/server/src/repository/quiz/bank/)                                                | Source identity, serialization, confirmation replay, and product localization    |
| Short-Reel workflow                  | [Short-Reel services](../apps/server/src/shortReel/), [contracts](../packages/shared/src/shortReel/), [routes](../apps/server/src/routes/shortReels.ts)                          | Separate product records, revisions, unit attempts, dependencies and exports     |
| Generation adapters                  | [providers](../apps/server/src/providers/index.ts), [Codex](../apps/server/src/codex.ts), [Antigravity](../apps/server/src/antigravity.ts)                                       | Provider-specific network/process behavior stays behind adapters                 |
| Render and QA                        | [video runner](../apps/server/src/tasks/videoRunner.ts), [render modules](../apps/server/src/quiz/render/), [QA](../apps/server/src/quiz/qa/)                                    | Validated artifacts and deterministic timeline feed composition/rendering        |
| Style and mascot tooling             | [visual modules](../apps/server/src/quiz/visual/), [Stage Studio](../apps/web/src/features/stageStudio/), [sandbox](../apps/web/src/features/sandbox/)                           | Shared contracts connect previews, persisted selections and production output    |

These are responsibilities, not ownership zones or a claim/lease protocol. Existing facades and some workflows are large; do not treat their size or mixed responsibilities as the pattern for new code. Extract a focused boundary when extending them.

## Main production flows

### Quiz episodes

1. A topic/question-bank confirmation can materialize quiz and director artifacts through the bank bridge. Otherwise the production runner submits `GENERATE_QUIZ` when no quiz exists.
2. [quizProductionPipelineRunner.ts](../apps/server/src/tasks/pipeline/quizProductionPipelineRunner.ts) executes the quiz-native V2 production path. The legacy research/treatment/script/scene pipeline has been retired; production is strictly quiz-native and V2-only, and `USE_LEGACY_QUIZ_PIPELINE` is obsolete and ignored.
3. [quizV2PipelineRunner.ts](../apps/server/src/tasks/pipeline/quizV2PipelineRunner.ts) ensures quiz/director/asset plans, attempts description generation, resolves assets and synthesizes voice in parallel when both are needed, and compiles the timeline.
4. [quizPipelineVoiceStep.ts](../apps/server/src/tasks/pipeline/quizPipelineVoiceStep.ts) checks QA and attempts supported repairs. The default loop has three blocker checks with at most two intervening healing rounds, not three repair retries. Remaining blockers raise `QUIZ_QA_BLOCKED`.
5. Thumbnail generation is attempted after QA. Description and thumbnail errors are caught and logged without failing the pipeline; these calls are still awaited, not detached background jobs.
6. The outer runner submits a video child task. The video runner prepares/checks composition, invokes rendering, persists output and updates task status. Question/BGM history handling lives there; preserve failure/cancellation cleanup and do not record render history at quiz creation.

Downstream artifacts are derived state. [The domain invalidation map](../apps/server/src/quiz/pipeline/invalidation.ts) and [repository invalidation implementation](../apps/server/src/repository/quiz/quizArtifactsInvalidation.ts) must stay aligned when upstream edits or new stages are introduced.

### Question bank and Short Reels

The bank is reusable source data, not an episode document store. Trace curation in [quiz/bank](../apps/server/src/quiz/bank/), durable mutations in [repository/quiz/bank](../apps/server/src/repository/quiz/bank/), and source-bound topic resolution in [boundSourceResolver.ts](../apps/server/src/quiz/bank/bridge/boundSourceResolver.ts).

Topic confirmation uses [persisted receipts](../apps/server/src/repository/topicConfirmationReceipts.ts) to distinguish replay from conflicting requests. [Product localization](../apps/server/src/quiz/bank/localization/productLocalization.ts) owns target-language validation and localized projections; do not overwrite canonical question identity to localize a product.

Short Reels have their own records and deliverable lifecycle; they are not just an episode aspect-ratio switch. [unitLifecycle.ts](../apps/server/src/shortReel/unitLifecycle.ts) accepts results under the repository mutation queue only when operation identity, dependency fingerprint, cancellation state, and payload validation allow it. Preserve these checks for retries, concurrent edits, and late provider responses.

## Persistence and artifact contracts

[createRoots](../apps/server/src/repository/pathSafety.ts) distinguishes the code root from the selected content root:

| Location                                      | Ownership                                                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Selected content root: `channels/`            | Channel and product content                                                                                                             |
| Selected content root: `.quiz-studio/`        | Runtime state, tasks, logs, voices, mascots and other runtime stores                                                                    |
| Code root: `templates/`, `shared/`, `assets/` | Repository resources; `shared/` is not the TypeScript package                                                                           |
| Code root configuration                       | Loaded by [config](../apps/server/src/config.ts) and [environment](../apps/server/src/env.ts); never copy secrets into docs or fixtures |

Do not assume all content is under the checkout. Resolve paths through the repository and preserve atomic writes, serialization queues and revision checks. Storage changes are rejected while task work is active by [system routes](../apps/server/src/routes/system.ts).

The quiz artifact filenames are defined by [RepositoryRuntime](../apps/server/src/repository/runtime.ts) and read/written with schemas in [quizPlanArtifacts.ts](../apps/server/src/repository/quiz/quizPlanArtifacts.ts):

```text
quiz-v2.json          director-plan.json       asset-plan.json
asset-resolution.json voice-plan.json         timeline.json
qa.json               history-check.json      video-description.json
stage-timings.json
```

Object fields such as `director_plan` and `assessment` are not disk filenames. Do not invent underscore-based file names from DTO fields or use documentation examples as migration specifications.

## Asynchronous state and failures

- [Task submission](../apps/server/src/tasks/taskSubmission.ts), [queue pump](../apps/server/src/tasks/taskQueuePump.ts), and [lifecycle](../apps/server/src/tasks/taskLifecycle.ts) split admission, scheduling, and transitions. Inspect their runtime contract before adding task types or changing concurrency.
- [Events routes](../apps/server/src/routes/events.ts) expose WebSocket `/api/events`, not SSE. The connection receives current engine status and active tasks; task events then update the browser.
- [subscribeEvents](../apps/web/src/api/client.ts) reconnects with bounded exponential delay and handles browser online events. [useTasks](../apps/web/src/hooks/useTasks.ts) refetches on connection/terminal events and guards refreshes with sequence/revision counters so an older fetch cannot overwrite newer event state.
- Feature hooks remain responsible for refreshing affected product views. A task event alone does not prove every view is synchronized. Verify the relevant feature's mutation and reconnect paths.
- Preserve user input on errors, expose pending/retry/cancel states, and prevent duplicate submissions without blocking unrelated controls. Validate stale-result and partial-completion behavior at the owning workflow boundary.
- Provider selection and transport are separate from domain rules. Audio/image generation are implemented integrations, not future placeholders; consult [provider exports](../apps/server/src/providers/index.ts) and the relevant resolver rather than adding provider logic to UI components.

## Agent change and verification checklist

1. Read repository instructions and `git status --short`; preserve unrelated working-tree changes. If `.codegraph/` exists, use CodeGraph before text search to locate responsibilities, then verify current source.
2. Trace the relevant UI/API, workflow, domain, storage/provider and shared-contract boundaries. State the intended data flow, failure cases and verification path before non-trivial edits.
3. Update the narrowest useful behavior tests. Server tests are in [apps/server/test](../apps/server/test/); web unit tests are colocated under [src](../apps/web/src/) and Playwright tests live under [test](../apps/web/test/).
4. Use scripts from [package.json](../package.json): `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format:check`, `pnpm build`. `pnpm check:all` runs typecheck, tests and audits; it does not include lint, formatting, production build or Playwright.
5. For focused server verification, for example: `pnpm --filter @studio/server exec vitest run test/runtimeNamespace.test.ts`. Build shared contracts first with `pnpm build:shared` if needed. Use isolated fixtures, not live channels, for mutation tests.
6. For application changes, restart/rebuild affected processes and exercise the updated primary workflow. Run `pnpm test:e2e` or the relevant browser scenario for cross-system UI changes. Provider-backed generation requires configured services and may incur cost; mocked tests do not prove live-provider behavior.
7. For documentation-only changes, check relative links, cited paths/contracts, formatting and the diff; no application restart is required. Report exactly what was and was not verified.

## Keeping this guide current

Update this file when package boundaries, entry points, transport, persistence, or main product flows change. Keep exact thresholds and catalogs in their source/tests rather than duplicating them here. Use [system-map.md](system-map.md) as a navigation aid and domain documents for detail, but recheck their claims before implementation.

This review corrected concrete documentation drift; it is not a full code audit, an architectural compliance certification, or confirmation that all workspace tests pass.
