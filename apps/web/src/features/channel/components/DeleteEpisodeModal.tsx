import { useState } from "react";
import { CircleNotch, Trash, X } from "@phosphor-icons/react";
import type { Channel, Episode } from "@studio/shared";
import { api } from "../../../api";
import { useTranslation } from "../../../i18n";

export function DeleteEpisodeModal({
  channel,
  episode,
  onClose,
  onDeleted,
  onError,
}: {
  channel: Channel;
  episode: Episode;
  onClose: () => void;
  onDeleted: (episode: Episode) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteEpisode(channel.channel_id, episode.episode_id);
      await onDeleted(episode);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete episode");
      onError(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-episode-title"
        aria-describedby="delete-episode-copy"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t("channelDetail.deleteEpisodeTitle")}</p>
            <h2 id="delete-episode-title">{t("channelDetail.deleteEpisodeTitle")}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close delete dialog" onClick={onClose} disabled={busy}>
            <X size={18} />
          </button>
        </div>
        <p id="delete-episode-copy" className="modal-copy">
          {t("channelDetail.deleteEpisodeWarning")}
        </p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="quiet-button" onClick={onClose} disabled={busy}>
            {t("common.no")}
          </button>
          <button type="button" className="primary-button danger-confirm" onClick={() => void submit()} disabled={busy}>
            {busy ? <CircleNotch className="spin" size={16} /> : <Trash size={16} />}
            {busy ? t("common.working") : t("common.yes")}
          </button>
        </div>
      </section>
    </div>
  );
}
