# Antigravity Kickoff Prompt

Copy the following prompt into the implementation task. All referenced paths are relative to the repository root.

---

Implement the Transition unification upgrade in `docs/antigravity-transition-unification/`. Read `README.md`, then documents 01 through 06 completely before editing. Treat their architecture, interaction, compatibility, and acceptance contracts as mandatory. Follow the repository AGENTS.md instructions. This request authorizes implementation of the packet, not unrelated cleanup, dependency upgrades, staging/committing, external publication, asset generation, or changes to production user data.

The product requirement is truthful, simple review: what the user sees must come from actual rendered output. Use one render-backed player with artifact-derived exact paused frames. Do not recreate transition motion in React, add a fast/accurate toggle, or claim same CSS means the same render. For existing episode review, reuse the actual production MP4. Samples are production-rendered sample scenes and must be identified as samples. A changed draft is not an already-rendered episode.

Start by checking the current working tree and tracing the current production rendering/timeline/configuration paths. Other layout and preview edits may be in progress; preserve them and reconcile current source instead of assuming planning-time line numbers remain correct. Use CodeGraph first where the repository is indexed. Do not reset or overwrite unrelated work.

Execute Tasks 0 through 10 in `04-implementation-plan.md` in dependency order. Use red/green tests and review checkpoints. Gate the frontend replacement on a real production-backed sample render and exact-frame decoding. Keep the current production behavior as the initial reference, then isolate the explicitly listed correctness changes. Present before/after visual evidence and obtain owner approval before changed choreography becomes the release default.

Build one canonical effect definition/catalog, one selection/timing resolver, and one resolved instance per production boundary. Thread that instance into timeline, source handoff, markup/CSS, relevant SFX timing, review, and manifests. Do not shift narration or source boundaries to make an effect fit. Correct Brush Wave dispatch. Preserve `crossfade` as fade-to-black for this upgrade and label it truthfully; do not silently introduce a true dissolve.

Use existing production execution adapters, the render concurrency limiter, cancellation/progress infrastructure, and API conventions. Keep the local engine pinned. Snapshot input/config/assets/runtime into a content fingerprint, use immutable artifacts and atomic publication, coalesce duplicate jobs with caller-scoped leases, and invalidate caches automatically when definitions/settings/assets/runtime change. No missing asset/font/engine may silently fall back to a different visual result.

Simplify the UI to one grouped transition selector, one viewport, one playback/frame transport, and one secondary menu. Keep timing adjustments collapsed. Remove duplicated scrubbers, preview cards/buttons, redundant labels, badges, and simulation settings. Preserve keyboard/touch access, pending/error/retry states, and the existing application footer outside the video. All new code, files, comments, fixtures, and UI strings must be English.

Complete transition persistence end-to-end: preset create/update/load/duplicate/export/import, channel compatibility, explicit director precedence, dirty-draft conflict handling, and production resolution. Do not report a successful save before server confirmation. Do not let stale requests, events, frames, or job results overwrite newer state.

Prove extensibility by registering a test-only new effect and demonstrating that catalog, selector, production composition, sample review, frame decode, and parameterized parity tests work without new consumer branches. Remove obsolete React simulation modules only after all consumers, including the channel modal, have migrated.

Before completion, run every A1-A12 gate in `05-acceptance.md`, including actual MP4 rendering, same-artifact checksums, exact decoded-frame comparisons, independent production-builder coverage, async races, cancellation/reconnect/retry, persistence round-trips, desktop/mobile keyboard/touch inspection, and measured performance. Rebuild/restart affected processes and verify the final workflow against the new loaded code. A skipped render test, matching class names, or a successful build does not prove parity.

Report completed tasks, exact files and contracts changed, commands/results, baseline failures, visual approval, artifact/frame evidence, cache invalidation proof, measured performance, and unresolved limitations. If an engine capability or required authority is missing, identify the exact blocker and stop at that gate; do not hide it by lowering fidelity, loosening comparison thresholds, using an approximate preview, or inventing unsupported runtime APIs. Any material deviation from the packet requires the owner's decision.

---
