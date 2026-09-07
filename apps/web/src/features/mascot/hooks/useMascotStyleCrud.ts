import { useState, useMemo, useEffect, useCallback } from "react";
import {
  type MascotProfile,
  type MascotStyle,
  type UpdateMascotStyleInput,
  getMascotStyleReadiness,
  resolveMascotStyle,
} from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseMascotStyleCrudProps = {
  mascot: MascotProfile | null;
  onMascotUpdated: (mascot: MascotProfile) => void;
  onNotice: (notice: Notice) => void;
};

export type UseMascotStyleCrudResult = {
  activeStyleId: string;
  setActiveStyleId: React.Dispatch<React.SetStateAction<string>>;
  activeStyle: MascotStyle | null;
  activeStyleReadiness: ReturnType<typeof getMascotStyleReadiness>;
  generatingConceptStyleId: string | null;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newStyleName: string;
  setNewStyleName: React.Dispatch<React.SetStateAction<string>>;
  newStyleKeyword: string;
  setNewStyleKeyword: React.Dispatch<React.SetStateAction<string>>;
  handleCreateStyle: (name?: string, keyword?: string) => Promise<void>;
  handleUpdateStyleKeyword: (styleId: string, keyword: string) => Promise<void>;
  handleUpdateStyle: (styleId: string, input: UpdateMascotStyleInput) => Promise<void>;
  handleUpdateStyleAnchor: (styleId: string, anchorImageUrl: string | null) => Promise<void>;
  handleGenerateStyleConcept: (styleId: string, prompt?: string) => Promise<void>;
  handleDeleteStyle: (styleId: string) => Promise<void>;
  handleSetActiveStyle: (styleId: string) => Promise<void>;
};

export function useMascotStyleCrud({
  mascot,
  onMascotUpdated,
  onNotice,
}: UseMascotStyleCrudProps): UseMascotStyleCrudResult {
  const [activeStyleId, setActiveStyleId] = useState<string>(
    () => mascot?.active_style_id || "core",
  );
  const [generatingConceptStyleId, setGeneratingConceptStyleId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newStyleName, setNewStyleName] = useState<string>("");
  const [newStyleKeyword, setNewStyleKeyword] = useState<string>("");

  useEffect(() => {
    if (mascot?.active_style_id && activeStyleId === "core") {
      setActiveStyleId(mascot.active_style_id);
    }
  }, [mascot?.active_style_id]);

  const activeStyle = useMemo<MascotStyle | null>(() => {
    if (!mascot) return null;
    return resolveMascotStyle(mascot, activeStyleId);
  }, [mascot, activeStyleId]);

  const activeStyleReadiness = useMemo(
    () => getMascotStyleReadiness(activeStyle),
    [activeStyle],
  );

  const handleCreateStyle = useCallback(
    async (name?: string, keyword?: string) => {
      const finalName = (name ?? newStyleName).trim();
      const finalKeyword = (keyword ?? newStyleKeyword).trim();
      if (!mascot) return;
      if (!finalName) {
        onNotice({ tone: "bad", message: "Style name is required" });
        return;
      }
      try {
        const result = await api.createMascotStyle(mascot.id, {
          name: finalName,
          keyword: finalKeyword,
        });
        onMascotUpdated(result.mascot);
        setActiveStyleId(result.style.id);
        setIsCreateModalOpen(false);
        setNewStyleName("");
        setNewStyleKeyword("");
        onNotice({
          tone: "good",
          message: `Style "${result.style.name}" created successfully`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to create mascot style",
        });
      }
    },
    [mascot, newStyleName, newStyleKeyword, onMascotUpdated, onNotice],
  );

  const handleUpdateStyleKeyword = useCallback(
    async (styleId: string, keyword: string) => {
      if (!mascot) return;
      try {
        const result = await api.updateMascotStyle(mascot.id, styleId, { keyword });
        onMascotUpdated(result.mascot);
        onNotice({
          tone: "good",
          message: "Style keyword updated successfully",
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to update style keyword",
        });
      }
    },
    [mascot, onMascotUpdated, onNotice],
  );

  const handleUpdateStyle = useCallback(
    async (styleId: string, input: UpdateMascotStyleInput) => {
      if (!mascot) return;
      try {
        const result = await api.updateMascotStyle(mascot.id, styleId, input);
        onMascotUpdated(result.mascot);
        onNotice({
          tone: "good",
          message: "Style updated successfully",
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to update style",
        });
      }
    },
    [mascot, onMascotUpdated, onNotice],
  );

  const handleUpdateStyleAnchor = useCallback(
    async (styleId: string, anchorImageUrl: string | null) => {
      if (!mascot) return;
      try {
        const result = await api.updateMascotStyle(mascot.id, styleId, {
          anchor_image_url: anchorImageUrl,
        });
        onMascotUpdated(result.mascot);
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to update style anchor",
        });
      }
    },
    [mascot, onMascotUpdated, onNotice],
  );

  const handleGenerateStyleConcept = useCallback(
    async (styleId: string, prompt?: string) => {
      if (!mascot) return;
      setGeneratingConceptStyleId(styleId);
      try {
        const result = await api.generateStyleConcept(mascot.id, styleId, { prompt });
        onMascotUpdated(result.mascot);
        onNotice({
          tone: "good",
          message: `Concept for style "${result.style.name}" generated successfully`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to generate style concept",
        });
      } finally {
        setGeneratingConceptStyleId(null);
      }
    },
    [mascot, onMascotUpdated, onNotice],
  );

  const handleDeleteStyle = useCallback(
    async (styleId: string) => {
      if (!mascot) return;
      try {
        const result = await api.deleteMascotStyle(mascot.id, styleId);
        onMascotUpdated(result.mascot);
        if (activeStyleId === styleId) {
          setActiveStyleId("core");
        }
        onNotice({
          tone: "good",
          message: "Style deleted successfully",
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to delete mascot style",
        });
      }
    },
    [mascot, activeStyleId, onMascotUpdated, onNotice],
  );

  const handleSetActiveStyle = useCallback(
    async (styleId: string) => {
      if (!mascot) return;
      try {
        const result = await api.setActiveMascotStyle(mascot.id, styleId);
        onMascotUpdated(result.mascot);
        setActiveStyleId(styleId);
        onNotice({
          tone: "good",
          message: "Active style updated successfully",
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to set active style",
        });
      }
    },
    [mascot, onMascotUpdated, onNotice],
  );

  return {
    activeStyleId,
    setActiveStyleId,
    activeStyle,
    activeStyleReadiness,
    generatingConceptStyleId,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newStyleName,
    setNewStyleName,
    newStyleKeyword,
    setNewStyleKeyword,
    handleCreateStyle,
    handleUpdateStyleKeyword,
    handleUpdateStyle,
    handleUpdateStyleAnchor,
    handleGenerateStyleConcept,
    handleDeleteStyle,
    handleSetActiveStyle,
  };
}
