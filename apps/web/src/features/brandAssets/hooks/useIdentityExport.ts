import { useEffect, useRef, useState } from "react";
import { fetchIdentityExport } from "../services/identityExportApi";
import { downloadIdentityZip, saveIdentityDirectory } from "../services/saveIdentityExport";
import type { IdentityPickerWindow, IdentityProgress } from "../services/identityExport.types";

export function useIdentityExport(channelId: string) {
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<IdentityProgress>({ message: "" });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [channelId],
  );

  const download = async () => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setError(false);
    setWarnings([]);
    setProgress({ message: "Choose a folder" });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const picker = (window as IdentityPickerWindow).showDirectoryPicker;
      const directory = picker ? await picker.call(window, { mode: "readwrite" }) : null;
      controller.signal.throwIfAborted();
      setProgress({ message: "Preparing identity" });
      timer = setTimeout(() => controller.abort(new DOMException("Export timed out. Retry the download.", "TimeoutError")), 120_000);
      const bundle = await fetchIdentityExport(channelId, directory ? "files" : "zip", controller.signal);
      controller.signal.throwIfAborted();
      setWarnings(bundle.warnings);
      if (directory) {
        const folder = await saveIdentityDirectory(directory, bundle, controller.signal, (next) => {
          if (active.current === controller) setProgress(next);
        });
        if (active.current === controller) setProgress({ message: `Saved ${bundle.files.length} files to ${folder}` });
      } else {
        downloadIdentityZip(bundle);
        setProgress({ message: "ZIP download started" });
      }
    } catch (cause) {
      if (active.current !== controller) return;
      const cancelled = cause instanceof DOMException && cause.name === "AbortError";
      setError(!cancelled);
      setProgress({
        message: cancelled ? "Download cancelled" : cause instanceof Error ? cause.message : "Download failed. Please retry.",
      });
    } finally {
      clearTimeout(timer);
      if (active.current === controller) {
        active.current = null;
        setPending(false);
      }
    }
  };
  return { pending, progress, warnings, error, download };
}
