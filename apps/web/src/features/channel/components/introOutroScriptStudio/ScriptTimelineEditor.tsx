import type { IntroOutroScriptContent } from "@studio/shared";
import { ScriptProductionDirections } from "./ScriptProductionDirections";
import { ScriptTimeRange } from "./ScriptTimeRange";

type Props = {
  content: IntroOutroScriptContent;
  disabled: boolean;
  onChange: (content: IntroOutroScriptContent) => void;
};

const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function ScriptTimelineEditor({ content, disabled, onChange }: Props) {
  const updateBeat = (index: number, patch: Partial<IntroOutroScriptContent["timeline"][number]>) =>
    onChange({
      ...content,
      timeline: content.timeline.map((beat, beatIndex) => (beatIndex === index ? { ...beat, ...patch } : beat)),
    });

  const updateVoiceLine = (index: number, patch: Partial<IntroOutroScriptContent["voiceover"]["lines"][number]>) =>
    onChange({
      ...content,
      voiceover: {
        ...content.voiceover,
        lines: content.voiceover.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
      },
    });

  return (
    <div className="script-editor">
      <label className="script-field">
        <span>Visual direction</span>
        <textarea
          rows={2}
          value={content.style.description}
          onChange={(event) => onChange({ ...content, style: { ...content.style, description: event.target.value } })}
          disabled={disabled}
        />
      </label>

      <div className="script-timeline">
        {content.timeline.map((beat, index) => (
          <article className="script-beat" key={beat.beat}>
            <header>
              <span>Beat {beat.beat}</span>
              <strong>{beat.role.replaceAll("_", " ")}</strong>
              <time>
                {beat.start_seconds.toFixed(1)}–{beat.end_seconds.toFixed(1)}s
              </time>
            </header>
            <ScriptTimeRange label={`Beat ${beat.beat}`} start={beat.start_seconds} end={beat.end_seconds} disabled={disabled} onChange={(patch) => updateBeat(index, patch)} />
            <label className="script-field">
              <span>Action</span>
              <textarea
                rows={3}
                value={beat.action}
                onChange={(event) => updateBeat(index, { action: event.target.value })}
                disabled={disabled}
              />
            </label>
            <div className="script-two-column">
              <label className="script-field">
                <span>Props</span>
                <input
                  value={beat.props.join(", ")}
                  onChange={(event) => updateBeat(index, { props: list(event.target.value) })}
                  disabled={disabled}
                />
              </label>
              <label className="script-field">
                <span>Visible feature IDs</span>
                <input
                  value={beat.visible_feature_ids.join(", ")}
                  onChange={(event) => updateBeat(index, { visible_feature_ids: list(event.target.value) })}
                  disabled={disabled}
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <section className="script-editor-section">
        <div className="script-section-heading">
          <h4>Voiceover</h4>
          <label className="script-toggle">
            <input
              type="checkbox"
              checked={content.voiceover.enabled}
              onChange={(event) => onChange({ ...content, voiceover: { ...content.voiceover, enabled: event.target.checked } })}
              disabled={disabled}
            />
            Enabled
          </label>
        </div>
        {content.voiceover.lines.map((line, index) => (
          <div className="script-voice-row" key={index}>
            <ScriptTimeRange label={`Voice line ${index + 1}`} start={line.start_seconds} end={line.end_seconds} disabled={disabled || !content.voiceover.enabled} onChange={(patch) => updateVoiceLine(index, patch)} />
            <input
              aria-label={`Voice line ${index + 1}`}
              value={line.text}
              onChange={(event) => updateVoiceLine(index, { text: event.target.value })}
              disabled={disabled || !content.voiceover.enabled}
            />
            <input
              aria-label={`Voice delivery ${index + 1}`}
              value={line.delivery}
              onChange={(event) => updateVoiceLine(index, { delivery: event.target.value })}
              disabled={disabled || !content.voiceover.enabled}
            />
          </div>
        ))}
      </section>

      <details className="script-advanced-editor">
        <summary>Production details</summary>
        <ScriptProductionDirections content={content} disabled={disabled} onChange={onChange} />
        <div className="script-two-column">
          <label className="script-field">
            <span>Staging</span>
            <textarea
              rows={3}
              value={content.style.staging}
              onChange={(event) => onChange({ ...content, style: { ...content.style, staging: event.target.value } })}
              disabled={disabled}
            />
          </label>
          <label className="script-field">
            <span>Motion language</span>
            <textarea
              rows={3}
              value={content.style.motion_language}
              onChange={(event) => onChange({ ...content, style: { ...content.style, motion_language: event.target.value } })}
              disabled={disabled}
            />
          </label>
        </div>
        <label className="script-field">
          <span>Music direction</span>
          <input
            value={content.audio.music_direction}
            onChange={(event) => onChange({ ...content, audio: { ...content.audio, music_direction: event.target.value } })}
            disabled={disabled}
          />
        </label>
        <label className="script-field">
          <span>Consistency restrictions</span>
          <textarea
            rows={4}
            value={content.consistency.restrictions.join("\n")}
            onChange={(event) =>
              onChange({
                ...content,
                consistency: {
                  ...content.consistency,
                  restrictions: event.target.value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                },
              })
            }
            disabled={disabled}
          />
        </label>
      </details>
    </div>
  );
}
