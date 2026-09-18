# Phase 3 Specification: HyperFrames Compliant Video Element & Lifecycle Serialization

## Objective
Upgrade `apps/server/src/quiz/render/mascotHtmlRenderer.ts` to generate `<video>` tags that strictly adhere to HyperFrames linter specifications, including explicit lifecycle identifiers, timeline offsets, duration spans, and playback properties.

## Target Files
- `apps/server/src/quiz/render/mascotHtmlRenderer.ts`
- `apps/server/src/quiz/render/productionMascotRenderer.ts`

## Detailed Requirements
1. **HyperFrames DOM Requirements for Media**:
   - Every `<video>` element with a `src` attribute MUST include:
     - `id`: Unique identifier (e.g. `mascot-video-${spec.asset.action}-${state.phase}-${Math.round(stateDelay * 1000)}`).
     - `data-start`: Floating point start time in seconds (`numberValue(stateDelay)`).
     - `data-duration`: Floating point duration in seconds (`numberValue(duration)`).
     - `playsinline`: Boolean attribute.
     - `muted`: Boolean attribute (prevents audio pipeline conflicts unless audio is intentional).
     - `autoplay`: Boolean attribute.
2. **Deterministic Playback & Seeking Attributes**:
   - Retain existing attributes required by stage preview and parity harnesses:
     - `data-mascot-animation-frame="${resolved.frameIndex}"`
     - `data-mascot-frame-index="${resolved.frameIndex}"`
     - `data-mascot-animation-video="${escAttr(localizedVideoUrl)}"`
     - `data-mascot-video-time="${numberValue(seekTimeSeconds)}"`
     - `data-mascot-video-cycle="${numberValue(cycle)}"`
3. **Loop Policy Adherence**:
   - If `isLoop` is true: append `loop` attribute.
   - If one-shot (`loop_policy === "one_shot_rest"`): omit `loop`.
4. **Preview Mode vs Production Mode**:
   - In preview mode (`preview === true`): `stateDelay = 0`, `data-start="0"`.
   - In production mode: `stateDelay` reflects marker offset.
