import { resolveMascotStyleIdForQuizConfig, type Channel, type QuizConfig } from "@studio/shared";
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
  const mascotStyleId = renderInput.mascotStyleId ?? resolveMascotStyleIdForQuizConfig(renderInput.mascot, episodeQuizConfig);
  return quizRenderer.prepare({
    ...renderInput,
    mascotStyleId,
    styleContext: buildQuizRenderStyleContext(channel, episodeQuizConfig),
  });
}
