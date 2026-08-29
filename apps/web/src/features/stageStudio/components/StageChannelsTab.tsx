import { useMemo } from "react";
import { CheckCircle, MagnifyingGlass, Smiley, X } from "@phosphor-icons/react";
import { getCountryName, getLanguageDisplay, type Channel, type MascotProfile } from "@studio/shared";
import { CountryFlag } from "../../../components/CountryFlag";
import type { useStageStudio } from "../hooks/useStageStudio";

type StageChannelsTabProps = {
  studio: ReturnType<typeof useStageStudio>;
  channels: Channel[];
  allMascots: MascotProfile[];
};

export function StageChannelsTab({ studio, channels, allMascots }: StageChannelsTabProps) {
  const {
    t,
    isSingleChannelMode,
    targetChannel,
    selectedMascotId,
    setSelectedMascotId,
    selectedChannelIds,
    setSelectedChannelIds,
    channelSearchQuery,
    setChannelSearchQuery,
    channelFilterTab,
    setChannelFilterTab,
    activeMascot,
  } = studio;

  // Single-Channel Mode: Mascot Picker
  if (isSingleChannelMode && targetChannel) {
    return (
      <div className="stage-inspector-tab-content">
        {/* Channel Summary */}
        <div className="inspector-card">
          <div className="inspector-card-header">
            <span className="inspector-card-title">{t("stageStudio.targetChannelTitle")}</span>
          </div>
          <div className="channel-blueprint-mini">
            <div className="blueprint-row">
              <span className="blueprint-label">{t("stageStudio.channelNameLabel")}</span>
              <strong className="blueprint-val">{targetChannel.display_name || targetChannel.slug}</strong>
            </div>
            <div className="blueprint-row">
              <span className="blueprint-label">{t("stageStudio.regionLabel")}</span>
              <span className="blueprint-val flag-val">
                <CountryFlag code={targetChannel.country || targetChannel.market} size={14} />
                <span>
                  {getCountryName(targetChannel.country || targetChannel.market)} ({getLanguageDisplay(targetChannel.language || "English")}
                  )
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Mascot Picker Grid */}
        <div className="inspector-card">
          <div className="inspector-card-header">
            <span className="inspector-card-title">{t("stageStudio.selectMascotTitle")}</span>
          </div>

          <div className="mascot-cards-picker-list">
            {/* No Mascot Option */}
            <button
              type="button"
              className={`mascot-picker-card ${selectedMascotId === null ? "is-selected" : ""}`}
              onClick={() => setSelectedMascotId(null)}
            >
              <div className="mascot-picker-avatar empty">
                <Smiley size={22} style={{ color: "var(--muted)" }} />
              </div>
              <div className="mascot-picker-details">
                <strong>{t("stageStudio.noMascotOption")}</strong>
                <small>{t("stageStudio.noMascotDesc")}</small>
              </div>
              {selectedMascotId === null ? <CheckCircle size={16} weight="fill" className="selected-check-icon" /> : null}
            </button>

            {/* Mascot Options */}
            {allMascots.map((m) => {
              const isSelected = selectedMascotId === m.id;
              const readyPoses = Object.values(m.actions).filter((a) => a?.sprite_url).length;

              return (
                <button
                  key={m.id}
                  type="button"
                  className={`mascot-picker-card ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setSelectedMascotId(m.id)}
                >
                  <div className="mascot-picker-avatar">
                    {m.master_image_url ? (
                      <img src={m.master_image_url} alt={m.name} />
                    ) : (
                      <Smiley size={22} style={{ color: m.color_theme || "var(--accent)" }} />
                    )}
                  </div>
                  <div className="mascot-picker-details">
                    <div className="mascot-picker-name-row">
                      <strong>{m.name}</strong>
                      <span className="style-chip">{m.visual_style.replace("_", " ")}</span>
                    </div>
                    <small>{t("stageStudio.posesReadyBadge", { count: readyPoses })}</small>
                  </div>
                  {isSelected ? <CheckCircle size={16} weight="fill" className="selected-check-icon" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Multi-Channel Mode
  const channelOtherMascotMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (!activeMascot) return map;
    for (const ch of channels) {
      if (ch.mascot_id && ch.mascot_id !== activeMascot.id) {
        const otherM = allMascots.find((m) => m.id === ch.mascot_id);
        map.set(ch.channel_id, {
          id: ch.mascot_id,
          name: otherM?.name || ch.mascot_id,
        });
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
          <button
            type="button"
            className={`channel-tab-btn ${channelFilterTab === "all" ? "is-active" : ""}`}
            onClick={() => setChannelFilterTab("all")}
          >
            {t("stageStudio.filterAll", { count: countAll })}
          </button>
          <button
            type="button"
            className={`channel-tab-btn ${channelFilterTab === "selected" ? "is-active" : ""}`}
            onClick={() => setChannelFilterTab("selected")}
          >
            {t("stageStudio.filterSelected", { count: countSelected })}
          </button>
          <button
            type="button"
            className={`channel-tab-btn ${channelFilterTab === "unassigned" ? "is-active" : ""}`}
            onClick={() => setChannelFilterTab("unassigned")}
          >
            {t("stageStudio.filterUnassigned", { count: countUnassigned })}
          </button>
          <button
            type="button"
            className={`channel-tab-btn ${channelFilterTab === "other" ? "is-active" : ""}`}
            onClick={() => setChannelFilterTab("other")}
          >
            {t("stageStudio.filterOther", { count: countOther })}
          </button>
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
