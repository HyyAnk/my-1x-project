import type { ResolvedQuizLayoutId } from "@studio/shared";
import type { QuizLayoutUiDefinition } from "../quizLayoutUiCatalog";

export type QuizLayoutWireframeProps = {
  preview: QuizLayoutUiDefinition["preview"];
  layoutId?: ResolvedQuizLayoutId;
  aspectRatio?: "16:9" | "9:16";
  showMascot?: boolean;
  className?: string;
};

export function QuizLayoutWireframe({
  preview,
  layoutId,
  aspectRatio,
  showMascot = true,
  className,
}: QuizLayoutWireframeProps) {
  const rootClassName = className
    ? `stage-layout-miniature is-${preview} ${className}`
    : `stage-layout-miniature is-${preview}`;

  return (
    <div
      className={rootClassName}
      data-layout-id={layoutId}
      data-aspect-ratio={aspectRatio}
      aria-hidden="true"
    >
      <i className="layout-mini-media" />
      <i className="layout-mini-choice choice-a" />
      <i className="layout-mini-choice choice-b" />
      <i className="layout-mini-choice choice-c" />
      {showMascot && <i className="layout-mini-mascot" />}
    </div>
  );
}
