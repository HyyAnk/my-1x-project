# Canonical geometry specification

## Coordinate rules

All values are CSS pixels on a fixed 1920x1080 canvas. Rectangles are border boxes at settled scale 1, before shadows/transforms. x/y mean top-left. Image viewport excludes border/padding. Absolute canvas coordinates are authoritative; local layout coordinates subtract (380,253). Apply box-sizing: border-box explicitly.

Browser geometry tolerance: 0.5px. Raster comparison may differ by 1px. Do not round Verdict's half-pixel positions independently.

## Fixed anchors

| Element  |   x | y before | y after | Width | Height |
| -------- | --: | -------: | ------: | ----: | -----: |
| Question | 380 |       53 |      53 |  1420 |    168 |
| Timer    | 470 |      946 |     936 |  1240 |     84 |
| Fact     | 470 |      846 |     886 |  1240 |    156 |

Counter remains centerX=180, top=0. Brand remains centerX=180, top=390, width=320.

Fact bottom is 1042, leaving 38px. This is a deliberate, fact-only exception to the old 54px bottom safe zone. Preserve font size and card height. Limit visible lower shadow/glow extension to 16px, avoid downward overshoot, and inspect actual pixels below the card; do not weaken the entire canvas safe zone.

## Media Left + 3 Choices Right

Hero: (380,253,720,510) -> (380,253,720,570). Border=12, image viewport=(392,265,696,546).

Three answers:

| Part                      | A          | B          | C          | Size                            |
| ------------------------- | ---------- | ---------- | ---------- | ------------------------------- |
| Assembly / badge top-left | (1140,304) | (1140,472) | (1140,640) | Assembly 660x132; badge 132x132 |
| Text surface top-left     | (1234,316) | (1234,484) | (1234,652) | 566x108                         |

Rows remain 132px tall with 36px gaps. Total=468; (570-468)/2=51. Thus each row moves down 30px from the old top values 274/442/610. Badge/text overlap horizontally by 38px, placing about 29% of the badge above the text surface so both parts read as one control. Surface padding moves the visible text start 6px right while preserving the outer assembly edge.

Two-answer support: row tops 366/558, assembly 660x152, badge 152, text=(1248,380/572,552,124). Gap=40 and overlap=44. This is the same +30px recentering, not a new layout.

Arena=(380,253,1420,570); hero bottom=823; fact gap=63.

## 3 Choice Visual Card

Columns x=380/864/1348; width=452, horizontal gap=32.

- Media: y=253, height 356 -> 411 (+55); border=10.
- Viewport: 432x391; media bottom=664.
- Old label assembly top=253+356+16=625.
- New label assembly top=685 (+60), height=104; bottom=789.
- Image-to-assembly gap=21, exactly old 16 + (60-55).
- Badge: 104x104 at each column's x, y=685.
- Text surface: x=columnX+74, y=694, width=378, height=86.
- Horizontal badge overlap=30 (about 29%); vertical inset=(104-86)/2=9. The badge remains above the surface in stacking order, while surface padding shifts the visible text start 6px right.
- Composite card size=452x536, not the old 452x504.
- Arena height=536; fact gap=97.

Do not add 60px to the whole visual card: only the answer assembly moves; image top stays fixed.

## 3 Choice Pure Visual Cards

- Media: (columnX,253,452,504) -> (columnX,253,452,564).
- Border=10; viewport=432x544.
- Image bottom=817.
- Badges are 88x88 with center=(columnX+226,817).
- Badge top-left=(562/1046/1530,773); bottom=861.
- Composite card envelope=452x608, distinct from media height=564.
- Arena height=608. Fact starts at 886; rest-state clearance=25.
- Keep text semantically available for accessibility but not visually rendered.
- Clip images within their media wrapper; allow the badge to overflow that wrapper only.

Collision QA must include peak scale, translate and shadow. Do not preserve large inherited bounce blindly. Start with whole-card scale capped at 1.02, no downward float, and badge depth shadow <=8px; prove the actual envelope stays clear of the fact dock.

## 1v1 Split Versus

Columns x=380/1154, width=646, central gap=128.

- Media y=253, height 366 -> 421 (+55); border=12; viewport=622x397.
- Old answer top=619, new top=684 (+65).
- Answer surfaces=(380/1154,684,646,122), bottom=806.
- Media bottom=674; separation=10.
- Composite card size=646x553; arena height=553.
- Image and answer each use 32px rounding on all four corners.
- No A/B badge or residual badge padding. Text centered in each image's horizontal column.
- Keep the VS emblem 96x96 at (1042,415.5), center=(1090,463.5), aligned to image centers. Avoid percentage-of-entire-card positioning.

The existing text-only fallback remains 646x504 at y=253 and loses letter badges. It must not generate fictional image slots; the +55/+65 rules apply when images exist.

## Verdict True/False

Hero=(380,253,820,565), border=10, viewport=(390,263,800,545).

Two 560x164 answer surfaces with 44px gap occupy 372px. Group top=253+(565-372)/2=349.5.

- True=(1240,349.5,560,164).
- False=(1240,557.5,560,164).
- Shared vertical center=535.5.
- Omit badges and decorative check/cross suffixes: visible labels are only True and False.
- Keep centered text and existing semantic colors; correctness still comes from correct_choice_id.
- Arena height=565; hero bottom=818.

## Full Stack List

Three-answer assemblies remain 1280x140 at x=450:

| Answer | Old y | New y | Badge             | Text surface       |
| ------ | ----: | ----: | ----------------- | ------------------ |
| A      |   275 |   275 | (450,275,140,140) | (550,287,1180,116) |
| B      |   443 |   458 | (450,458,140,140) | (550,470,1180,116) |
| C      |   611 |   641 | (450,641,140,140) | (550,653,1180,116) |

Gap 28 -> 43. A is fixed; B +15, C +30. Badge/surface overlap=40, keeping about 29% of each badge above its surface. Surface padding shifts the visible text start 6px right. Do not keep justify-content:center over the old height, which would move A upward. Use explicit top=22 locally or derive from the locked A anchor.

Two-answer variant: first y=329 stays fixed; second 533 -> 548; assemblies 1280x164; gap 40 -> 55. Badges=164; text x=568, width=1162, height=136, y=343/562. Overlap=46.

Arena height=528 covers the three-answer last bottom=781. Two-answer last bottom=712.

## Mystery Reveal

- Stage outer=(630,253,920,540), previously height 360.
- Explicit outer border=4, inner padding=16.
- Available inner slot=(650,273,880,500).
- Centered 16:9 image content=(650,275.5,880,495).
- Remove inherited nested image borders/padding/shadows that reduce this viewport again.
- Do not size revealed-inner to an inconsistent outer width. Both mosaic and revealed content use exactly the same local content rect.
- Keep contain; do not scale past the image slot or use cover for this layout.
- Answer=(630,890,920,120), formerly y=637. Delta=253.
- Answer bottom=1010; canvas bottom gap=70. Stage bottom=793; answer gap=97.
- No badge and no fact card.
- Arena height=757 covers the answer bottom. Timer spatial overlap is allowed only because timer and answer are mutually exclusive in time.

## Bounding-contract migration

The old common arena height 520 and timerProtection rectangle starting at y=804 cannot remain universal "no content" rules. Derive per-layout arenas above. Protect actual active timer/fact rectangles by phase; allow only documented badge and temporal overlaps. Do not fix failures by adding ignore attributes to scene roots.

Only 16:9 production layouts are in scope. Responsive dashboard resizing scales the canvas uniformly, including pixel offsets, rather than reflowing these coordinates.
