export interface SegmentNarrativeFieldsProps {
  segmentIndex: number;
  narrative: string;
  dialogue?: string;
  audioDirection: string;
  onUpdateNarrative: (val: string) => void;
  onUpdateDialogue: (val: string) => void;
  onUpdateAudio: (val: string) => void;
}

export function SegmentNarrativeFields({
  segmentIndex,
  narrative,
  dialogue,
  audioDirection,
  onUpdateNarrative,
  onUpdateDialogue,
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
        <label className="short-reel-label" htmlFor={`seg-dialogue-${segmentIndex}`}>
          <span>Character Dialogue (Spoken)</span>
        </label>
        <input
          id={`seg-dialogue-${segmentIndex}`}
          type="text"
          className="short-reel-input"
          placeholder="Spoken voice line for mascot or narrator..."
          value={dialogue ?? ""}
          onChange={(e) => onUpdateDialogue(e.target.value)}
        />
      </div>

      <div className="short-reel-form-group">
        <label className="short-reel-label" htmlFor={`seg-audio-${segmentIndex}`}>
          <span>Audio & Sound Direction</span>
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
