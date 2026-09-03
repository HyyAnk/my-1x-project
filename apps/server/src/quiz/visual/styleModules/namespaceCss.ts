import { StyleModuleManifestSchema } from "./manifestSchema.js";
import type { SlotScopedStyleModule } from "./types.js";

export function renderValidatedModuleCss(module: SlotScopedStyleModule): string {
  StyleModuleManifestSchema.parse(module.manifest);
  return module.renderer.renderCss();
}
