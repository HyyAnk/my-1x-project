import type { TaskManagerRuntime, ActiveRun } from "../runtime.js";
import { extractMarkdown, extractScriptMarkdown, parseTopicCandidates } from "../parsers.js";
import { validateQuizResearch, validateQuizScript, validateQuizTreatment, validateQuizVisualBible } from "../validators.js";

export async function handleTextArtifactOutput(runtime: TaskManagerRuntime, active: ActiveRun, output: string): Promise<string[] | null> {
  const task = active.task;

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
    validateQuizResearch(research, episode.quiz_config.question_count);
    await runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "research.md", research);
    await runtime.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "RESEARCH_READY");
    const file = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "research.md");
    return [file.path];
  }

  if (task.task_type === "GENERATE_TREATMENT") {
    const treatment = extractMarkdown(output, "# Treatment");
    const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
    validateQuizTreatment(treatment, episode.quiz_config.question_count);
    await runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "treatment.md", treatment);
    await runtime.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "TREATMENT_READY");
    const file = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "treatment.md");
    return [file.path];
  }

  if (task.task_type === "GENERATE_SCRIPT") {
    const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
    const script = extractScriptMarkdown(output, episode.topic.title);
    validateQuizScript(script, episode.quiz_config.question_count);
    await runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "script.md", script);
    await runtime.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "SCRIPT_READY");
    const file = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "script.md");
    return [file.path];
  }

  if (task.task_type === "GENERATE_VISUAL_BIBLE") {
    const visualBible = extractMarkdown(output, "# Episode Visual Bible");
    const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
    const requiredSections = Array.from({ length: episode.quiz_config.question_count }, (_, index) => index + 1);
    validateQuizVisualBible(visualBible, requiredSections);
    await runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md", visualBible);
    await runtime.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "VISUAL_BIBLE_READY");
    const file = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md");
    return [file.path];
  }

  return null;
}
