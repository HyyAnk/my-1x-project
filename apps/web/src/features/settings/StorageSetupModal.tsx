import { useState } from "react";
import { CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import type { StorageInfo } from "@studio/shared";
import { api } from "../../api";

export function StorageSetupModal({
  storage,
  onSaved,
  onError,
}: {
  storage: StorageInfo;
  onSaved: (storage: StorageInfo) => void | Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [storagePath, setStoragePath] = useState(storage.default_path);
  const [busy, setBusy] = useState(false);
  const save = async (nextPath: string) => {
    setBusy(true);
    try {
      await onSaved(await api.setStorage(nextPath));
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal storage-setup-modal"
        onSubmit={(event) => {
          event.preventDefault();
          void save(storagePath);
        }}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">First launch</p>
            <h2>Choose storage</h2>
          </div>
        </div>
        <p className="modal-copy">Channel files stay here and out of Git.</p>
        <label>
          Parent folder
          <input
            aria-label="First launch storage folder"
            autoFocus
            value={storagePath}
            onChange={(event) => setStoragePath(event.target.value)}
            placeholder="D:\Documentary Studio Data"
          />
        </label>
        <p className="storage-hint">
          A <code>channels/</code> folder will be created here.
        </p>
        <div className="modal-actions">
          <button type="button" className="quiet-button" disabled={busy} onClick={() => void save(storage.default_path)}>
            Use project folder
          </button>
          <button className="primary-button" disabled={busy || !storagePath.trim()}>
            {busy ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
            <span>Save folder</span>
          </button>
        </div>
      </form>
    </div>
  );
}
