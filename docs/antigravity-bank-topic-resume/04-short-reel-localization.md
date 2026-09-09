# Work 3: Finish Short-Reel Localization

## Files

- `apps/server/src/shortReel/topicConfirmation.ts`
- `scriptService.ts`, `scriptPrompt.ts`, `scriptProvider.ts`, `flowPromptCompiler.ts`, `publishingService.ts`, `thumbnailAdapter.ts`, `packageService.ts`, `exportService.ts` in the same feature
- Existing Short-Reel repository/schema validation and route consumers; inspect before claiming shared contracts.
- Product-localization module and provider adapter from Work 2.
- Tests: Short-Reel question selection, confirmation recovery, script/package/export/browser workflows plus new focused localization integration tests.

## Required work

- [ ] Keep canonical source_snapshot explicitly English and its persisted hash algorithm unchanged.
- [ ] Normalize channel target and reject vi/unknown before provider/product side effects.
- [ ] Build product-owned localization for quiz question/choices/reveal/explanation, description, thumbnail text. Store with Reel and link source IDs/hash.
- [ ] Reject unbound new Reel Topic creation; preserve completed legacy replay without new selection.
- [ ] Keep script narrative, camera/action/audio instructions, Topic and image prompt English. Only exact audience strings change.
- [ ] Current script prompt/validators require exact English source cue text. Introduce a validated display projection or equivalent explicit contract so localized text cues pass without changing canonical source authority.
- [ ] Trace localized cues through script, continuity visible_text, Flow compilation and ZIP exports. Storing unused localization.json is insufficient.
- [ ] Publishing title remains English; description uses target language. Thumbnail image instructions remain English with exact localized visible text.
- [ ] Retry and channel-language changes invalidate only affected localization/render deliverables, not source identity. Preserve user edits and report stale states.
- [ ] Use one durable idempotency/options policy with Work 2; no receipt-less replay that ignores changed options.
- [ ] Run de/fr/en temp-storage workflows through actual service/HTTP and prompt/export consumers. Assert unchanged Bank/source hashes, stable correctness, no provider for en, invalid target before calls and no orphan product on failure.

Output: `docs/agent-coordination/handoffs/product-short-reel-localization.md`.
