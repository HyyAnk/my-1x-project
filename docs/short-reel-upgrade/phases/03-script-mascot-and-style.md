# Phase 03 - Script, Existing Mascot and Generated Style

## Files and interfaces

Create `mascotReferenceService.ts`, `visualContextService.ts`, `stylePrompt.ts`, `styleImageService.ts` and `generation.types.ts` in the feature. Extract reusable safe master resolution from `referenceResolver.ts`. Modify script context integration in `packageService.ts`; existing `scriptPrompt.ts` already accepts mascot/art-direction fields. Create `shortReelUpgradeFixture.ts` as defined in the main plan.

Tests: `shortReelMascotReference.test.ts`, `shortReelStyleImage.test.ts`, `shortReelScriptContext.test.ts`.

## Steps

- [x] Write a master-resolution test using `packageFixture`: clear global style anchors, call `resolveMascotReference`, and verify the copied bytes/checksum equal the master. Ensure no image client was called and original mascot/profile bytes remain unchanged.
- [x] Test missing assigned mascot, missing master, deleted asset, unsafe URL/path, another mascot's URL, known sprite atlas and storage switch. Reuse existing bounded single-frame validation and API-path ownership checks.
- [x] Implement immutable master copying. Resolve the actual channel ID separately from its slug; never build paths from display names or assume the reel ID is an episode ID.
- [x] Implement `adoptVisualContext(repository, key, context)` through `mutateShortReelRecord`. Identical fingerprint is a no-op. Changed input retires conflicting attempts and marks the matrix's affected units stale while preserving payloads. It does not modify global mascot data.
- [x] Add a script prompt test proving the selected mascot name and art direction are included. Existing three segments, cue timing, fact fidelity, and reveal validation remain intact.
- [x] Remove production fallback-to-baseline on absent LLM, provider error, or timeout. Keep deterministic fixture scripts only in tests. Test a rejected LLM leaves the script failed with no fake accepted replacement, while an old accepted script remains visible.
- [x] Apply the 90000 ms default at the real deadline boundary in `scriptService.ts` and its caller; the old function clamps requests to 60000 ms. Preserve shorter caller deadlines and the one-correction budget, and verify the boundary using fake timers. Do not alter unrelated LLM workflows.
- [x] Complete the reusable upgrade fixture after resolver/adoption behavior is tested. It deliberately has no global style anchor.
- [x] Write a style test that fails before implementation:

```ts
it("generates a portrait scene without a global style anchor", async () => {
  const f = await createUpgradeFixture();
  try {
    const client = fakePortraitClient(await packageImage("green", 720, 1280));
    const payload = await generateReelStyleReferences(f.repo, f.key, f.snapshot, client, "style-test-op", f.signal);
    expect(payload.references.map((item) => item.role)).toEqual(["mascot", "style"]);
    expect(payload.references[1]).toMatchObject({ width: 1080, height: 1920 });
    expect(client.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        aspectRatio: "9:16",
        reference: expect.objectContaining({ bytes: expect.any(Uint8Array) }),
      }),
    );
    expect((await f.repo.getMascot(f.mascot.id)).styles[0].anchor_image_url).toBeNull();
  } finally {
    await f.cleanup();
  }
});
```

- [x] Implement `buildReelStylePrompt(record)` as a pure function. Read accepted script, initial environment, mascot identity, key props and camera direction. Delimit narrative/source text as data, and do not let embedded instructions override system constraints.
- [x] Include these concrete prompt requirements: one full-bleed 9:16 scene; selected mascot identity preserved from reference; cohesive cinematic 3D materials/lighting; representative opening environment; no collage, thumbnail hook, CTA, watermark, borders or unnecessary baked-in text. Do not reuse mascot studio-isolation or background-removal instructions.
- [x] Implement the generation service using actual master bytes, portrait client, normalization, then `storePackageAsset` for style. Return both immutable references. Unit acceptance remains the caller's responsibility.
- [x] Add tests for script missing/stale, signal aborted, provider failure, wrong aspect ratio, mascot changed during generation, and checksum-preserving original master. Assert failures never update `last_accepted_payload`.
- [x] Test a successful references acceptance does not invalidate the accepted script after Phase 05 integration. Until that phase, track this named integration test as deliberately pending in progress, not as a completed behavior.

```powershell
pnpm --filter @studio/server test -- shortReelMascotReference shortReelStyleImage shortReelScriptContext shortReelScript
pnpm --filter @studio/server typecheck
```

## Exit gate

The selected master works without an existing style anchor, the script receives mascot context, and a generated style payload is portrait and reel-owned. No template fallback is presented as LLM success. Lifecycle integration is completed in Phase 05 before delivery.
