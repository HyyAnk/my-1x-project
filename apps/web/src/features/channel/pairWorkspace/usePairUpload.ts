import { useEffect, useRef, useState } from "react";
import type { IntroOutroClipKind } from "@studio/shared";
import { introOutroApi, type CreateIntroOutroStylePayload } from "../../../api/introOutroApi";
import type { VideoFileInfo } from "../components/introOutro/types";
import type { usePairDraft } from "./usePairDraft";
import { inspectPairVideo } from "./inspectPairVideo";

export function usePairUpload(
  channelId: string,
  category: string,
  draft: ReturnType<typeof usePairDraft>,
  onUploaded: () => Promise<void>,
) {
  const [files, setFiles] = useState<Record<IntroOutroClipKind, VideoFileInfo | null>>({ intro: null, outro: null });
  const [mute, setMute] = useState({ intro: false, outro: false });
  const [probing, setProbing] = useState({ intro: false, outro: false });
  const [errors, setErrors] = useState({ intro: "", outro: "" });
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [inputVersion, setInputVersion] = useState(0);
  const controllers = useRef<Partial<Record<IntroOutroClipKind, AbortController>>>({});
  const alive = useRef(true),
    lock = useRef(false);
  const requestRef = useRef<CreateIntroOutroStylePayload | null>(null);
  const select = async (kind: IntroOutroClipKind, file: File | null) => {
    controllers.current[kind]?.abort();
    requestRef.current = null;
    setUploaded(false);
    setError(null);
    setFiles((current) => ({ ...current, [kind]: null }));
    setErrors((current) => ({ ...current, [kind]: "" }));
    setProbing((current) => ({ ...current, [kind]: Boolean(file) }));
    if (!file) return;
    const controller = new AbortController();
    controllers.current[kind] = controller;
    try {
      const result = await inspectPairVideo(file, controller.signal);
      if (alive.current && !controller.signal.aborted) setFiles((current) => ({ ...current, [kind]: result }));
    } catch (cause) {
      if (alive.current && !controller.signal.aborted)
        setErrors((current) => ({ ...current, [kind]: cause instanceof Error ? cause.message : "Video inspection failed" }));
    } finally {
      if (alive.current && !controller.signal.aborted) setProbing((current) => ({ ...current, [kind]: false }));
    }
  };
  const submit = async () => {
    if (lock.current || !files.intro || !files.outro) return;
    lock.current = true;
    setUploading(true);
    setError(null);
    try {
      if (!uploaded) {
        if (!requestRef.current) {
          const project = await draft.flush();
          requestRef.current = {
            auto_name: true,
            style_id: `pair_${crypto.randomUUID()}`,
            style_preset_id: category,
            intro_data: files.intro.dataUrl,
            outro_data: files.outro.dataUrl,
            intro_filename: files.intro.file.name,
            outro_filename: files.outro.file.name,
            intro_mute_audio: mute.intro,
            outro_mute_audio: mute.outro,
            intro_script_text: project.drafts.intro.prompt_text ?? "",
            outro_script_text: project.drafts.outro.prompt_text ?? "",
            script_project_id: project.project_id,
            script_project_version: project.version,
          };
        }
        await introOutroApi.createIntroOutroStyle(channelId, requestRef.current);
        if (alive.current) setUploaded(true);
      }
      await onUploaded();
      if (alive.current) {
        if (!(await draft.open())) throw new Error("Pair uploaded. Retry to open a fresh draft.");
        setFiles({ intro: null, outro: null });
        setMute({ intro: false, outro: false });
        setInputVersion((value) => value + 1);
        requestRef.current = null;
        setUploaded(false);
      }
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && typeof cause.status === "number" && cause.status < 500)
        requestRef.current = null;
      if (alive.current) setError(cause instanceof Error ? cause.message : "Upload failed. Retry with the selected files.");
    } finally {
      lock.current = false;
      if (alive.current) setUploading(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    const active = controllers.current;
    return () => {
      alive.current = false;
      active.intro?.abort();
      active.outro?.abort();
    };
  }, []);
  return {
    files,
    mute,
    probing,
    errors,
    error,
    uploading,
    uploaded,
    inputVersion,
    select,
    submit,
    setMuted: (kind: IntroOutroClipKind, value: boolean) => {
      requestRef.current = null;
      setMute((current) => ({ ...current, [kind]: value }));
    },
  };
}
