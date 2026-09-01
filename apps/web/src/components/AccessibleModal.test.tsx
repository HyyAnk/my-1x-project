import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AccessibleModal } from "./AccessibleModal";

afterEach(cleanup);

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <main aria-hidden="false">
      <button type="button" onClick={() => setOpen(true)}>
        Open locale editor
      </button>
      {open ? (
        <AccessibleModal titleId="locale-dialog-title" onDismiss={() => setOpen(false)}>
          <section className="modal">
            <h2 id="locale-dialog-title">Locale editor</h2>
            <button type="button">First action</button>
            <input aria-label="Locale value" />
            <button type="button">Last action</button>
          </section>
        </AccessibleModal>
      ) : null}
    </main>
  );
}

describe("AccessibleModal", () => {
  it("wraps focus forward and backward inside the real dialog", () => {
    render(<ModalHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Open locale editor" }));
    const dialog = screen.getByRole("dialog", { name: "Locale editor" });
    const first = screen.getByRole("button", { name: "First action" });
    const last = screen.getByRole("button", { name: "Last action" });

    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    first.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("isolates and restores the background, closes on Escape, and restores opener focus", async () => {
    const { container } = render(<ModalHarness />);
    const opener = screen.getByRole("button", { name: "Open locale editor" });
    opener.focus();
    fireEvent.click(opener);

    expect(container.hasAttribute("inert")).toBe(true);
    expect(container.getAttribute("aria-hidden")).toBe("true");
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Locale editor" }), { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Locale editor" })).toBeNull());
    expect(container.hasAttribute("inert")).toBe(false);
    expect(container.hasAttribute("aria-hidden")).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});
