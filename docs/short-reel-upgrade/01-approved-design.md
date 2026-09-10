# Approved Product Design

## Goal

Repair and upgrade the existing Short-Reel workflow by reusing the application's image-generation and Episode thumbnail capabilities, with Short-Reel-specific storage, script context, and portrait composition.

## Required deliverables

1. A genuine LLM-generated script with exactly three segments and existing source-fidelity, duration, text-cue, and continuity validation preserved.
2. Three deterministic Flow prompts: one initial generation and two extensions. They are instructions for external video generation, not generated video files.
3. The selected channel mascot's existing single-frame master image, safely copied as an immutable reel reference. Never charge for recreating it.
4. One generated full-scene style image containing that mascot, based on the accepted script and predominantly Pixar-style cinematic 3D art direction. The reference establishes identity, environment, lighting, material style, and framing.
5. One generated cover/thumbnail, based on the accepted script and style image, reusing relevant Episode thumbnail planning/composition behavior for 9:16.
6. Exactly two publishing fields: `title` and `description`. Hashtags and any optional CTA are already included in the description.

## Intended workflow

```text
Preflight: complete source, usable selected mascot, provider capability
  -> snapshot mascot and art direction
  -> generate or reuse a current validated script
  -> branch A: generate/reuse style -> generate/reuse cover
  -> branch B: generate/reuse publishing
  -> ensure current compiled prompts and required outputs
  -> package ready and export available
```

Compiled prompts appear immediately after script acceptance and are refreshed after reference changes without regenerating the script. A style image must not become a prerequisite for writing the script; that would create a dependency cycle.

## Image requirements

- A style image is reel-specific. The mascot's global `styles[].anchor_image_url` is optional inspiration, not a required input and never overwritten by reel generation.
- Supply actual validated reference bytes to the provider. A name, local path, checksum, or descriptive prompt alone is not image conditioning.
- Style uses the mascot master reference. Cover uses the accepted style image as its required reference; that image already contains the mascot. Multi-reference support is optional, not a dependency for this release.
- Request 9:16 in the provider request. Validate portrait output before normalizing to 1080x1920 PNG. The mascot master retains its original dimensions.
- Reject landscape output; do not hide an incorrect request by cropping a landscape image. Allow only the aspect-ratio tolerance specified in the contract.
- Style has no added title, hashtags, CTA, watermark, or thumbnail badge. Necessary script props may have natural markings, but do not bake transient video text cues into the style scene.
- Cover may use a short scene-appropriate hook. It must not automatically reveal the correct quiz answer. Reuse portrait-safe composition concepts from Episode, not an entire multi-question Episode layout.
- Do not claim that reference conditioning guarantees exact identity; perform visual QA of the generated output.

## Publishing requirements

- Feed all three accepted script segments, the source facts, question/answer, topic, and channel context into the LLM as delimited input data.
- The LLM analyzes the script, not unseen rendered footage. Do not advertise video inspection.
- New generation produces an English title of at most 80 characters and a description of at most 600 characters including hashtags. These are product defaults, not claims about platform limits.
- Request a concise hook title, a description of roughly 1-3 short sentences, and 3-5 relevant hashtags at the end. No trend, reach, or virality guarantees. Hashtag count is a quality instruction, not a reason to delete user edits.
- Do not reveal a quiz answer in publishing copy by default. The answer is supplied as a grounding constraint, not text that must be published.
- Do not silently replace generated copy with a localization artifact after LLM completion. Preserve legacy localized content as user data; newly generated copy follows the English-only project requirement.
- No silent baseline-script or template-publishing success when LLM generation is unavailable. Surface a recoverable error and preserve previous accepted content.

## Interaction design

- Primary action: `Generate Package`. It repairs missing, failed, cancelled, or stale outputs and reuses current outputs.
- Secondary actions: individual regenerate actions, cancel, and `Regenerate All` grouped appropriately. Regenerate All requires a concise confirmation because it can spend credits and replace the current selection.
- Preserve previous accepted images/text while regeneration is pending or failed. Label them as previous output, not the newly completed result.
- Script, style, cover, and publishing progress use named stages. Indeterminate image jobs use status text/spinners, not invented percentages.
- Allow copying/downloading accepted content and switching tabs during generation. Disable only conflicting generation/save actions. Keep local text drafts on failure or remote conflict.
- Reload affected record data after each accepted unit, not only after the entire task terminates. Use existing task events and bounded fallback polling with stale-response guards.
- Keep one server generation task per reel at a time. Internal independent branches may run concurrently; this does not permit conflicting mutations to bypass the record queue.
- Display the existing shared responsive footer once. No new credits, explanatory subtitles, decorative labels, or duplicate CTAs.

## Compatibility and scope

Use a versioned read adapter for existing record data and explicit upgrade-on-write. Preserve old images and publishing content. Do not bulk-rewrite the user's storage. Update internal consumers and request compatibility together; never make old persisted tasks unparsable.

Out of scope: automatic video generation/rendering, platform-specific posting integrations, publishing to external accounts, new provider subscriptions, automatic model selection changes, new mascot creation, broad Episode refactoring, and unrelated curated-asset repairs.

## Chosen architecture

Use a repository-independent image-byte interface implemented by thin adapters around existing provider clients. Keep persona/style/cover prompts in Short-Reel modules; use existing thumbnail pure helpers where their input fits. Store output only through existing safe Short-Reel asset storage. Do not reuse Episode-bound `writeBundleImage` or create fake episodes.

Alternatives rejected: copying the entire Episode pipeline retains unwanted coupling; adding one path workaround leaves reference conditioning, portrait dimensions, and publishing behavior incorrect.
