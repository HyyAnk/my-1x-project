import { readFile } from "node:fs/promises";
import { type Channel, type ContextManifest, type TaskType, QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { StudioLogger } from "../logger.js";
import type { ContextFile } from "./contextTypes.js";
import { composeContextPrompt, finalizeContextManifest, readSharedRules } from "./contextManifestFinalizer.js";
import { formatTopicMatrixPrompt, planTopicSuggestionMatrix } from "./topicMatrixPlanner.js";

export async function buildChannelContext(input: {
  repository: RepositoryService;
  logger: StudioLogger;
  channel: Channel;
  taskType: TaskType;
  channelId: string;
  topicHint?: string;
}): Promise<ContextManifest | null> {
  const { repository, logger, channel, taskType, channelId, topicHint } = input;
  const files: ContextFile[] = [];
  const sharedFiles: ContextFile[] = [];
  const excluded = ["other channels", "full unrelated episodes", "raw task history", "secrets and credentials"];

  const add = (file: ContextFile) => files.push(file);
  const read = async (relativePath: string, reason: string): Promise<string> => {
    const absolute = repository.resolveContextPath(relativePath);
    try {
      const content = await readFile(absolute, "utf8");
      add({ path: relativePath, reason, content });
      return content;
    } catch {
      return "";
    }
  };

  const dnaPath = `channels/${channel.slug}/channel_dna.md`;
  const stylePath = `channels/${channel.slug}/style_guide.md`;

  if (taskType === "GENERATE_DNA") {
    const template = await read("templates/quiz_channel_dna.md", "canonical DNA schema");
    const prompt = composeContextPrompt(taskType, channel, null, files, {
      user_description: channel.description,
      metadata: {
        name: channel.display_name,
        audience: channel.target_audience,
        language: channel.language,
        market: channel.market,
      },
      template,
      output_contract: "Return only the completed Markdown DNA document. Do not write files or perform research.",
    });
    return finalizeContextManifest(repository, logger, taskType, channelId, null, files, excluded, prompt);
  }

  if (taskType === "SUGGEST_TOPICS") {
    await read(dnaPath, "active channel DNA");
    await read(stylePath, "channel style guide");
    await readSharedRules(repository, ["research_rules.md"], sharedFiles);
    const topics = await repository.listTopics(channelId);
    const episodes = await repository.listEpisodes(channelId);
    add({
      path: `channels/${channel.slug}/topic_database.json`,
      reason: "existing titles and premises only",
      content: JSON.stringify(topics.map(({ title, premise }) => ({ title, premise }))),
    });
    add({
      path: `channels/${channel.slug}/episodes/index.json`,
      reason: "existing episode titles only",
      content: JSON.stringify(episodes.map((episode) => episode.topic.title)),
    });
    let taxonomy = null;
    try {
      if (typeof repository.readQuestionBankTaxonomy === "function") {
        taxonomy = await repository.readQuestionBankTaxonomy();
      }
    } catch {
      taxonomy = null;
    }

    let index = null;
    try {
      if (typeof repository.readQuestionBankIndex === "function") {
        index = await repository.readQuestionBankIndex();
      }
    } catch {
      index = null;
    }

    const matrixPlan = planTopicSuggestionMatrix({ taxonomy, index, topicHint });
    const { outputContract } = formatTopicMatrixPrompt(matrixPlan, topicHint);

    const prompt = composeContextPrompt(taskType, channel, null, [...files, ...sharedFiles], {
      output_contract: outputContract,
    });
    return finalizeContextManifest(
      repository,
      logger,
      taskType,
      channelId,
      null,
      [...files, ...sharedFiles],
      excluded.concat("research/script/scene work for candidates"),
      prompt,
    );
  }

  return null;
}
