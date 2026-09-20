import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MascotStudioActivityItem } from "../types/mascotStudioActivity.types";
import { MascotStudioActivityPanel } from "./MascotStudioActivityPanel";

const activeItem: MascotStudioActivityItem = {
  id: "expressive-states:batch-1",
  kind: "expressive_states",
  status: "running",
  isActive: true,
  styleId: "cyber",
  styleName: "Cyber Neon Pulse",
  completed: 3,
  failed: 1,
  total: 10,
  percentage: 40,
  updatedAt: "2026-09-20T00:00:00.000Z",
};

const completedItem: MascotStudioActivityItem = {
  id: "animation-processing:job-1",
  kind: "animation_processing",
  status: "completed",
  isActive: false,
  styleId: "core",
  styleName: "Core Style",
  state: "thinking",
  slotIndex: 2,
  completed: 100,
  failed: 0,
  total: 100,
  percentage: 100,
  updatedAt: "2026-09-20T00:00:00.000Z",
};

afterEach(cleanup);

describe("MascotStudioActivityPanel", () => {
  it("shows every process with status and progress", () => {
    render(
      <MascotStudioActivityPanel
        activities={[activeItem, completedItem]}
        isLoading={false}
        isRefreshing={false}
        error={null}
        hasWarnings={false}
        onRefresh={vi.fn()}
        onOpen={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText("Background activity")).toBeTruthy();
    expect(screen.getByText("Expressive states · Cyber Neon Pulse")).toBeTruthy();
    expect(screen.getByText("Animation processing · Core Style")).toBeTruthy();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    expect(screen.getByLabelText("Expressive states · Cyber Neon Pulse progress").getAttribute("aria-valuenow")).toBe("40");
  });

  it("opens and dismisses the selected activity", () => {
    const onOpen = vi.fn();
    const onDismiss = vi.fn();
    render(
      <MascotStudioActivityPanel
        activities={[completedItem]}
        isLoading={false}
        isRefreshing={false}
        error={null}
        hasWarnings={false}
        onRefresh={vi.fn()}
        onOpen={onOpen}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View Animation processing · Core Style" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Animation processing · Core Style" }));
    expect(onOpen).toHaveBeenCalledWith(completedItem);
    expect(onDismiss).toHaveBeenCalledWith(completedItem.id);
  });
});
