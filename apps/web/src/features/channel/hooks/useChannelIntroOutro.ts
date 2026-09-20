import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel, IntroOutroStyle } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import type { CreateIntroOutroStylePayload, IntroOutroCategorySummary } from "../../../api/introOutroApi";

export interface UseChannelIntroOutroProps {
  channel: Channel;
  onNotice: (notice: NonNullable<Notice>) => void;
  onChannelUpdate?: (updated: Channel) => void;
}

export function useChannelIntroOutro({ channel, onNotice, onChannelUpdate }: UseChannelIntroOutroProps) {
  const [styles, setStyles] = useState<IntroOutroStyle[]>([]);
  const [categories, setCategories] = useState<IntroOutroCategorySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refreshStyles = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const [styleResponse, categoryResponse] = await Promise.all([
        api.listIntroOutroStyles(channel.channel_id),
        api.listIntroOutroCategories(channel.channel_id),
      ]);
      if (version !== requestVersion.current) return;
      setStyles(styleResponse.styles);
      setCategories(categoryResponse.categories);
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "Failed to load intro/outro styles",
      });
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [channel.channel_id, onNotice]);

  useEffect(() => {
    void refreshStyles();
    return () => {
      requestVersion.current += 1;
    };
  }, [refreshStyles]);

  const handleCreateStyle = async (payload: CreateIntroOutroStylePayload): Promise<boolean> => {
    setBusyAction("create");
    try {
      const res = await api.createIntroOutroStyle(channel.channel_id, payload);
      await refreshStyles();
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
      await refreshStyles();
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

  const handleAssignStyle = async (styleId: string, stylePresetId: string) => {
    setBusyAction(`assign_${styleId}`);
    try {
      await api.updateIntroOutroStyle(channel.channel_id, styleId, { style_preset_id: stylePresetId });
      await refreshStyles();
      onNotice({ tone: "good", message: "Intro/Outro pair assigned." });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to assign Intro/Outro pair" });
    } finally {
      setBusyAction(null);
    }
  };

  return {
    styles,
    categories,
    loading,
    isCreateOpen,
    setIsCreateOpen,
    busyAction,
    refreshStyles,
    handleCreateStyle,
    handleDeleteStyle,
    handleAssignStyle,
  };
}
