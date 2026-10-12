import { describe, expect, it } from "vitest";
import { ChannelPublishingProfileSchema, UpdateChannelInputSchema, type Episode, type QuizV2 } from "@studio/shared";
import {
  assembleFullDescription,
  buildChannelFooter,
  buildTopicHashtag,
  enrichFallbackDescription,
  getDescriptionSectionLocale,
  matchPlaylistLink,
  normalizeHashtags,
  selectPlaylistLink,
  sanitizeYouTubeDescription,
  sanitizeYouTubeTags,
  truncateToYouTubeLimit,
} from "../src/quiz/description/index.js";
import { collectDescriptionTags } from "../src/tasks/export/descriptionExportFormatter.js";

const playlists = [
  { title: "Retro Gaming Quizzes", url: "https://www.youtube.com/playlist?list=PLretro" },
  { title: "Space & Planets", url: "https://www.youtube.com/playlist?list=PLspace" },
  { title: "Trivia Challenges", url: "https://www.youtube.com/playlist?list=PLgeneric" },
];

const profile = ChannelPublishingProfileSchema.parse({
  about_text: "New family-friendly quizzes every week.",
  playlists,
});

describe("ChannelPublishingProfileSchema", () => {
  it("accepts YouTube playlist links and rejects other hosts or plain http", () => {
    expect(UpdateChannelInputSchema.parse({ publishing_profile: profile }).publishing_profile?.playlists).toHaveLength(3);
    const playlistAt = (url: string) => ({ playlists: [{ title: "Space", url }] });
    expect(() => ChannelPublishingProfileSchema.parse(playlistAt("https://example.com/playlist?list=PL1"))).toThrow();
    expect(() => ChannelPublishingProfileSchema.parse(playlistAt("http://www.youtube.com/playlist?list=PL1"))).toThrow();
  });
});

describe("playlist selection", () => {
  it("matches on topic words and ignores generic quiz words", () => {
    expect(matchPlaylistLink(["Retro Gaming & Arcade Trivia"], playlists)?.url).toBe(playlists[0].url);
    expect(matchPlaylistLink(["Ocean Animals Trivia"], playlists)).toBeNull();
    expect(matchPlaylistLink(["Unknown", "Planets of the Solar System"], playlists)?.url).toBe(playlists[1].url);
  });

  it("falls back to the first configured playlist and returns null when none exist", () => {
    expect(selectPlaylistLink(["Ocean Animals"], playlists)?.url).toBe(playlists[0].url);
    expect(selectPlaylistLink(["Ocean Animals"], [])).toBeNull();
  });
});

describe("buildChannelFooter", () => {
  const labels = getDescriptionSectionLocale("en").footerLabels;

  it("renders the playlist and about lines without any subscribe link", () => {
    const footer = buildChannelFooter({ profile, channelName: "Quiz Master", categories: ["Retro Gaming"], labels });
    expect(footer).toBe(
      [
        "▶️ More quizzes like this: https://www.youtube.com/playlist?list=PLretro",
        "ℹ️ About Quiz Master: New family-friendly quizzes every week.",
      ].join("\n"),
    );
    expect(footer).not.toContain("sub_confirmation");
  });

  it("shows the first playlist when no playlist matches the topic", () => {
    const footer = buildChannelFooter({ profile, channelName: "QM", categories: ["Ocean Animals"], labels });
    expect(footer.split("\n")[0]).toBe("▶️ More quizzes like this: https://www.youtube.com/playlist?list=PLretro");
  });

  it("returns nothing for an unconfigured channel and skips missing parts", () => {
    expect(buildChannelFooter({ profile: undefined, channelName: "Quiz Master", categories: ["Retro"], labels })).toBe("");
    expect(buildChannelFooter({ profile: ChannelPublishingProfileSchema.parse({}), channelName: "QM", categories: [], labels })).toBe("");
    const aboutOnly = ChannelPublishingProfileSchema.parse({ about_text: "Hi" });
    expect(buildChannelFooter({ profile: aboutOnly, channelName: "QM", categories: ["Retro"], labels })).toBe("ℹ️ About QM: Hi");
  });

  it("is placed after the scoring section and the internal category is never printed", () => {
    const { fullText } = assembleFullDescription({
      hookLines: "Hook",
      semanticParagraph: "Paragraph",
      scoringCta: { beginner: "0–1 points: A", intermediate: "2 points: B", expert: "3 points: C", cta_text: "CTA" },
      suggestedPlaylistCategory: "Retro Gaming",
      hashtags: ["#quiz"],
      channelFooter: "▶️ More quizzes like this: https://www.youtube.com/playlist?list=PLretro",
    });
    expect(fullText).toBe(
      "Hook\n\nParagraph\n\n🏆 SCORING TIERS:\n• 0–1 points: A\n• 2 points: B\n• 3 points: C\n👉 CTA\n\n▶️ More quizzes like this: https://www.youtube.com/playlist?list=PLretro\n\n#quiz",
    );
  });
});

describe("YouTube sanitizer", () => {
  it("replaces angle brackets that the YouTube API rejects", () => {
    expect(sanitizeYouTubeDescription("Score <10> points -> win")).toBe("Score ‹10› points -› win");
  });

  it("keeps hashtags clickable and capped", () => {
    expect(normalizeHashtags(["#Pac-Man", "#Q&A", "#Rock 'n' Roll", "#pacman", "#KiếnThức"])).toEqual([
      "#PacMan",
      "#QA",
      "#RocknRoll",
      "#KiếnThức",
    ]);
    expect(normalizeHashtags(Array.from({ length: 14 }, (_, index) => `#tag${index}`))).toHaveLength(10);
  });

  it("truncates at a paragraph boundary when over the limit", () => {
    expect(truncateToYouTubeLimit("aaaa\n\nbbbb\n\ncccc", 12)).toBe("aaaa\n\nbbbb");
    expect(truncateToYouTubeLimit("short", 12)).toBe("short");
  });

  it("budgets tags to 500 characters and strips commas and brackets", () => {
    expect(sanitizeYouTubeTags(["retro, games", "<arcade>", "Retro Games", ""])).toEqual(["retro games", "arcade"]);
    const longTags = Array.from({ length: 40 }, (_, index) => `keyword number ${index}`);
    const budgeted = sanitizeYouTubeTags(longTags);
    const cost = budgeted.reduce((sum, tag) => sum + tag.length + 2, 0) + budgeted.length - 1;
    expect(cost).toBeLessThanOrEqual(500);
    expect(budgeted.length).toBeLessThan(longTags.length);
  });

  it("feeds export tags through the same budget", () => {
    expect(collectDescriptionTags(null)).toEqual([]);
  });
});

describe("enrichFallbackDescription", () => {
  const episode = { topic: { title: "Super Inventions", premise: "", hook: "Can you spot the odd machine?" } } as Episode;
  const quiz = {
    language: "English",
    questions: [
      { id: "q1", question: "Who invented the telephone?" },
      { id: "q2", question: "Which machine prints books" },
    ],
  } as unknown as QuizV2;
  const fallback = { semantic_paragraph: "Generic text.", hashtags: ["#quiz", "#trivia"], topic_category: "Super Inventions" };

  it("teases the episode's own questions and adds a topic hashtag", () => {
    const enriched = enrichFallbackDescription(fallback, { normLang: "en", episode, quiz });
    expect(enriched.semantic_paragraph).toBe(
      "Can you spot the odd machine? Inside this challenge: Who invented the telephone? Which machine prints books?",
    );
    expect(enriched.hashtags).toEqual(["#SuperInventions", "#quiz", "#trivia"]);
  });

  it("never mixes languages when no localization is applied", () => {
    const enriched = enrichFallbackDescription(fallback, { normLang: "de", episode, quiz });
    expect(enriched.semantic_paragraph).toBe("Generic text.");
    expect(enriched.hashtags).toEqual(["#quiz", "#trivia"]);
  });

  it("skips topic hashtags that would be too long", () => {
    expect(buildTopicHashtag("The Most Incredible Inventions Of The Modern World")).toBeNull();
    expect(buildTopicHashtag("Pac-Man Secrets")).toBe("#PacManSecrets");
  });
});
