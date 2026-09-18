import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MascotStyle } from "@studio/shared";
import { ReadinessChip } from "./ReadinessChip";

describe("ReadinessChip", () => {
  it("renders null when style is null", () => {
    const { container } = render(<ReadinessChip style={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders chip for fully expressive style", () => {
    const style: MascotStyle = {
      id: "s1",
      name: "S1",
      keyword: "",
      is_default: false,
      anchor_image_url: "https://example.com/img.png",
      states: {
        thinking: Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, slot_index: i + 1, image_url: `https://example.com/${i}.png` })),
        celebrate: Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, slot_index: i + 1, image_url: `https://example.com/${i}.png` })),
      },
      created_at: "",
      updated_at: "",
    };
    render(<ReadinessChip style={style} />);
    const chip = screen.getByText("20 Poses");
    expect(chip).toBeDefined();
    expect(chip.className).toContain("is-fully-expressive");
  });

  it("renders chip for concept locked style", () => {
    const style: MascotStyle = {
      id: "s2",
      name: "S2",
      keyword: "",
      is_default: false,
      anchor_image_url: "https://example.com/img.png",
      states: { thinking: [], celebrate: [] },
      created_at: "",
      updated_at: "",
    };
    render(<ReadinessChip style={style} />);
    const chip = screen.getByText("Concept Locked");
    expect(chip).toBeDefined();
    expect(chip.className).toContain("is-concept-locked");
  });
});
