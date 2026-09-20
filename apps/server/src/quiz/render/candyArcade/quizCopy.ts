import { normalizeLanguageCode } from "@studio/shared";

export interface Copy {
  quizTime: string;
  ready: string;
  questions: (count: number) => string;
  question: string;
  getReady: string;
  choose: string;
  time: string;
  correct: string;
  why: string;
  funFact: string;
  final: string;
  scorePrompt: string;
  playAgain: string;
  exploreMore: string;
  ctaComment: string;
  ctaLike: string;
  ctaSubscribe: string;
}

function englishCopy(): Copy {
  return {
    quizTime: "QUIZ TIME",
    ready: "Ready to play?",
    questions: (count: number) => (count === 1 ? "question" : "questions to explore"),
    question: "Question",
    getReady: "Look closely and get ready!",
    choose: "Choose one",
    time: "Final seconds!",
    correct: "That's right!",
    why: "Did you know?",
    funFact: "Did you know?",
    final: "Final challenge",
    scorePrompt: "How many did you get right?",
    playAgain: "Play again soon",
    exploreMore: "Many more questions to explore",
    ctaComment: "Comment",
    ctaLike: "Like",
    ctaSubscribe: "Subscribe",
  };
}

function chineseCopy(): Copy {
  return {
    quizTime: "\u95ee\u7b54\u65f6\u95f4",
    ready: "\u51c6\u5907\u597d\u4e86\u5417\uff1f",
    questions: () => "\u9053\u9898",
    question: "\u9898\u76ee",
    getReady: "\u4ed4\u7ec6\u770b\uff0c\u51c6\u5907\u5f00\u59cb\uff01",
    choose: "\u9009\u62e9\u4e00\u4e2a",
    time: "\u6700\u540e\u51e0\u79d2\uff01",
    correct: "\u7b54\u5bf9\u4e86\uff01",
    why: "\u4f60\u77e5\u9053\u5417\uff1f",
    funFact: "\u4f60\u77e5\u9053\u5417\uff1f",
    final: "\u6700\u7ec8\u6311\u6218",
    scorePrompt: "\u4f60\u7b54\u5bf9\u4e86\u591a\u5c11\u9898\uff1f",
    playAgain: "\u4e0b\u6b21\u518d\u6765\u6311\u6218",
    exploreMore: "\u66f4\u591a\u7cbe\u5f69\u9898\u76ee\u7b49\u4f60\u63a2\u7d22",
    ctaComment: "\u8bc4\u8bba",
    ctaLike: "\u70b9\u8d5e",
    ctaSubscribe: "\u8ba2\u9605",
  };
}

export function quizCopy(language?: string): Copy {
  return normalizeLanguageCode(language) === "zh" ? chineseCopy() : englishCopy();
}
