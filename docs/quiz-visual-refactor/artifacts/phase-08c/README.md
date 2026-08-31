# Phase 8C Visual Evidence

Generated and inspected with local Playwright Chromium, then manually reviewed from the final PNGs. Phase 8D reran the full matrix after cleanup. Every case passed browser geometry, overflow, mascot/choice and phase/content occlusion, font readiness, semantic background fill, mascot on/off state, and reduced-motion computed-style checks.

| ID  | Surface    | Layout                   | Aspect | Background  | Answer Card   | Mascot | Artifact                                                             | Inspect |
| --- | ---------- | ------------------------ | ------ | ----------- | ------------- | ------ | -------------------------------------------------------------------- | ------- |
| 01  | production | media_left_choices_right | 16:9   | candy_rays  | glossy_arcade | on     | [PNG](./01-production-media_left_choices_right-16x9-candy_rays.png)  | PASS    |
| 02  | sandbox    | media_left_choices_right | 16:9   | aurora_glow | comic_chunky  | off    | [PNG](./02-sandbox-media_left_choices_right-16x9-aurora_glow.png)    | PASS    |
| 03  | sandbox    | media_left_choices_right | 9:16   | candy_rays  | comic_chunky  | off    | [PNG](./03-sandbox-media_left_choices_right-9x16-candy_rays.png)     | PASS    |
| 04  | production | media_left_choices_right | 9:16   | aurora_glow | glass_neon    | on     | [PNG](./04-production-media_left_choices_right-9x16-aurora_glow.png) | PASS    |
| 05  | sandbox    | visual_choices_three     | 16:9   | candy_rays  | comic_chunky  | off    | [PNG](./05-sandbox-visual_choices_three-16x9-candy_rays.png)         | PASS    |
| 06  | production | visual_choices_three     | 16:9   | aurora_glow | glass_neon    | on     | [PNG](./06-production-visual_choices_three-16x9-aurora_glow.png)     | PASS    |
| 07  | production | visual_choices_three     | 9:16   | candy_rays  | glass_neon    | off    | [PNG](./07-production-visual_choices_three-9x16-candy_rays.png)      | PASS    |
| 08  | sandbox    | visual_choices_three     | 9:16   | aurora_glow | minimal_soft  | off    | [PNG](./08-sandbox-visual_choices_three-9x16-aurora_glow.png)        | PASS    |
| 09  | production | media_top_choices_bottom | 16:9   | candy_rays  | glass_neon    | on     | [PNG](./09-production-media_top_choices_bottom-16x9-candy_rays.png)  | PASS    |
| 10  | sandbox    | media_top_choices_bottom | 16:9   | aurora_glow | minimal_soft  | off    | [PNG](./10-sandbox-media_top_choices_bottom-16x9-aurora_glow.png)    | PASS    |
| 11  | sandbox    | media_top_choices_bottom | 9:16   | candy_rays  | minimal_soft  | off    | [PNG](./11-sandbox-media_top_choices_bottom-9x16-candy_rays.png)     | PASS    |
| 12  | production | media_top_choices_bottom | 9:16   | aurora_glow | glossy_arcade | on     | [PNG](./12-production-media_top_choices_bottom-9x16-aurora_glow.png) | PASS    |
| 13  | sandbox    | full_stack_list          | 16:9   | candy_rays  | minimal_soft  | off    | [PNG](./13-sandbox-full_stack_list-16x9-candy_rays.png)              | PASS    |
| 14  | production | full_stack_list          | 16:9   | aurora_glow | glossy_arcade | on     | [PNG](./14-production-full_stack_list-16x9-aurora_glow.png)          | PASS    |
| 15  | production | full_stack_list          | 9:16   | candy_rays  | glossy_arcade | on     | [PNG](./15-production-full_stack_list-9x16-candy_rays.png)           | PASS    |
| 16  | sandbox    | full_stack_list          | 9:16   | aurora_glow | comic_chunky  | off    | [PNG](./16-sandbox-full_stack_list-9x16-aurora_glow.png)             | PASS    |

See `manifest.json` for explicit input and style IDs, Phase 8D revalidation metadata, and all inspection fields. No external provider or network asset was used.
