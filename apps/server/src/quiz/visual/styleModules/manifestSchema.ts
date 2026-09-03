import { z } from "zod";
import type { StyleCatalogEntry, StyleSlot } from "@studio/shared";

const NAMESPACED_STYLE_ID_PATTERN =
  /^[a-z][a-z0-9-]*\.(thinking-bar|question-box|answer-card|counter|background)\.[a-z][a-z0-9-]*$/;
const LEGACY_STYLE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;
const NAMESPACE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export const StyleSlotSchema = z.enum(["thinking-bar", "question-box", "answer-card", "counter", "background"]);

const SafeAssetPathSchema = z
  .string()
  .min(1)
  .refine(isSafeRelativeAssetPath, "Asset paths must be safe relative paths");

export const StyleModuleManifestSchema = z
  .object({
    id: z.string().refine(isStyleModuleId, "Style ID must use <namespace>.<slot>.<name> or a legacy built-in ID"),
    slot: StyleSlotSchema,
    version: z.string().regex(VERSION_PATTERN, "Version must be a semantic version"),
    displayName: z.string().trim().min(1),
    description: z.string().trim().min(1),
    namespace: z.string().regex(NAMESPACE_PATTERN, "Namespace must be a lowercase CSS identifier"),
    previewAsset: SafeAssetPathSchema.optional(),
    assetPaths: z.array(SafeAssetPathSchema),
    cssSelectors: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (isNamespacedStyleId(manifest.id) && !manifest.id.includes(`.${manifest.slot}.`)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["id"],
        message: "Style ID slot must match the manifest slot",
      });
    }

    for (const [index, selector] of (manifest.cssSelectors ?? []).entries()) {
      if (!isNamespacedSelector(selector, manifest.namespace)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cssSelectors", index],
          message: `CSS selectors must be scoped beneath .${manifest.namespace}`,
        });
      }
    }
  });

export type StyleModuleManifest = StyleCatalogEntry & {
  cssSelectors?: readonly string[];
};

export type { StyleSlot };

function isSafeRelativeAssetPath(assetPath: string): boolean {
  if (assetPath.startsWith("/") || assetPath.startsWith("\\") || /^[A-Za-z]:/.test(assetPath)) return false;
  const segments = assetPath.replaceAll("\\", "/").split("/");
  return !segments.includes("..") && segments.every((segment) => segment.length > 0 && segment !== ".");
}

function isNamespacedSelector(selector: string, namespace: string): boolean {
  return selector
    .split(",")
    .map((part) => part.trim())
    .every((part) => {
      if (!part.startsWith(`.${namespace}`)) return false;
      const nextCharacter = part[namespace.length + 1];
      return nextCharacter === undefined || nextCharacter === ":" || nextCharacter === " " || part.startsWith(`.${namespace}__`);
    });
}

function isNamespacedStyleId(id: string): boolean {
  return NAMESPACED_STYLE_ID_PATTERN.test(id);
}

export function isStyleModuleId(id: string): boolean {
  return isNamespacedStyleId(id) || LEGACY_STYLE_ID_PATTERN.test(id);
}
