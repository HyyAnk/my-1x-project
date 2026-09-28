import type { IntroOutroClipKind } from "@studio/shared";

export function introBeatStructure(duration: number) {
  const roles = ["entrance", "brand_interaction", "handoff"] as const;
  const boundaries = [0, Number((duration * 0.3125).toFixed(2)), Number((duration * 0.6875).toFixed(2)), duration];
  return roles.map((role, index) => ({
    beat: index + 1,
    role,
    start_seconds: boundaries[index],
    end_seconds: boundaries[index + 1],
  }));
}

export function outroBeatStructure(duration: number) {
  const roles = ["recognition", "invitation", "farewell"] as const;
  const boundaries = [0, Number((duration * 0.3125).toFixed(2)), Number((duration * 0.6875).toFixed(2)), duration];
  return roles.map((role, index) => ({
    beat: index + 1,
    role,
    start_seconds: boundaries[index],
    end_seconds: boundaries[index + 1],
  }));
}

export function scriptBeatStructure(clipKind: IntroOutroClipKind, duration: number) {
  return clipKind === "intro" ? introBeatStructure(duration) : outroBeatStructure(duration);
}
