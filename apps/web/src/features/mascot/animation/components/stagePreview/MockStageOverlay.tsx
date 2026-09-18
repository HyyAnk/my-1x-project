import React from "react";

export interface MockStageOverlayProps {
  aspectRatio?: "16:9" | "9:16";
  questionNumber?: number;
  totalQuestions?: number;
  timerSeconds?: number;
  questionTitle?: string;
  choices?: string[];
}

export function MockStageOverlay({
  aspectRatio = "16:9",
  questionNumber = 1,
  totalQuestions = 10,
  timerSeconds = 5,
  questionTitle,
  choices = ["Choice A", "Choice B", "Choice C", "Choice D"],
}: MockStageOverlayProps) {
  const isPortrait = aspectRatio === "9:16";
  const displayTitle = questionTitle ?? (isPortrait ? "Simulated 9:16 Quiz Screen" : "Simulated 16:9 Quiz Screen");
  const formattedTimer = `TIMER ${String(timerSeconds).padStart(2, "0")}s`;

  return (
    <div
      className="sim-quiz-backdrop"
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #064e3b 100%)",
        display: "flex",
        flexDirection: "column",
        padding: isPortrait ? "20px 16px" : "24px 32px",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 12px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.12)",
            color: "#e2e8f0",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <span>
            QUESTION {questionNumber} / {totalQuestions}
          </span>
        </div>
        <div
          style={{
            padding: "4px 12px",
            borderRadius: "999px",
            background: "rgba(234, 179, 8, 0.2)",
            border: "1px solid rgba(234, 179, 8, 0.5)",
            color: "#fef08a",
            fontSize: "12px",
            fontWeight: 800,
            fontFamily: "monospace",
          }}
        >
          {formattedTimer}
        </div>
      </div>

      {/* Question & Choices Simulator Card */}
      <div
        style={{
          margin: "auto",
          maxWidth: isPortrait ? "100%" : "680px",
          width: "100%",
          textAlign: "center",
          padding: isPortrait ? "16px 20px" : "24px 32px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h4
          style={{
            margin: "0 0 16px 0",
            color: "#f8fafc",
            fontSize: isPortrait ? "16px" : "20px",
            fontWeight: 800,
          }}
        >
          {displayTitle}
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isPortrait ? "1fr" : "1fr 1fr",
            gap: isPortrait ? "8px" : "10px",
            marginTop: "12px",
          }}
        >
          {choices.map((opt) => (
            <div
              key={opt}
              style={{
                padding: isPortrait ? "8px 12px" : "10px 14px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#cbd5e1",
                fontSize: isPortrait ? "12px" : "13px",
                fontWeight: 600,
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
