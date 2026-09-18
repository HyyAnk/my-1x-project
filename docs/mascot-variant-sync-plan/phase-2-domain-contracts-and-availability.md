# Phase 2 Specification: Domain Contracts & Media Availability Filter

## Objective
Establish strict domain contracts and availability predicates in `@studio/shared` and server adapters to guarantee that only variants backed by real media are eligible for rendering, and styles lacking variants gracefully omit the mascot without error.

## Scope & Changes
1. **Define `isMascotVariantAvailable`:**
   - In `@studio/shared` (e.g. `packages/shared/src/mascot/animation/animationSchema.ts` or `renderResolver.ts`):
   - A variant is available if and only if:
     - It has a non-empty `animation?.transparent_video_url` (transparent WebM video), OR
     - It has a non-empty `image_url` that does NOT contain mock fixture identifiers (e.g., rejects fixture paths).
     - It has an active/ready status and valid media payload.
2. **Graceful Fallback / Omission Policy:**
   - When resolving mascot for a state/phase:
     - If available variants exist: select among available variants.
     - If 0 available variants exist for the state:
       - Attempt style anchor image fallback if present.
       - If no anchor image, return `null` / `visible: false` so that no broken layer or mock canvas is generated.
3. **Unit Tests:**
   - Create `packages/shared/test/mascotAvailability.test.ts`.
   - Test cases:
     - Variant with WebM video URL -> available.
     - Variant with valid 3D image URL -> available.
     - Variant with mock fixture atlas URL -> unavailable.
     - Empty variant (no image, no video) -> unavailable.
     - Resolving state with 0 variants returns null/invisible.

## Acceptance Criteria
- [ ] Predicate function `isMascotVariantAvailable` implemented and exported.
- [ ] Contract tests passing with 100% assertion coverage.
- [ ] No regression in existing `@studio/shared` test suite.
