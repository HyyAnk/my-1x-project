import { spawn } from "node:child_process";
import path from "node:path";

export async function revealFileInSystem(filePath: string): Promise<void> {
  const launch =
    process.platform === "win32"
      ? { command: "explorer.exe", args: ["/select,", filePath], windowsHide: false }
      : process.platform === "darwin"
        ? { command: "open", args: ["-R", filePath], windowsHide: true }
        : { command: "xdg-open", args: [path.dirname(filePath)], windowsHide: true };

  await new Promise<void>((resolve, reject) => {
    const child = spawn(launch.command, launch.args, {
      detached: true,
      stdio: "ignore",
      windowsHide: launch.windowsHide,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
