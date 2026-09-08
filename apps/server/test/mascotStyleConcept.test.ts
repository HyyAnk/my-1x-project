import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, MascotProfile } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { generateMascotStyleConcept } from "../src/quiz/mascot/artGenerator.js";
import { validateMascotPromptContract } from "../src/quiz/mascotPromptContract.js";
import type { RepositoryService } from "../src/repository.js";

const testImageConfig: AppConfig["image_generation"] = {
  enabled: false,
  provider: "shopaikey",
  model: "gpt-image-2",
  api_key: "",
};

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Mascot Style Concept Generation", () => {
  describe("with mocked repository", () => {
    it("generates style concept with mocked repository and mock imageConfig, verifying prompt and URLs", async () => {
      const mockMascot: MascotProfile = {
        id: "mascot_mock_1",
        name: "Shadow Fox",
        description: "A nimble mystic fox companion",
        visual_style: "pixar_3d",
        master_prompt: "Mystic shadow fox with glowing purple tail",
        color_theme: "#8b5cf6",
        master_image_url: "/api/mascots/mascot_mock_1/assets/master.png",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        actions: {},
        styles: [
          {
            id: "style_cyber_ninja",
            name: "Cyber Ninja",
            keyword: "sleek nano armor dual katanas neon visor",
            is_default: false,
            anchor_image_url: null,
            states: { thinking: [], celebrate: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };

      const savedAssets: Array<{ mascotId: string; filename: string; content: Uint8Array }> = [];
      let savedMascotProfile: MascotProfile | null = null;
      const saveMascotAsset = vi.fn((mascotId: string, filename: string, content: Uint8Array) => {
        savedAssets.push({ mascotId, filename, content });
        return `/api/mascots/${mascotId}/assets/${filename}`;
      });

      const mockRepository = {
        getMascotAssetFile: vi.fn().mockRejectedValue(new Error("File not found")),
        saveMascotAsset,
        getMascot: vi.fn().mockResolvedValue(mockMascot),
        saveMascot: vi.fn().mockImplementation((profile: MascotProfile) => {
          savedMascotProfile = profile;
          return profile;
        }),
        deleteMascotAssetFile: vi.fn().mockResolvedValue(undefined),
      } as unknown as RepositoryService;

      const result = await generateMascotStyleConcept(mockRepository, mockMascot, "style_cyber_ninja", testImageConfig);

      // Verify prompt construction and contract
      expect(result.prompt_used).toContain("@1");
      expect(result.prompt_used).toContain('Strictly preserve character identity from @1 for "Shadow Fox"');
      expect(result.prompt_used).toContain(
        "Theme & Costume: Styled in authentic sleek nano armor dual katanas neon visor attire, costume, and accessories.",
      );
      expect(result.prompt_used).toContain('Full-body single character concept illustration of "Shadow Fox" dressed in Cyber Ninja style.');
      expect(result.prompt_used).toContain("floating character");
      expect(result.prompt_used).toContain("no ground shadow");
      expect(validateMascotPromptContract(result.prompt_used, false)).toBe(true);

      // Verify returned URLs and fallback status
      expect(result.placeholder).toBe(true);
      expect(result.anchor_image_url).toMatch(/^\/api\/mascots\/mascot_mock_1\/assets\/style_style_cyber_ninja_anchor_\d+\.png$/);
      expect(result.raw_image_url).toMatch(/^\/api\/mascots\/mascot_mock_1\/assets\/style_style_cyber_ninja_anchor_raw_\d+\.png$/);

      // Verify assets were saved through repository
      expect(saveMascotAsset).toHaveBeenCalledTimes(2);
      expect(savedAssets.length).toBe(2);
      expect(savedAssets[0]?.filename).toContain("_anchor_");
      expect(savedAssets[1]?.filename).toContain("_anchor_raw_");

      // Verify style's anchor_image_url was updated on the saved mascot profile
      expect(savedMascotProfile).not.toBeNull();
      const updatedStyle = (savedMascotProfile as unknown as MascotProfile)?.styles?.find((s) => s.id === "style_cyber_ninja");
      expect(updatedStyle?.anchor_image_url).toBe(result.anchor_image_url);
    });

    it("throws error when styleId is not found on the mascot", async () => {
      const mockMascot: MascotProfile = {
        id: "mascot_mock_2",
        name: "Rusty",
        visual_style: "flat_vector",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        actions: {},
        styles: [],
      };

      const mockRepository = {} as RepositoryService;

      await expect(generateMascotStyleConcept(mockRepository, mockMascot, "missing_style", testImageConfig)).rejects.toThrow(
        "Style missing_style not found",
      );
    });
  });

  describe("with live repository integration", () => {
    it("persists anchor and raw image files to disk and updates mascot JSON profile", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-concept-"));
      roots.push(root);
      const app = await buildApp(root);

      // 1. Create mascot in repository
      const mascot = await app.repository.saveMascot({
        name: "Barnaby Bear",
        description: "A friendly brown bear with a little backpack",
        visual_style: "pixar_3d",
        master_prompt: "Adorable teddy bear wearing a green backpack",
        color_theme: "#f59e0b",
      });

      // 2. Add master concept image asset
      const dummyMasterBytes = Buffer.from("<svg>master concept art</svg>", "utf8");
      const masterUrl = await app.repository.saveMascotAsset(mascot.id, "master_concept_1.png", dummyMasterBytes);
      const mascotWithMaster = await app.repository.saveMascot({
        ...mascot,
        master_image_url: masterUrl,
      });

      // 3. Create a custom style
      const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascotWithMaster.id, {
        name: "Pirate Captain",
        keyword: "tricorn hat pirate coat brass telescope eye patch",
      });

      // 4. Generate style concept with custom override prompt
      const customOverride = "Standing heroically on the deck, holding a spyglass";
      const result = await generateMascotStyleConcept(app.repository, mascotWithStyle, style.id, testImageConfig, {
        prompt: customOverride,
      });

      // Verify result structure
      expect(result.placeholder).toBe(true);
      expect(result.prompt_used).toContain("@1");
      expect(result.prompt_used).toContain(customOverride);
      expect(result.prompt_used).toContain(
        "Theme & Costume: Styled in authentic tricorn hat pirate coat brass telescope eye patch attire, costume, and accessories.",
      );
      expect(validateMascotPromptContract(result.prompt_used, true)).toBe(true);

      // Verify files exist in repository asset storage
      const mattedFilename = result.anchor_image_url.split("/").pop()!;
      const rawFilename = result.raw_image_url.split("/").pop()!;
      const mattedFile = await app.repository.getMascotAssetFile(mascot.id, mattedFilename);
      const rawFile = await app.repository.getMascotAssetFile(mascot.id, rawFilename);
      expect(mattedFile.size).toBeGreaterThan(0);
      expect(rawFile.size).toBeGreaterThan(0);

      // Verify reloaded mascot profile has anchor_image_url set
      const reloadedMascot = await app.repository.getMascot(mascot.id);
      const styleInMascot = reloadedMascot.styles?.find((s) => s.id === style.id);
      expect(styleInMascot?.anchor_image_url).toBe(result.anchor_image_url);

      // 5. Regenerate style concept to verify previous asset cleanup
      const result2 = await generateMascotStyleConcept(app.repository, reloadedMascot, style.id, testImageConfig);

      expect(result2.anchor_image_url).not.toBe(result.anchor_image_url);
      const reloadedMascot2 = await app.repository.getMascot(mascot.id);
      const styleInMascot2 = reloadedMascot2.styles?.find((s) => s.id === style.id);
      expect(styleInMascot2?.anchor_image_url).toBe(result2.anchor_image_url);

      // Old anchor file should have been cleaned up
      await expect(app.repository.getMascotAssetFile(mascot.id, mattedFilename)).rejects.toThrow();
    });
  });
});
