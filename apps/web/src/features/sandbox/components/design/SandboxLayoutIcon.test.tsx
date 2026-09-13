import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SandboxLayoutIcon, LayoutIcon } from "./SandboxLayoutIcon";

afterEach(() => {
  cleanup();
});

describe("SandboxLayoutIcon", () => {
  it("renders split icon", () => {
    const { container } = render(<SandboxLayoutIcon icon="split" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders visual icon", () => {
    const { container } = render(<SandboxLayoutIcon icon="visual" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders stack icon", () => {
    const { container } = render(<SandboxLayoutIcon icon="stack" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders default fallback when given unknown icon", () => {
    const { container } = render(<SandboxLayoutIcon icon={"unknown" as any} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("exports LayoutIcon as an alias", () => {
    expect(LayoutIcon).toBe(SandboxLayoutIcon);
  });
});
