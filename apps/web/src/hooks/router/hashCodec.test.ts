import { describe, expect, it } from "vitest";
import { buildHash, parseHash } from "./hashCodec";

describe("hashCodec", () => {
  it("parses empty or #/ into dashboard page", () => {
    expect(parseHash("").page).toBe("dashboard");
    expect(parseHash("#").page).toBe("dashboard");
    expect(parseHash("#/").page).toBe("dashboard");
    expect(parseHash("#/dashboard").page).toBe("dashboard");
  });

  it("parses standalone pages correctly", () => {
    expect(parseHash("#/tasks").page).toBe("tasks");
    expect(parseHash("#/settings").page).toBe("settings");
    expect(parseHash("#/mascots").page).toBe("mascots");
    expect(parseHash("#/sandbox").page).toBe("sandbox");
  });

  it("parses question_bank and question-bank into question_bank page", () => {
    expect(parseHash("#/question_bank").page).toBe("question_bank");
    expect(parseHash("#/question-bank").page).toBe("question_bank");
    expect(parseHash("question_bank").page).toBe("question_bank");
  });

  it("parses channel and episode segments", () => {
    const route = parseHash("#/channels/ch-1/episodes/ep-1?tab=quiz");
    expect(route.page).toBe("channels");
    expect(route.channelId).toBe("ch-1");
    expect(route.episodeId).toBe("ep-1");
    expect(route.tab).toBe("quiz");
  });

  it("builds hash for question_bank and preserves query parameters", () => {
    const hash = buildHash({ page: "question_bank", tab: "preview" });
    expect(hash).toBe("#/question_bank?tab=preview");

    const parsed = parseHash(hash);
    expect(parsed.page).toBe("question_bank");
    expect(parsed.tab).toBe("preview");
  });
});
