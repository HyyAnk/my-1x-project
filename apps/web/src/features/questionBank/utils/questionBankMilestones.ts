export interface MilestoneTier {
  id: string;
  level: number;
  name: string;
  target: number;
  prevTarget: number;
  icon: string;
  gradient: string;
  accentColor: string;
  badgeClass: string;
  tagline: string;
}

export interface MilestoneTrackNode {
  tier: MilestoneTier;
  status: "achieved" | "active" | "upcoming";
  formattedTarget: string;
}

export interface MilestoneProgressResult {
  currentTotal: number;
  activeTier: MilestoneTier;
  nextTier: MilestoneTier | null;
  targetTotal: number;
  targetPercent: number;
  bracketPercent: number;
  isMaxTier: boolean;
  track: MilestoneTrackNode[];
}

export const QUESTION_BANK_MILESTONES: readonly MilestoneTier[] = [
  {
    id: "seed",
    level: 1,
    name: "Starter Seed",
    target: 2000,
    prevTarget: 0,
    icon: "🌱",
    gradient: "linear-gradient(90deg, #f97316 0%, #fbbf24 100%)",
    accentColor: "#f97316",
    badgeClass: "qb-tier-seed",
    tagline: "Foundational question pool",
  },
  {
    id: "foundation",
    level: 2,
    name: "Foundation",
    target: 5000,
    prevTarget: 2000,
    icon: "🌿",
    gradient: "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)",
    accentColor: "#10b981",
    badgeClass: "qb-tier-foundation",
    tagline: "Solid multi-domain coverage",
  },
  {
    id: "explorer",
    level: 3,
    name: "Explorer",
    target: 10000,
    prevTarget: 5000,
    icon: "⚡",
    gradient: "linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)",
    accentColor: "#3b82f6",
    badgeClass: "qb-tier-explorer",
    tagline: "Expanded topic variety and depth",
  },
  {
    id: "master",
    level: 4,
    name: "Master",
    target: 20000,
    prevTarget: 10000,
    icon: "🏆",
    gradient: "linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%)",
    accentColor: "#8b5cf6",
    badgeClass: "qb-tier-master",
    tagline: "Comprehensive matrix coverage",
  },
  {
    id: "grandmaster",
    level: 5,
    name: "Grandmaster",
    target: 50000,
    prevTarget: 20000,
    icon: "👑",
    gradient: "linear-gradient(90deg, #f43f5e 0%, #f59e0b 100%)",
    accentColor: "#f43f5e",
    badgeClass: "qb-tier-grandmaster",
    tagline: "Rich multi-archetype variety",
  },
  {
    id: "mythic",
    level: 6,
    name: "Mythic Titan",
    target: 100000,
    prevTarget: 50000,
    icon: "🌌",
    gradient: "linear-gradient(90deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)",
    accentColor: "#8b5cf6",
    badgeClass: "qb-tier-mythic",
    tagline: "Infinite-scale knowledge repository",
  },
] as const;

export function formatMilestoneTarget(target: number): string {
  if (target >= 1000) {
    return `${target / 1000}K`;
  }
  return target.toLocaleString();
}

/**
 * Calculates adaptive milestone progression based on current total questions.
 */
export function getMilestoneProgress(currentCount: number): MilestoneProgressResult {
  const currentTotal = Math.max(0, currentCount);
  const tiers = QUESTION_BANK_MILESTONES;

  let activeTierIndex = tiers.findIndex((tier) => currentTotal < tier.target);
  let isMaxTier = false;

  if (activeTierIndex === -1) {
    activeTierIndex = tiers.length - 1;
    isMaxTier = currentTotal >= tiers[tiers.length - 1].target;
  }

  const activeTier = tiers[activeTierIndex];
  const nextTier = !isMaxTier && activeTierIndex + 1 < tiers.length ? tiers[activeTierIndex + 1] : null;

  const targetTotal = activeTier.target;
  const targetPercent = isMaxTier
    ? 100
    : Math.min(100, Math.max(0, Math.round((currentTotal / targetTotal) * 1000) / 10));

  const bracketSpan = activeTier.target - activeTier.prevTarget;
  const bracketProgress = Math.max(0, currentTotal - activeTier.prevTarget);
  const bracketPercent = isMaxTier
    ? 100
    : Math.min(100, Math.max(0, Math.round((bracketProgress / bracketSpan) * 1000) / 10));

  const track: MilestoneTrackNode[] = tiers.map((tier, index) => {
    let status: MilestoneTrackNode["status"];
    if (currentTotal >= tier.target) {
      status = "achieved";
    } else if (index === activeTierIndex) {
      status = "active";
    } else {
      status = "upcoming";
    }

    return {
      tier,
      status,
      formattedTarget: formatMilestoneTarget(tier.target),
    };
  });

  return {
    currentTotal,
    activeTier,
    nextTier,
    targetTotal,
    targetPercent,
    bracketPercent,
    isMaxTier,
    track,
  };
}
