import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveHardwareBrowserPath } from "../src/infrastructure/executables/browserDiscovery.js";
import { getHyperframesExecutionEnv } from "../src/tasks/video/videoPerformance.js";

afterEach(() => vi.unstubAllEnvs());

describe("shared browser discovery", () => {
  it("prioritizes explicit configuration, then environment, then PATH", () => {
    const options = {
      platform: "linux" as const,
      env: { HYPERFRAMES_BROWSER_PATH: "/custom/browser", PATH: "/tools" },
      isExecutable: () => true,
    };
    expect(resolveHardwareBrowserPath({ ...options, configuredPath: "/configured/browser" })).toBe("/configured/browser");
    expect(resolveHardwareBrowserPath(options)).toBe("/custom/browser");
    expect(resolveHardwareBrowserPath({ ...options, isExecutable: (file) => file === "/tools/google-chrome" })).toBe(
      "/tools/google-chrome",
    );
  });

  it("uses Windows environment roots on a non-C drive with case-insensitive keys", () => {
    expect(
      resolveHardwareBrowserPath({
        platform: "win32",
        env: { PROGRAMFILES: "E:\\Apps" },
        isExecutable: (file) => file === "E:\\Apps\\Google\\Chrome\\Application\\chrome.exe",
      }),
    ).toBe("E:\\Apps\\Google\\Chrome\\Application\\chrome.exe");
  });

  it("supports quoted Windows PATH entries without searching current-directory entries", () => {
    const checked: string[] = [];
    resolveHardwareBrowserPath({
      platform: "win32",
      env: { Path: ';.;relative;"E:\\Browser Tools"' },
      isExecutable: (file) => {
        checked.push(file);
        return false;
      },
    });
    expect(checked).toContain("E:\\Browser Tools\\chrome.exe");
    expect(checked.every((file) => path.win32.isAbsolute(file))).toBe(true);
  });

  it("finds macOS user applications and Linux standard installations", () => {
    for (const [platform, expected] of [
      ["darwin", "/users/test/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
      ["linux", "/usr/bin/chromium"],
    ] as const) {
      expect(
        resolveHardwareBrowserPath({ platform, env: {}, homeDirectory: "/users/test", isExecutable: (file) => file === expected }),
      ).toBe(expected);
    }
  });

  it("returns undefined when no candidate is usable", () => {
    expect(resolveHardwareBrowserPath({ env: {}, isExecutable: () => false })).toBeUndefined();
  });

  it("rejects directories and accepts real executable files", () => {
    const root = mkdtempSync(path.join(tmpdir(), "browser-discovery-"));
    try {
      const directory = path.join(root, "directory");
      const executable = path.join(root, "browser");
      mkdirSync(directory);
      writeFileSync(executable, "fixture", { mode: 0o700 });
      expect(resolveHardwareBrowserPath({ configuredPath: directory, env: { HYPERFRAMES_BROWSER_PATH: executable } })).toBe(executable);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not pass an invalid browser override to the render process", () => {
    vi.stubEnv("HYPERFRAMES_BROWSER_PATH", "/nonexistent-browser-fixture");
    expect(getHyperframesExecutionEnv().HYPERFRAMES_BROWSER_PATH).not.toBe("/nonexistent-browser-fixture");
  });
});
