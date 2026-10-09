import { normalizeTargetLanguage } from "../bank/localization/productLocalization.js";
import type { DescriptionSectionLocale } from "./description.types.js";

const LATIN_SPACER = " ";
const CJK_SPACER = "";

export const DESCRIPTION_SECTION_LOCALES: Record<string, DescriptionSectionLocale> = {
  en: {
    scoringHeader: "🏆 SCORING TIERS:",
    playlistHeader: "📂 Playlist Category:",
    chaptersHeader: "⏱️ CHAPTERS:",
    chapterLabels: { intro: "Intro", question: (n) => `Question ${n}`, results: "Final Score" },
    scoreUnit: { one: "point", other: "points", spacer: LATIN_SPACER },
    kidsCtaText: "Keep score, then challenge your family to beat it!",
    commentRequestPattern: /\bcomment/i,
  },
  de: {
    scoringHeader: "🏆 PUNKTESTUFEN:",
    playlistHeader: "📂 Playlist-Kategorie:",
    chaptersHeader: "⏱️ KAPITEL:",
    chapterLabels: { intro: "Intro", question: (n) => `Frage ${n}`, results: "Endergebnis" },
    scoreUnit: { one: "Punkt", other: "Punkte", spacer: LATIN_SPACER },
    kidsCtaText: "Zähl deine Punkte und fordere deine Familie heraus!",
    commentRequestPattern: /kommentar|kommentier/i,
  },
  fr: {
    scoringHeader: "🏆 BARÈME DE SCORE :",
    playlistHeader: "📂 Catégorie de playlist :",
    chaptersHeader: "⏱️ CHAPITRES :",
    chapterLabels: { intro: "Intro", question: (n) => `Question ${n}`, results: "Score final" },
    scoreUnit: { one: "point", other: "points", spacer: LATIN_SPACER, zeroIsSingular: true },
    kidsCtaText: "Compte tes points et défie ta famille !",
    commentRequestPattern: /commentaire|comment(?:ez|e)\b/i,
  },
  es: {
    scoringHeader: "🏆 NIVELES DE PUNTUACIÓN:",
    playlistHeader: "📂 Categoría de playlist:",
    chaptersHeader: "⏱️ CAPÍTULOS:",
    chapterLabels: { intro: "Intro", question: (n) => `Pregunta ${n}`, results: "Puntuación final" },
    scoreUnit: { one: "punto", other: "puntos", spacer: LATIN_SPACER },
    kidsCtaText: "¡Cuenta tus puntos y reta a tu familia!",
    commentRequestPattern: /coment/i,
  },
  it: {
    scoringHeader: "🏆 LIVELLI DI PUNTEGGIO:",
    playlistHeader: "📂 Categoria playlist:",
    chaptersHeader: "⏱️ CAPITOLI:",
    chapterLabels: { intro: "Intro", question: (n) => `Domanda ${n}`, results: "Punteggio finale" },
    scoreUnit: { one: "punto", other: "punti", spacer: LATIN_SPACER },
    kidsCtaText: "Conta i tuoi punti e sfida la tua famiglia!",
    commentRequestPattern: /comment/i,
  },
  pt: {
    scoringHeader: "🏆 NÍVEIS DE PONTUAÇÃO:",
    playlistHeader: "📂 Categoria da playlist:",
    chaptersHeader: "⏱️ CAPÍTULOS:",
    chapterLabels: { intro: "Intro", question: (n) => `Pergunta ${n}`, results: "Pontuação final" },
    scoreUnit: { one: "ponto", other: "pontos", spacer: LATIN_SPACER },
    kidsCtaText: "Conte seus pontos e desafie sua família!",
    commentRequestPattern: /coment/i,
  },
  nl: {
    scoringHeader: "🏆 SCORENIVEAUS:",
    playlistHeader: "📂 Playlistcategorie:",
    chaptersHeader: "⏱️ HOOFDSTUKKEN:",
    chapterLabels: { intro: "Intro", question: (n) => `Vraag ${n}`, results: "Eindscore" },
    scoreUnit: { one: "punt", other: "punten", spacer: LATIN_SPACER },
    kidsCtaText: "Tel je punten en daag je familie uit!",
    commentRequestPattern: /reactie|comment/i,
  },
  ja: {
    scoringHeader: "🏆 スコア評価：",
    playlistHeader: "📂 再生リストカテゴリ：",
    chaptersHeader: "⏱️ チャプター：",
    chapterLabels: { intro: "イントロ", question: (n) => `第${n}問`, results: "結果発表" },
    scoreUnit: { one: "点", other: "点", spacer: CJK_SPACER },
    kidsCtaText: "点数を数えて、家族と勝負してみよう！",
    commentRequestPattern: /コメント/,
  },
  ko: {
    scoringHeader: "🏆 점수 등급:",
    playlistHeader: "📂 재생목록 카테고리:",
    chaptersHeader: "⏱️ 챕터:",
    chapterLabels: { intro: "인트로", question: (n) => `${n}번 문제`, results: "최종 점수" },
    scoreUnit: { one: "점", other: "점", spacer: CJK_SPACER },
    kidsCtaText: "점수를 세어 보고 가족과 대결해 보세요!",
    commentRequestPattern: /댓글/,
  },
  zh: {
    scoringHeader: "🏆 得分等级：",
    playlistHeader: "📂 播放列表分类：",
    chaptersHeader: "⏱️ 章节：",
    chapterLabels: { intro: "开场", question: (n) => `第${n}题`, results: "最终得分" },
    scoreUnit: { one: "分", other: "分", spacer: CJK_SPACER },
    kidsCtaText: "数一数你的得分，和家人比一比吧！",
    commentRequestPattern: /评论|留言/,
  },
};

const DEFAULT_SECTION_LANGUAGE = "en";

/**
 * Maps a language name or code ("English", "de-DE", "fr") to a section dictionary key,
 * falling back to English for languages without a verified dictionary.
 */
export function resolveDescriptionLanguageKey(language?: string): string {
  const raw = (language || DEFAULT_SECTION_LANGUAGE).trim().toLowerCase();
  const rawBase = raw.split(/[-_]/)[0];
  if (DESCRIPTION_SECTION_LOCALES[rawBase]) return rawBase;
  try {
    const normalized = normalizeTargetLanguage(raw);
    return DESCRIPTION_SECTION_LOCALES[normalized] ? normalized : DEFAULT_SECTION_LANGUAGE;
  } catch {
    return DEFAULT_SECTION_LANGUAGE;
  }
}

export function getDescriptionSectionLocale(language?: string): DescriptionSectionLocale {
  return DESCRIPTION_SECTION_LOCALES[resolveDescriptionLanguageKey(language)];
}

/** Every localized chapter header, used to find stale chapter blocks in edited text. */
export const ALL_CHAPTER_HEADERS: readonly string[] = Object.values(DESCRIPTION_SECTION_LOCALES).map((locale) => locale.chaptersHeader);

/** Every localized scoring header, used as the insertion anchor for chapter blocks. */
export const ALL_SCORING_HEADERS: readonly string[] = Object.values(DESCRIPTION_SECTION_LOCALES).map((locale) => locale.scoringHeader);
