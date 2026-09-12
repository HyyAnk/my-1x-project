export interface SegmentNarrativeFieldsProps {
  segmentIndex: number;
  narrative: string;
  audioDirection: string;
  onUpdateNarrative: (val: string) => void;
  onUpdateAudio: (val: string) => void;
}

export function SegmentNarrativeFields({
  segmentIndex,
  narrative,
  audioDirection,
  onUpdateNarrative,
  onUpdateAudio,
}: SegmentNarrativeFieldsProps) {
  return (
    <>
      <div className="short-reel-form-group">
        <label className="short-reel-label" htmlFor={`seg-narrative-${segmentIndex}`}>
          <span>Visual Narrative</span>
        </label>
        <textarea
          id={`seg-narrative-${segmentIndex}`}
          rows={3}
          className="short-reel-textarea"
          value={narrative}
          onChange={(e) => onUpdateNarrative(e.target.value)}
        />
      </div>

      <div className="short-reel-form-group">
        <label className="short-reel-label" htmlFor={`seg-audio-${segmentIndex}`}>
          <span>Audio & Voice Direction</span>
        </label>
        <input
          id={`seg-audio-${segmentIndex}`}
          type="text"
          className="short-reel-input"
          value={audioDirection}
          onChange={(e) => onUpdateAudio(e.target.value)}
        />
      </div>
    </>
  );
}
