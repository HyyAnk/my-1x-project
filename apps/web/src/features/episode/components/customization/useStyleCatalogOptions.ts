import { useEffect, useState } from "react";
import type { StyleSlot } from "@studio/shared";
import { api } from "../../../../api";

const catalogCache = new Map<StyleSlot, string[]>();

export function useStyleCatalogOptions(slot: StyleSlot, fallback: readonly string[]): string[] {
  const [options, setOptions] = useState<string[]>(() => catalogCache.get(slot) ?? [...fallback]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const catalog = await api.styleCatalog();
        const ids = catalog.entries.filter((entry) => entry.slot === slot).map((entry) => entry.id);
        if (!cancelled && ids.length > 0) {
          catalogCache.set(slot, ids);
          setOptions(ids);
        }
      } catch {
        // Keep built-in options available when the catalog endpoint is unavailable.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slot]);

  return options;
}
