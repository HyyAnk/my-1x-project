import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { makeAuthorizedQuiz } from "./helpers/authorizedContentFixtures.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { assetFingerprint } from "../src/quiz/assets/assetFingerprint.js";
import { compileThumbnailPrompt, resolveThumbnailLayout } from "../src/quiz/thumbnail/index.js";
import { extractCleanVisualPrompt } from "../src/providers/antigravity/promptExtractor.js";
import { isQuizAssetResolutionComplete, resolveQuizImageProviderName } from "../src/quiz/assets/assetValidator.js";
import { resolveQuizAssets } from "../src/quiz/assets/resolveQuizAssets.js";
import { RepositoryService } from "../src/repository.js";
import type { QuizAssetPlan, QuizAssetResolution } from "@studio/shared";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const VALID_PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAAI/9B+f9AAAAABJRU5ErkJggg==",
  "base64",
);

async function createTestRepository(root: string): Promise<RepositoryService> {
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  return new RepositoryService(root);
}

describe("Authorized visual identities (P2)", () => {
  // V01 & V02: Asset and thumbnail compiler identity preservation
  describe("V01 & V02: Subject identity preservation", () => {
    it.each(["Simba", "Pikachu", "Pac-Man", "Mario", "Spider-Man", "lion cub"])("preserves %s in final prompts", (subject) => {
      const quiz = makeAuthorizedQuiz(subject);
      const assets = planQuizAssets(quiz, createDefaultDirectorPlan(quiz));
      const request = assets.assets.find((item) => item.purpose === "hero_question_image");
      if (!request) throw new Error("Expected hero asset fixture");
      const compiled = compileQuizAssetPrompt(request);
      expect(compiled.prompt).toContain(subject);
      expect(assetFingerprint(request, "gpti2", compiled.cacheVersion)).not.toBe(
        assetFingerprint(request, "gpti2", "pixar_3d-v3-expressive-faces"),
      );
      const plan = resolveThumbnailLayout({ topicTitle: subject, layoutOverride: "split_vs" });
      plan.subjectAnchors = [
        { label: subject, visualPrompt: `${subject} on a bright stage` },
        { label: "Mountain", visualPrompt: "A green mountain" },
      ];
      for (const ratio of ["16:9", "9:16"] as const) {
        expect(compileThumbnailPrompt(plan, ratio)).toContain(subject);
      }
    });
  });

  // V03: Provider-bound payload preserves requested identity and identifying marks
  describe("V03: Provider-bound payload", () => {
    it("preserves requested identity and identifying marks without suppressing requested emblems", () => {
      const quiz = makeAuthorizedQuiz("Batman with yellow bat emblem on chest");
      const assets = planQuizAssets(quiz, createDefaultDirectorPlan(quiz));
      const request = assets.assets.find((item) => item.purpose === "hero_question_image")!;
      const compiled = compileQuizAssetPrompt(request);

      const extracted = extractCleanVisualPrompt(compiled.prompt);
      expect(extracted).toContain("Batman with yellow bat emblem on chest");
      expect(extracted).toContain("retain identifying marks explicitly required by the subject");
      expect(extracted).not.toContain("no logos,");
    });
  });

  // V04: Fingerprint determinism and version bump
  describe("V04: Fingerprint determinism and version bump", () => {
    it("produces deterministic fingerprints and changes between compiler cache versions", () => {
      const quiz = makeAuthorizedQuiz("Pikachu");
      const assets = planQuizAssets(quiz, createDefaultDirectorPlan(quiz));
      const request = assets.assets[0];

      const fp1 = assetFingerprint(request, "gpti2", "pixar_3d-v4-subject-identity");
      const fp2 = assetFingerprint(request, "gpti2", "pixar_3d-v4-subject-identity");
      const fpOld = assetFingerprint(request, "gpti2", "pixar_3d-v3-expressive-faces");

      expect(fp1).toBe(fp2);
      expect(fp1).not.toBe(fpOld);
    });
  });

  // V05: Asset completeness: old fingerprint plus valid PNG does not make automatic result current
  describe("V05: Asset completeness freshness", () => {
    it("rejects resolution with stale generation fingerprint even when valid PNG file exists", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "completeness-stale-"));
      tempDirs.push(root);
      const repository = await createTestRepository(root);
      const channel = await repository.createChannel({
        name: "Test Channel",
        description: "",
        target_audience: "all",
        language: "English",
        market: "",
        dna_mode: "example",
      });
      const topic = {
        topic_id: "topic_stale",
        channel_id: channel.channel_id,
        content_kind: "episode" as const,
        title: "Simba Quiz",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
      };
      await repository.saveTopicRun(channel.channel_id, [topic]);
      const episode = await repository.confirmTopic(channel.channel_id, topic.topic_id);

      const quiz = makeAuthorizedQuiz("Simba", episode.episode_id);
      const plan = planQuizAssets(quiz, createDefaultDirectorPlan(quiz));
      const heroRequest = plan.assets.find((item) => item.purpose === "hero_question_image")!;
      const imageConfig = { provider: "gpti2" as const, api_key: "test-key" };
      const providerName = resolveQuizImageProviderName({ imageConfig });

      // Old cache version fingerprint
      const staleFingerprint = assetFingerprint(heroRequest, providerName, "pixar_3d-v3-expressive-faces");
      const assetPath = await repository.writeQuizImageAsset(
        channel.channel_id,
        episode.episode_id,
        heroRequest.asset_id,
        staleFingerprint,
        VALID_PNG_BYTES,
      );

      const staleResolution: QuizAssetResolution = {
        schema_version: 2,
        episode_id: episode.episode_id,
        template_id: "candy_arcade",
        assets: [
          {
            ...heroRequest,
            fingerprint: staleFingerprint,
            path: assetPath,
            source: "cache",
          },
        ],
      };

      const isComplete = await isQuizAssetResolutionComplete({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan: { ...plan, assets: [heroRequest] },
        resolution: staleResolution,
        imageConfig,
      });

      // Must be false because staleFingerprint does not match v4-subject-identity fingerprint!
      expect(isComplete).toBe(false);

      // Now with current fingerprint
      const currentCompiled = compileQuizAssetPrompt(heroRequest, undefined, "pixar_3d");
      const currentFingerprint = assetFingerprint(heroRequest, providerName, currentCompiled.cacheVersion);
      const currentAssetPath = await repository.writeQuizImageAsset(
        channel.channel_id,
        episode.episode_id,
        heroRequest.asset_id,
        currentFingerprint,
        VALID_PNG_BYTES,
      );

      const currentResolution: QuizAssetResolution = {
        schema_version: 2,
        episode_id: episode.episode_id,
        template_id: "candy_arcade",
        assets: [
          {
            ...heroRequest,
            fingerprint: currentFingerprint,
            path: currentAssetPath,
            source: "cache",
          },
        ],
      };

      const isCurrentComplete = await isQuizAssetResolutionComplete({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan: { ...plan, assets: [heroRequest] },
        resolution: currentResolution,
        imageConfig,
      });

      expect(isCurrentComplete).toBe(true);
    });
  });

  // V06: Resolver priority: Curated/user-selected assets retained; automatic legacy bundles cannot masquerade as new
  describe("V06: Resolver priority and bundle provenance", () => {
    it("does not reuse auto-generated legacy bundles without explicit provenance, but accepts explicit bundles", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "resolver-provenance-"));
      tempDirs.push(root);
      const repository = await createTestRepository(root);
      const channel = await repository.createChannel({
        name: "Bundle Channel",
        description: "",
        target_audience: "all",
        language: "English",
        market: "",
        dna_mode: "example",
      });
      const topic = {
        topic_id: "topic_bundle",
        channel_id: channel.channel_id,
        content_kind: "episode" as const,
        title: "Bundle Quiz",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
      };
      await repository.saveTopicRun(channel.channel_id, [topic]);
      const episode = await repository.confirmTopic(channel.channel_id, topic.topic_id);

      // Write an auto-generated legacy bundle without provenance
      await repository.writeBundleImage(channel.channel_id, episode.episode_id, 1, VALID_PNG_BYTES, 0, {
        price_vnd: 250,
        model: "imagen-3",
      });

      const singleAssetPlan: QuizAssetPlan = {
        schema_version: 2,
        episode_id: episode.episode_id,
        template_id: "candy_arcade",
        assets: [
          {
            asset_id: "asset-question-01-hero",
            question_id: "question-01",
            subject: "A customized exotic subject",
            purpose: "hero_question_image",
            style: "cute_illustration",
            aspect_ratio: "16:9",
            transparent_background: false,
            required: true,
            semantic_key: "question-01:hero_question_image",
            consistency_group_id: null,
          },
        ],
        consistency_groups: [],
      };

      // With no AI provider configured, auto-generated bundle without provenance must NOT be bridged as explicit_episode
      const { resolution: autoRes, issues } = await resolveQuizAssets({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan: singleAssetPlan,
        imageConfig: {},
      });

      // Provider was unavailable and legacy bundle was not silently bridged
      expect(issues.some((issue) => issue.code === "asset_provider_unavailable" || issue.code === "asset_generation_failed")).toBe(true);
      expect(autoRes.assets).toHaveLength(0);

      // Now overwrite bundle with explicit user selection provenance
      await repository.writeBundleImage(channel.channel_id, episode.episode_id, 1, VALID_PNG_BYTES, 0, {
        price_vnd: 250,
        model: "user_selected",
        provenance: "explicit",
        user_selected: true,
      });

      const { resolution: explicitResolution, issues: explicitIssues } = await resolveQuizAssets({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan: singleAssetPlan,
        imageConfig: {},
      });

      expect(explicitIssues).toHaveLength(0);
      expect(explicitResolution.assets).toHaveLength(1);
      expect(explicitResolution.assets[0].source).toBe("explicit_episode");
    });
  });

  // V07: Provider/style variation consistency
  describe("V07: Provider and visual style variation", () => {
    it("rejects completion when visual style or provider does not match resolution context", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "style-mismatch-"));
      tempDirs.push(root);
      const repository = await createTestRepository(root);
      const channel = await repository.createChannel({
        name: "Style Channel",
        description: "",
        target_audience: "all",
        language: "English",
        market: "",
        dna_mode: "example",
      });
      const topic = {
        topic_id: "topic_style",
        channel_id: channel.channel_id,
        content_kind: "episode" as const,
        title: "Style Quiz",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
      };
      await repository.saveTopicRun(channel.channel_id, [topic]);
      const episode = await repository.confirmTopic(channel.channel_id, topic.topic_id);

      const quiz = makeAuthorizedQuiz("Mario", episode.episode_id);
      const plan = planQuizAssets(quiz, createDefaultDirectorPlan(quiz));
      const heroRequest = plan.assets.find((item) => item.purpose === "hero_question_image")!;
      const imageConfig = { provider: "gpti2" as const, api_key: "test-key" };
      const providerName = resolveQuizImageProviderName({ imageConfig });

      // Compiled with pixar_3d
      const pixarCompiled = compileQuizAssetPrompt(heroRequest, undefined, "pixar_3d");
      const pixarFp = assetFingerprint(heroRequest, providerName, pixarCompiled.cacheVersion);
      const assetPath = await repository.writeQuizImageAsset(
        channel.channel_id,
        episode.episode_id,
        heroRequest.asset_id,
        pixarFp,
        VALID_PNG_BYTES,
      );

      const resolution: QuizAssetResolution = {
        schema_version: 2,
        episode_id: episode.episode_id,
        template_id: "candy_arcade",
        assets: [
          {
            ...heroRequest,
            fingerprint: pixarFp,
            path: assetPath,
            source: "cache",
          },
        ],
      };

      // Valid when checked with pixar_3d and matching provider
      const isPixarComplete = await isQuizAssetResolutionComplete({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan: { ...plan, assets: [heroRequest] },
        resolution,
        visualStyle: "pixar_3d",
        imageConfig,
      });
      expect(isPixarComplete).toBe(true);

      // Fails when checked with flat_vector style because cacheVersion differs
      const isFlatComplete = await isQuizAssetResolutionComplete({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan: { ...plan, assets: [heroRequest] },
        resolution,
        visualStyle: "flat_vector",
        imageConfig,
      });
      expect(isFlatComplete).toBe(false);

      // Fails when checked with different provider
      const isShopAiKeyComplete = await isQuizAssetResolutionComplete({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan: { ...plan, assets: [heroRequest] },
        resolution,
        visualStyle: "pixar_3d",
        imageConfig: { provider: "shopaikey", api_key: "different-key" },
      });
      expect(isShopAiKeyComplete).toBe(false);
    });
  });

  // V08: Asset validation: unsafe path and wrong semantic fallback fail
  describe("V08: Asset validation safety", () => {
    it("rejects resolution with unsafe path traversal or mismatched semantic key", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "safety-validation-"));
      tempDirs.push(root);
      const repository = await createTestRepository(root);
      const channel = await repository.createChannel({
        name: "Safety Channel",
        description: "",
        target_audience: "all",
        language: "English",
        market: "",
        dna_mode: "example",
      });
      const topic = {
        topic_id: "topic_safety",
        channel_id: channel.channel_id,
        content_kind: "episode" as const,
        title: "Safety Quiz",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
      };
      await repository.saveTopicRun(channel.channel_id, [topic]);
      const episode = await repository.confirmTopic(channel.channel_id, topic.topic_id);

      const quiz = makeAuthorizedQuiz("Spider-Man", episode.episode_id);
      const plan = planQuizAssets(quiz, createDefaultDirectorPlan(quiz));
      const heroRequest = plan.assets.find((item) => item.purpose === "hero_question_image")!;
      const compiled = compileQuizAssetPrompt(heroRequest);
      const fp = assetFingerprint(heroRequest, "gpti2", compiled.cacheVersion);

      // Traversal path
      const unsafeResolution: QuizAssetResolution = {
        schema_version: 2,
        episode_id: episode.episode_id,
        template_id: "candy_arcade",
        assets: [
          {
            ...heroRequest,
            fingerprint: fp,
            path: "../../../outside.png",
            source: "provider",
          },
        ],
      };

      const isUnsafeComplete = await isQuizAssetResolutionComplete({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan: { ...plan, assets: [heroRequest] },
        resolution: unsafeResolution,
      });
      expect(isUnsafeComplete).toBe(false);

      // Semantic key mismatch
      const realPath = await repository.writeQuizImageAsset(
        channel.channel_id,
        episode.episode_id,
        heroRequest.asset_id,
        fp,
        VALID_PNG_BYTES,
      );

      const wrongSemanticResolution: QuizAssetResolution = {
        schema_version: 2,
        episode_id: episode.episode_id,
        template_id: "candy_arcade",
        assets: [
          {
            ...heroRequest,
            fingerprint: fp,
            semantic_key: "wrong-semantic-key",
            path: realPath,
            source: "provider",
          },
        ],
      };

      const isWrongSemanticComplete = await isQuizAssetResolutionComplete({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan: { ...plan, assets: [heroRequest] },
        resolution: wrongSemanticResolution,
      });
      expect(isWrongSemanticComplete).toBe(false);
    });
  });
});
