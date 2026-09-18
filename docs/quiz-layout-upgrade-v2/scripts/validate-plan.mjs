import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const startedAt = Date.now();
const planRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(planRoot, "../..");
const colorEnabled = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const colors = { INFO: "\u001b[36m", STEP: "\u001b[1;34m", OK: "\u001b[32m", WARN: "\u001b[33m", ERROR: "\u001b[1;31m" };
let passed = 0;
let failed = 0;

function log(level, step, message) {
  const line = new Date().toISOString() + " [" + level + "] [T:main] [STEP:" + step + "] " + message;
  process.stdout.write(colorEnabled ? (colors[level] ?? "") + line + "\u001b[0m\n" : line + "\n");
}

function check(name, callback) {
  try {
    callback();
    passed += 1;
    log("OK", name, "Passed");
  } catch (error) {
    failed += 1;
    log("ERROR", name, error.message + "; next_action=correct the planning contract and rerun");
  }
}

function json(relative) {
  return JSON.parse(readFileSync(path.join(planRoot, relative), "utf8"));
}

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(absolute) : [absolute];
  });
}

function near(actual, expected, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= tolerance, String(actual) + " differs from expected " + expected);
}

function checkRectangles(value) {
  if (!value || typeof value !== "object") return;
  if (["x", "y", "width", "height"].every((key) => typeof value[key] === "number")) {
    assert.ok(value.x >= 0 && value.y >= 0 && value.width > 0 && value.height > 0);
    assert.ok(value.x + value.width <= 1920 && value.y + value.height <= 1080);
  }
  for (const child of Object.values(value)) checkRectangles(child);
}

function validateAnswerVariant(variant) {
  for (const [index, row] of variant.outer.entries()) {
    const text = variant.text[index];
    near(row.x + row.width, text.x + text.width);
    near(row.y + row.height / 2, text.y + text.height / 2);
    if (variant.badge?.length) {
      const badge = variant.badge[index];
      near(badge.y, row.y);
      near(badge.height, row.height);
      assert.ok(text.height < badge.height);
      assert.ok(text.height / badge.height >= 0.8 && text.height / badge.height <= 0.85);
      near(badge.x + badge.width - text.x, variant.overlap);
    }
  }
}

function checkRatio(policy) {
  const viewport = policy.slot ?? policy.viewport;
  const target = viewport.width / viewport.height;
  const supported = ["16:9", "4:3", "3:4", "1:1"];
  const ratio = (value) => {
    const [n, d] = value.split(":").map(Number);
    return n / d;
  };
  const loss = (value) => 1 - Math.min(ratio(value) / target, target / ratio(value));
  assert.ok(loss(policy.ratio) <= Math.min(...supported.map(loss)) + 1e-8);
  near(policy.cropLoss, policy.fit === "cover" ? loss(policy.ratio) : 0);
  near(policy.recommended.width / policy.recommended.height, ratio(policy.ratio));
  assert.equal(policy.recommended.width % 8, 0);
  assert.equal(policy.recommended.height % 8, 0);
  const [n, d] = policy.ratio.split(":").map(Number);
  const scale =
    policy.fit === "contain" ? Math.min(viewport.width / n, viewport.height / d) : Math.max(viewport.width / n, viewport.height / d);
  const alignedScale = Math.ceil((1.5 * scale) / 8) * 8;
  near(policy.recommended.width, n * alignedScale);
  near(policy.recommended.height, d * alignedScale);
}

log("INFO", "startup", "mode=read-only concurrency=1 automation=filesystem profiles=0 config=planning-contract");
const targets = json("data/layout-targets.json");
const manifest = json("data/file-manifest.json");
const baseline = json("data/source-baseline.json");
const acceptance = json("data/acceptance-cases.json");

check("phase-count", () => {
  const phases = readdirSync(path.join(planRoot, "phases"))
    .filter((name) => /^\d{2}-.+\.md$/.test(name))
    .sort();
  assert.equal(phases.length, 12);
  phases.forEach((name, index) => assert.equal(Number(name.slice(0, 2)), index + 1));
});
check("file-map", () => {
  assert.equal(new Set(manifest.paths.map((entry) => entry.path)).size, manifest.paths.length);
  for (const entry of manifest.paths) {
    assert.ok(entry.phases.every((phase) => phase >= 1 && phase <= 12));
    if (entry.kind === "existing") assert.ok(existsSync(path.join(repoRoot, entry.path)), entry.path);
  }
  assert.equal(baseline.files.length, manifest.paths.filter((entry) => entry.kind === "existing").length);
});
check("document-links", () => {
  for (const file of filesIn(planRoot).filter((name) => name.endsWith(".md"))) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const destination = match[1].split("#")[0];
      if (!destination || /^(https?:|mailto:)/.test(destination)) continue;
      assert.ok(existsSync(path.resolve(path.dirname(file), destination)), file + ": " + destination);
    }
  }
});
check("english-ascii-artifacts", () => {
  for (const file of filesIn(planRoot).filter((name) => /\.(md|json|mjs)$/.test(name))) {
    assert.ok(![...readFileSync(file, "utf8")].some((character) => character.codePointAt(0) > 127), file);
  }
});
check("canvas-and-growth", () => {
  assert.equal(Object.keys(targets.layouts).length, 7);
  checkRectangles(targets);
  const l = targets.layouts;
  near(l.media_left_choices_right.hero.height - l.media_left_choices_right.heroBefore.height, 60);
  near(l.verdict_true_false.hero.height - l.verdict_true_false.heroBefore.height, 55);
  near(l.mystery_reveal.hero.height - l.mystery_reveal.heroBefore.height, 180);
  for (const [id, delta] of [
    ["visual_choices_three", 55],
    ["visual_choices_three_pure", 60],
    ["split_versus_two", 55],
  ]) {
    l[id].media.forEach((rect, index) => near(rect.height - l[id].mediaBefore[index].height, delta));
  }
});
check("answer-bounds", () => {
  for (const layout of Object.values(targets.layouts)) {
    for (const variant of Object.values(layout.answerVariants ?? {})) validateAnswerVariant(variant);
  }
  const l = targets.layouts;
  near(l.visual_choices_three.answerVariants["3"].outer[0].y - l.visual_choices_three.answerTopBefore, 60);
  near(l.split_versus_two.answerVariants["2"].outer[0].y - l.split_versus_two.answerTopBefore, 65);
  for (const variant of Object.values(l.full_stack_list.answerVariants)) {
    variant.outer.forEach((rect, i) => near(rect.y - variant.outerBefore[i].y, i * 15));
    near(variant.gap - variant.gapBefore, 15);
  }
});
check("pure-badge-and-fact", () => {
  const l = targets.layouts.visual_choices_three_pure;
  l.badges.forEach((badge, i) => {
    near(badge.x + badge.width / 2, l.media[i].x + l.media[i].width / 2);
    near(badge.y + badge.height / 2, l.media[i].y + l.media[i].height);
    near(targets.fixed.factAfter.y - badge.y - badge.height, 25);
  });
  near(targets.fixed.factAfter.y - targets.fixed.factBefore.y, 40);
  near(1080 - targets.fixed.factAfter.y - targets.fixed.factAfter.height, 38);
});
check("mystery", () => {
  const m = targets.layouts.mystery_reveal;
  near(1080 - m.answer.y - m.answer.height, 70);
  near(m.imageViewport.width / m.imageViewport.height, 16 / 9);
  near(m.imageSlot.width, m.hero.width - 2 * (m.stageBorder + m.stagePadding));
  near(m.imageSlot.height, m.hero.height - 2 * (m.stageBorder + m.stagePadding));
  near(m.imageViewport.y - m.imageSlot.y, 2.5);
  assert.deepEqual(m.supportedChoiceCounts, [1]);
  assert.equal(m.factVisible, false);
  near(m.timerToRevealGapSeconds, 0.5);
});
check("image-ratios", () => targets.imagePolicies.forEach(checkRatio));
check("acceptance-coverage", () => {
  assert.equal(new Set(acceptance.cases.map((item) => item.id)).size, acceptance.cases.length);
  for (const requirement of acceptance.requirements) {
    assert.ok(
      acceptance.cases.some((item) => item.requirement === requirement),
      requirement,
    );
  }
  for (const layout of Object.keys(targets.layouts)) {
    assert.ok(
      acceptance.cases.some((item) => item.layout === layout),
      layout,
    );
  }
});
if (process.argv.includes("--source-drift")) {
  const changed = baseline.files.filter((entry) => {
    const absolute = path.join(repoRoot, entry.path);
    return !existsSync(absolute) || createHash("sha256").update(readFileSync(absolute)).digest("hex") !== entry.sha256;
  });
  log(
    changed.length ? "WARN" : "OK",
    "source-drift",
    String(changed.length) + " observed source files changed; reinspection required, never automatic overwrite",
  );
  for (const entry of changed) log("WARN", "source-drift", entry.path);
}
log(
  failed ? "ERROR" : "OK",
  "summary",
  "total=" + (passed + failed) + " success=" + passed + " failed=" + failed + " skipped=0 retries=0 elapsed_ms=" + (Date.now() - startedAt),
);
if (failed) process.exitCode = 1;
