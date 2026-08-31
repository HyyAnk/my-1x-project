import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { AppConfig, VoiceSegment } from "@studio/shared";
import { synthesizeWav } from "../../providers/chatterbox.js";
import { quizVoiceTempo, voicePerformanceConfig } from "./voiceFingerprint.js";
import { createSilenceWav, paceQuizVoiceAudio, pauseSeconds } from "./voicePacingClamper.js";

const execFileAsync = promisify(execFile);

export async function renderPerformanceSegment(
  config: AppConfig["audio_generation"],
  segment: VoiceSegment,
  voice: string,
  directory: string,
  segmentNumber: number,
): Promise<Uint8Array> {
  const phrases = segment.phrases.length
    ? segment.phrases
    : [{ text: segment.text, delivery: "normal" as const, pause_after: "none" as const }];
  const phrasePaths: string[] = [];
  try {
    const renderedPhrases = await Promise.all(
      phrases.map(async (phrase, phraseIndex) => {
        const raw = await synthesizeWav(voicePerformanceConfig(config, segment.role), phrase.text, voice);
        const gainDb = segment.role === "reveal" ? 2.0 : segment.role === "intro" || segment.role === "outro" ? 1.5 : 0;
        const paced = await paceQuizVoiceAudio(raw, quizVoiceTempo(segment.role), directory, segmentNumber * 100 + phraseIndex + 1, gainDb);
        const phrasePath = path.join(directory, `segment-${String(segmentNumber).padStart(3, "0")}-phrase-${phraseIndex + 1}.wav`);
        await writeFile(phrasePath, paced);
        return { phraseIndex, phrasePath };
      }),
    );
    renderedPhrases.sort((a, b) => a.phraseIndex - b.phraseIndex);
    for (const item of renderedPhrases) {
      phrasePaths.push(item.phrasePath);
    }
    if (phrasePaths.length === 1) return new Uint8Array(await readFile(phrasePaths[0]));
    return await concatenatePerformancePhrases(phrasePaths, phrases, directory, segmentNumber);
  } finally {
    await Promise.all(phrasePaths.map((file) => rm(file, { force: true })));
  }
}

async function concatenatePerformancePhrases(
  paths: string[],
  phrases: VoiceSegment["phrases"],
  directory: string,
  segmentNumber: number,
): Promise<Uint8Array> {
  const outputPath = path.join(directory, `segment-${String(segmentNumber).padStart(3, "0")}-joined.wav`);
  const concatManifestPath = path.join(directory, `segment-${String(segmentNumber).padStart(3, "0")}-concat.txt`);
  const temporaryFiles: string[] = [concatManifestPath];

  try {
    const manifestLines: string[] = [];
    for (const [index, phrasePath] of paths.entries()) {
      const normalizedPath = phrasePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
      manifestLines.push(`file '${normalizedPath}'`);
      const pauseClass = phrases[index]?.pause_after ?? "none";
      if (index < paths.length - 1 && pauseClass !== "none") {
        const seconds = pauseSeconds(pauseClass, segmentNumber, index);
        if (seconds > 0) {
          const pausePath = path.join(directory, `segment-${String(segmentNumber).padStart(3, "0")}-pause-${index}.wav`);
          await writeFile(pausePath, createSilenceWav(seconds));
          temporaryFiles.push(pausePath);
          const normalizedPause = pausePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
          manifestLines.push(`file '${normalizedPause}'`);
        }
      }
    }
    await writeFile(concatManifestPath, manifestLines.join("\n") + "\n", "utf8");

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatManifestPath,
        "-af",
        "aformat=sample_rates=48000:channel_layouts=stereo,asetpts=N/SR/TB",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-c:a",
        "pcm_s16le",
        outputPath,
      ],
      { timeout: 2 * 60_000, windowsHide: true },
    );
    return new Uint8Array(await readFile(outputPath));
  } finally {
    await Promise.all([rm(outputPath, { force: true }), ...temporaryFiles.map((file) => rm(file, { force: true }))]);
  }
}
