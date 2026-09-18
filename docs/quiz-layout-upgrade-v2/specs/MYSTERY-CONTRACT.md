# Mystery single-reveal contract

## Domain, not a CSS option

A Mystery question has exactly one correct answer. There is no zero-answer production state and no 2/3-answer Mystery variant. Other layouts retain existing supported counts.

Proposed stable question discriminator:

```typescript
type QuizAnswerMode = "choice_selection" | "single_reveal";
```

Add answer_mode to QuizQuestionSchema and scene persistence. Default to choice_selection for ordinary questions; new Mystery producers must explicitly write single_reveal. Keep schema_version 2 unless repository schema policy requires a coordinated version change. This additive discriminator is not a migration of old images.

For single_reveal:

- choices.length === 1; the item has a nonempty stable ID and nonempty text.
- correct_choice_id === choices[0].id.
- No fabricated distractors, synthetic placeholders or slicing a bad 3-choice response down to one.
- The question's image_guess or multiple_choice format is not sufficient by itself to infer Mystery. The explicit answer_mode and resolved layout must agree.
- New Mystery producers use image_guess; single_reveal combined with true_false or odd_one_out is invalid.
- Explicit Mystery + choice_selection is rejected at the production boundary with a regenerate-as-Mystery action.
- Explicit single_reveal + non-Mystery layout is rejected; auto must resolve to Mystery, not silently fall back.
- At the public sandbox boundary, layout_id=mystery_reveal requires exactly one choices item and correct_choice_index=0; derive single_reveal internally.
- Ordinary choice_selection still enforces existing exact 2/3 cardinalities. Do not lower global minimums without a mode-specific refinement.

## Data boundaries that must change

1. Bank cardinality: bankRequiredChoiceCountForArchetype("mystery_reveal") returns 1. Other archetypes keep existing counts.
2. BankQuestionSchema choices container allows 1..3 with exact archetype refinement.
3. Translation content allows one item; parent/source-aware validation requires identical IDs and count. Do not allow unrelated translations to lose options.
4. Batch prompt builders and archetype guidelines demand one answer. Batch parsers must reject invalid Mystery counts, not reuse normalizeChoices to invent/remove candidates.
5. Lossless bank conversion carries answer_mode and exact correct ID. Historical converter cannot pad new Mystery questions to three.
6. Direct generation and remix prompts/parsers include answer_mode; preserve it in remixes and translations.
7. Semantic QA and repository scene policy use the question's mode, not only an episode-level format.
8. scene_plan.md serialized quiz payload preserves answer_mode. Round-trip through sceneCodec.ts and quizArtifactSynthesizer.ts must not erase it.
9. Bank/manual editors and API routes reject multi-choice Mystery even if an old UI submits it.
10. Catalog supportedChoiceCounts becomes [1]; supported media is question only. Remove unsupported Mystery choice-illustration capability.
11. Remove Mystery-only answer-count-0/2/3 CSS, wrong-answer branches and specimen fixtures. Do not delete shared variants used by other layouts.
12. Keep ordinary Split Versus behavior stable. Its pre-existing conversion of two choices to true_false is adjacent semantic debt; do not silently redesign that contract in this upgrade.

No batch rewrite of channels, banks, persisted experiments or previously produced videos is part of this work. Existing incompatible Mystery records may report a clear regeneration requirement.

## Narration safety

buildQuizVoicePlan must omit the :choice segment for single_reveal. Do not merely mute it in CSS or keep it in TTS scheduling. An existing/stale choice segment supplied to the compiler must never be scheduled for Mystery.

compileChoicesBeat must not emit visible candidate-enter events for Mystery. Its returned readiness timestamp must still wait for question narration to finish; skipping choices must not let countdown start while the question is being read.

Reveal narration contains the answer and cannot begin before revealStart. Explanation and fun-fact segments remain; keep their actual audio durations and post-reveal scheduling.

Decouple fact narration from fact.enter events. Mystery can retain semantic narration/mascot events without creating a visual fact-card dock. Renderer must not emit a Mystery fact-card node in either snapshot, rehearsal or production.

## Exact timeline

Keep current visible timer origin at question/clip start. Do not change it to thinkingStart.

Let T be the canonical timestamp at which the timer is completely invisible:

- Timer exit fade duration: 0.28 seconds, entirely within [T-0.28,T].
- Mystery suspense interval: [T,T+0.5).
- Reveal image, scanner, answer entrance and reveal SFX begin at R=T+0.5.
- Reveal voice starts at R or later, never earlier.
- Retain the 0.85-second Mystery image reveal wipe; align the answer entrance start to R, removing the existing extra +0.12-second delay.
- Answer remains present through explanation/fact narration and until the question exits.
- No timer at or after T. No answer or revealed-image pixels before R.
- Mosaic/silhouette remains visible during the 0.5-second gap.
- The 70px bottom gap is measured at the settled answer border box; its animation must stay inside the canvas.

Example: if timerHideAt=7.47, revealStart=7.97. During 7.47..7.97 both timer and answer are absent, but the masked image remains. At 30fps the interval is 15 frames; at 60fps it is 30 frames.

## Timing integration contract

Add timerHideAt to QuizSceneTiming and the timeline-to-render adapter. Pass it to ThinkingBarRenderInput and calculateThinkingBarTiming. Derive duration and final countdown displays from timerHideAt, not revealStart.

Production must compute T from the actual countdown schedule and audio readiness, then set R=T+0.5. Do not independently apply Math.max to R afterward and accidentally vary the gap.

For long countdown narration:

- Resolve/probe audio durations before the final timeline is built.
- Final numbered countdown audio must fit its countdown window without crossing T. If the product uses fixed 5-second ticks, narration longer than the available window is a typed pacing failure requiring regeneration/retiming; never cut it silently.
- Earlier question/thinking narration may move the whole countdown schedule later, within validated policy limits.
- All ticks, timer duration and audio must use the recomputed schedule; no zero/negative duration.
- A missing optional countdown voice still produces the exact gap.
- A missing required answer or question voice is reported according to the existing audio pipeline, never replaced with early answer text.

Use a pure shared timing function, with logical seconds accurate to 0.001. Rendering may quantize to an output frame; never reveal early. For odd frame rates, use documented outward rounding with at most one-frame difference.

Sandbox must use the same relative timer/reveal contract rather than independent 7.47/8.27/8.8 constants. A gap does not require a new public phase enum: it may remain phase=thinking with thinking=hidden, answers=pending. Derive element visibility from both mode and timestamps.

Static snapshot at phase=reveal must select a post-entrance settled time. Rehearsal and production must prove the actual blank interval under seek. Seek backward must restore the masked image, hide the answer and reset timer state without stale classes.

## Required invalid cases

- Mystery choices 0, 2 or 3.
- One choice but wrong/missing correct_choice_id.
- Whitespace answer; duplicated/missing translation ID.
- Explicit Mystery with choice_selection.
- single_reveal routed to Full Stack/Visual Card.
- Provider-generated distractors for a single-answer bank request.
- Timeline answer.reveal or reveal narration before T+0.5.
- Fact markup created only in one renderer.
- Obsolete :choice voice persisted and accidentally scheduled.

Reject invalid generation output with actionable errors. Do not coerce it into a superficially valid but semantically changed answer.
