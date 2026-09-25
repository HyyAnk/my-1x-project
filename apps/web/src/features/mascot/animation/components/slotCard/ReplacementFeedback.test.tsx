import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ANIMATION_STATES, SLOTS_PER_STATE, type MascotSlotProjection } from "@studio/shared";
import { AnimationProcessingSlotCard } from "../AnimationProcessingSlotCard";

afterEach(cleanup);
const styles = [
  "core",
  "builtin_cyber_neon",
  "builtin_comic_boom",
  "builtin_build_zone",
  "builtin_cosmic_space",
  "builtin_pastel_dream",
  "builtin_treasure_quest",
];
const cases = styles.flatMap((styleId) =>
  ANIMATION_STATES.flatMap((state) => Array.from({ length: SLOTS_PER_STATE }, (_, i) => ({ styleId, state, slotIndex: i + 1 }))),
);

it.each(cases)("exposes a failed replacement for $styleId / $state / $slotIndex", ({ styleId, state, slotIndex }) => {
  const projection: MascotSlotProjection = {
    style_id: styleId,
    state,
    slot_index: slotIndex,
    status: "ready",
    active_attempt: 4,
    active_revision_id: "rev_2",
    error_code: "EXCESSIVE_DRIFT",
    error_message: "Subject motion exceeds tolerance",
    updated_at: "2026-09-24T00:00:00Z",
  };
  const props = {
    mascotId: "m",
    styleId,
    state,
    slotIndex,
    projection,
    onUploadVideo: vi.fn(),
    onReplaceVideo: vi.fn(),
    onRetry: vi.fn(),
    onCancelJob: vi.fn(),
  };
  const { rerender } = render(<AnimationProcessingSlotCard {...props} />);
  expect(screen.queryByText("Ready")).toBeNull();
  expect(screen.getByRole("alert").textContent).toContain("Showing the previous animation");
  expect(screen.getByRole("button", { name: "Replace Video" })).toBeTruthy();
  rerender(<AnimationProcessingSlotCard {...props} isBusy />);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Processing")).toBeTruthy();
  rerender(<AnimationProcessingSlotCard {...props} projection={{ ...projection, error_code: null, error_message: null }} />);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Ready")).toBeTruthy();
});
