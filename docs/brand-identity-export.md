# Brand identity export

## Interaction plan

- Entry: Brand Assets > channel > Brand Identity > Download Identity.
- Open the browser folder picker directly from the click when available. Closing it cancels without a request or filesystem writes.
- Fetch a fresh, no-store export snapshot. Disable only the export button while pending; preserve the rest of the page.
- Save into a unique channel-prefixed child directory, reporting completed file counts. Never reuse an earlier export directory.
- Without directory-picker support, request a ZIP and hand it to the browser download manager. Report download started, not disk-save completion.
- Show missing/unreadable assets explicitly. Empty exports fail without creating a destination directory. Disk errors report partial completion and preserve completed files.
- Retry always requests current assets and uses a new destination. Abort the request on unmount/channel change; stale responses cannot trigger downloads. Requests time out after two minutes.
- Desktop uses an inline title/action header; mobile wraps the action below the title. Status is live text, and determinate file saving also exposes a native progress bar. No motion is required.

## Boundaries and scope

- Shared schema: validates response filenames and the export envelope.
- Backend collection: current channel logo and every assigned mascot style anchor, including a legacy core style when necessary. Social assets, animation slots, raw source images, and metadata are excluded.
- Filesystem adapter: constrains logo reads to the channel brand directory; validates local mascot URLs; checks actual alpha transparency. A cached transparent image must match the source hash. No image generation or background-removal job is started.
- API: `/api/channels/:channelId/assets/identity-export?format=files|zip`. The existing full brand-kit export is unchanged.
- Browser adapter: validates the response, decodes files, writes through browser-granted directory handles, or downloads the ZIP. No server-side destination paths or native OS automation.
- Limits: 32 MB per source file, 40 million decoded image pixels, 128 MB per collection. JSON/base64 transport reuses the existing API client and avoids a new ZIP dependency in the browser.
- Export is read-only; no query invalidation or polling is needed. Each click reads current repository state.

## Verification

Targeted API tests cover all styles, original logo bytes, opaque/missing images, ZIP parity, empty exports, invalid formats, and missing channels. Frontend tests cover pending feedback, duplicate prevention, picker cancellation, ZIP fallback, retry, stale responses, unique directories, and partial write failure. Existing channel asset API and identity section tests remain part of regression verification.
