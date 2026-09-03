import type { PreparedQuizRender, QuizRenderInput, QuizRenderResult, QuizRenderer } from "./renderer.js";
import { buildQuizV2CompositionBundle } from "./buildComposition.js";
import { getActiveStyleSnapshot } from "../visual/styleModules/activation.js";

export class HyperframesRenderer implements QuizRenderer {
  async prepare(input: QuizRenderInput): Promise<PreparedQuizRender> {
    const composition = buildQuizV2CompositionBundle({
      quiz: input.quiz,
      director: input.director,
      timeline: input.timeline,
      styleContext: input.styleContext,
      audioPath: input.audioPath,
      narrationDurationSeconds: input.narrationDurationSeconds ?? input.timeline.duration_seconds,
      aspectRatio: input.aspectRatio,
      assets: input.assets,
      bgmOptions: input.bgmOptions,
      mascot: input.mascot,
      mascotConfig: input.mascotConfig,
      premixedAudio: input.premixedAudio,
    });
    return {
      html: composition.html,
      compositionFiles: composition.files,
      durationSeconds: input.narrationDurationSeconds ?? input.timeline.duration_seconds,
      questionCount: input.quiz.questions.length,
      styleCatalogRevision: input.styleContext.styleCatalogRevision ?? getActiveStyleSnapshot().revision,
      stylePresetRevision: input.styleContext.stylePresetRevision ?? undefined,
    };
  }

  async render(input: QuizRenderInput): Promise<QuizRenderResult> {
    const prepared = await this.prepare(input);
    return { composition: prepared.html, durationSeconds: prepared.durationSeconds };
  }
}
