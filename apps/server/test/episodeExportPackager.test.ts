import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EpisodeExportMetadataSchema, ExportsManifestSchema, type VideoDescription } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { formatExportDescriptionText } from "../src/tasks/export/descriptionExportFormatter.js";
import { packageEpisodeExport } from "../src/tasks/export/episodeExportPackager.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Episode Export Packaging", () => {
  describe("descriptionExportFormatter", () => {
    it("formats title, description, hashtags, keywords, and category", () => {
      const desc: VideoDescription = {
        topic_category: "Gaming",
        primary_keyword: "retro gaming",
        keyword_variations: ["arcade classics", "quiz"],
        question_count: 3,
        hook_lines: "Hook line",
        semantic_paragraph: "Semantic paragraph",
        scoring_cta: {
          beginner: "1 pt",
          intermediate: "2 pts",
          expert: "3 pts",
          cta_text: "Share your score!",
        },
        suggested_playlist_category: "Retro Gaming",
        hashtags: ["#Retro", "#Gaming"],
        full_description_text: "Full description body here.",
        char_count: 100,
        language: "en",
        generated_at: new Date().toISOString(),
      };

      const result = formatExportDescriptionText({
        title: "Arcade Showdown",
        description: desc,
      });

      expect(result).toContain("[TITLE]\nArcade Showdown");
      expect(result).toContain("[DESCRIPTION]\nFull description body here.");
      expect(result).toContain("[HASHTAGS]\n#Retro #Gaming");
      expect(result).toContain("[TAGS / KEYWORDS]\nretro gaming, arcade classics, quiz");
      expect(result).toContain("[CATEGORY]\nRetro Gaming");
    });

    it("falls back gracefully when only fallbackText is available", () => {
      const result = formatExportDescriptionText({
        title: "Simple Title",
        fallbackText: "Fallback text from description.md",
      });

      expect(result).toContain("[TITLE]\nSimple Title");
      expect(result).toContain("[DESCRIPTION]\nFallback text from description.md");
      expect(result).not.toContain("[HASHTAGS]");
      expect(result).not.toContain("[CATEGORY]");
    });
  });

  describe("packageEpisodeExport end-to-end", () => {
    it("creates export package with video, description, thumbnails, and metadata", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "export-pkg-"));
      roots.push(root);

      await mkdir(path.join(root, "templates"), { recursive: true });
      await Promise.all([
        writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
        writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
      ]);

      const app = await buildApp(root, { revealFile: () => Promise.resolve() });
      try {
        const channel = await app.repository.createChannel({
          name: "Export Channel",
          description: "Test channel",
          target_audience: "Gamers",
          language: "English",
          market: "US",
          dna_mode: "example",
        });

        const topics = [
          {
            topic_id: "topic-export-1",
            channel_id: channel.channel_id,
            content_kind: "episode" as const,
            title: "Export Episode 1",
            premise: "Premise",
            why_it_fits: "Fits",
            hook: "Hook",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
          },
        ];
        await app.repository.saveTopicRun(channel.channel_id, topics);
        const episode = await app.repository.confirmTopic(channel.channel_id, topics[0].topic_id);

        // Mock video asset
        const fakeVideo = new Uint8Array([1, 2, 3, 4, 5]);
        await app.repository.writeVideoArtifact(channel.channel_id, episode.episode_id, fakeVideo);

        // Mock active thumbnail
        const assetsDir = app.repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
        const fakeThumb = Buffer.from("fake-thumbnail-content");
        await writeFile(path.join(assetsDir, "thumbnail_16_9.jpg"), fakeThumb);

        // Mock variant thumbnail
        const thumbsDir = path.join(assetsDir, "thumbnails");
        await mkdir(thumbsDir, { recursive: true });
        await writeFile(path.join(thumbsDir, "thumb_alt_1.jpg"), Buffer.from("fake-alt-thumb"));

        // Mock video description
        const videoDesc: VideoDescription = {
          topic_category: "Retro",
          primary_keyword: "arcade",
          keyword_variations: ["gaming"],
          question_count: 3,
          hook_lines: "Hook",
          semantic_paragraph: "Semantic",
          scoring_cta: {
            beginner: "1",
            intermediate: "2",
            expert: "3",
            cta_text: "Comment!",
          },
          suggested_playlist_category: "Games",
          hashtags: ["#Arcade"],
          full_description_text: "Put your knowledge to the test!",
          char_count: 50,
          language: "en",
          generated_at: new Date().toISOString(),
        };
        await app.repository.writeVideoDescription(channel.channel_id, episode.episode_id, videoDesc);

        // Execute export packager
        const result = await packageEpisodeExport({
          repository: app.repository,
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
          duration: 120.5,
        });

        expect(result.exportDirectory).toContain("export");
        expect(result.metadata.title).toBe("Export Episode 1");
        expect(result.metadata.status).toBe("ready");
        expect(result.metadata.duration_seconds).toBe(120.5);
        expect(result.metadata.primary_thumbnail).toBe("thumbnails/thumbnail_default.jpg");
        expect(result.metadata.available_thumbnails).toContain("thumbnails/thumbnail_default.jpg");
        expect(result.metadata.available_thumbnails).toContain("thumbnails/thumb_alt_1.jpg");

        // Verify files on disk
        const exportVideoPath = path.join(result.exportDirectory, "quiz-video.mp4");
        const videoBytes = await readFile(exportVideoPath);
        expect(videoBytes).toEqual(Buffer.from(fakeVideo));

        const descPath = path.join(result.exportDirectory, "description.txt");
        const descContent = await readFile(descPath, "utf8");
        expect(descContent).toContain("[TITLE]\nExport Episode 1");
        expect(descContent).toContain("Put your knowledge to the test!");
        expect(descContent).toContain("#Arcade");

        const metaPath = path.join(result.exportDirectory, "metadata.json");
        const metaRaw = JSON.parse(await readFile(metaPath, "utf8"));
        const parsedMeta = EpisodeExportMetadataSchema.parse(metaRaw);
        expect(parsedMeta.episode_slug).toBe(episode.slug);

        const defaultThumb = await readFile(path.join(result.exportDirectory, "thumbnails", "thumbnail_default.jpg"));
        expect(defaultThumb).toEqual(fakeThumb);

        // Verify channel exports_manifest.json
        const channelManifestPath = app.repository.resolvePath("channels", channel.slug, "exports_manifest.json");
        const manifestRaw = JSON.parse(await readFile(channelManifestPath, "utf8"));
        const parsedManifest = ExportsManifestSchema.parse(manifestRaw);
        expect(parsedManifest.channel_slug).toBe(channel.slug);
        expect(parsedManifest.episodes).toHaveLength(1);
        expect(parsedManifest.episodes[0].episode_slug).toBe(episode.slug);
      } finally {
        await app.close();
      }
    });

    it("route /video/open-folder prioritizes export folder if present", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "export-open-folder-"));
      roots.push(root);

      await mkdir(path.join(root, "templates"), { recursive: true });
      await Promise.all([
        writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
        writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
      ]);

      const revealed: string[] = [];
      const app = await buildApp(root, {
        revealFile: (filePath) => {
          revealed.push(filePath);
          return Promise.resolve();
        },
      });

      try {
        const channel = await app.repository.createChannel({
          name: "Open Folder Test",
          description: "",
          target_audience: "",
          language: "English",
          market: "",
          dna_mode: "example",
        });
        const topics = [
          {
            topic_id: "topic-1",
            channel_id: channel.channel_id,
            content_kind: "episode" as const,
            title: "Episode Open Folder",
            premise: "Test premise",
            why_it_fits: "Test fit",
            hook: "Test hook",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
          },
        ];
        await app.repository.saveTopicRun(channel.channel_id, topics);
        const episode = await app.repository.confirmTopic(channel.channel_id, topics[0].topic_id);

        await app.repository.writeVideoArtifact(channel.channel_id, episode.episode_id, new Uint8Array([1, 2, 3]));

        // Package export
        await packageEpisodeExport({
          repository: app.repository,
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
        });

        const res = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/video/open-folder`,
          payload: {},
        });

        expect(res.statusCode).toBe(200);
        const body = res.json<{ opened: boolean; folder_path: string }>();
        expect(body.opened).toBe(true);
        expect(body.folder_path).toMatch(/\/export$/);
        expect(revealed[0]).toMatch(/export[\\/]quiz-video\.mp4$/);

        // Test GET /export
        const exportGetRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/export`,
        });
        expect(exportGetRes.statusCode).toBe(200);
        const exportGetBody = exportGetRes.json<{ exported: boolean; metadata: { status: string } }>();
        expect(exportGetBody.exported).toBe(true);
        expect(exportGetBody.metadata.status).toBe("ready");
      } finally {
        await app.close();
      }
    });
  });
});
