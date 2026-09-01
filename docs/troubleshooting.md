# Troubleshooting

## Codex is unavailable

Check that Codex is installed and authenticated, then use `Reconnect` in the top bar. The server never exposes credentials to the browser. On Windows Store installations, the server automatically copies the package binary into `.quiz-studio/codex/` when direct execution is blocked. If a different installation should be preferred, set its full path in `.quiz-studio/config.json` under `codex.command`.

## App Server is unavailable

The default transport is local stdio. If using a configured WebSocket endpoint, use a loopback or secured endpoint and verify the endpoint is reachable before restarting the dashboard.

## A task is stuck

Open Tasks. Queued tasks wait for the same episode/channel lock or for the global concurrency cap. A running task can be cancelled. After a dashboard restart, an interrupted running task is marked failed while repository artifacts remain intact.

## A file does not save

The backend accepts only known Markdown artifact names and only paths beneath the selected channel or episode. Check `.quiz-studio/logs/` with `STUDIO_DEBUG=1` for the technical detail.

## Quiz runtime migration fails

Keep all local services stopped and read the final `[ERROR]` and rollback lines. The explicit command is documented in [Setup](./setup.md#one-time-quiz-runtime-migration). It restores every channel metadata file from the active timestamped backup and reverses completed runtime moves in reverse order.

The backup is intentionally preserved after a failed run. Depending on the failure point, it remains either beside the content runtime as `.quiz-migration-<stamp>` or under the runtime's `migration-backups/<stamp>/channels` directory. If any rollback line reports trouble, do not rerun or merge directories manually; use the reported backup path to restore `channel.json` files and resolve the exact source/target conflict first.
