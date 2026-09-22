import React, { useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { BUILT_IN_PRESETS, getTransition, type IntroOutroTransitionType } from "@studio/shared";
import type { CreateIntroOutroStylePayload } from "../../../api/introOutroApi";
import type { UploadScriptLinks } from "./introOutroScriptStudio";
import {
  IntroOutroFormatBanner,
  IntroOutroModalHeader,
  IntroOutroNameInput,
  ModalTransitionPreview,
  TransitionTypeSelector,
  validateAndInspectVideo,
  VideoDropzoneCard,
  type VideoFileInfo,
} from "./introOutro";

export interface CreateIntroOutroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateIntroOutroStylePayload) => Promise<boolean>;
  submitting: boolean;
  themeColors?: { from?: string; to?: string };
  stylePresetId?: string;
  categoryName?: string;
  scriptLinks?: UploadScriptLinks | null;
}

export function CreateIntroOutroModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  themeColors,
  stylePresetId = BUILT_IN_PRESETS[0].id,
  categoryName = BUILT_IN_PRESETS[0].name,
  scriptLinks = null,
}: CreateIntroOutroModalProps) {
  const [name, setName] = useState("");
  const [transitionType, setTransitionType] = useState<IntroOutroTransitionType>("stinger_swipe");
  const [durationSeconds, setDurationSeconds] = useState(0.5);
  const [audioMode, setAudioMode] = useState<"use_video_audio" | "overlay_bgm">("use_video_audio");
  const [introInfo, setIntroInfo] = useState<VideoFileInfo | null>(null);
  const [outroInfo, setOutroInfo] = useState<VideoFileInfo | null>(null);
  const [probingIntro, setProbingIntro] = useState(false);
  const [probingOutro, setProbingOutro] = useState(false);
  const [playTrigger, setPlayTrigger] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  if (!isOpen) return null;

  const handlePreview = (previewId?: string) => {
    if (previewId && previewId !== transitionType) {
      setTransitionType(previewId);
      const targetDef = getTransition(previewId);
      if (previewId === "cut" || (targetDef && targetDef.maxDuration === 0)) {
        setDurationSeconds(0.0);
      } else if (
        targetDef &&
        (durationSeconds < targetDef.minDuration || durationSeconds > targetDef.maxDuration || durationSeconds === 0)
      ) {
        setDurationSeconds(targetDef.defaultDuration);
      }
    }
    setIsPreviewVisible(true);
    setPlayTrigger((prev) => prev + 1);
  };

  const handleTransitionChange = (newType: IntroOutroTransitionType) => {
    setTransitionType(newType);
    setPlayTrigger((prev) => prev + 1);
  };

  const canSubmit =
    name.trim().length > 0 &&
    introInfo &&
    !introInfo.error &&
    introInfo.dataUrl &&
    outroInfo &&
    !outroInfo.error &&
    outroInfo.dataUrl &&
    !submitting &&
    !probingIntro &&
    !probingOutro;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !introInfo || !outroInfo) return;

    await onSubmit({
      name: name.trim(),
      style_preset_id: stylePresetId,
      transition_type: transitionType,
      transition_duration_seconds: transitionType === "cut" ? 0 : durationSeconds,
      audio_mode: audioMode,
      intro_data: introInfo.dataUrl,
      outro_data: outroInfo.dataUrl,
      intro_filename: introInfo.file.name,
      outro_filename: outroInfo.file.name,
      ...(scriptLinks?.introRevisionId
        ? {
            intro_script_provenance: {
              project_id: scriptLinks.projectId,
              revision_id: scriptLinks.introRevisionId,
            },
          }
        : {}),
      ...(scriptLinks?.outroRevisionId
        ? {
            outro_script_provenance: {
              project_id: scriptLinks.projectId,
              revision_id: scriptLinks.outroRevisionId,
            },
          }
        : {}),
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="intro-outro-modal-title">
      <div className="intro-outro-modal-shell">
        <IntroOutroModalHeader onClose={onClose} disabled={submitting} categoryName={categoryName} />

        <form onSubmit={handleSubmit} className="intro-outro-modal-body">
          <IntroOutroFormatBanner />

          {scriptLinks?.introRevisionId || scriptLinks?.outroRevisionId ? (
            <div className="script-upload-provenance">
              Approved script links:{" "}
              {[scriptLinks.introRevisionId ? "Intro" : null, scriptLinks.outroRevisionId ? "Outro" : null].filter(Boolean).join(" and ")}
            </div>
          ) : null}

          <IntroOutroNameInput value={name} onChange={setName} disabled={submitting} />

          <div className="intro-outro-dual-grid">
            <VideoDropzoneCard
              label="Intro Sequence"
              roleBadge="Opening Clip"
              isIntro={true}
              inputId="intro-file-upload"
              fileInfo={introInfo}
              probing={probingIntro}
              disabled={submitting}
              onSelectFile={(file: File) =>
                validateAndInspectVideo({
                  file,
                  onSuccess: setIntroInfo,
                  setProbing: setProbingIntro,
                })
              }
              onClear={() => setIntroInfo(null)}
            />

            <VideoDropzoneCard
              label="Outro Sequence"
              roleBadge="Ending / CTA"
              isIntro={false}
              inputId="outro-file-upload"
              fileInfo={outroInfo}
              probing={probingOutro}
              disabled={submitting}
              onSelectFile={(file: File) =>
                validateAndInspectVideo({
                  file,
                  onSuccess: setOutroInfo,
                  setProbing: setProbingOutro,
                })
              }
              onClear={() => setOutroInfo(null)}
            />
          </div>

          <TransitionTypeSelector
            transitionType={transitionType}
            onChangeTransition={handleTransitionChange}
            durationSeconds={durationSeconds}
            onChangeDuration={setDurationSeconds}
            audioMode={audioMode}
            onChangeAudioMode={setAudioMode}
            disabled={submitting}
            onPreview={handlePreview}
          />

          <ModalTransitionPreview
            transitionType={transitionType}
            durationSeconds={durationSeconds}
            playTrigger={playTrigger}
            onReplay={() => setPlayTrigger((prev) => prev + 1)}
            themeColors={themeColors}
            isVisible={isPreviewVisible}
            onToggleVisibility={() => setIsPreviewVisible((prev) => !prev)}
          />

          <div className="intro-outro-modal-footer" style={{ margin: "-22px -24px", marginTop: 4 }}>
            <button type="button" className="quiet-button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="intro-outro-submit-btn" disabled={!canSubmit}>
              <Sparkle size={16} weight="fill" />
              <span>{submitting ? "Uploading & Processing..." : "Save Style Pair"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
