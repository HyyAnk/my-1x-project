# Short-Reel Specification

Version: 1.0. Status: execution baseline derived from user-approved direction. Design defaults are explicitly identified; changes to them require a decision record and affected tests, not silent agent improvisation.

## Product Requirements

| ID    | Requirement                                                                                                                                                                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SR-01 | Episode is a landscape 16:9 quiz workflow. Short-Reel is a separate portrait 9:16 creative preparation workflow, not a one-question Episode.                                                                                                  |
| SR-02 | A topic suggestion run contains exactly three Episode and two Short-Reel candidates. With a keyword, exactly one in each pillar is keyword-directed; the other three are discovery topics based on channel DNA.                               |
| SR-03 | Every Short-Reel uses exactly one approved existing Question Bank question of archetype `versus_faceoff` or `deep_trivia`. Preserve source question, choices, correct choice and explanation; never fabricate missing bank content.           |
| SR-04 | Script consists of exactly three consecutive segments: generate, extend, extend. Target 8-10 seconds each and 24-30 seconds total. Default creative durations are 8/8/8; this is not a verified provider limit.                               |
| SR-05 | Question and answer text are requested inside generated video, with exact strings and local timing in the prompt. No post-production text overlay stage.                                                                                      |
| SR-06 | User manually supplies mascot image, style image and prompts to https://flow.google.com/, then generates, extends, inspects and publishes. Their reported model label is `Omni 1.1 Flash`; store it as an editable note, not an API model ID. |
| SR-07 | Four deliverable groups: reference images; structured script plus three prompts; 1080x1920 cover; publishing hook/description/CTA/hashtags.                                                                                                   |
| SR-08 | Adjacent segments hand over character identity, position/action, camera, environment, props, visible text and story knowledge. Extension prompts must not restart the introduction or reset the scene inadvertently.                          |
| SR-09 | User can review, edit, save and regenerate an individual segment or failed package component. Preserve successful outputs and unsaved input on failure. Earlier edits invalidate dependent segments visibly.                                  |
| SR-10 | Expose honest pending, partial, failed, cancelled and stale states; reconcile all affected views without full-page refresh. Prevent duplicate operations and late-result overwrite.                                                           |
| SR-11 | Remove all legacy portrait quiz templates, Episode portrait options, portrait stage calibration and portrait Sandbox layout modes after dependency inventory. No old-product compatibility or legacy playback is required.                    |
| SR-12 | Delete only inventoried obsolete test products. Preserve Question Bank, channel identity, reusable mascot/style references, new Short-Reels and unrelated workspace changes.                                                                  |
| SR-13 | Episode functionality and landscape render quality continue working. Generic portrait image/cover/reference capabilities remain available for Short-Reel.                                                                                     |
| SR-14 | Software checks package consistency; user accepts actual video quality, text, continuity, timing and publication. Package-ready never means video-reviewed or published.                                                                      |
| SR-15 | English-only new code/docs/UI. Existing design conventions, concise functional copy, accessible keyboard/touch actions and desktop/mobile verification apply.                                                                                 |
| SR-16 | Work remains resumable through repository artifacts. Each phase has evidence, review, authenticated release and a handoff before progression. Only the user deletes this folder.                                                              |

## Creative Direction

Visual-first cinematic stylized 3D micro-story. Use a mascot reference as a character anchor, not an animated stage performer driven by Episode pose timelines. Use an explicit style image and channel direction rather than assuming a brand/style keyword guarantees quality or policy compliance.

Three segments have narrative purposes, not additional mandatory shot subdivisions:

1. Present an immediately readable visual premise and question.
2. Continue the action, build the comparison or mystery, and give the viewer time to predict.
3. Reveal the canonical answer, explain briefly and finish coherently. A loop or CTA is optional when it serves the topic.

Do not let a cinematic invention change a factual condition in the source question. Audio direction may be included in prompts; this system does not synthesize/mix audio. Do not promise retention, virality, text accuracy or safe classification based on animation style.

## MVP Defaults

- Short-Reel generated content is English. Bank eligibility requires an English source or an existing verified English translation. Do not change Episode language behavior or introduce automatic bank translation as a hidden fallback.
- Draft selection does not record a rendered Episode or start the publication cooldown. Honor existing Episode cooldown exclusions when available; do not add cross-pillar analytics/publication tracking in this MVP.
- Keep source question and correct answer text exact in canonical cues. Additional hook and explanation wording is allowed, but meaning preservation remains a review duty.
- Script and prompts have one editable structured source. Compiled prompts are read-only derived previews, not a second independent editable document.
- Editing a segment invalidates downstream segments but does not automatically spend generation credits. The user explicitly regenerates or reviews/resaves affected segments.
- Confirming a topic is idempotent and returns its existing Short-Reel on replay. Creating multiple variants from one confirmed topic is outside this MVP.
- No actual video upload, storage, transcription, OCR or publisher integration is required. Manual Flow evidence can be references supplied by the user.

## Explicit Non-Goals

No Flow/browser automation, video-provider API, billing integration, automatic publishing, post-production encoding/text/TTS/BGM, new universal media framework, guarantees of model capability, compatibility shims for test products, unrelated bank refactor or broad dependency upgrade.

## Acceptance Boundaries

Automated acceptance validates source fidelity, schemas, state transitions, export bytes and Episode regression. Manual acceptance validates actual footage for both archetypes using three prompts. Final user acceptance remains outstanding even if all automated checks pass. See [acceptance matrix](verification/acceptance-matrix.md).

The named Flow model and extend increments were not independently verified during planning. If actual behavior cannot support the intended duration, record the observation and ask the user to approve a timing adjustment; do not silently replace the workflow or add a fourth segment.
