import { CheckCircle, Clock, WarningCircle, Sparkle } from "@phosphor-icons/react";
import type { AnimationState, MascotSlotProjection } from "@studio/shared";

export interface Step4SlotPickerProps {
  activeState: AnimationState;
  onChangeState: (state: AnimationState) => void;
  activeSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
  slots: {
    thinking: MascotSlotProjection[];
    celebrate: MascotSlotProjection[];
  };
}

export function Step4SlotPicker({ activeState, onChangeState, activeSlotIndex, onSelectSlot, slots }: Step4SlotPickerProps) {
  const currentSlots = activeState === "thinking" ? slots.thinking : slots.celebrate;

  return (
    <div
      className="step4-slot-picker"
      data-testid="step4-slot-picker"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "12px 14px",
        background: "var(--surface, rgba(255,255,255,0.03))",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
        borderRadius: "var(--radius, 10px)",
      }}
    >
      {/* State Switcher (Thinking vs Celebrate) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        <button
          type="button"
          className={`quiet-button compact ${activeState === "thinking" ? "is-active" : ""}`}
          style={{
            fontWeight: 700,
            fontSize: "12.5px",
            padding: "8px",
            justifyContent: "center",
            borderColor: activeState === "thinking" ? "var(--accent)" : undefined,
            color: activeState === "thinking" ? "var(--accent)" : undefined,
            background: activeState === "thinking" ? "rgba(56, 189, 248, 0.1)" : undefined,
          }}
          onClick={() => onChangeState("thinking")}
          data-testid="state-thinking-tab"
        >
          <Sparkle size={14} weight="fill" />
          <span>Thinking (10 Slots)</span>
        </button>

        <button
          type="button"
          className={`quiet-button compact ${activeState === "celebrate" ? "is-active" : ""}`}
          style={{
            fontWeight: 700,
            fontSize: "12.5px",
            padding: "8px",
            justifyContent: "center",
            borderColor: activeState === "celebrate" ? "var(--accent)" : undefined,
            color: activeState === "celebrate" ? "var(--accent)" : undefined,
            background: activeState === "celebrate" ? "rgba(56, 189, 248, 0.1)" : undefined,
          }}
          onClick={() => onChangeState("celebrate")}
          data-testid="state-celebrate-tab"
        >
          <Sparkle size={14} weight="fill" />
          <span>Celebrate (10 Slots)</span>
        </button>
      </div>

      {/* 10 Slots Horizontal Strip / Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "6px",
        }}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const slotNum = i + 1;
          const slotProj = currentSlots.find((s) => s.slot_index === slotNum);
          const isSelected = activeSlotIndex === slotNum;
          const status = slotProj?.status ?? "empty";
          const isReady = status === "ready";
          const isProcessing = ["uploading", "processing", "retrying", "replacing"].includes(status);
          const isFailed = ["failed", "qa_failed"].includes(status);

          return (
            <button
              key={`slot-btn-${slotNum}`}
              type="button"
              className={`quiet-button compact ${isSelected ? "is-active" : ""}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                padding: "8px 4px",
                fontSize: "11px",
                fontWeight: 600,
                borderColor: isSelected ? "var(--accent)" : undefined,
                background: isSelected ? "rgba(56, 189, 248, 0.12)" : undefined,
              }}
              onClick={() => onSelectSlot(slotNum)}
              data-testid={`slot-card-${slotNum}`}
              aria-label={`Slot ${slotNum}, status ${status}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span>#{slotNum}</span>
                {isReady ? (
                  <CheckCircle size={12} weight="fill" color="#22c55e" />
                ) : isProcessing ? (
                  <Clock size={12} color="#eab308" />
                ) : isFailed ? (
                  <WarningCircle size={12} color="#ef4444" />
                ) : (
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.2)",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: "9px",
                  color: isReady ? "#22c55e" : isProcessing ? "#eab308" : isFailed ? "#ef4444" : "var(--muted)",
                  textTransform: "capitalize",
                }}
              >
                {status.replace("_", " ")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
