import { THUMBNAIL_LAYOUT_CATALOG, type ThumbnailLayoutType, type QuizImageStyle } from "@studio/shared";
import type {
  MascotThemedPersona,
  QuizSubjectAnchor,
  QuizThumbnailPlan,
  ResolveThumbnailInput,
} from "./thumbnailTypes.js";

/**
 * Resolves optimal thumbnail layout and contextual mascot persona from quiz script and topic metadata.
 */
export function resolveThumbnailLayout(input: ResolveThumbnailInput): QuizThumbnailPlan {
  const topicLower = `${input.topicTitle} ${input.topicSummary || ""}`.toLowerCase();
  const formatLower = (input.questionFormat || "").toLowerCase();
  const count = input.questionCount || (input.questions?.length ?? 10);

  // 1. Determine Layout
  let layout: ThumbnailLayoutType;
  if (input.layoutOverride && THUMBNAIL_LAYOUT_CATALOG[input.layoutOverride]) {
    layout = input.layoutOverride;
  } else if (
    formatLower === "versus" ||
    formatLower.includes("vs") ||
    topicLower.includes("would you rather") ||
    topicLower.includes(" vs ") ||
    topicLower.includes("pick one") ||
    topicLower.includes("chọn 1 trong 2") ||
    topicLower.includes("đối kháng")
  ) {
    layout = "split_vs";
  } else if (
    formatLower.includes("guess") ||
    formatLower.includes("silhouette") ||
    topicLower.includes("who is") ||
    topicLower.includes("guess the") ||
    topicLower.includes("đoán hình") ||
    topicLower.includes("bóng đen") ||
    topicLower.includes("bí ẩn") ||
    topicLower.includes("mystery")
  ) {
    layout = "mystery_silhouette";
  } else if (
    formatLower.includes("odd") ||
    formatLower.includes("spot") ||
    topicLower.includes("odd one") ||
    topicLower.includes("spot the difference") ||
    topicLower.includes("tìm điểm khác") ||
    topicLower.includes("kẻ mạo danh") ||
    topicLower.includes("imposter")
  ) {
    layout = "odd_one_out";
  } else if (
    formatLower.includes("tier") ||
    formatLower.includes("level") ||
    topicLower.includes("iq test") ||
    topicLower.includes("level 1") ||
    topicLower.includes("cấp độ") ||
    topicLower.includes("từ dễ đến khó") ||
    topicLower.includes("thử thách iq")
  ) {
    layout = "difficulty_tier";
  } else if (
    formatLower.includes("true_false") ||
    topicLower.includes("true or false") ||
    topicLower.includes("đúng hay sai") ||
    topicLower.includes("sự thật hay") ||
    topicLower.includes("myths") ||
    topicLower.includes("lầm tưởng")
  ) {
    layout = "true_false";
  } else {
    layout = "mega_grid";
  }

  const catalogEntry = THUMBNAIL_LAYOUT_CATALOG[layout];

  // 2. Resolve Hook & Badge Text
  const hookText = input.customHookText || (layout === "mega_grid" ? "GENERAL KNOWLEDGE" : catalogEntry.hookTextTemplate);
  let badgeText = catalogEntry.badgeTemplate;
  if (layout === "mega_grid") {
    const formattedCount = count > 0 ? (count >= 50 ? `${count} QUESTIONS` : `${count} CÂU HỎI`) : "100 QUESTIONS";
    badgeText = formattedCount;
  }

  // 3. Resolve Contextual Mascot Persona based on Topic & Layout
  const mascotPersona = resolveMascotThemedPersona(topicLower, layout, catalogEntry.mascotPersona);

  // 4. Resolve Subject Anchors
  const subjectAnchors = resolveSubjectAnchors(input, layout);

  const visualStyle: QuizImageStyle = input.visualStyle || "pixar_3d";
  const colorTheme = input.colorTheme || input.mascotProfile?.color_theme || "#06b6d4";

  return {
    layout,
    hookText,
    badgeText,
    topicTitle: input.topicTitle,
    questionCount: count,
    visualStyle,
    colorTheme,
    mascotPersona,
    subjectAnchors,
  };
}

/**
 * Maps topic keywords to themed mascot costume, props, and actions.
 */
function resolveMascotThemedPersona(
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

  if (topicLower.includes("space") || topicLower.includes("vũ trụ") || topicLower.includes("thiên văn")) {
    return {
      role: "Space Explorer",
      costume: "Cute transparent mini astronaut space helmet and futuristic cosmic scout suit",
      prop: "Glowing miniature crescent moon or glowing cosmic star",
      expression: "Amazed, wide sparkling eyes, curious open smile",
      poseDescription: "Floating gently in space, pointing excitedly at the mystery subject",
    };
  }

  if (topicLower.includes("history") || topicLower.includes("lịch sử") || topicLower.includes("ai cập") || topicLower.includes("egypt")) {
    return {
      role: "Archaeologist Explorer",
      costume: "Vintage adventurer leather jacket and safari explorer hat",
      prop: "Golden blazing explorer torch and antique golden key",
      expression: "Determined, adventurous, eyes shining with excitement",
      poseDescription: "Illuminating ancient secrets with the torch",
    };
  }

  if (topicLower.includes("science") || topicLower.includes("khoa học") || topicLower.includes("brain")) {
    return {
      role: "Genius Scientist",
      costume: "White lab coat with round nerdy spectacles",
      prop: "Bubbling colorful test tube or glowing hologram brain",
      expression: "Intrigued, inquisitive, eyebrow raised cleverly",
      poseDescription: "Holding the scientific discovery up proudly",
    };
  }

  if (topicLower.includes("ocean") || topicLower.includes("biển") || topicLower.includes("cá") || topicLower.includes("shark")) {
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


/**
 * Extracts 2 to 4 visual subject anchors for grid/versus layouts.
 */
function resolveSubjectAnchors(input: ResolveThumbnailInput, layout: ThumbnailLayoutType): QuizSubjectAnchor[] {
  const anchors: QuizSubjectAnchor[] = [];

  if (input.questions && input.questions.length > 0) {
    for (let i = 0; i < Math.min(input.questions.length, 4); i++) {
      const q = input.questions[i];
      anchors.push({
        label: `Question ${i + 1}`,
        visualPrompt: q.question,
        badge: i === 0 ? "✓" : undefined,
      });
    }
  }

  // Fallback default anchors if no specific question prompts provided
  if (anchors.length === 0) {
    if (layout === "split_vs") {
      anchors.push(
        { label: "Option A", visualPrompt: "Epic glowing fiery prehistoric Tyrannosaurus Rex" },
        { label: "Option B", visualPrompt: "Futuristic heavy armored laser Mecha Robot in icy blizzards" },
      );
    } else if (layout === "mystery_silhouette") {
      anchors.push({
        label: "Mystery Subject",
        visualPrompt: "Pitch-black mysterious superhero silhouette enveloped in glowing cyan neon question mark '?' and dark mist",
      });
    } else if (layout === "odd_one_out") {
      anchors.push({
        label: "Odd Element",
        visualPrompt: "3x3 matrix grid of cheerful yellow ducklings where one wears cool sunglasses and smirk, highlighted with red circle ⭕",
      });
    } else if (layout === "difficulty_tier") {
      anchors.push(
        { label: "Level 1", visualPrompt: "Green Easy puzzle piece" },
        { label: "Level 2", visualPrompt: "Yellow Medium math equations" },
        { label: "Level 3", visualPrompt: "Orange Hard complex glowing gears" },
        { label: "Level 4", visualPrompt: "Purple Impossible blazing cosmic supernova brain 🔥" },
      );
    } else if (layout === "true_false") {
      anchors.push({
        label: "Statement Subject",
        visualPrompt: "Mind-bending visual paradox: goldfish swimming inside a floating water sphere in zero-gravity space",
      });
    } else {
      // Mega grid defaults
      anchors.push(
        { label: "History", visualPrompt: "Ancient Giza Pyramids under glowing desert sun", badge: "✓" },
        { label: "Science", visualPrompt: "Albert Einstein with glowing holographic brain" },
        { label: "Nature", visualPrompt: "Great white shark swimming in deep crystal ocean" },
        { label: "Space", visualPrompt: "Planet Saturn glowing in colorful cosmic nebula with rocket" },
      );
    }
  }

  return anchors;
}
