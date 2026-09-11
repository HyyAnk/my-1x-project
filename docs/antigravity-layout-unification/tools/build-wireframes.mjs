import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const packet = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const started = Date.now();
const colors = { INFO: "36", STEP: "1;34", OK: "32", ERROR: "1;31" };
const sharp = createRequire(path.resolve(packet, "../../apps/server/package.json"))("sharp");

function log(level, step, message) {
  const line = `${new Date().toISOString()} [${level}] [T:wireframe-1] [STEP:${step}] ${message}`;
  process.stdout.write(process.stdout.isTTY ? `\u001b[${colors[level]}m${line}\u001b[0m\n` : `${line}\n`);
}

function contains(outer, inner) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function overlaps(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function validate(data) {
  assert.equal(Object.keys(data.layouts).length, 8);
  assert.equal(data.fixed.thinking.y - data.referenceThinking.y, 60);
  assert.equal(data.fixed.thinking.y + data.fixed.thinking.height / 2, 924);
  assert.equal(data.fixed.fact.y + data.fixed.fact.height / 2, 924);
  const canvas = { x: 0, y: 0, ...data.canvas };
  for (const box of [...Object.values(data.fixed), data.arena, data.timerProtection]) assert(contains(canvas, box));
  for (const [name, layout] of Object.entries(data.layouts)) {
    for (const [count, answers] of Object.entries(layout.answerVariants)) {
      assert.equal(answers.length, Number(count), `${name}: count mismatch`);
      const boxes = [...answers, ...(layout.hero ? [layout.hero] : []), ...(layout.versus ? [layout.versus] : [])];
      boxes.forEach((box, index) => {
        assert(Object.values(box).every(Number.isFinite), `${name}: non-finite coordinate`);
        assert(box.width > 0 && box.height > 0, `${name}: invalid size`);
        assert(contains(data.arena, box), `${name}: outside arena`);
        assert(box.y + box.height <= 780, `${name}: invades lower protection`);
        assert(!overlaps(box, data.timerProtection), `${name}: overlaps timer envelope`);
        boxes.slice(index + 1).forEach((other) => assert(!overlaps(box, other), `${name}: body overlap`));
      });
    }
    if (layout.dossierHeader) assert(contains(layout.panel, layout.dossierHeader));
    if (layout.cardInternals?.labelGap) {
      assert.equal(layout.cardInternals.mediaHeight + layout.cardInternals.labelGap + layout.cardInternals.labelHeight, 504);
    }
  }
}

function box(rect, title, fill, dashed = false) {
  const { x, y, width, height } = rect;
  const font = width < 400 ? 28 : 32;
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${fill}" stroke="#24334a" stroke-width="3" ${dashed ? 'stroke-dasharray="12 10"' : ""}/><text x="${x + width / 2}" y="${y + height / 2 - 5}" text-anchor="middle" fill="#172439" font-size="${font}" font-weight="600">${title}</text><text x="${x + width / 2}" y="${y + height / 2 + 29}" text-anchor="middle" fill="#40536a" font-size="24">${width} x ${Math.round(height)}</text></g>`;
}

function drawing(data, layout, name, phase) {
  const maximumCount = Math.max(...Object.keys(layout.answerVariants).map(Number));
  const cards = layout.answerVariants[maximumCount];
  const fixed = data.fixed;
  const arena = data.arena;
  let body = layout.panel ? box(layout.panel, "", "#edf1f6") : "";
  if (layout.dossierHeader)
    body += `<rect x="400" y="265" width="1380" height="40" fill="#c5d0df"/><text x="420" y="293" font-size="24" fill="#172439">Evidence dossier / clue indicators / status</text>`;
  if (layout.hero) body += box(layout.hero, "Hero Image", "#c7e5dc");
  cards.forEach((card, index) => {
    body += box(card, `Answer ${String.fromCharCode(65 + index)}`, "#d7e6fc");
    if (layout.cardInternals?.labelGap) {
      const lineY = card.y + layout.cardInternals.mediaHeight;
      body += `<path d="M${card.x} ${lineY}h${card.width}" stroke="#40536a" stroke-width="2" stroke-dasharray="8 8"/>`;
    }
  });
  if (layout.versus) body += box(layout.versus, "VS", "#ffe8bb");
  const dock = phase === "thinking" ? box(fixed.thinking, "Thinking Bar", "#ffe8bb") : box(fixed.fact, "Fact Card", "#ffe8bb");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" role="img" aria-labelledby="title description"><title id="title">${name} - ${phase}</title><desc id="description">Proposed geometry only. Five shared anchors, a layout-specific answer and media arena, and one visible footer role.</desc><rect width="1920" height="1080" fill="#f7f9fc"/><g font-family="Arial, sans-serif"><rect x="0" y="0" width="340" height="1080" fill="#e9edf4"/><rect x="${arena.x}" y="${arena.y}" width="${arena.width}" height="${arena.height}" fill="none" stroke="#9caec3" stroke-dasharray="12 10"/><rect x="350" y="804" width="1480" height="240" fill="none" stroke="#bc9651" stroke-width="2" stroke-dasharray="12 10"/>${box(fixed.counterReference, "Counter", "#e0e5ef")}${box(fixed.question, "Question Card", "#e0e5ef")}${box(fixed.brandReference, "YouTube / Channel", "#e0e5ef")}${body}${dock}<text x="28" y="1028" font-size="26" fill="#40536a">Mascot rail reserved</text><text x="390" y="1068" font-size="22" fill="#40536a">${name} / ${phase} / proposed geometry, not a finished skin</text></g></svg>`;
}

async function main() {
  log(
    "INFO",
    "startup",
    "config=layout-targets.json; layouts=8; phases=2; mode=geometry-only; concurrency=1; method=local SVG; no OS input",
  );
  const data = JSON.parse(await readFile(path.join(packet, "layout-targets.json"), "utf8"));
  validate(data);
  const output = path.join(packet, "wireframes");
  await mkdir(output, { recursive: true });
  let completed = 0;
  for (const [name, layout] of Object.entries(data.layouts)) {
    for (const phase of ["thinking", "explain"]) {
      const svg = drawing(data, layout, name, phase);
      await writeFile(path.join(output, `${name}-${phase}.svg`), svg + "\n");
      await sharp(Buffer.from(svg))
        .resize(960, 540)
        .png()
        .toFile(path.join(output, `${name}-${phase}.png`));
      completed += 1;
      log("STEP", `${name}/${phase}`, `${completed}/16 generated`);
    }
  }
  log(
    "OK",
    "summary",
    `total=16 success=${completed} failed=0 skipped=0 retries=0 elapsedMs=${Date.now() - started}; geometry assertions passed (not renderer certification)`,
  );
}

main().catch((error) => {
  log("ERROR", "build", `${error.message}; next=inspect target JSON or installed sharp dependency; elapsedMs=${Date.now() - started}`);
  process.exitCode = 1;
});
