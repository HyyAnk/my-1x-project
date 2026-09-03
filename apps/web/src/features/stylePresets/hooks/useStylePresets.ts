import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateStylePresetInput, StylePreset, UpdateStylePresetInput } from "@studio/shared";
import { api } from "../../../api";

export type StylePresetMutation = "create" | "update" | "delete" | "duplicate" | null;

export function useStylePresets() {
  const [presets, setPresets] = useState<StylePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutation, setMutation] = useState<StylePresetMutation>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await api.stylePresets();
      if (version !== requestVersion.current) return response.presets;
      setPresets(response.presets);
      setError(null);
      return response.presets;
    } catch (cause) {
      if (version === requestVersion.current) setError(cause instanceof Error ? cause.message : "Failed to load style presets");
      throw cause;
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const runMutation = useCallback(
    async <T>(kind: Exclude<StylePresetMutation, null>, operation: () => Promise<T>): Promise<T> => {
      setMutation(kind);
      setError(null);
      try {
        const result = await operation();
        await refresh();
        return result;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Style preset update failed");
        throw cause;
      } finally {
        setMutation(null);
      }
    },
    [refresh],
  );

  const create = useCallback((input: CreateStylePresetInput) => runMutation("create", () => api.createStylePreset(input)), [runMutation]);
  const update = useCallback(
    (id: string, input: UpdateStylePresetInput) => runMutation("update", () => api.updateStylePreset(id, input)),
    [runMutation],
  );
  const remove = useCallback((id: string) => runMutation("delete", () => api.deleteStylePreset(id)), [runMutation]);
  const duplicate = useCallback(
    (preset: StylePreset, name?: string) => {
      const { id: _id, revision: _revision, created_at: _created, updated_at: _updated, ...input } = preset;
      return runMutation("duplicate", () => api.createStylePreset({ ...input, name: name?.trim() || `${preset.name} Copy` }));
    },
    [runMutation],
  );

  return { presets, loading, error, mutation, refresh, create, update, remove, duplicate };
}
