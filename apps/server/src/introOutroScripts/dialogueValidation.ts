import type { IntroOutroScriptContent, IntroOutroValidationIssue } from "@studio/shared";
import { isCreativePolicy } from "./creativePolicy.js";

const normalizeWords = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Speech belongs in one timed track, never a second instruction in visual or sound prose. */
export function validateDialogueOwnership(content: IntroOutroScriptContent): IntroOutroValidationIssue[] {
  // In creative scripts prose may quote the same event or intentionally repeat a line.
  // The timed speech track, not string matching, defines how many utterances to perform.
  if (!content.dialogue_policy || isCreativePolicy(content)) return [];
  const fields: Array<[string, string]> = [
    ...content.timeline.map((beat, index): [string, string] => [`timeline.${index}.action`, beat.action]),
    ...content.audio.events.map((event, index): [string, string] => [`audio.events.${index}.direction`, event.direction]),
    ...content.voiceover.lines.map((line, index): [string, string] => [`voiceover.lines.${index}.delivery`, line.delivery]),
    ["audio.music_direction", content.audio.music_direction],
    ["production_directions.opening_state", content.production_directions?.opening_state ?? ""],
    ["production_directions.closing_state", content.production_directions?.closing_state ?? ""],
  ];
  const phrases = content.voiceover.lines.map((line) => normalizeWords(line.text)).filter(Boolean);
  return fields
    .filter(([, value]) => phrases.some((phrase) => ` ${normalizeWords(value)} `.includes(` ${phrase} `)))
    .map(([path]) => ({
      code: "DIALOGUE_DUPLICATED_IN_DIRECTION",
      severity: "error",
      path,
      message: "Keep spoken text only in voiceover; refer to the scheduled speech event without quoting it again.",
    }));
}
