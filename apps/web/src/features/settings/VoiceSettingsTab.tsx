import type { AppConfig, Channel, VoiceProfile } from "@studio/shared";
import type { Notice } from "../../components/types";
import { useVoiceSettings } from "./hooks/useVoiceSettings";
import { AudioEngineConfigCard } from "./components/AudioEngineConfigCard";
import { VoiceProfilesLibraryCard } from "./components/VoiceProfilesLibraryCard";

type VoiceSettingsTabProps = {
  channels: Channel[];
  appConfig: AppConfig | null;
  voices: VoiceProfile[];
  onAudioSaved: (audio: AppConfig["audio_generation"]) => void | Promise<void>;
  onChannelUpdated: (channel: Channel) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function VoiceSettingsTab({ channels, appConfig, onAudioSaved, onChannelUpdated, onNotice }: VoiceSettingsTabProps) {
  const voiceSettings = useVoiceSettings({
    channels,
    appConfig,
    onAudioSaved,
    onChannelUpdated,
    onNotice,
  });

  return (
    <div className="settings-grid">
      <AudioEngineConfigCard
        audioUrl={voiceSettings.audioUrl}
        setAudioUrl={voiceSettings.setAudioUrl}
        exaggeration={voiceSettings.exaggeration}
        setExaggeration={voiceSettings.setExaggeration}
        cfgWeight={voiceSettings.cfgWeight}
        setCfgWeight={voiceSettings.setCfgWeight}
        mergeGapMs={voiceSettings.mergeGapMs}
        setMergeGapMs={voiceSettings.setMergeGapMs}
        matchTargetDuration={voiceSettings.matchTargetDuration}
        setMatchTargetDuration={voiceSettings.setMatchTargetDuration}
        savingAudio={voiceSettings.savingAudio}
        saveAudio={voiceSettings.saveAudio}
      />

      <VoiceProfilesLibraryCard
        channels={channels}
        selectedChannelId={voiceSettings.selectedChannelId}
        setSelectedChannelId={voiceSettings.setSelectedChannelId}
        selectedChannel={voiceSettings.selectedChannel}
        selectedVoice={voiceSettings.selectedVoice}
        effectiveVoice={voiceSettings.effectiveVoice}
        voices={voiceSettings.voices}
        voiceName={voiceSettings.voiceName}
        setVoiceName={voiceSettings.setVoiceName}
        voiceFile={voiceSettings.voiceFile}
        setVoiceFile={voiceSettings.setVoiceFile}
        voiceBusy={voiceSettings.voiceBusy}
        assignVoice={voiceSettings.assignVoice}
        addVoice={voiceSettings.addVoice}
        uploadForChannel={voiceSettings.uploadForChannel}
        deleteVoice={voiceSettings.deleteVoice}
      />
    </div>
  );
}
