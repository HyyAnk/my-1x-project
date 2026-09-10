# Decision Log

## Approved decisions

| ID  | Decision                                                                           | Reason                                                                         |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A01 | Reuse existing providers through image-byte adapters, not Episode-bound writers    | Avoid the reel-ID-as-episode-ID failure                                        |
| A02 | Reuse existing mascot master; generate a reel-specific scene style                 | Global style anchor is not required and must not be overwritten                |
| A03 | Cover conditions on accepted style image and accepted script                       | Preserve identity/art direction with a dedicated thumbnail composition         |
| A04 | Request portrait at provider level and normalize valid portrait to 1080x1920       | Do not disguise wrong orientation through cropping                             |
| A05 | Publishing has title and description only; tags/CTA live in description            | Ready-to-copy output and reduced UI complexity                                 |
| A06 | Script is upstream of style; reference changes only refresh prompts and cover      | Prevent circular regeneration                                                  |
| A07 | Repair is package default; full regeneration is explicit                           | Preserve good work and avoid accidental cost                                   |
| A08 | Use v2 canonical records with non-mutating v1 read adapter and backup-on-write     | Preserve persisted user data while evolving contracts                          |
| A09 | New generation uses English and strict short-copy bounds; legacy content preserved | Follow project language rule without destroying existing data                  |
| A10 | Unsupported reference-conditioning providers fail explicitly                       | No misleading text-only identity fallback                                      |
| A11 | Execute sequential phases with evidence gates                                      | Keep implementation understandable and resumable                               |
| A12 | Paid live test requires separate target and budget approval                        | Planning/implementation handoff does not authorize unbounded provider spending |

## Proposed implementation mappings to record later

No deviations have been made. If existing code moved, record the old/new path mapping and why behavior is unchanged. If a proposed change alters product behavior, supported providers, persisted compatibility or safety, stop for user direction before implementing it.

Each new entry must include date, affected phase, decision, alternatives considered, exact files, tests proving the behavior, and whether user approval was required and obtained. Do not overwrite approved decisions retroactively.
