# Phase 2 Execution Brief: Layout Capability Contract

Status: READY

Dependency: Phase 1 COMPLETE with a dated handoff

## Goal

Turn the layout catalog from descriptive metadata into one typed, executable policy for compatibility, layout resolution, render metrics, QA, asset sizing, and UI consumers. Remove repeated layout-specific dimensions and string branches without adding a new layout.

## User-visible outcome

Valid existing quizzes continue to resolve and render as before. Invalid explicit layout combinations produce a structured, actionable incompatibility result instead of silently passing through. Auto resolution remains deterministic and existing persisted layout IDs remain valid.

## Required design boundary

The shared contract must represent, at minimum:

- stable layout ID;
- supported choice presentation;
- supported choice counts;
- supported versus merely recommended formats;
- media requirement or capability;
- supported aspect ratios;
- canonical render and asset metrics needed by server consumers.

The exact type and function names must follow current code after Phase 1. Keep pure policy in `@studio/shared`; server HTML, CSS, and web icon details stay outside the shared package.

Compatibility evaluation must return typed success or structured failure reasons. Auto selection may choose a compatible fallback. An incompatible explicit request must not be silently replaced; callers decide how to surface the failure. Preserve the existing resolver through a focused compatibility adapter only where a staged migration genuinely needs it, with a named removal condition.

## In scope

1. Extend or replace the current catalog item contract with executable capabilities and metrics.
2. Add a pure compatibility evaluator and deterministic resolver.
3. Migrate production renderer lookup, Director validation, visual QA, image optimization, Sandbox/API validation, and web metadata consumers that currently repeat or ignore layout facts.
4. Derive renderer dimensions from one authoritative contract rather than a parallel manual map.
5. Expose structured issue codes and next actions at validation boundaries.
6. Preserve the `baseline` preview-only adapter without treating it as a production catalog layout.
7. Keep current `auto` output unchanged for all Phase 1 canonical cases.
8. Update source inventory, compatibility matrix, ADRs if policy changes, roadmap, and the Phase 2 handoff.

## Out of scope

- No new layout ID or visible layout selector redesign.
- No scene pipeline or slot migration.
- No choice renderer consolidation.
- No CSS ownership or preset refactor.
- No background registry.
- No four-choice support.
- No silent rewriting of stored Director plans.

## Implementation constraints

- Do not create one contract for shared code and another for server code.
- Distinguish `supported` from `recommended`; recommendation must not masquerade as validity.
- Do not make UI translations, icons, or component imports dependencies of shared policy.
- Do not use unchecked string casts to bridge exhaustive records.
- Preserve old public functions only when a real caller still requires them; mark the migration path with a tested removal condition.
- Return structured errors rather than throwing provider- or renderer-specific messages from pure policy.

## Verification focus

- Shared unit tests for all compatibility reason branches and auto/explicit behavior.
- Exhaustive parity between persisted layout IDs, catalog entries, server renderers, and web UI metadata.
- Server integration tests for Director/QA issues and layout-aware optimizer metrics.
- Sandbox request validation for compatible and incompatible combinations.
- Existing Phase 1 characterization suites remain green, with assertions updated only for intentional Phase 2 policy changes.

## Acceptance criteria

- Every required case in `phase-02-test-matrix.md` passes.
- One authoritative capability contract drives compatibility and metrics.
- Existing valid auto and explicit cases retain their IDs and render output semantics.
- Incompatible explicit requests return a typed reason and are surfaced at relevant boundaries.
- Baseline remains preview-only and cannot leak into persisted production layout IDs.
- No layout-specific string branch remains in image optimization when the required metric belongs in capabilities.
- No new layout, schema choice count, choice renderer, CSS architecture, preset behavior, or background behavior is introduced.
- Applicable workspace gates and primary workflows pass.
- Phase 2 handoff is complete and Phase 3 is marked `READY` only after all exit criteria pass.

## Stop rules

Stop and report when compatibility enforcement would invalidate existing persisted artifacts without a safe staged path, when capability data cannot live in shared code without importing runtime/UI concerns, or when pre-existing work overlaps the required contract files.
