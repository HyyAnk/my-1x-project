import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { AppConfig, Channel, VoiceProfile } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

type UseVoiceSettingsProps = {
  channels: Channel[];
  appConfig: AppConfig | null;
  onAudioSaved: (audio: AppConfig["audio_generation"]) => void | Promise<void>;
  onChannelUpdated: (channel: Channel) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Could not read file")));
    reader.readAsDataURL(file);
  });
}

export function useVoiceSettings({
  channels,
  appConfig,
  onAudioSaved,
  onChannelUpdated,
  onNotice,
}: UseVoiceSettingsProps) {
  const [audioUrl, setAudioUrl] = useState(appConfig?.audio_generation.service_url ?? "http://127.0.0.1:8890");
  const [exaggeration, setExaggeration] = useState(appConfig?.audio_generation.exaggeration ?? 0.5);
  const [cfgWeight, setCfgWeight] = useState(appConfig?.audio_generation.cfg_weight ?? 0.5);
  const [mergeGapMs, setMergeGapMs] = useState(appConfig?.audio_generation.merge_gap_ms ?? 300);
  const [matchTargetDuration, setMatchTargetDuration] = useState(
    appConfig?.audio_generation.match_target_duration ?? true
  );
  const [savingAudio, setSavingAudio] = useState(false);

  const [selectedChannelId, setSelectedChannelId] = useState(channels[0]?.channel_id ?? "");
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);

  const selectedChannel = channels.find((channel) => channel.channel_id === selectedChannelId) ?? null;
  const selectedVoice = voices.find((voice) => voice.reference_path === selectedChannel?.voice_reference_path) ?? null;

  useEffect(() => {
    if (!selectedChannelId && channels[0]) setSelectedChannelId(channels[0].channel_id);
  }, [channels, selectedChannelId]);

  useEffect(() => {
    void api
      .voices()
      .then((response) => setVoices(response.voices))
      .catch((error: Error) => onNotice({ tone: "bad", message: error.message }));
  }, [onNotice]);

  useEffect(() => {
    const audio = appConfig?.audio_generation;
    if (audio) {
      setAudioUrl(audio.service_url);
      setExaggeration(audio.exaggeration);
      setCfgWeight(audio.cfg_weight);
      setMergeGapMs(audio.merge_gap_ms);
      setMatchTargetDuration(audio.match_target_duration);
    }
  }, [appConfig?.audio_generation]);

  const saveAudio = async (event: FormEvent) => {
    event.preventDefault();
    setSavingAudio(true);
    try {
      const next = await api.saveAudioSettings({
        provider: "chatterbox",
        service_url: audioUrl,
        exaggeration,
        cfg_weight: cfgWeight,
        max_concurrent_tasks: appConfig?.audio_generation.max_concurrent_tasks ?? 2,
        merge_gap_ms: mergeGapMs,
        match_target_duration: matchTargetDuration,
      });
      await onAudioSaved(next.audio_generation);
      onNotice({ tone: "good", message: "Audio settings saved locally" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save audio settings" });
    } finally {
      setSavingAudio(false);
    }
  };

  const assignVoice = async (voiceId: string | null) => {
    if (!selectedChannel) return;
    setVoiceBusy(true);
    try {
      const updated = await api.assignVoice(selectedChannel.channel_id, voiceId);
      onChannelUpdated(updated);
      onNotice({
        tone: "good",
        message: voiceId ? "Voice assigned to channel" : "Channel reset to built-in voice",
      });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not assign voice" });
    } finally {
      setVoiceBusy(false);
    }
  };

  const createVoice = async (name: string, file: File, assignToChannel = false) => {
    if (file.size > 10 * 1024 * 1024) throw new Error("Voice reference must be 10 MB or smaller");
    const dataUrl = await readFileAsDataUrl(file);
    const voice = await api.createVoice(name, dataUrl.split(",")[1] ?? "");
    setVoices((current) => [voice, ...current]);
    if (assignToChannel && selectedChannel) {
      onChannelUpdated(await api.assignVoice(selectedChannel.channel_id, voice.voice_id));
    }
    return voice;
  };

  const addVoice = async (event: FormEvent) => {
    event.preventDefault();
    if (!voiceFile || !voiceName.trim()) return;
    setVoiceBusy(true);
    try {
      await createVoice(voiceName.trim(), voiceFile);
      setVoiceName("");
      setVoiceFile(null);
      onNotice({ tone: "good", message: "Voice added to the library" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not add voice" });
    } finally {
      setVoiceBusy(false);
    }
  };

  const uploadForChannel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChannel) return;
    setVoiceBusy(true);
    try {
      await createVoice(`${selectedChannel.display_name} (uploaded)`, file, true);
      onNotice({ tone: "good", message: "Voice added and assigned to channel" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not upload voice" });
    } finally {
      setVoiceBusy(false);
      event.target.value = "";
    }
  };

  const deleteVoice = async (voice: VoiceProfile) => {
    if (!window.confirm(`Delete voice "${voice.name}" from the library?`)) return;
    setVoiceBusy(true);
    try {
      await api.deleteVoice(voice.voice_id);
      setVoices((current) => current.filter((item) => item.voice_id !== voice.voice_id));
      onNotice({ tone: "good", message: "Voice deleted" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not delete voice" });
    } finally {
      setVoiceBusy(false);
    }
  };

  return {
    audioUrl,
    setAudioUrl,
    exaggeration,
    setExaggeration,
    cfgWeight,
    setCfgWeight,
    mergeGapMs,
    setMergeGapMs,
    matchTargetDuration,
    setMatchTargetDuration,
    savingAudio,
    saveAudio,
    selectedChannelId,
    setSelectedChannelId,
    selectedChannel,
    selectedVoice,
    voices,
    voiceName,
    setVoiceName,
    voiceFile,
    setVoiceFile,
    voiceBusy,
    assignVoice,
    addVoice,
    uploadForChannel,
    deleteVoice,
  };
}
