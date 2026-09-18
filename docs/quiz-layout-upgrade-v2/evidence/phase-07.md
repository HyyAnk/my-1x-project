# Phase 07 report: Split Versus and Verdict

## Status

Complete

## Source and scope

- Current commit: `7f08a3ea8342a9c15a32345cf83a0673293d5023`
- Relevant dirty files before work: None from layout upgrade; dirty files in unrelated mascot/animation areas were preserved intact.
- Requirement IDs: R04, R05
- Files changed:
  - `apps/server/src/quiz/render/layouts/styles/splitVersusTwo/splitVersusTwoChoiceStyles.ts` (updated: media 646x421 with four 32px rounded corners, answer surface 646x122 at y=684 with 10px separation and 32px corners, composite card 646x553, VS emblem 96x96 centered at (1090, 463.5), text-only markup with no letter badges)
  - `apps/server/src/quiz/render/layouts/styles/verdictTrueFalse/verdictTrueFalseBaseStyles.ts` (updated: hero 820x565 at (380, 253) viewport 800x545, choice group left 860 width 560 height 565 with 44px gap, True/False buttons at y=349.5 and 557.5, shared vertical center at 535.5)
  - `apps/server/src/quiz/render/layouts/styles/verdictTrueFalse/verdictTrueFalseButtonStyles.ts` (cleaned: removed ::after check/cross pseudo-content and obsolete letter-badge styling)
  - `apps/server/test/binaryLayoutsPhase07.test.ts` (created: 9 unit tests verifying geometry, CSS tokens, centered alignment, and removal of letter badges and pseudo-content)
- New files and responsibilities:
  - `apps/server/test/binaryLayoutsPhase07.test.ts`: Automated test suite for Split Versus Two and Verdict True/False geometry contracts.
- Out-of-scope changes preserved:
  - Unrelated mascot and topic history files preserved.

## Implementation

- Contract changes:
  - **Split Versus Two (`split_versus_two`)**:
    - Columns locked at x = 380 and 1154 (128px central gap).
    - Media box expanded to 646x421 (+55px), viewport 622x397, 12px border, with all 4 corners rounded 32px.
    - Answer surface repositioned to y = 684 (+65px), retaining 646x122, with all 4 corners rounded 32px and a 10px separation below the media border.
    - Card composite envelope is 646x553 with visible overflow.
    - VS emblem is 96x96 centered at canvas (1090, 463.5) [local in arena: left 662, top 162.5].
    - Uses `text_only` variant in `choiceSurfaceMarkup.ts`: no A/B badges, no badge margins, centered answer text.
  - **Verdict True/False (`verdict_true_false`)**:
    - Hero image box expanded to 820x565 (+15px height), viewport 800x545, 10px border.
    - Answers group at left 860, width 560, height 565, vertically centered with 44px gap between True and False buttons.
    - True button at y = 349.5 (560x164); False button at y = 557.5 (560x164).
    - Shared vertical center with hero at y = 535.5 (Hero center: 253 + 565/2 = 535.5; Answers center: (349.5 + 557.5 + 164)/2 = 535.5).
    - Removed `::after` checkmark (`PASS`) and cross (`FAIL`) pseudo-content. Answers display pure text labels ("True", "False").
    - Correctness evaluation strictly relies on `correct_choice_id`.

## Verification

| Command or workflow | Build/source | Result and exit code | Evidence |
| ------------------- | ------------ | -------------------- | -------- |
| `pnpm --filter @studio/server exec vitest run test/binaryLayoutsPhase07.test.ts` | Local | Exit 0 (9 passed) | Split media +55, answer +65, 32px radii, VS emblem centering, Verdict hero 820x565, shared center 535.5, no pseudo-content or badges |
| `pnpm --filter @studio/server exec vitest run test/visualLayoutsPhase06.test.ts` | Local | Exit 0 (6 passed) | Visual Card and Pure Visual regression |
| `pnpm --filter @studio/server exec vitest run test/textLayoutsPhase05.test.ts` | Local | Exit 0 (9 passed) | Media Left and Full Stack List regression |
| `pnpm --filter @studio/server exec vitest run test/choicePrimitives.test.ts` | Local | Exit 0 (21 passed) | Choice markup variant and skin integration |
| `pnpm --filter @studio/server exec vitest run test/quizFrameAnchors.browser.test.ts` | Local | Exit 0 (55 passed) | All 55 browser anchor assertions pass across all 7 layouts without collision |
| `pnpm --filter @studio/server typecheck` | Local | Exit 0 | Clean TypeScript compilation |

- Current-runtime restart/rebuild: Vitest browser and unit test runners.
- Primary workflow rerun: Measured fixed anchors, card surfaces, and choice text fits across all layouts in headless browser.
- Visual inspection: Verified Split Versus contender cards have rounded 32px corners with 10px gap between media and text; verified Verdict True/False buttons and hero share exact vertical center at 535.5px without check/cross suffixes.

## Gate assessment

- Gate passed: Yes
- Blocker or required approval: None
- Exact next action: Proceed to Phase 08 (`phases/08-mystery-data.md`).
- Safe resume instructions: Binary layouts are fully upgraded, verified in browser, and passing all tests. Ready for Mystery single-answer domain and data flow implementation.
