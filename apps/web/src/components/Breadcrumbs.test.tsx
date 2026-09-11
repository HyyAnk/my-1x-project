import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Breadcrumbs, ChannelBreadcrumb, EpisodeBreadcrumb, ShortReelBreadcrumb } from "./Breadcrumbs";

afterEach(cleanup);

describe("Breadcrumbs Components", () => {
  it("renders generic breadcrumbs with items and separators", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Level 1", href: "#/level-1" },
          { label: "Level 2", href: "#/level-2" },
          { label: "Current Level", isCurrent: true },
        ]}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Breadcrumb navigation" })).toBeDefined();
    expect(screen.getByText("Level 1")).toBeDefined();
    expect(screen.getByText("Level 2")).toBeDefined();
    expect(screen.getByText("Current Level")).toBeDefined();
  });

  it("renders ChannelBreadcrumb with Dashboard and Channels links", () => {
    const onNavigateHome = vi.fn();
    const onNavigateChannels = vi.fn();

    render(
      <ChannelBreadcrumb
        channelName="Novy"
        onNavigateHome={onNavigateHome}
        onNavigateChannels={onNavigateChannels}
      />,
    );

    const homeLink = screen.getByText("Dashboard");
    fireEvent.click(homeLink);
    expect(onNavigateHome).toHaveBeenCalled();

    const channelsLink = screen.getByText("Channels");
    fireEvent.click(channelsLink);
    expect(onNavigateChannels).toHaveBeenCalled();

    expect(screen.getByText("Novy")).toBeDefined();
  });

  it("renders EpisodeBreadcrumb with channel and episode title", () => {
    const onNavigateChannel = vi.fn();

    render(
      <EpisodeBreadcrumb
        channelName="Novy"
        channelId="novy_1"
        episodeTitle="Episode 1"
        onNavigateChannel={onNavigateChannel}
      />,
    );

    const channelLink = screen.getByText("Novy");
    fireEvent.click(channelLink);
    expect(onNavigateChannel).toHaveBeenCalled();

    expect(screen.getByText("Episode 1")).toBeDefined();
  });

  it("renders ShortReelBreadcrumb with short-reels hash route and handles navigation", () => {
    const onNavigateHome = vi.fn();
    const onNavigateChannels = vi.fn();
    const onNavigateChannel = vi.fn();

    render(
      <ShortReelBreadcrumb
        channelName="Novy"
        channelId="novy_1"
        reelTitle="Top 5 Roman Legions"
        onNavigateHome={onNavigateHome}
        onNavigateChannels={onNavigateChannels}
        onNavigateChannel={onNavigateChannel}
      />,
    );

    const homeLink = screen.getByText("Dashboard");
    fireEvent.click(homeLink);
    expect(onNavigateHome).toHaveBeenCalled();

    const channelsLink = screen.getByText("Channels");
    fireEvent.click(channelsLink);
    expect(onNavigateChannels).toHaveBeenCalled();

    const channelLink = screen.getByText("Novy");
    expect(channelLink.closest("a")?.getAttribute("href")).toBe("#/channels/novy_1?tab=short-reels");
    fireEvent.click(channelLink);
    expect(onNavigateChannel).toHaveBeenCalled();

    expect(screen.getByText("Top 5 Roman Legions")).toBeDefined();
  });
});
