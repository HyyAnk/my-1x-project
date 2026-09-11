import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageProviderFallbackCard } from "./ImageProviderFallbackCard";
import { IMGSTUDIO_DEFAULT_MODEL_ID, IMGSTUDIO_MODELS } from "@studio/shared";

afterEach(cleanup);

describe("ImageProviderFallbackCard", () => {
  const defaultProps = {
    fallbackEnabled: true,
    setFallbackEnabled: vi.fn(),
    fallbackModel: IMGSTUDIO_DEFAULT_MODEL_ID,
    setFallbackModel: vi.fn(),
    fallbackResolution: "2K" as const,
    setFallbackResolution: vi.fn(),
    fallbackQuality: "standard" as const,
    setFallbackQuality: vi.fn(),
    fallbackApiKey: "sk-test-key",
    setFallbackApiKey: vi.fn(),
    showFallbackKey: false,
    setShowFallbackKey: vi.fn(),
    hasFallbackApiKey: true,
    savingFallback: false,
    verifyingFallback: false,
    availableModels: IMGSTUDIO_MODELS,
    onSaveFallback: vi.fn(),
    onClearFallbackKey: vi.fn(),
    onVerifyFallbackConnection: vi.fn(),
  };

  it("renders correctly with Qwen Image 3.0 Pro as active model", () => {
    render(<ImageProviderFallbackCard {...defaultProps} />);

    expect(screen.getByText("Image Provider Fallback")).toBeDefined();
    expect(screen.getByText("Active (Auto-failover on primary failure)")).toBeDefined();
    expect(screen.getByText("Qwen Image 3.0 Pro")).toBeDefined();
    expect(screen.getByDisplayValue("Qwen Image 3.0 Pro (Default · Max 2K)")).toBeDefined();
  });

  it("triggers setFallbackEnabled when toggle is clicked", () => {
    const setFallbackEnabled = vi.fn();
    render(<ImageProviderFallbackCard {...defaultProps} setFallbackEnabled={setFallbackEnabled} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(setFallbackEnabled).toHaveBeenCalledWith(false);
  });

  it("triggers setFallbackModel when model is changed", () => {
    const setFallbackModel = vi.fn();
    render(<ImageProviderFallbackCard {...defaultProps} setFallbackModel={setFallbackModel} />);

    const select = screen.getByDisplayValue("Qwen Image 3.0 Pro (Default · Max 2K)");
    fireEvent.change(select, { target: { value: "686ef278-e903-49a0-9e3c-2401fd396d22" } });
    expect(setFallbackModel).toHaveBeenCalledWith("686ef278-e903-49a0-9e3c-2401fd396d22");
  });

  it("triggers onVerifyFallbackConnection when Test Connection is clicked", () => {
    const onVerifyFallbackConnection = vi.fn();
    render(
      <ImageProviderFallbackCard
        {...defaultProps}
        onVerifyFallbackConnection={onVerifyFallbackConnection}
      />,
    );

    const testBtn = screen.getByRole("button", { name: "Test Connection" });
    fireEvent.click(testBtn);
    expect(onVerifyFallbackConnection).toHaveBeenCalled();
  });

  it("triggers onSaveFallback when form is submitted", () => {
    const onSaveFallback = vi.fn((e) => e.preventDefault());
    render(<ImageProviderFallbackCard {...defaultProps} onSaveFallback={onSaveFallback} />);

    const saveBtn = screen.getByRole("button", { name: "Save Fallback Settings" });
    fireEvent.click(saveBtn);
    expect(onSaveFallback).toHaveBeenCalled();
  });

  it("displays Key Saved & Active badge and masked placeholder when API key is configured", () => {
    render(
      <ImageProviderFallbackCard
        {...defaultProps}
        hasFallbackApiKey={true}
        fallbackApiKey=""
      />,
    );

    expect(screen.getByText("Key Saved & Active")).toBeDefined();
    expect(screen.getByText("Configured & Active")).toBeDefined();
    const input = screen.getByPlaceholderText("•••••••••••••••••••••••••••••••• (Key saved & active)");
    expect(input).toBeDefined();
  });

  it("displays verificationResult banner when present", () => {
    render(
      <ImageProviderFallbackCard
        {...defaultProps}
        verificationResult={{ status: "success", message: "Connected successfully to ImgStudio API (10 models verified)." }}
      />,
    );

    expect(screen.getByText("Connected successfully to ImgStudio API (10 models verified).")).toBeDefined();
  });
});
