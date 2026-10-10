import { useCallback, useEffect, useState } from "react";
import {
  clampQuestionCount,
  resolveQuestionCountInput,
  sanitizeQuestionCountInput,
} from "../utils/questionCountInput";

type UseQuestionCountInputOptions = {
  committedCount: number;
  onCommit: (count: number) => void;
};

export function useQuestionCountInput({ committedCount, onCommit }: UseQuestionCountInputOptions) {
  const [inputValue, setInputValue] = useState<string>(String(committedCount));

  useEffect(() => {
    setInputValue(String(committedCount));
  }, [committedCount]);

  const commitCount = useCallback(
    (count: number) => {
      const next = clampQuestionCount(count);
      setInputValue(String(next));
      if (next !== committedCount) {
        onCommit(next);
      }
    },
    [committedCount, onCommit],
  );

  const commitInput = useCallback(() => {
    commitCount(resolveQuestionCountInput(inputValue, committedCount));
  }, [commitCount, inputValue, committedCount]);

  const changeInput = useCallback((raw: string) => {
    setInputValue(sanitizeQuestionCountInput(raw));
  }, []);

  const revertInput = useCallback(() => {
    setInputValue(String(committedCount));
  }, [committedCount]);

  const step = useCallback(
    (delta: number) => {
      commitCount(resolveQuestionCountInput(inputValue, committedCount) + delta);
    },
    [commitCount, inputValue, committedCount],
  );

  return { inputValue, changeInput, commitInput, commitCount, revertInput, step };
}
