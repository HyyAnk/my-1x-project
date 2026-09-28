import type { IntroOutroScriptContent } from "@studio/shared";

export const CREATIVE_PRODUCTION_POLICY = "creative-performance-v3";

export function isCreativePolicy(content: Pick<IntroOutroScriptContent, "production_policy">): boolean {
  return content.production_policy === CREATIVE_PRODUCTION_POLICY;
}
