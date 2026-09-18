import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChannelEpisodesToolbar } from "./ChannelEpisodesToolbar";

afterEach(cleanup);

describe("ChannelEpisodesToolbar", () => {
  it("renders search input, filter chips, and sort dropdown correctly", () => {
    const onSearchChange = vi.fn();
    const onFilterChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <ChannelEpisodesToolbar
        search="test search"
        filter="in_progress"
        sort="updated_desc"
        onSearchChange={onSearchChange}
        onFilterChange={onFilterChange}
        onSortChange={onSortChange}
      />,
    );

    const searchInput = screen.getByRole("textbox", { name: "Search episodes" }) as HTMLInputElement;
    expect(searchInput.value).toBe("test search");

    const clearButton = screen.getByRole("button", { name: "Clear search" });
    fireEvent.click(clearButton);
    expect(onSearchChange).toHaveBeenCalledWith("");

    const videoReadyChip = screen.getByRole("button", { name: "Video Ready" });
    fireEvent.click(videoReadyChip);
    expect(onFilterChange).toHaveBeenCalledWith("video_ready");

    const sortSelect = screen.getByRole("combobox", { name: "Sort episodes" });
    fireEvent.change(sortSelect, { target: { value: "title_asc" } });
    expect(onSortChange).toHaveBeenCalledWith("title_asc");
  });
});
