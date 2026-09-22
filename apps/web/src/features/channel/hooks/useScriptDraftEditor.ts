import { useEffect, useRef, useState } from "react";
import type { IntroOutroClipKind, IntroOutroScriptContent, IntroOutroScriptProject, IntroOutroValidationIssue } from "@studio/shared";

type Props = {
  project: IntroOutroScriptProject;
  kind: IntroOutroClipKind;
  onSave: (kind: IntroOutroClipKind, content: IntroOutroScriptContent) => Promise<void>;
  onValidate: (kind: IntroOutroClipKind) => Promise<IntroOutroValidationIssue[]>;
  onPendingChange?: (pending: boolean) => void;
};

type SaveStatus = "saved" | "saving" | "failed";

export function useScriptDraftEditor({ project, kind, onSave, onValidate, onPendingChange }: Props) {
  const serverDraft = project.drafts[kind];
  const [content, setContent] = useState(serverDraft.content);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [issues, setIssues] = useState<IntroOutroValidationIssue[]>(serverDraft.validation_issues);
  const [validating, setValidating] = useState(false);
  const [validationRan, setValidationRan] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const editVersion = useRef(0);
  const manualSave = useRef(false);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  const dirty = Boolean(content && JSON.stringify(content) !== JSON.stringify(serverDraft.content));
  const pending = dirty || saveStatus !== "saved";

  useEffect(() => {
    editVersion.current += 1;
    setContent(serverDraft.content);
    setIssues(serverDraft.validation_issues);
    setValidationRan(false);
    setValidationError(null);
    setSaveStatus("saved");
  }, [kind, project.project_id, serverDraft.source_revision_id]);

  useEffect(() => {
    onPendingChange?.(pending || validating);
  }, [pending, validating, onPendingChange]);

  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);

  useEffect(() => {
    if (!content || !dirty || saveStatus === "failed" || manualSave.current) return;
    const version = editVersion.current;
    const timer = window.setTimeout(() => {
      void saveRef
        .current(kind, content)
        .then(() => {
          if (version === editVersion.current) setSaveStatus("saved");
        })
        .catch(() => {
          if (version === editVersion.current) setSaveStatus("failed");
        });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [content, kind, serverDraft.content, dirty, saveStatus === "failed"]);

  const updateContent = (next: IntroOutroScriptContent) => {
    manualSave.current = false;
    editVersion.current += 1;
    setContent(next);
    setSaveStatus("saving");
    setValidationRan(false);
    setValidationError(null);
  };

  const retrySave = async () => {
    if (!content) return;
    const version = editVersion.current;
    manualSave.current = true;
    setSaveStatus("saving");
    try {
      await saveRef.current(kind, content);
      if (version === editVersion.current) setSaveStatus("saved");
    } catch {
      if (version === editVersion.current) setSaveStatus("failed");
    } finally {
      manualSave.current = false;
    }
  };

  const validate = async () => {
    setValidating(true);
    setValidationError(null);
    try {
      setIssues(await onValidate(kind));
      setValidationRan(true);
    } catch (cause) {
      setValidationError(cause instanceof Error ? cause.message : "Validation failed. Try again.");
    } finally {
      setValidating(false);
    }
  };

  return { content, saveStatus, issues, validating, validationRan, validationError, pending, updateContent, retrySave, validate };
}
