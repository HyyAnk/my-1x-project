import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StylePresetManager } from "./StylePresetManager";

vi.mock("../hooks/useStylePresets", () => ({
  useStylePresets: () => ({
    presets: [],
    loading: false,
    error: null,
    mutation: null,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    duplicate: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("StylePresetManager", () => {
  it("opens the new preset editor", () => {
    render(<StylePresetManager />);
    fireEvent.click(screen.getByRole("button", { name: "New preset" }));
    expect(screen.getByRole("form", { name: "Create style preset" })).toBeTruthy();
  });
});
