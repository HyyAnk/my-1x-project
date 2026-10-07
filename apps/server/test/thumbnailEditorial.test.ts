import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { planThumbnailWithAI } from "../src/quiz/thumbnail/thumbnailAiPlanner.js";
import { compileThumbnailPrompt } from "../src/quiz/thumbnail/thumbnailPromptCompiler.js";
import { applyEditorialDesign } from "../src/quiz/thumbnail/editorial/editorialPlan.js";
import { composeEditorialThumbnail } from "../src/quiz/thumbnail/editorial/editorialCompositor.js";
import { editorialGeometry } from "../src/quiz/thumbnail/editorial/editorialGeometry.js";
import { escapeMarkup, splitHeadline } from "../src/quiz/thumbnail/editorial/editorialTypography.js";
import { buildEditorialPlannerPrompt } from "../src/quiz/thumbnail/editorial/editorialPlannerPrompt.js";
import { EditorialAiPlanSchema } from "../src/quiz/thumbnail/editorial/editorialAiPlanSchema.js";
import { resolveThumbnailLayout } from "../src/quiz/thumbnail/thumbnailLayoutResolver.js";

const root = path.resolve(import.meta.dirname, "../../..");
const input = { topicTitle: "Five senses", editorial: true, customHookText: "TEST YOUR SENSES" };

describe("editorial thumbnail planning", () => {
  it("uses one grounded sensory subject and removes the automatic badge and answer marker", async () => {
    const plan = await planThumbnailWithAI(input);
    expect(plan.editorial?.template).toBe("big_object");
    expect(plan.subjectAnchors).toHaveLength(1);
    expect(plan.subjectAnchors[0].visualPrompt).toContain("eye");
    expect(plan.subjectAnchors[0].badge).toBeUndefined();
    expect(plan.badgeText).toBe("");
    const prompt = compileThumbnailPrompt(plan, "16:9");
    expect(prompt).toContain("INTEGRATED HEADLINE TYPOGRAPHY & BRUSH BANNERS");
    expect(prompt).toContain("TEST YOUR SENSES");
    expect(prompt).not.toContain("Curiosity Badge:");
    expect(prompt).not.toContain("3x3");
  });

  it("preserves manual headlines and opt-in badges", async () => {
    const plan = await planThumbnailWithAI({ ...input, badgeOverride: "question_count", questionCount: 12 });
    expect(plan.hookText).toBe(input.customHookText);
    expect(plan.badgeText).toContain("12");
  });

  it("uses only two supplied choices for comparison and never carries answer badges", () => {
    const options = {
      topicTitle: "Would you rather visit Mars or Venus?",
      questions: [{ question: "Pick a planet", choices: ["Mars", "Venus"], answer: "Mars" }],
    };
    const plan = applyEditorialDesign(resolveThumbnailLayout(options), options);
    expect(plan.editorial).toMatchObject({ template: "comparison", candidateCount: 2 });
    expect(plan.subjectAnchors).toHaveLength(2);
    expect(plan.subjectAnchors.every((subject) => subject.badge === undefined)).toBe(true);
  });

  it("keeps legacy plans available for explicit layouts", () => {
    const plan = resolveThumbnailLayout({ topicTitle: "Planets", layoutOverride: "mega_grid" });
    expect(plan.editorial).toBeUndefined();
    expect(compileThumbnailPrompt(plan, "16:9")).toContain("Top Banner");
  });

  it("grounds planner promises and rejects malformed provider fields", () => {
    expect(buildEditorialPlannerPrompt(input)).toContain("Never promise a hearing test");
    expect(EditorialAiPlanSchema.safeParse({ layout: "invented", subject_anchors: [] }).success).toBe(false);
    expect(EditorialAiPlanSchema.safeParse({ subject_anchors: [{ visualPrompt: 42 }] }).success).toBe(false);
  });

  it("does not turn cancellation into a fallback plan", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(planThumbnailWithAI({ ...input, signal: controller.signal })).rejects.toThrow();
  });
});

describe("editorial compositor", () => {
  it.each(["16:9", "9:16"] as const)("exports a decodable %s JPEG with exact target geometry", async (ratio) => {
    const plan = await planThumbnailWithAI(input);
    const source = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#345678" } })
      .png()
      .toBuffer();
    const first = await composeEditorialThumbnail(source, plan, ratio, root);
    const second = await composeEditorialThumbnail(source, plan, ratio, root);
    expect(first).toEqual(second);
    const geometry = editorialGeometry(ratio, plan.editorial!);
    expect(await sharp(first).metadata()).toMatchObject({ width: geometry.width, height: geometry.height, format: "jpeg" });
  });

  it("rejects corrupt and undersized provider images before publication", async () => {
    const plan = await planThumbnailWithAI(input);
    await expect(composeEditorialThumbnail(Buffer.from("BROKEN"), plan, "16:9", root)).rejects.toThrow();
    const tiny = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } })
      .png()
      .toBuffer();
    await expect(composeEditorialThumbnail(tiny, plan, "16:9", root)).rejects.toThrow("undersized");
  });

  it("preserves Unicode and escapes text markup", () => {
    expect(splitHeadline("CAN YOU SEE IT?").join(" ")).toBe("CAN YOU SEE IT?");
    expect(splitHeadline("\u592a\u967d\u7cfb\u306e\u79d8\u5bc6").join("")).toBe("\u592a\u967d\u7cfb\u306e\u79d8\u5bc6");
    expect(escapeMarkup('A & <B> "C"')).toBe("A &amp; &lt;B&gt; &quot;C&quot;");
  });
});

describe("editorial seed catalog and domain diversity", () => {
  it("resolves realistic wildlife seeds without default magnifying glass prop", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Dangerous Jungle Predators",
      topicSummary: "Apex predators of the wild rainforest",
      editorial: true,
    });
    expect(plan.hookText).toBe("WHICH IS DEADLIEST?");
    expect(plan.mascotPersona?.prop).toBe("none");
    expect(plan.subjectAnchors[0].visualPrompt).toContain("tiger");
  });

  it("resolves food comparison seeds with thinker pose and zero tools", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Real or Cake Showdown",
      topicSummary: "Is it a real apple or an illusion cake?",
      editorial: true,
      layoutOverride: "split_vs",
    });
    expect(plan.hookText).toBe("WHICH IS REAL?");
    expect(plan.editorial?.template).toBe("comparison");
    expect(plan.mascotPersona?.prop).toBe("none");
    expect(plan.mascotPersona?.poseDescription).toContain("thinker stance");
  });

  it("resolves odd-one-out spotting seeds with playful detective wink", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Exotic Butterfly Patterns",
      topicSummary: "Spot the butterfly with the different wing pattern",
      editorial: true,
      layoutOverride: "odd_one_out",
    });
    expect(plan.hookText).toBe("FIND THE ODD ONE");
    expect(plan.editorial?.candidateCount).toBe(4);
    expect(plan.mascotPersona?.prop).toBe("magnifying glass");
    expect(plan.mascotPersona?.expression).toContain("detective wink");
  });

  it("resolves space astronomy seeds with pure cosmic wonder pose", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Secrets of the Solar System and Planets",
      topicSummary: "Scale of Jupiter and volcanic moons",
      editorial: true,
    });
    expect(plan.hookText).toBe("WHICH IS BIGGER?");
    expect(plan.mascotPersona?.prop).toBe("none");
    expect(plan.mascotPersona?.poseDescription).toContain("wonder");
  });

  it("resolves supercars and engine tech seeds with confident expert smirk", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Supercar Turbos and High-Speed Machines",
      topicSummary: "How titanium turbochargers generate extreme speed",
      editorial: true,
    });
    expect(plan.hookText).toBe("TRUE OR FALSE?");
    expect(plan.mascotPersona?.prop).toBe("none");
    expect(plan.mascotPersona?.poseDescription).toContain("proud expert stance");
  });

  it("resolves Norse mythology seeds with heroic adventurer stance and zero tools", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Norse Legends & Heroes Quiz: Can You Spot Every Mythical Legend?",
      topicSummary: "Voyage into the realm of Vikings and ancient legends",
      editorial: true,
    });
    expect(plan.hookText).toBe("WHO WIELDS THIS?");
    expect(plan.mascotPersona?.prop).toBe("none");
    expect(plan.subjectAnchors[0].visualPrompt).toContain("Mjolnir");
    expect(plan.mascotPersona?.poseDescription).toContain("Heroic dynamic stance");
  });

  it("resolves Super Transit city hubs seeds with speed rush thrill and zero tools", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Super Transit & City Hubs: Can You Spot Every Moving Wonder?",
      topicSummary: "Modern transit connects our bustling world with trains and monorails",
      editorial: true,
    });
    expect(plan.hookText).toBe("HOW DOES IT MOVE?");
    expect(plan.mascotPersona?.prop).toBe("none");
    expect(plan.subjectAnchors[0].visualPrompt).toContain("bullet train");
    expect(plan.mascotPersona?.poseDescription).toContain("transit system");
  });

  it("resolves Classic Storybook legends seeds with enchanted storytelling wonder", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Classic Storybook Legends: Can You Spot Every Famous Book Character?",
      topicSummary: "Journey through the pages of world-famous literature",
      editorial: true,
    });
    expect(plan.hookText).toBe("CAN YOU GUESS WHO?");
    expect(plan.mascotPersona?.prop).toBe("none");
    expect(plan.subjectAnchors[0].visualPrompt).toContain("storybook");
    expect(plan.mascotPersona?.poseDescription).toContain("storytelling");
  });

  it("resolves School Clinic secrets seeds with caring medical posture and zero tools", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
      topicSummary: "Kids and parents dive into the school nurse's essential toolkit",
      editorial: true,
    });
    expect(plan.hookText).toBe("TRUE OR FALSE?");
    expect(plan.mascotPersona?.prop).toBe("none");
    expect(plan.subjectAnchors[0].visualPrompt).toContain("ice compress");
    expect(plan.mascotPersona?.poseDescription).toContain("helpful posture");
  });

  it("resolves Earth's Wildest Wonders seeds with panoramic scenic awe and zero tools", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Earth's Wildest Wonders: Mystery Silhouette Reveal!",
      topicSummary: "Discover Earth's most breathtaking natural records and roaring waterfalls",
      editorial: true,
    });
    expect(plan.hookText).toBe("WHERE ON EARTH?");
    expect(plan.mascotPersona?.prop).toBe("none");
    expect(plan.subjectAnchors[0].visualPrompt).toContain("waterfall");
    expect(plan.mascotPersona?.poseDescription).toContain("panoramic grandeur");
  });

  it("does not hijack fantasy unmask topics into sneaker brand domain", async () => {
    const plan = await planThumbnailWithAI({
      topicTitle: "Fantasy Realm Mystery Reveal: Can You Unmask Every Epic Hero",
      topicSummary: "Test your knowledge of legendary fantasy heroes and magical wizards",
      editorial: true,
    });
    expect(plan.hookText).not.toBe("UNMASK THE BRAND!");
    expect(plan.subjectAnchors[0].visualPrompt).not.toContain("sneaker");
    const prompt = compileThumbnailPrompt(plan, "16:9");
    expect(prompt).not.toContain("sneaker");
  });

  it("preserves AI planned hero subjects in compiled mystery silhouette prompt", () => {
    const basePlan = resolveThumbnailLayout({
      topicTitle: "Fantasy Realm Mystery Reveal: Can You Unmask Every Epic Hero",
      layoutOverride: "mystery_silhouette",
    });
    const heroVisualPrompt = "Gandalf the Grey in pointed wizard hat holding staff Glamdring";
    const planned = {
      ...basePlan,
      layout: "mystery_silhouette" as const,
      hookText: "WHO IS THIS?",
      subjectAnchors: [{ label: "Hero Silhouette", visualPrompt: heroVisualPrompt }],
    };
    const editorialPlan = applyEditorialDesign(planned, {
      topicTitle: "Fantasy Realm Mystery Reveal: Can You Unmask Every Epic Hero",
      editorial: true,
      editorialFallback: false,
    });

    expect(editorialPlan.subjectAnchors[0].visualPrompt).toBe(heroVisualPrompt);
    expect(editorialPlan.editorial?.spatialComposition).toBeUndefined();

    const compiledPrompt = compileThumbnailPrompt(editorialPlan, "16:9");
    expect(compiledPrompt).toContain("Gandalf the Grey");
    expect(compiledPrompt).toContain("dramatic mystery dark silhouette of the hero subject");
    expect(compiledPrompt).not.toContain("sneaker");
  });
});
