import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChannelSchema } from "@studio/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import { LanguageProvider } from "../../../i18n";
import { EditChannelModal } from "./EditChannelModal";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const channel = ChannelSchema.parse({
  channel_id: "ch_locale",
  slug: "locale-quiz",
  display_name: "Locale Quiz",
  description: "Independent locale fields",
  target_audience: "Families",
  country: "AU",
  market: "Southeast Asia",
  language: "French",
  channel_dna_path: "channels/locale-quiz/channel_dna.md",
  style_guide_path: "channels/locale-quiz/style_guide.md",
  status: "DRAFT",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
});

function renderModal() {
  return render(
    <LanguageProvider>
      <EditChannelModal channel={channel} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} onNotice={vi.fn()} />
    </LanguageProvider>,
  );
}

describe("EditChannelModal", () => {
  it("initializes and submits country, market, and language independently", async () => {
    const update = vi.spyOn(api, "updateChannel").mockResolvedValue(channel);
    renderModal();

    expect(screen.getByLabelText<HTMLInputElement>("Market (optional)").value).toBe("Southeast Asia");
    expect(screen.getByLabelText<HTMLInputElement>("Content Language").value).toBe("French");
    fireEvent.change(screen.getByLabelText("Market (optional)"), { target: { value: "European Union" } });
    fireEvent.change(screen.getByLabelText("Content Language"), { target: { value: "German" } });
    fireEvent.click(screen.getByRole("button", { name: "Target Country / Region" }));
    fireEvent.click(screen.getByRole("button", { name: /Vietnam.*VN.*Vietnamese/i }));

    expect(screen.getByLabelText<HTMLInputElement>("Market (optional)").value).toBe("European Union");
    expect(screen.getByLabelText<HTMLInputElement>("Content Language").value).toBe("German");
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]).toEqual([
      "ch_locale",
      expect.objectContaining({ country: "VN", market: "European Union", language: "German" }),
    ]);
  });
});
