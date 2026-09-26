import { DownloadSimple } from "@phosphor-icons/react";
import { useIdentityExport } from "../hooks/useIdentityExport";
import "./identityDownload.css";

export function IdentityDownload({ channelId, disabled }: { channelId: string; disabled: boolean }) {
  const { pending, progress, warnings, error, download } = useIdentityExport(channelId);
  return (
    <div className="identity-download">
      <button type="button" className="button secondary" disabled={disabled || pending} aria-busy={pending} onClick={() => void download()}>
        <DownloadSimple size={18} aria-hidden="true" />
        {pending ? "Downloading…" : error ? "Retry Download" : "Download Identity"}
      </button>
      {progress.message && <p role={error ? "alert" : "status"}>{progress.message}</p>}
      {pending && progress.total !== undefined && (
        <progress aria-label="Saving identity files" value={progress.completed} max={progress.total} />
      )}
      {warnings.length > 0 && (
        <ul aria-label="Skipped identity assets">
          {warnings.map((warning, index) => (
            <li key={index}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
