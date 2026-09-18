import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { MascotStyle } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotStyleAnchorHeader } from "./MascotStyleAnchorHeader";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
});

describe("MascotStyleAnchorHeader", () => {
  const coreStyle: MascotStyle = {
    id: "core",
    name: "Core Style",
    keyword: "",
    is_default: true,
    anchor_image_url: null,
    raw_anchor_image_url: null,
    states: { thinking: [], celebrate: [] },
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  const customStyle: MascotStyle = {
    id: "steampunk",
    name: "Steampunk",
    keyword: "brass, goggles, steam",
    is_default: false,
    anchor_image_url: "/img/steampunk.png",
    raw_anchor_image_url: null,
    states: { thinking: [], celebrate: [] },
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  it("renders core style name and core badges", () => {
    render(<MascotStyleAnchorHeader style={coreStyle} isCore={true} hasImage={true} keywordsList={[]} />, { wrapper });

    expect(screen.getByText("Core Style")).toBeDefined();
    expect(screen.getByText(/Core Concept/i)).toBeDefined();
    expect(screen.getByText(/Locked/i)).toBeDefined();
  });

  it("renders custom style keywords and pose count", () => {
    render(
      <MascotStyleAnchorHeader
        style={customStyle}
        isCore={false}
        hasImage={true}
        keywordsList={["brass", "goggles", "steam"]}
        filledPosesCount={4}
      />,
      { wrapper },
    );

    expect(screen.getByText("Steampunk")).toBeDefined();
    expect(screen.getByText("brass")).toBeDefined();
    expect(screen.getByText("goggles")).toBeDefined();
    expect(screen.getByText("+1")).toBeDefined();
    expect(screen.getByText(/4\/20 Poses/i)).toBeDefined();
  });

  it("triggers onDelete callback when delete button is present and clicked", () => {
    const onDelete = vi.fn();
    render(<MascotStyleAnchorHeader style={customStyle} isCore={false} hasImage={false} keywordsList={[]} onDelete={onDelete} />, {
      wrapper,
    });

    const deleteBtn = screen.getByTitle("Delete Style");
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
