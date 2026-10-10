import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "@studio/shared";
import { LanguageProvider } from "../../../../i18n";
import { QuestionCountDropdown } from "./QuestionCountDropdown";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

function renderControl(overrides: Partial<React.ComponentProps<typeof QuestionCountDropdown>> = {}) {
  const props = {
    disabled: false,
    saving: false,
    isOpen: false,
    onToggle: vi.fn(),
    onClose: vi.fn(),
    questionCountDraft: 8,
    setQuestionCountDraft: vi.fn(),
    onSaveQuestionCount: vi.fn(),
    ...overrides,
  };
  render(<QuestionCountDropdown {...props} />, { wrapper });
  const input = screen.getByRole("textbox", { name: "Questions" }) as HTMLInputElement;
  return { props, input };
}

describe("QuestionCountDropdown", () => {
  afterEach(() => {
    cleanup();
  });

  it("lets the user type a count directly without opening the popover", () => {
    const { props, input } = renderControl();
    expect(input.value).toBe("8");

    fireEvent.change(input, { target: { value: "14" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);

    expect(props.onToggle).not.toHaveBeenCalled();
    expect(props.setQuestionCountDraft).toHaveBeenCalledWith(14);
    expect(props.onSaveQuestionCount).toHaveBeenCalledTimes(1);
    expect(props.onSaveQuestionCount).toHaveBeenCalledWith(14);
  });

  it("clamps typed values to the allowed range", () => {
    const { props, input } = renderControl();

    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.blur(input);
    expect(props.onSaveQuestionCount).toHaveBeenLastCalledWith(QUIZ_MAX_QUESTION_COUNT);

    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.blur(input);
    expect(props.onSaveQuestionCount).toHaveBeenLastCalledWith(QUIZ_MIN_QUESTION_COUNT);
  });

  it("strips non-digit characters while typing", () => {
    const { input } = renderControl();
    fireEvent.change(input, { target: { value: "1a2" } });
    expect(input.value).toBe("12");
  });

  it("reverts the draft on Escape without saving", () => {
    const { props, input } = renderControl();

    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);

    expect(input.value).toBe("8");
    expect(props.onSaveQuestionCount).not.toHaveBeenCalled();
  });

  it("restores the saved value when the input is cleared", () => {
    const { props, input } = renderControl();

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(input.value).toBe("8");
    expect(props.onSaveQuestionCount).not.toHaveBeenCalled();
  });

  it("steps the count with arrow keys and stepper buttons", () => {
    const { props, input } = renderControl();

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(props.onSaveQuestionCount).toHaveBeenLastCalledWith(9);

    fireEvent.click(screen.getByRole("button", { name: "Increase questions" }));
    expect(props.onSaveQuestionCount).toHaveBeenLastCalledWith(10);
  });

  it("opens presets from the caret button and saves the chosen preset", () => {
    const { props } = renderControl({ isOpen: true });

    fireEvent.click(screen.getByRole("button", { name: "12" }));

    expect(props.onSaveQuestionCount).toHaveBeenCalledWith(12);
    expect(props.onClose).toHaveBeenCalled();
  });
});
