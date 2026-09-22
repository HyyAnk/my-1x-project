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

  it("supports short-reels tab via query param and path segment", () => {
    const fromQuery = parseHash("#/channels/ch-1?tab=short-reels");
    expect(fromQuery.page).toBe("channels");
    expect(fromQuery.channelId).toBe("ch-1");
    expect(fromQuery.tab).toBe("short-reels");

    const fromPath = parseHash("#/channels/ch-1/short-reels");
    expect(fromPath.page).toBe("channels");
    expect(fromPath.channelId).toBe("ch-1");
    expect(fromPath.tab).toBe("short-reels");
    expect(fromPath.shortReelId).toBeNull();

    const built = buildHash({ page: "channels", channelId: "ch-1", tab: "short-reels" });
    expect(built).toBe("#/channels/ch-1?tab=short-reels");
  });

  it("parses and builds mascot routes with mascotId and step", () => {
    const libraryRoute = parseHash("#/mascots");
    expect(libraryRoute.page).toBe("mascots");
    expect(libraryRoute.mascotId).toBeNull();
    expect(libraryRoute.step).toBeNull();
    expect(libraryRoute.tab).toBe("library");

    const newMascotRoute = parseHash("#/mascots/new");
    expect(newMascotRoute.page).toBe("mascots");
    expect(newMascotRoute.mascotId).toBe("new");
    expect(newMascotRoute.step).toBeNull();
    expect(newMascotRoute.tab).toBe("generator");

    const specificMascotRoute = parseHash("#/mascots/mascot-123?step=2");
    expect(specificMascotRoute.page).toBe("mascots");
    expect(specificMascotRoute.mascotId).toBe("mascot-123");
    expect(specificMascotRoute.step).toBe(2);
    expect(specificMascotRoute.tab).toBe("generator");

    const legacyQueryRoute = parseHash("#/mascots?tab=generator&mascotId=mascot-123&step=3");
    expect(legacyQueryRoute.page).toBe("mascots");
    expect(legacyQueryRoute.mascotId).toBe("mascot-123");
    expect(legacyQueryRoute.step).toBe(3);
    expect(legacyQueryRoute.tab).toBe("generator");

    expect(buildHash({ page: "mascots", mascotId: "mascot-123", step: 4 })).toBe("#/mascots/mascot-123?step=4");
    expect(buildHash({ page: "mascots", mascotId: "new" })).toBe("#/mascots/new");
  });

  it("parses and builds brand_assets routes with optional channelId and tabs", () => {
    const rootRoute = parseHash("#/brand_assets");
    expect(rootRoute.page).toBe("brand_assets");
    expect(rootRoute.channelId).toBeNull();

    const hyphenRoute = parseHash("#/brand-assets");
    expect(hyphenRoute.page).toBe("brand_assets");
    expect(hyphenRoute.channelId).toBeNull();

    const segmentRoute = parseHash("#/brand_assets/ch-1");
    expect(segmentRoute.page).toBe("brand_assets");
    expect(segmentRoute.channelId).toBe("ch-1");

    const queryRoute = parseHash("#/brand_assets?channelId=ch-2&tab=social");
    expect(queryRoute.page).toBe("brand_assets");
    expect(queryRoute.channelId).toBe("ch-2");
    expect(queryRoute.tab).toBe("social");

    expect(buildHash({ page: "brand_assets" })).toBe("#/brand_assets");
    expect(buildHash({ page: "brand_assets", channelId: "ch-1" })).toBe("#/brand_assets/ch-1");
    expect(buildHash({ page: "brand_assets", channelId: "ch-1", tab: "art" })).toBe("#/brand_assets/ch-1?tab=art");
  });

  it("round-trips workspace tabs for every routed area", () => {
    const routes = [
      ["#/tasks?tab=failed", "tasks", "failed"],
      ["#/settings?tab=media", "settings", "media"],
      ["#/mascots?tab=generator", "mascots", "generator"],
      ["#/sandbox?tab=transition", "sandbox", "transition"],
      ["#/question_bank?tab=details", "question_bank", "details"],
      ["#/channels/ch-1/short-reels/reel-1?tab=publishing", "channels", "publishing"],
      ["#/brand_assets?tab=art", "brand_assets", "art"],
    ] as const;

    for (const [hash, page, tab] of routes) {
      const parsed = parseHash(hash);
      expect(parsed.page).toBe(page);
      expect(parsed.tab).toBe(tab);
      expect(buildHash(parsed)).toBe(hash);
    }
  });
});
