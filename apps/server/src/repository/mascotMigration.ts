import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  MASCOT_RENDER_CONTRACT_VERSION,
  MascotProfileSchema,
  adaptMascotV1ToV2,
  nowIso,
  type MascotMigrationInput,
  type MascotProfile,
} from "@studio/shared";
import type { RepositoryRuntime } from "./runtime.js";

const SAFE_MIGRATION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

export type MascotMigrationItem = {
  mascot_id: string;
  status: "would_migrate" | "migrated" | "already_current" | "invalid" | "conflict";
  backup_path?: string;
  message?: string;
};

export type MascotMigrationReport = {
  mode: MascotMigrationInput["mode"];
  migration_id: string;
  schema_version: number;
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  items: MascotMigrationItem[];
};

type MascotMigrationManifest = {
  schema_version: 1;
  migration_id: string;
  created_at: string;
  items: Array<{ mascot_id: string; backup_path: string; migrated_sha256?: string }>;
};

export async function migrateMascotStorage(
  repository: RepositoryRuntime,
  options: Omit<MascotMigrationInput, "mode"> & { mode?: "dry_run" | "apply" } = {},
): Promise<MascotMigrationReport> {
  await repository.ensureBootstrap();
  const mode = options.mode ?? "dry_run";
  const migrationId = resolveMigrationId(options.migration_id);
  const existingManifest = await readMigrationManifest(repository, migrationId);
  const entries = await readdir(repository.roots.mascots, { withFileTypes: true });
  const mascotEntries = entries.filter((entry) => entry.isDirectory() && (!options.mascot_id || entry.name === options.mascot_id));
  const items: MascotMigrationItem[] = [];
  const manifestItems: MascotMigrationManifest["items"] = existingManifest?.items.map((item) => ({ ...item })) ?? [];

  for (const entry of mascotEntries) {
    const mascotId = entry.name;
    const metadataPath = path.join(repository.roots.mascots, mascotId, "mascot.json");
    try {
      const raw = JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
      const profile = MascotProfileSchema.parse(raw);
      if (isCurrentV2(profile)) {
        items.push({ mascot_id: mascotId, status: "already_current" });
        continue;
      }

      const bundle = adaptMascotV1ToV2({ ...profile, render_bundle: undefined, schema_version: undefined });
      if (!bundle) {
        items.push({ mascot_id: mascotId, status: "invalid", message: "Mascot has no renderable assets" });
        continue;
      }

      if (mode === "dry_run") {
        items.push({ mascot_id: mascotId, status: "would_migrate" });
        continue;
      }

      const backupPath = await createBackup(repository, migrationId, mascotId, metadataPath);
      const migratedProfile = MascotProfileSchema.parse({
        ...profile,
        schema_version: MASCOT_RENDER_CONTRACT_VERSION,
        render_bundle: bundle,
      });
      await repository.writeJsonAtomic(metadataPath, migratedProfile);
      const migratedSha256 = sha256(await readFile(metadataPath));
      const relativeBackupPath = path.relative(repository.roots.runtime, backupPath);
      const existingItem = manifestItems.find((item) => item.mascot_id === mascotId);
      if (existingItem) {
        existingItem.backup_path = relativeBackupPath;
        existingItem.migrated_sha256 = migratedSha256;
      } else {
        manifestItems.push({ mascot_id: mascotId, backup_path: relativeBackupPath, migrated_sha256: migratedSha256 });
      }
      items.push({ mascot_id: mascotId, status: "migrated", backup_path: relativeBackupPath });
    } catch (error) {
      items.push({
        mascot_id: mascotId,
        status: "invalid",
        message: error instanceof Error ? error.message : "Mascot manifest could not be migrated",
      });
    }
  }

  if (mode === "apply") {
    const manifest: MascotMigrationManifest = {
      schema_version: 1,
      migration_id: migrationId,
      created_at: nowIso(),
      items: manifestItems,
    };
    await repository.writeJsonAtomic(path.join(repository.roots.runtime, "mascot-migrations", migrationId, "manifest.json"), manifest);
  }

  return summarizeMigration(mode, migrationId, items);
}

export async function rollbackMascotStorage(repository: RepositoryRuntime, migrationId: string): Promise<MascotMigrationReport> {
  await repository.ensureBootstrap();
  assertSafeMigrationId(migrationId);
  const manifestPath = path.join(repository.roots.runtime, "mascot-migrations", migrationId, "manifest.json");
  if (!(await repository.exists(manifestPath))) throw new Error(`Mascot migration not found: ${migrationId}`);
  const manifest = parseManifest(JSON.parse(await readFile(manifestPath, "utf8")) as unknown, migrationId);
  const items: MascotMigrationItem[] = [];

  for (const entry of manifest.items) {
    const metadataPath = path.join(repository.roots.mascots, entry.mascot_id, "mascot.json");
    const backupPath = path.resolve(repository.roots.runtime, entry.backup_path);
    if (!repository.isInside(repository.roots.runtime, backupPath) || !(await repository.exists(backupPath))) {
      items.push({ mascot_id: entry.mascot_id, status: "invalid", message: "Migration backup is missing or unsafe" });
      continue;
    }

    const current = await readCurrentManifest(metadataPath, repository);
    if (current && !isCurrentV2(current)) {
      items.push({ mascot_id: entry.mascot_id, status: "conflict", message: "Current manifest is no longer the migrated V2 manifest" });
      continue;
    }
    if (current && entry.migrated_sha256) {
      const currentHash = sha256(await readFile(metadataPath));
      if (currentHash !== entry.migrated_sha256) {
        items.push({ mascot_id: entry.mascot_id, status: "conflict", message: "Current V2 manifest changed after migration" });
        continue;
      }
    }

    const backup = await readFile(backupPath, "utf8");
    await mkdir(path.dirname(metadataPath), { recursive: true });
    await repository.writeTextAtomic(metadataPath, backup);
    items.push({ mascot_id: entry.mascot_id, status: "migrated", backup_path: entry.backup_path });
  }

  return summarizeMigration("rollback", migrationId, items);
}

function summarizeMigration(mode: MascotMigrationInput["mode"], migrationId: string, items: MascotMigrationItem[]): MascotMigrationReport {
  const migrated = items.filter((item) => item.status === "migrated").length;
  const skipped = items.filter((item) => item.status === "already_current" || item.status === "would_migrate").length;
  const failed = items.filter((item) => item.status === "invalid" || item.status === "conflict").length;
  return {
    mode,
    migration_id: migrationId,
    schema_version: MASCOT_RENDER_CONTRACT_VERSION,
    total: items.length,
    migrated,
    skipped,
    failed,
    items,
  };
}

function resolveMigrationId(value: string | undefined): string {
  const candidate =
    value?.trim() ||
    `mascot-v2-${new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14)}`;
  assertSafeMigrationId(candidate);
  return candidate;
}

function assertSafeMigrationId(value: string): void {
  if (!SAFE_MIGRATION_ID.test(value)) throw new Error("Invalid mascot migration id");
}

function isCurrentV2(profile: MascotProfile): boolean {
  return profile.schema_version === MASCOT_RENDER_CONTRACT_VERSION && Boolean(profile.render_bundle);
}

async function createBackup(repository: RepositoryRuntime, migrationId: string, mascotId: string, metadataPath: string): Promise<string> {
  const backupPath = path.join(repository.roots.runtime, "mascot-migrations", migrationId, mascotId, "mascot.json");
  await mkdir(path.dirname(backupPath), { recursive: true });
  if (!(await repository.exists(backupPath))) await copyFile(metadataPath, backupPath);
  return backupPath;
}

async function readMigrationManifest(repository: RepositoryRuntime, migrationId: string): Promise<MascotMigrationManifest | null> {
  const manifestPath = path.join(repository.roots.runtime, "mascot-migrations", migrationId, "manifest.json");
  if (!(await repository.exists(manifestPath))) return null;
  return parseManifest(JSON.parse(await readFile(manifestPath, "utf8")) as unknown, migrationId);
}

async function readCurrentManifest(metadataPath: string, repository: RepositoryRuntime): Promise<MascotProfile | null> {
  if (!(await repository.exists(metadataPath))) return null;
  try {
    return MascotProfileSchema.parse(JSON.parse(await readFile(metadataPath, "utf8")) as unknown);
  } catch {
    return null;
  }
}

function parseManifest(value: unknown, migrationId: string): MascotMigrationManifest {
  if (!value || typeof value !== "object") throw new Error("Invalid mascot migration manifest");
  const record = value as Record<string, unknown>;
  if (record.schema_version !== 1 || record.migration_id !== migrationId || !Array.isArray(record.items))
    throw new Error("Invalid mascot migration manifest");
  const items = record.items.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid mascot migration item");
    const row = item as Record<string, unknown>;
    if (typeof row.mascot_id !== "string" || typeof row.backup_path !== "string") throw new Error("Invalid mascot migration item");
    if (row.migrated_sha256 !== undefined && (typeof row.migrated_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(row.migrated_sha256)))
      throw new Error("Invalid mascot migration checksum");
    return {
      mascot_id: row.mascot_id,
      backup_path: row.backup_path,
      ...(row.migrated_sha256 ? { migrated_sha256: row.migrated_sha256 } : {}),
    };
  });
  return {
    schema_version: 1,
    migration_id: migrationId,
    created_at: typeof record.created_at === "string" ? record.created_at : "",
    items,
  };
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
