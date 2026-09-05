import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { LanguageProvider } from "../../i18n";
import { QuestionBankToolbar } from "./components/QuestionBankToolbar";
import { QuestionBankClearAllModal } from "./components/QuestionBankClearAllModal";
import type { QuestionBankFilters } from "./types/questionBankUi.types";

function renderWithLanguage(ui: React.ReactElement, lang: string = "en") {
  window.localStorage.setItem("studio-language", lang);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const mockFilters: QuestionBankFilters = {
  channelId: "",
  archetypeId: "",
  domainId: "",
  subtopicId: "",
  status: "",
  cooldownFilter: "all",
  languageFilter: "",
  translationFilter: "all",
  search: "",
  page: 1,
  pageSize: 25,
};

describe("Question Bank Clear All UI & Confirmation Gate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders Clear All button in toolbar and triggers onOpenClearAllModal", () => {
    const onOpenClearAll = vi.fn();
    renderWithLanguage(
      <QuestionBankToolbar
        taxonomy={null}
        filters={mockFilters}
        onUpdateFilter={vi.fn()}
        onResetFilters={vi.fn()}
        onOpenCreateModal={vi.fn()}
        onOpenClearAllModal={onOpenClearAll}
      />,
    );

    const clearBtn = screen.getByText("Clear All");
    expect(clearBtn).toBeDefined();

    fireEvent.click(clearBtn);
    expect(onOpenClearAll).toHaveBeenCalledTimes(1);
  });

  it("strictly disables confirmation button until user types exact 'Yes'", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankClearAllModal
        clearing={false}
        totalCount={42}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    // Verify modal elements
    expect(screen.getByText("Clear Question Bank")).toBeDefined();
    expect(screen.getByText(/Current questions in bank:/)).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();

    const input = screen.getByPlaceholderText('Type "Yes" to confirm');
    const submitBtn = screen.getByRole("button", { name: /Confirm & Clear All/i });

    // 1. Initially disabled
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    // 2. Typing lowercase "yes" keeps it disabled
    fireEvent.change(input, { target: { value: "yes" } });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    // 3. Typing uppercase "YES" keeps it disabled
    fireEvent.change(input, { target: { value: "YES" } });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    // 4. Typing "no" keeps it disabled
    fireEvent.change(input, { target: { value: "no" } });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    // 5. Typing exact "Yes" enables the button
    fireEvent.change(input, { target: { value: "Yes" } });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    // 6. Submitting calls onConfirm
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it("disables controls and displays clearing message when clearing is active", () => {
    renderWithLanguage(
      <QuestionBankClearAllModal
        clearing={true}
        totalCount={10}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Clearing Question Bank...")).toBeDefined();
    const input = screen.getByPlaceholderText('Type "Yes" to confirm');
    expect((input as HTMLInputElement).disabled).toBe(true);
  });
});
