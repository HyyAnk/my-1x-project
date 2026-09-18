import { episodeCustomizationEn } from "./episodeCustomization";

// Generated domain translation module
export const episodesEn = {
  episode: {
    productionRail: "Production rail",
    scriptReady: "Script ready",
    scenesTitle: "Scenes",
    questionsTitle: "Questions",
    timelineTitle: "Timeline",
    assetsTitle: "Assets",
    voiceTitle: "Voice",
    qaScore: "Quiz QA score",
    notAssessed: "Not assessed",
    buildVideo: "Build video",
    renderingVideo: "Rendering video…",
    renderAgain: "Render again",
    openFolder: "Open folder",
    previewAudio: "Preview audio",
    synthesizingAudio: "Synthesizing dialogue…",
    matchDuration: "Match",
    durationSec: "Duration sec",
    cutsCount: "{seconds}s · {cuts} cuts",
    previewLonger: "Preview is {diff}s longer",
    previewShorter: "Preview is {diff}s shorter",
    renderedVideo: "Rendered video",
    scriptTab: "Script & Narration",
    scenesTab: "Storyboard & Shots",
    videoTab: "Video Output",
    quizQaTab: "QA & Compliance",
  },
  episodeCustomization: {
    ...episodeCustomizationEn.episodeCustomization,
  },
} as const;
