# Phase 4 Visual Evidence

These screenshots were generated from the production composition and Sandbox public render paths after the unified choice renderer migration. They are deterministic structural review artifacts for the selected-skin change and the focused 9:16 visual-choice capacity correction.

## Production

| Artifact                                  | Coverage                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `production-16x9-comic-chunky-visual.jpg` | Visual-three, Comic Chunky, reveal, missing-media fallback                              |
| `production-16x9-minimal-soft-text.jpg`   | Media-left, Minimal Soft, text reveal                                                   |
| `production-9x16-glass-neon-visual.png`   | Full 1080×1920 visual-three, Glass Neon, portrait reveal, all three cards within canvas |

## Sandbox

| Artifact                                         | Coverage                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| `sandbox-16x9-glossy-arcade-visual.jpg`          | Glossy Arcade visual reveal                                              |
| `sandbox-16x9-comic-chunky-visual.jpg`           | Comic Chunky visual reveal                                               |
| `sandbox-16x9-glass-neon-visual.jpg`             | Glass Neon visual reveal                                                 |
| `sandbox-16x9-minimal-soft-visual.jpg`           | Minimal Soft visual reveal                                               |
| `sandbox-9x16-glossy-arcade-visual-mascot-0.png` | Full 1080×1920 Glossy Arcade portrait without mascot                     |
| `sandbox-9x16-comic-chunky-visual-mascot-1.png`  | Full 1080×1920 Comic Chunky portrait with mascot occupancy               |
| `sandbox-9x16-glass-neon-visual-mascot-0.png`    | Full 1080×1920 Glass Neon portrait without mascot                        |
| `sandbox-9x16-minimal-soft-visual-mascot-1.png`  | Full 1080×1920 Minimal Soft portrait with mascot occupancy               |
| `sandbox-9x16-comic-chunky-text-mascot.png`      | Full 1080×1920 media-left Comic Chunky text reveal with mascot occupancy |

Browser inspection confirmed semantic A/B/C labels, one canonical correct state, deterministic fallback images, visibly distinct skin treatments, and final card bounds no greater than `850px` in 16:9 or `1855px` in the full `1080×1920` portrait canvas. The superseded cropped portrait JPEGs are retained only as earlier structural captures; the PNGs are the authoritative full-canvas evidence.
