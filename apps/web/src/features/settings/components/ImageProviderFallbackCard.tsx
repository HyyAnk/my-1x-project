import type { FormEvent } from "react";
import { CheckCircle, CircleNotch, Eye, EyeSlash, FloppyDisk, Plug, ShieldCheck, Trash, XCircle } from "@phosphor-icons/react";
import { type ImgStudioModelDefinition, IMGSTUDIO_DEFAULT_MODEL_ID, resolveImgStudioModelName } from "@studio/shared";
import { StatusLine } from "../../../components/AppChrome";
import type { VerificationResult } from "../hooks/useImageFallbackSettingsState";

export interface ImageProviderFallbackCardProps {
  fallbackEnabled: boolean;
  setFallbackEnabled: (enabled: boolean) => void;
  fallbackModel: string;
  setFallbackModel: (model: string) => void;
  fallbackResolution: "1K" | "2K" | "4K";
  setFallbackResolution: (resolution: "1K" | "2K" | "4K") => void;
  fallbackQuality: "standard" | "high";
  setFallbackQuality: (quality: "standard" | "high") => void;
  fallbackApiKey: string;
  setFallbackApiKey: (key: string) => void;
  showFallbackKey: boolean;
  setShowFallbackKey: (show: boolean) => void;
  hasFallbackApiKey: boolean;
  savingFallback: boolean;
  verifyingFallback: boolean;
  verificationResult?: VerificationResult;
  setVerificationResult?: (result: VerificationResult) => void;
  availableModels: readonly ImgStudioModelDefinition[];
  onSaveFallback: (event: FormEvent) => void | Promise<void>;
  onClearFallbackKey: () => void | Promise<void>;
  onVerifyFallbackConnection: () => void | Promise<void>;
}

export function ImageProviderFallbackCard({
  fallbackEnabled,
  setFallbackEnabled,
  fallbackModel,
  setFallbackModel,
  fallbackResolution,
  setFallbackResolution,
  fallbackQuality,
  setFallbackQuality,
  fallbackApiKey,
  setFallbackApiKey,
  showFallbackKey,
  setShowFallbackKey,
  hasFallbackApiKey,
  savingFallback,
  verifyingFallback,
  verificationResult,
  setVerificationResult,
  availableModels,
  onSaveFallback,
  onClearFallbackKey,
  onVerifyFallbackConnection,
}: ImageProviderFallbackCardProps) {
  return (
    <section className="panel image-fallback-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Automatic Disaster Recovery</p>
          <h2>Image Provider Fallback</h2>
        </div>
        <ShieldCheck size={22} />
      </div>

      <StatusLine label="Fallback Provider" value="ImgStudio (imgstudio.site)" />
      <StatusLine
        label="Fallback Mode"
        value={
          fallbackEnabled ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-deep)", fontWeight: 700 }}>
              <ShieldCheck weight="fill" size={14} />
              Active (Auto-failover on primary failure)
            </span>
          ) : (
            <span style={{ color: "var(--muted)" }}>Disabled</span>
          )
        }
      />
      <StatusLine
        label="API Key Status"
        value={
          hasFallbackApiKey ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--green)", fontWeight: 700 }}>
              <CheckCircle weight="fill" size={14} />
              Configured & Active
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontWeight: 600 }}>
              <XCircle size={14} />
              Not configured
            </span>
          )
        }
      />
      <StatusLine
        label="Active Fallback Model"
        value={resolveImgStudioModelName(fallbackModel)}
      />

      <form className="codex-form" onSubmit={(event) => void onSaveFallback(event)}>
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={fallbackEnabled}
            onChange={(event) => setFallbackEnabled(event.target.checked)}
          />
          <span>Enable automatic fallback to ImgStudio</span>
        </label>
        <small className="field-help" style={{ marginTop: "-6px", marginBottom: "8px" }}>
          When any image in a batch fails on the primary provider (e.g., content filter rejection, timeout, or quota limit),
          that specific image is immediately generated via ImgStudio so the video creation workflow continues without disruption.
        </small>

        <label>
          Fallback Model
          <select
            value={fallbackModel}
            onChange={(event) => setFallbackModel(event.target.value)}
          >
            {availableModels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.id === IMGSTUDIO_DEFAULT_MODEL_ID ? "Default · " : ""}Max {item.max_resolution})
              </option>
            ))}
          </select>
          <small className="field-help">
            Default fallback model is Qwen Image 3.0 Pro, providing high visual fidelity and robust prompt adherence.
          </small>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label>
            Fallback Resolution
            <select
              value={fallbackResolution}
              onChange={(event) => setFallbackResolution(event.target.value as "1K" | "2K" | "4K")}
            >
              <option value="1K">1K (Fast / Standard HD)</option>
              <option value="2K">2K (High Resolution - Recommended)</option>
              <option value="4K">4K (Ultra High Definition)</option>
            </select>
          </label>

          <label>
            Fallback Quality
            <select
              value={fallbackQuality}
              onChange={(event) => setFallbackQuality(event.target.value as "standard" | "high")}
            >
              <option value="standard">Standard Quality</option>
              <option value="high">High Quality</option>
            </select>
          </label>
        </div>

        <label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>ImgStudio API Key</span>
            {hasFallbackApiKey ? (
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
              type={showFallbackKey ? "text" : "password"}
              value={fallbackApiKey}
              onChange={(event) => {
                setFallbackApiKey(event.target.value);
                if (setVerificationResult) setVerificationResult(null);
              }}
              placeholder={
                hasFallbackApiKey
                  ? showFallbackKey
                    ? "Stored securely in local settings (enter new key to replace)"
                    : "•••••••••••••••••••••••••••••••• (Key saved & active)"
                  : "Paste ImgStudio API key"
              }
              autoComplete="off"
              style={{
                flex: 1,
                ...(hasFallbackApiKey && !fallbackApiKey
                  ? { borderColor: "color-mix(in srgb, var(--green) 40%, var(--line))" }
                  : {}),
              }}
            />
            <button
              type="button"
              className="icon-button"
              title={showFallbackKey ? "Hide key" : "Show key"}
              aria-label={showFallbackKey ? "Hide key" : "Show key"}
              onClick={() => setShowFallbackKey(!showFallbackKey)}
            >
              {showFallbackKey ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
            {hasFallbackApiKey || fallbackApiKey ? (
              <button
                type="button"
                className="icon-button danger"
                title="Remove ImgStudio API Key"
                aria-label="Remove ImgStudio API Key"
                disabled={savingFallback}
                onClick={() => void onClearFallbackKey()}
              >
                <Trash size={16} />
              </button>
            ) : null}
          </div>
          <small className="field-help">
            {hasFallbackApiKey
              ? "API key is securely stored in local settings. To update it, enter a new key above and click Save Fallback Settings. Click the trash icon to remove it."
              : "Obtain your API key from https://imgstudio.site/docs/api. Key is securely stored in local untracked config."}
          </small>
        </label>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="submit"
            className="primary-button"
            disabled={savingFallback}
          >
            {savingFallback ? (
              <>
                <CircleNotch size={16} className="spin" />
                <span>Saving Fallback...</span>
              </>
            ) : (
              <>
                <FloppyDisk size={16} />
                <span>Save Fallback Settings</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="quiet-button"
            disabled={verifyingFallback || (!fallbackApiKey && !hasFallbackApiKey)}
            onClick={() => void onVerifyFallbackConnection()}
          >
            {verifyingFallback ? (
              <>
                <CircleNotch size={16} className="spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Plug size={16} />
                <span>Test Connection</span>
              </>
            )}
          </button>
        </div>

        {verificationResult ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 13px",
              borderRadius: "9px",
              fontSize: "12px",
              fontWeight: 600,
              background:
                verificationResult.status === "success"
                  ? "var(--soft-green)"
                  : "var(--danger-surface)",
              color:
                verificationResult.status === "success"
                  ? "var(--green)"
                  : "var(--notice-error)",
              border: `1px solid ${
                verificationResult.status === "success"
                  ? "color-mix(in srgb, var(--green) 35%, transparent)"
                  : "color-mix(in srgb, var(--notice-error) 35%, transparent)"
              }`,
            }}
          >
            {verificationResult.status === "success" ? (
              <CheckCircle size={16} weight="fill" />
            ) : (
              <XCircle size={16} weight="fill" />
            )}
            <span>{verificationResult.message}</span>
          </div>
        ) : null}
      </form>
    </section>
  );
}
