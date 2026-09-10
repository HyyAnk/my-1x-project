import { KNOWN_TRADEMARK_IP_DEFS, type TrademarkIpDef } from "../../bank/audit/entityCopyrightRules.js";
import type { VisualProxyRule } from "./sanitizerTypes.js";

const SPECIAL_INLINE_PROXIES: Record<string, string> = {
  "pac-man": "a classic retro yellow arcade character chomping glowing dots in a neon maze",
  "super mario": "a cheerful retro arcade plumber character in overalls",
  mario: "a cheerful retro arcade plumber character in overalls",
  luigi: "a tall green-capped retro arcade plumber character in overalls",
  bowser: "a massive fiery spiked dragon-turtle creature roaring inside a lava fortress",
  pikachu: "a cheerful electric yellow rodent creature with red cheek pouches and lightning bolt-shaped tail",
  sonic: "a hyper-fast cobalt blue woodland hedgehog sprinting along rolling green hills",
  "mickey mouse": "a cheerful retro cartoon mouse with large round ears and white gloves",
  simba: "a spirited young golden savannah lion resting beneath acacia trees",
};

function buildBoundaryRegex(def: TrademarkIpDef): RegExp {
  const rawSource = def.namePattern.source;
  const cleanedSource = rawSource
    .replace(/^\^/, "")
    .replace(/\$$/, "")
    .replace(/\(\?:/g, "(")
    .replace(/\^/g, "")
    .replace(/\$/g, "");

  return new RegExp(`\\b(?:${cleanedSource})\\b`, "i");
}

function deriveInlineProxy(def: TrademarkIpDef): string {
  const primaryName = def.forbiddenKeywords?.[0]?.toLowerCase() || "";
  if (SPECIAL_INLINE_PROXIES[primaryName]) {
    return SPECIAL_INLINE_PROXIES[primaryName];
  }
  const cleanProxy = def.safeVisualProxy.trim();
  const firstSentence = cleanProxy.split(/[.!?]/)[0] || cleanProxy;
  return firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1);
}

export function buildStage1VisualProxyRules(): VisualProxyRule[] {
  return KNOWN_TRADEMARK_IP_DEFS.map((def, index) => {
    const primaryName = def.forbiddenKeywords?.[0] || `ip_${index}`;
    const id = `stage1_${primaryName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    return {
      id,
      pattern: buildBoundaryRegex(def),
      fullProxy: def.safeVisualProxy,
      inlineProxy: deriveInlineProxy(def),
      category: def.category,
      forbiddenKeywords: def.forbiddenKeywords,
    };
  });
}
