import { useState } from "react";
import type {
  MotionPromptOutput,
  MotionPromptStyleMood,
  MotionTemplatePlacement,
} from "@studio/shared";
import { useMotionPromptGenerator } from "../hooks/useMotionPromptGenerator";

interface MotionPromptGeneratorModalProps {
  isOpen: boolean;
  defaultPlacement?: MotionTemplatePlacement;
  onClose: () => void;
  onApply: (output: MotionPromptOutput) => void;
}

const MOOD_OPTIONS: Array<{ value: MotionPromptStyleMood; label: string; icon: string }> = [
  { value: "high_energy", label: "High Energy", icon: "⚡" },
  { value: "cyberpunk", label: "Cyberpunk", icon: "👾" },
  { value: "minimal_luxury", label: "Minimal Luxury", icon: "✨" },
  { value: "arcade_playful", label: "Arcade Playful", icon: "🎮" },
  { value: "epic_cinematic", label: "Epic Cinematic", icon: "🎬" },
  { value: "educational_clean", label: "Clean / EdTech", icon: "📚" },
];

export function MotionPromptGeneratorModal({
  isOpen,
  defaultPlacement = "intro",
  onClose,
  onApply,
}: MotionPromptGeneratorModalProps) {
  const [placement, setPlacement] = useState<MotionTemplatePlacement>(defaultPlacement);
  const [topicTitle, setTopicTitle] = useState("");
  const [channelName, setChannelName] = useState("");
  const [mood, setMood] = useState<MotionPromptStyleMood>("high_energy");

  const { isGenerating, generatedOutput, error, generatePrompt, resetGenerator } = useMotionPromptGenerator();

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topicTitle.trim()) return;
    await generatePrompt({
      topicTitle: topicTitle.trim(),
      channelName: channelName.trim() || undefined,
      placement,
      mood,
    });
  };

  const handleClose = () => {
    resetGenerator();
    onClose();
  };

  const handleApply = () => {
    if (generatedOutput) {
      onApply(generatedOutput);
      handleClose();
    }
  };

  return (
    <div className="motion-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="motion-gen-title">
      <div className="motion-modal-container">
        <div className="motion-modal-header">
          <h3 id="motion-gen-title">AI Motion Hook Generator</h3>
          <button type="button" className="motion-close-btn" onClick={handleClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="motion-modal-body">
          <div className="motion-form-row">
            <label className="motion-label" htmlFor="motion-placement-select">Placement</label>
            <div className="motion-pill-group" id="motion-placement-select">
              <button
                type="button"
                className={`motion-pill-btn ${placement === "intro" ? "is-active" : ""}`}
                onClick={() => setPlacement("intro")}
              >
                🎬 Intro Hook
              </button>
              <button
                type="button"
                className={`motion-pill-btn ${placement === "outro" ? "is-active" : ""}`}
                onClick={() => setPlacement("outro")}
              >
                🏁 Outro CTA
              </button>
            </div>
          </div>

          <div className="motion-form-row">
            <label className="motion-label" htmlFor="motion-topic-input">Quiz Topic / Title *</label>
            <input
              id="motion-topic-input"
              type="text"
              className="motion-input"
              placeholder="e.g. World Geography Trivia Challenge"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
            />
          </div>

          <div className="motion-form-row">
            <label className="motion-label" htmlFor="motion-channel-input">Channel / Brand Name (Optional)</label>
            <input
              id="motion-channel-input"
              type="text"
              className="motion-input"
              placeholder="e.g. QuizVerse Hub"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
            />
          </div>

          <div className="motion-form-row">
            <label className="motion-label" htmlFor="motion-mood-select">Visual Mood</label>
            <div className="motion-pill-group" id="motion-mood-select">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`motion-pill-btn ${mood === opt.value ? "is-active" : ""}`}
                  onClick={() => setMood(opt.value)}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="motion-form-actions">
            <button
              type="button"
              className="motion-btn motion-btn-primary"
              disabled={isGenerating || !topicTitle.trim()}
              onClick={handleGenerate}
            >
              {isGenerating ? "⚡ Generating Motion Hook..." : "⚡ Generate Motion Hook with AI"}
            </button>
          </div>

          {error && <div className="motion-error-box" role="alert">{error}</div>}

          {generatedOutput && (
            <div className="motion-result-card" role="region" aria-label="Generated Motion Config">
              <div className="motion-result-header">
                <span className="motion-badge-success">✓ Recommended Template:</span>
                <strong>{generatedOutput.recommendedTemplateId}</strong>
                <span className="motion-mini-tag">{generatedOutput.mood}</span>
              </div>

              <div className="motion-result-details">
                {generatedOutput.generatedOptions.headlineText && (
                  <div className="result-item">
                    <strong>Headline:</strong> <span>{generatedOutput.generatedOptions.headlineText}</span>
                  </div>
                )}
                {generatedOutput.generatedOptions.subheadlineText && (
                  <div className="result-item">
                    <strong>Subtitle:</strong> <span>{generatedOutput.generatedOptions.subheadlineText}</span>
                  </div>
                )}
                <div className="result-item">
                  <strong>Philosophy:</strong> <span>{generatedOutput.animationPhilosophy}</span>
                </div>
              </div>

              <div className="motion-result-actions">
                <button type="button" className="motion-btn motion-btn-primary" onClick={handleApply}>
                  Apply This Motion Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
