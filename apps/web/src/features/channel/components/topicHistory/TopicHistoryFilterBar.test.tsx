import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { TopicHistoryMetrics } from "../../types/history.types";
import { TopicHistoryFilterBar } from "./TopicHistoryFilterBar";

describe("TopicHistoryFilterBar", () => {
  afterEach(() => {
    cleanup();
  });
  const metrics: TopicHistoryMetrics = {
    totalCount: 12,
    episodeCount: 8,
    shortReelCount: 4,
    readyCount: 10,
    unboundCount: 2,
    unavailableCount: 0,
  };

  it("renders all tabs with correct count badges and ARIA roles", () => {
    const onFilterChange = vi.fn();
    const { getByRole } = render(<TopicHistoryFilterBar activeFilter="all" metrics={metrics} onFilterChange={onFilterChange} />);

    const tabList = getByRole("tablist", { name: /Filter topic history by format/i });
    expect(tabList).toBeDefined();

    const allTab = getByRole("tab", { name: /All/i });
    const epTab = getByRole("tab", { name: /16:9 Episodes/i });
    const shortTab = getByRole("tab", { name: /9:16 Shorts/i });

    expect(allTab.getAttribute("aria-selected")).toBe("true");
    expect(epTab.getAttribute("aria-selected")).toBe("false");
    expect(shortTab.getAttribute("aria-selected")).toBe("false");

    expect(allTab.textContent).toContain("(12)");
    expect(epTab.textContent).toContain("(8)");
    expect(shortTab.textContent).toContain("(4)");
  });

  it("calls onFilterChange when a tab is clicked", () => {
    const onFilterChange = vi.fn();
    const { getByRole } = render(<TopicHistoryFilterBar activeFilter="all" metrics={metrics} onFilterChange={onFilterChange} />);

    const epTab = getByRole("tab", { name: /16:9 Episodes/i });
    fireEvent.click(epTab);
    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith("episode");

    const shortTab = getByRole("tab", { name: /9:16 Shorts/i });
    fireEvent.click(shortTab);
    expect(onFilterChange).toHaveBeenCalledTimes(2);
    expect(onFilterChange).toHaveBeenCalledWith("short_reel");
  });
});
