# Variant Recipes and QA

## Thinking recipes

thinking-01-head-tilt-left; thinking-02-head-tilt-right; thinking-03-look-up; thinking-04-look-down; thinking-05-paw-near-chin; thinking-06-gentle-sway; thinking-07-focused-blink; thinking-08-curious-lean-left; thinking-09-curious-lean-right; thinking-10-calm-breathing.

## Celebrate recipes

celebrate-01-both-hands-up; celebrate-02-small-jump; celebrate-03-clap; celebrate-04-lean-left-smile; celebrate-05-lean-right-smile; celebrate-06-excited-bounce; celebrate-07-one-hand-victory; celebrate-08-joyful-wave; celebrate-09-excited-turn; celebrate-10-happy-bow.

Recipes are stable semantic instructions, not random prompt fragments. Every prompt must preserve the exact style-anchor face, costume, palette, proportions and camera. It must request one centered character, fixed scale, twelve clearly separated poses and a flat removable chroma background. No text, scenery, multiple characters, detached effects, motion lines or model-generated atlas.

## Automated gates

- Exactly twelve manifest frame entries.
- Every rectangle is inside the atlas.
- Every frame has alpha coverage above the configured minimum.
- No unsafe edge contact, residual chroma, hidden RGB or interior transparent holes.
- Content bounds, pivot and registration are valid and stable across the row.
- Duplicate ratio is below the configured threshold.
- Motion difference is above the configured threshold.
- Thinking seam passes.
- Celebrate cycle or return-to-rest one-shot policy passes.
- Atlas, manifest and QA reports share one fingerprint.

## Manual gate

A reviewer must watch the row preview and contact sheet and confirm identity, semantic action, continuity, child-safe presentation and lack of distracting artifacts. Automated reports cannot prove that a row reads as thinking or celebration.

A slot is ready only after both automated and manual gates pass. A failed row blocks style publication; never hide it by dropping frames, changing timing or re-enabling CSS motion.

