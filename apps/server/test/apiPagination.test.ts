import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PaginatedEpisodesResponse, PaginatedShortReelsResponse } from "@studio/shared";
import {
  createPaginationTestFixture,
  seedTestEpisodes,
  seedTestShortReels,
  type PaginationFixture,
} from "./helpers/apiPaginationFixture.js";

describe("API Pagination & Filtering Integration", () => {
  let fixture: PaginationFixture;

  beforeEach(async () => {
    fixture = await createPaginationTestFixture();
    await seedTestEpisodes(fixture);
    await seedTestShortReels(fixture);
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  describe("Episode Pagination & Filtering", () => {
    it("slices episodes into multiple pages with limit and offset", async () => {
      const channelId = fixture.channel.channel_id;

      const resPage1 = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?page=1&limit=2`,
      });
      expect(resPage1.statusCode).toBe(200);
      const dataPage1 = resPage1.json<PaginatedEpisodesResponse>();
      expect(dataPage1.episodes.length).toBe(2);
      expect(dataPage1.total).toBe(5);
      expect(dataPage1.page).toBe(1);
      expect(dataPage1.limit).toBe(2);
      expect(dataPage1.total_pages).toBe(3);

      const resPage2 = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?page=2&limit=2`,
      });
      const dataPage2 = resPage2.json<PaginatedEpisodesResponse>();
      expect(dataPage2.episodes.length).toBe(2);
      expect(dataPage2.page).toBe(2);

      // Verify no overlap between page 1 and page 2
      const idsPage1 = dataPage1.episodes.map((e) => e.episode_id);
      const idsPage2 = dataPage2.episodes.map((e) => e.episode_id);
      expect(idsPage1.some((id) => idsPage2.includes(id))).toBe(false);

      const resPage3 = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?page=3&limit=2`,
      });
      const dataPage3 = resPage3.json<PaginatedEpisodesResponse>();
      expect(dataPage3.episodes.length).toBe(1);

      const resPage4 = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?page=4&limit=2`,
      });
      const dataPage4 = resPage4.json<PaginatedEpisodesResponse>();
      expect(dataPage4.episodes.length).toBe(0);
      expect(dataPage4.total).toBe(5);
    });

    it("filters episodes by search query matching topic title", async () => {
      const channelId = fixture.channel.channel_id;

      const res = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?search=ocean`,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json<PaginatedEpisodesResponse>();
      expect(data.episodes.length).toBe(1);
      expect(data.episodes[0].episode_id).toBe("ep_03");
      expect(data.total).toBe(1);
    });

    it("filters episodes by stage status", async () => {
      const channelId = fixture.channel.channel_id;

      const res = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?status=script`,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json<PaginatedEpisodesResponse>();
      expect(data.episodes.length).toBe(2);
      expect(data.total).toBe(2);
      expect(data.episodes.every((e) => e.stage === "SCRIPT")).toBe(true);
    });

    it("sorts episodes by title and timestamps", async () => {
      const channelId = fixture.channel.channel_id;

      const resTitleAsc = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?sort=title_asc`,
      });
      const titles = resTitleAsc.json<PaginatedEpisodesResponse>().episodes.map((e) => ("title" in e ? e.title : e.topic.title));
      expect(titles[0]).toBe("Ancient Egyptian Pyramids");
      expect(titles[titles.length - 1]).toBe("Volcanoes and Magma Chambers");

      const resCreatedAsc = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?sort=created_asc`,
      });
      const idsCreatedAsc = resCreatedAsc.json<PaginatedEpisodesResponse>().episodes.map((e) => e.episode_id);
      expect(idsCreatedAsc).toEqual(["ep_01", "ep_02", "ep_03", "ep_04", "ep_05"]);
    });

    it("preserves backward compatibility when no pagination params are provided", async () => {
      const channelId = fixture.channel.channel_id;

      const res = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes`,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json<PaginatedEpisodesResponse>();
      expect(Array.isArray(data.episodes)).toBe(true);
      expect(data.episodes.length).toBe(5);
      expect(data.total).toBe(5);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(5);
      expect(data.total_pages).toBe(1);
    });

    it("returns lightweight metadata projections when requested", async () => {
      const channelId = fixture.channel.channel_id;

      const res = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?projection=lightweight`,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json<PaginatedEpisodesResponse>();
      expect(data.episodes.length).toBe(5);
      const item = data.episodes[0];
      expect(item).toHaveProperty("episode_id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("stage");
      expect(item).not.toHaveProperty("scene_plan_path");
    });
  });

  describe("Short-Reel Pagination & Filtering", () => {
    it("slices short-reels into pages and filters by search query", async () => {
      const channelId = fixture.channel.channel_id;

      const resPaged = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/short-reels?page=1&limit=2`,
      });
      expect(resPaged.statusCode).toBe(200);
      const pagedData = resPaged.json<PaginatedShortReelsResponse>();
      expect(pagedData.short_reels.length).toBe(2);
      expect(pagedData.total).toBe(4);
      expect(pagedData.total_pages).toBe(2);

      const resSearch = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/short-reels?search=Cheetah`,
      });
      const searchData = resSearch.json<PaginatedShortReelsResponse>();
      expect(searchData.short_reels.length).toBe(1);
      expect(searchData.short_reels[0].reel_id).toBe("sreel_01");
    });

    it("sorts short-reels and filters by status", async () => {
      const channelId = fixture.channel.channel_id;

      const resSort = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/short-reels?sort=title_asc`,
      });
      const titles = resSort.json<PaginatedShortReelsResponse>().short_reels.map((r) => ("title" in r ? r.title : r.topic.title));
      expect(titles[0]).toBe("Ant Colony Megastructure");

      const resStatus = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/short-reels?status=ready`,
      });
      const statusData = resStatus.json<PaginatedShortReelsResponse>();
      expect(statusData.short_reels.length).toBe(2);
      expect(statusData.total).toBe(2);
    });

    it("preserves backward compatibility and supports lightweight projection for short-reels", async () => {
      const channelId = fixture.channel.channel_id;

      const resPlain = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/short-reels`,
      });
      expect(resPlain.statusCode).toBe(200);
      const plainData = resPlain.json<PaginatedShortReelsResponse>();
      expect(Array.isArray(plainData.short_reels)).toBe(true);
      expect(plainData.short_reels.length).toBe(4);
      expect(plainData.total).toBe(4);
      expect(plainData.page).toBe(1);
      expect(plainData.limit).toBe(4);
      expect(plainData.total_pages).toBe(1);

      const resLight = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/short-reels?projection=lightweight`,
      });
      const lightData = resLight.json<PaginatedShortReelsResponse>();
      expect(lightData.short_reels.length).toBe(4);
      const first = lightData.short_reels[0];
      expect(first).toHaveProperty("reel_id");
      expect(first).toHaveProperty("title");
      expect(first).not.toHaveProperty("source");
    });
  });

  describe("Validation & Error Handling", () => {
    it("rejects invalid page and limit values with HTTP 400", async () => {
      const channelId = fixture.channel.channel_id;

      const resBadPage = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/episodes?page=0`,
      });
      expect(resBadPage.statusCode).toBe(400);

      const resBadLimit = await fixture.app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/short-reels?limit=0`,
      });
      expect(resBadLimit.statusCode).toBe(400);
    });
  });
});
