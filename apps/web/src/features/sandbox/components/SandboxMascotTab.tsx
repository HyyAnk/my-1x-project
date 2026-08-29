import { Sparkle, X } from "@phosphor-icons/react";
import type { MascotActionType, MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface SandboxMascotTabProps {
  mascots: MascotProfile[];
  mascotId: string;
  setMascotId: (id: string) => void;
  mascotEnabled: boolean;
  setMascotEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  mascotAction: MascotActionType;
  setMascotAction: (action: MascotActionType) => void;
  mascotPosition: "bottom_left" | "bottom_right";
  setMascotPosition: (pos: "bottom_left" | "bottom_right") => void;
  mascotScale: number;
  setMascotScale: (scale: number | ((prev: number) => number)) => void;
  mascotOffsetX: number;
  setMascotOffsetX: (offset: number | ((prev: number) => number)) => void;
  mascotOffsetY: number;
  setMascotOffsetY: (offset: number | ((prev: number) => number)) => void;
  mascotFlipX: boolean;
  setMascotFlipX: (flipped: boolean | ((prev: boolean) => boolean)) => void;
}

export function SandboxMascotTab({
  mascots,
  mascotId,
  setMascotId,
  mascotEnabled,
  setMascotEnabled,
  mascotAction,
  setMascotAction,
  mascotPosition,
  setMascotPosition,
  mascotScale,
  setMascotScale,
  mascotOffsetX,
  setMascotOffsetX,
  mascotOffsetY,
  setMascotOffsetY,
  mascotFlipX,
  setMascotFlipX,
}: SandboxMascotTabProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Mascot Enable Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong style={{ fontSize: "12px" }}>{t("visualSandbox.mascotVisibilityTitle")}</strong>
          <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>{t("visualSandbox.mascotVisibilityDesc")}</div>
        </div>
        <button
          type="button"
          className={mascotEnabled && mascotId !== "none" ? "primary-button compact" : "quiet-button compact"}
          style={{ fontSize: "11px", padding: "4px 12px" }}
          onClick={() => {
            if (!mascotEnabled || mascotId === "none") {
              if (mascotId === "none" && mascots.length > 0) {
                setMascotId(mascots[0].id);
              }
              setMascotEnabled(true);
            } else {
              setMascotEnabled(false);
            }
          }}
        >
          {mascotEnabled && mascotId !== "none" ? t("visualSandbox.mascotEnabledBadge") : t("visualSandbox.mascotDisabledBadge")}
        </button>
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* Real Mascot Picker */}
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
          {t("visualSandbox.mascotPickerSection")}
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
          {/* None Option */}
          <button
            type="button"
            onClick={() => {
              setMascotId("none");
              setMascotEnabled(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 10px",
              borderRadius: "10px",
              background: mascotId === "none" || !mascotEnabled ? "var(--soft-accent)" : "var(--surface-strong)",
              border: mascotId === "none" || !mascotEnabled ? "2px solid var(--accent)" : "1px solid var(--line)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                placeItems: "center",
                color: "var(--muted)",
              }}
            >
              <X size={16} weight="bold" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "11.5px", color: mascotId === "none" || !mascotEnabled ? "var(--accent)" : "var(--text)" }}>
                {t("visualSandbox.noMascotTitle")}
              </strong>
              <small style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>{t("visualSandbox.noMascotSub")}</small>
            </div>
          </button>

          {/* Empty Mascots Hint */}
          {mascots.length === 0 && (
            <div style={{ padding: "8px 10px", fontSize: "11px", color: "var(--muted)", fontStyle: "italic" }}>
              {t("visualSandbox.noMascotsInLibrary")}
            </div>
          )}

          {/* Real Mascots from Library */}
          {mascots.map((m) => {
            const isSelected = mascotId === m.id && mascotEnabled;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMascotId(m.id);
                  setMascotEnabled(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "10px",
                  background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {m.master_image_url ? (
                  <img
                    src={m.master_image_url}
                    alt={m.name}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      background: "rgba(0,0,0,0.2)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: m.color_theme || "var(--accent)",
                      display: "grid",
                      placeItems: "center",
                      color: "#FFF",
                      fontWeight: 900,
                    }}
                  >
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      color: isSelected ? "var(--accent)" : "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {m.name}
                  </strong>
                  <small style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
                    {m.description || m.visual_style || "Mascot Profile"}
                  </small>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* Mascot Pose / Action */}
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
          {t("visualSandbox.mascotPoseSection")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          {(
            [
              { id: "thinking", label: t("visualSandbox.poseThinking") },
              { id: "celebrate", label: t("visualSandbox.poseCelebrate") },
              { id: "point", label: t("visualSandbox.posePoint") },
              { id: "oops", label: t("visualSandbox.poseOops") },
              { id: "idle", label: t("visualSandbox.poseIdle") },
              { id: "wave", label: t("visualSandbox.poseWave") },
            ] as const
          ).map((act) => {
            const isSelected = mascotAction === act.id;
            return (
              <button
                key={act.id}
                type="button"
                className={isSelected ? "primary-button compact" : "quiet-button compact"}
                style={{ fontSize: "10.5px", padding: "6px 4px", justifyContent: "center" }}
                onClick={() => setMascotAction(act.id)}
              >
                {act.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* Position & Anchor */}
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
          {t("visualSandbox.mascotPositionSection")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <button
            type="button"
            className={mascotPosition === "bottom_left" ? "primary-button compact" : "quiet-button compact"}
            style={{ fontSize: "11px", padding: "6px", justifyContent: "center" }}
            onClick={() => setMascotPosition("bottom_left")}
          >
            {t("visualSandbox.posBottomLeft")}
          </button>
          <button
            type="button"
            className={mascotPosition === "bottom_right" ? "primary-button compact" : "quiet-button compact"}
            style={{ fontSize: "11px", padding: "6px", justifyContent: "center" }}
            onClick={() => setMascotPosition("bottom_right")}
          >
            {t("visualSandbox.posBottomRight")}
          </button>
        </div>
        <button
          type="button"
          className={mascotFlipX ? "primary-button compact" : "quiet-button compact"}
          style={{ width: "100%", marginTop: "6px", fontSize: "11px", justifyContent: "center" }}
          onClick={() => setMascotFlipX((current) => !current)}
          aria-pressed={mascotFlipX}
        >
          {t("visualSandbox.flipDirection")}
        </button>
      </div>

      {/* Live Animation Status Badge */}
      <div
        style={{
          padding: "8px 12px",
          borderRadius: "10px",
          background: "rgba(56, 189, 248, 0.08)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          fontSize: "11px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Sparkle size={14} weight="fill" style={{ color: "#38BDF8" }} />
        <span>
          {t("visualSandbox.liveMotionLabel")} <strong>{mascotAction.toUpperCase()}</strong>{" "}
          <span style={{ color: "var(--muted)" }}>
            (
            {mascotAction === "thinking"
              ? t("visualSandbox.motionThinkingDesc")
              : mascotAction === "celebrate"
                ? t("visualSandbox.motionCelebrateDesc")
                : mascotAction === "point"
                  ? t("visualSandbox.motionPointDesc")
                  : mascotAction === "oops"
                    ? t("visualSandbox.motionOopsDesc")
                    : mascotAction === "wave"
                      ? t("visualSandbox.motionWaveDesc")
                      : t("visualSandbox.motionIdleDesc")}
            )
          </span>
        </span>
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* Mascot Scale Slider & Presets (Expanded 0.3x - 3.0x) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            {t("visualSandbox.scaleDimensionsLabel")}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="number"
              min={30}
              max={300}
              step={1}
              value={Math.round(mascotScale * 100)}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val)) setMascotScale(Math.max(0.3, Math.min(3.0, val / 100)));
              }}
              className="text-input compact"
              style={{ width: "56px", fontSize: "11px", padding: "2px 4px", textAlign: "right" }}
            />
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>%</span>
          </div>
        </div>

        {/* Scale Stepper Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", marginBottom: "6px" }}>
          <button
            type="button"
            className="quiet-button compact"
            style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
            onClick={() => setMascotScale((p) => Math.max(0.3, Math.round((p - 0.25) * 100) / 100))}
          >
            -25%
          </button>
          <button
            type="button"
            className="quiet-button compact"
            style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
            onClick={() => setMascotScale((p) => Math.max(0.3, Math.round((p - 0.05) * 100) / 100))}
          >
            -5%
          </button>
          <button
            type="button"
            className="quiet-button compact"
            style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
            onClick={() => setMascotScale((p) => Math.min(3.0, Math.round((p + 0.05) * 100) / 100))}
          >
            +5%
          </button>
          <button
            type="button"
            className="quiet-button compact"
            style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
            onClick={() => setMascotScale((p) => Math.min(3.0, Math.round((p + 0.25) * 100) / 100))}
          >
            +25%
          </button>
        </div>

        {/* Scale Range Slider */}
        <input
          type="range"
          min="0.3"
          max="3.0"
          step="0.01"
          value={mascotScale}
          onChange={(e) => setMascotScale(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />

        {/* Quick Presets Row */}
        <div style={{ display: "flex", gap: "4px", marginTop: "6px", overflowX: "auto" }}>
          {[0.75, 1.0, 1.25, 1.5, 2.0, 2.5].map((presetVal) => {
            const isActive = Math.abs(mascotScale - presetVal) < 0.02;
            return (
              <button
                key={presetVal}
                type="button"
                className={isActive ? "primary-button compact" : "quiet-button compact"}
                style={{ fontSize: "10px", padding: "2px 6px" }}
                onClick={() => setMascotScale(presetVal)}
              >
                {Math.round(presetVal * 100)}%
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* Mascot Offset X & Y (Expanded -1000px to +1000px) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            {t("visualSandbox.offsetsTitleLabel")}
          </label>
          <button
            type="button"
            className="quiet-button compact"
            style={{ fontSize: "10.5px", padding: "2px 6px" }}
            onClick={() => {
              setMascotOffsetX(0);
              setMascotOffsetY(0);
            }}
            title={t("visualSandbox.resetOffsetsTitle")}
          >
            Reset 0
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Axis X */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>
                {t("visualSandbox.axisXPrefix")}: {mascotOffsetX > 0 ? `+${mascotOffsetX}` : mascotOffsetX}px
              </span>
              <div style={{ display: "flex", gap: "2px" }}>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetX((p) => Math.max(-1000, p - 50))}
                >
                  -50
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetX((p) => Math.max(-1000, p - 10))}
                >
                  -10
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetX((p) => Math.min(1000, p + 10))}
                >
                  +10
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetX((p) => Math.min(1000, p + 50))}
                >
                  +50
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-1000"
              max="1000"
              step="5"
              value={mascotOffsetX}
              onChange={(e) => setMascotOffsetX(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>

          {/* Axis Y */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>
                {t("visualSandbox.axisYPrefix")}: {mascotOffsetY > 0 ? `+${mascotOffsetY}` : mascotOffsetY}px
              </span>
              <div style={{ display: "flex", gap: "2px" }}>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetY((p) => Math.max(-1000, p - 50))}
                >
                  -50
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetY((p) => Math.max(-1000, p - 10))}
                >
                  -10
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetY((p) => Math.min(1000, p + 10))}
                >
                  +10
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetY((p) => Math.min(1000, p + 50))}
                >
                  +50
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-1000"
              max="1000"
              step="5"
              value={mascotOffsetY}
              onChange={(e) => setMascotOffsetY(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
