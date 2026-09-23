import type {
  CreativeSeed,
  CreativeSeedDimension,
  IntroOutroClipKind,
  MascotCapabilityId,
  MascotStyleIdentityProfile,
} from "@studio/shared";

type SeedDefinition = [id: string, name: string, intent: string, requirements?: MascotCapabilityId[]];

const definitions: Record<CreativeSeedDimension, SeedDefinition[]> = {
  intro_entrance: [
    ["A01", "Energetic Arrival", "Enter with a clear burst of friendly energy using supported locomotion."],
    ["A02", "Edge Reveal", "Reveal the mascot playfully from a frame edge without hiding signature features."],
    ["A03", "Light Reveal", "Reveal the mascot through a clean light or particle transition."],
    ["A04", "Supported Ride", "Arrive using a small safe ride suited to the mascot's body and style.", ["ride_vehicle"]],
    ["A05", "Container Reveal", "Reveal the mascot from an oversized soft container without compressing rigid features."],
    ["A06", "Camera Greeting", "Acknowledge the camera with a supported greeting gesture."],
    ["A07", "Attention Shift", "Begin calmly, then react with delight to the start of the quiz."],
    [
      "A08",
      "Dynamic Chase Hook",
      "Dash or slide into frame chasing a dynamic glowing cue or energetic element suited to the mascot's style.",
      ["locomotion"],
    ],
  ],
  intro_brand_interaction: [
    ["B01", "Mechanism Reveal", "Activate a simple mechanism that reveals the intact channel logo.", ["grasping"]],
    ["B02", "Light Activation", "Trigger a light pulse that reveals the intact channel logo."],
    ["B03", "Presenter Reveal", "Present the intact channel logo using a supported pose."],
    ["B04", "Surface Gleam", "Create a clean gleam across the intact channel logo."],
    ["B05", "Frame Assembly", "Assemble a decorative frame around the intact logo without reconstructing its letters."],
    ["B06", "Bubble Reveal", "Use a single bubble-like transition to reveal the intact channel logo."],
    ["B07", "Guided Logo Arrival", "Guide the intact channel logo into its hero position without touching signature features."],
    [
      "B08",
      "Particle Pop Reveal",
      "Trigger a colorful burst of stars, sparkles, or energy that pops the intact channel logo dynamically into center frame.",
    ],
    ["B09", "Hero Symmetrical Framing", "Frame the intact channel logo in an iconic hero composition with confident attitude."],
  ],
  intro_performance_tone: [
    ["C01", "Energetic", "Perform with lively timing that remains compatible with the mascot's construction."],
    ["C02", "Playful", "Use a playful, friendly attitude without inventing anatomy or costume."],
    ["C03", "Thoughtful", "Use a curious, thoughtful attitude supported by pose and timing."],
    ["C04", "Warm", "Create a welcoming companion-like performance."],
    ["C05", "Confident", "Create a confident hero moment without adding permanent accessories."],
    ["C06", "Curious", "React with focused curiosity using supported expressions or body language."],
    ["C07", "Gently Comic", "Include one readable, safe comic recovery without excessive physical complexity."],
    [
      "C08",
      "Cartoon Comic Timing",
      "Use punchy animation physics, expressive comedic timing, and snappy reactions matching the mascot's style.",
    ],
  ],
  intro_verbal_hook: [
    ["D01", "Friendly Challenge", "Invite viewers into a friendly knowledge challenge."],
    ["D02", "Adventure Invitation", "Frame the quiz as a shared adventure."],
    ["D03", "Countdown", "Use a concise countdown into the quiz."],
    ["D04", "Welcome", "Give viewers a concise warm welcome."],
    ["D05", "Discovery", "Invite viewers to discover answers together."],
    ["D06", "Readiness", "Invite viewers to get ready and focus."],
    ["D07", "Shared Play", "Frame the quiz as friendly shared play without taunting."],
    ["D08", "Signature Action Call", "Deliver a short, punchy catchphrase or call-to-action directly to viewers (e.g. 'Let's Quiz!')."],
  ],
  outro_recognition: [
    ["E01", "Delighted Response", "React with delight to the viewer's participation without claiming a score."],
    ["E02", "Reward Reveal", "Reveal a symbolic reward without requiring the mascot to hold it."],
    ["E03", "Shared Celebration", "Offer a shared celebratory gesture compatible with the mascot."],
    ["E04", "Festive Accent", "Add one restrained festive accent around the mascot."],
    ["E05", "Effort Recognition", "Recognize effort and curiosity without asserting performance data."],
    ["E06", "Appreciation", "Show sincere appreciation using supported body language."],
    ["E07", "Victory Motion", "Use a short celebration motion within the style's motion limits."],
  ],
  outro_invitation: [
    ["F01", "Subscribe Invitation", "Offer a concise, age-appropriate subscribe invitation."],
    ["F02", "Return Invitation", "Invite viewers to return for another quiz without assuming notifications."],
    ["F03", "Community Warmth", "Close with a warm sense of shared participation."],
    ["F04", "Next Challenge", "Invite viewers to try another challenge."],
    ["F05", "Next Episode Teaser", "Tease a future quiz without inventing a specific unavailable topic."],
    ["F06", "Closing Acknowledgement", "Use a concise branded closing acknowledgement."],
    ["F07", "Invitation Banner", "Reveal one approved invitation banner while keeping other text absent."],
  ],
  outro_farewell: [
    ["G01", "Supported Farewell", "Use a supported farewell gesture or equivalent body-language cue."],
    ["G02", "Permitted Departure", "Exit through flight only when supported; otherwise use supported locomotion.", ["flight"]],
    ["G03", "Partial Hide and Reveal", "Move partly behind the intact logo, then give one final acknowledgement."],
    ["G04", "Respectful Sign-Off", "Use a simple respectful closing pose."],
    ["G05", "Horizon Departure", "Move toward a clean background destination using supported locomotion.", ["locomotion"]],
    ["G06", "Friendly Closing Pose", "End with a friendly silhouette-readable pose."],
    ["G07", "Stage Close", "Use a simple stage-closing element without trapping or obscuring the mascot."],
  ],
};

function clipKindForDimension(dimension: CreativeSeedDimension): IntroOutroClipKind {
  return dimension.startsWith("intro_") ? "intro" : "outro";
}

export const BUILT_IN_INTRO_OUTRO_SEEDS: CreativeSeed[] = Object.entries(definitions).flatMap(([rawDimension, seeds]) => {
  const dimension = rawDimension as CreativeSeedDimension;
  return seeds.map(([id, name, narrative_intent, required_capabilities = []]) => ({
    id,
    revision: 2,
    dimension,
    clip_kind: clipKindForDimension(dimension),
    name,
    narrative_intent,
    required_capabilities,
    style_tags: [],
    allowed_props: [],
    allowed_text: [],
    forbidden_seed_ids: [],
    complexity: "low",
    selection_weight: 1,
    origin: "built_in",
    status: "active",
  }));
});

export function isSeedEligible(seed: CreativeSeed, identity: MascotStyleIdentityProfile): boolean {
  if (seed.status !== "active") return false;
  return seed.required_capabilities.every((capability) => identity.capabilities[capability] === "supported");
}

export function listEligibleSeeds(catalog: readonly CreativeSeed[], identity: MascotStyleIdentityProfile | null): CreativeSeed[] {
  const latest = latestSeedCatalog(catalog);
  if (!identity || identity.status !== "reviewed") return latest.filter((seed) => seed.status === "active");
  return latest.filter((seed) => isSeedEligible(seed, identity));
}

export function latestSeedCatalog(catalog: readonly CreativeSeed[]): CreativeSeed[] {
  const latestById = new Map<string, CreativeSeed>();
  for (const seed of catalog) {
    const current = latestById.get(seed.id);
    if (!current || seed.revision > current.revision) latestById.set(seed.id, seed);
  }
  return [...latestById.values()].sort((left, right) =>
    left.dimension === right.dimension ? left.name.localeCompare(right.name) : left.dimension.localeCompare(right.dimension),
  );
}
