import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { QuizTimeline, VoicePlan } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { wavDurationSeconds } from "../../utils/binary.js";
import { audioDiagnosticsForTimeline, type VoiceAudioDiagnostics } from "./audioDiagnostics.js";
import { countQuizVoiceWords } from "./voicePolicy.js";
import { createSilenceWav } from "./voicePacingClamper.js";

const execFileAsync = promisify(execFile);

export async function assembleQuizNarration(input: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  voicePlan: VoicePlan;
  timeline: QuizTimeline;
  segmentPaths: Map<string, string>;
}): Promise<{ assetPath: string; durationSeconds: number; diagnostics: VoiceAudioDiagnostics }> {
  const narrationEvents = input.timeline.events
    .filter((event) => event.type === "narration.segment" && event.segment_id)
    .sort((left, right) => left.at_seconds - right.at_seconds);
  if (narrationEvents.length === 0) throw new Error("Quiz timeline has no narration segments");

  const workingDirectory = input.repository.resolvePath("runtime", "quiz-voice", input.episodeId);
  await mkdir(workingDirectory, { recursive: true });
  const outputPath = path.join(workingDirectory, "narration.wav");
  const concatManifestPath = path.join(workingDirectory, "narration-concat.txt");
  const temporaryFiles: string[] = [concatManifestPath];

  try {
    const manifestLines: string[] = [];
    let currentPosition = 0;

    for (const [index, event] of narrationEvents.entries()) {
      const source = input.segmentPaths.get(event.segment_id!);
      if (!source) throw new Error("Quiz narration source is missing for " + event.segment_id);

      const targetStart = Number(event.at_seconds.toFixed(3));
      if (targetStart > currentPosition + 0.002) {
        const gap = Number((targetStart - currentPosition).toFixed(3));
        const silencePath = path.join(workingDirectory, `silence-${String(index).padStart(4, "0")}.wav`);
        await writeFile(silencePath, createSilenceWav(gap));
        temporaryFiles.push(silencePath);
        const normalizedSilence = silencePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
        manifestLines.push(`file '${normalizedSilence}'`);
        currentPosition = targetStart;
      }

      const normalizedSource = source.replace(/\\/g, "/").replace(/'/g, "'\\''");
      manifestLines.push(`file '${normalizedSource}'`);
      currentPosition += Number(event.duration_seconds.toFixed(3));
    }

    const totalDuration = Number(input.timeline.duration_seconds.toFixed(3));
    if (totalDuration > currentPosition + 0.002) {
      const trailingGap = Number((totalDuration - currentPosition).toFixed(3));
      const trailingSilencePath = path.join(workingDirectory, "silence-end.wav");
      await writeFile(trailingSilencePath, createSilenceWav(trailingGap));
      temporaryFiles.push(trailingSilencePath);
      const normalizedTrailing = trailingSilencePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
      manifestLines.push(`file '${normalizedTrailing}'`);
    }

    await writeFile(concatManifestPath, manifestLines.join("\n") + "\n", "utf8");

    const duration = totalDuration;
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
        `aformat=sample_rates=48000:channel_layouts=stereo,atrim=duration=${duration},asetpts=N/SR/TB,loudnorm=I=-16:TP=-1.5:LRA=7`,
        "-ar",
        "48000",
        "-ac",
        "2",
        "-c:a",
        "pcm_s16le",
        outputPath,
      ],
      { timeout: 10 * 60_000, windowsHide: true },
    );

    const audio = new Uint8Array(await readFile(outputPath));
    const assetPath = await input.repository.writeQuizNarrationAudio(input.channelId, input.episodeId, audio);
    const durationSeconds = wavDurationSeconds(audio);
    const diagnostics = audioDiagnosticsForTimeline(audio, input.timeline);
    await writeFile(path.join(workingDirectory, "narration-diagnostics.json"), `${JSON.stringify(diagnostics, null, 2)}\n`, "utf8");
    await input.repository.saveNarrationMetadata(
      input.channelId,
      input.episodeId,
      assetPath,
      durationSeconds,
      input.voicePlan.segments.length,
      countQuizVoiceWords(input.voicePlan.segments.map((segment) => segment.text).join(" ")),
    );
    return { assetPath, durationSeconds, diagnostics };
  } finally {
    await Promise.all([rm(outputPath, { force: true }), ...temporaryFiles.map((file) => rm(file, { force: true }))]);
  }
}
