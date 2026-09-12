import type { ChangeEvent } from "react";
import { CheckCircle, Eye, EyeSlash, Trash } from "@phosphor-icons/react";

export interface ApiKeyInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hasKey: boolean;
  showKey: boolean;
  onToggleShowKey: () => void;
  onClearKey: () => void | Promise<void>;
  placeholder: string;
  helpText: string;
  disabled?: boolean;
  clearButtonTitle?: string;
}

export function ApiKeyInputField({
  label,
  value,
  onChange,
  hasKey,
  showKey,
  onToggleShowKey,
  onClearKey,
  placeholder,
  helpText,
  disabled = false,
  clearButtonTitle = "Remove this API Key",
}: ApiKeyInputFieldProps) {
  return (
    <label>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{label}</span>
        {hasKey ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--green)",
              background: "var(--soft-green)",
              padding: "2px 8px",
              borderRadius: "999px",
            }}
          >
            <CheckCircle size={13} weight="fill" />
            Key Saved & Active
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--muted)",
            }}
          >
            Not configured
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
        <input
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            flex: 1,
            ...(hasKey && !value
              ? { borderColor: "color-mix(in srgb, var(--green) 40%, var(--line))" }
              : {}),
          }}
        />
        <button
          type="button"
          className="icon-button"
          title={showKey ? "Hide key" : "Show key"}
          aria-label={showKey ? "Hide key" : "Show key"}
          onClick={onToggleShowKey}
        >
          {showKey ? <EyeSlash size={16} /> : <Eye size={16} />}
        </button>
        {hasKey || value ? (
          <button
            type="button"
            className="icon-button danger"
            title={clearButtonTitle}
            aria-label={clearButtonTitle}
            disabled={disabled}
            onClick={() => void onClearKey()}
          >
            <Trash size={16} />
          </button>
        ) : null}
      </div>
      <small className="field-help">{helpText}</small>
    </label>
  );
}
