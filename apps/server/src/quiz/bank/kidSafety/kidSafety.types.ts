export type KidSafetyCategory =
  "mature_franchise" | "alcohol" | "tobacco_drugs" | "gambling" | "graphic_violence" | "horror" | "sexual_content";

export type KidSafetyField = "question" | "choices" | "explanation" | "fun_fact";

export interface KidSafetyFinding {
  category: KidSafetyCategory;
  /** The exact text fragment that triggered the finding. */
  term: string;
  field: KidSafetyField;
}

/** The viewer-facing text of a bank question: everything shown on screen or read aloud. */
export interface KidSafetyScreenableQuestion {
  question: string;
  choices: ReadonlyArray<{ text: string }>;
  explanation?: string;
  fun_fact?: string;
}

/** The descriptive text of a Knowledge Base entity that drives question generation. */
export interface KidSafetyScreenableEntity {
  name: string;
  aliases?: string[];
  core_traits?: string[];
  visual_anchor?: string;
}
