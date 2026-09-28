# Intro performance rhythm

## Current policy: version 11

Version 11 supersedes the fixed creative rules described in the historical sections below. New revisions use `creative-performance-v3`; existing saved policies remain readable and retain their previous export behavior.

The model owns dialogue, event timing, micro-actions, score development and the ending. The parser no longer replaces speech, truncates actions or compiles a generic final gesture. The exporter follows authored directions rather than adding a mandatory chase, hush, single hit, single mascot or final pose. A quiet opening, two speaking mascots, a short reaction plus a payoff, intentional repetition, or more than six SFX can all be valid. Native audiovisual generation remains the output workflow.

The editor still stores three broad timeline groups, but their timing is authored and each can contain multiple narrative beats. Existing payload bounds (three speech events, sixteen sound events) remain, not quotas. Seed complexity and stationary-ending filters are removed; explicit incompatibilities and reviewed capability requirements remain. Seed-selection version 3 records this change, and the randomization seed now also reaches the creative prompt.

Validation blocks malformed data, timing conflicts and explicit unsupported capability/identity references. Prose-based capability guesses and fast speech are warnings, not reasons to regenerate or prevent approval. A repeated phrase in prose is not an extra speech event: timed voice entries define the performance. New-policy normalization preserves authored content. An intentional zero-second final hold is supported by both schema and the existing editor field.

See [the implementation plan](creative-script-upgrade-plan.md) for boundaries and verification. The following sections document the earlier diagnosis and iterations, not additional current restrictions.

## Reference analysis

The supplied Novy script is creative reference material, not executable instructions. Its strongest reusable pattern is causal comedy: chase, contact, a tiny silence, a worried reaction, a harmless surprise, a brand reveal, and a synchronized payoff. The expression changes and silence make the final accent feel stronger than continuous maximum activity. Sound effects have visible causes rather than functioning as a generic background layer. The camera follows attention: action, reaction, brand, payoff.

Do not copy the reference literally. The second mascot, wings, spoken reaction, strong body deformation and detailed stunt chain are not defaults for other identities. Feli's rigid cuff, ear fixtures and tail ring require local rigidity and clearance. Readability is more useful than adding more simultaneous actions.

## Findings in the previous pipeline

- Authored intro speech occupied the middle beat while generation instructions requested another action call in the final beat. This is a plausible repetition trigger, not proof of the cause in an uninspected generated video.
- No explicit single-utterance or non-speaking interval instruction was exported.
- The code-owned closing gesture removed provider-authored payoff detail. The export now supplies a separate synchronization direction without weakening the supported-gesture contract.
- Audio normalization kept only three cues and moved late events, potentially removing the hush or payoff and desynchronizing the sound design.
- The exported scene omitted the palette.
- The intro speech instructions referred to a final hold while the visual ending prohibited a dead hold.
- Fixed output examples contained timestamps unrelated to shorter requested durations.

## Version 9 changes

The persisted three-beat schema remains unchanged. Micro-timing belongs inside the concise beat descriptions and timed audio events. The creative sequence is hook, anticipation/reaction, reveal, payoff, living follow-through.

Speech has one authoritative track. Default eight-second intros speak from 5.5 to 7 seconds. Longer selected lines start earlier when required by the existing 160 words/minute plus 0.3-second allowance. Generation instructions reference that exact window even when it straddles two beats. Export explicitly forbids repetition, echoes and ad-libs. Validation rejects the complete dialogue phrase duplicated in action, delivery, music, sound or opening/closing directions; this is a textual guard, not a semantic detector of every possible extra utterance.

Dynamic intros may retain up to six sound cues. Invalid or excessive cues are reported for repair rather than silently truncated or retimed. Outro and legacy normalization behavior remains unchanged. Examples scale with duration and include a brief music/effects dip and one payoff accent on the final stressed word.

The performance export references the speech event without quoting it again. Supplied logos receive rigid-body emphasis only; overlay and no-logo modes do not request a generated logo. Palette and reference identity constraints remain visible.

## Verification and remaining limits

### Version 10: integrated music and sound direction

Following the reference's AUDIO DESIGN approach, the generator and exported dynamic-intro prompt now carry a short plain-language score direction: catchy instrumental music enters at 0 seconds, supports the action, briefly hushes for anticipation, returns brightly for the reveal, builds to one payoff hit and resolves with a short tail into the cut. Music and effects stay below speech. Concrete cues such as WHOOSH, SKID, POP and BOING are selected for visible actions, not imposed on every script.

The same sound may be described beside its action and in the timed audio list; the prompt explicitly treats these as one event, not repeated playback. Timed cues are exported on separate lines. Music, SFX and scheduled speech are requested together with the picture, suitable for the user's integrated video-generation workflow. Dynamic intro exports no longer tell the model to produce audio separately. No audio service, post-production pipeline, schema or dependency was added. Existing pair music identity remains shared while the intro-specific score direction is applied at export.

Regression tests exercise 6/8/10-second timing, longer selected lines, cue preservation, invalid schedules, duplicate dialogue directions, logo modes, and one literal utterance in export. The existing API integration test exercises generation with a test provider, approval, prompt/package export and upload provenance.

These checks do not establish actual audiovisual quality or guarantee a generative video model will follow the prompt. Generate a new revision to use the new authored timing and sound direction; old saved revisions are not migrated. Review a new video for one audible utterance, synchronized mouth movement, a readable anticipation beat, intact identity/logo, audible contrast and a clean hard cut. No Seedance or Veo video render is part of these automated tests.
