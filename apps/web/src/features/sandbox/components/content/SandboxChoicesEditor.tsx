import type { QuizPreviewLayoutId } from "@studio/shared";
import { useTranslation } from "../../../../i18n";

export interface SandboxChoicesEditorProps {
  choices: string[];
  setChoices: (choices: string[]) => void;
  correctChoiceIndex: number;
  setCorrectChoiceIndex: (index: number) => void;
  layoutId?: QuizPreviewLayoutId;
  onLayoutChange?: (layoutId: QuizPreviewLayoutId) => void;
}

export function SandboxChoicesEditor({
  choices,
  setChoices,
  correctChoiceIndex,
  setCorrectChoiceIndex,
  layoutId,
  onLayoutChange,
}: SandboxChoicesEditorProps) {
  const { t } = useTranslation();

  return (
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
          {layoutId === "mystery_reveal"
            ? t("visualSandbox.revealAnswerLabel") || "Reveal Answer"
            : `${t("visualSandbox.choicesLabel")} (${choices.length})`}
        </label>
        {layoutId !== "mystery_reveal" && (
          <div style={{ display: "flex", gap: "4px" }}>
            {choices.length < 3 && (
              <button
                type="button"
                className="quiet-button compact"
                style={{ fontSize: "10px", padding: "2px 6px" }}
                onClick={() => {
                  setChoices([...choices, `Option ${String.fromCharCode(65 + choices.length)}`]);
                  if (layoutId === "verdict_true_false" || layoutId === "split_versus_two") {
                    onLayoutChange?.("media_left_choices_right");
                  }
                }}
              >
                + 3 choices
              </button>
            )}
            {choices.length > 2 && (
              <button
                type="button"
                className="quiet-button compact"
                style={{ fontSize: "10px", padding: "2px 6px" }}
                onClick={() => {
                  setChoices(choices.slice(0, 2));
                  if (correctChoiceIndex >= 2) setCorrectChoiceIndex(0);
                  if (layoutId === "visual_choices_three" || layoutId === "visual_choices_three_pure") {
                    onLayoutChange?.("split_versus_two");
                  }
                }}
              >
                - 2 choices
              </button>
            )}
          </div>
        )}
      </div>

      {layoutId === "mystery_reveal" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#22E58B",
                border: "2px solid #FFF",
                color: "#0F172A",
                fontSize: "14px",
                fontWeight: 900,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
              title="Reveal Answer"
            >
              ✓
            </div>
            <input
              type="text"
              className="text-input compact"
              value={choices[0] ?? ""}
              onChange={(e) => {
                setChoices([e.target.value]);
                setCorrectChoiceIndex(0);
              }}
              style={{ flex: 1, fontSize: "12px", fontWeight: 600 }}
              placeholder={t("visualSandbox.revealAnswerPlaceholder") || "Enter reveal answer (e.g. Pikachu)..."}
            />
          </div>
          <span style={{ fontSize: "11px", color: "var(--muted)", fontStyle: "italic", marginLeft: "36px" }}>
            {t("visualSandbox.mysteryRevealNote") ||
              "Mystery Reveal has a single answer revealed overlaying the image footer when transitioning from clue to result."}
          </span>
        </div>
      ) : (
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
      )}
    </div>
  );
}
