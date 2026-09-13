import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../../../../i18n/LanguageContext";
import { SandboxGuidesOverlay } from "./SandboxGuidesOverlay";

afterEach(() => {
  cleanup();
});

describe("SandboxGuidesOverlay (Stage 8 Visual & Safe-Zone Parity)", () => {
  it("renders 16:9 broadcast Action Safe and Title Safe boundaries", () => {
    render(
      <LanguageProvider>
        <SandboxGuidesOverlay showSafeArea={true} showShortsGuide={false} aspectRatio="16:9" />
      </LanguageProvider>,
    );

    const overlay16x9 = screen.getByTestId("sandbox-guides-overlay-16-9");
    expect(overlay16x9).toBeTruthy();

    const actionSafe = screen.getByTestId("safe-zone-action");
    expect(actionSafe.style.inset).toBe("54px 96px");

    const titleSafe = screen.getByTestId("safe-zone-title");
    expect(titleSafe.style.inset).toBe("108px 192px");
  });

  it("renders 9:16 platform safe-zone boundaries matching candyArcadeStyles exactly", () => {
    render(
      <LanguageProvider>
        <SandboxGuidesOverlay showSafeArea={true} showShortsGuide={false} aspectRatio="9:16" />
      </LanguageProvider>,
    );

    const overlay9x16 = screen.getByTestId("sandbox-guides-overlay-9-16");
    expect(overlay9x16).toBeTruthy();

    // Top Platform Excluded Zone (180px)
    const topZone = screen.getByTestId("safe-zone-platform-top");
    expect(topZone.style.height).toBe("180px");

    // Bottom Platform Excluded Zone (440px)
    const bottomZone = screen.getByTestId("safe-zone-platform-bottom");
    expect(bottomZone.style.height).toBe("440px");

    // Right Action Rail (140px)
    const rightZone = screen.getByTestId("safe-zone-platform-right");
    expect(rightZone.style.width).toBe("140px");

    // Active Safe Zone (top: 180px, bottom: 440px, right: 140px, left: 36px)
    const activeZone = screen.getByTestId("safe-zone-platform-active");
    expect(activeZone.style.top).toBe("180px");
    expect(activeZone.style.bottom).toBe("440px");
    expect(activeZone.style.right).toBe("140px");
    expect(activeZone.style.left).toBe("36px");
  });

  it("renders Shorts center-crop and proportional safe-zone preview in 16:9 mode", () => {
    render(
      <LanguageProvider>
        <SandboxGuidesOverlay showSafeArea={false} showShortsGuide={true} aspectRatio="16:9" />
      </LanguageProvider>,
    );

    const shortsOverlay = screen.getByTestId("sandbox-guides-overlay-shorts");
    expect(shortsOverlay).toBeTruthy();

    const proportionalZone = screen.getByTestId("shorts-guide-platform-safe-zone");
    expect(proportionalZone).toBeTruthy();
    expect(proportionalZone.style.top).toBe("101.25px");
    expect(proportionalZone.style.bottom).toBe("247.5px");
    expect(proportionalZone.style.right).toBe("78.75px");
    expect(proportionalZone.style.left).toBe("20.25px");
  });

  it("hides safe-area guides when showSafeArea is false", () => {
    render(
      <LanguageProvider>
        <SandboxGuidesOverlay showSafeArea={false} showShortsGuide={false} aspectRatio="16:9" />
      </LanguageProvider>,
    );

    expect(screen.queryByTestId("sandbox-guides-overlay-16-9")).toBeNull();
    expect(screen.queryByTestId("sandbox-guides-overlay-9-16")).toBeNull();
  });
});
