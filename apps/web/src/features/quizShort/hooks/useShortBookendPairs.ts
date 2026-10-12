import { useEffect, useState } from "react";
import type { QuizShortBookendPair } from "@studio/shared";
import { quizShortBookendApi } from "../../../api/quizShortBookendApi";

/** The channel's Short Intro & Outro pairs for the Quiz Short bookend selector; empty when loading fails. */
export function useShortBookendPairs(channelId: string): QuizShortBookendPair[] {
  const [pairs, setPairs] = useState<QuizShortBookendPair[]>([]);
  useEffect(() => {
    let active = true;
    quizShortBookendApi
      .listPairs(channelId)
      .then((response) => {
        if (active) setPairs(response.pairs);
      })
      .catch(() => {
        if (active) setPairs([]);
      });
    return () => {
      active = false;
    };
  }, [channelId]);
  return pairs;
}
