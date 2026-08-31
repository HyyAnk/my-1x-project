import type { Channel } from "@studio/shared";
import type { TaskManagerRuntime, ActiveRun } from "../runtime.js";
import { calibratedScriptTargetWords } from "../../production.js";
import { extractArtifactSectionNumbers } from "../../artifactSections.js";
import { extractMarkdown, extractScriptMarkdown, parseTopicCandidates } from "../parsers.js";
import {
  validateQuizResearch,
  validateQuizScript,
  validateQuizTreatment,
  validateQuizVisualBible,
  validateResearch,
  validateScript,
  validateTreatment,
  validateVisualBible,
} from "../validators.js";

export async function handleTextArtifactOutput(
  runtime: TaskManagerRuntime,
  active: ActiveRun,
  channel: Channel,
  output: string,
): Promise<string[] | null> {
  const task = active.task;
  const isQuiz = channel.engine === "quiz";

  if (task.task_type === "GENERATE_DNA") {
    await runtime.repository.saveChannelDna(task.channel_id, extractMarkdown(output, "# Channel DNA"));
    const updatedChannel = await runtime.repository.getChannel(task.channel_id);
    return [`channels/${updatedChannel.slug}/channel_dna.md`];
  }

  if (task.task_type === "SUGGEST_TOPICS") {
    const topicHint = runtime.topicHints.get(task.task_id);
    const candidates = parseTopicCandidates(output, task.channel_id, topicHint);
    await runtime.repository.saveTopicRun(task.channel_id, candidates);
    const updatedChannel = await runtime.repository.getChannel(task.channel_id);
    return [`channels/${updatedChannel.slug}/topics/`];
  }

  if (task.task_type === "GENERATE_RESEARCH") {
    const research = extractMarkdown(output, "# Research Dossier");
    const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
    if (isQuiz) validateQuizResearch(research, episode.quiz_config.question_count);
    else validateResearch(research);
    await runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "research.md", research);
    await runtime.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "RESEARCH_READY");
    const file = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "research.md");
    return [file.path];
  }

  if (task.task_type === "GENERATE_TREATMENT") {
    const treatment = extractMarkdown(output, "# Treatment");
    const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
    if (isQuiz) validateQuizTreatment(treatment, episode.quiz_config.question_count);
    else validateTreatment(treatment);
    await runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "treatment.md", treatment);
    await runtime.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "TREATMENT_READY");
    const file = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "treatment.md");
    return [file.path];
  }

  if (task.task_type === "GENERATE_SCRIPT") {
    const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
    const script = extractScriptMarkdown(output, episode.topic.title);
    if (isQuiz) validateQuizScript(script, episode.quiz_config.question_count);
    else validateScript(script, calibratedScriptTargetWords(episode, runtime.videoConfig.narration_words_per_second));
    await runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "script.md", script);
    await runtime.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "SCRIPT_READY");
    const file = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "script.md");
    return [file.path];
  }

  if (task.task_type === "GENERATE_VISUAL_BIBLE") {
    const visualBible = extractMarkdown(output, "# Episode Visual Bible");
    const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
    const treatment = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "treatment.md");
    const requiredSections = isQuiz
      ? Array.from({ length: episode.quiz_config.question_count }, (_, index) => index + 1)
      : extractArtifactSectionNumbers(treatment.content, "sequence");
    if (isQuiz) validateQuizVisualBible(visualBible, requiredSections);
    else validateVisualBible(visualBible, requiredSections);
    await runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md", visualBible);
    await runtime.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "VISUAL_BIBLE_READY");
    const file = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md");
    return [file.path];
  }

  return null;
}
