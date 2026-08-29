import { useCallback, useEffect, useState } from "react";
import type { Channel, Episode } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";

export type UseEpisodeChannelBrandNameProps = {
  channel: Channel;
  episode: Episode | null;
  setEpisode: (episode: Episode | null) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  disabled?: boolean;
};

export function useEpisodeChannelBrandName({ channel, episode, setEpisode, onNotice, disabled = false }: UseEpisodeChannelBrandNameProps) {
  const { t } = useTranslation();
  const serverConfirmedValue = episode?.quiz_config?.channel_brand_name || channel.display_name || "";
  const [draft, setDraft] = useState(serverConfirmedValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (episode) {
      setDraft(episode.quiz_config?.channel_brand_name || channel.display_name || "");
      setError(null);
    }
  }, [episode?.episode_id, episode?.quiz_config?.channel_brand_name, channel.display_name]);

  const save = useCallback(async () => {
    if (!episode || saving || disabled) return;
    const trimmed = draft.trim();
    const currentServerOverride = episode.quiz_config?.channel_brand_name ?? "";
    // If the trimmed draft is identical to the current server override, or if draft matches channel display_name and server is already empty
    if (trimmed === currentServerOverride || (!currentServerOverride && trimmed === channel.display_name)) {
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateEpisode(channel.channel_id, episode.episode_id, {
        channel_brand_name: trimmed,
      });
      setEpisode(updated);
      onNotice({ tone: "good", message: t("episodeCustomization.channelNameSuccess") });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("episodeCustomization.channelNameError");
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [channel.channel_id, channel.display_name, disabled, draft, episode, onNotice, saving, setEpisode, t]);

  const revert = useCallback(() => {
    setDraft(serverConfirmedValue);
    setError(null);
  }, [serverConfirmedValue]);

  const retry = useCallback(() => {
    return save();
  }, [save]);

  return {
    draft,
    setDraft,
    saving,
    error,
    save,
    revert,
    retry,
    effectiveBrandName: draft.trim() || channel.display_name || "",
  };
}
