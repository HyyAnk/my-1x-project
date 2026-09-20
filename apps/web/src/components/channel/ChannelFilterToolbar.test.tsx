import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChannelFilterToolbar } from "./ChannelFilterToolbar";
import { LanguageProvider } from "../../i18n";

afterEach(cleanup);

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe("ChannelFilterToolbar", () => {
  const defaultProps = {
    totalChannels: 12,
    languageCounts: { English: 5, Japanese: 3, German: 4, Chinese: 2 },
    languageFilter: "all",
    onLanguageFilterChange: vi.fn(),
    sortBy: "latest" as const,
    onSortByChange: vi.fn(),
    isReordering: false,
    hasCustomOrder: false,
    onStartReordering: vi.fn(),
  };

  it("renders total channels count and language pills", () => {
    render(<ChannelFilterToolbar {...defaultProps} />, { wrapper });

    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByTitle("Chinese")).toBeDefined();
  });

  it("calls onLanguageFilterChange when clicking a language pill", () => {
    const onLanguageFilterChange = vi.fn();
    render(<ChannelFilterToolbar {...defaultProps} onLanguageFilterChange={onLanguageFilterChange} />, { wrapper });

    const englishBtn = screen.getByTitle("English");
    fireEvent.click(englishBtn);
    expect(onLanguageFilterChange).toHaveBeenCalledWith("English");
  });

  it("calls onStartReordering when clicking the reorder button", () => {
    const onStartReordering = vi.fn();
    render(<ChannelFilterToolbar {...defaultProps} onStartReordering={onStartReordering} />, { wrapper });

    const reorderBtn = screen.getByRole("button", { name: /reorder/i });
    fireEvent.click(reorderBtn);
    expect(onStartReordering).toHaveBeenCalledTimes(1);
  });

  it("calls onSortByChange when selecting a new sort option", () => {
    const onSortByChange = vi.fn();
    render(<ChannelFilterToolbar {...defaultProps} onSortByChange={onSortByChange} />, { wrapper });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "name" } });
    expect(onSortByChange).toHaveBeenCalledWith("name");
  });

  it("disables buttons and select when isReordering is true", () => {
    render(<ChannelFilterToolbar {...defaultProps} isReordering={true} />, { wrapper });

    const allBtn = screen.getByText("12").closest("button");
    expect(allBtn?.hasAttribute("disabled")).toBe(true);

    const select = screen.getByRole("combobox");
    expect(select.hasAttribute("disabled")).toBe(true);

    // Reorder button should not be displayed while already reordering
    expect(screen.queryByRole("button", { name: /reorder/i })).toBeNull();
  });
});
