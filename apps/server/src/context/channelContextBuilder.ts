import { readFile } from "node:fs/promises";
import { type Channel, type ContextManifest, type TaskType } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { StudioLogger } from "../logger.js";
import type { ContextFile } from "./contextTypes.js";
import { composeContextPrompt, finalizeContextManifest, readSharedRules } from "./contextManifestFinalizer.js";
import { formatTopicMatrixPrompt, planTopicSuggestionMatrix, type TopicMatrixPlan } from "./topicMatrixPlanner.js";
import { scanBankInventory } from "../quiz/bank/bankInventory.js";
import { allocateSourceBackedTopicSlots, type TopicAllocationResult } from "./bankTopicAllocation.js";
import { formatSourceBackedTopicPrompt } from "./bankTopicPromptBuilder.js";

const assignedTopicPlans = new WeakMap<ContextManifest, TopicMatrixPlan>();
const assignedTopicAllocations = new WeakMap<ContextManifest, TopicAllocationResult>();

export function getAssignedTopicMatrixPlan(manifest: ContextManifest): TopicMatrixPlan | undefined {
  return assignedTopicPlans.get(manifest);
}

export function getAssignedTopicAllocation(manifest: ContextManifest): TopicAllocationResult | undefined {
  return assignedTopicAllocations.get(manifest);
}

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

    const scanResult = await scanBankInventory(repository, {
      channelId,
      targetLanguage: "en",
    });

    const eligibleQuestions = scanResult.eligible_sources.map((s) => s.candidate.question);
    const allocation = allocateSourceBackedTopicSlots({
      questions: eligibleQuestions,
      scanStatus: scanResult.scan_status,
      channelId,
      topicHint,
      taxonomy,
    });

    const fallbackPlan = planTopicSuggestionMatrix({ taxonomy, index: null, topicHint, aspectRatio: "16:9" });

    const matrixPlan: TopicMatrixPlan = {
      slots:
        allocation.allocatedSlots.length > 0
          ? allocation.allocatedSlots.map((s) => ({
              slot: s.slot,
              name: s.name,
              domainId: s.domainId,
              domainTitle: s.domainTitle,
              archetype: s.archetype,
              suggestedLayout: s.suggestedLayout,
              quizFormat: s.quizFormat,
              description: "",
              isKeySteered: s.isKeySteered,
              contentKind: s.contentKind,
            }))
          : fallbackPlan.slots,
      steeredKeyword: topicHint?.trim() || undefined,
      aspectRatio: "16:9",
    };

    let outputContract: string;
    let promptGuidance: string;

    if (allocation.allocatedSlots.length > 0) {
      const sourcePrompt = formatSourceBackedTopicPrompt(allocation, topicHint);
      outputContract = sourcePrompt.outputContract;
      promptGuidance = sourcePrompt.promptGuidance;
    } else {
      const formattedFallback = formatTopicMatrixPrompt(fallbackPlan, topicHint, "16:9");
      outputContract = formattedFallback.outputContract;
      promptGuidance = "No eligible source questions available in question bank.";
    }

    add({
      path: `channels/${channel.slug}/topic_source_context.md`,
      reason: "pre-allocated source questions for topic generation",
      content: promptGuidance,
    });

    const prompt = composeContextPrompt(taskType, channel, null, [...files, ...sharedFiles], {
      output_contract: outputContract,
    });
    const manifest = await finalizeContextManifest(
      repository,
      logger,
      taskType,
      channelId,
      null,
      [...files, ...sharedFiles],
      excluded.concat("research/script/scene work for candidates"),
      prompt,
    );
    for (const slot of matrixPlan.slots) Object.freeze(slot);
    Object.freeze(matrixPlan.slots);
    Object.freeze(matrixPlan);
    assignedTopicPlans.set(manifest, matrixPlan);
    assignedTopicAllocations.set(manifest, allocation);
    return manifest;
  }

  return null;
}
