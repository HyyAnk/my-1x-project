import { describe, expect, it, vi } from "vitest";
import {
  cleanOrphanedHeadlessBrowsers,
  parseProcessIds,
} from "../src/infrastructure/executables/browserProcessCleaner.js";

describe("browserProcessCleaner", () => {
  describe("parseProcessIds", () => {
    it("parses newline-separated process IDs", () => {
      const output = "1234\r\n5678\n9999\n";
      expect(parseProcessIds(output)).toEqual([1234, 5678, 9999]);
    });

    it("ignores blank lines and non-numeric output", () => {
      const output = "\n  \nWarning: something\n4321\n\n";
      expect(parseProcessIds(output)).toEqual([4321]);
    });

    it("returns empty array for empty or blank input", () => {
      expect(parseProcessIds("")).toEqual([]);
      expect(parseProcessIds("   \r\n  ")).toEqual([]);
    });
  });

  describe("cleanOrphanedHeadlessBrowsers (win32)", () => {
    it("terminates matching headless browser processes via taskkill", async () => {
      const commandsExecuted: string[][] = [];
      const mockExec = vi.fn(async (cmd: string, args: string[]) => {
        commandsExecuted.push([cmd, ...args]);
        if (cmd === "powershell.exe") {
          return { stdout: "101\n202\n", stderr: "" };
        }
        return { stdout: "SUCCESS", stderr: "" };
      });

      const infoLogs: string[] = [];
      const mockLogger = {
        info: (msg: string) => infoLogs.push(msg),
        warn: vi.fn(),
      };

      const killedCount = await cleanOrphanedHeadlessBrowsers({
        platform: "win32",
        execCommand: mockExec,
        logger: mockLogger,
      });

      expect(killedCount).toBe(2);
      expect(commandsExecuted).toHaveLength(3);
      expect(commandsExecuted[0][0]).toBe("powershell.exe");
      expect(commandsExecuted[1]).toEqual(["taskkill.exe", "/PID", "101", "/T", "/F"]);
      expect(commandsExecuted[2]).toEqual(["taskkill.exe", "/PID", "202", "/T", "/F"]);
      expect(infoLogs).toHaveLength(2);
    });

    it("returns 0 when no headless browser processes are discovered", async () => {
      const mockExec = vi.fn(async () => ({ stdout: "", stderr: "" }));

      const killedCount = await cleanOrphanedHeadlessBrowsers({
        platform: "win32",
        execCommand: mockExec,
      });

      expect(killedCount).toBe(0);
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it("continues cleanly if taskkill fails on a single PID", async () => {
      const mockExec = vi.fn(async (cmd: string, args: string[]) => {
        if (cmd === "powershell.exe") {
          return { stdout: "101\n202\n", stderr: "" };
        }
        if (args.includes("101")) {
          throw new Error("Process already exited");
        }
        return { stdout: "SUCCESS", stderr: "" };
      });

      const warnLogs: string[] = [];
      const mockLogger = {
        info: vi.fn(),
        warn: (msg: string) => warnLogs.push(msg),
      };

      const killedCount = await cleanOrphanedHeadlessBrowsers({
        platform: "win32",
        execCommand: mockExec,
        logger: mockLogger,
      });

      expect(killedCount).toBe(1);
      expect(warnLogs).toHaveLength(1);
    });
  });

  describe("cleanOrphanedHeadlessBrowsers (unix)", () => {
    it("terminates headless browser processes with PPID=1", async () => {
      const commandsExecuted: string[][] = [];
      const mockExec = vi.fn(async (cmd: string, args: string[]) => {
        commandsExecuted.push([cmd, ...args]);
        if (cmd === "ps") {
          return {
            stdout: [
              "  PID  PPID COMMAND",
              " 1001     1 /opt/google/chrome/chrome --headless --remote-debugging-port=0",
              " 1002   500 /opt/google/chrome/chrome (interactive regular user window)",
              " 1003     1 /usr/bin/python3 main.py",
            ].join("\n"),
            stderr: "",
          };
        }
        return { stdout: "", stderr: "" };
      });

      const killedCount = await cleanOrphanedHeadlessBrowsers({
        platform: "linux",
        execCommand: mockExec,
      });

      expect(killedCount).toBe(1);
      expect(commandsExecuted[1]).toEqual(["kill", "-9", "1001"]);
    });
  });
});
