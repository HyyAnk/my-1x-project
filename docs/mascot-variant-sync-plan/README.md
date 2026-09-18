# Mascot Variant Synchronization & Randomization Architecture Plan

## 1. Executive Summary

This engineering initiative overhauls the mascot rendering and variant selection subsystem across the entire platform (Stage Studio, Visual Sandbox, Preview Episode, and production video rendering). It establishes data integrity, eliminates synthetic mock fixtures, enables real processed WebM transparent video assets, introduces media availability filtering, and implements question-level uniform randomization with adjacent repeat avoidance.

## 2. Core Architectural Principles

1. **Strict Media Availability Filter (Zero-Glitch Fallback):**
   - Only variants backed by real, existing media assets (`transparent_video_url` WebM video or non-empty 3D character `image_url`) are considered eligible.
   - Synthetic mock fixture references (`atlas.png` rainbow circles) are entirely purged.
   - If a style lacks variants for a state, the mascot cleanly renders invisible (`visible: false`) or uses the master anchor fallback; it never shows broken placeholders.

2. **Per-Question Uniform Randomization:**
   - In production video rendering and preview episodes, each question selects a variant uniformly at random from all eligible variants of the active style.
   - Elimination of rigid index-based modulo round-robin (`questionIndex % variants.length`).
   - Consecutive Repeat Avoidance: If 2 or more variants are eligible, question $Q_{k}$ avoids repeating the variant selected for question $Q_{k-1}$.
   - Deterministic Seeding Per Question: To guarantee zero-flicker during frame-by-frame seeking in video rendering, the random candidate is deterministically pinned per question clip ($seed = hash(episodeId, questionId, state, styleId)$).

3. **WYSIWYG Synchronization:**
   - Visual Sandbox, Stage Studio, Preview Episode, and the production video renderer share the exact same resolution contracts and variant availability logic.

## 3. 6-Phase Execution Roadmap

| Phase | Title | Objective | Assigned Subagent |
|-------|-------|-----------|-------------------|
| **Phase 1** | Data Cleanup & Asset Activation | Purge mock fixtures from `mascot.json`, activate Slot 2 WebM, verify static 3D assets | `Subagent 1` |
| **Phase 2** | Domain Contracts & Availability | Define `isMascotVariantAvailable` predicate and fallback policies in `@studio/shared` | `Subagent 2` |
| **Phase 3** | Question Random Selector Engine | Build per-question uniform random selector with repeat avoidance and deterministic seeding | `Subagent 3` |
| **Phase 4** | Video Pipeline Integration | Wire selector into video composition (`candyArcadeComposition.ts`, timeline frame resolution) | `Subagent 4` |
| **Phase 5** | Preview Surfaces Synchronization | Align Visual Sandbox, Stage Studio, and Episode preview with the unified selector | `Subagent 5` |
| **Phase 6** | Regression & Final Handoff | Full regression test suite, edge-case validation, and final handoff to coordinator | `Subagent 6` |

## 4. Work Tracking

See `status.json` for live machine-readable progress and phase reports.
