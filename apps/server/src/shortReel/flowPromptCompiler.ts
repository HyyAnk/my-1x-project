import type { ReelSegment, TextCue } from "@studio/shared";
import { ReelScriptSchema, calculateCumulativeTimings, calculateScriptTotalDuration } from "@studio/shared";

export interface FlowPromptReferenceLabels {
  mascotName?: string;
  styleName?: string;
}

function formatTextCues(cues: TextCue[]): string {
  if (cues.length === 0) {
    return "No new in-video text cues requested for this segment.";
  }

  return cues
    .map((c) => {
      const timingLabel = `${c.start_seconds}s to ${c.end_seconds}s`;
      return `- [${c.role.toUpperCase()}] "${c.text}" (requested visible timing: ${timingLabel})`;
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
  const isInitial = segment.index === 1;
  const modeLabel = isInitial
    ? "MODE: Initial Generation (9:16 portrait)"
    : `MODE: Video Extension (continue from ${cumulativeTiming.start}s, do NOT restart)`;

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

  const lines: string[] = [
    `=== FLOW PROMPT: SEGMENT ${segment.index} OF 3 ===`,
    modeLabel,
    `Duration Target: ${segment.duration_seconds}s (cumulative time: ${cumulativeTiming.start}s - ${cumulativeTiming.end}s of ${totalDuration}s total)`,
    modelNote ? `Target Flow Model: ${modelNote}` : "",
    references?.mascotName ? `Mascot Character Anchor: ${references.mascotName}` : "",
    references?.styleName ? `Visual Style Anchor: ${references.styleName}` : "",
    "",
    "--- ACTION & NARRATIVE ---",
    segment.narrative,
    "",
    "--- IN-VIDEO VISIBLE TEXT (REQUESTED IN FOOTAGE) ---",
    formatTextCues(segment.text_cues),
    "Note: In-video text must be rendered naturally within the video scene. Do not omit requested text. No post-production overlay is applied.",
    "Rendering & Timing Notice: Visible text timings are narrative guidance targets; avoid promising exact millisecond precision or rigid typography. In-video text must appear organically in footage.",
    "Human Review Required: Check factual meaning, continuity and actual generated text before publication. This is a creative draft, not reviewed footage.",
    boundaryTextInstruction ? `Boundary Text Transition: ${boundaryTextInstruction}` : "",
    "",
    "--- CONTINUITY & CAMERA ---",
    `Camera: ${segment.start_state.camera} transitioning to ${segment.end_state.camera}`,
    `Environment: ${segment.start_state.environment}`,
    `Character: ${segment.start_state.character_identity} (position: ${segment.start_state.position}, action: ${segment.start_state.action})`,
    `Key Props: ${formatProps(segment.start_state.props)}`,
    `Active In-Frame Text: ${formatVisibleText(segment.start_state.visible_text)}`,
    "",
    "--- AUDIO & PACING DIRECTION ---",
    segment.audio_direction,
    "",
    "--- BOUNDARY HANDOFF STATE ---",
    `End Position: ${segment.end_state.position}`,
    `End Character: ${segment.end_state.character_identity}`,
    `End Environment: ${segment.end_state.environment}`,
    `End Props: ${formatProps(segment.end_state.props)}`,
    `Known Facts At Start: ${segment.start_state.revealed_facts.join("; ") || "None"}`,
    `Known Facts At End: ${segment.end_state.revealed_facts.join("; ") || "None"}`,
    `End Action: ${segment.end_state.action}`,
    `End Camera: ${segment.end_state.camera}`,
    `End Visible Text: ${formatVisibleText(segment.end_state.visible_text)}`,
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
