import { useEffect, useRef, useState } from "react";
import { variantExportApi } from "../services/variantExportApi";

export function useNativeExportFolder(onSelect: (path: string) => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const pick = async (initialPath: string) => {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await variantExportApi.pickFolder(initialPath || undefined);
      if (!mounted.current) return;
      if (result.path) onSelect(result.path);
      else setMessage("Folder selection cancelled");
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Cannot open the folder window. Use a server folder path.");
    } finally {
      locked.current = false;
      if (mounted.current) setPending(false);
    }
  };
  return { pending, error, message, pick };
}
