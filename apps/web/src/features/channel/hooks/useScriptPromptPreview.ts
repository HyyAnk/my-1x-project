import { useCallback, useEffect, useRef, useState } from "react";

type PromptLoader = (revisionId: string) => Promise<string>;

export function useScriptPromptPreview(revisionId: string, loadPrompt: PromptLoader) {
  const requestVersion = useRef(0);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const version = ++requestVersion.current;
    setPrompt("");
    setLoading(true);
    setError(null);
    void loadPrompt(revisionId)
      .then((value) => {
        if (version !== requestVersion.current) return;
        setPrompt(value);
      })
      .catch((cause: unknown) => {
        if (version !== requestVersion.current) return;
        setError(cause instanceof Error ? cause.message : "Failed to load final prompt");
      })
      .finally(() => {
        if (version === requestVersion.current) setLoading(false);
      });
    return () => {
      if (version === requestVersion.current) requestVersion.current += 1;
    };
  }, [loadPrompt, reloadVersion, revisionId]);

  const retry = useCallback(() => setReloadVersion((value) => value + 1), []);
  return { prompt, loading, error, retry };
}
