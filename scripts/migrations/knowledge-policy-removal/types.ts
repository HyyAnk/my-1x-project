export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };
export type PolicyKey = "copyright_risk" | "is_trademark_ip" | "forbidden_visual_keywords" | "safe_visual_proxy";
export type TransformResult = { value: JsonObject; removedKeys: PolicyKey[] };

export type FilePlan = {
  relativePath: string;
  beforeSha256: string;
  afterSha256: string;
  entities: number;
  changedEntities: number;
  removedFields: number;
};

export type MigrationPlan = {
  schemaVersion: 1;
  migrationId: "knowledge-policy-removal-v1";
  root: string;
  files: FilePlan[];
};

export type JournalEntry = FilePlan & {
  backupRelativePath: string;
  status: "backed_up" | "applied" | "restored";
};

export type MigrationJournal = {
  schemaVersion: 1;
  root: string;
  state: "prepared" | "applying" | "applied" | "partial" | "rolled_back";
  entries: JournalEntry[];
};

export type MigrationErrorCode =
  | "INVALID_ROOT"
  | "INVALID_DATA"
  | "SOURCE_CHANGED"
  | "BACKUP_FAILED"
  | "WRITE_FAILED"
  | "ROLLBACK_CONFLICT"
  | "LOCKED";

export class MigrationError extends Error {
  constructor(
    message: string,
    readonly code: MigrationErrorCode,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MigrationError";
  }
}
