/** Rules every LLM prompt follows when choosing the on-screen highlight phrase of a quiz question. */
export const QUESTION_HIGHLIGHT_RULE_LINES: readonly string[] = [
  "1. EXACT COPY: Copy it character for character from the question text (same spelling, same casing). It must be ONE contiguous span of the question.",
  '2. KEEP COMPOUND TERMS WHOLE: Highlight complete names and noun phrases, never just their first word (e.g. "Iced tea" not "Iced", "black hole" not "black", "Spy x Family" not "Spy", "top speed" not "top").',
  "3. MEANINGFUL FOCUS: Pick the clue that carries the question's meaning (the subject, trait, or twist the viewer must notice). Never pick filler words such as which, what, is, does, or a franchise prefix when the real clue lies elsewhere.",
  "4. SHORT: 1 to 4 words. Never the whole question, and never words that give away the correct answer.",
];
