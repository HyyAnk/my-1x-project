import type { ScriptChoreography, MascotStyleIdentityProfile, IntroOutroClipKind } from "@studio/shared";

export const PRODUCTION_POLICY = "dynamic-micro-narrative-v2";
export const FINAL_HOLD_SECONDS = 1;

const outroFinalActions = {
  hold: "Hold the settled pose",
  nod: "Give one small nod in place",
  wave: "Give one small stationary hand wave",
  point: "Make one stationary pointing gesture",
  smile: "Give one warm smile in place",
  celebrate: "Strike an energetic celebration pose",
} as const;

const introFinalActions = {
  celebrate: "Strike an energetic hero celebration pose",
  point: "Make one dynamic, confident pointing gesture toward the camera",
  smile: "Flash a wide, energetic grin directly at the viewer",
  hold: "Hold an action-ready, energetic hero stance",
  nod: "Give a sharp, confident nod to the audience",
  wave: "Give a quick, high-energy wave to the viewers",
} as const;

export function allowedFinalActions(identity: MascotStyleIdentityProfile): string[] {
  return [
    "hold",
    ...(identity.capabilities.facial_expression === "supported" ? ["smile"] : []),
    ...(identity.capabilities.waving === "supported" ? ["wave"] : []),
    ...(identity.capabilities.pointing === "supported" ? ["point"] : []),
    "celebrate",
  ];
}

export function finalActionText(plan: ScriptChoreography, holdStart: number, clipKind: IntroOutroClipKind = "outro"): string {
  if (clipKind === "intro") {
    const action = introFinalActions[plan.primary_action as keyof typeof introFinalActions] ?? "Strike an energetic hero celebration pose";
    return `${action}; maintain peak dynamic energy through the final frame before a hard cut into the quiz.`;
  }
  const action = outroFinalActions[plan.primary_action as keyof typeof outroFinalActions];
  return `${action ?? "Hold the settled pose"}; settle by ${holdStart}s and remain still through the end.`;
}
