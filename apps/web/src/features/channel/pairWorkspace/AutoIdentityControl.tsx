import { useState } from "react";
import { Info } from "@phosphor-icons/react";

export function AutoIdentityControl({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pair-identity-control">
      <label className="pair-auto-identity">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /> Auto identity
      </label>
      <div className="pair-identity-help" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <button
          type="button"
          className="icon-button"
          aria-label="Auto identity help"
          aria-expanded={open}
          aria-controls="pair-identity-help"
          onClick={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <Info size={17} />
        </button>
        {open ? (
          <p id="pair-identity-help">
            Reuse saved identity when available. Uncheck to analyze again on the next generation. Auto is enabled whenever you reopen this
            workspace.
          </p>
        ) : null}
      </div>
    </div>
  );
}
