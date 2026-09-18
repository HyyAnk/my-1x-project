# API and Repository Contract

Suggested endpoints, adapted to local route conventions:

GET /api/mascots/:mascotId/styles/:styleId/animation-slots
POST /api/mascots/:mascotId/styles/:styleId/animation-slots/:state/:slot/video
POST /api/mascots/:mascotId/styles/:styleId/animation-slots/:state/:slot/retry
POST /api/mascots/:mascotId/styles/:styleId/animation-slots/:state/:slot/replace
GET /api/mascots/:mascotId/animation-processing/:jobId
GET /api/mascots/:mascotId/styles/:styleId/animations

Routes validate and map only. Services own processing and publication. Repositories own immutable attempts, checksums, asset paths and slot projections.

Every asynchronous mutation returns an acknowledgement, job id when applicable, current slot projection and structured error code. Do not return ready before persisted artifact validation.
