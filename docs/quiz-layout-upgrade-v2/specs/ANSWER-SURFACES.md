# Answer surface specification

## Four presentation variants

| Variant            | Layouts                             | Markup requirement                                                 |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| detached_badge     | Media Left, Visual Card, Full Stack | Badge is sibling of shorter painted text surface                   |
| media_bottom_badge | Pure Visual                         | Badge centered on image bottom; no visible text panel              |
| text_only          | Split Versus, Verdict               | No badge node, centered text surface                               |
| single_reveal      | Mystery                             | One text-only answer, hidden before reveal, no wrong-answer states |

Names are proposed internal identifiers. Keep persisted skin IDs unchanged.

## Structural contract

For detached variants:

```html
<div class="choice-card" data-choice-id="...">
  <b class="choice-label" aria-hidden="true">A</b>
  <div class="choice-card-surface">
    <span class="choice-text">Answer text</span>
  </div>
</div>
```

Visual cards additionally contain .choice-media. Preserve identity/order/state attributes on the outer card. The outer answer assembly has transparent background, no decorative border and no extra padding. Paint only the text surface and badge. Badge has the higher z-index.

When no badge is required, do not render an empty badge or preserve its margins. Do not call badge-decoration hooks and then hide their output. Accessibility labels omit A/B for text-only variants.

### Shared detached-badge presentation contract

The detached badge is a shared presentation primitive, not a skin option. Every answer-card skin must preserve these invariants:

- The circular badge overlaps the leading edge of the painted text surface by at least 27% of the badge width.
- The badge is at least 16px taller than the text surface and remains vertically centered against it.
- The badge uses a higher stacking layer than the text surface.
- Visible answer text begins at least 12px after the badge's right edge.

Layouts own `--choice-badge-size`, `--choice-surface-height`, `--choice-badge-overlap`, and `--choice-surface-padding`. Answer-card skins may change color, border, radius, shadow, texture, and decorative effects, but may not declare or override these geometry tokens. The final presentation-contract CSS is emitted after all skin CSS so direct geometry declarations cannot separate the badge from its surface. Decorative transforms may animate the assembled answer without changing its settled layout box.

## Dimensions and typography

Use exact rectangles from GEOMETRY.md. Badge-to-text height ratios:

| Variant        | Badge | Text |  Ratio |
| -------------- | ----: | ---: | -----: |
| Media Left / 3 |   132 |  108 | 81.82% |
| Media Left / 2 |   152 |  124 | 81.58% |
| Visual Card    |   104 |   86 | 82.69% |
| Full Stack / 3 |   140 |  116 | 82.86% |
| Full Stack / 2 |   164 |  136 | 82.93% |

Engineering defaults:

- Detached text border=4px, radius=24px; badge border=4px, circular.
- Media Left text padding=10px vertical, 24px horizontal; fit 32-48px, max 2 lines.
- Visual Card text padding=6px vertical, 20px horizontal; fit 24-36px, max 2 lines.
- Full Stack text padding=10px vertical, 28px horizontal; fit 32-56px, max 2 lines.
- Split text padding=12px vertical, 24px horizontal; fit 28-48px, max 2 lines, radius=32px.
- Verdict keeps its 164px pill; centered text 48px, no automatic correctness icon suffix.
- Mystery text padding=14px vertical, 32px horizontal; fit 28-48px, max 2 lines.
- The exact inner content box includes border and padding subtraction. Badge overlap never overlaps text glyphs: preserve the proposed horizontal text padding.
- Start badge lettering at existing family scale: Media 56px, Visual 48px, Pure 52px, Full Stack 64px. Fit optically only if documented without changing badge bounds.

## Fit behavior

Measure .choice-text against its own painted surface content area, not the parent assembly/media card. Hidden-before-reveal content must still be measured using layout geometry without making it visible.

One fitting font size per visible answer group avoids indicating the correct answer through typography. Try one line, then up to two lines with the existing fit policy. Do not silently lower below the stated minimum or increase fixed card height.

Overflow is a validation failure with a "Shorten answer text" action; preserve the original text. Do not deliver ellipsized answers, silently crop text, or accept tests that pass only because opacity is zero.

## Skin audit

Read every registered skin under apps/server/src/quiz/visual/elements/answerCard/variants. Existing selectors assume .answer-card is the surface or .choice-label is a direct child. Update only affected selectors/hooks, preserving all skin choices.

Correctness belongs to the outer semantic card. State CSS must target the new surface and badge intentionally. Color, shadow and reveal styling must not restore a giant painted outer card or introduce badge spacing into text-only variants.

## Motion

Badge and text must move as a single answer assembly. Do not independently float them out of alignment. Image motion remains separate from layout coordinates. Honor reduced motion; identical state visibility and 0.5-second Mystery delay still apply.
