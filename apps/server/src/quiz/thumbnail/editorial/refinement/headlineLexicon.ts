import type { HeadlineClaimFamily } from "./headlineTypes.js";

/**
 * English words that carry no topic information on their own. A headline built only from these
 * ("CAN YOU SOLVE IT?", "CAN YOU GUESS WHO?") tells the viewer nothing about the episode.
 * Entries are stored in stemmed form (see stemHeadlineToken).
 */
export const GENERIC_HEADLINE_WORDS: ReadonlySet<string> = new Set([
  // Function words
  "a", "an", "the", "is", "are", "was", "were", "be", "it", "its", "it's", "this", "that", "these", "those",
  "they", "them", "he", "she", "his", "her", "you", "your", "you're", "we", "our", "i", "me", "my",
  "can", "could", "do", "doe", "does", "did", "will", "would", "should", "have", "has",
  "of", "in", "on", "at", "to", "for", "with", "from", "by", "or", "and", "but", "if", "so", "not",
  "ever", "really", "just", "very", "now", "here", "there", "out", "up", "all", "any", "each", "every", "only", "one",
  "who", "whose", "what", "which", "where", "when", "why", "how",
  // Quiz verbs and nouns
  "guess", "solve", "name", "spot", "find", "see", "know", "tell", "pick", "choose", "beat", "pass",
  "crack", "identify", "figure", "get", "try", "play", "win", "think",
  "quiz", "trivia", "test", "challenge", "question", "answer", "game", "puzzle", "level",
  "general", "knowledge", "right", "correct", "wrong", "thing", "stuff",
  // Hype words
  "secret", "mystery", "mysterie", "hidden", "ultimate", "epic", "amazing", "awesome", "cool", "wow",
  "master", "expert", "smart", "brain",
]);

/**
 * Challenge promises a headline may only make when the episode actually contains them.
 * Trigger and evidence words are stemmed. Families with no evidence words and no supporting
 * layout/format are never supported (invented scores and difficulty claims).
 */
export const HEADLINE_CLAIM_FAMILIES: readonly HeadlineClaimFamily[] = [
  {
    id: "taste",
    triggers: ["taste", "tasty", "flavor", "flavour"],
    evidence: ["taste", "tasting", "flavor", "flavour", "tongue", "sour", "sweet", "salty", "bitter"],
  },
  {
    id: "hearing",
    triggers: ["hear", "listen", "sound"],
    evidence: ["hear", "hearing", "listen", "sound", "audio", "ear", "noise", "music"],
  },
  {
    id: "smell",
    triggers: ["smell", "sniff", "scent"],
    evidence: ["smell", "sniff", "scent", "aroma", "nose", "odor", "odour"],
  },
  {
    id: "authenticity",
    triggers: ["real", "fake"],
    // "real" alone is too common ("real light beams") to prove a real-vs-fake challenge exists.
    evidence: ["fake", "genuine", "authentic", "illusion", "imposter", "impostor", "counterfeit", "replica"],
  },
  {
    id: "odd_one_out",
    triggers: ["odd"],
    evidence: ["odd", "different", "difference"],
    supportingLayouts: ["odd_one_out"],
    supportingFormats: ["odd_one_out"],
  },
  {
    id: "timed",
    triggers: ["second", "timer"],
    evidence: ["second", "timer", "timed", "countdown"],
  },
  {
    id: "verdict",
    triggers: ["yes", "true", "false"],
    evidence: [],
    supportingLayouts: ["yes_no"],
    // "true_false" is the retired name of the yes_no format still stored on older episodes.
    supportingFormats: ["yes_no", "true_false"],
  },
  {
    id: "invented_score",
    triggers: ["iq", "percent", "fail", "genius", "impossible", "hardest"],
    evidence: [],
  },
];
