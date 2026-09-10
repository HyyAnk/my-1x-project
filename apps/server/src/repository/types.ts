export type BundleImageMeta = {
  price_vnd?: number;
  price_breakdown?: Record<string, number>;
  model?: string;
  aspect_ratio?: string;
  size?: string;
  provenance?: "explicit" | "curated" | "auto";
  user_selected?: boolean;
};

export type BundleImageAsset = {
  bundle_id: string;
  bundle_number: number;
  variant: number;
  filename: string;
  path: string;
  absolutePath: string;
  size: number;
  modified_at: string;
  price_vnd?: number;
  price_breakdown?: Record<string, number>;
  model?: string;
  aspect_ratio?: string;
  provenance?: "explicit" | "curated" | "auto";
  user_selected?: boolean;
};

export type RepositoryRoots = {
  channels: string;
  templates: string;
  shared: string;
  assets: string;
  runtime: string;
  voices: string;
  mascots: string;
};
