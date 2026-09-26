import type { RepositoryService } from "../repository.js";
import type { ZipEntry } from "../quiz/zipHelper.js";

export type IdentityRepository = Pick<
  RepositoryService,
  "getChannel" | "getChannelAssetManifest" | "getMascot" | "getMascotAssetFile" | "getTransparentMascotAssetFile" | "storageRoot"
>;

export interface IdentityCollection {
  folder: string;
  entries: ZipEntry[];
  warnings: string[];
}
