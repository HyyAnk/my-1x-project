import type {
  MotionTemplateDefinition,
  MotionTemplateId,
  MotionTemplatePlacement,
} from "./motionTemplate.types.js";
import { MotionTemplateIdSchema } from "./motionTemplate.schemas.js";

export const BUILT_IN_MOTION_TEMPLATES: readonly MotionTemplateDefinition[] = [
  {
    id: "kinetic_punch",
    name: "Kinetic Punch",
    description: "High-impact typographic hook with dynamic scaling, beat snap, and mascot greeting.",
    placement: "intro",
    category: "kinetic",
    defaultDurationSeconds: 2.6,
    minDurationSeconds: 1.5,
    maxDurationSeconds: 4.5,
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    description: "Retro-futuristic perspective grid with scanline glitch and arcade countdown pulses.",
    placement: "intro",
    category: "cyber",
    defaultDurationSeconds: 3.0,
    minDurationSeconds: 2.0,
    maxDurationSeconds: 5.0,
  },
  {
    id: "minimal_sleek",
    name: "Minimal Sleek",
    description: "Refined card morphing with fluid bezier transitions and elegant brand identity reveal.",
    placement: "both",
    category: "minimal",
    defaultDurationSeconds: 2.5,
    minDurationSeconds: 1.5,
    maxDurationSeconds: 4.0,
  },
  {
    id: "interactive_cta",
    name: "Interactive CTA",
    description: "High-conversion outro featuring kinematic subscribe buttons and mascot farewell bubble.",
    placement: "outro",
    category: "gamified",
    defaultDurationSeconds: 3.5,
    minDurationSeconds: 2.0,
    maxDurationSeconds: 6.0,
  },
  {
    id: "scorecard_recap",
    name: "Scorecard Recap",
    description: "Gamified final leaderboard summary with victory confetti bursts and social lockup.",
    placement: "outro",
    category: "gamified",
    defaultDurationSeconds: 4.0,
    minDurationSeconds: 2.5,
    maxDurationSeconds: 7.0,
  },
];

export function listMotionTemplates(placement?: MotionTemplatePlacement): MotionTemplateDefinition[] {
  if (!placement) {
    return BUILT_IN_MOTION_TEMPLATES.map((tmpl) => ({ ...tmpl }));
  }
  return BUILT_IN_MOTION_TEMPLATES.filter(
    (tmpl) => tmpl.placement === placement || tmpl.placement === "both" || placement === "both",
  ).map((tmpl) => ({ ...tmpl }));
}

export function getMotionTemplateDefinition(id: string): MotionTemplateDefinition | undefined {
  const match = BUILT_IN_MOTION_TEMPLATES.find((tmpl) => tmpl.id === id);
  return match ? { ...match } : undefined;
}

export function isValidMotionTemplateId(id: string): id is MotionTemplateId {
  return MotionTemplateIdSchema.safeParse(id).success;
}
