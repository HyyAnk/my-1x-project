import type { ScriptChoreography, MascotStyleIdentityProfile } from "@studio/shared";

export const PRODUCTION_POLICY = "single-action-hero-hold-v1";
export const FINAL_HOLD_SECONDS = 1;
const finalActions = {
  hold: "Hold the settled pose",
  nod: "Give one small nod in place",
  wave: "Give one small stationary hand wave",
  point: "Make one stationary pointing gesture",
  smile: "Give one warm smile in place",
} as const;

export function allowedFinalActions(identity: MascotStyleIdentityProfile): string[] {
  return [
    "hold",
    ...(identity.capabilities.facial_expression === "supported" ? ["smile"] : []),
    ...(identity.capabilities.waving === "supported" ? ["wave"] : []),
    ...(identity.capabilities.pointing === "supported" ? ["point"] : []),
  ];
}

export function finalActionText(plan: ScriptChoreography, holdStart: number): string {
  const action = finalActions[plan.primary_action as keyof typeof finalActions];
  return `${action ?? "Unsupported final action"}; settle by ${holdStart}s and remain still through the end.`;
}
