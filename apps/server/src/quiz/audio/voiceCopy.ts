import { normalizeLanguageCode } from "@studio/shared";

export interface QuizVoiceCopy {
  intro: string;
  question: (number: number, text: string) => string;
  choices: (choices: string[]) => string;
  thinking: readonly string[];
  reveal: (answer: string) => string;
  explanation: (text: string) => string;
  outro: string;
}

export const ENGLISH_OUTRO_CLOSING_VARIANTS = [
  "See you next time for even more fun! Bye bye!",
  "Catch you on the next challenge! Bye bye!",
  "See you next time, everybody! Bye bye!",
  "We'll see you on the next adventure! Bye bye!",
] as const;

export const CHINESE_OUTRO_CLOSING_VARIANTS = [
  "\u4e0b\u6b21\u518d\u89c1\uff0c\u66f4\u591a\u7cbe\u5f69\u7b49\u7740\u4f60\uff01\u62dc\u62dc\uff01",
  "\u4e0b\u6b21\u6311\u6218\u89c1\uff01\u62dc\u62dc\uff01",
  "\u5927\u5bb6\u4e0b\u6b21\u89c1\uff01\u62dc\u62dc\uff01",
  "\u4e0b\u4e00\u6b21\u5192\u9669\u89c1\uff01\u62dc\u62dc\uff01",
] as const;

function selectClosing(variants: readonly string[], seed?: string): string {
  if (!seed) return variants[0] ?? "";
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return variants[hash % variants.length] ?? variants[0] ?? "";
}

export function resolveOutroClosing(language: string, seed?: string): string {
  const variants = normalizeLanguageCode(language) === "zh" ? CHINESE_OUTRO_CLOSING_VARIANTS : ENGLISH_OUTRO_CLOSING_VARIANTS;
  return selectClosing(variants, seed);
}

function buildEnglishVoiceCopy(seed?: string): QuizVoiceCopy {
  return {
    intro: "Hey friends! Ready to test your brain? Let's jump right in!",
    question: (_number, text) => text,
    choices: (choices) => (choices.length < 2 ? (choices[0] ?? "") : `${choices.slice(0, -1).join(", ")}, or ${choices.at(-1)}?`),
    thinking: ["Pick fast!", "Which one?", "What's your guess?", "Choose now!"],
    reveal: (answer) => `That's right! It's ${answer}!`,
    explanation: (text) => text,
    outro: `How many did you get right? Leave your score in the comments below! Remember to like and subscribe for more fun quizzes. ${selectClosing(ENGLISH_OUTRO_CLOSING_VARIANTS, seed)}`,
  };
}

function buildChineseVoiceCopy(seed?: string): QuizVoiceCopy {
  return {
    intro: "\u670b\u53cb\u4eec\uff0c\u51c6\u5907\u597d\u6311\u6218\u5927\u8111\u4e86\u5417\uff1f\u9a6c\u4e0a\u5f00\u59cb\u5427\uff01",
    question: (_number, text) => text,
    choices: (choices) =>
      choices.length < 2 ? (choices[0] ?? "") : `${choices.slice(0, -1).join("\u3001")}\uff0c\u8fd8\u662f${choices.at(-1)}\uff1f`,
    thinking: ["\u5feb\u9009\uff01", "\u4f60\u9009\u54ea\u4e2a\uff1f", "\u731c\u731c\u770b\uff01", "\u73b0\u5728\u9009\u62e9\uff01"],
    reveal: (answer) => `\u7b54\u5bf9\u4e86\uff01\u7b54\u6848\u662f${answer}\uff01`,
    explanation: (text) => text,
    outro: `\u4f60\u7b54\u5bf9\u4e86\u591a\u5c11\u9898\uff1f\u5728\u8bc4\u8bba\u533a\u7559\u4e0b\u4f60\u7684\u5206\u6570\u5427\uff01\u8bb0\u5f97\u70b9\u8d5e\u5e76\u8ba2\u9605\uff0c\u4f53\u9a8c\u66f4\u591a\u6709\u8da3\u7684\u95ee\u7b54\u6311\u6218\u3002${selectClosing(CHINESE_OUTRO_CLOSING_VARIANTS, seed)}`,
  };
}

export function resolveQuizVoiceCopy(language: string, seed?: string): QuizVoiceCopy {
  return normalizeLanguageCode(language) === "zh" ? buildChineseVoiceCopy(seed) : buildEnglishVoiceCopy(seed);
}
