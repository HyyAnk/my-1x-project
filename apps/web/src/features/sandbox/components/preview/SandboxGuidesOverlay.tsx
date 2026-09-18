import type { SandboxAspectRatio } from "../../hooks/useSandboxViewportState";
import { SandboxSafeArea16x9, SandboxShortsGuideOverlay } from "./guides";

export type SandboxGuidesOverlayProps = {
  showSafeArea: boolean;
  showShortsGuide: boolean;
  aspectRatio?: SandboxAspectRatio;
};

export function SandboxGuidesOverlay({ showSafeArea, showShortsGuide }: SandboxGuidesOverlayProps) {
  return (
    <>
      {showSafeArea && <SandboxSafeArea16x9 />}
      {showShortsGuide && <SandboxShortsGuideOverlay />}
    </>
  );
}
