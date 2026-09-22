import { makeId, nowIso, type MascotStyleIdentityProfile } from "@studio/shared";
import type { FastifyInstance } from "fastify";
import { resolveIntroOutroContext, resolveIntroOutroContextPreview } from "../../introOutroScripts/contextResolver.js";
import { IntroOutroScriptError } from "../../introOutroScripts/errors.js";
import { listEligibleSeeds } from "../../introOutroScripts/seedCatalog.js";
import { AnalyzeContextInputSchema, ContextQuerySchema, ReviewIdentityInputSchema } from "./schemas.js";
import { loadSeedCatalog } from "./seedHelpers.js";
import type { IntroOutroScriptRouteDeps } from "./types.js";

export function registerContextRoutes(server: FastifyInstance, deps: IntroOutroScriptRouteDeps): void {
  server.get("/api/channels/:channelId/intro-outro-context", async (request) => {
    const { channelId } = request.params as { channelId: string };
    const query = ContextQuerySchema.parse(request.query);
    const resolved = await resolveIntroOutroContextPreview({
      repository: deps.repository,
      scripts: deps.scripts,
      channelId,
      stylePresetId: query.style_preset_id,
      mascotStyleId: query.mascot_style_id,
    });
    const { latest } = await loadSeedCatalog(deps.scripts, channelId);
    return {
      context: resolved.publicContext,
      identity: resolved.identity,
      seeds: listEligibleSeeds(latest, resolved.identity),
    };
  });

  server.post("/api/channels/:channelId/intro-outro-context/analyze", async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const input = AnalyzeContextInputSchema.parse(request.body);
    await resolveIntroOutroContext({
      repository: deps.repository,
      scripts: deps.scripts,
      channelId,
      stylePresetId: input.style_preset_id,
      mascotStyleId: input.mascot_style_id,
    });
    const job = await deps.jobs.startIdentityAnalysis({
      channelId,
      stylePresetId: input.style_preset_id,
      mascotStyleId: input.mascot_style_id,
      idempotencyKey: input.idempotency_key,
    });
    return reply.status(202).send({ job });
  });

  server.put("/api/channels/:channelId/intro-outro-context/review", async (request) => {
    const { channelId } = request.params as { channelId: string };
    const input = ReviewIdentityInputSchema.parse(request.body);
    const context = await resolveIntroOutroContext({
      repository: deps.repository,
      scripts: deps.scripts,
      channelId,
      stylePresetId: input.style_preset_id,
      mascotStyleId: input.mascot_style_id,
    });
    if (
      input.profile.mascot_id !== context.mascot.id ||
      input.profile.mascot_style_id !== context.style.id ||
      (input.profile.source !== "manual" && input.profile.reference_sha256 !== context.mascotReference.sha256)
    ) {
      throw new IntroOutroScriptError("Identity review does not match the current mascot style reference", "IDENTITY_CONTEXT_MISMATCH");
    }
    const current = await deps.scripts.getIdentityProfile(context.mascot.id, context.style.id);
    if (input.expected_updated_at !== undefined && (current?.updated_at ?? null) !== input.expected_updated_at) {
      throw new IntroOutroScriptError("The identity profile changed. Reload it before saving.", "VERSION_CONFLICT");
    }
    const now = nowIso();
    const profile: MascotStyleIdentityProfile = {
      ...input.profile,
      profile_id: current?.profile_id ?? input.profile.profile_id ?? makeId("mascot_identity"),
      mascot_id: context.mascot.id,
      mascot_style_id: context.style.id,
      style_preset_id: input.style_preset_id,
      style_revision: context.style.style_revision ?? 1,
      reference_asset_url: context.mascotReference.url,
      reference_sha256: context.mascotReference.sha256,
      reference_mime_type: context.mascotReference.mimeType,
      status: "reviewed",
      source: input.profile.source,
      created_at: current?.created_at ?? input.profile.created_at ?? now,
      updated_at: now,
      reviewed_at: now,
    };
    return { identity: await deps.scripts.saveIdentityProfile(profile) };
  });
}
