# Intro/outro resource shortcuts

## Interaction plan

- Keep Generate/Regenerate primary. Place a compact Resources row above the editable prompts.
- Resolve the mascot anchor through the same preset mapping as script generation. Use the configured channel brand logo.
- Show checkerboard previews, with Copy image and Download PNG on hover or keyboard focus. Keep actions visible on touch/mobile.
- Read existing transparent images only. Validate actual alpha and cached source hashes. Never trigger background removal from this surface.
- Acknowledge actions immediately; disable only that image's actions while pending. Keep scripts usable during resource loading/failure.
- Refresh on entry, explicit retry, and window focus. Ignore stale responses after navigation. Preserve displayed resources during background refresh.
- Show missing transparency without offering a misleading opaque download. Clipboard rejection leaves Download PNG available.

## Boundaries and verification

The resource service resolves and validates existing files; routes serialize metadata or PNG bytes without resizing. The browser API owns fetch/download; the resource hook owns metadata lifecycle; cards render previews and action feedback. Existing generation contracts and persisted drafts are unchanged.

Verify API transparency/cache behavior, desktop/mobile copy and download, keyboard focus, missing assets, network failure/retry, and unchanged generation controls. Rendered video quality is outside this change.

## Verification results

- Server API suite: 23 tests passed, including missing-resource behavior.
- Resource image policy: 4 tests passed for original alpha, opaque originals, cache freshness, and invalid metadata.
- Browser regression: 7 tests passed for resources and existing pair workflows at 1440px and 390px.
- Live resource checks used Novy and Feli with Arcade Pop Master: real PNG clipboard copy, download, and visual inspection. Clipboard denial leaves download available.
- Web/server type checks and builds passed; scoped lint and diff whitespace checks passed.
- Browser tests use deterministic images by default. Set `PAIR_RESOURCE_LIVE_CHANNEL` to an existing channel ID to verify its actual resources against the local server.
