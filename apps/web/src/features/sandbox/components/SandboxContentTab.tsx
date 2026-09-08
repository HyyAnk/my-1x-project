import type { QuizPreviewLayoutId } from "@studio/shared";
import type { PresetSampleQuestion } from "../hooks/useSandboxQuestionState";
import { SandboxQuestionInputs } from "./content/SandboxQuestionInputs";
import { SandboxChoicesEditor } from "./content/SandboxChoicesEditor";
import { SandboxPhaseScrubber } from "./content/SandboxPhaseScrubber";

export interface SandboxContentTabProps {
  sampleQuestions: PresetSampleQuestion[];
  questionText: string;
  setQuestionText: (text: string) => void;
  choices: string[];
  setChoices: (choices: string[]) => void;
  correctChoiceIndex: number;
  setCorrectChoiceIndex: (index: number) => void;
  questionNumber: number;
  setQuestionNumber: (num: number) => void;
  totalQuestions: number;
  setTotalQuestions: (total: number) => void;
  factCardText: string;
  setFactCardText: (text: string) => void;
  phase: string;
  setPhase: (phase: "question" | "choices" | "thinking" | "reveal" | "explain") => void;
  setUseScrubber: (use: boolean) => void;
  handleApplyPresetQuestion: (sq: PresetSampleQuestion) => void;
  layoutId?: QuizPreviewLayoutId;
  onLayoutChange?: (layoutId: QuizPreviewLayoutId) => void;
}

export function SandboxContentTab({
  sampleQuestions,
  questionText,
  setQuestionText,
  choices,
  setChoices,
  correctChoiceIndex,
  setCorrectChoiceIndex,
  questionNumber,
  setQuestionNumber,
  totalQuestions,
  setTotalQuestions,
  factCardText,
  setFactCardText,
  phase,
  setPhase,
  setUseScrubber,
  handleApplyPresetQuestion,
  layoutId,
  onLayoutChange,
}: SandboxContentTabProps) {
  return (
    <>
      <SandboxPhaseScrubber phase={phase} setPhase={setPhase} setUseScrubber={setUseScrubber} />

      <div style={{ height: "1px", background: "var(--line)" }} />

      <SandboxQuestionInputs
        sampleQuestions={sampleQuestions}
        questionText={questionText}
        setQuestionText={setQuestionText}
        questionNumber={questionNumber}
        setQuestionNumber={setQuestionNumber}
        totalQuestions={totalQuestions}
        setTotalQuestions={setTotalQuestions}
        factCardText={factCardText}
        setFactCardText={setFactCardText}
        handleApplyPresetQuestion={handleApplyPresetQuestion}
        phase={phase}
        setPhase={setPhase}
        setUseScrubber={setUseScrubber}
      >
        <SandboxChoicesEditor
          choices={choices}
          setChoices={setChoices}
          correctChoiceIndex={correctChoiceIndex}
          setCorrectChoiceIndex={setCorrectChoiceIndex}
          layoutId={layoutId}
          onLayoutChange={onLayoutChange}
        />
      </SandboxQuestionInputs>
    </>
  );
}
