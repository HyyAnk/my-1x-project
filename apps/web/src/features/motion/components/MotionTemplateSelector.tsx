import { useEffect, useState } from "react";
import type {
  MotionPromptOutput,
  MotionTemplateDefinition,
  MotionTemplateId,
  MotionTemplateOptions,
} from "@studio/shared";
import { useMotionPreview } from "../hooks/useMotionPreview";
import { useMotionTemplates } from "../hooks/useMotionTemplates";
import { MotionFilterBar } from "./MotionFilterBar";
import { MotionPreviewIframe } from "./MotionPreviewIframe";
import { MotionPromptGeneratorModal } from "./MotionPromptGeneratorModal";
import { MotionTemplateCard } from "./MotionTemplateCard";

export interface MotionTemplateSelectorProps {
  isOpen: boolean;
  initialIntroTemplateId?: string;
  initialOutroTemplateId?: string;
  onClose: () => void;
  onApply: (result: {
    introTemplateId?: string;
    outroTemplateId?: string;
    introOptions?: MotionTemplateOptions;
    outroOptions?: MotionTemplateOptions;
  }) => void;
}

export function MotionTemplateSelector({
  isOpen,
  initialIntroTemplateId,
  initialOutroTemplateId,
  onClose,
  onApply,
}: MotionTemplateSelectorProps) {
  const {
    filteredTemplates,
    isLoading: isTemplatesLoading,
    error: templatesError,
    placementFilter,
    categoryFilter,
    searchQuery,
    setPlacementFilter,
    setCategoryFilter,
    setSearchQuery,
  } = useMotionTemplates();

  const { previewState, fetchPreview, setAspectRatio, replay } = useMotionPreview("16:9");

  const [selectedIntroId, setSelectedIntroId] = useState<string | undefined>(initialIntroTemplateId);
  const [selectedOutroId, setSelectedOutroId] = useState<string | undefined>(initialOutroTemplateId);
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [introOptions, setIntroOptions] = useState<MotionTemplateOptions | undefined>();
  const [outroOptions, setOutroOptions] = useState<MotionTemplateOptions | undefined>();

  useEffect(() => {
    if (isOpen && filteredTemplates.length > 0 && !previewingTemplateId) {
      const defaultToPreview =
        filteredTemplates.find((t) => t.id === initialIntroTemplateId || t.id === initialOutroTemplateId) ??
        filteredTemplates[0];
      if (defaultToPreview) {
        setPreviewingTemplateId(defaultToPreview.id);
        void fetchPreview(defaultToPreview.id, undefined, previewState.aspectRatio);
      }
    }
  }, [
    isOpen,
    filteredTemplates,
    initialIntroTemplateId,
    initialOutroTemplateId,
    previewingTemplateId,
    fetchPreview,
    previewState.aspectRatio,
  ]);


  if (!isOpen) return null;

  const handlePreview = (template: MotionTemplateDefinition) => {
    setPreviewingTemplateId(template.id);
    const opts = template.placement === "intro" ? introOptions : outroOptions;
    void fetchPreview(template.id, opts, previewState.aspectRatio);
  };

  const handleSelect = (template: MotionTemplateDefinition) => {
    if (template.placement === "intro") {
      setSelectedIntroId(template.id);
    } else {
      setSelectedOutroId(template.id);
    }
    handlePreview(template);
  };

  const handleAiApply = (output: MotionPromptOutput) => {
    if (output.placement === "intro") {
      setSelectedIntroId(output.recommendedTemplateId);
      setIntroOptions(output.generatedOptions);
    } else {
      setSelectedOutroId(output.recommendedTemplateId);
      setOutroOptions(output.generatedOptions);
    }
    setPreviewingTemplateId(output.recommendedTemplateId);
    void fetchPreview(output.recommendedTemplateId, output.generatedOptions, previewState.aspectRatio);
  };

  const handleConfirmApply = () => {
    onApply({
      introTemplateId: selectedIntroId,
      outroTemplateId: selectedOutroId,
      introOptions,
      outroOptions,
    });
    onClose();
  };

  return (
    <div className="motion-selector-modal" role="dialog" aria-modal="true" aria-labelledby="motion-selector-title">
      <div className="motion-selector-content">
        <div className="motion-selector-header">
          <div>
            <h2 id="motion-selector-title">Dynamic Motion Templates</h2>
            <p className="motion-selector-subtitle">
              Opus HTML/CSS/SVG animations with deterministic sub-frame timing
            </p>
          </div>
          <div className="motion-header-actions">
            <button
              type="button"
              className="motion-btn motion-btn-ai"
              onClick={() => setIsAiModalOpen(true)}
            >
              ✨ AI Motion Hook
            </button>
            <button type="button" className="motion-close-btn" onClick={onClose} aria-label="Close modal">
              ✕
            </button>
          </div>
        </div>

        <MotionFilterBar
          placementFilter={placementFilter}
          categoryFilter={categoryFilter}
          searchQuery={searchQuery}
          onPlacementChange={setPlacementFilter}
          onCategoryChange={setCategoryFilter}
          onSearchChange={setSearchQuery}
        />

        <div className="motion-selector-main">
          <div className="motion-templates-pane">
            {isTemplatesLoading && <div className="motion-loading-status">Loading templates...</div>}
            {templatesError && <div className="motion-error-status">{templatesError}</div>}
            {!isTemplatesLoading && filteredTemplates.length === 0 && (
              <div className="motion-empty-status">No matching motion templates found.</div>
            )}
            <div className="motion-templates-grid">
              {filteredTemplates.map((template) => {
                const isSelected =
                  template.placement === "intro"
                    ? selectedIntroId === template.id
                    : selectedOutroId === template.id;
                return (
                  <MotionTemplateCard
                    key={template.id}
                    template={template}
                    isSelected={isSelected}
                    isPreviewing={previewingTemplateId === template.id}
                    onSelect={handleSelect}
                    onPreview={handlePreview}
                  />
                );
              })}
            </div>
          </div>

          <div className="motion-preview-pane">
            <MotionPreviewIframe
              htmlMarkup={previewState.htmlMarkup}
              aspectRatio={previewState.aspectRatio}
              isLoading={previewState.isLoading}
              error={previewState.error}
              replayKey={previewState.replayKey}
              onReplay={replay}
              onToggleAspectRatio={(ratio) => {
                setAspectRatio(ratio);
                if (previewingTemplateId) {
                  const opts = previewingTemplateId === selectedIntroId ? introOptions : outroOptions;
                  void fetchPreview(previewingTemplateId, opts, ratio);
                }
              }}
            />
          </div>
        </div>

        <div className="motion-selector-footer">
          <div className="motion-footer-summary">
            <span>Intro: <strong>{selectedIntroId ?? "None"}</strong></span>
            <span className="motion-dot">·</span>
            <span>Outro: <strong>{selectedOutroId ?? "None"}</strong></span>
          </div>
          <div className="motion-footer-actions">
            <button type="button" className="motion-btn motion-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="motion-btn motion-btn-primary"
              disabled={!selectedIntroId && !selectedOutroId}
              onClick={handleConfirmApply}
            >
              Apply Motion Templates
            </button>
          </div>
        </div>
      </div>

      <MotionPromptGeneratorModal
        isOpen={isAiModalOpen}
        defaultPlacement={placementFilter === "outro" ? "outro" : "intro"}
        onClose={() => setIsAiModalOpen(false)}
        onApply={handleAiApply}
      />
    </div>
  );
}
