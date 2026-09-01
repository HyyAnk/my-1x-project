# Render Progress and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HyperFrames rendering faster and expose accurate, measured render progress with frame, worker, elapsed, and ETA data on the dashboard.

**Architecture:** A pure parser converts HyperFrames terminal events into a stable progress contract, while a focused process adapter owns streaming, logs, heartbeat, timeout, and process-tree cleanup. The video task runner owns lifecycle/cancellation and publishes the structured contract through existing persisted task updates; the progress component renders measured values directly.

**Tech Stack:** TypeScript, Node.js `child_process.spawn`, Zod, React 19, Vitest, Testing Library, HyperFrames CLI, ffprobe

**Spec:** `docs/superpowers/specs/2026-09-01-render-progress-and-performance-design.md`

## Global Constraints

- Work directly on `main` as explicitly requested; do not create a branch or worktree.
- Keep UI, workflow, parsing, and process I/O in focused modules with strict types and no new production dependency.
- Keep render progress monotonic, reserve 95–100 for verified server work, and never fabricate measured percentages.
- All visible UI copy is concise, accessible on keyboard/touch, and works at desktop and mobile widths.
- Browser automation, if needed, uses browser protocol only and never OS-level mouse or keyboard control.
- Restart or rebuild affected processes and run the updated primary workflow before delivery.

---

### Task 1: HyperFrames progress contract and parser

**Files:**

- Create: `apps/server/src/tasks/video/hyperframesProgress.ts`
- Create: `apps/server/test/hyperframesProgress.test.ts`
- Modify: `packages/shared/src/events.ts`
- Test: `apps/server/test/taskLifecycle.test.ts`

**Interfaces:**

- Consumes: HyperFrames trace lines and fallback text lines from stdout/stderr.
- Produces: `parseHyperframesProgress(line, nowMs?) => HyperframesProgressSample | null`, `mapRenderTaskPercent(sample) => number`, and nullable `Task.render_progress` with phase/frame/worker/time fields.

- [ ] **Step 1: Write failing parser and schema tests**

Test structured `capture_streaming` JSON, fallback `Streaming frame 2130/3840 (6 workers)`, ANSI/carriage-return cleanup, malformed lines, clamping, ETA, and parsing a legacy task without `render_progress`.

- [ ] **Step 2: Run tests to verify expected failures**

Run: `pnpm --filter @studio/shared build && pnpm --filter @studio/server test -- hyperframesProgress.test.ts taskLifecycle.test.ts`
Expected: FAIL because the parser and schema field do not exist.

- [ ] **Step 3: Implement the pure contract and parser**

Define explicit integer/nonnegative Zod fields. Parse only known capture events, calculate ETA from measured elapsed/frame ratio, and map capture frames into task range 72.5–89 while preserving the outer 65–95 render span for startup/encode/finalize events.

- [ ] **Step 4: Run focused tests**

Run: `pnpm --filter @studio/shared build && pnpm --filter @studio/server test -- hyperframesProgress.test.ts taskLifecycle.test.ts`
Expected: PASS.

### Task 2: Streaming process boundary

**Files:**

- Create: `apps/server/src/tasks/video/hyperframesProcess.ts`
- Create: `apps/server/test/hyperframesProcess.test.ts`

**Interfaces:**

- Consumes: `{ command, args, cwd, env, timeoutMs, logPath, signal, heartbeatMs, onProgress }`.
- Produces: `runHyperframesProcess(options): Promise<void>`; callbacks are awaited in source order and errors include an output tail.

- [ ] **Step 1: Write failing real-process tests**

Use `process.execPath -e` fixtures that emit split stdout/stderr lines, carriage-return updates, quiet output, non-zero exit, and long-running descendants. Assert callback order, heartbeat liveness, log contents, abort, timeout, and contextual errors.

- [ ] **Step 2: Run tests to verify expected failures**

Run: `pnpm --filter @studio/server test -- hyperframesProcess.test.ts`
Expected: FAIL because the process adapter does not exist.

- [ ] **Step 3: Implement streaming and cleanup**

Use `spawn` with piped streams and `windowsHide`. Split complete lines across chunks, serialize callback work on one promise chain, append both streams to one log, bound the retained output tail, and terminate the exact process tree with `taskkill /PID <pid> /T /F` on Windows or process-group signals elsewhere.

- [ ] **Step 4: Run focused tests**

Run: `pnpm --filter @studio/server test -- hyperframesProcess.test.ts`
Expected: PASS with no leaked child process.

### Task 3: Video lifecycle, progress publishing, and cancellation

**Files:**

- Modify: `apps/server/src/tasks/video/videoRenderExecution.ts`
- Modify: `apps/server/src/tasks/videoRunner.ts`
- Modify: `apps/server/src/tasks/runtime.ts`
- Modify: `apps/server/src/tasks/manager.ts`
- Modify: `apps/server/src/tasks/taskSubmission.ts`
- Modify: `apps/server/test/videoRunner.test.ts`
- Create: `apps/server/test/videoRenderExecution.test.ts`

**Interfaces:**

- Consumes: `runHyperframesProcess`, `AbortSignal`, and `HyperframesProgressSample`.
- Produces: persisted monotonic `progress_percent`, structured `render_progress`, render log path, and an `activeVideoControllers` lifecycle keyed by task id.

- [ ] **Step 1: Write failing lifecycle tests**

Assert measured updates are monotonic, progress callbacks are serialized, render cancellation aborts the controller, cancellation remains `CANCELLED`, completed tasks clear active controllers, and QA starts at 95 only after successful process exit.

- [ ] **Step 2: Run tests to verify expected failures**

Run: `pnpm --filter @studio/server test -- videoRenderExecution.test.ts videoRunner.test.ts`
Expected: FAIL on missing streaming/cancellation behavior.

- [ ] **Step 3: Integrate the process adapter**

Replace buffered `execFile` with the adapter, emit concise messages such as `Video · rendering frame 2,130 / 3,840`, pass signal/log path from the runner, add/remove an `AbortController`, and check persisted task status before failure finalization.

- [ ] **Step 4: Run focused server tests**

Run: `pnpm --filter @studio/server test -- hyperframesProgress.test.ts hyperframesProcess.test.ts videoRenderExecution.test.ts videoRunner.test.ts videoRunnerStyleBoundary.test.ts`
Expected: PASS.

### Task 4: Accurate dashboard progress

**Files:**

- Create: `apps/web/src/components/taskProgress/renderProgress.ts`
- Create: `apps/web/src/components/taskProgress/renderProgress.test.ts`
- Modify: `apps/web/src/components/taskProgress/useContinuousProgress.ts`
- Modify: `apps/web/src/components/TaskProgressPanel.tsx`
- Create: `apps/web/src/components/TaskProgressPanel.test.tsx`
- Modify: `apps/web/src/styles/components/cards.css`

**Interfaces:**

- Consumes: `Task.render_progress` and persisted backend percentage.
- Produces: `formatRenderProgress(task) => string | null`; measured render tasks bypass speculative trickle and expose exact percent/metrics through visible and accessible text.

- [ ] **Step 1: Write failing hook, formatter, and component tests**

Assert `65` remains `65` for measured progress, legacy tasks still smooth, metrics format as `2,130 / 3,840 frames · 6 workers · 42s left`, the real render message replaces rotating copy, and progress ARIA values match backend state.

- [ ] **Step 2: Run tests to verify expected failures**

Run: `pnpm --filter @studio/web test -- renderProgress.test.ts TaskProgressPanel.test.tsx`
Expected: FAIL because measured rendering is not supported.

- [ ] **Step 3: Implement concise measured UI**

Derive metric text in a pure helper, bypass interpolation when `render_progress` is present, display the server render message and one responsive metrics row, and preserve existing terminal states and cancel control.

- [ ] **Step 4: Run focused web tests**

Run: `pnpm --filter @studio/web test -- renderProgress.test.ts TaskProgressPanel.test.tsx`
Expected: PASS.

### Task 5: Worker correction and full verification

**Files:**

- Modify: local ignored `.env` only if it contains `HYPERFRAMES_WORKERS=4`
- Review: all changed source/test files

**Interfaces:**

- Consumes: existing `calculateOptimalWorkers` behavior and the full updated app.
- Produces: automatic six-worker selection on the measured machine, passing checks, a restarted app, and a verified MP4.

- [ ] **Step 1: Remove the local four-worker override**

Delete only the `HYPERFRAMES_WORKERS=4` line from the ignored local `.env`; do not alter unrelated secrets or settings. Confirm startup reports the selected worker count.

- [ ] **Step 2: Run repository checks**

Run: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm build`.
Expected: all commands exit 0.

- [ ] **Step 3: Restart and run the primary workflow**

Restart the server/web process, launch a real HyperFrames video task, observe persisted/WebSocket frame updates and Stop behavior without page refresh, and verify the output with `ffprobe` for H.264 video, AAC audio, expected dimensions, FPS, duration, and frame count.

- [ ] **Step 4: Review and final verification**

Review the diff for contract compatibility, lifecycle races, leaked processes, misplaced responsibilities, copy/accessibility, and responsive behavior. Re-run every affected focused test after review fixes and report exact commands/results.
