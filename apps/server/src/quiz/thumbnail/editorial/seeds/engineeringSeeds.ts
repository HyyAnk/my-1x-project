import type { EditorialDomainSeed } from "./seedTypes.js";

/**
 * Domain: Super Transit, City Hubs & Modern Engineering with vibrant dynamic cityscapes.
 */
export const TRANSIT_DOMAIN_SEED: EditorialDomainSeed = {
  id: "super_transit_engineering",
  domainName: "Super Transit & Engineering",
  pattern: /\b(transit|city hub|city hubs|commuter|train|trains|monorail|subway|bullet train|locomotive|railway|metro|station|ferry|ferries|drydock|cargo ship|air traffic|control tower|hangar|transit system)\b/i,
  preferredLayout: "mega_grid",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "Clean minimalist sunset sky with a smooth, warm golden-amber to soft violet twilight gradient, creamy shallow depth of field with gentle blurred bokeh in the distant background; zero intricate city clutter, keeping the train and mascot completely prominent and isolated.",
  subjects: [
    {
      label: "High-Speed Monorail Hub",
      keywords: ["transit", "train", "bullet train", "monorail", "moving wonder", "city hub", "commuter", "railway"],
      hook: "HOW DOES IT MOVE?",
      background: "bright",
      backgroundAtmosphere:
        "Clean minimalist sunset sky with a smooth, warm golden-amber to soft violet twilight gradient, creamy shallow depth of field with gentle blurred bokeh in the distant background; zero intricate city clutter, keeping the train and mascot completely prominent and isolated.",
      spatialComposition:
        "TRANSIT MOTION STAGING: Mascot on the left (~35% width) leaning forward with speed thrill; sleek bullet train on elevated track filling the right half (~65% width); headline block top-left.",
      visualPrompt:
        "hyper-realistic dynamic photograph of a sleek aerodynamic white-and-blue magnetic-levitation bullet train gliding on a single clean elevated concrete track, gleaming metallic body with illuminated front headlights; the background is a smooth, clean sunset sky with creamy soft-focus bokeh, zero intricate skyscraper clutter",
      mascotPose: {
        prop: "none",
        expression: "Hyped, fast-paced thrill, eyes following the high-speed motion",
        poseDescription:
          "Leaning forward dynamically as if feeling the high-speed rush of the transit system, paws raised in thrilling excitement, zero handheld tools",
      },
    },
    {
      label: "Mega Ship Drydock",
      keywords: ["ship", "drydock", "ferry", "container ship", "harbor", "port"],
      hook: "HOW BIG IS THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Industrial engineering drydock with warm floodlights illuminating metallic textures against evening sky; grand and clear.",
      spatialComposition:
        "COLOSSAL ENGINEERING STAGING: Mascot on the lower-left (~35% width) in comic disbelief; colossal bronze ship propeller on the right (~65% width); headline block top-left.",
      visualPrompt:
        "breathtaking low-angle engineering photograph inside an immense industrial drydock, towering colossal bronze ship propeller blades dwarfing human scale, crisp floodlights illuminating rusted iron hull textures against evening sky",
      mascotPose: {
        prop: "none",
        expression: "Astounded smallness in front of colossal engineering",
        poseDescription: "Standing with paws perched on hips, looking up in sheer disbelief at the gigantic ship propeller",
      },
    },
    {
      label: "Airport Control Tower",
      keywords: ["control tower", "airport", "runway", "air traffic", "flight"],
      hook: "WHO CONTROLS THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Dusk airport runway with sweeping gold and cyan light streaks, glass control tower glowing warmly against sunset sky.",
      spatialComposition:
        "RADAR RADIAL STAGING: Mascot on the left (~35% width) saluting upward; modern glass control tower on the right (~65% width); headline block top-left.",
      visualPrompt:
        "dramatic dusk photograph looking up at a glass-domed modern airport air traffic control tower, glowing 360-degree radar displays visible inside while long-exposure aircraft landing light ribbons sweep across the runway",
      mascotPose: {
        prop: "none",
        expression: "Focused air traffic navigator alertness",
        poseDescription: "One paw raised in a sharp military salute toward the sky, eyes tracking an arriving aircraft with enthusiastic focus",
      },
    },
  ],
};

/**
 * Domain: Machines, Supercars & Technology
 */
export const MACHINES_DOMAIN_SEED: EditorialDomainSeed = {
  id: "machines_tech",
  domainName: "Machines & Supercars",
  pattern: /\b(machine|machines|car|cars|supercar|supercars|hypercar|engine|turbo|turbocharger|robot|robots|bionic|hardware|mechanic|horsepower|invention|inventions|gizmo|gizmos|gadget|gadgets|device|devices|tech showdown|laser beam|sonar)\b/i,
  preferredLayout: "true_false",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "High-end automotive engineering studio with directional warm amber spotlighting, reflective gloss surface, and crisp specular highlights.",
  subjects: [
    {
      label: "Turbo Engine",
      keywords: ["turbo", "turbocharger", "engine", "exhaust", "titanium"],
      hook: "TRUE OR FALSE?",
      background: "bright",
      backgroundAtmosphere:
        "High-end automotive engineering studio with directional warm amber spotlighting, reflective gloss surface, and crisp specular highlights.",
      spatialComposition:
        "ENGINE TECH STAGING: Mascot on the left (~35% width) in proud expert stance; mirror-polished twin turbocharger assembly on the right (~65% width); headline block top-left.",
      visualPrompt:
        "hyper-realistic close-up photograph of a mirror-polished titanium twin-turbocharger assembly glowing with hot amber internal exhaust heat, intricate precision-milled compressor blades and woven carbon fiber housing in crisp studio focus",
      mascotPose: {
        prop: "none",
        expression: "Cool confident smirk with professional admiration",
        poseDescription: "Hands on hips in a proud expert stance, nodding appreciatively toward the glowing engine",
      },
    },
    {
      label: "Supercar Duel",
      keywords: ["supercar", "hypercar", "speed", "faster", "duel", "racing"],
      hook: "WHICH IS FASTER?",
      background: "bright",
      backgroundAtmosphere:
        "Razor-sharp automotive showroom keylights with electric cyan and amber rim accents reflecting off polished gloss floor.",
      spatialComposition:
        "AERODYNAMIC DUEL STAGING: Mascot in center-left (~35% width) pointing eagerly; two hypercar front splitters (A & B) facing off on the right (~65% width); headline block top-left.",
      visualPrompt:
        "two sleek hypercar aerodynamic carbon-fiber front splitters (A and B) facing each other under razor-sharp electric cyan and amber studio keylights, glowing ceramic brake discs reflecting off polished gloss showroom floor",
      mascotPose: {
        prop: "none",
        expression: "Competitive hyped smirk, pointing between the two machines",
        poseDescription: "Dynamic low crouch between the two cars, pointing one paw toward A and one toward B with eager excitement",
      },
    },
  ],
};
