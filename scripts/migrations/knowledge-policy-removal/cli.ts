import fs from "node:fs";
import path from "node:path";
import { planMigration, applyMigration, rollbackMigration } from "./files.js";
import { MigrationError, type MigrationPlan } from "./types.js";

function printHelp(): void {
  console.log(`
Knowledge Policy Removal Migration CLI

Usage:
  # 1. Dry run (generate reviewed plan):
  pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --root <entities-dir> --plan <plan-path>

  # 2. Apply reviewed plan:
  pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --apply --plan <plan-path> --backup-root <backup-dir>

  # 3. Rollback from journal:
  pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --rollback <journal-path>

Options:
  --root <path>         Target directory containing entity JSON files (required for plan)
  --plan <path>         Plan JSON file path (required for plan and apply)
  --apply               Apply migration using pre-generated plan
  --backup-root <path>  Directory to store raw backups and journal (required for apply)
  --rollback <path>     Path to migration-journal.json to restore original files
  --debug               Enable verbose error logging
  --help                Show this help message
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let root: string | undefined;
  let planPath: string | undefined;
  let backupRoot: string | undefined;
  let rollbackPath: string | undefined;
  let isApply = false;
  let isDebug = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--debug") {
      isDebug = true;
    } else if (arg === "--apply") {
      isApply = true;
    } else if (arg === "--root") {
      root = args[++i];
    } else if (arg === "--plan") {
      planPath = args[++i];
    } else if (arg === "--backup-root") {
      backupRoot = args[++i];
    } else if (arg === "--rollback") {
      rollbackPath = args[++i];
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(2);
    }
  }

  try {
    if (rollbackPath) {
      if (root || planPath || backupRoot || isApply) {
        console.error("Error: --rollback cannot be combined with --root, --plan, --apply, or --backup-root");
        process.exit(2);
      }
      console.log(`Starting rollback from journal: ${rollbackPath}`);
      const journal = await rollbackMigration(rollbackPath);
      console.log(`Rollback completed successfully. State: ${journal.state}`);
      console.log(`Restored ${journal.entries.filter((e) => e.status === "restored").length} files.`);
      process.exit(0);
    }

    if (isApply) {
      if (!planPath || !backupRoot) {
        console.error("Error: --apply requires both --plan <path> and --backup-root <path>");
        process.exit(2);
      }
      if (root) {
        console.error("Error: --root should not be specified with --apply (root is loaded from plan)");
        process.exit(2);
      }
      const resolvedPlanPath = path.resolve(planPath);
      if (!fs.existsSync(resolvedPlanPath)) {
        console.error(`Error: Plan file not found: ${resolvedPlanPath}`);
        process.exit(2);
      }
      const plan = JSON.parse(fs.readFileSync(resolvedPlanPath, "utf8")) as MigrationPlan;
      console.log(`Applying migration plan: ${plan.migrationId} on root: ${plan.root}`);
      const journal = await applyMigration(plan, backupRoot);
      const journalPath = path.join(path.resolve(backupRoot), `backup-${journal.entries[0]?.beforeSha256 ? "" : ""}`, "migration-journal.json");
      console.log(`Migration applied successfully. State: ${journal.state}`);
      console.log(`Files updated: ${journal.entries.filter((e) => e.changedEntities > 0).length}`);
      // Find the created journal file in backupRoot
      const backupEntries = fs.readdirSync(path.resolve(backupRoot), { withFileTypes: true });
      const latestBackup = backupEntries.filter((e) => e.isDirectory() && e.name.startsWith("backup-")).sort().pop();
      if (latestBackup) {
        const fullJournalPath = path.join(path.resolve(backupRoot), latestBackup.name, "migration-journal.json");
        console.log(`Journal path: ${fullJournalPath}`);
      }
      process.exit(0);
    }

    // Default: Dry run / Plan mode
    if (!root || !planPath) {
      console.error("Error: Dry-run planning requires both --root <dir> and --plan <path>");
      printHelp();
      process.exit(2);
    }

    const resolvedPlanPath = path.resolve(planPath);
    if (fs.existsSync(resolvedPlanPath)) {
      console.error(`Error: Plan file already exists: ${resolvedPlanPath}. Provide a new plan path or delete the old plan.`);
      process.exit(2);
    }

    console.log(`Planning migration for root: ${path.resolve(root)}`);
    const plan = await planMigration(root);
    fs.mkdirSync(path.dirname(resolvedPlanPath), { recursive: true });
    fs.writeFileSync(resolvedPlanPath, JSON.stringify(plan, null, 2) + "\n", "utf8");

    const totalChangedEntities = plan.files.reduce((acc, f) => acc + f.changedEntities, 0);
    const totalRemovedFields = plan.files.reduce((acc, f) => acc + f.removedFields, 0);
    console.log(`Plan generated: ${resolvedPlanPath}`);
    console.log(`Files scanned: ${plan.files.length}`);
    console.log(`Changed entities: ${totalChangedEntities}`);
    console.log(`Removed policy fields: ${totalRemovedFields}`);
    process.exit(0);
  } catch (err: unknown) {
    if (err instanceof MigrationError) {
      console.error(`Migration error [${err.code}]: ${err.message}`);
      if (isDebug && err.stack) console.error(err.stack);
      if (err.code === "WRITE_FAILED" || err.code === "BACKUP_FAILED") {
        process.exit(1);
      }
      process.exit(2);
    }
    console.error(`Unexpected failure: ${(err as Error).message}`);
    if (isDebug && (err as Error).stack) console.error((err as Error).stack);
    process.exit(1);
  }
}

void main();
