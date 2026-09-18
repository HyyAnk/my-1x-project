# Mascot Animation Operational Runbook

## 1. Upgraded Architecture Summary

The mascot animation system replaces generated single stills and synthesized CSS motion with curated 12-frame sprite rows. This guarantees seamless preview and production parity while preserving asset localization, registration, and deterministic question-level variant selection.

### Key Architectural Invariants
- **Framerate & Duration**: Exactly 12 frames at 8 FPS (125 ms per frame, 1,500 ms total duration per loop).
- **Semantic States**: Exactly 2 states: `thinking` (focus, pondering, curiosity) and `celebrate` (joyful, energetic, child-safe victory).
- **Slot Capacity**: 10 slots per state = 20 animation slots per style.
- **Recipes**: 20 canonical recipes defined in `@studio/shared` (`thinking-01-head-tilt-left` through `thinking-10-eureka-nod`, `celebrate-01-jump-clap` through `celebrate-10-gold-star-twirl`).
- **Atlas Layout**: Standardized 4x3 cell grid (4 columns, 3 rows) on transparent background (typically 512x384 at 128x128 per cell).
- **Storage Hierarchy**:
  - Mascot Profile: `<storageRoot>/mascots/<mascotId>/mascot.json`
  - Generation Workspaces: `<storageRoot>/output/<mascotId>/<styleId>/<state>/<slotIndex>/attempt_<N>/`
  - Artifacts: `atlas.png`, `manifest.json`, `qa_report.json`, `logs.json`
  - Published Immutable Records: `<storageRoot>/animations/published/<mascotId>/<styleId>/<state>_<slotIndex>_v<revision>.json`
- **QA Gates (7 Automated Checks)**:
  1. `frame_count`: Exactly 12 frames defined in manifest.
  2. `bounds`: Frame rectangles strictly within atlas dimensions without overlaps.
  3. `alpha_coverage`: Average non-zero alpha ratio >= 0.02, verifying character presence.
  4. `duplicate_pose`: Duplicate frame ratio <= 0.25, ensuring continuous animation progression.
  5. `motion_difference`: Average inter-frame motion diff >= 0.02, eliminating frozen or static frames.
  6. `seam`: Seam discontinuity between frame 12 and frame 1 <= 0.40, guaranteeing clean loop closure.
  7. `fingerprint_consistency`: Computed SHA-256 hash matches declared content fingerprint.
- **HyperFrames Constraints & Motion Suppression**:
  - In animations, HyperFrames uses explicit frame-at-time seekability (`Math.floor(currentTimeMs / 125) % 12`).
  - Synthetic CSS motion transforms (`bob`, `sway`, `float`) are suppressed whenever `animation` is present, preventing double-motion jitter.
- **Publishing Gate**:
  - A style is publish-eligible ONLY when all 20 required slots are in `ready` state and have passed QA.
  - Publishing is isolated: one style publishing does not require or depend on another style's completion.

---

## 2. CLI Commands & Operational Workflows

### 2.1 Pre-Flight Diagnostics
Run pre-flight checks to verify local environment dependencies, Python availability, and sprite-gen model/weights readiness:

```bash
# Execute sprite-gen diagnostics test suite
pnpm --filter @studio/server exec vitest run test/spriteGenDiagnostics.test.ts
```

### 2.2 Pilot Gate Validation (Stage 16)
Before triggering a full all-style batch, execute the 12-frame pilot gate for a specific mascot style. The pilot runs Phase A (2 pilot rows: slot 1 thinking + slot 1 celebrate) followed by Phase B (remaining 18 slots):

```bash
# Execute pilot validation test suite
pnpm --filter @studio/server exec vitest run test/animationPilot.test.ts
```

In programmatic scripts or CLI utilities:
```ts
import { runAnimationPilot } from "@studio/server/quiz/mascot/animation";

const report = await runAnimationPilot("owl_mascot_01", "core_style", {
  fixtureMode: false, // set true for offline synthetic testing
  autoPublish: true,
  maxConcurrency: 2,
});

if (!report.passed) {
  console.error("Pilot failed:", report.failureDetails);
}
```

### 2.3 All-Style Rollout Execution (Stage 17)
To plan, generate, and publish across all styles for a mascot with bounded concurrency:

```bash
# Execute rollout test suite
pnpm --filter @studio/server exec vitest run test/animationRollout.test.ts
```

In server tasks or administrative scripts:
```ts
import { executeMascotAnimationRollout } from "@studio/server/quiz/mascot/animation";

const rolloutReport = await executeMascotAnimationRollout("owl_mascot_01", {
  fixtureMode: false,
  autoPublish: true,
  maxStyleConcurrency: 2,
  maxConcurrency: 4,
});

console.log(`Rollout Summary: ${rolloutReport.publishedStyles}/${rolloutReport.totalStyles} styles published.`);
```

### 2.4 REST API Endpoints
The Fastify server exposes the following endpoints for studio UI or external controllers:

- `GET /api/mascots/:mascotId/styles/:styleId/animations`: Retrieve style slot readiness, existing variants, and publish eligibility.
- `POST /api/mascots/:mascotId/styles/:styleId/animations/plan`: Plan a 20-slot batch with fingerprint deduplication.
- `POST /api/mascots/:mascotId/styles/:styleId/animations/batch`: Start generation batch execution.
- `GET /api/mascots/:mascotId/animations/batches/:batchId`: Poll batch progress (`completed_jobs`, `failed_jobs`, `status`).
- `GET /api/mascots/:mascotId/animations/jobs/:jobId`: Poll specific slot job state and attempt logs.
- `POST /api/mascots/:mascotId/animations/jobs/:jobId/retry`: Retry an individual failed job.
- `POST /api/mascots/:mascotId/styles/:styleId/animations/publish`: Publish style animations (returns HTTP 409 if < 20 ready slots).

---

## 3. Troubleshooting & Recovery Procedures

### 3.1 Failed Slots & Error Analysis
When a slot fails, it is marked as `qa_failed` (if the image was generated but failed quality checks) or `error` (if process runner or sub-process crashed).

#### How to Inspect:
1. Check the attempt directory:
   `<storageRoot>/output/<mascotId>/<styleId>/<state>/<slotIndex>/attempt_<N>/`
2. Inspect `qa_report.json`:
   - `checks.alpha_coverage`: If `passed: false`, character image may have failed extraction or has excess transparency.
   - `checks.duplicate_pose`: If `passed: false`, model generated static or repetitive frames (duplicate ratio > 0.25).
   - `checks.motion_difference`: If `passed: false`, motion score is below 0.02.
   - `checks.seam`: If `passed: false`, frame 12 pose does not return smoothly to frame 1 rest pose (diff > 0.40).
3. Inspect `logs.json`: Contains stdout, stderr, process execution time, and process error codes.

### 3.2 Retrying an Individual Failed Slot
Failed slots are non-destructive and remain individually retryable without needing to regenerate the whole style or mascot:

#### Via REST API:
```bash
curl -X POST http://localhost:4000/api/mascots/owl_mascot_01/animations/jobs/job_12345/retry \
  -H "Content-Type: application/json"
```

#### Programmatically:
```ts
import { DefaultAnimationRepository, AnimationJobService, DefaultSpriteGenAdapter } from "@studio/server/quiz/mascot/animation";

const repo = new DefaultAnimationRepository({ storageRoot: "./data/mascots" });
const jobService = new AnimationJobService({
  repository: repo,
  adapter: new DefaultSpriteGenAdapter(),
  outputBaseDir: "./data/mascots/output",
});

const mascot = await repo.getMascotProfile("owl_mascot_01");
const retriedJob = await jobService.retryJob("owl_mascot_01", "job_12345", mascot);
console.log("Retry status:", retriedJob.status);
```

### 3.3 Idempotency & Cache Invalidation
- The system generates a SHA-256 `source_fingerprint` incorporating: `styleAnchorIdOrUrl`, `recipeId`, `prompt`, `frameCount (12)`, `fps (8)`, `providerRevision`, and `toolVersion`.
- If an existing slot is already `ready` and its `source_fingerprint` matches the current inputs, `planStyleAnimation` marks it as `skipped` (`skip_reason: "fingerprint_match"`).
- To force regeneration of all slots regardless of existing ready status, pass `{ force: true }` in rollout or plan options.

### 3.4 Verification of Artifacts
Before approving a release, verify:
1. `atlas.png` is readable, exactly 12 cells, transparent background.
2. `manifest.json` satisfies `MascotAnimationManifestSchema` with `frame_count: 12` and `fps: 8`.
3. `qa_report.json` satisfies `AnimationQaReport` with `passed: true`.
4. Style publication recorded in `<storageRoot>/animations/published/`.

---

## 4. Operational Monorepo Verification Matrix

To ensure system integrity across packages, run the following verification suite:

```bash
# 1. Shared schemas and recipes
pnpm --filter @studio/shared test
pnpm --filter @studio/shared build

# 2. Server animations, batching, pilot, rollout, routes
pnpm --filter @studio/server exec vitest run test/animation* test/spriteGen*
pnpm --filter @studio/server typecheck

# 3. Web studio animation UI, curation, scrubber
pnpm --filter @studio/web exec vitest run src/features/mascot/animation
pnpm --filter @studio/web typecheck
```
