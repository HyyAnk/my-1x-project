# Data Safety and Rollout Runbook

## Before editing

1. Record `git status --short`, the current branch, and the output of the discovery commands in `INVENTORY.md`. Do not include secrets, absolute home paths, or local tokens in the evidence.
2. Resolve the storage root through the same application configuration (`STUDIO_ROOT` and `storage.local.json` behavior); never assume the repository checkout contains production episodes.
3. Inventory every episode and record only counts and IDs: presence of the five V2 files, parse result, `episode.video_asset_path` presence, and render-manifest `quiz_engine_version`. Do not copy quiz text, audio, image URLs, or credentials into git.
4. If any episode has a video but is missing one or more V2 files, stop before implementation and report the IDs. The owner must either regenerate those artifacts or explicitly accept that re-render now fails. Do not auto-generate or delete the video.
5. Copy no live episode data into fixtures. Existing test factories and the checked-in schema fixtures are the only test data sources.

## Rollout rule

This is a code rollout, not a data migration. Existing V1 videos remain readable because the video and manifest persistence readers are not removed. A later rerender of an old episode fails with an actionable V2-artifact error until the supported quiz-native pipeline has rebuilt its artifacts.

Do not add a temporary feature flag. `USE_LEGACY_QUIZ_PIPELINE` is intentionally ignored after the code change; removing it from deployment configuration can happen in a separate operational change once all environments are observed.

Do not rewrite old `render-manifest.json` files. New renders write version 2 only. Historical version 1 metadata may remain for audit and playback.

## Staged verification

1. Run the unit and integration matrix with isolated temporary roots.
2. Run typecheck and the repository's full test suite.
3. Run a real V2 render in an isolated fixture root using existing local media only. Verify the root HTML, every `compositions/*.html`, MP4, manifest, duration, dimensions, and V2 fields.
4. Run the application task path with an existing-video/missing-artifact fixture and verify no HTML, soundtrack, asset, manifest, or video write occurred.
5. Run the application task path with the complete V2 fixture and verify exactly one V2 composition path and no legacy task submissions, including when the old environment variable is set to `true`.
6. Only after all checks pass may an owner review the diff and decide whether to commit or deploy.

## Recovery

- Missing artifact: run the existing quiz-native generation stages for that episode, then retry. Do not create a hand-written JSON file.
- Malformed artifact: restore/regenerate the artifact through its schema-owning stage; preserve the `QUIZ_ARTIFACT_INVALID` error for diagnosis.
- Failed V2 render: retain the old stored video and inspect the task error, render log, preflight assessment, and checkpoint. Do not fall back to V1.
- Unexpected output difference: compare fixed-input root and mounted composition files first, then the render manifest. If the difference is not caused by wrapper removal, stop and report it as a regression.
- Accidental data mutation: stop the task, preserve the affected paths, and report exact paths to the owner. Do not run destructive cleanup or `git reset`.

## Operational success signal

New manifests have `engine: "hyperframes"`, `quiz_engine_version: 2`, `schema_version: 2`, a non-legacy preflight status, and a composition rooted at `runtime/hyperframes/<episode-id>/index.html`. A successful task has no `completeQuizV2` field in its internal context and no legacy child submissions.
