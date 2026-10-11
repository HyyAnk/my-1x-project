# Editorial thumbnail generation

Auto Editorial produces a story-scene thumbnail, following the Short-Reel cover art direction: the channel mascot is the protagonist acting out one dramatic moment with a subject taken from the quiz, inside a themed world rendered in one stylized 3D look, with the headline built into the scene. Explicit layout overrides retain the existing preset pipeline. Existing thumbnail versions are preserved; choose Auto Editorial and Generate to create a new version.

## Interaction and state

Choose a layout, optional badge, and optional headline, then Generate. The Headline field only sends text the user types; the current headline is shown as its placeholder so regenerating produces a new plan instead of pinning the previous headline. The thumbnail job workflow acknowledges the request immediately, prevents duplicate submissions, and reports pending, failure, retry, cancellation, and completion. Failed or cancelled generations never publish placeholder files. The queue and source-fingerprint guard prevent concurrent mutations or outdated episode content from replacing the current thumbnail.

## Pipeline

1. **Planning** (`thumbnailAiPlanner.ts`, `editorial/editorialPlannerPrompt.ts`). The planner sees up to 12 questions, three randomly sampled emotional archetypes (shared with Short-Reel covers), the channel's recent headlines, and the headline style catalog. It returns a headline, one subject (or two comparison candidates), a themed setting, a suggested headline style, and one persona variation per archetype including a `dramaticHook` story moment. One variation is picked at random. Responses are validated by `EditorialAiPlanSchema`; deterministic seed planning is used when the planner is unavailable.
2. **Refinement** (`editorial/refinement/`). Before any image is requested:
   - the headline must name something concrete, make no promise the episode does not contain (taste, sound, smell, real/fake, odd one out, timer, yes/no, scores), complement rather than repeat the title, and avoid the opening word or sentence pattern of recent channel headlines;
   - every pictured subject must appear in a question or answer choice.
   A failing plan gets one model rewrite, then grounded deterministic fallbacks. Manual headlines are never changed. Topic and claim checks use an English lexicon; the title-echo and opening-word checks work in every language.
3. **Scene design rotation** (`editorial/editorialPlan.ts`). Using the active thumbnails of the episode and its four most recently updated sibling episodes, the plan avoids the two latest distinct compositions (`mascot_left`, `mascot_right`, `hero_center`, `reaction_closeup`) and the two latest distinct headline styles (brush banner, neon sign, hazard plate, carved wood sign, comic burst, chalkboard, chunky 3D letters, stone tablet). The planner's style suggestion wins when fresh; otherwise a topic-fitting style is chosen. True/False and Yes/No answer pairs never trigger the A-vs-B comparison layout.
4. **Art prompt** (`editorial/editorialPrompt.ts`). One frame from an animated film in the episode's visual style: composition and mascot framing from `composition/compositionCatalog.ts`, lettering from `typography/headlineStyleCatalog.ts`, the story moment, a simplified themed setting, legibility rules (largest element, unobstructed, no other text), and YouTube safe zones.
5. **Normalization** (`thumbnailImageNormalizer.ts`). Every provider image, editorial or preset, becomes an exact 1280 x 720 (or 1080 x 1920) JPEG of at most 2 MB, stepping quality down only when needed. The manifest and history record the design template, composition, headline style, and headline.

## Verification and limits

Unit and integration tests cover planning, refinement, grounding, rotation, prompt sections, normalization, history, exports, provider failure, cancellation, reuse, and stale concurrent updates. Inspect generated images at full size and at 320 x 180 before release.

The image provider still decides final pixel placement and lettering; prompts cannot guarantee spelling, exact framing, or the absence of stray text. There is no automated vision quality check and no measured CTR effect. Compare compositions and headline styles on comparable published episodes (for example with YouTube Test & Compare) before fixing a channel default.
