import type { VariantExportJob } from "@studio/shared";
import type { IMascotRepository } from "../../../repository/contracts/mascotRepository.contract.js";

export type ExportRepository = Pick<IMascotRepository, "getMascot" | "getMascotAssetFile" | "getOrCreateTransparentMascotAsset">;
export interface ExportItem {
  label: string;
  directories: string[];
  stem: string;
  sourceUrl: string;
}
export interface ExportRecord {
  job: VariantExportJob;
  items: ExportItem[];
  failedItems: ExportItem[];
  requestId: string;
  retry: boolean;
}
export class VariantExportError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}
