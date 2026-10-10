import { describe, expect, it } from "vitest";
import {
  createPublishingProfileDraft,
  hasPublishingProfileErrors,
  toPublishingProfilePayload,
  validatePublishingProfileDraft,
  type PublishingProfileDraft,
} from "./publishingProfileForm";

const draft = (overrides: Partial<PublishingProfileDraft> = {}): PublishingProfileDraft => ({
  channelUrl: "",
  aboutText: "",
  playlists: [],
  ...overrides,
});

describe("publishingProfileForm", () => {
  it("hydrates a draft from the saved profile", () => {
    let id = 0;
    const result = createPublishingProfileDraft(
      { channel_url: "https://www.youtube.com/@Quiz", about_text: "Hi", playlists: [{ title: "Space", url: "https://youtu.be/x" }] },
      () => `id-${(id += 1)}`,
    );
    expect(result).toEqual({
      channelUrl: "https://www.youtube.com/@Quiz",
      aboutText: "Hi",
      playlists: [{ id: "id-1", title: "Space", url: "https://youtu.be/x" }],
    });
  });

  it("accepts an empty profile and ignores blank playlist rows", () => {
    const empty = draft({ playlists: [{ id: "a", title: " ", url: "" }] });
    expect(hasPublishingProfileErrors(validatePublishingProfileDraft(empty))).toBe(false);
    expect(toPublishingProfilePayload(empty)).toEqual({ about_text: "", playlists: [] });
  });

  it("flags non-YouTube channel links and half-filled playlist rows", () => {
    const errors = validatePublishingProfileDraft(
      draft({
        channelUrl: "https://example.com/@Quiz",
        playlists: [
          { id: "ok", title: "Space", url: "https://www.youtube.com/playlist?list=PL1" },
          { id: "no-title", title: "", url: "https://www.youtube.com/playlist?list=PL2" },
          { id: "bad-url", title: "Animals", url: "https://vimeo.com/123" },
        ],
      }),
    );
    expect(errors).toEqual({ channelUrl: true, playlistIds: ["no-title", "bad-url"] });
  });

  it("trims values in the payload", () => {
    const payload = toPublishingProfilePayload(
      draft({
        channelUrl: " https://www.youtube.com/@Quiz ",
        aboutText: " Weekly quizzes ",
        playlists: [{ id: "a", title: " Space ", url: " https://youtu.be/x " }],
      }),
    );
    expect(payload).toEqual({
      channel_url: "https://www.youtube.com/@Quiz",
      about_text: "Weekly quizzes",
      playlists: [{ title: "Space", url: "https://youtu.be/x" }],
    });
  });
});
