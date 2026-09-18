import type { ResolvedQuizLayoutId } from "@studio/shared";
import type { QuizLayoutUiDefinition } from "../quizLayoutUiCatalog";

export type QuizLayoutWireframeProps = {
  preview: QuizLayoutUiDefinition["preview"];
  layoutId?: ResolvedQuizLayoutId;
  aspectRatio?: "16:9" | "9:16";
  showMascot?: boolean;
  className?: string;
};

export function QuizLayoutWireframe({ preview, layoutId, aspectRatio, showMascot = true, className }: QuizLayoutWireframeProps) {
  const rootClassName = className ? `stage-layout-miniature is-${preview} ${className}` : `stage-layout-miniature is-${preview}`;
  const isMystery = preview === "mystery-reveal" || layoutId === "mystery_reveal";
  const isBinary =
    isMystery ||
    preview === "split-versus" ||
    preview === "verdict" ||
    layoutId === "split_versus_two" ||
    layoutId === "verdict_true_false";

  return (
    <div className={rootClassName} data-layout-id={layoutId} data-aspect-ratio={aspectRatio} aria-hidden="true">
      <i className="layout-mini-media" />
      <i className="layout-mini-choice choice-a" />
      {!isMystery && <i className="layout-mini-choice choice-b" />}
      {!isBinary && <i className="layout-mini-choice choice-c" />}
      {showMascot && <i className="layout-mini-mascot" />}
    </div>
  );
}
