import { type QuizV2, type QuizQuestion, type QuestionHistoryCheckResult, type Scene, QuizV2Schema, SceneSchema } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { invalidateQuizArtifacts } from "../invalidation.js";
import { checkQuestionsAgainstHistory } from "../../qa/questionHistory.js";

export async function persistRemixedQuiz(options: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  currentQuiz: QuizV2;
  scenes: Scene[];
  rephrasedQuestions: QuizQuestion[];
  targetIds: Set<string>;
  passThreshold: number;
}): Promise<{ quiz: QuizV2; history_check: QuestionHistoryCheckResult; remixed_count: number; invalidated: string[] }> {
  const { repository, channelId, episodeId, currentQuiz, scenes, rephrasedQuestions, targetIds, passThreshold } = options;

  const rephrasedMap = new Map(rephrasedQuestions.map((q) => [q.id, q]));
  const updatedQuestions = currentQuiz.questions.map((q) => rephrasedMap.get(q.id) ?? q);
  const updatedQuiz: QuizV2 = { ...currentQuiz, questions: updatedQuestions };

  const rephrasedByNumber = new Map(rephrasedQuestions.map((question) => [question.number, question]));
  const updatedScenes = scenes.map((scene) => {
    const rephrased = scene.quiz?.question_number ? rephrasedByNumber.get(scene.quiz.question_number) : undefined;
    if (scene.quiz && rephrased) {
      const correctChoiceText = rephrased.choices.find((c) => c.id === rephrased.correct_choice_id)?.text || "";
      return {
        ...scene,
        quiz: {
          ...scene.quiz,
          question: rephrased.question,
          choices: rephrased.choices.map((c) => c.text),
          answer: correctChoiceText,
          explanation: rephrased.explanation,
        },
      };
    }
    return scene;
  });

  const validatedQuiz = QuizV2Schema.parse(updatedQuiz);
  const validatedScenes = updatedScenes.map((scene) => SceneSchema.parse(scene));
  await repository.writeQuiz(channelId, episodeId, validatedQuiz);
  await repository.saveScenes(channelId, episodeId, validatedScenes);

  const history = await repository.readQuestionHistory(channelId);
  const updatedCheck = checkQuestionsAgainstHistory(episodeId, updatedQuiz.questions, history, passThreshold);
  const finalCheckItems = updatedCheck.items.map((item) => {
    if (targetIds.has(item.current_question_id)) {
      if (item.status === "passed") return { ...item, status: "remixed" as const };
    }
    return item;
  });
  const finalCheck: QuestionHistoryCheckResult = {
    ...updatedCheck,
    items: finalCheckItems,
  };
  await repository.writeHistoryCheck(channelId, episodeId, finalCheck);

  const invalidatedStages = invalidateQuizArtifacts("quiz");
  const invalidated = await repository.invalidateQuizArtifacts(channelId, episodeId, invalidatedStages);

  return { quiz: updatedQuiz, history_check: finalCheck, remixed_count: rephrasedQuestions.length, invalidated };
}
