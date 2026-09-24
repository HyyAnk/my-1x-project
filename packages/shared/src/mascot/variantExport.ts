import { z } from "zod";

export const VariantExportModeSchema = z.enum(["original", "transparent"]);
export type VariantExportMode = z.infer<typeof VariantExportModeSchema>;
export const VariantExportRequestSchema = z
  .object({
    request_id: z.string().uuid(),
    mode: VariantExportModeSchema,
    destination: z.string().min(1).max(1024),
    retry_job_id: z.string().uuid().optional(),
  })
  .strict();
export type VariantExportRequest = z.infer<typeof VariantExportRequestSchema>;

export interface VariantExportSummary {
  styles: number;
  thinking: number;
  celebrate: number;
  empty: number;
}
export interface VariantExportFailure {
  item: string;
  message: string;
}
export interface VariantExportJob {
  id: string;
  mascot_id: string;
  mode: VariantExportMode;
  destination: string;
  status: "running" | "cancelling" | "completed" | "partial" | "failed" | "cancelled";
  total: number;
  processed: number;
  copied: number;
  skipped: number;
  failed: number;
  current: string | null;
  failures: VariantExportFailure[];
  started_at: string;
  finished_at: string | null;
}
export interface ExportFolderListing {
  path: string;
  parent: string | null;
  roots: string[];
  folders: Array<{ name: string; path: string }>;
}
