import React, { useState } from "react";
import { CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { Notice } from "../../../../components/types";
import type { PreviewImageData } from "../../types";
import { useQuestionImages } from "../../hooks/useQuestionImages";
import { ImagePreviewModal } from "../ImagePreviewModal";
import { buildQuestionImagePreviewList, findPreviewIndex } from "../../utils/questionImagePreviewHelpers";
import { QuestionImagesSummaryHeader } from "./QuestionImagesSummaryHeader";
import { QuestionImageCard } from "./QuestionImageCard";

export interface QuestionImagesPanelProps {
  channelId: string;
  episodeId: string;
  hasQuiz?: boolean;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onUpdated?: () => Promise<void> | void;
}

export function QuestionImagesPanel({
  channelId,
  episodeId,
  hasQuiz = true,
  onNotice,
  onUpdated,
}: QuestionImagesPanelProps): React.JSX.Element {
  const {
    overview,
    loading,
    error,
    uploading,
    uploadingSlots,
    generating,
    refresh,
    uploadImage,
    resetImage,
    generateImage,
    getImageUrl,
  } = useQuestionImages({
    channelId,
    episodeId,
    hasQuiz,
    onNotice,
    onUpdated,
  });

  const [previewModalData, setPreviewModalData] = useState<PreviewImageData | null>(null);

  const previewList = React.useMemo(() => {
    return overview ? buildQuestionImagePreviewList(overview.items, getImageUrl) : [];
  }, [overview, getImageUrl]);

  const activePreviewIndex = findPreviewIndex(previewList, previewModalData);
  const currentPreviewImage = activePreviewIndex >= 0 ? previewList[activePreviewIndex] : previewModalData;

  const handleNextPreview = () => {
    if (activePreviewIndex >= 0 && activePreviewIndex < previewList.length - 1) {
      setPreviewModalData(previewList[activePreviewIndex + 1]);
    }
  };

  const handlePrevPreview = () => {
    if (activePreviewIndex > 0) {
      setPreviewModalData(previewList[activePreviewIndex - 1]);
    }
  };

  return (
    <section className="panel question-images-panel" aria-label="Question images workspace">
      <QuestionImagesSummaryHeader overview={overview} loading={loading} onRefresh={refresh} />

      {loading && !overview ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", gap: "0.5rem" }}>
          <CircleNotch size={20} className="spin" color="var(--color-primary, #6366f1)" />
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted, #a1a1aa)" }}>Loading question images...</span>
        </div>
      ) : null}

      {error && !overview ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderRadius: "0.5rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f87171", fontSize: "0.875rem" }}>
            <WarningCircle size={18} />
            <span>{error}</span>
          </div>
          <button type="button" className="quiet-button compact" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : null}

      {overview && overview.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted, #a1a1aa)" }}>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>No questions found in this episode yet.</p>
          <p style={{ margin: "4px 0 0", fontSize: "0.75rem" }}>Generate the quiz script first to see questions and assign images.</p>
        </div>
      ) : null}

      {overview && overview.items.length > 0 ? (
        <div className="question-images-grid">
          {overview.items.map((item) => (
            <QuestionImageCard
              key={item.question_number}
              item={item}
              imageUrl={getImageUrl(item.question_number)}
              uploading={Boolean(uploading[item.question_number])}
              uploadingSlots={uploadingSlots}
              generating={Boolean(generating[item.question_number])}
              onUpload={(file) => uploadImage(item.question_number, file)}
              onReset={() => resetImage(item.question_number)}
              onGenerate={(prompt) => generateImage(item.question_number, prompt)}
              onPreviewImage={(data) => setPreviewModalData(data)}
              onUploadSlot={(slotId, file) => uploadImage(item.question_number, file, slotId)}
              onResetSlot={(slotId) => resetImage(item.question_number, slotId)}
              getImageUrlForSlot={(slot) => getImageUrl(item.question_number, slot.slot_id)}
            />
          ))}
        </div>
      ) : null}

      {currentPreviewImage ? (
        <ImagePreviewModal
          image={currentPreviewImage}
          onClose={() => setPreviewModalData(null)}
          onNext={handleNextPreview}
          onPrevious={handlePrevPreview}
          hasNext={activePreviewIndex >= 0 && activePreviewIndex < previewList.length - 1}
          hasPrevious={activePreviewIndex > 0}
        />
      ) : null}
    </section>
  );
}
