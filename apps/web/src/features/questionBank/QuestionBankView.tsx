import { useMemo, useState } from "react";
import type { Channel } from "@studio/shared";
import { useTranslation } from "../../i18n";
import { useQuestionBank } from "./hooks/useQuestionBank";
import { QuestionBankHeaderStats } from "./components/QuestionBankHeaderStats";
import { QuestionBankToolbar } from "./components/QuestionBankToolbar";
import { QuestionBankTable } from "./components/QuestionBankTable";
import { QuestionBankLivePreview } from "./components/QuestionBankLivePreview";
import { QuestionBankFormModal } from "./components/QuestionBankFormModal";
import { QuestionBankAiGenerateModal } from "./components/QuestionBankAiGenerateModal";
import { QuestionBankClearAllModal } from "./components/QuestionBankClearAllModal";
import type { BankQuestionWithCooldown } from "./types/questionBankUi.types";
import "../../styles/features/questionBank.css";

export interface QuestionBankViewProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onQuickBuildVideo?: (channelId: string, episodeId: string) => void;
}

export function QuestionBankView({ channels, selectedChannel, onQuickBuildVideo }: QuestionBankViewProps) {
  const { t } = useTranslation();
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

  const {
    taxonomy,
    stats,
    matrixCoverage,
    questions,
    totalQuestions,
    loading,
    recalculating,
    generating,
    buildingVideo,
    transcreating,
    error,
    filters,
    selectedQuestion,
    modalState,
    previewAspect,
    updateFilter,
    resetFilters,
    setSelectedQuestion,
    setModalState,
    setPreviewAspect,
    recalculateStats,
    saveQuestion,
    deleteQuestion,
    clearing,
    clearAllQuestions,
    generateBatch,
    batchJob,
    createOneClickVideo,
    transcreateQuestion,
  } = useQuestionBank(selectedChannel?.channel_id);

  const handleQuickBuildVideo = async (q: BankQuestionWithCooldown, aspect: "16:9" | "9:16") => {
    const targetChannelId = filters.channelId || selectedChannel?.channel_id || channels[0]?.channel_id;
    if (!targetChannelId) {
      alert(t("questionBank.alerts.chooseChannelRequired"));
      return;
    }
    if (q.channel_cooldown?.is_cooldown) {
      const confirmBuild = window.confirm(t("questionBank.alerts.cooldownConfirm", { days: q.channel_cooldown.days_remaining }));
      if (!confirmBuild) return;
    }
    try {
      const result = await createOneClickVideo(targetChannelId, q.id, aspect);
      if (result.episode && onQuickBuildVideo) {
        onQuickBuildVideo(targetChannelId, result.episode.episode_id);
      }
    } catch (err) {
      console.error("Failed to 1-click build video", err);
    }
  };

  const selectedQuestionWithDetails = useMemo(() => {
    if (!selectedQuestion) return null;
    return selectedQuestion;
  }, [selectedQuestion]);

  return (
    <div className="qb-container">
      {/* 1. Interactive Header Stats & Archetype Chip Bar */}
      <QuestionBankHeaderStats
        stats={stats}
        matrixCoverage={matrixCoverage}
        recalculating={recalculating}
        selectedArchetype={filters.archetypeId}
        isCollapsed={isStatsCollapsed}
        onToggleCollapse={() => setIsStatsCollapsed((prev) => !prev)}
        onSelectArchetype={(id) => updateFilter("archetypeId", id)}
        onRecalculate={recalculateStats}
        onOpenAiModal={() => setModalState({ type: "ai_generate" })}
      />

      {/* Error notification if any */}
      {error && (
        <div className="qb-modal-error" style={{ margin: "0" }}>
          {error}
        </div>
      )}

      {/* 2. Unified Search & Filter Command Bar */}
      <QuestionBankToolbar
        channels={channels}
        taxonomy={taxonomy}
        filters={filters}
        totalQuestions={totalQuestions}
        onUpdateFilter={updateFilter}
        onResetFilters={resetFilters}
        onOpenCreateModal={() => setModalState({ type: "create" })}
        onOpenClearAllModal={() => setModalState({ type: "clear_all" })}
      />

      {/* 3. Main Split View: Scannable Table + Live Inspector */}
      <div className="qb-main-layout">
        <QuestionBankTable
          questions={questions}
          total={totalQuestions}
          loading={loading}
          page={filters.page}
          pageSize={filters.pageSize}
          selectedId={selectedQuestion?.id || null}
          hasChannelSelected={Boolean(filters.channelId)}
          activeLanguage={filters.languageFilter}
          onSelectQuestion={setSelectedQuestion}
          onEditQuestion={(q) => setModalState({ type: "edit", question: q })}
          onDeleteQuestion={deleteQuestion}
          onQuickBuildVideo={(q) => handleQuickBuildVideo(q, previewAspect)}
          onPageChange={(p) => updateFilter("page", p)}
        />

        <QuestionBankLivePreview
          question={selectedQuestionWithDetails}
          aspect={previewAspect}
          buildingVideo={buildingVideo}
          transcreating={transcreating}
          onToggleAspect={() => setPreviewAspect(previewAspect === "16:9" ? "9:16" : "16:9")}
          onQuickBuildVideo={handleQuickBuildVideo}
          onTranscreateQuestion={transcreateQuestion}
        />
      </div>

      {/* 4. Modals */}
      {(modalState.type === "create" || modalState.type === "edit") && (
        <QuestionBankFormModal
          initialQuestion={modalState.question}
          taxonomy={taxonomy}
          onSave={saveQuestion}
          onClose={() => setModalState({ type: null })}
        />
      )}

      {modalState.type === "ai_generate" && (
        <QuestionBankAiGenerateModal
          taxonomy={taxonomy}
          matrixCoverage={matrixCoverage}
          generating={generating}
          batchJob={batchJob}
          onGenerate={generateBatch}
          onClose={() => setModalState({ type: null })}
        />
      )}

      {modalState.type === "clear_all" && (
        <QuestionBankClearAllModal
          clearing={clearing}
          totalCount={totalQuestions}
          onConfirm={async () => {
            await clearAllQuestions();
            setModalState({ type: null });
          }}
          onClose={() => setModalState({ type: null })}
        />
      )}
    </div>
  );
}
