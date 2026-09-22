import { useRef, useState } from "react";
import type { IntroOutroScriptRevision } from "@studio/shared";
import { fetchScriptPackage } from "../../../api/scriptPackageApi";

export function useScriptPackageDownload() {
  const pending = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const download = async (revision: IntroOutroScriptRevision) => {
    if (pending.current) return;
    pending.current = true;
    setDownloading(true);
    setError(null);
    try {
      const blob = await fetchScriptPackage(revision.channel_id, revision.project_id, revision.revision_id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${revision.clip_kind}-revision-${revision.revision_number}.zip`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Package export failed");
    } finally {
      pending.current = false;
      setDownloading(false);
    }
  };
  return { download, downloading, error };
}
