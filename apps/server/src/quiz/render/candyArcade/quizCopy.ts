export type Copy = ReturnType<typeof quizCopy>;

export function quizCopy(_language?: string) {
  return {
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
