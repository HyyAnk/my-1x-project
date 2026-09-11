# Per-Layout Geometry

`layout-targets.json` is the numeric source of truth. All coordinates below are global canvas coordinates. Inside the content wrapper, subtract `(380,253)` once; do not add scene padding again. These are proposed design boxes, not measured current output.

## Shared card rules

- An answer rectangle includes its card, label, letter badge, and their layout allocation. It is not merely the background pill. Existing negative badge margins must be accounted for inside this composite box, not allowed to enlarge the group unpredictably.
- Answer text: retain current family/weight, group-fit to a common size; preferred 44 px for Media Left/full-stack, 48 px for binary verdict, 36 px for compact/labeled cards. Minimum 32 px; maximum two lines. Pure visual labels are intentionally hidden, but letter badges remain.
- Text-only card badge: 104 px for Media Left (two-choice: 112), 112 px for verdict/full-stack, 72 px for Mystery/Clue. Center badges vertically inside the answer rectangle. Set badge padding/gap so text never runs under it. No negative external overhang is required.
- At minimum size, if text does not fit completely, report the existing structured choice overflow through the preview/render boundary. Do not silently shrink below 32 px, truncate, change the answer, or expand its rectangle.
- Same-choice group font size is the minimum fitting size among its choices, not a separate size for each row.
- Hero dimensions include borders. Default subject fit is `contain`, centered; do not stretch imagery. Preserve an explicitly approved photographic crop only when it does not cut necessary identifying features. Background decoration can fill empty margins without inventing assets.
- For three-way visual comparisons, normalize perceived subject scale as far as existing source metadata permits. Do not use arbitrary per-item zoom that gives away the answer. Transparent, square, wide, and tall sources are required QA cases.
- Keep revealing/settling motion inside the documented paint envelope. Reserve at least 12 px between the painted badge/card and neighboring cards at peak motion. Avoid scaling an entire full-width row beyond its allocated gutters.

## 1. Media Left Choices Right

Hero: `(380,253,720,510)`. Answer column starts x=1140, width=660; horizontal gap=40.

| Count | Card height | Card y values | Gap |
| ----- | ----------- | ------------- | --- |
| 2     | 152         | 336, 528      | 40  |
| 3     | 132         | 274, 442, 610 | 36  |

The answer group is centered on hero center-y=508. Reduce the oversized badge relative to current pills so the answer text gains width. The hero changes modestly from the measured approximately 728 x 540; title/counter/brand are not resized.

## 2. Visual Choices Three

Three composite answer cards: x=380,864,1348; y=253; width=452; height=504. Gaps=32.

Each card: media box 356 px high; 16 px gap; label band 132 px high. Label y=625. An 88 px badge sits within the label band, with at least 16 px leading inset and 16 px gap before text. The image and label must remain a single answer group for entrance/reveal state, even if split into internal wrappers.

No separate question hero is displayed in this layout. Use choice media only. The three cards remain equal-sized, including during the explanation phase.

## 3. Visual Choices Three Pure

Use the same three outer boxes as the labeled variant, but use the full 504 px height for media. No label band. Put an 88 px letter badge at local `(16,16)` within each card; reserve that corner from critical subject detail.

Preserve the existing intended no-text presentation; do not remove the letter, add a repeated caption, or render a fourth hero. Maintain identical object scale/crop policy across the three candidates.

## 4. Split Versus Two

Composite candidate boxes: `(380,253,646,504)` and `(1154,253,646,504)`. Central gap=128.

VS emblem: `(1042,457,96,96)`. It is centered at `(1090,505)` with 16 px nominal clearance from either candidate.

- Visual mode: media=366 px; gap=16 px; label=122 px; badge=96 px.
- Text mode: retain the two 646 x 504 candidate boxes, place the badge and answer centrally inside each. Do not display empty media frames or a fabricated hero.
- The current renderer consumes choices and intentionally omits a separate hero even when upstream media capability mentions question media. Preserve this behavior; changing it would require a distinct content-contract decision.

## 5. Verdict True False

Hero: `(380,253,820,510)`. Answer boxes: `(1240,322,560,164)` and `(1240,530,560,164)`. Gap=44; both centered around hero center-y=508.

Use two clear alternatives with their existing correctness semantics; never infer correct/incorrect merely from the labels or colors. Preserve check/cross feedback and space for it inside the fixed candidate box. No extra VS emblem.

## 6. Full Stack List

No hero. Center an answer column at x=450, width=1280 (70 px inset inside the arena).

| Count | Height | Card y values | Gap |
| ----- | ------ | ------------- | --- |
| 2     | 164    | 329, 533      | 40  |
| 3     | 140    | 275, 443, 611 | 28  |

These groups are centered on arena center-y=513. Keep text left-aligned after a consistent badge rail. A short answer does not trigger a narrower individual card. Do not add an image or decorative content to fill the unused space.

## 7. Mystery Reveal

Hero reveal viewport: `(630,253,920,360)`. Candidate strip starts y=637, height=120, leaving a 24 px gap under the hero. This separates image and answers rather than overlaying answer cards on the identifying subject.

| Count | Card x values  | Width | Visibility                                             |
| ----- | -------------- | ----- | ------------------------------------------------------ |
| 0     | None           | None  | Preserve no-choice behavior; never fabricate an answer |
| 1     | 630            | 920   | Preserve single-answer reveal timing                   |
| 2     | 470, 1110      | 600   | Normal choice window                                   |
| 3     | 380, 864, 1348 | 452   | Normal choice window                                   |

The mosaic/silhouette and pristine image layers must use **the same** viewport, contained subject box, transform origin, crop, and dimensions. A changing clip/mask reveals the image without changing its registration. Update the current 1100 px revealed-inner assumption to the new 920 px viewport, not only the outer wrapper.

Keep the answer strip in the layout-owned content area but outside the hero clipping wrapper. Remove selectors that assume answers are direct children of `.mystery-stage-wrapper`. Preserve scanner, mask, winner/loser state, and reveal event timing.

If the existing zero-choice model supplies a real resolved answer independently of the candidates, its reveal plate may use the one-answer box. Do not synthesize a candidate or change persisted choice counts to achieve that.

## 8. Clue Deduction

Outer dossier panel: `(380,253,1420,510)`.

- Header: `(400,265,1380,40)`; preserve current case label, clue indicators, and status. Use at least 24 px for meaningful header text; do not introduce new clues or fabricate progression.
- Evidence viewport: `(400,329,824,410)`.
- Candidate column: x=1256, width=524; a 32 px gap after evidence.

| Count | Height | Card y values |
| ----- | ------ | ------------- |
| 0     | None   | None          |
| 1     | 144    | 462           |
| 2     | 144    | 376, 548      |
| 3     | 116    | 340, 476, 612 |

Each candidate group is centered on evidence center-y=534. This layout is an evidence-and-candidates split inside the dossier, not a new multi-clue product. Preserve the current loupe, reticle, image treatment, clue activation timestamps, and solved state. Use one clear evidence frame; do not preserve redundant blank padding by nesting the new viewport inside the old full-width frame.

Clue decoration and its answer column may differ from Mystery Reveal, while all five fixed elements stay identical.

## Rendering limits

The fixed shell has no count-specific, text-length-specific, mascot-specific, or layout-specific coordinate variants. Invalid data must not trigger a silent layout fallback. Existing explicit compatibility errors remain authoritative. `baseline` and 9:16 are regression controls, not targets for these numbers.
