import { useCallback, useEffect, useState } from "react";
import type { Channel, IntroOutroStyle } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import type { CreateIntroOutroStylePayload } from "../../../api/introOutroApi";

export interface UseChannelIntroOutroProps {
  channel: Channel;
  onNotice: (notice: NonNullable<Notice>) => void;
  onChannelUpdate?: (updated: Channel) => void;
}

export function useChannelIntroOutro({ channel, onNotice, onChannelUpdate }: UseChannelIntroOutroProps) {
  const [styles, setStyles] = useState<IntroOutroStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const refreshStyles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listIntroOutroStyles(channel.channel_id);
      setStyles(res.styles);
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "Failed to load intro/outro styles",
      });
    } finally {
      setLoading(false);
    }
  }, [channel.channel_id, onNotice]);

  useEffect(() => {
    void refreshStyles();
  }, [refreshStyles]);

  const handleCreateStyle = async (payload: CreateIntroOutroStylePayload): Promise<boolean> => {
    setBusyAction("create");
    try {
      const res = await api.createIntroOutroStyle(channel.channel_id, payload);
      setStyles((prev) => [res.style, ...prev]);
      onNotice({ tone: "good", message: `Intro/Outro style "${res.style.name}" created successfully.` });
      setIsCreateOpen(false);
      return true;
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "Failed to create intro/outro style",
      });
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteStyle = async (styleId: string, styleName: string) => {
    setBusyAction(`delete_${styleId}`);
    try {
      await api.deleteIntroOutroStyle(channel.channel_id, styleId);
      setStyles((prev) => prev.filter((s) => s.style_id !== styleId));
      if (channel.default_intro_outro_style_id === styleId && onChannelUpdate) {
        onChannelUpdate({ ...channel, default_intro_outro_style_id: null });
      }
      onNotice({ tone: "good", message: `Style "${styleName}" deleted.` });
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "Failed to delete style",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSetDefaultStyle = async (styleId: string | null) => {
    setBusyAction(`default_${styleId ?? "clear"}`);
    try {
      const res = await api.setDefaultIntroOutroStyle(channel.channel_id, styleId);
      if (onChannelUpdate) {
        onChannelUpdate(res.channel);
      }
      onNotice({
        tone: "good",
        message: styleId ? "Default Intro/Outro style updated." : "Default style cleared.",
      });
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "Failed to set default style",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return {
    styles,
    loading,
    isCreateOpen,
    setIsCreateOpen,
    busyAction,
    refreshStyles,
    handleCreateStyle,
    handleDeleteStyle,
    handleSetDefaultStyle,
  };
}
