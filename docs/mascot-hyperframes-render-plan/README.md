# HyperFrames Mascot Video Animation Rendering Pipeline Upgrade

## Architectural Context & Problem Statement
During video generation for quiz episodes, the HyperFrames composition linter (`hyperframes check` in `videoLayoutChecker.ts`) fails with blocking errors whenever a mascot with video animation (e.g. VP9 transparent WebM in slot 2) is active:
1. **Missing Local Asset**:
   `<video> element references local file(s) not found in the project: /api/mascots/.../video_transparent.webm`.
   HyperFrames renders offline from an isolated directory (`renderRoot = runtime/hyperframes/<episode_id>`). It cannot fetch HTTP API URLs. While static images are localized into `mascot-assets/`, animation video artifacts were never copied nor rewritten.
2. **Untimed Media Lacking Lifecycle Attributes**:
   `<video> has src but no data-start. HyperFrames cannot own playback for untimed media, so preview and render behavior can diverge.`
   HyperFrames requires strict DOM timing attributes on all `<video>` and `<audio>` tags (`id`, `data-start`, `data-duration`) to drive deterministic frame-by-frame rendering.

## 5-Phase Sequential Roadmap

```text
[Phase 1] Asset Localization Engine
    └── Resolves physical files on disk & copies animation artifacts into renderRoot/mascot-assets/
[Phase 2] URL Normalization & Composition Rewriting
    └── Updates source() mapping & subcomposition template path transformations
[Phase 3] HyperFrames Video Element Serialization
    └── Renders compliant <video> with id, data-start, data-duration, and playback controls
[Phase 4] Multi-Question Test Harness & Parity
    └── Comprehensive unit and integration test coverage across all animation modes
[Phase 5] E2E HyperFrames Composition Validation
    └── Real-world check verification ensuring 0 blocking errors during video build
```

## Governance & Operational Protocol
1. **Strict Sequential Execution**: Each phase is completed and verified before the subsequent phase commences.
2. **Dedicated Subagents**: Each phase is handled by an isolated subagent responsible for planning, execution, and reporting back to the coordinator.
3. **Strict English-Only Specification**: All code, filenames, comments, and documentation must remain 100% English.
4. **Clean Code & Modular Architecture**: Functions under 40 lines, SRP adherence, no bloated monolithic files.
