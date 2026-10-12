import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_DOMAIN_META,
  DOMAIN_TOPIC_PLAYLIST,
  YOUTUBE_PLAYLIST_KEYS,
  listAssignedPlaylistTitles,
  resolveYouTubePlaylistAssignment,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("youtube playlist catalog", () => {
  it("maps every canonical domain to a long-form topic playlist", () => {
    for (const domainId of Object.keys(CANONICAL_DOMAIN_META)) {
      assert.ok(DOMAIN_TOPIC_PLAYLIST[domainId], `missing playlist for ${domainId}`);
    }
  });

  it("stays within ten playlists", () => {
    assert.ok(YOUTUBE_PLAYLIST_KEYS.length <= 10);
  });
});

describe("resolveYouTubePlaylistAssignment", () => {
  it("assigns an episode to its topic playlist from the stored domain", () => {
    const assignment = resolveYouTubePlaylistAssignment({ contentKind: "episode", domainId: "space_earth", archetype: "deep_trivia" });
    assert.equal(assignment.primary?.key, "science_space_quiz");
    assert.deepEqual(assignment.secondary, []);
    assert.equal(assignment.domainSource, "stored");
  });

  it("adds Guess the Picture for picture-driven episodes", () => {
    const assignment = resolveYouTubePlaylistAssignment({ contentKind: "episode", domainId: "nature_animals", archetype: "mystery_reveal" });
    assert.deepEqual(listAssignedPlaylistTitles(assignment), ["Animal & Nature Quiz", "Guess the Picture"]);
  });

  it("infers the domain from the topic text when none is stored", () => {
    const assignment = resolveYouTubePlaylistAssignment({ contentKind: "episode", topicText: "Solar System Planets Quiz" });
    assert.equal(assignment.domainSource, "inferred");
    assert.equal(assignment.primary?.format, "long_form");
  });

  it("returns no primary playlist when an episode matches nothing", () => {
    const assignment = resolveYouTubePlaylistAssignment({ contentKind: "episode", topicText: "zzqx" });
    assert.equal(assignment.primary, null);
    assert.equal(assignment.domainSource, "none");
  });

  it("puts every Quiz Short in Quick Quiz Shorts plus its gameplay playlist", () => {
    const assignment = resolveYouTubePlaylistAssignment({ contentKind: "quiz_short", domainId: "space_earth", archetype: "verdict_yes_no" });
    assert.deepEqual(listAssignedPlaylistTitles(assignment), ["Quick Quiz Shorts", "True or False?"]);
  });

  it("routes Short Reels to their gameplay playlist first", () => {
    const versus = resolveYouTubePlaylistAssignment({ contentKind: "short_reel", archetype: "versus_faceoff" });
    const trivia = resolveYouTubePlaylistAssignment({ contentKind: "short_reel", archetype: "deep_trivia" });
    assert.equal(versus.primary?.key, "this_vs_that_shorts");
    assert.equal(trivia.primary?.key, "quick_quiz_shorts");
  });
});
