import { normalizeLanguageCode } from "@studio/shared";

export interface QuizVoiceCopy {
  intro: string;
  topicTeaser: (count: number, topic: string) => string;
  subscribeCta: (channelName: string, customCtaText?: string) => string;
  question: (number: number, text: string) => string;
  choices: (choices: string[]) => string;
  thinking: readonly string[];
  reveal: (answer: string) => string;
  explanation: (text: string) => string;
  preOutro: (customText?: string) => string;
  outro: string;
}

export const ENGLISH_TOPIC_TEASER_VARIANTS = [
  (count: number, topic: string) => `Get ready, everyone! Today, we're taking on ${count} exciting mystery questions about ${topic}! Can you get every single one right?`,
  (count: number, topic: string) => `Welcome to the challenge! Today, we have ${count} awesome mystery questions about ${topic}! Let's see if you can score a perfect 100%!`,
  (count: number, topic: string) => `Fire up your brains! Today we're solving ${count} thrilling mystery questions about ${topic}! Let's jump right in!`,
] as const;

/** Played mid-video (after question 10), so the copy must not reference the start of the quiz. */
export const ENGLISH_SUBSCRIBE_CTA_VARIANTS = [
  (channel: string) => `Quick break! You're doing awesome! Smash that subscribe button for ${channel} and join our quiz crew so you never miss a challenge!`,
  (channel: string) => `Great job so far! If you're having fun, hit that subscribe button for ${channel} to unlock more brain-busting quizzes!`,
  (channel: string) => `Wow, look how far you've come! Tap subscribe for ${channel} right now so you never miss our next epic showdown!`,
] as const;

export const ENGLISH_KICKOFF_VARIANTS = [
  "Now, back to the quiz!",
  "Let's keep going!",
  "On to the next question!",
  "Ready? Let's go!",
] as const;

export const ENGLISH_OUTRO_CLOSING_VARIANTS = [
  "See you next time for even more fun! Bye bye!",
  "Catch you on the next challenge! Bye bye!",
  "See you next time, everybody! Bye bye!",
  "We'll see you on the next adventure! Bye bye!",
] as const;

export const CHINESE_TOPIC_TEASER_VARIANTS = [
  (count: number, topic: string) => `\u4eca\u5929\u6211\u4eec\u6709${count}\u9053\u5173\u4e8e${topic}\u7684\u7cbe\u5f69\u95ee\u9898\uff01\u4f60\u80fd\u5168\u90e8\u731c\u5bf9\u5417\uff1f`,
  (count: number, topic: string) => `\u51c6\u5907\u597d\u4e86\u5417\uff1f\u4eca\u5929\u6211\u4eec\u4e00\u8d77\u6311\u6218${count}\u9053\u5173\u4e8e${topic}\u7684\u6709\u8da3\u9898\u76ee\uff01`,
] as const;

export const CHINESE_SUBSCRIBE_CTA_VARIANTS = [
  (channel: string) => `\u4f60\u7b54\u5f97\u771f\u68d2\uff01\u522b\u5fd8\u4e86\u8ba2\u9605${channel}\uff0c\u4f53\u9a8c\u66f4\u591a\u6709\u8da3\u7684\u6311\u6218\uff01`,
  (channel: string) => `\u4f11\u606f\u4e00\u4e0b\uff01\u8bb0\u5f97\u8ba2\u9605${channel}\uff0c\u63a2\u7d22\u66f4\u591a\u7cbe\u5f69\u95ee\u7b54\uff01`,
] as const;

export const CHINESE_KICKOFF_VARIANTS = [
  "\u6211\u4eec\u7ee7\u7eed\u5427\uff01",
  "\u51c6\u5907\u597d\u4e86\u5417\uff1f\u51fa\u53d1\uff01",
  "\u6765\u5427\uff0c\u4e0b\u4e00\u9898\uff01",
] as const;

export const CHINESE_OUTRO_CLOSING_VARIANTS = [
  "\u4e0b\u6b21\u518d\u89c1\uff0c\u66f4\u591a\u7cbe\u5f69\u7b49\u7740\u4f60\uff01\u62dc\u62dc\uff01",
  "\u4e0b\u6b21\u6311\u6218\u89c1\uff01\u62dc\u62dc\uff01",
  "\u5927\u5bb6\u4e0b\u6b21\u89c1\uff01\u62dc\u62dc\uff01",
  "\u4e0b\u4e00\u6b21\u5192\u9669\u89c1\uff01\u62dc\u62dc\uff01",
] as const;

function selectVariantIndex(variantsCount: number, seed?: string): number {
  if (!seed || variantsCount <= 1) return 0;
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % variantsCount;
}

function selectClosing(variants: readonly string[], seed?: string): string {
  const index = selectVariantIndex(variants.length, seed);
  return variants[index] ?? variants[0] ?? "";
}

function formatFirstQuestion(text: string, prefix: string, isChinese = false): string {
  const trimmed = text.trim();
  if (/^(?:first\s+question|question\s+1|第[一1]题)[.:：\s]/i.test(trimmed)) {
    return trimmed;
  }
  return isChinese ? `${prefix}：${trimmed}` : `${prefix}: ${trimmed}`;
}

export function resolveOutroClosing(language: string, seed?: string): string {
  const variants = normalizeLanguageCode(language) === "zh" ? CHINESE_OUTRO_CLOSING_VARIANTS : ENGLISH_OUTRO_CLOSING_VARIANTS;
  return selectClosing(variants, seed);
}

export function resolveKickoffClosing(language: string, seed?: string): string {
  const variants = normalizeLanguageCode(language) === "zh" ? CHINESE_KICKOFF_VARIANTS : ENGLISH_KICKOFF_VARIANTS;
  return selectClosing(variants, seed);
}

function buildEnglishVoiceCopy(seed?: string): QuizVoiceCopy {
  const topicVariantIndex = selectVariantIndex(ENGLISH_TOPIC_TEASER_VARIANTS.length, seed);
  const ctaVariantIndex = selectVariantIndex(ENGLISH_SUBSCRIBE_CTA_VARIANTS.length, seed);

  return {
    intro: "Hey friends! Ready to test your brain? Let's jump right in!",
    topicTeaser: (count, topic) => {
      const template = ENGLISH_TOPIC_TEASER_VARIANTS[topicVariantIndex] ?? ENGLISH_TOPIC_TEASER_VARIANTS[0];
      return template(count, topic.trim());
    },
    subscribeCta: (channelName, customCtaText) => {
      if (customCtaText && customCtaText.trim()) return customCtaText.trim();
      const template = ENGLISH_SUBSCRIBE_CTA_VARIANTS[ctaVariantIndex] ?? ENGLISH_SUBSCRIBE_CTA_VARIANTS[0];
      const base = template(channelName.trim());
      const kickoff = selectClosing(ENGLISH_KICKOFF_VARIANTS, seed);
      return `${base} ${kickoff}`;
    },
    question: (number, text) => (number === 1 ? formatFirstQuestion(text, "First question") : text),
    choices: (choices) => (choices.length < 2 ? (choices[0] ?? "") : `${choices.slice(0, -1).join(", ")}, or ${choices.at(-1)}?`),
    thinking: ["Pick fast!", "Which one?", "What's your guess?", "Choose now!"],
    reveal: (answer) => `That's right! It's ${answer}!`,
    explanation: (text) => text,
    preOutro: (customText) =>
      customText && customText.trim()
        ? customText.trim()
        : "And that's the end of this quiz series! I bet you did amazing today!",
    outro: `How many did you get right? Leave your score in the comments below! Remember to like and subscribe for more fun quizzes. ${selectClosing(ENGLISH_OUTRO_CLOSING_VARIANTS, seed)}`,
  };
}

function buildChineseVoiceCopy(seed?: string): QuizVoiceCopy {
  const topicVariantIndex = selectVariantIndex(CHINESE_TOPIC_TEASER_VARIANTS.length, seed);
  const ctaVariantIndex = selectVariantIndex(CHINESE_SUBSCRIBE_CTA_VARIANTS.length, seed);

  return {
    intro: "\u670b\u53cb\u4eec\uff0c\u51c6\u5907\u597d\u6311\u6218\u5927\u8111\u4e86\u5417\uff1f\u9a6c\u4e0a\u5f00\u59cb\u5427\uff01",
    topicTeaser: (count, topic) => {
      const template = CHINESE_TOPIC_TEASER_VARIANTS[topicVariantIndex] ?? CHINESE_TOPIC_TEASER_VARIANTS[0];
      return template(count, topic.trim());
    },
    subscribeCta: (channelName, customCtaText) => {
      if (customCtaText && customCtaText.trim()) return customCtaText.trim();
      const template = CHINESE_SUBSCRIBE_CTA_VARIANTS[ctaVariantIndex] ?? CHINESE_SUBSCRIBE_CTA_VARIANTS[0];
      const base = template(channelName.trim());
      const kickoff = selectClosing(CHINESE_KICKOFF_VARIANTS, seed);
      return `${base} ${kickoff}`;
    },
    question: (number, text) => (number === 1 ? formatFirstQuestion(text, "\u7b2c\u4e00\u9898", true) : text),
    choices: (choices) =>
      choices.length < 2 ? (choices[0] ?? "") : `${choices.slice(0, -1).join("\u3001")}\uff0c\u8fd8\u662f${choices.at(-1)}\uff1f`,
    thinking: ["\u5feb\u9009\uff01", "\u4f60\u9009\u54ea\u4e2a\uff1f", "\u731c\u731c\u770b\uff01", "\u73b0\u5728\u9009\u62e9\uff01"],
    reveal: (answer) => `\u7b54\u5bf9\u4e86\uff01\u7b54\u6848\u662f${answer}\uff01`,
    explanation: (text) => text,
    preOutro: (customText) =>
      customText && customText.trim()
        ? customText.trim()
        : "\u8fd9\u5c31\u662f\u4eca\u5929\u7684\u5168\u90e8\u95ee\u7b54\u7cfb\u5217\u5566\uff01\u76f8\u4fe1\u4f60\u4eca\u5929\u8868\u73b0\u5f97\u8d85\u7ea7\u68d2\uff01",
    outro: `\u4f60\u7b54\u5bf9\u4e86\u591a\u5c11\u9898\uff1f\u5728\u8bc4\u8bba\u533a\u7559\u4e0b\u4f60\u7684\u5206\u6570\u5427\uff01\u8bb0\u5f97\u70b9\u8d5e\u5e76\u8ba2\u9605\uff0c\u4f53\u9a8c\u66f4\u591a\u6709\u8da3\u7684\u95ee\u7b54\u6311\u6218\u3002${selectClosing(CHINESE_OUTRO_CLOSING_VARIANTS, seed)}`,
  };
}

export function resolveQuizVoiceCopy(language: string, seed?: string): QuizVoiceCopy {
  return normalizeLanguageCode(language) === "zh" ? buildChineseVoiceCopy(seed) : buildEnglishVoiceCopy(seed);
}

