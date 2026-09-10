# Channel DNA

Reviewed against working-tree source on 2026-09-09.

[Channel creation](../apps/server/src/repository/channels.ts) prefers [quiz_channel_dna.md](../templates/quiz_channel_dna.md), with [example_channel_dna.md](../templates/example_channel_dna.md) as a fallback. Uploaded DNA can supply the initial content.

DNA is stored as `channels/<channel-slug>/channel_dna.md` beneath the selected content root, not necessarily the checkout. Channel metadata is schema-validated separately from the Markdown document.

Use [channel routes](../apps/server/src/routes/channels.ts) and repository methods for updates. Keep channel cache, metadata and the editor synchronized. [Context modules](../apps/server/src/context/) consume relevant DNA when building generation input; changing DNA does not automatically regenerate existing product artifacts.

See [Question bank](question-bank.md) for product-boundary language behavior and [Architecture](architecture.md) for storage-root ownership.
