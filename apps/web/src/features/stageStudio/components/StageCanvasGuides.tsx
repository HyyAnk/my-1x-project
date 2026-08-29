type StageCanvasGuidesProps = {
  showGuides: boolean;
  showSafeMargins: boolean;
  stageHeight: number;
  baselineLabel: string;
  actionSafeLabel: string;
  titleSafeLabel: string;
};

export function StageCanvasGuides({
  showGuides,
  showSafeMargins,
  stageHeight,
  baselineLabel,
  actionSafeLabel,
  titleSafeLabel,
}: StageCanvasGuidesProps) {
  return (
    <>
      {showGuides ? (
        <div className="stage-guides-overlay" aria-hidden="true">
          <div className="guide-crosshair-h" />
          <div className="guide-crosshair-v" />
          <div className="guide-ground-baseline" />
          <span className="guide-baseline-tag">
            {baselineLabel} (Y: {stageHeight})
          </span>
        </div>
      ) : null}
      {showSafeMargins ? (
        <div className="stage-safemargins-overlay" aria-hidden="true">
          <div className="safe-action-box">
            <span className="safe-label action">{actionSafeLabel}</span>
          </div>
          <div className="safe-title-box">
            <span className="safe-label title">{titleSafeLabel}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
