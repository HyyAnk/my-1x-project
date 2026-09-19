import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import { useImageFallbackSettingsState } from "./useImageFallbackSettingsState";

vi.mock("../../../api", () => ({
  api: {
    verifyImageFallback: vi.fn(),
  },
}));

describe("useImageFallbackSettingsState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.verifyImageFallback).mockResolvedValue({ ok: true, models: [] });
  });

  afterEach(cleanup);

  it("omits an empty API key so the server can use the saved key", async () => {
    const onNotice = vi.fn();
    const { result } = renderHook(() =>
      useImageFallbackSettingsState({
        appConfig: null,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.verifyFallbackConnection();
    });

    expect(api.verifyImageFallback).toHaveBeenCalledWith({
      base_url: "https://imgstudio.site",
    });
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Connected successfully to ImgStudio API (0 models verified).",
    });
  });

  it("sends a newly entered API key when one is present", async () => {
    const { result } = renderHook(() =>
      useImageFallbackSettingsState({
        appConfig: null,
        onNotice: vi.fn(),
      }),
    );

    act(() => {
      result.current.setFallbackApiKey("  replacement-key  ");
    });
    await act(async () => {
      await result.current.verifyFallbackConnection();
    });

    expect(api.verifyImageFallback).toHaveBeenCalledWith({
      api_key: "replacement-key",
      base_url: "https://imgstudio.site",
    });
  });
});
