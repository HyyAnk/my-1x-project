import { createReadStream } from "node:fs";
import type { FastifyPluginCallback } from "fastify";
import { CreateVoiceInputSchema } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { AppState } from "./state.js";
import { createVoiceWithPreview } from "./voiceHelpers.js";

export type VoicesRouteDeps = {
  repository: RepositoryService;
  logger: StudioLogger;
  state: AppState;
};

export function registerVoicesRoutes(deps: VoicesRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, logger, state } = deps;
    server.get("/api/voices", async () => ({ voices: await repository.listVoices() }));
    server.get("/api/voices/:voiceId/sample", async (request, reply) => {
      const file = await repository.getVoiceSampleFile((request.params as { voiceId: string }).voiceId);
      return reply.headers({ "content-type": "audio/wav", "content-length": file.size, "cache-control": "no-store" }).send(createReadStream(file.absolutePath));
    });
    server.post("/api/voices", async (request) => {
      const input = CreateVoiceInputSchema.parse(request.body);
      const audio = Buffer.from(input.data, "base64");
      if (audio.length < 12 || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") {
        throw new RepositoryError("Voice reference must be a WAV file", "INVALID_AUDIO");
      }
      return createVoiceWithPreview(repository, input.name, audio, state.config.audio_generation, logger);
    });
    server.delete("/api/voices/:voiceId", async (request) => {
      await repository.deleteVoiceProfile((request.params as { voiceId: string }).voiceId);
      return { ok: true };
    });
    done();
  };
}
