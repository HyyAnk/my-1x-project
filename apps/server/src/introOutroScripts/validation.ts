import {
  MascotCapabilityIdSchema,
  type CreativeSeed,
  type IntroOutroScriptContent,
  type IntroOutroValidationIssue,
  type MascotStyleIdentityProfile,
} from "@studio/shared";
import { validateProductionTiming } from "./temporalValidation.js";
import { validateChoreography } from "./choreographyValidation.js";

const EPSILON = 0.011;

function issue(code: string, severity: "error" | "warning", path: string, message: string): IntroOutroValidationIssue {
  return { code, severity, path, message };
}

export function validateSeedSelection(
  seeds: readonly CreativeSeed[],
  identity: MascotStyleIdentityProfile,
  expectedDimensions: readonly string[],
): IntroOutroValidationIssue[] {
  const issues: IntroOutroValidationIssue[] = [];
  const selectedIds = new Set(seeds.map((seed) => seed.id));
  const selectedDimensions = new Set(seeds.map((seed) => seed.dimension));

  for (const dimension of expectedDimensions) {
    if (!selectedDimensions.has(dimension as CreativeSeed["dimension"])) {
      issues.push(issue("SEED_DIMENSION_MISSING", "error", "seed_selection", `Select one active seed for ${dimension}.`));
    }
  }

  for (const seed of seeds) {
    for (const capability of seed.required_capabilities) {
      if (identity.capabilities[capability] !== "supported") {
        issues.push(
          issue(
            "SEED_CAPABILITY_UNSUPPORTED",
            "error",
            `seed_selection.${seed.id}`,
            `${seed.name} requires the reviewed capability ${capability}.`,
          ),
        );
      }
    }
    const conflict = seed.forbidden_seed_ids.find((id) => selectedIds.has(id));
    if (conflict) {
      issues.push(
        issue("SEED_COMBINATION_INVALID", "error", `seed_selection.${seed.id}`, `${seed.id} cannot be combined with ${conflict}.`),
      );
    }
  }
  return issues;
}

export function validateScriptContent(
  content: IntroOutroScriptContent,
  identity: MascotStyleIdentityProfile,
  seeds: readonly CreativeSeed[],
): IntroOutroValidationIssue[] {
  const issues: IntroOutroValidationIssue[] = [];
  const duration = content.production.target_duration_seconds;
  const featureIds = new Set(identity.features.map((feature) => feature.id));
  const requiredFeatureIds = new Set(
    identity.features.filter((feature) => feature.importance !== "supporting").map((feature) => feature.id),
  );

  if (content.identity.profile_id !== identity.profile_id || content.identity.mascot_style_id !== identity.mascot_style_id) {
    issues.push(issue("IDENTITY_CONTEXT_MISMATCH", "error", "identity", "The script identity does not match the reviewed mascot style."));
  }

  const beats = [...content.timeline].sort((left, right) => left.start_seconds - right.start_seconds);
  beats.forEach((beat, index) => {
    if (beat.end_seconds <= beat.start_seconds) {
      issues.push(issue("TIMELINE_RANGE_INVALID", "error", `timeline.${index}`, "Beat end time must be after its start time."));
    }
    const expectedStart = index === 0 ? 0 : beats[index - 1].end_seconds;
    if (Math.abs(beat.start_seconds - expectedStart) > EPSILON) {
      issues.push(issue("TIMELINE_GAP", "error", `timeline.${index}.start_seconds`, "Narrative beats must be ordered and contiguous."));
    }
    for (const featureId of beat.visible_feature_ids) {
      if (!featureIds.has(featureId)) {
        issues.push(issue("FEATURE_REFERENCE_UNKNOWN", "error", `timeline.${index}.visible_feature_ids`, `Unknown feature: ${featureId}.`));
      }
    }
    for (const capabilityId of beat.capability_ids) {
      if (capabilityId === "speech" && content.dialogue_policy === "mascot-direct-speech-v1") continue;
      const parsed = MascotCapabilityIdSchema.safeParse(capabilityId);
      if (!parsed.success || identity.capabilities[parsed.data] !== "supported") {
        issues.push(
          issue(
            "CAPABILITY_REFERENCE_UNSUPPORTED",
            "error",
            `timeline.${index}.capability_ids`,
            `Unsupported capability: ${capabilityId}.`,
          ),
        );
      }
    }
    if (beat.props.length > 1) {
      issues.push(issue("PROP_COMPLEXITY", "warning", `timeline.${index}.props`, "More than one prop may reduce short-clip clarity."));
    }
  });

  if (Math.abs(beats[beats.length - 1].end_seconds - duration) > EPSILON) {
    issues.push(issue("TIMELINE_DURATION_MISMATCH", "error", "timeline", "The final beat must end at the target duration."));
  }

  for (const requiredId of requiredFeatureIds) {
    if (!content.consistency.preserve_feature_ids.includes(requiredId)) {
      issues.push(
        issue("REQUIRED_FEATURE_MISSING", "error", "consistency.preserve_feature_ids", `Preserve required feature ${requiredId}.`),
      );
    }
  }

  for (const line of content.voiceover.lines) {
    if (line.end_seconds > duration + EPSILON || line.end_seconds <= line.start_seconds) {
      issues.push(issue("VOICE_TIMING_INVALID", "error", "voiceover.lines", "Voiceover timing must fit inside the clip."));
    }
    const words = line.text.trim().split(/\s+/).filter(Boolean).length;
    const seconds = line.end_seconds - line.start_seconds;
    if (seconds > 0 && words / seconds > 3.2) {
      issues.push(issue("VOICE_PACING_FAST", "warning", "voiceover.lines", "The spoken line may be too fast for a young audience."));
    }
  }

  const allowedText = new Set(seeds.flatMap((seed) => seed.allowed_text));
  for (const visibleText of content.consistency.allowed_visible_text) {
    if (!allowedText.has(visibleText)) {
      issues.push(issue("VISIBLE_TEXT_REVIEW", "warning", "consistency.allowed_visible_text", `Review visible text: ${visibleText}.`));
    }
  }
  return [...issues, ...validateProductionTiming(content, identity), ...validateChoreography(content, identity)];
}

export function hasBlockingIssues(issues: readonly IntroOutroValidationIssue[]): boolean {
  return issues.some((item) => item.severity === "error");
}
