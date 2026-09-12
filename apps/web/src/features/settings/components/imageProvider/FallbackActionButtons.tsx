import { CircleNotch, FloppyDisk, Plug } from "@phosphor-icons/react";
import { ProviderTestButton } from "./ProviderTestSection";

export interface FallbackActionButtonsProps {
  savingFallback: boolean;
  verifyingFallback: boolean;
  canTest: boolean;
  onVerifyFallbackConnection: () => void | Promise<void>;
}

export function FallbackActionButtons({
  savingFallback,
  verifyingFallback,
  canTest,
  onVerifyFallbackConnection,
}: FallbackActionButtonsProps) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <button type="submit" className="primary-button" disabled={savingFallback}>
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

      <ProviderTestButton
        verifying={verifyingFallback}
        disabled={!canTest}
        onVerify={onVerifyFallbackConnection}
        icon={<Plug size={16} />}
        idleLabel="Test Connection"
        verifyingLabel="Verifying..."
      />
    </div>
  );
}
