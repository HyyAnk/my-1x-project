import { createHash, randomUUID } from "node:crypto";

export interface ImgStudioIdempotencyIdentity {
  workflow: string;
  runId: string;
  resource: string;
  tier: string;
  model: string;
}

const normalizeKeyComponent = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (normalized || "scope").slice(0, 18);
};

export function createImgStudioRunId(): string {
  return randomUUID();
}

export function createImgStudioIdempotencyKey(identity: ImgStudioIdempotencyIdentity): string {
  const canonicalIdentity = JSON.stringify([
    identity.workflow.trim(),
    identity.runId.trim(),
    identity.resource.trim(),
    identity.tier.trim(),
    identity.model.trim(),
  ]);
  const digest = createHash("sha256").update(canonicalIdentity).digest("hex").slice(0, 48);
  const workflow = normalizeKeyComponent(identity.workflow);
  const tier = normalizeKeyComponent(identity.tier);
  return `imgstudio_${workflow}_${tier}_${digest}`;
}
