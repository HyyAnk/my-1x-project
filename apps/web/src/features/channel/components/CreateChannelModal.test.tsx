import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import { LanguageProvider } from "../../../i18n";
import { CreateChannelModal } from "./CreateChannelModal";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderModal(onCreated = vi.fn().mockResolvedValue(undefined)) {
  const result = render(
    <LanguageProvider>
      <CreateChannelModal onClose={vi.fn()} onCreated={onCreated} onError={vi.fn()} />
    </LanguageProvider>,
  );
  return { ...result, onCreated };
}

describe("CreateChannelModal", () => {
  it("exposes the creation form as a labeled modal dialog", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", { name: "Create new channel" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("shows one creation flow and submits no channel-type field", async () => {
    const create = vi.spyOn(api, "createChannel").mockResolvedValue({
      channel: { channel_id: "ch_quiz" } as never,
      task: null,
    });
    renderModal();

    expect(screen.queryByText("Channel Track / Type")).toBeNull();
    fireEvent.change(screen.getByLabelText("Channel Name"), { target: { value: "Brain Bites" } });
    fireEvent.click(screen.getByRole("button", { name: "Create channel" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const payload = create.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("group_id");
    expect(payload).not.toHaveProperty("engine");
  });

  it("prevents duplicate submission while the request is pending", async () => {
    let resolveRequest!: (value: Awaited<ReturnType<typeof api.createChannel>>) => void;
    const pending = new Promise<Awaited<ReturnType<typeof api.createChannel>>>((resolve) => {
      resolveRequest = resolve;
    });
    const create = vi.spyOn(api, "createChannel").mockReturnValue(pending);
    const { container } = renderModal();

    fireEvent.change(screen.getByLabelText("Channel Name"), { target: { value: "Brain Bites" } });
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(create).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Creating channel…")).toBeTruthy();
    resolveRequest({ channel: { channel_id: "ch_quiz" } as never, task: null });
  });
});
