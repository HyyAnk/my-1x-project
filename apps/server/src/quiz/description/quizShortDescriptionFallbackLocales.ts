import type { SupportedBaseLanguage } from "../bank/localization/localization.types.js";

/** Hashtags every Quiz Short description carries, whatever the language. */
export const QUIZ_SHORT_REQUIRED_HASHTAGS = ["#Shorts", "#quiz"] as const;
export const QUIZ_SHORT_SCORE_CTA_EN = "Comment how many you got right!";

export interface QuizShortDescriptionLocale {
  /** Two short hook lines: the topic and the challenge. */
  buildHookLines: (title: string, questionCount: number) => string;
  /** One teaser sentence built from the first (hook) question, never from an answer. */
  buildTeaser: (hookQuestion: string) => string;
  /** The score call to action sentence. */
  scoreCta: string;
  hashtags: string[];
}

export const QUIZ_SHORT_DESCRIPTION_LOCALES: Record<SupportedBaseLanguage, QuizShortDescriptionLocale> = {
  en: {
    buildHookLines: (title, count) => `${title} quiz: ${count} quick questions!\nCan you get them all right before the timer runs out?`,
    buildTeaser: (hookQuestion) => `It starts with this one: ${hookQuestion}`,
    scoreCta: QUIZ_SHORT_SCORE_CTA_EN,
    hashtags: ["#Shorts", "#quiz", "#trivia"],
  },
  de: {
    buildHookLines: (title, count) => `${title} Quiz: ${count} schnelle Fragen!\nSchaffst du alle, bevor die Zeit abläuft?`,
    buildTeaser: (hookQuestion) => `Es beginnt mit dieser Frage: ${hookQuestion}`,
    scoreCta: "Kommentiere, wie viele du richtig hattest!",
    hashtags: ["#Shorts", "#quiz", "#wissen"],
  },
  fr: {
    buildHookLines: (title, count) => `Quiz ${title} : ${count} questions rapides !\nPeux-tu toutes les réussir avant la fin du chrono ?`,
    buildTeaser: (hookQuestion) => `Ça commence par celle-ci : ${hookQuestion}`,
    scoreCta: "Dis en commentaire combien tu en as eu de bonnes !",
    hashtags: ["#Shorts", "#quiz", "#culture"],
  },
  es: {
    buildHookLines: (title, count) =>
      `Quiz de ${title}: ¡${count} preguntas rápidas!\n¿Puedes acertarlas todas antes de que acabe el tiempo?`,
    buildTeaser: (hookQuestion) => `Empieza con esta: ${hookQuestion}`,
    scoreCta: "¡Comenta cuántas acertaste!",
    hashtags: ["#Shorts", "#quiz", "#trivia"],
  },
  it: {
    buildHookLines: (title, count) => `Quiz ${title}: ${count} domande veloci!\nRiesci a indovinarle tutte prima che scada il tempo?`,
    buildTeaser: (hookQuestion) => `Si parte con questa: ${hookQuestion}`,
    scoreCta: "Scrivi nei commenti quante ne hai indovinate!",
    hashtags: ["#Shorts", "#quiz", "#trivia"],
  },
  pt: {
    buildHookLines: (title, count) => `Quiz de ${title}: ${count} perguntas rápidas!\nVocê acerta todas antes do tempo acabar?`,
    buildTeaser: (hookQuestion) => `Começa com esta: ${hookQuestion}`,
    scoreCta: "Comente quantas você acertou!",
    hashtags: ["#Shorts", "#quiz", "#trivia"],
  },
  ja: {
    buildHookLines: (title, count) => `${title}クイズ：全${count}問！\n時間内に全問正解できる？`,
    buildTeaser: (hookQuestion) => `最初の問題はこちら：${hookQuestion}`,
    scoreCta: "何問正解できたかコメントしてね！",
    hashtags: ["#Shorts", "#quiz", "#クイズ"],
  },
  ko: {
    buildHookLines: (title, count) => `${title} 퀴즈: ${count}문제!\n시간 안에 다 맞힐 수 있을까?`,
    buildTeaser: (hookQuestion) => `첫 문제는 이것: ${hookQuestion}`,
    scoreCta: "몇 개 맞혔는지 댓글로 알려 주세요!",
    hashtags: ["#Shorts", "#quiz", "#퀴즈"],
  },
  zh: {
    buildHookLines: (title, count) => `${title}问答：${count}道快问快答！\n你能在倒计时结束前全部答对吗？`,
    buildTeaser: (hookQuestion) => `第一题就是：${hookQuestion}`,
    scoreCta: "在评论区告诉我们你答对了几道！",
    hashtags: ["#Shorts", "#quiz", "#问答"],
  },
};

export function resolveQuizShortDescriptionLocale(language: SupportedBaseLanguage): QuizShortDescriptionLocale {
  return QUIZ_SHORT_DESCRIPTION_LOCALES[language] ?? QUIZ_SHORT_DESCRIPTION_LOCALES.en;
}
