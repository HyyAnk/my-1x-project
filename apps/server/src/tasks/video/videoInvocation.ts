import { createRequire } from "node:module";
import path from "node:path";
import { TransitionDomainError } from "@studio/shared";

const require = createRequire(import.meta.url);

export function getHyperframesPackageVersion(): string {
  try {
    const pkgJson = require.resolve("hyperframes/package.json");
    const pkg = require(pkgJson);
    return typeof pkg.version === "string" ? pkg.version : "0.8.17";
  } catch {
    throw new TransitionDomainError(
      "HyperFrames render engine is unavailable locally. Reinstall via 'pnpm install' or run 'pnpm --filter @studio/server add hyperframes@0.8.17'",
      "ENGINE_UNAVAILABLE",
    );
  }
}

export function getHyperframesInvocation(...args: string[]): { command: string; args: string[] } {
  try {
    const pkgJson = require.resolve("hyperframes/package.json");
    const binPath = path.join(path.dirname(pkgJson), "bin", "hyperframes.mjs");
    return {
      command: process.execPath,
      args: [binPath, ...args],
    };
  } catch {
    throw new TransitionDomainError(
      "HyperFrames render engine is unavailable locally. Reinstall via 'pnpm install' or run 'pnpm --filter @studio/server add hyperframes@0.8.17'",
      "ENGINE_UNAVAILABLE",
    );
  }
}
