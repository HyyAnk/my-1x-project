import { copyFile, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_CHOICES = 3;
const fix = process.argv.includes("--fix");
const root = process.cwd();
const channelsRoot = path.resolve(root, "channels");
const startedAt = Date.now();
const colors = process.stdout.isTTY
  ? {
      time: "\u001b[2m",
      info: "\u001b[36m",
      step: "\u001b[1;34m",
      ok: "\u001b[32m",
      warn: "\u001b[33m",
      error: "\u001b[1;31m",
      profile: "\u001b[35m",
      reset: "\u001b[0m",
    }
  : { time: "", info: "", step: "", ok: "", warn: "", error: "", profile: "", reset: "" };

function log(level, message, { file = "workspace", step = "audit", style = "info" } = {}) {
  const timestamp = new Date().toISOString();
  const color = colors[style] ?? colors.info;
  process.stdout.write(
    `${colors.time}${timestamp}${colors.reset} ${color}[${level}]${colors.reset} [T:main] ${colors.profile}[P:${file}]${colors.reset} ${colors.step}[STEP:${step}]${colors.reset} ${message}\n`,
  );
}

function answerValue(record) {
  return String(record.answer ?? record.correct_answer ?? record.current_correct_answer ?? "")
    .trim()
    .toLocaleLowerCase();
}

function visibleValue(choice) {
  if (choice && typeof choice === "object" && !Array.isArray(choice))
    return String(choice.text ?? "")
      .trim()
      .toLocaleLowerCase();
  return String(choice ?? "")
    .trim()
    .toLocaleLowerCase();
}

function repairChoiceArray(record, key, location, findings) {
  const choices = record[key];
  if (!Array.isArray(choices) || choices.length <= MAX_CHOICES) return false;

  const correctId = String(record.correct_choice_id ?? "").trim();
  let correctIndex = correctId
    ? choices.findIndex((choice) => choice && typeof choice === "object" && !Array.isArray(choice) && String(choice.id ?? "") === correctId)
    : -1;
  if (correctIndex < 0) {
    const answer = answerValue(record);
    if (answer) correctIndex = choices.findIndex((choice) => visibleValue(choice) === answer);
  }

  const keep = [0, 1, 2];
  if (correctIndex >= MAX_CHOICES) keep[MAX_CHOICES - 1] = correctIndex;
  const uniqueKeep = [...new Set(keep)].slice(0, MAX_CHOICES);
  const selected = uniqueKeep.map((index) => choices[index]).filter((choice) => choice !== undefined);
  while (selected.length < MAX_CHOICES) {
    const next = choices.find((choice) => !selected.includes(choice));
    if (next === undefined) break;
    selected.push(next);
  }

  const selectedCorrectIndex = correctIndex >= 0 ? selected.indexOf(choices[correctIndex]) : -1;
  if (selected.every((choice) => choice && typeof choice === "object" && !Array.isArray(choice) && "text" in choice)) {
    record[key] = selected.map((choice, index) => ({ ...choice, id: `choice-${String.fromCharCode(97 + index)}` }));
    if (selectedCorrectIndex >= 0 && "correct_choice_id" in record)
      record.correct_choice_id = `choice-${String.fromCharCode(97 + selectedCorrectIndex)}`;
  } else {
    record[key] = selected;
  }

  findings.push({ location, key, before: choices.length, after: record[key].length });
  return true;
}

function inspectValue(value, location, findings, shouldFix) {
  if (Array.isArray(value)) {
    let changed = false;
    value.forEach((item, index) => {
      changed = inspectValue(item, `${location}[${index}]`, findings, shouldFix) || changed;
    });
    return changed;
  }
  if (!value || typeof value !== "object") return false;

  let changed = false;
  for (const key of ["choices", "current_choices", "options"]) {
    if (Array.isArray(value[key]) && value[key].length > MAX_CHOICES) {
      if (shouldFix) changed = repairChoiceArray(value, key, `${location}.${key}`, findings) || changed;
      else findings.push({ location: `${location}.${key}`, key, before: value[key].length, after: MAX_CHOICES });
    }
  }
  for (const [key, child] of Object.entries(value)) changed = inspectValue(child, `${location}.${key}`, findings, shouldFix) || changed;
  return changed;
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolute)));
    else if (entry.isFile() && (entry.name.endsWith(".json") || entry.name.endsWith(".md"))) files.push(absolute);
  }
  return files;
}

async function writeWithBackup(file, content) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const backup = `${file}.quiz-choice-backup-${stamp}`;
  const temporary = `${file}.quiz-choice-tmp-${process.pid}`;
  await copyFile(file, backup);
  await writeFile(temporary, content, "utf8");
  await rename(temporary, file);
  return backup;
}

async function inspectJson(file, findings) {
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw);
  const changed = inspectValue(parsed, "$", findings, fix);
  if (changed) return writeWithBackup(file, `${JSON.stringify(parsed, null, 2)}\n`);
  return null;
}

async function inspectMarkdown(file, findings) {
  const raw = await readFile(file, "utf8");
  let changed = false;
  const updated = raw.replace(/^(- Quiz data:\s*)(\{.*\}|null)\s*$/gm, (line, prefix, json) => {
    if (json === "null") return line;
    try {
      const parsed = JSON.parse(json);
      const lineFindings = [];
      const lineChanged = inspectValue(parsed, "$quiz", lineFindings, fix);
      findings.push(...lineFindings);
      changed = changed || lineChanged;
      return lineChanged ? `${prefix}${JSON.stringify(parsed)}` : line;
    } catch {
      return line;
    }
  });
  if (changed) return writeWithBackup(file, updated);
  return null;
}

log("INFO", `Starting quiz choice audit | mode=${fix ? "fix" : "dry-run"} | max_choices=${MAX_CHOICES} | automation=filesystem-only`, {
  step: "startup",
});
const files = await listFiles(channelsRoot);
let scanned = 0;
let violations = 0;
let repaired = 0;
let failed = 0;

for (const file of files) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const findings = [];
  try {
    const backup = file.endsWith(".json") ? await inspectJson(file, findings) : await inspectMarkdown(file, findings);
    scanned += 1;
    violations += findings.length;
    if (backup) repaired += findings.length;
    for (const finding of findings) {
      log(fix ? "OK" : "WARN", `${finding.location} contains ${finding.before} choices${fix ? `; migrated to ${finding.after}` : ""}`, {
        file: relative,
        step: fix ? "migrate" : "audit",
        style: fix ? "ok" : "warn",
      });
    }
    if (backup) log("INFO", `Backup created at ${path.relative(root, backup).replaceAll("\\", "/")}`, { file: relative, step: "backup" });
  } catch (error) {
    failed += 1;
    log("ERROR", `${error instanceof Error ? error.message : String(error)} | next_action=inspect the artifact and rerun`, {
      file: relative,
      step: "scan",
      style: "error",
    });
  }
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
const summaryStyle = failed > 0 || (!fix && violations > 0) ? "error" : "ok";
log(
  summaryStyle === "ok" ? "OK" : "ERROR",
  `Final summary | total=${files.length} | scanned=${scanned} | violations=${violations} | repaired=${repaired} | failed=${failed} | elapsed=${elapsed}s`,
  { step: "summary", style: summaryStyle },
);
if (failed > 0 || (!fix && violations > 0)) process.exitCode = 1;
