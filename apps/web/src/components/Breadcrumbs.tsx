import { CaretRight, FilmSlate, House, Television } from "@phosphor-icons/react";
import React from "react";
import { buildHash, getNavProps } from "../hooks/useRouter";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  isCurrent?: boolean;
};

export function Breadcrumbs({ items, className = "" }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav className={`breadcrumbs-nav ${className}`} aria-label="Breadcrumb navigation">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrent;
          return (
            <li key={index} className={`breadcrumb-item ${isLast ? "is-current" : ""}`}>
              {index > 0 && <CaretRight size={13} className="breadcrumb-separator" aria-hidden="true" />}
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  <span className="breadcrumb-label" title={item.label}>
                    {item.label}
                  </span>
                </span>
              ) : item.onClick || item.href ? (
                <a className="breadcrumb-link-btn" {...getNavProps(item.href || "#", item.onClick)}>
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  <span className="breadcrumb-label" title={item.label}>
                    {item.label}
                  </span>
                </a>
              ) : (
                <span className="breadcrumb-static">
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  <span className="breadcrumb-label" title={item.label}>
                    {item.label}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ChannelBreadcrumb({
  channelName,
  channelId,
  engine = "quiz",
  onNavigateHome,
  onNavigateChannels,
}: {
  channelName: string;
  channelId?: string;
  engine?: "quiz" | "documentary";
  onNavigateHome?: () => void;
  onNavigateChannels?: () => void;
}) {
  const items: BreadcrumbItem[] = [
    {
      label: "Dashboard",
      icon: <House size={14} />,
      onClick: onNavigateHome,
      href: "#/dashboard",
    },
    {
      label: "Channels",
      icon: <Television size={14} />,
      onClick: onNavigateChannels,
      href: "#/channels",
    },
    {
      label: channelName,
      icon: <span style={{ fontSize: "13px" }}>🎯</span>,
      isCurrent: true,
    },
  ];

  return <Breadcrumbs items={items} className="channel-breadcrumbs" />;
}

export function EpisodeBreadcrumb({
  channelName,
  channelId,
  episodeTitle,
  engine = "quiz",
  onNavigateHome,
  onNavigateChannels,
  onNavigateChannel,
}: {
  channelName: string;
  channelId?: string;
  episodeTitle: string;
  engine?: "quiz" | "documentary";
  onNavigateHome?: () => void;
  onNavigateChannels?: () => void;
  onNavigateChannel?: () => void;
}) {
  const items: BreadcrumbItem[] = [
    {
      label: "Dashboard",
      icon: <House size={14} />,
      onClick: onNavigateHome,
      href: "#/dashboard",
    },
    {
      label: "Channels",
      icon: <Television size={14} />,
      onClick: onNavigateChannels,
      href: "#/channels",
    },
    {
      label: channelName,
      icon: <span style={{ fontSize: "13px" }}>{engine === "quiz" ? "🎯" : "🎬"}</span>,
      onClick: onNavigateChannel,
      href: channelId ? buildHash({ page: "channels", channelId }) : "#/channels",
    },
    {
      label: episodeTitle,
      icon: <FilmSlate size={14} />,
      isCurrent: true,
    },
  ];

  return <Breadcrumbs items={items} className="episode-breadcrumbs" />;
}
