/**
 * Episode and confirmation file path construction utilities.
 */

export interface EpisodePaths {
  script_path: string;
  research_path: string;
  treatment_path: string;
  visual_bible_path: string;
  scene_plan_path: string;
  dialogue_script_path: string;
  video_prompts_path: string;
}

/**
 * Builds standard relative episode document paths for markdown and assets.
 */
export function buildEpisodePaths(channelSlug: string, episodeSlug: string): EpisodePaths {
  const base = `channels/${channelSlug}/episodes/${episodeSlug}`;
  return {
    script_path: `${base}/script.md`,
    research_path: `${base}/research.md`,
    treatment_path: `${base}/treatment.md`,
    visual_bible_path: `${base}/visual_bible.md`,
    scene_plan_path: `${base}/scene_plan.md`,
    dialogue_script_path: `${base}/dialogue_script.md`,
    video_prompts_path: `${base}/video_prompts.md`,
  };
}

/**
 * Returns default initial placeholder documents for a newly created episode directory.
 */
export function getInitialEpisodeDocuments(): Array<{ name: string; content: string }> {
  return [
    { name: "research.md", content: "# Research Dossier\n\nResearch has not started.\n" },
    { name: "treatment.md", content: "# Treatment\n\nTreatment has not started.\n" },
    { name: "script.md", content: "# Script\n\nScript generation has not started.\n" },
    { name: "visual_bible.md", content: "# Episode Visual Bible\n\nVisual development has not started.\n" },
    { name: "scene_plan.md", content: "# Scene Plan\n\nScene breakdown has not started.\n" },
    { name: "dialogue_script.md", content: "# Dialogue Script\n\n" },
    { name: "video_prompts.md", content: "# Video Prompts\n\n" },
  ];
}
