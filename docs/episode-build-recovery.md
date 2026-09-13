# Episode build recovery

## Behavior

- Retry starts a build that reuses validated persisted content, images, voice segments and render chunks.
- Episode video rendering uses the official HyperFrames Plan V2, chunk render and assembly APIs locally. Chunks target eight seconds; the engine can increase that size for very long videos to stay within 256 chunks. Only complete, verified chunks are reusable, not frames from an interrupted chunk.
- The immutable plan is keyed by source content, actual localized media bytes, engine settings and FFmpeg version. Each chunk receipt binds its SHA-256, frame range and plan hash; reuse also checks its frame count, resolution and FPS.
- Capture/encode failure preserves earlier chunks. Assembly failure preserves all chunks. Output is published only after assembly and existing final video/audio QA succeed.
- Automatic thumbnail requests decode existing images and check content fingerprints before generating. Native provider aspect ratios with the correct orientation are accepted. Healthy legacy/manual thumbnails are adopted without generating a replacement. Each aspect ratio is checkpointed separately. Explicit manual Generate still creates a new version.
- Startup requeues interrupted `GENERATE_PIPELINE` and standalone `GENERATE_VIDEO` tasks using the same task ID. Pipeline-owned queued/running children are superseded so the parent rebuilds one consistent workflow. Existing failed/cancelled/completed tasks and approval-required work are not automatically retried.
- Automatic recovery stops after three interrupted starts; manual Retry creates a fresh task. Changes use the existing task events and queue lanes, so clients receive the recovered status without a page reload.

## Boundaries and tradeoffs

`taskRestartRecovery` owns the pure startup policy; `taskStateStore` durably applies it before queue dispatch. Thumbnail reuse wraps, rather than changes, explicit generation. `resumeChunkRender` owns resumable execution, and `hyperframesChunkAdapter` contains provider I/O. A worker process owns the local SDK runtime and a per-Episode process lease; cancellation and dashboard disconnect terminate its process tree. Chunks execute sequentially because the SDK temporarily changes process-global settings; each chunk can use the configured browser workers.

The distributed API in HyperFrames 0.8.17 requires software capture/encoding. This can be slower than the previous hardware-accelerated one-shot render, especially for long, complex compositions. The producer and related HyperFrames packages are pinned to 0.8.17 to match the existing CLI. The new producer dependency is approximately 71 MB unpacked, plus transitive fonts/runtime packages; it supplies supported chunk APIs that the CLI does not expose. Puppeteer's install-time browser download is disabled; the existing local browser resolution is used.

The existing failed-build retention policy is unchanged: eligible failed Episodes are cleaned after 48 hours, inactive HyperFrames directories may be pruned at startup after 24 hours, and successful renders still prune intermediate files. Recovery depends on those files still being retained.

## Verification

- `pnpm --filter @studio/shared build`: passed.
- `pnpm --filter @studio/web typecheck`: passed.
- Scoped ESLint and Prettier checks: passed.
- Targeted server suite: 92 tests passed, covering chunk corruption/invalidation, cancellation, assembly retry, process locks, thumbnail reuse/partial failure, startup recovery, queue dispatch and unchanged retention.
- `RUN_RENDER_RECOVERY=1 pnpm --filter @studio/server exec vitest run test/renderResumeReal.test.ts`: passed. The test checks layout, aborts a real 320x180 render after the first chunk, retries, verifies that chunk's modification time is unchanged, and validates a 9-second MP4, audio and the exact color boundary at frames 191/192. It uses generated fixture audio, not paid providers.
- The existing 134-second `quizImageSizingProductionParity` fixture exceeded its hard-coded 240-second timeout with the software chunk path; long-form throughput remains a benchmark limitation, not a passed check.
- Server-wide typecheck is blocked by four existing `scenes` contract errors in `episodeStagingPublisher`, `singleQuestionBootstrapper` and `topicEpisodeBootstrapper`. No errors were reported in the changed recovery modules.
- Production dependency audit reports 18 existing advisories in Fastify/URI/Transformers dependencies, not in the added producer dependency. They are outside this change.

PowerShell real-render test invocation:

```powershell
$env:RUN_RENDER_RECOVERY = '1'
pnpm --filter @studio/server exec vitest run test/renderResumeReal.test.ts --testTimeout 320000
```

SDK contract: https://hyperframes.heygen.com/packages/producer
