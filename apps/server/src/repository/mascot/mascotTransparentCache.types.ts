export interface MascotTransparentCacheMeta {
  source_filename: string;
  source_size: number;
  source_modified_at: string;
  source_hash: string;
  cached_at: string;
}

export interface TransparentMascotAssetResult {
  absolutePath: string;
  cached: boolean;
  meta: MascotTransparentCacheMeta;
}

export interface TransparentMascotAssetOptions {
  forceRecompute?: boolean;
  validateHash?: boolean;
}

export interface MascotCachePaths {
  transparentDir: string;
  cachedPath: string;
  metaPath: string;
}
