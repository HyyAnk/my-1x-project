import { useEffect } from "react";
import { ArrowUp, Folder } from "@phosphor-icons/react";
import { useExportFolders } from "../../hooks/useExportFolders";

export function ExportFolderPicker({
  initialPath,
  onSelect,
  onCancel,
}: {
  initialPath: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
}) {
  const folders = useExportFolders(onSelect);
  useEffect(() => {
    void folders.browse(initialPath || undefined);
  }, []);
  return (
    <section className="variant-export-folder-picker" aria-label="Choose server folder">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void folders.browse(folders.path);
        }}
      >
        <label htmlFor="export-folder-path">Server folder</label>
        <div className="variant-export-path-row">
          <input
            id="export-folder-path"
            value={folders.path}
            onChange={(event) => folders.setPath(event.target.value)}
            disabled={folders.busy}
          />
          <button className="quiet-button" disabled={folders.busy || !folders.path.trim()}>
            Browse
          </button>
        </div>
      </form>
      <div className="variant-export-path-row">
        <button
          type="button"
          className="quiet-button"
          disabled={folders.busy || !folders.listing?.parent}
          onClick={() => void folders.browse(folders.listing?.parent || undefined)}
        >
          <ArrowUp size={16} />
          Up
        </button>
        <label>
          Drive
          <select
            aria-label="Drive"
            value={folders.listing?.roots.find((root) => folders.listing?.path.startsWith(root)) || ""}
            disabled={folders.busy}
            onChange={(event) => void folders.browse(event.target.value)}
          >
            <option value="" disabled>
              Select drive
            </option>
            {folders.listing?.roots.map((root) => (
              <option key={root} value={root}>
                {root}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="variant-export-folder-list" aria-busy={folders.busy}>
        {folders.busy ? (
          <p role="status">Loading folder…</p>
        ) : folders.listing?.folders.length === 0 ? (
          <p>No subfolders</p>
        ) : (
          folders.listing?.folders.map((folder) => (
            <button type="button" className="quiet-button" key={folder.path} onClick={() => void folders.browse(folder.path)}>
              <Folder size={18} />
              <span>{folder.name}</span>
            </button>
          ))
        )}
      </div>
      {folders.error && <p role="alert">{folders.error}</p>}
      <div className="variant-export-actions">
        <button type="button" className="quiet-button" onClick={onCancel}>
          Back
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={folders.busy || !folders.path.trim()}
          onClick={() => void folders.select()}
        >
          {folders.busy ? "Checking…" : "Use This Folder"}
        </button>
      </div>
    </section>
  );
}
