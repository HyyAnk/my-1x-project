# Shared Frame Design Contract

## 1. Requirements and chosen approach

The owner wants five fixed roles and two layout-dependent roles. This is a composition-geometry change, not a reskin.

Considered approaches:

| Approach                                                     | Tradeoff                                                             | Decision |
| ------------------------------------------------------------ | -------------------------------------------------------------------- | -------- |
| Repeat the same coordinates in eight CSS files               | Small initial diff but positions drift again when one layout changes | Reject   |
| Shared frame anchors plus layout-owned media/answer arena    | One geometry owner, existing skins and gameplay retained             | Use      |
| Replace the renderer with a general constraint engine/editor | Broad migration and unnecessary product scope                        | Reject   |

## 2. Coordinate semantics

- Design canvas: 1920 x 1080, origin at the top-left, x increases right, y increases down.
- Every rectangle is `{x, y, width, height}` in canvas pixels and refers to an untransformed **border box**, not an image's opaque subject bounds.
- Fixed wrappers own position and size. Entrance/exit and internal decorative motion belong to their children.
- Compare matching skin, content, phase, and local timeline time across layouts. Skin variants may have different intrinsic art dimensions but may not introduce layout-dependent anchor offsets.
- Never use viewport `vw`/`vh` to size these fixed 1920 x 1080 slots. Scale the complete preview canvas uniformly; do not reflow the composition at phone width.
- No ancestor of the fixed wrappers may be translated by a layout-specific grid/margin or animated as part of content.

## 3. Fixed shell

| Role          | Position              | Size policy                                                                  | Visibility                              |
| ------------- | --------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| Counter Badge | center-x=180, top=0   | Preserve selected skin; default header box x=55, y=0, w=250, h=194           | Existing question phases                |
| Question Card | x=380, y=53           | w=1420, h=168; preserve current Media Left typography and skin               | All question phases                     |
| Channel brand | center-x=180, top=390 | w=320; intrinsic height and current fitting retained; SPACE sample h=246.594 | Existing brand visibility policy        |
| Thinking Bar  | x=470, y=882          | w=1240, h=84; current default track h=58, marker h/w=176, SVG h/w=192        | Existing timer window only              |
| Fact Card     | x=470, y=846          | w=1240, h=156                                                                | Existing explanation/reward window only |

Counter and brand coordinates are already suitable in the reference. Do not redesign their typography, borders, icon, opacity, or sizing. Do not hardcode the measured brand height; long and short channel names retain the current name-fitting behavior at the same anchor.

### Thinking Bar calculation

Current reference: top=822, height=84, center=864, bottom=906, bottom gap=174.

Target: top=882, height=84, center=924, bottom=966, bottom gap=114.

Therefore: `targetY = baselineY + 60`; this is **not** `bottom:60px`. Keep x, width, track, marker, number, and style selection unchanged. Other layouts adopt this reference shell, not their own prior timer dimensions. Other timer skins retain internal art while using the same outer slot; do not replace the selected skin with star_slider.

Reserve a conservative default marker/sparkle envelope `(350, 804, 1480, 240)`. It covers the full left-to-right path with a 120 px allowance around either track endpoint and around center-y=924. Measure the actual maximum for every timer skin, including pulse/rotation/strokes and terminal fade; enlarge protection or bound internal animation without moving/resizing the approved shell. A skin that cannot fit is an explicit incompatibility to report, not permission to move the common timer.

### Fact Card contract

Use a separate fixed wrapper centered on the same dock as the timer. Fixed height prevents fact length from moving neighboring content. Do not stack the fact below the timer or keep it inside a layout-specific grid row.

- Border box: 1240 x 156; border: preserve existing 6 px visual treatment; padding: 16 px vertical, 32 px horizontal; border-box sizing.
- Preserve palette/skin, use existing body font at 38 px, line-height 1.2; center text vertically and horizontally.
- Fit text deterministically after fonts load: start at 38 px; decrease by 1 px down to 32 px; allow at most three lines. Use line-height 1.2 for 38 through 33 px and 1.15 at 32 px. No ellipsis, line-clamp truncation, scrolling, or clipping essential text.
- At 32 px the inner height is 112 px, and three 36.8 px lines require 110.4 px. Actual glyph wrapping must be measured, not guessed by character count.
- If the full fact still does not fit, stop the affected preview/render with structured `QUIZ_FACT_TEXT_OVERFLOW`, identify the question, preserve its text, and offer shortening it. Do not rewrite content automatically or move the dock.
- No new fact heading; preserve currently rendered fact semantics. Do not insert the fixture's unused title field into production.
- Thinking and Fact share space **temporally**, not simultaneously. Retain current event boundaries; no visible overlap. In a snapshot only the requested role may be present.

## 4. Variable arena

The arena is `(380, 253, 1420, 520)`. Each layout's nominal media/answer boxes must fit this arena. Details are in `02-layout-geometry.md` and `layout-targets.json`.

Allow controlled shadows/animations outside nominal boxes, but meaningful body paint must stay within x=356..1824, y=237..780 while the footer is visible. This leaves 24 px above the default timer envelope. Do not simply clip a text-bearing card or badge to satisfy the envelope; tune its internal glow, shadow, and motion.

Counter/brand rail x=0..340 is reserved in every layout. Existing mascot configuration remains authoritative. If a custom mascot crosses a fixed role or content envelope, report its actual bounds and configuration; do not silently reanchor/rescale the mascot or move the five fixed roles. Do not change left/right placement semantics in this task.

## 5. Phase and interaction contract

| State    | Fixed shell behavior                                                                   | Arena behavior                                                    |
| -------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Question | Counter, question and eligible brand; timer follows existing narration/thinking policy | Existing hero visibility; choices remain hidden until their event |
| Choices  | Anchors unchanged                                                                      | Existing staged choices entrance                                  |
| Thinking | Timer occupies common slot                                                             | Hold media/choices geometry; preserve clue progression            |
| Reveal   | Timer exits at its existing event                                                      | Correct/incorrect feedback and mystery reveal; no slot reflow     |
| Explain  | Fact appears in common slot                                                            | Keep revealed result visible according to existing policy         |

Fixed does not prohibit bounded internal motion. Keep matching phase-local entrance behavior consistent across layouts; do not animate anchor wrappers. A timer's numeric marker may move along its track. Seeking backward/forward must reproduce the same state without waiting for wall-clock time.

This task should not add UI controls. Existing layout/style selections must acknowledge loading, cancel/ignore obsolete requests, and display only the newest preview. Preserve last valid preview and user selections on error; show an inline retry action through existing preview error paths. Verify layout selection and preview refresh without F5.

## 6. Non-goals and priority

- Keep existing layout IDs, question format/count compatibility, media semantics, skin IDs, style revision behavior, persisted episode fields, timings, audio, and branding rules.
- Do not fabricate hero imagery for text-only layouts or new textual clues for Clue Deduction.
- Do not remove answer labels from the labeled visual layout; do not add text labels to the pure visual layout.
- Preserve portrait and Short Reel behavior. A landscape-only helper must never be applied through an unscoped universal selector.
- Priority: explicit owner requirements > fixed geometry contract > per-layout geometry > existing decorative motion. If constraints cannot all be met, report the specific conflict rather than silently revising fixed geometry.
