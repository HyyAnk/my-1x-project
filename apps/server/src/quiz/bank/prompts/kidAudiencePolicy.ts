import { MATURE_FRANCHISE_TITLES } from "../kidSafety/kidSafetyLexicon.js";

/** Content rules shared by every generation and rewrite prompt for the kids and family Question Bank. */
export const KID_SAFE_CONTENT_POLICY_LINES: readonly string[] = [
  "=== KIDS & FAMILY AUDIENCE POLICY (MANDATORY) ===",
  "Audience: children aged 6-12 watching with their families. Every field (question, choices, explanation, fun_fact, visual prompt) must be safe and friendly for them.",
  "1. FORBIDDEN TOPICS: alcohol (beer, wine, cocktails, breweries, drink brands), tobacco, vaping, drugs, gambling (casinos, poker, betting), murder, executions, torture, suicide, gore, dead bodies, horror, zombies, demonic possession, romance or sexual content, and real-world tragedies or death tolls.",
  `2. FORBIDDEN FRANCHISES: never use titles, characters, or worlds rated for teens or adults (R, M, TV-14, TV-MA, PEGI 16+), including: ${MATURE_FRANCHISE_TITLES.join(", ")}.`,
  "3. PREFER FAMILY FAVORITES: animals, nature, space, science, everyday objects, sports, food, world places, and films, cartoons, anime, and games rated G, PG, E, or E10+.",
  "4. STORYBOOK CONFLICT ONLY: villains, battles, and myths may appear only in storybook terms ('defeated', 'outsmarted', 'turned to stone'); never describe killing, injuries, blood, or death.",
  "5. FRIENDLY VISUALS: visual prompts describe bright, inviting scenes; never 'menacing', 'terrifying', or 'violent' framing, no blood, and no weapons aimed at the viewer.",
];

/** Reading-level rules so a nine-year-old can follow the on-screen question and the narrated reveal. */
export const KID_READING_LEVEL_LINES: readonly string[] = [
  "=== KIDS READING LEVEL (MANDATORY) ===",
  "1. Write for a 9-year-old: everyday words, short sentences, active voice (US grade 4-6 reading level).",
  "2. QUESTION: one short sentence; aim for 14 words or fewer.",
  "3. EXPLANATION: 1-2 short sentences, at most 25 words in total and under 15 words per sentence. State the answer plainly first, then give one simple reason.",
  "4. FUN FACT: one sentence of at most 20 words, a surprising detail a child would repeat to a friend.",
  "5. NO JARGON: replace academic words with plain ones ('subterranean' -> 'underground', 'approximately' -> 'about', 'utilize' -> 'use', 'culinary' -> 'cooking', 'organism' -> 'living thing'). If a technical term is the answer, explain it in plain words.",
];

export const KID_AUDIENCE_POLICY_LINES: readonly string[] = [...KID_SAFE_CONTENT_POLICY_LINES, ...KID_READING_LEVEL_LINES];
