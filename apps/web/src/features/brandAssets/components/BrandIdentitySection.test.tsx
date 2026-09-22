import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import type { ChannelAssetsOverviewResponse } from "@studio/shared";
import { BrandIdentitySection } from "./BrandIdentitySection";

const mockOverviewWithAssets: ChannelAssetsOverviewResponse = {
  channel_id: "ch_alpha",
  channel_slug: "alpha-channel",
  manifest: {
    version: 1,
    updated_at: "2026-09-22T00:00:00.000Z",
    brand: {
      logo: {
        id: "logo_123",
        filename: "channel_logo.png",
        relative_path: "brand/channel_logo.png",
        url: "/api/channels/ch_alpha/assets/file/brand/channel_logo.png",
        mime_type: "image/png",
        size_bytes: 2048,
        width: 1024,
        height: 1024,
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
    },
    social: {},
    art: [],
  },
  mascot: {
    mascot_id: "mascot_99",
    name: "Cyber Fox",
    master_image_url: "/mascots/mascot_99/master.png",
  },
};

const mockOverviewEmpty: ChannelAssetsOverviewResponse = {
  channel_id: "ch_alpha",
  channel_slug: "alpha-channel",
  manifest: {
    version: 1,
    updated_at: "2026-09-22T00:00:00.000Z",
    brand: {},
    social: {},
    art: [],
  },
  mascot: null,
};

describe("BrandIdentitySection", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Mascot Master Concept card when mascot is assigned", () => {
    render(
      <BrandIdentitySection
        overview={mockOverviewWithAssets}
        onUploadLogo={vi.fn()}
        onDeleteLogo={vi.fn()}
      />,
    );

    expect(screen.getByTestId("mascot-concept-card")).toBeTruthy();
    expect(screen.getByTestId("mascot-name").textContent).toBe("Cyber Fox");
    expect(screen.getByTestId("mascot-id").textContent).toBe("mascot_99");
    expect(screen.getByTestId("active-mascot-badge")).toBeTruthy();

    const img = screen.getByTestId("mascot-master-image") as HTMLImageElement;
    expect(img.src).toContain("/mascots/mascot_99/master.png");
  });

  it("renders unassigned empty state when no mascot is linked", () => {
    const handleOpenMascot = vi.fn();
    render(
      <BrandIdentitySection
        overview={mockOverviewEmpty}
        onUploadLogo={vi.fn()}
        onDeleteLogo={vi.fn()}
        onOpenMascot={handleOpenMascot}
      />,
    );

    expect(screen.getByTestId("mascot-concept-empty")).toBeTruthy();
    expect(screen.getByText("No mascot assigned to this channel")).toBeTruthy();

    const studioBtn = screen.getByRole("button", { name: /Open Mascot Studio/i });
    fireEvent.click(studioBtn);
    expect(handleOpenMascot).toHaveBeenCalledWith(null);
  });

  it("calls onOpenMascot with mascotId when clicking Open in Mascot Studio", () => {
    const handleOpenMascot = vi.fn();
    render(
      <BrandIdentitySection
        overview={mockOverviewWithAssets}
        onUploadLogo={vi.fn()}
        onDeleteLogo={vi.fn()}
        onOpenMascot={handleOpenMascot}
      />,
    );

    const studioBtn = screen.getByRole("button", { name: /Open Cyber Fox in Mascot Studio/i });
    fireEvent.click(studioBtn);
    expect(handleOpenMascot).toHaveBeenCalledWith("mascot_99");
  });

  it("renders Channel Logo card with preview and metadata when logo exists", () => {
    render(
      <BrandIdentitySection
        overview={mockOverviewWithAssets}
        onUploadLogo={vi.fn()}
        onDeleteLogo={vi.fn()}
      />,
    );

    expect(screen.getByTestId("channel-logo-card")).toBeTruthy();
    expect(screen.getByTestId("logo-status-pill").textContent).toBe("Configured");
    expect(screen.getByText("channel_logo.png")).toBeTruthy();
    expect(screen.getByText("1024 × 1024 px")).toBeTruthy();
    expect(screen.getByText("2.0 KB")).toBeTruthy();
  });

  it("handles logo replacement via file input", () => {
    const handleUploadLogo = vi.fn();
    render(
      <BrandIdentitySection
        overview={mockOverviewWithAssets}
        onUploadLogo={handleUploadLogo}
        onDeleteLogo={vi.fn()}
      />,
    );

    const fileInput = screen.getByTestId("logo-file-input") as HTMLInputElement;
    const testFile = new File(["dummy"], "new_logo.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [testFile] } });
    expect(handleUploadLogo).toHaveBeenCalledWith(testFile);
  });

  it("handles logo deletion with confirmation flow", async () => {
    const handleDeleteLogo = vi.fn().mockResolvedValue(undefined);
    render(
      <BrandIdentitySection
        overview={mockOverviewWithAssets}
        onUploadLogo={vi.fn()}
        onDeleteLogo={handleDeleteLogo}
      />,
    );

    const deleteBtn = screen.getByTestId("delete-logo-btn");
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByTestId("confirm-delete-logo-btn");
    expect(confirmBtn).toBeTruthy();

    fireEvent.click(confirmBtn);
    expect(handleDeleteLogo).toHaveBeenCalledTimes(1);
  });

  it("renders upload dropzone when logo is missing", () => {
    render(
      <BrandIdentitySection
        overview={mockOverviewEmpty}
        onUploadLogo={vi.fn()}
        onDeleteLogo={vi.fn()}
      />,
    );

    expect(screen.getByTestId("logo-status-pill").textContent).toBe("Missing");
    expect(screen.getByTestId("logo-upload-dropzone")).toBeTruthy();
    expect(screen.getByText("Upload Channel Logo")).toBeTruthy();
  });
});
