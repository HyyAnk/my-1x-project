import { useTranslation } from "../../../../i18n";

export type SandboxGuidesOverlayProps = {
  showSafeArea: boolean;
  showShortsGuide: boolean;
  aspectRatio: "16:9" | "9:16";
};

export function SandboxGuidesOverlay({ showSafeArea, showShortsGuide, aspectRatio }: SandboxGuidesOverlayProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Safe Area 16:9 Overlay (strictly inside frame) */}
      {showSafeArea && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          {/* Action Safe (90%) */}
          <div
            style={{
              position: "absolute",
              inset: aspectRatio === "16:9" ? "54px 96px" : "96px 54px",
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

          {/* Title Safe (80%) */}
          <div
            style={{
              position: "absolute",
              inset: aspectRatio === "16:9" ? "108px 192px" : "192px 108px",
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
      )}

      {/* Shorts 9:16 Center Crop Guide Overlay (strictly inside frame) */}
      {showShortsGuide && aspectRatio === "16:9" && (
        <div
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
              }}
            >
              {t("visualSandbox.shortsSafeLabel")}
            </span>
          </div>
          <div style={{ flex: 1, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)" }} />
        </div>
      )}
    </>
  );
}
