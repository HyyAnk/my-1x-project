# Phase 5 Execution Brief: CSS Ownership and Preset Resolution

Status: PLANNED

Dependency: Phase 4 COMPLETE with a dated handoff

## Goal

Enforce clear ownership between layout, base component, typography, state, skin, palette tokens, and style resolution. Make production and Sandbox resolve the same visual style precedence and serialize the same semantic palette variables without changing production layout selection.

## User-visible outcome

Existing presets and explicit element styles continue to produce the same intended appearance in production and preview. Layouts no longer override skin internals, skins remain stable across aspect ratios, and preview/production no longer disagree because they resolved styles or palette variables differently.

## Required architecture

CSS responsibilities follow ADR-003:

- layout owns placement, outer dimensions, gaps, aspect adaptation, and capacity tokens;
- base choice/component CSS owns stable structure;
- shared state CSS owns lifecycle and correct/incorrect behavior;
- shared typography CSS owns tiers and consumes layout capacity tokens;
- skin CSS owns color, border appearance, shadow, texture, and explicit decoration hooks;
- palette serialization owns one semantic variable vocabulary used by both surfaces.

Style resolution must be pure and expose provenance where practical. Preserve this precedence unless current Phase 4 evidence requires an ADR change:

    theme defaults
        < channel defaults
        < selected preset or episode values
        < explicit episode custom values
        < explicit Director beat values

Visual presets may select a Sandbox showcase layout but must not force production layout selection, per ADR-001.

## In scope

1. Extract shared base, state, typography, and token CSS modules from mixed legacy CSS.
2. Replace layout rules that reach into skin internals with capacity custom properties and stable outer hooks.
3. Migrate every Answer Card skin and current layout to the ownership contract.
4. Centralize semantic palette variable serialization for production and Sandbox, with temporary aliases only when a real caller requires migration.
5. Centralize theme/channel/preset/episode/beat style resolution in pure shared or domain-level services used by server and web.
6. Preserve legacy custom preset fields through explicit adapters and removal conditions.
7. Make CSS assembly deterministic and deduplicated; include required variant CSS once per composition rather than through accidental repeated concatenation.
8. Add ownership/precedence tests and visual regression evidence.

## Out of scope

- No new layout, element skin, palette, preset, or background style.
- No background registry or background animation redesign.
- No four-choice support.
- No unrelated UI redesign.
- No production layout selection from a visual preset.

## Implementation constraints

- Custom properties are not sufficient unless ownership and fallback values are explicit.
- Normal layout/skin composition must not depend on `!important`; accessibility overrides such as reduced motion may use it when justified.
- Layout modules must not target skin-specific classes or set decorative border, shadow, texture, or color rules.
- Skin modules must not set outer grid placement or layout-specific widths.
- Do not store duplicate resolved state in server and web; share pure contracts and translate at boundaries.
- Preserve `auto` semantics and legacy stored preset data.
- Keep CSS modules cohesive; do not replace one god TypeScript CSS string with another.

## Verification focus

- Static ownership tests or focused assertions for forbidden cross-layer selectors/properties.
- Pure precedence tests for every source layer, `auto`, missing values, and beat overrides.
- Production/Sandbox palette variable parity.
- Registry and CSS assembly deduplication.
- Visual pairwise regression across layouts, skins, phases, aspects, and mascot occupancy.
- Existing Phase 1–4 tests remain green except intentionally superseded CSS-string assertions.

## Acceptance criteria

- Every required case in `phase-05-test-matrix.md` passes.
- Layout, base, state, typography, skin, and token CSS have explicit focused owners.
- No active layout rule reaches into a concrete skin's private structure.
- One style-resolution policy is used by web preview and server production boundaries.
- One semantic palette serializer supplies both surfaces.
- Presets remain independent from production layout selection.
- Required variant CSS is deterministic and not duplicated in a composition.
- Existing valid presets and explicit overrides preserve behavior, with reviewed evidence at both aspect ratios.
- Applicable workspace gates and primary workflows pass.
- Phase 5 handoff is complete; both Phase 6 and Phase 7 may become dependency-satisfied, but mark only Phase 6 `READY` for the planned sequential execution.

## Stop rules

Stop when current persisted configuration cannot distinguish inherited versus explicit values without a data migration, when CSS ownership requires breaking a public markup contract not migrated in Phase 4, or when visual differences cannot be reviewed reliably.
