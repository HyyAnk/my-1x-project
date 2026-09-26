# Mascot rendering and assets

## Current contract

[Mascot profiles](../packages/shared/src/schemas/mascot.ts) use `schema_version: 2`, `render_bundle`, and `styles`. The [render bundle contracts](../packages/shared/src/mascot/renderTypes.ts) and [schemas](../packages/shared/src/mascot/renderSchema.ts) define registered action images, placement, visibility, and motion. Styles hold Thinking and Celebrate state slots and can select published animation assets. New consumers should read these canonical fields rather than the legacy root `actions` mirror.

[The legacy adapter](../packages/shared/src/mascot/legacyAdapter.ts) still reads older sprite data, but new authoring uses V2 action images and style slots. [Repository methods](../apps/server/src/repository/mascots.ts) own persistence and migration at the storage boundary. [Production state adaptation](../apps/server/src/quiz/render/mascot/productionMascotStateAdapter.ts), [HTML rendering](../apps/server/src/quiz/render/mascotHtmlRenderer.ts), and [timeline seeking](../apps/server/src/quiz/render/productionMascotTimeline.ts) consume persisted selections without changing the source profile.

## Animation replacement

[Uploaded-video processing](../apps/server/src/quiz/mascot/videoAnimation/) validates and packages new attempts before publishing them. A failed replacement retains the approved attempt and should leave a visible error. Preview and artifact requests must identify the approved attempt so browser caching cannot show a failed or older replacement as current. [Movement measurements](../apps/server/src/quiz/mascot/videoAnimation/registration/registrationMath.ts) are diagnostic; missing frames, empty content, inconsistent dimensions, invalid files, and out-of-canvas bounds remain validation failures.

## Variant export

The Mascot UI exports Original source images or Transparent PNGs for all populated Thinking and Celebrate slots. [The export plan](../apps/server/src/quiz/mascot/variantExport/variantExportPlan.ts) writes under `Mascot Name/Style Name/Thinking|Celebrate/` using numbered slot filenames. Empty slots are omitted. [The export service](../apps/server/src/quiz/mascot/variantExport/variantExportService.ts) runs a background job with progress, cancellation, retry of failed items, and per-mascot duplicate-request protection. Job history is process-local; a server restart requires a new export, which safely skips identical output files.

[The export service](../apps/server/src/quiz/mascot/variantExport/variantExportService.ts) rejects output inside the source library. [The file adapter](../apps/server/src/quiz/mascot/variantExport/variantExportFiles.ts) accepts local mascot assets, preserves original bytes where applicable, and never overwrites a different existing file. The selected folder is on the backend computer. Use the [HTTP routes](../apps/server/src/routes/mascots/mascotVariantExportRoutes.ts) and [browser hook](../apps/web/src/features/mascot/hooks/useVariantExport.ts) for changes instead of copying files directly.

For changes to rendering or animation, run the relevant focused tests and a production composition check. For export, start with [service tests](../apps/server/test/variantExportService.test.ts) and [route tests](../apps/server/test/variantExportRoutes.test.ts); verify a real export with source files when changing filesystem behavior.
