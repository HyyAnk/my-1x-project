import type { EditorialDomainSeed } from "./seedTypes.js";

/**
 * Domain: Science, Physics & Chemistry Experiments with clean dynamic laboratory atmospheres.
 */
export const SCIENCE_DOMAIN_SEED: EditorialDomainSeed = {
  id: "science_physics",
  domainName: "Science & Physics",
  pattern: /\b(science|physics|chemistry|chemical|reaction|crystal|crystals|magnet|magnets|magnetic|ferrofluid|electric|electricity|lightning|freeze|frozen|liquid nitrogen|lab|laboratory|experiment|plasma)\b/i,
  preferredLayout: "mega_grid",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "High-speed scientific laboratory studio with crisp clean illumination, dynamic specular highlights, and vivid clarity.",
  subjects: [
    {
      label: "Flash Freeze",
      keywords: ["freeze", "frozen", "liquid nitrogen", "rose", "frost", "cold", "temperature"],
      hook: "WHAT HAPPENS NEXT?",
      background: "bright",
      backgroundAtmosphere:
        "High-speed scientific laboratory studio with crisp cold-white directional illumination, delicate swirling vapor wisps catching rim light, vibrant scarlet rose petals against clean backdrop; vivid, energetic, and clean.",
      spatialComposition:
        "CRYO EXPERIMENT STAGING: Mascot on the left (~35% width) hugging shoulders in funny freeze shock; liquid-nitrogen-dipped rose bursting with crystalline frost on the right (~65% width); headline block top-left.",
      visualPrompt:
        "ultra-high-speed macro photograph of crystalline frost spikes violently propagating across the vibrant red petals of a fresh rose dipped in liquid nitrogen, delicate vapor plumes curling into dramatic midnight blue air",
      mascotPose: {
        prop: "none",
        expression: "Humorous dramatic freeze shock",
        poseDescription: "Both paws hugging shoulders in funny dramatic cold shivering reaction, wide astonished eyes",
      },
    },
    {
      label: "Ferrofluid Spikes",
      keywords: ["magnet", "magnetic", "ferrofluid", "spikes", "fluid", "metal"],
      hook: "CAN YOU EXPLAIN THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Clean futuristic laboratory counter with warm brass accents and sharp directional spotlights creating brilliant specular liquid reflections on the ferrofluid spikes.",
      spatialComposition:
        "MAGNETIC EXPERIMENT STAGING: Mascot on the left (~35% width) leaning forward on tiptoes pointing; alien ferrofluid geometric spikes on neodymium magnet on the right (~65% width); headline block top-left.",
      visualPrompt:
        "mesmerizing macro studio photograph of glossy black magnetic ferrofluid forming crisp geometric alien spikes over a polished brass neodymium cylinder magnet, liquid specular highlights gleaming under focused directional rim light",
      mascotPose: {
        prop: "none",
        expression: "Intense scientific fascination, leaning forward",
        poseDescription: "Leaning forward on tiptoes with wide curious eyes, pointing one index paw intently at the spikes",
      },
    },
    {
      label: "Tesla Coil Arc",
      keywords: ["electricity", "plasma", "lightning", "tesla", "arc", "voltage"],
      hook: "YES OR NO?",
      background: "bright",
      backgroundAtmosphere:
        "Atmospheric electrical physics stage illuminated by brilliant violet and electric blue lightning filament webs; punchy, electric, and high-contrast.",
      spatialComposition:
        "TESLA DISCHARGE STAGING: Mascot on the left (~35% width) with paws raised in electric excitement; miniature copper Tesla coil discharging purple arcs on the right (~65% width); headline block top-left.",
      visualPrompt:
        "dramatic macro photograph of a polished copper miniature Tesla coil discharging brilliant spiderwebs of violet-blue electric lightning arcs into surrounding dark air, glowing ionization corona at the discharge tip",
      mascotPose: {
        prop: "none",
        expression: "Electrified ecstatic excitement",
        poseDescription: "Leaning back with raised paws in electric excitement, eyes dancing with reflection of the purple arcs",
      },
    },
  ],
};
