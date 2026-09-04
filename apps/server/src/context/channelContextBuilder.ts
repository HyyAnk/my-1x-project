import { readFile } from "node:fs/promises";
import { type Channel, type ContextManifest, type TaskType, QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { StudioLogger } from "../logger.js";
import type { ContextFile } from "./contextTypes.js";
import { composeContextPrompt, finalizeContextManifest, readSharedRules } from "./contextManifestFinalizer.js";

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
    const hintGuidance = topicHint?.trim()
      ? `\nIMPORTANT TOPIC THEME REQUIREMENT: The user specifically requested ideas relating to "${topicHint.trim()}". Exactly 2 candidates MUST be directly inspired by, focused on, or explore specific creative angles of "${topicHint.trim()}" (include "theme_hint": "${topicHint.trim()}" in those 2 JSON objects). The remaining 3 candidates should be diverse, creative topics aligned with the overall channel DNA.`
      : "";
    const blueprintGuidance = `\nGAMEPLAY ARCHETYPE BLUEPRINTS FOR DIVERSITY:
- Slot 1 (Deep Trivia): Knowledge/story quiz with a single hero subject scene (quiz_format: "knowledge" or "multiple_choice").
- Slot 2 (Visual Spotting / Identification): Visual challenge or odd-one-out spotting (quiz_format: "odd_one_out" or "image_guess").
- Slot 3 (Fact or Myth): Surprising truths vs myths with True/False verdict (quiz_format: "true_false").
- Slot 4 (Versus / Face-off / Fast Trivia): Head-to-head comparison or rapid-fire reflection (quiz_format: "multiple_choice").
- Slot 5 (Wildcard Discovery): High-curiosity creative format aligned with channel DNA.`;
    const prompt = composeContextPrompt(taskType, channel, null, [...files, ...sharedFiles], {
      output_contract: `Return exactly 5 JSON candidates with title, premise, why_it_fits, hook, estimated_potential, quiz_format (knowledge|image_guess|multiple_choice|true_false|odd_one_out), question_count (${QUIZ_MIN_QUESTION_COUNT}-${QUIZ_MAX_QUESTION_COUNT}), and age_band (4-6|7-9|10-12|family). Use five different formats where possible.${blueprintGuidance}${hintGuidance} Do not research or develop them further.`,
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
