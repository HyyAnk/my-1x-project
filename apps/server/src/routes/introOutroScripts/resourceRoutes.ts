import sharp from "sharp";
import type { FastifyInstance } from "fastify";
import { resolveIntroOutroContextPreview } from "../../introOutroScripts/contextResolver.js";
import { existingTransparentImage } from "../../introOutroScripts/resourceImages.js";
import { ContextQuerySchema } from "./schemas.js";
import type { IntroOutroScriptRouteDeps } from "./types.js";

export function registerResourceRoutes(server: FastifyInstance, deps: IntroOutroScriptRouteDeps): void {
  const base = "/api/channels/:channelId/intro-outro-resources";
  const resolve = (channelId: string, query: unknown) => {
    const input = ContextQuerySchema.parse(query);
    return resolveIntroOutroContextPreview({ ...deps, channelId, stylePresetId: input.style_preset_id });
  };
  server.get(base, async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const context = await resolve(channelId, request.query);
    const query = new URLSearchParams({ style_preset_id: context.publicContext.style_preset_id });
    const resources = await Promise.all(
      (["mascot", "logo"] as const).map(async (kind) => ({
        kind,
        preview_url: (kind === "mascot" ? context.mascotReference : context.logoReference)?.url ?? null,
        transparent_url: (await existingTransparentImage(deps.repository, context, kind))
          ? `/api/channels/${encodeURIComponent(channelId)}/intro-outro-resources/${kind}?${query}`
          : null,
      })),
    );
    return reply.header("cache-control", "no-store").send({ resources });
  });
  server.get(`${base}/:kind`, async (request, reply) => {
    const { channelId, kind } = request.params as { channelId: string; kind: string };
    if (kind !== "mascot" && kind !== "logo") return reply.code(404).send({ error: "Resource not found" });
    const context = await resolve(channelId, request.query);
    const filename = await existingTransparentImage(deps.repository, context, kind);
    if (!filename) return reply.code(404).send({ error: "Transparent image unavailable" });
    return reply
      .header("cache-control", "no-store")
      .type("image/png")
      .send(await sharp(filename).png().toBuffer());
  });
}
