import { useMemo, useState } from "react";
import {
  Broadcast,
  CheckCircle,
  Circle,
  CircleNotch,
  DeviceMobile,
  FloppyDisk,
  MagnifyingGlass,
  MonitorPlay,
  Smiley,
  Warning,
  X,
} from "@phosphor-icons/react";
import {
  QUIZ_IMAGE_STYLE_LABELS,
  type Channel,
  type MascotPosition,
  type MascotProfile,
} from "@studio/shared";
import { useTranslation } from "../i18n";
import { api } from "../api";

export interface MascotAssignModalProps {
  mascot: MascotProfile | null;
  channels: Channel[];
  allMascots?: MascotProfile[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onNotice: (notice: { tone: "good" | "bad" | "neutral"; message: string }) => void;
}

type FilterTab = "all" | "selected" | "unassigned" | "other";
type AspectRatio = "9:16" | "16:9";

export function MascotAssignModal({
  mascot,
  channels,
  allMascots = [],
  isOpen,
  onClose,
  onSaved,
  onNotice,
}: MascotAssignModalProps) {
  const { t } = useTranslation();

  // Find sample config if this mascot was already assigned to some channel
  const sampleChannel = useMemo(
    () => channels.find((c) => c.mascot_id === mascot?.id),
    [channels, mascot?.id]
  );

  const [position, setPosition] = useState<MascotPosition>(() => sampleChannel?.mascot_config?.position || "bottom_left");
  const [scale, setScale] = useState<number>(() => sampleChannel?.mascot_config?.scale || 1.0);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(() => mascot?.assigned_channel_ids || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [saving, setSaving] = useState(false);

  // Sync state when mascot changes
  const mascotId = mascot?.id;
  const currentAssignedIds = mascot?.assigned_channel_ids;
  useMemo(() => {
    if (mascot) {
      setSelectedChannelIds(currentAssignedIds || []);
      const sample = channels.find((c) => c.mascot_id === mascot.id);
      if (sample?.mascot_config) {
        setPosition(sample.mascot_config.position || "bottom_left");
        setScale(sample.mascot_config.scale || 1.0);
      } else {
        setPosition("bottom_left");
        setScale(1.0);
      }
    }
  }, [mascotId, currentAssignedIds, channels, mascot]);

  // Mascot preview image/sprite fallback
  const previewImage = useMemo(() => {
    if (!mascot) return null;
    return (
      mascot.actions.idle?.sprite_url ||
      mascot.actions.wave?.sprite_url ||
      mascot.master_image_url ||
      null
    );
  }, [mascot]);

  // Map channel_id -> other mascot name if assigned to another mascot
  const channelOtherMascotMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (!mascot) return map;
    for (const ch of channels) {
      if (ch.mascot_id && ch.mascot_id !== mascot.id) {
        const otherM = allMascots.find((m) => m.id === ch.mascot_id);
        map.set(ch.channel_id, {
          id: ch.mascot_id,
          name: otherM?.name || ch.mascot_id,
        });
      }
    }
    return map;
  }, [channels, mascot, allMascots]);

  // Tab counts
  const countAll = channels.length;
  const countSelected = selectedChannelIds.length;
  const countUnassigned = useMemo(
    () => channels.filter((c) => !c.mascot_id).length,
    [channels]
  );
  const countOther = useMemo(
    () => channels.filter((c) => Boolean(c.mascot_id && c.mascot_id !== mascot?.id)).length,
    [channels, mascot?.id]
  );

  // Count transferred channels from other mascots
  const transferredCount = useMemo(() => {
    return selectedChannelIds.filter((cid) => channelOtherMascotMap.has(cid)).length;
  }, [selectedChannelIds, channelOtherMascotMap]);

  // Filtered channel list
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = ch.display_name.toLowerCase().includes(query);
        const matchesId = ch.channel_id.toLowerCase().includes(query);
        const matchesLang = (ch.language || "").toLowerCase().includes(query);
        const matchesMarket = (ch.market || "").toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesLang && !matchesMarket) {
          return false;
        }
      }

      // 2. Tab Filter
      if (filterTab === "selected") {
        return selectedChannelIds.includes(ch.channel_id);
      }
      if (filterTab === "unassigned") {
        return !ch.mascot_id;
      }
      if (filterTab === "other") {
        return Boolean(ch.mascot_id && ch.mascot_id !== mascot?.id);
      }
      return true;
    });
  }, [channels, searchQuery, filterTab, selectedChannelIds, mascot?.id]);

  if (!isOpen || !mascot) return null;

  const handleToggleChannel = (channelId: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredChannels.map((c) => c.channel_id);
    setSelectedChannelIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(filteredChannels.map((c) => c.channel_id));
    setSelectedChannelIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const channel of channels) {
        const isAssigned = selectedChannelIds.includes(channel.channel_id);
        if (isAssigned && channel.mascot_id !== mascot.id) {
          // Reassign from other/null to this mascot
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: mascot.id,
            config: { enabled: true, position, scale },
          });
        } else if (!isAssigned && channel.mascot_id === mascot.id) {
          // Unassign from this mascot
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: null,
          });
        } else if (isAssigned && channel.mascot_id === mascot.id) {
          // Update config (position & scale)
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: mascot.id,
            config: { enabled: true, position, scale },
          });
        }
      }
      onNotice({ tone: "good", message: t("notices.channelsAssigned") });
      await onSaved();
      onClose();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.channelsAssignFailed") });
    } finally {
      setSaving(false);
    }
  };

  const formatLangTag = (channel: Channel) => {
    const lang = channel.language || channel.market || "EN";
    const lower = lang.toLowerCase();
    if (lower.includes("viet") || lower === "vi") return "🇻🇳 VI";
    if (lower.includes("eng") || lower === "en") return "🇺🇸 EN";
    if (lower.includes("japan") || lower === "ja") return "🇯🇵 JA";
    if (lower.includes("korea") || lower === "ko") return "🇰🇷 KO";
    if (lower.includes("thai") || lower === "th") return "🇹🇭 TH";
    if (lower.includes("indonesia") || lower === "id") return "🇮🇩 ID";
    return `🌐 ${lang.toUpperCase().slice(0, 4)}`;
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal mascot-assign-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mascot-assign-title"
      >
        {/* Header */}
        <header className="mascot-assign-header">
          <div className="mascot-assign-identity">
            <div
              className="mascot-assign-avatar"
              style={{
                borderColor: mascot.color_theme || "var(--accent)",
              }}
            >
              {mascot.master_image_url ? (
                <img src={mascot.master_image_url} alt={mascot.name} />
              ) : (
                <Smiley size={24} weight="duotone" style={{ color: mascot.color_theme || "var(--accent)" }} />
              )}
            </div>
            <div>
              <p className="eyebrow">{t("mascots.quickAssignEyebrow")}</p>
              <h2 id="mascot-assign-title">{t("mascots.quickAssignTitle", { name: mascot.name })}</h2>
            </div>
            <span
              className="mascot-style-pill"
              style={{ backgroundColor: mascot.color_theme || "var(--accent)", marginLeft: "4px" }}
            >
              {QUIZ_IMAGE_STYLE_LABELS[mascot.visual_style] || mascot.visual_style}
            </span>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label={t("common.close")}
            onClick={onClose}
            disabled={saving}
          >
            <X size={18} />
          </button>
        </header>

        {/* 2-Column Studio Body */}
        <div className="mascot-assign-body-grid">
          {/* LEFT: Live Stage Simulator & Positioning */}
          <aside className="mascot-assign-stage-preview">
            <div className="stage-simulator-header">
              <strong>{t("mascots.stageConfigTitle")}</strong>
              <div className="stage-aspect-toggles">
                <button
                  type="button"
                  className={`stage-aspect-btn ${aspectRatio === "9:16" ? "is-active" : ""}`}
                  onClick={() => setAspectRatio("9:16")}
                  title={t("mascots.previewAspectRatioShorts")}
                >
                  <DeviceMobile size={14} />
                  <span>9:16</span>
                </button>
                <button
                  type="button"
                  className={`stage-aspect-btn ${aspectRatio === "16:9" ? "is-active" : ""}`}
                  onClick={() => setAspectRatio("16:9")}
                  title={t("mascots.previewAspectRatioVideo")}
                >
                  <MonitorPlay size={14} />
                  <span>16:9</span>
                </button>
              </div>
            </div>

            {/* Simulated Stage Canvas */}
            <div className={`stage-simulator-canvas-container aspect-${aspectRatio.replace(":", "-")}`}>
              <div className="stage-simulator-frame">
                {/* Mock quiz UI overlay */}
                <div className="mock-quiz-overlay">
                  <div className="mock-quiz-header">
                    <span className="mock-dot red" />
                    <span className="mock-dot yellow" />
                    <span className="mock-dot green" />
                    <span className="mock-quiz-title-bar" />
                  </div>
                  <div className="mock-quiz-card">
                    <div className="mock-quiz-line full" />
                    <div className="mock-quiz-line half" />
                  </div>
                  <div className="mock-quiz-options">
                    <div className="mock-quiz-opt" />
                    <div className="mock-quiz-opt" />
                  </div>
                </div>

                {/* Mascot on Stage */}
                <div
                  className={`stage-simulator-mascot pos-${position}`}
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: position === "bottom_left" ? "bottom left" : "bottom right",
                  }}
                >
                  {previewImage ? (
                    <img src={previewImage} alt={mascot.name} />
                  ) : (
                    <div className="stage-simulator-placeholder">
                      <Smiley size={36} style={{ color: mascot.color_theme || "var(--accent)" }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Position Controls */}
            <div className="stage-control-card">
              <label className="stage-control-label">{t("mascots.stagePositionLabel")}</label>
              <div className="position-toggle-row">
                <button
                  type="button"
                  className={`pos-toggle-btn ${position === "bottom_left" ? "is-selected" : ""}`}
                  onClick={() => setPosition("bottom_left")}
                >
                  {t("mascots.bottomLeftOption")}
                </button>
                <button
                  type="button"
                  className={`pos-toggle-btn ${position === "bottom_right" ? "is-selected" : ""}`}
                  onClick={() => setPosition("bottom_right")}
                >
                  {t("mascots.bottomRightOption")}
                </button>
              </div>
            </div>

            {/* Scale Slider & Presets */}
            <div className="stage-control-card">
              <div className="stage-scale-header">
                <label className="stage-control-label">
                  {t("mascots.scaleLabel", { scale: scale.toFixed(2) })}
                </label>
                <span className="scale-value-badge">{Math.round(scale * 100)}%</span>
              </div>
              <input
                type="range"
                className="scale-range-slider"
                min={0.7}
                max={1.3}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
              <div className="scale-presets-row">
                <button
                  type="button"
                  className={`scale-preset-chip ${Math.abs(scale - 0.85) < 0.01 ? "is-active" : ""}`}
                  onClick={() => setScale(0.85)}
                >
                  {t("mascots.presetCompact")}
                </button>
                <button
                  type="button"
                  className={`scale-preset-chip ${Math.abs(scale - 1.0) < 0.01 ? "is-active" : ""}`}
                  onClick={() => setScale(1.0)}
                >
                  {t("mascots.presetStandard")}
                </button>
                <button
                  type="button"
                  className={`scale-preset-chip ${Math.abs(scale - 1.15) < 0.01 ? "is-active" : ""}`}
                  onClick={() => setScale(1.15)}
                >
                  {t("mascots.presetLarge")}
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT: Smart Channel Hub */}
          <main className="mascot-assign-channel-hub">
            {/* Search and Filter Row */}
            <div className="channel-hub-top-bar">
              <div className="channel-search-box">
                <MagnifyingGlass size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder={t("mascots.searchChannelsPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="icon-button compact clear-search-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>

              {/* Filter Tabs */}
              <div className="channel-filter-tabs">
                <button
                  type="button"
                  className={`channel-filter-tab ${filterTab === "all" ? "is-active" : ""}`}
                  onClick={() => setFilterTab("all")}
                >
                  {t("mascots.filterAll")} <span className="tab-badge">{countAll}</span>
                </button>
                <button
                  type="button"
                  className={`channel-filter-tab ${filterTab === "selected" ? "is-active" : ""}`}
                  onClick={() => setFilterTab("selected")}
                >
                  {t("mascots.filterSelected", { count: countSelected })}
                </button>
                <button
                  type="button"
                  className={`channel-filter-tab ${filterTab === "unassigned" ? "is-active" : ""}`}
                  onClick={() => setFilterTab("unassigned")}
                >
                  {t("mascots.filterUnassigned", { count: countUnassigned })}
                </button>
                {countOther > 0 ? (
                  <button
                    type="button"
                    className={`channel-filter-tab ${filterTab === "other" ? "is-active" : ""}`}
                    onClick={() => setFilterTab("other")}
                  >
                    {t("mascots.filterOtherMascots", { count: countOther })}
                  </button>
                ) : null}
              </div>

              {/* Batch Actions Bar */}
              <div className="channel-batch-bar">
                <span className="channel-count-text">
                  {t("mascots.selectedChannelsSummary", {
                    count: selectedChannelIds.length,
                    total: channels.length,
                  })}
                </span>
                <div className="batch-actions-btns">
                  <button
                    type="button"
                    className="quiet-button compact"
                    onClick={handleSelectAllFiltered}
                    disabled={filteredChannels.length === 0}
                  >
                    {t("mascots.selectAllBtn")}
                  </button>
                  <button
                    type="button"
                    className="quiet-button compact"
                    onClick={handleDeselectAllFiltered}
                    disabled={selectedChannelIds.length === 0}
                  >
                    {t("mascots.deselectAllBtn")}
                  </button>
                </div>
              </div>
            </div>

            {/* Channels Card List */}
            <div className="channels-card-list">
              {filteredChannels.length === 0 ? (
                <div className="channels-empty-state">
                  <Broadcast size={36} weight="duotone" />
                  <p>{channels.length === 0 ? t("mascots.noChannelsAvailable") : t("mascots.noChannelsFound")}</p>
                </div>
              ) : (
                filteredChannels.map((channel) => {
                  const isChecked = selectedChannelIds.includes(channel.channel_id);
                  const isCurrentlyThis = channel.mascot_id === mascot.id;
                  const otherMascotInfo = channelOtherMascotMap.get(channel.channel_id);
                  const langDisplay = formatLangTag(channel);

                  return (
                    <article
                      key={channel.channel_id}
                      className={`channel-select-card ${isChecked ? "is-selected" : ""} ${otherMascotInfo ? "has-other-mascot" : ""}`}
                      onClick={() => handleToggleChannel(channel.channel_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleToggleChannel(channel.channel_id);
                        }
                      }}
                    >
                      {/* Checkbox indicator */}
                      <div className="channel-select-checkbox">
                        {isChecked ? (
                          <CheckCircle size={20} weight="fill" className="check-icon checked" />
                        ) : (
                          <Circle size={20} weight="regular" className="check-icon unchecked" />
                        )}
                      </div>

                      {/* Main channel metadata */}
                      <div className="channel-select-info">
                        <div className="channel-select-title-row">
                          <strong className="channel-select-name">{channel.display_name}</strong>
                          <span className="channel-lang-chip">{langDisplay}</span>
                          <span className={`channel-status-dot ${channel.status.toLowerCase()}`} title={channel.status} />
                        </div>

                        <div className="channel-select-meta-row">
                          <span className="channel-id-code">{channel.channel_id}</span>

                          {/* Mascot status pill */}
                          {isCurrentlyThis ? (
                            <span className="mascot-state-badge current">
                              <span className="pulse-dot green" />
                              {t("mascots.channelItemCurrentlyThis")}
                            </span>
                          ) : otherMascotInfo ? (
                            <span className="mascot-state-badge other" title={`Current mascot: ${otherMascotInfo.name}`}>
                              <Warning size={12} weight="bold" />
                              {t("mascots.currentlyAssignedToOther", { name: otherMascotInfo.name })}
                            </span>
                          ) : (
                            <span className="mascot-state-badge unassigned">
                              {t("mascots.channelItemUnassigned")}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="mascot-assign-footer">
          <div className="mascot-assign-footer-info">
            {transferredCount > 0 ? (
              <span className="transfer-warning-badge">
                <Warning size={15} weight="fill" />
                {t("mascots.transferWarningNotice", { count: transferredCount, name: mascot.name })}
              </span>
            ) : (
              <span className="footer-summary-text">
                {t("mascots.assignChannelsLabel", { count: selectedChannelIds.length })}
              </span>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="quiet-button"
              onClick={onClose}
              disabled={saving}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
              <span>{saving ? t("mascots.quickAssignSavingBtn") : t("mascots.quickAssignSaveBtn")}</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
