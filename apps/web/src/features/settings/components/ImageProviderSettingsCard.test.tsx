import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageProviderSettingsCard, type ImageProviderSettingsCardProps } from "./ImageProviderSettingsCard";

afterEach(cleanup);

describe("ImageProviderSettingsCard", () => {
  const defaultProps: ImageProviderSettingsCardProps = {
    imageProvider: "gpti2",
    setImageProvider: vi.fn(),
    hasImageApiKey: true,
    imageApiKey: "sk-test-key",
    setImageApiKey: vi.fn(),
    showImageKey: false,
    setShowImageKey: vi.fn(),
    imageBalanceInfo: { balance_vnd: 250000, rpm: 60 },
    imageEnabled: true,
    setImageEnabled: vi.fn(),
    imageBaseUrl: "",
    setImageBaseUrl: vi.fn(),
    imageModel: "gpt-image-2",
    setImageModel: vi.fn(),
    maxConcurrentImageTasks: 3,
    setMaxConcurrentImageTasks: vi.fn(),
    imagesPerBundle: 2,
    setImagesPerBundle: vi.fn(),
    savingImage: false,
    checkingImageBalance: false,
    onSaveImage: vi.fn(),
    onClearImageKey: vi.fn(),
    onCheckImageBalance: vi.fn(),
  };

  it("renders correctly with gpti2 provider and balance information", () => {
    render(<ImageProviderSettingsCard {...defaultProps} />);

    expect(screen.getByText("Image Provider Settings")).toBeDefined();
    expect(screen.getByText("gpti2.store (API)")).toBeDefined();
    expect(screen.getByText("Configured & Active")).toBeDefined();
    expect(screen.getByText("250,000 VND (RPM: 60)")).toBeDefined();
    expect(screen.getByText("Key Saved & Active")).toBeDefined();
  });

  it("allows switching provider and triggers setImageProvider", () => {
    const setImageProvider = vi.fn();
    render(<ImageProviderSettingsCard {...defaultProps} setImageProvider={setImageProvider} />);

    const select = screen.getByLabelText(/image provider service/i);
    fireEvent.change(select, { target: { value: "shopaikey" } });
    expect(setImageProvider).toHaveBeenCalledWith("shopaikey");
  });

  it("toggles imageEnabled checkbox when clicked", () => {
    const setImageEnabled = vi.fn();
    render(<ImageProviderSettingsCard {...defaultProps} setImageEnabled={setImageEnabled} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(setImageEnabled).toHaveBeenCalledWith(false);
  });

  it("submits the form when Save button is clicked", () => {
    const onSaveImage = vi.fn((e) => e.preventDefault());
    render(<ImageProviderSettingsCard {...defaultProps} onSaveImage={onSaveImage} />);

    const saveBtn = screen.getByRole("button", { name: /save image settings/i });
    fireEvent.click(saveBtn);
    expect(onSaveImage).toHaveBeenCalled();
  });

  it("triggers onCheckImageBalance when check balance button is clicked", () => {
    const onCheckImageBalance = vi.fn();
    render(<ImageProviderSettingsCard {...defaultProps} onCheckImageBalance={onCheckImageBalance} />);

    const checkBtn = screen.getByRole("button", { name: /check balance & verify key/i });
    fireEvent.click(checkBtn);
    expect(onCheckImageBalance).toHaveBeenCalled();
  });

  it("triggers onClearImageKey when clear key button is clicked", () => {
    const onClearImageKey = vi.fn();
    render(<ImageProviderSettingsCard {...defaultProps} onClearImageKey={onClearImageKey} />);

    const clearBtn = screen.getByTitle("Remove this API Key");
    fireEvent.click(clearBtn);
    expect(onClearImageKey).toHaveBeenCalled();
  });
});
