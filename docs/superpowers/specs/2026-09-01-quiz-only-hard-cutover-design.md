# Quiz-Only Hard Cutover Design

## Problem

The application was partially migrated from its original narrative-video product to a Quiz-only product. A later refactor restored a stale second channel-type choice, an alternate episode presentation path, production-mode branches, old product naming, and the old runtime namespace. The server already creates every new channel as Quiz, so the current selector does not represent real behavior and leaves enough dormant structure for the removed branch to return again.

All six channels in the configured content store currently use the Quiz pipeline. There is no non-Quiz channel data that needs continued execution support.

## Goals

- Make Quiz the only production workflow in UI, shared contracts, server orchestration, persistence, tests, scripts, and documentation.
- Remove all current-tree product references, filenames, and runtime paths associated with the retired branch.
- Replace the runtime namespace with `.quiz-studio` without losing local configuration, credentials, logs, tasks, voices, mascots, or generated assets.
- Prevent future refactors from restoring the retired product token or its structural entry points.
- Preserve a clean extension path for grouping channels by language, country, market, or future custom collections without coupling grouping to production behavior.

## Non-goals

- Do not rewrite Git history. Historical commits remain intact and are not part of runtime or current-tree audits.
- Do not build a custom channel-collection subsystem in this change.
- Do not change Quiz formats, question generation, media providers, rendering behavior, or user-authored content except where required to remove the retired branch.
- Do not remove legitimate Quiz history features such as question revision history.

## Architecture decisions

### One production policy

Quiz is a stable domain policy, not one option in a production-mode enum. Remove the channel-level `engine` discriminator and every conditional that selects a production path from channel metadata. Episode presentation and server orchestration invoke the Quiz workflow directly.

The existing `group_id` field is also removed from channel creation, the current Channel contract, and persisted channel metadata because its current meaning is an overloaded production-type label. It must not select UI, prompts, tasks, or rendering behavior.

### Grouping remains independent

Removing the overloaded field does not remove grouping capability:

- Language and country views derive groups from the existing `language` and `country` fields.
- Market views derive groups from `market`.
- Audience or status views derive groups from their corresponding metadata.
- A future manual grouping feature should introduce a `ChannelCollection` entity plus explicit membership, allowing a channel to belong to more than one collection without affecting its pipeline.

No speculative collection contract is added now. This keeps the current change focused while leaving production and organization as separate responsibilities.

### Quiz-only web flow

The create-channel modal contains channel identity, locale, audience, and description fields only. It does not render or submit a production-type selector. Application modal state becomes a simple open/closed state rather than carrying an initial channel type.

Episode routing renders the Quiz episode workspace directly. The retired alternate component, channel-type translation keys, obsolete CSS, alternate readiness mappings, and type aliases are deleted. Existing responsive footer credit strings remain unchanged and only one version is visible at each breakpoint.

### Quiz-only server flow

The legacy-named full-production runner currently contains useful preproduction steps that the Quiz workflow still consumes. It is not deleted blindly. It is renamed and reshaped as the Quiz production orchestrator, while alternate output contracts, non-Quiz context branches, task mappings, and presentation branches are removed.

Research, script, visual planning, Quiz V2 generation, asset and voice work, QA, and render steps remain only when they are reachable from the Quiz workflow. Shared rules that remain useful are rewritten in Quiz-neutral language; rules used only by the retired path are deleted.

### Strict boundaries

Create-channel input no longer accepts production or grouping discriminator fields. Boundary validation is strict so stale clients fail clearly instead of having unknown fields silently ignored. Repository creation writes only the current Quiz channel shape.

Channel parsing, fixtures, and tests move to the discriminator-free contract. The configured channel files are migrated before the updated server is restarted, so strict parsing never encounters the obsolete persisted fields.

### Runtime and product namespace

Both runtime locations are migrated to `.quiz-studio`: the project-local settings directory and the configured content-store runtime directory. All config readers and writers, loggers, launchers, shutdown scripts, provider caches, voice paths, task paths, service titles, package metadata, and documentation use the new namespace.

No runtime fallback to the old namespace remains after the local migration. Keeping such a fallback would preserve the retired token and allow stale state to re-enter the system.

## Data migration and recovery

1. Detect whether dashboard, server, web, TTS, or render processes are using either runtime directory and stop them cleanly.
2. Resolve and verify the exact project and content-store source and destination paths. Abort if a destination already exists or a source escapes its expected root.
3. Copy the six channel metadata files to a timestamped temporary recovery directory beside the content-store runtime. Do not create either `.quiz-studio` destination during this step.
4. Atomically rewrite each channel metadata file without the obsolete production and grouping fields. Do not alter IDs, slugs, timestamps, content settings, episode data, or assets.
5. Move the two runtime directories to `.quiz-studio`, preserving their contents and permissions.
6. Move the recovery copy under the content-store `.quiz-studio/migration-backups/` directory, then start the updated application and verify that it reads settings, tasks, voices, mascots, and all six channels from the new locations.

If any preflight or move fails, do not start the updated server. Restore channel metadata from the recovery copy and move any completed runtime destination back before reporting the failure. The operation must never merge two runtime directories implicitly.

## Interaction plan

1. Opening Create new channel immediately shows the Quiz channel form with no type decision.
2. Submitting acknowledges the action on the button, disables duplicate submission, and leaves unrelated form state intact.
3. The UI does not show completion optimistically. It waits for the server response, registers the returned task, closes the modal, refreshes channels, opens the confirmed channel, and displays the success notice.
4. On slow responses, the pending label and spinner remain visible without freezing unrelated application state. On failure, pending state ends, all input is preserved, a contextual error is shown, and retry is safe.
5. Channel refresh sequencing continues to prevent stale responses from overwriting newer state. Existing task events keep affected views synchronized without a full-page reload.
6. Desktop and mobile checks confirm that removing the selector leaves no empty layout gap, every control remains keyboard and touch accessible, visible copy is concise, titles have no trailing periods, and the required responsive footer credit remains correct.

## Recurrence guard

Add a repository audit that scans tracked filenames and text content for the retired product token and known structural identifiers. The audit uses a neutral filename and constructs the forbidden token internally so the guard does not exempt itself. It is included in the normal test command and CI path.

The audit excludes `.git`, dependencies, build output, generated media, user-authored channel content, and runtime logs. It covers source, tests, templates, scripts, configuration, and documentation in the current tree. Legitimate uses of the word “history” that describe Quiz revision history are not banned.

Contract and UI tests provide additional structural guards:

- Create-channel requests containing obsolete discriminator fields are rejected.
- Repository-created channels contain no production discriminator.
- The modal exposes one creation workflow and submits no hidden type field.
- Episode routing and the production runner have no alternate channel-mode branch.
- Runtime path tests resolve only `.quiz-studio`.

## Verification

- Add failing tests before each behavior change and confirm the failure represents the retired path.
- Run focused shared-schema, repository, route, modal, episode, pipeline, config, and launcher tests.
- Run formatting checks, lint, typecheck, all unit/integration tests, the recurrence audit, and the production build.
- Restart every affected local process so code and configuration are loaded from `.quiz-studio`.
- Exercise channel creation under success, slow response, failure, and retry conditions.
- Verify the primary channel and episode workflows at desktop and mobile widths, including responsive footer behavior.
- Confirm all six existing channels and their episodes still open and the Quiz pipeline can start without a full-page refresh.
- Perform a final case-insensitive current-tree scan; it must return zero retired product references outside excluded user/runtime/history data.
