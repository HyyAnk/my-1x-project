# Scope and approved requirements

## User-approved requirements

| ID  | Requirement                                                                                     | Owner phases |
| --- | ----------------------------------------------------------------------------------------------- | ------------ |
| R01 | Media Left hero height +60px; left badge, shorter right text box; recenter answers              | 4, 5         |
| R02 | Visual Card images +55px; answer group top +60px; detached badge/text treatment                 | 4, 6         |
| R03 | Pure Visual images +60px; centered badges straddling bottom image border                        | 6            |
| R04 | Split Versus images +55px; answer top +65px; all image/text corners rounded; no letter badges   | 7            |
| R05 | Verdict hero +55px; recenter True/False; no letter badges or redundant symbols                  | 7            |
| R06 | Full Stack keeps A fixed; inter-row gaps +15px; detached badge/text treatment                   | 4, 5         |
| R07 | Fact cards in all active layouts move down 40px; Mystery renders no fact card                   | 3, 9         |
| R08 | Mystery hero +180px; answer border-box bottom 70px above canvas bottom                          | 9            |
| R09 | Mystery has exactly one correct answer; remove every Mystery multi-choice mode                  | 8, 9, 11     |
| R10 | Mystery timer fully disappears; exactly 0.5 seconds later image/answer reveal starts            | 9            |
| R11 | Mystery explanation/fact narration remains; no visual fact card                                 | 8, 9         |
| R12 | New images use optimal 16:9, 4:3, 3:4 or 1:1 ratio; propagate into prompts and provider request | 2, 10, 11    |
| R13 | Optimize new generation; no old-image migration or regeneration requirement                     | 1, 10, 12    |
| R14 | Plan and implement end to end with tests, fresh runtime verification and agent handoff evidence | 1-12         |

"Remove multiple choices" means Mystery Reveal only. Other A/B/C and binary layouts remain supported.

## Engineering decisions made by this plan

These fill unspecified details without changing the intent. They are implementation defaults, not claims that the user specified every number:

- Keep 1920x1080, all existing horizontal columns, title/counter/brand anchors and typography families.
- Choose taller badges while preserving row envelopes in Media Left and Full Stack. Text surfaces are 81.6%-82.9% of their badge heights.
- Treat answer displacement as the top of the answer assembly, not the top of its centered text surface.
- Anchor a Pure Visual badge center exactly to the image's bottom edge.
- Preserve the existing 2-answer variants of Media Left/Full Stack; apply the same spacing language to them.
- Split Versus retains the VS emblem, distinct from removed answer-letter badges. Center it between the enlarged images.
- Scope the 0.5-second gap to Mystery. Preserve other layouts' timing unless a shared correctness defect forces a documented repair.
- Scope the 40px fact shift to all seven active landscape layouts; Mystery's fact is absent. The legacy baseline and unsupported portrait path are not new deliverables.
- Introduce question answer_mode to distinguish single_reveal from choice_selection without globally weakening 2/3-choice validation.
- Store Mystery's sole answer as one choices item with an exact matching correct_choice_id; do not invent a duplicate answer_text storage field.
- Use an 880x500 inner image slot in Mystery with centered 16:9 content measuring 880x495.
- No automatic data migration, deletion, fixture-channel reset, provider spending or publication is authorized by the planning request.

## Non-goals

- No redesign of question headers, mascot systems, brand rail, backgrounds, palettes, transitions or unrelated dashboard pages.
- No global removal of multiple-choice questions.
- No newly supported 9:16 quiz layouts. Mobile dashboard previews scale the same landscape canvas.
- No new image-generation provider, production dependency or generalized layout framework.
- No blanket relaxation of visual QA, contrast, crop validation or type safety.
- No compatibility layer for old experimental images. Preserve user files; lack of migration requirements is not deletion permission.

## Implementation hygiene

The worktree already contains extensive user changes, including the files this upgrade touches. Capture current status and hashes at phase 1. Preserve unrelated changes and do not reset/stash/revert them. If a file changes during execution, reread and merge deliberately.

All new repository files, documentation, prompts, test fixtures and UI strings must be English. Preserve existing responsive application footer behavior; do not introduce credits into the video canvas or rewrite the shell as part of this task.
