import { normalizeTargetLanguage } from "../bank/localization/productLocalization.js";
import type { DescriptionSectionLocale } from "./description.types.js";

const LATIN_SPACER = " ";
const CJK_SPACER = "";

export const DESCRIPTION_SECTION_LOCALES: Record<string, DescriptionSectionLocale> = {
  en: {
    scoringHeader: "🏆 SCORING TIERS:",
    footerLabels: { morePlaylist: "▶️ More quizzes like this:", subscribe: "🔔 Subscribe for new quizzes:", about: "ℹ️ About" },
    fallbackTeaserLead: "Inside this challenge:",
    chaptersHeader: "⏱️ CHAPTERS:",
    chapterLabels: { intro: "Intro", question: (n) => `Question ${n}`, results: "Final Score" },
    scoreUnit: { one: "point", other: "points", spacer: LATIN_SPACER },
    kidsCtaText: "Keep score, then challenge your family to beat it!",
    commentRequestPattern: /\bcomment/i,
  },
  de: {
    scoringHeader: "🏆 PUNKTESTUFEN:",
    footerLabels: { morePlaylist: "▶️ Mehr Quizze wie dieses:", subscribe: "🔔 Abonniere für neue Quizze:", about: "ℹ️ Über" },
    fallbackTeaserLead: "In dieser Challenge:",
    chaptersHeader: "⏱️ KAPITEL:",
    chapterLabels: { intro: "Intro", question: (n) => `Frage ${n}`, results: "Endergebnis" },
    scoreUnit: { one: "Punkt", other: "Punkte", spacer: LATIN_SPACER },
    kidsCtaText: "Zähl deine Punkte und fordere deine Familie heraus!",
    commentRequestPattern: /kommentar|kommentier/i,
  },
  fr: {
    scoringHeader: "🏆 BARÈME DE SCORE :",
    footerLabels: {
      morePlaylist: "▶️ Plus de quiz comme celui-ci :",
      subscribe: "🔔 Abonne-toi pour de nouveaux quiz :",
      about: "ℹ️ À propos de",
    },
    fallbackTeaserLead: "Au programme de ce défi :",
    chaptersHeader: "⏱️ CHAPITRES :",
    chapterLabels: { intro: "Intro", question: (n) => `Question ${n}`, results: "Score final" },
    scoreUnit: { one: "point", other: "points", spacer: LATIN_SPACER, zeroIsSingular: true },
    kidsCtaText: "Compte tes points et défie ta famille !",
    commentRequestPattern: /commentaire|comment(?:ez|e)\b/i,
  },
  es: {
    scoringHeader: "🏆 NIVELES DE PUNTUACIÓN:",
    footerLabels: { morePlaylist: "▶️ Más quizzes como este:", subscribe: "🔔 Suscríbete para nuevos quizzes:", about: "ℹ️ Sobre" },
    fallbackTeaserLead: "En este desafío:",
    chaptersHeader: "⏱️ CAPÍTULOS:",
    chapterLabels: { intro: "Intro", question: (n) => `Pregunta ${n}`, results: "Puntuación final" },
    scoreUnit: { one: "punto", other: "puntos", spacer: LATIN_SPACER },
    kidsCtaText: "¡Cuenta tus puntos y reta a tu familia!",
    commentRequestPattern: /coment/i,
  },
  it: {
    scoringHeader: "🏆 LIVELLI DI PUNTEGGIO:",
    footerLabels: { morePlaylist: "▶️ Altri quiz come questo:", subscribe: "🔔 Iscriviti per nuovi quiz:", about: "ℹ️ Chi è" },
    fallbackTeaserLead: "In questa sfida:",
    chaptersHeader: "⏱️ CAPITOLI:",
    chapterLabels: { intro: "Intro", question: (n) => `Domanda ${n}`, results: "Punteggio finale" },
    scoreUnit: { one: "punto", other: "punti", spacer: LATIN_SPACER },
    kidsCtaText: "Conta i tuoi punti e sfida la tua famiglia!",
    commentRequestPattern: /comment/i,
  },
  pt: {
    scoringHeader: "🏆 NÍVEIS DE PONTUAÇÃO:",
    footerLabels: { morePlaylist: "▶️ Mais quizzes como este:", subscribe: "🔔 Inscreva-se para novos quizzes:", about: "ℹ️ Sobre" },
    fallbackTeaserLead: "Neste desafio:",
    chaptersHeader: "⏱️ CAPÍTULOS:",
    chapterLabels: { intro: "Intro", question: (n) => `Pergunta ${n}`, results: "Pontuação final" },
    scoreUnit: { one: "ponto", other: "pontos", spacer: LATIN_SPACER },
    kidsCtaText: "Conte seus pontos e desafie sua família!",
    commentRequestPattern: /coment/i,
  },
  nl: {
    scoringHeader: "🏆 SCORENIVEAUS:",
    footerLabels: { morePlaylist: "▶️ Meer quizzen zoals deze:", subscribe: "🔔 Abonneer voor nieuwe quizzen:", about: "ℹ️ Over" },
    fallbackTeaserLead: "In deze uitdaging:",
    chaptersHeader: "⏱️ HOOFDSTUKKEN:",
    chapterLabels: { intro: "Intro", question: (n) => `Vraag ${n}`, results: "Eindscore" },
    scoreUnit: { one: "punt", other: "punten", spacer: LATIN_SPACER },
    kidsCtaText: "Tel je punten en daag je familie uit!",
    commentRequestPattern: /reactie|comment/i,
  },
  ja: {
    scoringHeader: "🏆 スコア評価：",
    footerLabels: { morePlaylist: "▶️ 同じようなクイズはこちら：", subscribe: "🔔 チャンネル登録で新作クイズをチェック：", about: "ℹ️" },
    fallbackTeaserLead: "このチャレンジの問題：",
    chaptersHeader: "⏱️ チャプター：",
    chapterLabels: { intro: "イントロ", question: (n) => `第${n}問`, results: "結果発表" },
    scoreUnit: { one: "点", other: "点", spacer: CJK_SPACER },
    kidsCtaText: "点数を数えて、家族と勝負してみよう！",
    commentRequestPattern: /コメント/,
  },
  ko: {
    scoringHeader: "🏆 점수 등급:",
    footerLabels: { morePlaylist: "▶️ 비슷한 퀴즈 더 보기:", subscribe: "🔔 구독하고 새 퀴즈 받아보기:", about: "ℹ️" },
    fallbackTeaserLead: "이번 챌린지 문제:",
    chaptersHeader: "⏱️ 챕터:",
    chapterLabels: { intro: "인트로", question: (n) => `${n}번 문제`, results: "최종 점수" },
    scoreUnit: { one: "점", other: "점", spacer: CJK_SPACER },
    kidsCtaText: "점수를 세어 보고 가족과 대결해 보세요!",
    commentRequestPattern: /댓글/,
  },
  zh: {
    scoringHeader: "🏆 得分等级：",
    footerLabels: { morePlaylist: "▶️ 更多同类问答：", subscribe: "🔔 订阅获取最新问答：", about: "ℹ️ 关于" },
    fallbackTeaserLead: "本期挑战题目：",
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
