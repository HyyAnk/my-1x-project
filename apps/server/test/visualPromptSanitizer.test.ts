import { describe, expect, it } from "vitest";
import type { QuizAssetRequirement } from "@studio/shared";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { AntigravityNativeImageProvider } from "../src/providers/antigravity/provider.js";
import { executeSinglePromptText } from "../src/utils/promptSanitizer.js";
import { RepositoryService } from "../src/repository.js";
import path from "node:path";
import os from "node:os";
import { EventEmitter } from "node:events";
import type { AntigravityTurnOptions } from "../src/antigravity/types.js";

describe("Visual Prompt Subject Identity Preservation", () => {
  describe("compileQuizAssetPrompt preserves subjects without proxy alteration", () => {
    it.each([
      ["Pac-Man", "Pac-Man"],
      ["Super Mario", "Super Mario"],
      ["Pikachu", "Pikachu"],
      ["Lion Cub", "Lion Cub"],
      ["a cute baby lion playing", "a cute baby lion playing"],
      ["Minecraft Creeper", "Minecraft Creeper"],
      ["Spider-Man", "Spider-Man"],
      ["Batman", "Batman"],
      ["Mickey Mouse", "Mickey Mouse"],
      ["Sonic the Hedgehog", "Sonic the Hedgehog"],
      ["A vintage red bicycle resting against a brick wall", "A vintage red bicycle resting against a brick wall"],
    ])("preserves %s in compiled prompt", (subject, expectedText) => {
      const requirement: QuizAssetRequirement = {
        asset_id: "asset-question-01-hero",
        purpose: "hero_question_image",
        subject,
        aspect_ratio: "16:9",
        required: true,
      };

      const compiled = compileQuizAssetPrompt(requirement);
      expect(compiled.prompt).toContain(`Subject: ${expectedText}.`);
      expect(compiled.cacheVersion).toMatch(/-v5-layout-framing$/);
    });

    it("preserves answer_option choices in compileQuizAssetPrompt", () => {
      const choiceReq: QuizAssetRequirement = {
        asset_id: "asset-question-01-choice-a",
        purpose: "answer_option",
        subject: "Super Mario jumping",
        aspect_ratio: "1:1",
        required: false,
      };

      const compiled = compileQuizAssetPrompt(choiceReq);
      expect(compiled.prompt).toContain("Subject: Super Mario jumping.");
    });
  });

  describe("Provider Hardening & Resilience", () => {
    it("fails fast when Antigravity client lacks startThread instead of hanging in retry loop", async () => {
      const dummyRepo = new RepositoryService(path.join(os.tmpdir(), "studio-test-repo-guard"));
      const unsupportedClient = {
        connect: async () => {},
        generateContent: async () => "mock",
      };

      const provider = new AntigravityNativeImageProvider(
        dummyRepo,
        { channelId: "ch-test", episodeId: "ep-test", assetId: "asset-test", fingerprint: "fp-test" },
        unsupportedClient as never,
      );

      const startTime = Date.now();
      await expect(provider.generateReference("test prompt")).rejects.toThrow();
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000);
    });

    it("executeSinglePromptText does not crash with TypeError when client lacks startThread", async () => {
      const mockClientWithoutThread = {
        connect: async () => {},
      };

      const result = await executeSinglePromptText(mockClientWithoutThread, "A photo of a bloody gun confrontation");

      // Falls back to rule-based sanitization gracefully
      expect(result).not.toContain("bloody");
      expect(result).not.toContain("gun");
      expect(result).toContain("crimson-toned dramatic");
    });

    it("forwards image attachments and waits for a completed Antigravity turn", async () => {
      class AttachmentClient extends EventEmitter {
        options: AntigravityTurnOptions | undefined;
        async connect() {}
        async startThread() {
          return "thread-1";
        }
        async startTurn(_threadId: string, _prompt: string, _model?: string, options?: AntigravityTurnOptions) {
          this.options = options;
          setTimeout(() => {
            this.emit("notification", {
              method: "item/agentMessage/delta",
              params: { threadId: "thread-1", turnId: "turn-1", delta: "complete" },
            });
            this.emit("notification", {
              method: "turn/completed",
              params: { threadId: "thread-1", turnId: "turn-1", turn: { status: "completed" } },
            });
          }, 0);
          return "turn-1";
        }
      }
      const client = new AttachmentClient();
      const output = await executeSinglePromptText(client, "Inspect the mascot", {
        requireCompleteOutput: true,
        timeoutMs: 500,
        imageAttachments: [{ path: "C:/fixtures/mascot.png", mimeType: "image/png", role: "mascot_subject" }],
      });
      expect(output).toBe("complete");
      expect(client.options?.imageAttachments?.[0]?.role).toBe("mascot_subject");
    });

    it("rejects partial text when complete output is required", async () => {
      class PartialClient extends EventEmitter {
        interrupted = false;

        async connect() {}
        async startThread() {
          return "thread-partial";
        }
        async startTurn() {
          setTimeout(() => {
            this.emit("notification", {
              method: "item/agentMessage/delta",
              params: { threadId: "thread-partial", turnId: "turn-partial", delta: '{"partial":' },
            });
          }, 0);
          return "turn-partial";
        }

        async interruptTurn() {
          this.interrupted = true;
        }
      }
      const client = new PartialClient();
      await expect(executeSinglePromptText(client, "Return JSON", { requireCompleteOutput: true, timeoutMs: 20 })).rejects.toThrow(
        "timed out",
      );
      expect(client.interrupted).toBe(true);
    });
  });
});
