import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScriptSeedSelector } from "./ScriptSeedSelector";

describe("ScriptSeedSelector component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders 4 seeds for versus_faceoff and allows selecting a seed", () => {
    const onSelectSeed = vi.fn();
    render(
      <ScriptSeedSelector
        archetype="versus_faceoff"
        selectedSeedId={null}
        onSelectSeed={onSelectSeed}
      />,
    );

    expect(screen.getByText("Director Seed")).toBeDefined();
    expect(screen.getByText("Auto (Dynamic)")).toBeDefined();

    const select = screen.getByRole("combobox", { name: /select script director seed/i });
    expect(select).toBeDefined();

    // Default seed preview
    const preview = screen.getByTestId("active-seed-preview");
    expect(preview.textContent).toContain("Arena Clash");

    // Select custom seed
    fireEvent.change(select, { target: { value: "vf_tale_of_the_tape" } });
    expect(onSelectSeed).toHaveBeenCalledWith("vf_tale_of_the_tape");
  });

  it("renders manual mode badge and active seed details when seedId is provided", () => {
    const onSelectSeed = vi.fn();
    render(
      <ScriptSeedSelector
        archetype="verdict_true_false"
        selectedSeedId="tf_mythbusters_lab"
        onSelectSeed={onSelectSeed}
      />,
    );

    expect(screen.getByText("Manual")).toBeDefined();
    const preview = screen.getByTestId("active-seed-preview");
    expect(preview.textContent).toContain("MythBusters Lab");
    expect(preview.textContent).toContain("9:16 Staging:");
    expect(preview.textContent).toContain("Laboratory workbench");
  });

  it("renders deep_trivia seeds properly", () => {
    const onSelectSeed = vi.fn();
    render(
      <ScriptSeedSelector
        archetype="deep_trivia"
        selectedSeedId="dt_counter_intuitive_trap"
        onSelectSeed={onSelectSeed}
      />,
    );

    const preview = screen.getByTestId("active-seed-preview");
    expect(preview.textContent).toContain("Counter-Intuitive Trap");
    expect(preview.textContent).toContain("The cognitive illusion 90% get wrong");
  });
});
