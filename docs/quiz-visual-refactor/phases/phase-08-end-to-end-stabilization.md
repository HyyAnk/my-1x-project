# Phase 8 — End-to-End Stabilization

Status: COMPLETE — 8A–8D COMPLETE

Dependency: Phase 7 COMPLETE and the latest preceding Phase 8 subphase handoff

## Objective

Close the remaining integration and evidence gaps after the seven-phase architecture refactor. Phase 8 must prove that the architecture works through real production boundaries, that Sandbox and production remain semantically and visually aligned, and that obsolete compatibility code and duplicated policy no longer obscure the source of truth.

Phase 8 stabilizes the existing system. It does not add layouts, backgrounds, skins, question formats, choice counts, or a four-choice migration.

## Completed subphase 8A — Production contracts

Phase 8A is complete. The dated handoff records the implementation and verification. Its durable outcomes are:

- Explicit `QuizRenderStyleContext` preserves `Theme < Channel < Episode < Beat` instead of overloading ambiguous `default*` fields.
- Episode and Channel background choices propagate through the real production renderer.
- Transitions consume the next scene's already-resolved palette.
- Channel update accepts and persists Answer Card and Background styles.
- New episodes inherit Channel background; Episode updates persist and invalidate affected artifacts.
- Regression tests cover production style resolution, persistence, and Sandbox-to-Channel synchronization.
- Repository lint/format blockers and the JSDOM `ResizeObserver` false-positive were cleaned up before 8B.

## Completed subphase 8B — Boundary integration tests

### Outcome

Create deterministic executable evidence across the real boundaries where the Phase 7 audit found contract loss. Tests must enter through public or production-adjacent entry points and fail if an intermediate layer silently drops or re-resolves style data.

Phase 8B is complete. Its dated handoff records production-chain, precedence/provenance, transition, Channel/Episode persistence, invalidation, and preview/production parity evidence. The tests also closed two residual 8A defects: Channel brand provenance no longer collapses into an override, and style-only Episode changes invalidate render/QA artifacts without deleting upstream Quiz artifacts.

### In scope

- `videoRunner → HyperframesRenderer → Composition` propagation.
- Full Theme/Channel/Episode/Beat precedence, including explicit, `auto`, and missing legacy values.
- Transition use of the next scene's resolved palette.
- Channel update API/repository round-trip for Answer Card and Background.
- Episode creation inheritance, persistence, and invalidation.
- Preview/production resolved-style and provenance parity.
- Minimal production corrections only when a new boundary test proves a residual defect in the Phase 8A contract.

### Out of scope

- Browser visual matrix, CSS bundling changes, semantic background refactor, cleanup of legacy adapters, or broad module splitting.

## Completed subphase 8C — Production/Sandbox parity and visual evidence

### Outcome

Make production and Sandbox use the same semantic background contract, bundle only CSS for variants actually used by a composition, and replace string-only visual claims with inspected browser/render evidence.

Phase 8C is complete. Its dated handoff records canonical background parity, selected-only CSS assembly, deterministic reduced-motion behavior, the inspected 16-case artifact matrix, running-app async and accessibility checks, and the Playwright Channel synchronization workflow. Browser inspection also closed portrait overflow/occlusion and reduced-motion mascot state-window defects at their owning CSS boundaries.

### In scope

- Shared semantic background layer and stable selectors across both surfaces.
- Selected-variant CSS assembly with one copy per used variant and no unused or duplicate legacy background CSS.
- Deterministic and reduced-motion parity.
- Reviewable artifact matrix covering all four layouts, both aspect ratios, both backgrounds, representative Answer Card skins, and mascot on/off states.
- Running-app verification for desktop/mobile, keyboard/touch, success, slow, error, retry, and rapid-change latest-request-wins behavior.
- Playwright/browser-protocol coverage for the critical Sandbox-to-production style workflow.

### Out of scope

- New variants, layouts, skins, four-choice support, unrelated UI redesign, or cleanup whose only purpose is file-size reduction.

## Completed subphase 8D — Cleanup and acceptance closure

### Outcome

Remove or explicitly bound obsolete compatibility paths, ensure layout dimensions have one canonical owner, improve cohesion only where mixed responsibilities remain, and close the dossier with complete executable and visual evidence.

Phase 8D is complete. CodeGraph, repository search, and targeted tests proved the legacy background adapter caller-free, so it was removed. The shared layout capability catalog is now the only layout-dimension owner; server CSS and ratio consumers read its metrics directly, with `P8D-DIM-01` preventing drift. Structure analysis found no Phase 8 module whose responsibilities justified a mechanical split. All retained Phase 8B/8C tests, the 16-case Chromium artifact matrix, the running Sandbox workflow, production composition workflow, and workspace gates pass.

### In scope

- Remove `legacyBackgroundAdapter.ts` only if CodeGraph and repository search prove there are no required callers; otherwise keep one documented, derived compatibility boundary with an owner and removal condition.
- Make the typed layout capability catalog the canonical dimensions source. Remove duplicate hard-coded views, or keep a derived compatibility view only when a real caller requires it.
- Review `node scripts/analyze_structure.mjs` output and split only modules that actually mix responsibilities or dependency directions.
- Remove stale suppressions, dead exports, temporary bypasses, unexplained TODOs, and duplicated policy within Phase 8 scope.
- Re-run all workspace, E2E, artifact, and primary workflow gates.
- Update As-Is, inventory, compatibility, verification, roadmap, and handoff evidence to match reality.
- Produce a checkpoint commit plan. Commit or stage only when the user explicitly authorizes it.

### Out of scope

- Mechanical file splitting, broad rewrites, dependency upgrades, new product features, four-choice support, or automatic commits.

## Invariants for all remaining subphases

- Preserve the current four production layouts and two registered backgrounds.
- Preserve existing persisted records with missing or `auto` style fields.
- Keep layout, palette, background, foreground motion, and choice skin as independent axes.
- Keep production entry points thin and external I/O at dedicated boundaries.
- Do not use external image/audio providers in deterministic tests.
- Preserve unrelated dirty working-tree changes and never stage, commit, revert, or delete them without explicit authority.
- Do not mark a later subphase `READY` from a `PARTIAL` or `BLOCKED` handoff.
- The separate four-choice project remains `DEFERRED` after Phase 8.

## Completion rule

Phase 8 is complete: every required case in `phase-08-test-matrix.md` is satisfied, 8B–8D have factual dated handoffs, the full verification suite and primary workflows pass, visual evidence was inspected rather than inferred from strings, and the roadmap records the final repository state.
