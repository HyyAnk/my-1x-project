import type { ShortReelRecord } from "@studio/shared";
import { compileFlowPrompts } from "./flowPromptCompiler.js";

/**
 * Deterministically refreshes compiled video prompts on the record's accepted script payload.
 *
 * Inputs:
 * - Current accepted script
 * - Selected reference labels from visual_context or accepted references
 * - Model note from the record
 *
 * Changes only the compiled prompt cache; does not mutate script content, validity, or readiness.
 */
export function refreshCompiledReelPrompts(record: ShortReelRecord): void {
  const scriptPayload = record.units.script.last_accepted_payload;
  const script = scriptPayload?.script ?? record.script;

  if (!script || !scriptPayload) {
    if (scriptPayload) {
      scriptPayload.compiled_prompts = null;
    }
    return;
  }

  const mascotName = record.visual_context?.mascot_name;
  const styleName = record.visual_context?.art_direction;

  const compiled = compileFlowPrompts(script, { mascotName, styleName }, record.model_note);

  scriptPayload.compiled_prompts = compiled;
}
