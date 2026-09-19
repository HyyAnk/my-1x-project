import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp, type StudioApp } from "../src/app.js";
import {
  type MascotProfile,
  type UploadMascotConceptResponse,
  UploadMascotConceptResponseSchema,
} from "@studio/shared";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createTestApp(): Promise<{ app: StudioApp; root: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-upload-test-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  const app = await buildApp(root);
  return { app, root };
}

async function createSamplePngBase64(): Promise<string> {
  const buffer = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 40, g: 120, b: 240, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  return buffer.toString("base64");
}

async function createSampleJpegBase64(): Promise<string> {
  const buffer = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 240, g: 60, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();
  return buffer.toString("base64");
}

async function createSampleWebpBase64(): Promise<string> {
  const buffer = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 60, g: 200, b: 100, alpha: 1 },
    },
  })
    .webp()
    .toBuffer();
  return buffer.toString("base64");
}

describe("Mascot Master Concept Upload Pipeline", () => {
  it("updates an existing mascot master concept and synchronizes Core Style and render bundle", async () => {
    const { app } = await createTestApp();
    try {
      const createRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots",
        payload: {
          name: "Pixel Fox",
          description: "A nimble gaming fox",
          visual_style: "flat_vector",
          color_theme: "#f97316",
        },
      });
      expect(createRes.statusCode).toBe(201);
      const mascot = createRes.json<{ mascot: MascotProfile }>().mascot;

      const rawBase64 = await createSamplePngBase64();
      const uploadRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/upload-concept`,
        payload: {
          image_data: `data:image/png;base64,${rawBase64}`,
          name: "Pixel Fox Mastered",
          description: "Updated description for fox",
          color_theme: "#3b82f6",
          visual_style: "pixar_3d",
          auto_matting: true,
        },
      });

      expect(uploadRes.statusCode).toBe(200);
      const data = uploadRes.json<UploadMascotConceptResponse>();
      const parsed = UploadMascotConceptResponseSchema.parse(data);

      expect(parsed.mascot.id).toBe(mascot.id);
      expect(parsed.mascot.name).toBe("Pixel Fox Mastered");
      expect(parsed.mascot.description).toBe("Updated description for fox");
      expect(parsed.mascot.color_theme).toBe("#3b82f6");
      expect(parsed.mascot.visual_style).toBe("pixar_3d");
      expect(parsed.mascot.concept_origin).toBe("user_uploaded");

      expect(parsed.master_image_url).toMatch(new RegExp(`^/api/mascots/${mascot.id}/assets/master_concept_\\d+\\.png$`));
      expect(parsed.master_raw_image_url).toMatch(new RegExp(`^/api/mascots/${mascot.id}/assets/master_concept_raw_\\d+\\.png$`));
      expect(parsed.mascot.master_image_url).toBe(parsed.master_image_url);
      expect(parsed.mascot.master_raw_image_url).toBe(parsed.master_raw_image_url);

      const coreStyle = (parsed.mascot.styles || []).find((s) => s.id === "core" || s.is_default);
      expect(coreStyle).toBeDefined();
      expect(coreStyle?.anchor_image_url).toBe(parsed.master_image_url);
      expect(coreStyle?.raw_anchor_image_url).toBe(parsed.master_raw_image_url);

      if (parsed.mascot.render_bundle?.assets.master) {
        expect(parsed.mascot.render_bundle.assets.master.image_url).toBe(parsed.master_image_url);
      }

      // Re-fetch from repository to ensure persistence
      const persisted = await app.repository.getMascot(mascot.id);
      expect(persisted.concept_origin).toBe("user_uploaded");
      expect(persisted.master_image_url).toBe(parsed.master_image_url);
      expect(persisted.master_raw_image_url).toBe(parsed.master_raw_image_url);
    } finally {
      await app.close();
    }
  });

  it("creates a brand new mascot profile directly from an uploaded concept", async () => {
    const { app } = await createTestApp();
    try {
      const rawBase64 = await createSamplePngBase64();
      const uploadRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/upload-concept",
        payload: {
          image_data: rawBase64,
          name: "Cosmic Penguin",
          description: "An astronaut penguin exploring space",
          color_theme: "#6366f1",
          visual_style: "kawaii_chibi",
          auto_matting: false,
        },
      });

      expect(uploadRes.statusCode).toBe(201);
      const data = uploadRes.json<UploadMascotConceptResponse>();
      const parsed = UploadMascotConceptResponseSchema.parse(data);

      expect(parsed.mascot.id).toBeDefined();
      expect(parsed.mascot.name).toBe("Cosmic Penguin");
      expect(parsed.mascot.description).toBe("An astronaut penguin exploring space");
      expect(parsed.mascot.color_theme).toBe("#6366f1");
      expect(parsed.mascot.visual_style).toBe("kawaii_chibi");
      expect(parsed.mascot.concept_origin).toBe("user_uploaded");
      expect(parsed.master_image_url).toBeDefined();
      expect(parsed.master_raw_image_url).toBeDefined();

      const coreStyle = (parsed.mascot.styles || []).find((s) => s.id === "core" || s.is_default);
      expect(coreStyle).toBeDefined();
      expect(coreStyle?.anchor_image_url).toBe(parsed.master_image_url);
      expect(coreStyle?.raw_anchor_image_url).toBe(parsed.master_raw_image_url);

      const fetched = await app.repository.getMascot(parsed.mascot.id);
      expect(fetched.name).toBe("Cosmic Penguin");
      expect(fetched.concept_origin).toBe("user_uploaded");
    } finally {
      await app.close();
    }
  });

  it("defaults mascot name to 'Custom Mascot' when creating without explicit name", async () => {
    const { app } = await createTestApp();
    try {
      const rawBase64 = await createSamplePngBase64();
      const uploadRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/upload-concept",
        payload: {
          image_data: `data:image/png;base64,${rawBase64}`,
        },
      });

      expect(uploadRes.statusCode).toBe(201);
      const data = uploadRes.json<UploadMascotConceptResponse>();
      expect(data.mascot.name).toBe("Custom Mascot");
      expect(data.mascot.concept_origin).toBe("user_uploaded");
      expect(data.extracted_color).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it("accepts JPEG and WEBP format uploads and normalizes them into PNG assets", async () => {
    const { app } = await createTestApp();
    try {
      const jpegBase64 = await createSampleJpegBase64();
      const jpegRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/upload-concept",
        payload: {
          image_data: `data:image/jpeg;base64,${jpegBase64}`,
          name: "Jpeg Mascot",
          mime_type: "image/jpeg",
        },
      });
      expect(jpegRes.statusCode).toBe(201);
      const jpegData = jpegRes.json<UploadMascotConceptResponse>();
      expect(jpegData.master_image_url.endsWith(".png")).toBe(true);
      expect(jpegData.master_raw_image_url?.endsWith(".png")).toBe(true);

      const webpBase64 = await createSampleWebpBase64();
      const webpRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/upload-concept",
        payload: {
          image_data: `data:image/webp;base64,${webpBase64}`,
          name: "Webp Mascot",
          mime_type: "image/webp",
        },
      });
      expect(webpRes.statusCode).toBe(201);
      const webpData = webpRes.json<UploadMascotConceptResponse>();
      expect(webpData.master_image_url.endsWith(".png")).toBe(true);
      expect(webpData.master_raw_image_url?.endsWith(".png")).toBe(true);
    } finally {
      await app.close();
    }
  });

  it("cleans up previous master assets upon subsequent uploads", async () => {
    const { app } = await createTestApp();
    try {
      const sampleBase64 = await createSamplePngBase64();
      const firstRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/upload-concept",
        payload: {
          image_data: sampleBase64,
          name: "Replaceable Mascot",
        },
      });
      expect(firstRes.statusCode).toBe(201);
      const firstData = firstRes.json<UploadMascotConceptResponse>();
      const firstMasterFilename = firstData.master_image_url.split("/").pop();
      expect(firstMasterFilename).toBeDefined();

      const initialAssets = await app.repository.listMascotAssets(firstData.mascot.id);
      expect(initialAssets).toContain(firstMasterFilename);

      const secondRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${firstData.mascot.id}/upload-concept`,
        payload: {
          image_data: sampleBase64,
        },
      });
      expect(secondRes.statusCode).toBe(200);
      const secondData = secondRes.json<UploadMascotConceptResponse>();
      const secondMasterFilename = secondData.master_image_url.split("/").pop();

      expect(secondMasterFilename).not.toBe(firstMasterFilename);
      const updatedAssets = await app.repository.listMascotAssets(firstData.mascot.id);
      expect(updatedAssets).toContain(secondMasterFilename);
      expect(updatedAssets).not.toContain(firstMasterFilename);
    } finally {
      await app.close();
    }
  });

  it("rejects invalid base64, corrupt image bytes, and unsupported payloads with 400", async () => {
    const { app } = await createTestApp();
    try {
      // 1. Corrupt base64 string
      const invalidBase64Res = await app.server.inject({
        method: "POST",
        url: "/api/mascots/upload-concept",
        payload: {
          image_data: "!@#$%^&*()_not_valid_base64",
        },
      });
      expect(invalidBase64Res.statusCode).toBe(400);

      // 2. Valid base64 but non-image bytes (plain text)
      const plainTextBase64 = Buffer.from("Hello world, this is a plain text file not an image").toString("base64");
      const nonImageRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/upload-concept",
        payload: {
          image_data: plainTextBase64,
        },
      });
      expect(nonImageRes.statusCode).toBe(400);

      // 3. Truncated magic bytes
      const truncatedBase64 = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");
      const truncatedRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/upload-concept",
        payload: {
          image_data: truncatedBase64,
        },
      });
      expect(truncatedRes.statusCode).toBe(400);

      // 4. Empty image data
      const emptyRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/upload-concept",
        payload: {
          image_data: "",
        },
      });
      expect(emptyRes.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("returns 404 when uploading to a non-existent mascot ID", async () => {
    const { app } = await createTestApp();
    try {
      const sampleBase64 = await createSamplePngBase64();
      const notFoundRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/non_existent_mascot_id/upload-concept",
        payload: {
          image_data: sampleBase64,
        },
      });
      expect(notFoundRes.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
