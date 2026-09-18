import { useMemo } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { getCountryName, getLanguageDisplay, type Channel, type MascotProfile } from "@studio/shared";
import { CountryFlag } from "../../../components/CountryFlag";
import type { useStageStudio } from "../hooks/useStageStudio";

type StageMultiChannelSelectorProps = {
  studio: ReturnType<typeof useStageStudio>;
  channels: Channel[];
  allMascots: MascotProfile[];
};

export function StageMultiChannelSelector({ studio, channels, allMascots }: StageMultiChannelSelectorProps) {
  const {
    t,
    selectedChannelIds,
    setSelectedChannelIds,
    channelSearchQuery,
    setChannelSearchQuery,
    channelFilterTab,
    setChannelFilterTab,
    activeMascot,
  } = studio;

  const channelOtherMascotMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (!activeMascot) return map;
    for (const ch of channels) {
      if (ch.mascot_id && ch.mascot_id !== activeMascot.id) {
        const otherM = allMascots.find((m) => m.id === ch.mascot_id);
        map.set(ch.channel_id, { id: ch.mascot_id, name: otherM?.name || ch.mascot_id });
      }
    }
    return map;
  }, [channels, activeMascot, allMascots]);

  const countAll = channels.length;
  const countSelected = selectedChannelIds.length;
  const countUnassigned = useMemo(() => channels.filter((c) => !c.mascot_id).length, [channels]);
  const countOther = useMemo(
    () => channels.filter((c) => Boolean(c.mascot_id && c.mascot_id !== activeMascot?.id)).length,
    [channels, activeMascot?.id],
  );

  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (channelSearchQuery.trim()) {
        const query = channelSearchQuery.toLowerCase().trim();
        const matchesName = (ch.display_name || "").toLowerCase().includes(query);
        const matchesSlug = (ch.slug || "").toLowerCase().includes(query);
        if (!matchesName && !matchesSlug) return false;
      }
      if (channelFilterTab === "selected") return selectedChannelIds.includes(ch.channel_id);
      if (channelFilterTab === "unassigned") return !ch.mascot_id;
      if (channelFilterTab === "other") return Boolean(ch.mascot_id && ch.mascot_id !== activeMascot?.id);
      return true;
    });
  }, [channels, channelSearchQuery, channelFilterTab, selectedChannelIds, activeMascot?.id]);

  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds((prev) => (prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]));
  };

  const filterTabs = [
    { key: "all" as const, label: t("stageStudio.filterAll", { count: countAll }) },
    { key: "selected" as const, label: t("stageStudio.filterSelected", { count: countSelected }) },
    { key: "unassigned" as const, label: t("stageStudio.filterUnassigned", { count: countUnassigned }) },
    { key: "other" as const, label: t("stageStudio.filterOther", { count: countOther }) },
  ];

  return (
    <div className="stage-inspector-tab-content">
      <div className="inspector-card">
        {/* Search Input */}
        <div className="channel-search-box">
          <MagnifyingGlass size={14} className="search-icon" />
          <input
            type="text"
            placeholder={t("stageStudio.searchPlaceholder")}
            value={channelSearchQuery}
            onChange={(e) => setChannelSearchQuery(e.target.value)}
          />
          {channelSearchQuery ? (
            <button type="button" className="quiet-button clear-search-btn" onClick={() => setChannelSearchQuery("")}>
              <X size={12} />
            </button>
          ) : null}
        </div>

        {/* Filter Tabs */}
        <div className="channel-filter-tabs">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`channel-tab-btn ${channelFilterTab === tab.key ? "is-active" : ""}`}
              onClick={() => setChannelFilterTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Batch Select Controls */}
        <div className="batch-select-row">
          <button type="button" className="quiet-button compact" onClick={() => setSelectedChannelIds(channels.map((c) => c.channel_id))}>
            {t("stageStudio.selectAllBtn")}
          </button>
          <button type="button" className="quiet-button compact" onClick={() => setSelectedChannelIds([])}>
            {t("stageStudio.deselectAllBtn")}
          </button>
        </div>

        {/* Channel Cards Scroll List */}
        <div className="channels-scroll-grid">
          {filteredChannels.length === 0 ? (
            <div className="channels-empty-state">
              <p>{t("stageStudio.noChannelsFound")}</p>
            </div>
          ) : (
            filteredChannels.map((ch) => {
              const isSelected = selectedChannelIds.includes(ch.channel_id);
              const otherMascot = channelOtherMascotMap.get(ch.channel_id);

              return (
                <label key={ch.channel_id} className={`channel-assign-row ${isSelected ? "is-selected" : ""}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleChannel(ch.channel_id)} className="channel-checkbox" />
                  <div className="channel-assign-meta">
                    <div className="channel-name-line">
                      <strong>{ch.display_name || ch.slug}</strong>
                      <span className="channel-flag-pill">
                        <CountryFlag code={ch.country || ch.market} size={12} />
                        <span>{getCountryName(ch.country || ch.market)}</span>
                      </span>
                    </div>
                    <div className="channel-sub-info">
                      <span>{getLanguageDisplay(ch.language || "English")}</span>
                      {otherMascot ? (
                        <span className="other-mascot-warning">{t("stageStudio.currentlyAssigned", { name: otherMascot.name })}</span>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
