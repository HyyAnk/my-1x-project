import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Copy, DotsThreeVertical, PushPin, Trash } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import { useTranslation } from "../../i18n";
import { getNavProps } from "../../hooks/useRouter";

export type ChannelCardMenuProps = {
  channel: Channel;
  channelUrl: string;
  onOpen: () => void;
  onDelete: (channel: Channel) => void;
  onPinToTop?: () => void;
};

export function ChannelCardMenu({ channel, channelUrl, onOpen, onDelete, onPinToTop }: ChannelCardMenuProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(channel.channel_id);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setMenuOpen(false);
    }, 1200);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onDelete(channel);
  };

  return (
    <div className="channel-card-menu-wrap" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`channel-card-menu-btn ${menuOpen ? "is-active" : ""}`}
        title={t("channels.moreActions")}
        aria-label={t("channels.moreActions")}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>

      {menuOpen ? (
        <div className="channel-menu-dropdown" role="menu">
          <a
            className="channel-menu-item"
            role="menuitem"
            {...getNavProps(channelUrl, () => {
              setMenuOpen(false);
              onOpen();
            })}
          >
            <ArrowUpRight size={15} />
            <span>{t("channels.openChannel")}</span>
          </a>

          {onPinToTop ? (
            <button
              type="button"
              className="channel-menu-item"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onPinToTop();
              }}
            >
              <PushPin size={15} />
              <span>{t("channels.pinToTop")}</span>
            </button>
          ) : null}

          <button type="button" className="channel-menu-item" role="menuitem" onClick={handleCopyId}>
            <Copy size={15} />
            <span>{copied ? t("channels.idCopied") : t("channels.copyId")}</span>
          </button>

          <div className="channel-menu-divider" />

          <button type="button" className="channel-menu-item danger" role="menuitem" onClick={handleDelete}>
            <Trash size={15} />
            <span>{t("common.delete")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
