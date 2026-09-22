# Intro & Outro Script Studio

## Implementation Specification

**Version:** 2.0.0  
**Status:** Scope confirmed; implementation pending technical verification  
**Scope:** Script generation, script management, and existing manual video upload management  
**Script provider:** Google Antigravity using Gemini Flash  
**Audience:** Engineering, product, and creative production teams

## 1. Product Decisions and Scope

### 1.1 Confirmed decisions

Build a reusable Intro & Outro Script Studio inside the existing channel Intro & Outro category view. Support many channels, character designs, body types, and visual styles without embedding one character's identity in shared prompts or rules.

The current release includes:

- Generate intro, outro, or both using Gemini Flash through the existing Antigravity integration.
- Include fixed production rules, compatible creative seeds, the selected style, the actual style-specific mascot reference image, and its reviewed identity profile in generation context.
- Save, resume, edit, validate, approve, duplicate, archive, and export scripts with immutable revision history.
- Manage built-in and custom creative seeds through a versioned catalog.
- Upload externally produced intro/outro videos through the current manual upload mechanism.
- Optionally associate uploaded pairs with the exact script revisions used to produce them.
- Preserve existing pair preview, category assignment, transitions, audio settings, deletion, and episode selection behavior.

This document is a plan, not a claim that these features are already implemented. Editing this specification does not authorize unrelated production features.

### 1.2 Explicitly out of scope

Direct video generation with Veo, Omni, Kling, Seedance, or any other video provider is future-only. Do not implement video-provider clients, credentials, model selectors, render buttons, placeholder disabled buttons, video-generation workers, billing controls, or provider-specific prompt exporters in this release.

Also excluded: automatic video downloading, transcoding, logo compositing, voice synthesis, automated frame-by-frame mascot verification, independent video-clip remix libraries, and redesign of the current upload transport or episode selection system.

Keep script contracts provider-neutral. Future integration requires a separate specification and approval, not speculative infrastructure in this implementation.

### 1.3 Outcomes and limits

Reduce repetitive prompt writing, preserve explicit character details, improve creative variety, and maintain traceability from scripts to uploaded pairs.

Do not guarantee identical LLM outputs, error-free vision analysis, exact generated-video timing, perfect brand fidelity, or fixed generation latency. Structural validation and human review are explicit quality gates. Measure actual latency, validation success, edit frequency, and creator acceptance.

## 2. Existing Integration Boundaries

Extend existing responsibilities rather than introduce a parallel architecture:

| Existing area                                                      | Integration direction                                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| apps/web/src/features/channel/components/ChannelIntroOutroTab.tsx  | Add script access inside the selected category                                         |
| apps/web/src/features/channel/hooks/useChannelIntroOutro.ts        | Preserve pair mutations and automatic pair/category refresh                            |
| apps/web/src/features/channel/components/CreateIntroOutroModal.tsx | Extract shared upload form behavior only where needed; retain standalone upload        |
| apps/server/src/antigravity/client.ts                              | Reuse connection, turn execution, model routing, and cancellation boundaries           |
| apps/server/src/antigravity/runners/agentApiRunner.ts              | Verify image-context delivery and effective Flash routing first                        |
| apps/server/src/quiz/mascot/services/mascotVisionAnalyzer.ts       | Reuse appropriate analysis primitives; do not enlarge this mixed-responsibility module |
| packages/shared/src/schemas/mascot.ts                              | Integrate with mascot styles, anchor images, and style revisions                       |
| packages/shared/src/mascot/builtInStyles.ts                        | Reuse category-to-mascot-style mapping where applicable                                |
| apps/server/src/repository/introOutroStyles.ts                     | Preserve pair persistence and clip processing                                          |
| apps/server/src/utils/videoMediaProbe.ts                           | Preserve existing server-side upload validation                                        |
| apps/server/src/repository/introOutroSelectionHistory.ts           | Preserve existing least-recently-used pair selection                                   |

Current IntroOutroStyle records require both videos and represent uploaded pairs. Script drafts must be separate records, not incomplete pair records. Existing records and manual uploads without scripts remain valid.

## 3. Character-Agnostic Identity and Style Context

### 3.1 Resolve the selected character before generation

1. Resolve the channel's assigned mascot.
2. Resolve the mascot style associated with the selected script category through the existing mapping.
3. Resolve that style's actual anchor image and revision. Do not silently use another style, the first style, or an unrelated master image.
4. Show the resolved image and style to the creator before generation.
5. If the mapping or image is missing, block generation with a targeted action to select or prepare the correct mascot style. Manual upload remains available.

An explicitly selected compatible style may be used when no automatic mapping exists. Record that choice. A master image is eligible only if explicitly registered as the selected style's reference. Do not mutate the global active mascot style merely to generate a script.

### 3.2 Generic identity contract

Define MascotIdentityProfile independently of any named character. It contains:

- Identity and provenance: mascot ID, profile revision, source references, analysis version, review status, and review timestamp.
- Observable morphology: body regions, appendage types and counts, proportions, silhouette, colors, markings, and facial features when present.
- Stable features: feature ID, description, body anchor, material, rigidity, allowed motion, and importance.
- Capabilities: locomotion, grasping, pointing, waving, flight, facial expression, speech, and other catalog-relevant abilities. Represent each as supported, unsupported, or unknown.
- Motion constraints: permitted deformation, rotation limits, restricted contacts, and per-feature occlusion rules.
- Optional accessories: distinguish permanent identity features from explicitly allowed temporary props.

No shared default may assume hands, feet, wings, horns, a tail, clothing, a face, a chest ornament, or a humanoid skeleton. Unknown features and inferred capabilities must remain distinguishable from reviewed facts.

### 3.3 Style-specific identity

Define MascotStyleIdentityProfile linked to mascot_id, mascot_style_id, and style_revision. It adds the reference asset ID/hash, style appearance, allowed style-specific accessories, palette, materials, and approved motion language.

Use the base identity plus the selected style profile. Do not universally force 3D, cinematic materials, squash-and-stretch, or a named studio aesthetic. Flat artwork, plush characters, rigid robots, animals, abstract shapes, and stylized creatures retain their own visual language.

A style may intentionally change a feature's appearance. If its approved image and base profile conflict, surface the discrepancy for review; do not let the LLM silently discard either source.

### 3.4 Analysis, review, and cache invalidation

Cache visual analysis by reference image hash, analyzer version, and analysis prompt/schema version. Store reviewed style identity under the existing mascot/style repository boundary, not as one channel-wide DNA file.

Refresh analysis when the relevant image or analysis contract changes. Reuse reviewed data for unchanged references. Keep approved corrections separate from machine observations so reanalysis cannot silently overwrite them.

Review states are unreviewed, needs_review, and reviewed. Generation requires a reviewed profile. A local pixel/color fallback is not anatomical analysis and cannot mark identity reviewed. If automated analysis is unavailable, allow manual completion and review, but still require successful image delivery to the script model.

Analysis for this feature should use the verified Antigravity/Gemini Flash image-context path where supported. Do not add a separate direct Gemini API dependency or require a new provider key as an implicit fallback.

### 3.5 Visibility rules instead of impossible guarantees

Each important feature may require visibility when its body region faces the camera, visibility during designated hero beats, or no prolonged avoidable occlusion. Do not require every feature to be visible in every frame, including behind the character or outside the shot.

Safe action zones are resolved relative to the character's anatomy. A restriction around one character's chest must not become a global rule for all mascots.

Observed detail loss, occlusion drift, and rigid-feature deformation motivate these constraints. Do not encode unverified claims about attention mechanisms or universal frame-count thresholds as system facts.

## 4. Gemini Flash Through Antigravity

### 4.1 Provider contract

Create a focused script-generation adapter over the existing Antigravity client. It accepts typed context, actual reference attachments or verified image-read context, an expected output schema, cancellation signal, and deadline.

Use the configured and verified Gemini Flash route. Do not hardcode an obsolete Gemini version, inherit an image-generation fallback model, or silently switch to Pro, another provider, or a standalone Google API client.

Persist the requested route/model and the effective model identity when reported by the runtime. If only the flash alias is observable, record that alias and that the precise version is unavailable; do not invent it.

### 4.2 Actual image context is an implementation gate

The current startTurn interface is text-oriented. Before building the wizard, verify how the installed Antigravity integration delivers images to Gemini Flash:

- Prefer supported image attachments through the integration.
- Alternatively, use an explicitly verified image-reading mechanism scoped to the resolved reference assets.
- A filename, URL string, or instruction to imagine an image is not equivalent to sending image content.
- Verify delivery with a controlled fixture and inspection of the transport or image-read result, not only a model assertion that it saw the image.
- If delivery is unsupported or fails, return MASCOT_REFERENCE_UNAVAILABLE; do not silently continue with text-only generation.
- Restrict required agent tool access to reference reading. No repository edits, broad filesystem browsing, shell execution, or desktop input control should be needed for generation.

This is a technical verification task, not an unresolved product question. If the runtime cannot support it, report the limitation and request approval before changing the integration approach.

### 4.3 Generation context

Every intro or outro request includes:

1. Server-owned hard rules and output schema.
2. Channel name, audience profile, approved logo reference when required, and permitted text.
3. Selected category/style snapshot and intended visual language.
4. Actual selected-style mascot image with an explicit subject-reference role.
5. Reviewed base/style identity, critical feature IDs, and capability constraints.
6. Creative seed snapshots, randomization seed, and compatibility results.
7. Target duration, narrative beat roles, voice preferences, and camera preferences.
8. Relevant recent hook/seed history and, when generating a counterpart, the approved counterpart's concise continuity context.

Keep image roles explicit so a logo or style mood reference cannot be mistaken for the mascot. Include only task-relevant data, never unrelated assets, secrets, or the entire channel directory.

### 4.4 Completion, validation, and retry

Use an isolated conversation per attempt to prevent cross-character context leakage. Register listeners before starting work and correlate events with exact thread/turn/job identifiers.

Treat streamed text as pending. A script becomes available for review only after successful turn completion, schema parsing, semantic validation, and persistence. The existing text helper's partial-on-timeout behavior is not an acceptable success contract.

Validate returned data even if structured output is supported. Permit at most one bounded schema-repair attempt using the same frozen context; never relax hard rules during repair. Transport retries must be bounded and must not resend an ambiguously accepted turn without reconciliation.

On timeout or cancellation, request interruption, remove listeners, and prevent late output from publishing a revision. If remote interruption cannot be confirmed, report that accurately while keeping the local job terminal.

## 5. Production Rules and Structured Scripts

### 5.1 Hard rules and editable preferences

Hard rules are server-owned: valid schema, English output, valid asset ownership, reviewed identity, no invented anatomy, no removal of required features, permitted text only, valid timeline bounds, and seed compatibility. Free-form instructions cannot override them.

Editable preferences include duration, energy, narration, pacing, camera restraint, and allowed props within character/style constraints. Identity corrections belong to the reviewed identity workflow, not an unrestricted prompt override drawer.

Channel restrictions such as excluding question-mark graphics are configurable brand rules, not universal mascot rules. Distinguish visible typography from spoken punctuation.

### 5.2 Timing and voice defaults

- Default planned duration: 8.0 seconds per clip, independently adjustable from 8.0 to 10.0 seconds in 0.1-second increments.
- Default aspect ratio: 16:9, matching the existing uploaded-pair workflow.
- Three narrative beats: intro uses entrance, brand interaction, and handoff; outro uses recognition, invitation, and farewell.
- Default beat proportions: 30%, 45%, and 25%. Round intermediate boundaries to 0.1 seconds and set the final boundary to the exact target duration.
- Narrative beats may contain micro-actions; they are not required to be separate camera shots.
- Start with one principal action per beat, at most one movable prop, and a restrained camera move. Additional complexity requires explicit review.
- Voiceover is optional. Default to one short English line; estimate fit from its speaking interval and configured delivery rate rather than enforcing 18-25 words everywhere.
- Speaking-fit estimates are warnings, not proof of audio synchronization. No synthesized audio is generated in this release.
- Do not promise a generated-video frame rate or provider-specific duration behavior from prompt text.

These are script authoring rules. They must not introduce new hard rejection rules for existing or manually uploaded videos.

### 5.3 Eight structured layers

IntroOutroScriptContent has eight explicit layers:

1. production: clip kind, language, aspect ratio, and target duration.
2. identity: immutable reference to the reviewed identity snapshot and required feature IDs.
3. style: style snapshot, palette, staging, and motion language.
4. timeline: three ordered narrative beats with action, referenced capabilities, props, and feature-visibility intent.
5. voiceover: exact spoken lines, timing windows, and delivery notes.
6. audio: timed SFX and music direction, without claiming generated audio exists.
7. camera: shot/framing intent, movement, and timing.
8. consistency: feature-preservation rules, allowed typography, and restrictions.

Shared Zod schemas define bounds, enums, discriminated unions, and field lengths. Server code attaches identity/style provenance; the LLM cannot change source IDs, ownership, hashes, or approval state.

### 5.4 Validation and prompt export

Pure validators check timeline coverage, ordering, timing windows, supported capabilities, valid feature references, allowed props/text, and known seed conflicts. Free-form choreography and subtle visual plausibility still require human review; schema success is not visual verification.

Classify findings as blocking errors or review warnings. Errors block approval and production-ready export. Warnings must be acknowledged before approval. Edits always trigger revalidation.

Canonical JSON is the source of truth. A deterministic template produces the copyable English prompt; do not maintain a separately editable prompt that can drift from the structured script.

The export view includes required reference assets and roles. Copying text does not attach images in an external tool. Provide access to the pinned mascot/logo references and a concise instruction to attach them externally. Production export uses an approved revision; draft JSON remains available for editing and recovery.

## 6. Versioned Creative Seed Catalog

### 6.1 Seed model

Use an enum for seed dimensions, not a closed enum for all seed IDs. Each CreativeSeed has a stable ID, revision, dimension, name, narrative intent, structured requirements, supported style tags, capability requirements, prop/text requirements, forbidden combinations, complexity, selection weight, origin, and active/archived status.

Built-in seeds are read-only templates. Creators may clone them into channel-scoped custom seeds. Custom edits create revisions; archive instead of hard-delete when history references a seed. Treat custom descriptions as untrusted data with length limits and no authority to override system rules.

### 6.2 Initial catalog

These are reusable narrative intents, not fixed anatomical choreography. Capability metadata is mandatory before a seed is eligible for selection.

| Dimension            | Initial IDs and intents                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: Entrance          | A01 energetic arrival; A02 edge reveal; A03 light reveal; A04 supported ride; A05 container reveal; A06 camera greeting; A07 attention shift                                 |
| B: Brand interaction | B01 mechanism reveal; B02 light activation; B03 presenter reveal; B04 surface gleam; B05 frame assembly; B06 bubble reveal; B07 guided logo arrival                          |
| C: Performance tone  | C01 energetic; C02 playful; C03 thoughtful; C04 warm; C05 confident; C06 curious; C07 gently comic                                                                           |
| D: Verbal hook       | D01 friendly challenge; D02 adventure invitation; D03 countdown; D04 welcome; D05 discovery; D06 readiness; D07 shared play                                                  |
| E: Recognition       | E01 delighted response; E02 reward reveal; E03 shared celebration; E04 festive accent; E05 effort recognition; E06 appreciation; E07 victory motion                          |
| F: Invitation        | F01 subscribe invitation; F02 return invitation; F03 community warmth; F04 next challenge; F05 next episode teaser; F06 closing acknowledgement; F07 invitation banner       |
| G: Farewell          | G01 supported farewell gesture; G02 permitted departure; G03 partial hide/reveal; G04 respectful sign-off; G05 horizon departure; G06 friendly closing pose; G07 stage close |

Intro uses A-D; outro uses E-G. Performance tone must not add permanent costumes, limbs, or character traits. B05 assembles a frame around the intact logo, not regenerated logo letters. Praise must not assert an unknown viewer score. Invitation options must respect the configured audience and available platform actions; do not assume notification bells or interactive end screens are available.

Version 2 replaces the earlier character-specific seed meanings. Any imported legacy catalog must retain its original revision; never reinterpret historical IDs using the new meanings.

### 6.3 Compatibility-aware randomization

Resolve eligible seed revisions against the exact reviewed character/style context, brand rules, and audience profile before sampling. Unknown required capabilities are not automatically supported.

Randomization must never add anatomy to make a seed fit. Either select an explicitly defined compatible variant or exclude the seed. If no valid combination exists, explain the blocking requirement and preserve the current selection.

Distinguish creative seed IDs from the randomization seed. Replaying selection requires the same catalog snapshot, eligibility context, history snapshot, algorithm version, and randomization seed. It reproduces seed selection, not LLM prose.

Warn about exact repeated combinations per clip and repeated normalized spoken hooks. Prefer less recently used eligible seeds. Do not claim semantic uniqueness. Reserve generation requests atomically so concurrent jobs do not bypass an exact-duplicate check; explicit regeneration of the same combination remains allowed as a new attempt.

The nominal catalog contains 2,401 intro combinations and 343 outro combinations, or 823,543 theoretical pairings. Compatibility and creative review reduce the usable set. Do not pre-generate this space or promise infinite variety.

## 7. Persistence and Public Contracts

### 7.1 Domain records

| Record                                             | Ownership and purpose                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| MascotIdentityProfile / MascotStyleIdentityProfile | Reviewed character/style context under the mascot repository                                              |
| CreativeSeed                                       | Built-in catalog plus channel-scoped custom revisions                                                     |
| IntroOutroScriptProject                            | Channel/category workspace with optional intro and outro working drafts, name, version, and archived flag |
| IntroOutroScriptRevision                           | Immutable snapshot of one clip's content, inputs, source assets, seeds, validation, and provenance        |
| ScriptGenerationJob                                | Durable queued/running/terminal script work and per-clip results                                          |
| Existing IntroOutroStyle                           | Uploaded pair; optional script revision reference per clip                                                |

Working drafts are mutable with optimistic concurrency. Saving a checkpoint or completed generation creates an immutable revision. Approval is metadata referencing an immutable revision; editing creates a new unapproved draft and does not mutate the approved revision.

Persist schema/template/catalog versions, mascot/style revisions, reference hashes, provider route, observable model identity, job/attempt IDs, and timestamps. Keep machine observations, reviewed identity, generated content, and creator edits distinguishable.

Snapshot reference assets through the existing asset boundary, using immutable retained assets or content-addressed copies. A path and hash alone are insufficient if an upload can overwrite the file. Archived projects and seeds retain references needed by revision history.

### 7.2 Repository behavior

Use existing repository conventions and channel slug resolution for on-disk paths. A suggested feature directory is channels/{channelSlug}/intro_outro_scripts/{projectId}/, containing project state and immutable revisions. Exact filenames remain an infrastructure concern.

Use atomic writes, serialized mutations at the appropriate project/channel boundary, and expected-version checks. Reject stale updates with a conflict response without losing the submitted draft. Support the current single-server deployment; process-local locks do not provide multi-server safety.

Archiving scripts does not remove uploaded pairs. Deleting a pair does not remove script history. Normal identity/asset removal must preserve pinned revisions or block removal with a clear explanation. Do not add a permanent-purge workflow in this release.

### 7.3 Proposed HTTP resources

All routes are channel-scoped and validated through the repository boundary:

| Method and resource                                                                      | Purpose                                                                           |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| GET /api/channels/:channelId/intro-outro-context?style_preset_id=...                     | Resolve mascot/style, identity freshness, brand context, and eligible seeds       |
| POST /api/channels/:channelId/intro-outro-context/analyze                                | Start reference analysis and return a tracked job                                 |
| PUT /api/channels/:channelId/intro-outro-context/review                                  | Save reviewed identity through its mascot/style repository using expected version |
| GET/POST /api/channels/:channelId/intro-outro-seeds                                      | List catalog or create a custom seed                                              |
| PATCH /api/channels/:channelId/intro-outro-seeds/:seedId                                 | Create a custom revision or archive a custom seed                                 |
| GET/POST /api/channels/:channelId/intro-outro-scripts                                    | List/filter projects or create a draft project                                    |
| GET/PATCH /api/channels/:channelId/intro-outro-scripts/:projectId                        | Load or update drafts/name/archive state using expected version                   |
| POST /api/channels/:channelId/intro-outro-scripts/:projectId/duplicate                   | Copy inputs/content into a new unapproved project                                 |
| GET/POST /api/channels/:channelId/intro-outro-scripts/:projectId/revisions               | List immutable revisions or checkpoint a clip draft                               |
| POST /api/channels/:channelId/intro-outro-scripts/:projectId/validate                    | Validate current working content                                                  |
| POST /api/channels/:channelId/intro-outro-scripts/:projectId/generate                    | Generate intro, outro, or both; return 202 with job ID                            |
| POST /api/channels/:channelId/intro-outro-scripts/:projectId/approve                     | Approve a validated immutable clip revision                                       |
| GET /api/channels/:channelId/intro-outro-scripts/:projectId/revisions/:revisionId/export | Return compiled prompt and reference manifest                                     |
| GET /api/channels/:channelId/intro-outro-script-jobs/:jobId                              | Read durable job status, including analysis jobs                                  |
| POST /api/channels/:channelId/intro-outro-script-jobs/:jobId/cancel                      | Request cancellation without deleting completed results                           |

Reuse existing generic task endpoints where they provide the same contract; do not expose duplicate task systems. Context review modifies shared mascot/style data: enforce ownership and make its cross-project impact explicit.

Errors use structured codes such as STYLE_REFERENCE_MISSING, IDENTITY_REVIEW_REQUIRED, MASCOT_REFERENCE_UNAVAILABLE, SEED_COMBINATION_INVALID, LLM_UNAVAILABLE, GENERATION_TIMEOUT, SCRIPT_VALIDATION_FAILED, and VERSION_CONFLICT.

## 8. Interaction Plan and Asynchronous State

### 8.1 Primary flows

The category detail offers Scripts and Video Pairs views. Keep Generate as the main script action and Upload Pair as the main video action. Group seed management, duplication, archive, and revision history into secondary menus.

The resumable wizard has three steps:

1. **Configure:** selected category, actual mascot-style thumbnail, reviewed identity summary, clip selection, duration, and compatible seed controls. Randomize preserves manually locked seed dimensions. Advanced controls contain custom seeds and creative preferences.
2. **Review:** Intro/Outro tabs, structured timeline editor, validation, revision history, approval, and Copy Prompt. Regenerate only the selected clip unless both are explicitly requested.
3. **Upload:** shared existing pair upload form, optional approved revision references, existing transition/audio settings, and Save Pair.

Upload remains independently accessible without creating a script. Scripts can stop after review/export and resume days later. Do not require videos to consider a script project useful or complete.

### 8.2 State ownership and transitions

- Job states: queued -> running -> succeeded, partial, failed, cancelled, or interrupted.
- A pair-generation job tracks each clip separately. If one succeeds and the other fails or is cancelled, retain the successful revision and allow retry of only the unfinished clip.
- Content lifecycle: working draft -> validated immutable revision -> creator approval. Archive state is separate from approval.
- Freshness is derived by comparing pinned source revisions/hashes with current sources. Changed sources mark existing work stale without rewriting it or revoking historical approval.
- Starting new production from stale work requires explicit use of the pinned approved context or regeneration against current context.

Draft autosave uses a debounce and expected-version updates, showing Saving, Saved, or an actionable error. Before generation/approval, flush the relevant draft and freeze the submitted input. On navigation with unsaved changes, offer a recovery choice. Reload resumes saved drafts; unsaved failed writes must not be presented as durable.

### 8.3 Feedback and synchronization

Generation immediately shows a pending state and job identity, disables duplicate submissions for that clip, and leaves unrelated controls usable. Use status text for LLM work, not simulated percentage progress.

Reuse existing task events where available; otherwise poll only active jobs at a bounded interval with backoff on connection failures. Refetch status after reconnect. Stop polling terminal jobs and clean up subscriptions on navigation.

After mutations, refresh affected script projects/lists, jobs, pair lists, category counts, and relevant channel/default selectors. Use revision/request IDs to discard stale responses. A late generated result may be saved as a separate revision but must not replace newer creator edits.

Use idempotency keys for generation and linked pair registration. Repeated requests with the same key and payload return the same operation; a changed payload with that key is a conflict. A lost response must not create another pair or launch another generation.

Persist jobs before executing them. On server restart, reconcile observable active turns or mark them interrupted with a safe retry action. Do not silently replay remote work or introduce an external queue dependency unless existing infrastructure cannot meet these requirements.

### 8.4 Desktop, mobile, and accessibility

Desktop may show the reference preview beside configuration/review. Mobile uses one column, Intro/Outro tabs, and collapsible secondary details. Required validation and identity issues remain visible, not tooltip-only.

Use concise English labels, existing-library icon buttons, keyboard navigation, focus management, touch-accessible explanations, and reduced-motion behavior. Page/card titles have no trailing periods. Reuse the existing application-shell footer and responsive credit behavior; do not duplicate credits inside wizard panels.

## 9. Existing Manual Upload Management

Preserve frontend metadata inspection and server-side clip probing, the 1920x1080 acceptance rule, thumbnails, pair naming, transitions, audio mode, preview, category assignment, and pair selection history.

Do not introduce an 8-10 second hard upload gate, a 60 fps requirement, new provider checks, or automatic content rejection. Script duration is an authoring target; mismatch on a linked upload is a review warning and does not change the existing technical acceptance policy.

Reuse focused upload fields/hooks rather than nesting the existing modal inside another modal. Extract only the necessary seam and verify standalone upload behavior remains unchanged.

Add optional per-clip provenance fields to the existing pair-creation contract. Validate that referenced revisions belong to the channel, match intro/outro kind, are approved, and match the selected category or an explicitly confirmed existing reassignment workflow. New unlinked uploads and legacy pairs remain valid without these fields.

Persist provenance with pair metadata, not as a second independently committed operation. Freeze linked revision references before upload begins. Show a pair as ready only after both files and final metadata have been confirmed by the server.

On upload failure, keep the script project and selected files in the current form for retry. Browser file selections are not guaranteed to survive reload; do not claim durable partial video upload support. Preserve existing server cleanup behavior and do not add per-clip upload storage in this release.

If a pair is reassigned to another category, retain original script provenance and show the mismatch rather than rewriting history. Pair deletion/default changes continue to refresh all existing affected consumers.

## 10. Maintainable Implementation Structure

Define shared schemas and types first. Proposed boundaries:

| Layer                | Focused responsibilities                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Shared contracts     | Identity profiles, seed contracts, script content/revisions, job states, typed API payloads        |
| Domain               | Pure seed eligibility, timeline validation, identity constraints, fingerprints, prompt compilation |
| Application services | Resolve context, generate, save revisions, approve, duplicate/archive, link upload provenance      |
| Adapters             | Antigravity text/image context, model routing, timeouts, events, provider error translation        |
| Repositories         | Script/seed/profile/job storage, immutable references, atomic writes, concurrency                  |
| Transport            | Thin validated routes invoking application services                                                |
| Web clients/hooks    | Requests, draft persistence, job synchronization, stale response protection                        |
| UI                   | Small configuration, review, reference, validation, history, and upload components                 |

Prefer a cohesive server feature directory such as apps/server/src/introOutroScripts/ with domain, service, and adapter modules. Use existing repository contracts/composition roots. Do not accumulate generation, filesystem operations, prompt templates, and route logic in one service or put stateful workflows in JSX.

Keep new analysis behavior in focused modules rather than expanding the existing vision analyzer. Reuse extracted primitives without changing unrelated mascot flows. New dependencies require a concrete need and compatibility/security/license review.

## 11. Implementation Phases and Verification Gates

### Phase 0: Antigravity reference-context proof

- Verify the installed Gemini Flash route and successful completion handling.
- Demonstrate image delivery using contrasting character fixtures in isolated turns.
- Confirm transport/read evidence, missing-image errors, timeout handling, and no cross-character context leakage.
- Record how requested and effective model identities are observed.
- Stop and report a technical blocker if real image context cannot be delivered; do not replace it with text-only generation.

### Phase 1: Contracts, identity, and seed rules

- Add shared schemas and generic base/style identity contracts.
- Implement reference resolution, reviewed identity persistence, cache invalidation, and immutable reference snapshots.
- Create the versioned built-in catalog and channel-scoped custom catalog operations.
- Implement pure seed eligibility, deterministic selection, timeline checks, and prompt compilation.
- Verify with rigid, soft-bodied, quadruped, limbless, asymmetrical, and flat-art fixtures.

### Phase 2: Script persistence and generation

- Add projects, drafts, immutable revisions, approval, duplication/archive, and exports.
- Integrate Antigravity through the verified image-context adapter.
- Implement durable jobs, per-clip partial results, cancellation, idempotency, bounded repair, and restart behavior.
- Add thin routes and structured errors using existing repository/task conventions.

### Phase 3: Studio workflow and manual upload integration

- Build the resumable Configure/Review/Upload flow and script library.
- Add style-specific mascot preview, identity review, seed management, and revision controls.
- Reuse existing upload and add optional provenance without changing legacy acceptance rules.
- Synchronize script lists, pair lists, counts, and existing selectors without full-page reload.

### Phase 4: Current-scope acceptance

This phase is verification, not video API integration.

| Test area          | Required cases                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity           | Missing style anchor, changed hash, conflicting style profile, unknown capability, failed analysis, manual review                               |
| Generic characters | No invented hands on a limbless mascot, no flight without support, no rigid-part deformation, no universal 3D conversion                        |
| Seeds              | Custom revisions, archive/history retention, incompatible picks, no valid combination, frozen-input replay, duplicate attempts                  |
| LLM boundary       | Real image context, offline Flash, malformed JSON, semantic failure, bounded repair, timeout with partial text, cancellation, wrong-turn events |
| Concurrency        | Double-click generation, concurrent edits, out-of-order results, changed mascot while running, duplicate completion events                      |
| Recovery           | Reload/resume, server restart, disconnect/reconnect, failed draft save, partial intro/outro result                                              |
| Upload regression  | Unlinked pair, linked pair, invalid file, one-file failure, final metadata failure, lost response/idempotent retry, category reassignment       |
| UI                 | Loading, empty, success, inline failure/retry, desktop/mobile, keyboard/touch, restrained copy, reduced motion                                  |

Run the relevant formatter, shared build/type checks, focused domain/adapter/repository/UI tests, and the updated primary workflow after implementation. Include a real Antigravity smoke test in the configured environment; if unavailable, report that boundary as unverified rather than presenting mocks as end-to-end proof.

Verify: select style -> inspect correct mascot -> generate -> edit -> approve -> export -> reopen project -> upload pair -> verify provenance and refreshed counts. Also rerun standalone legacy upload -> preview -> assign category -> existing episode pair selection.

Verification scripts follow project structured logging conventions: timestamp, level, job/worker ID, channel/style context, current step, and actionable errors. Redact credentials; avoid reference image data and full prompts in normal logs.

## 12. Completion Criteria and Future Boundary

The current feature is complete when generic character/style context is correctly delivered to Gemini Flash through Antigravity, scripts can be durably managed and exported with their references, and manual pair uploads continue to work with optional revision provenance and synchronized views.

No video-generation provider integration is required for acceptance. Veo, Omni, Kling, and Seedance remain future possibilities only. No further product clarification is required to begin these phases; runtime image-context support is the first technical gate to verify during implementation.
