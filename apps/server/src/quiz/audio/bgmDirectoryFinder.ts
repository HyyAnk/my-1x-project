import fs from "node:fs";
import path from "node:path";

export function findBgmDirectory(): string {
  const candidates = [
    path.resolve(process.cwd(), "assets/audio/bgm"),
    path.resolve(process.cwd(), "../../assets/audio/bgm"),
    path.resolve(process.cwd(), "../assets/audio/bgm"),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(path.join(cand, "manifest.json"))) {
      return cand;
    }
  }

  let curr = process.cwd();
  for (let i = 0; i < 5; i++) {
    const probe = path.join(curr, "assets/audio/bgm");
    if (fs.existsSync(path.join(probe, "manifest.json"))) {
      return probe;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }

  return path.resolve(process.cwd(), "assets/audio/bgm");
}
