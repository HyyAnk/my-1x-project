import { useCallback, useState } from "react";
import type { BankQuestionWithCooldown, QuestionBankModalState } from "../types/questionBankUi.types";

export function useQuestionBankModals() {
  const [selectedQuestion, setSelectedQuestion] = useState<BankQuestionWithCooldown | null>(null);
  const [modalState, setModalState] = useState<QuestionBankModalState>({ type: null });
  const [previewAspect, setPreviewAspect] = useState<"16:9" | "9:16">("16:9");

  const openCreateModal = useCallback(() => {
    setModalState({ type: "create" });
  }, []);

  const openEditModal = useCallback((question: BankQuestionWithCooldown) => {
    setModalState({ type: "edit", question });
  }, []);

  const openDetailModal = useCallback((question: BankQuestionWithCooldown) => {
    setSelectedQuestion(question);
  }, []);

  const openAiModal = useCallback(() => {
    setModalState({ type: "ai_generate" });
  }, []);

  const openClearModal = useCallback(() => {
    setModalState({ type: "clear_all" });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ type: null });
  }, []);

  return {
    selectedQuestion,
    setSelectedQuestion,
    modalState,
    setModalState,
    previewAspect,
    setPreviewAspect,
    openCreateModal,
    openEditModal,
    openDetailModal,
    openAiModal,
    openClearModal,
    closeModal,
  };
}
