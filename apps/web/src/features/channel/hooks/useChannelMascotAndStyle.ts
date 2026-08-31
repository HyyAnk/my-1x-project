import { useEffect, useState } from "react";
import type { Channel, ChannelMascotConfig, MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";

export type UseChannelMascotAndStyleProps = {
  channel: Channel;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useChannelMascotAndStyle({ channel, onRefresh, onNotice }: UseChannelMascotAndStyleProps) {
  const { t } = useTranslation();

  const [mascotsList, setMascotsList] = useState<MascotProfile[]>([]);
  const [changingMascot, setChangingMascot] = useState(false);
  const [isStageStudioOpen, setIsStageStudioOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  useEffect(() => {
    void api
      .mascots()
      .then((res) => setMascotsList(res.mascots))
      .catch(() => undefined);
  }, []);

  const handleMascotChange = async (mascotId: string | null) => {
    try {
      setChangingMascot(true);
      await api.assignMascotToChannel(channel.channel_id, { mascot_id: mascotId });
      onNotice({ tone: "good", message: mascotId ? t("notices.mascotAssignedChannel") : t("notices.mascotUnassignedChannel") });
      await onRefresh();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mascotAssignFailed") });
    } finally {
      setChangingMascot(false);
    }
  };

  const handleMascotConfigUpdate = async (updates: Partial<ChannelMascotConfig>) => {
    try {
      setChangingMascot(true);
      await api.assignMascotToChannel(channel.channel_id, {
        mascot_id: channel.mascot_id,
        config: updates,
      });
      onNotice({ tone: "good", message: t("notices.mascotConfigUpdated") });
      await onRefresh();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mascotAssignFailed") });
    } finally {
      setChangingMascot(false);
    }
  };

  return {
    mascotsList,
    changingMascot,
    isStageStudioOpen,
    setIsStageStudioOpen,
    isEditProfileOpen,
    setIsEditProfileOpen,
    handleMascotChange,
    handleMascotConfigUpdate,
  };
}
