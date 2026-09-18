import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StyleThumbnail } from "./StyleThumbnail";

describe("StyleThumbnail", () => {
  it("renders null when thumbUrl is null", () => {
    const { container } = render(<StyleThumbnail thumbUrl={null} altText="Core Style" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders image when thumbUrl is provided", () => {
    render(<StyleThumbnail thumbUrl="https://example.com/mascot.png" altText="Core Style" />);
    const img = screen.getByAltText("Core Style");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/mascot.png");
  });
});
