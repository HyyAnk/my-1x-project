import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Fastify from "fastify";
import type { TopicCandidate } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { generateEpisodeThumbnail, getEpisodeThumbnailManifest, validateThumbnailHook, countWords } from "../src/quiz/thumbnail/index.js";
import { registerThumbnailsRoutes } from "../src/routes/thumbnails.js";
import type { AppState } from "../src/routes/state.js";
import type { ImageProvider } from "../src/providers/index.js";
import type { AntigravityClient } from "../src/antigravity.js";
import type { QuizOrchestratorInput } from "../src/quiz/pipeline/orchestrator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OVERLONG_TOPIC_TITLE = "Arcade Game Secrets: True or False Gaming Showdown";
const OVERLONG_CUSTOM_HOOK = "Can You Guess All The Secret Bosses In This Video?";

function createMockAntigravity(responsePayload: Record<string, unknown> | string): AntigravityClient {
  const text = typeof responsePayload === "string" ? responsePayload : JSON.stringify(responsePayload);
  return {
    connect: async () => {},
    generateContent: async () => ({ text }),
  } as unknown as AntigravityClient;
}

function createMockImageProvider(tempDir: string): ImageProvider {
  return {
    generateReference: async (prompt: string) => {
      const dummyPath = path.join(tempDir, `mock_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
      await writeFile(dummyPath, Buffer.from(`MOCK_IMAGE_DATA_FOR_${prompt.slice(0, 40)}`));
      return { asset_path: dummyPath, fallback_tier: 0, degraded: false };
    },
  };
}

describe("Thumbnail Pipeline End-to-End Integration (Phase 4)", () => {
  let tempDir: string;
  let repository: RepositoryService;

  async function createArcadeEpisode(repo: RepositoryService, channelId: string) {
    const candidates: TopicCandidate[] = [
      {
        topic_id: `top_${Date.now()}_arcade`,
        channel_id: channelId,
        content_kind: "episode" as const,
        title: OVERLONG_TOPIC_TITLE,
        premise: "Discover hidden secrets, Easter eggs, and gaming myths in classic arcade titles.",
        why_it_fits: "High nostalgia appeal and engaging interactive gameplay questions",
        hook: "Can you beat the ultimate arcade quiz showdown?",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        quiz_format: "true_false",
        question_count: 8,
        age_band: "7-9",
      },
    ];
    await repo.saveTopicRun(channelId, candidates);
    return await repo.confirmTopic(channelId, candidates[0].topic_id);
  }

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `studio-e2e-thumb-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const projectRoot = path.resolve(__dirname, "../../..");
    repository = new RepositoryService(projectRoot, tempDir);
    await repository.ensureBootstrap();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Core Scenario Verification (Scenarios A - D)", () => {
    it("Scenario A: Episode with 8-word 48-char topic, no custom hook. AI planner generates creative 2-6 word hook -> verified in compiled prompt", async () => {
      const channel = await repository.createChannel({
        name: "Retro Gaming Arena",
        description: "Classic arcade and console gaming showdowns",
      });
      const episode = await createArcadeEpisode(repository, channel.channel_id);

      const mockPlannerResponse = {
        hook_text: "ARCADE SECRETS!",
        badge_text: "GAMER IQ 🎮",
        layout: "true_false",
        environment_atmosphere: "Soft-focus neon arcade cabinet glow with cinematic depth",
        lighting_palette: "Vibrant neon magenta and cyan rim light",
        mascot_persona_variations: [
          {
            id: 1,
            archetypeId: 1,
            archetypeName: "The Mastermind Strategist",
            role: "Arcade Champion",
            costume: "Retro gamer bomber jacket",
            prop: "Golden arcade joystick",
            expression: "Confident, knowing grin",
            poseDescription: "Standing proudly beside an authentic retro cabinet",
          },
        ],
        subject_anchors: [
          { label: "True", visualPrompt: "Golden Pac-Man arcade cabinet" },
          { label: "False", visualPrompt: "Shattered pixelated high-score board" },
        ],
      };

      const mockClient = createMockAntigravity(mockPlannerResponse);
      const mockImageProvider = createMockImageProvider(tempDir);

      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        aspectRatio: "16:9",
        antigravityClient: mockClient,
        imageProvider: mockImageProvider,
      });

      // 1. Hook text is the creative AI-generated hook
      expect(manifest.hook_text).toBe("ARCADE SECRETS!");

      // 2. Word count constraint: 2 to 6 words
      const words = countWords(manifest.hook_text);
      expect(words).toBeGreaterThanOrEqual(2);
      expect(words).toBeLessThanOrEqual(6);

      // 3. Character count constraint: strictly <= 30 characters
      expect(manifest.hook_text.length).toBeLessThanOrEqual(30);

      // 4. Compiled prompt contains the punchy hook banner
      expect(manifest.prompt_16_9).toBeDefined();
      expect(manifest.prompt_16_9).toContain("'ARCADE SECRETS!'");

      // 5. Compiled prompt STRICTLY does NOT contain the full 8-word 48-char topic title
      expect(manifest.prompt_16_9).not.toContain(OVERLONG_TOPIC_TITLE);

      // 6. Manifest validation passes guardrail cleanly
      const validation = validateThumbnailHook(manifest.hook_text);
      expect(validation.valid).toBe(true);
    });

    it("Scenario B: AI planner hallucinates overlong hook (full topic title) -> guardrail condenses or falls back safely, avoiding 8-word 48-char string", async () => {
      const channel = await repository.createChannel({
        name: "Retro Gaming Arena",
        description: "Classic arcade and console gaming showdowns",
      });
      const episode = await createArcadeEpisode(repository, channel.channel_id);

      // AI planner hallucinates the entire 8-word 48-character topic title as hook_text
      const hallucinatingPlannerResponse = {
        hook_text: OVERLONG_TOPIC_TITLE,
        badge_text: "TRUE OR FALSE 🎮",
        layout: "true_false",
        subject_anchors: [
          { label: "True", visualPrompt: "Golden joystick" },
          { label: "False", visualPrompt: "Game over screen" },
        ],
      };

      const mockClient = createMockAntigravity(hallucinatingPlannerResponse);
      const mockImageProvider = createMockImageProvider(tempDir);

      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        aspectRatio: "16:9",
        antigravityClient: mockClient,
        imageProvider: mockImageProvider,
      });

      // 1. Guardrail must intercept and condense to delimiter split ("ARCADE GAME SECRETS") or fallback ("TRUE OR FALSE?")
      expect(manifest.hook_text).toMatch(/^(ARCADE GAME SECRETS|TRUE OR FALSE\?)$/);

      // 2. Guardrail constraints: 2 to 6 words, <= 30 characters
      const words = countWords(manifest.hook_text);
      expect(words).toBeGreaterThanOrEqual(2);
      expect(words).toBeLessThanOrEqual(6);
      expect(manifest.hook_text.length).toBeLessThanOrEqual(30);

      // 3. The overlong 8-word 48-char string must NOT appear in prompt or manifest hook
      expect(manifest.hook_text).not.toBe(OVERLONG_TOPIC_TITLE);
      expect(manifest.prompt_16_9).not.toContain(OVERLONG_TOPIC_TITLE);

      // 4. The prompt includes the sanitized/condensed banner
      expect(manifest.prompt_16_9).toContain(`'${manifest.hook_text}'`);
      const validation = validateThumbnailHook(manifest.hook_text);
      expect(validation.valid).toBe(true);
    });

    it("Scenario C: User explicitly provides concise custom hook 'GAMING MYTHS' (2 words, 12 chars) -> preserved and rendered in prompt", async () => {
      const channel = await repository.createChannel({
        name: "Retro Gaming Arena",
        description: "Classic arcade and console gaming showdowns",
      });
      const episode = await createArcadeEpisode(repository, channel.channel_id);

      const mockImageProvider = createMockImageProvider(tempDir);

      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        aspectRatio: "16:9",
        customHookText: "GAMING MYTHS",
        imageProvider: mockImageProvider,
      });

      // 1. Hook text is preserved exactly as normalized uppercase
      expect(manifest.hook_text).toBe("GAMING MYTHS");

      // 2. Prompt renders the custom hook
      expect(manifest.prompt_16_9).toContain("'GAMING MYTHS'");

      // 3. Prompt does NOT contain the overlong topic title
      expect(manifest.prompt_16_9).not.toContain(OVERLONG_TOPIC_TITLE);

      // 4. Guardrail validation
      const validation = validateThumbnailHook(manifest.hook_text);
      expect(validation.valid).toBe(true);
      expect(validation.wordCount).toBe(2);
      expect(validation.charCount).toBe(12);
    });

    it("Scenario D: User provides overlong custom hook (10 words, 53 chars) -> guarded and safely condensed/fallback under 30 chars", async () => {
      const channel = await repository.createChannel({
        name: "Retro Gaming Arena",
        description: "Classic arcade and console gaming showdowns",
      });
      const episode = await createArcadeEpisode(repository, channel.channel_id);

      const mockImageProvider = createMockImageProvider(tempDir);

      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        aspectRatio: "16:9",
        customHookText: OVERLONG_CUSTOM_HOOK,
        imageProvider: mockImageProvider,
      });

      // 1. Full 10-word overlong string must NOT be used directly
      expect(manifest.hook_text).not.toBe(OVERLONG_CUSTOM_HOOK);

      // 2. Must satisfy 2 to 6 words
      const words = countWords(manifest.hook_text);
      expect(words).toBeGreaterThanOrEqual(2);
      expect(words).toBeLessThanOrEqual(6);

      // 3. Must strictly satisfy <= 30 characters
      expect(manifest.hook_text.length).toBeLessThanOrEqual(30);

      // 4. Prompt does NOT contain the raw overlong custom hook
      expect(manifest.prompt_16_9).not.toContain(OVERLONG_CUSTOM_HOOK);

      // 5. Prompt contains the guarded hook banner
      expect(manifest.prompt_16_9).toContain(`'${manifest.hook_text}'`);

      // 6. Validation passes
      const validation = validateThumbnailHook(manifest.hook_text);
      expect(validation.valid).toBe(true);
    });
  });

  describe("HTTP Route Integration (/api/channels/:channelId/episodes/:episodeId/thumbnail/generate)", () => {
    it("handles generate request with custom_hook_text via Fastify HTTP endpoint", async () => {
      const channel = await repository.createChannel({ name: "Route Test Channel" });
      const episode = await createArcadeEpisode(repository, channel.channel_id);

      const mockImageProvider = createMockImageProvider(tempDir);
      const server = Fastify();
      await server.register(
        registerThumbnailsRoutes({
          repository,
          state: {
            config: {
              active_engine: "antigravity",
              image_generation: {
                provider: "google",
                api_key: "dummy-key",
                model: "imagen-3",
              },
            },
            storageConfigured: true,
          } as unknown as AppState,
          imageProvider: mockImageProvider,
        }),
      );

      // Test with custom hook override
      const responseWithCustomHook = await server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/thumbnail/generate`,
        payload: {
          custom_hook_text: "ARCADE SECRETS",
          aspect_ratio: "16:9",
        },
      });

      expect(responseWithCustomHook.statusCode).toBe(200);
      const bodyCustom = JSON.parse(responseWithCustomHook.body);
      expect(bodyCustom.ok).toBe(true);
      expect(bodyCustom.manifest.hook_text).toBe("ARCADE SECRETS");
      expect(bodyCustom.manifest.prompt_16_9).toContain("'ARCADE SECRETS'");
      expect(bodyCustom.manifest.prompt_16_9).not.toContain(OVERLONG_TOPIC_TITLE);

      // Test with overlong custom hook override
      const responseWithOverlongHook = await server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/thumbnail/generate`,
        payload: {
          custom_hook_text: OVERLONG_CUSTOM_HOOK,
          aspect_ratio: "16:9",
        },
      });

      expect(responseWithOverlongHook.statusCode).toBe(200);
      const bodyOverlong = JSON.parse(responseWithOverlongHook.body);
      expect(bodyOverlong.ok).toBe(true);
      expect(bodyOverlong.manifest.hook_text.length).toBeLessThanOrEqual(30);
      expect(bodyOverlong.manifest.prompt_16_9).not.toContain(OVERLONG_CUSTOM_HOOK);

      await server.close();
    });
  });

  describe("Pipeline Orchestrator & Runner Integration", () => {
    it("runs runQuizV2Pipeline with customHookText wired through orchestrator input", async () => {
      const channel = await repository.createChannel({ name: "Orchestrator Test Channel" });
      const episode = await createArcadeEpisode(repository, channel.channel_id);

      const validQuiz = {
        schema_version: 2,
        episode_id: episode.episode_id,
        age_band: "7-9",
        language: "en",
        questions: [
          {
            id: "q-1",
            number: 1,
            format: "true_false",
            difficulty: 1,
            question: "Did the original Pac-Man have an impossible kill screen at level 256?",
            choices: [
              { id: "c-a", text: "True" },
              { id: "c-b", text: "False" },
            ],
            correct_choice_id: "c-a",
            explanation: "An 8-bit integer overflow corrupts the right half of level 256.",
            fun_fact: "The right half fills with glitched tiles.",
            source_ids: ["S1"],
            visual_opportunity: "Pac-Man glitched screen",
            validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
          },
        ],
      };
      await repository.writeQuiz(channel.channel_id, episode.episode_id, validQuiz as any);

      const orchestratorInput: QuizOrchestratorInput = {
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        config: {
          audio_generation: { provider: "mock", voice_id: "mock" } as any,
          image_generation: { provider: "google", api_key: "dummy" } as any,
        },
        customHookText: "GAMING SECRETS",
      };

      // Generate thumbnail directly with orchestrator options
      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: orchestratorInput.channelId,
        episodeId: orchestratorInput.episodeId,
        customHookText: orchestratorInput.customHookText,
        aspectRatio: "16:9",
        imageProvider: createMockImageProvider(tempDir),
      });

      expect(manifest.hook_text).toBe("GAMING SECRETS");
      expect(manifest.prompt_16_9).toContain("'GAMING SECRETS'");
      expect(manifest.prompt_16_9).not.toContain(OVERLONG_TOPIC_TITLE);

      const savedManifest = await getEpisodeThumbnailManifest(repository, channel.channel_id, episode.episode_id);
      expect(savedManifest?.hook_text).toBe("GAMING SECRETS");
    });
  });
});
