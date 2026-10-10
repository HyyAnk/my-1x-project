import type { KidSafetyCategory } from "./kidSafety.types.js";

/**
 * Franchises, games, and characters rated for teens or adults (R, M, TV-14/TV-MA, PEGI 16+).
 * Matched case-sensitively on word boundaries so ordinary words (e.g. "halo of light", "doom") do not trigger.
 */
export const MATURE_FRANCHISE_TITLES: readonly string[] = [
  // Live-action film and TV
  "Breaking Bad",
  "Better Call Saul",
  "Game of Thrones",
  "House of the Dragon",
  "The Walking Dead",
  "Squid Game",
  "Stranger Things",
  "The Witcher",
  "Peaky Blinders",
  "Narcos",
  "The Sopranos",
  "Dexter Morgan",
  "Hannibal Lecter",
  "The Matrix",
  "Terminator",
  "Deadpool",
  "John Wick",
  "Rambo",
  "Scarface",
  "The Godfather",
  "Pulp Fiction",
  "Kill Bill",
  "Fight Club",
  "Hunger Games",
  "Mockingjay",
  "Xenomorph",
  "Predator",
  "Yautja",
  "The Exorcist",
  "The Conjuring",
  "Annabelle",
  "Evil Dead",
  "Chucky",
  "Freddy Krueger",
  "Jason Voorhees",
  "Pennywise",
  "Ghostface",
  // Anime and manga
  "Death Note",
  "Light Yagami",
  "Ryuk",
  "Tokyo Ghoul",
  "Attack on Titan",
  "Chainsaw Man",
  "Jujutsu Kaisen",
  "Demon Slayer",
  "Kimetsu no Yaiba",
  "Berserk",
  "Hellsing",
  "Parasyte",
  "Devilman",
  // Video games
  "Grand Theft Auto",
  "GTA",
  "Call of Duty",
  "Counter-Strike",
  "PUBG",
  "Apex Legends",
  "Halo",
  "Master Chief",
  "Mortal Kombat",
  "Resident Evil",
  "Silent Hill",
  "Pyramid Head",
  "The Last of Us",
  "God of War",
  "Kratos",
  "DOOM",
  "Doom Slayer",
  "Doom Eternal",
  "Wolfenstein",
  "Elden Ring",
  "Dark Souls",
  "Bloodborne",
  "Dead Space",
  "Dead by Daylight",
  "Five Nights at Freddy",
  "BioShock",
  "Bioshock",
  "Max Payne",
  "Hitman",
  "Outlast",
  "Manhunt",
  "Gears of War",
  "Marcus Fenix",
  "Dishonored",
  "Valorant",
];

/** Ordinary phrases that contain a flagged word but are harmless for children. */
export const KID_SAFE_PHRASE_ALLOWLIST: readonly RegExp[] = [
  /\b(?:root|ginger) beers?\b/gi,
  /\bGuinness (?:World Records?|Book of Records|Book)\b/gi,
  /\bAlec Guinness\b/gi,
  /\bMilwaukee Brewers\b/gi,
  /\bfor (?:the|your|my|his|her|their|our) sake\b/gi,
  /\bnaked mole[- ]rats?\b/gi,
  /\b(?:isopropyl|rubbing|ethyl|denatured) alcohol\b|\b\d+% ?alcohol\b/gi,
  /\balcohol[- ](?:based|gel|lamps?|wipes?|thermometers?)\b/gi,
  /\bwine[- ](?:vinegar|red)\b/gi,
  /\brum (?:and lard )?(?:barrels|casks)\b/gi,
  /\b(?:Solar|Lunar|Moon|Sun) Halo\b/g,
  /\bstellar corpses?\b/gi,
  /\bProcter (?:&|and) Gamble\b/gi,
  /\bcigarette boats?\b/gi,
  /\b(?:juice|cranberry|fruit|shrimp|prawn) cocktails?\b/gi,
  /\b(?:coffee|espresso|tea|cold[- ]brew) brewers?\b/gi,
  /\bthe (?:\w+ )?god of war\b/gi,
  /\b(?:Greek|Roman|Norse|Chinese|Egyptian|Aztec|Hindu|Celtic|Olympian) god of war\b/gi,
];

/** Case-insensitive topic patterns; each matched fragment is reported as the triggering term. */
export const KID_UNSAFE_TOPIC_PATTERNS: Readonly<Record<Exclude<KidSafetyCategory, "mature_franchise">, RegExp>> = {
  alcohol:
    /\b(?:beers?|brewery|breweries|brewers?|winery|wineries|winemaking|wine tasting|whisk(?:e)?ys?|vodka|tequila|liquors?|cocktails?|bloody mary|hangovers?|alcoholic\w*|alcoholism|intoxicat\w*|drunken\w*|drunkards?|(?:get|gets|got|getting|gotten) drunk|drunk driv\w*|booze|absinthe|heineken|guinness|budweiser|jack daniel'?s|smirnoff|bacardi|johnnie walker|hennessy|j[aä]germeister)\b/i,
  tobacco_drugs:
    /\b(?:cigars?|cigarettes?|tobacco|marlboro|nicotine|vap(?:e|es|ing)|cocaine|heroin|opium|cannabis|marijuana|narcotics?|meth|methamphetamine|lsd|overdos\w*|drug (?:lords?|empires?|cartels?|dealers?|trafficking))\b/i,
  gambling: /\b(?:casinos?|gambl\w*|poker|roulette|blackjack|slot machines?|betting|bookmakers?)\b/i,
  graphic_violence:
    /\b(?:murder\w*|slaughter\w*|massacre\w*|behead\w*|decapitat\w*|(?:was|were) executed|public executions?|tortur\w*|corpses?|bloody|bloodbath|bloodshed|gunned down|shot (?:dead|and killed)|stabb(?:ed|ing)|assassinat\w*|genocide|war crimes?|suicide|hanged|(?:killed|killing|kills) (?:an estimated |over |more than |nearly |about |roughly )?\d[\d,]+|people were killed|(?:leaped|leapt|jumped) to (?:his|her|their) deaths?|took (?:his|her|their) own lives?|wip(?:e|es|ed|ing) out (?:half|all|every)\b[^.!?]{0,30}\b(?:life|lives|people|living|humanity|creatures))\b/i,
  horror:
    /\b(?:horror|slashers?|zombies?|possessed by (?:a |an |the )?(?:demons?|devils?|evil spirits?|ghosts?)|demonic possession|exorcis\w*|serial killers?|haunted house|jump scares?)\b/i,
  sexual_content: /\b(?:sexual\w*|sexy|condoms?|nude|nudity|erotic\w*|porn\w*|brothels?|prostitut\w*|seduc\w*|lingerie|strip clubs?)\b/i,
};

/**
 * Everyday cooking and mythology mentions (wine in a recipe, Dionysus as god of wine) are fine in narration,
 * but a question about these drinks is not; they are only flagged in the on-screen question and choices.
 */
export const KID_UNSAFE_ON_SCREEN_PATTERNS: Readonly<Partial<Record<KidSafetyCategory, RegExp>>> = {
  alcohol: /\b(?:wines?|champagne|rum|sangria|sake)\b/i,
};
