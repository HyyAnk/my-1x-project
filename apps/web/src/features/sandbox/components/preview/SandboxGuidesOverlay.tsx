import { useTranslation } from "../../../../i18n";
import type { SandboxAspectRatio } from "../../hooks/useSandboxViewportState";

export type SandboxGuidesOverlayProps = {
  showSafeArea: boolean;
  showShortsGuide: boolean;
  aspectRatio: SandboxAspectRatio;
};

export function SandboxGuidesOverlay({ showSafeArea, showShortsGuide, aspectRatio }: SandboxGuidesOverlayProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* 1. Safe Area Overlays (strictly inside frame) */}
      {showSafeArea && aspectRatio === "16:9" && (
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
      )}

      {/* Safe Area 9:16 Portrait Platform Safe Zone (Exact parity with candyArcadeStyles: top: 180px, bottom: 440px, right: 140px, left: 36px) */}
      {showSafeArea && aspectRatio === "9:16" && (
        <div
          data-testid="sandbox-guides-overlay-9-16"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          {/* Top Platform Excluded Zone (Header, Search, Brand) */}
          <div
            data-testid="safe-zone-platform-top"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "180px",
              background: "rgba(239, 68, 68, 0.18)",
              borderBottom: "2px dashed rgba(239, 68, 68, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#FCA5A5",
                background: "rgba(0,0,0,0.65)",
                padding: "3px 10px",
                borderRadius: "4px",
              }}
            >
              Top Safe Zone (180px - Platform Header)
            </span>
          </div>

          {/* Bottom Platform Excluded Zone (Captions, Audio Disc, Nav) */}
          <div
            data-testid="safe-zone-platform-bottom"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "440px",
              background: "rgba(239, 68, 68, 0.18)",
              borderTop: "2px dashed rgba(239, 68, 68, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#FCA5A5",
                background: "rgba(0,0,0,0.65)",
                padding: "3px 10px",
                borderRadius: "4px",
              }}
            >
              Bottom Safe Zone (440px - Captions & Audio)
            </span>
          </div>

          {/* Right Platform Excluded Zone (Like, Comment, Share, Profile) */}
          <div
            data-testid="safe-zone-platform-right"
            style={{
              position: "absolute",
              top: "180px",
              bottom: "440px",
              right: 0,
              width: "140px",
              background: "rgba(239, 68, 68, 0.18)",
              borderLeft: "2px dashed rgba(239, 68, 68, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#FCA5A5",
                background: "rgba(0,0,0,0.65)",
                padding: "3px 8px",
                borderRadius: "4px",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
              }}
            >
              Action Rail (140px)
            </span>
          </div>

          {/* Platform Active Content Safe Zone (Bounded exactly by top: 180px, bottom: 440px, right: 140px, left: 36px) */}
          <div
            data-testid="safe-zone-platform-active"
            style={{
              position: "absolute",
              top: "180px",
              bottom: "440px",
              left: "36px",
              right: "140px",
              border: "3px solid #22C55E",
              borderRadius: "16px",
              boxShadow: "0 0 20px rgba(34, 197, 94, 0.35)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "10px",
                left: "12px",
                fontSize: "13px",
                fontWeight: 800,
                color: "#22C55E",
                background: "rgba(0,0,0,0.7)",
                padding: "4px 10px",
                borderRadius: "6px",
              }}
            >
              Platform Safe Zone (Shorts / Reels / TikTok)
            </span>
          </div>
        </div>
      )}

      {/* 2. Shorts 9:16 Center Crop Guide Overlay (strictly inside 16:9 frame) */}
      {showShortsGuide && aspectRatio === "16:9" && (
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
      )}
    </>
  );
}
