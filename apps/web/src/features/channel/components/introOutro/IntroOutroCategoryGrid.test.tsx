import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntroOutroCategoryGrid } from "./IntroOutroCategoryGrid";

afterEach(cleanup);

describe("IntroOutroCategoryGrid", () => {
  it("opens the selected built-in category and shows its ready inventory", () => {
    const onOpenCategory = vi.fn();
    render(
      <IntroOutroCategoryGrid
        categories={[
          {
            style_preset_id: "preset_arcade_classic",
            name: "Arcade Classic",
            icon: "🕹️",
            total_count: 3,
            ready_count: 2,
          },
          {
            style_preset_id: "preset_cyber_neon",
            name: "Cyber Neon",
            icon: "🌃",
            total_count: 1,
            ready_count: 1,
          },
        ]}
        onOpenCategory={onOpenCategory}
      />,
    );

    expect(screen.getByText("2 ready")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Cyber Neon/i }));

    expect(onOpenCategory).toHaveBeenCalledOnce();
    expect(onOpenCategory).toHaveBeenCalledWith("preset_cyber_neon");
  });
});
