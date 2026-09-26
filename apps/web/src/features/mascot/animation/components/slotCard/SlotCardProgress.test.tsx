import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SlotCardProgress } from "./SlotCardProgress";

afterEach(cleanup);

it("acknowledges cancellation immediately, prevents duplicates and releases the button after the request", async () => {
  let finish!: () => void;
  const onCancelJob = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  render(<SlotCardProgress status="processing" isQueued={false} activeJobId="job-1" onCancelJob={onCancelJob} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  const button = screen.getByRole("button", { name: "Cancelling…" });
  expect(button.hasAttribute("disabled")).toBe(true);
  fireEvent.click(button);
  expect(onCancelJob).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(screen.getByRole("button", { name: "Cancel" }).hasAttribute("disabled")).toBe(false);
});
