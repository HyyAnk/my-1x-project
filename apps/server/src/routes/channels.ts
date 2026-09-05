import type { FastifyPluginCallback } from "fastify";
import {
  AssignMascotInputSchema,
  AssignVoiceInputSchema,
  CreateChannelInputSchema,
  resolveMascotStageDefaultPlacement,
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
import { createEpisodeFromTopicWithBank } from "../quiz/bank/questionBankToQuizBridge.js";
import type { LLMClient } from "../utils/promptSanitizer.js";

export type ChannelsRouteDeps = {
  repository: RepositoryService;
  tasks: TaskManager;
  logger: StudioLogger;
  state: AppState;
  llmClient?: LLMClient | null;
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
      const channel = await repository.getChannel(channelId);
      const isNewAssignment = Boolean(mascotId && mascotId !== channel.mascot_id);
      let initialConfig = undefined;
      if (isNewAssignment && !mascotConfig) {
        const default169 = resolveMascotStageDefaultPlacement(state.config.mascot_stage, "16:9");
        const default916 = resolveMascotStageDefaultPlacement(state.config.mascot_stage, "9:16");
        initialConfig = {
          enabled: true,
          position: default169.position,
          scale: default169.scale,
          offset_x: default169.offset_x,
          offset_y: default169.offset_y,
          flip_x: default169.flip_x,
          show_in_question: true,
          placements: {
            "16:9": default169,
            "9:16": default916,
          },
        };
      }
      const config = mascotConfig ?? initialConfig;
      const updatedChannel = await repository.assignMascotToChannel(channelId, mascotId, config);
      return { channel: updatedChannel };
    });
    server.delete("/api/channels/:channelId", async (request) => {
      const params = request.params as { channelId: string };
      const query = request.query as { confirm?: string };
      if (tasks.hasActiveChannelTasks(params.channelId)) {
        throw new RepositoryError("Channel has active tasks. Cancel them before deleting the channel", "CHANNEL_TASK_ACTIVE");
      }
      await repository.deleteChannel(params.channelId, query.confirm === "true");
      await tasks.pruneChannelTasks(params.channelId);
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
      const result = await createEpisodeFromTopicWithBank({
        repository,
        tasks,
        channelId: params.channelId,
        llmClient: deps.llmClient,
        input: {
          topic_id: input.topic_id,
          question_count: input.question_count,
          visual_style: input.visual_style,
          auto_start_pipeline: input.auto_start_pipeline ?? true,
          render_aspect_ratio: input.render_aspect_ratio,
        },
      });
      return reply.code(201).send(result);
    });
    done();
  };
}
