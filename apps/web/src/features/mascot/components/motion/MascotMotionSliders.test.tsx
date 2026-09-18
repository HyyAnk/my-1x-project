import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MascotMotionSliders } from "./MascotMotionSliders";
import { LanguageProvider } from "../../../../i18n";

afterEach(() => {
  cleanup();
});

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe("MascotMotionSliders", () => {
  it("renders speed and intensity pills and triggers callbacks", () => {
    const onChangeMotionSpeed = vi.fn();
    const onChangeMotionIntensity = vi.fn();

    render(
      <MascotMotionSliders
        activePreviewAction="thinking"
        currentSpeed={1.0}
        currentIntensity="normal"
        onChangeMotionSpeed={onChangeMotionSpeed}
        onChangeMotionIntensity={onChangeMotionIntensity}
      />,
      { wrapper },
    );

    const fastSpeedButton = screen.getAllByRole("button").find((b) => b.textContent?.includes("Fast"));
    expect(fastSpeedButton).toBeTruthy();
    fireEvent.click(fastSpeedButton!);
    expect(onChangeMotionSpeed).toHaveBeenCalledWith("thinking", 1.5);

    const subtleButton = screen.getAllByRole("button").find((b) => b.textContent?.includes("Subtle"));
    expect(subtleButton).toBeTruthy();
    fireEvent.click(subtleButton!);
    expect(onChangeMotionIntensity).toHaveBeenCalledWith("thinking", "subtle");
  });
});
