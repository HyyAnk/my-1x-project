/**
 * Detects verdict-style quizzes (True/False, Yes/No, Myth/Fact). Their two "choices" are answers,
 * not two pictured candidates, so they must never drive an A-vs-B comparison thumbnail.
 */

const VERDICT_FORMATS: ReadonlySet<string> = new Set(["yes_no", "true_false"]);

const VERDICT_CHOICE_WORDS: ReadonlySet<string> = new Set([
  "true", "false", "yes", "no", "right", "wrong", "correct", "incorrect", "fact", "myth", "real", "fake",
  "vrai", "faux", "oui", "non", "verdadero", "falso", "sí", "si", "richtig", "falsch", "ja", "nein",
  "waar", "onwaar", "nee", "sant", "usant", "sann", "falsk", "nej", "tosi", "epätosi", "kyllä", "ei",
  "はい", "いいえ", "正しい", "間違い", "예", "아니요", "맞다", "틀리다", "是", "否", "对", "错", "對", "錯",
]);

function normalizeChoice(choice: string): string {
  return choice.trim().toLowerCase().replace(/[.!?¡¿。！？]+$/u, "");
}

export function isVerdictFormat(questionFormat: string | null | undefined): boolean {
  return VERDICT_FORMATS.has((questionFormat ?? "").trim().toLowerCase());
}

export function isVerdictChoicePair(choices: readonly string[] | null | undefined): boolean {
  if (!choices || choices.length !== 2) return false;
  return choices.every((choice) => VERDICT_CHOICE_WORDS.has(normalizeChoice(choice)));
}
