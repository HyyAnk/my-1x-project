import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { IMGSTUDIO_DEFAULT_MODEL_ID, IMGSTUDIO_MODELS } from "@studio/shared";

describe("image fallback settings routes", () => {
  let root: string;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "image-fallback-settings-test-"));
    app = await buildApp(root, { llmClient: null });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it("returns default fallback settings and models catalog", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/image-fallback/settings",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.settings).toBeDefined();
    expect(body.settings.enabled).toBe(true);
    expect(body.settings.provider).toBe("imgstudio");
    expect(body.settings.model).toBe(IMGSTUDIO_DEFAULT_MODEL_ID);
    expect(body.settings.api_key).toBe("");
    expect(body.settings.has_api_key).toBe(false);
    expect(body.models).toEqual(IMGSTUDIO_MODELS);
    expect(body.default_model).toBe(IMGSTUDIO_DEFAULT_MODEL_ID);
  });

  it("updates fallback settings and masks api key in response", async () => {
    const res = await app.server.inject({
      method: "POST",
      url: "/api/image-fallback/settings",
      payload: {
        enabled: true,
        api_key: "sk-imgstudio-secret-test-key",
        model: "686ef278-e903-49a0-9e3c-2401fd396d22",
        resolution: "1K",
        quality: "high",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.settings.has_api_key).toBe(true);
    expect(body.settings.api_key).toBe("");
    expect(body.settings.model).toBe("686ef278-e903-49a0-9e3c-2401fd396d22");
    expect(body.settings.resolution).toBe("1K");
    expect(body.settings.quality).toBe("high");

    // Verify GET endpoint returns updated settings
    const getRes = await app.server.inject({
      method: "GET",
      url: "/api/image-fallback/settings",
    });
    const getBody = getRes.json();
    expect(getBody.settings.has_api_key).toBe(true);
    expect(getBody.settings.api_key).toBe("");
    expect(getBody.settings.model).toBe("686ef278-e903-49a0-9e3c-2401fd396d22");
  });

  it("verifies connectivity with valid API key", async () => {
    const mockData = {
      object: "list",
      data: [{ id: "flow-nano-banana-2", object: "model" }],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockData),
      json: async () => mockData,
    } as unknown as Response);

    const res = await app.server.inject({
      method: "POST",
      url: "/api/image-fallback/verify",
      payload: {
        api_key: "test-valid-key",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.models).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("fails verification when api key is empty", async () => {
    const res = await app.server.inject({
      method: "POST",
      url: "/api/image-fallback/verify",
      payload: {
        api_key: "",
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toContain("API Key is required");
  });

  it("clears API key via DELETE /api/image-fallback/key", async () => {
    // First set a key
    await app.server.inject({
      method: "POST",
      url: "/api/image-fallback/settings",
      payload: {
        api_key: "sk-key-to-be-deleted",
      },
    });

    // Delete the key
    const deleteRes = await app.server.inject({
      method: "DELETE",
      url: "/api/image-fallback/key",
    });

    expect(deleteRes.statusCode).toBe(200);
    const body = deleteRes.json();
    expect(body.settings.has_api_key).toBe(false);
    expect(body.settings.api_key).toBe("");
  });
});
