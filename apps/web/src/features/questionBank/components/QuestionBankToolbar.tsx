import { Funnel, Globe, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { TARGET_LANGUAGE_OPTIONS, type Channel } from "@studio/shared";
import type { BankTaxonomy, QuestionBankFilters } from "../types/questionBankUi.types";
import { useTranslation } from "../../../i18n";

export interface QuestionBankToolbarProps {
  channels?: Channel[];
  taxonomy: BankTaxonomy | null;
  filters: QuestionBankFilters;
  totalQuestions?: number;
  onUpdateFilter: <K extends keyof QuestionBankFilters>(key: K, value: QuestionBankFilters[K]) => void;
  onResetFilters: () => void;
  onOpenCreateModal: () => void;
}

export function QuestionBankToolbar({
  taxonomy,
  filters,
  totalQuestions = 0,
  onUpdateFilter,
  onResetFilters,
  onOpenCreateModal,
}: QuestionBankToolbarProps) {
  const { t } = useTranslation();
  const activeDomain = taxonomy?.domains.find((d) => d.id === filters.domainId);
  const subtopics = activeDomain?.subtopics || [];

  return (
    <div className="qb-toolbar-card">
      {/* Row 1: Dedicated Universal Search Bar + Found Count + Reset Button */}
      <div className="qb-toolbar-search-row">
        <div className="qb-search-wrapper">
          <MagnifyingGlass size={16} className="qb-search-icon" />
          <input
            type="text"
            className="qb-search-input"
            placeholder={t("questionBank.filters.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => onUpdateFilter("search", e.target.value)}
            aria-label="Search questions"
          />
          {filters.search && (
            <button
              type="button"
              className="qb-search-clear"
              onClick={() => onUpdateFilter("search", "")}
              title={t("questionBank.filters.reset")}
              aria-label="Clear search text"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="qb-toolbar-search-actions">
          <span className="qb-count-indicator">
            {t("questionBank.filters.questionsFound", { count: totalQuestions.toLocaleString() })}
          </span>

          <button
            type="button"
            className="qb-btn qb-btn-ghost qb-reset-btn"
            onClick={onResetFilters}
            title={t("questionBank.filters.resetTitle")}
          >
            <Funnel size={14} />
            <span>{t("questionBank.filters.reset")}</span>
          </button>
        </div>
      </div>

      {/* Row 2: 9 Domains + Cascading Subtopic + Compact Language Pill + Add Question CTA */}
      <div className="qb-toolbar-filters-row">
        <div className="qb-filters-row-left">
          {/* Domain Selector */}
          <div className="qb-filter-pill-select">
            <label className="qb-pill-label" htmlFor="qb-domain-select">
              {t("questionBank.filters.domain")}
            </label>
            <select
              id="qb-domain-select"
              className="qb-select"
              value={filters.domainId}
              onChange={(e) => {
                onUpdateFilter("domainId", e.target.value);
                onUpdateFilter("subtopicId", "");
              }}
            >
              <option value="">{t("questionBank.filters.allDomains")}</option>
              {(taxonomy?.domains || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          {/* Cascading Subtopic Selector (conditional) */}
          {subtopics.length > 0 && (
            <div className="qb-filter-pill-select">
              <label className="qb-pill-label" htmlFor="qb-subtopic-select">
                {t("questionBank.filters.subtopic")}
              </label>
              <select
                id="qb-subtopic-select"
                className="qb-select"
                value={filters.subtopicId}
                onChange={(e) => onUpdateFilter("subtopicId", e.target.value)}
              >
                <option value="">{t("questionBank.filters.allSubtopics")}</option>
                {subtopics.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Compact Language Pill */}
          <div className="qb-lang-pill-container" title={t("questionBank.filters.filterByLanguage")}>
            <Globe size={15} className="qb-lang-icon" />
            <select
              id="qb-lang-select"
              className="qb-lang-compact-select"
              value={filters.languageFilter}
              onChange={(e) => onUpdateFilter("languageFilter", e.target.value)}
              aria-label={t("questionBank.filters.filterByLanguage")}
            >
              <option value="">ALL</option>
              {TARGET_LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.code.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="qb-filters-row-right">
          <button
            type="button"
            className="qb-btn qb-btn-primary qb-add-question-btn"
            onClick={onOpenCreateModal}
          >
            <Plus size={15} weight="bold" />
            <span>{t("questionBank.filters.addQuestion")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
