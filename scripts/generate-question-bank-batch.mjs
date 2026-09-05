#!/usr/bin/env node
import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

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

  if (!values.json) {
    console.log(`\n======================================================`);
    console.log(`🤖 AI QUESTION BANK BATCH INGESTION & AUTO-QA`);
    console.log(`======================================================`);
    console.log(`Archetype : ${values.archetype}`);
    console.log(`Domain    : ${values.domain}`);
    console.log(`Subtopic  : ${values.subtopic} (${values["subtopic-title"] || values.subtopic})`);
    console.log(`Count     : ${count} questions (Difficulty: ${difficulty}/5, Age: ${ageBand})`);
    console.log(`Persist   : ${persist ? "YES (Will append to batch file)" : "DRY RUN (Validate only)"}`);
    console.log(`------------------------------------------------------`);
    console.log(`Running Auto-QA pipeline (Copyright, Deduplication, Schema)...`);
  }

  let llmClient = null;
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
      console.warn(`[CLI] Warning: Could not initialize AI engine client:`, clientErr?.message || clientErr);
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
    });

    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\n✅ Batch Ingestion Completed!`);
    console.log(`- Requested : ${result.requestedCount}`);
    console.log(`- Generated : ${result.generatedCount}`);
    console.log(`- Passed QA : ${result.approvedCount}`);
    console.log(`- Rejected  : ${result.rejectedCount}`);

    if (result.rejectedCount > 0) {
      console.log(`\n⚠️ Rejection Summary:`);
      console.log(`  * Copyright violations : ${result.qaSummary.copyrightRejections}`);
      console.log(`  * Semantic duplicates  : ${result.qaSummary.duplicateRejections}`);
      console.log(`  * Schema / Quality     : ${result.qaSummary.schemaRejections + result.qaSummary.qualityRejections}`);
    }

    if (result.savedQuestions.length > 0) {
      console.log(`\n📋 Sample Saved Questions:`);
      for (const [idx, q] of result.savedQuestions.slice(0, 3).entries()) {
        console.log(`  ${idx + 1}. [${q.id}] ${q.question} -> Đáp án: ${q.correct_choice_id}`);
      }
    }
  } catch (err) {
    if (values.json) {
      console.error(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    } else {
      console.error(`\n❌ Ingestion Failed:`, err);
    }
    process.exit(1);
  }
}

main();
