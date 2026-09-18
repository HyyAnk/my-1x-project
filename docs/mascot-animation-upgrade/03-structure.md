# Target Repository Structure

Use these as focused modules; verify exact local naming before adding them.

packages/shared/src/mascot/animation/
- animationTypes.ts
- animationSchema.ts
- animationConstants.ts
- animationFingerprint.ts
- animationVariantSelector.ts
- animationFrameResolver.ts
- index.ts

apps/server/src/quiz/mascot/animation/
- animationPlanService.ts
- animationJobService.ts
- animationPublishService.ts
- animationRepository.ts
- animationArtifactImporter.ts
- animationQaService.ts
- spriteGen/spriteGenAdapter.ts
- spriteGen/spriteGenCommand.ts
- spriteGen/spriteGenManifest.ts
- spriteGen/spriteGenProcess.ts

apps/server/src/routes/mascots/
- mascotAnimationRoutes.ts
- mascotAnimationSchemas.ts

apps/web/src/features/mascot/animation/
- components/AnimationStudioPanel.tsx
- components/AnimationStateTabs.tsx
- components/AnimationSlotGrid.tsx
- components/AnimationSlotCard.tsx
- components/AnimationBatchProgress.tsx
- components/AnimationCurationPanel.tsx
- hooks/useMascotAnimationStudio.ts
- hooks/useMascotAnimationJobs.ts
- services/mascotAnimationApi.ts
- utils/animationStatus.ts

apps/server/test/mascotAnimation/
apps/web/src/features/mascot/animation/*.test.tsx

Keep modules under the repository size signals. UI components do not call providers or repositories. Routes validate, call a service and map results only.

