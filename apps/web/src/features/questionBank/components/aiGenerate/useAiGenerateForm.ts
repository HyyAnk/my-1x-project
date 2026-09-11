import { useState } from "react";
import { useTranslation } from "../../../../i18n";
import type {
  BankGameplayArchetypeId,
  BankTaxonomy,
  QuestionBankBatchGenPayload,
  QuestionBankBatchGenResponse,
} from "../../types/questionBankUi.types";

interface UseAiGenerateFormProps {
  taxonomy: BankTaxonomy | null;
  onGenerate: (payload: QuestionBankBatchGenPayload) => Promise<QuestionBankBatchGenResponse>;
  onClose?: () => void;
}

export function useAiGenerateForm({ taxonomy, onGenerate, onClose }: UseAiGenerateFormProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [targetCount, setTargetCount] = useState(20);
  const [archetypeId, setArchetypeId] = useState<BankGameplayArchetypeId | "">("");
  const [domainId, setDomainId] = useState<string>("");
  const [subtopicId, setSubtopicId] = useState<string>("");
  const [subtopicTitle, setSubtopicTitle] = useState<string>("");
  const [difficulty, setDifficulty] = useState(2);
  const [result, setResult] = useState<QuestionBankBatchGenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDomain = taxonomy?.domains.find((d) => d.id === domainId);

  const handleDomainChange = (newDomainId: string) => {
    setDomainId(newDomainId);
    const domain = taxonomy?.domains.find((d) => d.id === newDomainId);
    if (domain && domain.subtopics.length > 0) {
      setSubtopicId(domain.subtopics[0].id);
      setSubtopicTitle(domain.subtopics[0].title);
    } else {
      setSubtopicId("");
      setSubtopicTitle("");
    }
  };

  const handleSubtopicChange = (newSubId: string) => {
    setSubtopicId(newSubId);
    const sub = activeDomain?.subtopics.find((s) => s.id === newSubId);
    setSubtopicTitle(sub ? sub.title : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const safeCount = Math.max(1, Math.min(50000, targetCount || 20));
      const payload: QuestionBankBatchGenPayload = {
        mode,
        count: safeCount,
        target_count: safeCount,
        difficulty,
        persist: true,
        ...(mode === "manual" && archetypeId ? { archetype_id: archetypeId } : {}),
        ...(mode === "manual" && domainId ? { domain_id: domainId } : {}),
        ...(mode === "manual" && subtopicId ? { subtopic_id: subtopicId, subtopic_title: subtopicTitle } : {}),
      };
      const response = await onGenerate(payload);
      if (response.job && onClose) {
        onClose();
        return;
      }
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("questionBank.aiModal.failedDefault"));
    }
  };

  return {
    mode,
    setMode,
    targetCount,
    setTargetCount,
    archetypeId,
    setArchetypeId,
    domainId,
    subtopicId,
    difficulty,
    setDifficulty,
    result,
    setResult,
    error,
    handleDomainChange,
    handleSubtopicChange,
    handleSubmit,
  };
}
