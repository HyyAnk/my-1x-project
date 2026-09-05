import type { ThumbnailLayoutType } from "@studio/shared";
import type { MascotThemedPersona } from "./thumbnailTypes.js";

/**
 * Maps topic keywords to themed mascot costume, props, and actions.
 */
export function resolveMascotThemedPersona(
  topicLower: string,
  layout: ThumbnailLayoutType,
  defaultPersona: { role: string; defaultCostume: string; defaultProp: string; defaultExpression: string },
): MascotThemedPersona {
  if (layout === "difficulty_tier") {
    return {
      role: "Overloaded Genius",
      costume: "Lab coat or high-tech cybernetic thinking suit",
      prop: "Cartoon steam puffing from ears and glowing cosmic brain aura",
      expression: "Comically overwhelmed with dizzy spiral eyes and mouth open in shock",
      poseDescription: "Staggering comically next to the Level 4 impossible challenge with mind-blown reaction",
    };
  }

  if (layout === "split_vs") {
    return {
      role: "Referee / Confused Judge",
      costume: "Black-and-white striped referee jersey with a whistle",
      prop: "Holding a referee flag or scratching head",
      expression: "Hilariously conflicted, looking back and forth between both choices",
      poseDescription: "Positioned right between the two competing sides with a funny indecisive stance",
    };
  }

  if (
    topicLower.includes("space") ||
    topicLower.includes("astronomy") ||
    topicLower.includes("universe") ||
    topicLower.includes("galaxy") ||
    topicLower.includes("cosmos")
  ) {
    return {
      role: "Space Explorer",
      costume: "Cute transparent mini astronaut space helmet and futuristic cosmic scout suit",
      prop: "Glowing miniature crescent moon or glowing cosmic star",
      expression: "Amazed, wide sparkling eyes, curious open smile",
      poseDescription: "Floating weightlessly in cosmic awe, reaching out toward the mystery planets with wonder",
    };
  }

  if (
    topicLower.includes("history") ||
    topicLower.includes("egypt") ||
    topicLower.includes("pyramid") ||
    topicLower.includes("ancient")
  ) {
    return {
      role: "Archaeologist Explorer",
      costume: "Vintage adventurer leather jacket and safari explorer hat",
      prop: "Golden blazing explorer torch and antique golden key",
      expression: "Determined, adventurous, eyes shining with excitement",
      poseDescription: "Illuminating ancient secrets with the torch",
    };
  }

  if (
    topicLower.includes("science") ||
    topicLower.includes("physics") ||
    topicLower.includes("chemistry") ||
    topicLower.includes("brain")
  ) {
    return {
      role: "Genius Scientist",
      costume: "White lab coat with round nerdy spectacles",
      prop: "Bubbling colorful test tube or glowing hologram brain",
      expression: "Intrigued, inquisitive, eyebrow raised cleverly",
      poseDescription: "Holding the scientific discovery up proudly",
    };
  }

  if (
    topicLower.includes("bake") ||
    topicLower.includes("cookie") ||
    topicLower.includes("biscuit") ||
    topicLower.includes("pastry") ||
    topicLower.includes("culinary") ||
    topicLower.includes("dessert")
  ) {
    return {
      role: "Master Pastry Chef",
      costume: "White chef hat and baker apron with flour dusted pockets",
      prop: "Wooden rolling pin or tray of golden warm freshly baked cookies",
      expression: "Delighted, proud, mouth-watering happy smile",
      poseDescription: "Enthusiastically presenting the delicious world bakery challenge",
    };
  }

  if (
    topicLower.includes("supercar") ||
    topicLower.includes("hypercar") ||
    topicLower.includes("racing") ||
    topicLower.includes("racecar")
  ) {
    return {
      role: "Pro Racing Driver",
      costume: "High-speed aerodynamic racing driver jumpsuit and racing helmet",
      prop: "Black-and-white checkered finish flag or golden championship trophy",
      expression: "Adrenaline pumped, confident smirk, eyes shining",
      poseDescription: "Giving a triumphant thumbs up beside the track challenge",
    };
  }

  if (
    topicLower.includes("ocean") ||
    topicLower.includes("sea") ||
    topicLower.includes("marine") ||
    topicLower.includes("fish") ||
    topicLower.includes("shark")
  ) {
    return {
      role: "Deep Sea Diver",
      costume: "Retro scuba diving goggles and bright aquatic life vest",
      prop: "Underwater tactical flashlight and glowing seashell",
      expression: "Delighted, surprised, eyes wide with discovery",
      poseDescription: "Swimming alongside marine creatures, waving enthusiastically",
    };
  }

  // Fallback to layout default persona
  return {
    role: defaultPersona.role,
    costume: defaultPersona.defaultCostume,
    prop: defaultPersona.defaultProp,
    expression: defaultPersona.defaultExpression,
    poseDescription: "Positioned dynamically to guide the viewer's attention to the challenge",
  };
}
