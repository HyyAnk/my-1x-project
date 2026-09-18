import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import { buildHash } from "../../../hooks/useRouter";
import type { useMascotGenerator } from "./useMascotGenerator";
import type { useMascotLibrary } from "./useMascotLibrary";

export interface UseMascotStudioRoutingParams {
  mascotId?: string | null;
  step?: number | null;
  openMascot?: (mascotId?: string | null, step?: number | null) => void;
  setQueryParam?: (key: string, value: string | null, replace?: boolean) => void;
  currentTab: string;
  switchTab: (tab: "library" | "generator") => void;
  generatorState: ReturnType<typeof useMascotGenerator>;
  libraryState: ReturnType<typeof useMascotLibrary>;
  onNotice: (notice: NonNullable<Notice>) => void;
}

export function useMascotStudioRouting({
  mascotId,
  step,
  openMascot,
  setQueryParam,
  currentTab,
  switchTab,
  generatorState,
  libraryState,
  onNotice,
}: UseMascotStudioRoutingParams) {
  const { t } = useTranslation();
  const isHydratingRef = useRef(false);
  const hydratedMascotIdRef = useRef<string | null>(null);
  const lastSyncedRouteStepRef = useRef<number | null>(null);

  // Sync mascot from route (mascotId) into generatorState on initial load / refresh
  useEffect(() => {
    if (!mascotId) {
      hydratedMascotIdRef.current = null;
      lastSyncedRouteStepRef.current = null;
      return;
    }

    if (mascotId === "new") {
      if (hydratedMascotIdRef.current !== "new") {
        hydratedMascotIdRef.current = "new";
        if (generatorState.editingMascot !== null) {
          generatorState.handleStartNew();
        }
      }
      if (step && step >= 1 && step <= 4 && step !== lastSyncedRouteStepRef.current) {
        lastSyncedRouteStepRef.current = step;
        generatorState.setGeneratorStep(step as 1 | 2 | 3 | 4);
      }
      return;
    }

    // Already editing this mascot
    if (generatorState.editingMascot?.id === mascotId) {
      hydratedMascotIdRef.current = mascotId;
      if (step && step >= 1 && step <= 4 && step !== lastSyncedRouteStepRef.current) {
        lastSyncedRouteStepRef.current = step;
        generatorState.setGeneratorStep(step as 1 | 2 | 3 | 4);
      }
      return;
    }

    // If this mascot ID has already been hydrated, only sync step if route step changed
    if (hydratedMascotIdRef.current === mascotId) {
      if (step && step >= 1 && step <= 4 && step !== lastSyncedRouteStepRef.current) {
        lastSyncedRouteStepRef.current = step;
        generatorState.setGeneratorStep(step as 1 | 2 | 3 | 4);
      }
      return;
    }

    // Try finding in library mascots
    const found = libraryState.mascots.find((m) => m.id === mascotId);
    if (found) {
      hydratedMascotIdRef.current = mascotId;
      generatorState.handleEditMascot(found);
      const targetStep = step && step >= 1 && step <= 4 ? (step as 1 | 2 | 3 | 4) : 1;
      lastSyncedRouteStepRef.current = targetStep;
      if (step && step >= 1 && step <= 4) {
        generatorState.setGeneratorStep(step as 1 | 2 | 3 | 4);
      }
      return;
    }

    // If library mascots are still loading, wait
    if (libraryState.loading) return;

    // Direct fetch from API if not found in cache
    if (!isHydratingRef.current) {
      isHydratingRef.current = true;
      api
        .mascot(mascotId)
        .then((res) => {
          if (res?.mascot) {
            hydratedMascotIdRef.current = mascotId;
            generatorState.handleEditMascot(res.mascot);
            const targetStep = step && step >= 1 && step <= 4 ? (step as 1 | 2 | 3 | 4) : 1;
            lastSyncedRouteStepRef.current = targetStep;
            if (step && step >= 1 && step <= 4) {
              generatorState.setGeneratorStep(step as 1 | 2 | 3 | 4);
            }
          } else {
            onNotice({ tone: "bad", message: t("mascots.noMascotsTitle") });
            switchTab("library");
            if (openMascot) openMascot(null);
          }
        })
        .catch((err) => {
          onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Mascot not found" });
          switchTab("library");
          if (openMascot) openMascot(null);
        })
        .finally(() => {
          isHydratingRef.current = false;
        });
    }
  }, [
    mascotId,
    step,
    libraryState.mascots,
    libraryState.loading,
    generatorState.editingMascot?.id,
    generatorState.handleEditMascot,
    generatorState.handleStartNew,
    generatorState.setGeneratorStep,
    onNotice,
    openMascot,
    switchTab,
    t,
  ]);

  // Sync step change from generatorState back to URL query parameter once mascot is hydrated
  useEffect(() => {
    if (currentTab === "generator" && mascotId && hydratedMascotIdRef.current === mascotId) {
      const targetStep = generatorState.generatorStep;
      if (step !== targetStep) {
        lastSyncedRouteStepRef.current = targetStep;
        setQueryParam?.("step", String(targetStep), true);
      }
    }
  }, [currentTab, mascotId, generatorState.generatorStep, step, setQueryParam]);

  // If newly created mascot gets an ID while in generator, sync ID to URL
  useEffect(() => {
    if (currentTab === "generator" && mascotId === "new" && generatorState.editingMascot?.id) {
      if (openMascot) {
        openMascot(generatorState.editingMascot.id, generatorState.generatorStep);
      }
    }
  }, [currentTab, generatorState.editingMascot?.id, generatorState.generatorStep, mascotId, openMascot]);

  const handleStartNew = useCallback(() => {
    generatorState.handleStartNew();
    if (openMascot) {
      openMascot("new", 1);
    } else {
      switchTab("generator");
    }
  }, [generatorState.handleStartNew, openMascot, switchTab]);

  const handleEditMascot = useCallback(
    (mascot: MascotProfile) => {
      generatorState.handleEditMascot(mascot);
      if (openMascot) {
        openMascot(mascot.id, 1);
      } else {
        switchTab("generator");
      }
    },
    [generatorState.handleEditMascot, openMascot, switchTab],
  );

  const handleBackToLibrary = useCallback(() => {
    switchTab("library");
    if (openMascot) {
      openMascot(null);
    }
    void libraryState.loadMascots();
  }, [libraryState.loadMascots, openMascot, switchTab]);

  const handleSelectGeneratorTab = useCallback(() => {
    if (generatorState.editingMascot) {
      if (openMascot) {
        openMascot(generatorState.editingMascot.id, generatorState.generatorStep);
      } else {
        switchTab("generator");
      }
    } else {
      handleStartNew();
    }
  }, [generatorState.editingMascot, generatorState.generatorStep, handleStartNew, openMascot, switchTab]);

  const libraryUrl = useMemo(() => buildHash({ page: "mascots" }), []);

  const generatorUrl = useMemo(
    () =>
      generatorState.editingMascot
        ? buildHash({
            page: "mascots",
            mascotId: generatorState.editingMascot.id,
            step: generatorState.generatorStep,
          })
        : buildHash({ page: "mascots", mascotId: "new", step: 1 }),
    [generatorState.editingMascot, generatorState.generatorStep],
  );

  return {
    isHydratingRef,
    libraryUrl,
    generatorUrl,
    handleStartNew,
    handleEditMascot,
    handleBackToLibrary,
    handleSelectGeneratorTab,
  };
}

export type UseMascotStudioRoutingReturn = ReturnType<typeof useMascotStudioRouting>;
