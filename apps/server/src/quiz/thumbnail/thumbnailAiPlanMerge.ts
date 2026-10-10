import type { ThumbnailLayoutType } from "@studio/shared";
import { ThumbnailLayoutTypeSchema } from "@studio/shared";
import { selectRandomVariation, type MascotArchetypeDefinition } from "./thumbnailArchetypes.js";
import type { AiThumbnailPlanOutput, PlanThumbnailWithAiInput } from "./thumbnailAiPlanTypes.js";
import { sanitizeThumbnailHook } from "./thumbnailHookGuardrail.js";
import { deriveTopicHeadlineFallback, isGenericQuizTitle } from "./thumbnailTopicHookExtractor.js";
import type { MascotPersonaVariation, MascotThemedPersona, QuizSubjectAnchor, QuizThumbnailPlan } from "./thumbnailTypes.js";

export const GENERIC_CLICHE_PATTERN =
  /^(general\s+knowledge|true\s+or\s+false|true\/false|yes\s+or\s+no|yes\/no|vrai\s+ou\s+faux|verdadero\s+o\s+falso|richtig\s+oder\s+falsch|which\s+would\s+you\s+choose|who\s+is\s+this|find\s+the\s+odd\s+one|can\s+you\s+solve\s+level\s+\d+|can\s+you\s+beat\s+level\s+\d+|quiz\s+challenge|knowledge\s+quiz|trivia\s+quiz|trivia\s+challenge)[?!.]*$/i;

const GENERIC_ENVIRONMENT_PATTERN = /\b(plain|white background|simple cyclorama|flat gradient|neutral background|solid color)\b/i;
const GENERIC_LIGHTING_PATTERN = /\b(standard lighting|plain lighting|default lighting|normal lighting)\b/i;
const VERDICT_PROP_PATTERN = /\b(paddle|true|false|yes|no|checkmark|cross|✅|❌)\b/i;

/** Swaps a cliche fallback headline for a topic-derived one when the plan is not editorial. */
export function withTopicHeadlineFallback(input: PlanThumbnailWithAiInput, fallbackPlan: QuizThumbnailPlan): QuizThumbnailPlan {
  if (!input.editorial && GENERIC_CLICHE_PATTERN.test(fallbackPlan.hookText) && input.topicTitle && !isGenericQuizTitle(input.topicTitle)) {
    return {
      ...fallbackPlan,
      hookText: deriveTopicHeadlineFallback(input.topicTitle, fallbackPlan.hookText),
    };
  }
  return fallbackPlan;
}

function resolveHookText(input: PlanThumbnailWithAiInput, parsed: AiThumbnailPlanOutput, fallbackHook: string): string {
  if (input.customHookText && input.customHookText.trim().length > 0) {
    return sanitizeThumbnailHook(input.customHookText, fallbackHook);
  }
  if (parsed.hook_text && parsed.hook_text.trim().length > 0) {
    const isGenericCliche = !input.editorial && GENERIC_CLICHE_PATTERN.test(parsed.hook_text.trim());
    return isGenericCliche
      ? deriveTopicHeadlineFallback(input.topicTitle, fallbackHook)
      : sanitizeThumbnailHook(parsed.hook_text, fallbackHook);
  }
  return deriveTopicHeadlineFallback(input.topicTitle, fallbackHook);
}

function resolveBadgeText(input: PlanThumbnailWithAiInput, parsed: AiThumbnailPlanOutput, fallbackBadge: string): string {
  const isSpecificBadgeOverride = input.badgeOverride && input.badgeOverride !== "auto";
  return isSpecificBadgeOverride ? fallbackBadge : parsed.badge_text || fallbackBadge;
}

function resolveDescriptor(value: string | undefined, genericPattern: RegExp, fallback: string | undefined): string | undefined {
  return !value || genericPattern.test(value) ? fallback : value;
}

function buildPersonaVariations(
  parsed: AiThumbnailPlanOutput,
  directedArchetypes: MascotArchetypeDefinition[],
  fallbackPersona: MascotThemedPersona,
): MascotPersonaVariation[] {
  const rawVariations = parsed.mascot_persona_variations || [];
  return rawVariations
    .filter((v) => v && (v.poseDescription || v.role || v.expression))
    .map((v, idx) => ({
      id: v.id || idx + 1,
      archetypeId: v.archetypeId || directedArchetypes[idx]?.id || idx + 1,
      archetypeName: v.archetypeName || directedArchetypes[idx]?.name || `Archetype ${idx + 1}`,
      role: v.role || fallbackPersona.role,
      costume: v.costume || fallbackPersona.costume,
      prop: v.prop || fallbackPersona.prop,
      expression: v.expression || fallbackPersona.expression,
      poseDescription: v.poseDescription || fallbackPersona.poseDescription,
    }));
}

function personaFromPartial(partial: Partial<MascotThemedPersona>, fallbackPersona: MascotThemedPersona): MascotThemedPersona {
  return {
    role: partial.role || fallbackPersona.role,
    costume: partial.costume || fallbackPersona.costume,
    prop: partial.prop || fallbackPersona.prop,
    expression: partial.expression || fallbackPersona.expression,
    poseDescription: partial.poseDescription || fallbackPersona.poseDescription,
  };
}

function pickMascotPersona(
  parsed: AiThumbnailPlanOutput,
  variations: MascotPersonaVariation[],
  fallbackPersona: MascotThemedPersona,
): { mascotPersona: MascotThemedPersona; selectedVariationId?: number } {
  if (variations.length > 0) {
    const picked = selectRandomVariation(variations);
    if (!picked) return { mascotPersona: fallbackPersona };
    const { role, costume, prop, expression, poseDescription } = picked.selected;
    return {
      mascotPersona: { role, costume, prop, expression, poseDescription },
      selectedVariationId: picked.selected.id,
    };
  }
  if (parsed.mascot_persona) {
    return { mascotPersona: personaFromPartial(parsed.mascot_persona, fallbackPersona) };
  }
  return { mascotPersona: fallbackPersona };
}

function withoutVerdictProp(persona: MascotThemedPersona, layout: ThumbnailLayoutType): MascotThemedPersona {
  if (layout === "yes_no" && persona.prop && VERDICT_PROP_PATTERN.test(persona.prop)) {
    return { ...persona, prop: "hand resting thoughtfully under chin in skeptical contemplation" };
  }
  return persona;
}

function resolveSubjectAnchors(
  input: PlanThumbnailWithAiInput,
  parsed: AiThumbnailPlanOutput,
  fallbackAnchors: QuizSubjectAnchor[],
): QuizSubjectAnchor[] {
  if (!parsed.subject_anchors || parsed.subject_anchors.length < (input.editorial ? 1 : 2)) return fallbackAnchors;
  return parsed.subject_anchors.map((a, i) => ({
    label: a.label || `Option ${i + 1}`,
    visualPrompt: a.visualPrompt || `3D visual of Option ${i + 1}`,
    badge: a.badge,
  }));
}

/** Merges a parsed AI planner response onto the deterministic fallback plan. */
export function mergeAiPlanOutput(
  input: PlanThumbnailWithAiInput,
  parsed: AiThumbnailPlanOutput,
  fallbackPlan: QuizThumbnailPlan,
  directedArchetypes: MascotArchetypeDefinition[],
): QuizThumbnailPlan {
  const layout = input.layoutOverride || ThumbnailLayoutTypeSchema.safeParse(parsed.layout).data || fallbackPlan.layout;
  const variations = buildPersonaVariations(parsed, directedArchetypes, fallbackPlan.mascotPersona);
  const { mascotPersona, selectedVariationId } = pickMascotPersona(parsed, variations, fallbackPlan.mascotPersona);
  return {
    ...fallbackPlan,
    layout,
    hookText: resolveHookText(input, parsed, fallbackPlan.hookText),
    badgeText: resolveBadgeText(input, parsed, fallbackPlan.badgeText),
    environmentAtmosphere: resolveDescriptor(
      parsed.environment_atmosphere,
      GENERIC_ENVIRONMENT_PATTERN,
      fallbackPlan.environmentAtmosphere,
    ),
    lightingPalette: resolveDescriptor(parsed.lighting_palette, GENERIC_LIGHTING_PATTERN, fallbackPlan.lightingPalette),
    mascotPersona: withoutVerdictProp(mascotPersona, layout),
    mascotVariations: variations.length > 0 ? variations : undefined,
    selectedVariationId,
    subjectAnchors: resolveSubjectAnchors(input, parsed, fallbackPlan.subjectAnchors),
  };
}
