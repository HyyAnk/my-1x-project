import { describe, expect, it, vi } from "vitest";
import { THUMBNAIL_COMPOSITIONS, ThumbnailManifestSchema, type ThumbnailManifest } from "@studio/shared";
import { selectThumbnailComposition } from "../src/quiz/thumbnail/editorial/composition/compositionSelector.js";
import { manifestComposition } from "../src/quiz/thumbnail/editorial/recentThumbnailHistory.js";
import { applyEditorialDesign } from "../src/quiz/thumbnail/editorial/editorialPlan.js";
import { resolveThumbnailLayout } from "../src/quiz/thumbnail/thumbnailLayoutResolver.js";
import { compileThumbnailPrompt } from "../src/quiz/thumbnail/thumbnailPromptCompiler.js";
import type { RepositoryService } from "../src/repository.js";

const manifests = vi.hoisted(() => new Map<string, unknown>());
vi.mock("../src/quiz/thumbnail/thumbnailManifestStore.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEpisodeThumbnailManifest: async (_repository: unknown, _channelId: string, episodeId: string) => manifests.get(episodeId) ?? null,
}));
const { loadRecentThumbnailHistory } = await import("../src/quiz/thumbnail/editorial/recentThumbnailHistory.js");

function manifest(overrides: Partial<ThumbnailManifest>): ThumbnailManifest {
  const now = new Date().toISOString();
  return ThumbnailManifestSchema.parse({ episode_id: "ep", layout: "mega_grid", created_at: now, updated_at: now, ...overrides });
}

const topic = { topicTitle: "Secrets of the Solar System and Planets", topicSummary: "Scale of Jupiter", editorial: true };

describe("composition selection", () => {
  it("avoids the two most recent compositions", () => {
    for (const roll of [0, 0.49, 0.99]) {
      expect(["hero_center", "reaction_closeup"]).toContain(selectThumbnailComposition(["mascot_left", "mascot_right"], () => roll));
    }
  });

  it("avoids two distinct compositions even when the newest entries repeat", () => {
    for (const roll of [0, 0.49, 0.99]) {
      expect(["mascot_left", "reaction_closeup"]).toContain(selectThumbnailComposition(["hero_center", "hero_center", "mascot_right"], () => roll));
    }
  });

  it("can pick any composition when nothing was used before", () => {
    const picks = new Set(THUMBNAIL_COMPOSITIONS.map((_, index) => selectThumbnailComposition([], () => index / THUMBNAIL_COMPOSITIONS.length)));
    expect(picks).toEqual(new Set(THUMBNAIL_COMPOSITIONS));
  });

  it("treats editorial thumbnails made before rotation as mascot-left and ignores comparisons", () => {
    expect(manifestComposition(manifest({ design_template: "big_object" }))).toBe("mascot_left");
    expect(manifestComposition(manifest({ design_template: "big_object", composition: "hero_center" }))).toBe("hero_center");
    expect(manifestComposition(manifest({ design_template: "comparison" }))).toBeNull();
    expect(manifestComposition(null)).toBeNull();
  });

  it("lists this episode's thumbnail first, then the channel's latest episodes", async () => {
    manifests.clear();
    manifests.set("current", manifest({ design_template: "big_object", composition: "mascot_right", hook_text: "CRACK THIS CLOCK" }));
    manifests.set("previous", manifest({ design_template: "big_object", hook_text: "WHO RIDES CATS?" }));
    manifests.set("comparison", manifest({ design_template: "comparison", hook_text: "WHICH IS REAL?" }));
    const repository = {
      listEpisodes: async () => [{ episode_id: "previous" }, { episode_id: "current" }, { episode_id: "comparison" }],
    } as unknown as RepositoryService;
    expect(await loadRecentThumbnailHistory(repository, "channel", "current")).toEqual({
      compositions: ["mascot_right", "mascot_left"],
      headlines: ["CRACK THIS CLOCK", "WHO RIDES CATS?", "WHICH IS REAL?"],
    });
  });
});

describe("composition in editorial plans and prompts", () => {
  it("rotates away from the channel's recent compositions", () => {
    const plan = applyEditorialDesign(resolveThumbnailLayout(topic), { ...topic, recentCompositions: ["mascot_left", "mascot_right"], rng: () => 0 });
    expect(plan.editorial?.composition).toBe("hero_center");
    expect(plan.editorial?.spatialComposition).toBeUndefined();
  });

  it("keeps dedicated layouts for comparison and mystery designs", () => {
    const comparisonInput = { topicTitle: "Mars or Venus?", editorial: true, questions: [{ question: "Pick one", choices: ["Mars", "Venus"] }] };
    expect(applyEditorialDesign(resolveThumbnailLayout(comparisonInput), comparisonInput).editorial?.composition).toBeUndefined();
    const mysteryInput = { ...topic, layoutOverride: "mystery_silhouette" as const };
    expect(applyEditorialDesign(resolveThumbnailLayout(mysteryInput), mysteryInput).editorial?.composition).toBeUndefined();
  });

  it.each([
    ["mascot_left", "Left block (~35-40% width) features expressive mascot", "In the top-left area"],
    ["mascot_right", "Right block (~35-40% width) features expressive mascot", "In the top-right area"],
    ["hero_center", "CENTERED HERO COMPOSITION", "Across the top of the frame"],
    ["reaction_closeup", "REACTION CLOSE-UP COMPOSITION", "In the top-left area"],
  ] as const)("compiles %s placement into the 16:9 art prompt", (composition, layoutText, headlineText) => {
    const index = THUMBNAIL_COMPOSITIONS.indexOf(composition);
    const plan = applyEditorialDesign(resolveThumbnailLayout(topic), { ...topic, rng: () => (index + 0.5) / THUMBNAIL_COMPOSITIONS.length });
    expect(plan.editorial?.composition).toBe(composition);
    const prompt = compileThumbnailPrompt(plan, "16:9");
    expect(prompt).toContain(layoutText);
    const headlineLine = prompt.split("\n").find((line) => line.includes("prominently render the exact headline text"));
    expect(headlineLine?.startsWith(headlineText)).toBe(true);
  });

  it("states mascot framing after the pose so close-ups and small hero-center mascots win", () => {
    const planFor = (composition: (typeof THUMBNAIL_COMPOSITIONS)[number]) => {
      const index = THUMBNAIL_COMPOSITIONS.indexOf(composition);
      return applyEditorialDesign(resolveThumbnailLayout(topic), { ...topic, rng: () => (index + 0.5) / THUMBNAIL_COMPOSITIONS.length });
    };
    const closeup = compileThumbnailPrompt(planFor("reaction_closeup"), "16:9");
    expect(closeup).toContain("CHEST-UP CLOSE-UP ONLY");
    expect(closeup.indexOf("MASCOT FRAMING")).toBeGreaterThan(closeup.indexOf("Mascot identity and performance"));
    const centered = compileThumbnailPrompt(planFor("hero_center"), "16:9");
    expect(centered).toContain("just right of center");
    expect(centered).toContain("Never on the left edge");
  });

  it("keeps Shorts safe zones in every portrait composition", () => {
    for (const [index] of THUMBNAIL_COMPOSITIONS.entries()) {
      const plan = applyEditorialDesign(resolveThumbnailLayout(topic), { ...topic, rng: () => (index + 0.5) / THUMBNAIL_COMPOSITIONS.length });
      expect(compileThumbnailPrompt(plan, "9:16")).toContain("above y=1440");
    }
  });
});
