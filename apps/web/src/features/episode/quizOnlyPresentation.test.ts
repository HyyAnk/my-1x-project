import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

describe("Quiz-only episode presentation", () => {
  it("has no channel-mode routing or alternate episode component", () => {
    const episodeView = read("../../components/EpisodeView.tsx");
    const channelSelector = read("../../components/chrome/topbar/ChannelSelector.tsx");

    expect(episodeView).not.toContain("channel.engine");
    expect(episodeView).not.toContain("channel.group_id");
    expect(channelSelector).not.toContain("ch.engine");
  });
});
