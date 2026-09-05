import { useEffect, useMemo, useState } from "react";
import { ArrowsDownUp, Broadcast, Globe, Plus, X } from "@phosphor-icons/react";
import { TARGET_COUNTRY_LANGUAGES, matchChannelLanguage, type Channel, type MascotProfile } from "@studio/shared";
import { EmptyState } from "../EmptyState";
import { CountryFlag } from "../CountryFlag";
import { useTranslation } from "../../i18n";
import { api } from "../../api";
import { ChannelCard } from "./ChannelCard";
import { ChannelReorderBanner } from "./ChannelReorderBanner";
import { useChannelOrder } from "../../features/channel/hooks/useChannelOrder";
import { useChannelDragAndDrop } from "../../features/channel/hooks/useChannelDragAndDrop";

export type ChannelsListViewProps = {
  channels: Channel[];
  mascots?: MascotProfile[];
  onCreate: () => void;
  openChannel: (id: string) => void;
  onDelete: (channel: Channel) => void;
};

export type ChannelSortOption = "custom" | "latest" | "episodes" | "name";

export function ChannelsListView({ channels, mascots: initialMascots, onCreate, openChannel, onDelete }: ChannelsListViewProps) {
  const { t, language: uiLang } = useTranslation();
  const [mascots, setMascots] = useState<MascotProfile[]>(initialMascots || []);
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [isReordering, setIsReordering] = useState<boolean>(false);

  const { orderedChannels, hasCustomOrder, reorderChannel, pinToTop, resetOrder } = useChannelOrder(channels);

  const [sortBy, setSortBy] = useState<ChannelSortOption>(() => (hasCustomOrder ? "custom" : "latest"));

  const { getDraggableProps } = useChannelDragAndDrop({
    onReorder: reorderChannel,
    enabled: isReordering,
  });

  useEffect(() => {
    if (!initialMascots || initialMascots.length === 0) {
      void api
        .mascots()
        .then((res) => setMascots(res.mascots))
        .catch(() => {});
    }
  }, [initialMascots]);

  // Compute channel counts for each synchronized target language
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

  // Create an index map for fast custom sorting
  const orderIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    orderedChannels.forEach((c, idx) => map.set(c.channel_id, idx));
    return map;
  }, [orderedChannels]);

  const filteredChannels = useMemo(() => {
    const baseList = isReordering ? orderedChannels : channels;

    return [...baseList]
      .filter((c) => {
        if (isReordering) return true; // Show all channels during reordering
        if (languageFilter !== "all" && !matchChannelLanguage(c, languageFilter)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (isReordering || sortBy === "custom") {
          return (orderIndexMap.get(a.channel_id) ?? 0) - (orderIndexMap.get(b.channel_id) ?? 0);
        }
        if (sortBy === "episodes") {
          return (b.episode_count || 0) - (a.episode_count || 0);
        }
        if (sortBy === "name") {
          return a.display_name.localeCompare(b.display_name);
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [channels, orderedChannels, orderIndexMap, isReordering, languageFilter, sortBy]);

  const handleStartReordering = () => {
    setLanguageFilter("all");
    setSortBy("custom");
    setIsReordering(true);
  };

  const handleDoneReordering = () => {
    setIsReordering(false);
  };

  const handleResetOrder = () => {
    resetOrder();
    setSortBy("latest");
    setIsReordering(false);
  };

  return (
    <section className="page-wrap">
      <div className="hero-row" style={{ marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">{t("channels.pageEyebrow")}</p>
          <h1>{t("channels.pageTitle")}</h1>
        </div>
        <button className="primary-button hero-action" onClick={onCreate}>
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
              onClick={() => {
                if (!isReordering) setLanguageFilter("all");
              }}
              disabled={isReordering}
            >
              <CountryFlag code="GLOBAL" size={13} />
              <span>{t("channels.filterAll")}</span>
              <span className="channel-filter-count">{channels.length}</span>
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
                    if (!isReordering) setLanguageFilter(lang.key);
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
              onClick={handleStartReordering}
              title={t("channels.reorderChannels")}
            >
              <ArrowsDownUp size={14} />
              <span>{t("channels.reorderChannels")}</span>
            </button>
          ) : null}

          <select
            className="channel-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ChannelSortOption)}
            aria-label={t("channels.sortBy")}
            disabled={isReordering}
          >
            {hasCustomOrder || isReordering ? (
              <option value="custom">{t("channels.sortCustom")}</option>
            ) : null}
            <option value="latest">{t("channels.sortLatest")}</option>
            <option value="episodes">{t("channels.sortEpisodes")}</option>
            <option value="name">{t("channels.sortName")}</option>
          </select>
        </div>
      </div>

      {/* Active Reordering Banner */}
      {isReordering ? (
        <ChannelReorderBanner
          onDone={handleDoneReordering}
          onReset={handleResetOrder}
          hasCustomOrder={hasCustomOrder}
        />
      ) : null}

      {/* Grid or Empty state */}
      {channels.length === 0 ? (
        <EmptyState
          icon={<Broadcast size={26} />}
          title={t("channels.noQuizChannelsTitle")}
          copy={t("channels.noQuizChannelsCopy")}
          action={t("channels.newQuizChannel")}
          onAction={onCreate}
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
          <button type="button" className="quiet-button" onClick={() => setLanguageFilter("all")} style={{ margin: "0 auto" }}>
            <X size={14} />
            <span>{t("channels.clearFilters")}</span>
          </button>
        </div>
      ) : (
        <div className={`channel-grid ${isReordering ? "is-reordering-grid" : ""}`}>
          {filteredChannels.map((channel, index) => (
            <ChannelCard
              key={channel.channel_id}
              index={index + 1}
              channel={channel}
              mascots={mascots}
              isReordering={isReordering}
              draggableProps={isReordering ? getDraggableProps(index, channel.channel_id) : undefined}
              onPinToTop={pinToTop}
              onOpen={() => openChannel(channel.channel_id)}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
