import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import path from "node:path";
import type { VariantExportJob, VariantExportRequest } from "@studio/shared";
import type { StudioLogger } from "../../../logger.js";
import { isInside, validateExportFolder } from "./exportFolders.js";
import { buildVariantExportPlan } from "./variantExportPlan.js";
import { exportVariantFile } from "./variantExportFiles.js";
import { VariantExportError, type ExportRecord, type ExportRepository } from "./variantExport.types.js";

export class VariantExportService {
  private readonly records = new Map<string, ExportRecord>();
  private readonly starting = new Map<string, Promise<VariantExportJob>>();
  private readonly executions = new Set<Promise<void>>();
  private closing = false;

  constructor(
    private readonly repository: ExportRepository,
    private readonly sourceRoot: () => string,
    private readonly logger: StudioLogger,
  ) {}

  async preview(mascotId: string) {
    return buildVariantExportPlan(await this.repository.getMascot(mascotId), "original").summary;
  }

  get(mascotId: string, id: string): VariantExportJob {
    const record = this.records.get(id);
    if (!record || record.job.mascot_id !== mascotId)
      throw new VariantExportError("Export is no longer available. Start a new export; existing files are preserved.", 404);
    return structuredClone(record.job);
  }

  latest(mascotId: string): VariantExportJob | null {
    const record = [...this.records.values()].reverse().find((entry) => entry.job.mascot_id === mascotId);
    return record ? structuredClone(record.job) : null;
  }

  async start(mascotId: string, input: VariantExportRequest): Promise<VariantExportJob> {
    if (this.closing) throw new VariantExportError("Server is shutting down. Retry after it restarts.", 503);
    const pending = this.starting.get(mascotId);
    if (pending) {
      await pending;
      return this.start(mascotId, input);
    }
    const execution = this.create(mascotId, input);
    this.starting.set(mascotId, execution);
    try {
      return await execution;
    } finally {
      this.starting.delete(mascotId);
    }
  }

  private async create(mascotId: string, input: VariantExportRequest): Promise<VariantExportJob> {
    const duplicate = [...this.records.values()].find(
      (record) => record.job.mascot_id === mascotId && record.requestId === input.request_id,
    );
    if (duplicate) return structuredClone(duplicate.job);
    const active = [...this.records.values()].find(
      ({ job }) => job.mascot_id === mascotId && ["running", "cancelling"].includes(job.status),
    );
    if (active) return structuredClone(active.job);
    const destination = await validateExportFolder(input.destination, this.sourceRoot());
    const mascot = await this.repository.getMascot(mascotId);
    const previous = input.retry_job_id ? this.records.get(input.retry_job_id) : undefined;
    if (
      input.retry_job_id &&
      (!previous || previous.job.mascot_id !== mascotId || previous.job.mode !== input.mode || previous.job.destination !== destination)
    ) {
      throw new VariantExportError("Retry does not match the previous export. Start a new export.");
    }
    const items = previous ? previous.failedItems : buildVariantExportPlan(mascot, input.mode).items;
    if (!items.length) throw new VariantExportError("No variants are available to export.");
    const protectedRoot = await realpath(this.sourceRoot()).catch(() => path.resolve(this.sourceRoot()));
    if (items.some((item) => isInside(protectedRoot, path.join(destination, ...item.directories)))) {
      throw new VariantExportError("Output overlaps the mascot source library. Choose another destination.");
    }
    this.prune();
    const job: VariantExportJob = {
      id: randomUUID(),
      mascot_id: mascotId,
      mode: input.mode,
      destination,
      status: "running",
      total: items.length,
      processed: 0,
      copied: 0,
      skipped: 0,
      failed: 0,
      current: null,
      failures: [],
      started_at: new Date().toISOString(),
      finished_at: null,
    };
    const record: ExportRecord = { job, items: [...items], failedItems: [], requestId: input.request_id, retry: Boolean(previous) };
    this.records.set(job.id, record);
    const execution = this.run(record);
    this.executions.add(execution);
    void execution.finally(() => this.executions.delete(execution));
    return structuredClone(job);
  }

  cancel(mascotId: string, id: string): VariantExportJob {
    this.get(mascotId, id);
    const record = this.records.get(id)!;
    if (record.job.status === "running") record.job.status = "cancelling";
    return structuredClone(record.job);
  }

  async close(): Promise<void> {
    this.closing = true;
    await Promise.allSettled(this.starting.values());
    for (const { job } of this.records.values()) if (job.status === "running") job.status = "cancelling";
    await Promise.allSettled(this.executions);
  }

  private prune(): void {
    for (const [id, { job }] of this.records) {
      if (job.finished_at && (this.records.size >= 100 || Date.now() - Date.parse(job.finished_at) > 86_400_000)) this.records.delete(id);
    }
  }

  private async run(record: ExportRecord): Promise<void> {
    const { job } = record;
    const context = { workerId: job.id, profileId: job.mascot_id, step: "variant-export" };
    this.logger.info(
      `Export started: mode=${job.mode}, total=${job.total}, concurrency=1, method=filesystem, destination=${job.destination}`,
      context,
    );
    try {
      for (const item of record.items) {
        if (job.status === "cancelling") break;
        job.current = item.label;
        try {
          const outcome = await exportVariantFile(this.repository, job.mascot_id, job.mode, job.destination, item);
          job[outcome]++;
        } catch (error) {
          const message =
            error instanceof VariantExportError
              ? error.message
              : "Cannot export image. Check the source, free disk space and folder permissions, then retry.";
          record.failedItems.push(item);
          job.failures.push({ item: item.label, message });
          job.failed++;
          this.logger.warn(`${item.label}: ${message}`, context);
        }
        job.processed++;
        this.logger.step(`Export ${job.processed}/${job.total}: ${item.label}`, context);
      }
      job.status = job.status === "cancelling" ? "cancelled" : job.failed === job.total ? "failed" : job.failed ? "partial" : "completed";
    } finally {
      job.current = null;
      job.finished_at = new Date().toISOString();
      this.logger.info(
        `Export ${job.status}: total=${job.total}, success=${job.copied}, failed=${job.failed}, skipped=${job.skipped}, retries=${record.retry ? 1 : 0}, elapsed_ms=${Date.now() - Date.parse(job.started_at)}`,
        context,
      );
    }
  }
}
