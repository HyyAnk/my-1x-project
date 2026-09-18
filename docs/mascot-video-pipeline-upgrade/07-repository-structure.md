# Target Repository Structure

packages/shared/src/mascot/animation/
  animationTypes.ts
  animationSchema.ts
  animationConstants.ts
  animationFingerprint.ts
  animationFrameResolver.ts
  animationVariantSelector.ts
  index.ts

apps/server/src/quiz/mascot/videoAnimation/
  videoUploadService.ts
  videoProcessingService.ts
  videoProcessingRepository.ts
  frameExtractionService.ts
  frameMattingService.ts
  frameRegistrationService.ts
  animationPackagingService.ts
  animationQaService.ts
  animationPublishService.ts
  adapters/ffmpegAdapter.ts
  adapters/mascotMattingAdapter.ts
  adapters/animationStorageAdapter.ts

apps/server/src/routes/mascots/
  mascotAnimationRoutes.ts
  mascotAnimationRouteSchemas.ts

apps/web/src/features/mascot/videoAnimation/
  components/
  hooks/
  services/
  utils/

apps/server/test/mascotVideoAnimation/
apps/web/src/features/mascot/videoAnimation/*.test.tsx

Keep UI, routes, services, adapters, repositories and shared contracts separate. Do not grow existing god files.
