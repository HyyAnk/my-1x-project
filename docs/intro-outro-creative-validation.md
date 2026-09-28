# Intro/outro creative validation

Template v12 treats creative-performance-v3 editorial review as advisory at generation, validation and approval. Legacy production policies retain their existing semantic checks.

- Any nonempty scene count is accepted; role names and action descriptions are authored freely.
- Speech, SFX and camera counts have no creative quotas. Action, dialogue, music and camera prose are not truncated to editorial character budgets.
- Choreography accepts free text and omitted descriptive fields. Flattened fields are grouped automatically; differing flat/nested descriptions are retained together.
- Timing, overlapping speech, capability judgments, feature visibility, final holds and pacing produce review warnings rather than generation failures.
- JSON types, nonempty timeline, numeric timestamp shape, project identity, reference integrity and required export directions remain technical contracts. Clip duration and output format remain the selected product settings.
- Existing seed selection configuration and explicit seed exclusions remain unchanged; this change concerns generated script acceptance, not catalog administration.

Verification covers one, five and twelve scenes, custom actions, six speech events, twenty SFX, ten camera intervals, long score descriptions and thirty-five continuity notes without truncation. API tests verify capability warnings no longer discard generated clips. No live video-provider result is implied by these checks.
