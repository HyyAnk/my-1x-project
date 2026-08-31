import { CircleNotch, FloppyDisk, SpeakerHigh } from "@phosphor-icons/react";
import { StatusLine } from "../../../components/AppChrome";

type AudioEngineConfigCardProps = {
  audioUrl: string;
  setAudioUrl: (val: string) => void;
  exaggeration: number;
  setExaggeration: (val: number) => void;
  cfgWeight: number;
  setCfgWeight: (val: number) => void;
  mergeGapMs: number;
  setMergeGapMs: (val: number) => void;
  matchTargetDuration: boolean;
  setMatchTargetDuration: (val: boolean) => void;
  savingAudio: boolean;
  saveAudio: (event: React.FormEvent) => void | Promise<void>;
};

export function AudioEngineConfigCard({
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
}: AudioEngineConfigCardProps) {
  return (
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
  );
}
