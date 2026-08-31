import { CircleNotch, FileText, Play, Plus, SpeakerHigh, Trash } from "@phosphor-icons/react";
import type { Channel, VoiceProfile } from "@studio/shared";
import { api } from "../../../api";

type VoiceProfilesLibraryCardProps = {
  channels: Channel[];
  selectedChannelId: string;
  setSelectedChannelId: (id: string) => void;
  selectedChannel: Channel | null;
  selectedVoice: VoiceProfile | null;
  effectiveVoice: VoiceProfile | null;
  voices: VoiceProfile[];
  voiceName: string;
  setVoiceName: (name: string) => void;
  voiceFile: File | null;
  setVoiceFile: (file: File | null) => void;
  voiceBusy: boolean;
  assignVoice: (voiceId: string | null) => void | Promise<void>;
  addVoice: (event: React.FormEvent) => void | Promise<void>;
  uploadForChannel: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  deleteVoice: (voice: VoiceProfile) => void | Promise<void>;
};

export function VoiceProfilesLibraryCard({
  channels,
  selectedChannelId,
  setSelectedChannelId,
  selectedChannel,
  selectedVoice,
  effectiveVoice,
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
}: VoiceProfilesLibraryCardProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <section className="panel channel-voice-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Channel Assignment</p>
            <h2>Assign Channel Voice</h2>
          </div>
          <Play size={22} />
        </div>
        <div className="voice-reference">
          <label>
            Channel
            <select
              value={selectedChannelId}
              onChange={(event) => setSelectedChannelId(event.target.value)}
              disabled={channels.length === 0}
            >
              <option value="">Choose a channel</option>
              {channels.map((channel) => (
                <option key={channel.channel_id} value={channel.channel_id}>
                  {channel.display_name}
                </option>
              ))}
            </select>
          </label>
          {selectedChannel ? (
            <>
              <label>
                Voice
                <select
                  aria-label="Assigned channel voice"
                  value={selectedVoice?.voice_id ?? ""}
                  disabled={voiceBusy}
                  onChange={(event) => void assignVoice(event.target.value || null)}
                >
                  <option value="">Default (Voice English girl)</option>
                  {voices
                    .filter((voice) => !voice.is_builtin && voice.voice_id !== "voice_builtin_english_girl")
                    .map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                      </option>
                    ))}
                </select>
              </label>
              {effectiveVoice ? (
                <audio
                  controls
                  preload="none"
                  aria-label={`Current voice preview for ${selectedChannel.display_name}`}
                  src={api.voiceSampleUrl(effectiveVoice.voice_id)}
                />
              ) : (
                <span className="storage-hint">Built-in default voice</span>
              )}
              <label className="file-picker">
                <FileText size={15} />
                Upload new voice for this channel
                <input type="file" accept="audio/wav,.wav" onChange={(event) => void uploadForChannel(event)} disabled={voiceBusy} />
              </label>
            </>
          ) : (
            <p className="storage-hint">Create a channel before assigning a voice.</p>
          )}
        </div>
      </section>

      <section className="panel voices-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Voice Library ({voices.length})</p>
            <h2>Reference Voices</h2>
          </div>
          <SpeakerHigh size={22} />
        </div>
        <form className="voice-add-form" onSubmit={(event) => void addVoice(event)}>
          <input
            aria-label="Voice name"
            placeholder="Voice name (e.g. Master Narrator)"
            value={voiceName}
            onChange={(event) => setVoiceName(event.target.value)}
          />
          <label className="file-picker">
            <FileText size={15} />
            {voiceFile?.name ?? "Choose WAV reference (10-30s)"}
            <input type="file" accept="audio/wav,.wav" onChange={(event) => setVoiceFile(event.target.files?.[0] ?? null)} />
          </label>
          <button className="primary-button compact" disabled={voiceBusy || !voiceName.trim() || !voiceFile}>
            {voiceBusy ? <CircleNotch className="spin" size={15} /> : <Plus size={15} />}
            <span>Add voice</span>
          </button>
        </form>
        <div className="voice-list">
          {voices.length === 0 ? (
            <p className="storage-hint">No voices in library.</p>
          ) : (
            voices.map((voice) => (
              <article className="voice-card" key={voice.voice_id}>
                <div>
                  <strong>{voice.name}</strong>
                  {voice.is_builtin || voice.voice_id === "voice_builtin_english_girl" ? (
                    <span className="badge" style={{ marginLeft: "6px", fontSize: "0.75rem", opacity: 0.8 }}>
                      (Built-in Default)
                    </span>
                  ) : (
                    <span>{new Date(voice.created_at).toLocaleDateString()}</span>
                  )}
                </div>
                <audio controls preload="none" aria-label={`Preview ${voice.name}`} src={api.voiceSampleUrl(voice.voice_id)} />
                {voice.is_builtin || voice.voice_id === "voice_builtin_english_girl" ? null : (
                  <button
                    className="icon-button danger"
                    title={`Delete ${voice.name}`}
                    aria-label={`Delete ${voice.name}`}
                    disabled={voiceBusy}
                    onClick={() => void deleteVoice(voice)}
                  >
                    <Trash size={15} />
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
