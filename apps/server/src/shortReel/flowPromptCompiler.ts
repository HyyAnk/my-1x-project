import type { ReelSegment, TextCue } from "@studio/shared";
import { ReelScriptSchema, calculateCumulativeTimings, calculateScriptTotalDuration } from "@studio/shared";

export interface FlowPromptReferenceLabels {
  mascotName?: string;
  styleName?: string;
}

function formatTextCues(cues: TextCue[]): string {
  if (cues.length === 0) {
    return "No in-video graphic text for this segment.";
  }

  return cues
    .map((c) => {
      const timingLabel = `${c.start_seconds}s to ${c.end_seconds}s`;
      return `- [${c.role.toUpperCase()}] "${c.text}" (timing: ${timingLabel}, in-frame graphic display only, DO NOT speak aloud)`;
    })
    .join("\n");
}

function formatProps(props: string[]): string {
  return props.length > 0 ? props.join(", ") : "None";
}

function formatVisibleText(visibleText: string[]): string {
  return visibleText.length > 0 ? visibleText.map((t) => `"${t}"`).join(", ") : "None";
}

function compileSegmentPrompt(
  segment: ReelSegment,
  cumulativeTiming: { start: number; end: number },
  totalDuration: number,
  prevSegment?: ReelSegment,
  references?: FlowPromptReferenceLabels,
  modelNote?: string,
): string {
  void totalDuration;
  const isInitial = segment.index === 1;

  // Determine boundary text transitions across segments
  let boundaryTextInstruction = "";
  if (isInitial) {
    boundaryTextInstruction = "Initial scene; introduce in-frame text naturally according to segment cue timing.";
  } else if (prevSegment) {
    const currentStartVisible = segment.start_state.visible_text;
    const currentEndVisible = segment.end_state.visible_text;

    const parts: string[] = [];
    if (currentStartVisible.length > 0) {
      parts.push(`Retain visible text across boundary: ${currentStartVisible.map((t) => `"${t}"`).join(", ")}.`);
    } else {
      parts.push("No prior visible text carried across boundary.");
    }

    // Check in-segment text transitions (clearing or new reveals)
    const cleared = currentStartVisible.filter((t) => !currentEndVisible.includes(t));
    const introduced = currentEndVisible.filter((t) => !currentStartVisible.includes(t));
    if (cleared.length > 0) {
      parts.push(`Clear text from frame before segment conclusion: ${cleared.map((t) => `"${t}"`).join(", ")}.`);
    }
    if (introduced.length > 0) {
      parts.push(`Reveal text in frame before segment conclusion: ${introduced.map((t) => `"${t}"`).join(", ")}.`);
    }

    boundaryTextInstruction = parts.join(" ");
  }

  const openingDescriptor = [
    `9:16 vertical portrait video scene${isInitial ? "" : ` (continuation from ${cumulativeTiming.start}s)`}. Duration: ${segment.duration_seconds}s.`,
    references?.styleName ? `Visual Style: ${references.styleName}.` : "",
    references?.mascotName ? `Character: ${references.mascotName}.` : "",
    modelNote?.trim() ? `Visual / Model Note: ${modelNote.trim()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const spokenDialogue = segment.dialogue?.trim()
    ? `"${segment.dialogue.trim()}"`
    : "No spoken dialogue; sound effects and musical ambience only.";

  const textCuesSection = formatTextCues(segment.text_cues);

  const lines: string[] = [
    openingDescriptor,
    "",
    "--- ACTION & NARRATIVE ---",
    segment.narrative,
    "",
    "--- SPOKEN DIALOGUE (VOICEOVER / LIP-SYNC) ---",
    spokenDialogue,
    "",
    "--- ON-SCREEN VISUAL TEXT (DISPLAY ONLY - DO NOT READ ALOUD) ---",
    textCuesSection,
    boundaryTextInstruction ? `Boundary Text Transition: ${boundaryTextInstruction}` : "",
    "",
    "--- CAMERA & ENVIRONMENT ---",
    `Camera: ${segment.start_state.camera} transitioning to ${segment.end_state.camera}`,
    `Environment: ${segment.start_state.environment}`,
    `Character: ${segment.start_state.character_identity} (position: ${segment.start_state.position}, action: ${segment.start_state.action})`,
    `Key Props: ${formatProps(segment.start_state.props)}`,
    "",
    "--- AUDIO DIRECTION ---",
    segment.audio_direction,
  ];

  return lines.filter(Boolean).join("\n").trim();
}

/**
 * Pure, deterministic compiler translating a validated 3-segment ReelScript
 * into three consecutive Flow prompt strings for manual execution.
 * Prompt 1 is initial generation; Prompts 2 and 3 are seamless extensions.
 */
export function compileFlowPrompts(input: unknown, references?: FlowPromptReferenceLabels, modelNote?: string): [string, string, string] {
  const parsed = ReelScriptSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid script: exactly 3 segments are required to compile Flow prompts");
  }
  const script = parsed.data;

  const totalDuration = calculateScriptTotalDuration(script);
  const timings = calculateCumulativeTimings(script);

  const prompt1 = compileSegmentPrompt(script.segments[0], timings[0], totalDuration, undefined, references, modelNote);
  const prompt2 = compileSegmentPrompt(script.segments[1], timings[1], totalDuration, script.segments[0], references, modelNote);
  const prompt3 = compileSegmentPrompt(script.segments[2], timings[2], totalDuration, script.segments[1], references, modelNote);

  return [prompt1, prompt2, prompt3];
}
