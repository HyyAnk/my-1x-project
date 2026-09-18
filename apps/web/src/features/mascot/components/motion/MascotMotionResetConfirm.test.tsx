import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MascotMotionResetConfirm } from "./MascotMotionResetConfirm";
import { LanguageProvider } from "../../../../i18n";

afterEach(() => {
  cleanup();
});

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe("MascotMotionResetConfirm", () => {
  it("renders reset button initially and shows confirmation prompt when clicked", () => {
    const onResetDefaultMotions = vi.fn();

    render(<MascotMotionResetConfirm onResetDefaultMotions={onResetDefaultMotions} />, { wrapper });

    const initialButton = screen.getByRole("button", { name: /reset to defaults/i });
    expect(initialButton).toBeTruthy();
    fireEvent.click(initialButton);

    expect(screen.getByText(/reset motions to defaults\?/i)).toBeTruthy();

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByText(/reset motions to defaults\?/i)).toBeNull();
  });

  it("calls onResetDefaultMotions when confirm button is clicked", () => {
    const onResetDefaultMotions = vi.fn();

    render(<MascotMotionResetConfirm onResetDefaultMotions={onResetDefaultMotions} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /reset to defaults/i }));

    const confirmButton = screen.getByRole("button", { name: /^reset$/i });
    fireEvent.click(confirmButton);

    expect(onResetDefaultMotions).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/reset motions to defaults\?/i)).toBeNull();
  });
});
