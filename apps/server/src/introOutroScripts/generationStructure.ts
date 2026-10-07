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

export function twoPartOutroBeatStructure(duration: number) {
  const midpoint = Number((duration / 2).toFixed(2));
  const p1_b1 = Number((midpoint * 0.35).toFixed(2));
  const p1_b2 = Number((midpoint * 0.75).toFixed(2));
  const p2_b1 = Number((midpoint + (duration - midpoint) * 0.35).toFixed(2));
  const p2_b2 = Number((duration - Math.min(2.5, (duration - midpoint) * 0.35)).toFixed(2));

  return [
    { beat: 1, role: "p1_kinetic_entrance", start_seconds: 0, end_seconds: p1_b1 },
    { beat: 2, role: "p1_acceleration_speech", start_seconds: p1_b1, end_seconds: p1_b2 },
    { beat: 3, role: "p1_transition_stunt", start_seconds: p1_b2, end_seconds: midpoint },
    { beat: 4, role: "p2_momentum_recovery", start_seconds: midpoint, end_seconds: p2_b1 },
    { beat: 5, role: "p2_logo_showcase", start_seconds: p2_b1, end_seconds: p2_b2 },
    { beat: 6, role: "p2_farewell_wave", start_seconds: p2_b2, end_seconds: duration },
  ];
}

export function outroBeatStructure(duration: number) {
  if (duration >= 12) {
    return twoPartOutroBeatStructure(duration);
  }
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
