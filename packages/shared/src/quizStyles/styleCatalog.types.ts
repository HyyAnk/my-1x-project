export type StyleSlot = "thinking-bar" | "question-box" | "answer-card" | "counter" | "background";

export type StyleCatalogEntry = {
  id: string;
  slot: StyleSlot;
  version: string;
  displayName: string;
  description: string;
  namespace: string;
  previewAsset?: string;
  assetPaths: readonly string[];
};

export type StyleCatalogSnapshot = {
  revision: string;
  generatedAt: string;
  entries: readonly StyleCatalogEntry[];
};
