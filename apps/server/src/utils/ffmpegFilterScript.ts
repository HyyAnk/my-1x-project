import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let cachedFilterComplexFlag: string | null = null;

/**
 * Resolves the appropriate FFmpeg flag for loading a complex filtergraph from a file.
 * Modern FFmpeg (>= 7.0) deprecated/removed `-filter_complex_script` in favor of `-/<option>` syntax (`-/filter_complex`).
 * Older versions (< 7.0) use `-filter_complex_script`.
 */
export async function resolveFfmpegFilterComplexFlag(): Promise<string> {
  if (cachedFilterComplexFlag) return cachedFilterComplexFlag;
  try {
    const { stdout } = await execFileAsync("ffmpeg", ["-version"], { windowsHide: true, timeout: 5000 });
    const match = stdout.match(/ffmpeg version (?:n)?(\d+)/i);
    if (match && Number.parseInt(match[1], 10) >= 7) {
      cachedFilterComplexFlag = "-/filter_complex";
      return cachedFilterComplexFlag;
    }
  } catch {
    cachedFilterComplexFlag = "-/filter_complex";
    return cachedFilterComplexFlag;
  }
  cachedFilterComplexFlag = "-filter_complex_script";
  return cachedFilterComplexFlag;
}

/**
 * Returns command line arguments for passing a filtergraph script file to FFmpeg.
 */
export async function buildFfmpegFilterComplexArgs(filterScriptPath: string): Promise<string[]> {
  const flag = await resolveFfmpegFilterComplexFlag();
  return [flag, filterScriptPath];
}
