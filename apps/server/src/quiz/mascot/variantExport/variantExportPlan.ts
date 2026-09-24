import { createHash } from "node:crypto";
import { synthesizeLegacyCoreStyle, type MascotProfile, type VariantExportMode, type VariantExportSummary } from "@studio/shared";
import type { ExportItem } from "./variantExport.types.js";

export function exportFolderName(name: string): string {
  const cleaned =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ._-]/g, "_")
      .replace(/[. ]+$/g, "")
      .trim()
      .slice(0, 80)
      .replace(/[. ]+$/g, "") || "Unnamed";
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned) ? `_${cleaned}` : cleaned;
}

export function buildVariantExportPlan(mascot: MascotProfile, mode: VariantExportMode) {
  const styles = mascot.styles?.length ? mascot.styles : [synthesizeLegacyCoreStyle(mascot)];
  const summary: VariantExportSummary = { styles: styles.length, thinking: 0, celebrate: 0, empty: 0 };
  const items: ExportItem[] = [];
  const used = new Set<string>();
  for (const style of styles) {
    const base = exportFolderName(style.name);
    const duplicate = styles.filter((other) => exportFolderName(other.name).toLowerCase() === base.toLowerCase()).length > 1;
    const styleFolder = duplicate ? `${base}_${createHash("sha256").update(style.id).digest("hex").slice(0, 8)}` : base;
    for (const state of ["thinking", "celebrate"] as const) {
      for (const slot of style.states[state]) {
        const sourceUrl = mode === "original" ? slot.raw_image_url || slot.image_url : slot.image_url || slot.raw_image_url;
        if (!sourceUrl) {
          summary.empty++;
          continue;
        }
        const stateFolder = state === "thinking" ? "Thinking" : "Celebrate";
        const directories = [exportFolderName(mascot.name), styleFolder, stateFolder];
        let stem = `V${String(slot.slot_index).padStart(3, "0")}_${mode === "original" ? "Og" : "Trans"}`;
        const key = [...directories, stem].join("/").toLowerCase();
        if (used.has(key)) stem += `_${createHash("sha256").update(slot.id).digest("hex").slice(0, 8)}`;
        used.add(key);
        items.push({ label: `${style.name} / ${stateFolder} / V${slot.slot_index}`, directories, stem, sourceUrl });
        summary[state]++;
      }
    }
  }
  return { summary, items };
}
