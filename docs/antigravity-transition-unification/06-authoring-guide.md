# Adding and Changing Transitions

This guide describes the target system after the implementation plan. It is the ongoing maintenance contract, not an instruction to add a new effect during this upgrade.

## 1. Add an effect

1. Create one pure module under `packages/shared/src/transitions/definitions/` with a stable English ID, implementation revision, concise name, supported placements, duration bounds/default, handoff contract, deterministic markup, and scoped styles.
2. Use existing palette/context inputs and local bundled assets. If the effect needs an asset, include its content hash in preparation; no runtime network fetch, random clock, or external provider call.
3. Register the module once in `catalog.ts`. The metadata endpoint, selectors, production dispatch, and default test matrix discover it through this catalog.
4. Add effect-specific tests for its geometry/coverage and intentional landmarks. Generic registry coverage runs automatically but cannot judge whether the design is useful.
5. Render before/after sample/production fixtures in both supported aspect ratios, at minimum/default/maximum durations and frame-boundary cases.
6. Review artifact-derived frames and approve the design before release. New effect availability must be tied to its validated implementation, not a label added to a dropdown.

Do not edit `TransitionPreviewPlayer`, routes, `candyArcadeClips`, `customVideoClips`, or independent frontend enums merely to teach them a new ID. If those edits are necessary, the migration has not achieved extensibility.

## 2. Modify an effect

1. Keep the stable ID for the same effect identity; change the implementation revision for every visible/timing/asset/semantic change.
2. Modify its canonical definition or genuinely shared primitive once. Never edit a preview-only copy.
3. A shared primitive change affects every consuming definition: bump/recompute their revisions, rerun their matrices, and show each affected effect's before/after evidence.
4. Rebuild/restart the affected shared/server runtime. The active catalog's content revision must represent loaded executable bytes, not merely changed source files on disk.
5. The metadata revision and content fingerprint invalidate existing sample caches. The visible sandbox automatically requests the new artifact after catalog revalidation; it must not present old pixels under the new revision.
6. Running jobs finish against their original immutable snapshot. Existing episode outputs remain unchanged. New renders use the newly resolved revision unless an explicit older runnable snapshot is requested and available.

A stored old MP4 remains reviewable even if its implementation is no longer installed. Re-rendering an unavailable historical implementation must fail explicitly; preserving old manifests does not magically preserve old executable code. A new version must never be silently substituted for an explicitly pinned old revision.

## 3. Timing authoring

- Express phases in normalized progress and scale them to the single effective duration.
- Keep source handoff declared in the definition and anchored to the immutable production boundary.
- Design and verify full coverage at a covering handoff; do not hide a cut with an assumed midpoint.
- Include delayed particles, brand marks, flashes, and release motion in the declared lifetime. No tail accidentally survives into unrelated content.
- Keep render output deterministic for out-of-order seeks. Do not depend on playback history, `performance.now`, `Date.now`, unseeded randomness, pointer/focus, or an independent animation loop.
- HyperFrames owns clip scheduling. Avoid authoring a second runtime to hide/show timed clip roots.
- Cut is a topology change at one boundary, not a zero-duration CSS animation that divides by zero.

## 4. Configuration and compatibility

Use the shared resolver's placement/default/bounds and paired ID/duration semantics. Do not put frontend-specific defaults in the player. Accept the legacy `auto` sentinel only as a selection policy; it never receives markup or a catalog preview entry.

Do not delete persisted IDs without a documented migration. For a rename, preserve an explicit alias only at the persisted-data adapter; define removal conditions and affected data versions. Unknown IDs must result in an actionable unsupported-transition state, not a visually unrelated fallback.

Validate persisted records structurally so an unavailable effect can be diagnosed without making unrelated presets unreadable. Validate active catalog availability at resolution/render time. Keep schema-derived documentation and provider prompts in sync through the canonical catalog projection rather than maintaining another hand-written effect list.

## 5. Developer inspection workflow

```text
Edit canonical definition
        -> rebuild/restart loaded runtime
        -> catalog content revision changes
        -> sandbox marks prior artifact stale
        -> production-backed sample renders automatically
        -> inspect video and exact paused frames
        -> run production parity/regression tests
        -> review and approve the visual change
```

Diagnostics may expose definition revision, effective duration/frame count, source boundary, artifact hash, and runtime fingerprint inside the existing overflow details panel. These are not required controls on the main surface.

## 6. Required change checklist

- [ ] One implementation changed; no preview/render fork introduced.
- [ ] Revision and content hashes changed for visual/timing changes.
- [ ] Shared primitive consumers are included in verification.
- [ ] Saved config remains readable and round-trippable.
- [ ] Source/media/narration boundaries remain unchanged unless explicitly approved.
- [ ] Default/min/max/window-limited durations and both aspect ratios inspected.
- [ ] Forward/backward/shuffled frame seeks are deterministic.
- [ ] Whole clip and handoff-adjacent frames inspected from actual artifacts.
- [ ] Cache refresh and in-flight immutable snapshot behavior tested.
- [ ] No duplicated selector/transport, hidden essential warning, or new unnecessary tuning control.
- [ ] Updated runtime rerun, test commands recorded, and visual change approved.

## 7. Out-of-scope extensions

A new placement (for example a true overlapping scene dissolve, a custom outro handoff, or square video), an external asset-generation system, dynamic untrusted transition code, a node editor, or a shader engine is not just another ID. Propose and approve the new capability contract and its scheduling/security/verification requirements before integrating it. Do not broaden this upgrade into a general-purpose effects framework.
