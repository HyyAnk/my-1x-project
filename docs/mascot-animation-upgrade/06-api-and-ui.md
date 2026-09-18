# API and Studio Workflow

## Proposed routes

GET /api/mascots/:mascotId/styles/:styleId/animations
GET /api/mascots/:mascotId/animation-jobs/:jobId
GET /api/mascots/:mascotId/animation-batches/:batchId
POST /api/mascots/:mascotId/styles/:styleId/animations/plan
POST /api/mascots/:mascotId/animation-batches/:batchId/start
POST /api/mascots/:mascotId/animation-jobs/:jobId/retry
POST /api/mascots/:mascotId/animation-jobs/:jobId/cancel
POST /api/mascots/:mascotId/animation-jobs/:jobId/curation
POST /api/mascots/:mascotId/animation-batches/:batchId/publish

Route names are proposals; match existing conventions. Validate at boundaries and return structured error codes. Plan is idempotent. Start returns immediately and exposes bounded polling or the existing task event channel. Publish rejects unless all twenty slots are ready.

## User flow

Concept and Style creation remain unchanged. The animation studio has Thinking and Celebrate tabs. Each tab has ten numbered slots with status, preview, QA summary and retry. Generate Missing creates missing slots for the selected style. Generate All Styles creates missing slots across all styles. A slot opens frame preview and curation after generation. Publish stays disabled until all twenty slots pass.

## Async behavior

Show queued, generating, processing, curating, QA failed, ready, cancelled and retry states. Disable duplicate submission for the pending operation but keep navigation usable. Preserve selected style, active state and slot through updates. Show errors adjacent to the affected slot with retry.

Visible UI labels and all system strings are English-only. Keep copy concise. Include the required responsive footer credit exactly as specified by AGENTS.md.

