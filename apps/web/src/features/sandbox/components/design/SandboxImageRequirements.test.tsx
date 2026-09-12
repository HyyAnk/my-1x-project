import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SandboxImageRequirements, type SandboxImageRequirementItem } from "./SandboxImageRequirements";

afterEach(() => {
  cleanup();
});

describe("SandboxImageRequirements", () => {
  it("renders null when requirements array is empty or missing", () => {
    const { container, rerender } = render(<SandboxImageRequirements requirements={[]} />);
    expect(container.firstChild).toBeNull();

    rerender(<SandboxImageRequirements requirements={null} />);
    expect(container.firstChild).toBeNull();

    rerender(<SandboxImageRequirements />);
    expect(container.firstChild).toBeNull();
  });

  it("renders compact badges for hero and choice image requirements", () => {
    const items: SandboxImageRequirementItem[] = [
      {
        role: "hero",
        label: "Hero Media",
        aspectRatio: "4:3",
        recommended: { width: 1056, height: 792 },
        fit: "cover",
      },
      {
        role: "choice",
        label: "Choices",
        aspectRatio: "4:3",
        recommended: { width: 672, height: 504 },
        fit: "cover",
      },
    ];

    render(<SandboxImageRequirements requirements={items} />);

    expect(screen.getByTestId("sandbox-layout-media-spec")).toBeTruthy();
    expect(screen.getByText("Hero Media: 4:3 (1056×792px)")).toBeTruthy();
    expect(screen.getByText("Choices: 4:3 (672×504px)")).toBeTruthy();
  });

  it("toggles accessible expanded details disclosure on click", () => {
    const items: SandboxImageRequirementItem[] = [
      {
        role: "hero",
        label: "Hero Media",
        aspectRatio: "16:9",
        recommended: { width: 1024, height: 576 },
        fit: "contain",
        providerPayload: { width: 1280, height: 720, aspectRatio: "16:9" },
        actual: { width: 1920, height: 1080 },
      },
    ];

    render(<SandboxImageRequirements requirements={items} />);

    const toggleButton = screen.getByRole("button", { name: /toggle image sizing details/i });
    expect(toggleButton).toBeTruthy();
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("sandbox-media-spec-details")).toBeNull();

    // Expand
    fireEvent.click(toggleButton);
    expect(toggleButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("sandbox-media-spec-details")).toBeTruthy();
    expect(screen.getByText(/Target Ratio:/)).toBeTruthy();
    expect(screen.getByText("16:9")).toBeTruthy();
    expect(screen.getByText(/Recommended:/)).toBeTruthy();
    expect(screen.getByText("1024×576px")).toBeTruthy();
    expect(screen.getByText(/Fit:/)).toBeTruthy();
    expect(screen.getByText("contain")).toBeTruthy();
    expect(screen.getByText(/Provider Request:/)).toBeTruthy();
    expect(screen.getByText(/1280×720px/)).toBeTruthy();
    expect(screen.getByText(/Actual Output:/)).toBeTruthy();
    expect(screen.getByText(/1920×1080px/)).toBeTruthy();

    // Collapse
    fireEvent.click(toggleButton);
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("sandbox-media-spec-details")).toBeNull();
  });

  it("accepts a single recommendation object directly", () => {
    const recommendation = {
      aspectRatio: "1:1" as const,
      recommended: { width: 728, height: 728 },
      fit: "cover" as const,
      naturalScale: 1.5,
      candidateRatios: ["1:1", "4:3", "16:9"],
      slot: {
        layoutId: "visual_choices_three_pure" as const,
        purpose: "choice_image" as const,
        cardBorderBox: { width: 452, height: 504 },
        mediaBorderBox: { width: 452, height: 504 },
        borderEachSide: 10,
        viewport: { width: 432, height: 484 },
        displayFit: "cover" as const,
      },
    };

    render(<SandboxImageRequirements recommendation={recommendation} role="choice" label="Choices" />);

    expect(screen.getByTestId("sandbox-layout-media-spec")).toBeTruthy();
    expect(screen.getByText("Choices: 1:1 (728×728px)")).toBeTruthy();
  });
});
