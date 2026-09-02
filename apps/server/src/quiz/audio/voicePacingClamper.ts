import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { VoicePauseClass, VoiceSegment, VoiceSegmentRole } from "@studio/shared";
import { countQuizVoiceWords } from "./voicePolicy.js";
import { wavDurationSeconds } from "../../utils/binary.js";

const execFileAsync = promisify(execFile);

export const MIN_QUIZ_VOICE_SLOWDOWN_TEMPO = 0.85;

export type QuizVoicePacingClamp = {
  segment_id: string;
  role: VoiceSegmentRole;
  actual: number;
  pacingLimit: number;
  appliedTempo: number;
};

export function quizVoicePaceCorrectionTempo(actual: number, pacingLimit: number): number {
  if (!Number.isFinite(actual) || actual <= pacingLimit) return 1;
  return Math.max(MIN_QUIZ_VOICE_SLOWDOWN_TEMPO, pacingLimit / actual);
}

export function segmentPace(segment: VoiceSegment, duration: number): number {
  if (segment.role === "countdown") return 0;
  return countQuizVoiceWords(segment.text) / Math.max(0.1, duration);
}

export function atempoFilters(tempo: number): string[] {
  if (!Number.isFinite(tempo) || tempo <= 0) throw new Error("Quiz voice tempo must be positive");
  const filters: string[] = [];
  let remaining = tempo;
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  if (Math.abs(remaining - 1) > 0.0001) filters.push(`atempo=${remaining.toFixed(6)}`);
  return filters;
}

export async function paceQuizVoiceAudio(
  audio: Uint8Array,
  tempo: number,
  directory: string,
  segmentNumber: number,
  gainDb = 0,
): Promise<Uint8Array> {
  const base = `segment-${String(segmentNumber).padStart(3, "0")}`;
  const inputPath = path.join(directory, `${base}-source.wav`);
  const outputPath = path.join(directory, `${base}-paced.wav`);
  try {
    await writeFile(inputPath, audio);
    const filters = atempoFilters(tempo);
    if (gainDb !== 0) filters.push(`volume=${Math.pow(10, gainDb / 20).toFixed(4)}`);
    const filterArgs = filters.length > 0 ? ["-filter:a", filters.join(",")] : [];
    await execFileAsync("ffmpeg", ["-y", "-i", inputPath, ...filterArgs, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", outputPath], {
      timeout: 2 * 60_000,
      windowsHide: true,
    });
    return new Uint8Array(await readFile(outputPath));
  } finally {
    await Promise.all([rm(inputPath, { force: true }), rm(outputPath, { force: true })]);
  }
}

export async function enforceQuizVoicePace(
  audio: Uint8Array,
  segment: VoiceSegment,
  pacingLimit: number,
  directory: string,
  segmentNumber: number,
  onPacingClamp?: (details: QuizVoicePacingClamp) => Promise<void> | void,
): Promise<Uint8Array> {
  // Short energetic hook and closing segments should preserve natural punchy delivery
  // without atempo stretch degradation.
  if (segment.role === "intro" || segment.role === "outro") {
    return audio;
  }
  const actual = segmentPace(segment, wavDurationSeconds(audio));
  if (actual <= pacingLimit) return audio;
  const requestedTempo = pacingLimit / actual;
  const tempo = quizVoicePaceCorrectionTempo(actual, pacingLimit);
  if (requestedTempo < MIN_QUIZ_VOICE_SLOWDOWN_TEMPO) {
    await onPacingClamp?.({
      segment_id: segment.segment_id,
      role: segment.role,
      actual: Number(actual.toFixed(3)),
      pacingLimit: Number(pacingLimit.toFixed(3)),
      appliedTempo: Number(tempo.toFixed(3)),
    });
  }
  return paceQuizVoiceAudio(audio, tempo, directory, segmentNumber * 1000 + 7);
}

export function pauseSeconds(pauseClass: VoicePauseClass, segmentNumber: number, phraseIndex: number): number {
  if (pauseClass === "none") return 0;
  if (pauseClass === "long") return 1.0;
  const variation = ((segmentNumber + phraseIndex) % 3) * 0.018;
  if (pauseClass === "micro") return 0.09 + variation;
  if (pauseClass === "anticipation") return 0.16 + variation;
  if (pauseClass === "phrase") return 0.15 + variation;
  return 0.2 + variation;
}

export function createSilenceWav(durationSeconds: number): Uint8Array {
  const numSamples = Math.max(0, Math.round(durationSeconds * 48000));
  const dataSize = numSamples * 4;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // "RIFF"
  buffer[0] = 0x52;
  buffer[1] = 0x49;
  buffer[2] = 0x46;
  buffer[3] = 0x46;
  view.setUint32(4, 36 + dataSize, true);
  // "WAVE"
  buffer[8] = 0x57;
  buffer[9] = 0x41;
  buffer[10] = 0x56;
  buffer[11] = 0x45;
  // "fmt "
  buffer[12] = 0x66;
  buffer[13] = 0x6d;
  buffer[14] = 0x74;
  buffer[15] = 0x20;
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 2, true); // 2 channels
  view.setUint32(24, 48000, true); // 48000 Hz
  view.setUint32(28, 192000, true); // 192000 bytes/sec
  view.setUint16(32, 4, true); // block align
  view.setUint16(34, 16, true); // 16-bit
  // "data"
  buffer[36] = 0x64;
  buffer[37] = 0x61;
  buffer[38] = 0x74;
  buffer[39] = 0x61;
  view.setUint32(40, dataSize, true);
  return buffer;
}

export function isStandardPcmWav(buffer: Uint8Array, expectedSampleRate = 48000, expectedChannels = 2): boolean {
  if (buffer.length < 44) return false;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (new TextDecoder().decode(buffer.slice(0, 4)) !== "RIFF" || new TextDecoder().decode(buffer.slice(8, 12)) !== "WAVE") return false;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = new TextDecoder().decode(buffer.slice(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt " && size >= 16 && offset + 24 <= buffer.length) {
      const audioFormat = view.getUint16(offset + 8, true); // 1 = PCM integer
      const numChannels = view.getUint16(offset + 10, true);
      const sampleRate = view.getUint32(offset + 12, true);
      const bitsPerSample = view.getUint16(offset + 22, true);
      return audioFormat === 1 && numChannels === expectedChannels && sampleRate === expectedSampleRate && bitsPerSample === 16;
    }
    offset += 8 + size + (size % 2);
  }
  return false;
}
