# Phase 04 - Cover and Publishing

## Files and interfaces

Create `coverPrompt.ts`, `coverImageService.ts`, `publishingPrompt.ts`, `publishingParser.ts`. Keep `thumbnailAdapter.ts` and `publishingService.ts` as thin orchestration/compatibility entry points, not parallel implementations. Tests: `shortReelCoverImage.test.ts`, `shortReelPublishingV2.test.ts`.

Consumes: accepted script, visual context, ready mascot/style payload, image client, LLM client. Produces: immutable 1080x1920 cover and generated two-field publishing payload.

## Cover steps

- [x] Read Episode `thumbnailAiPlanner.ts`, `thumbnailPromptCompiler.ts`, `thumbnailHookGuardrail.ts`, `thumbnailVariantGenerator.ts`, and existing 9:16 tests. Identify pure prompt/layout helpers that fit one Short-Reel question; record exactly what is reused. Do not copy entire Episode services or fabricate an Episode to call them.
- [x] Add pure `buildReelCoverPrompt` tests: script narrative affects the prompt; art direction and mascot identity appear; portrait safe composition is requested; no multi-question grid is introduced; the correct answer is not demanded as visible text.
- [x] Write the no-Episode positive regression with a complete fixture. Set ready references using the style service and ordinary record edit transaction, then mock `getEpisode`/`writeBundleImage` to throw if called.

```ts
const getEpisode = vi.spyOn(f.repo, "getEpisode").mockRejectedValue(new Error("Episode lookup is forbidden"));
const writeBundle = vi.spyOn(f.repo, "writeBundleImage").mockRejectedValue(new Error("Episode writer is forbidden"));
const cover = await generateReelCoverPayload(f.repo, f.key, snapshotWithReadyReferences, client, "cover-test-op", f.signal);
expect(cover).toMatchObject({ width: 1080, height: 1920, mime_type: "image/png" });
expect(cover.path).toContain(`/short_reels/${f.key.reel_id}/assets/`);
expect(getEpisode).not.toHaveBeenCalled();
expect(writeBundle).not.toHaveBeenCalled();
```

`snapshotWithReadyReferences` is the actual `updateShortReel` result for `update_references`, not a partial cast. Reuse `createUpgradeFixture`, `fakePortraitClient`, `packageImage` and cleanup from the main plan. Run red before implementing the new cover service.

- [x] Implement cover generation using accepted style bytes as the required provider reference. Assert their checksum against the accepted metadata before dispatch. Do not read the global mascot style anchor as a substitute.
- [x] Reuse the relevant thumbnail concept: clear focal subject, brief hook, restrained composition and portrait-safe visual placement. The exact hook can be planned from the script with the existing LLM planner boundary; if that boundary is Episode-specific, extract a pure input mapper and keep reel context separate.
- [x] Pass portrait ratio and real cancellation signal, normalize validated output, and persist using `storePackageAsset`. Verify output bytes agree with payload metadata.
- [x] Test missing/stale references, script changed during generation, late result after cancel, corrupt output, invalid dimensions, and storage write failure. Specific safe errors must survive `packageAttempt.ts`.
- [x] Keep old accepted cover when regenerate fails. Do not use Episode thumbnail degraded fallback output as a ready reel cover.

## Publishing steps

- [x] Add a pure prompt test with an unmistakable third-segment detail proving all accepted segments are included, not just the topic/source.

```ts
const record = structuredClone(f.snapshot);
record.script!.segments[2].narrative = "The host collects the leaves with a rake.";
record.units.script.last_accepted_payload!.script = record.script!;
const prompt = buildPublishingPrompt(record);
expect(prompt).toContain("The host collects the leaves with a rake.");
expect(prompt).toContain('"title"');
expect(prompt).toContain('"description"');
expect(prompt).toContain("600");
```

The non-null assertions here are fixture guarantees, not a permission to bypass production validation. Production checks require a current complete script.

- [x] Add parser tests using actual generated JSON:

```ts
expect(
  parsePublishingJson(
    JSON.stringify({
      title: "Which Tool Clears the Leaves?",
      description: "Two tools enter the yard. Can you spot the winner?\n\n#Quiz #Tools #Shorts",
    }),
  ),
).toEqual({
  title: "Which Tool Clears the Leaves?",
  description: "Two tools enter the yard. Can you spot the winner?\n\n#Quiz #Tools #Shorts",
});
expect(parsePublishingJson(JSON.stringify({ title: "x".repeat(81), description: "Short." }))).toBeNull();
expect(parsePublishingJson(JSON.stringify({ title: "Tool test", description: "x".repeat(601) }))).toBeNull();
```

- [x] Implement the prompt with exactly title/description output, current script, source grounding, concise curiosity hook, no misleading claim and no automatic answer spoiler. Put facts/narratives in a delimited data block. Use strict schema validation, not regex extraction of two labels from arbitrary prose.
- [x] Retain bounded JSON-envelope parsing; at most one correction attempt for malformed/too-long output within the same deadline. No unbounded retry, guessed success, or silent truncation that drops hashtags. Test both correction success and final failure.
- [x] Remove the post-generation localization overwrite for new publishing. Test a supplied legacy localization artifact cannot replace successfully generated title/description. Do not rewrite or delete the existing localization file.
- [x] Remove silent production fallback on missing LLM. Test unavailable LLM, timeout, abort and malformed JSON preserve existing publishing and return a recoverable failure.
- [x] Keep hashtags inside description for storage/edit/copy/export. A CTA is optional text in that same field, not a separate UI control or required template sentence.
- [x] Keep migration adapters out of LLM result parsing: old API requests may normalize at the boundary, but fresh four-field model output is not silently accepted as compliant new output.

```powershell
pnpm --filter @studio/server test -- shortReelCoverImage shortReelPublishingV2 shortReelLocalization
pnpm --filter @studio/server test -- thumbnail
pnpm --filter @studio/server typecheck
```

## Exit gate

Cover generation has no Episode lookup/write and conditions on the accepted style. Publishing is genuinely script-derived, two-field, concise, validated and not overwritten by a later template/localization step.
