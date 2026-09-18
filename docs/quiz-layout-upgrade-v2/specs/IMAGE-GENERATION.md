# Image sizing and generation specification

## Selection algorithm

Preserve recommendImageSizing's existing mismatch calculation:

```text
sourceRatio = numerator / denominator
viewportRatio = viewportWidth / viewportHeight
utilization = min(sourceRatio / viewportRatio, viewportRatio / sourceRatio)
mismatch = 1 - utilization
cover crop loss = mismatch
contain crop loss = 0; contain unused area = mismatch
```

Choose among 16:9, 4:3, 3:4 and 1:1 by smallest worst-case mismatch across all real viewports, then mean mismatch, then the existing deterministic tie break. Do not use absolute ratio subtraction.

## Target recommendations

| Layout       | Border-box media | Image viewport / slot         | Ratio | Fit     | Crop area | Existing policy raster recommendation |
| ------------ | ---------------- | ----------------------------- | ----- | ------- | --------- | ------------------------------------- |
| Media Left   | 720x570          | 696x546                       | 4:3   | cover   | 4.3956%   | 1120x840                              |
| Visual Card  | 452x411          | 432x391                       | 1:1   | cover   | 9.4907%   | 648x648                               |
| Pure Visual  | 452x564          | 432x544                       | 3:4   | cover   | 5.5556%   | 648x864                               |
| Split Versus | 646x421          | 622x397                       | 16:9  | cover   | 11.8703%  | 1152x648                              |
| Verdict      | 820x565          | 800x545                       | 4:3   | cover   | 9.1667%   | 1216x912                              |
| Mystery      | 920x540          | slot 880x500; content 880x495 | 16:9  | contain | 0%        | 1408x792                              |

Mystery's content aspect is exactly 16:9. Its available 880x500 slot has 1% unused area after contain; that is a 2.5px band at top and bottom, not cropping. Do not report 100% slot utilization.

The raster recommendations use the existing 1.5x oversampling and multiples-of-eight alignment algorithm. They are minimum quality recommendations, not a requirement that every provider accept arbitrary dimensions. A provider may return a larger supported resolution with the exact requested ratio.

Full Stack has no image slot or image-generation request.

## Crop direction and prompt safety

Crop percentages are total discarded source area with centered cover at settled scale 1, before corner clipping/animation.

| Layout       | Expected crop direction | Critical-detail safe inset in generated source |
| ------------ | ----------------------- | ---------------------------------------------- |
| Media Left   | Left/right, ~2.20% each | L/R 8%, T/B 6%                                 |
| Visual Card  | Top/bottom, ~4.75% each | L/R 6%, T/B 10%                                |
| Pure Visual  | Top/bottom, ~2.78% each | L/R 6%, top 8%, bottom 14%                     |
| Split Versus | Left/right, ~5.94% each | L/R 12%, T/B 6%                                |
| Verdict      | Top/bottom, ~4.58% each | L/R 6%, T/B 10%                                |
| Mystery      | None                    | 6% each edge                                   |

These are critical-detail bounds, not instructions to shrink every entire object to a tiny central patch. Preserve a large recognizable subject, complete silhouette where relevant, and consistency across visual-choice sets. Pure Visual's lower reserve protects details from the floating badge as well as crop.

Sample common prompt block, with values supplied from the resolved layout contract:

```text
Output aspect ratio: 3:4.
Create one large, clearly recognizable subject with a complete silhouette.
Keep critical identifying details inside the safe region: 6% from the left and right, 8% from the top, and 14% from the bottom.
The image will be displayed in a portrait choice card with a badge overlapping its lower center.
Do not draw the card frame, badge, answer text, letters, captions, watermark, or interface elements.
```

For Mystery, request a complete clean subject, not a pre-blurred/mosaic image. Concealment and reveal are runtime effects. Keep the existing transparent-background workflow where it is intentional; preserve the canvas ratio after matting.

## Pipeline propagation

1. Shared layout geometry resolves the actual image slot.
2. recommendImageSizing selects the ratio and raster recommendation.
3. planQuizAssets persists aspect_ratio plus geometry_key and recommended dimensions.
4. compileQuizAssetPrompt receives layout-aware framing, not ratio alone.
5. Prompt compaction/sanitization preserves ratio and critical safe-region instructions.
6. Provider request receives the same ratio. Explicit incompatible size overrides produce a structured error.
7. Provider adapter checks returned metadata and decoded image dimensions. Retry a mismatched ratio according to bounded existing policy or report it; do not silently stretch.
8. Matting/background removal preserves the original canvas dimensions. If an existing path trims transparent bounds, restore the intended canvas before use; do not accidentally introduce a second crop.
9. CSS consumes the same slot geometry. UI requirements display the derived ratio, size and contain/cover behavior.
10. Geometry/framing revision participates in new asset fingerprints so a same-ratio but differently framed request cannot reuse a mismatched cached image.

## Cache and version decisions

- This is new-generation work. No mass invalidation or regeneration of historical assets.
- Keep sizing algorithm policy_version=1 if its algorithm is unchanged.
- Introduce geometry revision 2 in the canonical geometry key or equivalent current fingerprint input.
- Bump prompt cacheVersion for layout-aware framing.
- assetFingerprint currently omits sizing geometry. Include geometry/framing revision in a deliberate typed input and test same-ratio/different-geometry invalidation.
- Do not remove old artifact reconciliation utilities merely because old images are not a migration target; verify new requests use the new contract.

## Provider tests and costs

Use mock/provider-contract tests first. Inspect enabled adapters using tests and configured provider capabilities, without displaying credentials. Do not make paid generation requests as part of planning. During implementation, request user authorization if live provider QA requires new spending. Report mocked versus real-provider evidence separately.
