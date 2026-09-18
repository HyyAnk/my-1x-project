import { useTranslation } from "../../../../../i18n";

export function SandboxSafeArea16x9() {
  const { t } = useTranslation();

  return (
    <div
      data-testid="sandbox-guides-overlay-16-9"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {/* Action Safe (90% - 54px top/bottom, 96px left/right) */}
      <div
        data-testid="safe-zone-action"
        style={{
          position: "absolute",
          inset: "54px 96px",
          border: "2px dashed rgba(255, 220, 40, 0.75)",
          borderRadius: "16px",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "8px",
            left: "12px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#FFDC28",
            background: "rgba(0,0,0,0.6)",
            padding: "2px 8px",
            borderRadius: "4px",
          }}
        >
          {t("visualSandbox.actionSafeLabel")}
        </span>
      </div>

      {/* Title Safe (80% - 108px top/bottom, 192px left/right) */}
      <div
        data-testid="safe-zone-title"
        style={{
          position: "absolute",
          inset: "108px 192px",
          border: "2px dashed rgba(56, 189, 248, 0.75)",
          borderRadius: "16px",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "8px",
            left: "12px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#38BDF8",
            background: "rgba(0,0,0,0.6)",
            padding: "2px 8px",
            borderRadius: "4px",
          }}
        >
          {t("visualSandbox.titleSafeLabel")}
        </span>
      </div>
    </div>
  );
}
