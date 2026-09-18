import { ArrowsDownUp } from "@phosphor-icons/react";
import { TARGET_COUNTRY_LANGUAGES } from "@studio/shared";
import { CountryFlag } from "../CountryFlag";
import { useTranslation } from "../../i18n";
import type { ChannelSortOption } from "../../features/channel/hooks/useChannelFilterSort";

export interface ChannelFilterToolbarProps {
  totalChannels?: number;
  channelsCount?: number;
  languageCounts: Record<string, number>;
  languageFilter: string;
  onLanguageFilterChange: (language: string) => void;
  sortBy: ChannelSortOption;
  onSortByChange: (sort: ChannelSortOption) => void;
  isReordering: boolean;
  hasCustomOrder: boolean;
  onStartReordering: () => void;
}

export function ChannelFilterToolbar({
  totalChannels,
  channelsCount,
  languageCounts,
  languageFilter,
  onLanguageFilterChange,
  sortBy,
  onSortByChange,
  isReordering,
  hasCustomOrder,
  onStartReordering,
}: ChannelFilterToolbarProps) {
  const { t } = useTranslation();
  const countAll = totalChannels ?? channelsCount ?? 0;

  return (
    <div className="channel-toolbar">
      <div className="channel-toolbar-left">
        <div className="channel-filter-pills" role="radiogroup" aria-label={t("channels.filterByLanguage") || "Filter by language"}>
          <button
            type="button"
            className={`channel-filter-btn ${languageFilter === "all" ? "is-active" : ""}`}
            onClick={() => {
              if (!isReordering) onLanguageFilterChange("all");
            }}
            disabled={isReordering}
          >
            <CountryFlag code="GLOBAL" size={13} />
            <span>{t("channels.filterAll")}</span>
            <span className="channel-filter-count">{countAll}</span>
          </button>
          {TARGET_COUNTRY_LANGUAGES.map((lang) => {
            const count = languageCounts[lang.key] || 0;
            const isActive = languageFilter === lang.key;
            const label = lang.name;
            return (
              <button
                type="button"
                key={lang.key}
                className={`channel-filter-btn ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  if (!isReordering) onLanguageFilterChange(lang.key);
                }}
                disabled={isReordering}
                title={lang.name}
              >
                <CountryFlag code={lang.primaryCountryCode || lang.countryCodes[0]} size={13} />
                <span>{label}</span>
                <span className="channel-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="channel-toolbar-right">
        {!isReordering ? (
          <button
            type="button"
            className="quiet-button is-compact channel-reorder-toggle-btn"
            onClick={onStartReordering}
            title={t("channels.reorderChannels")}
          >
            <ArrowsDownUp size={14} />
            <span>{t("channels.reorderChannels")}</span>
          </button>
        ) : null}

        <select
          className="channel-sort-select"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as ChannelSortOption)}
          aria-label={t("channels.sortBy")}
          disabled={isReordering}
        >
          {hasCustomOrder || isReordering ? <option value="custom">{t("channels.sortCustom")}</option> : null}
          <option value="latest">{t("channels.sortLatest")}</option>
          <option value="episodes">{t("channels.sortEpisodes")}</option>
          <option value="name">{t("channels.sortName")}</option>
        </select>
      </div>
    </div>
  );
}
