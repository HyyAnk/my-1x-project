# Render Progress and Performance Design

## Problem

The video render subprocess is currently executed with a buffered `execFile` call. The task jumps from 65% to 95% only after HyperFrames exits, while the web client invents progress above the last server value. A local `HYPERFRAMES_WORKERS=4` override also makes the measured 3,840-frame render slower than HyperFrames automatic worker selection.

## Required behavior

- Execute HyperFrames as a streaming child process and consume both stdout and stderr without blocking either stream.
- Prefer `[Render:trace]` JSON checkpoints and support `Streaming frame X/Y (N workers)` as a fallback.
- Expose measured frame count, total frames, worker count, elapsed time, and ETA through the task contract and existing task update channel.
- Keep render progress monotonic and map the measurable HyperFrames work into task progress 65–95. Reserve 95–100 for output QA and persistence; never report completion before server confirmation.
- Send a bounded heartbeat while HyperFrames is quiet so the UI shows liveness without fabricating percentage.
- Persist a per-render terminal log and retain a useful output tail in process errors.
- Support cancellation and timeout, terminating the Windows child-process tree so browser grandchildren cannot leak.
- A cancelled render must remain `CANCELLED`, not be overwritten as `FAILED` when the process rejects.
- For measured renders, the dashboard must show the backend percentage directly and display concise frame/worker/ETA details. Existing smoothing can remain for tasks without measured progress.
- Use HyperFrames automatic worker selection on this machine by removing the ignored `HYPERFRAMES_WORKERS=4` override; explicit user configuration remains supported.

## Interaction plan

1. Starting a video task immediately shows preparation and layout phases.
2. When capture begins, server checkpoints update the progress bar and metrics from actual completed frames.
3. Quiet periods produce a liveness update with unchanged percentage; stale or out-of-order checkpoints cannot regress state.
4. Stop aborts the active process, kills descendants, and leaves the task cancelled. Timeout or render failure reports a contextual failure and a log path.
5. Successful process exit moves to MP4/audio verification, then persistence, and only then reaches 100%.
6. Existing WebSocket task updates keep all desktop and mobile views synchronized; reconnect falls back to the persisted task snapshot.

## Validation

- Unit tests cover structured/fallback parsing, ANSI and carriage-return chunks, mapping, monotonicity, and ETA.
- Integration tests use real Node child processes to cover streamed output, serialized callbacks, heartbeat, abort, timeout, log writing, and non-zero exit.
- Shared schema and web component tests cover backward compatibility, exact measured percentages, concise metrics, and accessible progress text.
- Run server/web tests, typecheck, lint, build, restart the affected app, and complete a real HyperFrames render verified with `ffprobe`.
