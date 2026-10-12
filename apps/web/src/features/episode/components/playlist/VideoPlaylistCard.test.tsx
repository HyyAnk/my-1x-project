import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Channel } from "@studio/shared";
import { VideoPlaylistCard } from "./VideoPlaylistCard";

const channel = {
  channel_id: "ch-1",
  publishing_profile: {
    about_text: "",
    playlists: [{ title: "animal & nature quiz", url: "https://www.youtube.com/playlist?list=PL123" }],
  },
} as unknown as Channel;

describe("VideoPlaylistCard", () => {
  it("lists the primary and secondary playlists for a picture episode", () => {
    render(
      <VideoPlaylistCard channel={channel} input={{ contentKind: "episode", domainId: "nature_animals", archetype: "mystery_reveal" }} />,
    );

    expect(screen.getByText("Animal & Nature Quiz")).toBeTruthy();
    expect(screen.getByText("Guess the Picture")).toBeTruthy();
    expect(screen.getByText("Primary")).toBeTruthy();
    expect(screen.getByTitle("Open playlist on YouTube").getAttribute("href")).toBe("https://www.youtube.com/playlist?list=PL123");
  });

  it("assigns Quiz Shorts to the Shorts playlists", () => {
    render(<VideoPlaylistCard channel={channel} input={{ contentKind: "quiz_short", archetype: "versus_faceoff" }} />);

    expect(screen.getByText("Quick Quiz Shorts")).toBeTruthy();
    expect(screen.getByText("This vs That")).toBeTruthy();
  });

  it("asks for a manual pick when an episode matches no topic", () => {
    render(<VideoPlaylistCard channel={channel} input={{ contentKind: "episode", topicText: "zzqx" }} />);

    expect(screen.getByText(/Pick a topic playlist manually/)).toBeTruthy();
  });
});
