import type { ReactNode } from "react";
import { CheckCircle, CircleNotch, XCircle } from "@phosphor-icons/react";
import type { VerificationResult } from "../../hooks/useImageFallbackSettingsState";

export interface ProviderTestButtonProps {
  verifying: boolean;
  onVerify: () => void | Promise<void>;
  disabled?: boolean;
  idleLabel: string;
  verifyingLabel?: string;
  icon?: ReactNode;
  spinnerSize?: number;
}

export function ProviderTestButton({
  verifying,
  onVerify,
  disabled = false,
  idleLabel,
  verifyingLabel = "Verifying…",
  icon,
  spinnerSize = 16,
}: ProviderTestButtonProps) {
  return (
    <button
      type="button"
      className="quiet-button"
      disabled={disabled || verifying}
      onClick={() => void onVerify()}
    >
      {verifying ? (
        <>
          <CircleNotch size={spinnerSize} className="spin" />
          <span>{verifyingLabel}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{idleLabel}</span>
        </>
      )}
    </button>
  );
}

export interface ProviderVerificationBannerProps {
  result: NonNullable<VerificationResult>;
}

export function ProviderVerificationBanner({ result }: ProviderVerificationBannerProps) {
  const isSuccess = result.status === "success";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "9px 13px",
        borderRadius: "9px",
        fontSize: "12px",
        fontWeight: 600,
        background: isSuccess ? "var(--soft-green)" : "var(--danger-surface)",
        color: isSuccess ? "var(--green)" : "var(--notice-error)",
        border: `1px solid ${
          isSuccess
            ? "color-mix(in srgb, var(--green) 35%, transparent)"
            : "color-mix(in srgb, var(--notice-error) 35%, transparent)"
        }`,
      }}
    >
      {isSuccess ? <CheckCircle size={16} weight="fill" /> : <XCircle size={16} weight="fill" />}
      <span>{result.message}</span>
    </div>
  );
}
