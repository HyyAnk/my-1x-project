import fs from "node:fs";
import path from "node:path";
import { assessQuiz } from "../src/quiz/qa/quizAssessment.js";

const storageEpDir = "D:/1a Cursor Project/My 1x Youtube Channel File/channels/novy/episodes/arcade-game-secrets-true-or-false-gaming-showdown";
const channelPath = "D:/1a Cursor Project/My 1x Youtube Channel File/channels/novy/channel.json";
const mascotPath = "D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/mascots/mascot_22cb190ece7b4475/mascot.json";

function loadJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function runRemediation(): void {
  const quiz = loadJson(path.join(storageEpDir, "quiz/quiz-v2.json"));
  const director = loadJson(path.join(storageEpDir, "quiz/director-plan.json"));
  const assetPlan = loadJson(path.join(storageEpDir, "quiz/asset-plan.json"));
  const assetRes = loadJson(path.join(storageEpDir, "quiz/asset-resolution.json"));
  const voicePlan = loadJson(path.join(storageEpDir, "quiz/voice-plan.json"));
  const timeline = loadJson(path.join(storageEpDir, "quiz/timeline.json"));

  const channel = fs.existsSync(channelPath) ? loadJson(channelPath) : null;
  const mascot = fs.existsSync(mascotPath) ? loadJson(mascotPath) : null;

  const assessment = assessQuiz({
    quiz,
    director,
    assetPlan,
    resolvedAssets: assetRes.assets,
    voicePlan,
    timeline,
    measuredAudio: true,
    renderIntegrity: true,
    mascot,
    mascotConfig: channel?.mascot_config,
  });

  console.log("=== Active Episode Assessment Results ===");
  console.log("Rating:", assessment.rating);
  console.log("Score:", assessment.score);
  console.log("Categories:", JSON.stringify(assessment.categories, null, 2));
  console.log("Issues count:", assessment.issues.length);
  console.log("Issues:", JSON.stringify(assessment.issues, null, 2));

  // Write updated qa.json to active episode
  const qaPath = path.join(storageEpDir, "quiz/qa.json");
  fs.writeFileSync(qaPath, JSON.stringify(assessment, null, 2), "utf8");
  console.log("Updated active episode quiz/qa.json successfully.");
}

runRemediation();
