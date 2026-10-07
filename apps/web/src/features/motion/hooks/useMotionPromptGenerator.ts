import { useCallback, useState } from "react";
import type { MotionPromptOutput, MotionPromptRequest } from "@studio/shared";
import { api } from "../../../api";

export interface UseMotionPromptGeneratorResult {
  isGenerating: boolean;
  generatedOutput: MotionPromptOutput | null;
  error: string | null;
  generatePrompt: (request: MotionPromptRequest) => Promise<MotionPromptOutput | null>;
  resetGenerator: () => void;
}

export function useMotionPromptGenerator(): UseMotionPromptGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<MotionPromptOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePrompt = useCallback(async (request: MotionPromptRequest): Promise<MotionPromptOutput | null> => {
    setIsGenerating(true);
    setError(null);
    try {
      const output = await api.generateMotionPrompt(request);
      setGeneratedOutput(output);
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate motion prompt";
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const resetGenerator = useCallback(() => {
    setGeneratedOutput(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    isGenerating,
    generatedOutput,
    error,
    generatePrompt,
    resetGenerator,
  };
}
