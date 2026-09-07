# Architecture And Boundaries

## Dependency Flow

```text
Channel DNA + explicit content kind
                 |
           mixed topic planner
             /          \
      Episode path    Short-Reel selection
       16:9 only       approved bank snapshot
                            |
                  structured three-part story
                            |
                  deterministic prompt compiler
                            |
              references + cover + publishing copy
                            |
                     package export
                            |
                 user operates Flow manually
```

The server application service coordinates the story/package; domain validators do not import Fastify, filesystem clients, React or task managers. UI components render data and dispatch actions through feature hooks. Public Zod contracts are shared; provider-specific parsing/retry belongs at the LLM/image adapter boundary.

## Responsibility Map

| Unit                       | Owns                                                           | Must Not Own                                     |
| -------------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| Shared shortReel contracts | DTOs, runtime validation, stable enums                         | Network, filesystem, prompts, mutable state      |
| Bank selection adapter     | Eligible candidate lookup and deterministic selection          | Bank generation, bank mutation, Episode creation |
| Short-Reel repository      | Channel-contained paths, atomic save, locking/CAS, idempotency | Creative generation, UI copy                     |
| Script service             | LLM request, output validation, bounded correction             | Video generation, direct filesystem writes       |
| Prompt compiler            | Exact deterministic three-prompt projection                    | LLM calls, mutable storage, identity guarantees  |
| Revision policy            | Dependency invalidation and ready derivation                   | Timers, task submission, network                 |
| Package service            | Per-component orchestration and result acceptance              | Episode render pipeline or hidden global jobs    |
| Reference adapter          | Validated asset resolution and provenance                      | Sprite animation, stage placement                |
| Thumbnail adapter          | Reuse image-generation boundary, portrait cover contract       | Dummy Episode creation                           |
| HTTP routes                | Parse, invoke service, map typed errors                        | Business workflows or raw persistence            |
| Web API client / hook      | Transport / local draft and reconciliation                     | Duplicated server domain rules                   |

## Persistence And Concurrency

Use the existing repository root resolver; never join user-provided paths directly. Store records beneath the resolved channel's `short-reels/<reel-id>/`. IDs are generated server-side. Compare expected revision and write in one serialized per-record operation, not a read-check followed by an unlocked write. Atomic file rename alone does not implement compare-and-swap.

Idempotent creation is keyed by channel and topic: use a stable server-derived record key or a durable topic mapping protected by the same lock. On repeated requests after restart, return the same record. Do not reserve a topic in one file and leave a half-created product in another without repair logic.

The application currently uses a local server. Phase 01 must verify whether multiple writer processes can share the same root. If so, an in-memory mutex alone is insufficient: use an existing cross-process lock/transaction primitive or explicitly prevent the second writer before accepting traffic. Do not claim multi-process safety without testing it.

## Revision Model

Use a monotonic persisted record revision for HTTP edits. Each generated unit also carries its dependency fingerprint. A job completion reads the latest record under the record lock and may update only its target when operation ID and dependency fingerprint still match. This allows sibling cover/publishing completions to merge without discarding one solely because another advanced the record revision.

Changing creative inputs marks affected targets stale and cancels/retires their operation IDs. Cancellation and late completion compete at the same acceptance boundary. A cancelled operation cannot restore ready state. Persist accepted component completions individually; a later component failure does not erase successful work.

Do not persist both a global readiness flag and an independent set of component flags as competing truth. Derive readiness from current component/dependency status and validated script. Manual user verification of the footage is not derivable from application state.

## Integration Order

Phase 02 introduces only contracts/storage. Phase 03 adds topic discrimination/allocation and the minimal usable Short-Reel draft route/view so a visible topic never routes to a missing page. Phase 04 adds script services exercised through an integration harness. Phase 05 adds package services. Phase 06 completes jobs, editing, export and UI integration. Phase 07 retires legacy portrait support with the new workflow already usable.

When a phase changes a public contract, update all current consumers in that phase's concrete claim. Do not leave the repository intentionally uncompilable until a later phase.

## Extension Limits

No provider abstraction is needed solely to anticipate an API. A future adapter can consume the persisted structured script and reference assets, but schema/database changes may still be needed. Do not promise a future provider can be added with zero contract changes.

Keep files cohesive; treat 150-200 lines/module and 30-40 lines/function as review signals. Extract meaningful responsibilities before adding another workflow to large files. Preserve recent mascot/Sandbox modularization rather than reconstructing their former monolithic files.
