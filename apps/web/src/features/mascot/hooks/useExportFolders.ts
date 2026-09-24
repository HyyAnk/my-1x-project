import { useEffect, useRef, useState } from "react";
import type { ExportFolderListing } from "@studio/shared";
import { variantExportApi } from "../services/variantExportApi";

export function useExportFolders(onSelect: (path: string) => void) {
  const [listing, setListing] = useState<ExportFolderListing | null>(null);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const lock = useRef(false);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );

  const browse = async (target?: string) => {
    const version = ++sequence.current;
    setBusy(true);
    setError(null);
    try {
      const result = await variantExportApi.folders(target);
      if (version === sequence.current) {
        setListing(result);
        setPath(result.path);
      }
    } catch (cause) {
      if (version === sequence.current) setError(cause instanceof Error ? cause.message : "Cannot browse folder.");
    } finally {
      if (version === sequence.current) setBusy(false);
    }
  };
  const select = async () => {
    if (lock.current || !path.trim()) return;
    lock.current = true;
    const version = ++sequence.current;
    setBusy(true);
    setError(null);
    try {
      const result = await variantExportApi.validate(path);
      if (version === sequence.current) onSelect(result.path);
    } catch (cause) {
      if (version === sequence.current) setError(cause instanceof Error ? cause.message : "Cannot use folder.");
    } finally {
      lock.current = false;
      if (version === sequence.current) setBusy(false);
    }
  };
  return { listing, path, setPath, busy, error, browse, select };
}
