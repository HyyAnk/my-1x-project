import { useTranslation } from "../../../i18n";
import type { PresetSampleQuestion } from "../hooks/useSandboxQuestionState";

export interface SandboxContentTabProps {
  sampleQuestions: PresetSampleQuestion[];
  questionText: string;
  setQuestionText: (text: string) => void;
  choices: string[];
  setChoices: (choices: string[]) => void;
  correctChoiceIndex: number;
  setCorrectChoiceIndex: (index: number) => void;
  questionNumber: number;
  setQuestionNumber: (num: number) => void;
  totalQuestions: number;
  setTotalQuestions: (total: number) => void;
  factCardText: string;
  setFactCardText: (text: string) => void;
  phase: string;
  setPhase: (phase: "question" | "choices" | "thinking" | "reveal" | "explain") => void;
  setUseScrubber: (use: boolean) => void;
  handleApplyPresetQuestion: (sq: PresetSampleQuestion) => void;
}

export function SandboxContentTab({
  sampleQuestions,
  questionText,
  setQuestionText,
  choices,
  setChoices,
  correctChoiceIndex,
  setCorrectChoiceIndex,
  questionNumber,
  setQuestionNumber,
  totalQuestions,
  setTotalQuestions,
  factCardText,
  setFactCardText,
  phase,
  setPhase,
  setUseScrubber,
  handleApplyPresetQuestion,
}: SandboxContentTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "6px",
          }}
        >
          {t("visualSandbox.sampleQuestionsLabel")}
        </label>
        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
          {sampleQuestions.map((sq, i) => {
            const label =
              sq.type === "standard"
                ? t("visualSandbox.sampleStandard")
                : sq.type === "short"
                  ? t("visualSandbox.sampleShort")
                  : t("visualSandbox.sampleLong");
            return (
              <button
                key={i}
                type="button"
                className="quiet-button compact"
                style={{ fontSize: "10.5px", padding: "4px 8px" }}
                onClick={() => handleApplyPresetQuestion(sq)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <label style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>
          {t("visualSandbox.questionTextLabel")}:
        </label>
        <textarea
          className="text-input"
          rows={3}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder={t("visualSandbox.questionTextPlaceholder")}
          style={{ width: "100%", fontSize: "12px", marginBottom: "12px" }}
        />
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      <div>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "6px",
          }}
        >
          {t("visualSandbox.choicesLabel")}
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          {choices.map((choice, idx) => {
            const isCorrect = idx === correctChoiceIndex;
            const letter = String.fromCharCode(65 + idx);
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setCorrectChoiceIndex(idx)}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: isCorrect ? "#22E58B" : "var(--surface-strong)",
                    border: isCorrect ? "2px solid #FFF" : "1px solid var(--line)",
                    color: isCorrect ? "#0F172A" : "var(--text)",
                    fontSize: "12px",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                  title={t("visualSandbox.correctChoiceTitle", { letter })}
                >
                  {letter}
                </button>
                <input
                  type="text"
                  className="text-input compact"
                  value={choice}
                  onChange={(e) => {
                    const updated = [...choices];
                    updated[idx] = e.target.value;
                    setChoices(updated);
                  }}
                  style={{ flex: 1, fontSize: "12px" }}
                  placeholder={t("visualSandbox.choicePlaceholder", { letter })}
                />
                {isCorrect && (
                  <span style={{ fontSize: "10.5px", color: "#22E58B", fontWeight: 700, flexShrink: 0 }}>
                    ✓ {t("visualSandbox.correctBadge")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      <div>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "6px",
          }}
        >
          {t("visualSandbox.questionCountSettings")}
        </label>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>{t("visualSandbox.currentQuestionNumber")}</span>
            <input
              type="number"
              min={1}
              max={totalQuestions}
              value={questionNumber}
              onChange={(e) => setQuestionNumber(Number(e.target.value))}
              className="text-input compact"
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>{t("visualSandbox.totalQuestionsCount")}</span>
            <input
              type="number"
              min={1}
              max={50}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
              className="text-input compact"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* FACT CARD / EXPLANATION SECTION */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {t("visualSandbox.factCardSection")}
          </label>
          {phase !== "explain" && (
            <button
              type="button"
              className="quiet-button compact"
              style={{ fontSize: "10px", padding: "2px 6px", color: "var(--accent)" }}
              onClick={() => {
                setPhase("explain");
                setUseScrubber(false);
              }}
              title="Switch preview phase to Explain to view Fact Card"
            >
              {t("visualSandbox.phaseExplain")} →
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <span style={{ display: "block", fontSize: "10.5px", color: "var(--muted)", marginBottom: "4px" }}>
              {t("visualSandbox.factCardTextLabel")}:
            </span>
            <textarea
              className="text-input"
              rows={2}
              value={factCardText}
              onChange={(e) => setFactCardText(e.target.value)}
              placeholder={t("visualSandbox.factCardTextPlaceholder")}
              style={{ width: "100%", fontSize: "12px" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
