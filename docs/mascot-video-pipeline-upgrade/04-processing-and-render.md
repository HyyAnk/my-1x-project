# Step 3 Processing and Render Contract

## Processing order
1. Validate video MIME, extension, size, duration, dimensions and safe path.
2. Store the source in an attempt directory and record checksum and metadata.
3. Decode frames through an FFmpeg adapter.
4. Verify sequential frame count and source dimensions.
5. Run strict background removal on every frame.
6. Fail if any required frame cannot be matted.
7. Remove RGB under alpha zero and residual background contamination.
8. Detect holes, edge clipping and alpha flicker.
9. Derive one common canvas, content bounds, pivot and registration.
10. Never independently recenter or resize frames.
11. Apply any crop once to the entire sequence and persist its offset.
12. Compose PNG sequence, atlas, manifest, contact sheet and preview.
13. Run QA and publish only after all gates pass.

## Rendering
The manifest owns frame rectangles and order. The shared resolver maps timeline time to a frame. Existing placement is applied after sequence registration. Step 4, HyperFrames preview and production use the same resolver.

## Final placement
Apply bottom-left placement, scale, offset and flip at preview/render time. Do not mutate source frames.
