# Phase 02 - Portrait Image Provider Boundary

## Files and interfaces

Create the three modules under `apps/server/src/providers/imageGeneration/`, `apps/server/src/shortReel/portraitImage.ts`, `generationErrors.ts`, and tests `portraitImageClient.test.ts`, `shortReelPortraitImage.test.ts`. Modify provider transport only when reference support is genuinely missing. Keep existing text-only Episode and mascot behavior compatible.

Produces: `PortraitImageClient` and `createPortraitImageClient(config: AppConfig["image_generation"]): PortraitImageClient`, plus `normalizeReelPortrait(bytes: Uint8Array): Promise<Buffer>` and safe package errors. The client factory has no RepositoryService parameter.

## Steps

- [x] Write a Gpti2 adapter test with `vi.mock` on the existing `gpti2Image.js` byte-generation export. Supply a small real PNG reference and generated 720x1280 PNG; assert the transport arguments, not merely a successful return.

```ts
const result = await client.generate({
  prompt: "A mascot on an autumn lawn",
  aspectRatio: "9:16",
  reference: { bytes: referenceBytes, mimeType: "image/png" },
  operationId: "style-op-1",
  dependencyFingerprint: "input-hash",
  signal: controller.signal,
});
expect(mockedGenerate).toHaveBeenCalledWith(
  expect.any(String),
  expect.objectContaining({
    aspect_ratio: "9:16",
    referenceImageBase64: Buffer.from(referenceBytes).toString("base64"),
    cancellationSignal: controller.signal,
    idempotencyKey: expect.any(String),
  }),
);
expect(result.bytes).toEqual(generatedBytes);
```

Import the mocked byte generator explicitly and use `vi.mocked`, not `as any`. Set `referenceBytes/generatedBytes` with existing `packageImage`; `client` is the factory output using a test-only key and the configured model name. No fetch is permitted in this test.

- [x] Run the test red, implement the factory and thin Gpti2 adapter, then run green. Pass ratio through the existing dimension resolver; do not override it with a landscape `size`.
- [x] Define capabilities explicitly for every current configuration branch. Gpti2 reference conditioning must work. For ShopAiKey/custom/Google/Antigravity either implement and test actual conditioning using documented transport or return `REFERENCE_INPUT_UNSUPPORTED` before charging. The release report must name unsupported branches. Never pass one provider's key to a different fallback service.
- [x] Add same-operation/same-key and new-operation/new-key assertions. Include model, ratio and reference dependency hash in the seed. Test missing credentials without logging the supplied key.
- [x] Verify no imports of repository, Episode or bundle writers in the new client modules. Add a fake repository spy in service tests proving `getEpisode` and `writeBundleImage` are never called.
- [x] Implement portrait normalization after header/size/frame checks. Test valid 720x1280 -> 1080x1920, native 1080x1920, JPEG/WebP, corrupt bytes, oversized bytes, square, landscape, near-ratio tolerance and a clearly incompatible portrait ratio.

```ts
await expect(normalizeReelPortrait(await packageImage("red", 1280, 720))).rejects.toMatchObject({ code: "INVALID_DIMENSIONS" });
const normalized = await normalizeReelPortrait(await packageImage("red", 720, 1280));
expect(await sharp(normalized).metadata()).toMatchObject({
  width: 1080,
  height: 1920,
  format: "png",
});
```

- [x] Replace the 60-second clamp with an explicit bounded per-operation deadline without changing unrelated defaults accidentally. Test 90000 ms image completion succeeds with the 300000 ms budget using fake timers, and a short caller-supplied budget fails deterministically.
- [x] Test abort before dispatch, during polling, during download and late resolution after abort. Remove timers/listeners in `finally`; no orphaned promise rejection or accepted output after cancellation.
- [x] Centralize error mapping. Preserve specific dimensions/reference/storage failures. Store safe code/message separately from sanitized diagnostic cause.
- [x] Reuse existing usage accounting for real image results. Its `episodeId` is optional, so omit it for reels; add optional `reelId` input and serialized `reel_id` event attribution in `quizAnalyticsLedgerStore.ts`, `quizAnalyticsReconciler.ts`, repository runtime types and shared usage-ledger schema. Keep old events parseable. Do not fake episode IDs or fabricated costs. If the existing estimator supplies a cost when none is returned, explicitly label that as estimated and retain unknown actual cost; never report it as measured provider cost. Add a `shortReelUsageLedger.test.ts` regression for old Episode input and new reel input.

```powershell
pnpm --filter @studio/server test -- portraitImageClient shortReelPortraitImage shortReelImageStorage
pnpm --filter @studio/server test -- thumbnail
pnpm --filter @studio/server typecheck
```

## Exit gate

Mocked transport proves real reference bytes, 9:16 request, bounded cancellation and correct idempotency. Unsupported configurations fail transparently. No Episode-specific persistence is used by the new path.
