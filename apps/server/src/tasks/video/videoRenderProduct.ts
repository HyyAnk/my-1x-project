import { MASCOT_CANVAS_SIZES, type QuizProductRef, type Scene, type Task } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import { loadQuizProductView, type QuizProductView } from "../../quiz/pipeline/quizProductView.js";
import { synthesizeScenesFromQuiz } from "../../quiz/domain/quizArtifactSynthesizer.js";
import { productRefFromTask } from "../taskProductRef.js";

export type RenderCanvas = { width: number; height: number };

export type VideoRenderProduct = {
  ref: QuizProductRef;
  view: QuizProductView;
  renderAspectRatio: "16:9" | "9:16";
  renderCanvas: RenderCanvas;
};

/** The canvas follows the product's own aspect ratio; both landscape and portrait are renderable. */
export function resolveRenderCanvas(renderAspectRatio: string): RenderCanvas {
  const canvas = MASCOT_CANVAS_SIZES[renderAspectRatio as keyof typeof MASCOT_CANVAS_SIZES];
  if (!canvas || !canvas.width || !canvas.height) {
    throw new RepositoryError(
      `Unsupported render aspect ratio "${renderAspectRatio}". Expected one of: ${Object.keys(MASCOT_CANVAS_SIZES).join(", ")}.`,
      "UNSUPPORTED_ASPECT_RATIO",
    );
  }
  return { width: canvas.width, height: canvas.height };
}

export async function loadVideoRenderProduct(repository: RepositoryService, task: Task): Promise<VideoRenderProduct> {
  const ref = productRefFromTask(task);
  const view = await loadQuizProductView(repository, ref);
  const renderAspectRatio = view.quiz_config.render_aspect_ratio;
  return { ref, view, renderAspectRatio, renderCanvas: resolveRenderCanvas(renderAspectRatio) };
}

/** Episodes may still carry authored scenes; every product falls back to scenes synthesized from the quiz. */
export async function loadRenderScenes(repository: RepositoryService, product: VideoRenderProduct): Promise<Scene[]> {
  const authored = product.view.kind === "episode" ? await repository.readScenes(product.ref.channel_id, product.ref.product_id) : [];
  if (authored.length > 0) return authored;
  const quiz =
    typeof repository.readQuiz === "function" ? await repository.readQuiz(product.ref.channel_id, product.ref).catch(() => null) : null;
  return quiz && quiz.questions.length > 0 ? synthesizeScenesFromQuiz(quiz) : [];
}
