import { describe, expect, it } from "vitest";
import { calculateOptimalWorkers, getHyperframesExecutionEnv, resolveHardwareBrowserPath } from "../src/tasks/video/videoPerformance.js";

describe("videoPerformance", () => {
  it("resolves installed browser path or returns undefined on non-standard setups", () => {
    const browserPath = resolveHardwareBrowserPath();
    if (browserPath) {
      expect(typeof browserPath).toBe("string");
      expect(browserPath.length).toBeGreaterThan(0);
    }
  });

  it("calculates optimal workers with sensible bounds", () => {
    const defaultWorkers = calculateOptimalWorkers();
    expect(defaultWorkers).toBeGreaterThanOrEqual(2);
    expect(defaultWorkers).toBeLessThanOrEqual(16);

    const customWorkers = calculateOptimalWorkers(6);
    expect(customWorkers).toBe(6);
  });

  it("prioritizes configuredWorkers from settings over environment variable", () => {
    const originalEnv = process.env.HYPERFRAMES_WORKERS;
    try {
      process.env.HYPERFRAMES_WORKERS = "8";
      expect(calculateOptimalWorkers(12)).toBe(12);
      expect(calculateOptimalWorkers(4)).toBe(4);
    } finally {
      if (originalEnv !== undefined) {
        process.env.HYPERFRAMES_WORKERS = originalEnv;
      } else {
        delete process.env.HYPERFRAMES_WORKERS;
      }
    }
  });

  it("respects HYPERFRAMES_WORKERS environment variable if no explicit workers configured", () => {
    const originalEnv = process.env.HYPERFRAMES_WORKERS;
    try {
      process.env.HYPERFRAMES_WORKERS = "8";
      expect(calculateOptimalWorkers()).toBe(8);

      process.env.HYPERFRAMES_WORKERS = "20";
      expect(calculateOptimalWorkers()).toBe(16); // capped at 16
    } finally {
      if (originalEnv !== undefined) {
        process.env.HYPERFRAMES_WORKERS = originalEnv;
      } else {
        delete process.env.HYPERFRAMES_WORKERS;
      }
    }
  });

  it("builds HyperFrames execution environment with fast capture enabled", () => {
    const env = getHyperframesExecutionEnv();
    expect(env.PRODUCER_EXPERIMENTAL_FAST_CAPTURE).toBe("true");
    expect(env.PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS).toBeDefined();
  });
});
