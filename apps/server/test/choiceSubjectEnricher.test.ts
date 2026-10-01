import { describe, expect, it, vi } from "vitest";
import {
  extractFranchiseContext,
  resolveChoiceAssetSubject,
  resolveGraphicChoiceSubject,
} from "../src/quiz/assets/choiceSubjectEnricher.js";
import { loadBundleReferenceImageBase64 } from "../src/quiz/assets/resolvers/bundleReferenceLoader.js";
import type { RepositoryService } from "../src/repository.js";

describe("Choice Subject Enricher & Franchise Inheritance", () => {
  describe("extractFranchiseContext", () => {
    it("extracts franchise from standard 'In <Franchise>,' pattern", () => {
      expect(extractFranchiseContext("In Doraemon, where does he store secret gadgets?")).toBe("Doraemon");
      expect(extractFranchiseContext("In Dragon Ball Z, whose signature attack is Kamehameha?")).toBe("Dragon Ball Z");
      expect(extractFranchiseContext("In Spider-Man, who is Peter Parker's aunt?")).toBe("Spider-Man");
      expect(extractFranchiseContext("In Pixar's Cars, who won the Piston Cup?")).toBe("Pixar's Cars");
      expect(extractFranchiseContext("In Demon Slayer, what weapon does Tanjiro use?")).toBe("Demon Slayer");
    });

    it("returns null for non-franchise questions", () => {
      expect(extractFranchiseContext("Which bird can fly backwards?")).toBeNull();
      expect(extractFranchiseContext("How many continents are there on Earth?")).toBeNull();
      expect(extractFranchiseContext("Lightning never strikes the same place twice.")).toBeNull();
    });

    it("extracts franchise from visual_opportunity 'from <Franchise>' fallback when question lacks 'In' prefix", () => {
      expect(
        extractFranchiseContext(
          "Who is the legendary super saiyan?",
          "Goku in Super Saiyan form from Dragon Ball Z, dramatic glowing golden aura",
        ),
      ).toBe("Dragon Ball Z");
    });
  });

  describe("resolveChoiceAssetSubject", () => {
    it("enriches correct choice with franchise context and lore clues for Doraemon magic belly pocket", () => {
      const subject = resolveChoiceAssetSubject({
        choice: { id: "c-1", text: "Magic belly pocket" },
        question: {
          question: "In Doraemon, where does he store secret gadgets?",
          correct_choice_id: "c-1",
          visual_opportunity: "Doraemon standing proudly with his white 4D dimensional pocket on his white belly, clean studio background",
        },
      });

      expect(subject).toBe("In Doraemon: Magic belly pocket (iconic white 4D dimensional pouch attached to belly)");
    });

    it("enriches distractor choices with franchise context so art style and world remain cohesive", () => {
      const subjectB = resolveChoiceAssetSubject({
        choice: { id: "c-2", text: "Flying backpack" },
        question: {
          question: "In Doraemon, where does he store secret gadgets?",
          correct_choice_id: "c-1",
          visual_opportunity: "Doraemon with white 4D pocket",
        },
      });

      const subjectC = resolveChoiceAssetSubject({
        choice: { id: "c-3", text: "Golden treasure chest" },
        question: {
          question: "In Doraemon, where does he store secret gadgets?",
          correct_choice_id: "c-1",
          visual_opportunity: "Doraemon with white 4D pocket",
        },
      });

      expect(subjectB).toBe("In Doraemon: Flying backpack");
      expect(subjectC).toBe("In Doraemon: Golden treasure chest");
    });

    it("does not duplicate franchise prefix if choice text already mentions the franchise", () => {
      const subject = resolveChoiceAssetSubject({
        choice: { id: "c-1", text: "Doraemon's magic pocket" },
        question: {
          question: "In Doraemon, where does he store secret gadgets?",
          correct_choice_id: "c-1",
        },
      });

      expect(subject).toBe("Doraemon's magic pocket");
    });

    it("leaves regular non-franchise choices completely untouched for 100% backward compatibility", () => {
      expect(
        resolveChoiceAssetSubject({
          choice: { id: "c-a", text: "Apple" },
          question: { question: "Which fruit is red?", correct_choice_id: "c-a" },
        }),
      ).toBe("Apple");

      expect(
        resolveChoiceAssetSubject({
          choice: { id: "c-b", text: "Banana" },
          question: { question: "Which fruit is red?", correct_choice_id: "c-a" },
        }),
      ).toBe("Banana");
    });

    it("correctly routes graphic questions to resolveGraphicChoiceSubject", () => {
      const flagSubject = resolveChoiceAssetSubject({
        choice: { id: "c-1", text: "Japan" },
        question: { question: "Which country has this national flag?", visual_opportunity: "national flag" },
        isGraphicQuestion: true,
      });

      expect(flagSubject).toBe("Official national flag of Japan, clean 2D graphic vector illustration");
    });
  });

  describe("loadBundleReferenceImageBase64", () => {
    it("returns undefined when bundleNumber <= 0", async () => {
      const mockRepo = {} as unknown as RepositoryService;
      const result = await loadBundleReferenceImageBase64({
        repository: mockRepo,
        channelId: "ch-1",
        episodeId: "ep-1",
        bundleNumber: 0,
      });
      expect(result).toBeUndefined();
    });

    it("returns base64 string when bundle image exists", async () => {
      const samplePngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const mockRepo = {
        getBundleImagePath: vi.fn().mockResolvedValue({ filename: "CB-04.png", absolutePath: "/tmp/CB-04.png" }),
        getBundleImageFile: vi.fn().mockResolvedValue({ absolutePath: "/tmp/CB-04.png" }),
      } as unknown as RepositoryService;

      const result = await loadBundleReferenceImageBase64({
        repository: mockRepo,
        channelId: "ch-1",
        episodeId: "ep-1",
        bundleNumber: 4,
        readBinary: async (path: string) => (path === "/tmp/CB-04.png" ? samplePngBytes : Buffer.alloc(0)),
      });

      expect(result).toBe(samplePngBytes.toString("base64"));
    });
  });
});
