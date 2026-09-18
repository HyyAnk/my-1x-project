import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Channel } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { ChannelDetailHeader } from "./ChannelDetailHeader";

afterEach(() => {
  cleanup();
});

const mockChannel: Channel = {
  channel_id: "ch_test_123",
  display_name: "Space Trivia Universe",
  description: "Astrophysics and deep galaxy quizzes",
  status: "ACTIVE",
  mascot_id: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
} as unknown as Channel;

describe("ChannelDetailHeader", () => {
  it("renders breadcrumb, channel name, description, and status", () => {
    render(
      <LanguageProvider>
        <ChannelDetailHeader channel={mockChannel} onBack={vi.fn()} onEditProfile={vi.fn()} onArchive={vi.fn()} onDelete={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("heading", { name: "Space Trivia Universe" })).toBeTruthy();
    expect(screen.getByText("Astrophysics and deep galaxy quizzes")).toBeTruthy();
    expect(screen.getByText(/active/i)).toBeTruthy();
    expect(screen.getByText("Quiz Engine Channel")).toBeTruthy();
  });

  it("handles edit, archive, and delete button clicks", () => {
    const onEditProfile = vi.fn();
    const onArchive = vi.fn();
    const onDelete = vi.fn();

    render(
      <LanguageProvider>
        <ChannelDetailHeader
          channel={mockChannel}
          onBack={vi.fn()}
          onEditProfile={onEditProfile}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </LanguageProvider>,
    );

    const editBtn = screen.getByRole("button", { name: /Edit Profile/i });
    fireEvent.click(editBtn);
    expect(onEditProfile).toHaveBeenCalledTimes(1);

    const archiveBtn = screen.getByRole("button", { name: /Archive/i });
    fireEvent.click(archiveBtn);
    expect(onArchive).toHaveBeenCalledTimes(1);

    const deleteBtn = screen.getByRole("button", { name: /Delete Space Trivia Universe/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(mockChannel);
  });

  it("shows Restore button label when channel is archived", () => {
    const archivedChannel: Channel = { ...mockChannel, status: "ARCHIVED" };

    render(
      <LanguageProvider>
        <ChannelDetailHeader channel={archivedChannel} onBack={vi.fn()} onEditProfile={vi.fn()} onArchive={vi.fn()} onDelete={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("button", { name: /Restore/i })).toBeTruthy();
  });
});
