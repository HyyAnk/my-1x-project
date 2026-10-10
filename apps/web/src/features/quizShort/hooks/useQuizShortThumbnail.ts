import { useCallback, useEffect, useMemo, useState } from "react";
import type { QuizShort, QuizShortCoverGenerateInput, QuizShortCoverManifest, Task } from "@studio/shared";
import { quizShortApi } from "../../../api/quizShortApi";
import type { Notice } from "../../../components/types";
import { isTaskActive, latestTask } from "../../../lib/utils";

export type UseQuizShortThumbnailProps = {
  channelId: string;
  quizShortId: string;
  quizShort: QuizShort | null;
  tasks: Task[];
  onNotice: (notice: NonNullable<Notice>) => void;
  load: () => Promise<void>;
};

/** Quiz Shorts render a single 9:16 cover, so this hook tracks one cover manifest and one image URL. */
export function useQuizShortThumbnail({ channelId, quizShortId, quizShort, tasks, onNotice, load }: UseQuizShortThumbnailProps) {
  const [manifest, setManifest] = useState<QuizShortCoverManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [hookText, setHookText] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);

  const thumbnailTask = useMemo(() => latestTask(tasks, ["GENERATE_THUMBNAIL"]), [tasks]);
  const generating = requesting || Boolean(thumbnailTask && isTaskActive(thumbnailTask));

  const fetchManifest = useCallback(async () => {
    setLoading(true);
    try {
      setManifest((await quizShortApi.getQuizShortThumbnail(channelId, quizShortId)).manifest);
    } catch {
      setManifest(null);
    } finally {
      setLoading(false);
    }
  }, [channelId, quizShortId]);

  useEffect(() => {
    void fetchManifest();
  }, [fetchManifest, quizShort?.thumbnail_asset_path_9_16, quizShort?.updated_at]);

  const generate = async () => {
    if (generating) return;
    setRequesting(true);
    try {
      const body: QuizShortCoverGenerateInput = { question_index: questionIndex };
      if (hookText.trim()) body.hook_text = hookText.trim();
      const response = await quizShortApi.generateQuizShortThumbnail(channelId, quizShortId, body);
      setManifest(response.manifest);
      onNotice({ tone: "good", message: "Quiz Short cover generated" });
      await load();
    } catch (reason) {
      onNotice({ tone: "bad", message: reason instanceof Error ? reason.message : "Could not generate the cover" });
    } finally {
      setRequesting(false);
    }
  };

  const hasThumbnail = Boolean(manifest?.asset_path || quizShort?.thumbnail_asset_path_9_16);
  const imageUrl = hasThumbnail
    ? quizShortApi.quizShortThumbnailFileUrl(channelId, quizShortId, manifest?.generated_at ?? quizShort?.updated_at)
    : null;

  return {
    manifest,
    loading,
    generating,
    hasThumbnail,
    imageUrl,
    generate,
    thumbnailTask,
    hookText,
    setHookText,
    questionIndex,
    setQuestionIndex,
  };
}
