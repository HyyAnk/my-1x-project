import { ScriptChoreographySchema } from "@studio/shared";
import { z } from "zod";
import { finalActionText, FINAL_HOLD_SECONDS } from "./choreographyPolicy.js";

const beatSchema = z
  .object({
    action: z.string().trim().min(1).max(200),
    choreography: ScriptChoreographySchema,
  })
  .passthrough();

export function assembleChoreography(raw: unknown, duration: number): Record<string, unknown>[] {
  return z
    .array(beatSchema)
    .length(3)
    .parse(raw)
    .map((beat, index) => ({
      ...beat,
      // The closing action is code-owned; the provider selects one supported gesture, not a chain.
      ...(index === 2 ? { action: finalActionText(beat.choreography, duration - FINAL_HOLD_SECONDS) } : {}),
    }));
}
