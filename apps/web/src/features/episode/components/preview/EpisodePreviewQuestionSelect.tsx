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
      <select
        value={selectedQuestionId}
        onChange={(event) => onSelectQuestion(event.target.value)}
        disabled={questions.length <= 1}
      >
        {questions.map((question) => {
          const layout = getQuizLayoutUiDefinition(question.layoutId);
          const optionLabel =
            question.layoutSource === "topic_template"
              ? t("episodeCustomization.previewTopicTemplateOption", { layout: t(layout.labelKey) })
              : t("episodeCustomization.previewQuestionOption", { number: question.number, layout: t(layout.labelKey) });
          return (
            <option key={question.id} value={question.id}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}
