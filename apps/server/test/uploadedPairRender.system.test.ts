import { afterAll, beforeAll, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { customIntroVideoClip, customOutroVideoClip } from "../src/quiz/render/candyArcade/customVideoClips.js";
import { subCompositionMount, toSubComposition } from "../src/quiz/render/candyArcade/subCompositionParser.js";
import { getHyperframesInvocation } from "../src/tasks/video/videoInvocation.js";

const execute = promisify(execFile);
let root: string;

async function media(name: string, color: string, duration: number, frequency: number) {
  await execute(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=1920x1080:r=30:d=${duration}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${frequency}:sample_rate=48000:duration=${duration}`,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-t",
      String(duration),
      path.join(root, name),
    ],
    { windowsHide: true },
  );
}

beforeAll(async () => {
  const scratch = path.resolve(process.cwd(), "../../scratch");
  await mkdir(scratch, { recursive: true });
  root = await mkdtemp(path.join(scratch, "intro-outro-qa-"));
  await Promise.all([media("intro.mp4", "red", 0.6, 440), media("outro.mp4", "blue", 1.4, 880)]);
  const clips = [
    toSubComposition(customIntroVideoClip("./intro.mp4", 0.6, "cut", true)),
    toSubComposition(customOutroVideoClip("./outro.mp4", 1.6, 1.4, true)),
  ];
  await mkdir(path.join(root, "compositions"));
  for (const clip of clips) await writeFile(path.join(root, "compositions", `${clip.id}.html`), clip.html);
  await writeFile(
    path.join(root, "index.html"),
    `<!doctype html><html><head><style>
    html,body{margin:0;width:1920px;height:1080px;overflow:hidden}
    #test{position:relative;width:1920px;height:1080px;background:#000}
    .clip,.sub-composition{position:absolute;inset:0;width:1920px;height:1080px}
    video{display:block;width:1920px;height:1080px;object-fit:cover}
    </style></head><body><div id="test" data-composition-id="test" data-width="1920" data-height="1080" data-duration="3" data-no-timeline>
    ${clips.map(subCompositionMount).join("")}
    <div id="body" class="clip" data-start="0.6" data-duration="1" data-track-index="1" style="background:#00ff00"></div>
    </div></body></html>`,
  );
}, 30000);

afterAll(async () => {
  if (root && process.env.KEEP_PAIR_RENDER_ARTIFACTS !== "1") await rm(root, { recursive: true, force: true });
});

it("renders uploaded sub-compositions with correct picture, audio and end time", async () => {
  const check = getHyperframesInvocation("check", root, "--json");
  await execute(check.command, check.args, { windowsHide: true, timeout: 60000, maxBuffer: 2_000_000 });
  const output = path.join(root, "verified.mp4");
  const render = getHyperframesInvocation(
    "render",
    root,
    "--output",
    output,
    "--fps",
    "30",
    "--quality",
    "draft",
    "--workers",
    "1",
    "--no-browser-gpu",
  );
  await execute(render.command, render.args, { windowsHide: true, timeout: 180000, maxBuffer: 4_000_000 });
  const probe = await execute("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", output], {
    windowsHide: true,
  });
  expect(Number(probe.stdout.trim())).toBeCloseTo(3, 1);
  for (const [time, dominant] of [
    [0.3, 0],
    [1, 1],
    [2.5, 2],
  ] as const) {
    const pixel = await execute(
      "ffmpeg",
      [
        "-v",
        "error",
        "-ss",
        String(time),
        "-i",
        output,
        "-frames:v",
        "1",
        "-vf",
        "scale=1:1",
        "-pix_fmt",
        "rgb24",
        "-f",
        "rawvideo",
        "pipe:1",
      ],
      { windowsHide: true, encoding: "buffer" },
    );
    expect(pixel.stdout[dominant]).toBeGreaterThan(200);
    expect(pixel.stdout[(dominant + 1) % 3]).toBeLessThan(30);
  }
  for (const [time, audible] of [
    [0.2, true],
    [1, false],
    [2, true],
  ] as const) {
    const pcm = await execute(
      "ffmpeg",
      ["-v", "error", "-ss", String(time), "-i", output, "-t", "0.2", "-ac", "1", "-f", "f32le", "pipe:1"],
      { windowsHide: true, encoding: "buffer" },
    );
    let peak = 0;
    for (let i = 0; i + 4 <= pcm.stdout.length; i += 4) peak = Math.max(peak, Math.abs(pcm.stdout.readFloatLE(i)));
    if (audible) expect(peak).toBeGreaterThan(0.05);
    else expect(peak).toBeLessThan(0.001);
  }
}, 240000);
