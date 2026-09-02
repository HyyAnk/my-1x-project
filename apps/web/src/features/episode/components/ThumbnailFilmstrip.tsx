import React from "react";
import { Star } from "@phosphor-icons/react";
import type { ThumbnailAspectRatio, ThumbnailHistoryItem } from "@studio/shared";
import { episodeApi } from "../../../api/episodeApi";

type ThumbnailFilmstripProps = {
  channelId: string;
  episodeId: string;
  activeRatio: ThumbnailAspectRatio;
  historyList: ThumbnailHistoryItem[];
  selectedIndex: number;
  imageTimestamp: string | null;
  onSelect: (index: number) => void;
};

export function ThumbnailFilmstrip({
  channelId,
  episodeId,
  activeRatio,
  historyList,
  selectedIndex,
  imageTimestamp,
  onSelect,
}: ThumbnailFilmstripProps) {
  if (historyList.length <= 1) return null;

  return (
    <div className="thumbnail-filmstrip-wrapper">
      <div className="thumbnail-filmstrip-header">
        <span className="filmstrip-title">Version History ({historyList.length})</span>
        <span className="filmstrip-hint">Click any version to preview or activate</span>
      </div>
      <div className="thumbnail-filmstrip" role="list">
        {historyList.map((item, index) => {
          const isSelected = selectedIndex === index;
          const versionNum = historyList.length - index;
          const url = episodeApi.thumbnailFileUrl(channelId, episodeId, activeRatio, imageTimestamp, item.id);

          return (
            <button
              key={item.id}
              type="button"
              className={`filmstrip-card ${isSelected ? "selected" : ""} ${item.is_active ? "is-active" : ""}`}
              onClick={() => onSelect(index)}
              title={`Version ${versionNum} (${item.hook_text || "Default"})`}
            >
              <div className={`filmstrip-thumb-frame ${activeRatio === "9:16" ? "portrait" : ""}`}>
                <img src={url} alt={`Version ${versionNum}`} className="filmstrip-img" loading="lazy" />
                {item.is_active && (
                  <span className="filmstrip-active-star" title="Active Thumbnail">
                    <Star size={10} weight="fill" />
                  </span>
                )}
              </div>
              <div className="filmstrip-card-footer">
                <span className="filmstrip-version-label">v{versionNum}</span>
                {item.is_active && <span className="filmstrip-active-badge">Active</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
