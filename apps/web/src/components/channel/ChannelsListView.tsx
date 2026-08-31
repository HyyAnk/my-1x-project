import { useEffect, useMemo, useState } from "react";
import { Broadcast, Globe, Plus, X } from "@phosphor-icons/react";
import { TARGET_COUNTRY_LANGUAGES, matchChannelLanguage, type Channel, type MascotProfile } from "@studio/shared";
import { EmptyState } from "../EmptyState";
import { CountryFlag } from "../CountryFlag";
import { useTranslation } from "../../i18n";
import { api } from "../../api";
import { ChannelCard } from "./ChannelCard";

export type ChannelGroupId = "quiz" | "history";

export type ChannelsListViewProps = {
  channels: Channel[];
  mascots?: MascotProfile[];
  activeGroup?: ChannelGroupId;
  onActiveGroupChange?: (groupId: ChannelGroupId) => void;
  onCreate: (groupId?: ChannelGroupId) => void;
  openChannel: (id: string) => void;
  onDelete: (channel: Channel) => void;
};

export function ChannelsListView({ channels, mascots: initialMascots, onCreate, openChannel, onDelete }: ChannelsListViewProps) {
  const { t, language: uiLang } = useTranslation();
  const [mascots, setMascots] = useState<MascotProfile[]>(initialMascots || []);
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"latest" | "episodes" | "name">("latest");

  useEffect(() => {
    if (!initialMascots || initialMascots.length === 0) {
      void api
        .mascots()
        .then((res) => setMascots(res.mascots))
        .catch(() => {});
    }
  }, [initialMascots]);

  // Compute channel counts for each synchronized target language (10 languages from 20 countries)
  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lang of TARGET_COUNTRY_LANGUAGES) {
      counts[lang.key] = 0;
    }
    for (const c of channels) {
      for (const lang of TARGET_COUNTRY_LANGUAGES) {
        if (matchChannelLanguage(c, lang.key)) {
          counts[lang.key] = (counts[lang.key] || 0) + 1;
        }
      }
    }
    return counts;
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels
      .filter((c) => {
        if (languageFilter !== "all" && !matchChannelLanguage(c, languageFilter)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "episodes") {
          return (b.episode_count || 0) - (a.episode_count || 0);
        }
        if (sortBy === "name") {
          return a.display_name.localeCompare(b.display_name);
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [channels, languageFilter, sortBy]);

  const clearFilters = () => {
    setLanguageFilter("all");
  };

  return (
    <section className="page-wrap">
      <div className="hero-row" style={{ marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">{t("channels.pageEyebrow")}</p>
          <h1>{t("channels.pageTitle")}</h1>
        </div>
        <button className="primary-button hero-action" onClick={() => onCreate("quiz")}>
          <Plus size={16} weight="bold" />
          <span>{t("channels.newQuizChannel")}</span>
        </button>
      </div>

      {/* Synchronized 10-Language Filter Toolbar */}
      <div className="channel-toolbar">
        <div className="channel-toolbar-left">
          <div className="channel-filter-pills" role="radiogroup" aria-label={t("channels.filterByLanguage") || "Filter by language"}>
            <button
              type="button"
              className={`channel-filter-btn ${languageFilter === "all" ? "is-active" : ""}`}
              onClick={() => setLanguageFilter("all")}
            >
              <CountryFlag code="GLOBAL" size={13} />
              <span>{t("channels.filterAll")}</span>
              <span className="channel-filter-count">{channels.length}</span>
            </button>
            {TARGET_COUNTRY_LANGUAGES.map((lang) => {
              const count = languageCounts[lang.key] || 0;
              const isActive = languageFilter === lang.key;
              const label = uiLang === "vi" ? lang.nameVi : lang.name;
              return (
                <button
                  type="button"
                  key={lang.key}
                  className={`channel-filter-btn ${isActive ? "is-active" : ""}`}
                  onClick={() => setLanguageFilter(lang.key)}
                  title={`${lang.name} (${lang.nameVi})`}
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
          <select
            className="channel-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "latest" | "episodes" | "name")}
            aria-label={t("channels.sortBy")}
          >
            <option value="latest">{t("channels.sortLatest")}</option>
            <option value="episodes">{t("channels.sortEpisodes")}</option>
            <option value="name">{t("channels.sortName")}</option>
          </select>
        </div>
      </div>

      {/* Grid or Empty state */}
      {channels.length === 0 ? (
        <EmptyState
          icon={<Broadcast size={26} />}
          title={t("channels.noQuizChannelsTitle")}
          copy={t("channels.noQuizChannelsCopy")}
          action={t("channels.newQuizChannel")}
          onAction={() => onCreate("quiz")}
        />
      ) : filteredChannels.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--line)",
          }}
        >
          <Globe size={36} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px" }}>{t("channels.noResultsTitle")}</h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 16px" }}>{t("channels.noResultsCopy")}</p>
          <button type="button" className="quiet-button" onClick={clearFilters} style={{ margin: "0 auto" }}>
            <X size={14} />
            <span>{t("channels.clearFilters")}</span>
          </button>
        </div>
      ) : (
        <div className="channel-grid">
          {filteredChannels.map((channel, index) => (
            <ChannelCard
              key={channel.channel_id}
              index={index + 1}
              channel={channel}
              mascots={mascots}
              onOpen={() => openChannel(channel.channel_id)}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
