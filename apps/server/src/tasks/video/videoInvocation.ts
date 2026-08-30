import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

export function getHyperframesInvocation(...args: string[]): { command: string; args: string[] } {
  try {
    const pkgJson = require.resolve("hyperframes/package.json");
    const binPath = path.join(path.dirname(pkgJson), "bin", "hyperframes.mjs");
    return {
      command: process.execPath,
      args: [binPath, ...args],
    };
  } catch {
    if (process.platform === "win32") {
      return {
        command: process.execPath,
        args: [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"), "--yes", "hyperframes", ...args],
      };
    }
    return {
      command: "npx",
      args: ["--yes", "hyperframes", ...args],
    };
  }
}
