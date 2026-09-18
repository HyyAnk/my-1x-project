import type { Episode } from "@studio/shared";
import type { ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import type { CalculatedScoringTiers } from "./scoringTiers.js";
import { formatScoringRange } from "./scoringTiers.js";
import { RepositoryError } from "../../repository/errors.js";

export interface DescriptionLocaleDefinition {
  buildHookLines: (title: string, questionCount: number) => string;
  defaultHookLines: (title: string) => string;
  buildSemantic: (hook: string, title: string, localizationDesc?: string) => string;
  defaultSemantic: (hook: string, localizationDesc?: string) => string;
  scoringLabels: {
    beginner: string;
    intermediate: string;
    expert: string;
  };
  scoringDelimiter?: string;
  ctaText: string;
  suggestedPlaylistCategorySuffix?: string;
  hashtags: string[];
  includePremiseKeyword?: boolean;
}

export interface DescriptionDefaults {
  defaultHookLines?: string;
  defaultSemantic?: string;
  defaultBeginner: string;
  defaultIntermediate: string;
  defaultExpert: string;
  defaultCtaText: string;
}

export const DESCRIPTION_LOCALE_DICTIONARIES: Record<string, DescriptionLocaleDefinition> = {
  en: {
    buildHookLines: (title, count) =>
      `${title} - ${count} Question Challenge!\nTest your knowledge and see how many you can answer correctly.`,
    defaultHookLines: (title) => `${title}\nTest your memory and knowledge now!`,
    buildSemantic: (hook) => `${hook} Discover exciting trivia questions and fascinating facts in this video challenge.`,
    defaultSemantic: (hook) => `${hook} Challenge your mind with engaging questions!`,
    scoringLabels: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      expert: "Master",
    },
    ctaText: "How many did you get right? Comment below!",
    hashtags: ["#quiz", "#trivia", "#knowledge", "#test"],
    includePremiseKeyword: true,
  },
  de: {
    buildHookLines: (title, count) =>
      `${title} - ${count} Fragen!\nTeste dein Wissen und finde heraus, wie viele du richtig beantworten kannst.`,
    defaultHookLines: (title) => `${title}\nTeste jetzt dein Wissen!`,
    buildSemantic: (_hook, title, desc) => desc || `${title} Quiz.`,
    defaultSemantic: (hook, desc) => desc || `${hook} Teste dein Wissen mit spannenden Fragen!`,
    scoringLabels: {
      beginner: "Anfänger",
      intermediate: "Fortgeschritten",
      expert: "Meister",
    },
    ctaText: "Wie viele hast du richtig? Kommentiere unten!",
    hashtags: ["#quiz", "#trivia", "#wissen"],
  },
  fr: {
    buildHookLines: (title, count) =>
      `${title} - Défi ${count} Questions !\nTestez vos connaissances et voyez combien vous pouvez en réussir.`,
    defaultHookLines: (title) => `${title}\nTestez vos connaissances maintenant !`,
    buildSemantic: (_hook, title, desc) => desc || `${title} Quiz.`,
    defaultSemantic: (hook, desc) => desc || `${hook} Mettez votre esprit au défi avec des questions captivantes !`,
    scoringLabels: {
      beginner: "Débutant",
      intermediate: "Intermédiaire",
      expert: "Expert",
    },
    scoringDelimiter: " : ",
    ctaText: "Combien en avez-vous réussi ? Commentez ci-dessous !",
    hashtags: ["#quiz", "#trivia", "#connaissance"],
  },
  es: {
    buildHookLines: (title, count) =>
      `${title} - ¡Desafío de ${count} preguntas!\nPon a prueba tus conocimientos y mira cuántas puedes acertar.`,
    defaultHookLines: (title) => `${title}\n¡Pon a prueba tu memoria y conocimientos ahora!`,
    buildSemantic: (_hook, title, desc) => desc || `${title} Quiz.`,
    defaultSemantic: (hook, desc) => desc || `${hook} ¡Desafía tu mente con preguntas interesantes!`,
    scoringLabels: {
      beginner: "Principiante",
      intermediate: "Intermedio",
      expert: "Maestro",
    },
    ctaText: "¿Cuántas acertaste? ¡Comenta abajo!",
    hashtags: ["#quiz", "#trivia", "#conocimiento", "#preguntas"],
  },
  it: {
    buildHookLines: (title, count) =>
      `${title} - Sfida di ${count} domande!\nMetti alla prova le tue conoscenze e scopri quante ne indovini.`,
    defaultHookLines: (title) => `${title}\nMetti alla prova la tua memoria e conoscenza ora!`,
    buildSemantic: (_hook, title, desc) => desc || `${title} Quiz.`,
    defaultSemantic: (hook, desc) => desc || `${hook} Sfida la tua mente con domande coinvolgenti!`,
    scoringLabels: {
      beginner: "Principiante",
      intermediate: "Intermedio",
      expert: "Maestro",
    },
    ctaText: "Quante ne hai indovinate? Commenta qui sotto!",
    hashtags: ["#quiz", "#trivia", "#cultura", "#domande"],
  },
  pt: {
    buildHookLines: (title, count) =>
      `${title} - Desafio de ${count} perguntas!\nTeste seus conhecimentos e veja quantas você consegue acertar.`,
    defaultHookLines: (title) => `${title}\nTeste sua memória e conhecimento agora!`,
    buildSemantic: (_hook, title, desc) => desc || `${title} Quiz.`,
    defaultSemantic: (hook, desc) => desc || `${hook} Desafie sua mente com perguntas envolventes!`,
    scoringLabels: {
      beginner: "Iniciante",
      intermediate: "Intermediário",
      expert: "Mestre",
    },
    ctaText: "Quantas você acertou? Comente abaixo!",
    hashtags: ["#quiz", "#trivia", "#conhecimento", "#perguntas"],
  },
  nl: {
    buildHookLines: (title, count) =>
      `${title} - ${count} vragen uitdaging!\nTest je kennis en ontdek hoeveel je er goed kunt beantwoorden.`,
    defaultHookLines: (title) => `${title}\nTest nu je geheugen en kennis!`,
    buildSemantic: (_hook, title, desc) => desc || `${title} Quiz.`,
    defaultSemantic: (hook, desc) => desc || `${hook} Daag je brein uit met boeiende vragen!`,
    scoringLabels: {
      beginner: "Beginner",
      intermediate: "Gevorderd",
      expert: "Meester",
    },
    ctaText: "Hoeveel had je er goed? Laat het weten in de reacties!",
    hashtags: ["#quiz", "#trivia", "#kennis"],
  },
  ja: {
    buildHookLines: (title, count) => `${title} - ${count}問クイズチャレンジ！\nあなたの知識を試して、何問正解できるか挑戦してみましょう。`,
    defaultHookLines: (title) => `${title}\n今すぐあなたの記憶力と知識を試してみましょう！`,
    buildSemantic: (_hook, title, desc) => desc || `${title} クイズ`,
    defaultSemantic: (hook, desc) => desc || `${hook} 魅力的なクイズで頭脳に挑戦しましょう！`,
    scoringLabels: {
      beginner: "初級",
      intermediate: "中級",
      expert: "達人",
    },
    ctaText: "何問正解できましたか？コメントで教えてください！",
    hashtags: ["#クイズ", "#雑学", "#知識"],
  },
  ko: {
    buildHookLines: (title, count) => `${title} - ${count}문제 퀴즈 챌린지!\n지식을 시험하고 몇 문제를 맞힐 수 있는지 확인해보세요.`,
    defaultHookLines: (title) => `${title}\n지금 바로 기억력과 지식을 시험해보세요!`,
    buildSemantic: (_hook, title, desc) => desc || `${title} 퀴즈`,
    defaultSemantic: (hook, desc) => desc || `${hook} 흥미진진한 퀴즈로 두뇌를 자극해보세요!`,
    scoringLabels: {
      beginner: "초급",
      intermediate: "중급",
      expert: "마스터",
    },
    ctaText: "몇 문제를 맞히셨나요? 댓글로 남겨주세요!",
    hashtags: ["#퀴즈", "#상식", "#퀴즈챌린지"],
  },
  zh: {
    buildHookLines: (title, count) => `${title} - ${count}道题目挑战！\n测试你的知识，看看你能答对多少道题。`,
    defaultHookLines: (title) => `${title}\n立即测试你的记忆力与知识！`,
    buildSemantic: (_hook, title, desc) => desc || `${title} 问答`,
    defaultSemantic: (hook, desc) => desc || `${hook} 用有趣的题目挑战你的思维！`,
    scoringLabels: {
      beginner: "初级",
      intermediate: "中级",
      expert: "大师",
    },
    ctaText: "你答对了多少题？在评论区留言吧！",
    hashtags: ["#问答", "#知识", "#益智"],
  },
};

/**
 * Builds grounded fallback description metadata when LLM execution fails.
 */
export function buildFallbackDescription(
  normLang: string,
  episode: Episode,
  questionCount: number,
  tiers: CalculatedScoringTiers,
  localization?: ProductLocalizationArtifact | null,
  error?: unknown,
): Record<string, unknown> {
  const locale = DESCRIPTION_LOCALE_DICTIONARIES[normLang];
  if (!locale) {
    throw new RepositoryError(
      `DESCRIPTION_LOCALIZATION_FAILED: Provider failed and no verified fallback available for target language: "${normLang}"`,
      "DESCRIPTION_LOCALIZATION_FAILED",
      { cause: error },
    );
  }

  const delimiter = locale.scoringDelimiter ?? ": ";
  const tier1Range = formatScoringRange(tiers.tier1.min, tiers.tier1.max, normLang);
  const tier2Range = formatScoringRange(tiers.tier2.min, tiers.tier2.max, normLang);
  const tier3Range = formatScoringRange(tiers.tier3.min, tiers.tier3.max, normLang);

  const hookTitle = normLang === "en" ? episode.topic.title : localization?.thumbnail_text || episode.topic.title;
  const fallbackHook = locale.buildHookLines(hookTitle, questionCount);
  const fallbackSemantic = locale.buildSemantic(episode.topic.hook, episode.topic.title, localization?.video_description);

  return {
    topic_category: episode.topic.title,
    primary_keyword: hookTitle.toLowerCase(),
    keyword_variations: locale.includePremiseKeyword ? [episode.topic.premise] : [],
    hook_lines: fallbackHook,
    semantic_paragraph: fallbackSemantic,
    scoring_cta: {
      beginner: `${tier1Range}${delimiter}${locale.scoringLabels.beginner}`,
      intermediate: `${tier2Range}${delimiter}${locale.scoringLabels.intermediate}`,
      expert: `${tier3Range}${delimiter}${locale.scoringLabels.expert}`,
      cta_text: locale.ctaText,
    },
    suggested_playlist_category: episode.topic.title,
    hashtags: locale.hashtags,
  };
}

/**
 * Resolves localized defaults for missing description fields.
 */
export function resolveDescriptionDefaults(
  normLang: string,
  episode: Episode,
  tiers: CalculatedScoringTiers,
  localization?: ProductLocalizationArtifact | null,
): DescriptionDefaults {
  const locale = DESCRIPTION_LOCALE_DICTIONARIES[normLang];
  const tier1Range = formatScoringRange(tiers.tier1.min, tiers.tier1.max, normLang);
  const tier2Range = formatScoringRange(tiers.tier2.min, tiers.tier2.max, normLang);
  const tier3Range = formatScoringRange(tiers.tier3.min, tiers.tier3.max, normLang);

  if (!locale) {
    return {
      defaultHookLines: undefined,
      defaultSemantic: undefined,
      defaultBeginner: `${tier1Range}: Beginner`,
      defaultIntermediate: `${tier2Range}: Intermediate`,
      defaultExpert: `${tier3Range}: Master`,
      defaultCtaText: "How many did you get right? Comment below!",
    };
  }

  const delimiter = locale.scoringDelimiter ?? ": ";
  const hookTitle = normLang === "en" ? episode.topic.title : localization?.thumbnail_text || episode.topic.title;

  return {
    defaultHookLines: locale.defaultHookLines(hookTitle),
    defaultSemantic: locale.defaultSemantic(episode.topic.hook, localization?.video_description),
    defaultBeginner: `${tier1Range}${delimiter}${locale.scoringLabels.beginner}`,
    defaultIntermediate: `${tier2Range}${delimiter}${locale.scoringLabels.intermediate}`,
    defaultExpert: `${tier3Range}${delimiter}${locale.scoringLabels.expert}`,
    defaultCtaText: locale.ctaText,
  };
}
