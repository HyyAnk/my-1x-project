import { useRef, useState } from "react";
import { Copy, DownloadSimple } from "@phosphor-icons/react";
import { downloadResource, resourcePng, type PairResource } from "./pairResourceApi";

export function PairResourceCard({ resource, filename }: { resource: PairResource; filename: string }) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const lock = useRef(false);
  const label = resource.kind === "mascot" ? "Mascot" : "Channel logo";
  const act = async (action: "copy" | "download") => {
    if (!resource.transparent_url || lock.current) return;
    lock.current = true;
    setPending(true);
    setStatus(action === "copy" ? "Copying..." : "Preparing download...");
    try {
      if (action === "copy") {
        if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
          throw new Error("Image copy unavailable. Use Download PNG.");
        const png = resourcePng(resource.transparent_url);
        // A permission rejection can occur before the clipboard consumes the image promise.
        void png.catch(() => undefined);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
        setStatus("Copied");
      } else {
        downloadResource(await resourcePng(resource.transparent_url), filename);
        setStatus("Download started");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Image action failed. Retry or use Download PNG.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const preview = resource.transparent_url ?? resource.preview_url;
  return (
    <section className="pair-resource-card" aria-label={label}>
      <div className="pair-resource-preview">
        {preview && !imageFailed ? (
          <img src={preview} alt={label} onError={() => setImageFailed(true)} />
        ) : (
          <span>{imageFailed ? "Image unavailable" : "Not configured"}</span>
        )}
      </div>
      <div className="pair-resource-details">
        <strong>{label}</strong>
        {resource.transparent_url ? (
          <div className="pair-resource-actions">
            <button
              type="button"
              className="quiet-button"
              aria-label={`Copy ${label.toLowerCase()} image`}
              disabled={pending}
              onClick={() => void act("copy")}
            >
              <Copy size={16} /> Copy
            </button>
            <button
              type="button"
              className="quiet-button"
              aria-label={`Download ${label.toLowerCase()} PNG`}
              disabled={pending}
              onClick={() => void act("download")}
            >
              <DownloadSimple size={16} /> PNG
            </button>
          </div>
        ) : null}
      </div>
      {!resource.transparent_url && resource.preview_url ? <span className="pair-resource-note">Transparent PNG unavailable</span> : null}
      <span role="status" className="pair-resource-status">
        {status}
      </span>
    </section>
  );
}
