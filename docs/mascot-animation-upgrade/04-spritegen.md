# Sprite-gen Provider and Pipeline Contract

## Provider

Use sprite-gen's Codex image-row provider. Antigravity may orchestrate implementation, but it is not the visual provider. Do not use Grok or a video provider.

Resolve the installed sprite-gen executable and its virtual environment during startup. Never assume a bare system Python or global package. Record the pinned upstream revision and CLI version in every run report.

## Equivalent pipeline

prepare -> gen-set with provider codex -> extract -> curation when needed -> compose-atlas -> inspect -> score -> import.

The adapter must resolve exact flags from the pinned upstream revision. The request JSON must contain style anchor, recipe id, frame count 12, fps 8, loop policy, cell dimensions, margins, chroma key and fit settings.

## Process safety

- Use a child-process API with timeout and abort signal; hide the Windows child window.
- Never use OS-level mouse or keyboard automation.
- Capture stdout and stderr as structured logs with job, mascot, style, state, slot, attempt and step.
- Prevent duplicate runs with a per-mascot/style/slot lock and idempotency key.
- Validate exit code and every expected output before advancing.
- Keep secrets out of prompts, logs, manifests and URLs.
- Use curated exports or composed atlas/manifest; never copy frames directly as a deliverable.

## Input fingerprint

Hash style anchor content, recipe id and prompt, request JSON, frame settings, provider configuration, sprite-gen revision and relevant tool versions. A changed input creates a new immutable attempt and cannot overwrite a published artifact.

## Pilot requirement

Before batch generation, run one thinking and one celebrate row for one existing style. Confirm that twelve frames can pass extraction, identity, motion, seam and semantic review. If not, stop and report the measured failure.

