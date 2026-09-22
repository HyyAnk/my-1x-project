import { describe, expect, it } from "vitest";
import { calculateCategoryReadiness, formatReadinessLabel } from "./readinessHelpers";
import type { ChannelAssetsOverviewResponse } from "@studio/shared";

describe("readinessHelpers", () => {
  it("returns all missing when overview or manifest is null/undefined", () => {
    const result = calculateCategoryReadiness(null);
    expect(result).toEqual({
      logoStatus: "missing",
      youtubeStatus: "missing",
      xStatus: "missing",
      artCount: 0,
    });
  });

  it("identifies configured, incomplete, and missing states accurately", () => {
    const mockOverview: ChannelAssetsOverviewResponse = {
      channel_id: "ch_1",
      channel_slug: "slug",
      manifest: {
        version: 1,
        updated_at: "2026-09-22T00:00:00Z",
        brand: {
          logo: {
            id: "l1",
            filename: "logo.png",
            relative_path: "brand/logo.png",
            mime_type: "image/png",
            size_bytes: 100,
            width: 100,
            height: 100,
            created_at: "",
            updated_at: "",
          },
        },
        social: {
          youtube: {
            avatar: {
              id: "y1",
              filename: "y1.png",
              relative_path: "social/youtube/avatar.png",
              mime_type: "image/png",
              size_bytes: 100,
              width: 100,
              height: 100,
              created_at: "",
              updated_at: "",
            },
            // banner is missing -> incomplete
          },
          x: {
            avatar: {
              id: "x1",
              filename: "x1.png",
              relative_path: "social/x/avatar.png",
              mime_type: "image/png",
              size_bytes: 100,
              width: 100,
              height: 100,
              created_at: "",
              updated_at: "",
            },
            banner: {
              id: "x2",
              filename: "x2.png",
              relative_path: "social/x/banner.png",
              mime_type: "image/png",
              size_bytes: 100,
              width: 100,
              height: 100,
              created_at: "",
              updated_at: "",
            },
          },
          facebook: {},
          tiktok: {},
        },
        art: [
          {
            id: "a1",
            filename: "a1.png",
            relative_path: "art/a1.png",
            mime_type: "image/png",
            size_bytes: 100,
            width: 100,
            height: 100,
            created_at: "",
            updated_at: "",
            tags: [],
          },
        ],
      },
      mascot: null,
    };

    const readiness = calculateCategoryReadiness(mockOverview);
    expect(readiness.logoStatus).toBe("configured");
    expect(readiness.youtubeStatus).toBe("incomplete");
    expect(readiness.xStatus).toBe("configured");
    expect(readiness.artCount).toBe(1);
  });

  it("formats readiness labels correctly", () => {
    expect(formatReadinessLabel("configured")).toBe("Configured");
    expect(formatReadinessLabel("incomplete")).toBe("Incomplete");
    expect(formatReadinessLabel("missing")).toBe("Missing");
  });
});
