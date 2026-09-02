# Quiz reveal timing fix design

## Goal

Ensure every question keeps its answers neutral until the reveal boundary, starts the thinking bar at `thinkingStart`, and starts reveal narration and visual reveal together.

## Confirmed causes

- Thinking-bar timing uses the question clip start instead of its own `thinkingStart`, so its fill, marker, countdown and exit fade run too long.
- All six thinking-bar variants include a query marker, which exposes a literal question mark before the countdown.
- The timeline schedules reveal narration after `answer.reveal` because the default policy adds `0.12` seconds.
- Production composition constructs each question scene at `revealStart`; answer cards therefore receive `correct` or `incorrect` semantic state at initial DOM construction.

## Design

`calculateThinkingBarTiming` will use `thinkingStart` as its explicit timer origin and emit `--timer-start` plus a duration ending at `revealStart`. The query marker and its CSS variables/keyframe will be removed from every variant. All timer-related CSS will use the same origin.

Production choice rendering will use a scheduled-reveal mode. It keeps `data-answer-state="pending"` and normal answer classes in the initial DOM while adding inert target classes (`answer-reveal-correct` or `answer-reveal-incorrect`). CSS will animate those target classes from a normal visual state at `revealAt` with `animation-fill-mode: both`. Snapshot/sandbox rendering will continue to use its current canonical `correct` and `incorrect` states.

The timeline default will schedule reveal narration at the `answer.reveal` boundary. Correct-answer animation delay will also use that boundary without its prior extra delay.

## Verification contract

- Targeted tests prove timer origin, no query marker, voice/reveal equality, pending production DOM, scheduled target count, and preserved sandbox semantics.
- Type checking and the affected server test suite pass.
- A regenerated HyperFrames composition is checked and sampled before/after the Q1 and Q2 reveal boundaries.
- A separately named MP4 is inspected at the same boundaries before it replaces any existing artifact.

