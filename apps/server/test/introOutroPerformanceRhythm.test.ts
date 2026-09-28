import { describe, expect, it } from "vitest";
import { IntroOutroScriptContentSchema, type IntroOutroScriptRevision } from "@studio/shared";
import { identity, productionContent } from "./fixtures/introOutroDomainFixture.js";
import { mascotDialogue } from "../src/introOutroScripts/mascotDialogue.js";
import { introOutputShape } from "../src/introOutroScripts/introOutputShape.js";
import { normalizeGeneratedContent } from "../src/introOutroScripts/generatedNormalization.js";
import { validateDialogueOwnership } from "../src/introOutroScripts/dialogueValidation.js";
import { validateChoreography } from "../src/introOutroScripts/choreographyValidation.js";
import { compileProductionPrompt } from "../src/introOutroScripts/productionPrompt.js";
import { finalActionText } from "../src/introOutroScripts/choreographyPolicy.js";
import { validateProductionTiming } from "../src/introOutroScripts/temporalValidation.js";

function performanceContent(duration = 8) {
  const content = productionContent();
  content.production.target_duration_seconds = duration;
  content.production_policy = "dynamic-micro-narrative-v2";
  content.dialogue_policy = "mascot-direct-speech-v1";
  content.production_directions!.voice_source = "mascot";
  content.production_directions!.end_hold_seconds = 1;
  content.voiceover = mascotDialogue("intro", duration);
  const sample = JSON.parse(introOutputShape(duration, content.voiceover)).clips.intro;
  content.audio.events = IntroOutroScriptContentSchema.shape.audio.parse(sample.audio).events;
  content.camera = IntroOutroScriptContentSchema.shape.camera.parse(sample.camera);
  content.timeline.forEach((beat, index) => {
    beat.start_seconds = [0, duration * 0.3125, duration * 0.6875][index];
    beat.end_seconds = [duration * 0.3125, duration * 0.6875, duration][index];
    beat.choreography = {
      primary_action: "hold",
      expression: "eager",
      secondary_motion: "natural_follow_through",
      end_pose: "front_facing",
    };
  });
  content.timeline[2].action = finalActionText(content.timeline[2].choreography!, duration - 1, "intro");
  return content;
}

function revision(content: IntroOutroScriptRevision["content"]): IntroOutroScriptRevision {
  return {
    schema_version: 1,
    revision_id: "r",
    project_id: "p",
    channel_id: "c",
    style_preset_id: "s",
    clip_kind: "intro",
    revision_number: 1,
    origin: "generated",
    content,
    identity_snapshot: identity,
    seed_selection: { randomization_seed: "seed", selected_seed_ids: [], locked_dimensions: [], algorithm_version: "1" },
    seed_snapshot: [],
    references: [{ role: "mascot_subject", asset_id: "a", url: "/a.png", sha256: "a".repeat(64), mime_type: "image/png" }],
    context_fingerprint: "a".repeat(64),
    template_version: "intro-outro-script-v10",
    requested_model: "test",
    effective_model: null,
    validation_issues: [],
    warning_acknowledgements: [],
    created_at: identity.created_at,
  };
}

describe("intro rhythm and single speech ownership", () => {
  it.each([6, 8, 10])("preserves five timed cues and a valid late speech window for %ss", (duration) => {
    const content = performanceContent(duration);
    const normalized = normalizeGeneratedContent(content, identity);
    expect(normalized.audio.events).toEqual(content.audio.events);
    expect(normalized.audio.events).toHaveLength(5);
    const prompt = compileProductionPrompt(revision(normalized));
    expect(prompt).toContain(`BGM [0-${duration}s]`);
    expect(prompt).toContain("immediately at 0s");
    expect(prompt).toContain("briefly hush for the comedy reaction");
    expect(prompt).toContain("spring back for the reveal");
    expect(prompt).toContain("short tail resolve into the hard cut");
    expect(prompt).toContain(`Finish all sound naturally within ${duration}s`);
    expect(prompt).not.toContain("produce separately");
    for (const event of normalized.audio.events) expect(prompt).toContain(`\n[${event.at_seconds}s] ${event.direction}`);
    expect(validateChoreography(normalized, identity)).toEqual([]);
    expect(validateProductionTiming(normalized, identity)).toEqual([]);
    expect(normalized.voiceover.lines[0].start_seconds).toBeGreaterThan(duration / 2);
    for (const seed of ["D09", "D10"]) {
      normalized.voiceover = mascotDialogue("intro", duration, [seed]);
      expect(validateProductionTiming(normalized, identity)).toEqual([]);
    }
  });

  it("exports one literal utterance, palette, rhythm and mode-aware payoff directions", () => {
    const content = performanceContent();
    content.style.palette = ["Cyan", "Warm yellow"];
    for (const mode of ["none", "post_overlay", "supplied_reference"] as const) {
      content.production_directions!.logo_mode = mode;
      const prompt = compileProductionPrompt(revision(content));
      expect(prompt.match(/Quiz time!/g)).toHaveLength(1);
      expect(prompt).toContain("exactly once");
      expect(prompt).toContain("5.5-7s");
      expect(prompt).toContain("Palette: Cyan, Warm yellow");
      expect(prompt).toContain("brief anticipation");
      expect(prompt).not.toContain("before the final hold");
      if (mode !== "supplied_reference") expect(prompt).not.toContain("one rigid-body bounce");
    }
  });

  it("rejects duplicate dialogue in visual, delivery and sound directions", () => {
    const content = performanceContent();
    content.timeline[1].action = 'The mascot shouts "QUIZ TIME!"';
    content.audio.events[0].direction = "An echo repeats Quiz time!";
    content.voiceover.lines[0].delivery = "Say Quiz time! twice";
    expect(validateDialogueOwnership(content).map((issue) => issue.path)).toEqual([
      "timeline.1.action",
      "audio.events.0.direction",
      "voiceover.lines.0.delivery",
    ]);
    delete content.dialogue_policy;
    expect(validateDialogueOwnership(content)).toEqual([]);
  });

  it("reports invalid cue schedules without moving or discarding the payoff", () => {
    const content = performanceContent();
    content.audio.events.push({ at_seconds: 7.8, direction: "Late hit" }, { at_seconds: 8.2, direction: "Outside clip" });
    const normalized = normalizeGeneratedContent(content, identity);
    expect(normalized.audio.events).toEqual(content.audio.events);
    expect(validateChoreography(normalized, identity).filter((issue) => issue.path === "audio.events")).toHaveLength(2);
  });

  it("keeps the intro score out of outros and does not add speech to silent intros", () => {
    const content = performanceContent();
    content.voiceover = { enabled: false, lines: [] };
    content.production_directions!.voice_source = "none";
    delete content.dialogue_policy;
    const silentPrompt = compileProductionPrompt(revision(content));
    expect(silentPrompt).toContain("No speech or lip-sync.");
    expect(silentPrompt).toContain("BGM [0-8s]");
    expect(silentPrompt).not.toContain("Quiz time!");
    content.production.clip_kind = "outro";
    const outroPrompt = compileProductionPrompt({ ...revision(content), clip_kind: "outro" });
    expect(outroPrompt).not.toContain("BGM [0-");
    expect(outroPrompt).not.toContain("one synchronized audiovisual clip");
  });
});
