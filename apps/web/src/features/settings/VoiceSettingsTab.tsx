import { CircleNotch, FileText, FloppyDisk, Play, Plus, SpeakerHigh, Trash } from "@phosphor-icons/react";
import type { AppConfig, Channel, VoiceProfile } from "@studio/shared";
import { api } from "../../api";
import { StatusLine } from "../../components/AppChrome";
import type { Notice } from "../../components/types";
import { useVoiceSettings } from "./hooks/useVoiceSettings";

type VoiceSettingsTabProps = {
  channels: Channel[];
  appConfig: AppConfig | null;
  voices: VoiceProfile[];
  onAudioSaved: (audio: AppConfig["audio_generation"]) => void | Promise<void>;
  onChannelUpdated: (channel: Channel) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function VoiceSettingsTab({ channels, appConfig, onAudioSaved, onChannelUpdated, onNotice }: VoiceSettingsTabProps) {
  const {
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
  } = useVoiceSettings({
    channels,
    appConfig,
    onAudioSaved,
    onChannelUpdated,
    onNotice,
  });

  return (
    <div className="settings-grid">
      <section className="panel audio-settings-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Speech Synthesis Engine</p>
            <h2>Audio & Voice Tuning</h2>
          </div>
          <SpeakerHigh size={22} />
        </div>
        <StatusLine label="Provider" value="Chatterbox Local TTS" />
        <form className="codex-form" onSubmit={(event) => void saveAudio(event)}>
          <label>
            Service URL
            <input value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="http://127.0.0.1:8890" />
            <small className="field-help">Local Chatterbox Python TTS API server address.</small>
          </label>

          {/* Humanized Exaggeration Parameter */}
          <div className="setting-slider-group">
            <div className="setting-slider-header">
              <label htmlFor="exaggeration-input">Vocal Expressiveness (Exaggeration)</label>
              <span className="setting-slider-val">{exaggeration.toFixed(2)}</span>
            </div>
            <div className="setting-presets">
              <button
                type="button"
                className={`preset-chip ${exaggeration === 0.3 ? "is-selected" : ""}`}
                onClick={() => setExaggeration(0.3)}
              >
                Subtle (0.3)
              </button>
              <button
                type="button"
                className={`preset-chip ${exaggeration === 0.5 ? "is-selected" : ""}`}
                onClick={() => setExaggeration(0.5)}
              >
                Natural (0.5)
              </button>
              <button
                type="button"
                className={`preset-chip ${exaggeration === 0.75 ? "is-selected" : ""}`}
                onClick={() => setExaggeration(0.75)}
              >
                Dramatic (0.75)
              </button>
            </div>
            <input
              id="exaggeration-input"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={exaggeration}
              onChange={(event) => setExaggeration(Number(event.target.value))}
            />
            <small className="field-help">
              Controls vocal energy, emotion, and dynamic pitch variation. Higher values sound more animated; lower values are calm and
              steady.
            </small>
          </div>

          {/* Humanized CFG Weight Parameter */}
          <div className="setting-slider-group">
            <div className="setting-slider-header">
              <label htmlFor="cfg-weight-input">Voice Clarity & Reference Adherence (CFG)</label>
              <span className="setting-slider-val">{cfgWeight.toFixed(2)}</span>
            </div>
            <div className="setting-presets">
              <button type="button" className={`preset-chip ${cfgWeight === 0.35 ? "is-selected" : ""}`} onClick={() => setCfgWeight(0.35)}>
                Soft (0.35)
              </button>
              <button type="button" className={`preset-chip ${cfgWeight === 0.5 ? "is-selected" : ""}`} onClick={() => setCfgWeight(0.5)}>
                Balanced (0.5)
              </button>
              <button type="button" className={`preset-chip ${cfgWeight === 0.75 ? "is-selected" : ""}`} onClick={() => setCfgWeight(0.75)}>
                Crisp (0.75)
              </button>
            </div>
            <input
              id="cfg-weight-input"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={cfgWeight}
              onChange={(event) => setCfgWeight(Number(event.target.value))}
            />
            <small className="field-help">
              Classifier-Free Guidance weight. Higher values adhere strictly to the reference voice timbre and articulation clarity.
            </small>
          </div>

          {/* Humanized Merge Gap Parameter */}
          <label>
            Sentence Pause Threshold (Merge gap ms)
            <input
              type="number"
              min="0"
              max="5000"
              step="50"
              value={mergeGapMs}
              onChange={(event) => setMergeGapMs(Number(event.target.value))}
            />
            <small className="field-help">
              Minimum silence duration (in ms) between sentence fragments before splitting into a separate narration track ({mergeGapMs}ms ={" "}
              {(mergeGapMs / 1000).toFixed(2)}s).
            </small>
          </label>

          <label className="toggle-field">
            <input type="checkbox" checked={matchTargetDuration} onChange={(event) => setMatchTargetDuration(event.target.checked)} />
            <span>Match episode target duration (auto-calibrate narration pacing)</span>
          </label>

          <button className="primary-button" disabled={savingAudio}>
            {savingAudio ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
            <span>Save Audio Settings</span>
          </button>
        </form>
      </section>

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
                    <option value="">Default (built-in)</option>
                    {voices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedVoice ? (
                  <audio
                    controls
                    preload="none"
                    aria-label={`Current voice preview for ${selectedChannel.display_name}`}
                    src={api.voiceSampleUrl(selectedVoice.voice_id)}
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
              <h2>Custom Reference Voices</h2>
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
              <p className="storage-hint">No custom reference voices added yet.</p>
            ) : (
              voices.map((voice) => (
                <article className="voice-card" key={voice.voice_id}>
                  <div>
                    <strong>{voice.name}</strong>
                    <span>{new Date(voice.created_at).toLocaleDateString()}</span>
                  </div>
                  <audio controls preload="none" aria-label={`Preview ${voice.name}`} src={api.voiceSampleUrl(voice.voice_id)} />
                  <button
                    className="icon-button danger"
                    title={`Delete ${voice.name}`}
                    aria-label={`Delete ${voice.name}`}
                    disabled={voiceBusy}
                    onClick={() => void deleteVoice(voice)}
                  >
                    <Trash size={15} />
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
