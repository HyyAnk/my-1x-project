import { useState } from "react";
import type { Channel, Task } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseChannelDnaProps = {
  channel: Channel;
  dnaTaskActive: boolean;
  onTaskSubmitted: (task: Task) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  setBusy: (busy: string | null) => void;
  switchTab: (tab: "episodes" | "topics" | "dna") => void;
};

export function useChannelDna({ channel, dnaTaskActive, onTaskSubmitted, onNotice, setBusy, switchTab }: UseChannelDnaProps) {
  const [dna, setDna] = useState<{ content: string; path: string; modified_at: string } | null>(null);
  const [editingDna, setEditingDna] = useState(false);
  const [dnaDraft, setDnaDraft] = useState("");
  const [showDna, setShowDna] = useState(true);

  const saveDna = async () => {
    setBusy("dna");
    try {
      await api.saveDna(channel.channel_id, dnaDraft);
      setEditingDna(false);
      setDna((current) => (current ? { ...current, content: dnaDraft, modified_at: new Date().toISOString() } : current));
      onNotice({ tone: "good", message: "Channel DNA updated" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save Channel DNA" });
    } finally {
      setBusy(null);
    }
  };

  const generateDna = async () => {
    if (dnaTaskActive) return;
    setBusy("dna");
    try {
      const result = await api.generateDna(channel.channel_id);
      onTaskSubmitted(result.task);
      onNotice({ tone: "good", message: "Generating Channel DNA blueprint..." });
      switchTab("dna");
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not generate Channel DNA" });
    } finally {
      setBusy(null);
    }
  };

  const resetDnaDraft = () => {
    setDnaDraft(dna?.content ?? "");
    setEditingDna(false);
  };

  return {
    dna,
    setDna,
    editingDna,
    setEditingDna,
    dnaDraft,
    setDnaDraft,
    showDna,
    setShowDna,
    saveDna,
    generateDna,
    resetDnaDraft,
  };
}
