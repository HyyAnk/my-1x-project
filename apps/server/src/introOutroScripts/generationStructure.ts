import type { IntroOutroClipKind } from "@studio/shared";

export function scriptBeatStructure(clipKind: IntroOutroClipKind, duration: number) {
  const roles = clipKind === "intro" ? ["entrance", "brand_interaction", "handoff"] : ["recognition", "invitation", "farewell"];
  const boundaries = [0, Number((duration * 0.3125).toFixed(2)), Number((duration * 0.6875).toFixed(2)), duration];
  return roles.map((role, index) => ({
    beat: index + 1,
    role,
    start_seconds: boundaries[index],
    end_seconds: boundaries[index + 1],
  }));
}
