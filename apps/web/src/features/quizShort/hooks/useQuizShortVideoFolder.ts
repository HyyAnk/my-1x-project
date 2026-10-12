import { useState } from "react";
import { quizShortApi } from "../../../api/quizShortApi";
import type { Notice } from "../../../components/types";

export type UseQuizShortVideoFolderProps = {
  channelId: string;
  quizShortId: string;
  onNotice: (notice: NonNullable<Notice>) => void;
};

/** Opens the folder holding the rendered Quiz Short video in the OS file manager. */
export function useQuizShortVideoFolder({ channelId, quizShortId, onNotice }: UseQuizShortVideoFolderProps) {
  const [opening, setOpening] = useState(false);

  const openFolder = async () => {
    if (opening) return;
    setOpening(true);
    try {
      await quizShortApi.openQuizShortVideoFolder(channelId, quizShortId);
      onNotice({ tone: "good", message: "Video folder opened" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not open video folder" });
    } finally {
      setOpening(false);
    }
  };

  return { openFolder, opening };
}
