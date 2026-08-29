import type { EpisodePreviewQuestion } from "../../types/episodePreview.types";
import { getQuizLayoutUiDefinition } from "../../../quizLayouts/quizLayoutUiCatalog";
import { useTranslation } from "../../../../i18n";

type EpisodePreviewQuestionSelectProps = {
  questions: EpisodePreviewQuestion[];
  selectedQuestionId: string;
  onSelectQuestion: (questionId: string) => void;
};

export function EpisodePreviewQuestionSelect({ questions, selectedQuestionId, onSelectQuestion }: EpisodePreviewQuestionSelectProps) {
  const { t } = useTranslation();
  if (questions.length === 0) return null;

  return (
    <label className="episode-preview-question-select">
      <span className="sr-only">{t("episodeCustomization.previewQuestionLabel")}</span>
      <select value={selectedQuestionId} onChange={(event) => onSelectQuestion(event.target.value)}>
        {questions.map((question) => {
          const layout = getQuizLayoutUiDefinition(question.layoutId);
          return (
            <option key={question.id} value={question.id}>
              {t("episodeCustomization.previewQuestionOption", { number: question.number, layout: t(layout.labelKey) })}
            </option>
          );
        })}
      </select>
    </label>
  );
}
