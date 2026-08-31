import { useCallback, useState } from "react";
import type { AntigravitySettingsResponse, AppConfig, CodexSettingsResponse } from "@studio/shared";
import { api } from "../api";

export function useEngineState(
  showGood: (msg: string) => void,
  showError: (err: unknown) => void,
  setCodexStatus: (status: "connected" | "connecting" | "unavailable" | "disconnected") => void,
  setAppConfig: React.Dispatch<React.SetStateAction<AppConfig | null>>,
) {
  const [activeEngine, setActiveEngine] = useState<"codex" | "antigravity">("codex");
  const [currentModel, setCurrentModel] = useState<string>("");
  const [currentImageModel, setCurrentImageModel] = useState<string>("gpt-image-2");
  const [models, setModels] = useState<Array<{ id: string; label: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [codex, setCodex] = useState<CodexSettingsResponse | null>(null);
  const [antigravity, setAntigravity] = useState<AntigravitySettingsResponse | null>(null);
  const [antigravityStatus, setAntigravityStatus] = useState("ready");

  const loadModelsForEngine = useCallback(async (engine: "codex" | "antigravity") => {
    setLoadingModels(true);
    setModelsError(null);
    try {
      if (engine === "antigravity") {
        const res = await api.antigravityModels();
        setModels(res.models);
      } else {
        const res = await api.codexModels();
        setModels(res.models);
      }
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : "Failed to load models");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const saveCodex = async (input: Parameters<typeof api.saveCodexSettings>[0]) => {
    const next = await api.saveCodexSettings(input);
    setCodex(next);
    if (input.transport && input.transport !== codex?.settings.transport) setCodexStatus("disconnected");
    return next;
  };

  const handleEngineToggle = async (targetEngine: "codex" | "antigravity") => {
    if (targetEngine === activeEngine) return;
    try {
      const res = await api.setEngine(targetEngine);
      setActiveEngine(res.active_engine);
      setCurrentModel(res.model);
      showGood(`Switched engine to ${targetEngine === "antigravity" ? "Google Antigravity" : "OpenAI Codex"}`);
      await loadModelsForEngine(targetEngine);
    } catch (error) {
      showError(error);
    }
  };

  const handleModelChange = async (model: string) => {
    try {
      if (activeEngine === "antigravity") {
        const next = await api.saveAntigravitySettings({ model });
        setAntigravity(next);
        setCurrentModel(model);
      } else {
        const next = await saveCodex({ model });
        setCodex(next);
        setCurrentModel(model);
      }
      showGood(model ? `Model: ${model}` : `Using ${activeEngine === "antigravity" ? "Antigravity" : "Codex"} default model`);
    } catch (error) {
      showError(error);
    }
  };

  const handleImageModelChange = async (model: string) => {
    try {
      const next = await api.saveImageSettings({ model });
      setCurrentImageModel(model);
      setAppConfig((current) => (current ? { ...current, image_generation: next.image_generation } : current));
      showGood(`Image Model: ${model}`);
    } catch (error) {
      showError(error);
    }
  };

  return {
    activeEngine,
    setActiveEngine,
    currentModel,
    setCurrentModel,
    currentImageModel,
    setCurrentImageModel,
    models,
    setModels,
    loadingModels,
    modelsError,
    codex,
    setCodex,
    antigravity,
    setAntigravity,
    antigravityStatus,
    setAntigravityStatus,
    loadModelsForEngine,
    saveCodex,
    handleEngineToggle,
    handleModelChange,
    handleImageModelChange,
  };
}
