import { useTranslation } from "../../../../i18n";
import type { QuestionBankJobState } from "../../types/questionBankUi.types";

export interface AiGenerateActiveJobBannerProps {
  batchJob?: QuestionBankJobState | null;
  onClose: () => void;
}

export function AiGenerateActiveJobBanner({ batchJob, onClose }: AiGenerateActiveJobBannerProps) {
  const { t } = useTranslation();

  if (!batchJob || batchJob.status !== "running") return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 14px",
        marginBottom: "16px",
        borderRadius: "8px",
        background: "rgba(6, 182, 212, 0.08)",
        border: "1px solid rgba(6, 182, 212, 0.25)",
        fontSize: "13px",
      }}
    >
      <span>
        {t("questionBank.aiModal.activeJobNotice", {
          completed: batchJob.progress.completedCount,
          target: batchJob.targetCount,
        })}
      </span>
      <button type="button" className="qb-btn qb-btn-secondary qb-btn-sm" onClick={onClose} style={{ whiteSpace: "nowrap" }}>
        {t("questionBank.aiModal.viewInActivityBarBtn")}
      </button>
    </div>
  );
}

export interface AiGenerateChunkProgressProps {
  generating: boolean;
  targetCount: number;
}

export function AiGenerateChunkProgress({ generating, targetCount }: AiGenerateChunkProgressProps) {
  const { t } = useTranslation();

  if (!generating) return null;

  const totalChunks = Math.ceil(targetCount / 20);

  return (
    <div className="qb-chunk-progress-box">
      <div className="qb-chunk-progress-header">
        <span>
          <span className="qb-spinner" style={{ display: "inline-block", marginRight: "8px" }} />
          {totalChunks > 1
            ? t("questionBank.aiModal.generatingChunk", {
                current: 1,
                total: totalChunks,
                completed: 0,
                target: targetCount,
              })
            : t("questionBank.aiModal.generatingProgress")}
        </span>
      </div>
      <div className="qb-chunk-progress-note">{t("questionBank.aiModal.chunkNotice")}</div>
    </div>
  );
}
