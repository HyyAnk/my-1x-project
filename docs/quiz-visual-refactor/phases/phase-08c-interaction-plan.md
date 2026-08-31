# Phase 8C Interaction and Verification Plan

Status: COMPLETE

## Primary flow and state transitions

1. A layout or background selection updates the visible control immediately and schedules a debounced preview request.
2. While compiling, the previous confirmed preview remains visible with a concise pending status; duplicate manual render submissions are disabled without freezing unrelated controls.
3. A successful response is verified in the hidden frame, then atomically replaces the confirmed preview and updates its timestamp and contrast state.
4. A failed request preserves the last confirmed preview, exposes a concise error and retry action, and retains the selected input.
5. Rapid changes increment the request ID. Stale responses and stale font-verification completions cannot overwrite newer selections; the latest successful request wins without a page refresh.
6. Applying styles to a Channel uses the existing pending/success/error contract, refreshes Channel state after server confirmation, and prevents duplicate submissions while saving.

## Synchronization and recovery

- Design state is the immediate local source of truth; preview HTML is confirmed server output.
- Preview refresh is bounded by the existing 150 ms debounce and reconciled by monotonically increasing request IDs.
- Retry reuses the current selected state. Errors do not clear the last confirmed frame or user input.
- Channel synchronization waits for the mutation, refreshes affected Channel views, and reports success or failure through the existing notice surface.

## Desktop, mobile, and accessibility

- Desktop retains the inspector/canvas split; mobile stacks the inspector and canvas with document scrolling and no fixed-width overflow.
- Layout remains a named keyboard combobox. Background options are named buttons with visible focus, at least 44 px touch targets, and immediate selected-state feedback.
- Secondary actions remain grouped in existing menus/modals. Tooltips remain available to hover and keyboard focus; essential instructions and actions stay visible.
- The global footer exposes exactly the desktop/tablet or mobile credit, never both. Visible titles have no trailing periods.
- Reduced-motion mode disables continuous background animation while retaining an equivalent static visual state and status text.

## Evidence map

| Matrix case   | Planned evidence                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `P8C-PAR-01`  | Server parity test compares canonical background layer output from production and Sandbox adapters for both variants.                            |
| `P8C-PAR-02`  | Server CSS-assembly test covers one and multiple used variants, deduplication, unused omission, and no legacy duplicate.                         |
| `P8C-PAR-03`  | Determinism tests plus browser `reducedMotion: reduce` computed-style inspection on both surfaces.                                               |
| `P8C-VIS-01`  | Sixteen inspected artifacts cover four layouts × two aspects × two backgrounds.                                                                  |
| `P8C-VIS-02`  | The manifest distributes all four Answer Card skins, mascot on/off, long text, and visual choices without expanding to a full Cartesian product. |
| `P8C-VIS-03`  | JSON/Markdown manifest records surface, IDs, viewport/aspect, mascot state, output path, inspection result, and caveat.                          |
| `P8C-UI-01`   | Running-app desktop/mobile screenshots and measured overflow/footer/copy assertions.                                                             |
| `P8C-ASY-01`  | Hook tests and Playwright cover success, slow, error, retry, rapid selection, loader completion, and no-F5 latest-wins behavior.                 |
| `P8C-A11Y-01` | Component tests and browser inspection cover keyboard focus, accessible names, focus-triggered tooltips, and touch-sized controls.               |
| `P8C-E2E-01`  | Playwright drives Sandbox layout/background selection and confirmed Channel synchronization through browser protocol.                            |

## Verification order

Run focused shared/server/web suites after each cohesive change, generate and inspect the artifact matrix, rebuild/restart the server and web app, run the critical browser workflow, then run all workspace, E2E, audit, dossier-format, and diff-integrity gates.
