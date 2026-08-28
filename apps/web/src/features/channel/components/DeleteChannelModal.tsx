import { useState } from "react";
import { CircleNotch, Trash, X } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import { api } from "../../../api";
import { useTranslation } from "../../../i18n";

export function DeleteChannelModal({
  channel,
  onClose,
  onDeleted,
  onError,
}: {
  channel: Channel;
  onClose: () => void;
  onDeleted: (channel: Channel) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"choice" | "type">("choice");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (confirmation !== "Yes" || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteChannel(channel.channel_id);
      await onDeleted(channel);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete channel");
      onError(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-channel-title" aria-describedby="delete-channel-copy">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t("channels.deleteChannelBtn")}</p>
            <h2 id="delete-channel-title">{step === "choice" ? t("channels.deleteChannelTitle") : t("common.typeYesToConfirm")}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close delete dialog" onClick={onClose} disabled={busy}>
            <X size={18} />
          </button>
        </div>
        {step === "choice" ? (
          <>
            <p id="delete-channel-copy" className="modal-copy">
              {t("channels.deleteChannelWarning")}
            </p>
            <div className="modal-actions">
              <button type="button" className="quiet-button" onClick={onClose}>
                {t("common.no")}
              </button>
              <button type="button" className="primary-button danger-confirm" onClick={() => setStep("type")}>
                {t("common.yes")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p id="delete-channel-copy" className="modal-copy">
              {t("channels.deleteChannelWarning")}
            </p>
            <label>
              Confirmation
              <input
                autoFocus
                aria-label="Type Yes to confirm"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Yes"
                autoComplete="off"
              />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <div className="modal-actions">
              <button
                type="button"
                className="quiet-button"
                onClick={() => {
                  setStep("choice");
                  setConfirmation("");
                  setError("");
                }}
                disabled={busy}
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                className="primary-button danger-confirm"
                disabled={busy || confirmation !== "Yes"}
                onClick={() => void submit()}
              >
                {busy ? <CircleNotch className="spin" size={16} /> : <Trash size={16} />}
                {t("channels.deleteChannelBtn")}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
