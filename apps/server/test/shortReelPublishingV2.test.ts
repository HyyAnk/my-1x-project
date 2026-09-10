import { describe, expect, it, vi } from "vitest";
import { buildPublishingPrompt, generateReelPublishing, parsePublishingJson } from "../src/shortReel/publishingService.js";
import { createUpgradeFixture } from "./helpers/shortReelUpgradeFixture.js";

describe("ShortReel publishing generation (Phase 04)", () => {
  it("P01: prompt includes unmistakable third-segment detail and title/description schemas", async () => {
    const f = await createUpgradeFixture();
    try {
      const record = structuredClone(f.snapshot);
      record.script!.segments[2].narrative = "The host collects the leaves with a rake.";
      record.units.script.last_accepted_payload!.script = record.script!;

      const prompt = buildPublishingPrompt(record);

      expect(prompt).toContain("The host collects the leaves with a rake.");
      expect(prompt).toContain('"title"');
      expect(prompt).toContain('"description"');
      expect(prompt).toContain("600");
    } finally {
      await f.cleanup();
    }
  });

  it("P02: parsePublishingJson validates title <= 80 and description <= 600 strictly", () => {
    expect(
      parsePublishingJson(
        JSON.stringify({
          title: "Which Tool Clears the Leaves?",
          description: "Two tools enter the yard. Can you spot the winner?\n\n#Quiz #Tools #Shorts",
        }),
      ),
    ).toEqual({
      title: "Which Tool Clears the Leaves?",
      description: "Two tools enter the yard. Can you spot the winner?\n\n#Quiz #Tools #Shorts",
    });

    // Rejects title exceeding 80 characters
    expect(parsePublishingJson(JSON.stringify({ title: "x".repeat(81), description: "Short." }))).toBeNull();

    // Rejects description exceeding 600 characters
    expect(parsePublishingJson(JSON.stringify({ title: "Tool test", description: "x".repeat(601) }))).toBeNull();

    // Rejects extra legacy fields (hook, cta, hashtags as array)
    expect(
      parsePublishingJson(
        JSON.stringify({
          title: "Valid Title",
          description: "Valid Description",
          hook: "Extra hook",
        }),
      ),
    ).toBeNull();

    // Parses JSON wrapped in markdown code fence
    expect(parsePublishingJson('```json\n{"title": "Fenced Title", "description": "Fenced Description #Shorts"}\n```')).toEqual({
      title: "Fenced Title",
      description: "Fenced Description #Shorts",
    });
  });

  it("P03: legacy localization does not overwrite newly generated publishing copy", async () => {
    const f = await createUpgradeFixture();
    try {
      const llmClient = {
        async connect() {},
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            title: "Fresh Generated English Title",
            description: "Fresh description about speed and physics.\n\n#Shorts #Science",
          }),
        }),
      };

      const result = await generateReelPublishing(f.snapshot, {
        llmClient: llmClient as any,
        localization: {
          language_code: "vi",
          question_text: "Cau hoi tieng Viet",
          selected_answer_text: "Dap an",
          video_description: "Mo ta tieng Viet khong duoc ghi de",
          thumbnail_text: "Tieng Viet",
          review_status: "approved",
          updated_at: new Date().toISOString(),
        } as any,
      });

      expect(result.title).toBe("Fresh Generated English Title");
      expect(result.description).toBe("Fresh description about speed and physics.\n\n#Shorts #Science");
      expect(result.description).not.toContain("Mo ta tieng Viet");
    } finally {
      await f.cleanup();
    }
  });

  it("P04: performs at most one bounded correction attempt on malformed response", async () => {
    const f = await createUpgradeFixture();
    try {
      let callCount = 0;
      const llmClient = {
        async connect() {},
        generateContent: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            // First call: over-length title
            return {
              text: JSON.stringify({ title: "x".repeat(120), description: "Good desc #Shorts" }),
            };
          }
          // Second call (correction): valid output
          return {
            text: JSON.stringify({
              title: "Corrected Title",
              description: "Good corrected desc #Shorts",
            }),
          };
        }),
      };

      const result = await generateReelPublishing(f.snapshot, {
        llmClient: llmClient as any,
      });

      expect(callCount).toBe(2);
      expect(result).toEqual({
        title: "Corrected Title",
        description: "Good corrected desc #Shorts",
      });
    } finally {
      await f.cleanup();
    }
  });

  it("P04-FAIL: fails when both initial attempt and correction fail without fake fallback", async () => {
    const f = await createUpgradeFixture();
    try {
      const llmClient = {
        async connect() {},
        generateContent: vi.fn().mockResolvedValue({
          text: "Invalid prose that cannot be parsed as JSON.",
        }),
      };

      await expect(
        generateReelPublishing(f.snapshot, {
          llmClient: llmClient as any,
        }),
      ).rejects.toMatchObject({
        name: "ScriptGenerationError",
        code: "VALIDATION_FAILED",
      });
    } finally {
      await f.cleanup();
    }
  });

  it("fails with PROVIDER_ERROR when LLM client is missing in production", async () => {
    const f = await createUpgradeFixture();
    try {
      await expect(generateReelPublishing(f.snapshot)).rejects.toMatchObject({
        name: "ScriptGenerationError",
        code: "PROVIDER_ERROR",
      });
    } finally {
      await f.cleanup();
    }
  });
});
