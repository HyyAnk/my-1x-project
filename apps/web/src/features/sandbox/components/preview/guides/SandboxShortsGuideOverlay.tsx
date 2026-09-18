import { useTranslation } from "../../../../../i18n";

export function SandboxShortsGuideOverlay() {
  const { t } = useTranslation();

  return (
    <div
      data-testid="sandbox-guides-overlay-shorts"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ flex: 1, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)" }} />
      <div
        style={{
          width: "607.5px", // 1080 * 9 / 16
          height: "1080px",
          border: "3px solid #FF3366",
          boxShadow: "0 0 30px rgba(255,51,102,0.5)",
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "14px",
            fontWeight: 800,
            color: "#FFF",
            background: "#FF3366",
            padding: "4px 14px",
            borderRadius: "999px",
            zIndex: 10,
          }}
        >
          {t("visualSandbox.shortsSafeLabel")}
        </span>

        {/* Proportional Platform Safe Zone Inset (1080/1920 scale = 0.5625) */}
        <div
          data-testid="shorts-guide-platform-safe-zone"
          style={{
            position: "absolute",
            top: "101.25px", // 180 * (1080/1920)
            bottom: "247.5px", // 440 * (1080/1920)
            left: "20.25px", // 36 * (607.5/1080)
            right: "78.75px", // 140 * (607.5/1080)
            border: "2px dashed rgba(34, 197, 94, 0.85)",
            borderRadius: "10px",
          }}
        >
          <span
            style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#22C55E",
              background: "rgba(0,0,0,0.6)",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            Safe Area
          </span>
        </div>
      </div>
      <div style={{ flex: 1, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)" }} />
    </div>
  );
}
