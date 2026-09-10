#!/usr/bin/env node
import { parseArgs } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { log, logStartupSummary, logFinalSummary } from "./lib/terminalLogger.mjs";

let RepositoryService;
let generateQuestionBankBatch;

try {
  const repoModule = await import("../apps/server/src/repository/service.js");
  const batchModule = await import("../apps/server/src/quiz/bank/questionBankBatchService.js");
  RepositoryService = repoModule.RepositoryService;
  generateQuestionBankBatch = batchModule.generateQuestionBankBatch;
} catch (e) {
  if (!process.env.__TSX_SPAWNED__) {
    const isWin = process.platform === "win32";
    const cmd = isWin ? "npx.cmd" : "npx";
    const thisFile = fileURLToPath(import.meta.url);
    const fileArg = thisFile.includes(" ") ? `"${thisFile}"` : thisFile;
    const result = spawnSync(cmd, ["tsx", fileArg, ...process.argv.slice(2)], {
      encoding: "utf8",
      shell: isWin,
      env: { ...process.env, __TSX_SPAWNED__: "true" },
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 0);
  }
  throw e;
}

function findWorkspaceRoot(startDir = process.cwd()) {
  let curr = startDir;
  while (curr !== path.dirname(curr)) {
    if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) return curr;
    curr = path.dirname(curr);
  }
  return startDir;
}

async function main() {
  const startTime = Date.now();
  const { values } = parseArgs({
    options: {
      archetype: { type: "string", short: "a" },
      domain: { type: "string", short: "d" },
      subtopic: { type: "string", short: "s" },
      "subtopic-title": { type: "string" },
      count: { type: "string", short: "c", default: "5" },
      difficulty: { type: "string", default: "2" },
      "age-band": { type: "string", default: "family" },
      "no-persist": { type: "boolean", default: false },
      "candidates-file": { type: "string" },
      "candidates-json": { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || !values.archetype || !values.domain || !values.subtopic) {
    process.stdout.write(`
Usage: node scripts/generate-question-bank-batch.mjs [options]

Required:
  -a, --archetype <id>          Archetype ID (e.g. speed_blitz, verdict_fact_myth, deep_trivia)
  -d, --domain <id>             Domain ID (e.g. logic_puzzles, nature_animals)
  -s, --subtopic <id>           Subtopic ID (e.g. tricky_riddles, ocean_giants)

Options:
  --subtopic-title <title>      Human-readable subtopic title
  -c, --count <number>          Number of questions to generate (default: 5, max: 50)
  --difficulty <1-5>            Target difficulty rating (default: 2)
  --age-band <band>             Target age band: kids | family | teen | mature (default: family)
  --no-persist                  Dry-run mode: generate and validate without saving to disk
  --candidates-file <path>      Path to JSON file with candidate questions (offline validation)
  --candidates-json <string>    JSON string with candidate questions (offline validation)
  --json                        Output results in JSON format
  -h, --help                    Show this help message
`);
    process.exit(values.help ? 0 : 1);
  }

  const workspaceRoot = findWorkspaceRoot();
  const repository = new RepositoryService(workspaceRoot);

  const count = parseInt(values.count || "5", 10);
  const difficulty = parseInt(values.difficulty || "2", 10);
  const ageBand = values["age-band"] || "family";
  const persist = !values["no-persist"];

  let rawCandidatesOverride;
  if (values["candidates-json"]) {
    rawCandidatesOverride = JSON.parse(values["candidates-json"]);
  } else if (values["candidates-file"]) {
    rawCandidatesOverride = JSON.parse(readFileSync(values["candidates-file"], "utf8"));
  }

  if (!values.json) {
    logStartupSummary({
      method: "HTTP API",
      executionMode: persist ? "persist" : "dry-run",
      profileCount: 0,
      concurrency: 1,
      config: {
        archetype: values.archetype,
        domain: values.domain,
        subtopic: values.subtopic,
        subtopicTitle: values["subtopic-title"] || values.subtopic,
        count,
        difficulty,
        ageBand,
        persist,
      },
    });
    log("INFO", "Running Auto-QA pipeline (Deduplication, Schema, Quality)...", { step: "QA_PREPARE" });
  }

  let llmClient = null;
  if (!rawCandidatesOverride) {
    try {
      const configModule = await import("../apps/server/src/config.js");
      const loggerModule = await import("../apps/server/src/logger.js");
      const antigravityModule = await import("../apps/server/src/antigravity.js");
      const codexModule = await import("../apps/server/src/codex.js");
      const config = await configModule.loadConfig(workspaceRoot);
      const logger = new loggerModule.StudioLogger(workspaceRoot, false);
      llmClient =
        config.active_engine === "antigravity"
          ? new antigravityModule.AntigravityClient(workspaceRoot, config, logger)
          : new codexModule.CodexAppServerClient(workspaceRoot, config, logger);
    } catch (clientErr) {
      if (!values.json) {
        log("WARN", `Could not initialize AI engine client: ${clientErr?.message || clientErr}`, { step: "CLIENT_INIT" });
      }
    }
  }

  try {
    const result = await generateQuestionBankBatch(repository, {
      archetypeId: values.archetype,
      domainId: values.domain,
      subtopicId: values.subtopic,
      subtopicTitle: values["subtopic-title"],
      count,
      difficulty,
      ageBand,
      persist,
      llmClient,
      rawCandidatesOverride,
    });

    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    log(
      "OK",
      `Batch ingestion completed: Requested=${result.requestedCount} Generated=${result.generatedCount} Approved=${result.approvedCount} Rejected=${result.rejectedCount}`,
      { step: "INGEST" },
    );

    if (result.rejectedCount > 0) {
      log(
        "WARN",
        `Rejection summary: Duplicates=${result.qaSummary.duplicateRejections} Schema=${result.qaSummary.schemaRejections} Quality=${result.qaSummary.qualityRejections}`,
        { step: "QA_SUMMARY" },
      );
    }

    if (result.savedQuestions.length > 0) {
      for (const [idx, q] of result.savedQuestions.slice(0, 3).entries()) {
        log("INFO", `Sample ${idx + 1}: [${q.id}] ${q.question} -> Answer: ${q.correct_choice_id}`, { step: "PERSIST" });
      }
    }

    logFinalSummary({
      total: result.requestedCount,
      success: result.approvedCount,
      failed: result.rejectedCount,
      skipped: 0,
      retries: 0,
      elapsedMs: Date.now() - startTime,
    });
  } catch (err) {
    if (values.json) {
      console.error(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    } else {
      log("ERROR", `Ingestion failed: ${err instanceof Error ? err.message : String(err)}`, { step: "ERROR" });
      logFinalSummary({
        total: count,
        success: 0,
        failed: count,
        skipped: 0,
        retries: 0,
        elapsedMs: Date.now() - startTime,
      });
    }
    process.exit(1);
  }
}

main();
