import { CircleNotch, Link, X } from "@phosphor-icons/react";
import {
  ANSWER_CARD_STYLE_LABELS,
  QUESTION_BOX_STYLE_LABELS,
  QUESTION_COUNTER_STYLE_LABELS,
  THINKING_BAR_STYLE_LABELS,
  type Channel,
  type MascotProfile,
  type QuizAnswerCardStyle,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizPreviewLayoutId,
  type QuizThinkingBarStyle,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { getQuizLayoutUiDefinition } from "../../quizLayouts/quizLayoutUiCatalog";
import { PALETTES } from "../constants";

export interface SandboxChannelSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  selectedChannelId: string;
  setSelectedChannelId: (id: string) => void;
  mascotId: string;
  activeMascot?: MascotProfile | null;
  syncMascotToChannel: boolean;
  setSyncMascotToChannel: (sync: boolean) => void;
  layoutId: QuizPreviewLayoutId;
  paletteId: string;
  thinkingBarStyle: QuizThinkingBarStyle;
  questionBoxStyle: QuizQuestionBoxStyle;
  answerCardStyle: QuizAnswerCardStyle;
  counterStyle: QuizQuestionCounterStyle;
  mascotPosition: string;
  mascotScale: number;
  savingChannel: boolean;
  onApply: () => void;
}

export function SandboxChannelSyncModal({
  isOpen,
  onClose,
  channels,
  selectedChannelId,
  setSelectedChannelId,
  mascotId,
  activeMascot,
  syncMascotToChannel,
  setSyncMascotToChannel,
  layoutId,
  paletteId,
  thinkingBarStyle,
  questionBoxStyle,
  answerCardStyle,
  counterStyle,
  mascotPosition,
  mascotScale,
  savingChannel,
  onApply,
}: SandboxChannelSyncModalProps) {
  const { t } = useTranslation();
  const layoutLabel = layoutId === "baseline" ? layoutId : t(getQuizLayoutUiDefinition(layoutId).sandboxLabelKey);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div className="panel" style={{ width: "480px", padding: "24px", borderRadius: "16px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Link size={18} weight="bold" />
            <span>{t("visualSandbox.modalApplyChannelTitle")}</span>
          </h3>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
            {t("visualSandbox.selectChannelLabel")}
          </label>
          <select
            className="select-input"
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            style={{ width: "100%", height: "36px", borderRadius: "8px", background: "var(--surface)", color: "var(--text)" }}
          >
            {channels.map((ch) => (
              <option key={ch.channel_id} value={ch.channel_id}>
                {ch.display_name} ({ch.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Sync Mascot Checkbox */}
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", marginBottom: "14px", cursor: "pointer" }}>
          <input type="checkbox" checked={syncMascotToChannel} onChange={(e) => setSyncMascotToChannel(e.target.checked)} />
          <span>
            {t("visualSandbox.syncMascotCheckbox", {
              name: activeMascot ? activeMascot.name : t("visualSandbox.summaryMascotDisabled"),
            })}
          </span>
        </label>

        <div
          style={{
            padding: "12px",
            borderRadius: "10px",
            background: "var(--surface-strong)",
            border: "1px solid var(--line)",
            fontSize: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            marginBottom: "20px",
          }}
        >
          <div>
            <strong>• {t("visualSandbox.summaryLayout")}</strong> {layoutLabel}
          </div>
          <div>
            <strong>• {t("visualSandbox.summaryPalette")}</strong> {PALETTES.find((p) => p.id === paletteId)?.label || paletteId}
          </div>
          <div>
            <strong>• {t("visualSandbox.summaryThinkingBar")}</strong>{" "}
            {THINKING_BAR_STYLE_LABELS[thinkingBarStyle as Exclude<QuizThinkingBarStyle, "auto">]}
          </div>
          <div>
            <strong>• {t("visualSandbox.summaryQuestionBox")}</strong>{" "}
            {QUESTION_BOX_STYLE_LABELS[questionBoxStyle as Exclude<QuizQuestionBoxStyle, "auto">]}
          </div>
          <div>
            <strong>• {t("visualSandbox.summaryAnswerCard")}</strong>{" "}
            {ANSWER_CARD_STYLE_LABELS[answerCardStyle as Exclude<QuizAnswerCardStyle, "auto">]}
          </div>
          <div>
            <strong>• {t("visualSandbox.summaryCounter")}</strong>{" "}
            {QUESTION_COUNTER_STYLE_LABELS[counterStyle as Exclude<QuizQuestionCounterStyle, "auto">]}
          </div>
          {syncMascotToChannel && (
            <div>
              <strong>• {t("visualSandbox.summaryMascot")}</strong>{" "}
              {mascotId === "none" || !activeMascot
                ? t("visualSandbox.summaryMascotDisabled")
                : `${activeMascot.name} (${mascotPosition}, ${mascotScale.toFixed(2)}x)`}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" className="quiet-button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className="primary-button" disabled={savingChannel || !selectedChannelId} onClick={onApply}>
            {savingChannel ? <CircleNotch className="spin" size={16} /> : <Link size={16} weight="bold" />}
            <span>{savingChannel ? t("visualSandbox.applyingBtn") : t("visualSandbox.confirmApplyBtn")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
