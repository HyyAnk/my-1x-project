import { useEffect, useState } from "react";
import { Broadcast, Globe, Plus, X } from "@phosphor-icons/react";
import type { Channel, MascotProfile } from "@studio/shared";
import { EmptyState } from "../EmptyState";
import { useTranslation } from "../../i18n";
import { api } from "../../api";
import { ChannelCard } from "./ChannelCard";
import { ChannelReorderBanner } from "./ChannelReorderBanner";
import { ChannelFilterToolbar } from "./ChannelFilterToolbar";
import { useChannelOrder } from "../../features/channel/hooks/useChannelOrder";
import { useChannelDragAndDrop } from "../../features/channel/hooks/useChannelDragAndDrop";
import { useChannelFilterSort, type ChannelSortOption } from "../../features/channel/hooks/useChannelFilterSort";

export type { ChannelSortOption };

export type ChannelsListViewProps = {
  channels: Channel[];
  mascots?: MascotProfile[];
  onCreate: () => void;
  openChannel: (id: string) => void;
  onDelete: (channel: Channel) => void;
};

export function ChannelsListView({ channels, mascots: initialMascots, onCreate, openChannel, onDelete }: ChannelsListViewProps) {
  const { t } = useTranslation();
  const [mascots, setMascots] = useState<MascotProfile[]>(initialMascots || []);
  const [isReordering, setIsReordering] = useState<boolean>(false);

  const { orderedChannels, hasCustomOrder, reorderChannel, pinToTop, resetOrder } = useChannelOrder(channels);
  const { languageFilter, setLanguageFilter, sortBy, setSortBy, languageCounts, filteredChannels, handleStartReordering } =
    useChannelFilterSort({
      channels,
      orderedChannels,
      isReordering,
      hasCustomOrder,
      onStartReordering: () => setIsReordering(true),
    });

  const { getDraggableProps } = useChannelDragAndDrop({ onReorder: reorderChannel, enabled: isReordering });

  useEffect(() => {
    if (!initialMascots || initialMascots.length === 0) {
      void api
        .mascots()
        .then((res) => setMascots(res.mascots))
        .catch(() => {});
    }
  }, [initialMascots]);

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

      <ChannelFilterToolbar
        totalChannels={channels.length}
        languageCounts={languageCounts}
        languageFilter={languageFilter}
        onLanguageFilterChange={setLanguageFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        isReordering={isReordering}
        hasCustomOrder={hasCustomOrder}
        onStartReordering={handleStartReordering}
      />

      {isReordering && (
        <ChannelReorderBanner onDone={() => setIsReordering(false)} onReset={handleResetOrder} hasCustomOrder={hasCustomOrder} />
      )}

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
