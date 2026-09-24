import type { BankGameplayArchetypeId } from "@studio/shared";

export interface ArchetypePromptGuideline {
  format: "multiple_choice" | "true_false" | "odd_one_out" | "open_guess" | "slider" | "ordering" | "image_guess";
  choiceCount: number;
  visualIntent: "none" | "question_illustration" | "choice_illustration";
  defaultThinkingSeconds: number;
  instructions: string[];
}

export const FRANCHISE_ANCHOR_MANDATE = `=== FRANCHISE ANCHOR MANDATE (CRITICAL FOR CASUAL AUDIENCE) ===
When generating questions about anime, manga, gaming, comics, movies, or fictional characters:
1. NEVER formulate a question around an isolated, naked character name (e.g. NEVER ask 'Whose hand clap swaps positions?' or 'Who is Tenko Shimura?').
2. ALWAYS explicitly anchor the parent franchise or show title using its short, canonical umbrella name in the question prompt (e.g. 'In Spider-Man...', 'In Lord of the Rings...', 'In Star Wars...', 'In Jujutsu Kaisen...', 'In Dragon Ball Z...', 'In Demon Slayer...', 'In Naruto...').
3. SHORT UMBRELLA FRANCHISE NAMES ONLY: STRICTLY FORBIDDEN to include lengthy movie subtitles, arc names, book subtitles, or Roman numerals (e.g. NEVER write 'Across the Spider-Verse', 'The Fellowship of the Ring', 'Kimetsu no Yaiba', or 'Episode V - The Empire Strikes Back'). Keep the franchise prefix ultra-concise to preserve question character budget for 9:16 mobile screens.
4. For franchise-level entities (e.g. Dragon Ball, One Piece, Pokemon, Doraemon), ask about world-famous hallmarks, legendary objects, iconic catchphrases, or universal symbols that anyone on social media recognizes immediately.
5. This ensures 100% immediate context and instant engagement for casual viewers and families while preventing font shrinkage or text clipping on mobile screens.`;

export const FRANCHISE_ANCHOR_MANDATE_LINES: string[] = [
  "=== FRANCHISE ANCHOR MANDATE (CRITICAL FOR CASUAL AUDIENCE) ===",
  "When generating questions about anime, manga, gaming, comics, movies, or fictional characters:",
  "1. NEVER formulate a question around an isolated, naked character name (e.g. NEVER ask 'Whose hand clap swaps positions?' or 'Who is Tenko Shimura?').",
  "2. ALWAYS explicitly anchor the parent franchise or show title using its short, canonical umbrella name in the question prompt (e.g. 'In Spider-Man...', 'In Lord of the Rings...', 'In Star Wars...', 'In Jujutsu Kaisen...', 'In Dragon Ball Z...', 'In Demon Slayer...', 'In Naruto...').",
  "3. SHORT UMBRELLA FRANCHISE NAMES ONLY: STRICTLY FORBIDDEN to include lengthy movie subtitles, arc names, book subtitles, or Roman numerals (e.g. NEVER write 'Across the Spider-Verse', 'The Fellowship of the Ring', 'Kimetsu no Yaiba', or 'Episode V - The Empire Strikes Back'). Keep the franchise prefix ultra-concise to preserve question character budget for 9:16 mobile screens.",
  "4. For franchise-level entities (e.g. Dragon Ball, One Piece, Pokemon, Doraemon), ask about world-famous hallmarks, legendary objects, iconic catchphrases, or universal symbols that anyone on social media recognizes immediately.",
  "5. This ensures 100% immediate context and instant engagement for casual viewers and families while preventing font shrinkage or text clipping on mobile screens.",
];

export const VISUAL_ANCHOR_MANDATE = `=== VISUAL SPEC & CONTINUITY ANCHOR MANDATE (CRITICAL FOR ACCURATE ILLUSTRATIONS) ===
When generating visual_spec.prompt or visual_opportunity:
1. ALWAYS explicitly name the character/entity and their parent franchise or lore universe (e.g. 'Eren Yeager in Attack Titan form from Attack on Titan', 'Tanjiro Kamado from Demon Slayer', 'Izuku Midoriya (Deku) from My Hero Academia').
2. NEVER describe iconic subjects with vague generic placeholders (e.g. NEVER write 'a muscular giant' instead of 'Eren Yeager's Attack Titan', NEVER write 'a swordsman' instead of 'Tanjiro Kamado').
3. ALWAYS describe signature physical traits, distinct anatomy, and iconic gear (e.g. jagged lipless teeth, pointed titan ears, glowing green eyes, green-checkered haori, hanafuda earrings).
4. ALWAYS anchor the subject in an authentic, lore-accurate environment/setting (e.g. 'standing before the colossal 50-meter stone Wall Maria in the Shiganshina district with billowing transformation steam and yellow lightning sparks' instead of a generic open sky or empty studio).
5. Focus strictly on clean scene content, subject action, and atmospheric lighting. NEVER copy/paste camera/lens buzzwords (such as 'wildlife and nature photography style') or UI elements (cards, text, buttons, timers).
6. ALWAYS write in 100% English because the underlying AI image generation models require English prompts.`;

export const VISUAL_ANCHOR_MANDATE_LINES: string[] = [
  "=== VISUAL SPEC & CONTINUITY ANCHOR MANDATE (CRITICAL FOR ACCURATE ILLUSTRATIONS) ===",
  "When generating visual_spec.prompt or visual_opportunity:",
  "1. ALWAYS explicitly name the character/entity and their parent franchise or lore universe (e.g. 'Eren Yeager in Attack Titan form from Attack on Titan', 'Tanjiro Kamado from Demon Slayer', 'Izuku Midoriya (Deku) from My Hero Academia').",
  "2. NEVER describe iconic subjects with vague generic placeholders (e.g. NEVER write 'a muscular giant' instead of 'Eren Yeager's Attack Titan', NEVER write 'a swordsman' instead of 'Tanjiro Kamado').",
  "3. ALWAYS describe signature physical traits, distinct anatomy, and iconic gear (e.g. jagged lipless teeth, pointed titan ears, glowing green eyes, green-checkered haori, hanafuda earrings).",
  "4. ALWAYS anchor the subject in an authentic, lore-accurate environment/setting (e.g. 'standing before the colossal 50-meter stone Wall Maria in the Shiganshina district with billowing transformation steam and yellow lightning sparks' instead of a generic open sky or empty studio).",
  "5. Focus strictly on clean scene content, subject action, and atmospheric lighting. NEVER copy/paste camera/lens buzzwords (such as 'wildlife and nature photography style') or UI elements (cards, text, buttons, timers).",
  "6. ALWAYS write in 100% English because the underlying AI image generation models require English prompts.",
];

export const GRAPHIC_IDENTITY_MANDATE = `=== GRAPHIC IDENTITY & LOGO MANDATE (CRITICAL FOR LOGO / EMBLEM / SYMBOL TOPICS) ===
When generating visual_spec.prompt or visual_opportunity for Brand Logos, Superhero Insignias, Emblems, Flags, or Graphic Symbols:
1. SUBJECT PURITY: Illustrate the official, isolated vector logo, emblem, or symbol directly (e.g. 'Official minimalist vector brand logo of Nike, featuring the iconic clean black swoosh mark centered on a solid white background').
2. ZERO PRODUCTS / MOCKUPS: NEVER substitute the logo with a physical commercial product or merchandise (e.g. NEVER illustrate running shoes, soda cans, coffee mugs, cars, or packaging).
3. ZERO HUMAN / SCENIC POLLUTION: NEVER place the symbol in a 3D living room, street scene, landscape, or on clothing worn by a person.
4. HIGH-CONTRAST FLAT VECTOR FRAMING: Always require an isolated centered graphic emblem on a clean, solid, high-contrast monochrome background (white or light neutral) optimized for silhouette recognition and laser scan reveal.
5. ALWAYS write in 100% English because underlying AI image generation models require English prompts.`;

export const GRAPHIC_IDENTITY_MANDATE_LINES: string[] = [
  "=== GRAPHIC IDENTITY & LOGO MANDATE (CRITICAL FOR LOGO / EMBLEM / SYMBOL TOPICS) ===",
  "When generating visual_spec.prompt or visual_opportunity for Brand Logos, Superhero Insignias, Emblems, Flags, or Graphic Symbols:",
  "1. SUBJECT PURITY: Illustrate the official, isolated vector logo, emblem, or symbol directly (e.g. 'Official minimalist vector brand logo of Nike, featuring the iconic clean black swoosh mark centered on a solid white background').",
  "2. ZERO PRODUCTS / MOCKUPS: NEVER substitute the logo with a physical commercial product or merchandise (e.g. NEVER illustrate running shoes, soda cans, coffee mugs, cars, or packaging).",
  "3. ZERO HUMAN / SCENIC POLLUTION: NEVER place the symbol in a 3D living room, street scene, landscape, or on clothing worn by a person.",
  "4. HIGH-CONTRAST FLAT VECTOR FRAMING: Always require an isolated centered graphic emblem on a clean, solid, high-contrast monochrome background (white or light neutral) optimized for silhouette recognition and laser scan reveal.",
  "5. ALWAYS write in 100% English because underlying AI image generation models require English prompts.",
];

export const ARCHETYPE_GUIDELINES: Record<Exclude<BankGameplayArchetypeId, "clue_deduction">, ArchetypePromptGuideline> & {
  [archetype: string]: ArchetypePromptGuideline | undefined;
} = {
  verdict_true_false: {
    format: "true_false",
    choiceCount: 2,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 5,
    instructions: [
      "True or False format. Must be a punchy, single-clause statement or question strictly 60 to 80 characters (never exceed 80 chars).",
      "Format: Direct factual or counter-factual statement ending in 'True or False?' (e.g. 'Blue whales are bigger than any dinosaur. True or False?').",
      "Do NOT cram numbers, secondary clauses, or explanations into the question text.",
      "Exactly 2 choices: 'True' and 'False'.",
      "Truth Balance: Maintain a strict ~50/50 balance between True and False as the correct choice across the generated questions to keep viewer suspense.",
      "Provide a clear explanation of why it is True or False along with a scientific/real-world fun fact.",
      "Visual prompt describes a realistic, cinematic background scene illustrating the statement.",
    ],
  },
  verdict_fact_myth: {
    format: "true_false",
    choiceCount: 2,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 5,
    instructions: [
      "True or False format. Must be a punchy, single-clause statement or question strictly 60 to 80 characters (never exceed 80 chars).",
      "Format: Direct factual or counter-factual statement ending in 'True or False?' (e.g. 'Blue whales are bigger than any dinosaur. True or False?').",
      "Do NOT cram numbers, secondary clauses, or explanations into the question text.",
      "Exactly 2 choices: 'True' and 'False'.",
      "Truth Balance: Maintain a strict ~50/50 balance between True and False as the correct choice across the generated questions to keep viewer suspense.",
      "Provide a clear explanation of why it is True or False along with a scientific/real-world fun fact.",
      "Visual prompt describes a realistic, cinematic background scene illustrating the statement.",
    ],
  },
  speed_blitz: {
    format: "multiple_choice",
    choiceCount: 3,
    visualIntent: "none",
    defaultThinkingSeconds: 4,
    instructions: [
      "Rapid reflex riddle, cognitive brainteaser, mental math trap, or lateral wordplay strictly 60 to 80 characters (never exceed 80 chars) for 3-4s fast thinking.",
      "DO NOT ask dry encyclopedic facts, historical dates, or textbook definitions.",
      "Target instinctive cognitive traps where intuitive first-glance logic fails (rate multiplier paradoxes, linguistic illusions, object permanence/survival traps).",
      "Exactly 3 choices (A, B, C): 1 correct counter-intuitive answer and 2 seductive trap choices that 80% of viewers instinctively pick.",
      "Explanation must clearly reveal the witty 'Aha!' logic in 1-2 punchy sentences.",
      "Visual spec intent is 'none' (pure text focus for maximum speed and reading reflex).",
    ],
  },
  deep_trivia: {
    format: "multiple_choice",
    choiceCount: 3,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 6,
    instructions: [
      "Deep knowledge trivia question strictly 60 to 80 characters (never exceed 80 chars) to prevent font shrinkage on mobile screens.",
      "CRITICAL ANTI-MONOTONY & NO FILLER NOUNS RULE: STRICTLY FORBIDDEN to monotonically open questions with 'Which [category noun] [verb]...' (e.g. 'Which villain...', 'Which sorcerer...', 'Which animal...'). Drop redundant category filler since choices already display the candidates.",
      "FRANCHISE ANCHOR MANDATE: When questioning fictional characters or pop culture lore (anime, manga, gaming, comics, movies), ALWAYS anchor the parent franchise in the prompt using its short, canonical umbrella title (e.g. 'In Spider-Man', 'In Lord of the Rings'). NEVER ask about naked, unanchored character names, and STRICTLY FORBIDDEN to include lengthy movie subtitles or arc tags.",
      "Rotate continuously across these 5 punchy phrasing styles:",
      "  1. Feat / Signature Action: 'In Dragon Ball Z, whose signature energy wave is the Kamehameha?'",
      "  2. Iconic Relic / Hallmarks: 'In One Piece, what straw accessory was given to Luffy by Shanks?'",
      "  3. Universal Mascot / Partner: 'In Pokemon, which electric mouse is Ash Ketchum's loyal partner?'",
      "  4. Signature Jutsu / Technique: 'In Naruto, which swirling blue sphere technique did Minato invent?'",
      "  5. Detective Gadget / Identity: 'In Detective Conan, what gadget lets Conan mimic Kogoro's voice?'",
      "ANTI-OBSCURITY NEGATIVE CONSTRAINTS: NEVER test obscure manga chapter numbers, release dates, or background animator names.",
      "NEVER test secondary character family lineages, blood types, or obscure minor jutsu/spells.",
      "ALWAYS focus questions on world-famous hallmarks: signature attacks, legendary relics, iconic character traits, or universal plot premises that casual viewers and social media audiences immediately recognize and celebrate.",
      "Exactly 3 choices (A, B, C) with high plausibility to stimulate curiosity.",
      "Engaging, educational explanation revealing an angle that 95% of viewers don't know.",
      "Visual prompt describes a breathtaking cinematic environment or subject.",
    ],
  },
  versus_faceoff: {
    format: "multiple_choice",
    choiceCount: 2,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 5,
    instructions: [
      "1v1 direct head-to-head comparison strictly 60 to 80 characters (never exceed 80 chars).",
      "CRITICAL ANTI-REPETITION & MOBILE CLEANLINESS RULE: DO NOT append ': Choice A or Choice B?' to the question text! Choices A and B are already displayed as interactive split-screen cards.",
      "STRICT COMPETITOR SYMMETRY & SHARED PREMISE: Both Choice A and Choice B MUST legitimately belong to the question's premise. NEVER ask a question whose wording automatically disqualifies one choice by definition (e.g. NEVER ask 'Which red racer...' when Choice B is not a red racer).",
      "NO ASYMMETRIC TRIVIA: Do NOT disguise standard 1-entity trivia as a versus faceoff by attaching an irrelevant bystander as Choice B. The question MUST challenge viewers to compare both contenders.",
      "FRANCHISE ANCHOR MANDATE: When comparing fictional characters within the same franchise, use natural host phrasing like 'In [Franchise], who [feat]?' with short umbrella franchise names (e.g. 'In Pixar\'s Cars, who won more Piston Cups?', 'In Harry Potter, who escaped Azkaban first?'). For cross-franchise battles, explicitly anchor each universe with short names (e.g. 'Goku (Dragon Ball) vs Saitama (One Punch Man)'). Avoid robotic 'Cars:' or 'Harry Potter:' database labels. NEVER use 'In [Franchise], which [entity] [single-entity action]?' where Choice B is an irrelevant bystander, and NEVER include lengthy movie subtitles or arc tags.",
      "Ensure high syntactic variety across questions. Rotate continuously between these 4 comparative angles:",
      "  1. Natural Franchise Showdown: 'In [Franchise], who [won more titles / achieved milestone]?' (e.g. 'In Pixar\'s Cars, who won more Piston Cups?')",
      "  2. Stat / Superlative showdown: '[Entity A] vs [Entity B]: Which one [has higher stat / record]?' (e.g. 'Cheetah vs Falcon: Which reaches higher top speed?')",
      "  3. Shared arena / Record clash: 'In [Franchise], who [escaped / survived / won] first?' (e.g. 'In Harry Potter, who escaped Azkaban first?')",
      "  4. Chronological priority: 'Who debuted first / was created earlier: [Entity A] or [Entity B]?'",
      "Exactly 2 choices (A and B representing the competing entities).",
      "Explanation highlights verified stats or scientific records deciding the winner.",
      "Visual spec intent is 'question_illustration' depicting both subjects in confrontation.",
    ],
  },
  visual_spotting: {
    format: "odd_one_out",
    choiceCount: 3,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 6,
    instructions: [
      "Visual spotting challenge finding anomalies, differences, or synthetic impostors across 3 full-bleed visual cards. QUESTION LENGTH: Strictly 60 to 80 characters (never exceed 80 chars).",
      "CRITICAL ANTI-REPETITION RULE: STRICTLY FORBIDDEN to end questions with repetitive formulas like '... is the odd one out?' or append robotic canned suffixes like '— spot the mismatch!'. You MUST vary question hooks and phrasing naturally across the batch.",
      "Rotate between these 5 distinct spotting hooks:",
      "  1. Impostor alert: 'Spot the impostor: Which [category] does not belong?'",
      "  2. Group mismatch: 'One of these [group] doesn't fit — can you spot it?'",
      "  3. Outlier challenge: 'Which of these three [subjects] is the outlier?'",
      "  4. Exception finder: 'Find the exception among these [subjects]!'",
      "  5. Trait contrast: 'Two share [common trait], but which one [contrasting trait]?' (e.g. 'Two are venomous predators, but which one is completely harmless?')",
      "Exactly 3 choices (A, B, C) corresponding to 3 visual cards without redundant text.",
      "Visual spec describes the visual challenge in detail (camouflaged animal, AI impostor, historical outlier, etc.).",
    ],
  },
  visual_identification: {
    format: "multiple_choice",
    choiceCount: 3,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 5,
    instructions: [
      "Identify a creature, object, landmark, or celestial phenomenon from a distinctive perspective or macro detail. QUESTION LENGTH: Strictly 60 to 80 characters (never exceed 80 chars).",
      "CRITICAL ANTI-REPETITION RULE: DO NOT start every question with 'What [adjective] [noun]...?' or 'Which [noun]...?'. Enforce syntactic variety across the batch.",
      "Rotate between these 5 recognition phrasing styles:",
      "  1. Phenomenon naming: 'What do [scientists / astronomers] call this [distinctive phenomenon]?'",
      "  2. Direct recognition: 'Can you identify this [celestial body / creature / landmark]?'",
      "  3. Clue teaser: 'Known for [surprising trait] — what is this [object / structure]?' (e.g. 'Smelled like gunpowder to astronauts — what is this dust?')",
      "  4. Category locator: 'Which [structure / feature] anchors [specific location or system]?'",
      "  5. Feature detective: 'Identify this [subject] from its distinctive [physical attribute].'",
      "3 choices with plausible candidate names.",
      "Visual spec describes macro closeup, distinctive angle, or cosmic vista.",
    ],
  },
  mystery_reveal: {
    format: "image_guess",
    choiceCount: 1,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 6,
    instructions: [
      "Guess the mystery object, craft, creature, or figure concealed behind a dark silhouette or laser scanner cover. QUESTION LENGTH: Strictly 60 to 80 characters (never exceed 80 chars).",
      "CRITICAL ANTI-REPETITION RULE: DO NOT use repetitive 'Which [adjective] [noun] [verb]?' boilerplate. Frame questions around suspense, silhouettes, and discovery.",
      "Rotate between these 5 mystery framing styles:",
      "  1. Silhouette guess: 'Can you guess this [craft / creature] from its silhouette?'",
      "  2. Scanner teaser: 'Behind the scan beam: Name the [machine / explorer] that [key action]!'",
      "  3. Stat riddle: '[Surprising stat or achievement] — what [vehicle / subject] is hiding here?' (e.g. 'Sees 16 sunrises a day — what orbiting lab is this?')",
      "  4. Shadow identification: 'Whose outline is concealed in this mystery reveal?'",
      "  5. Historical unmasking: 'Unmask the legend: Which [craft / figure] [historic milestone]?'",
      "EXACTLY 1 choice (the single canonical correct answer revealed after suspense). NO distractors, NO multiple choices.",
      "GRAPHIC IDENTITY & LOGO MANDATE: When guessing a Brand Logo, Superhero Insignia, Flag, or Emblem, the visual prompt MUST illustrate the isolated official vector logo/emblem directly on a clean solid white background. NEVER depict commercial products (e.g. shoes, soda cans, cars) or 3D room scenes.",
      "Explanation reveals the secret story and historical context behind the silhouette.",
    ],
  },
};
