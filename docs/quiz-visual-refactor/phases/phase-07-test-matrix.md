# Phase 7 Background Registry Test Matrix

Use these IDs in tests or the Phase 7 handoff.

## Contract and resolution

| ID        | Priority      | Case                              | Required result                                             |
| --------- | ------------- | --------------------------------- | ----------------------------------------------------------- |
| P7-CAT-01 | MUST_AUTOMATE | Background schema versus registry | Exact parity excluding `auto`                               |
| P7-CAT-02 | MUST_AUTOMATE | Missing legacy field              | Resolves to `candy_rays` and old records parse              |
| P7-CAT-03 | MUST_AUTOMATE | `auto` through style precedence   | Deterministic inherited variant with provenance             |
| P7-CAT-04 | MUST_AUTOMATE | Explicit variant                  | Selected ID preserved through preview and production inputs |
| P7-CAT-05 | MUST_AUTOMATE | Preset background                 | Affects background only; production layout remains semantic |
| P7-CAT-06 | MUST_AUTOMATE | Registry/UI metadata              | Exhaustive unique mapping with concise translations         |

## Rendering and determinism

| ID        | Priority      | Case                       | Required result                                                  |
| --------- | ------------- | -------------------------- | ---------------------------------------------------------------- |
| P7-REN-01 | MUST_AUTOMATE | `candy_rays` compatibility | Current layers and visible semantics preserved                   |
| P7-REN-02 | MUST_AUTOMATE | Proof animated variant     | Own scoped HTML/CSS, palette-driven and layout-independent       |
| P7-REN-03 | MUST_AUTOMATE | Identical seed and inputs  | Stable output                                                    |
| P7-REN-04 | MUST_AUTOMATE | Different declared seed    | Deterministic bounded variation only where supported             |
| P7-REN-05 | MUST_AUTOMATE | CSS assembly               | Selected background CSS included once; no duplicate legacy block |
| P7-REN-06 | MUST_AUTOMATE | Selector boundary          | Background CSS does not target layout/choice/skin internals      |
| P7-REN-07 | MUST_AUTOMATE | Layer and animation budget | Within declared registry metadata and benchmark threshold        |

## Surface, accessibility, and visual behavior

| ID        | Priority      | Case                               | Required result                                               |
| --------- | ------------- | ---------------------------------- | ------------------------------------------------------------- |
| P7-SUR-01 | MUST_AUTOMATE | Production versus Sandbox          | Same variant semantic layers for same inputs                  |
| P7-SUR-02 | VERIFY_VISUAL | Every palette pairwise             | Text/choice contrast and hierarchy remain acceptable          |
| P7-SUR-03 | VERIFY_VISUAL | Four layouts at 16:9/9:16 pairwise | No background/layout coupling or occlusion                    |
| P7-SUR-04 | MUST_AUTOMATE | Reduced motion                     | Static intentional scene with continuous animation disabled   |
| P7-SUR-05 | VERIFY_VISUAL | Mascot and reveal effects          | Background remains behind content and does not obscure status |

## UI and synchronization

| ID       | Priority      | Case                             | Required result                                                   |
| -------- | ------------- | -------------------------------- | ----------------------------------------------------------------- |
| P7-UI-01 | MUST_AUTOMATE | Background selector              | Uses existing grouped/scalable control pattern                    |
| P7-UI-02 | MUST_AUTOMATE | Immediate pending feedback       | Selection acknowledged without blocking unrelated controls        |
| P7-UI-03 | MUST_AUTOMATE | Latest response wins             | Stale background response cannot overwrite current selection      |
| P7-UI-04 | MUST_AUTOMATE | Failure and retry                | Selection preserved; concise recovery action                      |
| P7-UI-05 | VERIFY_VISUAL | Keyboard, touch, desktop, mobile | All labels/options/actions accessible and fit                     |
| P7-UI-06 | VERIFY_VISUAL | Copy and footer audit            | Concise strings, no title period, required responsive credit once |

## Workflow evidence

Record focused registry/resolver/render/UI tests, full workspace gates, deterministic fixture evidence, performance measurements, rebuilt app verification, production/Sandbox output for both variants, reduced motion, palettes, layouts, desktop/mobile, slow/error/retry, and rapid-selection cases.
