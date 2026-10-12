import { useEffect, useRef, useState } from "react";
import { QUIZ_SHORT_BOOKEND_HEIGHT, QUIZ_SHORT_BOOKEND_WIDTH, type QuizShortBookendKind } from "@studio/shared";
import { quizShortBookendApi, type CreateQuizShortBookendPairPayload } from "../../../api/quizShortBookendApi";
import type { VideoFileInfo } from "../../channel/components/introOutro/types";
import { inspectPairVideo } from "../../channel/pairWorkspace/inspectPairVideo";

const PORTRAIT_FRAME = { width: QUIZ_SHORT_BOOKEND_WIDTH, height: QUIZ_SHORT_BOOKEND_HEIGHT };
type PerKind<T> = Record<QuizShortBookendKind, T>;

function isClientError(cause: unknown): boolean {
  return Boolean(cause && typeof cause === "object" && "status" in cause && typeof cause.status === "number" && cause.status < 500);
}

/** Selects, inspects and uploads one portrait intro/outro pair into a built-in style category. */
export function useShortBookendUpload(channelId: string, stylePresetId: string, onUploaded: () => Promise<void>) {
  const [files, setFiles] = useState<PerKind<VideoFileInfo | null>>({ intro: null, outro: null });
  const [probing, setProbing] = useState<PerKind<boolean>>({ intro: false, outro: false });
  const [errors, setErrors] = useState<PerKind<string>>({ intro: "", outro: "" });
  const [keepOutroAudio, setKeepOutroAudioState] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputVersion, setInputVersion] = useState(0);
  const controllers = useRef<Partial<PerKind<AbortController>>>({});
  const pendingRequest = useRef<CreateQuizShortBookendPairPayload | null>(null);
  const alive = useRef(true);

  const select = async (kind: QuizShortBookendKind, file: File | null) => {
    controllers.current[kind]?.abort();
    pendingRequest.current = null;
    setError(null);
    setFiles((current) => ({ ...current, [kind]: null }));
    setErrors((current) => ({ ...current, [kind]: "" }));
    setProbing((current) => ({ ...current, [kind]: Boolean(file) }));
    if (!file) return;
    const controller = new AbortController();
    controllers.current[kind] = controller;
    try {
      const info = await inspectPairVideo(file, controller.signal, PORTRAIT_FRAME);
      if (alive.current && !controller.signal.aborted) setFiles((current) => ({ ...current, [kind]: info }));
    } catch (cause) {
      if (alive.current && !controller.signal.aborted)
        setErrors((current) => ({ ...current, [kind]: cause instanceof Error ? cause.message : "Video inspection failed" }));
    } finally {
      if (alive.current && !controller.signal.aborted) setProbing((current) => ({ ...current, [kind]: false }));
    }
  };

  const reset = () => {
    setFiles({ intro: null, outro: null });
    setKeepOutroAudioState(false);
    setInputVersion((value) => value + 1);
    pendingRequest.current = null;
  };

  const submit = async () => {
    if (uploading || !files.intro || !files.outro) return;
    setUploading(true);
    setError(null);
    // A retry resends the same request id, so a pair stored before a network error is not duplicated.
    pendingRequest.current ??= {
      pair_id: `spair_${crypto.randomUUID()}`,
      style_preset_id: stylePresetId,
      intro_data: files.intro.dataUrl,
      outro_data: files.outro.dataUrl,
      outro_keep_audio: keepOutroAudio,
    };
    try {
      await quizShortBookendApi.createPair(channelId, pendingRequest.current);
      await onUploaded();
      if (alive.current) reset();
    } catch (cause) {
      if (isClientError(cause)) pendingRequest.current = null;
      if (alive.current) setError(cause instanceof Error ? cause.message : "Upload failed. Retry with the selected files.");
    } finally {
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

  const setKeepOutroAudio = (value: boolean) => {
    pendingRequest.current = null;
    setKeepOutroAudioState(value);
  };

  return {
    files,
    probing,
    errors,
    error,
    uploading,
    inputVersion,
    keepOutroAudio,
    canSubmit: Boolean(files.intro && files.outro) && !probing.intro && !probing.outro && !uploading,
    select,
    submit,
    setKeepOutroAudio,
  };
}
