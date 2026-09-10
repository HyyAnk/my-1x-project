import type { JsonObject, PolicyKey, TransformResult } from "./types.js";

const POLICY_KEYS: readonly PolicyKey[] = [
  "copyright_risk",
  "is_trademark_ip",
  "forbidden_visual_keywords",
  "safe_visual_proxy",
];

export function removeKnowledgePolicyFields(entity: JsonObject): TransformResult {
  const value = { ...entity };
  const removedKeys: PolicyKey[] = [];
  for (const key of POLICY_KEYS) {
    if (Object.hasOwn(value, key)) {
      delete value[key];
      removedKeys.push(key);
    }
  }
  return { value, removedKeys };
}
