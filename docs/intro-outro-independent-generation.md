# Independent intro/outro generation

## Plan and contracts

- Keep one Generate/Regenerate action. Resolve identity once, then run one independent LLM request per requested clip in parallel.
- Each request starts a fresh provider thread (or a stateless content request), contains only its clip structure/seeds, and gets the same reference assets and deterministic pair anchor. No sibling script history is sent.
- Define the pair anchor in code before dispatch: visual style, palette, stage, music and logo placement. A single-clip retry reuses these fields from the existing companion; no additional planning call is needed.
- Validate each result locally and publish it immediately. Serialize persistence to avoid project-version races. Preserve concurrent user edits as before.
- Poll completed revision IDs while the job is running and refresh the draft when a new clip is available. Copy remains available, editing remains locked during generation. Desktop/mobile layout and footer are unchanged.
- A failed clip does not cancel its sibling. Retry failed clips only. Cancellation aborts outstanding work and retains already persisted results. Reference changes invalidate subsequent results rather than silently mixing assets.
- Keep persisted job/revision schemas compatible. Template v8 identifies independent generation. No automated review or repair loop is added.

## Verification

Cover one clip per request, concurrent dispatch, shared anchors, reverse completion order, early publication, cancellation retaining a completed clip, provider failure, retry only the missing clip, and concurrent user edits. Browser tests verify early draft visibility and copy availability without page reload. Run server tests, type checks, lint, build and a live isolated project verification without overwriting New Pair drafts.

## Results

- 51 server tests and 5 browser tests passed. Server build, web typecheck/build and scoped lint passed.
- Live Novy / Arcade Pop Master project `ioscript_9d978e8879f04bd9` completed both independent requests successfully in about 110 seconds. Intro was persisted while Outro was still running. No existing New Pair draft was overwritten.
- Live job: `ioscript_job_ce6db71fe23943bc`. Intro: `script_intro_1a942a0b59a6498a`; Outro: `script_outro_ec0b4b3ee7ec4ee0`.
- This verifies independent requests and script outputs, not rendered-video quality or a throughput benchmark.
