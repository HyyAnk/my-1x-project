import { describe, expect, it } from "vitest";
import { deriveTopicHeadlineFallback } from "../src/quiz/thumbnail/thumbnailTopicHookExtractor.js";

describe("deriveTopicHeadlineFallback", () => {
  it("extracts punchy topic hook from compound true/false titles", () => {
    const hook = deriveTopicHeadlineFallback("Arcade Game Secrets: True or False Gaming Showdown", "QUIZ CHALLENGE");
    expect(hook).toBe("ARCADE GAME SECRETS");
  });

  it("extracts clean subject from numbered myths and facts titles", () => {
    const hook = deriveTopicHeadlineFallback("10 Biggest Scientific Myths: True or False?", "QUIZ CHALLENGE");
    expect(hook).toBe("SCIENTIFIC MYTHS");
  });

  it("handles standard simple topics directly", () => {
    const hook = deriveTopicHeadlineFallback("Deep Sea Creatures", "QUIZ CHALLENGE");
    expect(hook).toBe("DEEP SEA CREATURES");
  });

  it("falls back to default fallback when title is empty or unparsable", () => {
    expect(deriveTopicHeadlineFallback("", "DEFAULT FALLBACK")).toBe("DEFAULT FALLBACK");
    expect(deriveTopicHeadlineFallback(null, "DEFAULT FALLBACK")).toBe("DEFAULT FALLBACK");
  });

  it("extracts clean punchy subject for Norse Legends compound title", () => {
    const hook = deriveTopicHeadlineFallback("Norse Legends & Heroes Quiz: Can You Spot Every Mythical Legend?", "QUIZ CHALLENGE");
    expect(hook).toBe("NORSE LEGENDS & HEROES");
  });
});

describe("resolveUniversalTopicHook", () => {
  it("resolves authentic multilingual Norse hooks and avoids generic history hooks", async () => {
    const { resolveUniversalTopicHook } = await import("../src/quiz/thumbnail/thumbnailTopicHookExtractor.js");

    const enHook = resolveUniversalTopicHook({
      topicTitle: "Norse Legends & Heroes Quiz: Can You Spot Every Mythical Legend?",
      topicSummary: "Ancient Norse myths featuring Thor, Odin, and Asgard",
      layout: "mega_grid",
      language: "en",
      defaultFallback: "GENERAL KNOWLEDGE",
    });
    expect(enHook).toBe("NORSE LEGENDS QUIZ!");
    expect(enHook).not.toContain("ANCIENT HISTORY");

    const deHook = resolveUniversalTopicHook({
      topicTitle: "Norse Legends & Heroes Quiz",
      layout: "mega_grid",
      language: "de",
      defaultFallback: "ALLGEMEINWISSEN",
    });
    expect(deHook).toBe("WIKINGER MYTHEN QUIZ!");

    const frHook = resolveUniversalTopicHook({
      topicTitle: "Norse Legends & Heroes Quiz",
      layout: "mega_grid",
      language: "fr",
      defaultFallback: "CULTURE GÉNÉRALE",
    });
    expect(frHook).toBe("QUIZ MYTHOLOGIE NORDIQUE !");
  });

  it("resolves authentic Greek mythology hooks", async () => {
    const { resolveUniversalTopicHook } = await import("../src/quiz/thumbnail/thumbnailTopicHookExtractor.js");

    const hook = resolveUniversalTopicHook({
      topicTitle: "Greek Mythology & Olympian Gods Quiz",
      layout: "mega_grid",
      language: "en",
      defaultFallback: "GENERAL KNOWLEDGE",
    });
    expect(hook).toBe("GREEK GODS QUIZ!");
  });
});
