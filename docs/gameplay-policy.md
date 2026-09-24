# Gameplay policy v1

## Implemented boundaries

- `quizGameplayPolicy.ts` owns gameplay choice count, voice inclusion, age-adjusted thinking windows, countdown and pacing targets.
- Optional `gameplay_id` survives bank conversion, scene serialization, quiz reconstruction and remix. New Versus questions use `multiple_choice` with explicit `versus_faceoff`, not a false True/False label. Existing binary artifacts remain readable.
- Topic and single-question creation share the episode director builder. Single-question creation passes the source age band.
- Director plans carry `gameplay_policy_version`. A selected episode with an older plan is regenerated on pipeline resume and downstream assets, voice, timeline, render and QA are invalidated. Unconfigured legacy plans retain their previous behavior until explicitly regenerated.
- Voice plans use the director policy. Visual Spotting, Mystery, True/False and Speed Blitz omit choice narration; Speed Blitz and binary modes omit repeated thinking prompts.
- Production timing waits for question narration and complete choice entrances. Reduced timing never increases narration speed. Thinking windows include age and difficulty buffers.
- Sandbox rehearsal uses the production compiler with estimated speech durations. Its response carries phase boundaries used by the client scrubber, phase jumps and audio cues. It is an estimate, not a claim to match an episode's measured speech exactly.
- Gameplay QA detects incompatible voice roles, premature answer narration, Mystery choice presentation, invalid Versus labels and excessive Speed Blitz reading load. Fixed-gameplay episodes are not penalized simply for repeating an archetype.
- Composition writes remove obsolete generated scene HTML so rerenders cannot lint old media references. Custom files and source assets are preserved.

## Verification

Run `pnpm --filter @studio/server exec vitest run test/gameplayPolicy.test.ts test/episodeLayoutContinuity.test.ts test/compositionFileWriter.test.ts`.

The opt-in `gameplayRender.system.test.ts` renders three-question specimens for all seven gameplay types. Set `STUDIO_TEST_SUITE=system` and `RUN_GAMEPLAY_RENDERS=1`. Outputs are retained under `tmp/gameplay-policy-renders` with check reports, phase snapshots, MP4 and ffprobe results. These specimens use deterministic fixture graphics and silent audio at measured-duration slots; they test the renderer, not an external image or speech provider.

## Remaining visual-content work

- Visual Spotting emits an explicit review warning: schema checks cannot prove that AI-generated pictures contain exactly one intended difference. Automated image-semantic verification and localized difference-region overlays are not implemented by this policy layer.
- Motion variants and source image treatments remain the existing renderer's designs. The new policy specializes timing, voice, data and asset roles; it does not redesign every animation.
- Old pixel baselines must be reviewed separately against prior visual changes. They have not been overwritten to make comparisons pass.

## Compatibility and extension

Increment the policy version for behavior-changing policy edits. Keep conversion at boundaries and keep layout capability validation separate from gameplay rules. Never change stored source facts or question answers merely to fit a layout. Invalid explicit choices should produce an actionable error rather than silently choosing a different layout.
