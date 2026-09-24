import type { ExportFolderListing, VariantExportJob, VariantExportRequest, VariantExportSummary } from "@studio/shared";
import { request } from "../../../api/client";

const base = (id: string) => `/api/mascots/${encodeURIComponent(id)}/variant-exports`;
const timeout = () => AbortSignal.timeout(30_000);
export const variantExportApi = {
  preview: (id: string) => request<{ summary: VariantExportSummary; job: VariantExportJob | null }>(base(id), { signal: timeout() }),
  start: (id: string, input: VariantExportRequest) => request<VariantExportJob>(base(id), { method: "POST", body: JSON.stringify(input), signal: timeout() }),
  status: (id: string, jobId: string) => request<VariantExportJob>(`${base(id)}/${jobId}`, { signal: timeout() }),
  cancel: (id: string, jobId: string) => request<VariantExportJob>(`${base(id)}/${jobId}/cancel`, { method: "POST", signal: timeout() }),
  folders: (path?: string) => request<ExportFolderListing>(`/api/mascots/variant-export/folders${path ? `?path=${encodeURIComponent(path)}` : ""}`, { signal: timeout() }),
  validate: (path: string) => request<{ path: string }>("/api/mascots/variant-export/folders/validate", {
    method: "POST", body: JSON.stringify({ path }), signal: timeout(),
  }),
};
