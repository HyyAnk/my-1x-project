# Contract

## Language boundary

Question Bank persists explicit language=en only. Canonical question content, choices, answer identity and source hashes remain immutable during product localization. No translated product question returns to Bank, including via export, completed-video hooks, imports or legacy transcreation routes.

Only audience-facing quiz text, video description and thumbnail in-image text use the product target language. Short-Reel narrative, action, camera, audio instructions and image-generation instructions stay English; localized literal text is supplied separately. Topic titles, internal metadata and UI remain English.

Use base language codes through the existing normalizer. English produces zero translation calls. German/French must exercise the same generic pathway as other supported targets. Reject unsupported targets and Vietnamese before providers or writes. Country/market is not required to identify a language; do not remove unrelated market targeting fields.

## Source and lifecycle

Topics allocate real approved eligible English sources. No fabricated IDs, magic hashes, title heuristics, hidden reselection, or JIT question generation. Unbound legacy candidates remain visible as unavailable with re-suggest recovery.

Availability and confirmation share eligibility and required-capacity policy. Availability is advisory; confirmation is authoritative. Record immutable ordered source IDs, hashes, choice IDs and correct-choice identity.

Use a coherent source snapshot with a defined admission point. Do not hold filesystem locks across provider calls. Revalidate changed source revisions before publication for new work. A retry of admitted work must recover the reserved identity and source snapshot, not select different sources or reject its own cooldown.

## Target-language lifecycle decision

Implement immutable target language for an already confirmed product. A channel-language change applies to future confirmations only. Preserve existing product localization and accepted script/cover/export data; do not silently delete or relabel them. Regenerating an existing product uses its stored target language.

If existing product language cannot be established from a validated receipt/artifact, report a typed recovery error. Do not guess from the channel's current value. An explicit future product-language conversion would need its own versioned invalidation workflow and is outside this repair.

## Safety and delivery

Use temporary isolated storage and provider doubles. No live migration, Bank cleanup, paid generation, publish/upload or destructive restoration. Read-only configured-root audit is permitted. Preserve dirty edits, work on the existing checkout, no commits/push/branches/worktrees unless separately requested.

No subagents. Follow current AGENTS.md. Historical claims instructions are obsolete unless restored by the user; do not recreate removed tooling. Keep all newly written repository documents and code in English.
