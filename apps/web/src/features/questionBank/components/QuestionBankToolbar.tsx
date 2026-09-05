import { Funnel, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import type { BankTaxonomy, CooldownFilterOption, QuestionBankFilters, TranslationFilterOption } from "../types/questionBankUi.types";
import { useTranslation } from "../../../i18n";

export interface QuestionBankToolbarProps {
  channels: Channel[];
  taxonomy: BankTaxonomy | null;
  filters: QuestionBankFilters;
  onUpdateFilter: <K extends keyof QuestionBankFilters>(key: K, value: QuestionBankFilters[K]) => void;
  onResetFilters: () => void;
  onOpenCreateModal: () => void;
}

const ARCHETYPE_OPTIONS: Array<{ id: string; defaultLabel: string }> = [
  { id: "verdict_fact_myth", defaultLabel: "Fact vs Myth (Verdict)" },
  { id: "speed_blitz", defaultLabel: "Speed Blitz (Rapid Reflex)" },
  { id: "deep_trivia", defaultLabel: "Deep Trivia (Knowledge)" },
  { id: "versus_faceoff", defaultLabel: "1v1 Faceoff (Versus)" },
  { id: "visual_spotting", defaultLabel: "Visual Spotting (Anomaly)" },
  { id: "visual_identification", defaultLabel: "Visual ID (Identification)" },
  { id: "mystery_reveal", defaultLabel: "Mystery Reveal (Silhouette)" },
  { id: "clue_deduction", defaultLabel: "Clue Deduction (Detective)" },
];

export function QuestionBankToolbar({
  channels,
  taxonomy,
  filters,
  onUpdateFilter,
  onResetFilters,
  onOpenCreateModal,
}: QuestionBankToolbarProps) {
  const { t } = useTranslation();
  const activeDomain = taxonomy?.domains.find((d) => d.id === filters.domainId);
  const subtopics = activeDomain?.subtopics || [];

  return (
    <div className="qb-toolbar-card">
      <div className="qb-toolbar-row">
        {/* Channel Selector for Cooldown context */}
        <div className="qb-filter-group">
          <label className="qb-filter-label" htmlFor="qb-channel-select">
            {t("questionBank.filters.channelCompare")}
          </label>
          <select
            id="qb-channel-select"
            className="qb-select"
            value={filters.channelId}
            onChange={(e) => onUpdateFilter("channelId", e.target.value)}
          >
            <option value="">{t("questionBank.filters.channelGlobal")}</option>
            {channels.map((ch) => (
              <option key={ch.channel_id} value={ch.channel_id}>
                {ch.display_name} ({ch.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Archetype Filter */}
        <div className="qb-filter-group">
          <label className="qb-filter-label" htmlFor="qb-arch-select">
            {t("questionBank.filters.archetype")}
          </label>
          <select
            id="qb-arch-select"
            className="qb-select"
            value={filters.archetypeId}
            onChange={(e) => onUpdateFilter("archetypeId", e.target.value)}
          >
            <option value="">{t("questionBank.filters.allArchetypes")}</option>
            {ARCHETYPE_OPTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {t(`questionBank.archetypes.${a.id}` as any)}
              </option>
            ))}
          </select>
        </div>

        {/* Domain Filter */}
        <div className="qb-filter-group">
          <label className="qb-filter-label" htmlFor="qb-domain-select">
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

        {/* Subtopic Filter */}
        {subtopics.length > 0 && (
          <div className="qb-filter-group">
            <label className="qb-filter-label" htmlFor="qb-subtopic-select">
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

        {/* Source Language Filter */}
        <div className="qb-filter-group">
          <label className="qb-filter-label" htmlFor="qb-lang-select">
            {t("questionBank.filters.sourceLanguage")}
          </label>
          <select
            id="qb-lang-select"
            className="qb-select"
            value={filters.languageFilter}
            onChange={(e) => onUpdateFilter("languageFilter", e.target.value)}
          >
            <option value="">{t("questionBank.filters.allLanguages")}</option>
            <option value="en">{t("questionBank.filters.langEn")}</option>
          </select>
        </div>

        {/* Translation Availability Filter */}
        <div className="qb-filter-group">
          <label className="qb-filter-label" htmlFor="qb-trans-select">
            {t("questionBank.filters.translationStatus")}
          </label>
          <select
            id="qb-trans-select"
            className="qb-select"
            value={filters.translationFilter}
            onChange={(e) => onUpdateFilter("translationFilter", e.target.value as TranslationFilterOption)}
          >
            <option value="all">{t("questionBank.filters.allTranslations")}</option>
            <option value="has_translation">{t("questionBank.filters.hasTranslation")}</option>
            <option value="needs_translation">{t("questionBank.filters.needsTranslation")}</option>
          </select>
        </div>

        {/* Cooldown Filter Buttons */}
        {filters.channelId && (
          <div className="qb-filter-group">
            <label className="qb-filter-label">{t("questionBank.filters.cooldownStatus")}</label>
            <div className="qb-segmented-control">
              {(["all", "ready", "cooldown"] as CooldownFilterOption[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`qb-segment-btn ${filters.cooldownFilter === opt ? "is-active" : ""}`}
                  onClick={() => onUpdateFilter("cooldownFilter", opt)}
                >
                  {opt === "all"
                    ? t("questionBank.filters.cooldownAll")
                    : opt === "ready"
                      ? t("questionBank.filters.cooldownReady")
                      : t("questionBank.filters.cooldownActive")}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="qb-toolbar-row qb-toolbar-bottom">
        {/* Search Input */}
        <div className="qb-search-wrapper">
          <MagnifyingGlass size={16} className="qb-search-icon" />
          <input
            type="text"
            className="qb-search-input"
            placeholder={t("questionBank.filters.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => onUpdateFilter("search", e.target.value)}
          />
          {filters.search && (
            <button type="button" className="qb-search-clear" onClick={() => onUpdateFilter("search", "")} title="X">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="qb-toolbar-buttons">
          <button type="button" className="qb-btn qb-btn-ghost" onClick={onResetFilters} title={t("questionBank.filters.resetTitle")}>
            <Funnel size={15} />
            <span>{t("questionBank.filters.reset")}</span>
          </button>

          <button type="button" className="qb-btn qb-btn-secondary" onClick={onOpenCreateModal}>
            <Plus size={16} weight="bold" />
            <span>{t("questionBank.filters.addQuestion")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
