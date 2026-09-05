import { THUMBNAIL_LAYOUT_CATALOG, type ThumbnailLayoutType, type QuizImageStyle } from "@studio/shared";
import {
  getCuriosityBadgeText,
  getThumbnailLocalizedTexts,
  resolveThumbnailLanguage,
  resolveTopicSpecificHook,
} from "./thumbnailLocale.js";
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
    topicLower.includes("どっち") ||
    topicLower.includes("2択")
  ) {
    layout = "split_vs";
  } else if (
    formatLower.includes("guess") ||
    formatLower.includes("silhouette") ||
    topicLower.includes("who is") ||
    topicLower.includes("guess the") ||
    topicLower.includes("誰") ||
    topicLower.includes("シルエット") ||
    topicLower.includes("mystery")
  ) {
    layout = "mystery_silhouette";
  } else if (
    formatLower.includes("odd") ||
    formatLower.includes("spot") ||
    topicLower.includes("odd one") ||
    topicLower.includes("spot the difference") ||
    topicLower.includes("間違い探し") ||
    topicLower.includes("仲間外れ") ||
    topicLower.includes("imposter")
  ) {
    layout = "odd_one_out";
  } else if (
    formatLower.includes("tier") ||
    formatLower.includes("level") ||
    topicLower.includes("iq test") ||
    topicLower.includes("level 1") ||
    topicLower.includes("難易度") ||
    topicLower.includes("iqテスト")
  ) {
    layout = "difficulty_tier";
  } else if (
    formatLower.includes("true_false") ||
    topicLower.includes("true or false") ||
    topicLower.includes("ウソ") ||
    topicLower.includes("ホント") ||
    topicLower.includes("○✕") ||
    topicLower.includes("myths")
  ) {
    layout = "true_false";
  } else {
    layout = "mega_grid";
  }

  const catalogEntry = THUMBNAIL_LAYOUT_CATALOG[layout];

  // 2. Resolve Localized Hook & Badge Text
  const language = resolveThumbnailLanguage(input);
  const localized = getThumbnailLocalizedTexts(layout, count, language);

  const topicSpecificHook = resolveTopicSpecificHook(topicLower, language);
  const hookText = input.customHookText || topicSpecificHook || localized.hookText;
  const badgeText = getCuriosityBadgeText(input.badgeOverride, count, language, localized.badgeText, input.rng);


  // 3. Resolve Contextual Mascot Persona based on Topic & Layout
  const mascotPersona = resolveMascotThemedPersona(topicLower, layout, catalogEntry.mascotPersona);

  // 4. Resolve Subject Anchors (Visual objects only, zero raw question text)
  const subjectAnchors = resolveSubjectAnchors(input, layout);

  const visualStyle: QuizImageStyle = input.visualStyle || "pixar_3d";
  const colorTheme = input.colorTheme || input.mascotProfile?.color_theme || "#06b6d4";

  // 5. Resolve Fallback Environment & Lighting Atmosphere
  const { environmentAtmosphere, lightingPalette } = resolveFallbackEnvironment(topicLower, input.topicTitle);

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
    environmentAtmosphere,
    lightingPalette,
  };
}

/**
 * Resolves fallback vibrant environment and lighting palette for family/kids Pixar aesthetic.
 */
function resolveFallbackEnvironment(
  topicLower: string,
  topicTitle: string,
): { environmentAtmosphere: string; lightingPalette: string } {
  if (
    topicLower.includes("bake") ||
    topicLower.includes("cookie") ||
    topicLower.includes("biscuit") ||
    topicLower.includes("pastry") ||
    topicLower.includes("dessert") ||
    topicLower.includes("bánh")
  ) {
    return {
      environmentAtmosphere:
        "Warm cozy bakery kitchen with soft warm golden oven glow and gentle flour dust sparkles in soft depth of field",
      lightingPalette:
        "Warm amber and golden honey glow, bright luminous rim light on characters and pastries, soft natural contact shadows",
    };
  }
  if (
    topicLower.includes("supercar") ||
    topicLower.includes("hypercar") ||
    topicLower.includes("racing") ||
    topicLower.includes("siêu xe")
  ) {
    return {
      environmentAtmosphere:
        "Vibrant high-tech racing paddock and sunny speedway stadium with celebratory confetti and soft depth of field",
      lightingPalette:
        "Bright daylight sunbeams, dramatic metallic highlights, and vibrant neon track rim lights",
    };
  }
  if (topicLower.includes("space") || topicLower.includes("vũ trụ") || topicLower.includes("hành tinh")) {
    return {
      environmentAtmosphere:
        "Magical deep cerulean and indigo cosmic nebula with glowing stardust particles and colorful crescent moons in soft depth of field",
      lightingPalette:
        "Luminous cyan and magenta rim lighting, soft glowing ambient starlight, zero muddy darkness",
    };
  }
  return {
    environmentAtmosphere: `Vibrant, colorful, family-friendly Pixar 3D studio environment tailored to ${topicTitle} with soft atmospheric depth of field and cheerful bright colors`,
    lightingPalette:
      "Soft warm three-point cinematic studio lighting, bright luminous rim lighting on subjects, soft natural contact shadows, zero muddy darkness",
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
      poseDescription: "Floating weightlessly in cosmic awe, reaching out toward the mystery planets with wonder",
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

  if (
    topicLower.includes("bake") ||
    topicLower.includes("cookie") ||
    topicLower.includes("biscuit") ||
    topicLower.includes("pastry") ||
    topicLower.includes("bánh") ||
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

  if (topicLower.includes("supercar") || topicLower.includes("hypercar") || topicLower.includes("racing") || topicLower.includes("siêu xe")) {
    return {
      role: "Pro Racing Driver",
      costume: "High-speed aerodynamic racing driver jumpsuit and racing helmet",
      prop: "Black-and-white checkered finish flag or golden championship trophy",
      expression: "Adrenaline pumped, confident smirk, eyes shining",
      poseDescription: "Giving a triumphant thumbs up beside the track challenge",
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
 * Enriches choice text with topic domain context (e.g. "France" in a Cookie quiz -> "authentic specialty cookie representing France").
 */
function contextualizeChoiceSubject(choice: string, topicLower: string): string {
  const trimmed = choice.trim();
  if (
    topicLower.includes("bake") ||
    topicLower.includes("cookie") ||
    topicLower.includes("biscuit") ||
    topicLower.includes("pastry") ||
    topicLower.includes("bánh")
  ) {
    return `delicious authentic specialty cookie or pastry representing ${trimmed}`;
  }
  if (
    topicLower.includes("supercar") ||
    topicLower.includes("hypercar") ||
    topicLower.includes("siêu xe") ||
    topicLower.includes("racing")
  ) {
    return `luxury high-speed exotic sports car from ${trimmed}`;
  }
  if (topicLower.includes("weapon") || topicLower.includes("sword") || topicLower.includes("vũ khí")) {
    return `legendary iconic artifact weapon representing ${trimmed}`;
  }
  return trimmed;
}

/**
 * Extracts 2 to 4 visual subject anchors for grid/versus layouts.
 * Ensures anchors only describe visual 3D objects, NEVER question sentences.
 */
function resolveSubjectAnchors(input: ResolveThumbnailInput, layout: ThumbnailLayoutType): QuizSubjectAnchor[] {
  const anchors: QuizSubjectAnchor[] = [];
  const topicLower = `${input.topicTitle} ${input.topicSummary || ""}`.toLowerCase();

  if (input.questions && input.questions.length > 0) {
    const firstQ = input.questions[0];

    // Priority 1: If first question has multiple visual choices (e.g. 4 choices for a 2x2 grid or 2 choices for VS)
    if (firstQ.choices && firstQ.choices.length >= 2 && (layout === "mega_grid" || layout === "split_vs")) {
      const limit = layout === "split_vs" ? 2 : Math.min(firstQ.choices.length, 4);
      for (let i = 0; i < limit; i++) {
        const choice = firstQ.choices[i];
        const isAnswer = firstQ.answer
          ? choice.toLowerCase().includes(firstQ.answer.toLowerCase()) || firstQ.answer.toLowerCase().includes(choice.toLowerCase())
          : i === 0;
        const enrichedVisual = contextualizeChoiceSubject(choice, topicLower);
        anchors.push({
          label: `Option ${i + 1}`,
          visualPrompt: `3D visual icon of ${enrichedVisual}`,
          badge: isAnswer ? "✓" : undefined,
        });
      }
    } else {
      // Priority 2: Distinct subjects from multiple questions (clean noun phrases)
      for (let i = 0; i < Math.min(input.questions.length, 4); i++) {
        const q = input.questions[i];
        const subject = cleanSubjectFromQuestion(q.question, q.answer);
        const enrichedVisual = contextualizeChoiceSubject(subject, topicLower);
        anchors.push({
          label: `Subject ${i + 1}`,
          visualPrompt: `3D visual icon of ${enrichedVisual}`,
          badge: i === 0 ? "✓" : undefined,
        });
      }
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

/**
 * Strips question words, auxiliary verbs, and punctuation to extract pure visual noun subjects.
 */
function cleanSubjectFromQuestion(question: string, answer?: string): string {
  if (answer && answer.trim().length > 0 && answer.trim().length < 40) {
    return answer.trim();
  }
  let cleaned = question
    .replace(/^(which|what|where|who|how|why|when|is|are|can|do|does|did|find|spot|guess|choose)\s+(is|are|the|a|an|of)?\s*/i, "")
    .replace(/\b(could|can|would|should)\s+(float in water|fly|survive|live|happen|win|be|exist)\b/gi, "")
    .replace(/[?!.:,;]+$/g, "")
    .trim();

  if (!cleaned || cleaned.length < 3) {
    cleaned = "mystery trivia subject";
  }
  return cleaned;
}

