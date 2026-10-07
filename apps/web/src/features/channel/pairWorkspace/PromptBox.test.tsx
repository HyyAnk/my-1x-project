import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { PromptBox } from "./PromptBox";

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

function mockClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

describe("PromptBox", () => {
  it("renders a standard single prompt box for intro", () => {
    const onChange = vi.fn();
    render(<PromptBox kind="intro" value="Hello Intro" disabled={false} onChange={onChange} />);

    expect(screen.getByText("Intro")).toBeDefined();
    expect(screen.getByRole("textbox", { name: "Intro script" })).toBeDefined();
    expect(screen.queryByText(/Part 1/)).toBeNull();
  });

  it("renders a standard single prompt box for simple outro without parts", () => {
    const onChange = vi.fn();
    render(<PromptBox kind="outro" value="Single 8s Outro" disabled={false} onChange={onChange} />);

    expect(screen.getByText("Outro")).toBeDefined();
    expect(screen.getByRole("textbox", { name: "Outro script" })).toBeDefined();
    expect(screen.queryByText(/Part 1/)).toBeNull();
  });

  it("renders two dedicated sub-boxes when outro contains a two-part script", async () => {
    const onChange = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);

    const twoPartScript = `Create one continuous outro

================================================================================
PART 1: THE RUN-UP & KINEMATIC TRANSITION (0.0s - 8s)
================================================================================
Sprint forward and jump through the portal ring.

================================================================================
PART 2: MOMENTUM RECOVERY, CTA & FAREWELL (8s - 16s)
================================================================================
Roll onto the floor and wave goodbye.`;

    render(<PromptBox kind="outro" value={twoPartScript} disabled={false} onChange={onChange} />);

    expect(screen.getByText("Outro (16s · 2-Part Sequence)")).toBeDefined();
    expect(screen.getByText("Part 1 · The Run-Up & Stunt (0.0s – 8.0s)")).toBeDefined();
    expect(screen.getByText("Part 2 · Momentum & Farewell (8.0s – 16.0s)")).toBeDefined();

    const part1Area = screen.getByRole("textbox", { name: "Outro script (Part 1)" }) as HTMLTextAreaElement;
    const part2Area = screen.getByRole("textbox", { name: "Outro script (Part 2)" }) as HTMLTextAreaElement;
    expect(part1Area.value).toContain("PART 1: THE RUN-UP & KINEMATIC TRANSITION");
    expect(part2Area.value).toContain("PART 2: MOMENTUM RECOVERY, CTA & FAREWELL");
    expect(part2Area.value).not.toContain("PART 1: THE RUN-UP");

    // Copy Part 1
    fireEvent.click(screen.getByRole("button", { name: "Copy Part 1 script" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(part1Area.value));

    // Copy Part 2
    fireEvent.click(screen.getByRole("button", { name: "Copy Part 2 script" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(part2Area.value));

    // Copy Full
    fireEvent.click(screen.getByRole("button", { name: "Copy outro script" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(twoPartScript));
  });

  it("renders a single prompt box when duration is 10s even if value contains legacy two-part delimiter", () => {
    const onChange = vi.fn();
    const twoPartScript = `Create one continuous outro\nPART 1:\n================================================================================\nPART 2:`;
    render(<PromptBox kind="outro" value={twoPartScript} duration={10} disabled={false} onChange={onChange} />);

    expect(screen.getByText("Outro (10s · Single Clip)")).toBeDefined();
    expect(screen.getByRole("textbox", { name: "Outro script" })).toBeDefined();
    expect(screen.queryByText(/Part 1/)).toBeNull();
  });
});
