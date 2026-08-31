import type { Channel, QuizConfig } from "@studio/shared";
import { HyperframesRenderer } from "../../quiz/render/hyperframesRenderer.js";
import type { PreparedQuizRender, QuizRenderInput } from "../../quiz/render/renderer.js";
import { buildQuizRenderStyleContext } from "../../quiz/render/quizRenderStyleContext.js";

export type QuizVideoRenderPreparationInput = Omit<QuizRenderInput, "styleContext"> & {
  channel: Channel;
  episodeQuizConfig: QuizConfig;
};

const quizRenderer = new HyperframesRenderer();

export function prepareQuizVideoRender(input: QuizVideoRenderPreparationInput): Promise<PreparedQuizRender> {
  const { channel, episodeQuizConfig, ...renderInput } = input;
  return quizRenderer.prepare({
    ...renderInput,
    styleContext: buildQuizRenderStyleContext(channel, episodeQuizConfig),
  });
}
