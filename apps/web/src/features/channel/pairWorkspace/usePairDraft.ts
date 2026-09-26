import { useCallback, useEffect, useRef, useState } from "react";
import type { IntroOutroScriptProject, IntroOutroScriptJob, IntroOutroClipKind } from "@studio/shared";
import { pairWorkspaceApi } from "./pairWorkspaceApi";
import { clearDraftBackup, readDraftBackup, writeDraftBackup } from "./draftBackup";
import { emptyPairTexts, projectTexts, type SaveStatus } from "./pairWorkspace.types";

export function usePairDraft(channelId: string, category: string) {
  const [project, setProject] = useState<IntroOutroScriptProject | null>(null);
  const [initialJob, setInitialJob] = useState<IntroOutroScriptJob | null>(null);
  const [texts, setTexts] = useState(emptyPairTexts);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const projectRef = useRef(project);
  const textsRef = useRef(texts);
  const alive = useRef(true);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const requestVersion = useRef(0);
  const conflict = useRef(false);
  const accept = useCallback((value: IntroOutroScriptProject) => {
    projectRef.current = value;
    if (alive.current) setProject(value);
  }, []);

  const open = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const result = await pairWorkspaceApi.open(channelId, category);
      if (!alive.current || version !== requestVersion.current) return;
      accept(result.project);
      setInitialJob(result.job);
      const backup = readDraftBackup(channelId, category);
      const restored = backup?.projectId === result.project.project_id ? backup : null;
      const next = restored?.texts ?? projectTexts(result.project);
      textsRef.current = next;
      setTexts(next);
      conflict.current = Boolean(restored && restored.version !== result.project.version);
      setStatus(restored ? "unsaved" : "saved");
      if (conflict.current) {
        setStatus("failed");
        setError("The draft changed elsewhere. Copy your edits before reloading.");
      }
      return true;
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : "Could not load draft");
      return false;
    } finally {
      if (alive.current && version === requestVersion.current) setLoading(false);
    }
  }, [accept, channelId, category]);

  const flush = useCallback(async () => {
    const operation = queue.current
      .catch(() => undefined)
      .then(async () => {
        const current = projectRef.current;
        if (!current) throw new Error("Draft is not loaded");
        if (conflict.current) throw new Error("Reload the changed draft before saving");
        const snapshot = { ...textsRef.current };
        if (JSON.stringify(snapshot) === JSON.stringify(projectTexts(current))) {
          if (alive.current) setStatus("saved");
          return current;
        }
        if (alive.current) {
          setStatus("saving");
          setError(null);
        }
        try {
          const result = await pairWorkspaceApi.save(channelId, current, snapshot);
          accept(result.project);
          const saved = JSON.stringify(textsRef.current) === JSON.stringify(snapshot);
          try {
            if (saved) clearDraftBackup(channelId, category);
            else writeDraftBackup(channelId, category, result.project.project_id, result.project.version, textsRef.current);
          } catch {
            if (alive.current) setError("Local backup unavailable; server draft is saved.");
          }
          if (alive.current) setStatus(saved ? "saved" : "unsaved");
          return result.project;
        } catch (cause) {
          if (cause && typeof cause === "object" && "code" in cause && cause.code === "VERSION_CONFLICT") conflict.current = true;
          if (alive.current) {
            setStatus("failed");
            setError(cause instanceof Error ? cause.message : "Draft save failed");
          }
          throw cause;
        }
      });
    queue.current = operation;
    return operation;
  }, [accept, category, channelId]);

  const edit = (kind: IntroOutroClipKind, text: string) => {
    const next = { ...textsRef.current, [kind]: text };
    textsRef.current = next;
    setTexts(next);
    setStatus("unsaved");
    if (projectRef.current) {
      try {
        writeDraftBackup(channelId, category, projectRef.current.project_id, projectRef.current.version, next);
      } catch {
        setError("Local backup unavailable. Keep this page open until the draft is saved.");
      }
    }
  };

  const refresh = useCallback(async () => {
    const current = projectRef.current;
    if (!current) return;
    const snapshot = textsRef.current;
    const result = await pairWorkspaceApi.get(channelId, current.project_id);
    if (!alive.current || projectRef.current?.project_id !== current.project_id) return;
    if (result.project.version < projectRef.current.version) return;
    if (snapshot !== textsRef.current) return;
    if (JSON.stringify(snapshot) !== JSON.stringify(projectTexts(current))) {
      conflict.current = true;
      setStatus("failed");
      setError("New results are available. Copy your unsaved edits before reloading.");
      return;
    }
    accept(result.project);
    const next = projectTexts(result.project);
    textsRef.current = next;
    setTexts(next);
    setStatus("saved");
  }, [accept, channelId]);

  useEffect(() => {
    alive.current = true;
    void open();
    return () => {
      alive.current = false;
      requestVersion.current++;
    };
  }, [open]);
  useEffect(() => {
    if (status !== "unsaved" || loading || conflict.current) return;
    const timer = window.setTimeout(() => void flush().catch(() => undefined), 650);
    return () => window.clearTimeout(timer);
  }, [flush, loading, status, texts]);

  const reload = async () => {
    if (!window.confirm("Reload the server draft and discard your unsaved local edits?")) return;
    clearDraftBackup(channelId, category);
    conflict.current = false;
    await open();
  };
  return { project, initialJob, texts, status, error, loading, edit, flush, refresh, open, reload, conflict: conflict.current };
}
