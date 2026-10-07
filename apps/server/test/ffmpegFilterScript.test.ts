import { describe, expect, it } from "vitest";
import { buildFfmpegFilterComplexArgs, resolveFfmpegFilterComplexFlag } from "../src/utils/ffmpegFilterScript.js";

describe("FFmpeg Filter Script Utility", () => {
  it("resolves a valid filter complex file flag for FFmpeg", async () => {
    const flag = await resolveFfmpegFilterComplexFlag();
    expect(["-/filter_complex", "-filter_complex_script"]).toContain(flag);
  });

  it("builds correct filter complex command line arguments with script path", async () => {
    const fakePath = "C:/temp/test-filter.txt";
    const args = await buildFfmpegFilterComplexArgs(fakePath);
    expect(args).toHaveLength(2);
    expect(["-/filter_complex", "-filter_complex_script"]).toContain(args[0]);
    expect(args[1]).toBe(fakePath);
  });
});
