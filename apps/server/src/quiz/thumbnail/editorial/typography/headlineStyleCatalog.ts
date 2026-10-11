import type { ThumbnailHeadlineStyle } from "@studio/shared";

interface HeadlineStyleSpec {
  /** How the lettering object looks and where it lives in the scene. */
  description: string;
  /** Topic words that make this style a natural fit (whole-word matched against the episode topic). */
  topicAffinity: readonly string[];
}

/** Style used by editorial thumbnails generated before headline styles were rotated. */
export const LEGACY_HEADLINE_STYLE: ThumbnailHeadlineStyle = "brush_banner";

export const HEADLINE_STYLE_CATALOG: Record<ThumbnailHeadlineStyle, HeadlineStyleSpec> = {
  brush_banner: {
    description:
      "two-tier textured paint brush stroke banners: a rugged black dry-brush stroke with bold white uppercase letters above an energetic neon-yellow stroke with bold black letters; key word optionally in vibrant red",
    topicAffinity: [],
  },
  neon_sign: {
    description:
      "a glowing neon tube sign mounted in the scene, thick bright tubes in two contrasting colors (e.g. hot pink and electric cyan) with a soft glow halo, letters crisp and fully legible against a darker patch of background",
    topicAffinity: [
      "space",
      "planet",
      "galaxy",
      "technology",
      "tech",
      "robot",
      "gaming",
      "game",
      "arcade",
      "science",
      "future",
      "invention",
      "neon",
      "music",
    ],
  },
  hazard_plate: {
    description:
      "a bold industrial metal sign plate with yellow-and-black hazard stripe border and rivets, heavy white or black block letters stenciled on it",
    topicAffinity: [
      "engineering",
      "machine",
      "invention",
      "construction",
      "builder",
      "tool",
      "safety",
      "factory",
      "vehicle",
      "car",
      "train",
      "transit",
      "gizmo",
      "gadget",
    ],
  },
  carved_wood_sign: {
    description:
      "a chunky carved wooden sign hanging or standing in the scene, deep-cut glossy painted letters in warm cream and red with a dark outline",
    topicAffinity: [
      "food",
      "cooking",
      "kitchen",
      "farm",
      "forest",
      "nature",
      "animal",
      "camping",
      "storybook",
      "fairy",
      "tale",
      "legend",
      "pirate",
      "house",
      "home",
    ],
  },
  comic_burst: {
    description:
      "a punchy comic-book speech burst with halftone dots and a thick black outline, bold slanted comic lettering in white and yellow",
    topicAffinity: ["anime", "manga", "cartoon", "superhero", "hero", "detective", "movie", "pop", "character", "comic"],
  },
  chalkboard: {
    description:
      "a classroom chalkboard or slate panel in the scene, big bold chalk letters in white with one word in bright yellow chalk, slightly dusty texture",
    topicAffinity: ["school", "science", "math", "history", "body", "sense", "human", "biology", "lab", "teacher", "learning", "brain"],
  },
  chunky_3d_letters: {
    description:
      "big chunky glossy 3D toy-like letters standing in the scene, candy-colored with strong highlights and a thick contrasting outline",
    topicAffinity: ["toy", "candy", "kids", "fun", "sport", "color", "party", "everyday", "object", "brand"],
  },
  stone_tablet: {
    description: "an ancient carved stone tablet or rune stone, deep chiseled letters filled with glowing gold or ember light",
    topicAffinity: [
      "norse",
      "viking",
      "myth",
      "mythology",
      "ancient",
      "egypt",
      "greek",
      "roman",
      "temple",
      "dragon",
      "castle",
      "medieval",
      "legend",
    ],
  },
};

export function headlineStyleDescription(style: ThumbnailHeadlineStyle): string {
  return HEADLINE_STYLE_CATALOG[style].description;
}
