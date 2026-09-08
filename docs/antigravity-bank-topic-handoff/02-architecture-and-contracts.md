# Architecture And Binding Requirements

## Data flow

English Bank -> coherent eligible inventory -> source allocation -> English Topic -> selection/confirmation -> English product source/script -> localized audience fields -> render consumers.

Bank eligibility never depends on channel target language. Suggestion is not a reservation or publication cooldown.

## Language ownership

| Area                                                                | Language       |
| ------------------------------------------------------------------- | -------------- |
| Bank question/choices/explanation, taxonomy/source content          | English only   |
| Topic, script/narrative, visual directions, model and image prompts | English        |
| Management UI, logs/errors, repository documentation                | English        |
| Displayed quiz question/choices/reveal/explanation                  | Channel target |
| Video description                                                   | Channel target |
| Text rendered inside thumbnail                                      | Channel target |

No additional field, including video title, becomes localized without a user decision. Thumbnail visual instructions stay English and carry exact target text as rendering data. Script instructions may embed target quiz strings without translating the surrounding instructions.

Use an explicit supported base-language table; normalize supported regional inputs such as de-DE to de. Reject vi/vi-VN and unknown targets before provider invocation; never silently convert them to en. English targets require zero translation calls.

Remove Bank translation creation/writeback from all reachable product generation paths, not only the new happy path. Retire or reject direct Bank translation actions and update UI consumers. Keep old created products readable. Before physically removing existing translation fields or non-English records, inventory exact content and provide a separate backed-up cleanup manifest for review; do not delete data blindly or relabel foreign text English.

## Source and product contracts

Reuse current shared `topicSourceBinding.ts`, `topicRun.ts`, `contentHash.ts` and Bank eligibility/inventory modules. Freeze actual exported signatures in each stage handoff instead of inventing a second DTO family.

- Binding: question ID, explicit source language en, versioned canonical hash and immutable source context.
- Preserve the pre-existing Short-Reel hash algorithm; the new Bank hash has its own API/version.
- Hash semantic English source fields; exclude translations, timestamps and channel cooldown. Revalidate cooldown independently.
- Run: stable slots, target/actual counts, typed shortages, server-owned bindings, globally disjoint source IDs.
- Inventory: complete_empty, complete_nonempty, incomplete, unavailable. Only complete scans establish shortage.
- Digest identifies content; it is not an ordered revision. Define revision epoch/restart semantics before clients compare revisions.
- Receipt: canonical root/channel/topic/kind identity plus exact options fingerprint. Same options replay existing product; different options conflict.
- Localization: source IDs/hash, target base language, version/status, exact allowed strings and preserved choice/correct-answer IDs.

Keep services, persistence, provider adapters and UI hooks separate. Avoid adding workflow logic to routes or oversized modules.
