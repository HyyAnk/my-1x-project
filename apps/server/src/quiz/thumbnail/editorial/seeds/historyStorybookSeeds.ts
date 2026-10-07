import type { EditorialDomainSeed } from "./seedTypes.js";

/**
 * Domain: History, Mythology & Ancient Wonders with rich luminous atmospheric environments.
 */
export const HISTORY_DOMAIN_SEED: EditorialDomainSeed = {
  id: "history_mythology",
  domainName: "History & Ancient Wonders",
  pattern: /\b(history|historical|ancient egypt|ancient greece|ancient rome|ancient relic|ancient world|pharaoh|pyramid|pyramids|tomb|mythology|mythical|gods|goddess|viking|vikings|norse|thor|odin|loki|valkyrie|asgard|gladiator|relic|artifact)\b/i,
  preferredLayout: "mega_grid",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "Epic atmospheric historical setting with rich directional torchlight or aurora ambient glow, warm golden highlights, and vivid clarity.",
  subjects: [
    {
      label: "Norse Thor Hammer & Runes",
      keywords: ["norse", "viking", "thor", "odin", "loki", "hammer", "mjolnir", "valkyrie", "asgard", "rune", "runic"],
      hook: "WHO WIELDS THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Dramatic twilight Arctic fjord atmosphere with vivid emerald and cyan aurora borealis ribbons dancing overhead, warm glowing sparks and soft rim lighting; majestic, epic, and luminous.",
      spatialComposition:
        "MYTHICAL RELIC STAGING: Mascot on the left (~35% width) gesturing boldly; stone hammer Mjolnir resting on frosted basalt on the right (~65% width) glowing with cyan lightning arcs; headline block top-left.",
      visualPrompt:
        "photorealistic dramatic close-up of the ancient carved stone war hammer Mjolnir resting upon frosted Scandinavian basalt rocks, deep Norse knotwork serpent engravings glowing with subtle crackling cyan lightning under twilight Arctic aurora borealis",
      mascotPose: {
        prop: "none",
        expression: "Adventurous excitement and heroic awe",
        poseDescription:
          "Heroic dynamic stance leaning forward with an enthusiastic adventurer grin, one paw gesturing boldly toward the legendary relic, zero handheld tools",
      },
    },
    {
      label: "Golden Pharaoh",
      keywords: ["pharaoh", "egypt", "pyramid", "mummy", "tutankhamun", "cairo", "tomb"],
      hook: "WHO BUILT THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Warm golden atmospheric Egyptian treasure hall with flickering directional torchlight illumination, reflective polished stone surface, rich lapis lazuli and gold highlights with zero muddy shadows.",
      spatialComposition:
        "ANCIENT TREASURE STAGING: Mascot on the left (~35% width) in reverent wonder; solid gold Pharaoh burial mask on the right (~65% width) illuminated by warm torchlight; headline block top-left.",
      visualPrompt:
        "museum-grade macro photograph of an authentic solid gold Egyptian pharaoh burial mask inlaid with polished lapis lazuli and obsidian, intricate artisan chisel markings and weathered royal cobra headdress illuminated by warm directional torchlight",
      mascotPose: {
        prop: "none",
        expression: "Solemn respectful wonder, tilted head",
        poseDescription: "Hands clasped reverently in front of chest, tilted head gazing in deep historical appreciation at the golden relic",
      },
    },
    {
      label: "Norse Rune Stone",
      keywords: ["rune stone", "monolith", "ancient stone", "scandinavian"],
      hook: "MYTH OR FACT?",
      background: "bright",
      backgroundAtmosphere:
        "Twilight Scandinavian coastal clearing with luminous aurora reflections over frost-rimmed granite boulders; crisp, atmospheric, and clear.",
      spatialComposition:
        "RUNIC PUZZLE STAGING: Mascot on the left (~35% width) tracing the air in riddle concentration; weathered carved granite rune stone on the right (~65% width); headline block top-left.",
      visualPrompt:
        "authentic weathered Scandinavian granite rune stone carved with deep knotwork serpent motifs and crimson-pigmented runic inscriptions, dusted with Arctic frost against dark mossy stones under twilight aurora reflections",
      mascotPose: {
        prop: "none",
        expression: "Curious ancient puzzle solver",
        poseDescription: "One paw gently tracing the air near the carved runes, eyebrow raised in riddle-solving concentration",
      },
    },
  ],
};

/**
 * Domain: Literature, Storybooks & Classic Legends with enchanting warm libraries.
 */
export const LITERATURE_DOMAIN_SEED: EditorialDomainSeed = {
  id: "literature_storybook",
  domainName: "Storybooks & Classic Literature",
  pattern: /\b(storybook|storybooks|literature|classic book|famous book|book character|novel|fairy tale|fable|sherlock|detective book|excalibur|sword in the stone|legendary character)\b/i,
  preferredLayout: "mega_grid",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "Cozy sunlit antique library corner with warm golden light beams streaming through leaded glass windows, luminous floating gold dust motes, rich polished oak surface; enchanting and warm.",
  subjects: [
    {
      label: "Enchanted Storybook & Quill",
      keywords: ["storybook", "literature", "book", "famous book", "character", "classic", "pages", "tales"],
      hook: "CAN YOU GUESS WHO?",
      background: "bright",
      backgroundAtmosphere:
        "Cozy sunlit antique library corner with warm golden light beams streaming through leaded glass windows, luminous floating gold dust motes, rich polished oak surface; enchanting and warm.",
      spatialComposition:
        "ENCHANTED BOOK STAGING: Mascot on the left (~35% width) treading eagerly over the desk; giant open leather storybook on the right (~65% width) glowing with golden dust particles; headline block top-left.",
      visualPrompt:
        "breathtaking macro photograph of a massive weathered leather-bound antique storybook open on a rustic dark oak library desk, luminous golden dust particles rising softly from gilded illustrated parchment pages with a real feathered quill resting beside it in warm candlelight",
      mascotPose: {
        prop: "none",
        expression: "Enchanted storybook wonder, wide eyes glowing with imagination",
        poseDescription:
          "Leaning over the mystery scene with paws resting excitedly on the desk edge, enchanted storytelling smile, zero handheld tools",
      },
    },
    {
      label: "Sword in the Stone",
      keywords: ["sword in the stone", "excalibur", "arthur", "knight", "medieval", "kingdom"],
      hook: "WHO CAN PULL THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Misty sunlit ancient forest glade with golden morning sunbeams cutting through emerald moss canopy onto the stone; heroic, bright, and mythical.",
      spatialComposition:
        "LEGENDARY SWORD STAGING: Mascot on the left (~35% width) in funny determined pulling pose; steel broadsword driven into the stone on the right (~65% width); headline block top-left.",
      visualPrompt:
        "cinematic photograph of an ancient steel medieval broadsword driven deep into an anvil embedded within mossy granite bedrock, weathered runic fuller reflecting misty forest dawn beams",
      mascotPose: {
        prop: "none",
        expression: "Determined comic bravado",
        poseDescription: "Both paws gripping imaginary sword hilt in funny dramatic pulling posture, energetic playful determination",
      },
    },
  ],
};
