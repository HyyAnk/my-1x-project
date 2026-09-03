import { useState, type ChangeEvent } from "react";

type Props = {
  open: boolean;
  pending?: boolean;
  error?: string | null;
  onCancel: () => void;
  onImport: (data: string, activate: boolean) => Promise<void> | void;
};

export function StyleModuleImportDialog({ open, pending = false, error, onCancel, onImport }: Props) {
  const [data, setData] = useState<string>("");
  const [activate, setActivate] = useState(true);
  if (!open) return null;

  const readPackage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setData(result.includes(",") ? result.split(",", 2)[1] : result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Import style module">
      <h2>Import style module</h2>
      <input type="file" accept=".zip,application/zip" onChange={readPackage} disabled={pending} />
      <label>
        <input type="checkbox" checked={activate} onChange={(event) => setActivate(event.target.checked)} disabled={pending} />
        Activate after validation
      </label>
      {error ? <div role="alert">{error}</div> : null}
      <button type="button" onClick={() => void onImport(data, activate)} disabled={pending || !data}>
        {pending ? "Importing" : "Import"}
      </button>
      <button type="button" onClick={onCancel} disabled={pending}>
        Cancel
      </button>
    </div>
  );
}
