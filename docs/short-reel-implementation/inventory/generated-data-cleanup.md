# Generated Data Cleanup Manifest

Status: Phase 07 revalidated the inventory on 2026-09-08. The runtime/generated-data deletion set is empty and no runtime data was deleted. Managed Episode records: 0; topic-run files: 0; managed Short-Reel records: 0. Orphan runtime caches and all protected assets remain retained.

## Resolved Roots And Identity

- Repository: `D:/1a Cursor Project/My 1x Project`.
- Configured storage: `D:/1a Cursor Project/My 1x Youtube Channel File`, read from repository .quiz-studio/storage.local.json without loading provider credentials.
- RepositoryService.createRoots places channels/runtime/mascots under configured storage, but assets/templates/shared remain under the repository.
- Bank read resolver uses configured runtime; only taxonomy may fall back to project runtime when redirected. Do not mistake the two project bank files for the full bank.
- Current channel ID: `ch_875916a8fd10411f`; slug `novy`; mascot assignment is null. Three mascot profiles still exist in runtime storage and remain protected.
- Current task records across configured/project runtime: 1; active QUEUED/RUNNING/WAITING_APPROVAL records: 0. No listeners observed on 4310 or 2244. This is a snapshot, not permission to delete while future jobs run.

## Protected Inventory

Tree digest algorithm: SHA-256 of sorted relative paths (forward slashes) followed by each file's bytes. No symlink directory traversal. Counts/digests are evidence, not backup copies. Recompute immediately before future cleanup.

| Absolute Root                                                                | Files | Bytes     | Tree SHA-256                                                       | Disposition |
| ---------------------------------------------------------------------------- | ----- | --------- | ------------------------------------------------------------------ | ----------- |
| `D:/1a Cursor Project/My 1x Youtube Channel File/channels`                   | 4     | 5846      | `dbfd2fd14451b722c227183b638a8ba51eabef10a4cf07e2e2bcb48abea5162c` | preserve    |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/question_bank` | 144   | 1952506   | `1c620c21a72c554a4c5b58bc7dc6fe32ef1fda255f22e3f99d1da5256dbf5c2f` | preserve    |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/mascots`       | 19    | 14144705  | `ee6006d6bed161990a2ed7a4f98d2e3a423d7277945090fc5b5363dffa5163b9` | preserve    |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/voices`        | 5     | 8534637   | `1ba0d3d3bf14d57025be16dcfe345373d6b10bd4acac257d76c6b937641341ef` | preserve    |
| `D:/1a Cursor Project/My 1x Project/.quiz-studio/question_bank`              | 2     | 13284     | `20502a2e60df85476787dc4be3b77ee953150efbffeb5f807ce0b8cb1ade4741` | preserve    |
| `D:/1a Cursor Project/My 1x Project/assets`                                  | 76    | 226730243 | `005733333c221cb7cc0d4ca8c542aea1ce9051dfde24fe419bd9d2476e615b00` | preserve    |

Protected channel files: channel.json, channel_dna.md, style_guide.md and topic_database.json under `D:/1a Cursor Project/My 1x Youtube Channel File/channels/novy/`. No Episode directories or topic-run JSON were found in the active channels tree. Project channels contains only its tracked placeholder.

Protect the external root's master character/logo images, banner sources, voice source directory and other unrelated files as user assets. They are not Episode products and are outside this purge. No deletion rows target these roots or files.

## Bank Availability Finding

Active bank contains 1,261 approved question records; 319 have the allowed Short-Reel archetypes. All 1,261 currently omit language metadata and have no embedded translation entries. Therefore an implementation that requires explicit English metadata will select zero without a provenance decision. This does not establish that their text is not English. Phase 03 must resolve missing-language provenance with the user/approved policy; do not rewrite the bank, translate automatically or manufacture questions during this inventory.

## Managed Product Deletion Set

Empty: 0 managed Episode or Short-Reel product records approved for removal. Do not turn this into a channels-root deletion. There are no associated live product artifact paths to remove through deleteEpisode at this snapshot.

## Residual Runtime Inventory

Each row below is an exact existing directory, retained, not approved for deletion. All 27 HyperFrames index files declare 1920x1080; these are orphan landscape caches, not proof of legacy portrait output. Cache directories contain BGM/fonts/SFX and sometimes mascot copies. Copy identity/sole-source checks have not been proven, so retain them. Voice diagnostics are orphan candidate records, not reusable voice masters; retain until a dedicated reviewed cleanup decides scope. Migration backups preserve recovery history and remain protected.

| Exact Directory                                                                                  | Kind / ID                           | Files | Bytes     | Mascot Copies | Decision             |
| ------------------------------------------------------------------------------------------------ | ----------------------------------- | ----- | --------- | ------------- | -------------------- |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_16b23e29e99640c9`   | hyperframes / ep_16b23e29e99640c9   | 91    | 295341540 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_19342cc8184d4366`   | hyperframes / ep_19342cc8184d4366   | 83    | 276486452 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_35adcb0342ed4c80`   | hyperframes / ep_35adcb0342ed4c80   | 91    | 298362970 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_40cdd52108324253`   | hyperframes / ep_40cdd52108324253   | 92    | 333753627 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_55c9e87266654d1f`   | hyperframes / ep_55c9e87266654d1f   | 113   | 298345492 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_57fd2ae2b9cc4f9a`   | hyperframes / ep_57fd2ae2b9cc4f9a   | 88    | 277873187 | 8             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_63bdddb017ac45b8`   | hyperframes / ep_63bdddb017ac45b8   | 80    | 274165457 | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_64c0a5f0b00a4197`   | hyperframes / ep_64c0a5f0b00a4197   | 83    | 283317291 | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_6b8ed6a13fa44877`   | hyperframes / ep_6b8ed6a13fa44877   | 80    | 268466152 | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_6c3434c8649f4b32`   | hyperframes / ep_6c3434c8649f4b32   | 83    | 276359038 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_7997ad35643f41cb`   | hyperframes / ep_7997ad35643f41cb   | 98    | 359458947 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_7cffa089af644035`   | hyperframes / ep_7cffa089af644035   | 112   | 448078553 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_935591dee072418f`   | hyperframes / ep_935591dee072418f   | 102   | 331235438 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_983f5065da9f4bec`   | hyperframes / ep_983f5065da9f4bec   | 86    | 287991863 | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_a3f97ed94a2b43a2`   | hyperframes / ep_a3f97ed94a2b43a2   | 91    | 295139011 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_ab00e677058f4702`   | hyperframes / ep_ab00e677058f4702   | 92    | 448968254 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_ab7405e078694ecf`   | hyperframes / ep_ab7405e078694ecf   | 86    | 293857302 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_b02118e35da34c94`   | hyperframes / ep_b02118e35da34c94   | 80    | 272131519 | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_b4cba308070f48aa`   | hyperframes / ep_b4cba308070f48aa   | 150   | 719135249 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_c5d191498dfe4629`   | hyperframes / ep_c5d191498dfe4629   | 86    | 287642130 | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_d7ae1b104957488d`   | hyperframes / ep_d7ae1b104957488d   | 89    | 286330140 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_dd44952487a043c5`   | hyperframes / ep_dd44952487a043c5   | 136   | 670302142 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_dde7629fa41e4bcd`   | hyperframes / ep_dde7629fa41e4bcd   | 101   | 388880669 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_dfc40f6864c342a4`   | hyperframes / ep_dfc40f6864c342a4   | 88    | 311887547 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_ea1f77b577464907`   | hyperframes / ep_ea1f77b577464907   | 91    | 304899878 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_f6ae120a49744656`   | hyperframes / ep_f6ae120a49744656   | 91    | 304285583 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/hyperframes/ep_fbcdfd88625e4bf9`   | hyperframes / ep_fbcdfd88625e4bf9   | 91    | 301707926 | 3             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_0905bce8761f45a0`    | quiz-voice / ep_0905bce8761f45a0    | 1     | 82863     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_159d0bd260954eaf`    | quiz-voice / ep_159d0bd260954eaf    | 1     | 18362     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_16b23e29e99640c9`    | quiz-voice / ep_16b23e29e99640c9    | 1     | 21112     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_19342cc8184d4366`    | quiz-voice / ep_19342cc8184d4366    | 1     | 18117     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_23fcd866ef5a4db6`    | quiz-voice / ep_23fcd866ef5a4db6    | 1     | 18448     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_35adcb0342ed4c80`    | quiz-voice / ep_35adcb0342ed4c80    | 1     | 21991     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_40cdd52108324253`    | quiz-voice / ep_40cdd52108324253    | 1     | 25679     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_445f2fa6d01640dc`    | quiz-voice / ep_445f2fa6d01640dc    | 1     | 20370     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_55c9e87266654d1f`    | quiz-voice / ep_55c9e87266654d1f    | 1     | 24890     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_57fd2ae2b9cc4f9a`    | quiz-voice / ep_57fd2ae2b9cc4f9a    | 1     | 16867     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_63bdddb017ac45b8`    | quiz-voice / ep_63bdddb017ac45b8    | 1     | 21464     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_64c0a5f0b00a4197`    | quiz-voice / ep_64c0a5f0b00a4197    | 1     | 20702     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_6b42ebc4f7cf48e3`    | quiz-voice / ep_6b42ebc4f7cf48e3    | 1     | 25137     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_6b8ed6a13fa44877`    | quiz-voice / ep_6b8ed6a13fa44877    | 1     | 19122     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_6c3434c8649f4b32`    | quiz-voice / ep_6c3434c8649f4b32    | 1     | 21035     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_7997ad35643f41cb`    | quiz-voice / ep_7997ad35643f41cb    | 1     | 50640     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_7b1e990d8d9d41b1`    | quiz-voice / ep_7b1e990d8d9d41b1    | 1     | 21113     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_7cffa089af644035`    | quiz-voice / ep_7cffa089af644035    | 1     | 61859     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_935591dee072418f`    | quiz-voice / ep_935591dee072418f    | 1     | 27571     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_983f5065da9f4bec`    | quiz-voice / ep_983f5065da9f4bec    | 1     | 21840     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_a3f97ed94a2b43a2`    | quiz-voice / ep_a3f97ed94a2b43a2    | 1     | 22258     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_ab00e677058f4702`    | quiz-voice / ep_ab00e677058f4702    | 1     | 27088     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_ab7405e078694ecf`    | quiz-voice / ep_ab7405e078694ecf    | 1     | 19505     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_b02118e35da34c94`    | quiz-voice / ep_b02118e35da34c94    | 1     | 20496     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_b4cba308070f48aa`    | quiz-voice / ep_b4cba308070f48aa    | 1     | 59815     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_c5d191498dfe4629`    | quiz-voice / ep_c5d191498dfe4629    | 1     | 18474     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_cd8d15d2b63b43af`    | quiz-voice / ep_cd8d15d2b63b43af    | 1     | 109888    | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_d7ae1b104957488d`    | quiz-voice / ep_d7ae1b104957488d    | 1     | 17370     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_dd44952487a043c5`    | quiz-voice / ep_dd44952487a043c5    | 1     | 126099    | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_dde7629fa41e4bcd`    | quiz-voice / ep_dde7629fa41e4bcd    | 1     | 48623     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_dfc40f6864c342a4`    | quiz-voice / ep_dfc40f6864c342a4    | 1     | 23243     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_ea1f77b577464907`    | quiz-voice / ep_ea1f77b577464907    | 1     | 25534     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_f6ae120a49744656`    | quiz-voice / ep_f6ae120a49744656    | 1     | 23918     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_f7cadc5111b9480c`    | quiz-voice / ep_f7cadc5111b9480c    | 1     | 19991     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_faef709a94334615`    | quiz-voice / ep_faef709a94334615    | 1     | 19512     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/quiz-voice/ep_fbcdfd88625e4bf9`    | quiz-voice / ep_fbcdfd88625e4bf9    | 1     | 25660     | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/migration-backups/20260901-183111` | migration-backups / 20260901-183111 | 6     | 6707      | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/migration-backups/20260901-184800` | migration-backups / 20260901-184800 | 5     | 5464      | 0             | retain; not approved |
| `D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/migration-backups/20260901-185735` | migration-backups / 20260901-185735 | 86    | 64643     | 0             | retain; not approved |

There are 27 render cache directories (2,554 files, 9,194,403,357 bytes), 36 voice-diagnostic directories (36 files, 1,166,656 bytes), three migration-backup directories and zero shot-draft files. No cache was rendered, opened through HyperFrames or modified; only filenames, sizes and index dimension attributes were read.

## Future Safety Gate

Phase 07 must re-enumerate active records/tasks, resolve physical paths, reject junction escapes and shared assets, establish actual duplicate/sole-source identity, and produce exact reviewed per-record targets. An orphan ID alone is insufficient proof of disposability. No current row authorizes deleting the HyperFrames root, voice root, migration backups or a broad storage directory.

For any later approved item, record reviewer, exact physical target, related surviving asset references, dry-run set, execution timestamp/result and recovery location or irreversible status. Use native literal-path operations in one shell, not a composed deletion string. No operations were performed here, so recovery status is not applicable; all inventoried data remains in place.
