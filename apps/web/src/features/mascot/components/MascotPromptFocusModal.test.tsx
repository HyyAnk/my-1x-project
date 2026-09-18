import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { QUICK_PROMPT_TAGS } from "../constants";
import { MascotPromptFocusModal } from "./MascotPromptFocusModal";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
});

describe("MascotPromptFocusModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <MascotPromptFocusModal isOpen={false} onClose={vi.fn()} genPrompt="test prompt" setGenPrompt={vi.fn()} onInjectTag={vi.fn()} />,
      { wrapper },
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal content and triggers callbacks correctly", () => {
    const onClose = vi.fn();
    const setGenPrompt = vi.fn();
    const onInjectTag = vi.fn();

    render(
      <MascotPromptFocusModal
        isOpen={true}
        onClose={onClose}
        genPrompt="Captain Quill pirate prompt"
        setGenPrompt={setGenPrompt}
        onInjectTag={onInjectTag}
      />,
      { wrapper },
    );

    // Textarea with initial value
    const textarea = screen.getByDisplayValue("Captain Quill pirate prompt");
    expect(textarea).toBeTruthy();

    // Typing in textarea
    fireEvent.change(textarea, { target: { value: "Updated prompt" } });
    expect(setGenPrompt).toHaveBeenCalledWith("Updated prompt");

    // Click a tag chip
    const expectedTag = QUICK_PROMPT_TAGS[0];
    const firstTagChip = screen.getByText(expectedTag);
    fireEvent.click(firstTagChip);
    expect(onInjectTag).toHaveBeenCalledWith(expectedTag);

    // Click saved button
    const saveButton = screen.getByRole("button", { name: /saved/i });
    fireEvent.click(saveButton);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Click close icon button
    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("closes when clicking modal backdrop but not when clicking modal section", () => {
    const onClose = vi.fn();

    const { container } = render(
      <MascotPromptFocusModal isOpen={true} onClose={onClose} genPrompt="" setGenPrompt={vi.fn()} onInjectTag={vi.fn()} />,
      { wrapper },
    );

    const section = container.querySelector(".prompt-focus-modal");
    expect(section).toBeTruthy();
    fireEvent.click(section!);
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = container.querySelector(".modal-backdrop");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
