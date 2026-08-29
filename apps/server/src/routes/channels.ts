import type { FastifyPluginCallback } from "fastify";
import {
  AssignMascotInputSchema,
  AssignVoiceInputSchema,
  CreateChannelInputSchema,
  SaveTextInputSchema,
  SuggestTopicsInputSchema,
  TopicConfirmInputSchema,
  UpdateChannelInputSchema,
  VoiceReferenceUploadSchema,
} from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { TaskManager } from "../tasks.js";
import type { AppState } from "./state.js";
import { createVoiceWithPreview } from "./voiceHelpers.js";

export type ChannelsRouteDeps = {
  repository: RepositoryService;
  tasks: TaskManager;
  logger: StudioLogger;
  state: AppState;
};

export function registerChannelsRoutes(deps: ChannelsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, tasks, logger, state } = deps;
    server.get("/api/channels", async (request) => {
      const query = request.query as { includeArchived?: string };
      return { channels: await repository.listChannels(query.includeArchived !== "false") };
    });
    server.post("/api/channels", async (request, reply) => {
      const input = CreateChannelInputSchema.parse(request.body);
      const channel = await repository.createChannel(input);
      const task = input.dna_mode === "ai" ? tasks.submit("GENERATE_DNA", channel.channel_id, null) : null;
      return reply.code(201).send({ channel, task });
    });
    server.patch("/api/channels/:channelId", async (request) => {
      const params = request.params as { channelId: string };
      const patch = UpdateChannelInputSchema.parse(request.body);
      return repository.updateChannel(params.channelId, patch);
    });
    server.put("/api/channels/:channelId/voice", async (request) => {
      const channelId = (request.params as { channelId: string }).channelId;
      const { voice_id: voiceId } = AssignVoiceInputSchema.parse(request.body);
      return repository.assignVoice(channelId, voiceId);
    });
    server.put("/api/channels/:channelId/voice-reference", async (request) => {
      const { data } = VoiceReferenceUploadSchema.parse(request.body);
      const audio = Buffer.from(data, "base64");
      if (audio.length < 12 || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") {
        throw new RepositoryError("Voice reference must be a WAV file", "INVALID_AUDIO");
      }
      const channelId = (request.params as { channelId: string }).channelId;
      const channel = await repository.getChannel(channelId);
      const voice = await createVoiceWithPreview(
        repository,
        `${channel.display_name} (uploaded)`,
        audio,
        state.config.audio_generation,
        logger,
      );
      const assigned = await repository.assignVoice(channelId, voice.voice_id);
      return { path: assigned.voice_reference_path, modified_at: new Date().toISOString(), voice, channel: assigned };
    });
    server.put("/api/channels/:channelId/mascot", async (request) => {
      const channelId = (request.params as { channelId: string }).channelId;
      const { mascot_id: mascotId, config: mascotConfig } = AssignMascotInputSchema.parse(request.body);
      const updatedChannel = await repository.assignMascotToChannel(channelId, mascotId, mascotConfig);
      return { channel: updatedChannel };
    });
    server.delete("/api/channels/:channelId", async (request) => {
      const params = request.params as { channelId: string };
      const query = request.query as { confirm?: string };
      await repository.deleteChannel(params.channelId, query.confirm === "true");
      return { ok: true };
    });
    server.get("/api/channels/:channelId/dna", async (request) =>
      repository.getChannelDna((request.params as { channelId: string }).channelId),
    );
    server.put("/api/channels/:channelId/dna", async (request) => {
      const { content } = SaveTextInputSchema.parse(request.body);
      return repository.saveChannelDna((request.params as { channelId: string }).channelId, content);
    });
    server.post("/api/channels/:channelId/dna/generate", async (request, reply) => {
      const channelId = (request.params as { channelId: string }).channelId;
      const task = tasks.submit("GENERATE_DNA", channelId, null);
      return reply.code(202).send({ task });
    });
    server.post("/api/channels/:channelId/dna/reset", async (request) => {
      const channelId = (request.params as { channelId: string }).channelId;
      return repository.resetChannelDna(channelId);
    });
    server.get("/api/channels/:channelId/topics", async (request) => ({
      topics: await repository.listTopics((request.params as { channelId: string }).channelId),
    }));
    server.post("/api/channels/:channelId/topics/suggest", async (request, reply) => {
      const channelId = (request.params as { channelId: string }).channelId;
      const payload = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
      const input = SuggestTopicsInputSchema.parse(payload);
      const task = tasks.submit("SUGGEST_TOPICS", channelId, null, undefined, undefined, input.topic_hint);
      return reply.code(202).send({ task });
    });
    server.post("/api/channels/:channelId/topics/:topicId/confirm", async (request, reply) => {
      const params = request.params as { channelId: string; topicId: string };
      const payload = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
      const input = TopicConfirmInputSchema.parse({ ...payload, topic_id: params.topicId });
      return reply
        .code(201)
        .send({ episode: await repository.confirmTopic(params.channelId, input.topic_id, input.question_count, input.visual_style) });
    });
    done();
  };
}
