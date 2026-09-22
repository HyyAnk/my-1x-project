import { makeId } from "@studio/shared";
import type { FastifyInstance } from "fastify";
import { IntroOutroScriptError } from "../../introOutroScripts/errors.js";
import { BUILT_IN_INTRO_OUTRO_SEEDS, latestSeedCatalog } from "../../introOutroScripts/seedCatalog.js";
import { CreateSeedInputSchema, UpdateSeedInputSchema } from "./schemas.js";
import { loadSeedCatalog } from "./seedHelpers.js";
import type { IntroOutroScriptRouteDeps } from "./types.js";

export function registerSeedRoutes(server: FastifyInstance, deps: IntroOutroScriptRouteDeps): void {
  server.get("/api/channels/:channelId/intro-outro-seeds", async (request) => {
    const { channelId } = request.params as { channelId: string };
    const catalog = await loadSeedCatalog(deps.scripts, channelId);
    return { seeds: catalog.latest };
  });

  server.post("/api/channels/:channelId/intro-outro-seeds", async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const input = CreateSeedInputSchema.parse(request.body);
    if (input.id && BUILT_IN_INTRO_OUTRO_SEEDS.some((seed) => seed.id === input.id)) {
      throw new IntroOutroScriptError("Custom seed IDs cannot replace built-in seeds", "CUSTOM_SEED_ID_CONFLICT");
    }
    assertDimensionMatchesClip(input.dimension, input.clip_kind);
    const seed = await deps.scripts.saveCustomSeed(channelId, {
      ...input,
      id: input.id ?? makeId("seed"),
      revision: 1,
      origin: "custom",
      status: "active",
    });
    return reply.status(201).send({ seed });
  });

  server.patch("/api/channels/:channelId/intro-outro-seeds/:seedId", async (request) => {
    const { channelId, seedId } = request.params as { channelId: string; seedId: string };
    const input = UpdateSeedInputSchema.parse(request.body);
    const customSeeds = await deps.scripts.listCustomSeeds(channelId);
    const current = latestSeedCatalog(customSeeds).find((seed) => seed.id === seedId);
    if (!current) throw new IntroOutroScriptError("Custom seed not found", "CUSTOM_SEED_NOT_FOUND");
    if (current.revision !== input.expected_revision) {
      throw new IntroOutroScriptError("The custom seed changed. Reload it before saving.", "VERSION_CONFLICT");
    }
    const { expected_revision: _expectedRevision, ...patch } = input;
    const next = { ...current, ...patch };
    assertDimensionMatchesClip(next.dimension, next.clip_kind);
    return { seed: await deps.scripts.saveCustomSeed(channelId, next) };
  });
}

function assertDimensionMatchesClip(dimension: string, clipKind: "intro" | "outro"): void {
  if (!dimension.startsWith(`${clipKind}_`)) {
    throw new IntroOutroScriptError("Seed dimension must match its clip kind", "CUSTOM_SEED_INVALID");
  }
}
