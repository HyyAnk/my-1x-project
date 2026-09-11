# Design Contract

## Problem and verified cause

`packages/shared/src/quizLayouts.catalog.ts` currently supplies static asset metrics. `resolveQuizLayoutAssetAspectRatio()` reads those values; it does not calculate image geometry. Both `sandboxSceneAdapter.ts` and `assetPlanner.ts` call it. Consequently, they consistently select the same outdated ratio.

The three visual choice layouts all advertise 640 x 640 and 1:1. Their measured inner image viewports are 432 x 336, 432 x 484, and 622 x 342. All three use `object-fit: cover`. A square source therefore loses approximately 22.22%, 10.74%, and 45.02% of its area, respectively. These figures describe geometric cropping, not a guarantee that the subject is cut off.

The optimizer also reads catalog metrics and uses Sharp `fit: inside`; it cannot repair a mismatched source composition. Existing tests assert the static square choices and can pass while the UI is wrong.

## Alternatives and selected approach

| Approach                                               | Benefit                                       | Limitation                                                                                  | Decision                              |
| ------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------- |
| Change three catalog ratios and sample labels          | Small edit                                    | Geometry can drift again; stale Episode plans and cached assets remain                      | Reject as the complete solution       |
| Measure browser DOM for every generation request       | Captures computed CSS                         | Adds browser/network/font lifecycle to asset planning; unstable during animation; expensive | Use measurement for verification only |
| Shared image geometry plus deterministic sizing policy | Testable, fast, reusable by server and client | Requires a focused extraction from existing CSS                                             | Selected                              |

## Non-negotiable requirements

R1. Preserve existing outer frame/arena positions, card sizes, badges, question text, answer order, semantic correctness, timing, and reveal effects. This is not a layout redesign.

R2. Use the image content viewport, excluding border, padding, labels, and decorative chrome. Store source geometry once; renderer CSS and recommendations must consume it. Do not derive sizes from the displayed, zoomed Sandbox iframe.

R3. Cover all eight active 16:9 layouts and their actually rendered media roles. `full_stack_list` produces no image requirements. Split Versus text mode produces no choice images. Baseline and portrait/Short Reel keep compatibility but are not new production migration targets.

R4. Preserve `cover` versus `contain` semantics. Choose a supported standard ratio by the documented policy. Distinguish source aspect ratio from slot ratio, recommended raster dimensions, provider request dimensions/preset, and actual returned dimensions.

R5. Resolve the effective production layout before planning assets. `auto` and invalid layout combinations must not silently use a fallback square. Sandbox and Episode must use the same resolution inputs where applicable.

R6. Remove square-only prompt language when the selected ratio is not square. Preserve style consistency and fairness across an answer set. All choices in an equal-sized answer set use the same framing contract.

R7. Pass the selected ratio through primary and fallback providers, respecting each adapter's supported sizes and the user's model/resolution/quality configuration. No silent upgrade to a more expensive preset and no new provider dependency.

R8. Detect stale plans, generated-asset identity, and render optimization outputs. Repeated builds must not reuse incorrect files simply because an asset ID or output mtime matches. Do not delete original media or silently replace explicit user-selected images.

R9. Confirm actual image metadata at the data-access boundary. A successful HTTP status or copied `aspect_ratio` field is not proof of a correctly sized image. Reuse the same validation in resolver, completion check, and render preparation.

R10. Keep Sandbox controls and sample labels synchronized without F5. Show relevant pending, failure, stale, and retry states. Expose diagnostics through the existing details surface, not a new dashboard full of controls.

R11. Verify the same image contract against both Sandbox HTML and production HTML, then render and inspect an actual local MP4 with fixture images. Existing passing tests and a successful build alone are insufficient.

## Scope and approval boundaries

- Use the current TypeScript, Zod, Vitest, Playwright, Sharp, and HyperFrames installation. No dependency upgrades in this work.
- No changes to quiz facts, knowledge base, taxonomy, narration, audio processing, thumbnails, unrelated transition code, mascot generation, or provider routing policy.
- Forwarding omitted provider configuration in this image-sizing path is in scope; selecting a different default provider is not.
- Do not run paid APIs or mass-replan existing Episodes merely to test the implementation. Use temporary repository fixtures and intercepted HTTP requests.
- Asset replacement can spend money in normal product use. Viewing a page, changing Sandbox layouts, or checking compatibility must not trigger generation.
- An explicit generation/build request may prepare current requirements. If an old Episode requires newly billable replacements solely due to migration, stop before the provider call and require the existing user-confirmation mechanism; show the affected count. Do not add a new billing system.
- Preserve existing responsive site footer behavior. Do not add a footer to video frames. Do not alter existing credits: this task does not resolve the owner's broader English-only versus proper-name credit conflict.

## Interaction plan

| Flow                       | Immediate response                               | Work and state changes                                                                   | Recovery and synchronization                                                                                    |
| -------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Select Sandbox layout      | Select updates; preview shows `Updating preview` | Pure recommendation is derived immediately; server preview uses same inputs              | Commit sample/diagnostics with the matching preview request; never label old preview as current                 |
| Rapid A-B-C selection      | Latest selection remains active                  | Cancel or ignore A/B response and font-readiness completion                              | Only C clears pending and updates preview; retain scrubber/phase                                                |
| Preview error              | Adjacent error and retry                         | Keep previous frame clearly marked as stale                                              | Retry same latest inputs; no input reset, no duplicate generation                                               |
| Open an existing Episode   | Show saved assets and compatibility state        | Read-only comparison against current requirements                                        | No writes or billing on load; stale assets do not count as fully ready                                          |
| Request image generation   | Pending action, duplicate submission disabled    | Reconcile plan; validate reuse; generate only eligible missing assets                    | Preserve successes on partial failure; retry failed assets only                                                 |
| Build with a stale plan    | `Checking image requirements`                    | Reconcile or block with `Image requirements changed` before render/provider side effects | Reuse existing action/confirmation flow to update affected assets; no silent substitution                       |
| Generate/replace completes | Server-confirmed success                         | Refresh asset plan, resolution, assessment, previews, and readiness                      | Existing task events plus refetch on terminal state and reconnect; stale responses cannot overwrite newer state |

Keep unrelated controls usable. Do not report 100% before persistence/validation succeeds. Use real completed/total counts, deduplicate repeated task events, and re-read current server state after reconnect. Honor reduced motion and expose status text to assistive technology.

## UI copy and information hierarchy

Use one compact `Image requirements` details component. Default summary example: `Choices: 4:3`. Expanded rows: `Slot`, `Recommended image`, `Provider request`, `Actual image`, and `Crop` or `Unused space`. The provider/actual rows are absent when unknown, not guessed from a model name.

Sample-image labels describe the generated specimen's real ratio and dimensions. Avoid repeating the same dimension in a badge, main text, and subtitle. Optional technical explanation belongs in a keyboard/touch-accessible disclosure. Critical replacement-cost or stale-asset warnings remain visible. No title ends with a period; no decorative help icons on obvious controls.

On narrow screens the same details stack vertically; preserve readable controls and avoid horizontal page overflow. The logical video canvas remains 1920 x 1080 regardless of browser/device width.
