import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ArtLightboxModal } from "./ArtLightboxModal";
import type { SocialArtAsset } from "@studio/shared";
import * as fileHelpers from "../utils/fileUploadHelpers";

const mockAsset: SocialArtAsset = {
  id: "art_01",
  filename: "summer-banner.png",
  relative_path: "art/summer-banner.png",
  url: "/assets/art/summer-banner.png",
  mime_type: "image/png",
  size_bytes: 1048576,
  width: 2560,
  height: 1440,
  created_at: "2026-09-22T00:00:00Z",
  updated_at: "2026-09-22T00:00:00Z",
  tags: [],
  caption: "High resolution summer banner preview",
};

describe("ArtLightboxModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("returns null when asset is null", () => {
    const { container } = render(<ArtLightboxModal asset={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders lightbox image, filename, dimensions, and caption when asset is provided", () => {
    render(<ArtLightboxModal asset={mockAsset} onClose={vi.fn()} />);

    expect(screen.getByTestId("art-lightbox-modal")).toBeTruthy();
    expect(screen.getByText("summer-banner.png")).toBeTruthy();
    expect(screen.getByText(/2560 × 1440 px • 1.0 MB/i)).toBeTruthy();
    expect(screen.getByText("High resolution summer banner preview")).toBeTruthy();

    const img = screen.getByTestId("lightbox-image") as HTMLImageElement;
    expect(img.src).toContain(mockAsset.url);
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<ArtLightboxModal asset={mockAsset} onClose={handleClose} />);

    const closeBtn = screen.getByTestId("lightbox-close-btn");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const handleClose = vi.fn();
    render(<ArtLightboxModal asset={mockAsset} onClose={handleClose} />);

    const backdrop = screen.getByTestId("art-lightbox-backdrop");
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(<ArtLightboxModal asset={mockAsset} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });

  it("triggers download when download button is clicked", () => {
    const triggerSpy = vi.spyOn(fileHelpers, "triggerFileDownload").mockImplementation(() => {});
    render(<ArtLightboxModal asset={mockAsset} onClose={vi.fn()} />);

    const downloadBtn = screen.getByTestId("lightbox-download-btn");
    fireEvent.click(downloadBtn);

    expect(triggerSpy).toHaveBeenCalledWith(mockAsset.url, mockAsset.filename);
  });
});
