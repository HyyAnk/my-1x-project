import { CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import type { ImageProviderId } from "@studio/shared";
import { ProviderTestButton } from "./ProviderTestSection";

export interface ImageProviderActionButtonsProps {
  imageProvider: ImageProviderId;
  savingImage: boolean;
  checkingImageBalance: boolean;
  canTest: boolean;
  onCheckImageBalance: () => void | Promise<void>;
}

export function ImageProviderActionButtons({
  imageProvider,
  savingImage,
  checkingImageBalance,
  canTest,
  onCheckImageBalance,
}: ImageProviderActionButtonsProps) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <button type="submit" className="primary-button" disabled={savingImage}>
        {savingImage ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
        <span>Save Image Settings</span>
      </button>
      {canTest ? (
        <ProviderTestButton
          verifying={checkingImageBalance}
          onVerify={onCheckImageBalance}
          spinnerSize={15}
          idleLabel={imageProvider === "gpti2" ? "Check Balance & Verify Key" : "Verify Connection & Key"}
          verifyingLabel="Verifying..."
        />
      ) : null}
    </div>
  );
}
