import { useState } from "react";
import type { MascotProfile, QuizImageStyle } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import { PROMPT_TEMPLATES, STYLE_OPTIONS } from "../constants";
import type { BatchState } from "./useMascotProgress";

export type UseMascotConceptFormProps = {
  editingMascot: MascotProfile | null;
  setEditingMascot: (mascot: MascotProfile | null) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  onMascotsChanged: () => Promise<void>;
  setBusyAction: (action: string | null) => void;
  setBatchState: (state: BatchState | null) => void;
};

export function useMascotConceptForm({
  editingMascot,
  setEditingMascot,
  onNotice,
  onMascotsChanged,
  setBusyAction,
  setBatchState,
}: UseMascotConceptFormProps) {
  const { t } = useTranslation();
  const [genName, setGenName] = useState("Milo the Explorer");
  const [genDescription, setGenDescription] = useState("");
  const [genStyle, setGenStyle] = useState<QuizImageStyle>("pixar_3d");
  const [genColor, setGenColor] = useState("#06b6d4");
  const [genPrompt, setGenPrompt] = useState(
    "Cute wise baby owl with big sparkling eyes and small red glasses, fluffy feathers, friendly and enthusiastic expression",
  );

  const [showNotesAccordion, setShowNotesAccordion] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  const handleInjectTag = (tagText: string) => {
    const cleanTag = tagText.replace(/^\+\s*/, "").trim();
    setGenPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return cleanTag;
      if (trimmed.toLowerCase().includes(cleanTag.toLowerCase())) return trimmed;
      return `${trimmed}, ${cleanTag}`;
    });
  };

  const handleApplyTemplate = (tpl: (typeof PROMPT_TEMPLATES)[0]) => {
    setGenName(tpl.name);
    setGenPrompt(tpl.prompt);
    setGenStyle(tpl.style);
    setGenColor(tpl.color);
  };

  const handleCopyPrompt = async () => {
    if (!genPrompt) return;
    await navigator.clipboard.writeText(genPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1500);
  };

  const handleGenerateConcept = async () => {
    if (!genName.trim()) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    setBatchState(null);
    setBusyAction("concept");
    try {
      let mascotToUse = editingMascot;
      if (!mascotToUse) {
        const created = await api.createMascot({
          name: genName.trim(),
          description: genDescription.trim(),
          visual_style: genStyle,
          master_prompt: genPrompt.trim(),
          color_theme: genColor,
        });
        mascotToUse = created.mascot;
        setEditingMascot(mascotToUse);
      } else {
        const updated = await api.updateMascot(mascotToUse.id, {
          name: genName.trim(),
          description: genDescription.trim(),
          visual_style: genStyle,
          master_prompt: genPrompt.trim(),
          color_theme: genColor,
        });
        mascotToUse = updated.mascot;
        setEditingMascot(mascotToUse);
      }

      onNotice({ tone: "good", message: t("notices.generatingConcept") });
      const res = await api.generateMascotConcept(mascotToUse.id, {
        prompt: genPrompt.trim(),
        style: genStyle,
      });

      setEditingMascot(res.mascot);
      onNotice({ tone: "good", message: t("notices.conceptGenerated") });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.conceptFailed") });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  const [savingIdentity, setSavingIdentity] = useState(false);

  const handleSaveIdentity = async () => {
    if (!editingMascot) return;
    if (!genName.trim()) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    setSavingIdentity(true);
    try {
      const updated = await api.updateMascot(editingMascot.id, {
        name: genName.trim(),
        description: genDescription.trim(),
        visual_style: genStyle,
        master_prompt: genPrompt.trim(),
        color_theme: genColor,
      });
      setEditingMascot(updated.mascot);
      onNotice({ tone: "good", message: t("notices.mascotSaved", { name: updated.mascot.name }) });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to save mascot details" });
    } finally {
      setSavingIdentity(false);
    }
  };

  return {
    genName,
    setGenName,
    genDescription,
    setGenDescription,
    genStyle,
    setGenStyle,
    genStyleOption: STYLE_OPTIONS.find((s) => s.id === genStyle),
    genColor,
    setGenColor,
    genPrompt,
    setGenPrompt,
    showNotesAccordion,
    setShowNotesAccordion,
    promptCopied,
    lightboxImage,
    setLightboxImage,
    isPromptModalOpen,
    setIsPromptModalOpen,
    savingIdentity,
    handleInjectTag,
    handleApplyTemplate,
    handleCopyPrompt,
    handleGenerateConcept,
    handleSaveIdentity,
  };
}
